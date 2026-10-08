import { ESLint } from '/home/carase/git/personal/AO/workspace/clones/wt-v6-a00-build/gateway/node_modules/eslint/lib/api.js';
import config from '/home/carase/git/personal/AO/workspace/clones/wt-v6-a00-build/gateway/eslint.config.js';
const files = ["tests/gateway/guarded_paste.test.js", "tests/gateway/orchestrator_profile_runtime.test.js", "tests/gateway/tool_agent_model.test.js"];
const eslint = new ESLint({ cwd: '/home/carase/git/personal/AO/workspace/clones/wt-v6-a00-build', overrideConfigFile: true, overrideConfig: config.map((entry) => entry.files ? { ...entry, files: ["tests/gateway/**/*.js"] } : entry) });
console.log("Rebase existing Gateway ESLint rules to root tests/gateway; no rules disabled.");
for (const file of files) {
  const effective = await eslint.calculateConfigForFile(file);
  if (!effective?.rules?.["no-unused-vars"] || !effective.rules["no-useless-assignment"]) throw new Error(`missing rules for ${file}`);
  console.log(`${file}: ${Object.keys(effective.rules).length} effective rules`);
}
const results = await eslint.lintFiles(files);
console.log(await (await eslint.loadFormatter("stylish")).format(results));
const errors = results.reduce((sum, result) => sum + result.errorCount + result.fatalErrorCount, 0);
const warnings = results.reduce((sum, result) => sum + result.warningCount, 0);
console.log(`Files: ${results.length}; errors: ${errors}; warnings: ${warnings}`);
process.exitCode = errors || warnings ? 1 : 0;

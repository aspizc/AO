import { ESLint } from "/home/carase/git/personal/AO/workspace/clones/wt-v6-a00-build/gateway/node_modules/eslint/lib/api.js";
import config from "/home/carase/git/personal/AO/workspace/clones/wt-v6-a00-build/gateway/eslint.config.js";
const files = process.argv.length > 2 ? process.argv.slice(2) : ["tests/gateway/cli_write_access.test.js", "tests/gateway/agent_service_write_access.test.js"];
// Rebase the existing Gateway rules to the root test directory; no rules disabled.
const overrideConfig = config.map((entry) => entry.files ? { ...entry, files: ["tests/gateway/**/*.js"] } : entry);
const eslint = new ESLint({ cwd: "/home/carase/git/personal/AO/workspace/clones/wt-v6-a00-build", overrideConfigFile: true, overrideConfig });
console.log("ESLint API: existing gateway/eslint.config.js, overrideConfigFile=true, file globs rebased to tests/gateway/**/*.js");
for (const file of files) {
  const effective = await eslint.calculateConfigForFile(file);
  if (!effective?.rules?.["no-unused-vars"] || !effective.rules["no-useless-assignment"]) throw new Error(`missing recommended rules for ${file}`);
  console.log(`${file}: ${Object.keys(effective.rules).length} rules; no-unused-vars=${JSON.stringify(effective.rules["no-unused-vars"])}; no-useless-assignment=${JSON.stringify(effective.rules["no-useless-assignment"])}`);
}
const results = await eslint.lintFiles(files);
console.log(await (await eslint.loadFormatter("stylish")).format(results));
const errors = results.reduce((count, result) => count + result.errorCount + result.fatalErrorCount, 0);
const warnings = results.reduce((count, result) => count + result.warningCount, 0);
console.log(`Linted files: ${results.length}; errors: ${errors}; warnings: ${warnings}`);
process.exitCode = errors || warnings ? 1 : 0;

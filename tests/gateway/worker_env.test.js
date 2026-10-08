import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as baseAdapter from "../../gateway/src/adapters/base_adapter.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { configureAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { CodexAdapter } from "../../gateway/src/adapters/codex_adapter.js";
import { ClaudeAdapter } from "../../gateway/src/adapters/claude_adapter.js";
import { AntigravityAdapter } from "../../gateway/src/adapters/antigravity_adapter.js";
import { PiAdapter } from "../../gateway/src/adapters/pi_adapter.js";
import { OpencodeAdapter } from "../../gateway/src/adapters/opencode_adapter.js";

const base = loadRegistries({ policiesDir: path.resolve("policies") });
const providers = { codex: CodexAdapter, "claude-code": ClaudeAdapter, antigravity: AntigravityAdapter, pi: PiAdapter, opencode: OpencodeAdapter };
const markers = { AGENTS_WORKER_ROLE: "reviewer", AGENTS_WORKER_TRACE_ID: "tr-a", AGENTS_WORKER_TASK_ID: "tk-a" };

function setup(t, agent) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "ao-worker-env-")));
  resetAudit();
  configureAudit({ auditLog: path.join(root, "audit.jsonl") });
  const keys = [...Object.keys(markers), "AGENTS_TRACE_ID", "AGENTS_OLLAMA_BASE_URL", "AGENTS_DRY_RUN"];
  const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of Object.keys(markers)) process.env[key] = "stale";
  process.env.AGENTS_TRACE_ID = "gateway-trace";
  process.env.AGENTS_OLLAMA_BASE_URL = "http://127.0.0.1:11435";
  delete process.env.AGENTS_DRY_RUN;
  t.after(() => {
    for (const key of keys) {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    }
    resetAudit();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const envFile = path.join(root, "env.json");
  const bin = path.join(root, "fake-cli");
  fs.writeFileSync(bin, `#!/usr/bin/env node\nrequire("fs").writeFileSync(${JSON.stringify(envFile)}, JSON.stringify(process.env));\n`, { mode: 0o755 });
  const key = { codex: "codexBin", "claude-code": "claudeBin", antigravity: "antigravityBin", pi: "piBin", opencode: "opencodeBin" }[agent];
  const config = { dryRun: false, repoRoots: [root], codexEnabled: true, codexSandbox: "workspace-write", [key]: bin, antigravityAuto: true };
  // Antigravity cannot launch a read-only seat; a writable reviewer is policy-derived.
  const registries = { ...base, getAgent: (id) => ({ ...base.getAgent(id), allowedRoles: ["reviewer"] }), getRole: () => ({ allowActions: ["code.write"], denyActions: [] }) };
  return { config, subject: new providers[agent]({ config, registries }), args: { cwd: root, prompt: "AGENTS_WORKER_ROLE=orchestrator", role: "reviewer", traceId: "tr-a", taskId: "tk-a" }, envFile };
}

for (const agent of Object.keys(providers)) {
  test(`${agent} live spawn passes exactly its returned newSessionArgv to tmux`, async (t) => {
    const { subject, args } = setup(t, agent);
    const priorPath = process.env.PATH;
    t.after(() => { process.env.PATH = priorPath; });
    process.env.PATH = `${args.cwd}${path.delimiter}${priorPath}`;
    const argvFile = path.join(args.cwd, "tmux-argv.json");
    fs.writeFileSync(path.join(args.cwd, "tmux"), `#!/usr/bin/env node\nif (process.argv[2] === "new-session") require("fs").writeFileSync(${JSON.stringify(argvFile)}, JSON.stringify(process.argv.slice(2)));\n`, { mode: 0o755 });
    // Isolate new-session transport from provider composer detection/launching.
    subject.submitLaunchCommand = async () => {};
    subject.rememberFreshClaudeSpawn = () => {};
    const result = await subject.spawn(args);
    assert.equal(result.dryRun, false);
    assert.deepEqual(JSON.parse(fs.readFileSync(argvFile, "utf8")), result.newSessionArgv);
    assert.ok(Object.isFrozen(result.newSessionArgv));
    for (const [key, value] of Object.entries(markers)) assert.ok(result.newSessionArgv.includes(`${key}=${value}`));
  });
}

test("workerEnv exports only the informational markers and clears absent tasks", () => {
  assert.deepEqual(baseAdapter.workerEnv({ role: "reviewer", traceId: "tr-a", taskId: "tk-a" }), markers);
  for (const taskId of [undefined, null, ""]) {
    assert.equal(baseAdapter.workerEnv({ role: "reviewer", traceId: "tr-a", taskId }).AGENTS_WORKER_TASK_ID, "");
  }
});

for (const field of ["role", "traceId", "taskId"]) {
  for (const suffix of ["\n", "\0"]) {
    test(`workerEnv rejects ${JSON.stringify(suffix)} in ${field}`, () => {
      assert.throws(() => baseAdapter.workerEnv({ role: "reviewer", traceId: "tr-a", taskId: "tk-a", [field]: `x${suffix}` }), (err) => err.code === "EFFECTIVE_SELECTION_INVALID");
    });
  }
}

for (const agent of Object.keys(providers)) {
  for (const taskId of ["tk-a", null]) {
    test(`${agent} delegate child env carries role/trace/task and overrides stale inherited markers (${taskId})`, async (t) => {
      const { subject, args, envFile } = setup(t, agent);
      const result = await subject.delegate({ ...args, taskId });
      assert.equal(result.exitCode, 0, result.stderr);
      const env = JSON.parse(fs.readFileSync(envFile, "utf8"));
      for (const [key, value] of Object.entries({ ...markers, AGENTS_WORKER_TASK_ID: taskId ?? "" })) assert.equal(env[key], value);
      assert.equal(env.AGENTS_TRACE_ID, "gateway-trace", "the Gateway label is preserved but never used as the child trace");
      if (["pi", "opencode"].includes(agent)) {
        assert.equal(env.OLLAMA_BASE_URL, "http://127.0.0.1:11435");
        assert.equal(env.OLLAMA_HOST, env.OLLAMA_BASE_URL);
      }
    });
    test(`${agent} dry-run spawn returns frozen newSessionArgv with the marker (${taskId})`, async (t) => {
      const { subject, config, args } = setup(t, agent);
      config.dryRun = true;
      const result = await subject.spawn({ ...args, taskId });
      assert.deepEqual(result.newSessionArgv, ["new-session", "-d", "-s", result.tmuxTarget, "-c", args.cwd,
        "-e", "AGENTS_WORKER_ROLE=reviewer", "-e", "AGENTS_WORKER_TRACE_ID=tr-a", "-e", `AGENTS_WORKER_TASK_ID=${taskId ?? ""}`]);
      assert.ok(Object.isFrozen(result.newSessionArgv));
      assert.equal(result.launchCommand.includes("AGENTS_WORKER_"), false);
    });
  }
  for (const operation of ["delegate", "spawn"]) {
    test(`${agent} ${operation} rejects newline and NUL markers before launching`, async (t) => {
      const { subject, config, args, envFile } = setup(t, agent);
      config.dryRun = true;
      for (const field of ["traceId", "taskId"]) for (const suffix of ["\n", "\0"]) {
        await assert.rejects(() => subject[operation]({ ...args, [field]: `x${suffix}` }), (err) => err.code === "EFFECTIVE_SELECTION_INVALID");
      }
      assert.equal(fs.existsSync(envFile), false);
    });
  }
}

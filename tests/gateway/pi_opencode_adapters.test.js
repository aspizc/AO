import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OpencodeAdapter } from "../../gateway/src/adapters/opencode_adapter.js";
import { PiAdapter } from "../../gateway/src/adapters/pi_adapter.js";
import {
  assertModelCredentials,
  localBaseUrl,
  modelProvider,
  requiredApiKeyEnv,
} from "../../gateway/src/adapters/model_credentials.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";

const LOCAL_QWEN = "ollama/qwen3.8:27b";
const LOCAL_QWEN_CODER = "ollama/qwen3-coder:30b";
const KIMI = "moonshotai/kimi-k3";
const PI_THINKING = ["off", "minimal", "low", "medium", "high", "xhigh"];

function setup(prefix) {
  resetAudit();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-root-`)));
  const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-audit-`));
  configureAudit({ auditLog: path.join(auditDir, "audit.jsonl") });
  return { root };
}

function fakeRegistries({ denyActions = [], reasoningEfforts, defaultReasoningEffort } = {}) {
  return {
    getAgent: () => ({
      models: [LOCAL_QWEN, LOCAL_QWEN_CODER, KIMI],
      modelAliases: { qwen: LOCAL_QWEN, "qwen-coder": LOCAL_QWEN_CODER, kimi: KIMI },
      defaultModel: LOCAL_QWEN,
      reasoningEfforts,
      defaultReasoningEffort,
      allowedClassifications: ["unrestricted", "internal"],
      allowedRoles: ["coder", "orchestrator", "reviewer", "planner"],
      requiresApprovalFor: [],
    }),
    getRepo: () => null,
    getRole: () => ({
      allowActions: ["agent.delegate", "agent.spawn", "agent.ask"],
      denyActions,
    }),
    getProtectedBranches: () => [],
  };
}

function piAdapter(root, overrides = {}) {
  return new PiAdapter({
    config: { dryRun: true, repoRoots: [root], tmuxPrefix: "ag-", ...overrides },
    registries: fakeRegistries({
      reasoningEfforts: PI_THINKING,
      defaultReasoningEffort: "medium",
      ...overrides,
    }),
  });
}

function opencodeAdapter(root, overrides = {}) {
  return new OpencodeAdapter({
    config: { dryRun: true, repoRoots: [root], tmuxPrefix: "ag-", ...overrides },
    registries: fakeRegistries(overrides),
  });
}

function fakeBin(root, argvFile, name) {
  const bin = path.join(root, name);
  fs.writeFileSync(
    bin,
    `#!/usr/bin/env node\nrequire("fs").writeFileSync(${JSON.stringify(argvFile)}, JSON.stringify(process.argv.slice(2)));\n`
      + `require("fs").writeFileSync(${JSON.stringify(argvFile + ".env")}, JSON.stringify({OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || null}));\n`
      + `process.stdout.write("ok");\n`,
    { mode: 0o755 },
  );
  return bin;
}

// ---------------------------------------------------------------- credentials

test("a model id carries its provider, and only API providers demand a key", () => {
  assert.equal(modelProvider(LOCAL_QWEN), "ollama");
  assert.equal(modelProvider(KIMI), "moonshotai");
  assert.equal(modelProvider("bare-model"), null);

  assert.equal(requiredApiKeyEnv(KIMI), "MOONSHOT_API_KEY");
  assert.equal(requiredApiKeyEnv(LOCAL_QWEN), null);
});

test("kimi k3 is refused by name when its key is absent, and passes when set", () => {
  assert.throws(
    () => assertModelCredentials(KIMI, {}),
    (err) =>
      err.code === "MODEL_CREDENTIAL_MISSING"
      && err.requiredEnv === "MOONSHOT_API_KEY"
      && err.model === KIMI,
  );
  assert.equal(
    assertModelCredentials(KIMI, { MOONSHOT_API_KEY: "sk-test" }),
    "MOONSHOT_API_KEY",
  );
  // the local model never asks for a credential in either direction
  assert.equal(assertModelCredentials(LOCAL_QWEN, {}), null);
});

test("the local base URL is overridable and falls back to the Ollama default", () => {
  assert.equal(localBaseUrl(LOCAL_QWEN, {}), "http://127.0.0.1:11434/v1");
  assert.equal(
    localBaseUrl(LOCAL_QWEN, { AGENTS_OLLAMA_BASE_URL: "http://10.0.0.2:11434/v1" }),
    "http://10.0.0.2:11434/v1",
  );
  assert.equal(localBaseUrl(KIMI, {}), null);
});

// ------------------------------------------------------------------------ pi

test("pi dry run resolves the local Qwen default and audits the lifecycle", async () => {
  const { root } = setup("pi");

  const result = await piAdapter(root).delegate({
    cwd: root,
    prompt: "write tests",
    traceId: "tr-pi-dry",
    role: "coder",
  });
  const events = await query({ traceId: "tr-pi-dry" });

  assert.equal(result.exitCode, 0);
  assert.equal(result.dryRun, true);
  assert.equal(result.model, LOCAL_QWEN);
  assert.equal(result.reasoningEffort, "medium");
  assert.match(
    result.stdout,
    /^\[dry-run pi model=ollama\/qwen3\.8:27b thinking=medium\]/,
  );
  assert.deepEqual(
    events.map((event) => event.type),
    ["SESSION_STARTED", "SESSION_CLOSED"],
  );
});

test("pi passes the model as --model and the effort as --thinking, non-interactively", async () => {
  const { root } = setup("pi");
  const argvFile = path.join(root, "argv.json");
  const subject = piAdapter(root, {
    dryRun: false,
    piBin: fakeBin(root, argvFile, "fake-pi"),
    adapterTimeoutMs: 5000,
  });

  await subject.delegate({
    cwd: root,
    prompt: "implement",
    traceId: "tr-pi-real",
    role: "coder",
    model: LOCAL_QWEN,
    reasoningEffort: "xhigh",
  });
  const argv = JSON.parse(fs.readFileSync(argvFile, "utf-8"));

  assert.deepEqual(argv, [
    "--model",
    LOCAL_QWEN,
    "--thinking",
    "xhigh",
    "--print",
    "--mode",
    "json",
    "implement",
  ]);
});

test("pi hands the local endpoint to the child process", async () => {
  const { root } = setup("pi");
  const argvFile = path.join(root, "argv.json");
  const subject = piAdapter(root, {
    dryRun: false,
    piBin: fakeBin(root, argvFile, "fake-pi"),
    adapterTimeoutMs: 5000,
  });

  await subject.delegate({
    cwd: root,
    prompt: "implement",
    traceId: "tr-pi-env",
    role: "coder",
    model: LOCAL_QWEN,
  });
  const childEnv = JSON.parse(fs.readFileSync(`${argvFile}.env`, "utf-8"));

  assert.equal(childEnv.OLLAMA_BASE_URL, "http://127.0.0.1:11434/v1");
});

test("pi supervised launch is the interactive line, with no --print", async () => {
  const { root } = setup("pi");

  const result = await piAdapter(root).spawn({
    cwd: root,
    traceId: "tr-pi-spawn",
    role: "coder",
    model: LOCAL_QWEN_CODER,
    reasoningEffort: "low",
  });

  assert.equal(
    result.launchCommand,
    "pi --model ollama/qwen3-coder:30b --thinking low",
  );
  assert.equal(result.dryRun, true);
  assert.match(result.attachCommand, /^tmux attach -t /);
  assert.equal(result.launchCommand.includes("--print"), false);
});

test("pi refuses kimi k3 without a key, before any process starts", async () => {
  const { root } = setup("pi");
  const argvFile = path.join(root, "argv.json");
  const subject = piAdapter(root, {
    dryRun: false,
    piBin: fakeBin(root, argvFile, "fake-pi"),
    adapterTimeoutMs: 5000,
  });
  const previous = process.env.MOONSHOT_API_KEY;
  delete process.env.MOONSHOT_API_KEY;

  try {
    await assert.rejects(
      () =>
        subject.delegate({
          cwd: root,
          prompt: "implement",
          traceId: "tr-pi-kimi",
          role: "coder",
          model: KIMI,
        }),
      (err) => err.code === "MODEL_CREDENTIAL_MISSING",
    );
    assert.equal(fs.existsSync(argvFile), false, "the CLI must not have been launched");
  } finally {
    if (previous !== undefined) process.env.MOONSHOT_API_KEY = previous;
  }
});

// ------------------------------------------------------------------ opencode

test("opencode runs non-interactively with -m and json output", async () => {
  const { root } = setup("opencode");
  const argvFile = path.join(root, "argv.json");
  const subject = opencodeAdapter(root, {
    dryRun: false,
    opencodeBin: fakeBin(root, argvFile, "fake-opencode"),
    adapterTimeoutMs: 5000,
  });

  await subject.delegate({
    cwd: root,
    prompt: "implement",
    traceId: "tr-oc-real",
    role: "coder",
    model: LOCAL_QWEN,
  });
  const argv = JSON.parse(fs.readFileSync(argvFile, "utf-8"));

  assert.deepEqual(argv, ["run", "-m", LOCAL_QWEN, "--format", "json", "implement"]);
});

test("opencode only bypasses its permission prompt when told to", async () => {
  const { root } = setup("opencode");
  const argvFile = path.join(root, "argv.json");
  const withAuto = opencodeAdapter(root, {
    dryRun: false,
    opencodeAuto: true,
    opencodeBin: fakeBin(root, argvFile, "fake-opencode"),
    adapterTimeoutMs: 5000,
  });

  await withAuto.delegate({
    cwd: root,
    prompt: "implement",
    traceId: "tr-oc-auto",
    role: "coder",
    model: LOCAL_QWEN,
  });

  assert.ok(JSON.parse(fs.readFileSync(argvFile, "utf-8")).includes("--auto"));
});

test("opencode declares no effort dimension, so none is forwarded by default", async () => {
  const { root } = setup("opencode");

  const result = await opencodeAdapter(root).spawn({
    cwd: root,
    traceId: "tr-oc-spawn",
    role: "coder",
  });

  assert.equal(result.launchCommand, "opencode -m ollama/qwen3.8:27b");
  assert.equal(result.effectiveSelection.reasoningEffort, null);
  assert.equal(result.launchCommand.includes("--variant"), false);
});

test("opencode refuses kimi k3 without a key", async () => {
  const { root } = setup("opencode");
  const previous = process.env.MOONSHOT_API_KEY;
  delete process.env.MOONSHOT_API_KEY;

  try {
    await assert.rejects(
      () =>
        opencodeAdapter(root).delegate({
          cwd: root,
          prompt: "implement",
          traceId: "tr-oc-kimi",
          role: "coder",
          model: KIMI,
        }),
      (err) => err.code === "MODEL_CREDENTIAL_MISSING",
    );
  } finally {
    if (previous !== undefined) process.env.MOONSHOT_API_KEY = previous;
  }
});

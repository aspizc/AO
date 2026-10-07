import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadRegistries, RegistryError } from "../../gateway/src/core/registry.js";
import { loadConfig } from "../../gateway/src/config.js";
import { startMcpClient } from "../e2e/helpers/mcp_client.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = path.join(ROOT, "policies");
const ENTRY = { classification: "internal", allowedAgents: ["codex"] };

function overlay(t, repositories, version = 1) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "registry-overlay-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "repositories.json");
  fs.writeFileSync(file, JSON.stringify({ version, repositories }));
  return file;
}

test("overlay adds a repository without changing shipped entries", (t) => {
  const file = overlay(t, { "local-project": ENTRY });
  const registry = loadRegistries({ policiesDir: BASE, repositoriesOverlay: file });
  assert.deepEqual(registry.getRepo("local-project"), ENTRY);
  assert.deepEqual(registry.getRepo("sample-apps"), loadRegistries({ policiesDir: BASE }).getRepo("sample-apps"));
});

test("overlay colliding with a base id is rejected before reclassification", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "overlay-base-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.cpSync(BASE, directory, { recursive: true });
  const baseFile = path.join(directory, "repositories.json");
  const base = JSON.parse(fs.readFileSync(baseFile, "utf8"));
  base.repositories["sample-apps"] = { classification: "restricted", allowedAgents: ["codex"] };
  fs.writeFileSync(baseFile, JSON.stringify(base));
  const file = overlay(t, { "sample-apps": { classification: "unrestricted", allowedAgents: ["codex"] } });
  assert.throws(() => loadRegistries({ policiesDir: directory, repositoriesOverlay: file }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_OVERLAY_COLLISION");
});

for (const classification of ["internal", "unrestricted", "restricted"]) {
  test(`overlay entry with an unknown agent is rejected (${classification})`, (t) => {
    const file = overlay(t, { local: { classification, allowedAgents: ["unknown-agent"] } });
    assert.throws(() => loadRegistries({ policiesDir: BASE, repositoriesOverlay: file }),
      (err) => err instanceof RegistryError && err.code === "REGISTRY_INVARIANT");
  });
}

test("missing overlay file is an error", (t) => {
  const file = overlay(t, {});
  fs.unlinkSync(file);
  assert.throws(() => loadRegistries({ policiesDir: BASE, repositoriesOverlay: file }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_MISSING");
});

test("unset overlay leaves the registry unchanged", () => {
  assert.deepEqual(loadRegistries({ policiesDir: BASE }).raw(),
    loadRegistries({ policiesDir: BASE, repositoriesOverlay: undefined }).raw());
});

test("overlay requires an absolute path and valid registry shape", (t) => {
  assert.throws(() => loadRegistries({ policiesDir: BASE, repositoriesOverlay: "relative.json" }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_INVALID_OVERLAY");
  for (const repositories of [[], null, { local: null }, { local: { ...ENTRY, classification: "novel" } }]) {
    const file = overlay(t, repositories);
    assert.throws(() => loadRegistries({ policiesDir: BASE, repositoriesOverlay: file }), RegistryError);
  }
  assert.throws(() => loadRegistries({ policiesDir: BASE, repositoriesOverlay: overlay(t, {}, 0) }), RegistryError);
});

test("config reads the overlay path and rejects a relative path", (t) => {
  const file = overlay(t, {});
  assert.equal(loadConfig({ AGENTS_REPOSITORIES_OVERLAY: file, AGENTS_MESSAGE_ACCESS_SECRET: "test" }).repositoriesOverlay, file);
  assert.throws(() => loadConfig({ AGENTS_REPOSITORIES_OVERLAY: "relative.json" }), /absolute/);
});

test("Gateway startup rejects an overlay collision", (t) => {
  const file = overlay(t, { "sample-apps": ENTRY });
  const result = spawnSync(process.execPath, [path.join(ROOT, "gateway/src/mcp_server.js")], {
    env: { ...process.env, AGENTS_REPOSITORIES_OVERLAY: file, AGENTS_MESSAGE_ACCESS_SECRET: "test" },
    input: "", encoding: "utf8", timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /REGISTRY_OVERLAY_COLLISION|overlay.*sample-apps/);
});

test("an overlay-only repository is usable through real MCP policy and task assignment", async (t) => {
  const file = overlay(t, { "local-project": ENTRY });
  const repoRoot = path.dirname(file);
  fs.mkdirSync(path.join(repoRoot, "local-project"));
  const client = await startMcpClient({ env: { AGENTS_REPOSITORIES_OVERLAY: file, AGENTS_REPO_ROOTS: repoRoot } });
  try {
    const { body: trace } = await client.callTool("orchestration.create", {
      callerAgent: "claude-code", callerRole: "orchestrator", goal: "Overlay repository test",
    });
    const { body: task } = await client.callTool("task.assign", {
      traceId: trace.traceId, caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "codex", role: "coder", action: "code.write" }, repo: "local-project",
    });
    assert.ok(task.taskId, JSON.stringify(task));
    assert.equal(task.repo, "local-project");
  } finally {
    await client.cleanup();
  }
});

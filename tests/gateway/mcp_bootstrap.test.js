import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../../gateway/src/config.js";
import { startMcpClient } from "../e2e/helpers/mcp_client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SERVER = path.join(REPO_ROOT, "gateway", "src", "mcp_server.js");

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

test("server_initializes_lists_tools_and_audits_boot", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-ws-"));
  const inputFile = path.join(workspace, "mcp-input.jsonl");
  const stdoutFile = path.join(workspace, "mcp-stdout.log");
  const stderrFile = path.join(workspace, "mcp-stderr.log");
  const requests = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "smoke", version: "0" },
      },
    },
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  ];
  fs.writeFileSync(inputFile, `${requests.map((request) => JSON.stringify(request)).join("\n")}\n`);

  const command = [
    `AGENTS_WORKSPACE=${shellQuote(workspace)}`,
    "AGENTS_COORDINATION_REDIS_URL=redis://127.0.0.1:1",
    "node",
    shellQuote(SERVER),
    "<",
    shellQuote(inputFile),
    ">",
    shellQuote(stdoutFile),
    "2>",
    shellQuote(stderrFile),
  ].join(" ");
  const result = spawnSync("bash", ["-lc", command], {
    stdio: "ignore",
    timeout: 2000,
  });

  assert.equal(result.status, 0);
  const stdout = fs.readFileSync(stdoutFile, "utf-8");
  const stderr = fs.readFileSync(stderrFile, "utf-8");
  const lines = stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const toolsList = lines.find((line) => line.id === 2);
  assert.deepEqual(
    toolsList.result.tools.map((tool) => tool.name),
    [
      "orchestration.create",
      "orchestration.view",
      "orchestration.pause",
      "orchestration.resume",
      "orchestration.cancel",
      "orchestration.complete",
      "task.assign",
      "agent.delegate",
      "agent.spawn",
      "agent.ask",
      "agent.view",
      "agent.kill",
      "artifact.put",
      "artifact.get",
      "artifact.list",
      "artifact.share",
      "approval.request",
      "approval.respond",
      "approval.poll",
      "approval.wait",
      "message.send",
      "message.list",
      "message.reply",
      "session.attach_info",
      "session.intervention_note",
      "coordination.status",
      "coordination.register",
      "coordination.heartbeat",
      "coordination.discover",
      "coordination.unregister",
      "coordination.send",
      "coordination.receive",
      "coordination.ack",
      "orchestration.reattach",
    ],
  );
  assert.ok(stderr.includes("gateway connected"), `missing connect log: ${stderr}`);
  assert.ok(stderr.includes("gateway stopped"), `missing stop log: ${stderr}`);
  assert.ok(!stdout.includes("gateway connected"), "stdout was polluted with logs");

  const auditLog = path.join(workspace, "audit", "events.jsonl");
  const auditEvents = fs.readFileSync(auditLog, "utf-8").trim().split("\n").map((line) => JSON.parse(line));
  assert.ok(auditEvents.some((event) => event.type === "GATEWAY_BOOT"));
});

test("request principal agent comes from the launch configuration", () => {
  const env = { AGENTS_MESSAGE_ACCESS_SECRET: "request-principal-config-test-secret" };
  assert.equal(loadConfig(env).requestPrincipalAgent, "claude-code");
  assert.equal(loadConfig({ ...env, AGENTS_REQUEST_PRINCIPAL_AGENT: "" }).requestPrincipalAgent, "claude-code");
  assert.equal(loadConfig({ ...env, AGENTS_REQUEST_PRINCIPAL_AGENT: "codex" }).requestPrincipalAgent, "codex");
});

for (const [configuredAgent, expectedAgent, otherAgent] of [
  ["", "claude-code", "codex"],
  ["codex", "codex", "claude-code"],
]) {
  test(`MCP accepts ${expectedAgent} and rejects caller impersonation`, async () => {
    const client = await startMcpClient({
      env: {
        AGENTS_REQUEST_PRINCIPAL_AGENT: configuredAgent,
        AGENTS_REDIS_URL: "",
        AGENTS_COORDINATION_REDIS_URL: "",
      },
    });
    try {
      for (const caller of [
        { callerAgent: otherAgent, callerRole: "orchestrator" },
        { callerAgent: expectedAgent, callerRole: "reviewer" },
      ]) {
        const denied = await client.callTool("orchestration.create", caller);
        assert.equal(denied.result.isError, true);
        assert.equal(denied.body.code, "REQUEST_CONTEXT_DENIED");
      }

      const accepted = await client.callTool("orchestration.create", {
        callerAgent: expectedAgent,
        callerRole: "orchestrator",
        goal: "Verify the configured MCP caller identity",
      });
      assert.notEqual(accepted.result.isError, true);
      assert.equal(accepted.body.callerAgent, expectedAgent);
      assert.equal(accepted.body.callerRole, "orchestrator");
      assert.equal(typeof accepted.body.traceId, "string");

      const events = fs.readFileSync(client.paths.auditLog, "utf8")
        .trim().split("\n").map((line) => JSON.parse(line));
      const created = events.filter((event) => event.type === "ORCHESTRATION_CREATED");
      assert.equal(created.length, 1, "rejected identities must not create an orchestration");
      assert.equal(created[0].callerAgent, expectedAgent);
    } finally {
      await client.cleanup();
    }
  });
}

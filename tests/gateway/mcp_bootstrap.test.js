import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    ],
  );
  assert.ok(stderr.includes("gateway connected"), `missing connect log: ${stderr}`);
  assert.ok(!stdout.includes("gateway connected"), "stdout was polluted with logs");

  const auditLog = path.join(workspace, "audit", "events.jsonl");
  const auditEvents = fs.readFileSync(auditLog, "utf-8").trim().split("\n").map((line) => JSON.parse(line));
  assert.ok(auditEvents.some((event) => event.type === "GATEWAY_BOOT"));
});

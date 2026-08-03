#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ag-mcp-smoke-"));
const server = path.resolve("gateway", "src", "mcp_server.js");
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
      clientInfo: { name: "mcp-smoke", version: "0" },
    },
  },
  {
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {},
  },
  { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
];

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function fail(message, extra = "") {
  fs.rmSync(workspace, { recursive: true, force: true });
  process.stderr.write(`${message}\n${extra}`);
  process.exit(1);
}

fs.writeFileSync(inputFile, `${requests.map((request) => JSON.stringify(request)).join("\n")}\n`);
const command = [
  `AGENTS_WORKSPACE=${shellQuote(workspace)}`,
  "AGENTS_DRY_RUN=1",
  "AGENTS_COORDINATION_REDIS_URL=redis://127.0.0.1:1",
  process.execPath,
  shellQuote(server),
  "<",
  shellQuote(inputFile),
  ">",
  shellQuote(stdoutFile),
  "2>",
  shellQuote(stderrFile),
].join(" ");

const result = spawnSync("bash", ["-lc", command], {
  stdio: "ignore",
  timeout: 3000,
});
const stdout = fs.existsSync(stdoutFile) ? fs.readFileSync(stdoutFile, "utf-8") : "";
const stderr = fs.existsSync(stderrFile) ? fs.readFileSync(stderrFile, "utf-8") : "";

if (result.status !== 0) {
  fail(`MCP smoke failed with exit code ${result.status}`, stderr);
}

const responses = stdout
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const toolsList = responses.find((response) => response.id === 2);
const names = new Set((toolsList?.result?.tools || []).map((tool) => tool.name));
for (const name of [
  "orchestration.create",
  "task.assign",
  "agent.spawn",
  "agent.ask",
  "artifact.share",
  "approval.request",
  "message.send",
  "message.list",
  "coordination.register",
  "coordination.heartbeat",
  "coordination.discover",
  "coordination.unregister",
  "coordination.send",
  "coordination.receive",
  "coordination.ack",
]) {
  if (!names.has(name)) {
    fail(`MCP smoke failed: ${name} not listed`, stdout);
  }
}

fs.rmSync(workspace, { recursive: true, force: true });
process.stdout.write("MCP smoke OK\n");

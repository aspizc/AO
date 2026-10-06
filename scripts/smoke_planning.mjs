#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const server = path.resolve("gateway", "src", "mcp_server.js");
const workspace = process.env.AGENTS_WORKSPACE || fs.mkdtempSync(path.join(os.tmpdir(), "ag-planning-smoke-"));
const repoRoots = process.env.AGENTS_REPO_ROOTS || repoRoot;
const auditLog = process.env.AGENTS_AUDIT_LOG || path.join(workspace, "audit", "events.jsonl");
const artifactRoot = process.env.AGENTS_ARTIFACT_STORE || path.join(workspace, "artifacts");
const policiesDir = process.env.AGENTS_POLICIES_DIR || path.join(repoRoot, "policies");
// Set AGENTS_DRY_RUN=0 to run the same flow against real Claude CLI.
const dryRun = process.env.AGENTS_DRY_RUN === "0" ? "0" : "1";

function fail(message, extra = "") {
  process.stderr.write(`${message}\n${extra}`);
  process.exit(1);
}

function commandExists(command) {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

function ensureRuntime() {
  if (dryRun === "0" && !commandExists("claude")) {
    fail("Planning loop smoke failed: missing real runtime command: claude");
  }
}

function parseToolBody(result) {
  return JSON.parse(result.content[0].text);
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function mcpRequest(method, params = {}) {
  const requests = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "planning-smoke", version: "0" },
      },
    },
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    },
    { jsonrpc: "2.0", id: 2, method, params },
  ];
  const requestDir = fs.mkdtempSync(path.join(workspace, "mcp-call-"));
  const inputFile = path.join(requestDir, "input.jsonl");
  const stdoutFile = path.join(requestDir, "stdout.log");
  const stderrFile = path.join(requestDir, "stderr.log");
  fs.writeFileSync(inputFile, `${requests.map((request) => JSON.stringify(request)).join("\n")}\n`);
  const command = [
    `AGENTS_WORKSPACE=${shellQuote(workspace)}`,
    `AGENTS_DRY_RUN=${shellQuote(dryRun)}`,
    `AGENTS_POLICIES_DIR=${shellQuote(policiesDir)}`,
    `AGENTS_REPO_ROOTS=${shellQuote(repoRoots)}`,
    shellQuote(process.execPath),
    shellQuote(server),
    "<",
    shellQuote(inputFile),
    ">",
    shellQuote(stdoutFile),
    "2>",
    shellQuote(stderrFile),
  ].join(" ");
  const result = spawnSync("bash", ["-lc", command], {
    cwd: repoRoot,
    stdio: "ignore",
    timeout: 60_000,
  });
  const stdout = fs.existsSync(stdoutFile) ? fs.readFileSync(stdoutFile, "utf-8") : "";
  const stderr = fs.existsSync(stderrFile) ? fs.readFileSync(stderrFile, "utf-8") : "";

  if (result.status !== 0) {
    fail(`Planning loop smoke failed: MCP request ${method} exited ${result.status}`, stderr);
  }

  const responses = stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const response = responses.find((item) => item.id === 2);
  if (!response) fail(`Planning loop smoke failed: missing MCP response for ${method}`, stdout + stderr);
  if (response.error) fail(`Planning loop smoke failed: ${method} returned JSON-RPC error`, JSON.stringify(response.error));
  return response;
}

function callTool(name, args = {}) {
  const response = mcpRequest("tools/call", { name, arguments: args });
  if (response.result?.isError) {
    fail(`Planning loop smoke failed: tool ${name} returned an error`, JSON.stringify(parseToolBody(response.result)));
  }
  return parseToolBody(response.result);
}

function requireTools() {
  const toolsList = mcpRequest("tools/list", {});
  const names = new Set((toolsList.result.tools || []).map((tool) => tool.name));
  for (const name of ["agent.delegate", "artifact.put", "artifact.list", "orchestration.complete"]) {
    if (!names.has(name)) fail(`Planning loop smoke failed: ${name} not listed`);
  }
}

function auditEvents(traceId) {
  if (!fs.existsSync(auditLog)) return [];
  return fs
    .readFileSync(auditLog, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((event) => event.traceId === traceId);
}

async function run() {
  ensureRuntime();
  requireTools();

  const orchestration = callTool("orchestration.create", {
    callerAgent: "claude-code",
    callerRole: "orchestrator",
    goal: "Planning loop smoke",
  });
  const traceId = orchestration.traceId;

  const plannerTask = callTool("task.assign", {
    traceId,
    caller: { agent: "claude-code", role: "orchestrator" },
    target: { agent: "claude-code", role: "planner", action: "artifact.put.plan" },
    repo: "agents-orchestrator",
    brief: "Draft Stage Z planning refinement.",
  });
  const plannerDraft = callTool("agent.delegate", {
    agent: "claude-code",
    role: "planner",
    repo: "agents-orchestrator",
    cwd: repoRoot,
    prompt: "Draft a small planning update with OPEN DECISIONS / QUESTIONS FOR HUMAN.",
    traceId,
    taskId: plannerTask.taskId,
    model: "claude-opus-5-5",
    reasoningEffort: "max",
  });
  const planArtifact = callTool("artifact.put", {
    traceId,
    kind: "plan",
    classification: "internal",
    producedBy: plannerDraft.sessionId,
    content:
      "## Draft\nRefine Stage Z planning loop.\n\n" +
      "## OPEN DECISIONS / QUESTIONS FOR HUMAN\n- ID: OD-001\n  Context: smoke rehearsal\n  Options: dry-run, real\n  Recommendation: dry-run first\n",
  });

  const coderTask = callTool("task.assign", {
    traceId,
    caller: { agent: "claude-code", role: "orchestrator" },
    target: { agent: "claude-code", role: "coder", action: "code.write" },
    repo: "agents-orchestrator",
    brief: "Apply approved planning changes to plan/** only.",
  });
  const coderApply = callTool("agent.delegate", {
    agent: "claude-code",
    role: "coder",
    repo: "agents-orchestrator",
    cwd: repoRoot,
    prompt: "Dry-run apply the approved planning change to plan/** only; do not touch other paths.",
    traceId,
    taskId: coderTask.taskId,
    model: "claude-opus-5-5",
    reasoningEffort: "max",
  });

  const reviewTask = callTool("task.assign", {
    traceId,
    caller: { agent: "claude-code", role: "orchestrator" },
    target: { agent: "claude-code", role: "planner", action: "artifact.put.review_notes" },
    repo: "agents-orchestrator",
    brief: "Review the apply-coder planning diff.",
  });
  const plannerReview = callTool("agent.delegate", {
    agent: "claude-code",
    role: "planner",
    repo: "agents-orchestrator",
    cwd: repoRoot,
    prompt: "Review the apply-coder result and write precise review notes.",
    traceId,
    taskId: reviewTask.taskId,
    model: "claude-opus-5-5",
    reasoningEffort: "max",
  });
  const reviewNotes = callTool("artifact.put", {
    traceId,
    kind: "review_notes",
    classification: "internal",
    producedBy: plannerReview.sessionId,
    content: "Planner review notes: dry-run apply stayed within plan/**.",
  });

  callTool("orchestration.complete", { traceId });

  const artifacts = callTool("artifact.list", {
    traceId,
    requesterAgent: "claude-code",
    requesterRole: "planner",
  });
  const events = auditEvents(traceId);
  const eventTypes = new Set(events.map((event) => event.type));
  for (const eventType of ["AGENT_MODEL_RESOLVED", "ARTIFACT_CREATED", "ORCHESTRATION_COMPLETED"]) {
    if (!eventTypes.has(eventType)) fail(`Planning loop smoke failed: missing audit event ${eventType}`);
  }

  process.stdout.write(
    [
      "Planning loop smoke",
      "  planner  : claude-code role=planner model=claude-opus-5-5 effort=max",
      "  coder    : claude-code role=coder model=claude-opus-5-5 effort=max",
      `  artifacts: ${artifactRoot} (${artifacts.length} recorded, plan=${planArtifact.artifactId}, review=${reviewNotes.artifactId})`,
      `  audit    : ${auditLog}`,
      `  mode     : ${dryRun === "1" ? "dry-run" : "real"}`,
      `  sessions : ${plannerDraft.sessionId}, ${coderApply.sessionId}, ${plannerReview.sessionId}`,
      "  result   : OK",
      "",
    ].join("\n"),
  );
}

run().catch((err) => fail("Planning loop smoke failed", `${err?.stack || err}\n`));

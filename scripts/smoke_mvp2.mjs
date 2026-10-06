#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const server = path.resolve("gateway", "src", "mcp_server.js");
const workspace = process.env.AGENTS_WORKSPACE || fs.mkdtempSync(path.join(os.tmpdir(), "ag-mvp2-smoke-"));
const reposRoot = process.env.AGENTS_REPO_ROOTS || path.join(workspace, "repos");
const workRepo = path.join(reposRoot.split(":")[0], "sample-apps");
const auditLog = process.env.AGENTS_AUDIT_LOG || path.join(workspace, "audit", "events.jsonl");
const artifactRoot = process.env.AGENTS_ARTIFACT_STORE || path.join(workspace, "artifacts");
const defaultPoliciesDir = "policies";
const policiesDir = process.env.AGENTS_POLICIES_DIR || path.join(repoRoot, defaultPoliciesDir);
// Set AGENTS_DRY_RUN=0 to run the same flow against real supervised CLIs.
const dryRun = process.env.AGENTS_DRY_RUN === "0" ? "0" : "1";
const secret = "AKIAMVP2SMOKE123456";

function fail(message, extra = "") {
  process.stderr.write(`${message}\n${extra}`);
  process.exit(1);
}

function commandExists(command) {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

function ensureRuntime() {
  fs.mkdirSync(workRepo, { recursive: true });
  if (dryRun === "0") {
    const missing = ["tmux", "codex", "claude"].filter((command) => !commandExists(command));
    if (missing.length > 0) {
      fail(`MVP2.0 smoke failed: missing real runtime command(s): ${missing.join(", ")}`);
    }
    const result = spawnSync("git", ["init"], { cwd: workRepo, encoding: "utf-8" });
    if (result.status !== 0) fail("MVP2.0 smoke failed: git init failed", result.stderr);
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
        clientInfo: { name: "mvp2-smoke", version: "0" },
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
    `AGENTS_REPO_ROOTS=${shellQuote(reposRoot)}`,
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
    fail(`MVP2.0 smoke failed: MCP request ${method} exited ${result.status}`, stderr);
  }

  const responses = stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const response = responses.find((item) => item.id === 2);
  if (!response) fail(`MVP2.0 smoke failed: missing MCP response for ${method}`, stdout + stderr);
  if (response.error) fail(`MVP2.0 smoke failed: ${method} returned JSON-RPC error`, JSON.stringify(response.error));
  return response;
}

async function waitForFile(filePath, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) return;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  fail(`MVP2.0 smoke failed: timed out waiting for ${filePath}`);
}

function callTool(name, args = {}) {
  const response = mcpRequest("tools/call", { name, arguments: args });
  if (response.result?.isError) {
    fail(`MVP2.0 smoke failed: tool ${name} returned an error`, JSON.stringify(parseToolBody(response.result)));
  }
  return parseToolBody(response.result);
}

function requireTools() {
  const toolsList = mcpRequest("tools/list", {});
  const names = new Set((toolsList.result.tools || []).map((tool) => tool.name));
  for (const name of ["agent.spawn", "agent.ask", "agent.view", "artifact.share", "orchestration.complete"]) {
    if (!names.has(name)) fail(`MVP2.0 smoke failed: ${name} not listed`);
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

  let traceId = null;
  let coderSession = null;
  let reviewerSession = null;
  let coderSessionId = null;
  let reviewerSessionId = null;

  try {
    const orchestration = callTool("orchestration.create", {
      callerAgent: "claude-code",
      callerRole: "orchestrator",
      goal: "MVP2.0 smoke two-agent flow",
    });
    traceId = orchestration.traceId;

    const coderTask = callTool("task.assign", {
      traceId,
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "codex", role: "coder", action: "code.write" },
      repo: "sample-apps",
      brief: "Create HELLO.md for MVP2 smoke.",
    });
    coderSession = callTool("agent.spawn", {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      cwd: workRepo,
      traceId,
      taskId: coderTask.taskId,
      model: "gpt-6.1-sol",
      reasoningEffort: "max",
      serviceTier: "priority",
    });
    coderSessionId = coderSession.sessionId;

    callTool("agent.ask", {
      sessionId: coderSession.sessionId,
      traceId,
      prompt:
        "Create a file named HELLO.md in the current repository with exactly this content: " +
        "MVP2 smoke coder wrote this file. Then stop.",
    });
    if (dryRun === "0") {
      await waitForFile(path.join(workRepo, "HELLO.md"));
    }
    callTool("agent.view", { sessionId: coderSession.sessionId, traceId });

    const rawArtifact = callTool("artifact.put", {
      traceId,
      kind: "raw_diff",
      classification: "restricted",
      producedBy: coderSession.sessionId,
      content: `diff --git a/HELLO.md b/HELLO.md\n+MVP2 smoke coder wrote this file.\n+token=${secret}`,
    });
    const sharedForReviewer = callTool("artifact.share", {
      traceId,
      artifactId: rawArtifact.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });
    const reviewerArtifact = callTool("artifact.get", {
      artifactId: sharedForReviewer.sharedArtifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });
    if (JSON.stringify(reviewerArtifact).includes(secret)) {
      fail("MVP2.0 smoke failed: reviewer received unsanitized secret");
    }

    const reviewerTask = callTool("task.assign", {
      traceId,
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "claude-code", role: "reviewer", action: "artifact.put.review_notes" },
      repo: "sample-apps",
      brief: "Review sanitized MVP2 smoke diff.",
    });
    reviewerSession = callTool("agent.spawn", {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      cwd: workRepo,
      traceId,
      taskId: reviewerTask.taskId,
      model: "claude-opus-5-5",
      reasoningEffort: "max",
    });
    reviewerSessionId = reviewerSession.sessionId;
    callTool("agent.ask", {
      sessionId: reviewerSession.sessionId,
      traceId,
      prompt: `Review this sanitized diff and summarize blockers:\n${reviewerArtifact.content}`,
    });
    const reviewerView = callTool("agent.view", {
      sessionId: reviewerSession.sessionId,
      traceId,
    });
    const reviewNotes = callTool("artifact.put", {
      traceId,
      kind: "review_notes",
      classification: "internal",
      producedBy: reviewerSession.sessionId,
      content: reviewerView.snapshot || "Reviewer session captured.",
    });

    callTool("agent.kill", { sessionId: reviewerSession.sessionId, traceId });
    reviewerSession = null;
    callTool("agent.kill", { sessionId: coderSession.sessionId, traceId });
    coderSession = null;
    callTool("orchestration.complete", { traceId });

    const artifacts = callTool("artifact.list", {
      traceId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });
    const events = auditEvents(traceId);
    const eventTypes = new Set(events.map((event) => event.type));
    for (const eventType of ["AGENT_MODEL_RESOLVED", "SANITIZATION_APPLIED", "ORCHESTRATION_COMPLETED"]) {
      if (!eventTypes.has(eventType)) fail(`MVP2.0 smoke failed: missing audit event ${eventType}`);
    }

    process.stdout.write(
      [
        "MVP2.0 smoke",
        `  coder    : codex model=gpt-6.1-sol effort=max serviceTier=priority sandbox=${process.env.AGENTS_CODEX_SANDBOX || "workspace-write"}`,
        "  reviewer : claude-code model=claude-opus-5-5 effort=max",
        `  sessions : ${coderSessionId}, ${reviewerSessionId}`,
        `  artifacts: ${artifactRoot} (${artifacts.length} recorded, review=${reviewNotes.artifactId})`,
        `  audit    : ${auditLog}`,
        `  mode     : ${dryRun === "1" ? "dry-run" : "real"}`,
        "  result   : OK",
        "",
      ].join("\n"),
    );
  } catch (err) {
    if (traceId && reviewerSession?.sessionId) {
      try {
        callTool("agent.kill", { sessionId: reviewerSession.sessionId, traceId });
      } catch (_killErr) {
        // Best-effort cleanup after a failed smoke.
      }
    }
    if (traceId && coderSession?.sessionId) {
      try {
        callTool("agent.kill", { sessionId: coderSession.sessionId, traceId });
      } catch (_killErr) {
        // Best-effort cleanup after a failed smoke.
      }
    }
    throw err;
  }
}

run().catch((err) => fail("MVP2.0 smoke failed", `${err?.stack || err}\n`));

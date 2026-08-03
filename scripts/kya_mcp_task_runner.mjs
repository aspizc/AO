#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const orchestratorRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server = path.join(orchestratorRoot, "gateway", "src", "mcp_server.js");
const workspace = process.env.AGENTS_WORKSPACE || fs.mkdtempSync(path.join(os.tmpdir(), "kya-agents-"));
const policiesDir = process.env.AGENTS_POLICIES_DIR || path.join(orchestratorRoot, "policies");
const repoRoots = process.env.AGENTS_REPO_ROOTS || "/home/carase/git/experiments/kya";
const dryRun = process.env.AGENTS_DRY_RUN || "1";
const repo = process.env.KYA_REPO || "kya";
const cwd = process.env.KYA_REPO_CWD || "/home/carase/git/experiments/kya";
const model = process.env.KYA_CODEX_MODEL || "gpt-5.6-sol";
const reasoningEffort = process.env.KYA_CODEX_EFFORT || "max";
const serviceTier = process.env.KYA_CODEX_SERVICE_TIER || "priority";
const taskId = process.env.KYA_TASK_ID || "unknown-task";
const taskSlug = process.env.KYA_TASK_SLUG || taskId.replaceAll("/", "-").replaceAll(".", "-");
const taskTitle = process.env.KYA_TASK_TITLE || taskId;

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function parseToolBody(result) {
  return JSON.parse(result.content[0].text);
}

function request(method, params = {}) {
  const requests = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "kya-task-runner", version: "0" },
      },
    },
    { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
    { jsonrpc: "2.0", id: 2, method, params },
  ];

  const requestDir = fs.mkdtempSync(path.join(workspace, "mcp-call-"));
  const inputFile = path.join(requestDir, "input.jsonl");
  const stdoutFile = path.join(requestDir, "stdout.log");
  const stderrFile = path.join(requestDir, "stderr.log");
  fs.mkdirSync(requestDir, { recursive: true });
  fs.writeFileSync(inputFile, `${requests.map((item) => JSON.stringify(item)).join("\n")}\n`);

  const command = [
    `AGENTS_WORKSPACE=${shellQuote(workspace)}`,
    `AGENTS_DRY_RUN=${shellQuote(dryRun)}`,
    `AGENTS_POLICIES_DIR=${shellQuote(policiesDir)}`,
    `AGENTS_REPO_ROOTS=${shellQuote(repoRoots)}`,
    `AGENTS_CODEX_BIN=${shellQuote(process.env.AGENTS_CODEX_BIN || "codex")}`,
    `AGENTS_CODEX_SANDBOX=${shellQuote(process.env.AGENTS_CODEX_SANDBOX || "workspace-write")}`,
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
    cwd: orchestratorRoot,
    stdio: "ignore",
    timeout: Number(process.env.KYA_MCP_REQUEST_TIMEOUT_MS || 1200000),
  });
  const stdout = fs.existsSync(stdoutFile) ? fs.readFileSync(stdoutFile, "utf-8") : "";
  const stderr = fs.existsSync(stderrFile) ? fs.readFileSync(stderrFile, "utf-8") : "";
  if (result.status !== 0) {
    throw new Error(`MCP request ${method} exited ${result.status}\nSTDERR:\n${stderr}`);
  }

  const responses = stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const response = responses.find((item) => item.id === 2);
  if (!response) throw new Error(`Missing MCP response for ${method}\n${stdout}\n${stderr}`);
  if (response.error) throw new Error(`MCP error for ${method}: ${JSON.stringify(response.error)}`);
  return response;
}

function callTool(name, args = {}) {
  const response = request("tools/call", { name, arguments: args });
  if (response.result?.isError) {
    throw new Error(`Tool ${name} returned error: ${JSON.stringify(parseToolBody(response.result))}`);
  }
  return parseToolBody(response.result);
}

function listTools() {
  const response = request("tools/list", {});
  return response.result.tools.map((tool) => tool.name).sort();
}

function readPromptFile(filePath) {
  if (!filePath) throw new Error("Missing prompt file path");
  return fs.readFileSync(filePath, "utf-8");
}

function requireTools() {
  const tools = listTools();
  const required = [
    "orchestration.create",
    "task.assign",
    "agent.delegate",
    "artifact.put",
    "orchestration.complete",
  ];
  for (const name of required) {
    if (!tools.includes(name)) throw new Error(`Missing MCP tool: ${name}`);
  }
}

function run() {
  requireTools();
  const coderPrompt = readPromptFile(process.env.KYA_CODER_PROMPT);
  const reviewerPrompt = readPromptFile(process.env.KYA_REVIEW_PROMPT);

  const orchestration = callTool("orchestration.create", {
    callerAgent: "codex",
    callerRole: "orchestrator",
    goal: `Implement KYA ${taskId}: ${taskTitle}`,
    prefix: `kya-impl-${taskSlug}`,
  });
  const traceId = orchestration.traceId;

  const coderTask = callTool("task.assign", {
    traceId,
    caller: { agent: "codex", role: "orchestrator" },
    target: { agent: "codex", role: "coder", action: "code.write" },
    repo,
    brief: `Implement ${taskId}: ${taskTitle}.`,
  });
  const coder = callTool("agent.delegate", {
    agent: "codex",
    role: "coder",
    repo,
    cwd,
    prompt: coderPrompt,
    traceId,
    taskId: coderTask.taskId,
    model,
    reasoningEffort,
    serviceTier,
  });
  callTool("artifact.put", {
    traceId,
    kind: "implementation_notes",
    classification: "internal",
    producedBy: coder.sessionId || "codex-coder",
    content: `Codex coder result for ${taskId}\n\nstdout:\n${coder.stdout || ""}\n\nstderr:\n${coder.stderr || ""}\n`,
  });

  const reviewerAgent = process.env.KYA_REVIEWER_AGENT || "codex";
  const reviewerModel = process.env.KYA_REVIEWER_MODEL || (reviewerAgent === "codex" ? model : null);
  const reviewerEffort =
    process.env.KYA_REVIEWER_EFFORT || (reviewerAgent === "codex" ? reasoningEffort : null);
  const reviewerServiceTier =
    process.env.KYA_REVIEWER_SERVICE_TIER || (reviewerAgent === "codex" ? serviceTier : null);

  const reviewTask = callTool("task.assign", {
    traceId,
    caller: { agent: "codex", role: "orchestrator" },
    target: { agent: reviewerAgent, role: "reviewer", action: "code.write" },
    repo,
    brief: `Review ${taskId} implementation and write review notes or narrow fixes.`,
  });
  const reviewer = callTool("agent.delegate", {
    agent: reviewerAgent,
    role: "reviewer",
    repo,
    cwd,
    prompt: reviewerPrompt,
    traceId,
    taskId: reviewTask.taskId,
    ...(reviewerModel ? { model: reviewerModel } : {}),
    ...(reviewerEffort ? { reasoningEffort: reviewerEffort } : {}),
    ...(reviewerServiceTier ? { serviceTier: reviewerServiceTier } : {}),
  });
  callTool("artifact.put", {
    traceId,
    kind: "review_notes",
    classification: "internal",
    producedBy: reviewer.sessionId || `${reviewerAgent}-reviewer`,
    content: `${reviewerAgent} reviewer result for ${taskId}\n\nstdout:\n${reviewer.stdout || ""}\n\nstderr:\n${reviewer.stderr || ""}\n`,
  });

  callTool("orchestration.complete", { traceId });
  console.log(
    JSON.stringify(
      {
        traceId,
        taskId,
        taskTitle,
        model,
        reasoningEffort,
        serviceTier,
        coder: {
          taskId: coderTask.taskId,
          sessionId: coder.sessionId || null,
          status: coder.status || null,
          exitCode: coder.exitCode ?? null,
        },
        reviewer: {
          taskId: reviewTask.taskId,
          sessionId: reviewer.sessionId || null,
          status: reviewer.status || null,
          exitCode: reviewer.exitCode ?? null,
        },
      },
      null,
      2,
    ),
  );
}

try {
  run();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}

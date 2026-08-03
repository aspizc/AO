import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { startMcpClient } from "./helpers/mcp_client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SKIP_REASON = "set AGENTS_E2E_REAL=1 and install tmux/codex/claude to run";
const SECRET = "AKIAREALFLOW123456";

function commandExists(command) {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

function skipReason() {
  if (process.env.AGENTS_E2E_REAL !== "1") return SKIP_REASON;
  const missing = ["tmux", "codex", "claude"].filter((command) => !commandExists(command));
  if (missing.length > 0) return `${SKIP_REASON}; missing: ${missing.join(", ")}`;
  return false;
}

function auditEvents(auditLog, traceId) {
  return fs
    .readFileSync(auditLog, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((event) => event.traceId === traceId);
}

function initWorkRepo(cwd) {
  const result = spawnSync("git", ["init"], { cwd, encoding: "utf-8" });
  assert.equal(result.status, 0, result.stderr);
}

async function waitForFile(filePath, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) return;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  assert.fail(`timed out waiting for ${filePath}`);
}

async function bestEffortKill(client, traceId, session) {
  if (!session?.sessionId) return;
  try {
    await client.callTool("agent.kill", { sessionId: session.sessionId, traceId });
  } catch (_err) {
    // Cleanup must not mask the original E2E failure.
  }
}

test("real MVP2 flow runs Codex coder and Claude reviewer through MCP stdio", { skip: skipReason() }, async () => {
  const client = await startMcpClient({
    env: {
      AGENTS_DRY_RUN: "0",
      AGENTS_POLICIES_DIR: path.join(REPO_ROOT, "policies", "profiles", "mvp2"),
    },
  });
  let traceId = null;
  let coderSession = null;
  let reviewerSession = null;

  try {
    initWorkRepo(client.paths.sampleAppsRepo);

    const toolsList = await client.request("tools/list", {});
    const toolNames = new Set(toolsList.result.tools.map((tool) => tool.name));
    for (const name of ["agent.spawn", "agent.ask", "agent.view", "artifact.share"]) {
      assert.ok(toolNames.has(name), `${name} must be exposed`);
    }

    const { body: orchestration } = await client.callTool("orchestration.create", {
      callerAgent: "claude-code",
      callerRole: "orchestrator",
      goal: "Run MVP2 real Codex coder and Claude reviewer",
    });
    traceId = orchestration.traceId;

    const { body: coderTask } = await client.callTool("task.assign", {
      traceId,
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "codex", role: "coder", action: "code.write" },
      repo: "sample-apps",
      brief: "Create HELLO.md with fixed MVP2 content.",
    });

    ({ body: coderSession } = await client.callTool("agent.spawn", {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      cwd: client.paths.sampleAppsRepo,
      traceId,
      taskId: coderTask.taskId,
      model: "gpt-5.6-sol",
      reasoningEffort: "max",
      serviceTier: "priority",
    }));
    assert.equal(coderSession.dryRun, false);

    await client.callTool("agent.ask", {
      sessionId: coderSession.sessionId,
      traceId,
      prompt:
        "Create a file named HELLO.md in the current repository with exactly this content: " +
        "MVP2 real coder wrote this file. Then stop.",
    });
    await waitForFile(path.join(client.paths.sampleAppsRepo, "HELLO.md"));
    await client.callTool("agent.view", { sessionId: coderSession.sessionId, traceId });
    assert.equal(
      fs.readFileSync(path.join(client.paths.sampleAppsRepo, "HELLO.md"), "utf-8").trim(),
      "MVP2 real coder wrote this file.",
    );

    const { body: rawArtifact } = await client.callTool("artifact.put", {
      traceId,
      kind: "raw_diff",
      classification: "restricted",
      producedBy: coderSession.sessionId,
      content: `diff --git a/HELLO.md b/HELLO.md\n+MVP2 real coder wrote this file.\n+token=${SECRET}`,
    });

    const { body: sharedForReviewer } = await client.callTool("artifact.share", {
      traceId,
      artifactId: rawArtifact.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });
    assert.equal(sharedForReviewer.decision, "allow_with_sanitization");

    const { body: reviewerArtifact } = await client.callTool("artifact.get", {
      artifactId: sharedForReviewer.sharedArtifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });
    assert.equal(reviewerArtifact.classification, "internal");
    assert.ok(!reviewerArtifact.content.includes(SECRET));

    const { body: reviewerTask } = await client.callTool("task.assign", {
      traceId,
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "claude-code", role: "reviewer", action: "artifact.put.review_notes" },
      repo: "sample-apps",
      brief: "Review sanitized MVP2 diff.",
    });

    ({ body: reviewerSession } = await client.callTool("agent.spawn", {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      cwd: client.paths.sampleAppsRepo,
      traceId,
      taskId: reviewerTask.taskId,
      model: "claude-fable-5",
      reasoningEffort: "max",
    }));
    assert.equal(reviewerSession.dryRun, false);

    await client.callTool("agent.ask", {
      sessionId: reviewerSession.sessionId,
      traceId,
      prompt: `Review this sanitized diff and summarize any blockers:\n${reviewerArtifact.content}`,
    });
    const { body: reviewerView } = await client.callTool("agent.view", {
      sessionId: reviewerSession.sessionId,
      traceId,
    });

    const { body: reviewNotes } = await client.callTool("artifact.put", {
      traceId,
      kind: "review_notes",
      classification: "internal",
      producedBy: reviewerSession.sessionId,
      content: reviewerView.snapshot || "Reviewer session captured.",
    });
    assert.ok(reviewNotes.artifactId);

    await bestEffortKill(client, traceId, reviewerSession);
    reviewerSession = null;
    await bestEffortKill(client, traceId, coderSession);
    coderSession = null;
    await client.callTool("orchestration.complete", { traceId });

    const events = auditEvents(client.paths.auditLog, traceId);
    const eventTypes = new Set(events.map((event) => event.type));
    for (const eventType of [
      "ORCHESTRATION_CREATED",
      "TASK_CREATED",
      "AGENT_MODEL_RESOLVED",
      "SESSION_STARTED",
      "SESSION_INPUT",
      "ARTIFACT_CREATED",
      "SANITIZATION_APPLIED",
      "ARTIFACT_SHARED",
      "SESSION_CLOSED",
      "ORCHESTRATION_COMPLETED",
    ]) {
      assert.ok(eventTypes.has(eventType), `missing audit event ${eventType}`);
    }

    assert.ok(
      events.some(
        (event) =>
          event.type === "AGENT_MODEL_RESOLVED" &&
          event.agent === "codex" &&
          event.model === "gpt-5.6-sol" &&
          event.reasoningEffort === "max" &&
          event.serviceTier === "priority",
      ),
      "missing resolved Codex model",
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === "AGENT_MODEL_RESOLVED" &&
          event.agent === "claude-code" &&
          event.model === "claude-fable-5" &&
          event.reasoningEffort === "max",
      ),
      "missing resolved Claude model",
    );
    assert.ok(!JSON.stringify([reviewerArtifact, reviewerView]).includes(SECRET));
  } finally {
    if (traceId) {
      await bestEffortKill(client, traceId, reviewerSession);
      await bestEffortKill(client, traceId, coderSession);
    }
    client.cleanup();
  }
});

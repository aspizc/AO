import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { startMcpClient } from "./helpers/mcp_client.js";

const SECRET = "AKIAFAKEKEY1234";

function auditEvents(auditLog, traceId) {
  return fs
    .readFileSync(auditLog, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((event) => event.traceId === traceId);
}

test("orchestrator runs coder and reviewer through real MCP stdio", async () => {
  const client = await startMcpClient();
  try {
    const toolsList = await client.request("tools/list", {});
    const toolNames = new Set(toolsList.result.tools.map((tool) => tool.name));
    for (const name of ["agent.spawn", "agent.delegate", "artifact.share"]) {
      assert.ok(toolNames.has(name), `${name} must be exposed`);
    }

    const { body: orchestration } = await client.callTool("orchestration.create", {
      callerAgent: "claude-code",
      callerRole: "orchestrator",
      goal: "Fix parser and review sanitized diff",
    });

    const { body: coderTask } = await client.callTool("task.assign", {
      traceId: orchestration.traceId,
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "gemini-cli", role: "restricted-coder", action: "code.write" },
      repo: "cvision",
      brief: "Apply parser fix",
    });

    const { body: coderSession } = await client.callTool("agent.spawn", {
      agent: "gemini-cli",
      role: "restricted-coder",
      repo: "cvision",
      cwd: client.paths.cvisionRepo,
      traceId: orchestration.traceId,
      taskId: coderTask.taskId,
    });

    const { body: rawArtifact } = await client.callTool("artifact.put", {
      traceId: orchestration.traceId,
      kind: "raw_diff",
      classification: "restricted",
      producedBy: coderSession.sessionId,
      content: `diff --git a/parser.js b/parser.js\n+const token = '${SECRET}';`,
    });

    const { body: rawForOrchestrator } = await client.callTool("artifact.get", {
      artifactId: rawArtifact.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "orchestrator",
    });
    assert.equal(rawForOrchestrator.error, "POLICY_DENIED");

    const { body: sharedForReviewer } = await client.callTool("artifact.share", {
      traceId: orchestration.traceId,
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
      traceId: orchestration.traceId,
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "claude-code", role: "reviewer", action: "artifact.put.review_notes" },
      repo: "sample-apps",
      brief: "Review sanitized parser diff",
    });

    const { body: reviewerSession } = await client.callTool("agent.delegate", {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      cwd: client.paths.sampleAppsRepo,
      prompt: `Review this sanitized diff:\n${reviewerArtifact.content}`,
      traceId: orchestration.traceId,
      taskId: reviewerTask.taskId,
    });
    assert.equal(reviewerSession.dryRun, true);

    const { body: reviewNotes } = await client.callTool("artifact.put", {
      traceId: orchestration.traceId,
      kind: "review_notes",
      classification: "internal",
      producedBy: reviewerSession.sessionId,
      content: "Review passed on sanitized diff.",
    });
    assert.ok(reviewNotes.artifactId);

    const { body: approval } = await client.callTool("approval.request", {
      traceId: orchestration.traceId,
      action: "git.push.protected",
      requestedBy: "claude-code",
      context: { branch: "main" },
    });
    assert.equal(approval.status, "pending");

    const { body: decision } = await client.callTool("approval.respond", {
      approvalId: approval.approvalId,
      decision: "granted",
      decidedBy: "operator-cli",
      note: "sanitized review accepted",
    });
    assert.equal(decision.status, "granted");

    await client.callTool("agent.kill", {
      sessionId: coderSession.sessionId,
      traceId: orchestration.traceId,
    });
    await client.callTool("orchestration.complete", { traceId: orchestration.traceId });

    const events = auditEvents(client.paths.auditLog, orchestration.traceId);
    const eventTypes = new Set(events.map((event) => event.type));
    for (const eventType of [
      "ORCHESTRATION_CREATED",
      "TASK_CREATED",
      "SESSION_STARTED",
      "ARTIFACT_CREATED",
      "SANITIZATION_APPLIED",
      "ARTIFACT_SHARED",
      "APPROVAL_REQUIRED",
      "APPROVAL_GRANTED",
      "ORCHESTRATION_COMPLETED",
    ]) {
      assert.ok(eventTypes.has(eventType), `missing audit event ${eventType}`);
    }

    const sessions = events.filter((event) => event.type === "SESSION_STARTED");
    assert.ok(sessions.some((event) => event.agent === "gemini-cli" && event.role === "restricted-coder"));
    assert.ok(sessions.some((event) => event.agent === "claude-code" && event.role === "reviewer"));

    const visiblePayloads = [JSON.stringify(rawForOrchestrator), JSON.stringify(reviewerArtifact), reviewerSession.stdout];
    assert.ok(visiblePayloads.every((payload) => !payload.includes(SECRET)));
  } finally {
    client.cleanup();
  }
});

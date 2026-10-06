import { test } from "node:test";
import assert from "node:assert/strict";
import { startHarness } from "./helpers/gateway_harness.js";

test("restricted flow end to end in dry run", async () => {
  const harness = startHarness();
  try {
    const { services, paths } = harness;

    const orchestration = services.orchestration.createOrchestration({
      callerAgent: "claude-code",
      callerRole: "orchestrator",
      goal: "Fix parser in cvision",
    });
    const task = services.task.assignTask({
      traceId: orchestration.traceId,
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "codex", role: "restricted-coder", action: "code.write" },
      repo: "cvision",
      brief: "Apply parser fix",
      registries: services.registries,
    });
    const session = await services.agent.spawn({
      agent: "codex",
      role: "restricted-coder",
      repo: "cvision",
      cwd: paths.cvisionRepo,
      traceId: orchestration.traceId,
      taskId: task.taskId,
    });
    const raw = services.artifacts.put({
      traceId: orchestration.traceId,
      kind: "raw_diff",
      classification: "restricted",
      producedBy: session.sessionId,
      content: "diff --git a/parser.js b/parser.js\n+const token = 'AKIAFAKEKEY1234';",
    });
    const rawForOrchestrator = await services.artifacts.get({
      artifactId: raw.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "orchestrator",
    });
    const sharedForReviewer = services.artifacts.share({
      traceId: orchestration.traceId,
      artifactId: raw.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });
    const reviewedArtifact = await services.artifacts.get({
      artifactId: sharedForReviewer.sharedArtifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });
    const sanitizedForOrchestrator = await services.artifacts.get({
      artifactId: sharedForReviewer.sharedArtifactId,
      requesterAgent: "claude-code",
      requesterRole: "orchestrator",
    });
    const approval = services.approval.request({
      traceId: orchestration.traceId,
      action: "git.push.protected",
      requestedBy: "claude-code",
      context: { branch: "main" },
    });
    const approvalDecision = services.approval.respond({
      approvalId: approval.approvalId,
      decision: "granted",
      decidedBy: "operator-cli",
      note: "release plan reviewed",
    });

    await services.agent.kill({
      sessionId: session.sessionId,
      traceId: orchestration.traceId,
    });
    services.orchestration.completeOrchestration({ traceId: orchestration.traceId });

    const auditEvents = await services.audit.query({ traceId: orchestration.traceId, limit: 200 });
    const eventTypes = new Set(auditEvents.map((event) => event.type));

    assert.equal(rawForOrchestrator.error, "POLICY_DENIED");
    assert.equal(sharedForReviewer.decision, "allow_with_sanitization");
    assert.equal(reviewedArtifact.classification, "internal");
    assert.equal(sanitizedForOrchestrator.classification, "internal");
    assert.ok(!reviewedArtifact.content.includes("AKIAFAKEKEY"));
    assert.ok(!sanitizedForOrchestrator.content.includes("AKIAFAKEKEY"));
    assert.equal(approval.status, "pending");
    assert.equal(approvalDecision.status, "granted");
    for (const eventType of [
      "ORCHESTRATION_CREATED",
      "TASK_CREATED",
      "SESSION_STARTED",
      "ARTIFACT_CREATED",
      "SANITIZATION_APPLIED",
      "ARTIFACT_SHARED",
      "APPROVAL_REQUIRED",
      "APPROVAL_GRANTED",
      "SESSION_CLOSED",
      "ORCHESTRATION_COMPLETED",
    ]) {
      assert.ok(eventTypes.has(eventType), `missing audit event ${eventType}`);
    }
  } finally {
    harness.cleanup();
  }
});

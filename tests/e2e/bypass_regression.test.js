import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { evaluate } from "../../gateway/src/core/policy_engine.js";
import { POLICY_RULE } from "../../gateway/src/core/policy_rules.js";
import * as artifactStore from "../../gateway/src/core/artifact_store.js";
import {
  _resetForTests as resetAudit,
  configureAudit,
} from "../../gateway/src/core/audit.js";
import { createTraceAccessToken } from "../../gateway/src/core/trace_access.js";
import {
  CoordinationError,
  createCoordination,
} from "../../gateway/src/coordination.js";
import {
  createCallToolHandler,
} from "../../gateway/src/mcp_server.js";
import { buildMessageTools } from "../../gateway/src/tools/message.js";
import { buildSessionTools } from "../../gateway/src/tools/session.js";
import {
  MemoryCoordinationQueue,
} from "../gateway/helpers/memory_coordination_queue.js";
import { startHarness } from "./helpers/gateway_harness.js";

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

async function createRestrictedRawArtifact(harness, content = "secret=AKIAFAKEKEY1234") {
  const { services, paths } = harness;
  const orchestration = services.orchestration.createOrchestration({
    callerAgent: "claude-code",
    callerRole: "orchestrator",
    goal: "bypass regression",
  });
  const task = services.task.assignTask({
    traceId: orchestration.traceId,
    caller: { agent: "claude-code", role: "orchestrator" },
    target: { agent: "gemini-cli", role: "restricted-coder", action: "code.write" },
    repo: "cvision",
    brief: "bypass fixture",
    registries: services.registries,
  });
  const session = await services.agent.spawn({
    agent: "gemini-cli",
    role: "restricted-coder",
    repo: "cvision",
    cwd: paths.cvisionRepo,
    traceId: orchestration.traceId,
    taskId: task.taskId,
  });
  const artifact = services.artifacts.put({
    traceId: orchestration.traceId,
    kind: "raw_diff",
    classification: "restricted",
    producedBy: session.sessionId,
    content,
  });
  return { orchestration, task, session, artifact };
}

function createCoordinationHarness({
  audit = () => {},
  config = {},
  queue,
  useDefaultAudit = false,
} = {}) {
  let now = Date.parse("2026-07-25T12:00:00.000Z");
  let participantSequence = 0;
  let tokenSequence = 0;
  const resolvedQueue = queue ?? new MemoryCoordinationQueue({
    prefix: "test:bypass:coord:v1",
  });
  const options = {
    queue: resolvedQueue,
    config: {
      coordinationLeaseDefaultMs: 30_000,
      coordinationLeaseMaxMs: 300_000,
      coordinationMessageMaxBytes: 128,
      coordinationMaxBlockMs: 1_000,
      ...config,
    },
    clock: () => now,
    randomUUID: () => `bypass-participant-${++participantSequence}`,
    randomToken: () =>
      `bypass-lease-token-${String(++tokenSequence).padStart(20, "0")}`,
  };
  if (!useDefaultAudit) options.audit = audit;

  return {
    queue: resolvedQueue,
    service: createCoordination(options),
    advance(ms) {
      now += ms;
    },
    now: () => now,
  };
}

function registerCoordinationParticipant(service, overrides = {}) {
  return service.register({
    participantType: "orchestrator",
    scopeId: "project:v5",
    displayName: "Bypass regression participant",
    capabilities: ["coordination.v1"],
    metadata: { fixture: "bypass-regression" },
    ...overrides,
  });
}

async function expectCoordinationCode(promise, code) {
  await assert.rejects(
    promise,
    (err) => err instanceof CoordinationError && err.code === code,
  );
}

// threat: TM-01
test("prompt_injection_against_orchestrator_cannot_get_raw_restricted", async () => {
  const harness = startHarness();
  try {
    const { artifact } = await createRestrictedRawArtifact(harness);

    const result = await harness.services.artifacts.get({
      artifactId: artifact.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "orchestrator",
    });

    assert.deepEqual(result, {
      error: "POLICY_DENIED",
      code: "POLICY_DENIED",
      message: "request denied by policy",
      decision: {
        decision: "deny",
        ruleId: POLICY_RULE.SANITIZATION_ORCHESTRATOR_RAW,
      },
    });
  } finally {
    harness.cleanup();
  }
});

// threat: TM-08
test("prompt_injection_against_orchestrator_cannot_code_write", () => {
  const harness = startHarness();
  try {
    const decision = evaluate(
      { agent: "claude-code", role: "orchestrator", repo: "sample-apps", action: "code.write" },
      harness.services.registries,
    );

    assert.equal(decision.decision, "deny");
    assert.equal(decision.ruleId, "role.deny_action");
  } finally {
    harness.cleanup();
  }
});

// threat: TM-02
test("child_summary_does_not_leak_raw_restricted_after_sanitizer", async () => {
  const harness = startHarness();
  try {
    const { artifact } = await createRestrictedRawArtifact(harness, "token='AKIAFAKEKEY1234'");

    const shared = harness.services.artifacts.share({
      traceId: artifact.traceId,
      artifactId: artifact.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });
    const result = await harness.services.artifacts.get({
      artifactId: shared.sharedArtifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });

    assert.equal(shared.decision, "allow_with_sanitization");
    assert.equal(result.classification, "internal");
    assert.ok(!result.content.includes("AKIAFAKEKEY"));
  } finally {
    harness.cleanup();
  }
});

// threat: TM-03
test("filesystem_bypass_outside_artifact_store_is_not_visible_to_other_role", async () => {
  const harness = startHarness();
  try {
    const leakPath = path.join(harness.paths.cvisionRepo, "leak.txt");
    fs.writeFileSync(leakPath, "secret=AKIAFAKEKEY1234");

    const orchestration = harness.services.orchestration.createOrchestration({
      callerAgent: "claude-code",
      callerRole: "orchestrator",
      goal: "filesystem bypass",
    });
    const artifacts = harness.services.artifacts.list({ traceId: orchestration.traceId });
    const result = await harness.services.artifacts.get({
      artifactId: "art-not-in-store",
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });

    assert.deepEqual(artifacts, []);
    assert.equal(result.error, "NOT_FOUND");
  } finally {
    harness.cleanup();
  }
});

// threat: TM-04
test("cwd_outside_allowlist_is_rejected_before_spawn", async () => {
  const harness = startHarness();
  try {
    const orchestration = harness.services.orchestration.createOrchestration({
      callerAgent: "claude-code",
      callerRole: "orchestrator",
      goal: "cwd bypass",
    });
    const task = harness.services.task.assignTask({
      traceId: orchestration.traceId,
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "gemini-cli", role: "restricted-coder", action: "code.write" },
      repo: "cvision",
      brief: "cwd bypass",
      registries: harness.services.registries,
    });

    await assert.rejects(
      () =>
        harness.services.agent.spawn({
          agent: "gemini-cli",
          role: "restricted-coder",
          repo: "cvision",
          cwd: "/etc",
          traceId: orchestration.traceId,
          taskId: task.taskId,
        }),
      /outside allowed roots/,
    );
  } finally {
    harness.cleanup();
  }
});

// threat: TM-04
test("cwd_symlink_escape_is_rejected", async () => {
  const harness = startHarness();
  try {
    const link = path.join(harness.paths.reposRoot, "escape");
    fs.symlinkSync("/etc", link);
    const orchestration = harness.services.orchestration.createOrchestration({
      callerAgent: "claude-code",
      callerRole: "orchestrator",
      goal: "symlink bypass",
    });
    const task = harness.services.task.assignTask({
      traceId: orchestration.traceId,
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "gemini-cli", role: "restricted-coder", action: "code.write" },
      repo: "cvision",
      brief: "symlink bypass",
      registries: harness.services.registries,
    });

    await assert.rejects(
      () =>
        harness.services.agent.spawn({
          agent: "gemini-cli",
          role: "restricted-coder",
          repo: "cvision",
          cwd: link,
          traceId: orchestration.traceId,
          taskId: task.taskId,
        }),
      /outside allowed roots/,
    );
  } finally {
    harness.cleanup();
  }
});

// threat: TM-05
test("tmux_intervention_is_audited_or_flagged", async () => {
  const harness = startHarness();
  try {
    const tools = Object.fromEntries(buildSessionTools().map((tool) => [tool.name, tool]));
    const result = parseToolResult(
      await tools["session.intervention_note"].handler({
        sessionId: "ag-test",
        traceId: "tr-intervention",
        note: "operator typed into supervised pane",
        by: "operator",
      }),
    );
    const events = await harness.services.audit.query({
      traceId: "tr-intervention",
      type: "HUMAN_TMUX_INTERVENTION_NOTE",
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(events.length, 1);
  } finally {
    harness.cleanup();
  }
});

// threat: TM-06
test("sanitizer_failure_blocks_cross_boundary_get", async () => {
  const harness = startHarness();
  try {
    artifactStore._setSanitizeForTests(() => {
      throw new Error("sanitizer boom");
    });
    const { artifact } = await createRestrictedRawArtifact(harness);

    const result = await harness.services.artifacts.get({
      artifactId: artifact.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });
    const events = await harness.services.audit.query({
      traceId: artifact.traceId,
      type: "SANITIZATION_FAILED",
    });

    assert.equal(result.error, "POLICY_DENIED");
    assert.equal(result.decision.ruleId, "sanitization.missing");
    assert.equal(events.length, 1);
  } finally {
    artifactStore._resetSanitizeForTests();
    harness.cleanup();
  }
});

// threat: TM-07
test("approval_respond_with_unknown_id_is_rejected", () => {
  const harness = startHarness();
  try {
    assert.throws(
      () =>
        harness.services.approval.respond({
          approvalId: "apr-00000000-0000-4000-8000-000000000000",
          decision: "granted",
          decidedBy: "operator-cli",
        }),
      /not found/,
    );
  } finally {
    harness.cleanup();
  }
});

// threat: TM-07
test("approval_respond_replay_does_not_grant_again", async () => {
  const harness = startHarness();
  try {
    const approval = harness.services.approval.request({
      traceId: "tr-approval-replay",
      action: "git.push.protected",
      requestedBy: "claude-code",
      context: { branch: "main" },
    });
    const first = harness.services.approval.respond({
      approvalId: approval.approvalId,
      decision: "granted",
      decidedBy: "operator-cli",
    });
    const replay = harness.services.approval.respond({
      approvalId: approval.approvalId,
      decision: "denied",
      decidedBy: "operator-cli",
    });
    const grantedEvents = await harness.services.audit.query({
      traceId: "tr-approval-replay",
      type: "APPROVAL_GRANTED",
    });

    assert.equal(first.status, "granted");
    assert.equal(replay.status, "granted");
    assert.equal(grantedEvents.length, 1);
  } finally {
    harness.cleanup();
  }
});

// threat: TM-09
test("cross_trace_artifact_access_denied", async () => {
  const harness = startHarness();
  try {
    const { artifact } = await createRestrictedRawArtifact(harness);
    const other = harness.services.orchestration.createOrchestration({
      callerAgent: "claude-code",
      callerRole: "orchestrator",
      goal: "other trace",
    });

    const result = harness.services.artifacts.share({
      traceId: other.traceId,
      artifactId: artifact.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    });

    assert.equal(result.error, "POLICY_DENIED");
    assert.equal(result.decision.ruleId, "share.cross_trace");
  } finally {
    harness.cleanup();
  }
});

// threat: TM-09
test("cross_trace_message_access_denied", async () => {
  const harness = startHarness();
  try {
    const config = { messageAccessSecret: "bypass-message-secret" };
    const tools = Object.fromEntries(buildMessageTools({ config }).map((tool) => [tool.name, tool]));
    const tokenFor = (traceId) => createTraceAccessToken(traceId, config);
    const sent = parseToolResult(
      await tools["message.send"].handler({
        traceId: "tr-message-bypass",
        accessToken: tokenFor("tr-message-bypass"),
        fromId: "orchestrator",
        toId: "coder",
        body: "restricted context stays in this trace",
      }),
    );

    const result = parseToolResult(
      await tools["message.reply"].handler({
        traceId: "tr-message-bypass-other",
        accessToken: tokenFor("tr-message-bypass-other"),
        parentMessageId: sent.messageId,
        fromId: "reviewer",
        toId: "orchestrator",
        body: "attempt cross-trace reply",
      }),
    );
    const listed = parseToolResult(
      await tools["message.list"].handler({
        traceId: "tr-message-bypass",
        accessToken: tokenFor("tr-message-bypass-other"),
      }),
    );
    const forged = parseToolResult(
      await tools["message.list"].handler({
        traceId: "tr-message-bypass",
        accessToken: "not-a-valid-token",
      }),
    );
    const otherTraceMessages = parseToolResult(
      await tools["message.list"].handler({
        traceId: "tr-message-bypass-other",
        accessToken: tokenFor("tr-message-bypass-other"),
      }),
    );

    assert.equal(result.error, "PARENT_NOT_FOUND");
    assert.equal(listed.error, "TRACE_ACCESS_DENIED");
    assert.equal(forged.error, "TRACE_ACCESS_DENIED");
    assert.deepEqual(otherTraceMessages, []);
  } finally {
    harness.cleanup();
  }
});

// threat: TM-10
test("mcp_stdout_only_contains_protocol_frames", () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-stdout-bypass-"));
  const stdoutFile = path.join(workspace, "stdout.log");
  const stderrFile = path.join(workspace, "stderr.log");
  const result = spawnSync(
    "bash",
    ["-lc", `node scripts/smoke_mcp.mjs > '${stdoutFile}' 2> '${stderrFile}'`],
    {
      cwd: root,
      stdio: "ignore",
      timeout: 5000,
    },
  );
  const stdout = fs.readFileSync(stdoutFile, "utf-8");

  assert.equal(result.status, 0);
  assert.match(stdout, /MCP smoke OK/);
  fs.rmSync(workspace, { recursive: true, force: true });
});

// threat: TM-11
test("approval_wait_never_exceeds_server_cap", async () => {
  const harness = startHarness();
  try {
    const approval = harness.services.approval.request({
      traceId: "tr-wait-cap",
      action: "git.push.protected",
      requestedBy: "claude-code",
      context: { branch: "main" },
    });
    const started = Date.now();
    const result = await harness.services.approval.waitForDecision({
      approvalId: approval.approvalId,
      timeoutMs: 1000,
      serverMaxMs: 10,
    });
    const elapsed = Date.now() - started;
    const events = await harness.services.audit.query({
      traceId: "tr-wait-cap",
      type: "APPROVAL_WAIT_TIMEOUT",
    });

    assert.equal(result.status, "pending");
    assert.ok(elapsed < 500, `wait exceeded cap: ${elapsed}ms`);
    assert.equal(events.length, 1);
    assert.equal(events[0].timeoutMs, 10);
  } finally {
    harness.cleanup();
  }
});

// threat: TM-12
test("autoapproval_never_grants_protected_or_restricted_even_if_listed", async () => {
  const harness = startHarness();
  try {
    const protectedApproval = harness.services.approval.request({
      traceId: "tr-autoapprove-protected-bypass",
      action: "git.push.protected",
      requestedBy: "claude-code",
      context: { branch: "main" },
      config: { autoApproveScopes: ["git.push.protected", "plan.apply"] },
    });
    const restrictedApproval = harness.services.approval.request({
      traceId: "tr-autoapprove-restricted-bypass",
      action: "plan.apply",
      requestedBy: "claude-code",
      context: { repo: "cvision", classification: "restricted" },
      config: { autoApproveScopes: ["plan.apply"] },
    });
    const protectedAutoGrants = await harness.services.audit.query({
      traceId: "tr-autoapprove-protected-bypass",
      type: "APPROVAL_AUTO_GRANTED",
    });
    const restrictedAutoGrants = await harness.services.audit.query({
      traceId: "tr-autoapprove-restricted-bypass",
      type: "APPROVAL_AUTO_GRANTED",
    });

    assert.equal(protectedApproval.status, "pending");
    assert.equal(restrictedApproval.status, "pending");
    assert.equal(protectedAutoGrants.length, 0);
    assert.equal(restrictedAutoGrants.length, 0);
  } finally {
    harness.cleanup();
  }
});

// threat: TM-13
test("stale coordination lease cannot act as a replacement incarnation", async () => {
  const auditEvents = [];
  const { queue, service } = createCoordinationHarness({
    audit: (event) => auditEvents.push(event),
  });
  const stale = await registerCoordinationParticipant(service);
  const recipient = await registerCoordinationParticipant(service, {
    participantType: "agent",
  });
  const replacementToken = "replacement-lease-token-00000000000001";
  const replacement = queue.participants.get(stale.participantId);
  replacement.leaseTokenHash = crypto
    .createHash("sha256")
    .update(replacementToken)
    .digest("hex");
  queue.participants.set(stale.participantId, replacement);
  const auditCountBeforeAttempts = auditEvents.length;

  const attempts = [
    () => service.heartbeat({
      participantId: stale.participantId,
      leaseToken: stale.leaseToken,
    }),
    () => service.discover({
      participantId: stale.participantId,
      leaseToken: stale.leaseToken,
    }),
    () => service.send({
      participantId: stale.participantId,
      leaseToken: stale.leaseToken,
      toParticipantId: recipient.participantId,
      messageType: "NOTICE",
      classification: "internal",
      body: "stale sender attempt",
    }),
    () => service.receive({
      participantId: stale.participantId,
      leaseToken: stale.leaseToken,
      consumerId: "stale-consumer",
    }),
    () => service.ack({
      participantId: stale.participantId,
      leaseToken: stale.leaseToken,
      deliveryIds: ["1-0"],
    }),
    () => service.unregister({
      participantId: stale.participantId,
      leaseToken: stale.leaseToken,
    }),
  ];

  for (const attempt of attempts) {
    await expectCoordinationCode(attempt(), "COORDINATION_AUTH_FAILED");
  }
  assert.equal(
    queue.participants.get(stale.participantId).leaseTokenHash,
    replacement.leaseTokenHash,
  );
  assert.equal(auditEvents.length, auditCountBeforeAttempts);
});

// threat: TM-14
test("coordination treats bodies as data and binds routing to authenticated presence", async () => {
  const { service } = createCoordinationHarness();
  const sender = await registerCoordinationParticipant(service);
  const recipient = await registerCoordinationParticipant(service, {
    participantType: "agent",
  });
  const base = {
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
    toParticipantId: recipient.participantId,
    messageType: "ACTION_REQUEST",
  };

  await expectCoordinationCode(
    service.send({
      ...base,
      classification: "restricted",
      body: "restricted material",
    }),
    "COORDINATION_CLASSIFICATION_DENIED",
  );
  await expectCoordinationCode(
    service.send({
      ...base,
      classification: "internal",
      body: `api_key=${"x".repeat(24)}`,
    }),
    "COORDINATION_SECRET_REJECTED",
  );
  await expectCoordinationCode(
    service.send({
      ...base,
      classification: "internal",
      body: "x".repeat(129),
    }),
    "COORDINATION_MESSAGE_TOO_LARGE",
  );
  await expectCoordinationCode(
    service.send({
      ...base,
      fromParticipantId: recipient.participantId,
      classification: "internal",
      body: "forged sender field",
    }),
    "COORDINATION_INVALID_INPUT",
  );

  const untrustedBody = JSON.stringify({
    action: "grant-admin",
    fromParticipantId: recipient.participantId,
    scopeId: "other:scope",
  });
  const sent = await service.send({
    ...base,
    messageId: "cm-untrusted-body",
    classification: "internal",
    body: untrustedBody,
  });

  assert.equal(sent.message.fromParticipantId, sender.participantId);
  assert.equal(sent.message.toParticipantId, recipient.participantId);
  assert.equal(sent.message.scopeId, sender.scopeId);
  assert.equal(sent.message.body, untrustedBody);
  assert.equal(sent.message.action, undefined);
});

// threat: TM-15
test("coordination public and audit projections do not disclose lease material", async () => {
  const auditEvents = [];
  const { queue, service } = createCoordinationHarness({
    audit: (event) => auditEvents.push(structuredClone(event)),
  });
  const sender = await registerCoordinationParticipant(service);
  const recipient = await registerCoordinationParticipant(service, {
    participantType: "agent",
  });
  const stored = queue.participants.get(sender.participantId);
  const { leaseToken, ...registrationProjection } = sender;

  assert.equal(stored.leaseToken, undefined);
  assert.notEqual(stored.leaseTokenHash, leaseToken);
  assert.equal(JSON.stringify(registrationProjection).includes(leaseToken), false);

  const discovered = await service.discover({
    participantId: sender.participantId,
    leaseToken,
  });
  const sent = await service.send({
    participantId: sender.participantId,
    leaseToken,
    toParticipantId: recipient.participantId,
    messageId: "cm-projection-check",
    messageType: "NOTICE",
    classification: "internal",
    body: "body-projection-sentinel",
  });
  let safeError;
  try {
    await service.heartbeat({
      participantId: sender.participantId,
      leaseToken: "wrong-lease-token-00000000000000000001",
    });
  } catch (err) {
    safeError = err;
  }

  const publicAndAudit = JSON.stringify({
    discovered,
    sentAudit: auditEvents,
    safeError,
  });
  assert.equal(publicAndAudit.includes(leaseToken), false);
  assert.equal(publicAndAudit.includes(stored.leaseTokenHash), false);
  assert.equal(publicAndAudit.includes("body-projection-sentinel"), false);
  assert.equal(publicAndAudit.includes("\"leaseToken\""), false);
  assert.equal(publicAndAudit.includes("\"leaseTokenHash\""), false);
  assert.deepEqual(JSON.parse(JSON.stringify(safeError)), {
    name: "CoordinationError",
    code: "COORDINATION_AUTH_FAILED",
  });
});

// threat: TM-16
test("coordination rejects cross-scope delivery and cross-inbox acknowledgement", async () => {
  const { service } = createCoordinationHarness();
  const sender = await registerCoordinationParticipant(service);
  const recipient = await registerCoordinationParticipant(service, {
    participantType: "agent",
  });
  const sameScopeIntruder = await registerCoordinationParticipant(service, {
    participantType: "agent",
  });
  const otherScope = await registerCoordinationParticipant(service, {
    participantType: "agent",
    scopeId: "other:project",
  });

  const visible = await service.discover({
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
  });
  assert.equal(
    visible.some(({ participantId }) => participantId === otherScope.participantId),
    false,
  );
  await expectCoordinationCode(
    service.discover({
      participantId: sender.participantId,
      leaseToken: sender.leaseToken,
      scopeId: otherScope.scopeId,
    }),
    "COORDINATION_SCOPE_MISMATCH",
  );
  await expectCoordinationCode(
    service.send({
      participantId: sender.participantId,
      leaseToken: sender.leaseToken,
      toParticipantId: otherScope.participantId,
      messageType: "NOTICE",
      classification: "internal",
      body: "cross-scope attempt",
    }),
    "COORDINATION_SCOPE_MISMATCH",
  );

  await service.send({
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
    toParticipantId: recipient.participantId,
    messageId: "cm-inbox-boundary",
    messageType: "NOTICE",
    classification: "internal",
    body: "recipient-bound delivery",
  });
  const [delivery] = await service.receive({
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    consumerId: "recipient-consumer",
  });
  await expectCoordinationCode(
    service.ack({
      participantId: sameScopeIntruder.participantId,
      leaseToken: sameScopeIntruder.leaseToken,
      deliveryIds: [delivery.deliveryId],
    }),
    "COORDINATION_DELIVERY_NOT_FOUND",
  );
  assert.deepEqual(
    await service.ack({
      participantId: recipient.participantId,
      leaseToken: recipient.leaseToken,
      deliveryIds: [delivery.deliveryId],
    }),
    {
      ackedCount: 1,
      deliveryIds: [delivery.deliveryId],
    },
  );
});

// threat: TM-17
test("supported coordination boundary fails closed on raw malformed store state", async () => {
  const presenceAudit = [];
  const presenceHarness = createCoordinationHarness({
    audit: (event) => presenceAudit.push(event),
  });
  const participant = await registerCoordinationParticipant(
    presenceHarness.service,
  );
  const malformedPresence = presenceHarness.queue.participants.get(
    participant.participantId,
  );
  malformedPresence.leaseTokenHash = "not-a-sha256-digest";
  presenceHarness.queue.participants.set(
    participant.participantId,
    malformedPresence,
  );
  const presenceAuditCount = presenceAudit.length;

  await expectCoordinationCode(
    presenceHarness.service.heartbeat({
      participantId: participant.participantId,
      leaseToken: participant.leaseToken,
    }),
    "COORDINATION_INTERNAL_ERROR",
  );
  assert.equal(presenceAudit.length, presenceAuditCount);

  const inboxAudit = [];
  const inboxHarness = createCoordinationHarness({
    audit: (event) => inboxAudit.push(event),
  });
  const recipient = await registerCoordinationParticipant(inboxHarness.service);
  const rawBody = `api_key=${"z".repeat(24)}`;
  inboxHarness.queue.inboxes.get(recipient.participantId).push({
    deliveryId: "900-0",
    message: {
      protocolVersion: 1,
      messageId: "cm-raw-write",
      fromParticipantId: "pt-raw-writer",
      toParticipantId: recipient.participantId,
      scopeId: recipient.scopeId,
      messageType: "NOTICE",
      classification: "internal",
      body: rawBody,
      createdAt: "2026-07-25T12:00:00.000Z",
    },
    consumerId: null,
    deliveredAt: null,
    acked: false,
  });
  const inboxAuditCount = inboxAudit.length;

  await expectCoordinationCode(
    inboxHarness.service.receive({
      participantId: recipient.participantId,
      leaseToken: recipient.leaseToken,
      consumerId: "safe-consumer",
    }),
    "COORDINATION_INTERNAL_ERROR",
  );
  assert.equal(inboxAudit.length, inboxAuditCount);
  assert.equal(
    inboxHarness.queue.inboxes
      .get(recipient.participantId)
      .some(({ message }) => message.body === rawBody),
    true,
  );
  // This models the raw-store boundary only: ACL/TLS enforcement remains an
  // operator control, while supported reads must not return malformed data.
});

// threat: TM-18
test("coordination domain and namespace audit never publish to agents events", async (t) => {
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "coord-bypass-audit-"));
  const auditLog = path.join(workspace, "audit", "events.jsonl");
  const published = [];
  t.after(() => {
    resetAudit();
    fs.rmSync(workspace, { recursive: true, force: true });
  });
  configureAudit({
    auditLog,
    redisStream: "agents:events",
    redisPublisher: (entry) => published.push(entry),
  });
  const { service } = createCoordinationHarness({ useDefaultAudit: true });
  await registerCoordinationParticipant(service);
  const handler = createCallToolHandler({
    tools: [
      {
        name: "legacy.probe",
        handler: async () => ({
          content: [{ type: "text", text: "{\"ok\":true}" }],
        }),
      },
    ],
  });

  await assert.rejects(
    handler({
      params: {
        name: "coordination.missing",
        arguments: {
          leaseToken: "audit-lease-sentinel-000000000000001",
          body: "audit-body-sentinel",
        },
      },
    }),
    (error) => (
      error instanceof Error
      && error.message === "unknown tool"
      && !error.message.includes("coordination.missing")
    ),
  );
  await handler({
    params: {
      name: "legacy.probe",
      arguments: {},
    },
  });

  const events = fs
    .readFileSync(auditLog, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const coordinationEvents = events.filter(
    ({ type, toolName }) =>
      type.startsWith("COORDINATION_")
      || toolName?.startsWith("coordination."),
  );
  assert.equal(coordinationEvents.length, 2);
  assert.equal(JSON.stringify(coordinationEvents).includes("audit-lease-sentinel"), false);
  assert.equal(JSON.stringify(coordinationEvents).includes("audit-body-sentinel"), false);
  assert.equal(published.length, 1);
  assert.equal(published[0].stream, "agents:events");
  assert.equal(published[0].envelope.tool_name, "legacy.probe");
});

// threat: TM-19
test("bounded dedupe contract allows redelivery after the backing record expires", async () => {
  let now = Date.parse("2026-07-25T12:00:00.000Z");
  class ExpiringDedupeQueue extends MemoryCoordinationQueue {
    constructor() {
      super({ prefix: "test:bypass:dedupe:v1" });
      this.observedDedupeTtls = [];
    }

    async putMessage(envelope, options) {
      const key = `${envelope.fromParticipantId}:${envelope.messageId}`;
      const existing = this.messages.get(key);
      if (existing?.dedupeExpiresAt <= now) this.messages.delete(key);
      const result = await super.putMessage(envelope, options);
      this.observedDedupeTtls.push(options.dedupeTtlMs);
      this.messages.get(key).dedupeExpiresAt = now + options.dedupeTtlMs;
      return result;
    }
  }
  const queue = new ExpiringDedupeQueue();
  const harness = createCoordinationHarness({
    queue,
    config: { coordinationDedupeTtlMs: 50 },
  });
  now = harness.now();
  const sender = await registerCoordinationParticipant(harness.service);
  const recipient = await registerCoordinationParticipant(harness.service, {
    participantType: "agent",
  });
  const args = {
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
    toParticipantId: recipient.participantId,
    messageId: "cm-bounded-replay",
    messageType: "NOTICE",
    classification: "internal",
    body: "idempotent while dedupe exists",
  };

  const first = await harness.service.send(args);
  const duplicate = await harness.service.send(args);
  harness.advance(51);
  now = harness.now();
  const afterWindow = await harness.service.send(args);
  const deliveries = await harness.service.receive({
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    consumerId: "dedupe-consumer",
    count: 10,
  });

  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.deliveryId, first.deliveryId);
  assert.equal(afterWindow.duplicate, false);
  assert.notEqual(afterWindow.deliveryId, first.deliveryId);
  assert.deepEqual(queue.observedDedupeTtls, [50, 50, 50]);
  assert.equal(deliveries.length, 2);
  assert.deepEqual(
    deliveries.map(({ message }) => message.messageId),
    ["cm-bounded-replay", "cm-bounded-replay"],
  );
  // The in-memory adapter models the documented expiry boundary. Redis TTL
  // mechanics remain covered by the queue-specific tests named in the model.
});

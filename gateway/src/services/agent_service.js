import { newSessionId } from "../core/ids.js";
import { evaluate } from "../core/policy_engine.js";
import * as sessionRepo from "../core/repositories/session_repo.js";
import { append as auditAppend } from "../core/audit.js";
import { checkForIntervention, recordExpectedAsk } from "../adapters/intervention_detector.js";
import { withTimeout } from "./_with_timeout.js";

export class PolicyDeniedError extends Error {
  constructor(decision) {
    super(decision.reason);
    this.name = "PolicyDeniedError";
    this.code = "POLICY_DENIED";
    this.decision = decision;
  }
}

function assertAllowed(registries, ctx) {
  const decision = evaluate(ctx, registries);
  if (decision.decision !== "allow") {
    throw new PolicyDeniedError(decision);
  }
  return decision;
}

function nowIso() {
  return new Date().toISOString();
}

function unknownSession(sessionId) {
  const error = new Error(`unknown session ${sessionId}`);
  error.code = "NOT_FOUND";
  return error;
}

function createSessionIfTaskProvided({ sessionId, taskId, traceId, agent, role, tmuxTarget }) {
  if (!taskId) return null;
  return sessionRepo.createSession({
    sessionId,
    taskId,
    traceId,
    agent,
    role,
    tmuxTarget,
    status: "running",
    startedAt: nowIso(),
    closedAt: null,
  });
}

function closeSessionIfPersisted(sessionId, status) {
  const row = sessionRepo.getSessionById(sessionId);
  if (!row) return;
  sessionRepo.setSessionStatus(sessionId, status, nowIso());
}

function auditServiceError({ traceId, sessionId = null, where, err }) {
  auditAppend({
    type: "ERROR",
    traceId,
    sessionId,
    where,
    error: String(err?.message || err),
    policy: err?.decision || null,
  });
}

async function bestEffortView(adapter, row) {
  try {
    return await adapter.view({ tmuxTarget: row.tmux_target });
  } catch (_err) {
    return null;
  }
}

function bestEffortInterventionCheck({ sessionId, currentSnapshot, traceId }) {
  try {
    checkForIntervention({ sessionId, currentSnapshot, traceId });
  } catch (_err) {
    // Intervention detection must never break the agent control path.
  }
}

function agentTimeout(config) {
  return config?.agentTimeoutMs || 600_000;
}

function effectiveModel(decision) {
  return {
    ...(decision.model ? { model: decision.model } : {}),
    ...(decision.reasoningEffort ? { reasoningEffort: decision.reasoningEffort } : {}),
    ...(decision.serviceTier ? { serviceTier: decision.serviceTier } : {}),
  };
}

function auditModelResolved({ traceId, sessionId = null, agent, role, decision }) {
  if (!decision.model && !decision.reasoningEffort && !decision.serviceTier) return;
  auditAppend({
    type: "AGENT_MODEL_RESOLVED",
    traceId,
    sessionId,
    agent,
    role,
    ...(decision.model ? { model: decision.model } : {}),
    ...(decision.reasoningEffort ? { reasoningEffort: decision.reasoningEffort } : {}),
    ...(decision.serviceTier ? { serviceTier: decision.serviceTier } : {}),
  });
}

export function createAgentService({ adapters, registries, config = {} }) {
  return {
    async delegate({
      agent,
      role,
      repo = null,
      cwd,
      prompt,
      traceId,
      taskId = null,
      model = null,
      reasoningEffort = null,
      serviceTier = null,
    }) {
      const sessionId = newSessionId();
      try {
        const decision = assertAllowed(registries, {
          agent,
          role,
          repo,
          action: "agent.delegate",
          model,
          reasoningEffort,
          serviceTier,
        });
        const adapter = adapters.get(agent);
        createSessionIfTaskProvided({ sessionId, taskId, traceId, agent, role, tmuxTarget: null });
        auditModelResolved({ traceId, sessionId, agent, role, decision });
        const result = await withTimeout(
          adapter.delegate({ cwd, prompt, traceId, role, repo, ...effectiveModel(decision) }),
          agentTimeout(config),
          "agent.delegate",
        );
        closeSessionIfPersisted(sessionId, result.exitCode === 0 ? "closed" : "error");
        return { sessionId, ...result };
      } catch (err) {
        closeSessionIfPersisted(sessionId, "error");
        auditServiceError({ traceId, sessionId, where: "agent.delegate", err });
        throw err;
      }
    },

    async spawn({
      agent,
      role,
      repo = null,
      cwd,
      traceId,
      taskId = null,
      model = null,
      reasoningEffort = null,
      serviceTier = null,
    }) {
      try {
        const decision = assertAllowed(registries, {
          agent,
          role,
          repo,
          action: "agent.spawn",
          model,
          reasoningEffort,
          serviceTier,
        });
        const adapter = adapters.get(agent);
        const result = await adapter.spawn({ cwd, traceId, role, repo, ...effectiveModel(decision) });
        createSessionIfTaskProvided({
          sessionId: result.sessionId,
          taskId,
          traceId,
          agent,
          role,
          tmuxTarget: result.tmuxTarget,
        });
        auditModelResolved({ traceId, sessionId: result.sessionId, agent, role, decision });
        return result;
      } catch (err) {
        auditServiceError({ traceId, where: "agent.spawn", err });
        throw err;
      }
    },

    async ask({ sessionId, prompt, traceId }) {
      const row = sessionRepo.getSessionById(sessionId);
      if (!row) throw unknownSession(sessionId);
      const adapter = adapters.get(row.agent);
      const before = await bestEffortView(adapter, row);
      recordExpectedAsk(sessionId, before?.snapshot || "", {});
      const result = await withTimeout(
        adapter.ask({
          tmuxTarget: row.tmux_target,
          prompt,
          traceId,
          role: row.role,
        }),
        agentTimeout(config),
        "agent.ask",
      );
      bestEffortInterventionCheck({ sessionId, currentSnapshot: result.snapshot, traceId });
      return result;
    },

    async view({ sessionId, traceId = null }) {
      const row = sessionRepo.getSessionById(sessionId);
      if (!row) throw unknownSession(sessionId);
      const result = await adapters.get(row.agent).view({ tmuxTarget: row.tmux_target });
      bestEffortInterventionCheck({ sessionId, currentSnapshot: result.snapshot, traceId });
      return result;
    },

    async kill({ sessionId, traceId }) {
      const row = sessionRepo.getSessionById(sessionId);
      if (!row) throw unknownSession(sessionId);
      const result = await adapters.get(row.agent).kill({
        tmuxTarget: row.tmux_target,
        traceId,
        role: row.role,
      });
      sessionRepo.setSessionStatus(sessionId, "closed", nowIso());
      return result;
    },
  };
}

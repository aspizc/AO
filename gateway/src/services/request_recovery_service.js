import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { createRequestContextRepository } from "../core/repositories/request_context_repo.js";
import { flushLifecycleTerminals, subscribeLifecycleTerminal } from "../core/repositories/lifecycle_repo.js";
import { RequestContextError } from "../core/request_context.js";
import { priorGatewayOwnerAbsent, probeExactTmuxTarget } from "../adapters/request_recovery_observations.js";

function deny() { throw new RequestContextError("context.recovery_denied"); }
const state = (row) => row.lifecycle_state ?? row.status;

// These dependencies are private composition inputs, never caller assertions.
export function createRequestRecoveryService({ database, identity, owner,
  priorOwnerAbsent = priorGatewayOwnerAbsent, probeTarget = probeExactTmuxTarget,
  clock = () => performance.now(),
} = {}) {
  if (!identity || !owner) return null;
  const repository = createRequestContextRepository({ database });
  if (!repository) return null;
  function roots(record, repositories) {
    for (const task of record.payload.tasks) {
      const binding = repositories.get(task.repositoryId);
      if (!binding) deny();
      try {
        if (fs.realpathSync(binding.root) !== task.canonicalRoot || !fs.statSync(binding.root).isDirectory()) deny();
      } catch { deny(); }
    }
  }
  function reclaimable(record, repositories) {
    roots(record, repositories);
    if (record.owner?.connectionId === owner.connectionId) {
      if (record.owner.pid !== owner.pid || record.owner.startToken !== owner.startToken || record.owner.bootId !== owner.bootId) deny();
    } else if (priorOwnerAbsent(record.owner) !== true) deny();
  }
  function args(context, traceId, now) {
    if (context.actor.principalId !== identity.principalId) deny();
    return { traceId, identity, audience: context.audience, now };
  }
  return {
    identity, repository,
    prepare() {
      if (database.inTransaction) deny();
      flushLifecycleTerminals(database);
    },
    subscribeTerminal(observer) { return subscribeLifecycleTerminal(database, observer); },
    record(context, effective, value) {
      this.prepare();
      if (context.actor.principalId !== identity.principalId || identity.verify() !== true) deny();
      const traceId = effective.traceId;
      switch (effective.action) {
        case "orchestration.create":
          repository.createTrace({ traceId: value.traceId, identity, owner, audience: context.audience, expiresAt: context.expiresAt });
          break;
        case "task.assign":
          repository.mergeTask({ traceId, owner, task: { taskId: value.taskId, repositoryId: effective.repository.id,
            canonicalRoot: effective.repository.root, targetAgent: value.assignedAgent,
            targetRole: value.assignedRole, targetAction: effective.target.action } });
          break;
        case "agent.spawn":
          repository.mergeSession({ traceId, owner, session: { sessionId: value.sessionId, taskId: effective.taskId,
            tmuxTarget: value.tmuxTarget, targetAgent: effective.target.agent, targetRole: effective.target.role } });
          break;
        case "orchestration.complete": case "orchestration.cancel": repository.removeTerminalTrace(traceId); break;
        case "agent.kill": repository.removeTerminalSession({ traceId, sessionId: effective.sessionId }); break;
      }
    },
    reattach(context, repositories, traceId, now) {
      this.prepare();
      return repository.claimTrace({ ...args(context, traceId, now), owner, validate(record) {
        reclaimable(record, repositories);
        const started = clock();
        const sessions = []; const skippedSessions = [];
        for (const session of record.payload.sessions) {
          const row = record.sessions.find((entry) => entry.session_id === session.sessionId);
          if (!["starting", "running"].includes(state(row))) {
            skippedSessions.push({ sessionId: session.sessionId, reason: "session_closed" }); continue;
          }
          const remaining = 5000 - (clock() - started);
          if (remaining <= 0) deny();
          const exists = probeTarget(session.tmuxTarget, Math.max(1, Math.min(1000, Math.floor(remaining))));
          const elapsed = Math.max(0, clock() - started);
          if (elapsed >= 5000 || Date.parse(now) + elapsed >= Date.parse(record.expiresAt)
            || Date.parse(now) + elapsed >= Date.parse(context.expiresAt)
            || ![true, false].includes(exists)) deny();
          if (exists) sessions.push(session);
          else skippedSessions.push({ sessionId: session.sessionId, reason: "target_gone" });
        }
        const byId = (left, right) => left.sessionId.localeCompare(right.sessionId);
        return { tasks: record.payload.tasks, sessions, result: { traceId,
          reattachedTaskIds: record.payload.tasks.map((task) => task.taskId).sort(),
          reattachedSessionIds: sessions.map((session) => session.sessionId).sort(), skippedSessions: skippedSessions.sort(byId) } };
      } });
    },
    discover(context, repositories, now, onlyTraceId) {
      const entries = [];
      for (const traceId of onlyTraceId ? [onlyTraceId] : repository.listTraceIds()) {
        try {
          const entry = repository.inspectTrace({ ...args(context, traceId, now), validate(record) {
            reclaimable(record, repositories);
            return { traceId, status: state(record.orchestration), expiresAt: record.expiresAt };
          } });
          entries.push(entry);
        } catch { /* Foreign, incomplete and ambiguous records disclose nothing. */ }
      }
      return { reattachableTraces: entries.slice(0, 100), truncated: entries.length > 100 };
    },
    check(context, repositories, traceId, sessionId, now) {
      repository.checkOwner({ ...args(context, traceId, now), owner, sessionId, validate(record) { roots(record, repositories); return {}; } });
    },
    denialHint(context, repositories, callArgs, now) {
      const traceId = callArgs?.traceId ?? (typeof callArgs?.sessionId === "string"
        ? database.prepare("SELECT trace_id FROM sessions WHERE session_id = ?").get(callArgs.sessionId)?.trace_id : null);
      return typeof traceId === "string" && this.discover(context, repositories, now, traceId).reattachableTraces.length === 1;
    },
    release() { repository.releaseOwner(owner); },
  };
}

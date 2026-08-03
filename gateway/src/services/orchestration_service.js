import { append as auditAppend } from "../core/audit.js";
import { newOrchestrationId, newTraceId } from "../core/ids.js";
import * as artifactRepo from "../core/repositories/artifact_repo.js";
import * as orchestrationRepo from "../core/repositories/orchestration_repo.js";
import * as taskRepo from "../core/repositories/task_repo.js";

function nowIso() {
  return new Date().toISOString();
}

function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createOrchestration({ callerAgent, callerRole, goal = null, prefix = null }) {
  if (callerRole !== "orchestrator") {
    throw codedError("only orchestrator role can create an orchestration", "ROLE_FORBIDDEN");
  }

  const traceId = newTraceId({ prefix });
  const sessionId = newOrchestrationId();
  const row = {
    sessionId,
    traceId,
    callerAgent,
    callerRole,
    status: "active",
    goal,
    createdAt: nowIso(),
  };

  orchestrationRepo.createOrchestration(row);
  auditAppend({
    type: "ORCHESTRATION_CREATED",
    traceId,
    sessionId,
    callerAgent,
    callerRole,
    goal,
  });

  return row;
}

export function viewOrchestration({ traceId }) {
  const session = orchestrationRepo.getOrchestrationByTraceId(traceId);
  if (!session) return null;

  return {
    session,
    tasks: taskRepo.listTasksByTrace(traceId),
    artifacts: artifactRepo.listArtifactsByTrace(traceId),
  };
}

function setStatus(traceId, status, eventType) {
  const session = orchestrationRepo.getOrchestrationByTraceId(traceId);
  if (!session) {
    throw codedError(`unknown traceId ${traceId}`, "ORCHESTRATION_NOT_FOUND");
  }

  orchestrationRepo.setOrchestrationStatus(session.session_id, status);
  auditAppend({
    type: eventType,
    traceId,
    sessionId: session.session_id,
    status,
  });

  return { ...session, status };
}

export function pauseOrchestration({ traceId }) {
  return setStatus(traceId, "paused", "ORCHESTRATION_PAUSED");
}

export function resumeOrchestration({ traceId }) {
  return setStatus(traceId, "active", "ORCHESTRATION_RESUMED");
}

export function cancelOrchestration({ traceId }) {
  return setStatus(traceId, "cancelled", "ORCHESTRATION_CANCELLED");
}

export function completeOrchestration({ traceId }) {
  return setStatus(traceId, "completed", "ORCHESTRATION_COMPLETED");
}

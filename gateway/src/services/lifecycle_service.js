import {
  LifecycleAction,
  issueLifecycleCommand,
} from "../core/lifecycle.js";
import * as lifecycleRepo from "../core/repositories/lifecycle_repo.js";
import * as orchestrationRepo from "../core/repositories/orchestration_repo.js";
import * as sessionRepo from "../core/repositories/session_repo.js";
import * as taskRepo from "../core/repositories/task_repo.js";

const callerStateFields = new Set([
  "status",
  "state",
  "from",
  "to",
  "fromStatus",
  "toStatus",
  "terminalStatus",
  "nextStatus",
  "effectiveState",
]);

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertRequest(request, allowedFields) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw codedError(
      "LIFECYCLE_COMMAND_INVALID",
      "invalid lifecycle command",
    );
  }
  for (const field of Object.keys(request)) {
    if (callerStateFields.has(field)) {
      throw codedError(
        "LIFECYCLE_CALLER_STATE_DENIED",
        "caller-supplied lifecycle state denied",
      );
    }
    if (!allowedFields.has(field)) {
      throw codedError(
        "LIFECYCLE_COMMAND_INVALID",
        "invalid lifecycle command",
      );
    }
  }
  if (
    typeof request.idempotencyKey !== "string" ||
    request.idempotencyKey.length === 0
  ) {
    throw codedError(
      "LIFECYCLE_IDEMPOTENCY_REQUIRED",
      "lifecycle idempotency key required",
    );
  }
}

function expectedVersion(request, currentVersion) {
  if (request.expectedVersion !== undefined) {
    return request.expectedVersion;
  }
  const existing = lifecycleRepo.getTransitionByIdempotencyKey(
    request.idempotencyKey,
  );
  if (existing) return existing.from_version;
  return currentVersion;
}

function evidence(request) {
  return request.evidence ?? {};
}

function actionMethod({
  action,
  entityType,
  allowedFields,
  findState,
  target,
  reservation,
  clock,
}) {
  return (request) => {
    assertRequest(request, allowedFields);
    const row = findState?.(request) ?? null;
    if (findState && !row) {
      const code =
        entityType === "orchestration"
          ? "ORCHESTRATION_NOT_FOUND"
          : "LIFECYCLE_NOT_FOUND";
      const message =
        entityType === "orchestration"
          ? "orchestration not found"
          : "lifecycle entity not found";
      throw codedError(code, message);
    }
    const binding = target(request, row);
    const occurredAt = clock();
    const command = issueLifecycleCommand(action, {
      entityType,
      entityId: binding.entityId,
      traceId: binding.traceId,
      taskId: binding.taskId,
      expectedVersion: expectedVersion(
        request,
        action === LifecycleAction.SESSION_RESERVE
          ? null
          : Number(row.lifecycle_version),
      ),
      idempotencyKey: request.idempotencyKey,
      occurredAt,
      evidence: evidence(request),
    });
    const options = reservation
      ? { reservation: reservation(request, occurredAt) }
      : undefined;
    return lifecycleRepo.applyLifecycleCommand(command, options);
  };
}

const orchestrationFields = new Set([
  "traceId",
  "expectedVersion",
  "idempotencyKey",
  "evidence",
]);
const taskFields = new Set([
  "taskId",
  "traceId",
  "expectedVersion",
  "idempotencyKey",
  "evidence",
]);
const sessionFields = new Set([
  "sessionId",
  "taskId",
  "traceId",
  "expectedVersion",
  "idempotencyKey",
  "evidence",
]);
const sessionReservationFields = new Set([
  ...sessionFields,
  "agent",
  "role",
]);

export function createLifecycleService({
  clock = () => new Date().toISOString(),
} = {}) {
  const orchestrationMethod = (action) =>
    actionMethod({
      action,
      entityType: "orchestration",
      allowedFields: orchestrationFields,
      findState: ({ traceId }) =>
        orchestrationRepo.getOrchestrationByTraceId(traceId),
      target: (request, row) => ({
        entityId: row.session_id,
        traceId: request.traceId,
        taskId: null,
      }),
      clock,
    });
  const taskMethod = (action) =>
    actionMethod({
      action,
      entityType: "task",
      allowedFields: taskFields,
      findState: ({ taskId }) => taskRepo.getTaskById(taskId),
      target: (request) => ({
        entityId: request.taskId,
        traceId: request.traceId,
        taskId: request.taskId,
      }),
      clock,
    });
  const sessionMethod = (action) =>
    actionMethod({
      action,
      entityType: "session",
      allowedFields: sessionFields,
      findState: ({ sessionId }) =>
        sessionRepo.getSessionById(sessionId),
      target: (request) => ({
        entityId: request.sessionId,
        traceId: request.traceId,
        taskId: request.taskId,
      }),
      clock,
    });

  return Object.freeze({
    pauseOrchestration: orchestrationMethod(
      LifecycleAction.ORCHESTRATION_PAUSE,
    ),
    resumeOrchestration: orchestrationMethod(
      LifecycleAction.ORCHESTRATION_RESUME,
    ),
    completeOrchestration: orchestrationMethod(
      LifecycleAction.ORCHESTRATION_COMPLETE,
    ),
    reserveTaskStart: taskMethod(LifecycleAction.TASK_RESERVE_START),
    markTaskRunning: taskMethod(LifecycleAction.TASK_MARK_RUNNING),
    completeTask: taskMethod(LifecycleAction.TASK_COMPLETE),
    failTask: taskMethod(LifecycleAction.TASK_FAIL),
    reserveSession: actionMethod({
      action: LifecycleAction.SESSION_RESERVE,
      entityType: "session",
      allowedFields: sessionReservationFields,
      target: (request) => ({
        entityId: request.sessionId,
        traceId: request.traceId,
        taskId: request.taskId,
      }),
      reservation: (request, occurredAt) => ({
        agent: request.agent,
        role: request.role,
        startedAt: occurredAt,
      }),
      clock,
    }),
    markSessionRunning: sessionMethod(
      LifecycleAction.SESSION_MARK_RUNNING,
    ),
    closeSession: sessionMethod(LifecycleAction.SESSION_CLOSE),
    failSession: sessionMethod(LifecycleAction.SESSION_FAIL),
  });
}

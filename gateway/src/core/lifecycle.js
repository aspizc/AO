export const MAX_LIFECYCLE_VERSION = Number.MAX_SAFE_INTEGER;

const issuedCommands = new WeakSet();

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

const commandFields = new Set([
  "entityType",
  "entityId",
  "traceId",
  "taskId",
  "expectedVersion",
  "idempotencyKey",
  "occurredAt",
  "evidence",
]);

export const LifecycleAction = Object.freeze({
  ORCHESTRATION_PAUSE: "orchestration.pause",
  ORCHESTRATION_RESUME: "orchestration.resume",
  ORCHESTRATION_COMPLETE: "orchestration.complete",
  ORCHESTRATION_CANCEL: "orchestration.cancel",
  TASK_RESERVE_START: "task.reserve_start",
  TASK_MARK_RUNNING: "task.mark_running",
  TASK_COMPLETE: "task.complete",
  TASK_FAIL: "task.fail",
  TASK_CANCEL: "task.cancel",
  SESSION_RESERVE: "session.reserve",
  SESSION_MARK_RUNNING: "session.mark_running",
  SESSION_CLOSE: "session.close",
  SESSION_FAIL: "session.fail",
});

const transitionSpecs = new Map([
  [
    LifecycleAction.ORCHESTRATION_PAUSE,
    spec("orchestration", ["active"], "paused"),
  ],
  [
    LifecycleAction.ORCHESTRATION_RESUME,
    spec("orchestration", ["paused"], "active"),
  ],
  [
    LifecycleAction.ORCHESTRATION_COMPLETE,
    spec("orchestration", ["active", "paused"], "completed"),
  ],
  [
    LifecycleAction.ORCHESTRATION_CANCEL,
    spec("orchestration", ["active", "paused"], "cancelled"),
  ],
  [
    LifecycleAction.TASK_RESERVE_START,
    spec("task", ["pending"], "starting"),
  ],
  [
    LifecycleAction.TASK_MARK_RUNNING,
    spec("task", ["starting"], "running"),
  ],
  [
    LifecycleAction.TASK_COMPLETE,
    spec("task", ["pending", "starting", "running"], "completed"),
  ],
  [
    LifecycleAction.TASK_FAIL,
    spec("task", ["pending", "starting", "running"], "failed"),
  ],
  [
    LifecycleAction.TASK_CANCEL,
    spec("task", ["pending", "starting", "running"], "cancelled"),
  ],
  [
    LifecycleAction.SESSION_RESERVE,
    {
      ...spec("session", [], "starting"),
      creates: true,
    },
  ],
  [
    LifecycleAction.SESSION_MARK_RUNNING,
    spec("session", ["starting"], "running"),
  ],
  [
    LifecycleAction.SESSION_CLOSE,
    spec("session", ["starting", "running"], "closed"),
  ],
  [
    LifecycleAction.SESSION_FAIL,
    spec("session", ["starting", "running"], "error"),
  ],
]);

const allowedStates = Object.freeze({
  orchestration: new Set(["active", "paused", "completed", "cancelled"]),
  task: new Set([
    "pending",
    "starting",
    "running",
    "completed",
    "failed",
    "cancelled",
  ]),
  session: new Set(["starting", "running", "closed", "error"]),
});

const terminalStates = Object.freeze({
  orchestration: new Set(["completed", "cancelled"]),
  task: new Set(["completed", "failed", "cancelled"]),
  session: new Set(["closed", "error"]),
});

function spec(entityType, from, to) {
  return Object.freeze({
    entityType,
    from: new Set(from),
    to,
    creates: false,
  });
}

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isLifecycleVersion(value) {
  return (
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_LIFECYCLE_VERSION
  );
}

function normalizeEvidence(evidence) {
  if (!isPlainObject(evidence)) {
    throw codedError(
      "LIFECYCLE_COMMAND_INVALID",
      "invalid lifecycle command",
    );
  }

  try {
    return deepFreeze(JSON.parse(JSON.stringify(evidence)));
  } catch {
    throw codedError(
      "LIFECYCLE_COMMAND_INVALID",
      "invalid lifecycle command",
    );
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizeTaskId(value) {
  return value === undefined ? null : value;
}

function assertCommandInput(action, input) {
  if (!isPlainObject(input)) {
    throw codedError(
      "LIFECYCLE_COMMAND_INVALID",
      "invalid lifecycle command",
    );
  }
  for (const field of Object.keys(input)) {
    if (callerStateFields.has(field)) {
      throw codedError(
        "LIFECYCLE_CALLER_STATE_DENIED",
        "caller-supplied lifecycle state denied",
      );
    }
    if (!commandFields.has(field)) {
      throw codedError(
        "LIFECYCLE_COMMAND_INVALID",
        "invalid lifecycle command",
      );
    }
  }

  const transition = transitionSpecs.get(action);
  const expectedVersionValid =
    input.expectedVersion === null ||
    isLifecycleVersion(input.expectedVersion);
  if (
    !transition ||
    input.entityType !== transition.entityType ||
    !isNonEmptyString(input.entityId) ||
    !isNonEmptyString(input.traceId) ||
    !isNonEmptyString(input.idempotencyKey) ||
    !isNonEmptyString(input.occurredAt) ||
    !expectedVersionValid
  ) {
    throw codedError(
      "LIFECYCLE_COMMAND_INVALID",
      "invalid lifecycle command",
    );
  }

  const taskId = normalizeTaskId(input.taskId);
  if (
    (transition.entityType === "orchestration" && taskId !== null) ||
    (transition.entityType !== "orchestration" &&
      !isNonEmptyString(taskId)) ||
    (transition.creates && input.expectedVersion !== null) ||
    (!transition.creates && input.expectedVersion === null)
  ) {
    throw codedError(
      "LIFECYCLE_COMMAND_INVALID",
      "invalid lifecycle command",
    );
  }

  return transition;
}

export function issueLifecycleCommand(action, input) {
  assertCommandInput(action, input);
  const command = Object.freeze({
    commandVersion: 1,
    action,
    entityType: input.entityType,
    entityId: input.entityId,
    traceId: input.traceId,
    taskId: normalizeTaskId(input.taskId),
    expectedVersion: input.expectedVersion,
    idempotencyKey: input.idempotencyKey,
    occurredAt: input.occurredAt,
    evidence: normalizeEvidence(input.evidence),
  });
  issuedCommands.add(command);
  return command;
}

export function assertIssuedLifecycleCommand(command) {
  if (!command || !issuedCommands.has(command)) {
    throw codedError(
      "LIFECYCLE_COMMAND_UNTRUSTED",
      "untrusted lifecycle command",
    );
  }
  return command;
}

export function lifecycleCommandFingerprint(command) {
  assertIssuedLifecycleCommand(command);
  return {
    commandVersion: command.commandVersion,
    action: command.action,
    entityType: command.entityType,
    entityId: command.entityId,
    traceId: command.traceId,
    taskId: command.taskId,
    expectedVersion: command.expectedVersion,
    idempotencyKey: command.idempotencyKey,
    evidence: command.evidence,
  };
}

function assertStoredState(state) {
  if (
    !isPlainObject(state) ||
    !allowedStates[state.entityType]?.has(state.status) ||
    !isNonEmptyString(state.entityId) ||
    !isNonEmptyString(state.traceId) ||
    !isLifecycleVersion(state.version)
  ) {
    throw codedError(
      "LIFECYCLE_STATE_INVALID",
      "invalid lifecycle state",
    );
  }

  if (
    (state.entityType === "orchestration" && state.taskId !== null) ||
    (state.entityType !== "orchestration" &&
      !isNonEmptyString(state.taskId))
  ) {
    throw codedError(
      "LIFECYCLE_STATE_INVALID",
      "invalid lifecycle state",
    );
  }
}

function assertTargetMatches(state, command) {
  if (
    state.entityType !== command.entityType ||
    state.entityId !== command.entityId ||
    state.traceId !== command.traceId ||
    state.taskId !== command.taskId
  ) {
    throw codedError(
      "LIFECYCLE_TARGET_MISMATCH",
      "lifecycle target mismatch",
    );
  }
}

export function reduceLifecycle(state, command) {
  assertIssuedLifecycleCommand(command);
  const transition = transitionSpecs.get(command.action);

  if (state === null) {
    if (!transition?.creates) {
      throw codedError(
        "LIFECYCLE_INVALID_TRANSITION",
        "invalid lifecycle transition",
      );
    }
    return Object.freeze({
      entityType: command.entityType,
      entityId: command.entityId,
      traceId: command.traceId,
      taskId: command.taskId,
      status: transition.to,
      version: 0,
      closedAt: null,
    });
  }

  assertStoredState(state);
  assertTargetMatches(state, command);
  if (state.version !== command.expectedVersion) {
    throw codedError(
      "LIFECYCLE_VERSION_CONFLICT",
      "lifecycle version conflict",
    );
  }
  if (terminalStates[state.entityType].has(state.status)) {
    throw codedError(
      "LIFECYCLE_TERMINAL",
      "terminal lifecycle state cannot transition",
    );
  }
  if (transition.creates || !transition.from.has(state.status)) {
    throw codedError(
      "LIFECYCLE_INVALID_TRANSITION",
      "invalid lifecycle transition",
    );
  }
  if (state.version === MAX_LIFECYCLE_VERSION) {
    throw codedError(
      "LIFECYCLE_VERSION_EXHAUSTED",
      "lifecycle version exhausted",
    );
  }

  const isTerminal = terminalStates[state.entityType].has(transition.to);
  return Object.freeze({
    entityType: state.entityType,
    entityId: state.entityId,
    traceId: state.traceId,
    taskId: state.taskId,
    status: transition.to,
    version: state.version + 1,
    closedAt: isTerminal ? command.occurredAt : null,
  });
}

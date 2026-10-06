import { spawn } from "node:child_process";
import {
  createHash,
  createHmac,
  randomBytes as cryptoRandomBytes,
  timingSafeEqual,
} from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { types as utilTypes } from "node:util";

export const PROCESS_SUPERVISOR_PROTOCOL = "agents.process-supervisor.v1";

const HELPER_PATH = fileURLToPath(
  new URL("./process_supervisor_helper.py", import.meta.url),
);
const SAFE_TERMINAL_REASONS = new Set([
  "cancelled",
  "caller_lost",
  "exec_error",
  "exited",
  "supervisor_lost",
  "timed_out",
]);
const HEX_SHA256 = /^[a-f0-9]{64}$/;
const SAFE_MODES = new Set(["one-shot", "persistent"]);
const REQUEST_KEYS = new Set([
  "argv",
  "cwd",
  "deadlineAt",
  "env",
  "mode",
  "runtimePlan",
  "sessionId",
  "stderr",
  "stdout",
  "terminationGraceMs",
]);
const RUNTIME_PLAN_KEYS = new Set(["args", "env", "executable"]);
const MAX_CONTROL_BYTES = 1024 * 1024;
const MAX_ARGV_ITEMS = 4_096;
const MAX_RUNTIME_ARGS = 256;
const MAX_ENVIRONMENT_ENTRIES = 4_096;
const MAX_ARGUMENT_BYTES = 256 * 1024;
const MAX_ENVIRONMENT_KEY_BYTES = 4_096;
const MAX_ENVIRONMENT_VALUE_BYTES = 256 * 1024;
const MAX_PATH_BYTES = 4_096;
const MAX_SESSION_ID_BYTES = 4_096;
const SESSION_PORT_HEADER_BYTES = 48;
const SESSION_PORT_MAX_PAYLOAD_BYTES = 65_536;
const SESSION_PORT_MAX_REQUEST_BYTES = 65_585;
const SESSION_PORT_MAX_RESPONSE_BYTES = 65_584;
const SESSION_PORT_MAGIC = Buffer.from("ASP1", "ascii");
const SESSION_PORT_BINDING_DOMAIN = Buffer.from(
  "agents.process-supervisor.session-port.binding-tag.v1\0",
  "ascii",
);
const SESSION_PORT_TRUNCATION_MARKER = Buffer.from(
  "[... older terminal content truncated ...]\n",
  "utf8",
);
const SAFE_SESSION_TARGET = /^[a-z0-9][a-z0-9-]{0,95}$/;
const SESSION_PORT_ISSUER_RECEIVERS = new WeakMap();
const SESSION_PORT_RECEIVERS = new WeakMap();
const SESSION_PORT_PHASES = new Map([
  [0x01, "claim"],
  [0x02, "validation"],
  [0x03, "identity"],
  [0x04, "write"],
  [0x05, "snapshot"],
  [0x06, "lifecycle"],
]);
const SESSION_PORT_ERRORS = new Map([
  [0x0001, {
    code: "SESSION_PORT_INVALID_ARGUMENT",
    message: "session port request is invalid",
    phases: new Set([0x02]),
  }],
  [0x0002, {
    code: "SESSION_PORT_NOT_PERSISTENT",
    message: "session port requires persistent execution",
    phases: new Set([0x01]),
  }],
  [0x0003, {
    code: "SESSION_PORT_UNAUTHORIZED",
    message: "session port authority is invalid",
    phases: new Set([0x01, 0x03]),
  }],
  [0x0004, {
    code: "SESSION_PORT_REVOKED",
    message: "session port is no longer available",
    phases: new Set([0x06]),
  }],
  [0x0005, {
    code: "SESSION_PORT_CANCELLED",
    message: "session port operation was cancelled",
    phases: new Set([0x06]),
  }],
  [0x0006, {
    code: "SESSION_PORT_PROMPT_TOO_LARGE",
    message: "session prompt exceeds the byte limit",
    phases: new Set([0x02]),
  }],
  [0x0007, {
    code: "SESSION_PORT_IDENTITY_CHANGED",
    message: "supervised process identity changed",
    phases: new Set([0x03]),
  }],
  [0x0008, {
    code: "SESSION_PORT_NOT_FOREGROUND",
    message: "supervised process is not the terminal foreground group",
    phases: new Set([0x03]),
  }],
  [0x0009, {
    code: "SESSION_PORT_TERMINAL_CHANGED",
    message: "supervised terminal binding changed",
    phases: new Set([0x03]),
  }],
  [0x000a, {
    code: "SESSION_PORT_TERMINAL_CLOSED",
    message: "supervised terminal is closed",
    phases: new Set([0x06]),
  }],
  [0x000b, {
    code: "SESSION_PORT_WRITE_ABORTED",
    message: "session prompt write did not complete",
    phases: new Set([0x04]),
  }],
  [0x000c, {
    code: "SESSION_PORT_SNAPSHOT_FAILED",
    message: "terminal snapshot failed",
    phases: new Set([0x05]),
  }],
]);
const SESSION_PORT_ERROR_IDS = new Map(
  [...SESSION_PORT_ERRORS].map(([id, definition]) => [
    definition.code,
    id,
  ]),
);
const SESSION_PORT_SIDEBAND_ERROR_SOURCES = new Map([
  [0x0001, { phaseId: 0x02, operations: new Set(["write", "snapshot"]) }],
  [0x0003, { phaseId: 0x03, operations: new Set(["write", "snapshot"]) }],
  [0x0004, { phaseId: 0x06, operations: new Set(["write", "snapshot"]) }],
  [0x0005, { phaseId: 0x06, operations: new Set(["write"]) }],
  [0x0007, { phaseId: 0x03, operations: new Set(["write", "snapshot"]) }],
  [0x0008, { phaseId: 0x03, operations: new Set(["write"]) }],
  [0x0009, { phaseId: 0x03, operations: new Set(["write", "snapshot"]) }],
  [0x000a, { phaseId: 0x06, operations: new Set(["write", "snapshot"]) }],
  [0x000b, { phaseId: 0x04, operations: new Set(["write"]) }],
  [0x000c, { phaseId: 0x05, operations: new Set(["snapshot"]) }],
]);

export class ProcessSupervisorError extends Error {
  constructor(code, message, phase) {
    super(message);
    this.name = "ProcessSupervisorError";
    this.code = code;
    this.phase = phase;
  }
}

export class ProcessSupervisorSessionPortError extends Error {
  constructor(code, message, phase) {
    super();
    Object.defineProperties(this, {
      name: {
        value: "ProcessSupervisorSessionPortError",
        enumerable: true,
        configurable: true,
        writable: true,
      },
      code: {
        value: code,
        enumerable: true,
        configurable: true,
        writable: true,
      },
      message: {
        value: message,
        enumerable: true,
        configurable: true,
        writable: true,
      },
      phase: {
        value: phase,
        enumerable: true,
        configurable: true,
        writable: true,
      },
    });
  }
}

function safeError(code, phase) {
  const messages = {
    PROCESS_INVALID_REQUEST: "process supervision request is invalid",
    PROCESS_BUDGET_EXHAUSTED: "process execution budget is exhausted",
    PROCESS_RUNTIME_UNAVAILABLE: "configured process runtime is unavailable",
    PROCESS_BOOTSTRAP_FAILED: "process supervisor bootstrap failed",
    PROCESS_EXEC_FAILED: "supervised process could not be executed",
    PROCESS_SUPERVISOR_LOST: "process supervisor exited unexpectedly",
    PROCESS_CALLER_LOST: "process caller was lost",
    PROCESS_STREAM_FAILED: "supervised process stream failed",
  };
  return new ProcessSupervisorError(
    code,
    messages[code] ?? "process supervision failed",
    phase,
  );
}

function sessionPortError(code, phase) {
  const id = SESSION_PORT_ERROR_IDS.get(code);
  const definition = SESSION_PORT_ERRORS.get(id);
  if (!definition) {
    throw new TypeError("unknown private session port error");
  }
  return new ProcessSupervisorSessionPortError(
    code,
    definition.message,
    phase,
  );
}

function sessionPortFrameError(errorId, phaseId, operationType) {
  const definition = SESSION_PORT_ERRORS.get(errorId);
  const phase = SESSION_PORT_PHASES.get(phaseId);
  const source = SESSION_PORT_SIDEBAND_ERROR_SOURCES.get(errorId);
  if (
    !definition
    || !phase
    || !definition.phases.has(phaseId)
    || source?.phaseId !== phaseId
    || !source.operations.has(operationType)
  ) {
    return null;
  }
  return new ProcessSupervisorSessionPortError(
    definition.code,
    definition.message,
    phase,
  );
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isExactDataObject(value, keys) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || utilTypes.isProxy(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false;
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== keys.length
    || keys.some((key) => !ownKeys.includes(key))
  ) {
    return false;
  }
  return keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return Boolean(
      descriptor
      && "value" in descriptor
      && descriptor.enumerable,
    );
  });
}

function isExactPrivateObject(value, keys) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || utilTypes.isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    return false;
  }
  const ownKeys = Reflect.ownKeys(value);
  return (
    ownKeys.length === keys.length
    && keys.every((key) => ownKeys.includes(key))
  );
}

function assertSafeString(
  value,
  {
    absolute = false,
    maxBytes = MAX_ARGUMENT_BYTES,
    nonempty = true,
  } = {},
) {
  if (typeof value !== "string") return false;
  if (nonempty && value.length === 0) return false;
  if (value.includes("\0")) return false;
  if (absolute && !value.startsWith("/")) return false;
  if (Buffer.byteLength(value, "utf8") > maxBytes) return false;
  return true;
}

function copyStringArray(
  value,
  {
    maxItems = MAX_ARGV_ITEMS,
    nonempty = false,
  } = {},
) {
  if (
    !Array.isArray(value)
    || value.length > maxItems
    || (nonempty && value.length === 0)
  ) {
    return null;
  }
  if (!value.every((item) => assertSafeString(item, {
    maxBytes: MAX_ARGUMENT_BYTES,
    nonempty: false,
  }))) {
    return null;
  }
  return [...value];
}

function copyEnvironment(value) {
  if (!isPlainObject(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > MAX_ENVIRONMENT_ENTRIES) return null;
  const result = Object.create(null);
  for (const [key, item] of entries) {
    if (
      !assertSafeString(key, { maxBytes: MAX_ENVIRONMENT_KEY_BYTES })
      || key.includes("=")
      || !assertSafeString(item, {
        maxBytes: MAX_ENVIRONMENT_VALUE_BYTES,
        nonempty: false,
      })
    ) {
      return null;
    }
    result[key] = item;
  }
  return result;
}

function validStreamDestination(value) {
  return (
    value === undefined
    || value === null
    || (
      typeof value?.write === "function"
      && typeof value?.on === "function"
      && typeof value?.once === "function"
      && typeof value?.off === "function"
    )
  );
}

function canonicalDigest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sameDigest(left, right) {
  if (!HEX_SHA256.test(left) || !HEX_SHA256.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function validIdentity(identity) {
  return Boolean(
    isPlainObject(identity)
    && Number.isSafeInteger(identity.pid)
    && identity.pid > 1
    && assertSafeString(identity.startToken)
    && Number.isSafeInteger(identity.pgid)
    && identity.pgid > 1
    && Number.isSafeInteger(identity.sid)
    && identity.sid > 1,
  );
}

function identityMatches(expected, actual) {
  return Boolean(
    validIdentity(expected)
    && validIdentity(actual)
    && expected.pid === actual.pid
    && expected.startToken === actual.startToken
    && expected.pgid === actual.pgid
    && expected.sid === actual.sid,
  );
}

export function readLinuxProcessIdentity(pid) {
  if (
    process.platform !== "linux"
    || !Number.isSafeInteger(pid)
    || pid <= 1
  ) {
    return null;
  }
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(")");
    if (close < 2) return null;
    const fields = stat.slice(close + 2).trim().split(/\s+/);
    if (fields.length < 20) return null;
    const parsedPid = Number(stat.slice(0, stat.indexOf(" ")));
    const pgid = Number(fields[2]);
    const sid = Number(fields[3]);
    if (
      parsedPid !== pid
      || !Number.isSafeInteger(pgid)
      || !Number.isSafeInteger(sid)
      || !/^\d+$/.test(fields[19])
    ) {
      return null;
    }
    return {
      pid,
      startToken: fields[19],
      pgid,
      sid,
    };
  } catch {
    return null;
  }
}

function readLinuxSessionProcessIdentity(pid) {
  if (
    process.platform !== "linux"
    || !Number.isSafeInteger(pid)
    || pid <= 1
  ) {
    return null;
  }
  const identity = readLinuxProcessIdentity(pid);
  if (!identity) return null;
  try {
    const executable = fs.realpathSync(`/proc/${pid}/exe`);
    const argvNul = fs.readFileSync(`/proc/${pid}/cmdline`);
    const cwd = fs.realpathSync(`/proc/${pid}/cwd`);
    if (
      argvNul.length === 0
      || argvNul.length > MAX_CONTROL_BYTES
      || argvNul.at(-1) !== 0
    ) {
      return null;
    }
    return {
      ...identity,
      executable,
      argvNul,
      cwd,
    };
  } catch {
    return null;
  }
}

export function validateFallbackLease(lease, readIdentity) {
  if (
    !isPlainObject(lease)
    || lease.protocol !== PROCESS_SUPERVISOR_PROTOCOL
    || !HEX_SHA256.test(lease.leaseDigest)
    || !HEX_SHA256.test(lease.bindingDigest)
    || !validIdentity(lease.supervisor)
    || !validIdentity(lease.anchor)
    || lease.supervisor.pgid !== lease.supervisor.pid
    || lease.supervisor.sid !== lease.supervisor.pid
    || lease.anchor.pid === lease.supervisor.pid
    || lease.anchor.pgid !== lease.supervisor.pid
    || lease.anchor.sid !== lease.supervisor.pid
    || typeof readIdentity !== "function"
  ) {
    return false;
  }

  try {
    const anchor = readIdentity(lease.anchor.pid);
    if (!identityMatches(lease.anchor, anchor)) return false;
    const supervisor = readIdentity(lease.supervisor.pid);
    return !supervisor || identityMatches(lease.supervisor, supervisor);
  } catch {
    return false;
  }
}

function defaultProcessOps() {
  return {
    spawn,
    readIdentity: readLinuxProcessIdentity,
    signalGroup(pgid, signal) {
      process.kill(-pgid, signal);
    },
  };
}

function defaultScheduler() {
  return {
    setTimeout(callback, delay) {
      return setTimeout(callback, delay);
    },
    clearTimeout(timer) {
      clearTimeout(timer);
    },
  };
}

function cloneLaunch(request, platform) {
  if (!isPlainObject(request)) {
    throw safeError("PROCESS_INVALID_REQUEST", "validation");
  }
  const mode = request.mode;
  const runtimePlan = request.runtimePlan;
  const runtimeArgs = copyStringArray(runtimePlan?.args ?? [], {
    maxItems: MAX_RUNTIME_ARGS,
  });
  const runtimeEnv = copyEnvironment(runtimePlan?.env);
  const argv = copyStringArray(request.argv, { nonempty: true });
  const env = copyEnvironment(request.env);
  if (
    Object.keys(request).some((key) => !REQUEST_KEYS.has(key))
    || !SAFE_MODES.has(mode)
    || !isPlainObject(runtimePlan)
    || Object.keys(runtimePlan).some((key) => !RUNTIME_PLAN_KEYS.has(key))
    || !assertSafeString(runtimePlan.executable, {
      absolute: true,
      maxBytes: MAX_PATH_BYTES,
    })
    || runtimeArgs === null
    || runtimeEnv === null
    || argv === null
    || !assertSafeString(argv[0], {
      absolute: true,
      maxBytes: MAX_PATH_BYTES,
    })
    || env === null
    || !assertSafeString(request.cwd, {
      absolute: true,
      maxBytes: MAX_PATH_BYTES,
    })
    || !assertSafeString(request.sessionId, {
      maxBytes: MAX_SESSION_ID_BYTES,
    })
    || !validStreamDestination(request.stdout)
    || !validStreamDestination(request.stderr)
  ) {
    throw safeError("PROCESS_INVALID_REQUEST", "validation");
  }
  encodeControlFrame(
    {
      executable: runtimePlan.executable,
      args: runtimeArgs,
      env: runtimeEnv,
    },
    "PROCESS_INVALID_REQUEST",
  );
  if (
    mode === "one-shot"
    && (!Number.isSafeInteger(request.deadlineAt) || request.deadlineAt <= 0)
  ) {
    throw safeError("PROCESS_INVALID_REQUEST", "validation");
  }
  if (mode === "persistent" && request.deadlineAt !== undefined) {
    throw safeError("PROCESS_INVALID_REQUEST", "validation");
  }
  const terminationGraceMs = request.terminationGraceMs ?? 250;
  if (
    !Number.isSafeInteger(terminationGraceMs)
    || terminationGraceMs < 10
    || terminationGraceMs > 2_000
  ) {
    throw safeError("PROCESS_INVALID_REQUEST", "validation");
  }
  if (!["darwin", "linux"].includes(platform)) {
    throw safeError("PROCESS_RUNTIME_UNAVAILABLE", "platform");
  }
  return {
    runtimePlan: {
      executable: runtimePlan.executable,
      args: runtimeArgs,
      env: runtimeEnv,
    },
    argv,
    env,
    cwd: request.cwd,
    sessionId: request.sessionId,
    mode,
    deadlineAt: request.deadlineAt,
    terminationGraceMs,
    stdout: request.stdout,
    stderr: request.stderr,
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function encodeControlFrame(value, code = "PROCESS_BOOTSTRAP_FAILED") {
  let frame;
  try {
    frame = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  } catch {
    throw safeError(code, "control");
  }
  if (frame.length >= MAX_CONTROL_BYTES) {
    throw safeError(code, "control");
  }
  return frame;
}

function scheduleQuiescenceBoundary(callback) {
  // The queued check-phase sentinel is the exact ownership boundary. It runs
  // after synchronous work plus nextTick and V8 microtasks already racing from
  // this turn. Events emitted after the sentinel belong to the caller.
  setImmediate(callback);
}

function guardPairedWriteError(stream) {
  let active = true;
  const cleanup = () => {
    if (!active) return;
    active = false;
    stream.off("error", onError);
  };
  const onError = () => {};
  stream.on("error", onError);
  scheduleQuiescenceBoundary(cleanup);
}

function createWriteCallbackLease(stream, onCallback) {
  let callback = onCallback;
  return {
    callback(error) {
      if (error) {
        // Writable invokes the supplied callback immediately before emitting
        // the paired error. This turn-local guard remains safe even when the
        // owning transfer was already disposed by public settlement.
        guardPairedWriteError(stream);
      }
      const current = callback;
      callback = null;
      current?.(error);
    },
    detach() {
      callback = null;
    },
  };
}

function createControlWriter(stream, onFailure) {
  let writerStream = stream;
  let failureHandler = onFailure;
  let active = null;
  let closed = false;
  let disposed = false;
  let failure = null;
  let tail = Promise.resolve();

  const fail = () => {
    if (failure) return failure;
    failure = safeError("PROCESS_BOOTSTRAP_FAILED", "control");
    if (active) {
      const current = active;
      active = null;
      current.cleanup();
      current.reject(failure);
    }
    failureHandler?.(failure);
    return failure;
  };
  const onError = () => fail();
  const onClose = () => {
    closed = true;
    if (active) fail();
  };
  writerStream.on("error", onError);
  writerStream.on("close", onClose);

  const writeOne = (frame) => new Promise((resolve, reject) => {
    if (disposed) {
      reject(failure ?? safeError("PROCESS_BOOTSTRAP_FAILED", "control"));
      return;
    }
    if (
      failure
      || closed
      || writerStream.destroyed
      || writerStream.writableEnded
    ) {
      reject(fail());
      return;
    }

    let callbackDone = false;
    let drainDone = true;
    let writeReturned = false;
    let settled = false;
    const callbackLease = createWriteCallbackLease(writerStream, (error) => {
      if (error) {
        fail();
        return;
      }
      callbackDone = true;
      maybeFinish();
    });
    const onDrain = () => {
      drainDone = true;
      maybeFinish();
    };
    const cleanup = () => {
      writerStream?.off("drain", onDrain);
      callbackLease.detach();
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      active = null;
      resolve();
    };
    const maybeFinish = () => {
      if (writeReturned && callbackDone && drainDone) finish();
    };
    active = { cleanup, reject };

    try {
      const accepted = writerStream.write(frame, callbackLease.callback);
      drainDone = accepted || writerStream.writableNeedDrain !== true;
      writeReturned = true;
      if (!drainDone) writerStream.once("drain", onDrain);
      maybeFinish();
    } catch {
      fail();
    }
  });

  return Object.freeze({
    write(value) {
      let frame;
      try {
        frame = Buffer.isBuffer(value) ? value : encodeControlFrame(value);
      } catch (error) {
        if (!disposed) fail();
        return Promise.reject(error);
      }
      const operation = tail.then(() => writeOne(frame));
      tail = operation.catch(() => {});
      return operation;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      closed = true;
      const currentStream = writerStream;
      currentStream.off("error", onError);
      currentStream.off("close", onClose);
      if (active) {
        const current = active;
        active = null;
        current.cleanup();
        current.reject(
          failure ?? safeError("PROCESS_BOOTSTRAP_FAILED", "control"),
        );
      }
      writerStream = null;
      failureHandler = null;
    },
  });
}

function createStreamTransfer(source, destination, onFailure) {
  if (!source) {
    return Object.freeze({
      promise: Promise.resolve(),
      abort() {},
      dispose() {},
    });
  }

  let sourceBoundary = source;
  let destinationBoundary = destination;
  let failureHandler = onFailure;
  const completion = createDeferred();
  let settled = false;
  let disposed = false;
  let sourceEnded = false;
  let pendingWrites = 0;
  const callbackLeases = new Set();

  const closeFlowBoundary = () => {
    sourceBoundary?.off("end", onSourceEnd);
    sourceBoundary?.off("close", onSourceClose);
    if (destinationBoundary) {
      sourceBoundary?.off("data", onData);
      destinationBoundary.off("drain", onDestinationDrain);
      destinationBoundary.off("close", onDestinationClose);
    }
  };
  const finish = (failed = false) => {
    if (settled) return;
    settled = true;
    closeFlowBoundary();
    if (sourceBoundary && !sourceBoundary.destroyed) sourceBoundary.resume();
    scheduleQuiescenceBoundary(completion.resolve);
    if (failed) failureHandler?.();
  };
  const maybeFinish = () => {
    if (sourceEnded && pendingWrites === 0) finish();
  };
  const onSourceError = () => finish(true);
  const onSourceEnd = () => {
    sourceEnded = true;
    maybeFinish();
  };
  const onSourceClose = () => {
    if (!sourceEnded) finish(true);
  };
  const onDestinationError = () => finish(true);
  const onDestinationClose = () => {
    finish(true);
  };
  const onDestinationDrain = () => {
    if (!settled && sourceBoundary && !sourceBoundary.destroyed) {
      sourceBoundary.resume();
    }
  };
  const onData = (chunk) => {
    if (settled || !destinationBoundary) return;
    pendingWrites += 1;
    let callbackLease;
    const onWrite = (error) => {
      callbackLeases.delete(callbackLease);
      pendingWrites -= 1;
      if (settled) return;
      if (error) {
        finish(true);
        return;
      }
      maybeFinish();
    };
    callbackLease = createWriteCallbackLease(destinationBoundary, onWrite);
    callbackLeases.add(callbackLease);
    try {
      const accepted = destinationBoundary.write(
        chunk,
        callbackLease.callback,
      );
      if (!accepted) sourceBoundary?.pause();
    } catch {
      callbackLeases.delete(callbackLease);
      callbackLease.detach();
      pendingWrites -= 1;
      finish(true);
    }
  };

  sourceBoundary.on("error", onSourceError);
  sourceBoundary.on("end", onSourceEnd);
  sourceBoundary.on("close", onSourceClose);
  if (destinationBoundary) {
    destinationBoundary.on("drain", onDestinationDrain);
    destinationBoundary.on("error", onDestinationError);
    destinationBoundary.on("close", onDestinationClose);
    sourceBoundary.on("data", onData);
  } else {
    sourceBoundary.resume();
  }

  return Object.freeze({
    promise: completion.promise,
    abort() {
      if (settled) return;
      settled = true;
      closeFlowBoundary();
      if (sourceBoundary && !sourceBoundary.destroyed) {
        sourceBoundary.resume();
      }
      scheduleQuiescenceBoundary(completion.resolve);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      closeFlowBoundary();
      sourceBoundary?.off("error", onSourceError);
      destinationBoundary?.off("error", onDestinationError);
      for (const callbackLease of callbackLeases) callbackLease.detach();
      callbackLeases.clear();
      sourceBoundary = null;
      destinationBoundary = null;
      failureHandler = null;
    },
  });
}

function parseTranscript(stream, onEvent, onFailure, onEnd) {
  let transcriptStream = stream;
  let eventHandler = onEvent;
  let failureHandler = onFailure;
  let endHandler = onEnd;
  let buffered = "";
  let terminal = false;
  let disposed = false;
  const closeFlowBoundary = () => {
    transcriptStream?.off("data", onData);
    transcriptStream?.off("end", onStreamEnd);
    transcriptStream?.off("close", onClose);
  };
  const finish = (failed) => {
    if (terminal) return;
    terminal = true;
    closeFlowBoundary();
    if (failed) failureHandler?.();
    // Keep the error guard through the queued check-phase boundary. Node may
    // already have queued the error paired with destroy(error) when close
    // wins, and nextTick/microtask duplicates from this turn must drain first.
    scheduleQuiescenceBoundary(() => endHandler?.());
  };
  const onData = (chunk) => {
    if (terminal) return;
    buffered += chunk;
    if (buffered.length > 16_384) {
      finish(true);
      return;
    }
    while (buffered.includes("\n")) {
      const newline = buffered.indexOf("\n");
      const line = buffered.slice(0, newline);
      buffered = buffered.slice(newline + 1);
      if (line.length === 0) continue;
      try {
        const value = JSON.parse(line);
        if (!isPlainObject(value)) throw new Error("invalid transcript");
        eventHandler?.(value);
      } catch {
        finish(true);
        return;
      }
    }
  };
  const onError = () => finish(true);
  const onStreamEnd = () => finish(buffered.length > 0);
  const onClose = () => finish(true);
  transcriptStream.setEncoding("utf8");
  transcriptStream.on("data", onData);
  transcriptStream.on("error", onError);
  transcriptStream.on("end", onStreamEnd);
  transcriptStream.on("close", onClose);
  return Object.freeze({
    abort() {
      finish(false);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      closeFlowBoundary();
      transcriptStream?.off("error", onError);
      transcriptStream = null;
      eventHandler = null;
      failureHandler = null;
      endHandler = null;
    },
  });
}

function terminalResult(event) {
  switch (event.reason) {
    case "exited":
      if (
        !Number.isInteger(event.exitCode)
        || event.exitCode < 0
        || (event.signal !== null && typeof event.signal !== "string")
      ) {
        throw safeError("PROCESS_BOOTSTRAP_FAILED", "transcript");
      }
      return {
        status: "exited",
        exitCode: event.exitCode,
        signal: event.signal,
      };
    case "cancelled":
      return { status: "cancelled" };
    case "timed_out":
      return { status: "timed_out" };
    case "exec_error":
      throw safeError("PROCESS_EXEC_FAILED", "exec");
    case "supervisor_lost":
      throw safeError("PROCESS_SUPERVISOR_LOST", "supervision");
    case "caller_lost":
      throw safeError("PROCESS_CALLER_LOST", "supervision");
    default:
      throw safeError("PROCESS_BOOTSTRAP_FAILED", "transcript");
  }
}

function validateReadyEvent({
  event,
  childPid,
  expectedLeaseDigest,
  bindingDigest,
  platform,
  readIdentity,
}) {
  if (
    event.type !== "reaper_ready"
    || event.protocol !== PROCESS_SUPERVISOR_PROTOCOL
    || !sameDigest(event.leaseDigest, expectedLeaseDigest)
    || !sameDigest(event.bindingDigest, bindingDigest)
    || event.platform !== platform
    || !validIdentity(event.supervisor)
    || !validIdentity(event.reaper)
    || event.supervisor.pid !== childPid
    || event.supervisor.pgid !== childPid
    || event.supervisor.sid !== childPid
    || event.reaper.pid === childPid
    || event.reaper.pgid !== childPid
    || event.reaper.sid !== childPid
    || (platform === "linux" && event.subreaper !== true)
  ) {
    return null;
  }
  if (platform === "linux") {
    if (
      !identityMatches(event.supervisor, readIdentity(event.supervisor.pid))
      || !identityMatches(event.reaper, readIdentity(event.reaper.pid))
    ) {
      return null;
    }
  }
  return {
    protocol: PROCESS_SUPERVISOR_PROTOCOL,
    leaseDigest: expectedLeaseDigest,
    bindingDigest,
    supervisor: Object.freeze({ ...event.supervisor }),
    anchor: Object.freeze({ ...event.reaper }),
  };
}

function validateUtilityEvent({
  event,
  bindingDigest,
  platform,
  readIdentity,
}) {
  if (
    event.type !== "utility_ready"
    || event.protocol !== PROCESS_SUPERVISOR_PROTOCOL
    || !sameDigest(event.bindingDigest, bindingDigest)
    || !validIdentity(event.utility)
    || event.utility.pgid !== event.utility.pid
    || event.utility.sid !== event.utility.pid
  ) {
    return null;
  }
  if (
    platform === "linux"
    && !identityMatches(event.utility, readIdentity(event.utility.pid))
  ) {
    return null;
  }
  return Object.freeze({
    ...event.utility,
    bindingDigest,
  });
}

function validateSessionPortReadyEvent({
  event,
  bindingDigest,
  leaseDigest,
  launch,
  platform,
  utility,
}) {
  const terminal = event?.terminal;
  if (
    !isExactPrivateObject(event, [
      "type",
      "protocol",
      "bindingDigest",
      "leaseDigest",
      "terminalNonceDigest",
      "utility",
      "terminal",
    ])
    || event.type !== "session_port_ready"
    || event.protocol !== PROCESS_SUPERVISOR_PROTOCOL
    || !sameDigest(event.bindingDigest, bindingDigest)
    || !sameDigest(event.leaseDigest, leaseDigest)
    || !HEX_SHA256.test(event.terminalNonceDigest)
    || !identityMatches(utility, event.utility)
    || !isExactPrivateObject(terminal, [
      "dev",
      "ino",
      "rdev",
      "rows",
      "columns",
      "foregroundPgid",
    ])
    || !["dev", "ino", "rdev", "foregroundPgid"].every(
      (key) => Number.isSafeInteger(terminal[key]) && terminal[key] >= 0,
    )
    || terminal.rows !== 40
    || terminal.columns !== 120
    || terminal.foregroundPgid !== utility.pgid
  ) {
    return null;
  }
  if (platform === "linux") {
    const current = readLinuxSessionProcessIdentity(utility.pid);
    let expectedExecutable;
    let expectedCwd;
    try {
      expectedExecutable = fs.realpathSync(launch.argv[0]);
      expectedCwd = fs.realpathSync(launch.cwd);
    } catch {
      return null;
    }
    const expectedArgv = Buffer.concat(
      launch.argv.flatMap((argument) => [
        Buffer.from(argument, "utf8"),
        Buffer.from([0]),
      ]),
    );
    if (
      !current
      || !identityMatches(utility, current)
      || current.executable !== expectedExecutable
      || current.cwd !== expectedCwd
      || !current.argvNul.equals(expectedArgv)
    ) {
      expectedArgv.fill(0);
      return null;
    }
    expectedArgv.fill(0);
  }
  return Object.freeze({
    bindingDigest,
    leaseDigest,
    terminalNonceDigest: event.terminalNonceDigest,
  });
}

function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function copyPromptPayload(argument) {
  if (!isExactDataObject(argument, ["prompt"])) {
    throw sessionPortError(
      "SESSION_PORT_INVALID_ARGUMENT",
      "validation",
    );
  }
  const prompt = Object.getOwnPropertyDescriptor(argument, "prompt").value;
  if (
    typeof prompt !== "string"
    || prompt.length === 0
    || prompt.includes("\0")
    || prompt.includes("\r")
    || hasUnpairedSurrogate(prompt)
  ) {
    throw sessionPortError(
      "SESSION_PORT_INVALID_ARGUMENT",
      "validation",
    );
  }
  const promptBytes = Buffer.byteLength(prompt, "utf8");
  if (promptBytes > SESSION_PORT_MAX_PAYLOAD_BYTES) {
    throw sessionPortError(
      "SESSION_PORT_PROMPT_TOO_LARGE",
      "validation",
    );
  }
  const payload = Buffer.alloc(promptBytes + 1);
  payload.write(prompt, 0, promptBytes, "utf8");
  payload[promptBytes] = 0x0d;
  return { payload, promptBytes };
}

function validateSnapshotArgument(argument) {
  if (!isExactDataObject(argument, [])) {
    throw sessionPortError(
      "SESSION_PORT_INVALID_ARGUMENT",
      "validation",
    );
  }
}

function encodeSessionPortFrame({
  opcode,
  sequence,
  payload,
  bindingTag,
}) {
  const frame = Buffer.alloc(SESSION_PORT_HEADER_BYTES + payload.length);
  SESSION_PORT_MAGIC.copy(frame, 0);
  frame[4] = 0x01;
  frame[5] = opcode;
  frame.writeUInt16BE(0, 6);
  frame.writeUInt32BE(sequence, 8);
  frame.writeUInt32BE(payload.length, 12);
  bindingTag.copy(frame, 16);
  payload.copy(frame, SESSION_PORT_HEADER_BYTES);
  return frame;
}

function decodeStrictUtf8(value) {
  try {
    return new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(value);
  } catch {
    return null;
  }
}

function decodeSessionPortResponse(frame, record, operation) {
  if (
    frame.length < SESSION_PORT_HEADER_BYTES
    || frame.length > SESSION_PORT_MAX_RESPONSE_BYTES
    || !frame.subarray(0, 4).equals(SESSION_PORT_MAGIC)
    || frame[4] !== 0x01
    || frame.readUInt16BE(6) !== 0
  ) {
    return null;
  }
  const payloadLength = frame.readUInt32BE(12);
  if (frame.length !== SESSION_PORT_HEADER_BYTES + payloadLength) {
    return null;
  }
  const receivedTag = frame.subarray(16, 48);
  if (
    !Buffer.isBuffer(record.bindingTag)
    || record.bindingTag.length !== 32
    || receivedTag.length !== 32
    || !timingSafeEqual(record.bindingTag, receivedTag)
    || frame.readUInt32BE(8) !== operation.sequence
  ) {
    return null;
  }

  const opcode = frame[5];
  const payload = frame.subarray(SESSION_PORT_HEADER_BYTES);
  if (opcode === 0xff) {
    if (payload.length !== 4 || payload[3] !== 0) return null;
    const error = sessionPortFrameError(
      payload.readUInt16BE(0),
      payload[2],
      operation.type,
    );
    return error ? { error } : null;
  }

  if (operation.type === "write") {
    if (opcode !== 0x81 || payload.length !== 4) return null;
    const acceptedBytes = payload.readUInt32BE(0);
    if (acceptedBytes !== operation.promptBytes) return null;
    return {
      result: Object.freeze({
        sequence: operation.sequence,
        acceptedBytes,
      }),
    };
  }

  if (
    ![0x82, 0x83].includes(opcode)
    || payload.length > SESSION_PORT_MAX_PAYLOAD_BYTES
    || (
      payload.length > 0
      && payload.at(-1) !== 0x0a
    ) // D007C_GUARD:snapshot_final_lf
    || payload.includes(0x00) // D007C_GUARD:snapshot_nul
    || (
      opcode === 0x83
      && (
        payload.length < SESSION_PORT_TRUNCATION_MARKER.length
        || !payload
          .subarray(0, SESSION_PORT_TRUNCATION_MARKER.length)
          .equals(SESSION_PORT_TRUNCATION_MARKER)
      )
    )
  ) {
    return null;
  }
  const snapshot = decodeStrictUtf8(payload);
  if (snapshot === null) return null;
  return {
    result: Object.freeze({
      sequence: operation.sequence,
      snapshot,
      snapshotBytes: payload.length,
      truncated: opcode === 0x83,
    }),
  };
}

function operationFailure(operation) {
  return operation.type === "write"
    ? sessionPortError("SESSION_PORT_WRITE_ABORTED", "write")
    : sessionPortError("SESSION_PORT_SNAPSHOT_FAILED", "snapshot");
}

function operationTransportFailure(operation) {
  if (!operation.dispatched) {
    return sessionPortError(
      "SESSION_PORT_TERMINAL_CLOSED",
      "lifecycle",
    );
  }
  return operationFailure(operation);
}

function createHelperSessionPortChannel(record, binding) {
  let requestStream = record.helperRequestStream;
  let responseStream = record.helperResponseStream;
  let buffered = Buffer.alloc(0);
  let active = null;
  let retired = false;
  let failed = false;

  const rejectActive = () => {
    if (!active) return;
    const current = active;
    active = null;
    current.reject(new Error("private session port channel closed"));
  };
  const fail = () => {
    if (failed) return;
    failed = true;
    rejectActive();
  };
  const parse = () => {
    if (!active || buffered.length < SESSION_PORT_HEADER_BYTES) return;
    const payloadLength = buffered.readUInt32BE(12);
    if (
      payloadLength > SESSION_PORT_MAX_PAYLOAD_BYTES
      || SESSION_PORT_HEADER_BYTES + payloadLength
        > SESSION_PORT_MAX_RESPONSE_BYTES
    ) {
      fail();
      return;
    }
    const frameLength = SESSION_PORT_HEADER_BYTES + payloadLength;
    if (buffered.length < frameLength) return;
    const frame = Buffer.from(buffered.subarray(0, frameLength));
    const previous = buffered;
    buffered = Buffer.from(buffered.subarray(frameLength));
    previous.fill(0);
    const current = active;
    active = null;
    current.resolve(frame);
  };
  const onData = (chunk) => {
    if (retired || failed) return;
    const previous = buffered;
    buffered = Buffer.concat([buffered, Buffer.from(chunk)]);
    previous.fill(0);
    if (buffered.length > SESSION_PORT_MAX_RESPONSE_BYTES) {
      fail();
      return;
    }
    parse();
  };
  const onError = () => fail();
  const onClose = () => fail();
  responseStream.on("data", onData);
  responseStream.on("error", onError);
  responseStream.on("end", onClose);
  responseStream.on("close", onClose);
  requestStream.on("error", onError);
  requestStream.on("close", onClose);

  const exchange = async (frame, control) => {
    if (
      retired
      || failed
      || active
      || !Buffer.isBuffer(frame)
      || frame.length > SESSION_PORT_MAX_REQUEST_BYTES
    ) {
      throw new Error("private session port exchange unavailable");
    }
    const response = createDeferred();
    active = response;
    parse();
    const write = createDeferred();
    let callbackDone = false;
    let drainDone = true;
    let writeReturned = false;
    let writeSettled = false;
    const finishWrite = (error) => {
      if (writeSettled) return;
      writeSettled = true;
      requestStream?.off("drain", onDrain);
      if (error) {
        write.reject(error);
      } else {
        write.resolve();
      }
    };
    const maybeFinishWrite = () => {
      if (writeReturned && callbackDone && drainDone) finishWrite();
    };
    const onDrain = () => {
      drainDone = true;
      maybeFinishWrite();
    };
    response.promise.catch((error) => finishWrite(error));
    try {
      control?.onDispatchStart();
      const accepted = requestStream.write(frame, (error) => {
        callbackDone = true;
        if (error) {
          finishWrite(error);
          return;
        }
        maybeFinishWrite();
      });
      drainDone = accepted || requestStream.writableNeedDrain !== true;
      writeReturned = true;
      if (!drainDone) requestStream.once("drain", onDrain);
      maybeFinishWrite();
    } catch (error) {
      finishWrite(error);
    }
    try {
      await write.promise;
      control?.onDispatched();
      return await response.promise;
    } catch (error) {
      if (active === response) active = null;
      throw error;
    }
  };

  return {
    bindingDigest: binding.bindingDigest,
    leaseDigest: binding.leaseDigest,
    terminalNonceDigest: record.helperReady.terminalNonceDigest,
    exchange,
    retire() {
      if (retired) return;
      retired = true;
      responseStream.off("data", onData);
      responseStream.off("error", onError);
      responseStream.off("end", onClose);
      responseStream.off("close", onClose);
      requestStream.off("error", onError);
      requestStream.off("close", onClose);
      rejectActive();
      buffered.fill(0);
      buffered = Buffer.alloc(0);
      if (!requestStream.destroyed) requestStream.destroy();
      if (!responseStream.destroyed) responseStream.destroy();
      requestStream = null;
      responseStream = null;
    },
  };
}

function createHelperSessionPortOps(record) {
  return Object.freeze({
    async open(binding) {
      if (
        !record.helperReady
        || !record.helperRequestStream
        || !record.helperResponseStream
        || !sameDigest(
          record.helperReady.bindingDigest,
          binding.bindingDigest,
        )
        || !sameDigest(record.helperReady.leaseDigest, binding.leaseDigest)
      ) {
        throw new Error("private helper session port is unavailable");
      }
      return createHelperSessionPortChannel(record, binding);
    },
  });
}

function retireSessionPortChannel(channel) {
  if (!channel || typeof channel.retire !== "function") return;
  try {
    Promise.resolve(channel.retire()).catch(() => {});
  } catch {
    // Retirement is already fail-closed and cannot alter the public result.
  }
}

function revokeSessionPort(
  record,
  {
    activationError,
    cancelExecution = false,
    cause,
    force = false,
  } = {},
) {
  if (
    !force
    && cause === "cancelled"
    && record.state === "ACTIVE"
  ) {
    record.state = "REVOKING";
    if (record.pendingOperations.length > 0) {
      const operation = record.currentOperation
        ?? record.pendingOperations[0];
      operation.cancellationRequested = true;
      if (!operation.dispatchStarted) {
        operation.cancelBeforeDispatch = true;
      }
      for (const pending of record.pendingOperations) {
        if (pending === operation) continue;
        pending.revoked = true;
        pending.payload.fill(0);
        record.operationBuffers.delete(pending.payload);
      }
    }
    return;
  }
  if (!["REVOKED", "SETTLED"].includes(record.state)) {
    record.state = "REVOKING";
    const channel = record.channel;
    record.channel = null;
    retireSessionPortChannel(channel);
    record.bindingTag?.fill(0);
    record.bindingTag = null;
    record.leaseKey?.fill(0);
    record.leaseKey = null;
    record.leaseNonce = null;
    for (const buffer of record.operationBuffers) buffer.fill(0);
    record.operationBuffers.clear();
    record.state = "REVOKED";
  }
  if (!record.activationSettled) {
    const error = activationError ?? sessionPortError(
      "SESSION_PORT_REVOKED",
      "lifecycle",
    );
    record.activationFailure = activationError ?? null;
    record.activationSettled = true;
    record.activation.reject(error);
  }
  if (
    cancelExecution
    && record.execution
    && !record.cancelRequested
  ) {
    record.cancelRequested = true;
    try {
      Promise.resolve(record.execution.cancel()).catch(() => {});
    } catch {
      // The ordinary supervisor already owns settlement and fallback cleanup.
    }
  }
}

function settleSessionPort(record) {
  revokeSessionPort(record, { force: true });
  record.state = "SETTLED";
  record.activation = null;
  record.activationFailure = null;
  record.bindingDigest = null;
  record.issued = null;
  record.leaseDigest = null;
  record.mode = null;
  record.nextSequence = 0;
  record.operationBuffers.clear();
  record.pendingOperations.length = 0;
  record.currentOperation = null;
  record.helperReady = null;
  record.helperRequestStream = null;
  record.helperResponseStream = null;
  record.sessionPortOps = null;
  record.sessionId = null;
  record.execution = null;
  record.tail = Promise.resolve();
}

function makeSessionPort(record) {
  const port = Object.create(null);
  Object.defineProperties(port, {
    writePrompt: {
      value: sessionPortWritePrompt,
      enumerable: true,
      configurable: false,
      writable: false,
    },
    snapshot: {
      value: sessionPortSnapshot,
      enumerable: true,
      configurable: false,
      writable: false,
    },
  });
  SESSION_PORT_RECEIVERS.set(port, record);
  return Object.freeze(port);
}

async function activateSessionPort(record) {
  if (
    record.activationStarted
    || record.mode !== "persistent"
    || record.state !== "BOOTSTRAPPING"
  ) {
    return;
  }
  record.activationStarted = true;
  const binding = Object.freeze({
    bindingDigest: record.bindingDigest,
    leaseDigest: record.leaseDigest,
    leaseNonce: record.leaseNonce,
    sessionId: record.sessionId,
  });
  let channel;
  try {
    channel = await record.sessionPortOps.open(binding);
  } catch {
    revokeSessionPort(record, {
      activationError: sessionPortError(
        "SESSION_PORT_TERMINAL_CLOSED",
        "lifecycle",
      ),
      cancelExecution: true,
    });
    return;
  }
  if (record.state !== "BOOTSTRAPPING") {
    retireSessionPortChannel(channel);
    return;
  }
  if (
    !isExactPrivateObject(channel, [
      "bindingDigest",
      "leaseDigest",
      "terminalNonceDigest",
      "exchange",
      "retire",
    ])
    || !sameDigest(channel.bindingDigest, record.bindingDigest)
    || !sameDigest(channel.leaseDigest, record.leaseDigest)
    || !HEX_SHA256.test(channel.terminalNonceDigest)
    || typeof channel.exchange !== "function"
    || typeof channel.retire !== "function"
  ) {
    retireSessionPortChannel(channel);
    revokeSessionPort(record, {
      activationError: sessionPortError(
        "SESSION_PORT_UNAUTHORIZED",
        "identity",
      ),
      cancelExecution: true,
    });
    return;
  }

  const launchDigest = Buffer.from(record.bindingDigest, "hex");
  const leaseDigest = Buffer.from(record.leaseDigest, "hex");
  const terminalNonceDigest = Buffer.from(
    channel.terminalNonceDigest,
    "hex",
  );
  record.bindingTag = createHmac("sha256", record.leaseKey)
    .update(SESSION_PORT_BINDING_DOMAIN)
    .update(launchDigest)
    .update(leaseDigest)
    .update(terminalNonceDigest)
    .digest();
  record.channel = channel;
  record.state = "ACTIVE";
  const port = makeSessionPort(record);
  const observation = Object.freeze({
    sessionId: record.sessionId,
    tmuxTarget: record.sessionId,
    attachCommand: `tmux attach -t ${record.sessionId}`,
  });
  record.issued = Object.freeze({ port, observation });
  record.leaseKey.fill(0);
  record.leaseKey = null;
  record.leaseNonce = null;
  record.activationSettled = true;
  record.activation.resolve(record.issued);
}

function requestSessionPortActivation(record) {
  if (
    !record.claimRequested
    || !record.utilityReady
    || (record.requiresHelperReady && !record.helperReady)
  ) {
    return;
  }
  void activateSessionPort(record).catch(() => {
    revokeSessionPort(record, {
      activationError: sessionPortError(
        "SESSION_PORT_TERMINAL_CLOSED",
        "lifecycle",
      ),
      cancelExecution: true,
    });
  });
}

async function performSessionPortOperation(record, operation) {
  let frame;
  let dispatchedFrame;
  let response;
  record.currentOperation = operation;
  try {
    if (operation.revoked) {
      throw sessionPortError("SESSION_PORT_REVOKED", "lifecycle");
    }
    if (operation.cancelBeforeDispatch) {
      const error = sessionPortError(
        "SESSION_PORT_CANCELLED",
        "lifecycle",
      );
      revokeSessionPort(record, {
        activationError: error,
        force: true,
      });
      throw error;
    }
    if (
      !["ACTIVE", "REVOKING"].includes(record.state)
      || !record.channel
      || !record.bindingTag
    ) {
      throw sessionPortError("SESSION_PORT_REVOKED", "lifecycle");
    }
    frame = encodeSessionPortFrame({
      opcode: operation.type === "write" ? 0x01 : 0x02,
      sequence: operation.sequence,
      payload: operation.payload,
      bindingTag: record.bindingTag,
    });
    let received;
    const control = Object.freeze({
      onDispatchStart() {
        operation.dispatchStarted = true;
      },
      onDispatched() {
        operation.dispatched = true;
      },
      isCancellationRequested() {
        return operation.cancellationRequested === true;
      },
    });
    try {
      dispatchedFrame = Buffer.from(frame);
      received = await record.channel.exchange(
        dispatchedFrame,
        control,
      );
    } catch {
      const error = operationTransportFailure(operation);
      revokeSessionPort(record, {
        activationError: error,
        cancelExecution: true,
      });
      throw error;
    }
    if (!["ACTIVE", "REVOKING"].includes(record.state)) {
      throw sessionPortError("SESSION_PORT_REVOKED", "lifecycle");
    }
    if (!Buffer.isBuffer(received) && !(received instanceof Uint8Array)) {
      const error = operationFailure(operation);
      revokeSessionPort(record, {
        activationError: error,
        cancelExecution: true,
      });
      throw error;
    }
    response = Buffer.from(received);
    const decoded = decodeSessionPortResponse(
      response,
      record,
      operation,
    );
    if (!decoded) {
      const error = operationFailure(operation);
      revokeSessionPort(record, {
        activationError: error,
        cancelExecution: true,
      });
      throw error;
    }
    if (decoded.error) {
      revokeSessionPort(record, {
        activationError: decoded.error,
        cancelExecution: true,
        force: true,
      });
      throw decoded.error;
    }
    if (!["ACTIVE", "REVOKING"].includes(record.state)) {
      throw sessionPortError("SESSION_PORT_REVOKED", "lifecycle");
    }
    return decoded.result;
  } finally {
    frame?.fill(0);
    dispatchedFrame?.fill(0);
    response?.fill(0);
    operation.payload.fill(0);
    record.operationBuffers.delete(operation.payload);
    const pendingIndex = record.pendingOperations.indexOf(operation);
    if (pendingIndex >= 0) {
      record.pendingOperations.splice(pendingIndex, 1);
    }
    if (record.currentOperation === operation) {
      record.currentOperation = null;
    }
    if (record.state === "REVOKING") {
      revokeSessionPort(record, { force: true });
    }
  }
}

function admitSessionPortOperation(record, operation) {
  if (record.state !== "ACTIVE") {
    operation.payload.fill(0);
    return Promise.reject(
      sessionPortError("SESSION_PORT_REVOKED", "lifecycle"),
    );
  }
  if (record.nextSequence > 0xffffffff) {
    operation.payload.fill(0);
    revokeSessionPort(record, { cancelExecution: true });
    return Promise.reject(
      sessionPortError("SESSION_PORT_REVOKED", "lifecycle"),
    );
  }
  operation.sequence = record.nextSequence;
  record.nextSequence += 1;
  operation.cancelBeforeDispatch = false;
  operation.cancellationRequested = false;
  operation.dispatched = false;
  operation.dispatchStarted = false;
  operation.revoked = false;
  record.operationBuffers.add(operation.payload);
  record.pendingOperations.push(operation);
  const result = record.tail.then(() => (
    performSessionPortOperation(record, operation)
  ));
  record.tail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function sessionPortWritePrompt(argument) {
  const record = SESSION_PORT_RECEIVERS.get(this);
  if (!record) {
    return Promise.reject(
      sessionPortError("SESSION_PORT_UNAUTHORIZED", "claim"),
    );
  }
  let copied;
  try {
    copied = copyPromptPayload(argument);
  } catch (error) {
    return Promise.reject(error);
  }
  return admitSessionPortOperation(record, {
    type: "write",
    payload: copied.payload,
    promptBytes: copied.promptBytes,
  });
}

function sessionPortSnapshot(argument) {
  const record = SESSION_PORT_RECEIVERS.get(this);
  if (!record) {
    return Promise.reject(
      sessionPortError("SESSION_PORT_UNAUTHORIZED", "claim"),
    );
  }
  try {
    validateSnapshotArgument(argument);
  } catch (error) {
    return Promise.reject(error);
  }
  return admitSessionPortOperation(record, {
    type: "snapshot",
    payload: Buffer.alloc(0),
  });
}

function sessionPortClaim(argument) {
  const authority = SESSION_PORT_ISSUER_RECEIVERS.get(this);
  if (!authority) {
    return Promise.reject(
      sessionPortError("SESSION_PORT_UNAUTHORIZED", "claim"),
    );
  }
  if (!isExactDataObject(argument, ["execution"])) {
    return Promise.reject(
      sessionPortError("SESSION_PORT_INVALID_ARGUMENT", "validation"),
    );
  }
  const execution = Object.getOwnPropertyDescriptor(
    argument,
    "execution",
  ).value;
  const record = authority.executionRecords.get(execution);
  if (!record) {
    return Promise.reject(
      sessionPortError("SESSION_PORT_UNAUTHORIZED", "claim"),
    );
  }
  if (["REVOKED", "SETTLED"].includes(record.state)) {
    return Promise.reject(
      sessionPortError("SESSION_PORT_REVOKED", "lifecycle"),
    );
  }
  if (record.mode !== "persistent") {
    return Promise.reject(
      sessionPortError("SESSION_PORT_NOT_PERSISTENT", "claim"),
    );
  }
  if (record.activationFailure) return record.activation.promise;
  record.claimRequested = true;
  requestSessionPortActivation(record);
  return record.activation.promise;
}

function createSessionPortIssuer(executionRecords) {
  const issuer = Object.create(null);
  Object.defineProperty(issuer, "claim", {
    value: sessionPortClaim,
    enumerable: true,
    configurable: false,
    writable: false,
  });
  SESSION_PORT_ISSUER_RECEIVERS.set(issuer, { executionRecords });
  return Object.freeze(issuer);
}

function createProcessSupervisorInternal({
  processOps = defaultProcessOps(),
  clock = { now: () => Date.now() },
  scheduler = defaultScheduler(),
  randomBytes = cryptoRandomBytes,
  platform = process.platform,
  beforeRelease,
  beforeUtilityRelease,
} = {}, sessionPortHooks = null) {
  if (
    !processOps
    || typeof processOps.spawn !== "function"
    || typeof processOps.readIdentity !== "function"
    || typeof processOps.signalGroup !== "function"
    || typeof clock?.now !== "function"
    || typeof scheduler?.setTimeout !== "function"
    || typeof scheduler?.clearTimeout !== "function"
    || typeof randomBytes !== "function"
    || (beforeRelease !== undefined && typeof beforeRelease !== "function")
    || (
      beforeUtilityRelease !== undefined
      && typeof beforeUtilityRelease !== "function"
    )
  ) {
    throw safeError("PROCESS_INVALID_REQUEST", "dependencies");
  }

  return Object.freeze({
    async start(request) {
      const launch = cloneLaunch(request, platform);
      sessionPortHooks?.validateLaunch?.(launch);
      const now = clock.now();
      if (!Number.isSafeInteger(now) || now < 0) {
        throw safeError("PROCESS_RUNTIME_UNAVAILABLE", "clock");
      }
      if (
        launch.mode === "one-shot"
        && launch.deadlineAt <= now
      ) {
        throw safeError("PROCESS_BUDGET_EXHAUSTED", "preflight");
      }

      const bindingDigest = canonicalDigest({
        executable: launch.argv[0],
        argv: launch.argv,
        cwd: launch.cwd,
        sessionId: launch.sessionId,
      });
      let leaseNonce;
      try {
        leaseNonce = Buffer.from(randomBytes(32)).toString("hex");
      } catch {
        throw safeError("PROCESS_RUNTIME_UNAVAILABLE", "entropy");
      }
      if (!/^[a-f0-9]{64}$/.test(leaseNonce)) {
        throw safeError("PROCESS_RUNTIME_UNAVAILABLE", "entropy");
      }
      const expectedLeaseDigest = createHash("sha256")
        .update(leaseNonce)
        .digest("hex");
      const sessionLeaseDigest = createHash("sha256")
        .update(Buffer.from(leaseNonce, "hex"))
        .digest("hex");
      const sessionContext = sessionPortHooks?.onLaunch?.({
        bindingDigest,
        leaseDigest: sessionLeaseDigest,
        leaseNonce,
        mode: launch.mode,
        sessionId: launch.sessionId,
      });
      const launchRecord = {
        type: "launch",
        protocol: PROCESS_SUPERVISOR_PROTOCOL,
        leaseNonce,
        bindingDigest,
        mode: launch.mode,
        deadlineAt: launch.deadlineAt ?? null,
        terminationGraceMs: launch.terminationGraceMs,
        argv: launch.argv,
        env: launch.env,
        cwd: launch.cwd,
        ...(sessionContext?.helperSideband
          ? {
            sessionPort: true,
            sessionPortTarget: launch.sessionId, // D007C_T2_GUARD:default_launch_record
            sessionPortRuntimeExecutable: launch.runtimePlan.executable,
            sessionPortRuntimeArgs: launch.runtimePlan.args,
          }
          : {}),
      };
      const launchFrame = encodeControlFrame(
        launchRecord,
        "PROCESS_INVALID_REQUEST",
      );
      let child;
      try {
        child = processOps.spawn(
          launch.runtimePlan.executable,
          [...launch.runtimePlan.args, HELPER_PATH],
          {
            cwd: launch.cwd,
            env: launch.runtimePlan.env,
            shell: false,
            detached: true,
            stdio: sessionContext?.helperSideband
              ? ["pipe", "pipe", "pipe", "pipe", "pipe", "pipe"]
              : ["pipe", "pipe", "pipe", "pipe"],
          },
        );
      } catch {
        throw safeError("PROCESS_RUNTIME_UNAVAILABLE", "spawn");
      }
      if (
        !child
        || !Number.isSafeInteger(child.pid)
        || child.pid <= 1
        || !child.stdin
        || !child.stdout
        || !child.stderr
        || !child.stdio?.[3]
        || (
          sessionContext?.helperSideband
          && (!child.stdio?.[4] || !child.stdio?.[5])
        )
      ) {
        child?.once?.("error", () => {});
        throw safeError("PROCESS_RUNTIME_UNAVAILABLE", "spawn");
      }
      sessionContext?.bindChild?.(child);

      const ready = createDeferred();
      const utility = createDeferred();
      const completion = createDeferred();
      utility.promise.catch(() => {});
      completion.promise.catch(() => {});
      let readySettled = false;
      let utilitySettled = false;
      let completionSettled = false;
      let fallbackLease = null;
      let utilityIdentity = null;
      let terminal = null;
      let transcriptEnded = false;
      let childExited = false;
      let outputEnded = false;
      let fallbackAttempted = false;
      let settlementCause = null;
      let terminationCommandSent = false;
      let deadlineTimer = null;
      let controlWriter;
      let transcriptReader;
      let boundariesDisposed = false;
      const outputTransfers = [];

      const rejectReady = (error) => {
        if (readySettled) return;
        readySettled = true;
        ready.reject(error);
      };
      const resolveReady = (value) => {
        if (readySettled) return;
        readySettled = true;
        ready.resolve(value);
      };
      const rejectUtility = (error) => {
        if (utilitySettled) return;
        utilitySettled = true;
        utility.reject(error);
      };
      const resolveUtility = (value) => {
        if (utilitySettled) return;
        utilitySettled = true;
        utility.resolve(value);
      };
      const clearDeadline = () => {
        if (!deadlineTimer) return;
        scheduler.clearTimeout(deadlineTimer);
        deadlineTimer = null;
      };
      const attemptFallback = () => {
        if (
          fallbackAttempted
          || terminal
          || !fallbackLease
          || !validateFallbackLease(fallbackLease, processOps.readIdentity)
        ) {
          return;
        }
        fallbackAttempted = true;
        try {
          processOps.signalGroup(
            fallbackLease.supervisor.pgid,
            "SIGTERM",
          );
        } catch {
          // The authenticated anchor may have completed between validation
          // and the exact signal. Never broaden the target.
        }
      };
      const lockCause = (cause) => {
        if (settlementCause || completionSettled) return false;
        settlementCause = cause;
        sessionContext?.revoke?.(cause);
        return true;
      };
      const abortOutputs = () => {
        for (const transfer of outputTransfers) transfer.abort();
      };
      const disposeBoundaries = () => {
        if (boundariesDisposed) return;
        boundariesDisposed = true;
        for (const transfer of outputTransfers) transfer.dispose();
        transcriptReader?.dispose();
        controlWriter?.dispose();
      };
      const publicResult = () => {
        switch (settlementCause) {
          case "cancelled":
            return { status: "cancelled" };
          case "timed_out":
            return { status: "timed_out" };
          case "stream_failed":
            throw safeError("PROCESS_STREAM_FAILED", "stream");
          case "transcript_failed":
            throw safeError("PROCESS_BOOTSTRAP_FAILED", "transcript");
          case "control_failed":
            throw safeError("PROCESS_BOOTSTRAP_FAILED", "control");
          case "runtime_failed":
            throw safeError("PROCESS_RUNTIME_UNAVAILABLE", "spawn");
          default:
            if (!terminal) {
              throw safeError(
                "PROCESS_SUPERVISOR_LOST",
                "supervision",
              );
            }
            return terminalResult(terminal);
        }
      };
      const finalize = () => {
        if (
          completionSettled
          || !childExited
          || !transcriptEnded
          || !outputEnded
        ) {
          return;
        }
        completionSettled = true;
        clearDeadline();
        disposeBoundaries();
        sessionContext?.settle?.();
        const event = terminal;
        if (!readySettled) {
          rejectReady(safeError("PROCESS_BOOTSTRAP_FAILED", "bootstrap"));
        }
        if (!utilitySettled) {
          rejectUtility(safeError(
            event?.reason === "exec_error"
              ? "PROCESS_EXEC_FAILED"
              : "PROCESS_BOOTSTRAP_FAILED",
            "utility",
          ));
        }
        try {
          completion.resolve(publicResult());
        } catch (error) {
          completion.reject(error);
        }
      };
      const handleControlFailure = () => {
        lockCause("control_failed");
        abortOutputs();
        rejectReady(safeError("PROCESS_BOOTSTRAP_FAILED", "control"));
        rejectUtility(safeError("PROCESS_BOOTSTRAP_FAILED", "control"));
        if (!child.stdin.destroyed) child.stdin.destroy();
        attemptFallback();
        finalize();
      };
      const requestTermination = (cause) => {
        if (!lockCause(cause)) return completion.promise;
        abortOutputs();
        if (!childExited && !terminationCommandSent) {
          terminationCommandSent = true;
          const helperReason = cause === "timed_out"
            ? "timed_out"
            : "cancelled";
          void controlWriter.write({
            type: "terminate",
            protocol: PROCESS_SUPERVISOR_PROTOCOL,
            reason: helperReason,
          }).catch(() => {});
        }
        return completion.promise;
      };
      const failTranscript = () => {
        rejectReady(safeError("PROCESS_BOOTSTRAP_FAILED", "transcript"));
        rejectUtility(safeError("PROCESS_BOOTSTRAP_FAILED", "transcript"));
        requestTermination("transcript_failed");
      };

      controlWriter = createControlWriter(child.stdin, handleControlFailure);
      outputTransfers.push(
        createStreamTransfer(
          child.stdout,
          launch.stdout,
          () => requestTermination("stream_failed"),
        ),
        createStreamTransfer(
          child.stderr,
          launch.stderr,
          () => requestTermination("stream_failed"),
        ),
      );
      Promise.all(outputTransfers.map((transfer) => transfer.promise))
        .then(() => {
          outputEnded = true;
          finalize();
        });

      transcriptReader = parseTranscript(
        child.stdio[3],
        (event) => {
          if (event.type === "reaper_ready") {
            if (readySettled || fallbackLease) {
              failTranscript();
              return;
            }
            const lease = validateReadyEvent({
              event,
              childPid: child.pid,
              expectedLeaseDigest,
              bindingDigest,
              platform,
              readIdentity: processOps.readIdentity,
            });
            if (!lease) {
              failTranscript();
              return;
            }
            fallbackLease = lease;
            resolveReady(lease);
            return;
          }
          if (event.type === "utility_ready") {
            if (!fallbackLease || utilitySettled) {
              rejectUtility(safeError(
                "PROCESS_BOOTSTRAP_FAILED",
                "transcript",
              ));
              requestTermination("transcript_failed");
              return;
            }
            const identity = validateUtilityEvent({
              event,
              bindingDigest,
              platform,
              readIdentity: processOps.readIdentity,
            });
            if (!identity) {
              rejectUtility(safeError(
                "PROCESS_BOOTSTRAP_FAILED",
                "identity",
              ));
              requestTermination("transcript_failed");
              return;
            }
            resolveUtility(identity);
            utilityIdentity = identity;
            sessionContext?.utilityReady?.();
            if (!beforeUtilityRelease) {
              void controlWriter.write({
                type: "continue",
                protocol: PROCESS_SUPERVISOR_PROTOCOL,
              }).catch(() => {});
            } else {
              Promise.resolve()
                .then(() => beforeUtilityRelease(identity))
                .then(() => {
                  if (!settlementCause && !completionSettled) {
                    return controlWriter.write({
                      type: "continue",
                      protocol: PROCESS_SUPERVISOR_PROTOCOL,
                    });
                  }
                  return undefined;
                })
                .catch(() => {
                  if (!settlementCause) requestTermination("cancelled");
                });
            }
            return;
          }
          if (event.type === "session_port_ready") {
            if (
              !sessionContext?.helperSideband
              || !fallbackLease
              || !utilityIdentity
            ) {
              failTranscript();
              return;
            }
            const helperReady = validateSessionPortReadyEvent({
              event,
              bindingDigest,
              leaseDigest: sessionLeaseDigest,
              launch,
              platform,
              utility: utilityIdentity,
            });
            if (!helperReady) {
              rejectUtility(safeError(
                "PROCESS_BOOTSTRAP_FAILED",
                "identity",
              ));
              requestTermination("transcript_failed");
              return;
            }
            sessionContext.sessionPortReady(helperReady);
            return;
          }
          if (
            event.type === "terminal"
            && event.protocol === PROCESS_SUPERVISOR_PROTOCOL
            && SAFE_TERMINAL_REASONS.has(event.reason)
            && !terminal
          ) {
            terminal = event;
            sessionContext?.revoke?.(event.reason);
            if (event.reason !== "exited" && lockCause(event.reason)) {
              abortOutputs();
            }
            return;
          }
          if (event.type !== "utility_exec") failTranscript();
        },
        failTranscript,
        () => {
          transcriptEnded = true;
          finalize();
        },
      );

      child.once("error", () => {
        rejectReady(safeError("PROCESS_RUNTIME_UNAVAILABLE", "spawn"));
        rejectUtility(safeError("PROCESS_RUNTIME_UNAVAILABLE", "spawn"));
        lockCause("runtime_failed");
        abortOutputs();
        transcriptReader.abort();
        childExited = true;
        finalize();
      });
      child.once("exit", () => {
        childExited = true;
        attemptFallback();
        finalize();
      });

      if (launch.mode === "one-shot") {
        deadlineTimer = scheduler.setTimeout(() => {
          requestTermination("timed_out");
          if (!readySettled) {
            rejectReady(safeError(
              "PROCESS_BUDGET_EXHAUSTED",
              "bootstrap",
            ));
          }
        }, Math.max(0, launch.deadlineAt - clock.now()));
      }

      try {
        await controlWriter.write(launchFrame);
      } catch {
        handleControlFailure();
      }

      let lease;
      try {
        lease = await ready.promise;
        if (beforeRelease) await beforeRelease({
          supervisor: lease.supervisor,
          reaper: lease.anchor,
          bindingDigest,
        });
      } catch {
        if (!settlementCause) requestTermination("cancelled");
        throw safeError("PROCESS_BOOTSTRAP_FAILED", "release");
      }
      try {
        await controlWriter.write({
          type: "release",
          protocol: PROCESS_SUPERVISOR_PROTOCOL,
        });
      } catch {
        handleControlFailure();
        throw safeError("PROCESS_BOOTSTRAP_FAILED", "release");
      }

      const execution = {
        mode: launch.mode,
        bindingDigest,
        supervisor: lease.supervisor,
        reaper: lease.anchor,
        utilityIdentity: utility.promise,
        completion: completion.promise,
        cancel() {
          return requestTermination("cancelled");
        },
      };
      const frozenExecution = Object.freeze(execution);
      sessionContext?.bindExecution?.(frozenExecution);
      return frozenExecution;
    },
  });
}

export function createProcessSupervisor(options = {}) {
  return createProcessSupervisorInternal(options);
}

export function createProcessSupervisorSessionPortFactory(options = {}) {
  if (
    !isPlainObject(options)
    || utilTypes.isProxy(options)
  ) {
    throw safeError("PROCESS_INVALID_REQUEST", "dependencies");
  }
  const {
    sessionPortOps: suppliedSessionPortOps,
    ...supervisorOptions
  } = options;
  if (
    suppliedSessionPortOps !== undefined
    && (
      !suppliedSessionPortOps
      || typeof suppliedSessionPortOps !== "object"
      || utilTypes.isProxy(suppliedSessionPortOps)
      || typeof suppliedSessionPortOps.open !== "function"
    )
  ) {
    throw safeError("PROCESS_INVALID_REQUEST", "dependencies");
  }
  const executionRecords = new WeakMap();
  const sessionPortHooks = Object.freeze({
    validateLaunch(launch) {
      if (
        launch.mode === "persistent"
        && (
          !SAFE_SESSION_TARGET.test(launch.sessionId)
          || launch.stdout != null
          || launch.stderr != null
        )
      ) {
        throw safeError("PROCESS_INVALID_REQUEST", "validation");
      }
    },
    onLaunch({
      bindingDigest,
      leaseDigest,
      leaseNonce,
      mode,
      sessionId,
    }) {
      const activation = createDeferred();
      activation.promise.catch(() => {});
      const requiresHelperReady = (
        suppliedSessionPortOps === undefined
        && mode === "persistent"
      );
      const record = {
        activation,
        activationFailure: null,
        activationSettled: false,
        activationStarted: false,
        bindingDigest,
        bindingTag: null,
        cancelRequested: false,
        channel: null,
        claimRequested: false,
        currentOperation: null,
        execution: null,
        helperReady: null,
        helperRequestStream: null,
        helperResponseStream: null,
        issued: null,
        leaseDigest,
        leaseKey: Buffer.from(leaseNonce, "hex"),
        leaseNonce,
        mode,
        nextSequence: 1,
        operationBuffers: new Set(),
        pendingOperations: [],
        requiresHelperReady,
        sessionId,
        sessionPortOps: suppliedSessionPortOps,
        state: "BOOTSTRAPPING",
        tail: Promise.resolve(),
        utilityReady: false,
      };
      if (requiresHelperReady) {
        record.sessionPortOps = createHelperSessionPortOps(record);
      }
      return Object.freeze({
        helperSideband: requiresHelperReady,
        bindChild(child) {
          if (!requiresHelperReady) return;
          record.helperRequestStream = child.stdio[4];
          record.helperResponseStream = child.stdio[5];
        },
        bindExecution(execution) {
          record.execution = execution;
          executionRecords.set(execution, record);
        },
        utilityReady() {
          record.utilityReady = true;
          requestSessionPortActivation(record);
        },
        sessionPortReady(ready) {
          if (!requiresHelperReady || record.helperReady) {
            revokeSessionPort(record, {
              activationError: sessionPortError(
                "SESSION_PORT_UNAUTHORIZED",
                "identity",
              ),
              cancelExecution: true,
              force: true,
            });
            return;
          }
          record.helperReady = ready;
          requestSessionPortActivation(record);
        },
        revoke(cause) {
          revokeSessionPort(record, { cause });
        },
        settle() {
          settleSessionPort(record);
        },
      });
    },
  });
  const supervisor = createProcessSupervisorInternal(
    supervisorOptions,
    sessionPortHooks,
  );
  const sessionPortIssuer = createSessionPortIssuer(executionRecords);
  return Object.freeze({ supervisor, sessionPortIssuer });
}

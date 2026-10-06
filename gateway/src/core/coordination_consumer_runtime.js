import {
  createCoordinationAckReconciler,
} from "./coordination_ack_reconciler.js";
import {
  createCoordinationConsumer,
} from "./coordination_consumer.js";
import {
  bindCoordinationConsumerRuntimeRetirement,
  inspectCoordinationConsumerRuntimeProvision,
  invokeCoordinationConsumerRuntimeOperation,
  resolveCoordinationConsumerRuntimeProvision,
} from "./coordination_consumer_runtime_provision.js";
import {
  CoordinationConsumerRuntimeError,
  coordinationConsumerRuntimeError,
} from "./coordination_consumer_runtime_error.js";

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ACTIVE_STATES = new Set(["starting", "running", "stopping"]);
const RECOVERY_OPERATIONS = Object.freeze([
  "inspectAckTombstone",
  "finalizeOrphanAck",
]);
const DEFAULT_SCHEDULER = Object.freeze({
  setTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs);
  },
  clearTimeout(timer) {
    globalThis.clearTimeout(timer);
  },
});

export { CoordinationConsumerRuntimeError };

function runtimeError(code, message) {
  return coordinationConsumerRuntimeError(code, message);
}

function abortError() {
  return Object.assign(new Error("aborted"), { name: "AbortError" });
}

function assertManagedClientStatus(
  value,
  expectedScopeId,
  expectedParticipantId,
) {
  // MUTATION_GUARD: managed-client-status
  if (
    !value
    || typeof value !== "object"
    || value.state !== "ready"
    || value.scopeId !== expectedScopeId
    || value.participantId !== expectedParticipantId
    || typeof value.participantId !== "string"
    || !SAFE_IDENTIFIER.test(value.participantId)
  ) {
    throw runtimeError(
      "COORDINATION_CONSUMER_RUNTIME_CLIENT_NOT_READY",
      "coordination consumer runtime requires a ready managed client in its exact incarnation and scope",
    );
  }
  return Object.freeze({
    scopeId: value.scopeId,
    participantId: value.participantId,
  });
}

function invalidRecoveryDescriptor(descriptor) {
  return (
    !descriptor
    || !Object.hasOwn(descriptor, "value")
    || typeof descriptor.value !== "function"
  );
}

function snapshotRecoveryTransport(acquire) {
  let source;
  try {
    source = acquire();
  } catch {
    throw runtimeError(
      "COORDINATION_CONSUMER_RUNTIME_RECOVERY_INVALID",
      "coordination consumer runtime recovery authority is invalid",
    );
  }
  const descriptors = new Map();
  const keys = source && typeof source === "object"
    ? Reflect.ownKeys(source)
    : [];
  for (const operation of RECOVERY_OPERATIONS) {
    descriptors.set(
      operation,
      source && typeof source === "object"
        ? Object.getOwnPropertyDescriptor(source, operation)
        : undefined,
    );
  }
  // MUTATION_GUARD: exact-recovery-facet
  if (
    !source
    || typeof source !== "object"
    || Array.isArray(source)
    || Object.getPrototypeOf(source) !== Object.prototype
    || keys.length !== RECOVERY_OPERATIONS.length
    || keys.some((key) => (
      typeof key !== "string" || !RECOVERY_OPERATIONS.includes(key)
    ))
    || RECOVERY_OPERATIONS.some((operation) =>
      invalidRecoveryDescriptor(descriptors.get(operation)))
  ) {
    throw runtimeError(
      "COORDINATION_CONSUMER_RUNTIME_RECOVERY_INVALID",
      "coordination consumer runtime recovery authority is invalid",
    );
  }
  const inspect = descriptors.get("inspectAckTombstone").value;
  const finalize = descriptors.get("finalizeOrphanAck").value;
  return Object.freeze({
    inspectAckTombstone(input) {
      return Reflect.apply(inspect, undefined, [input]);
    },
    finalizeOrphanAck(input) {
      return Reflect.apply(finalize, undefined, [input]);
    },
  });
}

function createDelay(scheduler) {
  return function delay(delayMs, { signal } = {}) {
    return new Promise((resolve, reject) => {
      // MUTATION_GUARD: pre-aborted-delay
      if (signal?.aborted) {
        reject(abortError());
        return;
      }
      let timer = null;
      const cleanup = () => {
        // MUTATION_GUARD: timer-cleanup
        if (timer !== null) scheduler.clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };
      const onAbort = () => {
        cleanup();
        reject(abortError());
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      try {
        timer = scheduler.setTimeout(() => {
          cleanup();
          resolve();
        }, delayMs);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  };
}

function safeStatus(state, generation) {
  return Object.freeze({ state, generation });
}

function startResult(generation, identity) {
  return Object.freeze({
    status: "started",
    generation,
    scopeId: identity.scopeId,
    participantId: identity.participantId,
  });
}

function stopResult(generation) {
  return Object.freeze({
    status: "stopped",
    generation,
  });
}

function ownershipFailure(message) {
  return runtimeError(
    "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE",
    message,
  );
}

export function createCoordinationConsumerRuntime({
  provision,
  quarantineStore,
  handler,
  clock = () => Date.now(),
  scheduler = DEFAULT_SCHEDULER,
  reconciliationIntervalMs = 1_000,
  audit = () => {},
  metrics = () => {},
  consumerFault = () => {},
  reconciliationFault = () => {},
  retryClassifier,
  consumerConfig = {},
  reconciliationConfig = {},
} = {}) {
  // MUTATION_GUARD: no-ungated-production-profile
  const inspected = inspectCoordinationConsumerRuntimeProvision(provision);
  const { repository, owner, client: coordinationClient } = inspected;
  const scopeId = consumerConfig?.scopeId;
  // MUTATION_GUARD: exact-scope-config
  if (
    typeof scopeId !== "string"
    || !SAFE_IDENTIFIER.test(scopeId)
  ) {
    throw new TypeError("consumerConfig.scopeId must be a safe identifier");
  }
  // MUTATION_GUARD: bounded-reconciliation-interval
  if (
    !Number.isSafeInteger(reconciliationIntervalMs)
    || reconciliationIntervalMs <= 0
  ) {
    throw new TypeError(
      "reconciliationIntervalMs must be a positive safe integer",
    );
  }
  // MUTATION_GUARD: scheduler-contract
  if (
    !scheduler
    || typeof scheduler.setTimeout !== "function"
    || typeof scheduler.clearTimeout !== "function"
  ) {
    throw new TypeError(
      "scheduler must provide setTimeout and clearTimeout functions",
    );
  }

  const delay = createDelay(scheduler);
  let acquireAckRecovery = inspected.acquireAckRecovery;
  let reconciler = null;
  let state = "idle";
  let generation = 0;
  let cycle = null;
  let stopFlight = null;

  function getStatus() {
    return safeStatus(state, generation);
  }

  function initializeReconciler() {
    // MUTATION_GUARD: one-shot-recovery-injection
    if (reconciler === null) {
      const acquire = acquireAckRecovery;
      acquireAckRecovery = null;
      const transport = snapshotRecoveryTransport(acquire);
      reconciler = createCoordinationAckReconciler({
        repository: repository?.ackReconciliation,
        transport,
        clock,
        fault: reconciliationFault,
        config: reconciliationConfig,
      });
    }
    return reconciler;
  }

  async function runReconciliation(resolvedReconciler, signal) {
    while (!signal.aborted) {
      await resolvedReconciler.reconcile();
      await delay(reconciliationIntervalMs, { signal });
    }
  }

  async function exactRelease(activeCycle, kind = "release") {
    if (typeof inspected.lifecycle?.beforeRelease === "function") {
      await inspected.lifecycle.beforeRelease();
    }
    if (
      (kind === "release" && inspected.ownerFaults?.release === "fail")
      || (
        kind === "compensation"
        && inspected.ownerFaults?.compensationRelease === "fail"
      )
    ) {
      throw ownershipFailure(
        "coordination consumer runtime exact release failed",
      );
    }
    const result = owner.release(scopeId, activeCycle.ownerGeneration);
    if (result?.status !== "released") {
      throw ownershipFailure(
        "coordination consumer runtime did not own the exact release generation",
      );
    }
  }

  async function supervise(activeCycle) {
    const observedConsumer = activeCycle.consumerFlight.then(
      (value) => ({ source: "consumer", status: "fulfilled", value }),
      (reason) => ({ source: "consumer", status: "rejected", reason }),
    );
    const observedReconciliation = activeCycle.reconciliationFlight.then(
      (value) => ({
        source: "reconciliation",
        status: "fulfilled",
        value,
      }),
      (reason) => ({
        source: "reconciliation",
        status: "rejected",
        reason,
      }),
    );
    const first = await Promise.race([
      observedConsumer,
      observedReconciliation,
    ]);
    activeCycle.controller.abort();
    // MUTATION_GUARD: release-after-owned-work-settlement
    await Promise.all([observedConsumer, observedReconciliation]);
    try {
      await exactRelease(activeCycle);
    } catch (error) {
      state = "degraded";
      cycle = null;
      throw error;
    }
    const consumerDegraded = (
      first.source === "consumer"
      && first.status === "fulfilled"
      && first.value?.state === "degraded"
    );
    state = first.status === "rejected" || consumerDegraded
      ? "degraded"
      : "stopped";
    cycle = null;
  }

  async function compensateInitialization(
    ownerGeneration,
    controller,
    createdFlights,
  ) {
    controller?.abort();
    await Promise.allSettled(createdFlights);
    // MUTATION_GUARD: initialization-exact-compensation
    await exactRelease({ ownerGeneration }, "compensation");
  }

  async function start() {
    const resolved = resolveCoordinationConsumerRuntimeProvision(provision);
    // MUTATION_GUARD: active-start
    if (ACTIVE_STATES.has(state)) {
      throw runtimeError(
        "COORDINATION_CONSUMER_RUNTIME_ALREADY_RUNNING",
        "coordination consumer runtime is already active",
      );
    }

    if (resolved.scopeId !== scopeId) {
      throw runtimeError(
        "COORDINATION_CONSUMER_RUNTIME_CLIENT_NOT_READY",
        "coordination consumer runtime scope does not match its lineage",
      );
    }
    const identity = assertManagedClientStatus(
      coordinationClient.getStatus(),
      resolved.scopeId,
      resolved.participantId,
    );
    let claim = owner.claim(scopeId);
    // MUTATION_GUARD: start-only-after-committed-claim
    if (claim?.status === "owned") {
      throw runtimeError(
        "COORDINATION_CONSUMER_RUNTIME_STORE_OWNED",
        "coordination consumer runtime store and scope already have an owner",
      );
    }
    if (
      claim?.status !== "claimed"
      || !Number.isSafeInteger(claim.generation)
    ) {
      throw ownershipFailure(
        "coordination consumer runtime claim result is invalid",
      );
    }

    state = "starting";
    stopFlight = null;
    let controller = null;
    const createdFlights = [];
    try {
      const resolvedReconciler = initializeReconciler();
      controller = new AbortController();
      const transport = Object.freeze({
        receive(input) {
          return invokeCoordinationConsumerRuntimeOperation(
            provision,
            "receive",
            input,
            { signal: controller.signal },
          );
        },
        ack(input) {
          return invokeCoordinationConsumerRuntimeOperation(
            provision,
            "ack",
            input,
            { signal: controller.signal },
          );
        },
      });
      const consumer = createCoordinationConsumer({
        transport,
        repository,
        handler,
        quarantineStore,
        clock,
        sleep: delay,
        audit,
        metrics,
        fault: consumerFault,
        retryClassifier,
        config: {
          ...consumerConfig,
          participantId: identity.participantId,
        },
      });
      const consumerFlight = consumer.run({ signal: controller.signal });
      createdFlights.push(consumerFlight);
      const reconciliationFlight = runReconciliation(
        resolvedReconciler,
        controller.signal,
      );
      createdFlights.push(reconciliationFlight);
      generation += 1;
      state = "running";
      const activeCycle = {
        controller,
        ownerGeneration: claim.generation,
        consumerFlight,
        reconciliationFlight,
      };
      cycle = activeCycle;
      activeCycle.supervisionFlight = supervise(activeCycle);
      void activeCycle.supervisionFlight.then(undefined, () => {});
    } catch (error) {
      try {
        await compensateInitialization(
          claim.generation,
          controller,
          createdFlights,
        );
        state = "stopped";
      } catch (compensationError) {
        state = "degraded";
        throw compensationError;
      }
      throw error;
    }
    return startResult(generation, identity);
  }

  function stop() {
    // MUTATION_GUARD: idempotent-stop
    if (stopFlight !== null) return stopFlight;
    // MUTATION_GUARD: inactive-stop
    if (cycle === null) {
      state = "stopped";
      stopFlight = Promise.resolve(stopResult(generation));
      return stopFlight;
    }
    const activeCycle = cycle;
    state = "stopping";
    activeCycle.controller.abort();
    stopFlight = activeCycle.supervisionFlight.then(() => {
      state = "stopped";
      return stopResult(generation);
    });
    return stopFlight;
  }

  bindCoordinationConsumerRuntimeRetirement(provision, stop);

  return Object.freeze({
    start,
    stop,
    getStatus,
  });
}

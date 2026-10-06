import {
  coordinationConsumerRuntimeError,
} from "./coordination_consumer_runtime_error.js";

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const lineagesByClient = new WeakMap();
const lineageRecords = new WeakMap();
const permitRecords = new WeakMap();

function lineageError(code, message) {
  return coordinationConsumerRuntimeError(code, message);
}

function exactReadyParticipant(value) {
  if (
    !value
    || typeof value !== "object"
    || value.state !== "ready"
    || typeof value.scopeId !== "string"
    || !SAFE_IDENTIFIER.test(value.scopeId)
    || typeof value.participantId !== "string"
    || !SAFE_IDENTIFIER.test(value.participantId)
  ) {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_CLIENT_NOT_READY",
      "coordination consumer runtime requires a ready managed client",
    );
  }
  return Object.freeze({
    scopeId: value.scopeId,
    participantId: value.participantId,
  });
}

function issuePermit(record, participant) {
  const permit = Object.freeze({});
  // MUTATION_GUARD: incarnation-permit-inherits-lineage-store
  permitRecords.set(permit, {
    lineage: record.capability,
    incarnation: record.incarnation + 1,
    participant,
    revoked: false,
    retired: false,
    retirementHandler: null,
  });
  record.incarnation += 1;
  record.participant = participant;
  record.currentPermit = permit;
  record.state = "ready";
}

function finishRetirement(record, permitRecord) {
  permitRecord.retired = true;
  record.retirementFlight = null;
  if (record.state === "stopped") return;
  record.state = "awaiting-incarnation";
  const pending = record.pendingParticipant;
  record.pendingParticipant = null;
  if (pending !== null) issuePermit(record, pending);
}

function faultRetirement(record) {
  record.retirementFlight = null;
  record.pendingParticipant = null;
  // MUTATION_GUARD: rejoin-failure-faults-lineage
  record.state = "faulted";
}

function retireCurrentIncarnation(record, nextState = "retiring") {
  const permitRecord = permitRecords.get(record.currentPermit);
  // MUTATION_GUARD: rejoin-revokes-predecessor-admission
  if (permitRecord) permitRecord.revoked = true;
  record.state = nextState;
  const retirement = Promise.resolve().then(
    () => permitRecord?.retirementHandler?.(),
  );
  record.retirementFlight = retirement;
  retirement.then(
    () => finishRetirement(record, permitRecord),
    () => faultRetirement(record),
  );
  return retirement;
}

export function registerManagedClientLineage(
  client,
  { configuredScopeId } = {},
) {
  // MUTATION_GUARD: one-lineage-per-real-managed-client
  const existing = lineagesByClient.get(client);
  if (existing !== undefined) return existing;
  if (
    !client
    || typeof client !== "object"
    || typeof client.getStatus !== "function"
    || typeof client.invoke !== "function"
  ) {
    throw new TypeError("managed client must provide getStatus and invoke");
  }
  if (
    configuredScopeId !== undefined
    && (
      typeof configuredScopeId !== "string"
      || !SAFE_IDENTIFIER.test(configuredScopeId)
    )
  ) {
    throw new TypeError("configuredScopeId must be a safe identifier");
  }
  const capability = Object.freeze({});
  const record = {
    capability,
    client,
    configuredScopeId: configuredScopeId ?? null,
    canonicalScopeId: null,
    assignedStore: null,
    assignmentMade: false,
    incarnation: 0,
    participant: null,
    currentPermit: null,
    state: "awaiting-incarnation",
    pendingParticipant: null,
    retirementFlight: null,
  };
  lineagesByClient.set(client, capability);
  lineageRecords.set(capability, record);
  return capability;
}

export function managedClientLineageReady(client, status) {
  const capability = lineagesByClient.get(client);
  const record = lineageRecords.get(capability);
  if (!record) return;
  const participant = exactReadyParticipant(status);
  if (
    (
      record.configuredScopeId !== null
      && record.configuredScopeId !== participant.scopeId
    )
    || (
      record.canonicalScopeId !== null
      && record.canonicalScopeId !== participant.scopeId
    )
  ) {
    record.state = "faulted";
    return;
  }
  record.canonicalScopeId = participant.scopeId;
  if (record.state === "faulted" || record.state === "stopped") return;
  if (record.state === "retiring") {
    record.pendingParticipant = participant;
    return;
  }
  if (
    record.state === "ready"
    && record.participant?.participantId === participant.participantId
  ) {
    return;
  }
  issuePermit(record, participant);
}

export function managedClientLineageBeginRejoin(client) {
  const capability = lineagesByClient.get(client);
  const record = lineageRecords.get(capability);
  if (
    !record
    || record.state === "retiring"
    || record.state === "faulted"
    || record.state === "stopped"
  ) {
    return;
  }
  // MUTATION_GUARD: rejoin-retirement-before-next-permit
  retireCurrentIncarnation(record);
}

export function managedClientLineageFault(client) {
  const capability = lineagesByClient.get(client);
  const record = lineageRecords.get(capability);
  if (!record || record.state === "stopped") return;
  const permitRecord = permitRecords.get(record.currentPermit);
  if (permitRecord) permitRecord.revoked = true;
  record.pendingParticipant = null;
  record.state = "faulted";
}

export function managedClientLineageStopped(client) {
  const capability = lineagesByClient.get(client);
  const record = lineageRecords.get(capability);
  if (!record || record.state === "stopped") return;
  const permitRecord = permitRecords.get(record.currentPermit);
  if (permitRecord) permitRecord.revoked = true;
  record.pendingParticipant = null;
  record.state = "stopped";
  if (permitRecord?.retirementHandler && record.retirementFlight === null) {
    const retirement = Promise.resolve().then(
      permitRecord.retirementHandler,
    );
    record.retirementFlight = retirement;
    retirement.catch(() => {
      record.state = "faulted";
    });
  }
}

export function managedClientLineage(client) {
  return lineagesByClient.get(client);
}

export function assertManagedClientLineageAssignable(lineage) {
  const record = lineageRecords.get(lineage);
  if (!record) {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID",
      "managed-client lineage capability is invalid",
    );
  }
  if (record.assignmentMade) {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_STORE_MISMATCH",
      "managed-client lineage already has an immutable store assignment",
    );
  }
}

export function assignManagedClientLineageStore(lineage, store) {
  assertManagedClientLineageAssignable(lineage);
  const record = lineageRecords.get(lineage);
  // MUTATION_GUARD: immutable-lineage-store-assignment
  record.assignmentMade = true;
  record.assignedStore = store;
}

export function captureManagedClientRuntimePermit(lineage) {
  const record = lineageRecords.get(lineage);
  if (!record || !record.assignmentMade) {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID",
      "managed-client runtime provision is invalid",
    );
  }
  const permit = record.currentPermit;
  const permitRecord = permitRecords.get(permit);
  if (
    record.state !== "ready"
    || !permitRecord
    || permitRecord.lineage !== lineage
    || permitRecord.revoked
    || permitRecord.retired
  ) {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_CLIENT_NOT_READY",
      "managed-client lineage has no admitted incarnation",
    );
  }
  return permit;
}

export function bindManagedClientRuntimeRetirement(lineage, permit, retire) {
  const record = lineageRecords.get(lineage);
  const permitRecord = permitRecords.get(permit);
  if (
    !record
    || !permitRecord
    || permitRecord.lineage !== lineage
    || permitRecord.revoked
    || permitRecord.retired
    || typeof retire !== "function"
  ) {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID",
      "managed-client runtime retirement binding is invalid",
    );
  }
  if (permitRecord.retirementHandler !== null) {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID",
      "managed-client runtime retirement is already bound",
    );
  }
  permitRecord.retirementHandler = retire;
}

export function managedClientRuntimeAdmission(lineage, exactPermit) {
  const record = lineageRecords.get(lineage);
  if (!record || !record.assignmentMade) {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID",
      "managed-client runtime provision is invalid",
    );
  }
  if (record.state === "faulted") {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_LINEAGE_FAULTED",
      "managed-client lineage is faulted",
    );
  }
  if (record.state === "retiring") {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_LINEAGE_RETIRING",
      "managed-client lineage has no admitted incarnation",
    );
  }
  if (record.state === "awaiting-incarnation") {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_CLIENT_NOT_READY",
      "managed-client lineage is not ready",
    );
  }
  if (record.state !== "ready") {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_CLIENT_NOT_READY",
      "managed-client lineage is not ready",
    );
  }
  const permit = permitRecords.get(exactPermit);
  // MUTATION_GUARD: lineage-capability-integrity
  if (
    !permit
    || permit.lineage !== lineage
    || permit.revoked
    || permit.retired
    || record.currentPermit !== exactPermit
    || permit.participant !== record.participant
  ) {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_LINEAGE_RETIRING",
      "managed-client incarnation permit is not admitted",
    );
  }
  return Object.freeze({
    client: record.client,
    store: record.assignedStore,
    scopeId: permit.participant.scopeId,
    participantId: permit.participant.participantId,
  });
}

export function invokeManagedClientRuntimeOperation(
  lineage,
  exactPermit,
  operation,
  input,
  options,
) {
  const record = lineageRecords.get(lineage);
  const permit = permitRecords.get(exactPermit);
  if (!record || !permit || permit.lineage !== lineage) {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID",
      "managed-client runtime provision is invalid",
    );
  }
  // MUTATION_GUARD: revoked-permit-rejects-managed-operation
  if (permit.revoked) {
    throw lineageError(
      "COORDINATION_CONSUMER_RUNTIME_LINEAGE_RETIRING",
      "managed-client incarnation permit is not admitted",
    );
  }
  return record.client.invoke(operation, input, options);
}

export function probeManagedClientRuntimePermit(lineage, exactPermit) {
  const record = lineageRecords.get(lineage);
  if (!record) return Object.freeze({ status: "invalid" });
  const permit = permitRecords.get(exactPermit);
  if (!permit || permit.lineage !== lineage) {
    return Object.freeze({ status: "invalid" });
  }
  if (record.state === "retiring") {
    return Object.freeze({
      status: "retiring",
      predecessorRevoked: permit.revoked === true,
    });
  }
  if (record.state === "faulted") {
    return Object.freeze({ status: "faulted" });
  }
  if (permit.retired) {
    return Object.freeze({ status: "retired" });
  }
  if (
    record.state === "ready"
    && record.currentPermit === exactPermit
    && !permit.revoked
    && !permit.retired
  ) {
    return Object.freeze({
      status: "ready",
      participantId: permit.participant.participantId,
    });
  }
  if (permit.revoked) {
    return Object.freeze({ status: "retiring" });
  }
  return Object.freeze({ status: record.state });
}

import {
  bindManagedClientRuntimeRetirement,
  invokeManagedClientRuntimeOperation,
  managedClientRuntimeAdmission,
  probeManagedClientRuntimePermit,
} from "./coordination_consumer_lineage.js";
import {
  coordinationConsumerRuntimeError,
} from "./coordination_consumer_runtime_error.js";

const mainStoreRecords = new WeakMap();
const provisionRecords = new WeakMap();

function invalidProvision() {
  return coordinationConsumerRuntimeError(
    "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID",
    "coordination consumer runtime provision is invalid",
  );
}

export function sealSqliteMainStore({
  database,
  repository,
  owner,
}) {
  const capability = Object.freeze({});
  mainStoreRecords.set(capability, Object.freeze({
    database,
    repository,
    owner,
  }));
  return capability;
}

export function issueCoordinationConsumerRuntimeProvision({
  mainStore,
  lineage,
  permit,
  client,
  lifecycle,
  ownerFaults,
  acquireAckRecovery,
}) {
  if (!mainStoreRecords.has(mainStore)) throw invalidProvision();
  const provision = Object.freeze({});
  provisionRecords.set(provision, Object.freeze({
    mainStore,
    lineage,
    permit,
    client,
    lifecycle: lifecycle ?? Object.freeze({}),
    ownerFaults: ownerFaults ?? Object.freeze({}),
    acquireAckRecovery,
  }));
  return provision;
}

export function inspectCoordinationConsumerRuntimeProvision(provision) {
  const record = provisionRecords.get(provision);
  if (!record) {
    throw coordinationConsumerRuntimeError(
      "COORDINATION_CONSUMER_RUNTIME_PROFILE_UNSUPPORTED",
      "no reviewed production store-ownership profile is available",
    );
  }
  const store = mainStoreRecords.get(record.mainStore);
  if (!store) throw invalidProvision();
  return Object.freeze({
    ...store,
    client: record.client,
    lineage: record.lineage,
    lifecycle: record.lifecycle,
    ownerFaults: record.ownerFaults,
    acquireAckRecovery: record.acquireAckRecovery,
    mainStore: record.mainStore,
  });
}

export function resolveCoordinationConsumerRuntimeProvision(provision) {
  const inspected = inspectCoordinationConsumerRuntimeProvision(provision);
  const record = provisionRecords.get(provision);
  const admission = managedClientRuntimeAdmission(
    record.lineage,
    record.permit,
  );
  // MUTATION_GUARD: configured-store-capability
  if (
    admission.store !== record.mainStore
    || admission.client !== record.client
  ) {
    throw invalidProvision();
  }
  return Object.freeze({
    ...inspected,
    scopeId: admission.scopeId,
    participantId: admission.participantId,
  });
}

export function bindCoordinationConsumerRuntimeRetirement(
  provision,
  retire,
) {
  const record = provisionRecords.get(provision);
  if (!record) throw invalidProvision();
  bindManagedClientRuntimeRetirement(
    record.lineage,
    record.permit,
    retire,
  );
}

export function invokeCoordinationConsumerRuntimeOperation(
  provision,
  operation,
  input,
  options,
) {
  const record = provisionRecords.get(provision);
  if (!record) throw invalidProvision();
  return invokeManagedClientRuntimeOperation(
    record.lineage,
    record.permit,
    operation,
    input,
    options,
  );
}

export function probeCoordinationConsumerRuntimePermit(provision) {
  const record = provisionRecords.get(provision);
  if (!record) return Object.freeze({ status: "invalid" });
  return probeManagedClientRuntimePermit(record.lineage, record.permit);
}

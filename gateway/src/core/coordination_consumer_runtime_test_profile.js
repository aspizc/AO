import { fork } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

import {
  assertManagedClientLineageAssignable,
  assignManagedClientLineageStore,
  captureManagedClientRuntimePermit,
  managedClientLineage,
  managedClientLineageReady,
  registerManagedClientLineage,
} from "./coordination_consumer_lineage.js";
import {
  issueCoordinationConsumerRuntimeProvision,
  probeCoordinationConsumerRuntimePermit,
  resolveCoordinationConsumerRuntimeProvision,
  sealSqliteMainStore,
} from "./coordination_consumer_runtime_provision.js";
import {
  coordinationConsumerRuntimeError,
} from "./coordination_consumer_runtime_error.js";
import {
  assertSqliteCoordinationRepositoryMainBinding,
} from "./sqlite_coordination_repository_binding.js";
import {
  createSqliteCoordinationConsumerOwner,
} from "./sqlite_coordination_consumer_owner.js";
import {
  WIRING_A_SQLITE,
  applySqliteMigrationSet,
} from "./sqlite_migration_sets.js";

export {
  createSqliteRedisDisposableEpochTestProfile,
} from "./coordination_consumer_epoch_store_binding_test_profile.js";

const PROFILE_NAME = "sqlite-disposable-local-test-v1";
const WORKER = fileURLToPath(
  new URL("./coordination_consumer_runtime_test_worker.js", import.meta.url),
);

function profileError() {
  return coordinationConsumerRuntimeError(
    "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID",
    "SQLite runtime test profile origin is invalid",
  );
}

function storeMismatch() {
  return coordinationConsumerRuntimeError(
    "COORDINATION_CONSUMER_RUNTIME_STORE_MISMATCH",
    "coordination consumer repository must use the provisioned SQLite main store",
  );
}

function unsupportedProfile() {
  return coordinationConsumerRuntimeError(
    "COORDINATION_CONSUMER_RUNTIME_PROFILE_UNSUPPORTED",
    "SQLite store origin is not supported by a reviewed deployment profile",
  );
}

function assertSqliteShape(database) {
  // MUTATION_GUARD: postgresql-exclusion
  if (
    database?.backend === "postgres"
    || (
      database?.backend !== undefined
      && database.backend !== "sqlite"
    )
    || typeof database?.prepare !== "function"
    || typeof database?.transaction !== "function"
    || typeof database?.pragma !== "function"
  ) {
    throw new TypeError(
      "SQLite backend is required; PostgreSQL is deferred to Project V5 I/0/05",
    );
  }
  // MUTATION_GUARD: in-memory-exclusion
  if (database.memory !== false) throw unsupportedProfile();
}

function applyPendingMigrations(database) {
  applySqliteMigrationSet(database, WIRING_A_SQLITE);
}

function workerProcess(mode, filename, scopeId = "") {
  return fork(WORKER, [mode, filename, scopeId], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
}

function workerExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0 || (code === null && signal === null)) {
        resolve();
      } else {
        reject(new Error(
          `ownership worker exited with code ${code} and signal ${signal}`,
        ));
      }
    });
  });
}

function firstWorkerMessage(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("message", resolve);
  });
}

export function createSqliteDisposableRuntimeProfile() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "g002-sqlite-profile-"),
  );
  const profileInstance = Object.freeze({ name: PROFILE_NAME });
  const origins = new WeakMap();
  const originCapabilities = new WeakMap();
  const ownerAdapters = new WeakMap();
  const profileProvisions = new WeakMap();
  const openDatabases = new Set();
  const liveWorkers = new Set();
  let nextStore = 1;
  let disposed = false;

  function assertActive() {
    if (disposed) throw profileError();
  }

  function resolveOrigin(storeOrigin) {
    const origin = origins.get(storeOrigin);
    if (!origin || origin.profileInstance !== profileInstance) {
      throw profileError();
    }
    return origin;
  }

  function issueHandle(origin) {
    assertActive();
    const database = new Database(origin.filename);
    database.backend = "sqlite";
    database.pragma("foreign_keys = ON");
    database.pragma("busy_timeout = 10000");
    openDatabases.add(database);
    const originCapability = Object.freeze({});
    const originRecord = {
      profileInstance,
      origin,
      database,
      revoked: false,
    };
    // MUTATION_GUARD: origin-capability-binds-exact-handle
    originCapabilities.set(originCapability, originRecord);
    return Object.freeze({
      database,
      originCapability,
      storeOrigin: origin.capability,
    });
  }

  function issueValidatedHandle(origin) {
    const pair = issueHandle(origin);
    try {
      applyPendingMigrations(pair.database);
      return pair;
    } catch (error) {
      const record = originCapabilities.get(pair.originCapability);
      if (record) record.revoked = true;
      openDatabases.delete(pair.database);
      pair.database.close();
      throw error;
    }
  }

  function createOrigin(filename) {
    const capability = Object.freeze({});
    const origin = {
      capability,
      filename,
      profileInstance,
      primaryDatabase: null,
    };
    origins.set(capability, origin);
    return origin;
  }

  function createStore() {
    assertActive();
    // MUTATION_GUARD: origin-issuer-owns-open
    const filename = path.join(root, `store-${nextStore}.sqlite`);
    nextStore += 1;
    const origin = createOrigin(filename);
    const pair = issueValidatedHandle(origin);
    origin.primaryDatabase = pair.database;
    return pair;
  }

  function openHandle(storeOrigin) {
    return issueValidatedHandle(resolveOrigin(storeOrigin));
  }

  function resolvePair({ database, originCapability } = {}) {
    assertSqliteShape(database);
    const record = originCapabilities.get(originCapability);
    // MUTATION_GUARD: origin-capability-integrity
    if (
      !record
      || record.profileInstance !== profileInstance
      || record.database !== database
      || record.revoked
      || origins.get(record.origin.capability) !== record.origin
    ) {
      throw profileError();
    }
    return record;
  }

  function owner(pair) {
    const record = resolvePair(pair);
    let adapter = ownerAdapters.get(record.database);
    if (adapter === undefined) {
      adapter = createSqliteCoordinationConsumerOwner(record.database);
      ownerAdapters.set(record.database, adapter);
    }
    return adapter;
  }

  function ensureLineage(coordinationClient) {
    const lineage = managedClientLineage(coordinationClient);
    if (lineage === undefined) {
      throw profileError();
    }
    return lineage;
  }

  function admitTestManagedClient(coordinationClient) {
    let lineage = managedClientLineage(coordinationClient);
    if (lineage !== undefined) return lineage;
    const status = coordinationClient?.getStatus?.();
    lineage = registerManagedClientLineage(coordinationClient, {
      configuredScopeId: status?.scopeId,
    });
    if (status?.state === "ready") {
      managedClientLineageReady(coordinationClient, status);
    }
    return lineage;
  }

  function provisionRuntime({
    database,
    originCapability,
    repository,
    coordinationClient,
    lifecycle,
    ownerFaults,
    acquireAckRecovery,
  } = {}) {
    resolvePair({ database, originCapability });
    const lineage = ensureLineage(coordinationClient);
    // Reject a re-pairing before schema or owner SQL touches the offered store.
    assertManagedClientLineageAssignable(lineage);
    // MUTATION_GUARD: sealed-same-main-repository
    if (
      !assertSqliteCoordinationRepositoryMainBinding(repository, database)
    ) {
      throw storeMismatch();
    }
    const ownerAdapter = owner({
      database,
      originCapability,
    });
    const mainStore = sealSqliteMainStore({
      database,
      repository,
      owner: ownerAdapter,
    });
    assignManagedClientLineageStore(lineage, mainStore);
    const permit = captureManagedClientRuntimePermit(lineage);
    const provision = issueCoordinationConsumerRuntimeProvision({
      mainStore,
      lineage,
      permit,
      client: coordinationClient,
      lifecycle,
      ownerFaults,
      acquireAckRecovery,
    });
    profileProvisions.set(provision, Object.freeze({
      mainStore,
      lineage,
      permit,
      client: coordinationClient,
      acquireAckRecovery,
    }));
    return provision;
  }

  function provisionSuccessorRuntime({
    predecessorProvision,
    lifecycle,
    ownerFaults,
    acquireAckRecovery,
  } = {}) {
    const source = profileProvisions.get(predecessorProvision);
    if (!source) throw profileError();
    const permit = captureManagedClientRuntimePermit(source.lineage);
    const provision = issueCoordinationConsumerRuntimeProvision({
      mainStore: source.mainStore,
      lineage: source.lineage,
      permit,
      client: source.client,
      lifecycle,
      ownerFaults,
      acquireAckRecovery,
    });
    profileProvisions.set(provision, Object.freeze({
      mainStore: source.mainStore,
      lineage: source.lineage,
      permit,
      client: source.client,
      acquireAckRecovery,
    }));
    return provision;
  }

  function probeConfiguredStoreSubstitution({
    provision,
    database,
    originCapability,
    repository,
  } = {}) {
    const source = profileProvisions.get(provision);
    if (!source) throw profileError();
    resolvePair({ database, originCapability });
    if (
      !assertSqliteCoordinationRepositoryMainBinding(repository, database)
    ) {
      throw storeMismatch();
    }
    const substitutedStore = sealSqliteMainStore({
      database,
      repository,
      owner: owner({ database, originCapability }),
    });
    const substituted = issueCoordinationConsumerRuntimeProvision({
      mainStore: substitutedStore,
      lineage: source.lineage,
      permit: source.permit,
      client: source.client,
      acquireAckRecovery: source.acquireAckRecovery,
    });
    try {
      resolveCoordinationConsumerRuntimeProvision(substituted);
      return Object.freeze({ status: "admitted" });
    } catch (error) {
      return Object.freeze({
        status: "rejected",
        code: error?.code,
      });
    }
  }

  function revoke(originCapability) {
    const record = originCapabilities.get(originCapability);
    if (!record || record.profileInstance !== profileInstance) {
      throw profileError();
    }
    record.revoked = true;
  }

  function probeUnsupportedBackend(database) {
    assertSqliteShape(database);
    throw unsupportedProfile();
  }

  async function contendInIndependentProcesses(
    storeOrigin,
    { count, scopeId },
  ) {
    const origin = resolveOrigin(storeOrigin);
    const entries = Array.from({ length: count }, () => {
      const child = workerProcess("contend", origin.filename, scopeId);
      liveWorkers.add(child);
      const ready = firstWorkerMessage(child);
      const result = new Promise((resolve, reject) => {
        child.on("error", reject);
        child.on("message", (message) => {
          if (message?.status !== "ready") resolve(message);
        });
      });
      const exit = workerExit(child).finally(() => {
        liveWorkers.delete(child);
      });
      return { child, ready, result, exit };
    });
    await Promise.all(entries.map(({ ready }) => ready));
    for (const { child } of entries) child.send("go");
    const results = await Promise.all(entries.map(({ result }) => result));
    await Promise.all(entries.map(({ exit }) => exit));
    return results;
  }

  async function startOrdinaryReader(storeOrigin) {
    const origin = resolveOrigin(storeOrigin);
    const child = workerProcess("reader", origin.filename);
    liveWorkers.add(child);
    const ready = await firstWorkerMessage(child);
    if (ready?.status !== "ready") {
      throw new Error("ordinary reader failed to become ready");
    }
    const exit = workerExit(child).finally(() => {
      liveWorkers.delete(child);
    });
    let stopFlight = null;
    return Object.freeze({
      stop() {
        if (stopFlight === null) {
          stopFlight = Promise.resolve().then(async () => {
            if (child.connected) child.send("stop");
            await exit;
          });
        }
        return stopFlight;
      },
    });
  }

  async function claimAndExit(storeOrigin, { scopeId }) {
    const origin = resolveOrigin(storeOrigin);
    const child = workerProcess("claim-exit", origin.filename, scopeId);
    liveWorkers.add(child);
    const result = await firstWorkerMessage(child);
    await workerExit(child).finally(() => {
      liveWorkers.delete(child);
    });
    if (result?.status === "error") {
      throw new Error(`claim worker failed: ${result.code}`);
    }
    return result;
  }

  async function copyStore(storeOrigin) {
    const source = resolveOrigin(storeOrigin);
    const filename = path.join(root, `store-${nextStore}.sqlite`);
    nextStore += 1;
    let database = source.primaryDatabase;
    let closeSource = false;
    if (!database?.open) {
      database = new Database(source.filename, { readonly: true });
      closeSource = true;
    }
    try {
      await database.backup(filename);
    } finally {
      if (closeSource) database.close();
    }
    const copiedOrigin = createOrigin(filename);
    const pair = issueValidatedHandle(copiedOrigin);
    copiedOrigin.primaryDatabase = pair.database;
    return pair;
  }

  async function dispose() {
    if (disposed) return;
    disposed = true;
    for (const child of liveWorkers) {
      if (child.connected) child.send("stop");
    }
    for (const database of openDatabases) {
      if (database.open) database.close();
    }
    fs.rmSync(root, { recursive: true, force: true });
  }

  return Object.freeze({
    createStore,
    openHandle,
    owner,
    admitTestManagedClient,
    provisionRuntime,
    provisionSuccessorRuntime,
    probeConfiguredStoreSubstitution,
    revoke,
    probeUnsupportedBackend,
    contendInIndependentProcesses,
    startOrdinaryReader,
    claimAndExit,
    copyStore,
    probeRuntimePermit: probeCoordinationConsumerRuntimePermit,
    dispose,
  });
}

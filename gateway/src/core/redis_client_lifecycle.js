function positiveSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return value;
}

function assertFunction(value, label) {
  if (typeof value !== "function") {
    throw new TypeError(`${label} must be a function`);
  }
  return value;
}

function safeObserve(observer, error) {
  try {
    observer(error);
  } catch {
    // Observability cannot alter transport semantics.
  }
}

function abortError() {
  return Object.assign(new Error("Redis operation aborted"), {
    name: "AbortError",
  });
}

function removeListener(client, event, listener) {
  try {
    if (typeof client?.off === "function") {
      client.off(event, listener);
    } else {
      client?.removeListener?.(event, listener);
    }
  } catch {
    // Listener cleanup remains best effort after transport failure.
  }
}

const redisClientLaneAuthorities = new WeakMap();

export class RedisClientLane {
  #active = new Set();

  #closePromise = null;

  #connection = null;

  #connectionGeneration = 0;

  #connectPromise = null;

  #epoch = 0;

  #idleWaiters = new Set();

  #pending = [];

  #state = "idle";

  constructor({
    kind,
    clientFactory,
    clientOptions,
    concurrency,
    queueLimit,
    shutdownTimeoutMs,
    unavailable,
    onError = () => {},
  }) {
    if (kind !== "command" && kind !== "blocking") {
      throw new TypeError("kind must be command or blocking");
    }
    this.kind = kind;
    this.clientFactory = assertFunction(clientFactory, "clientFactory");
    this.clientOptions = structuredClone(clientOptions);
    this.concurrency = positiveSafeInteger(concurrency, "concurrency");
    this.queueLimit = positiveSafeInteger(queueLimit, "queueLimit");
    this.shutdownTimeoutMs = positiveSafeInteger(
      shutdownTimeoutMs,
      "shutdownTimeoutMs",
    );
    this.unavailable = assertFunction(unavailable, "unavailable");
    this.onError = assertFunction(onError, "onError");
    redisClientLaneAuthorities.set(this, Object.freeze({
      close: () => this.#close(),
      execute: (operation, options) => this.#execute(operation, options),
      snapshot: () => this.#snapshot(),
    }));
  }

  snapshot() {
    return this.#snapshot();
  }

  #snapshot() {
    return {
      state: this.#state,
      active: this.#active.size,
      queued: this.#pending.length,
      capacity: this.concurrency,
      queueLimit: this.queueLimit,
    };
  }

  execute(operation, options) {
    return this.#execute(operation, options);
  }

  #execute(operation, { signal } = {}) {
    assertFunction(operation, "operation");
    if (this.#state === "closing" || this.#state === "closed") {
      return Promise.reject(this.unavailable());
    }
    if (this.#active.size >= this.concurrency) {
      if (this.#pending.length >= this.queueLimit) {
        return Promise.reject(this.unavailable());
      }
      return new Promise((resolve, reject) => {
        const entry = {
          epoch: this.#epoch,
          operation,
          resolve,
          reject,
          signal,
          onAbort: null,
        };
        const onAbort = () => {
          const index = this.#pending.indexOf(entry);
          // MUTATION_GUARD: atomically-remove-aborted-queued-operation
          if (index === -1) return;
          this.#pending.splice(index, 1);
          const rejectQueued = entry.reject;
          this.#clearPendingEntry(entry);
          rejectQueued(abortError());
        };
        entry.onAbort = onAbort;
        this.#pending.push(entry);
        // MUTATION_GUARD: register-queued-operation-abort
        signal?.addEventListener("abort", onAbort, { once: true });
        // MUTATION_GUARD: reject-pre-aborted-queued-operation
        if (signal?.aborted) onAbort();
      });
    }
    return this.#start(operation, this.#epoch, signal);
  }

  invalidate() {
    this.#invalidateConnection(this.#connection);
  }

  close() {
    return this.#close();
  }

  #close() {
    if (this.#closePromise) return this.#closePromise;
    this.#state = "closing";
    const queued = this.#pending.splice(0);
    for (const entry of queued) {
      const reject = entry.reject;
      // MUTATION_GUARD: close-clears-queued-abort-listener
      this.#clearPendingEntry(entry);
      reject(this.unavailable());
    }

    this.#closePromise = this.#finishClose();
    return this.#closePromise;
  }

  async #finishClose() {
    if (this.#active.size > 0) {
      let timer;
      await Promise.race([
        new Promise((resolve) => {
          this.#idleWaiters.add(resolve);
        }),
        new Promise((resolve) => {
          timer = setTimeout(() => {
            this.#applyShutdownFence();
            resolve();
          }, this.shutdownTimeoutMs);
        }),
      ]);
      if (timer) clearTimeout(timer);
    }

    this.#applyShutdownFence();
    return { status: "closed" };
  }

  #applyShutdownFence() {
    if (this.#state === "closed") return;
    this.#epoch += 1;
    this.#state = "closed";
    this.#cancelActive();
    this.#invalidateConnection(this.#connection);
  }

  #start(operation, epoch = this.#epoch, signal) {
    let resolveCaller;
    let rejectCaller;
    const caller = new Promise((resolve, reject) => {
      resolveCaller = resolve;
      rejectCaller = reject;
    });
    const entry = {
      epoch,
      resolve: resolveCaller,
      reject: rejectCaller,
    };
    this.#active.add(entry);

    const observed = this.#run(operation, signal).then(
      (value) => this.#settleActive(entry, { status: "fulfilled", value }),
      (reason) => this.#settleActive(entry, { status: "rejected", reason }),
    );
    observed.catch((err) => safeObserve(this.onError, err));
    return caller;
  }

  async #run(operation, signal) {
    let connection = null;
    const onAbort = () => {
      this.#invalidateConnection(connection ?? this.#connection);
    };
    // MUTATION_GUARD: abort-active-operation
    signal?.addEventListener("abort", onAbort);
    try {
      if (signal?.aborted) {
        onAbort();
        throw abortError();
      }
      connection = await this.#ensureConnection();
      if (signal?.aborted) {
        onAbort();
        throw abortError();
      }
      const result = await operation(connection.client);
      if (signal?.aborted) throw abortError();
      return result;
    } catch (err) {
      if (connection !== null) this.#invalidateConnection(connection);
      if (signal?.aborted) throw abortError();
      throw err;
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
  }

  #drain() {
    if (this.#state === "closing" || this.#state === "closed") return;
    while (
      this.#active.size < this.concurrency
      && this.#pending.length > 0
    ) {
      const entry = this.#pending.shift();
      const {
        epoch,
        operation,
        resolve,
        reject,
        signal,
      } = entry;
      // MUTATION_GUARD: drain-clears-queued-abort-listener
      this.#clearPendingEntry(entry);
      if (epoch !== this.#epoch) {
        reject(this.unavailable());
      } else {
        this.#start(operation, epoch, signal).then(
          resolve,
          reject,
        );
      }
    }
  }

  #clearPendingEntry(entry) {
    // MUTATION_GUARD: queued-abort-listener-cleanup
    entry.signal?.removeEventListener("abort", entry.onAbort);
    entry.operation = null;
    entry.resolve = null;
    entry.reject = null;
    entry.signal = null;
    entry.onAbort = null;
  }

  #settleActive(entry, outcome) {
    if (!this.#active.delete(entry)) return;
    const resolve = entry.resolve;
    const reject = entry.reject;
    entry.resolve = null;
    entry.reject = null;

    if (entry.epoch !== this.#epoch || this.#state === "closed") {
      reject(this.unavailable());
    } else if (outcome.status === "fulfilled") {
      resolve(outcome.value);
    } else {
      reject(outcome.reason);
    }
    this.#notifyIdle();
    this.#drain();
  }

  #cancelActive() {
    const active = [...this.#active];
    this.#active.clear();
    for (const entry of active) {
      const reject = entry.reject;
      entry.resolve = null;
      entry.reject = null;
      reject(this.unavailable());
    }
    this.#notifyIdle();
  }

  #notifyIdle() {
    if (this.#active.size !== 0) return;
    for (const resolve of this.#idleWaiters) resolve();
    this.#idleWaiters.clear();
  }

  #ensureConnection() {
    if (this.#state === "closing" || this.#state === "closed") {
      return Promise.reject(this.unavailable());
    }
    if (this.#connectPromise) return this.#connectPromise;
    if (this.#state === "ready" && this.#connection) {
      return Promise.resolve(this.#connection);
    }
    if (this.#connection) {
      this.#invalidateConnection(this.#connection);
    }

    let client;
    try {
      client = this.clientFactory(
        structuredClone(this.clientOptions),
        Object.freeze({ kind: this.kind }),
      );
      if (
        !client
        || typeof client !== "object"
        || typeof client.connect !== "function"
        || typeof client.sendCommand !== "function"
        || typeof client.destroy !== "function"
      ) {
        throw new TypeError("clientFactory must return a Redis client");
      }
    } catch (err) {
      safeObserve(this.onError, err);
      return Promise.reject(err);
    }

    let connection;
    const onClientError = (err) => {
      safeObserve(this.onError, err);
      this.#invalidateConnection(connection);
    };
    const alreadyReady = client.isReady === true || (
      typeof client.isReady !== "boolean"
      && client.isOpen === true
    );
    connection = {
      client,
      destroyAttempts: new Set(),
      generation: this.#connectionGeneration + 1,
      listener: onClientError,
      phase: alreadyReady ? "ready" : "connecting",
    };
    this.#connectionGeneration = connection.generation;
    client.on?.("error", onClientError);
    this.#connection = connection;
    this.#state = "connecting";

    let connecting;
    connecting = Promise.resolve().then(async () => {
      try {
        if (!alreadyReady) await client.connect();
        connection.phase = "ready";
        if (
          this.#state === "closing"
          || this.#state === "closed"
          || this.#connection !== connection
        ) {
          this.#destroyConnection(connection);
          throw this.unavailable();
        }
        this.#state = "ready";
        return connection;
      } catch (err) {
        this.#invalidateConnection(connection);
        throw err;
      } finally {
        if (this.#connectPromise === connecting) {
          this.#connectPromise = null;
        }
      }
    });
    this.#connectPromise = connecting;
    return connecting;
  }

  #invalidateConnection(connection) {
    if (!connection) return;
    if (this.#connection === connection) {
      this.#connection = null;
      // The in-flight promise keeps this generation authoritative until its
      // handshake settles and performs any required late-phase cleanup.
      if (this.#state !== "closing" && this.#state !== "closed") {
        this.#state = "idle";
      }
    }
    this.#destroyConnection(connection);
  }

  #destroyConnection(connection) {
    if (!connection) return;
    removeListener(
      connection.client,
      "error",
      connection.listener,
    );
    const attempt = `${connection.generation}:${connection.phase}`;
    if (connection.destroyAttempts.has(attempt)) return;
    connection.destroyAttempts.add(attempt);
    try {
      connection.client.destroy();
    } catch {
      // An owned failed client is already unusable.
    }
  }
}

function redisClientLaneAuthority(lane) {
  const authority = redisClientLaneAuthorities.get(lane);
  if (!authority) {
    throw new TypeError("lane must be a RedisClientLane");
  }
  return authority;
}

export function closeRedisClientLane(lane) {
  return redisClientLaneAuthority(lane).close();
}

export function executeRedisClientLane(lane, operation, options) {
  return redisClientLaneAuthority(lane).execute(operation, options);
}

export function snapshotRedisClientLane(lane) {
  return redisClientLaneAuthority(lane).snapshot();
}

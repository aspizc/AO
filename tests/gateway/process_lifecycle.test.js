import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import {
  createProcessTermination,
} from "../../gateway/src/core/process_lifecycle.js";

test("process termination resolves once and removes stdin and signal listeners", async () => {
  const input = new EventEmitter();
  const signals = new EventEmitter();
  const termination = createProcessTermination({ input, signals });

  assert.equal(input.listenerCount("end"), 1);
  assert.equal(signals.listenerCount("SIGINT"), 1);
  assert.equal(signals.listenerCount("SIGTERM"), 1);

  signals.emit("SIGTERM");
  input.emit("end");
  assert.deepEqual(await termination.wait, {
    reason: "signal",
    signal: "SIGTERM",
  });
  termination.dispose();

  assert.equal(input.listenerCount("end"), 0);
  assert.equal(signals.listenerCount("SIGINT"), 0);
  assert.equal(signals.listenerCount("SIGTERM"), 0);
});

test("stdin end is a clean termination and dispose is idempotent", async () => {
  const input = new EventEmitter();
  const signals = new EventEmitter();
  const termination = createProcessTermination({ input, signals });

  input.emit("end");
  assert.deepEqual(await termination.wait, { reason: "stdin-end" });
  termination.dispose();
  termination.dispose();

  assert.equal(input.listenerCount("end"), 0);
  assert.equal(signals.listenerCount("SIGINT"), 0);
  assert.equal(signals.listenerCount("SIGTERM"), 0);
});

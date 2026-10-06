import Database from "better-sqlite3";

import {
  createSqliteCoordinationConsumerOwner,
} from "./sqlite_coordination_consumer_owner.js";

const [, , mode, filename, scopeId] = process.argv;
const database = new Database(filename);
database.backend = "sqlite";
database.pragma("busy_timeout = 10000");

function send(value) {
  if (typeof process.send === "function") process.send(value);
}

function closeAndDisconnect() {
  if (database.open) database.close();
  if (process.connected) process.disconnect();
}

function claim() {
  try {
    const result = createSqliteCoordinationConsumerOwner(database)
      .claim(scopeId);
    send(result);
  } catch (error) {
    send({
      status: "error",
      code: error?.code ?? "UNKNOWN",
    });
  } finally {
    closeAndDisconnect();
  }
}

if (mode === "contend") {
  process.once("message", (message) => {
    if (message === "go") claim();
  });
  send({ status: "ready" });
} else if (mode === "claim-exit") {
  claim();
} else if (mode === "reader") {
  let active = true;
  process.once("message", (message) => {
    if (message === "stop") active = false;
  });
  const read = database.prepare("SELECT value FROM main.marker");
  const step = () => {
    if (!active) {
      closeAndDisconnect();
      return;
    }
    read.get();
    setImmediate(step);
  };
  send({ status: "ready" });
  setImmediate(step);
} else {
  send({ status: "error", code: "WORKER_MODE_INVALID" });
  closeAndDisconnect();
}

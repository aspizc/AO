import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import * as messageRepo from "../../gateway/src/core/repositories/message_repo.js";

function fresh() {
  resetState();
  initState({ stateDb: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "message-repo-")), "state.db") });
}

function createMessage(overrides = {}) {
  return messageRepo.createMessage({
    messageId: overrides.messageId || "msg-1",
    traceId: overrides.traceId || "tr-1",
    fromId: overrides.fromId || "orchestrator",
    toId: overrides.toId || "session-1",
    body: overrides.body || "status?",
    createdAt: overrides.createdAt || "2026-01-01T00:00:00.000Z",
  });
}

test("create message returns stored row", () => {
  fresh();

  const created = createMessage();
  const stored = messageRepo.getMessageById(created.messageId);

  assert.equal(stored.message_id, "msg-1");
  assert.equal(stored.trace_id, "tr-1");
  assert.equal(stored.body, "status?");
});

test("list messages by trace is scoped and ordered", () => {
  fresh();
  createMessage({ messageId: "msg-2", traceId: "tr-1", createdAt: "2026-01-01T00:00:02.000Z" });
  createMessage({ messageId: "msg-1", traceId: "tr-1", createdAt: "2026-01-01T00:00:01.000Z" });
  createMessage({ messageId: "msg-3", traceId: "tr-2", createdAt: "2026-01-01T00:00:00.000Z" });

  const messages = messageRepo.listMessagesByTrace("tr-1");

  assert.deepEqual(
    messages.map((row) => row.message_id),
    ["msg-1", "msg-2"],
  );
});

test("get message scoped to trace prevents cross-trace reads", () => {
  fresh();
  createMessage({ messageId: "msg-1", traceId: "tr-1" });

  assert.equal(messageRepo.getMessageScopedToTrace("msg-1", "tr-1").message_id, "msg-1");
  assert.equal(messageRepo.getMessageScopedToTrace("msg-1", "tr-2"), null);
});

test("message repository is append-only", () => {
  assert.equal(typeof messageRepo.updateMessage, "undefined");
  assert.equal(typeof messageRepo.deleteMessage, "undefined");
});

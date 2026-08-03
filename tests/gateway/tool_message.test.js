import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { createTraceAccessToken } from "../../gateway/src/core/trace_access.js";
import { buildMessageTools } from "../../gateway/src/tools/message.js";

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "tool-message-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
}

function messageTools() {
  return Object.fromEntries(buildMessageTools().map((tool) => [tool.name, tool]));
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

test("legacy message validation envelopes remain byte-compatible with the base", async (t) => {
  const tools = messageTools();
  const cases = [
    [
      "message.send",
      {},
      [
        { path: "traceId", message: "Required", code: "invalid_type" },
        { path: "accessToken", message: "Required", code: "invalid_type" },
        { path: "fromId", message: "Required", code: "invalid_type" },
        { path: "toId", message: "Required", code: "invalid_type" },
        { path: "body", message: "Required", code: "invalid_type" },
      ],
    ],
    [
      "message.list",
      { traceId: 7, accessToken: null },
      [
        {
          path: "traceId",
          message: "Expected string, received number",
          code: "invalid_type",
        },
        {
          path: "accessToken",
          message: "Expected string, received null",
          code: "invalid_type",
        },
      ],
    ],
    [
      "message.reply",
      { traceId: "tr", accessToken: "token" },
      [
        { path: "parentMessageId", message: "Required", code: "invalid_type" },
        { path: "fromId", message: "Required", code: "invalid_type" },
        { path: "toId", message: "Required", code: "invalid_type" },
        { path: "body", message: "Required", code: "invalid_type" },
      ],
    ],
  ];

  for (const [name, args, issues] of cases) {
    await t.test(name, async () => {
      const body = { error: "INVALID_INPUT", issues };
      const result = await tools[name].handler(args);
      assert.deepEqual(result, {
        content: [{ type: "text", text: JSON.stringify(body) }],
        isError: true,
      });
    });
  }
});

test("message tools send, list, reply, and enforce trace scope", async () => {
  fresh();
  const config = { messageAccessSecret: "tool-message-secret" };
  const tools = Object.fromEntries(buildMessageTools({ config }).map((tool) => [tool.name, tool]));
  const tokenFor = (traceId) => createTraceAccessToken(traceId, config);

  const sent = parseToolResult(
    await tools["message.send"].handler({
      traceId: "tr-message-send",
      accessToken: tokenFor("tr-message-send"),
      fromId: "orchestrator",
      toId: "coder",
      body: "please implement this task",
    }),
  );
  const events = await query({ traceId: "tr-message-send", type: "MESSAGE_SENT" });

  assert.match(sent.messageId, /^msg-/);
  assert.equal(sent.traceId, "tr-message-send");
  assert.equal(sent.fromId, "orchestrator");
  assert.equal(sent.toId, "coder");
  assert.equal(sent.body, "please implement this task");
  assert.equal(events.length, 1);
  assert.equal(events[0].messageId, sent.messageId);

  const first = parseToolResult(
    await tools["message.send"].handler({
      traceId: "tr-message-list",
      accessToken: tokenFor("tr-message-list"),
      fromId: "orchestrator",
      toId: "coder",
      body: "first",
    }),
  );
  await tools["message.send"].handler({
    traceId: "tr-other-message-list",
    accessToken: tokenFor("tr-other-message-list"),
    fromId: "orchestrator",
    toId: "reviewer",
    body: "other trace",
  });
  const second = parseToolResult(
    await tools["message.send"].handler({
      traceId: "tr-message-list",
      accessToken: tokenFor("tr-message-list"),
      fromId: "coder",
      toId: "orchestrator",
      body: "second",
    }),
  );

  const messages = parseToolResult(
    await tools["message.list"].handler({
      traceId: "tr-message-list",
      accessToken: tokenFor("tr-message-list"),
    }),
  );

  assert.deepEqual(
    messages.map((message) => message.messageId),
    [first.messageId, second.messageId],
  );
  assert.ok(messages.every((message) => message.traceId === "tr-message-list"));

  const parent = parseToolResult(
    await tools["message.send"].handler({
      traceId: "tr-message-reply",
      accessToken: tokenFor("tr-message-reply"),
      fromId: "orchestrator",
      toId: "coder",
      body: "parent",
    }),
  );

  const reply = parseToolResult(
    await tools["message.reply"].handler({
      traceId: "tr-message-reply",
      accessToken: tokenFor("tr-message-reply"),
      parentMessageId: parent.messageId,
      fromId: "coder",
      toId: "orchestrator",
      body: "reply",
    }),
  );
  const crossTraceResult = await tools["message.reply"].handler({
      traceId: "tr-other-message-reply",
      accessToken: tokenFor("tr-other-message-reply"),
      parentMessageId: parent.messageId,
      fromId: "reviewer",
      toId: "orchestrator",
      body: "should not attach",
    });
  const crossTrace = parseToolResult(crossTraceResult);
  const otherTraceMessages = parseToolResult(
    await tools["message.list"].handler({
      traceId: "tr-other-message-reply",
      accessToken: tokenFor("tr-other-message-reply"),
    }),
  );
  const crossTraceListResult = await tools["message.list"].handler({
      traceId: "tr-message-reply",
      accessToken: tokenFor("tr-other-message-reply"),
    });
  const crossTraceList = parseToolResult(crossTraceListResult);
  const forgedListResult = await tools["message.list"].handler({
      traceId: "tr-message-reply",
      accessToken: "not-a-valid-token",
    });
  const forgedList = parseToolResult(forgedListResult);
  const forgedSendResult = await tools["message.send"].handler({
      traceId: "tr-message-reply",
      accessToken: tokenFor("tr-other-message-reply"),
      fromId: "attacker",
      toId: "orchestrator",
      body: "inject",
    });
  const forgedSend = parseToolResult(forgedSendResult);

  assert.match(reply.messageId, /^msg-/);
  assert.equal(reply.parentMessageId, parent.messageId);
  assert.equal(reply.traceId, "tr-message-reply");
  assert.deepEqual(crossTrace, { error: "PARENT_NOT_FOUND" });
  assert.deepEqual(crossTraceList, { error: "TRACE_ACCESS_DENIED" });
  assert.deepEqual(forgedList, { error: "TRACE_ACCESS_DENIED" });
  assert.deepEqual(forgedSend, { error: "TRACE_ACCESS_DENIED" });
  for (const result of [
    crossTraceResult,
    crossTraceListResult,
    forgedListResult,
    forgedSendResult,
  ]) {
    assert.equal(result.isError, undefined);
  }
  assert.deepEqual(otherTraceMessages, []);
});

test("legacy message schemas keep stripping unknown fields and exact payload errors", async () => {
  fresh();
  const config = { messageAccessSecret: "tool-message-compat-secret" };
  const tools = Object.fromEntries(
    buildMessageTools({ config }).map((tool) => [tool.name, tool]),
  );
  const token = createTraceAccessToken("tr-message-compat", config);

  const sentResult = await tools["message.send"].handler({
    traceId: "tr-message-compat",
    accessToken: token,
    fromId: "orchestrator",
    toId: "reviewer",
    body: "compatibility probe",
    ignoredLegacyField: "strip-me",
  });
  const sent = parseToolResult(sentResult);
  assert.equal(sentResult.isError, undefined);
  assert.equal(Object.hasOwn(sent, "ignoredLegacyField"), false);

  const listedResult = await tools["message.list"].handler({
    traceId: "tr-message-compat",
    accessToken: token,
    ignoredLegacyField: "strip-me",
  });
  assert.equal(listedResult.isError, undefined);
  assert.deepEqual(
    parseToolResult(listedResult).map(({ messageId }) => messageId),
    [sent.messageId],
  );

  const denied = await tools["message.list"].handler({
    traceId: "tr-message-compat",
    accessToken: "not-a-valid-token",
    ignoredLegacyField: "strip-me",
  });
  assert.equal(denied.isError, undefined);
  assert.equal(
    denied.content[0].text,
    "{\"error\":\"TRACE_ACCESS_DENIED\"}",
  );

  const events = await query({
    traceId: "tr-message-compat",
    type: "MESSAGE_SENT",
  });
  assert.equal(events.length, 1);
  assert.equal(Object.hasOwn(events[0], "ignoredLegacyField"), false);
});

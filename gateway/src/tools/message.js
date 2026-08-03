import { append as auditAppend } from "../core/audit.js";
import { newMessageId } from "../core/ids.js";
import * as messageRepo from "../core/repositories/message_repo.js";
import { verifyTraceAccessToken } from "../core/trace_access.js";
import { defineTool, z } from "./tool_helpers.js";

function nowIso() {
  return new Date().toISOString();
}

function toToolMessage(row, extra = {}) {
  return {
    messageId: row.messageId ?? row.message_id,
    traceId: row.traceId ?? row.trace_id,
    fromId: row.fromId ?? row.from_id,
    toId: row.toId ?? row.to_id,
    body: row.body,
    createdAt: row.createdAt ?? row.created_at,
    ...extra,
  };
}

function createMessage({ traceId, fromId, toId, body, parentMessageId }) {
  const row = {
    messageId: newMessageId(),
    traceId,
    fromId,
    toId,
    body,
    createdAt: nowIso(),
  };

  messageRepo.createMessage(row);
  auditAppend({
    type: "MESSAGE_SENT",
    traceId,
    messageId: row.messageId,
    fromId,
    toId,
    ...(parentMessageId ? { parentMessageId } : {}),
  });

  return toToolMessage(row, parentMessageId ? { parentMessageId } : {});
}

function accessDenied() {
  return { error: "TRACE_ACCESS_DENIED" };
}

export function buildMessageTools({ config = {} } = {}) {
  return [
    defineTool({
      name: "message.send",
      description: "Send a message between participants of an orchestration trace.",
      schema: z.object({
        traceId: z.string(),
        accessToken: z.string(),
        fromId: z.string(),
        toId: z.string(),
        body: z.string(),
      }),
      handler: ({ accessToken, ...args }) => {
        if (!verifyTraceAccessToken(args.traceId, accessToken, config)) return accessDenied();

        return createMessage(args);
      },
    }),
    defineTool({
      name: "message.list",
      description: "List messages in a trace.",
      schema: z.object({
        traceId: z.string(),
        accessToken: z.string(),
      }),
      handler: ({ traceId, accessToken }) => {
        if (!verifyTraceAccessToken(traceId, accessToken, config)) return accessDenied();

        return messageRepo.listMessagesByTrace(traceId).map((message) => toToolMessage(message));
      },
    }),
    defineTool({
      name: "message.reply",
      description: "Reply to a message in the same trace.",
      schema: z.object({
        traceId: z.string(),
        accessToken: z.string(),
        parentMessageId: z.string(),
        fromId: z.string(),
        toId: z.string(),
        body: z.string(),
      }),
      handler: ({ traceId, accessToken, parentMessageId, fromId, toId, body }) => {
        if (!verifyTraceAccessToken(traceId, accessToken, config)) return accessDenied();

        const parent = messageRepo.getMessageScopedToTrace(parentMessageId, traceId);
        if (!parent) return { error: "PARENT_NOT_FOUND" };

        return createMessage({ traceId, fromId, toId, body, parentMessageId });
      },
    }),
  ];
}

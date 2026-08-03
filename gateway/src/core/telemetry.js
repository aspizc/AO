import crypto from "node:crypto";

import { newTraceId } from "./ids.js";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function nowIso() {
  return new Date().toISOString();
}

function shortString(value, max = 200) {
  if (value === null || value === undefined) return undefined;
  return String(value).slice(0, max);
}

function isEnabled(value) {
  return TRUE_VALUES.has(String(value || "").toLowerCase());
}

function safeSet(target, key, value) {
  const normalized = shortString(value);
  if (normalized !== undefined && normalized !== "") target[key] = normalized;
}

function findValue(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return undefined;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeTraceId(value) {
  const normalized = shortString(value, 256);
  return normalized || undefined;
}

export function traceIdFromCall(request, extra) {
  const args = objectValue(request?.params?.arguments);
  const paramsMeta = objectValue(request?.params?._meta);
  const extraMeta = objectValue(extra?._meta);
  const context = objectValue(args.context);
  const metadata = objectValue(args.metadata);

  return normalizeTraceId(
    findValue(
      args.traceId,
      args.trace_id,
      metadata.traceId,
      metadata.trace_id,
      context.traceId,
      context.trace_id,
      paramsMeta.traceId,
      paramsMeta.trace_id,
      extraMeta.traceId,
      extraMeta.trace_id,
    ),
  );
}

export function traceIdForCall(request, extra) {
  return traceIdFromCall(request, extra) || newTraceId();
}

export function safeToolCallAttributes({ request, extra, traceId, status = undefined }) {
  const args = objectValue(request?.params?.arguments);
  const paramsMeta = objectValue(request?.params?._meta);
  const extraMeta = objectValue(extra?._meta);
  const relatedTask = objectValue(paramsMeta["io.modelcontextprotocol/related-task"]);
  const context = objectValue(args.context);
  const metadata = objectValue(args.metadata);
  const hasArgumentTrace = Boolean(
    findValue(args.traceId, args.trace_id, metadata.traceId, metadata.trace_id, context.traceId, context.trace_id),
  );
  const hasMetadataTrace = Boolean(findValue(paramsMeta.traceId, paramsMeta.trace_id, extraMeta.traceId, extraMeta.trace_id));
  const attributes = {};

  safeSet(attributes, "tool.name", request?.params?.name);
  safeSet(attributes, "trace.id", traceId);
  safeSet(attributes, "session.id", findValue(args.sessionId, args.session_id, metadata.sessionId, metadata.session_id));
  safeSet(
    attributes,
    "task.id",
    findValue(args.taskId, args.task_id, metadata.taskId, metadata.task_id, extra?.taskId, relatedTask.taskId),
  );
  safeSet(attributes, "approval.mode", findValue(args.approvalMode, args.approval_mode, context.approvalMode, context.approval_mode));
  safeSet(
    attributes,
    "approval.scope",
    findValue(args.approvalScope, args.approval_scope, args.scope, context.approvalScope, context.approval_scope),
  );
  if (status) safeSet(attributes, "result.status", status);

  if (hasArgumentTrace) {
    safeSet(attributes, "trace.source", "arguments");
  } else if (hasMetadataTrace) {
    safeSet(attributes, "trace.source", "metadata");
  } else {
    safeSet(attributes, "trace.source", "generated");
  }

  return attributes;
}

export class InMemorySpanExporter {
  constructor() {
    this.spans = [];
  }

  export(span) {
    this.spans.push(span);
  }

  reset() {
    this.spans = [];
  }
}

class StderrSpanExporter {
  export(span) {
    process.stderr.write(`${JSON.stringify({ type: "otel_span", ...span })}\n`);
  }
}

class NoopSpanExporter {
  export() {}
}

export class GatewayTracer {
  constructor({ enabled = false, exporter = new NoopSpanExporter(), serviceName = "agents-gateway" } = {}) {
    this.enabled = Boolean(enabled);
    this.exporter = exporter;
    this.serviceName = serviceName;
  }

  startSpan(name, { traceId, attributes = {} } = {}) {
    if (!this.enabled) return new NoopSpan();
    return new GatewaySpan({
      name,
      traceId,
      serviceName: this.serviceName,
      exporter: this.exporter,
      attributes,
    });
  }
}

class NoopSpan {
  setAttribute() {}
  setAttributes() {}
  setStatus() {}
  recordException() {}
  end() {}
}

class GatewaySpan {
  constructor({ name, traceId, serviceName, exporter, attributes }) {
    this.name = name;
    this.traceId = traceId;
    this.serviceName = serviceName;
    this.exporter = exporter;
    this.spanId = crypto.randomUUID();
    this.startTime = nowIso();
    this.attributes = { ...attributes };
    this.status = { code: "UNSET" };
    this.events = [];
    this.ended = false;
  }

  setAttribute(key, value) {
    safeSet(this.attributes, key, value);
  }

  setAttributes(attributes) {
    for (const [key, value] of Object.entries(attributes || {})) {
      this.setAttribute(key, value);
    }
  }

  setStatus(status) {
    this.status = { code: status?.code || "UNSET" };
  }

  recordException(err) {
    this.events.push({
      name: "exception",
      attributes: {
        "exception.type": shortString(err?.name || "Error"),
      },
      time: nowIso(),
    });
  }

  end() {
    if (this.ended) return;
    this.ended = true;
    this.exporter.export({
      resource: { "service.name": this.serviceName },
      name: this.name,
      traceId: this.traceId,
      spanId: this.spanId,
      startTime: this.startTime,
      endTime: nowIso(),
      attributes: this.attributes,
      status: this.status,
      events: this.events,
    });
  }
}

export function createTelemetry(config = {}) {
  const telemetry = config.telemetry || {};
  const enabled = telemetry.enabled ?? isEnabled(process.env.AGENTS_OTEL_ENABLED);
  let exporter = new NoopSpanExporter();

  if (enabled && telemetry.exporter !== "none") {
    exporter = telemetry.exporterInstance || new StderrSpanExporter();
  }

  return new GatewayTracer({
    enabled,
    exporter,
    serviceName: telemetry.serviceName || "agents-gateway",
  });
}

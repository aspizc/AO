import crypto from "node:crypto";
import { z } from "zod";

import { isRequestContextProtectedAction } from "../core/request_context.js";
import {
  MAX_COORDINATION_LEASE_TTL_MS,
} from "../core/coordination_contract.js";
import {
  boundedRecord,
  markLegacyStripObject,
  unicodeStringLength,
  uniqueStringArray,
  zodToJsonSchema,
} from "./schema_projection.js";

const COORDINATION_BASE_CODES = [
  "COORDINATION_UNAVAILABLE",
  "COORDINATION_INTERNAL_ERROR",
];

const ERROR_MESSAGES = Object.freeze({
  ADAPTER_DISABLED: "adapter disabled",
  AGENT_PROMPT_NOT_SUBMITTED: "prompt submission not confirmed",
  COORDINATION_AUTH_FAILED: "coordination authentication failed",
  COORDINATION_CLASSIFICATION_DENIED: "coordination classification is denied",
  COORDINATION_DELIVERY_NOT_FOUND: "coordination delivery was not found",
  COORDINATION_ID_COLLISION: "could not allocate a coordination identity",
  COORDINATION_INBOX_FULL: "coordination target inbox is full",
  COORDINATION_INTERNAL_ERROR: "coordination operation failed safely",
  COORDINATION_INVALID_INPUT: "invalid coordination input",
  COORDINATION_LEASE_CHANGED: "coordination identity changed during operation",
  COORDINATION_LEASE_EXPIRED: "coordination lease has expired",
  COORDINATION_MESSAGE_CONFLICT: "coordination message ID conflicts with an earlier send",
  COORDINATION_MESSAGE_TOO_LARGE: "coordination message exceeds its byte limit",
  COORDINATION_SCOPE_MISMATCH: "coordination scope does not match",
  COORDINATION_SECRET_REJECTED: "coordination content was rejected",
  COORDINATION_TARGET_NOT_FOUND: "coordination target is unavailable",
  COORDINATION_UNAVAILABLE: "coordination requires a reachable Redis service",
  EXCLUDED_PATH_EXPOSED: "agent output exposed an excluded path",
  NOT_FOUND: "resource not found",
  NOT_SUPERVISED: "session is not supervised",
  ORCHESTRATION_NOT_FOUND: "orchestration was not found",
  PARENT_NOT_FOUND: "parent message was not found",
  POLICY_DENIED: "request denied by policy",
  REQUEST_CONTEXT_DENIED: "request context denied",
  ROLE_FORBIDDEN: "role is not allowed to perform this operation",
  SANITIZATION_MISSING: "required sanitized artifact is unavailable",
  TIMEOUT: "tool operation timed out",
  TRACE_ACCESS_DENIED: "trace access denied",
});

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_METADATA_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const LEASE_TOKEN = /^[A-Za-z0-9_-]{32,256}$/;
const DELIVERY_ID =
  /^(?!0-0$)(?:0|[1-9][0-9]*)-(?:0|[1-9][0-9]*)$/;
const PARTICIPANT_TYPES = ["gateway", "orchestrator", "agent", "session"];
const CLASSIFICATIONS = ["unrestricted", "internal", "restricted"];
const MAX_RECEIVE_COUNT = 100;
const MAX_ACK_COUNT = 100;

const finiteNumber = () => z.number().finite();
const codePointString = ({
  minLength,
  maxLength,
  pattern,
} = {}) => {
  const schema = pattern ? z.string().regex(pattern) : z.string();
  return unicodeStringLength(schema, { minLength, maxLength });
};
const scalarMetadata = z.union([
  codePointString({ maxLength: 2_048 }),
  finiteNumber(),
  z.boolean(),
  z.null(),
]);
const strictObject = (shape) => z.object(shape).strict();
const legacyMessageObject = (shape) => markLegacyStripObject(z.object(shape));
const safeIdentifier = () =>
  codePointString({
    minLength: 1,
    maxLength: 128,
    pattern: SAFE_IDENTIFIER,
  });
const leaseToken = () =>
  codePointString({
    minLength: 32,
    maxLength: 256,
    pattern: LEASE_TOKEN,
  });
const boundedText = (maxLength) =>
  codePointString({ minLength: 1, maxLength });
const credentialShape = {
  participantId: safeIdentifier(),
  leaseToken: leaseToken(),
};
const capabilities = uniqueStringArray(
  z.array(safeIdentifier()).max(64),
);
const metadata = boundedRecord(
  z.record(
    codePointString({
      minLength: 1,
      maxLength: 64,
      pattern: SAFE_METADATA_KEY,
    }),
    scalarMetadata,
  ),
  { maxProperties: 32 },
);
const deliveryIds = uniqueStringArray(
  z.array(
    codePointString({
      minLength: 3,
      maxLength: 128,
      pattern: DELIVERY_ID,
    }),
  ).min(1).max(MAX_ACK_COUNT),
);
const TraceSchema = strictObject({ traceId: z.string() });
const MessageCredentialSchema = {
  traceId: z.string(),
  accessToken: z.string(),
};
const AgentExecutionSchema = {
  agent: z.string(),
  role: z.string(),
  repo: z.string().optional(),
  cwd: z.string(),
  traceId: z.string(),
  taskId: z.string(),
  model: z.string().optional(),
  reasoningEffort: z.string().optional(),
  serviceTier: z.string().optional(),
};
const LeaseSchema = finiteNumber()
  .int()
  .min(1)
  .max(MAX_COORDINATION_LEASE_TTL_MS)
  .optional();

function leaseValidationError(issues, context = {}) {
  const issue = issues.find(({ path }) => path === "leaseTtlMs");
  if (!issue) return undefined;
  const maximum = Number.isSafeInteger(context.leaseMaxMs)
    ? context.leaseMaxMs
    : MAX_COORDINATION_LEASE_TTL_MS;
  const message =
    issue.code === "too_big"
      ? `leaseTtlMs exceeds maximum ${maximum}`
      : "leaseTtlMs must be a positive safe integer";
  return {
    error: "COORDINATION_INVALID_INPUT",
    message,
    code: "COORDINATION_INVALID_INPUT",
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function createSpec({
  name,
  description,
  schema,
  example,
  dependency = "gateway-local",
  errorCodes = [],
  validationError,
  payloadErrorsAreMcpErrors = true,
  legacyValidationEnvelope = false,
}) {
  if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(name)) {
    throw new TypeError(`invalid tool catalog name: ${name}`);
  }
  if (typeof description !== "string" || !description.endsWith(".")) {
    throw new TypeError(`tool description must end with a period: ${name}`);
  }
  const inputSchema = deepFreeze(zodToJsonSchema(schema));
  const publicErrorCodes = [
    ...new Set([
      "INVALID_INPUT",
      "TOOL_ERROR",
      ...(isRequestContextProtectedAction(name)
        ? ["REQUEST_CONTEXT_DENIED"]
        : []),
      ...errorCodes,
    ]),
  ];
  const errorMessages = Object.fromEntries(
    publicErrorCodes
      .filter((code) => ERROR_MESSAGES[code])
      .map((code) => [code, ERROR_MESSAGES[code]]),
  );
  const publicEntry = deepFreeze({
    name,
    description,
    inputSchema,
    listed: "always",
    runtimeDependency: dependency,
    auditRoute: name.startsWith("coordination.") ? "local-only" : "legacy",
    publicErrorCodes,
    errorMessages,
    example: structuredClone(example),
  });
  return Object.freeze({
    publicEntry,
    schema,
    validationError,
    payloadErrorsAreMcpErrors,
    legacyValidationEnvelope,
  });
}

const specs = [
  createSpec({
    name: "orchestration.create",
    description: "Create a new orchestration session.",
    schema: strictObject({
      callerAgent: z.string(),
      callerRole: z.string(),
      goal: z.string().optional(),
      prefix: z.string().optional(),
    }),
    example: {
      callerAgent: "claude-code",
      callerRole: "orchestrator",
      goal: "Coordinate a reviewed change",
    },
    errorCodes: ["ROLE_FORBIDDEN"],
  }),
  createSpec({
    name: "orchestration.view",
    description: "View an owned orchestration or discover eligible local restart traces.",
    schema: strictObject({ traceId: z.string().min(1).optional() }),
    example: { traceId: "tr-contract-example" },
  }),
  ...[
    ["orchestration.pause", "Pause an orchestration session."],
    ["orchestration.resume", "Resume an orchestration session."],
    ["orchestration.cancel", "Cancel an orchestration session."],
    ["orchestration.complete", "Complete an orchestration session."],
  ].map(([name, description]) =>
    createSpec({
      name,
      description,
      schema: TraceSchema,
      example: { traceId: "tr-contract-example" },
      errorCodes: ["ORCHESTRATION_NOT_FOUND"],
    })),
  createSpec({
    name: "task.assign",
    description: "Assign work to a target agent in a target role under an orchestration trace.",
    schema: strictObject({
      traceId: z.string(),
      caller: strictObject({
        agent: z.string(),
        role: z.string(),
      }),
      target: strictObject({
        agent: z.string().optional(),
        role: z.string(),
        action: z.string().optional(),
      }),
      repo: z.string().optional(),
      brief: z.string().optional(),
    }),
    example: {
      traceId: "tr-contract-example",
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "codex", role: "coder", action: "code.write" },
      repo: "sample-apps",
      brief: "Implement the reviewed task",
    },
    errorCodes: ["ORCHESTRATION_NOT_FOUND", "POLICY_DENIED"],
  }),
  createSpec({
    name: "agent.delegate",
    description:
      "Run an agent in headless mode for a one-shot task. Optional model, reasoning effort, and service tier fall back to registry defaults.",
    schema: strictObject({
      ...AgentExecutionSchema,
      prompt: z.string(),
    }),
    example: {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      cwd: "/workspace/sample-apps",
      prompt: "Implement the assigned change",
      traceId: "tr-contract-example",
      taskId: "task-contract-example",
    },
    dependency: "configured-agent-adapter",
    errorCodes: [
      "POLICY_DENIED",
      "ADAPTER_DISABLED",
      "EXCLUDED_PATH_EXPOSED",
      "TIMEOUT",
    ],
  }),
  createSpec({
    name: "agent.spawn",
    description:
      "Start a persistent tmux-backed agent session. Optional model, reasoning effort, and service tier fall back to registry defaults.",
    schema: strictObject(AgentExecutionSchema),
    example: {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      cwd: "/workspace/sample-apps",
      traceId: "tr-contract-example",
      taskId: "task-contract-example",
    },
    dependency: "configured-agent-adapter",
    errorCodes: [
      "POLICY_DENIED",
      "ADAPTER_DISABLED",
      "EXCLUDED_PATH_EXPOSED",
      "TIMEOUT",
    ],
  }),
  createSpec({
    name: "agent.ask",
    description: "Send a prompt to an existing agent session.",
    schema: strictObject({
      sessionId: z.string(),
      prompt: z.string(),
      traceId: z.string(),
    }),
    example: {
      sessionId: "sess-contract-example",
      prompt: "Report current progress",
      traceId: "tr-contract-example",
    },
    dependency: "configured-agent-adapter",
    errorCodes: [
      "NOT_FOUND",
      "POLICY_DENIED",
      "ADAPTER_DISABLED",
      "AGENT_PROMPT_NOT_SUBMITTED",
      "TIMEOUT",
    ],
  }),
  createSpec({
    name: "agent.view",
    description: "Capture the current pane snapshot of an agent session.",
    schema: strictObject({
      sessionId: z.string(),
      traceId: z.string().optional(),
    }),
    example: {
      sessionId: "sess-contract-example",
      traceId: "tr-contract-example",
    },
    dependency: "configured-agent-adapter",
    errorCodes: ["NOT_FOUND", "ADAPTER_DISABLED", "TIMEOUT"],
  }),
  createSpec({
    name: "agent.kill",
    description: "Close an agent session.",
    schema: strictObject({
      sessionId: z.string(),
      traceId: z.string(),
    }),
    example: {
      sessionId: "sess-contract-example",
      traceId: "tr-contract-example",
    },
    dependency: "configured-agent-adapter",
    errorCodes: ["NOT_FOUND", "ADAPTER_DISABLED", "TIMEOUT"],
  }),
  createSpec({
    name: "artifact.put",
    description: "Persist an artifact under a trace ID.",
    schema: strictObject({
      traceId: z.string(),
      kind: z.string(),
      classification: z.enum(["unrestricted", "internal", "restricted"]),
      producedBy: z.string(),
      content: z.string(),
      sanitizedFrom: z.string().optional(),
    }),
    example: {
      traceId: "tr-contract-example",
      kind: "review_notes",
      classification: "internal",
      producedBy: "sess-reviewer",
      content: "Review completed without blockers",
    },
  }),
  createSpec({
    name: "artifact.get",
    description: "Read an artifact by artifact ID.",
    schema: strictObject({
      artifactId: z.string(),
      requesterAgent: z.string(),
      requesterRole: z.string(),
    }),
    example: {
      artifactId: "art-contract-example",
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    },
    errorCodes: ["NOT_FOUND", "POLICY_DENIED"],
  }),
  createSpec({
    name: "artifact.list",
    description: "List artifacts under a trace ID.",
    schema: strictObject({
      traceId: z.string(),
      requesterAgent: z.string(),
      requesterRole: z.string(),
    }),
    example: {
      traceId: "tr-contract-example",
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    },
    errorCodes: ["POLICY_DENIED"],
  }),
  createSpec({
    name: "artifact.share",
    description: "Share an artifact with a requester, applying policy and sanitization.",
    schema: strictObject({
      artifactId: z.string(),
      requesterAgent: z.string(),
      requesterRole: z.string(),
      traceId: z.string(),
    }),
    example: {
      artifactId: "art-contract-example",
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
      traceId: "tr-contract-example",
    },
    errorCodes: ["NOT_FOUND", "POLICY_DENIED", "SANITIZATION_MISSING"],
  }),
  createSpec({
    name: "approval.request",
    description:
      "Create a pending approval. Non-blocking. Returns immediately with status='pending'.",
    schema: strictObject({
      traceId: z.string().optional(),
      action: z.string(),
      requestedBy: z.string(),
      context: z.record(z.any()).optional(),
    }),
    example: {
      traceId: "tr-contract-example",
      action: "code.apply",
      requestedBy: "orchestrator",
      context: { repo: "sample-apps" },
    },
  }),
  createSpec({
    name: "approval.respond",
    description: "Operator decides a pending approval. Idempotent on already-decided approvals.",
    schema: strictObject({
      approvalId: z.string(),
      decision: z.enum(["granted", "denied"]),
      decidedBy: z.string(),
      note: z.string().optional(),
    }),
    example: {
      approvalId: "apr-contract-example",
      decision: "granted",
      decidedBy: "operator",
    },
    errorCodes: ["NOT_FOUND"],
  }),
  createSpec({
    name: "approval.poll",
    description: "Cheap status read. Always non-blocking.",
    schema: strictObject({ approvalId: z.string() }),
    example: { approvalId: "apr-contract-example" },
    errorCodes: ["NOT_FOUND"],
  }),
  createSpec({
    name: "approval.wait",
    description:
      "Wait for an approval decision, bounded by AGENTS_APPROVAL_MAX_WAIT_MS. Returns pending on timeout.",
    schema: strictObject({
      approvalId: z.string(),
      timeoutMs: finiteNumber().positive().optional(),
    }),
    example: {
      approvalId: "apr-contract-example",
      timeoutMs: 1_000,
    },
    errorCodes: ["NOT_FOUND"],
  }),
  createSpec({
    name: "message.send",
    description: "Send a message between participants of an orchestration trace.",
    schema: legacyMessageObject({
      ...MessageCredentialSchema,
      fromId: z.string(),
      toId: z.string(),
      body: z.string(),
    }),
    example: {
      traceId: "tr-contract-example",
      accessToken: "trace-access-token",
      fromId: "orchestrator",
      toId: "reviewer",
      body: "Review is ready",
    },
    errorCodes: ["TRACE_ACCESS_DENIED"],
    payloadErrorsAreMcpErrors: false,
    legacyValidationEnvelope: true,
  }),
  createSpec({
    name: "message.list",
    description: "List messages in a trace.",
    schema: legacyMessageObject(MessageCredentialSchema),
    example: {
      traceId: "tr-contract-example",
      accessToken: "trace-access-token",
    },
    errorCodes: ["TRACE_ACCESS_DENIED"],
    payloadErrorsAreMcpErrors: false,
    legacyValidationEnvelope: true,
  }),
  createSpec({
    name: "message.reply",
    description: "Reply to a message in the same trace.",
    schema: legacyMessageObject({
      ...MessageCredentialSchema,
      parentMessageId: z.string(),
      fromId: z.string(),
      toId: z.string(),
      body: z.string(),
    }),
    example: {
      traceId: "tr-contract-example",
      accessToken: "trace-access-token",
      parentMessageId: "msg-parent",
      fromId: "reviewer",
      toId: "orchestrator",
      body: "Review completed",
    },
    errorCodes: ["TRACE_ACCESS_DENIED", "PARENT_NOT_FOUND"],
    payloadErrorsAreMcpErrors: false,
    legacyValidationEnvelope: true,
  }),
  createSpec({
    name: "session.attach_info",
    description: "Return the tmux attach command for a supervised agent session.",
    schema: strictObject({ sessionId: z.string() }),
    example: { sessionId: "sess-contract-example" },
    errorCodes: ["NOT_FOUND", "NOT_SUPERVISED"],
  }),
  createSpec({
    name: "session.intervention_note",
    description: "Record a manual human intervention note tied to a session.",
    schema: strictObject({
      sessionId: z.string(),
      traceId: z.string(),
      note: codePointString({ minLength: 1 }),
      by: z.string().optional(),
    }),
    example: {
      sessionId: "sess-contract-example",
      traceId: "tr-contract-example",
      note: "Operator clarified the requested scope",
      by: "operator",
    },
  }),
  createSpec({
    name: "coordination.status",
    description: "Probe coordination readiness and report its canonical scope and lease limits.",
    schema: strictObject({}),
    example: {},
    dependency: "coordination-redis",
    errorCodes: COORDINATION_BASE_CODES,
  }),
  createSpec({
    name: "coordination.register",
    description: "Register a leased participant in the coordination plane.",
    schema: strictObject({
      participantType: z.enum(PARTICIPANT_TYPES),
      scopeId: safeIdentifier().optional(),
      displayName: boundedText(256).optional(),
      capabilities: capabilities.optional(),
      metadata: metadata.optional(),
      leaseTtlMs: LeaseSchema,
    }),
    example: {
      participantType: "orchestrator",
      scopeId: "agents-orchestrator",
      displayName: "Primary orchestrator",
      capabilities: ["coordination.v1"],
      metadata: { ready: true, retries: 0, parent: null },
      leaseTtlMs: 900_000,
    },
    dependency: "coordination-redis",
    errorCodes: [
      "COORDINATION_INVALID_INPUT",
      "COORDINATION_SCOPE_MISMATCH",
      "COORDINATION_ID_COLLISION",
      ...COORDINATION_BASE_CODES,
    ],
    validationError: leaseValidationError,
  }),
  createSpec({
    name: "coordination.heartbeat",
    description: "Renew an authenticated coordination participant lease.",
    schema: strictObject({
      ...credentialShape,
      leaseTtlMs: LeaseSchema,
    }),
    example: {
      participantId: "pt-contract-example",
      leaseToken: "lease-token-with-at-least-32-characters",
      leaseTtlMs: 900_000,
    },
    dependency: "coordination-redis",
    errorCodes: [
      "COORDINATION_INVALID_INPUT",
      "COORDINATION_AUTH_FAILED",
      "COORDINATION_LEASE_EXPIRED",
      "COORDINATION_LEASE_CHANGED",
      ...COORDINATION_BASE_CODES,
    ],
    validationError: leaseValidationError,
  }),
  createSpec({
    name: "coordination.discover",
    description: "Discover active participants in the caller's coordination scope.",
    schema: strictObject({
      ...credentialShape,
      scopeId: safeIdentifier().optional(),
      participantType: z.enum(PARTICIPANT_TYPES).optional(),
      capability: safeIdentifier().optional(),
    }),
    example: {
      participantId: "pt-contract-example",
      leaseToken: "lease-token-with-at-least-32-characters",
      scopeId: "agents-orchestrator",
      participantType: "orchestrator",
      capability: "coordination.v1",
    },
    dependency: "coordination-redis",
    errorCodes: [
      "COORDINATION_INVALID_INPUT",
      "COORDINATION_AUTH_FAILED",
      "COORDINATION_LEASE_EXPIRED",
      "COORDINATION_LEASE_CHANGED",
      "COORDINATION_SCOPE_MISMATCH",
      ...COORDINATION_BASE_CODES,
    ],
  }),
  createSpec({
    name: "coordination.unregister",
    description: "Remove an authenticated participant from the coordination plane.",
    schema: strictObject(credentialShape),
    example: {
      participantId: "pt-contract-example",
      leaseToken: "lease-token-with-at-least-32-characters",
    },
    dependency: "coordination-redis",
    errorCodes: [
      "COORDINATION_INVALID_INPUT",
      "COORDINATION_AUTH_FAILED",
      "COORDINATION_LEASE_EXPIRED",
      "COORDINATION_LEASE_CHANGED",
      ...COORDINATION_BASE_CODES,
    ],
  }),
  createSpec({
    name: "coordination.send",
    description: "Send an addressed message to an active coordination participant.",
    schema: strictObject({
      ...credentialShape,
      toParticipantId: safeIdentifier(),
      messageId: safeIdentifier().optional(),
      messageType: safeIdentifier(),
      classification: z.enum(CLASSIFICATIONS),
      body: codePointString({ minLength: 1 }),
      traceId: boundedText(128).optional(),
      correlationId: boundedText(128).optional(),
      replyToMessageId: safeIdentifier().optional(),
    }),
    example: {
      participantId: "pt-contract-example",
      leaseToken: "lease-token-with-at-least-32-characters",
      toParticipantId: "pt-reviewer",
      messageId: "cm-contract-example",
      messageType: "REVIEW_REQUEST",
      classification: "internal",
      body: "Review candidate is ready",
      traceId: "tr-contract-example",
    },
    dependency: "coordination-redis",
    errorCodes: [
      "COORDINATION_INVALID_INPUT",
      "COORDINATION_AUTH_FAILED",
      "COORDINATION_LEASE_EXPIRED",
      "COORDINATION_LEASE_CHANGED",
      "COORDINATION_TARGET_NOT_FOUND",
      "COORDINATION_SCOPE_MISMATCH",
      "COORDINATION_CLASSIFICATION_DENIED",
      "COORDINATION_SECRET_REJECTED",
      "COORDINATION_MESSAGE_TOO_LARGE",
      "COORDINATION_MESSAGE_CONFLICT",
      "COORDINATION_INBOX_FULL",
      ...COORDINATION_BASE_CODES,
    ],
  }),
  createSpec({
    name: "coordination.receive",
    description: "Receive or reclaim addressed coordination deliveries.",
    schema: strictObject({
      ...credentialShape,
      consumerId: safeIdentifier(),
      count: finiteNumber().int().min(1).max(MAX_RECEIVE_COUNT).optional(),
      reclaimIdleMs: finiteNumber()
        .int()
        .min(0)
        .max(Number.MAX_SAFE_INTEGER)
        .optional(),
      blockMs: finiteNumber()
        .int()
        .min(0)
        .max(Number.MAX_SAFE_INTEGER)
        .optional(),
    }),
    example: {
      participantId: "pt-contract-example",
      leaseToken: "lease-token-with-at-least-32-characters",
      consumerId: "reviewer-process",
      count: 10,
      reclaimIdleMs: 0,
      blockMs: 1_000,
    },
    dependency: "coordination-redis",
    errorCodes: [
      "COORDINATION_INVALID_INPUT",
      "COORDINATION_AUTH_FAILED",
      "COORDINATION_LEASE_EXPIRED",
      "COORDINATION_LEASE_CHANGED",
      ...COORDINATION_BASE_CODES,
    ],
  }),
  createSpec({
    name: "coordination.ack",
    description: "Acknowledge addressed coordination deliveries.",
    schema: strictObject({
      ...credentialShape,
      deliveryIds,
    }),
    example: {
      participantId: "pt-contract-example",
      leaseToken: "lease-token-with-at-least-32-characters",
      deliveryIds: ["1-0"],
    },
    dependency: "coordination-redis",
    errorCodes: [
      "COORDINATION_INVALID_INPUT",
      "COORDINATION_AUTH_FAILED",
      "COORDINATION_LEASE_EXPIRED",
      "COORDINATION_LEASE_CHANGED",
      "COORDINATION_DELIVERY_NOT_FOUND",
      ...COORDINATION_BASE_CODES,
    ],
  }),
  createSpec({
    name: "orchestration.reattach",
    description: "Explicitly reattach a persisted Linux local stdio SQLite trace.",
    schema: strictObject({ traceId: z.string().min(1) }),
    example: { traceId: "tr-contract-example" },
  }),
];

const runtimeByName = new Map();
for (const spec of specs) {
  if (runtimeByName.has(spec.publicEntry.name)) {
    throw new TypeError(`duplicate tool catalog entry: ${spec.publicEntry.name}`);
  }
  runtimeByName.set(spec.publicEntry.name, spec);
}

export const TOOL_CATALOG = deepFreeze(specs.map(({ publicEntry }) => publicEntry));
export const TOOL_NAMES = deepFreeze(TOOL_CATALOG.map(({ name }) => name));

export function getToolContract(name) {
  return runtimeByName.get(name)?.publicEntry;
}

export function validateCatalogInput(name, value) {
  const runtime = runtimeByName.get(name);
  if (!runtime) throw new TypeError(`unknown catalog tool: ${String(name)}`);
  return runtime.schema.safeParse(value);
}

export function mapCatalogValidationError(
  name,
  issues,
  context,
  fallbackValidationError,
) {
  const runtime = runtimeByName.get(name);
  if (!runtime) throw new TypeError(`unknown catalog tool: ${String(name)}`);
  const mapper = runtime.validationError || fallbackValidationError;
  return typeof mapper === "function" ? mapper(issues, context) : undefined;
}

export function getCatalogPayloadErrorMode(name) {
  const runtime = runtimeByName.get(name);
  if (!runtime) throw new TypeError(`unknown catalog tool: ${String(name)}`);
  return runtime.payloadErrorsAreMcpErrors ? "mcp-error" : "legacy-envelope";
}

export function getCatalogValidationErrorMode(name) {
  const runtime = runtimeByName.get(name);
  if (!runtime) throw new TypeError(`unknown catalog tool: ${String(name)}`);
  return runtime.legacyValidationEnvelope
    ? "legacy-envelope"
    : "safe-envelope";
}

export function assertCompleteToolBindings(tools) {
  if (!Array.isArray(tools)) throw new TypeError("tool bindings must be an array");
  const actual = tools.map(({ name }) => name);
  if (actual.length !== TOOL_NAMES.length || actual.some((name, index) => name !== TOOL_NAMES[index])) {
    throw new TypeError(
      `tool bindings differ from catalog: expected ${TOOL_NAMES.join(",")}; got ${actual.join(",")}`,
    );
  }
  return tools;
}

export function catalogProjection() {
  return deepFreeze(TOOL_CATALOG.map((entry) => structuredClone(entry)));
}

export function catalogProjectionDigest() {
  const digest = crypto
    .createHash("sha256")
    .update(JSON.stringify(catalogProjection()))
    .digest("hex");
  return `sha256:${digest}`;
}

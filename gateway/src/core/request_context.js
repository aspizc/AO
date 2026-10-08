import fs from "node:fs";
import { performance } from "node:perf_hooks";
import path from "node:path";

import {
  ACTION_CATALOG_VERSION,
  isCanonicalAction,
  isRepositoryAffectingAction,
} from "./policy_types.js";

export const REQUEST_CONTEXT_ERROR = "REQUEST_CONTEXT_DENIED";
export const DEFAULT_REQUEST_CONTEXT_TTL_MS = 86_400_000;

const RUNTIME = new WeakMap();
const EFFECTIVE_BINDINGS = new WeakSet();
const DENIAL_REASONS = new Set([
  "invalid", "execution_binding_mismatch", "revoked", "not_yet_valid", "expired",
  "audience_mismatch", "connection_mismatch", "action_catalog_version_mismatch",
  "action_unknown", "capability_denied", "capability_assertion_denied", "agent_mismatch",
  "role_mismatch", "principal_mismatch", "cwd_denied", "repository_denied", "trace_denied",
  "task_denied", "session_denied", "artifact_denied", "approval_denied", "task_target_denied",
  "task_repository_denied", "recovery_denied", "trace_reattachable",
].map((reason) => `context.${reason}`));
const PROTECTED_TOOL_PREFIXES = Object.freeze([
  "orchestration.",
  "task.",
  "agent.",
  "artifact.",
  "approval.",
  "session.",
]);
const DEFAULT_ORCHESTRATOR_CAPABILITIES = Object.freeze([
  "orchestration.create",
  "orchestration.view",
  "orchestration.pause",
  "orchestration.resume",
  "orchestration.cancel",
  "orchestration.complete",
  "orchestration.reattach",
  "task.assign",
  "agent.delegate",
  "agent.spawn",
  "agent.ask",
  "agent.view",
  "agent.kill",
  "artifact.put",
  "artifact.get",
  "artifact.list",
  "artifact.share",
  "approval.request",
  "approval.poll",
  "approval.wait",
  "session.attach_info",
  "session.intervention_note",
]);

export class RequestContextError extends Error {
  constructor(reasonCode) {
    super("request context denied");
    this.name = "RequestContextError";
    this.code = REQUEST_CONTEXT_ERROR;
    this.reasonCode = reasonCode;
  }
}

function deny(reasonCode) {
  throw new RequestContextError(reasonCode);
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

function optionalString(value, field) {
  if (value === null || value === undefined) return null;
  return requiredString(value, field);
}

function timestamp(value, field) {
  const text = requiredString(value, field);
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) throw new TypeError(`${field} must be an ISO timestamp`);
  return { text: new Date(parsed).toISOString(), value: parsed };
}

function nowTimestamp(value = new Date().toISOString()) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError("now must be an ISO timestamp");
  return parsed;
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function canonicalDirectory(value, field) {
  let canonical;
  try {
    canonical = fs.realpathSync(requiredString(value, field));
    if (!fs.statSync(canonical).isDirectory()) throw new Error("not a directory");
  } catch {
    throw new TypeError(`${field} must reference an existing directory`);
  }
  return canonical;
}

function normalizeRepositoryBindings(repositoryBindings = {}) {
  if (
    !repositoryBindings
    || typeof repositoryBindings !== "object"
    || Array.isArray(repositoryBindings)
  ) {
    throw new TypeError("repositoryBindings must be an object");
  }

  const bindings = new Map();
  const roots = new Map();
  for (const [id, rawBinding] of Object.entries(repositoryBindings)) {
    requiredString(id, "repository id");
    const rawRoot =
      typeof rawBinding === "string" ? rawBinding : rawBinding?.root;
    const root = canonicalDirectory(rawRoot, `repositoryBindings.${id}`);
    const classification =
      typeof rawBinding === "string" ? null : rawBinding?.classification ?? null;
    if (
      classification !== null
      && !["unrestricted", "internal", "restricted"].includes(classification)
    ) {
      throw new TypeError(`repositoryBindings.${id}.classification is invalid`);
    }
    const duplicateId = roots.get(root);
    if (duplicateId) {
      throw new TypeError(
        `repositories ${duplicateId} and ${id} share one canonical root`,
      );
    }
    roots.set(root, id);
    bindings.set(id, Object.freeze({ id, root, classification }));
  }
  return bindings;
}

function normalizeTraceEntry(entry) {
  const traceId =
    typeof entry === "string" ? entry : entry?.traceId;
  return Object.freeze({
    traceId: requiredString(traceId, "lineage traceId"),
    repositoryId: optionalString(entry?.repositoryId, "lineage repositoryId"),
  });
}

function seedLineage(lineage = {}) {
  if (!lineage || typeof lineage !== "object" || Array.isArray(lineage)) {
    throw new TypeError("lineage must be an object");
  }
  const traces = new Map();
  const tasks = new Map();
  const sessions = new Map();
  const artifacts = new Map();
  const approvals = new Map();

  for (const raw of lineage.traces || []) {
    const entry = normalizeTraceEntry(raw);
    traces.set(entry.traceId, entry);
  }
  for (const raw of lineage.tasks || []) {
    const task = Object.freeze({
      taskId: requiredString(raw?.taskId, "lineage taskId"),
      traceId: requiredString(raw?.traceId, "lineage task traceId"),
      repositoryId: requiredString(
        raw?.repositoryId,
        "lineage task repositoryId",
      ),
      targetAgent: requiredString(raw?.targetAgent, "lineage targetAgent"),
      targetRole: requiredString(raw?.targetRole, "lineage targetRole"),
      targetAction: requiredString(raw?.targetAction, "lineage targetAction"),
    });
    if (!traces.has(task.traceId)) {
      throw new TypeError("lineage task must reference an owned trace");
    }
    if (!isCanonicalAction(task.targetAction)) {
      throw new TypeError("lineage task action must be canonical");
    }
    tasks.set(task.taskId, task);
  }

  return { traces, tasks, sessions, artifacts, approvals };
}

export function createRequestContext({
  principalId,
  agent,
  role,
  audience,
  connectionId,
  capabilities = [],
  actionCatalogVersion = ACTION_CATALOG_VERSION,
  repositoryBindings = {},
  lineage = {},
  recovery = null,
  issuedAt = new Date().toISOString(),
  expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(),
} = {}) {
  const issued = timestamp(issuedAt, "issuedAt");
  const expires = timestamp(expiresAt, "expiresAt");
  if (expires.value <= issued.value) {
    throw new TypeError("expiresAt must be after issuedAt");
  }
  if (!Number.isSafeInteger(actionCatalogVersion) || actionCatalogVersion <= 0) {
    throw new TypeError("actionCatalogVersion must be a positive integer");
  }
  if (!Array.isArray(capabilities)) {
    throw new TypeError("capabilities must be an array");
  }
  const capabilitySet = new Set();
  for (const capability of capabilities) {
    requiredString(capability, "capability");
    if (!isCanonicalAction(capability)) {
      throw new TypeError(`capability ${capability} is not canonical`);
    }
    capabilitySet.add(capability);
  }

  const actor = Object.freeze({
    principalId: requiredString(principalId, "principalId"),
    agent: requiredString(agent, "agent"),
    role: requiredString(role, "role"),
  });
  const bindings = normalizeRepositoryBindings(repositoryBindings);
  const context = Object.freeze({
    actor,
    audience: requiredString(audience, "audience"),
    connectionId: requiredString(connectionId, "connectionId"),
    actionCatalogVersion,
    issuedAt: issued.text,
    expiresAt: expires.text,
    repositoryIds: Object.freeze([...bindings.keys()]),
  });
  const runtime = {
    capabilities: capabilitySet,
    repositories: bindings,
    issuedAt: issued.value,
    expiresAt: expires.value,
    revokedAt: null,
    recovery,
    recovered: new Set(),
    ...seedLineage(lineage),
  };
  RUNTIME.set(context, runtime);
  runtime.unsubscribeTerminal = recovery?.subscribeTerminal?.((state) => {
    if (state.entityType === "orchestration") forgetTrace(runtime, state.traceId);
    else runtime.sessions.delete(state.entityId);
  });
  return context;
}

function runtimeFor(context) {
  const runtime = RUNTIME.get(context);
  if (!runtime) deny("context.invalid");
  return runtime;
}

export function revokeRequestContext(context, { now = new Date().toISOString() } = {}) {
  const runtime = runtimeFor(context);
  if (runtime.revokedAt === null) runtime.revokedAt = nowTimestamp(now);
  try { runtime.recovery?.release?.(); }
  finally { runtime.unsubscribeTerminal?.(); }
  return context;
}

export function isRequestContextProtectedAction(action) {
  return (
    typeof action === "string"
    && PROTECTED_TOOL_PREFIXES.some((prefix) => action.startsWith(prefix))
  );
}

export function isServerOwnedRequestBinding(value) {
  return Boolean(value && typeof value === "object" && EFFECTIVE_BINDINGS.has(value));
}

export function isServerOwnedExecutionBinding(value, {
  action,
  agent,
  role,
  repositoryId = null,
  traceId = null,
  taskId = null,
  cwd,
  targetAction,
} = {}) {
  let canonicalExpectedCwd;
  try {
    canonicalExpectedCwd = fs.realpathSync(requiredString(cwd, "cwd"));
    if (!fs.statSync(canonicalExpectedCwd).isDirectory()) return false;
  } catch {
    return false;
  }
  return (
    isServerOwnedRequestBinding(value)
    && value.action === action
    && value.target?.agent === agent
    && value.target?.role === role
    && isCanonicalAction(value.target?.action)
    && (targetAction === undefined || value.target.action === targetAction)
    && (value.repository?.id ?? null) === repositoryId
    && value.traceId === traceId
    && value.taskId === taskId
    && value.repository?.cwd === canonicalExpectedCwd
  );
}

export function assertServerOwnedExecutionBinding(value, expected = {}) {
  if (!isServerOwnedExecutionBinding(value, expected)) {
    deny("context.execution_binding_mismatch");
  }
  return value;
}

function assertContextState(context, runtime, binding) {
  const now = nowTimestamp(binding.now);
  if (runtime.revokedAt !== null) deny("context.revoked");
  if (now < runtime.issuedAt) deny("context.not_yet_valid");
  if (now >= runtime.expiresAt) deny("context.expired");
  if (binding.audience !== context.audience) deny("context.audience_mismatch");
  if (binding.connectionId !== context.connectionId) {
    deny("context.connection_mismatch");
  }
  if (binding.actionCatalogVersion !== context.actionCatalogVersion) {
    deny("context.action_catalog_version_mismatch");
  }
  if (context.actionCatalogVersion !== ACTION_CATALOG_VERSION) {
    deny("context.action_catalog_version_mismatch");
  }
  if (!isCanonicalAction(binding.action)) deny("context.action_unknown");
  if (!runtime.capabilities.has(binding.action)) deny("context.capability_denied");
  if (binding.assertedCapabilities !== undefined) {
    deny("context.capability_assertion_denied");
  }
  if (
    binding.actorAgent !== undefined
    && binding.actorAgent !== context.actor.agent
  ) {
    deny("context.agent_mismatch");
  }
  if (
    binding.actorRole !== undefined
    && binding.actorRole !== context.actor.role
  ) {
    deny("context.role_mismatch");
  }
}

function assertActor(context, agent, role) {
  if (agent !== undefined && agent !== context.actor.agent) {
    deny("context.agent_mismatch");
  }
  if (role !== undefined && role !== context.actor.role) {
    deny("context.role_mismatch");
  }
}

function assertPrincipal(context, value) {
  if (
    value !== undefined
    && value !== null
    && value !== context.actor.principalId
    && value !== context.actor.agent
  ) {
    deny("context.principal_mismatch");
  }
}

function canonicalCwd(value) {
  try {
    const canonical = fs.realpathSync(requiredString(value, "cwd"));
    if (!fs.statSync(canonical).isDirectory()) deny("context.cwd_denied");
    return canonical;
  } catch (error) {
    if (error instanceof RequestContextError) throw error;
    deny("context.cwd_denied");
  }
}

function repositoryFor(runtime, { repositoryId, cwd, required = false } = {}) {
  const claimed = repositoryId ?? null;
  if (claimed !== null && !runtime.repositories.has(claimed)) {
    deny("context.repository_denied");
  }

  let canonical = null;
  let discovered = null;
  if (cwd !== undefined && cwd !== null) {
    canonical = canonicalCwd(cwd);
    const candidates = [...runtime.repositories.values()]
      .filter(({ root }) => isContained(root, canonical))
      .sort((left, right) => right.root.length - left.root.length);
    discovered = candidates[0] || null;
    if (!discovered) deny("context.cwd_denied");
  }

  const binding = discovered || (claimed ? runtime.repositories.get(claimed) : null);
  if (claimed && discovered && claimed !== discovered.id) {
    deny("context.repository_denied");
  }
  if (!binding) {
    if (required) deny("context.repository_denied");
    return null;
  }
  const effective = {
    id: binding.id,
    root: binding.root,
    cwd: canonical || binding.root,
  };
  if (binding.classification !== null) {
    effective.classification = binding.classification;
  }
  return Object.freeze(effective);
}

function ownedTrace(runtime, traceId) {
  if (typeof traceId !== "string" || !runtime.traces.has(traceId)) {
    deny("context.trace_denied");
  }
  return runtime.traces.get(traceId);
}

function ownedTask(runtime, taskId) {
  if (typeof taskId !== "string" || !runtime.tasks.has(taskId)) {
    deny("context.task_denied");
  }
  return runtime.tasks.get(taskId);
}

function ownedSession(runtime, sessionId) {
  if (typeof sessionId !== "string" || !runtime.sessions.has(sessionId)) {
    deny("context.session_denied");
  }
  return runtime.sessions.get(sessionId);
}

function ownedArtifact(runtime, artifactId) {
  if (typeof artifactId !== "string" || !runtime.artifacts.has(artifactId)) {
    deny("context.artifact_denied");
  }
  return runtime.artifacts.get(artifactId);
}

function ownedApproval(runtime, approvalId) {
  if (typeof approvalId !== "string" || !runtime.approvals.has(approvalId)) {
    deny("context.approval_denied");
  }
  return runtime.approvals.get(approvalId);
}

function freezeTarget(target) {
  return target ? Object.freeze(target) : null;
}

function bindOrchestration(context, runtime, action, args) {
  if (action === "orchestration.create") {
    assertActor(context, args.callerAgent, args.callerRole);
    return { traceId: null, taskId: null, target: null, repository: null };
  }
  if (action === "orchestration.reattach" || (action === "orchestration.view" && args.traceId === undefined)) {
    return { traceId: args.traceId ?? null, taskId: null, target: null, repository: null };
  }
  ownedTrace(runtime, args.traceId);
  return {
    traceId: args.traceId,
    taskId: null,
    target: null,
    repository: null,
  };
}

function bindTask(context, runtime, args) {
  assertActor(context, args.caller?.agent, args.caller?.role);
  ownedTrace(runtime, args.traceId);
  if (!isCanonicalAction(args.target?.action)) deny("context.action_unknown");
  const repository = repositoryFor(runtime, {
    repositoryId: args.repo,
    required: true,
  });
  return {
    traceId: args.traceId,
    taskId: null,
    repository,
    target: freezeTarget({
      agent: args.target?.agent ?? null,
      role: requiredString(args.target?.role, "target role"),
      action: args.target.action,
    }),
  };
}

function bindAgentExecution(runtime, args) {
  const task = ownedTask(runtime, args.taskId);
  ownedTrace(runtime, args.traceId);
  if (task.traceId !== args.traceId) deny("context.trace_denied");
  if (
    task.targetAgent !== args.agent
    || task.targetRole !== args.role
  ) {
    deny("context.task_target_denied");
  }
  const repository = repositoryFor(runtime, {
    repositoryId: args.repo,
    cwd: args.cwd,
    required: true,
  });
  if (repository.id !== task.repositoryId) {
    deny("context.task_repository_denied");
  }
  return {
    traceId: task.traceId,
    taskId: task.taskId,
    repository,
    target: freezeTarget({
      agent: task.targetAgent,
      role: task.targetRole,
      action: task.targetAction,
    }),
  };
}

function bindAgentSession(runtime, args) {
  const session = ownedSession(runtime, args.sessionId);
  ownedTrace(runtime, session.traceId);
  if (args.traceId !== undefined && args.traceId !== session.traceId) {
    deny("context.trace_denied");
  }
  const repository = repositoryFor(runtime, {
    repositoryId: session.repositoryId,
    required: session.repositoryId !== null,
  });
  return {
    traceId: session.traceId,
    taskId: session.taskId,
    repository,
    target: freezeTarget({
      agent: session.targetAgent,
      role: session.targetRole,
      action: null,
    }),
  };
}

function bindArtifact(context, runtime, action, args) {
  if (action === "artifact.put" || action === "artifact.list") {
    ownedTrace(runtime, args.traceId);
    let repository = null;
    if (action === "artifact.list") {
      assertActor(context, args.requesterAgent, args.requesterRole);
    } else {
      const producer = runtime.sessions.get(args.producedBy);
      if (
        args.producedBy !== context.actor.principalId
        && args.producedBy !== context.actor.agent
        && (!producer || producer.traceId !== args.traceId)
      ) {
        deny("context.session_denied");
      }
      repository = repositoryFor(runtime, {
        repositoryId: producer?.repositoryId ?? null,
        required: producer?.repositoryId !== null && producer !== undefined,
      });
      if (args.sanitizedFrom !== undefined) {
        const source = ownedArtifact(runtime, args.sanitizedFrom);
        if (source.traceId !== args.traceId) deny("context.trace_denied");
        if (source.repositoryId !== (repository?.id ?? null)) {
          deny("context.repository_denied");
        }
      }
    }
    return {
      traceId: args.traceId,
      taskId: null,
      target: null,
      repository,
    };
  }

  const artifact = ownedArtifact(runtime, args.artifactId);
  ownedTrace(runtime, artifact.traceId);
  if (args.traceId !== undefined && args.traceId !== artifact.traceId) {
    deny("context.trace_denied");
  }
  let target = null;
  if (action === "artifact.share") {
    target = freezeTarget({
      agent: requiredString(args.requesterAgent, "requesterAgent"),
      role: requiredString(args.requesterRole, "requesterRole"),
      action: "artifact.get",
    });
  } else {
    assertActor(context, args.requesterAgent, args.requesterRole);
  }
  return {
    traceId: artifact.traceId,
    taskId: null,
    target,
    repository: repositoryFor(runtime, {
      repositoryId: artifact.repositoryId,
      required: artifact.repositoryId !== null,
    }),
  };
}

function bindApproval(context, runtime, action, args) {
  if (action === "approval.request") {
    assertPrincipal(context, args.requestedBy);
    if (!isCanonicalAction(args.action)) deny("context.action_unknown");
    ownedTrace(runtime, args.traceId);
    const repositoryAffecting = isRepositoryAffectingAction(args.action);
    const requestedTaskId = args.context?.taskId;
    let task = null;
    if (requestedTaskId !== undefined) {
      task = ownedTask(runtime, requestedTaskId);
      if (task.traceId !== args.traceId) deny("context.trace_denied");
    } else {
      const traceTasks = [...runtime.tasks.values()]
        .filter((candidate) => candidate.traceId === args.traceId);
      const repositoryIds = new Set(
        traceTasks.map(({ repositoryId }) => repositoryId),
      );
      if (repositoryIds.size > 1) deny("context.task_denied");
      if (repositoryAffecting && traceTasks.length !== 1) {
        deny("context.task_denied");
      }
      if (traceTasks.length > 0) task = traceTasks[0];
    }
    const requestedRepo = args.context?.repo;
    if (
      requestedRepo !== undefined
      && (!task || requestedRepo !== task.repositoryId)
    ) {
      deny("context.repository_denied");
    }
    const repository = repositoryFor(runtime, {
      repositoryId: task?.repositoryId ?? null,
      required: task !== null || repositoryAffecting,
    });
    if (
      repositoryAffecting
      && !["unrestricted", "internal", "restricted"].includes(
        repository?.classification,
      )
    ) {
      deny("context.repository_denied");
    }
    const assertedClassifications = [
      args.context?.classification,
      args.context?.repoClassification,
      args.context?.repositoryClassification,
    ].filter((value) => value !== undefined);
    if (
      assertedClassifications.some(
        (value) => value !== repository?.classification,
      )
    ) {
      deny("context.repository_denied");
    }
    return {
      traceId: args.traceId,
      taskId: task?.taskId ?? null,
      target: freezeTarget({ agent: null, role: null, action: args.action }),
      repository,
    };
  }
  if (action === "approval.respond") assertPrincipal(context, args.decidedBy);
  const approval = ownedApproval(runtime, args.approvalId);
  ownedTrace(runtime, approval.traceId);
  return {
    traceId: approval.traceId,
    taskId: approval.taskId,
    target: null,
    repository: repositoryFor(runtime, {
      repositoryId: approval.repositoryId,
      required: approval.repositoryId !== null,
    }),
  };
}

function bindSession(context, runtime, action, args) {
  if (action === "session.intervention_note") assertPrincipal(context, args.by);
  const session = ownedSession(runtime, args.sessionId);
  ownedTrace(runtime, session.traceId);
  if (args.traceId !== undefined && args.traceId !== session.traceId) {
    deny("context.trace_denied");
  }
  return {
    traceId: session.traceId,
    taskId: session.taskId,
    target: freezeTarget({
      agent: session.targetAgent,
      role: session.targetRole,
      action: null,
    }),
    repository: repositoryFor(runtime, {
      repositoryId: session.repositoryId,
      required: session.repositoryId !== null,
    }),
  };
}

function bindAction(context, runtime, action, args) {
  if (action.startsWith("orchestration.")) {
    return bindOrchestration(context, runtime, action, args);
  }
  if (action === "task.assign") return bindTask(context, runtime, args);
  if (action === "agent.spawn" || action === "agent.delegate") {
    return bindAgentExecution(runtime, args);
  }
  if (action.startsWith("agent.")) return bindAgentSession(runtime, args);
  if (action.startsWith("artifact.")) {
    return bindArtifact(context, runtime, action, args);
  }
  if (action.startsWith("approval.")) {
    return bindApproval(context, runtime, action, args);
  }
  if (action.startsWith("session.")) {
    return bindSession(context, runtime, action, args);
  }
  deny("context.action_unknown");
}

export function bindRequestContext(context, binding = {}) {
  const runtime = runtimeFor(context);
  runtime.recovery?.prepare?.();
  assertContextState(context, runtime, binding);
  const args =
    binding.args && typeof binding.args === "object" && !Array.isArray(binding.args)
      ? binding.args
      : {};
  const scoped = bindAction(context, runtime, binding.action, args);
  if (runtime.recovered.has(scoped.traceId)) {
    runtime.recovery.check(context, runtime.repositories, scoped.traceId,
      args.sessionId, binding.now ?? new Date().toISOString());
  }
  const effective = Object.freeze({
    actor: context.actor,
    target: scoped.target,
    repository: scoped.repository,
    action: binding.action,
    traceId: scoped.traceId,
    taskId: scoped.taskId,
  });
  EFFECTIVE_BINDINGS.add(effective);
  // Keep recovery context private; callers cannot select an owner or repository.
  EFFECTIVE_RUNTIME.set(effective, { context, runtime, now: binding.now, sessionId: args.sessionId,
    binding: { ...binding, args: { ...args } }, checkedAt: performance.now() });
  return effective;
}

const EFFECTIVE_RUNTIME = new WeakMap();

export function revalidateRequestContextBinding(effective) {
  if (effective === null || effective === undefined) return;
  const bound = EFFECTIVE_RUNTIME.get(effective);
  if (!bound) deny("context.invalid");
  const now = new Date(nowTimestamp(bound.now) + Math.max(0, performance.now() - bound.checkedAt)).toISOString();
  bindRequestContext(bound.context, { ...bound.binding, now });
}

export function discoverRequestContextTraces(effective) {
  const bound = EFFECTIVE_RUNTIME.get(effective);
  if (!bound) deny("context.invalid");
  return bound.runtime.recovery?.discover(bound.context, bound.runtime.repositories,
    bound.now ?? new Date().toISOString()) ?? { reattachableTraces: [], truncated: false };
}

export function reattachRequestContextTrace(effective) {
  const bound = EFFECTIVE_RUNTIME.get(effective);
  if (!bound?.runtime.recovery) deny("context.recovery_denied");
  const { context, runtime } = bound;
  const staged = runtime.recovery.reattach(context, runtime.repositories, effective.traceId,
    bound.now ?? new Date().toISOString());
  // The synchronous immediate transaction has committed before these maps change.
  forgetTrace(runtime, effective.traceId);
  runtime.traces.set(effective.traceId, Object.freeze({ traceId: effective.traceId, repositoryId: null }));
  for (const task of staged.tasks) runtime.tasks.set(task.taskId, Object.freeze({ ...task, traceId: effective.traceId }));
  for (const session of staged.sessions) {
    const task = runtime.tasks.get(session.taskId);
    runtime.sessions.set(session.sessionId, Object.freeze({ ...session, traceId: effective.traceId, repositoryId: task.repositoryId }));
  }
  runtime.recovered.add(effective.traceId);
  return staged.result;
}

export function requestContextDenialMetadata(context, { tool, reasonCode, args, now } = {}) {
  const metadata = { tool: isCanonicalAction(tool) ? tool : "unknown",
    reasonCode: DENIAL_REASONS.has(reasonCode) ? reasonCode : "context.invalid" };
  const runtime = RUNTIME.get(context);
  if (!runtime || !["context.trace_denied", "context.session_denied"].includes(reasonCode)) return metadata;
  try {
    assertContextState(context, runtime, { action: tool, actionCatalogVersion: context.actionCatalogVersion,
      audience: context.audience, connectionId: context.connectionId, now });
    if (runtime.recovery?.denialHint(context, runtime.repositories, args, now)) {
      metadata.reasonCode = "context.trace_reattachable";
    }
  } catch { /* Operator hints never alter denial or grant lineage. */ }
  return metadata;
}

function forgetTrace(runtime, traceId) {
  runtime.traces.delete(traceId); runtime.recovered.delete(traceId);
  for (const kind of ["tasks", "sessions", "artifacts", "approvals"]) {
    for (const [id, entry] of runtime[kind]) if (entry.traceId === traceId) runtime[kind].delete(id);
  }
}

export function applyEffectiveRequestContext(args, effective) {
  if (!effective) return args;
  const actor = effective.actor;
  switch (effective.action) {
    case "orchestration.create":
      return {
        ...args,
        callerAgent: actor.agent,
        callerRole: actor.role,
      };
    case "task.assign":
      return {
        ...args,
        caller: { agent: actor.agent, role: actor.role },
        repo: effective.repository.id,
      };
    case "agent.spawn":
    case "agent.delegate":
      return {
        ...args,
        agent: effective.target.agent,
        role: effective.target.role,
        repo: effective.repository.id,
        cwd: effective.repository.cwd,
        traceId: effective.traceId,
        taskId: effective.taskId,
      };
    case "artifact.get":
    case "artifact.list":
      return {
        ...args,
        requesterAgent: actor.agent,
        requesterRole: actor.role,
      };
    case "artifact.share":
      return {
        ...args,
        traceId: effective.traceId,
      };
    case "approval.request":
      {
        const {
          repo: _repo,
          taskId: _taskId,
          classification: _classification,
          repoClassification: _repoClassification,
          repositoryClassification: _repositoryClassification,
          ...callerContext
        } = args.context || {};
        return {
          ...args,
          requestedBy: actor.principalId,
          context: {
            ...callerContext,
            ...(effective.taskId ? { taskId: effective.taskId } : {}),
            ...(effective.repository
              ? {
                  repo: effective.repository.id,
                  ...(effective.repository.classification
                    ? { classification: effective.repository.classification }
                    : {}),
                }
              : {}),
          },
        };
      }
    case "approval.respond":
      return { ...args, decidedBy: actor.principalId };
    case "session.intervention_note":
      return { ...args, by: actor.principalId };
    default:
      return args;
  }
}

export function recordRequestContextResult(context, effective, value) {
  if (!effective || !value || typeof value !== "object" || Array.isArray(value)) {
    return;
  }
  const runtime = runtimeFor(context);
  const bound = EFFECTIVE_RUNTIME.get(effective);
  runtime.recovery?.record(context, { ...effective, sessionId: bound?.sessionId }, value);
  const repositoryId = effective.repository?.id ?? null;
  switch (effective.action) {
    case "orchestration.complete": case "orchestration.cancel":
      forgetTrace(runtime, effective.traceId);
      break;
    case "agent.kill":
      runtime.sessions.delete(bound?.sessionId);
      break;
    case "orchestration.create":
      if (typeof value.traceId === "string") {
        runtime.traces.set(value.traceId, Object.freeze({
          traceId: value.traceId,
          repositoryId: null,
        }));
      }
      break;
    case "task.assign":
      if (typeof value.taskId === "string") {
        runtime.tasks.set(value.taskId, Object.freeze({
          taskId: value.taskId,
          traceId: effective.traceId,
          repositoryId,
          targetAgent: value.assignedAgent,
          targetRole: value.assignedRole,
          targetAction: effective.target.action,
        }));
      }
      break;
    case "agent.spawn":
    case "agent.delegate":
      if (typeof value.sessionId === "string") {
        runtime.sessions.set(value.sessionId, Object.freeze({
          sessionId: value.sessionId,
          traceId: effective.traceId,
          taskId: effective.taskId,
          repositoryId,
          targetAgent: effective.target.agent,
          targetRole: effective.target.role,
        }));
      }
      break;
    case "artifact.put":
      if (typeof value.artifactId === "string") {
        runtime.artifacts.set(value.artifactId, Object.freeze({
          artifactId: value.artifactId,
          traceId: effective.traceId,
          repositoryId,
        }));
      }
      break;
    case "artifact.share":
      if (typeof value.sharedArtifactId === "string") {
        runtime.artifacts.set(value.sharedArtifactId, Object.freeze({
          artifactId: value.sharedArtifactId,
          traceId: effective.traceId,
          repositoryId,
        }));
      }
      break;
    case "approval.request":
      if (typeof value.approvalId === "string") {
        runtime.approvals.set(value.approvalId, Object.freeze({
          approvalId: value.approvalId,
          traceId: effective.traceId,
          taskId: effective.taskId,
          repositoryId,
        }));
      }
      break;
    default:
      break;
  }
}

function configuredRepositoryBindings(config, registries) {
  const repositories = registries?.raw?.().repositories || {};
  const repositoryIds = Object.keys(repositories);
  const bindings = {};
  const containers = (config?.repoRoots || []).map((root) => ({
    raw: path.resolve(root),
    canonical: canonicalDirectory(path.resolve(root), "repoRoots"),
  }));
  const directRoot =
    config?.repoRoot && fs.existsSync(config.repoRoot)
      ? canonicalDirectory(config.repoRoot, "repoRoot")
      : null;

  for (const id of repositoryIds) {
    const assign = (root) => {
      if (bindings[id] && bindings[id].root !== root) {
        throw new TypeError(
          `repository ${id} maps to different canonical roots`,
        );
      }
      bindings[id] = {
        root,
        classification: repositories[id]?.classification ?? null,
      };
    };
    if (directRoot && path.basename(directRoot) === id) assign(directRoot);
    for (const container of containers) {
      const direct = path.basename(container.raw) === id
        ? container.raw
        : path.join(container.raw, id);
      if (!fs.existsSync(direct)) continue;
      const canonical = canonicalDirectory(direct, `repository ${id}`);
      if (!isContained(container.canonical, canonical)) {
        throw new TypeError(`repository ${id} escapes its configured root`);
      }
      assign(canonical);
    }
  }
  return bindings;
}

export function resolveRegisteredRepositoryCwd({ config, registries, repositoryId, cwd }) {
  const repositories = normalizeRepositoryBindings(configuredRepositoryBindings(config, registries));
  return repositoryFor({ repositories }, { repositoryId, cwd, required: true });
}

export function createGatewayRequestContext({
  config = {},
  registries,
  capabilities = DEFAULT_ORCHESTRATOR_CAPABILITIES,
  actionCatalogVersion = ACTION_CATALOG_VERSION,
  connectionId,
  now = new Date().toISOString(),
  recovery = null,
} = {}) {
  const issued = timestamp(now, "now");
  const ttlMs =
    Number.isSafeInteger(config.requestContextTtlMs)
    && config.requestContextTtlMs > 0
      ? config.requestContextTtlMs
      : DEFAULT_REQUEST_CONTEXT_TTL_MS;
  return createRequestContext({
    principalId: recovery?.identity.principalId || config.requestPrincipalId || "local-stdio-operator",
    agent: config.requestPrincipalAgent || "claude-code",
    role: config.requestPrincipalRole || "orchestrator",
    audience: config.gatewayAudience || "agents-gateway",
    connectionId,
    capabilities,
    actionCatalogVersion,
    repositoryBindings: configuredRepositoryBindings(config, registries),
    recovery,
    issuedAt: issued.text,
    expiresAt: new Date(issued.value + ttlMs).toISOString(),
  });
}

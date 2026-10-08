import { settleRequestLaunch, transferRequestLaunch } from "../adapters/request_launch_cleanup.js";
import { types as utilTypes } from "node:util";

import { newSessionId } from "../core/ids.js";
import {
  evaluate,
  selectionDenialDecision,
} from "../core/policy_engine.js";
import {
  consumeEffectiveAgentSelection,
  resolveEffectiveAgentSelection,
  safeAuditSelectionProjection,
  validateRuntimeAgentCapabilities,
} from "../core/orchestrator_profile.js";
import {
  RequestContextError,
  assertServerOwnedExecutionBinding,
  revalidateRequestContextBinding,
} from "../core/request_context.js";
import * as sessionRepo from "../core/repositories/session_repo.js";
import { append as auditAppend } from "../core/audit.js";
import { checkForIntervention, recordExpectedAsk } from "../adapters/intervention_detector.js";
import { withTimeout } from "./_with_timeout.js";

export class PolicyDeniedError extends Error {
  constructor(decision) {
    super("request denied by policy");
    this.name = "PolicyDeniedError";
    this.code = "POLICY_DENIED";
    this.decision = decision;
  }
}

function invalidSelectionDecision() {
  return {
    decision: "deny",
    reason: "effective agent selection rejected",
    ruleId: "agent.model.allowed",
    selectionRejection: {
      code: "EFFECTIVE_SELECTION_INVALID",
      field: "effectiveSelection",
      provider: null,
    },
  };
}

function rejectInvalidSelection() {
  throw new PolicyDeniedError(invalidSelectionDecision());
}

function assertPolicySelectionIdentity(decision, effectiveSelection) {
  if (
    effectiveSelection
    && decision.decision === "allow"
    && decision.effectiveSelection !== effectiveSelection
  ) {
    rejectInvalidSelection();
  }
}

function observeSelection(selectionObservers, consumer, effectiveSelection) {
  selectionObservers?.[consumer]?.(effectiveSelection);
}

function assertAllowed(selectionObservers, registries, ctx, effectiveSelection) {
  observeSelection(selectionObservers, "policy", effectiveSelection);
  const decision = evaluate(ctx, registries);
  if (decision.decision !== "allow") {
    throw new PolicyDeniedError(decision);
  }
  assertPolicySelectionIdentity(decision, effectiveSelection);
  return decision;
}

function assertTargetAllowed(
  selectionObservers,
  registries,
  ctx,
  effectiveSelection,
) {
  observeSelection(selectionObservers, "policy", effectiveSelection);
  const decision = evaluate(ctx, registries);
  if (!["allow", "allow_with_sanitization"].includes(decision.decision)) {
    throw new PolicyDeniedError(decision);
  }
  assertPolicySelectionIdentity(decision, effectiveSelection);
  return decision;
}

function resolveSelection(selectionObservers, request) {
  try {
    const selection = resolveEffectiveAgentSelection(request);
    observeSelection(selectionObservers, "resolved", selection);
    return selection;
  } catch (error) {
    const decision = selectionDenialDecision(error);
    if (decision) throw new PolicyDeniedError(decision);
    throw error;
  }
}

function assertExecutionBinding({
  selectionObservers,
  registries,
  action,
  args,
  requestBinding,
}) {
  let execution;
  if (requestBinding === null || requestBinding === undefined) {
    execution = Object.freeze({
      agent: args.agent,
      role: args.role,
      repositoryId: args.repo,
      cwd: args.cwd,
      traceId: args.traceId,
      taskId: args.taskId,
    });
  } else {
    assertServerOwnedExecutionBinding(requestBinding, {
      action,
      agent: args.agent,
      role: args.role,
      repositoryId: args.repo,
      traceId: args.traceId,
      taskId: args.taskId,
      cwd: args.cwd,
    });
    execution = Object.freeze({
      agent: requestBinding.target.agent,
      role: requestBinding.target.role,
      repositoryId: requestBinding.repository.id,
      cwd: requestBinding.repository.cwd,
      traceId: requestBinding.traceId,
      taskId: requestBinding.taskId,
      targetAction: requestBinding.target.action,
    });
  }

  const effectiveSelection = resolveSelection(selectionObservers, {
    agent: execution.agent,
    model: args.model,
    reasoningEffort: args.reasoningEffort,
    serviceTier: args.serviceTier,
  });
  try {
    validateRuntimeAgentCapabilities(registries);
  } catch (error) {
    const decision = selectionDenialDecision(error);
    if (decision) throw new PolicyDeniedError(decision);
    throw error;
  }

  if (requestBinding === null || requestBinding === undefined) {
    assertAllowed(
      selectionObservers,
      registries,
      {
        agent: execution.agent,
        role: execution.role,
        repo: execution.repositoryId,
        action,
        effectiveSelection,
      },
      effectiveSelection,
    );
  } else {
    assertAllowed(
      selectionObservers,
      registries,
      {
        agent: requestBinding.actor.agent,
        role: requestBinding.actor.role,
        repo: null,
        action,
        targetAgent: execution.agent,
        targetRole: execution.role,
        effectiveSelection,
      },
      effectiveSelection,
    );
    assertTargetAllowed(
      selectionObservers,
      registries,
      {
        agent: execution.agent,
        role: execution.role,
        repo: execution.repositoryId,
        action: execution.targetAction,
        effectiveSelection,
      },
      effectiveSelection,
    );
  }

  return {
    effectiveSelection,
    execution,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function unknownSession(sessionId) {
  const error = new Error(`unknown session ${sessionId}`);
  error.code = "NOT_FOUND";
  return error;
}

function createSessionIfTaskProvided({ sessionId, taskId, traceId, agent, role, tmuxTarget }) {
  if (!taskId) return null;
  return sessionRepo.createSession({
    sessionId,
    taskId,
    traceId,
    agent,
    role,
    tmuxTarget,
    status: "running",
    startedAt: nowIso(),
    closedAt: null,
  });
}

function closeSessionIfPersisted(sessionId, status) {
  if (!sessionId) return;
  const row = sessionRepo.getSessionById(sessionId);
  if (!row) return;
  sessionRepo.setSessionStatus(sessionId, status, nowIso());
}

function auditServiceError({ traceId, sessionId = null, where, err }) {
  auditAppend({
    type: "ERROR",
    traceId,
    sessionId,
    where,
    error: String(err?.message || err),
    policy: err?.decision || null,
  });
}

async function bestEffortView(adapter, row) {
  try {
    return await adapter.view({ tmuxTarget: row.tmux_target });
  } catch (_err) {
    return null;
  }
}

function bestEffortInterventionCheck({ sessionId, currentSnapshot, traceId }) {
  try {
    checkForIntervention({ sessionId, currentSnapshot, traceId });
  } catch (_err) {
    // Intervention detection must never break the agent control path.
  }
}

function agentTimeout(config) {
  return config?.agentTimeoutMs || 600_000;
}

const SPAWN_RESULT_FIELDS = Object.freeze([
  "sessionId",
  "tmuxTarget",
  "attachCommand",
  "launchCommand",
  "dryRun",
  "effectiveSelection",
]);

const ADAPTER_RESULT_FIELDS = Object.freeze({
  codex: Object.freeze({
    delegate: Object.freeze([
      "stdout",
      "stderr",
      "exitCode",
      "dryRun",
      "model",
      "reasoningEffort",
      "serviceTier",
      "effectiveSelection",
      "sandbox",
    ]),
    spawn: SPAWN_RESULT_FIELDS,
  }),
  "claude-code": Object.freeze({
    delegate: Object.freeze([
      "stdout",
      "stderr",
      "exitCode",
      "dryRun",
      "model",
      "reasoningEffort",
      "effectiveSelection",
    ]),
    spawn: SPAWN_RESULT_FIELDS,
  }),
  antigravity: Object.freeze({
    delegate: Object.freeze([
      "stdout",
      "stderr",
      "exitCode",
      "dryRun",
      "model",
      "reasoningEffort",
      "effectiveSelection",
    ]),
    spawn: SPAWN_RESULT_FIELDS,
  }),
  pi: Object.freeze({
    delegate: Object.freeze([
      "stdout",
      "stderr",
      "exitCode",
      "dryRun",
      "model",
      "reasoningEffort",
      "effectiveSelection",
    ]),
    spawn: SPAWN_RESULT_FIELDS,
  }),
  opencode: Object.freeze({
    delegate: Object.freeze([
      "stdout",
      "stderr",
      "exitCode",
      "dryRun",
      "model",
      "reasoningEffort",
      "effectiveSelection",
    ]),
    spawn: SPAWN_RESULT_FIELDS,
  }),
});

const CODEX_SANDBOXES = new Set([
  "read-only",
  "workspace-write",
  "danger-full-access",
]);
const TMUX_TARGET_MAX_LENGTH = 96;
const LAUNCH_COMMAND_MAX_LENGTH = 8_192;
const UNSAFE_COMMAND_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

function hasExactFields(ownKeys, requiredFields) {
  return (
    ownKeys.length === requiredFields.length
    && ownKeys.every(
      (key) => typeof key === "string" && requiredFields.includes(key),
    )
  );
}

function configuredCodexSandbox(config) {
  const value = config.codexSandbox === undefined
    ? "workspace-write"
    : config.codexSandbox;
  return CODEX_SANDBOXES.has(value) ? value : null;
}

function assertProviderConfiguration(provider, codexSandbox, operation = null) {
  if (provider === "codex" && codexSandbox === null) {
    rejectInvalidSelection();
  }
  if (operation !== null && !ADAPTER_RESULT_FIELDS[provider]?.[operation]) {
    rejectInvalidSelection();
  }
}

function isSafeTmuxTarget(value) {
  return (
    typeof value === "string"
    && value.length <= TMUX_TARGET_MAX_LENGTH
    && /^[a-z0-9][a-z0-9-]*$/.test(value)
  );
}

function isSafeLaunchCommand(value) {
  return (
    typeof value === "string"
    && value.length > 0
    && value.length <= LAUNCH_COMMAND_MAX_LENGTH
    && value === value.trim()
    && !UNSAFE_COMMAND_CHARACTER.test(value)
    && value === value.normalize("NFC")
  );
}

function assertDelegateResultContract(
  provider,
  result,
  effectiveSelection,
  codexSandbox,
) {
  if (
    typeof result.stdout !== "string"
    || typeof result.stderr !== "string"
    || !Number.isSafeInteger(result.exitCode)
    || result.exitCode < -1
    || result.exitCode > 255
    || typeof result.dryRun !== "boolean"
    || result.model !== effectiveSelection.model
    || result.reasoningEffort !== effectiveSelection.reasoningEffort
  ) {
    rejectInvalidSelection();
  }

  if (provider === "codex") {
    if (
      result.serviceTier !== effectiveSelection.serviceTier
      || result.sandbox !== codexSandbox
    ) {
      rejectInvalidSelection();
    }
  }
}

function assertSpawnResultContract(result) {
  if (
    typeof result.dryRun !== "boolean"
    || result.sessionId !== result.tmuxTarget
    || !isSafeTmuxTarget(result.sessionId)
    || result.attachCommand !== `tmux attach -t ${result.tmuxTarget}`
    || !isSafeLaunchCommand(result.launchCommand)
  ) {
    rejectInvalidSelection();
  }
}

function assertAdapterSelectionResult(
  operation,
  result,
  effectiveSelection,
  codexSandbox,
) {
  const provider = effectiveSelection.provider;
  const requiredFields = ADAPTER_RESULT_FIELDS[provider]?.[operation];
  if (
    !requiredFields
    || !result
    || typeof result !== "object"
    || Array.isArray(result)
    || utilTypes.isProxy(result)
    || Object.getPrototypeOf(result) !== Object.prototype
  ) {
    rejectInvalidSelection();
  }
  const ownKeys = Reflect.ownKeys(result);
  if (!hasExactFields(ownKeys, requiredFields)) rejectInvalidSelection();
  const normalized = {};
  for (const key of ownKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(result, key);
    if (
      !descriptor
      || !Object.hasOwn(descriptor, "value")
      || descriptor.enumerable !== true
    ) {
      rejectInvalidSelection();
    }
    normalized[key] = descriptor.value;
  }
  if (
    !Object.hasOwn(normalized, "effectiveSelection")
    || normalized.effectiveSelection !== effectiveSelection
  ) {
    rejectInvalidSelection();
  }
  try {
    consumeEffectiveAgentSelection(normalized.effectiveSelection, {
      agent: effectiveSelection.agent,
      consumer: operation,
    });
    safeAuditSelectionProjection(normalized.effectiveSelection);
  } catch (_error) {
    rejectInvalidSelection();
  }
  if (operation === "delegate") {
    assertDelegateResultContract(
      provider,
      normalized,
      effectiveSelection,
      codexSandbox,
    );
  } else {
    assertSpawnResultContract(normalized);
  }
  return Object.freeze(normalized);
}

function auditModelResolved({
  traceId,
  sessionId = null,
  role,
  effectiveSelection,
  selectionObservers,
}) {
  observeSelection(selectionObservers, "audit", effectiveSelection);
  const projection = safeAuditSelectionProjection(effectiveSelection);
  auditAppend({
    type: "AGENT_MODEL_RESOLVED",
    traceId,
    sessionId,
    role,
    ...projection,
  });
}

export function createAgentService({
  adapters,
  registries,
  config = {},
  selectionObservers = {},
}) {
  for (const observer of ["resolved", "policy", "audit"]) {
    if (
      selectionObservers?.[observer] !== undefined
      && typeof selectionObservers[observer] !== "function"
    ) {
      throw new TypeError(`selectionObservers.${observer} must be a function`);
    }
  }
  const codexSandbox = configuredCodexSandbox(config);
  return {
    async delegate({
      agent,
      role,
      repo = null,
      cwd,
      prompt,
      traceId,
      taskId = null,
      model = null,
      reasoningEffort = null,
      serviceTier = null,
    }, requestBinding = null) {
      let sessionId = null;
      let launched = null;
      let abandoned = false;
      try {
        const { effectiveSelection, execution } = assertExecutionBinding({
          selectionObservers,
          registries,
          action: "agent.delegate",
          requestBinding,
          args: {
            agent,
            role,
            repo,
            cwd,
            traceId,
            taskId,
            model,
            reasoningEffort,
            serviceTier,
          },
        });
        sessionId = newSessionId();
        assertProviderConfiguration(
          effectiveSelection.provider,
          codexSandbox,
          "delegate",
        );
        const adapter = adapters.get(execution.agent);
        const adapterResult = await withTimeout(
          adapter.delegate({
            cwd: execution.cwd,
            prompt,
            traceId: execution.traceId,
            taskId: execution.taskId,
            targetAction: execution.targetAction,
            role: execution.role,
            repo: execution.repositoryId,
            effectiveSelection,
            ...(requestBinding !== null && requestBinding !== undefined
              ? { requestBinding }
              : {}),
          }).then(async (result) => {
            // Timeout ends the request, not the owned adapter invocation.
            if (abandoned) {
              await settleRequestLaunch(result, false);
            }
            return result;
          }).catch((error) => {
            if (abandoned) auditServiceError({ traceId, where: "agent.delegate.late_cleanup", err: error });
            throw error;
          }),
          agentTimeout(config),
          "agent.delegate",
        );
        launched = adapterResult;
        revalidateRequestContextBinding(requestBinding);
        await settleRequestLaunch(launched, true);
        revalidateRequestContextBinding(requestBinding);
        const result = assertAdapterSelectionResult(
          "delegate",
          adapterResult,
          effectiveSelection,
          codexSandbox,
        );
        createSessionIfTaskProvided({
          sessionId,
          taskId: execution.taskId,
          traceId: execution.traceId,
          agent: execution.agent,
          role: execution.role,
          tmuxTarget: null,
        });
        auditModelResolved({
          traceId: execution.traceId,
          sessionId,
          role: execution.role,
          effectiveSelection,
          selectionObservers,
        });
        closeSessionIfPersisted(sessionId, result.exitCode === 0 ? "closed" : "error");
        return Object.freeze({
          ...result,
          sessionId,
          effectiveSelection,
        });
      } catch (err) {
        abandoned = true;
        try { await settleRequestLaunch(launched, false); } catch (cleanupError) {
          auditServiceError({ traceId, where: "agent.delegate.cleanup", err: cleanupError });
        }
        closeSessionIfPersisted(sessionId, "error");
        if (!(err instanceof RequestContextError)) {
          auditServiceError({ traceId, sessionId, where: "agent.delegate", err });
        }
        throw err;
      }
    },

    async spawn({
      agent,
      role,
      repo = null,
      cwd,
      traceId,
      taskId = null,
      model = null,
      reasoningEffort = null,
      serviceTier = null,
    }, requestBinding = null) {
      let launched = null;
      try {
        const { effectiveSelection, execution } = assertExecutionBinding({
          selectionObservers,
          registries,
          action: "agent.spawn",
          requestBinding,
          args: {
            agent,
            role,
            repo,
            cwd,
            traceId,
            taskId,
            model,
            reasoningEffort,
            serviceTier,
          },
        });
        assertProviderConfiguration(
          effectiveSelection.provider,
          codexSandbox,
          "spawn",
        );
        const adapter = adapters.get(execution.agent);
        const adapterResult = await adapter.spawn({
          cwd: execution.cwd,
          traceId: execution.traceId,
          taskId: execution.taskId,
          targetAction: execution.targetAction,
          role: execution.role,
          repo: execution.repositoryId,
          effectiveSelection,
          ...(requestBinding !== null && requestBinding !== undefined
            ? { requestBinding }
            : {}),
        });
        launched = adapterResult;
        revalidateRequestContextBinding(requestBinding);
        const result = assertAdapterSelectionResult(
          "spawn",
          adapterResult,
          effectiveSelection,
          codexSandbox,
        );
        createSessionIfTaskProvided({
          sessionId: result.sessionId,
          taskId: execution.taskId,
          traceId: execution.traceId,
          agent: execution.agent,
          role: execution.role,
          tmuxTarget: result.tmuxTarget,
        });
        auditModelResolved({
          traceId: execution.traceId,
          sessionId: result.sessionId,
          role: execution.role,
          effectiveSelection,
          selectionObservers,
        });
        // The protected tool retains cleanup ownership until durable recording.
        return transferRequestLaunch(launched, Object.freeze({
          ...result,
          effectiveSelection,
        }));
      } catch (err) {
        try { await settleRequestLaunch(launched, false); } catch (cleanupError) {
          auditServiceError({ traceId, where: "agent.spawn.cleanup", err: cleanupError });
        }
        if (!(err instanceof RequestContextError)) {
          auditServiceError({ traceId, where: "agent.spawn", err });
        }
        throw err;
      }
    },

    async ask({ sessionId, prompt, traceId }, requestBinding = null) {
      const row = sessionRepo.getSessionById(sessionId);
      if (!row) throw unknownSession(sessionId);
      const adapter = adapters.get(row.agent);
      const before = await bestEffortView(adapter, row);
      revalidateRequestContextBinding(requestBinding);
      recordExpectedAsk(sessionId, before?.snapshot || "", {});
      const result = await withTimeout(
        adapter.ask({
          tmuxTarget: row.tmux_target,
          prompt,
          traceId,
          role: row.role,
        }),
        agentTimeout(config),
        "agent.ask",
      );
      revalidateRequestContextBinding(requestBinding);
      bestEffortInterventionCheck({ sessionId, currentSnapshot: result.snapshot, traceId });
      return result;
    },

    async view({ sessionId, traceId = null }, requestBinding = null) {
      const row = sessionRepo.getSessionById(sessionId);
      if (!row) throw unknownSession(sessionId);
      const result = await adapters.get(row.agent).view({ tmuxTarget: row.tmux_target });
      revalidateRequestContextBinding(requestBinding);
      bestEffortInterventionCheck({ sessionId, currentSnapshot: result.snapshot, traceId });
      return result;
    },

    async kill({ sessionId, traceId }, requestBinding = null) {
      const row = sessionRepo.getSessionById(sessionId);
      if (!row) throw unknownSession(sessionId);
      const result = await adapters.get(row.agent).kill({
        tmuxTarget: row.tmux_target,
        traceId,
        role: row.role,
      });
      revalidateRequestContextBinding(requestBinding);
      sessionRepo.setSessionStatus(sessionId, "closed", nowIso());
      return result;
    },
  };
}

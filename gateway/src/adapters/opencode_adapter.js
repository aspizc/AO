import { spawnSync } from "node:child_process";
import { BaseAdapter, assertSafeCwd, workerEnv } from "./base_adapter.js";
import { buildTmuxTarget } from "./session_naming.js";
import {
  buildCapturePaneCmd,
  buildKillSessionCmd,
  buildNewSessionCmd,
  isTmuxAvailable,
  tmuxSync,
} from "./tmux_client.js";
import { append as auditAppend } from "../core/audit.js";
import {
  evaluate,
  resolveAgentExecutionProfile,
  resolveCliWriteAccess,
} from "../core/policy_engine.js";
import { consumeEffectiveAgentSelection } from "../core/orchestrator_profile.js";
import {
  RequestContextError,
  assertServerOwnedExecutionBinding,
} from "../core/request_context.js";
import { assertModelCredentials, localBaseUrl } from "./model_credentials.js";

const AGENT_ID = "opencode";
const DEFAULT_TIMEOUT_MS = 600_000;

function isDryRun(config) {
  return config?.dryRun === true || process.env.AGENTS_DRY_RUN === "1";
}

function opencodeBin(config) {
  return config?.opencodeBin || process.env.AGENTS_OPENCODE_BIN || "opencode";
}

/**
 * opencode asks the operator to approve each action unless it is told not to.
 * That prompt is right for a watched pane and wrong for a headless run, so the
 * bypass is opt-in through AGENTS_OPENCODE_AUTO rather than on by default.
 */
function autoApprove(config) {
  return config?.opencodeAuto === true || process.env.AGENTS_OPENCODE_AUTO === "1";
}

/**
 * opencode runs non-interactively as `opencode run`, takes the model as
 * `-m <provider/model>` and emits raw events with `--format json`. The registry
 * declares no effort dimension for this agent because `--variant` is
 * provider-specific, but it is forwarded when a caller does resolve one.
 */
function buildOpencodeArgs(config, { model = null, reasoningEffort = null, writeAccess, prompt = null } = {}) {
  const args = ["run"];
  if (model) args.push("-m", model);
  if (reasoningEffort) args.push("--variant", reasoningEffort);
  args.push("--format", "json");
  if (writeAccess && autoApprove(config)) args.push("--auto");
  if (!writeAccess) args.push("--agent", "plan");
  if (prompt !== null) args.push(prompt);
  return args;
}

function buildOpencodeLaunch(config, { model = null, reasoningEffort = null, writeAccess } = {}) {
  const launch = [opencodeBin(config)];
  if (model) launch.push("-m", model);
  if (reasoningEffort) launch.push("--variant", reasoningEffort);
  if (writeAccess && autoApprove(config)) launch.push("--auto");
  if (!writeAccess) launch.push("--agent", "plan");
  return launch;
}

/**
 * A local model is reached over an OpenAI-compatible endpoint, so the base URL
 * travels to the child as an env var rather than as an argv flag.
 */
function childEnv(model, base = process.env) {
  const url = localBaseUrl(model, base);
  if (!url) return { ...base };
  return { ...base, OLLAMA_BASE_URL: url, OLLAMA_HOST: url };
}

function effectiveModel(decision, consumer, agentId) {
  const selection = consumeEffectiveAgentSelection(decision.effectiveSelection, {
    agent: agentId,
    consumer,
  });
  return {
    model: selection.model,
    reasoningEffort: selection.reasoningEffort,
  };
}

function assertSuppliedSelection({
  effectiveSelection,
  model,
  reasoningEffort,
  serviceTier,
}, consumer, agentId) {
  if (effectiveSelection === null || effectiveSelection === undefined) return;
  consumeEffectiveAgentSelection(effectiveSelection, {
    agent: agentId,
    consumer,
    rawSelection: { model, reasoningEffort, serviceTier },
  });
}

function auditSessionStarted({ traceId, agentId, role, mode, writeAccess, tmuxTarget = null }) {
  auditAppend({
    type: "SESSION_STARTED",
    traceId,
    agent: agentId || AGENT_ID,
    role,
    mode,
    writeAccess,
    tmuxTarget,
  });
}

function auditSessionClosed({ traceId, agentId, role, mode, exitCode = null, tmuxTarget = null }) {
  auditAppend({
    type: "SESSION_CLOSED",
    traceId,
    agent: agentId || AGENT_ID,
    role,
    exitCode,
    mode,
    tmuxTarget,
  });
}

function auditSessionInput({ traceId, agentId, role, tmuxTarget, prompt }) {
  auditAppend({
    type: "SESSION_INPUT",
    traceId,
    agent: agentId || AGENT_ID,
    role,
    tmuxTarget,
    prompt: String(prompt).slice(0, 200),
  });
}

function auditAdapterError({ traceId, agentId, role, where, err }) {
  auditAppend({
    type: "ERROR",
    traceId,
    agent: agentId || AGENT_ID,
    role,
    where,
    error: String(err?.message || err),
    policy: err?.policy || null,
    code: err?.code || null,
  });
}

function preflight(adapter, ctx) {
  const result = evaluate(ctx, adapter.registries);
  return assertPolicyAllowed(result);
}

function assertPolicyAllowed(result) {
  if (result.decision !== "allow") {
    const err = new Error("request denied by policy");
    err.code = "POLICY_DENIED";
    err.decision = result;
    err.policy = result;
    throw err;
  }
  return result;
}

function assertTmuxOk(result, action) {
  if (result.status !== 0) {
    throw new Error(`tmux ${action} failed: ${result.stderr || result.error?.message || "unknown error"}`);
  }
}

export class OpencodeAdapter extends BaseAdapter {
  constructor(opts = {}) {
    super({ id: opts.id || AGENT_ID, ...opts });
  }

  async delegate({
    cwd,
    prompt,
    traceId,
    taskId = null,
    targetAction = null,
    role,
    repo = null,
    model = null,
    reasoningEffort = null,
    serviceTier = null,
    effectiveSelection = null,
    requestBinding = null,
  }) {
    try {
      const hasRequestBinding =
        requestBinding !== null && requestBinding !== undefined;
      if (hasRequestBinding) {
        assertServerOwnedExecutionBinding(requestBinding, {
          action: "agent.delegate",
          agent: this.id,
          role,
          repositoryId: repo,
          traceId,
          taskId,
          cwd,
          targetAction,
        });
      }
      assertSuppliedSelection({
        effectiveSelection,
        model,
        reasoningEffort,
        serviceTier,
      }, "delegate", this.id);
      const decision = hasRequestBinding
        ? assertPolicyAllowed(resolveAgentExecutionProfile({
            agent: this.id,
            effectiveSelection,
            model,
            reasoningEffort,
            serviceTier,
          }, this.registries))
        : preflight(this, {
            agent: this.id,
            role,
            action: "agent.delegate",
            repo,
            model,
            reasoningEffort,
            serviceTier,
            effectiveSelection,
          });
      const writeAccess = resolveCliWriteAccess({ agent: this.id, role, repo }, this.registries);
      const {
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
      } = effectiveModel(decision, "delegate", this.id);
      assertModelCredentials(effectiveModelValue);
      const safeCwd = assertSafeCwd(cwd, this.config.repoRoots);
      const markers = workerEnv({ role, traceId, taskId });
      auditSessionStarted({ traceId, agentId: this.id, role, writeAccess, mode: "headless" });

      if (isDryRun(this.config)) {
        const result = {
          stdout:
            `[dry-run ${this.id}${effectiveModelValue ? ` model=${effectiveModelValue}` : ""}` +
            `${effectiveReasoningEffort ? ` variant=${effectiveReasoningEffort}` : ""}]\n` +
            `prompt=${prompt}\ncwd=${safeCwd}`,
          stderr: "",
          exitCode: 0,
          dryRun: true,
          model: effectiveModelValue,
          reasoningEffort: effectiveReasoningEffort,
          effectiveSelection: decision.effectiveSelection,
          writeAccess,
        };
        auditSessionClosed({ traceId, agentId: this.id, role, mode: "headless", exitCode: result.exitCode });
        return result;
      }

      const proc = spawnSync(
        opencodeBin(this.config),
        buildOpencodeArgs(this.config, {
          model: effectiveModelValue,
          reasoningEffort: effectiveReasoningEffort,
          writeAccess,
          prompt,
        }),
        {
          cwd: safeCwd,
          encoding: "utf-8",
          env: { ...childEnv(effectiveModelValue), ...markers },
          timeout: this.config.adapterTimeoutMs || DEFAULT_TIMEOUT_MS,
        },
      );
      const result = {
        stdout: proc.stdout || "",
        stderr: proc.stderr || String(proc.error?.message || ""),
        exitCode: proc.status ?? -1,
        dryRun: false,
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
        effectiveSelection: decision.effectiveSelection,
        writeAccess,
      };
      auditSessionClosed({ traceId, agentId: this.id, role, mode: "headless", exitCode: result.exitCode });
      return result;
    } catch (err) {
      if (
        !(err instanceof RequestContextError)
        && err?.code !== "EFFECTIVE_SELECTION_INVALID"
      ) {
        auditAdapterError({ traceId, agentId: this.id, role, where: "delegate", err });
      }
      throw err;
    }
  }

  async spawn({
    cwd,
    traceId,
    taskId = null,
    targetAction = null,
    role,
    repo = null,
    model = null,
    reasoningEffort = null,
    serviceTier = null,
    effectiveSelection = null,
    requestBinding = null,
  }) {
    try {
      const hasRequestBinding =
        requestBinding !== null && requestBinding !== undefined;
      if (hasRequestBinding) {
        assertServerOwnedExecutionBinding(requestBinding, {
          action: "agent.spawn",
          agent: this.id,
          role,
          repositoryId: repo,
          traceId,
          taskId,
          cwd,
          targetAction,
        });
      }
      assertSuppliedSelection({
        effectiveSelection,
        model,
        reasoningEffort,
        serviceTier,
      }, "spawn", this.id);
      const decision = hasRequestBinding
        ? assertPolicyAllowed(resolveAgentExecutionProfile({
            agent: this.id,
            effectiveSelection,
            model,
            reasoningEffort,
            serviceTier,
          }, this.registries))
        : preflight(this, {
            agent: this.id,
            role,
            action: "agent.spawn",
            repo,
            model,
            reasoningEffort,
            serviceTier,
            effectiveSelection,
          });
      const writeAccess = resolveCliWriteAccess({ agent: this.id, role, repo }, this.registries);
      const {
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
      } = effectiveModel(decision, "spawn", this.id);
      assertModelCredentials(effectiveModelValue);
      const safeCwd = assertSafeCwd(cwd, this.config.repoRoots);
      const markers = workerEnv({ role, traceId, taskId });
      const tmuxTarget = buildTmuxTarget({
        traceId,
        agent: this.id,
        role,
        prefix: this.config.tmuxPrefix,
      });
      const dryRun = isDryRun(this.config);
      const launchCommand = buildOpencodeLaunch(this.config, {
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
        writeAccess,
      }).join(" ");

      const newSessionArgv = Object.freeze(buildNewSessionCmd({ target: tmuxTarget, cwd: safeCwd, env: markers }));

      if (!dryRun) {
        if (!isTmuxAvailable()) throw new Error("tmux is required for opencode supervised mode");
        assertTmuxOk(tmuxSync(newSessionArgv), "new-session");
        await this.submitLaunchCommand({ tmuxTarget, line: launchCommand });
      }

      auditSessionStarted({ traceId, agentId: this.id, role, writeAccess, mode: "supervised", tmuxTarget });
      return {
        sessionId: tmuxTarget,
        tmuxTarget,
        attachCommand: `tmux attach -t ${tmuxTarget}`,
        launchCommand,
        newSessionArgv,
        dryRun,
        effectiveSelection: decision.effectiveSelection,
        writeAccess,
      };
    } catch (err) {
      if (
        !(err instanceof RequestContextError)
        && err?.code !== "EFFECTIVE_SELECTION_INVALID"
      ) {
        auditAdapterError({ traceId, agentId: this.id, role, where: "spawn", err });
      }
      throw err;
    }
  }

  async ask({ tmuxTarget, prompt, traceId, role, repo = null }) {
    try {
      preflight(this, { agent: this.id, role, action: "agent.ask", repo });
      if (isDryRun(this.config)) {
        auditSessionInput({ traceId, agentId: this.id, role, tmuxTarget, prompt });
        return { snapshot: `[dry-run ${this.id} ask]\n${prompt}\n[ok]`, dryRun: true };
      }

      const result = await this.submitPrompt({ tmuxTarget, prompt });
      this.auditPromptSubmission({ traceId, role, tmuxTarget, prompt });
      return result;
    } catch (err) {
      auditAdapterError({ traceId, agentId: this.id, role, where: "ask", err });
      throw err;
    }
  }

  async view({ tmuxTarget }) {
    if (isDryRun(this.config)) {
      return { snapshot: `[dry-run ${this.id} view]`, dryRun: true };
    }

    const captured = tmuxSync(buildCapturePaneCmd({ target: tmuxTarget, lines: 400 }));
    assertTmuxOk(captured, "capture-pane");
    return { snapshot: captured.stdout || "", dryRun: false };
  }

  async kill({ tmuxTarget, traceId, role }) {
    const dryRun = isDryRun(this.config);
    if (!dryRun) {
      assertTmuxOk(tmuxSync(buildKillSessionCmd({ target: tmuxTarget })), "kill-session");
    }

    auditSessionClosed({ traceId, agentId: this.id, role, mode: "supervised", tmuxTarget });
    return { closed: true, dryRun };
  }
}

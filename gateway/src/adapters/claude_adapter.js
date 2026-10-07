import { spawnSync } from "node:child_process";
import { BaseAdapter, assertSafeCwd } from "./base_adapter.js";
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
} from "../core/policy_engine.js";
import { consumeEffectiveAgentSelection } from "../core/orchestrator_profile.js";
import {
  RequestContextError,
  assertServerOwnedExecutionBinding,
} from "../core/request_context.js";

const AGENT_ID = "claude-code";
const DEFAULT_TIMEOUT_MS = 600_000;

function isDryRun(config) {
  return config?.dryRun === true || process.env.AGENTS_DRY_RUN === "1";
}

function claudeBin(config) {
  return config?.claudeBin || process.env.AGENTS_CLAUDE_BIN || "claude";
}

function buildClaudeArgs({ model = null, reasoningEffort = null, prompt = null } = {}) {
  const args = [
    "--print",
    "--output-format",
    "json",
    "--permission-mode",
    "dontAsk",
    "--no-session-persistence",
  ];
  if (model) args.push("--model", model);
  if (reasoningEffort) args.push("--effort", reasoningEffort);
  if (prompt !== null) args.push(prompt);
  return args;
}

function buildClaudeLaunch(config, { model = null, reasoningEffort = null } = {}) {
  const launch = [claudeBin(config)];
  if (model) launch.push("--model", model);
  if (reasoningEffort) launch.push("--effort", reasoningEffort);
  return launch;
}

function effectiveModel(decision, consumer) {
  const selection = consumeEffectiveAgentSelection(
    decision.effectiveSelection,
    {
      agent: AGENT_ID,
      consumer,
    },
  );
  return {
    model: selection.model,
    reasoningEffort: selection.reasoningEffort,
  };
}

function auditSessionStarted({ traceId, role, mode, tmuxTarget = null }) {
  auditAppend({
    type: "SESSION_STARTED",
    traceId,
    agent: AGENT_ID,
    role,
    mode,
    tmuxTarget,
  });
}

function auditSessionClosed({ traceId, role, mode, exitCode = null, tmuxTarget = null }) {
  auditAppend({
    type: "SESSION_CLOSED",
    traceId,
    agent: AGENT_ID,
    role,
    exitCode,
    mode,
    tmuxTarget,
  });
}

function auditSessionInput({ traceId, role, tmuxTarget, prompt }) {
  auditAppend({
    type: "SESSION_INPUT",
    traceId,
    agent: AGENT_ID,
    role,
    tmuxTarget,
    prompt: String(prompt).slice(0, 200),
  });
}

function auditAdapterError({ traceId, role, where, err }) {
  auditAppend({
    type: "ERROR",
    traceId,
    agent: AGENT_ID,
    role,
    where,
    error: String(err?.message || err),
    policy: err?.policy || null,
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

function assertSuppliedSelection({
  effectiveSelection,
  model,
  reasoningEffort,
  serviceTier,
}, consumer) {
  if (effectiveSelection === null || effectiveSelection === undefined) return;
  consumeEffectiveAgentSelection(effectiveSelection, {
    agent: AGENT_ID,
    consumer,
    rawSelection: { model, reasoningEffort, serviceTier },
  });
}

function assertTmuxOk(result, action) {
  if (result.status !== 0) {
    throw new Error(`tmux ${action} failed: ${result.stderr || result.error?.message || "unknown error"}`);
  }
}

export class ClaudeAdapter extends BaseAdapter {
  constructor(opts) {
    super({ id: AGENT_ID, ...opts });
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
          agent: AGENT_ID,
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
      }, "delegate");
      const decision = hasRequestBinding
        ? assertPolicyAllowed(resolveAgentExecutionProfile({
            agent: AGENT_ID,
            effectiveSelection,
            model,
            reasoningEffort,
            serviceTier,
          }, this.registries))
        : preflight(this, {
            agent: AGENT_ID,
            role,
            action: "agent.delegate",
            repo,
            model,
            reasoningEffort,
            serviceTier,
            effectiveSelection,
          });
      const {
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
      } = effectiveModel(decision, "delegate");
      const safeCwd = assertSafeCwd(cwd, this.config.repoRoots);
      auditSessionStarted({ traceId, role, mode: "headless" });

      if (isDryRun(this.config)) {
        const result = {
          stdout:
            `[dry-run claude${effectiveModelValue ? ` model=${effectiveModelValue}` : ""}` +
            `${effectiveReasoningEffort ? ` effort=${effectiveReasoningEffort}` : ""}]\n` +
            `prompt=${prompt}\ncwd=${safeCwd}`,
          stderr: "",
          exitCode: 0,
          dryRun: true,
          model: effectiveModelValue,
          reasoningEffort: effectiveReasoningEffort,
          effectiveSelection: decision.effectiveSelection,
        };
        auditSessionClosed({ traceId, role, mode: "headless", exitCode: result.exitCode });
        return result;
      }

      const proc = spawnSync(
        claudeBin(this.config),
        buildClaudeArgs({
          model: effectiveModelValue,
          reasoningEffort: effectiveReasoningEffort,
          prompt,
        }),
        {
          cwd: safeCwd,
          encoding: "utf-8",
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
      };
      auditSessionClosed({ traceId, role, mode: "headless", exitCode: result.exitCode });
      return result;
    } catch (err) {
      if (
        !(err instanceof RequestContextError)
        && err?.code !== "EFFECTIVE_SELECTION_INVALID"
      ) {
        auditAdapterError({ traceId, role, where: "delegate", err });
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
          agent: AGENT_ID,
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
      }, "spawn");
      const decision = hasRequestBinding
        ? assertPolicyAllowed(resolveAgentExecutionProfile({
            agent: AGENT_ID,
            effectiveSelection,
            model,
            reasoningEffort,
            serviceTier,
          }, this.registries))
        : preflight(this, {
            agent: AGENT_ID,
            role,
            action: "agent.spawn",
            repo,
            model,
            reasoningEffort,
            serviceTier,
            effectiveSelection,
          });
      const {
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
      } = effectiveModel(decision, "spawn");
      const safeCwd = assertSafeCwd(cwd, this.config.repoRoots);
      const tmuxTarget = buildTmuxTarget({
        traceId,
        agent: AGENT_ID,
        role,
        prefix: this.config.tmuxPrefix,
      });
      const dryRun = isDryRun(this.config);
      const launchCommand = buildClaudeLaunch(this.config, {
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
      }).join(" ");

      if (!dryRun) {
        if (!isTmuxAvailable()) throw new Error("tmux is required for claude supervised mode");
        assertTmuxOk(tmuxSync(buildNewSessionCmd({ target: tmuxTarget, cwd: safeCwd })), "new-session");
        await this.submitLaunchCommand({ tmuxTarget, line: launchCommand });
      }

      auditSessionStarted({ traceId, role, mode: "supervised", tmuxTarget });
      return {
        sessionId: tmuxTarget,
        tmuxTarget,
        attachCommand: `tmux attach -t ${tmuxTarget}`,
        launchCommand,
        dryRun,
        effectiveSelection: decision.effectiveSelection,
      };
    } catch (err) {
      if (
        !(err instanceof RequestContextError)
        && err?.code !== "EFFECTIVE_SELECTION_INVALID"
      ) {
        auditAdapterError({ traceId, role, where: "spawn", err });
      }
      throw err;
    }
  }

  async ask({ tmuxTarget, prompt, traceId, role, repo = null }) {
    try {
      preflight(this, { agent: AGENT_ID, role, action: "agent.ask", repo });
      if (isDryRun(this.config)) {
        auditSessionInput({ traceId, role, tmuxTarget, prompt });
        return { snapshot: `[dry-run claude ask]\n${prompt}\n[ok]`, dryRun: true };
      }

      const result = await this.submitPrompt({ tmuxTarget, prompt });
      this.auditPromptSubmission({ traceId, role, tmuxTarget, prompt });
      return result;
    } catch (err) {
      auditAdapterError({ traceId, role, where: "ask", err });
      throw err;
    }
  }

  async view({ tmuxTarget }) {
    if (isDryRun(this.config)) {
      return { snapshot: "[dry-run claude view]", dryRun: true };
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

    auditSessionClosed({ traceId, role, mode: "supervised", tmuxTarget });
    return { closed: true, dryRun };
  }
}

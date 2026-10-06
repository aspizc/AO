import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BaseAdapter, assertSafeCwd } from "./base_adapter.js";
import { buildTmuxTarget } from "./session_naming.js";
import {
  buildCapturePaneCmd,
  buildKillSessionCmd,
  buildNewSessionCmd,
  buildSendKeysCmd,
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

const AGENT_ID = "codex";
const DEFAULT_TIMEOUT_MS = 600_000;

function isDryRun(config) {
  return config?.dryRun === true || process.env.AGENTS_DRY_RUN === "1";
}

function codexBin(config) {
  return config?.codexBin || process.env.AGENTS_CODEX_BIN || "codex";
}

function codexSandbox(config) {
  return config?.codexSandbox || process.env.AGENTS_CODEX_SANDBOX || "workspace-write";
}

function buildCodexExecArgs({ model, reasoningEffort, serviceTier, sandbox, cwd, prompt }) {
  const args = ["exec"];
  if (model) args.push("-m", model);
  if (reasoningEffort) args.push("-c", `model_reasoning_effort="${reasoningEffort}"`);
  if (serviceTier) args.push("-c", `service_tier="${serviceTier}"`);
  args.push("-s", sandbox, "-C", cwd, prompt);
  return args;
}

function buildCodexLaunch({ bin, model, reasoningEffort, serviceTier, sandbox, cwd }) {
  const args = [bin];
  if (model) args.push("-m", model);
  if (reasoningEffort) args.push("-c", `model_reasoning_effort="${reasoningEffort}"`);
  if (serviceTier) args.push("-c", `service_tier="${serviceTier}"`);
  args.push("-s", sandbox, "-C", cwd);
  return args;
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
    serviceTier: selection.serviceTier,
  };
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

function realpathIfExists(value) {
  try {
    return fs.realpathSync(value);
  } catch (_err) {
    return path.resolve(value);
  }
}

function pathContains(parent, child) {
  return child === parent || child.startsWith(`${parent}${path.sep}`);
}

function repoRootCandidates({ safeCwd, repo, repoRoots }) {
  const roots = Array.isArray(repoRoots) ? repoRoots : [];
  const candidates = [];
  for (const root of roots) {
    const resolvedRoot = realpathIfExists(root);
    if (pathContains(resolvedRoot, safeCwd)) candidates.push(resolvedRoot);

    if (repo) {
      const nestedRepoRoot = realpathIfExists(path.join(resolvedRoot, repo));
      if (pathContains(nestedRepoRoot, safeCwd)) candidates.push(nestedRepoRoot);
    }
  }
  return candidates.sort((a, b) => b.length - a.length);
}

function assertCodexCwdDoesNotExposeExcludedPaths({ safeCwd, repo, registries, config }) {
  if (!repo) return;
  const repoConfig = registries.getRepo(repo);
  if (!Array.isArray(repoConfig?.excludedPaths) || repoConfig.excludedPaths.length === 0) return;

  const [repoRoot] = repoRootCandidates({ safeCwd, repo, repoRoots: config.repoRoots });
  if (!repoRoot) return;

  for (const excludedPath of repoConfig.excludedPaths) {
    const excludedRoot = path.resolve(repoRoot, String(excludedPath));
    if (pathContains(safeCwd, excludedRoot) || pathContains(excludedRoot, safeCwd)) {
      const err = new Error(`codex cwd ${safeCwd} exposes excluded path ${excludedRoot}`);
      err.code = "EXCLUDED_PATH_EXPOSED";
      throw err;
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class CodexAdapter extends BaseAdapter {
  constructor(opts) {
    super({ id: AGENT_ID, ...opts });
  }

  checkEnabled() {
    const enabled = this.registries.getAgent(AGENT_ID)?.enabled === true;
    if (!enabled) {
      const err = new Error(
        "codex adapter is disabled in registry. Enable codex and set AGENTS_CODEX_BIN before use.",
      );
      err.code = "ADAPTER_DISABLED";
      throw err;
    }
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
      this.checkEnabled();
      const safeCwd = assertSafeCwd(cwd, this.config.repoRoots);
      assertCodexCwdDoesNotExposeExcludedPaths({
        safeCwd,
        repo,
        registries: this.registries,
        config: this.config,
      });
      const {
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
        serviceTier: effectiveServiceTier,
      } = effectiveModel(decision, "delegate");
      const sandbox = codexSandbox(this.config);
      auditAppend({ type: "SESSION_STARTED", traceId, agent: AGENT_ID, role, mode: "headless" });

      const result = isDryRun(this.config)
        ? {
            stdout:
              `[dry-run codex${effectiveModelValue ? ` model=${effectiveModelValue}` : ""}` +
              `${effectiveReasoningEffort ? ` effort=${effectiveReasoningEffort}` : ""}` +
              `${effectiveServiceTier ? ` serviceTier=${effectiveServiceTier}` : ""} sandbox=${sandbox}]\n` +
              `prompt=${prompt}\ncwd=${safeCwd}`,
            stderr: "",
            exitCode: 0,
            dryRun: true,
            model: effectiveModelValue,
            reasoningEffort: effectiveReasoningEffort,
            serviceTier: effectiveServiceTier,
            effectiveSelection: decision.effectiveSelection,
            sandbox,
          }
        : (() => {
            const proc = spawnSync(
              codexBin(this.config),
              buildCodexExecArgs({
                model: effectiveModelValue,
                reasoningEffort: effectiveReasoningEffort,
                serviceTier: effectiveServiceTier,
                sandbox,
                cwd: safeCwd,
                prompt,
              }),
              {
                cwd: safeCwd,
                encoding: "utf-8",
                timeout: this.config.adapterTimeoutMs || DEFAULT_TIMEOUT_MS,
              },
            );
            return {
              stdout: proc.stdout || "",
              stderr: proc.stderr || String(proc.error?.message || ""),
              exitCode: proc.error ? -1 : (proc.status ?? -1),
              dryRun: false,
              model: effectiveModelValue,
              reasoningEffort: effectiveReasoningEffort,
              serviceTier: effectiveServiceTier,
              effectiveSelection: decision.effectiveSelection,
              sandbox,
            };
          })();
      auditAppend({
        type: "SESSION_CLOSED",
        traceId,
        agent: AGENT_ID,
        role,
        exitCode: result.exitCode,
        mode: "headless",
      });
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
      this.checkEnabled();
      const safeCwd = assertSafeCwd(cwd, this.config.repoRoots);
      assertCodexCwdDoesNotExposeExcludedPaths({
        safeCwd,
        repo,
        registries: this.registries,
        config: this.config,
      });
      const {
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
        serviceTier: effectiveServiceTier,
      } = effectiveModel(decision, "spawn");
      const sandbox = codexSandbox(this.config);
      const tmuxTarget = buildTmuxTarget({
        traceId,
        agent: AGENT_ID,
        role,
        prefix: this.config.tmuxPrefix,
      });
      const launchCommand = buildCodexLaunch({
        bin: codexBin(this.config),
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
        serviceTier: effectiveServiceTier,
        sandbox,
        cwd: safeCwd,
      }).join(" ");
      const dryRun = isDryRun(this.config);

      if (!dryRun) {
        if (!isTmuxAvailable()) throw new Error("tmux is required for codex supervised mode");
        assertTmuxOk(tmuxSync(buildNewSessionCmd({ target: tmuxTarget, cwd: safeCwd })), "new-session");
        assertTmuxOk(tmuxSync(buildSendKeysCmd({ target: tmuxTarget, line: launchCommand })), "send-keys");
      }

      auditAppend({
        type: "SESSION_STARTED",
        traceId,
        agent: AGENT_ID,
        role,
        mode: "supervised",
        tmuxTarget,
      });
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
      this.checkEnabled();
      preflight(this, { agent: AGENT_ID, role, action: "agent.ask", repo });
      if (isDryRun(this.config)) {
        auditSessionInput({ traceId, role, tmuxTarget, prompt });
        return { snapshot: `[dry-run codex ask]\n${prompt}\n[ok]`, dryRun: true };
      }

      assertTmuxOk(tmuxSync(buildSendKeysCmd({ target: tmuxTarget, line: prompt })), "send-keys");
      await sleep(this.config.tmuxAskDelayMs || 1500);
      const captured = tmuxSync(buildCapturePaneCmd({ target: tmuxTarget, lines: 400 }));
      assertTmuxOk(captured, "capture-pane");
      auditSessionInput({ traceId, role, tmuxTarget, prompt });
      return { snapshot: captured.stdout || "", dryRun: false };
    } catch (err) {
      auditAdapterError({ traceId, role, where: "ask", err });
      throw err;
    }
  }

  async view({ tmuxTarget } = {}) {
    this.checkEnabled();
    if (isDryRun(this.config)) {
      return { snapshot: "[dry-run codex view]", dryRun: true };
    }

    const captured = tmuxSync(buildCapturePaneCmd({ target: tmuxTarget, lines: 400 }));
    assertTmuxOk(captured, "capture-pane");
    return { snapshot: captured.stdout || "", dryRun: false };
  }

  async kill({ tmuxTarget, traceId, role }) {
    try {
      this.checkEnabled();
      const dryRun = isDryRun(this.config);
      if (!dryRun) {
        assertTmuxOk(tmuxSync(buildKillSessionCmd({ target: tmuxTarget })), "kill-session");
      }

      auditAppend({
        type: "SESSION_CLOSED",
        traceId,
        agent: AGENT_ID,
        role,
        tmuxTarget,
        mode: "supervised",
      });
      return { closed: true, dryRun };
    } catch (err) {
      auditAdapterError({ traceId, role, where: "kill", err });
      throw err;
    }
  }
}

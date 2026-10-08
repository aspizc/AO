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

export function recognizeClaudePrompt(snapshot) {
  if (typeof snapshot !== "string" || Array.from(snapshot).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 8 || (code >= 11 && code <= 31);
  })) return null;
  const rows = snapshot.split("\n").map((row) => row.trimEnd());
  const title = rows.findLastIndex((row) => row.trim() === "Bash command");
  if (title < 0) return null;
  const tail = rows.slice(title);
  const question = tail.findIndex((row) => row.trim() === "Do you want to proceed?");
  if (question < 0 || !/^\s*❯ 1\. Yes$/.test(tail[question + 1] || "")) return null;
  const four = /^\s*2\. Yes, and always allow access to \/.+ from this project$/.test(tail[question + 2] || "")
    && /^\s*3\. Yes, and switch to auto mode · auto mode handles these prompts for you$/.test(tail[question + 3] || "");
  if (!four && !/^\s*2\. Yes, and don't ask again for .+$/.test(tail[question + 2] || "")) return null;
  const denyIndex = question + (four ? 4 : 3);
  if (!(new RegExp(`^\\s*${four ? 4 : 3}\\. No$`)).test(tail[denyIndex] || "")
    || tail.slice(denyIndex + 1).some((row) => row.trim() && row.trim() !== "Esc to cancel · Tab to amend")) return null;
  const content = tail.slice(1, question).filter((row) => row.trim());
  let command;
  if (four) {
    const separators = content.map((row, index) => /^╌+$/.test(row) ? index : -1).filter((index) => index >= 0);
    if (separators.length !== 2 || separators[0] !== 2 || separators[1] !== content.length - 1
      || content[0] !== ' Tip: auto mode handles these prompts for you — choose "switch to auto mode" below'
      || !/^ \S/.test(content[1])) return null;
    const commandRows = content.slice(separators[0] + 1, separators[1]);
    if (!commandRows.length || commandRows.some((row) => !/^ \S/.test(row))) return null;
    command = commandRows.map((row) => row.slice(1)).join("\n");
  } else {
    if (content.length !== 2 || !/^ {2}\S/.test(content[0]) || !/^ {2}\S/.test(content[1])) return null;
    command = content[0].slice(2);
  }
  return { kind: "permission", command, options: four ? ["1", "2", "3", "4"] : ["1", "2", "3"] };
}

const AGENT_ID = "claude-code";
const DEFAULT_TIMEOUT_MS = 600_000;

function isDryRun(config) {
  return config?.dryRun === true || process.env.AGENTS_DRY_RUN === "1";
}

function claudeBin(config) {
  return config?.claudeBin || process.env.AGENTS_CLAUDE_BIN || "claude";
}

function buildClaudeArgs({ model = null, reasoningEffort = null, writeAccess, prompt = null } = {}) {
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
  if (!writeAccess) args.push("--disallowedTools", "Edit", "Write", "NotebookEdit");
  if (prompt !== null) args.push(prompt);
  return args;
}

function buildClaudeLaunch(config, { model = null, reasoningEffort = null, writeAccess } = {}) {
  const launch = [claudeBin(config)];
  if (model) launch.push("--model", model);
  if (reasoningEffort) launch.push("--effort", reasoningEffort);
  if (!writeAccess) launch.push("--disallowedTools", "Edit", "Write", "NotebookEdit");
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

function auditSessionStarted({ traceId, role, mode, writeAccess, tmuxTarget = null }) {
  auditAppend({
    type: "SESSION_STARTED",
    traceId,
    agent: AGENT_ID,
    role,
    mode,
    writeAccess,
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
      const writeAccess = resolveCliWriteAccess({ agent: AGENT_ID, role, repo }, this.registries);
      const {
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
      } = effectiveModel(decision, "delegate");
      const safeCwd = assertSafeCwd(cwd, this.config.repoRoots);
      const markers = workerEnv({ role, traceId, taskId });
      auditSessionStarted({ traceId, role, writeAccess, mode: "headless" });

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
          writeAccess,
        };
        auditSessionClosed({ traceId, role, mode: "headless", exitCode: result.exitCode });
        return result;
      }

      const proc = spawnSync(
        claudeBin(this.config),
        buildClaudeArgs({
          model: effectiveModelValue,
          reasoningEffort: effectiveReasoningEffort,
          writeAccess,
          prompt,
        }),
        {
          cwd: safeCwd,
          encoding: "utf-8",
          env: { ...process.env, ...markers },
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
      const writeAccess = resolveCliWriteAccess({ agent: AGENT_ID, role, repo }, this.registries);
      const {
        model: effectiveModelValue,
        reasoningEffort: effectiveReasoningEffort,
      } = effectiveModel(decision, "spawn");
      const safeCwd = assertSafeCwd(cwd, this.config.repoRoots);
      const markers = workerEnv({ role, traceId, taskId });
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
        writeAccess,
      }).join(" ");

      const newSessionArgv = Object.freeze(buildNewSessionCmd({ target: tmuxTarget, cwd: safeCwd, env: markers }));

      if (!dryRun) {
        this.forgetFreshClaudeSpawn({ tmuxTarget });
        if (!isTmuxAvailable()) throw new Error("tmux is required for claude supervised mode");
        assertTmuxOk(tmuxSync(newSessionArgv), "new-session");
        await this.submitLaunchCommand({ tmuxTarget, line: launchCommand });
        // Only an unadorned executable path can establish a fresh plain launch.
        // Configured shell wrappers/arguments may resume history: stay uncertain.
        if (/^[A-Za-z0-9_./-]+$/.test(claudeBin(this.config))) {
          this.rememberFreshClaudeSpawn({ tmuxTarget });
        }
      }

      auditSessionStarted({ traceId, role, writeAccess, mode: "supervised", tmuxTarget });
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

  recognizePrompt(snapshot) { return recognizeClaudePrompt(snapshot); }

  async view({ tmuxTarget }) {
    if (isDryRun(this.config)) {
      return { snapshot: "[dry-run claude view]", dryRun: true };
    }

    const captured = tmuxSync(buildCapturePaneCmd({ target: tmuxTarget, lines: 400 }));
    assertTmuxOk(captured, "capture-pane");
    return { snapshot: captured.stdout || "", dryRun: false };
  }

  async kill({ tmuxTarget, traceId, role }) {
    this.forgetFreshClaudeSpawn({ tmuxTarget });
    const dryRun = isDryRun(this.config);
    if (!dryRun) {
      assertTmuxOk(tmuxSync(buildKillSessionCmd({ target: tmuxTarget })), "kill-session");
    }

    auditSessionClosed({ traceId, role, mode: "supervised", tmuxTarget });
    return { closed: true, dryRun };
  }
}

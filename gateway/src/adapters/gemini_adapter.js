import { spawnSync } from "node:child_process";
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
import { evaluate } from "../core/policy_engine.js";

const AGENT_ID = "gemini-cli";
const DEFAULT_TIMEOUT_MS = 600_000;

function isDryRun(config) {
  return config?.dryRun === true || process.env.AGENTS_DRY_RUN === "1";
}

function auditSessionStarted({ traceId, role }) {
  auditAppend({
    type: "SESSION_STARTED",
    traceId,
    agent: AGENT_ID,
    role,
    mode: "headless",
  });
}

function auditSessionClosed({ traceId, role, exitCode }) {
  auditAppend({
    type: "SESSION_CLOSED",
    traceId,
    agent: AGENT_ID,
    role,
    exitCode,
    mode: "headless",
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
  if (result.decision !== "allow") {
    const err = new Error(`policy denied: ${result.reason}`);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiAdapter extends BaseAdapter {
  constructor(opts) {
    super({ id: AGENT_ID, ...opts });
  }

  async delegate({ cwd, prompt, traceId, role, repo = null }) {
    try {
      preflight(this, { agent: AGENT_ID, role, action: "agent.delegate", repo });
      const safeCwd = assertSafeCwd(cwd, this.config.repoRoots);
      auditSessionStarted({ traceId, role });

      if (isDryRun(this.config)) {
        const result = {
          stdout: `[dry-run]\nprompt=${prompt}\ncwd=${safeCwd}`,
          stderr: "",
          exitCode: 0,
          dryRun: true,
        };
        auditSessionClosed({ traceId, role, exitCode: result.exitCode });
        return result;
      }

      const bin = this.config.geminiBin || "gemini";
      const proc = spawnSync(bin, ["-p", "--yolo", prompt], {
        cwd: safeCwd,
        encoding: "utf-8",
        timeout: this.config.adapterTimeoutMs || DEFAULT_TIMEOUT_MS,
      });
      const result = {
        stdout: proc.stdout || "",
        stderr: proc.stderr || String(proc.error?.message || ""),
        exitCode: proc.status ?? -1,
        dryRun: false,
      };
      auditSessionClosed({ traceId, role, exitCode: result.exitCode });
      return result;
    } catch (err) {
      auditAdapterError({ traceId, role, where: "delegate", err });
      throw err;
    }
  }

  async spawn({ cwd, traceId, role, repo = null }) {
    try {
      preflight(this, { agent: AGENT_ID, role, action: "agent.spawn", repo });
      const safeCwd = assertSafeCwd(cwd, this.config.repoRoots);
      const tmuxTarget = buildTmuxTarget({
        traceId,
        agent: AGENT_ID,
        role,
        prefix: this.config.tmuxPrefix,
      });
      const dryRun = isDryRun(this.config);

      if (!dryRun) {
        if (!isTmuxAvailable()) throw new Error("tmux is required for supervised mode");
        assertTmuxOk(tmuxSync(buildNewSessionCmd({ target: tmuxTarget, cwd: safeCwd })), "new-session");
        assertTmuxOk(
          tmuxSync(buildSendKeysCmd({ target: tmuxTarget, line: this.config.geminiBin || "gemini" })),
          "send-keys",
        );
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
        dryRun,
      };
    } catch (err) {
      auditAdapterError({ traceId, role, where: "spawn", err });
      throw err;
    }
  }

  async ask({ tmuxTarget, prompt, traceId, role, repo = null }) {
    try {
      preflight(this, { agent: AGENT_ID, role, action: "agent.ask", repo });
      if (isDryRun(this.config)) {
        auditSessionInput({ traceId, role, tmuxTarget, prompt });
        return { snapshot: `[dry-run ask]\n${prompt}\n[ok]`, dryRun: true };
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

  async view({ tmuxTarget }) {
    if (isDryRun(this.config)) {
      return { snapshot: "[dry-run view]", dryRun: true };
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

    auditAppend({
      type: "SESSION_CLOSED",
      traceId,
      agent: AGENT_ID,
      role,
      tmuxTarget,
      mode: "supervised",
    });
    return { closed: true, dryRun };
  }
}

import { append as auditAppend } from "../core/audit.js";
import { evaluate } from "../core/policy_engine.js";
import { isCanonicalAction } from "../core/policy_types.js";
import * as sessions from "../core/repositories/session_repo.js";
import * as tasks from "../core/repositories/task_repo.js";
import * as orchestrations from "../core/repositories/orchestration_repo.js";
import * as approvals from "../core/repositories/approval_repo.js";
import { NEVER_AUTO, request, registerPromptResponder, invalidatePromptApproval } from "./approval_service.js";
import { isUnknownPrompt, samePromptCapture, issuePromptAnswer } from "../adapters/session_prompt.js";

export function createSessionPromptWatcher({ adapters, registries, config = {} }) {
  const bindings = new Map();
  const current = new Map();
  const timers = new Map();
  let closed = false;

  function live(sessionId) {
    const row = sessions.getSessionById(sessionId);
    const task = row && tasks.getTaskById(row.task_id);
    const trace = row && orchestrations.getOrchestrationByTraceId(row.trace_id);
    if (!row || !row.tmux_target || row.status !== "running" || !task
      || !["pending", "running", "starting"].includes(task.status) || trace?.status !== "active"
      || task.trace_id !== row.trace_id || task.assigned_agent !== row.agent || task.assigned_role !== row.role
      || !["codex", "claude-code"].includes(row.agent)) return null;
    return { row, task };
  }

  function policy(binding) {
    const context = { agent: binding.agent, role: binding.role, repo: binding.repo };
    const role = registries.getRole(binding.role);
    const scopes = Array.isArray(role?.sessionPromptScopes) ? role.sessionPromptScopes : [];
    const matches = scopes.filter((scope) => scope?.kind === binding.prompt.kind && scope?.command === binding.prompt.command);
    const scope = matches.length === 1 && isCanonicalAction(matches[0].action) ? matches[0] : null;
    const action = `session.prompt.${binding.prompt.kind}`;
    // Unmapped commands are never automatically allowed. Human-granted commands
    // conservatively require write authority; no model or shell-text inference.
    const underlying = scope?.action || (binding.prompt.kind === "trust" ? action : "code.write");
    const allowed = evaluate({ ...context, action }, registries).decision !== "deny"
      && evaluate({ ...context, action: underlying }, registries).decision !== "deny";
    const auto = !!scope && allowed && !NEVER_AUTO.has(underlying)
      && evaluate({ ...context, action }, registries).decision === "allow"
      && evaluate({ ...context, action: underlying }, registries).decision === "allow"
      && role?.allowActions?.includes(action) && role?.allowActions?.includes(underlying);
    return { allowed, auto, underlying };
  }

  function answer({ approvalId }) {
    const binding = bindings.get(approvalId);
    const decision = approvals.getApproval(approvalId);
    if (!binding || closed) {
      if (decision?.action.startsWith("session.prompt.")) {
        const result = approvals.promptAnswerResult(decision);
        if (!result || approvals.hasUnfinishedPromptAttempt(decision)) {
          return { approvalId, ...invalidatePromptApproval(approvalId) };
        }
        return { approvalId, ...result };
      }
      return { approvalId, status: "not_answered", reason: "prompt_no_longer_bound" };
    }
    if (binding.consumed) return { approvalId, status: "not_answered", reason: "already_consumed" };
    if (decision?.status !== "granted") return { approvalId, status: "not_answered", reason: "approval_not_granted" };
    binding.consumed = true;
    const active = live(binding.sessionId);
    const unchangedSession = active && active.row.agent === binding.agent && active.row.role === binding.role
      && active.row.trace_id === binding.traceId && active.task.repo === binding.repo
      && active.row.tmux_target === binding.tmuxTarget;
    if (!unchangedSession) return { approvalId, ...invalidatePromptApproval(approvalId, "session_changed") };
    const resolved = policy(binding);
    let promptAnswer;
    let inFlightPayload = null;
    let terminalRecorded = false;
    function finish(outcome, reason = null) {
      promptAnswer = { status: outcome === "sent" ? "answered" : "not_answered",
        outcome, ...(reason || outcome !== "sent" ? { reason: reason || (outcome === "uncertain" ? "transport_uncertain" : "guard_refused") } : {}) };
      terminalRecorded = approvals.recordPromptAnswer(approvalId, promptAnswer, inFlightPayload);
      if (!terminalRecorded) {
        promptAnswer = approvals.promptAnswerResult(approvals.getApproval(approvalId))
          || { status: "not_answered", outcome: "uncertain", reason: "terminal_result_not_committed" };
      }
      if (terminalRecorded) {
        auditAppend({ type: "SESSION_PROMPT_ANSWER_ATTEMPT", traceId: binding.traceId,
          sessionId: binding.sessionId, approvalId, command: binding.prompt.command,
          options: binding.prompt.options, tmuxTarget: binding.tmuxTarget, target: binding.capture.target,
          response: "Enter", decidedBy: decision.decided_by, outcome, reason: promptAnswer.reason });
      }
    }
    if (binding.prompt.kind === "unknown" || !resolved.allowed
      || (decision.decided_by === "operator-autonomous-mode" && !resolved.auto)) {
      finish("refused", binding.prompt.kind === "unknown" ? "human_intervention_required" : "policy_denied");
      return { approvalId, ...promptAnswer };
    }
    const adapter = adapters.get(binding.agent);
    const permit = issuePromptAnswer({
      tmuxTarget: binding.tmuxTarget,
      expected: binding.capture,
      response: "Enter",
      onOutcome: finish,
      authorize(capture) {
        if (!samePromptCapture(capture, binding.capture)
          || JSON.stringify(adapter.recognizePrompt(capture.snapshot)) !== JSON.stringify(binding.prompt)) return false;
        const latest = approvals.getApproval(approvalId);
        if (latest?.status !== "granted" || latest.trace_id !== binding.traceId
          || latest.action !== `session.prompt.${binding.prompt.kind}` || !live(binding.sessionId)
          || !policy(binding).allowed || (latest.decided_by === "operator-autonomous-mode" && !policy(binding).auto)) return false;
        let context;
        try { context = JSON.parse(latest.payload); } catch (_error) { return false; }
        if (context?.sessionId !== binding.sessionId || context.command !== binding.prompt.command
          || context.target !== binding.capture.target || context.tmuxTarget !== binding.tmuxTarget
          || JSON.stringify(context.options) !== JSON.stringify(binding.prompt.options)) return false;
        inFlightPayload = approvals.consumePromptApproval(approvalId, latest.payload, {
          status: "in_flight", outcome: "attempting", response: "Enter", target: capture.target,
          attemptedAt: new Date().toISOString(),
        }) || null;
        if (!inFlightPayload) return false;
        // Failure here aborts authorize: no guarded input may follow a missing
        // write-ahead audit. The durable marker survives process death.
        auditAppend({ type: "SESSION_PROMPT_ANSWER_ATTEMPT", traceId: binding.traceId,
          sessionId: binding.sessionId, approvalId, command: binding.prompt.command,
          options: binding.prompt.options, tmuxTarget: binding.tmuxTarget, target: capture.target,
          response: "Enter", decidedBy: latest.decided_by, outcome: "attempting" });
        return true;
      },
    });
    let sent = false;
    try { sent = adapter.answerPrompt({ permit }); }
    catch (_error) { if (!promptAnswer) finish("uncertain"); }
    if (!promptAnswer) finish(sent ? "sent" : "refused");
    if (sent && terminalRecorded && promptAnswer.outcome === "sent") auditAppend({ type: "SESSION_PROMPT_ANSWERED", traceId: binding.traceId,
      sessionId: binding.sessionId, approvalId, command: binding.prompt.command,
      response: "Enter", decidedBy: decision.decided_by, target: binding.capture.target });
    return { approvalId, ...promptAnswer };
  }

  function observe({ sessionId }) {
    const active = !closed && live(sessionId);
    if (!active) { stop(sessionId); return null; }
    const { row, task } = active;
    const adapter = adapters.get(row.agent);
    if (typeof adapter.recognizePrompt !== "function" || typeof adapter.capturePrompt !== "function") return null;
    const capture = adapter.capturePrompt({ tmuxTarget: row.tmux_target });
    if (!capture) { invalidate(sessionId); return null; }
    const prompt = adapter.recognizePrompt(capture.snapshot)
      || (isUnknownPrompt(capture.snapshot) ? { kind: "unknown", command: capture.snapshot, options: [] } : null);
    if (!prompt) { invalidate(sessionId); return null; }
    const previous = current.get(sessionId);
    if (previous && samePromptCapture(previous.capture, capture)) {
      return description(previous, previous.consumed ? "not_answered" : approvals.getApproval(previous.approvalId)?.status);
    }
    invalidate(sessionId);
    const binding = { sessionId, traceId: row.trace_id, agent: row.agent, role: row.role,
      repo: task.repo, tmuxTarget: row.tmux_target, prompt, capture, consumed: false };
    const resolved = policy(binding);
    const result = request({ traceId: row.trace_id, action: `session.prompt.${prompt.kind}`,
      requestedBy: row.agent, context: { sessionId, taskId: row.task_id, repo: task.repo,
        classification: registries.getRepo(task.repo)?.classification,
        command: prompt.command, options: prompt.options, target: capture.target,
        tmuxTarget: row.tmux_target, underlyingAction: resolved.underlying },
      config: resolved.auto && prompt.kind !== "unknown" ? config : { autoApproveScopes: [] } });
    binding.approvalId = result.approvalId;
    bindings.set(result.approvalId, binding);
    current.set(sessionId, binding);
    auditAppend({ type: "SESSION_PROMPT_DETECTED", traceId: row.trace_id, sessionId,
      approvalId: result.approvalId, kind: prompt.kind, command: prompt.command, options: prompt.options });
    const onDecision = () => {
      try { answer(result); } catch (error) { reportError(sessionId, error); }
    };
    binding.unregister = registerPromptResponder(result.approvalId, onDecision);
    if (result.status === "granted") return description(binding, answer(result).status);
    return description(binding, result.status);
  }

  function description(binding, status) {
    return { approvalId: binding.approvalId, status, kind: binding.prompt.kind,
      command: binding.prompt.command, options: binding.prompt.options, target: binding.capture.target,
      ...(approvals.promptAnswerResult(approvals.getApproval(binding.approvalId))
        ? { promptAnswer: approvals.promptAnswerResult(approvals.getApproval(binding.approvalId)) } : {}) };
  }
  function invalidate(sessionId) {
    const previous = current.get(sessionId);
    if (previous) {
      previous.consumed = true;
      bindings.delete(previous.approvalId);
      previous.unregister?.();
      invalidatePromptApproval(previous.approvalId, "prompt_changed");
    }
    current.delete(sessionId);
  }

  function reportError(sessionId, error) {
    auditAppend({ type: "SESSION_PROMPT_ERROR", sessionId,
      traceId: sessions.getSessionById(sessionId)?.trace_id, error: String(error.message) });
  }
  function stop(sessionId) {
    clearTimeout(timers.get(sessionId));
    timers.delete(sessionId);
    for (const [id, binding] of bindings) {
      if (binding.sessionId === sessionId) {
        binding.unregister?.();
        invalidatePromptApproval(id, "session_stopped");
        bindings.delete(id);
      }
    }
    current.delete(sessionId);
  }
  function watch(sessionId) {
    if (closed || timers.has(sessionId)) return;
    const tick = () => {
      timers.delete(sessionId);
      try { observe({ sessionId }); } catch (error) { reportError(sessionId, error); }
      if (!closed && live(sessionId)) watch(sessionId);
    };
    const timer = setTimeout(tick, 1000);
    timer.unref();
    timers.set(sessionId, timer);
  }
  function close() {
    closed = true;
    for (const sessionId of new Set([...timers.keys(), ...current.keys()])) stop(sessionId);
  }
  return { observe, answer, watch, stop, close };
}

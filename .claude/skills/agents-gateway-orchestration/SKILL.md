---
name: agents-gateway-orchestration
description: Foundation skill for driving the agents-gateway MCP (mcp__agents-gateway__* tools) correctly in ANY project. Teaches the 33-tool surface, the canonical orchestration lifecycle (orchestration_create → task_assign → agent_spawn → agent_ask → agent_view → artifact_put → agent_kill → orchestration_complete), the SPAWN-over-DELEGATE doctrine with persistent tmux sessions REUSED across follow-ups to save context, the exact tool shapes (flat vs nested), session identity rules, the liveness/unblock protocol, approvals, artifacts, messages, and the optional Redis coordination plane. Trigger whenever you are about to call any mcp__agents-gateway__* tool, orchestrate coder/reviewer/auditor agents through the gateway, or the user asks how to use the agents-gateway. The phase skills (plan-orchestration-gateway, build-orchestration-gateway, audit-orchestration-gateway, plan-build-audit-loop-gateway) assume this foundation.
---

# Driving the agents-gateway MCP

The `agents-gateway` is a local-first MCP stdio server that mediates safe collaboration between LLM
coding agents. **You** (the human-facing LLM) are the orchestrator; there is no privileged
orchestrator inside the gateway — it is the enforcement boundary (policy, audit, approvals,
sanitization), not a brain. The v1 contract is exactly **33 tools**; the canonical catalog with a
machine-verified example per tool is `docs/mcp-tool-catalog.md` in the gateway repo.

**Naming:** canonical tool names use dots (`orchestration.create`); MCP hosts surface them with
underscores (`mcp__agents-gateway__orchestration_create`). Same tool.

## Golden rule: SPAWN persistent sessions and REUSE them — don't DELEGATE iterative work

`agent.spawn` creates a **persistent tmux-backed session**; `agent.delegate` is one-shot headless.
For anything iterative (coding loops, reviews, multi-pass planning, audits) **always spawn**, and
**reuse the same session for follow-ups** instead of re-spawning or delegating. This is the core
context-economy doctrine:

- **The worker session holds its own context.** A follow-up costs one `agent_ask` prompt — the
  session already knows the task, the files, the prior decisions. Re-spawning (or delegating) pays
  the full re-priming cost every round and loses accumulated state.
- **Your context stays small.** Work happens inside the worker's pane; you observe with `agent_view`
  (a bounded pane snapshot), not by ingesting giant one-shot results. Delegate results can exceed
  1M characters and blow up the orchestrator's context.
- **Mid-course steering.** `agent_view` lets you catch drift early and redirect with another
  `agent_ask` instead of discovering a wrong result at the end.
- **Delegate's failure modes:** oversized opaque results, and some agents exit `exitCode: -1` even
  after fully applying their edits — with spawn you verify the real tree (`git status`/`git diff`)
  instead of misreading `-1` as failure.

Reserve `agent.delegate` for genuinely short one-shot tasks where live observation adds nothing.

`agent_spawn` takes **no `prompt`** — spawn first, then `agent_ask` the prompt. Surface the tmux
attach command to the operator via `session_attach_info`, and record any manual pane intervention
with `session_intervention_note`.

## Canonical lifecycle (one unit of work)

```
orchestration_create({callerAgent, callerRole:"orchestrator", goal, prefix})   → traceId (+ messageAccessToken)
task_assign({traceId, caller:{agent,role}, target:{agent,role,action}, repo, brief}) → taskId
agent_spawn({agent, role, model?, reasoningEffort?, repo, cwd, traceId, taskId})     → sessionId
session_attach_info({sessionId})                    # give the operator the tmux attach command
agent_ask({sessionId, prompt, traceId})             # send the work; REUSE for every follow-up
agent_view({sessionId, traceId})                    # verify the prompt landed; watch progress
artifact_put({traceId, kind, classification, producedBy, content})   # persist handoffs/results
agent_kill({sessionId, traceId})                    # at the unit boundary, not between follow-ups
orchestration_complete({traceId})
```

**`task_assign` BEFORE `agent_spawn`** — the spawn's `taskId` is a foreign key; a bare spawn fails
with a foreign-key constraint error. If that error fires anyway, the tmux session may still exist:
check `tmux has-session` before retrying.

## Tool shapes (wrong shape → the call rejects)

| Tool | Shape |
|---|---|
| `orchestration_create` | **flat** `callerAgent`, `callerRole` |
| `task_assign` | **nested** `caller{agent,role}`, `target{agent,role,action}` |
| `agent_spawn` / `agent_delegate` | **flat** `agent`, `role` |

**agent ≠ model.** Resolve which agent runs which model (e.g. `claude-*` models → a `claude-code`
agent; `gpt-*` → a `codex` agent). Asking the wrong pairing is denied. On `POLICY_DENIED`, **stop
and report the `ruleId`** — never silently downgrade the model or agent.

**`repo` is a policy handle, not a path.** It must match a repo id in the gateway's policy registry
(an absolute filesystem path is only ever a `cwd` and is denied as `repo.unknown`). The `cwd` must
sit inside `AGENTS_REPO_ROOTS`. If the repo policy has `excludedPaths` (e.g. `policies/`), an agent
cannot spawn with a cwd that would expose them — use a git worktree inside the repo root
(`git worktree add workspace/clones/wt-<lane> <base>`) as the spawnable cwd, plus an orchestrator
diff guard that rejects any change to the excluded path at review/commit time.

## Session identity & reuse rules

- Session identity is **deterministic per `(trace, agent, role)`** (UNIQUE): you cannot spawn the
  same pair twice under one trace. A duplicate-session error on re-spawn means the session is
  still alive — reuse it.
- **Reuse the same session** for every follow-up inside one unit of work (a fix round, a re-ask, a
  clarification). This is where the context savings live.
- A **re-review round or a respawn after death needs a fresh trace** (put the round discriminator
  at the START of the prefix — `r2-<short>` — because session IDs derive from a truncated leading
  prefix). Keep independence: never reuse a reviewer session to re-review its own KO fix if your
  project's review policy requires fresh eyes.
- Kill sessions and complete the trace **at the unit boundary** — not between follow-ups.

## Liveness & unblock protocol (classify the pane before acting)

On every monitor tick **and immediately after each `agent_spawn`/`agent_ask`**, run `agent_view`
and classify — never assume the prompt landed:

1. **Idle with an unsent prompt** (text sitting in the input) → `agent_ask` often pastes but does
   not submit: send Enter to the tmux session (sometimes twice), confirm it is working, and record
   a `session_intervention_note`. **Never blind-Enter a pane showing a menu** — a "retry with a
   faster model" menu's highlighted option is a silent model downgrade; pick the keep-model option
   explicitly and verify the pane banner afterwards.
2. **Blocked on a confirmation/approval** (y/N, permission prompt) → Escape and redirect with an
   `agent_ask`. **Never approve a destructive action** (`rm -rf`, `git add -A`, `reset --hard`,
   `checkout -- .`, `stash`, `push`).
3. **Third-party MCP/connector warning** → noise; don't act, don't re-send.
4. **Genuinely working** (output advancing) → leave it; check next tick.
5. **Dead session** (pane gone, `agent_view` unresponsive) → fresh trace + `agent_spawn` +
   re-`agent_ask` the same scoped prompt; resume from the last persisted artifact/handoff.

**Verify the artefact, not the notification.** Before acting on "done", read the actual handoff
file / artifact / `git diff` and confirm it matches the current `traceId`/`taskId`.

## Approvals

`approval_request` is **non-blocking** (returns `status:"pending"`); `approval_poll` is a cheap
read; `approval_wait` blocks bounded by `AGENTS_APPROVAL_MAX_WAIT_MS` and returns `pending` on
timeout; `approval_respond` is the operator's decision (idempotent once decided). Scopes listed in
`AGENTS_AUTOAPPROVE` (e.g. `code.apply`) auto-grant for non-restricted repos. Known host quirk:
from some MCP hosts the optional `context` param serializes as a string and the gateway rejects it
— **omit `context`** when requesting approvals.

## Artifacts & messages

- **Persist every handoff** (`artifact_put`: kind, classification, producedBy, content) so state
  survives session death and respawns resume from disk, not from memory. Read back with
  `artifact_get`/`artifact_list`; `artifact_share` applies policy + sanitization before exposing an
  artifact to a requester.
- `message_send`/`message_list`/`message_reply` require the trace's `accessToken` — it is returned
  **only by `orchestration_create`**; keep it.

## Coordination plane (optional, Redis-backed)

The 8 `coordination_*` tools are for **independently running orchestrators** discovering and
messaging each other across processes. They need a reachable Redis (`AGENTS_COORDINATION_REDIS_URL`
or `AGENTS_REDIS_URL`); without one every call returns `COORDINATION_UNAVAILABLE` while the other
25 tools keep working. Flow: `coordination_status` (probe) → `register` (leased participant; keep
the `leaseToken` — every later call authenticates with it) → `heartbeat` before the lease expires →
`discover` (filter by capability/type) → `send` (addressed, classified, ≤64KiB body) → `receive`
(consumer group; bounded `blockMs`; reclaim idle deliveries with `reclaimIdleMs`) → `ack` →
`unregister`. Don't use it for same-process fan-out — that's what spawns and artifacts are for.
Load `agents-gateway-coordination` for exact call shapes, lease recovery, receive/ACK semantics,
cross-process protocol guidance, and the structured-error playbook.

## Safety defaults

- **Never push.** Commit only reviewed work, with an **explicit pathspec** (`git add <files> &&
  git commit -F - -- <files>`); verify `git diff --cached --name-only` first. Never `git add -A`,
  `reset --hard`, `checkout -- .`, or `stash` on a shared tree.
- **One full quality-gate run per tree at a time** (turn-taking) — concurrent gates on one tree
  corrupt each other. Parallel lanes belong in separate git worktrees.
- The gateway is **harness-managed**: verify it is up (`ps aux | grep mcp_server`) and pointed at
  the expected `AGENTS_POLICIES_DIR` (via `/proc/<pid>/environ`); never start a second one via
  Bash `&` — it won't be the one behind your MCP tools.
- **Rehearse with `AGENTS_DRY_RUN=1`** (dry-run adapters, no real agent CLIs) before running a new
  flow in real mode.
- A task may never silently decide a legal/commercial/security question — persist a
  `*_to_check_by_human.md` artifact and stop that point.

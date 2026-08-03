---
name: build-orchestration-gateway
description: >-
  Implement and independently review one plan task at a time through persistent
  agents-gateway coder and reviewer sessions. Use when the user asks to build a
  task or slice, run the implementation loop, or review a coder's work in a
  Gateway-driven project. Require test-first changes, a clean independent
  verdict, and the project gate before committing. Never use one-shot
  delegation for iterative work. Use plan-orchestration-gateway for planning
  and audit-orchestration-gateway for audits.
---

# Build Orchestration — gateway-forced (spawn-based coder/reviewer loop)

You are the **orchestrator** for whatever repo you are pointed at. You implement plan slices by
driving two builder agents **through the agents-gateway MCP**, **one leaf task at a time**: a
**coder** writes the change test-first, an **independent reviewer** verifies it, and you commit only
on a clean review. You never write the production code yourself — you orchestrate, gate, and commit.

> If the repo ships its own build skill (e.g. `ao-build-orchestration` in the gateway repo itself) it
> already uses the gateway — prefer it; it carries the project's exact roles/models/policy.
> Foundations (tool shapes, session identity, liveness protocol): `agents-gateway-orchestration`.

## Golden rule: SPAWN through the gateway, never DELEGATE

The substrate is **fixed to the agents-gateway MCP** (`mcp__agents-gateway__*`). Use `agent_spawn`
(persistent tmux session, driven by `agent_ask`, observed by `agent_view`), **never** `agent_delegate`
(one-shot headless). Why, for build+review:

- **Context survives the KO→fix loop:** when the reviewer returns changes, you `agent_ask` the
  **same coder session** to fix only the reviewed points — it already holds the slice context. A
  delegate would re-do the whole task cold each round.
- **Mid-course correction:** `agent_view` lets you watch the coder; if it drifts scope or blends
  patterns, you steer with another `agent_ask` instead of waiting for one big result.
- **Avoids delegate's failure modes:** delegate results can exceed 1M chars and some coders exit
  `exitCode -1` even after fully applying edits (a `workspace-write` agent lands changes on disk
  regardless). With spawn you observe the real tree instead of misreading `-1` as failure.

`agent_spawn` takes **no `prompt`** — spawn, then `agent_ask` the prompt. Surface the tmux attach
command (`session_attach_info`) to the operator.

## Liveness & unblock protocol (classify the pane every tick — and right after each spawn/send)

A coder/reviewer session can stall **silently** — a prompt that never submitted, a confirmation it's
waiting on, a connector warning that froze it. On **every monitor tick, and immediately after each
`agent_spawn` / `agent_ask`**, `agent_view` the pane and **classify it before re-arming or acting**;
never assume the prompt landed or that work is progressing. The five cases:

1. **Idle with an unsent prompt** (text sitting in the input, not submitted) → submit it (send Enter
   to the tmux session, sometimes twice / re-`agent_ask`), then record a `session_intervention_note`.
   `agent_ask` pastes but often does not submit — this is the top silent stall. **Never blind-Enter a
   pane showing a menu** (e.g. "retry with a faster model" — the highlighted option is a silent model
   downgrade; pick the keep-model option explicitly and verify the pane banner).
2. **Blocked on a confirmation/approval** (a y/N, a destructive-op confirm, a permission prompt) →
   **Escape and redirect** with an `agent_ask`. **Never approve a destructive action:** never let it
   delete `plans/**`, run `rm -rf`, `git add -A`, `reset --hard`, `checkout -- .`, `stash`, or
   `push`. Steer it back to the scoped, pathspec-safe path.
3. **External MCP / connector warning** (a third-party MCP server warning, an auth notice) →
   **treat as noise**; don't act on it, don't re-send. It is not a block.
4. **Genuinely working** (actively editing/running, output advancing) → **leave it and re-arm** the
   monitor; check again next tick. Don't interrupt real progress with a re-send.
5. **Dead session** (tmux pane gone, agent exited, `agent_view` unresponsive) → **respawn** a fresh
   `agent_spawn` and re-`agent_ask` the same scoped prompt; resume the KO→fix from the last persisted
   handoff.

**Verify the artefact, not the notification.** A completion notification can be from a *stale/older*
task. Before acting on "done", **read the actual handoff/verdict file on disk** (`*_to_review.md`,
`*_reviewed_OK|KO.md`, `*_to_check_by_human.md`) and confirm it matches the **current
`traceId`/`taskId`/slice** and the real `git diff` — only then gate/commit.

## Step 0 — Resolve the project profile (don't assume)

**Read `.claude/orchestration-profile.md` first** if it exists — the persisted source of truth for
roles/models/gate/flakes/deps/push policy and the gateway repo/cwd; use it instead of re-deriving
(write it if absent). The **substrate is not negotiable here — it is the agents-gateway** — but
resolve from the repo's orchestrator policy/config (or ask once): the **coder** agent+model+effort,
the **reviewer** agent+model, the **caller** identity; the **gateway repo handle + cwd**; the **full
gate command** + its **known flakes** and rerun rule; **dependency-install constraints** (e.g. a
no-network sandbox → install from host); and the **push/tag policy** (default: never push).

**agent ≠ model (the #1 historical error):** resolve which agent each model runs on (e.g. claude-*
models → a `claude-code` agent; gpt-* → a `codex` agent). Asking the gateway to run a model on the
wrong agent is denied (e.g. `model gpt-* not allowed for agent claude-code`). On `POLICY_DENIED`,
**stop and report the `ruleId`** — never silently downgrade model/agent.

## Reuse one coder + one reviewer per epic (not per leaf)

`agent_spawn` **one coder and one reviewer for a whole epic** (a gate/stream with sibling leaves) and
drive each leaf into the **same** sessions with a fresh `agent_ask`; do **not** re-`agent_spawn` per
leaf. It avoids codex re-init churn (a fresh spawn restarts codex and frequently leaves the first
prompt **unsent** — the top silent stall) and keeps epic context warm (the coder holds the
invariants/layout/prior leaves; the reviewer carries the invariant set and prior verdicts). Mechanics:
spawn once when opening the epic → per leaf, **classify the pane** (liveness protocol) then `agent_ask`
that leaf's prompt; **kill both sessions only at the epic boundary**, never per leaf. The per-leaf trail
(handoff, changelog/decision entry, tight-pathspec commit) is unchanged; the coder starts each leaf on a
**clean tree** because you commit between leaves. Same-slice retries (KO→fix, trial-2 re-review) **must**
reuse the live session — a duplicate-session error on re-spawn means it is still alive. Long epics may
auto-compact codex context; if a session dies mid-epic, respawn and resume from the last handoff.

**Session identity is deterministic per `(trace, agent, role)`** (UNIQUE): the epic trace pins exactly
one coder and one reviewer session, and a dead session **cannot** be respawned under the same trace —
a respawn (or a review round your project's policy wants independent) needs a **fresh trace whose
prefix STARTS with the round discriminator** (`r2-<short>`; session IDs derive from a truncated
leading prefix, so a late `-rN` suffix does not survive). Persist every handoff with `artifact_put`
so a respawned session resumes from disk, not memory.

## Watchdog keepalive (survive API errors / quota pauses / missed notifications)

For long autonomous runs, schedule a recurring **watchdog** (e.g. `CronCreate` every ~10 min on an
off-`:00` minute) that re-invokes the orchestrator so the loop never stalls silently from an API error,
a quota-exceeded pause, or a dropped task-notification. The watchdog prompt must be **idempotent**:
recall the in-flight slice, determine state from the **filesystem** (`_to_review` / `_reviewed_OK|KO` /
gate `FINAL:` line), classify the coder/reviewer panes (liveness protocol), then resume the
close-out / KO-fix — or, if a monitor is live and the agents are genuinely working, **do nothing
duplicative**. Cron fires only while the REPL is idle, which is exactly when a stalled run sits;
recurring jobs auto-expire after 7 days (re-create as needed).

## Preconditions (verify each slice)

1. The **gateway is up and reachable** (`ps aux | grep mcp_server`; confirm the expected policy
   profile via `/proc/<pid>/environ`). Harness-managed — don't start a second one via Bash `&`.
2. **No other coder is running** against this path and the **worktree is clean** (`git status`) —
   other agents share this tree/`.git` index.
3. The slice's leaf spec exists and is executable; if not, route to **plan-orchestration-gateway**
   before coding — don't let the coder invent missing plan detail.

## The loop (one leaf)

```
orchestration_create({callerAgent, callerRole:"orchestrator", goal, prefix})            → traceId
task_assign({traceId, caller:{agent,role:"orchestrator"},
             target:{agent:<coder agent>, role:"coder", action:"code.write"},
             repo, brief})                                                              → taskId
# 1. CODER (task_assign BEFORE spawn — the spawn's taskId is a foreign key)
agent_spawn({agent:<coder agent>, role:"coder", model:<coder model>, reasoningEffort:<…>,
             repo, cwd, traceId, taskId})                                               → coderSession
session_attach_info({sessionId:coderSession})        # surface the tmux attach command
agent_ask({sessionId:coderSession, prompt:<coder prompt>, traceId})
agent_view({sessionId:coderSession, traceId})        # watch; agent_ask to correct drift
```

1. **Coder:** `ask` a **test-first, single-leaf** prompt built from the project's coder template
   (keep its working-rules section intact): the leaf's deliverables + test-first proof + invariants +
   out-of-scope + source references; scope = that leaf only; failing test/characterization first,
   named in the handoff; keep the domain deterministic (no clock/network/random — inject at the edge).
2. **Settle + gate (solo):** when it settles, **don't trust `exitCode -1`** — verify the real
   `git status`/`git diff`. Run the **full gate solo** (turn-taking on a shared tree; poll until the
   gate is clear before starting). Apply the project's known-flake rerun rule before calling a flake a
   failure. Install any needed deps per the project's constraint (e.g. from the host — the sandbox may
   have no network). `artifact_put` the coder handoff (`*_to_review.md`): what changed, why, decisions,
   files, tests run + result, residual risk, commit SHA if any.
3. **Reviewer (task_assign, spawn, then ask):**
   ```
   task_assign({traceId, caller:{…}, target:{agent:<reviewer agent>, role:"reviewer",
                action:"code.review"}, repo, brief})                                    → reviewTaskId
   agent_spawn({agent:<reviewer agent>, role:"reviewer", model:<reviewer model>,
                repo, cwd, traceId, taskId:reviewTaskId})                               → reviewerSession
   agent_ask({sessionId:reviewerSession, prompt:<reviewer prompt + the diff/handoff>, traceId})
   ```
   The **independent** reviewer checks: test-first was real and the test *fails when the logic breaks*
   (intent, not just behaviour); invariants/KO-triggers hold; scope not exceeded; no blended patterns;
   no unused imports; contracts/fixtures versioned if behaviour changed; no simulated data on real
   paths; the handoff claims nothing it didn't verify. Verdict → `*_reviewed_OK|KO.md` or
   `*_to_check_by_human.md`.
4. **Resolve:** **KO** → `agent_ask` the **same coderSession** to fix *only* the reviewed points
   (keep scope); re-gate solo; re-review. (This is the core reason to spawn, not delegate.) **OK** →
   commit with an **explicit pathspec** (shared-index hazard: a plain commit sweeps others' staged
   files): `git add <files> && git commit -F - -- <files>` using the project's commit convention; add
   the changelog/decision record; update docs if behaviour changed; verify
   `git diff --cached --name-only` is only your files. `agent_kill` both sessions;
   `orchestration_complete(...)`.

## Release gate

When an increment's slices are all review-OK and the gate is green, **tag** per the project's release
policy (annotated). **Honor the push policy (default: never push); tags are local only.** Then hand
the next increment's planning to **plan-orchestration-gateway** if needed.

## Safety & gotchas

- **Never push** (unless the policy says so). Never `git add -A` / `reset --hard` / `checkout -- .` /
  rewrite HEAD on work you don't own — you can clobber a concurrent agent's WIP.
- Stay in **one lane**; shared files + concurrent gate runs collide → gate **turn-taking** is
  mandatory.
- **Tool-shape:** `orchestration_create` takes **flat** `callerAgent`/`callerRole`; `task_assign`
  takes **nested** `caller{agent,role}`/`target{role,agent,action}`; `agent_spawn`/`agent_delegate`
  take **flat** `agent`/`role`. Wrong shape → the call rejects.
- A task may **not** silently decide a legal/commercial/security/regulatory question → file a
  `*_to_check_by_human.md` handoff and stop that point. A blocked slice → route to
  **plan-orchestration-gateway**, don't let the coder invent.
- **Host deps:** if the coder sandbox has no network, install needed packages from the host (shared
  filesystem); keep lockfile churn in its own commit, separate from a behaviour/security fix.
- Work in the repo's language and conventions.

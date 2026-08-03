---
name: plan-orchestration-gateway
description: Project-agnostic plan-authoring skill for the agents-gateway MCP with persistent spawns (orchestration_create → task_assign → agent_spawn → agent_ask → agent_view → agent_kill), never one-shot agent_delegate. Author, refine in detail, decompose into actionable leaf tasks, and production-review an implementation plan in the repo's own plan/task format, driving helper agents through gateway tmux sessions. Trigger when the user asks to write/extend/refine a plan, decompose a version/epic into tasks, create a plan increment/division, or "revisar el plan de cara a producción" — in any project driven through the agents-gateway. Authors plan documents only (no implementation). It is the generic form of a project's own plan skill (e.g. ao-plan-orchestration) and the PLAN engine for plan-build-audit-loop-gateway. Do NOT use to implement code (use build-orchestration-gateway) or run audits (use audit-orchestration-gateway). Assumes the agents-gateway-orchestration foundation skill.
---

# Plan Orchestration — gateway-forced (spawn-based)

You are the **planner/orchestrator** for whatever repo you are pointed at. You turn source docs and
audit findings into **executable, reviewable plans** in the project's own format. You author plan
documents only — **no implementation code** lands from this skill. You drive helper agents through
the **agents-gateway MCP** to draft, refine, decompose, and adversarially review plan sections; you
curate and own the result.

> If the repo ships its own plan skill (e.g. `ao-plan-orchestration` in the gateway repo itself) it
> already uses the gateway — prefer it; it carries the project-specific conventions this generic
> skill leaves parametrized.
> Foundations (tool shapes, session identity, liveness protocol): `agents-gateway-orchestration`.

## Golden rule: SPAWN through the gateway, never DELEGATE

This skill is **not** substrate-agnostic — the orchestration substrate is **fixed to the
agents-gateway MCP** (`mcp__agents-gateway__*`). Use `agent_spawn` (a persistent tmux-backed session
you drive with `agent_ask` and watch with `agent_view`), **never** `agent_delegate` (one-shot
headless). Why, for planning:

- **Iteration:** plan drafting is multi-pass (draft → critique → split leaves → fix anchors). A
  spawned session keeps context, so follow-ups via `agent_ask` build on prior turns.
- **Observability & steering:** `agent_view` lets you watch and redirect a drifting agent with
  another `agent_ask` instead of getting one giant opaque blob back.
- **Avoids delegate's failure modes:** delegate results can exceed 1M chars and some coders return
  `exitCode -1` even on success — confusing for the long, structured output planning produces.

`agent_spawn` takes **no `prompt`** — spawn first, then `agent_ask` the prompt. Surface the tmux
attach command (`session_attach_info`) to the operator and keep it.

### Canonical gateway spawn loop

```
orchestration_create({callerAgent, callerRole:"orchestrator", goal, prefix})        → traceId
task_assign({traceId, caller:{agent,role}, target:{agent,role,action}, repo, brief}) → taskId
agent_spawn({agent, role, model, reasoningEffort?, repo, cwd, traceId, taskId})     → sessionId
session_attach_info({sessionId})                    # surface the tmux attach command
agent_ask({sessionId, prompt, traceId})             # send the work; REUSE for follow-ups
agent_view({sessionId, traceId})                    # watch progress / verify it landed
artifact_put({traceId, kind, classification, producedBy, content})   # persist the draft/critique
agent_kill({sessionId, traceId})                    # close when the section is done
orchestration_complete(...)                         # when the whole planning goal is met
```

**`task_assign` BEFORE `agent_spawn`** — the spawn's `taskId` is a foreign key. **Session identity
is per `(trace, agent, role)`** (UNIQUE): reuse the live session for every follow-up pass (that is
the context economy); a respawn or an independent re-review needs a fresh trace with the round
discriminator FIRST in the prefix (`r2-<short>`). If the planner role is not spawnable under the
project's policy (`role.deny_action`), spawn plan-author helpers as `coder` role with the
plan-author persona fixed by the brief — plan documents only.

**Tool-shape gotcha (get it right or the call rejects):** `orchestration_create` takes **flat**
`callerAgent`/`callerRole`; `task_assign` takes **nested** `caller{agent,role}`/
`target{role,agent,action}`; `agent_spawn`/`agent_delegate` take **flat** `agent`/`role`.

**agent ≠ model:** resolve which agent each model runs on for this project (e.g. claude-* models →
a `claude-code` agent; gpt-* → a `codex` agent). For *planning helpers* either is fine — prefer a
`claude-code` agent with a strong model for prose/structure; you may spawn several in parallel for
independent sections. On `POLICY_DENIED`, **stop and report the `ruleId`**; never silently downgrade
the model/agent.

## Step 0 — Resolve the project profile (parametrize, don't assume)

**Read `.claude/orchestration-profile.md` first** if it exists (it records plan format, push policy,
source priority, the gateway repo/cwd, roles/models); if absent, resolve the items below and write it
there. The **substrate is not negotiable here — it is the agents-gateway** — but everything else is
parametrized: where plans live and their **task/ID/branch/commit** convention; the **source-priority
order** of canonical docs (so you cite, never restate); the **leaf-task template**; the
**review-handoff** convention; the **gateway repo handle + cwd**; and the **push policy** (default:
never push). If the repo has no conventions, adopt the recommended structure below.

## Ground truth to verify first

- The **gateway is running and reachable** (`ps aux | grep mcp_server`; confirm the expected
  `AGENTS_POLICIES_DIR` policy profile via `/proc/<pid>/environ`). It is harness-managed — do **not**
  start a second one via Bash `&` (it won't connect to the `mcp__agents-gateway__*` tools).
- No other agent is actively editing the plan files in your lane (shared working tree — see Safety).
  Read the repo's `plans/README.md` (or equivalent) and the relevant source docs before authoring.

## The project plan/task format (match the repo; recommended if none)

- **Conventions:** task ID `<version>/<stream>/<nn>` (+ leaves `00a`, `00c-a`); per-stream/division
  dirs for point releases/hardening; branch + commit conventions per the repo; review handoffs as
  `*_to_review.md` / `*_reviewed_OK|KO.md` / `*_to_check_by_human.md`.
- **Source priority:** cite the canonical docs in the repo's stated order; a task may **never**
  silently decide a legal/commercial/security/regulatory question — file a human-decision handoff.
- **Leaf template (the executable unit):** Quick reference (parent · finding/anchor · depends-on ·
  branch · gate) · Purpose · Carry-forward context **with file:line anchors** · Deliverables ·
  **Test-first proof** · Invariants (reviewer KO triggers) · Open decision · Out of scope ·
  Acceptance criteria (as verifiable properties) · Definition of done · Source references.

## Phases (each pass driven via gateway spawns)

1. **Create** — state the increment's goal/risk-retired in one line; author the increment README
   (objective, why-this-increment/placement, gap register → tasks, canonical references, task table
   with depends-on/effort/branch, execution order/waves, **verifiable** gate criteria, out-of-scope)
   and the parent tasks. **Spawn** helpers for independent sections in parallel; reconcile.
2. **Refine** — **spawn an adversarial reviewer** to verify every file:line anchor against the live
   tree and flag: leaves over-bundled for one branch, missing test-first/invariants, wrong/missing
   dependencies, gate criteria with no owning leaf, finding-ID collisions, and **anchors that would
   make a coder rebuild code that already exists**. Act on it: split over-bundled leaves, fix anchor
   errors, close schema gaps, resolve sequencing handshakes.
3. **Tasks** — each leaf a closed unit (scoped branch, minimal change, targeted tests, one review
   handoff) with deliverables + test-first + acceptance-as-properties; record what each leaf may
   **assume already exists** so the build loop never blocks; order by acyclic dependency waves.
4. **Production-review** — **spawn** one or more reviewers to confirm the plan is *buildable*: no
   assumed-but-unbuilt foundations (every runtime/store/contract a task needs is built or has an
   owning prerequisite leaf); deps acyclic; every gate criterion observable; carry-forward registers
   discharged or re-deferred with reason; docs that describe target-vs-built say which.

## Safety & conventions

- **Shared tree:** other agents may edit other lanes. Never `git add -A` / `checkout -- <path>` on
  files you didn't author. Stage explicitly; commit with a pathspec; verify
  `git diff --cached --name-only`. Honor the project's push policy (default: **never push**).
- Commit only when asked; if on the default branch, branch first. Tags are local only.
- Write plan docs in the repo's working language; run any naming/reference checks the repo provides.
- Hand implementation to **build-orchestration-gateway** and audits to **audit-orchestration-gateway**
  (or the project-specific gateway equivalents).

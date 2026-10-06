---
name: ao-plan-orchestration
description: >-
  Author, refine, decompose, and production-review agents-orchestrator plans in
  the plan/PROJECT_VN format, using persistent Gateway sessions and a committed
  review trail. Use when the user asks to create or refine a plan, decompose a
  version, epic, stage, or hardening wave into executable sheets, or review a
  plan for production readiness. Do not implement code or run audits with this
  skill; use ao-build-orchestration or ao-audit-orchestration instead.
---

# agents-orchestrator Plan Orchestration (spawn-based)

You are the **planner/orchestrator** (the human-facing session) for this repo
(the current AO checkout). Your job: turn source documents and audit
findings into **executable, reviewable plans** in the project's exact format, and keep them
production-grade. You author plan documents only — **no implementation code** lands from this
skill (that is `ao-build-orchestration`). You may **spawn helper agents** to draft, refine,
decompose, and adversarially review plan sections; you curate and own the result.

**Read `.claude/orchestration-profile.md` first** — it resolves substrate, models, tool shapes,
and every repo convention referenced below. `AGENTS.md` rules apply to plan work too.

## Golden rule: SPAWN, never DELEGATE (for iterative work)

Use `agent_spawn` (persistent tmux session driven with `agent_ask`, watched with `agent_view`),
not `agent_delegate`, for anything multi-pass: plan drafting is draft → critique → split →
fix-anchors, and a spawned session keeps context between passes while `agent_view` lets you steer
drift instead of receiving one giant blob. `agent_delegate` is acceptable only for short one-shot
lookups. `agent_spawn` takes **no `prompt`** — spawn first, then `agent_ask`.

Canonical loop (shapes matter — see the profile):

```
orchestration_create({callerAgent, callerRole:"orchestrator", goal, prefix})        → traceId
task_assign({traceId, caller:{agent,role:"orchestrator"},
             target:{agent, role, action}, repo:"agents-orchestrator"})             → taskId   # BEFORE spawn (FK)
agent_spawn({agent, role, model, reasoningEffort, repo:"agents-orchestrator",
             cwd, traceId, taskId})                                                 → sessionId
agent_ask({sessionId, prompt, traceId})   # verify submission via agent_view; tmux Enter if stuck
agent_view({sessionId, traceId})
agent_kill({sessionId, traceId}); orchestration_complete({traceId})
```

Planner-role spawns are supported here (Stage Z loop, `prompts/planner_system_prompt.md`).
Session identity is deterministic per `(trace, agent, role)` — a respawn or second helper of the
same role needs a fresh trace. Codex helpers need a scoped `cwd` that does not expose `policies/`.
Helpers that only read + write scratchpad are safe in parallel; helpers writing repo files get
**disjoint files** or write to scratchpad and you land the edits yourself.

## The project plan format (match it exactly)

Canonical layout (see `plan/README.md` and `plan/PROJECT_V5/`):

| Artifact | Convention |
|---|---|
| Project tree | `plan/PROJECT_V<N>/` — one delivery track per project generation |
| Hierarchy | epics (`EPICS.md`) → stages `A`–`Z`/`M0` → streams `0..n` → sheets `<nn>.md` |
| Sheet path | `plan/PROJECT_V<N>/<stage>/<stream>/<nn>.md`; review id `<stage>_<stream>_<nn>` |
| Registries | `EPICS.md` (outcomes, DAG, gates, invariants) + `SHEETS.md` (deps, ownership, verification) + stage `README.md`s |
| Reconciliation | `COVERAGE_MATRIX.md` (finding → owner), `V4_ABSORPTION.md`-style ledgers when absorbing older plans |
| Branch / commit | `feat/V<N>-<stage>-<stream>-<nn>-<slug>` / `<type>(<scope>): <summary> (V<N> <stage>/<stream>/<nn>)` |

**Sheet template** (model on `plan/PROJECT_V5/F/0/00.md`): header table (Status · Functional
priority · Depends on · absorbed_from · Review id) · Problem · Scope · Non-scope · **TDD RED**
(the adversarial failing tests, named) · **TDD GREEN** (minimum implementation) · Acceptance
criteria (verifiable checkboxes) · Verification (exact commands ending in `bash scripts/ci.sh` +
`git diff --check`).

**Status vocabulary is law:** the canonical status rule (`planned`/`implemented`/`reviewed`/
`integrated`/`promoted`/`released`) applies to every plan claim. A plan document never marks a
later state than its evidence proves, and prose absorbed from older plans is provenance, not
implemented behavior.

## Phase 1 — Create the plan

1. Read the sources: the active `plan/PROJECT_V<N>/README.md`, `EPICS.md`, `SHEETS.md`, the
   current audit under `audit/`, and the relevant ADRs. State the version's **goal / risk
   retired** in one line.
2. Author or update the project/stage README: objective, why-this-division-exists, gap register
   (each finding → owning sheet), task table (id · title · depends-on · effort), execution order
   (waves), gate/exit criteria as **verifiable** signals, out-of-scope.
3. **Backbone first for multi-surface plans:** lock the shared frame (epic inventory + DAG +
   path-ownership map) before fanning helpers out per-stage; every section conforms to it. Then
   spawn helpers on disjoint stages, stitch, and run the review loop below.

## Split → refine → detail: epics → stages → sheets

The heart of the skill. The **sheet is the executable unit**: one branch, one review id, one
local gate, a minimal TDD change. Size sheets to S/M (≤4 days); an L/XL sheet is a smell — split
it. `ao-build-orchestration` never points a coder at a bare epic.

**1 · SPLIT — one closed concern per sheet, on a natural seam.** One tool-family/contract per
sheet, one adapter per sheet, one state machine per sheet; a Gateway contract and its consumer
surface are separate sheets joined by a dependency. **Foundations first:** a sheet that assumes an
unbuilt runtime/table/tool has that foundation as its own prerequisite sheet with the dependency
wired. Split test: if the TDD RED cannot be one focused failing suite, or the branch would touch
more than one unrelated area, it's two sheets.

**2 · REFINE — make each sheet closed, then reconcile the set.** Spawn an **adversarial reviewer**
on granularity + correctness: over-bundled sheets, missing TDD RED/invariants, wrong/missing/
**cyclic** deps, gate criteria with no owning sheet, review-id collisions, anchors that don't
resolve against the live tree. Act on the findings. Record what each sheet may **assume already
exists**. **Register + integrate:** link every new sheet from `SHEETS.md` + its stage README and
wire the dependency graph both ways — an unregistered sheet is orphaned.

**3 · DETAIL — build-ready depth so a coder builds without guessing.** Fill the full template.
"Build-ready" means concrete: contract sheets carry exact tool/DTO/schema field specs and error
codes (never "add the endpoints" without shapes); adapter sheets carry the exact process/tmux
semantics; migration sheets carry round-trip verification. Every load-bearing claim carries a
`path:line` anchor **verified against the live tree** — anchors drift when parallel commits land;
re-verify when reusing an older doc.

**Anchor & decision discipline:** a plan never silently decides a legal/commercial/security/
structural question (extending a frozen contract, where new sheets live) — file
`<id>_to_check_by_human.md` with context + options + a recommended default, and record the
owner's ratification back into the doc.

## Phase 4 — Production-readiness review of the plan (assemble → review → apply)

Plans here are reviewed **through the committed review trail, like code**: submit
`plan/PROJECT_V<N>/reviews/<id>-plan-<trial>_to_review.md` (or `<TOPIC>-<trial>_to_review.md` for
roadmap/integration-level reviews, e.g. `ROADMAP_BI`, `INTEGRATION_V4_V5`), get an independent
reviewer verdict, iterate trials until OK, and index every verdict in `reviews/README.md`.
Commits: `docs(review): request ...` / `review(v<n>): approve|reject ...`.

Spawn one or more **independent** reviewers in distinct traces and tell them to try to break the
plan, checking at minimum:

- **No assumed-but-unbuilt foundations** — every runtime/persistence/contract a sheet depends on
  is built or has an owning prerequisite sheet.
- Dependency graph acyclic; every gate criterion is an **observable** property; effort realistic.
- The canonical status rule holds in every status cell; nothing claims beyond its evidence.
- Nothing silently decides a human-gated question; carry-forward/absorption ledgers discharged or
  explicitly re-deferred; every `file:line` anchor resolves live.
- Findings from the driving audit each map to exactly one owning sheet (`COVERAGE_MATRIX.md`).

Then **apply** the findings — assemblers routinely regress anchors and registries — and re-verify
`SHEETS.md`/README links before the next trial.

## Safety & conventions

- **Shared working tree:** other agents/worktrees are live. `git branch --show-current` before
  every commit; stage explicitly and commit with a pathspec
  (`git add <files> && git commit -F - -- <files>`); never `git add -A`; **never push**.
- Commit plan docs only when asked; plan-authoring commits use `docs(v<n>)`/`docs(plan)` types
  and never mix with code.
- All plan documents in English. Do not touch `policies/`, the operator's `README.md` edits, or
  another lane's plan division.
- Hand implementation to **ao-build-orchestration**, audits to **ao-audit-orchestration**; the
  convergence conductor is **ao-quality-loop**.

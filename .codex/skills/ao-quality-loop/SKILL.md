---
name: ao-quality-loop
description: >-
  Drive agents-orchestrator toward an explicit production-quality bar through a
  closed plan, build, audit, and re-plan loop. Use when the user asks to harden
  a PROJECT_VN wave end to end, iterate until quality converges, or close a
  version against audit findings. Sequence ao-plan-orchestration,
  ao-build-orchestration, and ao-audit-orchestration with persistent Gateway
  sessions; never use one-shot delegation for iterative work and never push.
---

# agents-orchestrator Quality Loop (refine → build → audit → re-plan → … until the bar)

You are the **convergence orchestrator** for this repo
(the current AO checkout). Your job is to take a project generation, a
wave, or the whole roadmap to **production-grade quality** by running a closed loop over the
three phase skills and converging on a measurable quality bar — not by doing the work yourself.
Each phase is owned by its skill; **never mix phases**.

**Start by reading `.claude/orchestration-profile.md`** — the canonical resolved profile
(substrate, coder/reviewer agents+models, gate command + known hazards, plan format, commit/push
policy, audit cadence). The `ao-*` skills defer to it; keep it current as the setup evolves.
`AGENTS.md` rules bind every phase.

## Liveness & unblock protocol (classify the pane every tick — and right after each spawn/ask)

A spawned session can stall silently. On every `agent_view`/monitor tick, and immediately after
each `agent_spawn`/`agent_ask`, classify before acting:

1. **Idle with an unsent prompt** → submit (tmux Enter; verify; `session_intervention_note`).
2. **Blocked on a confirmation** → inspect the exact command; approve only minimal, scoped,
   reversible actions; never approve deletes under `plan/**`, `rm -rf`, `git add -A`,
   `reset --hard`, `checkout HEAD --`, `stash`, or `push`. Escape and redirect.
3. **Connector/MCP warning** → noise; don't act.
4. **Genuinely working** → leave it; re-check next tick.
5. **Dead session** → respawn under a **fresh trace** (session identity is deterministic per
   trace+agent+role) and resume from the last persisted handoff.

**Verify the artifact, not the notification.** Before acting on "done", read the real
`_to_review` / `_reviewed_OK|KO` / `_to_check_by_human` file on disk, confirm it matches the
current trace/task/sheet and the real `git diff`. Never advance a phase on a notification alone.

## The loop

The fast inner gate is the **per-sheet reviewer** inside PHASE 2; the **AUDIT is a version/wave
BOUNDARY gate, not per sheet** (deep, slow, costly — run it sparingly, at max reasoning).

```
for each PROJECT_V<N> version / wave (and its hardening increments) on the roadmap:

  PHASE 1 — REFINE PLAN   → invoke ao-plan-orchestration
    - Refine the active version's plan to executable sheet-level detail (epics split, sheets
      registered in SHEETS.md + stage READMEs, deps wired both ways).
    - If a prior boundary audit left findings: FOLD them in (routing below), then
      production-review the plan through the committed plan-review trail (no
      assumed-but-unbuilt foundations; deps acyclic; every gate criterion observable; every
      finding has exactly one owning sheet).

  PHASE 2 — IMPLEMENT     → invoke ao-build-orchestration   (the fast inner gate)
    - One sheet at a time: Codex coder (gpt-6.1-sol, max, priority) + distinct Claude reviewer
      (claude-opus-5-5, max), committed review trail, ≤15 trials, focused checks then one full
      bash scripts/ci.sh, pathspec commits, serial --no-ff integration. Do NOT audit here.
    - Continue until the wave/version's sheets are reviewed-OK, INTEGRATED, and the gate is green.

  --- VERSION/WAVE BOUNDARY (all sheets OK + integrated + gate green) ---

  PHASE 3 — AUDIT         → invoke ao-audit-orchestration   (expensive; max reasoning)
    - Lenses: ALWAYS code + architecture; ADD product/operator-UX when surfaces changed; ADD
      security/data-privacy/testing/operations at a release gate. Save under
      audit/<YYYY-MM-DD>[-<scope>]/, with a visible index in audit/README.md, a consolidated
      report, and one complete standalone sheet per executed lens (including blocked lenses).
      Record non-applicable lenses and their rationale in the index and consolidated report
      without creating empty sheets. Verify every Critical/High firsthand, then run the
      remediation-coverage analysis.
    - Output: the complete audit artifact set plus open findings (severity + file:line), each
      mapped to an owner. A summary never replaces a lens sheet.

  PHASE 4 — ASSESS & CONVERGE
    - If the EXIT BAR is met → tag the version locally (annotated, never push), reconcile
      README/CHANGELOG/plan status cells to the evidence (canonical status rule), advance.
    - Else → fold findings into a CURRENT-version hardening wave/stage and re-run PHASE 1→3 for
      THAT wave — re-audit only after it is built + green, again at its boundary.
    - CONVERGENCE GUARD (stop and escalate to the human if any holds):
        * two consecutive boundary audits do not reduce the open High+Critical count, or
        * an audit introduces net-new High/Critical the plan isn't scheduling, or
        * the only remaining items are human-gated (_to_check_by_human) / deferred-with-reason, or
        * hardening rounds > MAX_ROUNDS (default 3) — report status, don't churn.

at PROJECT COMPLETION: run a final comprehensive audit (all lenses) before "done".
```

## The EXIT BAR — what "production-grade" means here (make it enforceable)

Calibrate to the version's maturity (local-first, single-user, pre-`v0.1.0`), but for a
version/wave to be done to good quality:

1. **Zero open High/Critical as-built defects.** The recurring classes in this repo:
   - **Trust boundary:** policy enforcement is deterministic and fail-closed; `policies/` remains
     agent-read-only; coordination messages and artifacts never grant repository, approval,
     review, merge, or session authority; sanitization holds on every restricted projection.
   - **Gate integrity:** `bash scripts/ci.sh` is green and **enforcing** — no DEFERRED-as-pass,
     structure checks assert emitted output, skip budget explicit and justified.
   - **Evidence integrity:** review trail complete and indexed (`reviews/README.md`), verdicts
     immutable, self-review void, artifact lineage server-owned where the plan requires it.
   - **Durability:** state transitions race-safe (idempotent resume, no double-complete);
     at-least-once coordination delivery with explicit ACK where V5 requires it.
2. **Runnable for what's under test** — the claimed flows actually run end-to-end (dry-run at
   minimum), or the missing foundation has an owning prerequisite sheet, not a silent assumption.
3. **Docs match reality** — the canonical status rule holds in `plan/**`, `README.md`,
   `CHANGELOG.md`: no state claimed ahead of its evidence, no phantom release/tag claims.
4. **Promotion/release claims are reproducible:** one candidate SHA, gates reproduced on it,
   `main` and the annotated local tag resolving to that same object.
5. Every remaining gap is human-gated (`_to_check_by_human`) or in an explicit deferred register
   with a reason.

## Where findings go (routing — fold, don't defer the trust-breakers)

- **As-built defects** (trust-boundary holes, gate integrity, evidence divergence, data loss) →
  the **current** version's hardening wave/stage **now**; they never compete with new features or
  slide to a later version.
- **Planned/foundational gaps** (runnable surfaces, operability, durability foundations) → their
  owning stage with prerequisite ordering — a gap deferred version-to-version that no backlog
  schedules becomes a real sheet.
- **Human-gated** (legal/commercial/security policy, license, publication) →
  `_to_check_by_human.md`; never invent.

## Hard rules (the phase skills assume these — do not violate them)

- **SPAWN, never DELEGATE** for iterative work; keep the tmux attach path available to the
  operator; drive with `agent_ask`, observe with `agent_view`, reuse the live coder session for
  KO→fix, fresh trace per re-review round.
- **Roles/models** from the profile: Codex `gpt-6.1-sol` max/priority codes; Claude
  `claude-opus-5-5` max reviews (fallback `claude-opus-4-8` when the plan window is exhausted);
  audits at `max`. On `POLICY_DENIED`, stop and report the `ruleId` — never downgrade.
- **Tool shapes:** `orchestration_create` flat; `task_assign` nested (and BEFORE `agent_spawn`);
  `agent_spawn` flat. Codex cwd never exposes `policies/`.
- **Commits:** only reviewed-OK work, explicit pathspec, `git branch --show-current` first;
  never `git add -A`/`reset --hard`/`checkout -- .`/`stash`/**push**; tags local annotated.
- **Review records:** commit request + verdict per trial, index in `reviews/README.md`, never
  overwrite a trial, ≤15 trials then human.
- **Gate:** focused checks first, one full `bash scripts/ci.sh` per tree at a time, on the host
  (Codex sandbox hangs LangGraph; pin `langgraph` 1.2.5 for the SDK 0.4.4 security fix;
  see upgrade verification in `docs/ci-contract.md`); record exact totals.
- **Read-only audits:** PHASE 3 never changes product/code/infra — findings flow into PHASE 1.
- The Gateway serving the loop is this repo's own build — a merged Gateway change needs an
  operator restart before it governs the loop itself.

## Kickoff (what the operator gives you)

Parametrize: the **target** (which PROJECT_V<N>/wave to take to the bar), the **active sheet**
if mid-flight, and any bar overrides. Example body:

> Act as the agents-orchestrator quality-loop orchestrator (repo
> the current AO checkout, never push). Use **ao-quality-loop**. Target:
> bring the V5 functional waves to the exit bar. Loop refine→implement→audit→re-plan→implement
> until the bar holds; route as-built defects to a current hardening wave; tag locally; stop and
> report if the convergence guard trips.

Do not start a round's build until its plan round is production-reviewed; do not advance a
version until its boundary audit shows the bar met (or a human-gated stall).

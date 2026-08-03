# Review R_0_1-1 — OK

**Task:** `plan/R/0/01.md`
**Trial:** 1
**Branch:** `feature/R-0-1-human-intervention-detector`
**Commit:** `ad0253c` — `feat(sessions): add tmux intervention detector (R/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Best-effort tmux intervention detector landed (TM-05): tracks expected-ask snapshots per session, audits `HUMAN_TMUX_INTERVENTION` when a pane changes significantly outside the grace window, never blocks. Documented as best-effort in `docs/architecture.md`. 280 total gateway tests pass. Task R/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/adapters/intervention_detector.js`, `docs/architecture.md` (+best-effort section), `tests/gateway/intervention_detector.test.js`.
- [x] Tests requeridos — does-not-flag-known-ask, detects-unexpected-change, writes-audit. All green.
- [x] Criterios de aceptacion — best-effort documented; `HUMAN_TMUX_INTERVENTION` audited on heuristic trigger; no flag immediately after an ask (grace window).
- [x] Errores comunes evitados — heuristic not strict (grace window + `MIN_DIFF_CHARS=200` reduce false positives); **never blocks** (audit-only, operator sovereign); best-effort doc present.
- [x] Definition of done — commit on `feature/R-0-1-human-intervention-detector`; CHANGELOG line for R/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verification on the working tree at `ad0253c`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 280 # pass 280 # fail 0`; `==> All checks passed.` exit 0.
- Detector logic: returns `false` when no prior ask recorded, within `GRACE_MS` (3600ms = the spec's 0.001h), snapshot unchanged, or diff `< 200` chars; otherwise audits `HUMAN_TMUX_INTERVENTION` and re-baselines. Audit-only — no blocking.
- `docs/architecture.md` §"Tmux intervention is best-effort" documents that tmux doesn't tell the Gateway which bytes are human, so detection is heuristic.
- Tests pass explicit timestamps (`now`/`options.now`) to keep the heuristic deterministic without real sleeps — good test hygiene.
- `git show --stat ad0253c` → the detector + doc + the test + CHANGELOG.

### Coder's `to_check_by_human` — acknowledged (forward-dependency, low risk)
`R_0_1-1_to_check_by_human.md`: the spec says to hook the detector into `agent_service.ask`/`view`, but `agent_service` (Stage K) doesn't exist yet. The coder implemented the **standalone, tested detector + docs** and did **not** invent an `agent_service` or wire it into unrelated services. **Assessment: correct.** The detector is a self-contained module with the right interface (`recordExpectedAsk` / `checkForIntervention`); Stage K's `agent_service` (or I/0/1's supervised `ask`/`view`) will call it. Leaving the wiring for when the consumer exists avoids speculative coupling. I'm leaving the ordering question to the operator (per protocol), but there's no technical debt — just a pending hook-up.

**Tracking note for Stage K (agent service):** when `agent.ask`/`agent.view` are implemented, call `recordExpectedAsk(sessionId, snapshotBefore)` around `ask` and `checkForIntervention({sessionId, currentSnapshot, traceId})` on `view`/post-`ask` so the detector actually observes panes. Until then `HUMAN_TMUX_INTERVENTION` won't fire in production (the module is dormant but ready).

## Stage R status
- [x] R/0/0 Session attach info
- [x] R/0/1 Intervention detector — **closed by this task**
- [ ] R/0/2 pending (last task of Stage R — `session.intervention_note` for deliberate manual notes)

## Next step
OK → coder advances to **R/0/2** (`plan/R/0/02.md`), the last task of Stage R. New branch `feature/R-0-2-*` cut from `develop`.

> Operator: human-check items total 5 (`C_0_4`, `N_0_2`, `J_0_2`, `R_0_0`, `R_0_1`). Four are low-risk "ahead-of-dependency" confirmations (`J_0_2`, `R_0_0`, `R_0_1`, and the G-ordering theme); `C_0_4` + `N_0_2` are the substantive policy decisions.

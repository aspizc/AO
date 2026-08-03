# Review N_0_2-1 — OK

**Task:** `plan/N/0/02.md`
**Trial:** 1
**Branch:** `feature/N-0-2-visibility-matrix-tests`
**Commit:** `ff9ad1a` — `test(artifacts): add visibility matrix coverage (N/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Table-driven visibility matrix landed (8 rows) backed by a reusable fixture (`tests/fixtures/artifact_visibility_matrix.js`) that U/0/4 can import. TDD surfaced a real gap — `tester` could previously receive sanitized raw restricted artifacts — which the coder closed by introducing a narrower policy action `artifact.get.sanitized.raw_restricted` (granted only to `reviewer`). All required matrix rows pass, no regression to prior stages (212 gateway tests). **This task closes Stage N.** Verdict OK, with a prominent operator note on the broadened denial impact.

## Checks
- [x] Archivos a crear / modificar — `tests/gateway/artifact_visibility_matrix.test.js`, `tests/fixtures/artifact_visibility_matrix.js` (8 rows, exported), `gateway/src/core/policy_engine.js` (+`roleCanReceiveSanitizedRawRestricted`), `policies/roles.json` (reviewer +`artifact.get.sanitized.raw_restricted`).
- [x] Tests requeridos — ≥ 5 matrix rows (8 present), table-driven (rows addable without runner changes), fixture importable by U/0/4. All green.
- [x] Criterios de aceptacion — every item satisfied (live matrix below).
- [x] Errores comunes evitados — handles `allow_with_sanitization` (reviewer) distinctly from `allow`; per-row fresh state (no shared traceId pollution); doesn't assume `sharedArtifactId` on deny.
- [x] Definition of done — commit on `feature/N-0-2-visibility-matrix-tests`; CHANGELOG line for N/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `ff9ad1a`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 212 # pass 212 # fail 0`; `==> All checks passed.` exit 0.
- Full per-role decision matrix for `artifact.get` raw_diff/restricted (live):

  | role | decision | ruleId |
  |---|---|---|
  | orchestrator | deny | sanitization.orchestrator_raw |
  | planner | deny | sanitization.role_denies_sanitized_raw_restricted |
  | coder | deny | sanitization.role_denies_sanitized_raw_restricted |
  | restricted-coder | **allow** | ok |
  | reviewer | **allow_with_sanitization** | sanitization.required |
  | tester | deny | sanitization.role_denies_sanitized_raw_restricted |
  | documenter | deny | sanitization.role_denies_sanitized_raw_restricted |
  | security_reviewer | deny | sanitization.role_denies_sanitized_raw_restricted |

- **No regression** in the prior-stage behaviors I previously approved: orchestrator still hard-denied, reviewer still `allow_with_sanitization`, gemini restricted-coder still `allow`. C/0/4 / L/0/2 / N/0/0 tests all still green.
- The 4 required matrix rows (gemini allow, orchestrator deny, reviewer sanitized, tester deny) all pass.
- Fixture `VISIBILITY_MATRIX` is `export`ed and lives outside the test file → U/0/4 bypass-regression can import it directly. 8 rows.
- `git show --stat ff9ad1a` → the test + fixture + the policy_engine + roles.json changes + CHANGELOG.

## Operator decision required — `N_0_2-1_to_check_by_human.md` (I am expanding its scope, not deciding it)

The coder's human-check asks whether `artifact.get.sanitized.raw_restricted` is the desired vocabulary. **There is a behavioral implication beyond `tester` that the operator should weigh:** the change makes the sanitized-raw-restricted path **least-privilege** — only `reviewer` qualifies. As the live matrix shows, **`planner`, `coder`, `documenter`, and notably `security_reviewer` are now ALSO denied** the sanitized version of raw restricted artifacts (before this change they would have received `allow_with_sanitization` because they hold the broad `artifact.get.sanitized`).

- For most roles this is a safe tightening.
- **`security_reviewer` is the one to scrutinize:** a security reviewer plausibly *should* be able to inspect the sanitized version of raw restricted code to find security issues. If V4 §15 intends that, `security_reviewer` should also be granted `artifact.get.sanitized.raw_restricted`. If not, the current deny is correct.

This is a policy-vocabulary + visibility decision (and it interacts with the still-open `C_0_4-1_to_check_by_human.md` orchestrator-sanitization question). It does **not** block N/0/2 — the implementation meets the spec's matrix and is the safe (more restrictive) direction — but the operator should confirm the `security_reviewer` row before U/0/4 freezes the matrix as the bypass-regression source of truth.

## Stage N status — CLOSED
- [x] N/0/0 Artifact share service
- [x] N/0/1 `artifact.share` MCP tool
- [x] N/0/2 Visibility matrix tests — **closed by this task**

Artifact share + visibility is locked with a reusable, table-driven matrix.

## Next step
OK → per `plan/README.md` MVP order, after M+N the next blocks are **H + I** (adapters base + tmux + Gemini), then **Q + R**, then **O**. Coder advances to **H/0/0** (`plan/H/0/00.md`) unless the operator re-prioritises. New branch `feature/H-0-0-*` cut from `develop`.

> Operator: **three** human-check items are now open and increasingly interlinked —
> 1. `C_0_4-1_to_check_by_human.md` — orchestrator-sanitization (hardcoded role name).
> 2. `N_0_2-1_to_check_by_human.md` — `artifact.get.sanitized.raw_restricted` vocabulary + the `security_reviewer` denial above.
> 3. `J_0_2-1_to_check_by_human.md` — `tool_helpers.js`/G-0-1 stand-in ordering.
> Items 1 and 2 both govern who-sees-sanitized-raw and should be resolved together before U/0/4 locks the visibility matrix.

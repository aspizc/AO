# Review Verdict - Task PROJECT_V3/A/0/0 (Trial 1)

## Summary

A/0/0 adds the `orchestrator-langgraph/` test suite to the local CI gate
(`scripts/ci.sh`), documents the editable install in the README quickstart,
extends the existing structure test to require the new invocation, and updates
`CHANGELOG.md` under `## Unreleased`. The diff matches the spec
(`plan/PROJECT_V3/A/0/00.md`), stays within bounds (no `policies/`, no
`gateway/src/`, no subproject production code), and the full gate is green on
independent re-execution by the reviewer.

## Findings

### Blocking

None.

### Non-blocking

1. **A0-T2 (broken-test failure check) verified structurally by reviewer.**
   The reviewer's execution environment denied temporary modification of
   tracked test files, so the break/revert experiment could not be re-run
   independently. Verified instead that `scripts/ci.sh` runs under
   `set -euo pipefail` and the new section (`pytest
   orchestrator-langgraph/tests`, scripts/ci.sh:37-38) has no `|| true` or
   other error suppression, so any non-zero pytest exit aborts the gate. The
   coder's handoff documents the manual break/revert check on
   `test_selector.py` with the gate failing in the LangGraph section.
2. **README Codex paragraph rewording** (second hunk of `README.md`, commit
   89c85a0) goes slightly beyond the quickstart change the spec lists, but it
   is docs-only reconciliation consistent with the owner's policy update
   (c14184a) and introduces no contract change.
3. **Spec DoD item "PR draft contra develop"** is not satisfiable under the
   project rule "Nunca se hace `git push` desde la tarea salvo peticion
   explicita del owner"; the branch exists locally and is ready for the owner
   to push/open the PR. Not attributable to the coder.

### Authorized context (not KO material, per owner)

- Commit eccb076 reconciles `tests/gateway/*.test.js` with the owner's policy
  change c14184a (codex enabled, default `gpt-5.5`; claude-code default
  `claude-fable-5`). Explicitly authorized by the owner; touches only test
  expectations, not `policies/` or `gateway/src/`.
- `langgraph==1.2.1` is a documented environment decision; formal pinning is
  in scope for C/0/0.
- Coder ran verification outside the sandbox (sandbox hangs the LangGraph
  suite), documented in the handoff. Reviewer ran without sandbox and
  reproduced the results.

## Verification

Commands executed by the reviewer on `feature/V3-A-0-0-full-ci-gate`
(HEAD e01ef31):

- `git log develop..HEAD --stat` — 3 commits as declared: eccb076 (gateway
  test reconciliation, pre-A/0/0, owner-authorized), 89c85a0 (A/0/0
  implementation), e01ef31 (review handoff).
- `git diff develop...HEAD` — touches only `scripts/ci.sh`, `README.md`,
  `CHANGELOG.md`, `tests/structure/test_ci_script.py`,
  `tests/gateway/*.test.js` (authorized reconciliation) and
  `plan/PROJECT_V3/reviews/A_0_0-1_to_review.md`. No `policies/`, no
  `gateway/src/`, no `orchestrator-langgraph/src/`.
- `source .venv/bin/activate && pytest orchestrator-langgraph/tests` —
  **70 passed, 3 skipped** (matches handoff; opt-in Temporal test
  `test_temporal_crash_recovery.py` skipped without
  `AGENTS_TEMPORAL_INTEGRATION=1`).
- `source .venv/bin/activate && ./scripts/ci.sh` — green end to end; the new
  "==> Orchestrator LangGraph tests (pytest)" section ran (70 passed,
  3 skipped) and the script ended with `==> All checks passed.`
- Inspected `scripts/ci.sh`: `set -euo pipefail`, new section placed after the
  CLI pytest section and before `echo "==> All checks passed."`, no error
  suppression.
- Acceptance criteria check: gate runs the suite green ✔; broken test fails
  the gate (coder manual check + structural verification) ✔; opt-in Temporal
  tests still skip without the env var ✔; structure test asserts the
  invocation in `ci.sh` (`tests/structure/test_ci_script.py:16`) ✔;
  CHANGELOG `Closes V3 A/0/0` under `## Unreleased` ✔.

## Verdict

**OK** — A/0/0 trial 1 approved. The task is closed; the branch is ready for
the owner to push and open the draft PR against `develop`.

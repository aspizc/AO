# Review Submission - Task PROJECT_V3/A/0/0 (Trial 1)

## What was done
- Added `pytest orchestrator-langgraph/tests` to `scripts/ci.sh` after the CLI pytest section.
- Documented editable installation of `orchestrator-langgraph` in the README quickstart.
- Extended the existing CI structure test to require the Orchestrator LangGraph pytest invocation.
- Updated `CHANGELOG.md` under `## Unreleased` with `Closes V3 A/0/0`.

## Why
- `orchestrator-langgraph/` was not covered by the local CI gate, so regressions in that subproject could pass undetected.

## Decisions Taken
- `langgraph==1.2.1` is required for the current Orchestrator LangGraph suite; dependency pinning/lockfile work remains in scope for PROJECT_V3 C/0/0.
- Gateway policy tests were reconciled in pre-A/0/0 commit `eccb07600acf42a3e5f5817039ffdee35bc0be62` with explicit owner authorization, reflecting the current `policies/` registry: Codex enabled/allowed where configured, default Codex model `gpt-5.5`, and default Claude model `claude-fable-5`.
- `pytest orchestrator-langgraph/tests` and `./scripts/ci.sh` were executed outside the sandbox because the sandbox blocked LangGraph test completion; no network access or installation was used during verification.

## Verification
- `source .venv/bin/activate && pytest orchestrator-langgraph/tests` - passed outside sandbox: 70 passed, 3 skipped.
- `source .venv/bin/activate && ./scripts/ci.sh` - passed outside sandbox; final output included `==> All checks passed.`
- Manual failure check: temporarily changed an assertion in `orchestrator-langgraph/tests/test_selector.py`, ran `source .venv/bin/activate && ./scripts/ci.sh`, confirmed the gate failed in the Orchestrator LangGraph section, then reverted the temporary change.

## Commit
- `89c85a003a9909ec86d24fe6ceb7cc8d1a954873` - `test(v3): add orchestrator-langgraph to local ci gate (PROJECT_V3 A/0/0)`

# U/0/4 Trial 1 - To Review

## Implemented

- Added `tests/e2e/bypass_regression.test.js`.
- Added `tests/structure/test_bypass_traceability.py`.
- Updated `docs/threat-model.md` `Tested by` entries to point at the bypass suite.
- Updated `CHANGELOG.md`.

## Threat Coverage

- TM-01: orchestrator cannot read raw restricted artifacts.
- TM-02: restricted child output is sanitized before reviewer access.
- TM-03: arbitrary filesystem writes are not visible as artifacts.
- TM-04: cwd outside allowlist and symlink escapes are rejected before spawn.
- TM-05: manual tmux intervention notes are audited.
- TM-06: sanitizer failure blocks cross-boundary raw reads.
- TM-07: unknown approval responses fail and replay does not grant again.
- TM-08: prompt-injected orchestrator still cannot `code.write`.
- TM-09: cross-trace artifact share is denied; cross-trace message test is skipped with TODO because Stage S is deferred.
- TM-10: MCP stdout smoke remains protocol-safe.
- TM-11: `approval.wait` respects the server cap.

## Why

U/0/4 turns the threat model into executable regression coverage and closes the MVP security gate.

## Decisions

- Used the existing U/0/0 harness for adversarial E2E setup.
- Used real service/tool paths where available.
- Used `policy_engine.evaluate` directly for `code.write` because no direct code-writing tool exists; the policy engine is the real control for that action.
- Kept `cross_trace_message_access_denied` as `test.skip` with TODO because Stage S/message store is deferred by ADR-004 and no real message access API exists in the MVP.
- For TM-10, invoked `scripts/smoke_mcp.mjs` via file redirection to avoid local pipe `EPERM` restrictions.

## TDD Evidence

- First added `tests/structure/test_bypass_traceability.py`.
- Initial failures: missing bypass suite and threat model links.
- Added the bypass suite and threat model traceability until focused tests passed.

## Verification

- `PATH="$PWD/.venv/bin:$PATH" pytest tests/structure/test_bypass_traceability.py`
- `node --test tests/e2e/bypass_regression.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

All passed. CI now runs both E2E files.

## Commit

- `37a5b8a test(e2e): add bypass regression suite (U/0/4)`

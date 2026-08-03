# Review Submission - Task Q/0/5 (Trial 2)

## What was done
- Kept the Trial 1 bounded auto-approval mechanism unchanged.
- Reconciled `docs/operator-guide.md` so auto-approval is documented as default-off, operator opt-in, bounded by `AGENTS_AUTOAPPROVE`, and still human-required for `NEVER_AUTO` actions and restricted contexts.
- Added `TM-12` to `docs/threat-model.md` for auto-approval abuse / over-broad enablement.
- Added TM-12 bypass coverage proving `git.push.protected` and restricted contexts stay pending even when their scopes are listed.
- Updated `README.md` Scope/architecture/runtime docs to mention default-off bounded auto-approval and link ADR-006.

## KO Corrections Addressed
- `docs/operator-guide.md` contradiction removed and replaced with bounded auto-approval operating guidance.
- `docs/threat-model.md` now includes TM-12 with controls and `Tested by` references.
- `tests/e2e/bypass_regression.test.js` now includes `autoapproval_never_grants_protected_or_restricted_even_if_listed`.
- `README.md` now documents opt-in auto-approval default-off behavior and ADR-006.

## Verification
- `node --test tests/e2e/bypass_regression.test.js` - passed.
- `.venv/bin/pytest tests/structure/test_bypass_traceability.py tests/structure/test_threat_model.py` - passed, 7 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed; structure 93 passed, gateway node tests 61 passed, e2e 4 passed, MCP smoke OK, policy validate OK, CLI pytest 29 passed.

## Commits
- `706847e` - `feat(approval): add bounded auto-approval (Q/0/5)`
- `9289f30` - `docs(security): document bounded auto-approval controls (Q/0/5)`

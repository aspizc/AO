# E/0/0 Trial 1 - To Review

## Summary

Documented and tested the stable `agent-run policy validate` operator contract.

## What changed

- Added `tests/cli/test_policy_validate_contract.py`.
- Added `tests/structure/test_operator_cli_contract.py`.
- Added `docs/operator-cli-contract.md`.
- Linked the contract doc from `README.md`.
- Updated `CHANGELOG.md`.

## Decisions

- Added a structure test for the documentation file so the public CLI contract cannot silently disappear.
- Added a JSON success-shape test in addition to the requested exit-code tests because `--json` is part of the stable contract.

## Verification

- `PATH="$PWD/.venv/bin:$PATH" pytest tests/cli/test_policy_validate_contract.py tests/structure/test_operator_cli_contract.py`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `332189c test(cli): freeze policy validate contract (E/0/0)`

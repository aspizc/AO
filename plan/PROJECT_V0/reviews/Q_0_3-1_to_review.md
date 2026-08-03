# Q/0/3 trial 1 to review

## Implemented

- Added `gateway/scripts/approval-respond.mjs`.
- Replaced the `agent-run approve` stub with a real operator command.
- Added CLI flags:
  - `approval_id` argument
  - `--decision/-d granted|denied`
  - `--note`
  - `--json`
- Added `tests/cli/test_approve.py`.
- Updated the CLI scaffold test that previously expected the stub.
- Updated `CHANGELOG.md`.

## Why

The operator needs a terminal-only way to respond to pending approvals. This closes the loop from `approval.request` to a human decision without relying on an IDE-specific integration.

## Decisions

- The Python CLI invokes a small Node helper so it uses the same config loading, state initialization, audit configuration, and approval service as the gateway.
- The Node helper returns JSON on both success and known errors, allowing the CLI to render consistent human or machine output.
- `decidedBy` is fixed to `operator` for this CLI path.
- Invalid decisions are rejected in Python before Node is invoked.

## Verification

- Red: `PATH="$PWD/.venv/bin:$PATH" pytest tests/cli/test_approve.py` failed against the existing stub.
- Green: `PATH="$PWD/.venv/bin:$PATH" pytest tests/cli/test_approve.py tests/cli/test_cli_scaffold.py`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `78445e7 feat(cli): add approval response command (Q/0/3)`

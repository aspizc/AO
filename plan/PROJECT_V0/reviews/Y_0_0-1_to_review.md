# Review Submission - Task Y/0/0 (Trial 1)

## What was done
- Added `tests/e2e/mcp_two_agent_real.test.js`, a guarded real MVP2 E2E for Codex coder plus Claude reviewer through MCP stdio.
- The E2E requires `AGENTS_E2E_REAL=1` and `tmux`, `codex`, and `claude`; normal CI keeps it inert.
- The real path creates a temporary git work repo, spawns Codex with `gpt-5` and `medium`, asks it to create `HELLO.md`, shares a sanitized raw diff to Claude reviewer with `claude-opus-4-7`, records review notes, closes sessions, completes the orchestration, and checks audit events.
- Added structural coverage for the guarded E2E contract, documented the optional run command in the MVP2 runbook, noted the optional CI behavior in `scripts/ci.sh`, and updated `CHANGELOG.md`.

## Why
- Y/0/0 requires a real two-agent E2E that operators can run manually while keeping default CI deterministic and network-free.

## Decisions Taken
- Kept the real test fully guarded by `AGENTS_E2E_REAL=1` and binary availability checks.
- Used `sample-apps` as the non-restricted temporary work repo because the MVP2 profile permits both Codex and Claude there.
- Verified sanitization with a restricted raw diff artifact containing a synthetic secret, then handed only the sanitized artifact to the reviewer.

## Verification
- `.venv/bin/pytest tests/structure/test_mvp2_real_e2e.py` - passed, 3 tests.
- `node --test tests/e2e/mcp_two_agent_real.test.js` - passed in normal guarded mode.
- `node --test tests/e2e/**/*.test.js` - passed, 4 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed; structure 77 passed, gateway node tests 59 passed, e2e 4 passed, MCP smoke OK, policy validate OK, CLI pytest 29 passed.

## Commit
- `ecfb30a` - `test(e2e): add guarded MVP2 real two-agent flow (Y/0/0)`

# Review Submission - Task Y/0/1 (Trial 1)

## What was done
- Added executable `scripts/smoke_mvp2.mjs`.
- The smoke defaults to dry-run with the MVP2 profile and runs real supervised CLIs only when `AGENTS_DRY_RUN=0`.
- The flow uses MCP stdio to create an orchestration, spawn Codex coder with `gpt-5`/`medium`, ask/view, share a sanitized raw diff, spawn Claude reviewer with `claude-opus-4-7`, ask/view, record review notes, kill both sessions, and complete.
- The script prints a human summary with agents/models, session IDs, artifact root, audit path, mode, and result.
- Linked the smoke from `README.md` and `docs/mvp2-orchestrator-runbook.md`, added structural tests, and updated `CHANGELOG.md`.

## Why
- Y/0/1 requires a single operator command that confirms the MVP2.0 flow and reports useful evidence without requiring real CLIs by default.

## Decisions Taken
- Reused the JSONL-over-stdio request pattern from `scripts/smoke_mcp.mjs` to keep MCP startup behavior consistent.
- Left the smoke workspace in `/tmp` by default and prints artifact/audit paths so the operator can inspect evidence after the run.
- Kept real mode explicit via `AGENTS_DRY_RUN=0` and fails early if `tmux`, `codex`, or `claude` are missing.

## Verification
- `.venv/bin/pytest tests/structure/test_mvp2_smoke.py tests/structure/test_mvp2_runbook.py tests/structure/test_mvp_docs.py` - passed, 13 tests.
- `node scripts/smoke_mvp2.mjs` - passed in dry-run mode and printed sessions/artifacts/audit/result.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed; structure 80 passed, gateway node tests 59 passed, e2e 4 passed, MCP smoke OK, policy validate OK, CLI pytest 29 passed.

## Commit
- `8abaec8` - `feat(smoke): add MVP2 two-agent operator smoke (Y/0/1)`

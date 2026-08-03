# Review Submission - Task PROJECT_V3/B/0/4 (Trial 1)

## What was done
- Added a structured JSON warning to `gateway/src/config.js` when the message access secret file path cannot be read or created and the process fallback secret is used.
- Added `tests/gateway/config_secret_fallback.test.js` covering forced fallback warning, normal persisted secret without warning, and env override without warning or file I/O.
- Updated `CHANGELOG.md` under `## Unreleased` with `Closes V3 B/0/4`.

## Why
- The Gateway already failed soft to a per-process message access secret, but the fallback was silent and made restart-related token failures hard to diagnose.

## Decisions Taken
- Kept the warning local to `config.js` with `process.stderr.write` to avoid a config-to-server import cycle and to preserve MCP stdout.
- Logged only timestamp, level, component, message, error message, and failed secret path; no secret value or secret length is included.
- Forced the failure path with `tmpfile/secret` rather than file permissions to keep the test portable.

## Verification
- `node --test --experimental-test-isolation=process --test-concurrency=1 tests/gateway/config_secret_fallback.test.js` - passed.
- `npm --prefix gateway test` - passed.
- `node scripts/smoke_mcp.mjs` - passed.
- `./scripts/ci.sh` - failed before tests because `ruff` was not on `PATH` in the shell environment.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit
- `8a6704f5f355eb27dacd27062ecb7b7febd194b1` - `fix(v3): warn on message secret fallback (PROJECT_V3 B/0/4)`

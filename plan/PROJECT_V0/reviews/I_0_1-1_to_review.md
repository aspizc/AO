# I/0/1 trial 1 to review

## Implemented

- Extended `GeminiAdapter` with supervised tmux methods:
  - `spawn`
  - `ask`
  - `view`
  - `kill`
- Reused `tmux_client` command builders and `session_naming`.
- Kept `assertSafeCwd` active in `spawn`, including dry-run.
- Added deterministic dry-run behavior for all supervised methods.
- Added `SESSION_STARTED`, `SESSION_INPUT`, and `SESSION_CLOSED` audit events.
- Added `tests/gateway/gemini_supervised.test.js`.
- Updated `CHANGELOG.md`.

## Why

Long-running and interactive tasks need a persistent, observable session instead of one-shot headless delegation. This task adds the supervised tmux surface that later session tools can attach to.

## Decisions

- In real mode, `spawn` creates the tmux session and sends the Gemini command before writing `SESSION_STARTED`. That avoids recording a started session if tmux is missing or session creation fails.
- `ask` audits only the first 200 characters of the prompt, matching the plan's secret-exposure mitigation.
- `ask` uses a fixed delay before capture in real mode, as specified for MVP.
- Dry-run still audits `SESSION_INPUT` for `ask` so tests can verify the bounded audit shape without tmux.

## Verification

- Red: `node tests/gateway/gemini_supervised.test.js` failed with inherited `BaseAdapter` "must implement" errors.
- Green: `node --test tests/gateway/gemini_supervised.test.js`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `6dac622 feat(adapters): add gemini supervised sessions (I/0/1)`

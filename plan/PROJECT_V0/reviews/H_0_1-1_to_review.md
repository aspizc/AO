# H/0/1 trial 1 to review

## Implemented

- Added `gateway/src/adapters/session_naming.js`.
- Added `buildTmuxTarget({ traceId, agent, role, prefix })`.
- Sanitized each target chunk to lowercase `[a-z0-9-]`.
- Enforced required `traceId`, `agent`, and `role`.
- Removed the display suffix only for `gemini-cli`, leaving names such as `claude-code` intact.
- Capped generated tmux targets at 96 characters.
- Added `tests/gateway/session_naming.test.js`.
- Updated `CHANGELOG.md`.

## Why

Tmux target names are passed to tmux commands. Centralizing target construction prevents invalid names and keeps later adapters from hand-rolling unsafe or inconsistent session identifiers.

## Decisions

- I sanitized custom prefixes as well as input chunks so callers cannot introduce unsafe characters through `prefix`.
- I kept per-chunk truncation at 24 characters and final target truncation at 96, matching the task guidance.
- I adjusted the length test to assert the contract (`<= 96`) instead of a brittle exact length after the first green implementation showed the initial expected number was only a test arithmetic mistake.

## Verification

- Red: `node --test tests/gateway/session_naming.test.js` failed before `gateway/src/adapters/session_naming.js` existed.
- Green: `node --test tests/gateway/session_naming.test.js`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `5b41766 feat(adapters): add session naming helpers (H/0/1)`

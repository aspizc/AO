# R/0/1 trial 1 to review

## Implemented

- Added `gateway/src/adapters/intervention_detector.js`.
- Added in-memory expected-ask tracking by session.
- Added best-effort snapshot change heuristic with `HUMAN_TMUX_INTERVENTION` audit.
- Added `_resetForTests`.
- Documented tmux intervention as best-effort in `docs/architecture.md`.
- Added `tests/gateway/intervention_detector.test.js`.
- Updated `CHANGELOG.md`.

## Why

Direct tmux attach is legitimate but can bypass normal tool/audit flows. This detector provides best-effort audit evidence when pane snapshots change significantly outside the short expected-ask window.

## Decisions

- Detection is intentionally heuristic and non-blocking. It only audits; it never prevents operator intervention.
- The grace window is 3.6 seconds after `recordExpectedAsk`, matching the task's 0.001 hour guidance.
- Snapshot changes below 200 chars are ignored to reduce false positives.
- Tests pass explicit timestamps to avoid slow sleeps and keep the detector deterministic.

## Verification

- Red: `node --test tests/gateway/intervention_detector.test.js` failed before `intervention_detector.js` existed.
- Green: `node --test tests/gateway/intervention_detector.test.js`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `ad0253c feat(sessions): add tmux intervention detector (R/0/1)`

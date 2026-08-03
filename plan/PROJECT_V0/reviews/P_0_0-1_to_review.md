# P/0/0 trial 1 - To review

## Summary

Implemented the dormant Codex adapter dry-run task.

Commit: `ecd67b2 feat(adapters): add dormant codex adapter (P/0/0)`

## What changed

- Added `gateway/src/adapters/codex_adapter.js`.
- Added `tests/gateway/codex_adapter.test.js`.
- Added `docs/adapters/codex.md`.
- Updated `policies/agent-capabilities.json` to keep Codex `enabled: false`
  while making the note match the new dormant adapter state.
- Updated `README.md`, `CHANGELOG.md`, and `docs/adr/ADR-004-mvp-scope.md`
  so the documentation distinguishes the dormant dry-run adapter from deferred
  real Codex execution.

## TDD trail

1. Wrote `tests/gateway/codex_adapter.test.js` first.
2. Confirmed the initial red state with `ERR_MODULE_NOT_FOUND` for
   `gateway/src/adapters/codex_adapter.js`.
3. Implemented the adapter and expanded tests for disabled methods, explicit
   registry registration, enabled dry-run delegation, policy denial, and cwd
   guard behavior.

## Decisions

- Codex remains disabled by registry data. The adapter checks
  `registries.getAgent("codex")?.enabled === true` before any method proceeds.
- The generic adapter registry was not changed because the existing project
  pattern registers concrete adapter instances externally. The Codex test covers
  that it can be registered and still fails closed when disabled.
- Enabled dry-run `delegate` reuses the shared policy engine and cwd guard even
  though the task only required dry-run behavior. This keeps Codex aligned with
  Gemini and Claude adapter safety boundaries.
- Real headless execution and supervised `spawn`/`ask`/`view`/`kill` behavior
  fail closed with `ADAPTER_NOT_IMPLEMENTED`.
- No Codex access was added for `restricted` repositories. The existing
  capabilities registry still limits Codex to `unrestricted` and `internal`.

## Verification

- `node --test tests/gateway/codex_adapter.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Review request

Please review the implementation and create either:

- `plan/reviews/P_0_0-1_reviewed_OK.md`
- `plan/reviews/P_0_0-1_reviewed_KO.md`

If KO, include the corrections required for trial 2.

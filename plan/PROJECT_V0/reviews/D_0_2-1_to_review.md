# D/0/2 Trial 1 - To Review

## Summary

Implemented runtime path configuration fields and documented environment variables.

## What changed

- Added `artifactStoreRoot` resolved under `AGENTS_WORKSPACE` by default.
- Added `approvalMaxWaitMs` with default `60000`.
- Added `repoRoots` parsed from colon-separated `AGENTS_REPO_ROOTS`.
- Kept relative runtime paths resolved under `workspace`.
- Kept absolute runtime paths preserved.
- Added `tests/gateway/config_paths.test.js`.
- Added README environment variable documentation.
- Updated `CHANGELOG.md`.

## Decisions

- `AGENTS_POLICIES_DIR` remains resolved with `path.resolve` instead of under workspace, matching the existing config behavior and the fact that policies are repo metadata rather than runtime output.
- Invalid or empty `AGENTS_APPROVAL_MAX_WAIT_MS` falls back to `60000` via `parseInteger`.

## Verification

- `node --test tests/gateway/config_paths.test.js gateway/tests/scaffold.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `beae88b feat(config): add runtime path settings (D/0/2)`

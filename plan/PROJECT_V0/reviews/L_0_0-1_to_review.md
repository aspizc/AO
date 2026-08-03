# L/0/0 trial 1 - to review

## What was implemented

- Added `gateway/src/core/artifact_store.js`.
- Implemented `configureArtifactStore({ artifactStoreRoot })`.
- Implemented `put({ traceId, kind, classification, producedBy, content, sanitizedFrom })`.
- Implemented `get({ artifactId })`.
- Implemented `list({ traceId })`.
- Stored artifact content on disk under the configured root and a sanitized trace directory.
- Persisted artifact metadata through `artifact_repo`.
- Emitted `ARTIFACT_CREATED` audit events.
- Added tests in `tests/gateway/artifact_store.test.js`.
- Updated `CHANGELOG.md` with the L/0/0 entry.

## Why

Artifacts are the persisted exchange medium between roles. The store provides durable content on disk, SQLite metadata for discovery and correlation, and audit events for traceability.

## Decisions

- Physical path segments for `traceId` and `kind` are sanitized to prevent path traversal. The original `traceId` and `kind` are still persisted in SQLite and audit events.
- `get` returns `content` as a `Buffer` and the module documents that behavior, preserving binary artifacts while allowing callers to convert to string when appropriate.
- The test for `sanitizedFrom` creates an original artifact first because the SQLite schema enforces a real foreign key.

## Verification

- First TDD run failed as expected because `gateway/src/core/artifact_store.js` did not exist:
  `npm --prefix gateway test -- ../tests/gateway/artifact_store.test.js`
- Focused gateway test passed after implementation:
  `npm --prefix gateway test -- ../tests/gateway/artifact_store.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 26 passed.
  - CLI tests: 25 passed.

## Commit

- `e3368e3 feat(artifacts): add filesystem artifact store (L/0/0)`

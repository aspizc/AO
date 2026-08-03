# D/0/1 Trial 1 - To Review

## Summary

Implemented the streaming audit reader with filters and corrupt-line visibility.

## What changed

- Added `query({ traceId, type, limit })` to `gateway/src/core/audit.js`.
- Reads the JSONL audit file through `fs.createReadStream` and `readline`.
- Supports filtering by `traceId`, `type`, or both.
- Applies `limit` to the most recent matching events while preserving chronological order.
- Returns `{ _corrupt: true, raw }` markers for unparsable lines instead of silently dropping them.
- Returns `[]` for a configured audit log path that does not exist yet.
- Added `tests/gateway/audit_reader.test.js`.
- Updated `CHANGELOG.md`.

## Decisions

- Kept only a bounded result tail in memory while streaming instead of collecting all matching rows and slicing afterward. This follows the task's warning not to load large audit files into memory.
- Corrupt lines are surfaced even when filters are active because a corrupt line cannot be safely classified by `traceId` or `type`.

## Verification

- `node --test tests/gateway/audit_reader.test.js tests/gateway/audit_writer.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `e536495 feat(audit): add reader filters (D/0/1)`

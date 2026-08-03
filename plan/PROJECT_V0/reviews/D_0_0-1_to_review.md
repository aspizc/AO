# D/0/0 Trial 1 - To Review

## Summary

Implemented the append-only JSONL audit writer.

## What changed

- Added `gateway/src/core/audit.js`.
- Added `configureAudit({ auditLog })`.
- Added `append(event)` that enriches each event with UUID v4 `eventId` and UTC ISO-8601 `timestamp`.
- Added `_resetForTests()` for isolated tests.
- Added audit writer tests for:
  - file creation
  - valid JSONL event
  - UUID v4 and timestamp shape
  - append-only behavior
  - required configuration
  - required `type`
  - parent directory creation
  - default config audit path
- Updated `CHANGELOG.md`.

## Decisions

- Generated `eventId` and `timestamp` override any caller-provided values. The plan sample spreads `event` last, but audit integrity is stronger if callers cannot forge writer-generated metadata.
- Used synchronous `appendFileSync` because D/0/0 asks for a small durable append-only writer and the rest of the gateway core is currently synchronous.

## Verification

- `node --test tests/gateway/audit_writer.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `0d80274 feat(audit): add jsonl writer (D/0/0)`

# Review Submission - Task S/0/0 (Trial 1)

## What was done
- Added `getMessageScopedToTrace(messageId, traceId)` to `message_repo`.
- Added focused repository tests for create/get, trace-scoped listing, cross-trace lookup denial, and append-only API shape.
- Updated CHANGELOG. Closes S/0/0.

## Why
- Stage S needs a message store with strict trace scoping before exposing MCP tools. This also prepares the U/0/4 skipped cross-trace message bypass test to become real coverage in S/0/1.

## Decisions Taken
- Kept the existing `getMessageById` for internal direct lookup, but added the scoped lookup required for any access path that has caller-supplied `traceId`.
- Did not add update/delete APIs; messages remain append-only.

## Verification
- `node --test tests/gateway/message_repo.test.js tests/gateway/domain_repositories.test.js` - passed.
- `npm --prefix gateway test -- ../tests/gateway/message_repo.test.js ../tests/gateway/domain_repositories.test.js` - passed.

## Commit
- `383c5a8` - `feat(messages): add trace-scoped message repository (S/0/0)`


# S/0/1 Trial 1 - To Review

## Task

- `plan/S/0/01.md`

## What changed

- Added `gateway/src/tools/message.js` with `message.send`, `message.list`, and `message.reply`.
- Registered message tools in the Gateway MCP tool registry and MCP smoke expectations.
- Added Gateway tests for message tool registration, audited sends, trace-scoped listing, same-trace replies, and cross-trace reply denial.
- Replaced the skipped U/0/4 cross-trace message bypass test with real coverage.
- Updated threat-model/checklist evidence and changelog.

## Decisions

- `message.reply` validates the parent with `getMessageScopedToTrace(parentMessageId, traceId)` and returns `{ "error": "PARENT_NOT_FOUND" }` when the parent belongs to another trace.
- `message.list` requires `requesterTraceId` and returns `{ "error": "TRACE_MISMATCH" }` unless it matches the listed `traceId`.
- Public message tool responses are camelCase, including `message.list`, matching `send`/`reply` and `schemas/message.schema.json`.
- The existing `messages` table is unchanged. Reply parent metadata is returned to the caller and included in the `MESSAGE_SENT` audit event without adding a new persistence column.
- Message tool state tests are consolidated into one test case to avoid test-runner interleaving against the repo's process-global state/audit singletons.
- Gateway tests now run with explicit process isolation to avoid hidden state leakage between test files.

## Reviewer findings addressed

- Fixed cross-trace list access by requiring matching `requesterTraceId`.
- Fixed `message.list` wire shape so it no longer exposes raw DB snake_case rows.

## Verification

- `npm --prefix gateway test`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `b927bc1 feat(messages): expose MCP message tools (S/0/1)` before amend; final commit keeps the same message.

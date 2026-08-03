# S/0/1 Trial 3 - To Review

## Task

- `plan/S/0/01.md`

## Corrections since Trial 2

- Replaced forgeable requester fields with a Gateway-derived `messageAccessToken` emitted by `orchestration.create`.
- `message.send`, `message.list`, and `message.reply` reject invalid or other-trace tokens with `TRACE_ACCESS_DENIED`.
- The default message access secret is random high entropy, persisted under the Gateway workspace, and can be overridden with `AGENTS_MESSAGE_ACCESS_SECRET`.
- `message.list` returns camelCase public message records.
- Fixed message list ordering for same-millisecond sends by ordering `created_at, rowid` instead of random `message_id`.
- Gateway test runner uses explicit process isolation to avoid state leakage across test files.

## Verification

- `node --test tests/gateway/tool_message.test.js tests/e2e/bypass_regression.test.js tests/gateway/tool_orchestration_task.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- Pending amend at handoff creation; expected final message: `feat(messages): expose MCP message tools (S/0/1)`

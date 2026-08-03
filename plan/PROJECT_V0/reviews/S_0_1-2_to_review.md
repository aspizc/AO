# S/0/1 Trial 2 - To Review

## Task

- `plan/S/0/01.md`

## Corrections since Trial 1

- Addressed reviewer finding: `message.list` now requires `requesterTraceId` and returns `{ "error": "TRACE_MISMATCH" }` when a caller attempts to list another trace.
- Addressed reviewer finding: `message.list` now returns the same camelCase public shape as `message.send` and `message.reply`.
- Extended U/0/4 bypass coverage to assert both cross-trace reply denial and cross-trace list denial.
- Stabilized Gateway tests with explicit Node process isolation in `gateway/package.json`.
- Replaced forgeable `requesterTraceId` with a Gateway-derived `messageAccessToken` emitted by `orchestration.create`.
- `message.send`, `message.list`, and `message.reply` now reject forged or other-trace tokens with `TRACE_ACCESS_DENIED`.

## Verification

- `npm --prefix gateway test`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- Pending amend at handoff creation; expected final message: `feat(messages): expose MCP message tools (S/0/1)`

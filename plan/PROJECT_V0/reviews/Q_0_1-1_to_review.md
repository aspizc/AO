# Q/0/1 trial 1 to review

## Implemented

- Added `gateway/src/services/approval_service.js`.
- Added `approvalBus` `EventEmitter` for later wait support.
- Added service methods:
  - `request`
  - `respond`
  - `poll`
- Added audit events:
  - `APPROVAL_REQUIRED`
  - `APPROVAL_GRANTED`
  - `APPROVAL_DENIED`
- Added `tests/gateway/approval_service.test.js`.
- Updated `CHANGELOG.md`.

## Why

Approval requests must be async-first: `request` returns `pending` immediately, `respond` transitions the repository state, and `poll` performs a cheap read. This prepares the bounded wait layer for later Q tasks without blocking MCP calls.

## Decisions

- `respond` is idempotent after a decision: it returns the current stored status and does not throw or emit again.
- `approvalBus` emits only on the first successful grant/deny transition.
- Invalid operator decisions are limited to `granted` and `denied`; `expired` remains repository-level state, not a human response.
- Response notes are truncated to 500 chars in audit.

## Verification

- Red: `node --test tests/gateway/approval_service.test.js` failed before `approval_service.js` existed.
- Green: `node --test tests/gateway/approval_service.test.js`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `bb89b7d feat(approvals): add async approval service (Q/0/1)`

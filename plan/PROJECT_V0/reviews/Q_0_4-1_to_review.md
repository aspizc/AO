# Q/0/4 trial 1 to review

## Implemented

- Added `waitForDecision` to `gateway/src/services/approval_service.js`.
- Added `approval.wait` MCP tool.
- Passed `config.approvalMaxWaitMs` from `getToolRegistry` into approval tools.
- Added timeout audit event `APPROVAL_WAIT_TIMEOUT`.
- Added `tests/gateway/approval_wait.test.js`.
- Updated exact tool registry list tests.
- Updated `CHANGELOG.md`.

## Why

Some clients need to wait for a decision, but only with bounded blocking. This adds the only blocking approval primitive and caps it by the server maximum so a client cannot create an unbounded MCP call.

## Decisions

- `waitForDecision` returns immediately for non-pending approvals and for missing IDs.
- Timeout uses `Math.min(clientTimeout, serverMaxMs)` and defaults to the server max when the client omits `timeoutMs`.
- Listener cleanup removes the `approvalBus` listener and clears the timer on every resolution path.
- The timeout path writes `APPROVAL_WAIT_TIMEOUT` with the approval trace when available.
- `approval.wait` is registered after request/respond/poll in the approval tool group.

## Verification

- Red: `node --test tests/gateway/approval_wait.test.js` failed because `waitForDecision` did not exist.
- Green: `node --test tests/gateway/approval_wait.test.js`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `9e4b354 feat(approvals): add bounded approval wait (Q/0/4)`

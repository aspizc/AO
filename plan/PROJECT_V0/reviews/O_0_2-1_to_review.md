# O/0/2 Trial 1 - To Review

## Implemented

- Added `tests/gateway/claude_policy.test.js`.
- Added integration coverage proving `claude-code` cannot spawn on restricted repo `cvision`.
- Verified policy denial happens before any `SESSION_STARTED` audit event.
- Added dry-run allow coverage for `claude-code` delegating on unrestricted repo `sample-apps`.
- Added `gateway/src/services/agent_service.js` because O/0/2 requires exercising the adapter through `AgentService` and that service did not exist yet.
- Updated `CHANGELOG.md`.

## Why

O/0/2 requires explicit evidence that Claude cannot touch restricted repositories before tmux or adapter work begins. The test binds the existing policy model to the Claude adapter path through the service layer that will be used by agent tooling.

## Decisions

- Implemented the minimal AgentService needed by the documented contract: policy first, adapter lookup, optional session persistence when `taskId` is provided, and `ask` / `view` / `kill` requiring existing sessions.
- Allowed `taskId: null` for service calls by skipping session persistence in that case. The current `sessions.task_id` schema is `NOT NULL`, while the O/0/2 task example passes `taskId: null`; this keeps the policy test focused and avoids fabricating tasks.
- Kept policy evaluation in both AgentService and ClaudeAdapter. This preserves defense in depth: the service blocks before adapter work, while direct adapter usage remains protected.
- Resolved the policies directory from the test file location instead of process cwd because gateway tests run from both the repository root and the `gateway/` package context.

## TDD Evidence

- First added `tests/gateway/claude_policy.test.js`.
- Initial useful failure: `ERR_MODULE_NOT_FOUND` for `gateway/src/services/agent_service.js`.
- Implemented AgentService and fixed the policies path so the focused test and full CI passed.

## Verification

- `node --test tests/gateway/claude_policy.test.js`
- `node --test ../tests/gateway/claude_policy.test.js` from `gateway/`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

All passed.

## Commit

- `113b674 test(adapters): enforce claude restricted policy (O/0/2)`

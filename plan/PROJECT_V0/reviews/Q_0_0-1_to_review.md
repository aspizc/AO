# Q/0/0 trial 1 to review

## Implemented

- Extended `gateway/src/core/repositories/approval_repo.js`.
- Added `ApprovalStateError`.
- Added state-machine APIs:
  - `createPendingApproval`
  - `getApproval`
  - `decideApproval`
  - `listPendingApprovals(traceId?)`
- Preserved compatibility aliases:
  - `createApproval` now creates only pending approvals.
  - `getApprovalById` aliases `getApproval`.
- Removed the unsafe direct decision update path.
- Added `tests/gateway/approval_state.test.js`.
- Updated `CHANGELOG.md`.

## Why

Approvals need repository-level lifecycle invariants before async approval tools are added. The repository now enforces `pending -> granted|denied|expired` and rejects replay/double-response attempts.

## Decisions

- `createApproval` remains exported for prior repository tests, but it now delegates to `createPendingApproval` and rejects non-pending creation.
- `decideApproval` validates target status, verifies the row is pending, and updates with `WHERE approval_id = ? AND status = 'pending'` to keep the transition guarded at SQL level too.
- The `note` parameter is stored in `payload` following the task plan's suggested schema, since there is no separate `note` column yet.
- Unreachable or repeated decisions throw typed `ApprovalStateError` codes (`NOT_FOUND`, `INVALID_STATUS`, `ALREADY_DECIDED`).

## Verification

- Red: `node --test tests/gateway/approval_state.test.js` failed because the state-machine exports did not exist.
- Green: `node --test tests/gateway/approval_state.test.js tests/gateway/domain_repositories.test.js`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `1e63d32 feat(approvals): add approval state machine (Q/0/0)`

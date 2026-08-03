# Review Submission - Task Q/0/5 (Trial 1)

## What was done
- Added `AGENTS_AUTOAPPROVE` parsing to Gateway config as comma-separated scopes.
- Added bounded auto-grant behavior to approval requests.
- Added immutable `NEVER_AUTO` actions: `git.push.protected`, `dependency.change`, and `code.write.protected_branch`.
- Auto-grants are denied for restricted contexts and audited as `APPROVAL_AUTO_GRANTED`.
- Injected Gateway config into the `approval.request` tool handler.
- Added `docs/adr/ADR-006-bounded-autoapprove.md`.
- Added `tests/gateway/autoapprove_mechanism.test.js`.
- Updated `CHANGELOG.md`.

## Why
- Q/0/5 creates the shared opt-in auto-approval mechanism required by later `code.apply` and `plan.apply` scopes.

## Decisions Taken
- Kept auto-approval default-off via an empty `autoApproveScopes` config value.
- Treated `classification`, `repoClassification`, and `repositoryClassification` values of `restricted` as restricted contexts.
- Stored auto-granted approvals through the existing approval table path and emitted the approval bus event so waits resolve immediately.

## Verification
- `node --test tests/gateway/autoapprove_mechanism.test.js` - passed.
- `node scripts/smoke_mcp.mjs` - passed.
- `npm --prefix gateway test` - passed, 61 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed; structure 93 passed, gateway node tests 61 passed, e2e 4 passed, MCP smoke OK, policy validate OK, CLI pytest 29 passed.

## Commit
- `706847e` - `feat(approval): add bounded auto-approval (Q/0/5)`

# Review Submission - Task B/0/2 (Trial 1)

## What was done
- Added `policies/roles.json` with version `1` and the 8 V4 roles: `orchestrator`, `planner`, `coder`, `restricted-coder`, `reviewer`, `tester`, `documenter`, and `security_reviewer`.
- Declared explicit `allowActions` and `denyActions` for every role.
- Ensured `orchestrator.denyActions` includes `code.write`, `code.read.raw_restricted`, `artifact.get.raw_restricted`, and `approval.respond`.
- Added `tests/gateway/registry_roles.test.js` with the required six boundary tests.
- Updated `CHANGELOG.md` with the B/0/2 entry.

## Why
- V4 separates technical agents from roles; policy needs a declarative registry of role permissions before evaluation can be implemented.
- The `orchestrator` role is human-facing and prompt-injection sensitive, so direct write, raw restricted reads, and self-approval must be explicitly denied.

## Decisions Taken
- Used the same cwd-independent `import.meta.url` path resolution pattern as the previous registry tests.
- Added a manual verification that no role's `allowActions` includes `approval.respond`, covering a common mistake even though the required test specifically locks `orchestrator`.
- Kept `restricted-coder` only in `roles.json`; the test reads `agent-capabilities.json` and asserts it is not an agent.

## Verification
- Initial Red: `node --test tests/gateway/registry_roles.test.js` failed with `ENOENT` because `policies/roles.json` did not exist.
- `python3 -m json.tool policies/roles.json > /tmp/roles_formatted.json` - passed.
- `node --test tests/gateway/registry_roles.test.js` - passed.
- `npm --prefix gateway test -- --test-name-pattern roles` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed with `==> All checks passed.`
- `node -e "..."` role boundary check printed `8`, orchestrator deny actions, and `no approval.respond allow`.

## Commit
- `90b53c4` - `feat(registry): add roles.json with 8 V4 roles and orchestrator boundaries (B/0/2)`

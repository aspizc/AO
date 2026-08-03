# H/0/2 trial 1 to review

## Implemented

- Added `gateway/src/adapters/base_adapter.js`.
- Added `CwdViolation`.
- Added `assertSafeCwd(cwd, allowedRoots)` with default-deny behavior.
- Added `BaseAdapter` with declarative async methods:
  - `delegate`
  - `spawn`
  - `ask`
  - `view`
  - `kill`
- Added `tests/gateway/base_adapter.test.js` with adversarial cwd coverage.
- Updated `CHANGELOG.md`.

## Why

This closes the cwd-bypass risk for adapters before future tasks start spawning CLI processes. Policy approval alone is not enough if an adapter can be tricked into running outside the configured workspace.

## Decisions

- `assertSafeCwd` resolves `cwd` and every allowed root via `fs.realpathSync` before comparison.
- Allowed-root matching requires exact match or `root + path.sep` prefix, so `/repo/foo-evil` does not match `/repo/foo`.
- Missing or unreachable allowed roots fail closed with `CwdViolation`; the function does not silently drop bad roots.
- `BaseAdapter` is intentionally only a contract at this stage. Implementations are required to override every method.

## Verification

- Red: `node --test tests/gateway/base_adapter.test.js` failed before `gateway/src/adapters/base_adapter.js` existed.
- Green: `node --test tests/gateway/base_adapter.test.js`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `aee40e5 feat(adapters): add base adapter cwd guard (H/0/2)`

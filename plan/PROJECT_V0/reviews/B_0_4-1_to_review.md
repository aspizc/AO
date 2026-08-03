# Review Submission - Task B/0/4 (Trial 1)

## What was done
- Added `gateway/src/core/registry.js` with `RegistryError` and `loadRegistries({ policiesDir })`.
- The loader reads `agent-capabilities.json`, `repositories.json`, and `roles.json` from the filesystem on every call.
- Added fail-fast typed errors for missing files, invalid JSON, invalid shapes, invalid agents/repos, missing roles, and cross-registry invariants.
- Added getters `getAgent`, `getRepo`, `getRole`, `getProtectedBranches`, plus `raw()` clone output.
- Added `tests/gateway/registry_loader.test.js` covering load, getters, unknown IDs returning null, defensive copies, invalid JSON, missing registry, and restricted repo cross-invariant failure.
- Updated `CHANGELOG.md` with the B/0/4 entry.

## Why
- Stage B registries need a runtime boundary that fails fast before the Gateway starts with corrupt policy data.
- Typed `RegistryError` codes are needed by the future CLI validation command to explain exactly what failed.

## Decisions Taken
- Kept registry loading filesystem-based instead of static imports, avoiding global module cache and matching the task requirement.
- Added defensive-copy tests for `getProtectedBranches()` and `raw()` because the task explicitly warns against mutating output references.
- Used predicate-based `assert.throws` checks so tests verify the specific `RegistryError.code`, not only message text.
- Preserved original registry object references for individual getters; only aggregate list/raw APIs return copies. This keeps getters simple while preventing mutation through `raw()` and protected branch arrays.

## Verification
- Initial Red: `node --test tests/gateway/registry_loader.test.js` failed with `ERR_MODULE_NOT_FOUND` because `gateway/src/core/registry.js` did not exist.
- `node --test tests/gateway/registry_loader.test.js` - passed.
- `node -e "import('./gateway/src/core/registry.js').then(...)"` - printed `restricted` and `true`, confirming real registry load and unknown getter null behavior.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed with `==> All checks passed.`
- `rg -n "REGISTRY_MISSING|REGISTRY_INVALID_JSON|REGISTRY_INVARIANT|getProtectedBranches|raw\\(\\)|import .* from .*policies" gateway/src/core/registry.js tests/gateway/registry_loader.test.js` - confirmed typed codes/getters and no static registry imports.

## Commit
- `9d34dde` - `feat(core): registry loader with cross-invariants and typed errors (B/0/4)`

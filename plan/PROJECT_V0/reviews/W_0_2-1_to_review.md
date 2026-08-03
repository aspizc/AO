# Review Submission - Task W/0/2 (Trial 1)

## What was done
- Added `policies/profiles/mvp2` as a complete alternate policies directory for `AGENTS_POLICIES_DIR`.
- Enabled Codex only in the MVP2 profile while keeping the base registry disabled.
- Preserved Codex `allowedClassifications` as `["unrestricted", "internal"]`.
- Added tests proving the base registry remains disabled, the MVP2 profile enables Codex for `sample-apps`, restricted repos are still denied, and default model/effort resolve to `gpt-5`/`medium`.
- Documented profile activation in the Codex adapter guide and updated CHANGELOG.

## Why
- MVP2.0 needs an explicit operator profile to enable the real Codex coder without changing the safe base registry.
- Codex must remain unavailable for restricted repositories even when enabled for the MVP2 workflow.

## Decisions Taken
- Used a complete alternate policies directory via `AGENTS_POLICIES_DIR=$PWD/policies/profiles/mvp2`.
- Did not add a new overlay mechanism because the existing Gateway/CLI already support alternate policy directories.
- Copied all required registries into the profile to keep validation deterministic.

## Verification
- `node --test tests/gateway/codex_enable_profile.test.js` - passed.
- `node --test tests/gateway/codex_enable_profile.test.js tests/gateway/codex_supervised.test.js tests/gateway/codex_adapter.test.js` - passed.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate --policies-dir policies/profiles/mvp2` - passed.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate --policies-dir policies` - passed.
- `npm --prefix gateway test` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit
- `5c8d574` - `feat(policies): add MVP2 codex enable profile (W/0/2)`

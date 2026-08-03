# Review Submission - Task B/0/0 (Trial 1)

## What was done
- Added `policies/agent-capabilities.json` with version `1`, agents `gemini-cli`, `claude-code`, and `codex`, plus `protectedBranches`.
- Declared `restricted` classification only for `gemini-cli`; `claude-code` and `codex` are limited to `unrestricted` and `internal`.
- Declared `orchestrator` role for `gemini-cli` and `claude-code`, while `codex` remains disabled and limited to coder/reviewer/tester roles.
- Added `tests/gateway/registry_agent_capabilities.test.js` with the required registry boundary checks.
- Updated `gateway/package.json` test script to include `../tests/gateway/**/*.test.js`, so `npm --prefix gateway test` and `./scripts/ci.sh` actually run the new gateway-level registry test.
- Updated `CHANGELOG.md` with the B/0/0 entry.

## Why
- Stage C policy will be data-driven, so agent capability boundaries must be explicit in JSON before policy evaluation is implemented.
- TM-02 and related restricted-data boundaries need a declarative source of truth showing that only Gemini can operate on restricted classifications.

## Decisions Taken
- Adjusted `gateway/package.json` beyond the task's listed files because the required test path is `tests/gateway/...`, while the existing package test script only covered `gateway/tests/...`. Without this change, the required B/0/0 test would not run in CI.
- Resolved the registry test path from `import.meta.url` instead of process cwd so it works both when run directly from repo root and through `npm --prefix gateway test`.
- Kept the registry free of absolute paths, secrets, API keys, and environment-specific values.

## Verification
- Initial Red: `node --test tests/gateway/registry_agent_capabilities.test.js` failed with `ENOENT` because `policies/agent-capabilities.json` did not exist.
- `python3 -m json.tool policies/agent-capabilities.json > /tmp/agent_capabilities_formatted.json` - passed.
- `node --test tests/gateway/registry_agent_capabilities.test.js` - passed.
- `npm --prefix gateway test` - passed and included both `../tests/gateway/registry_agent_capabilities.test.js` and `gateway/tests/scaffold.test.js`.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed with `==> All checks passed.`
- `node -e "..."` classification check printed `gemini-cli` as `unrestricted,internal,restricted`, and both `claude-code` and `codex` as `unrestricted,internal`.
- `rg -n "(/home/|/Users/|[A-Za-z]:\\\\|secret|token|api[_-]?key|restricted)" ...` - no absolute path or secret/API-key hits; expected `restricted` hits only in allowed registry/test assertions.

## Commit
- `f5341e8` - `feat(registry): add agent-capabilities.json with V4 boundaries (B/0/0)`

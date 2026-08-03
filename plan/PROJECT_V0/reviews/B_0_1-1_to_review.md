# Review Submission - Task B/0/1 (Trial 1)

## What was done
- Added `policies/repositories.json` with version `1` and four repositories: `cvision`, `cvlib`, `developer-tools`, and `sample-apps`.
- Classified `cvision` and `cvlib` as `restricted` and allowed only `gemini-cli`.
- Classified `developer-tools` as `internal` and `sample-apps` as `unrestricted`, both allowing `gemini-cli`, `claude-code`, and `codex`.
- Added `tests/gateway/registry_repositories.test.js` covering the five required repository classification cases.
- Updated `CHANGELOG.md` with the B/0/1 entry.

## Why
- Policy evaluation needs a declarative repository classification registry before it can decide `(agent, role, repo, action)`.
- The registry encodes the TM-03/TM-02 boundary that restricted repositories are Gemini-only and no filesystem paths are embedded in policy data.

## Decisions Taken
- Resolved the test fixture path from `import.meta.url`, matching the B/0/0 pattern, so the test works from repo root and through `npm --prefix gateway test`.
- Kept the registry limited to the four task-specified representative repositories and avoided runtime paths or operator-specific data.

## Verification
- Initial Red: `node --test tests/gateway/registry_repositories.test.js` failed with `ENOENT` because `policies/repositories.json` did not exist.
- `python3 -m json.tool policies/repositories.json > /tmp/repositories_formatted.json` - passed.
- `node --test tests/gateway/registry_repositories.test.js` - passed.
- `npm --prefix gateway test` - passed and included `registry_agent_capabilities`, `registry_repositories`, and scaffold tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed with `==> All checks passed.`
- `node -e "..."` repository classification check printed restricted repos as Gemini-only and non-restricted repos as allowing all three agents.
- `rg -n "(/home/|/Users/|[A-Za-z]:\\\\|secret|token|api[_-]?key|restricted)" policies/repositories.json tests/gateway/registry_repositories.test.js` - no absolute path or secret/API-key hits; expected `restricted` hits only in registry/test assertions.

## Commit
- `b6a7e70` - `feat(registry): add repositories.json with V4 classifications (B/0/1)`

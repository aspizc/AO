# Review Submission - Task C/0/1 (Trial 1)

## What was done
- Added `gateway/src/core/policy_engine.js` exporting pure `evaluate(rawCtx, registries)`.
- Implemented classification-only rules: unknown agent deny, unknown repo deny, agent classification boundary deny, repo allowed-agent deny, excluded path deny, and final classification allow.
- Added `tests/gateway/policy_classification.test.js` covering Claude/Codex denied on restricted repo, Gemini allowed on restricted repo, unknown repo, unknown agent, excluded paths, and deterministic output.
- Updated `gateway/package.json` test script to remove the `|| node --test` fallback that was masking failures in repo-root `tests/gateway` tests.
- Updated `CHANGELOG.md` with the C/0/1 entry.

## Why
- Classification boundaries close the most critical Stage C policy layer before role, approval, and sanitization rules are added.
- The policy engine must remain deterministic and pure; callers provide already-loaded registries.

## Decisions Taken
- Added `unknown_agent_is_denied` and `evaluate_is_deterministic_for_same_input` tests beyond the task examples because both are direct acceptance criteria or baseline fail-closed behavior.
- Resolved `policies` in the classification test from `import.meta.url`, so tests pass both from repo root and through `npm --prefix gateway test`.
- Removed the npm test fallback because it allowed the second `node --test` invocation to pass after `../tests/gateway` failed, incorrectly making CI green. With repo-root tests now required, failures must propagate.

## Verification
- Initial Red: `node --test tests/gateway/policy_classification.test.js` failed with `ERR_MODULE_NOT_FOUND` because `gateway/src/core/policy_engine.js` did not exist.
- `node --test tests/gateway/policy_classification.test.js` - passed.
- `npm --prefix gateway test` - passed and executed repo-root gateway tests without fallback.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed with `==> All checks passed.`
- `rg -n "from \"node:(fs|net|http|https|child_process)|require\\(" gateway/src/core/policy_engine.js` - no matches, confirming no I/O imports.

## Commit
- `f6f2cd4` - `feat(policy): add classification boundary evaluation (C/0/1)`

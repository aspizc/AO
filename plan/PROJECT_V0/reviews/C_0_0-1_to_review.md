# Review Submission - Task C/0/0 (Trial 1)

## What was done
- Added `gateway/src/core/policy_types.js` exporting frozen `Decision` constants and frozen canonical `Actions`.
- Added `isRawKind(kind)` for the three raw artifact kinds: `raw_diff`, `raw_code`, and `raw_stacktrace`.
- Added `normalizePolicyContext(ctx)` to require `agent`, `role`, and `action`, normalize optional fields to `null`, stringify core fields, and return a frozen object.
- Added `tests/gateway/policy_model.test.js` covering stable decisions, routine actions, approval actions, raw kind recognition, required context fields, and immutable normalized output.
- Updated `CHANGELOG.md` with the C/0/0 entry.

## Why
- Stage C policy rules need a stable vocabulary for decisions, actions, and normalized context before rule evaluation starts.
- Keeping this module pure and immutable prevents later rules from inventing ad-hoc strings or mutating context during evaluation.

## Decisions Taken
- Added a sixth test for immutable normalized context, beyond the five specified tests, because immutability is an explicit acceptance criterion.
- Kept `RAW_ARTIFACT_KINDS` private and exposed only `isRawKind`, limiting the public API to what rules need.
- Did not import `fs`, network modules, registries, or any I/O helpers; this module is pure policy vocabulary.

## Verification
- Initial Red: `node --test tests/gateway/policy_model.test.js` failed with `ERR_MODULE_NOT_FOUND` because `gateway/src/core/policy_types.js` did not exist.
- `node --test tests/gateway/policy_model.test.js` - passed.
- `rg -n "from \"node:(fs|net|http|https)|require\\(" gateway/src/core/policy_types.js` - no matches, confirming no I/O imports.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed with `==> All checks passed.`
- `node -e "import('./gateway/src/core/policy_types.js').then(...)"` - printed `true true true 25`, confirming `Decision`, `Actions`, and normalized context are frozen and there are 25 canonical actions.

## Commit
- `300b5fe` - `feat(policy): add decision model and context normalization (C/0/0)`

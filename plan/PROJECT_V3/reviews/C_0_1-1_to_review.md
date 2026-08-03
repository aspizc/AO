# Review Submission - Task PROJECT_V3/C/0/1 (Trial 1)

## What was done
- Completed the README Runtime Environment table with every `AGENTS_*` variable read by `gateway/src/config.js`.
- Replaced the ambiguous out-of-scope wording with MVP2.0 out-of-scope and PROJECT_V1 experimental sections.
- Added brief optional local infrastructure references to `docker/docker-compose.yml`.
- Added a structure test that compares README env docs against `gateway/src/config.js`.
- Updated `CHANGELOG.md` under `## Unreleased` with `Closes V3 C/0/1`.

## Why
- The README must not drift from the Gateway runtime configuration.
- Existing PROJECT_V1 Postgres, Redis Streams, LangGraph, and OTel code should be described as experimental instead of undocumented or out of scope.

## Decisions Taken
- Kept `gateway/src/config.js` as the source of truth and did not change Gateway code.
- Marked Redis and OTel variables as V1 experimental in their descriptions.
- Documented `AGENTS_MESSAGE_ACCESS_SECRET` as empty by default, with the file-backed secret path as the fallback behavior.

## Verification
- `.venv/bin/pytest tests/structure/test_readme_env_parity.py` - passed.
- `.venv/bin/pytest tests/structure` - 108 passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit
- `3775cb9` - docs(v3): reconcile runtime environment docs (PROJECT_V3 C/0/1)

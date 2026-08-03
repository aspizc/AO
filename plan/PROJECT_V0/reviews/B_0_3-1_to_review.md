# Review Submission - Task B/0/3 (Trial 1)

## What was done
- Added 7 JSON Schema 2020-12 domain schemas under `schemas/`: orchestration session, task, artifact, message, policy decision, approval, and registry meta.
- Each schema includes `$id`, `version`, required fields, enums where specified, and top-level `additionalProperties: false`.
- Added 14 fixtures under `tests/fixtures/schemas/`: one valid and one invalid fixture per schema.
- Added `tests/gateway/schemas.test.js` using AJV 2020 plus `ajv-formats` to verify metadata, valid fixtures, and invalid fixtures for every schema.
- Added `ajv` and `ajv-formats` as direct gateway dependencies in `gateway/package.json` and `gateway/package-lock.json`.
- Updated `CHANGELOG.md` with the B/0/3 entry.

## Why
- Domain objects cross MCP, audit, persistence, sanitizer, and policy boundaries; schemas provide a versioned contract before Stage F/G consumers are implemented.
- Golden fixtures give future loader and repository tasks concrete validation inputs.

## Decisions Taken
- Used `createRequire` anchored at `gateway/package.json` in the root-level gateway test so dependencies resolve from `gateway/node_modules` while the test stays in the required `tests/gateway/` location.
- Kept invalid fixtures simple and focused on one schema violation each, usually an invalid enum, missing required field, bad date-time, or `minimum` violation.
- Added optional fields such as `goal`, `parentTaskId`, `sanitizedFrom`, `decidedAt`, and `decidedBy` only where they map naturally to the task's domain object hints.
- Used relative artifact/registry paths in fixtures; no operator absolute paths are embedded.

## Verification
- Initial Red: `node --test tests/gateway/schemas.test.js` first failed because AJV was not importable, then after dependency install failed with `ENOENT` for `schemas/orchestration-session.schema.json`.
- `npm --prefix gateway install ajv ajv-formats` - passed after rerunning with network approval.
- `node --test tests/gateway/schemas.test.js` - passed.
- `find schemas -maxdepth 1 -name '*.schema.json' | wc -l` - reported `7`.
- `find tests/fixtures/schemas -maxdepth 1 -type f -name '*.json' | wc -l` - reported `14`.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed with `==> All checks passed.`
- `node - <<'NODE' ... NODE` schema metadata check confirmed every schema has `$id`, `version: 1`, and top-level `additionalProperties: false`.

## Commit
- `c066045` - `feat(schemas): add 7 core domain schemas with golden fixtures (B/0/3)`

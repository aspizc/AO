# Review Submission - Task PROJECT_V3/D/0/0 (Trial 1)

## What was done
- Added `tests/gateway/telemetry_unit.test.js` with direct coverage for disabled no-op spans, trace id extraction precedence, safe tool-call attributes, value truncation, in-memory exporting, and stderr span JSON lines.
- Added `tests/gateway/trace_access_unit.test.js` with HMAC token roundtrip and negative verification cases for altered tokens, mismatched trace ids, mismatched secrets, missing tokens, and invalid token lengths.
- Added `tests/gateway/mcp_server_errors.test.js` with direct `createCallToolHandler` coverage for unknown tools, thrown handlers, audit append failures, error-code extraction/truncation, and invalid JSON error payloads.
- Updated `CHANGELOG.md` under `## Unreleased` with `Closes V3 D/0/0`.

## Why
- PROJECT_V3 D/0/0 closes the direct unit-test gap for Gateway observability, trace access tokens, and MCP tool-call error handling without changing the production MCP contract.

## Decisions Taken
- Kept this as characterization-only and did not modify `gateway/src/`.
- Characterized current `parseToolErrorCode` behavior as extracting top-level `error` or `code`; the task text mentions nested `error.code`, but production currently does not read that shape. Follow-up: decide whether nested `error.code` should be supported in a later production change.
- Used small fakes for telemetry spans and audit append in `mcp_server_errors.test.js`; used the real telemetry module and `InMemorySpanExporter` for direct telemetry coverage.

## Verification
- `npm --prefix gateway test` - passed, 71 test files.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed, all checks passed.

## Commit
- `1b3f9a8397ef6baa4fda241e30378cf2528ceeb7` - `test(v3): characterize gateway observability core (PROJECT_V3 D/0/0)`

# Review request: PROJECT_V1 E/0/0

## Scope

- Added Gateway telemetry config in `gateway/src/config.js`.
- Added OTel-inspired span tracer/exporter in `gateway/src/core/telemetry.js`.
- Wrapped MCP `tools/call` handling in `gateway/src/mcp_server.js`.
- Added Gateway telemetry docs in `gateway/README.md`.
- Added focused tests in `tests/gateway/otel_tool_spans.test.js`.
- Updated `CHANGELOG.md`.

## Acceptance Focus

- One span is created per MCP tool call when telemetry is enabled.
- Tool-call success, tool-result error, and thrown/unknown-tool error paths are
  represented on spans.
- Incoming `traceId`/`trace_id` from args or metadata is preserved; calls
  without trace id remain compatible and receive a generated trace id for
  telemetry/audit metadata.
- Telemetry is disabled by default, exports to stderr when enabled, and does not
  pollute MCP stdout.
- No MCP tool names or required schemas change.
- Span attributes stay safe: no raw prompts, artifact content, secrets,
  stdout/stderr payloads, or exception messages.
- The implementation intentionally avoids external OTel dependencies in this
  step; real W3C trace context and OTLP export remain future hardening.

## Verification

- `node --test --experimental-test-isolation=process --test-concurrency=1 tests/gateway/otel_tool_spans.test.js tests/gateway/mcp_bootstrap.test.js`
  - Result: `2 pass`.
- `npm --prefix gateway test`
  - Result: `65 pass`.

## Reviewer Instructions

Return `Verdict: OK` or `Verdict: KO`. If KO, list required fixes.

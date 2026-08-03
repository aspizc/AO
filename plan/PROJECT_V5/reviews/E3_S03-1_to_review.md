# Review Submission — V5 E3/S03 (Trial 1)

## Scope

- Split the audit writer into a shared JSONL append path, the existing
  JSONL-plus-Redis `append`, and a new JSONL-only `appendLocalOnly`.
- Made the direct coordination factory use the local-only writer by default
  while preserving explicit audit injection.
- Routed every requested `coordination.*` MCP call, including unknown tool
  names, to the local-only writer.
- Reduced coordination MCP audit records to allowlisted fields: event type,
  tool name, result status, safe trace ID, and canonical error code.
- Kept legacy MCP call records and the existing `agents:events` publisher path
  unchanged.

## TDD evidence

- RED: the audit module had no local-only writer, the direct factory emitted no
  default domain audit record, and nested registration metadata could reach a
  generic coordination audit record as a trace ID.
- GREEN: focused audit, telemetry, factory, and coordination tests passed
  31/31.
- Expanded audit, coordination, tool, bootstrap, and scaffold matrix passed
  207 tests, with six expected opt-in live Redis skips and zero failures.
- MCP smoke and `git diff --check` passed.
- No live Redis or shared MCP process was contacted.

## Security and compatibility evidence

- Publisher spies prove coordination domain and generic MCP audit records never
  invoke the Redis publisher, while a legacy event still publishes exactly
  once to `agents:events`.
- Sentinel values placed in body, token, digest, and nested metadata are absent
  from serialized JSONL.
- Only generated/MCP-metadata trace IDs, or the explicit top-level
  `coordination.send` trace ID, can be retained.
- Only canonical coordination errors plus the existing MCP wrapper codes
  `INVALID_INPUT` and `TOOL_ERROR` can be retained.
- Disabling telemetry disables both generic writers, as before.

## Review request

Review JSONL/Redis separation, namespace routing, audit-field allowlists, trace
provenance, error-code filtering, default direct-factory wiring, telemetry
gating, and legacy compatibility. Confirm `agents:events` and all
`message.*` behavior remain unchanged. Return `Verdict: OK` or `Verdict: KO`;
list only blocking findings for a KO.

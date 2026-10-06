# Gateway Error Contract

This document describes the public v1 agents-gateway tool error shape. The
canonical per-tool allowlists and messages live in
`gateway/src/tools/catalog.js`; prose and service exception messages are not
authoritative.

## Sources

- `gateway/src/tools/catalog.js` owns each registered tool's public error
  codes and fixed safe messages.
- `gateway/src/tools/tool_errors.js` serializes validation, returned domain,
  and thrown errors without copying exception messages or arbitrary details.
- `gateway/src/tools/tool_helpers.js` uses that serializer for every registered
  handler. It sets top-level `isError: true` on MCP failures except for the
  version-pinned legacy `message.send`, `message.list`, and `message.reply`
  envelopes described below.
- `gateway/src/mcp_server.js` records an error code in telemetry or audit only
  when that code is authorized by the tool contract.
- `orchestrator-langgraph/src/orchestrator_langgraph/client/gateway_client.py`
  decodes `content[0].text` into a Python `dict`. If the MCP SDK exposes
  `result.isError`, the client raises before decoding; fixture and unit-test
  clients can still pass decoded dictionaries containing `isError` or
  `tool_error`.

## Fields

| Field | Location | Producer | Meaning | Python handling |
|---|---|---|---|---|
| `isError` | MCP result envelope | `tool_helpers.js`, direct test fixtures | Marks a failed MCP tool result. | Treat any truthy value as an error marker. |
| `error` | JSON body in `content[0].text`, or decoded fixture dict | Safe tool serializer | Canonical public error code. | Treat any truthy value as an error marker. |
| `code` | JSON body in `content[0].text`, or decoded fixture dict | Safe tool serializer | Same machine-readable value as `error`. | Branch on known catalog codes; treat unknown values as failures. |
| `message` | JSON body in `content[0].text` | Catalog or fixed serializer fallback | Safe, non-secret explanation. It is not an exception echo. | Show for operator context, but branch on `code`. |
| `issues` | Validation error body only | Safe validation projector | Field path, issue code, and safe numeric bounds. Dynamic record keys and submitted values are redacted. | Use for field correction; never expect the rejected value. |
| `decision` | `POLICY_DENIED` body only | Safe policy projector | At most `decision` and a canonical allowlisted `ruleId`; policy reason and model data are omitted. | Use a returned `ruleId` plus correlated local diagnostics. |
| `tool_error` | Decoded Python fixture dict | Existing LangGraph tests/fakes | Legacy Python-side marker used before the shared contract. | Treat any truthy value as an error marker for compatibility. |

## Validation

Schemas are strict and reject unknown fields, except that the version-pinned
legacy `message.*` schemas continue to accept and strip unknown fields exactly
as before. Validation failures return:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "{\"error\":\"INVALID_INPUT\",\"code\":\"INVALID_INPUT\",\"message\":\"invalid input\",\"issues\":[{\"path\":\"leaseTtlMs\",\"code\":\"too_big\",\"maximum\":259200000}]}"
    }
  ]
}
```

Coordination lease validation has a deliberately more specific safe message:

```json
{
  "error": "COORDINATION_INVALID_INPUT",
  "code": "COORDINATION_INVALID_INPUT",
  "message": "leaseTtlMs exceeds maximum 259200000"
}
```

## Domain and unknown errors

An explicitly authorized adapter error is serialized with the catalog-owned
message:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "{\"error\":\"ADAPTER_DISABLED\",\"message\":\"adapter disabled\",\"code\":\"ADAPTER_DISABLED\"}"
    }
  ]
}
```

Unknown exceptions, unauthorized codes, exception messages, credentials,
payloads, arbitrary `details`, and unsafe policy fields collapse to:

```json
{
  "error": "TOOL_ERROR",
  "code": "TOOL_ERROR",
  "message": "tool operation failed"
}
```

The generic message is intentional. Operators should use the safe code,
correlated local audit, and server logs rather than expecting private exception
text in an MCP response.

## Compatibility

LangGraph regression tests and fakes pass decoded dictionaries directly. The
shared Python contract therefore also recognizes payloads such as:

```json
{"tool_error": "POLICY_DENIED", "decision": {"allowed": false}}
```

The three legacy message tools keep their existing payload-level error
behavior: their trace errors remain JSON bodies without being promoted to
top-level `isError`. Returned message errors still pass through the shared safe
serializer and are then projected back to the exact legacy `{ "error": CODE }`
shape. Their source and `agents:events` behavior are unchanged.

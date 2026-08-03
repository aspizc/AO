# Review Verdict — V5 E4/S00 (Trial 2)

Verdict: **OK**

No blocking findings.

The validation boundary is now documented accurately. Every coordination MCP
definition uses a strict root Zod object and structural failures return
`INVALID_INPUT` before invoking the service. Direct calls and MCP calls whose
inputs pass that layer converge on the same domain service; the existing
surface-parity test proves that all seven Zod-valid domain rejections preserve
their `COORDINATION_*` code through MCP. Neither the ADR nor the runbook now
claims parity for the additional MCP-only structural layer.

The body-size contract also matches all three real layers. The generated
`coordination.send` MCP schema exposes `body` as exactly `{"type":"string"}`
and has no `maxLength`. The persisted version 1 envelope schema retains
`body.maxLength: 65536`. Runtime validation uses
`Buffer.byteLength(body, "utf8")`; the Gateway configuration loader accepts
65,536 and rejects a larger override, and direct service construction
independently rejects a configured limit above 65,536. The byte ceiling is
therefore at least as strict as the persisted character ceiling without
inventing an MCP schema constraint.

The structural documentation test now reads the real MCP tool source and the
persisted JSON Schema, in addition to checking the corrected prose. The
remaining S00 claims about the shipped direct entry point and result shapes,
hybrid lease timing, deferred orphan cleanup, wire events, separate audit
channels, Redis representation, ACL/TLS/topology limits, isolated rollout, and
evidence links remain covered and pass unchanged.

## Independent verification

- V5 ADR/runbook structural contract — 8/8 passed.
- Config, contract, factory, service foundation/send, MCP tool, and
  direct/MCP parity regressions — 57/57 passed.
- Runtime schema inspection — `coordination.send.body` was
  `{"type":"string"}` and had no `maxLength`.
- Scoped repository diff check — passed.
- No Redis instance, shared MCP process, network service, or credential was
  accessed; no policy file or user-owned `README.md`/`audit/` content was
  changed.

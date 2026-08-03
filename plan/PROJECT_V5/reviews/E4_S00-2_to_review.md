# Review Submission — V5 E4/S00 (Trial 2)

## Trial 1 corrections

- Replaced the claim of identical MCP/direct validation with the actual
  boundary: MCP first applies strict structural Zod validation and returns
  `INVALID_INPUT`; Zod-valid requests then share the domain service and
  preserve its `COORDINATION_*` error code across surfaces.
- Distinguished the generated MCP `body` schema (`{"type":"string"}`) from
  the persisted envelope JSON Schema.
- Documented the real enforcement chain: the shared service measures UTF-8
  bytes, the Gateway configuration and direct service reject limits above
  65,536, and accepted bodies therefore remain inside the persisted envelope
  schema's character bound.
- Extended the structural contract to inspect the real MCP source declaration
  and persisted envelope schema instead of accepting prose alone.

## TDD evidence

- Trial 1 KO is preserved in `E4_S00-1_reviewed_KO.md`.
- A new service-boundary test failed when a direct 65,537-byte configuration
  was accepted, then passed after the service rejected it.
- Corrected documentation contract passed 8/8.
- Config, schema, service, tool, and direct/MCP focused regression passed
  65/65 with no live services.
- Repository diff check passed.

## Review request

Verify both former blockers against source, generated MCP schema, persisted
schema, focused tests, and prose. Also ensure the trial 1 corrections do not
weaken the remaining E4/S00 operational claims. Return `Verdict: OK` or
`Verdict: KO`; list only blocking findings for a KO.

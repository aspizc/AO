# Review Verdict — V5 E4/S00 (Trial 1)

Verdict: **KO**

## Blocking findings

### 1. The ADR overstates direct/MCP validation and error parity

`docs/adr/ADR-V5-01-redis-coordination-plane.md` says that MCP and direct calls
have the same validation and structured errors. The shipped MCP surface has an
additional strict Zod layer: an unknown root field returns `INVALID_INPUT`
before the service call, while the same direct-service input throws
`COORDINATION_INVALID_INPUT`.

The already accepted E3/S04 evidence deliberately limits exact error parity to
Zod-valid inputs rejected by the shared domain service. The ADR must express
that boundary instead of claiming parity for all validation failures.

### 2. The runbook documents a `body.maxLength` that the MCP schema does not have

`docs/coordination-bus.md` says that the version 1 public schema has an
absolute `body.maxLength` of 65,536 characters. The shipped
`coordination.send` definition uses `z.string()` and its generated MCP input
schema is exactly:

```json
{"type":"string"}
```

There is no `maxLength`. The shared service enforces a configurable UTF-8 byte
limit at runtime, and the current config loader caps the Gateway environment
override at 65,536. Those are real guarantees, but they are not a public-schema
`maxLength` guarantee.

## Required correction

- Describe MCP's strict structural validation as an additional layer and limit
  direct/MCP error parity to Zod-valid requests that reach the shared service.
- Replace the nonexistent schema `maxLength` claim with the actual Gateway
  configuration cap and service-side UTF-8 byte enforcement, or implement and
  test the claimed schema constraint in the appropriate implementation sheet.
- Make the structural documentation contract assert the real source schema,
  rather than only asserting that the unsupported claim is present in prose.

## Verification

- V5 ADR/runbook and integration structure checks: 12/12 passed, demonstrating
  that the current prose-only contract does not catch either mismatch.
- Config, factory, audit, tool-definition, and direct/MCP parity regression:
  36/36 passed with all Redis environment variables removed.
- Direct schema inspection printed
  `BODY_SCHEMA={"type":"string"}` for `coordination.send`.
- Repository diff check passed.
- No Redis server, network service, shared MCP process, policy file, or
  credential was accessed.

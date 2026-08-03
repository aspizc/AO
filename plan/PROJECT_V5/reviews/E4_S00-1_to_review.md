# Review Submission — V5 E4/S00 (Trial 1)

## Scope

- Reconciled ADR-V5-01 and the coordination operator runbook with the shipped
  factory, service, Redis adapter, audit routing, and tests.
- Corrected public registration/discovery/unregister/receive/ACK shapes and the
  supported `createCoordination` import.
- Documented hybrid Gateway/Redis lease time, deferred orphan cleanup, exact
  Redis encodings/events, bounded idempotency, and the three separate
  observability paths.
- Replaced stale raw-Redis, ACL, TLS, troubleshooting, topology, and lifecycle
  claims with the actual implementation and explicit residual limitations.
- Added a no-restart rollout that protects the shared MCP and requires an
  ephemeral Redis 7 instance plus an isolated prefix for live acceptance.

## TDD evidence

- RED: the new structural contract initially reported seven documentation
  failures and one pass across direct API/shapes, clock semantics,
  events/audit, error catalog, ACL/topology, rollout, and Redis representation.
- GREEN: the focused documentation contract passed 8/8.
- Architecture/threat structure cross-check passed 16/16.
- Config and service regression passed 88/88; non-live queue, audit, tool, and
  direct/MCP parity regression passed 63/63.
- Direct-factory import and repository diff checks passed.
- No Redis, shared MCP process, network, or policy file was touched.

## Review request

Compare every operational claim against the implementation and tests,
especially clock authority, cleanup triggers, exact wire fields/events,
public shapes, direct construction, audit separation, ACL commands, raw-write
risk, topology/TLS limits, and no-restart rollout. Return `Verdict: OK` or
`Verdict: KO`; list only blocking findings for a KO.

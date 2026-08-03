# Final Review Submission — Project V5 A/0/00 (Trial 1)

## Outcome

Project V5 now provides one versioned coordination plane for independent
orchestrators, agents, gateways, and sessions:

- a seven-operation direct service and the seven additive
  `coordination.*` MCP tools;
- leased presence, same-scope discovery, addressed at-least-once inboxes,
  reclaim, recipient-scoped ACK, bounded dedupe, and replacement fences;
- an atomic Redis 7 standalone adapter with a separate versioned namespace;
- JSONL-only coordination domain and MCP-call audit that never publishes to
  `agents:events`; and
- reconciled architecture, threat, runtime, operator, and release docs.

Legacy `message.*` implementation and semantics are unchanged.

## Commit range

Baseline: `eec04a0` (`feat(policy): allow claude-opus-5 and point the opus alias
at it`).

Reviewed implementation range: `eec04a0..a98fc51` — 25 commits:

```text
d9ed79f docs(v5): define coordination epics and sheets (V5 A/0/00 E0/S00)
7811528 feat(coordination): freeze public schema and config (V5 A/0/00 E0/S01)
93a66a7 docs(v5): materialize epic sheet tree (V5 A/0/00 E0/S00)
f91fe91 feat(coordination): freeze Redis wire contract (V5 A/0/00 E0/S02)
dc2f195 feat(coordination): add safe service foundation (V5 A/0/00 E1/S00)
3745ff8 feat(coordination): implement leased registration (V5 A/0/00 E1/S01)
f716713 feat(coordination): fence participant lifecycle (V5 A/0/00 E1/S02)
9acbe25 feat(coordination): add fenced discovery (V5 A/0/00 E1/S03)
5b83380 feat(coordination): add fenced addressed send (V5 A/0/00 E1/S04)
75dbb4b feat(coordination): add fenced receive and reclaim (V5 A/0/00 E1/S05)
6e7a8e1 feat(coordination): add recipient-scoped ACK (V5 A/0/00 E1/S06)
090c3b6 feat(coordination): add strict Redis foundation (V5 A/0/00 E2/S00)
aecfa41 feat(coordination): add atomic Redis presence (V5 A/0/00 E2/S01)
918854e feat(coordination): add atomic Redis send (V5 A/0/00 E2/S02)
d09d061 feat(coordination): add fenced Redis receive (V5 A/0/00 E2/S03)
cb22efb feat(coordination): add atomic Redis ACK (V5 A/0/00 E2/S04)
9ce3b46 test(coordination): prove two-instance Redis flow (V5 A/0/00 E2/S05)
835cd90 feat(coordination): add direct factory (V5 A/0/00 E3/S00)
e1fa11f feat(coordination): add MCP tool definitions (V5 A/0/00 E3/S01)
8bfd824 feat(coordination): register MCP tools (V5 A/0/00 E3/S02)
86afcc4 feat(coordination): isolate audit locally (V5 A/0/00 E3/S03)
a490d00 test(coordination): prove surface parity (V5 A/0/00 E3/S04)
a7d1426 docs(coordination): reconcile ADR and runbook (V5 A/0/00 E4/S00)
13bf95d docs(coordination): integrate V5 operations (V5 A/0/00 E4/S01)
a98fc51 test(coordination): close release gates (V5 A/0/00 E4/S02)
```

## Committed path allowlist

The 174 changed paths are confined to:

- `plan/PROJECT_V5/**` and the Project V5 link in `plan/README.md`;
- `schemas/coordination-*.schema.json` and their fixtures;
- the coordination config/factory/service/queue/contract/tool/audit/MCP
  integration under `gateway/`, plus package metadata for the Redis client;
- coordination, audit, registry, schema, bypass, documentation, and smoke
  tests under `tests/`, `gateway/tests/`, and `scripts/smoke_mcp.mjs`;
- `docs/adr/ADR-V5-01-redis-coordination-plane.md`,
  `docs/coordination-bus.md`, `docs/architecture.md`,
  `docs/threat-model.md`, `gateway/README.md`, and `CHANGELOG.md`.

Explicit exclusions are satisfied: root `README.md`, `audit/`, `policies/`,
production `message.*`, and unrelated application paths are absent from the
range. The user's root `README.md` modification and untracked `audit/` remain
outside every commit.

## Operator-authorized closure documentation

After the 25 implementation commits, the operator explicitly requested a
parallel project/product documentation and README reconciliation. The staged
E4/S03 closure delta therefore also contains:

- V5-only hunks in root `README.md`, plus `client-config/README.md` and
  `gateway/README.md`;
- current navigation in `plan/README.md`;
- clarifications in architecture, operator, threat, KYA, historical
  checklist/backlog, and four superseded/historical ADR documents under
  `docs/`; and
- structural and direct-factory regressions preventing product-documentation
  drift and inconsistent acceptance of the contract's maximum Redis prefix.

The root README is deliberately split in the index: `git diff --cached --
README.md` contains only V5 documentation, while `git diff -- README.md`
contains the operator's pre-existing `Sequential Task Scheduling` section
unchanged. `audit/` remains untracked and unstaged. No policy, dependency,
legacy message implementation, or shared-service state is part of this closure
delta.

The reviewer raised two pre-verdict findings during this stabilization:

1. the root introduction overstated the absence of peer orchestrator
   processes; it now matches ADR-002's Gateway-enforcement boundary; and
2. the wire contract accepted a 256-character Redis prefix while the service
   descriptor duplicated a 255-character limit. A new direct-factory test
   reproduced `COORDINATION_INTERNAL_ERROR`; the service now reuses
   `coordinationKeys` as its single prefix validator, and the focused
   contract/factory/foundation suite passes 24/24.

## Acceptance evidence

### Redis-independent and live transport

- Domain, queue-contract, direct/MCP, audit, threat, and compatibility suites
  cover all seven operations and their failure boundaries.
- E2/S05 independently started `redis:7.2-alpine` and passed 115/115 tests with
  two service/queue instances, replacement race, reclaim, dedupe, ACK,
  capacity, body-free metadata, token checks, and zero leaked clients.
- The Redis test used a UUID prefix, deleted only that prefix, used no
  `FLUSHDB`, and removed its container. It never contacted the shared Redis or
  MCP process.

### Final isolated repository gate

| Gate | Result |
|---|---|
| Structure | 115/115 |
| Gateway | 595 total: 585 passed, 10 explicit live-service skips |
| E2E | 25 total: 24 passed, one explicit real-agent skip |
| MCP smoke | OK |
| Policy validation | OK |
| CLI | 29/29 |
| `scripts/ci.sh` | `All checks passed` |
| Project V5 secret scan | 25 commits, no leaks |
| Diff check | passed |

All final non-live commands removed Redis, Postgres, and real-agent opt-in
variables. No shared process was stopped or restarted.

### Security and compatibility

- Plaintext lease tokens are returned only by registration; private presence
  stores a digest; public projections/audit omit token and digest.
- Sender/recipient fences bind digest and scope inside authoritative Redis
  operations. Bodies are untrusted, byte-bounded, classification-checked, and
  secret-scanned before persistence.
- TM-13 through TM-19 have explicit bypass regressions; raw Redis, ACL/TLS, and
  post-window replay remain honestly documented operational boundaries.
- Publisher-spy coverage proves coordination creates zero `agents:events`
  records while legacy audit still publishes exactly once.
- Disabled coordination leaves all seven tools listable, returns
  `COORDINATION_UNAVAILABLE` on use, and leaves `message.*` operational.

## Dependency inspection and limitations

`npm audit --omit=dev` reports five pre-existing transitive findings (one low,
two moderate, two high) outside Redis. No dependency fix was attempted.

Protocol v1 supports Redis 7 standalone/one shard, not Cluster or Sentinel.
Redis owns TTL duration while Gateway clocks supply timestamps/prechecks.
Metadata is same-scope public and must not contain secrets. Dedupe and ACK
idempotency are bounded; consumers retain long-lived business idempotency.

## Review request

Review the complete range, current closure-only worktree diff, all latest sheet
verdicts, wire/service/Redis/MCP/direct/audit boundaries, CI evidence,
documentation accuracy, commit/path scope, and preservation of user work.
Publish `A_0_0-1_reviewed_OK.md` or `A_0_0-1_reviewed_KO.md`; list only
blocking findings for a KO.

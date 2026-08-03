# Project V5 — Executable sheets

Status: active.

The delivered A sheets decompose umbrella task
[`A/0/00`](A/0/00.md). Active B–I sheets extend that foundation using the
deduplicated [audit/V4 coverage matrix](COVERAGE_MATRIX.md). Their dependency
order is binding unless a reviewed plan change updates this file, the epic DAG,
and the acceptance map together.

`partial` means the inherited worktree contains useful code or tests, but the
sheet has not passed its exit gate. Each sheet has one accountable acceptance
owner, a narrow write scope, one RED claim, and explicit evidence.

## Active registry

| Stage | Materialized sheets | Current state |
|---|---|---|
| [B](B/README.md) | [B/0/00](B/0/00.md)–[B/0/05](B/0/05.md) | 00–02 and 05 complete; 03–04 dependency-gated |
| [C](C/README.md) | [C/0/00](C/0/00.md)–[C/0/02](C/0/02.md), [C/1/00](C/1/00.md)–[C/1/03](C/1/03.md) | C/0/00–01 complete and reviewed; C/1/00 unblocked; remainder planned |
| [D](D/README.md) | [D/0/00](D/0/00.md)–[D/0/06](D/0/06.md) | planned; P0 security prerequisite |
| [E](E/README.md) | [E/0/00](E/0/00.md)–[E/0/04](E/0/04.md) | planned; E/0/04 health contract materialized, runtime pending |
| [F](F/README.md) | [F/0/00](F/0/00.md)–[F/0/04](F/0/04.md) | planned |
| [G](G/README.md) | [G/0/00](G/0/00.md)–[G/0/04](G/0/04.md) | planned |
| [H](H/README.md) | [H/0/00](H/0/00.md)–[H/0/05](H/0/05.md) | planned |
| [I](I/README.md) | [I/0/00](I/0/00.md)–[I/0/08](I/0/08.md) | planned |

### E/0/04 health contract dependency

`E/0/04` depends on D/0/01, D/0/03, D/0/05, D/0/06, and E/0/00. It must
instrument the one privileged D/0/05 daemon rather than per-connection stdio
proxies. The external watchdog is independently supervised and health-only:
it cannot open the control store, emit control mutations, or become a second
Gateway writer.

The sheet freezes the fully closed `agents.gateway.health.v1` projection,
total reason reducer, manager-attested watchdog bootstrap, deterministic
threshold/hysteresis/control-lane budgets, exact same-boot recovery formulas,
bounded journal and durable OTLP exporter cursor, SLO/alert rules, and
dashboard required to close A-08. Implementation remains `planned` until its
RED/GREEN process-fault, isolation, observability, and live-backend suites,
scoped commit, and independent review are complete. It adds no MCP endpoint or
tool, keeps Redis optional for base Gateway readiness, leaves Redis health to
`coordination.status`, and does not change `agents:events` or `message.*`.

Its real consumers are G/0/03 (coordination metric source), H/0/04 (outcome
metrics and recovery drill), I/0/05 (PostgreSQL state-store/USE adapter), and
I/0/07 (canonical full-stack health and observability gate). Each consumer
declares the direct E/0/04 dependency; no other sheet is implied to consume
the contract.

## Delivered A/0/00 registry

| Sheet | Title | Initial state | Depends on |
|---|---|---|---|
| [E0/S00](A/0/00/E0/S00.md) | Authoritative plan and acceptance map | complete | — |
| [E0/S01](A/0/00/E0/S01.md) | Public schema and configuration contract | complete | E0/S00 |
| [E0/S02](A/0/00/E0/S02.md) | Redis wire, fence, and lifetime contract | complete | E0/S01 |
| [E1/S00](A/0/00/E1/S00.md) | Service foundation, validation, and safe errors | complete | E0/S01 |
| [E1/S01](A/0/00/E1/S01.md) | Register and private lease-token storage | complete | E1/S00 |
| [E1/S02](A/0/00/E1/S02.md) | Heartbeat and unregister fenced mutations | complete | E1/S01, E0/S02 |
| [E1/S03](A/0/00/E1/S03.md) | Active, scope-bound discovery | complete | E1/S01 |
| [E1/S04](A/0/00/E1/S04.md) | Addressed send, body safety, and idempotency | complete | E1/S01, E0/S02 |
| [E1/S05](A/0/00/E1/S05.md) | Bounded receive and reclaim semantics | complete | E1/S01 |
| [E1/S06](A/0/00/E1/S06.md) | Recipient-scoped, idempotent transport ACK | complete | E1/S05, E0/S02 |
| [E2/S00](A/0/00/E2/S00.md) | Redis keys, codecs, client lifecycle, and groups | complete | E0/S02 |
| [E2/S01](A/0/00/E2/S01.md) | Atomic presence lifecycle and metadata events | complete | E2/S00, E1/S02 |
| [E2/S02](A/0/00/E2/S02.md) | Atomic send, dedupe, and inbox backpressure | complete | E2/S01, E1/S04 |
| [E2/S03](A/0/00/E2/S03.md) | Fenced read and cursor-complete reclaim | complete | E2/S01, E1/S05 |
| [E2/S04](A/0/00/E2/S04.md) | Atomic ACK, deletion, and tombstones | complete | E2/S03, E1/S06 |
| [E2/S05](A/0/00/E2/S05.md) | Live Redis two-instance acceptance | complete | E2/S02, E2/S04 |
| [E3/S00](A/0/00/E3/S00.md) | Importable direct coordination factory | complete | E1/S00–S06, E2/S00 |
| [E3/S01](A/0/00/E3/S01.md) | Seven MCP tool schemas and handlers | complete | E3/S00 |
| [E3/S02](A/0/00/E3/S02.md) | Registry integration and disabled degradation | complete | E3/S01 |
| [E3/S03](A/0/00/E3/S03.md) | JSONL-only coordination and MCP-call audit | complete | E3/S02 |
| [E3/S04](A/0/00/E3/S04.md) | MCP/direct cross-surface parity | complete | E2/S05, E3/S03 |
| [E4/S00](A/0/00/E4/S00.md) | ADR and operator runbook convergence | complete | E3/S04 |
| [E4/S01](A/0/00/E4/S01.md) | Architecture, threat model, runtime docs, changelog | complete | E4/S00 |
| [E4/S02](A/0/00/E4/S02.md) | Full test, audit, smoke, and CI gate | complete | E4/S01 |
| [E4/S03](A/0/00/E4/S03.md) | Scoped commit range and independent review loop | complete | E4/S02 |

Total: **five epics and twenty-five executable sheets**.

## Common sheet contract

Every implementation sheet records:

1. its smallest failing test and the expected failure;
2. the minimum implementation that makes the test green;
3. any refactor performed only while green;
4. targeted and regression commands;
5. the exact staged paths;
6. an English commit referencing `V5` and the sheet's own identifier; and
7. a sheet-native review request and numbered independent `OK`/`KO` result.

A fake proves service semantics, not Redis behavior. A Redis test proves the
wire adapter, not MCP parity or safe audit. No sheet inherits evidence from a
different layer without its own assertion.

## E0 — Contract and plan

### E0/S00 — Authoritative plan and acceptance map

- **Write scope:** `plan/PROJECT_V5/**` and the V5 row in `plan/README.md`.
- **RED:** independent plan review identifies ambiguous ownership, dependency,
  lifetime, race, or security behavior.
- **GREEN:** epics, atomic sheets, one-owner acceptance map, DAG, and gates
  resolve every blocking decision.
- **Evidence:** link check, `git diff --check`, secret-pattern check, independent
  `Verdict: OK`.

### E0/S01 — Public schema and configuration contract

- **Write scope:** `schemas/coordination-*.schema.json`, matching fixtures,
  `gateway/src/config.js`, `gateway/package*.json`, and focused schema/config
  tests.
- **RED:** invalid identifiers, extra properties, forbidden classifications,
  invalid/negative lease or retention values, and unsafe bounds are accepted.
- **GREEN:** protocol v1 schemas and runtime configuration for Redis URL,
  prefix, lease default/max, inbox capacity, receive block max, body byte max,
  dedupe window, ACK tombstone window, and orphan inbox retention.
- **Decision:** dedupe and ACK windows default to 24 hours, are independently
  configurable, and reject non-positive values rather than silently weakening
  guarantees.
- **Evidence:** schema/config suites and lockfile integrity.

### E0/S02 — Redis wire, fence, and lifetime contract

- **Write scope:** queue port contract tests, ADR wire section, and runbook wire
  section. Production adapter changes belong to E2.
- **RED:** documented keys, group, response shapes, authentication fences, or
  lifetime semantics differ from contract tests.
- **GREEN:** the following v1 model is frozen:

  | Purpose | Redis representation |
  |---|---|
  | Participant registry | `<prefix>:participants`, SET |
  | Leased presence | `<prefix>:presence:<participantId>`, JSON STRING + PX |
  | Addressed inbox | `<prefix>:inbox:<participantId>`, STREAM |
  | Sender-scoped dedupe | `<prefix>:dedupe:<fromParticipantId>:<messageId>`, JSON STRING + PX |
  | ACK tombstone | `<prefix>:acked:<participantId>:<deliveryId>`, STRING + PX |
  | Metadata events | `<prefix>:events`, body-free STREAM |
  | Consumer group | `coordination-v1` |

- **Encoding:** each dynamic component uses UTF-8 percent encoding equivalent
  to JavaScript `encodeURIComponent`, preventing allowed `:` characters from
  aliasing adjacent components.
- **Authorization fence:** every state-changing or data-returning queue
  operation receives the authenticated participant's expected
  `leaseTokenHash` and `scopeId`. Redis compares both against current presence
  at the point of mutation/read. A replacement incarnation fails with
  `COORDINATION_LEASE_CHANGED`; stale credentials never mutate or receive data
  from the replacement.
- **Receive fence:** nonblocking reads/reclaims compare inside the authoritative
  operation. A blocking read compares before and after `XREADGROUP`; if the
  post-check fails, claimed entries stay pending for later reclaim and no
  message is returned to the stale caller.
- **Idempotency lifetime:** equal retries for the same
  `(fromParticipantId,messageId)` are guaranteed for the configured dedupe
  window, which is renewed by an equal retry. After it expires, at-least-once
  consumers must still dedupe by `messageId`; the runbook must not promise
  permanent uniqueness.
- **ACK lifetime:** an exact ACK retry succeeds as a no-op while its
  recipient-scoped tombstone exists. Unknown/cross-inbox IDs fail with
  `COORDINATION_DELIVERY_NOT_FOUND`; after tombstone expiry, an old retry is
  intentionally unknown.
- **Deployment:** Redis 7 standalone/one-shard. Cluster support and per-scope
  sorted sets/hashes are explicitly out of v1.
- **Evidence:** exact key/fence/lifetime contract tests plus ADR/runbook
  consistency.

## E1 — Domain service

### E1/S00 — Service foundation, validation, and safe errors

- **Write scope:** `gateway/src/services/coordination_service.js` and its unit
  tests.
- **RED:** missing module, disabled queue, malformed direct input, unsafe
  unknown fields, or errors that include caller payload/token material.
- **GREEN:** `CoordinationError`, seven-method factory, strict allowlisted
  direct validation, injected clock/randomness, safe error mapping, and
  best-effort allowlisted audit callback.
- **Evidence:** disabled/direct-validation/error-serialization tests.

### E1/S01 — Register and private lease-token storage

- **Write scope:** service and focused register tests only.
- **RED:** token or digest appears in public participant/audit; generated IDs,
  lease bounds, or `ifAbsent` collision behavior are wrong.
- **GREEN:** `pt-<uuid>`, high-entropy token, SHA-256 digest only in private
  presence, bounded TTL, and flat public register response plus safe queue
  description.
- **Evidence:** deterministic clock/random tests and serialized leak checks.

### E1/S02 — Heartbeat and unregister fenced mutations

- **Write scope:** service lifecycle methods/tests and queue-port fake contract.
- **RED:** wrong/expired token, renewal after expiry, unregister of a
  replacement incarnation, heartbeat race, or non-idempotent missing delete.
- **GREEN:** constant-time digest verification; expected digest/scope fence
  passed to queue; heartbeat fail-closed on replacement; authenticated first
  unregister; missing retry returns the documented no-op result.
- **Evidence:** swap-presence race fake for heartbeat and unregister.

### E1/S03 — Active, scope-bound discovery

- **Write scope:** discover method/tests only.
- **RED:** expired, cross-scope, wrong-type, wrong-capability, or private fields
  are returned; caller expires during discovery.
- **GREEN:** active caller pre/post check, same-scope filter, optional
  type/capability filters, explicit public projection.
- **Evidence:** deterministic expiry and race tests.

### E1/S04 — Addressed send, body safety, and idempotency

- **Write scope:** send method/tests and queue-port fake contract.
- **RED:** unknown/expired/replaced target, changed scope, `restricted`, secret
  body, multibyte overflow, two senders sharing an ID, equal retry after clock
  advance, changed retry, or expired dedupe-window behavior is wrong.
- **GREEN:** canonical envelope; UTF-8 byte measurement; secret detection;
  sender and recipient digest/scope fences; semantic comparison excludes
  server `createdAt`; equal retry renews the configured window and returns the
  original delivery ID.
- **Evidence:** fake queue race/window cases and no-body-in-error assertion.

### E1/S05 — Bounded receive and reclaim semantics

- **Write scope:** receive method/tests and queue-port fake contract.
- **RED:** invalid consumer/count/reclaim/block, block above max, expired or
  replaced recipient, first delivery, or abandoned recovery is wrong.
- **GREEN:** bounded inputs; recipient digest/scope fence; queue-provided
  `{deliveryId,message,recovered}` returned unchanged through public
  projection.
- **Evidence:** two consumers, injected time, and replacement race.

### E1/S06 — Recipient-scoped, idempotent transport ACK

- **Write scope:** ACK method/tests and queue-port fake contract.
- **RED:** mixed valid/invalid batch partially mutates, cross-inbox ID succeeds,
  replacement credentials ACK, exact retry fails inside its window, or unknown
  ID does not fail.
- **GREEN:** authenticated digest/scope fence; unique nonempty ID batch;
  all-or-nothing queue ACK; exact tombstoned retry returns zero newly ACKed.
- **Evidence:** recipient A/B inbox tests and replacement race.

## E2 — Redis transport

### E2/S00 — Redis keys, codecs, client lifecycle, and groups

- **Write scope:** `gateway/src/core/coordination_queue.js` and focused adapter
  unit/contract tests.
- **RED:** component aliasing, wrong group, RESP response mismatch, malformed
  JSON/stream data, unsafe group-creation error handling, or disabled queue.
- **GREEN:** frozen key codec, group `coordination-v1`, explicit RESP behavior,
  strict decoders, BUSYGROUP-only suppression, lazy per-operation clients, safe
  unavailable errors.
- **Evidence:** fake-client command/decoder tests and disabled contract.

### E2/S01 — Atomic presence lifecycle and metadata events

- **Write scope:** participant Lua/adapter methods and focused tests.
- **RED:** heartbeat/unregister replacement race, stale registry member,
  inbox/orphan TTL mismatch, group creation failure, or body/token/digest in an
  event.
- **GREEN:** atomic NX register, digest/scope-fenced XX heartbeat/delete,
  registry cleanup, inbox orphan TTL renewal, and strict metadata-only events.
- **Evidence:** scripted Redis replies plus live verification in E2/S05.

### E2/S02 — Atomic send, dedupe, and inbox backpressure

- **Write scope:** send Lua/adapter methods and focused tests.
- **RED:** sender/recipient replacement race, sender-scoped ID collision,
  changed envelope retry, original delivery ID loss, expired dedupe window, or
  blind trimming of a pending/unread entry.
- **GREEN:** one atomic operation compares both digest/scope fences, checks
  `XLEN` capacity, fails with `COORDINATION_INBOX_FULL`, appends without
  `MAXLEN`, writes `{envelope,deliveryId}` dedupe with configured PX, and emits
  metadata only.
- **Evidence:** fake Lua result mapping plus capacity/window live cases.

### E2/S03 — Fenced read and cursor-complete reclaim

- **Write scope:** read/reclaim adapter methods and focused tests.
- **RED:** missing/replaced presence, RESP mismatch, reclaim cursor starvation,
  deleted pending IDs, or blocking read returns data after its fence changes.
- **GREEN:** pre/post digest/scope comparison, full `XAUTOCLAIM` cursor
  iteration up to count, deleted-entry anomaly fails closed, and stale blocked
  results remain pending without disclosure.
- **Evidence:** multipage/deleted fake responses and live reclaim.

### E2/S04 — Atomic ACK, deletion, and tombstones

- **Write scope:** ACK Lua/adapter methods and focused tests.
- **RED:** replacement race, unknown/cross-inbox ID, mixed batch partial ACK,
  repeat within/outside window, capacity not freed, or tombstone under the
  wrong recipient.
- **GREEN:** one Lua operation verifies digest/scope; accepts every ID only if
  pending or recipient-tombstoned; `XACK` + `XDEL` pending entries; creates/
  renews bounded tombstones; returns newly ACKed count.
- **Evidence:** all-or-nothing command tests and live capacity reuse.

### E2/S05 — Live Redis two-instance acceptance

- **Write scope:** opt-in live Redis test and only adapter fixes exposed by it.
- **Setup:** `AGENTS_TEST_REDIS_URL`, UUID prefix, no URL/token output, cleanup
  limited to that exact encoded prefix; never `FLUSHDB`.
- **RED flow:** two independent services cannot register/discover, exchange
  both directions, reclaim after consumer loss, reject replacement/cross-inbox
  races, retry/resolve conflicts, or ACK/free capacity.
- **GREEN:** full flow passes on Redis 7, metadata events omit body/token/digest,
  and clients close cleanly.
- **Evidence:** explicit skip without URL and recorded opt-in pass.

## E3 — Access surfaces

### E3/S00 — Importable direct coordination factory

- **Write scope:** `gateway/src/coordination.js` and factory tests.
- **RED:** config maps incorrectly, construction connects eagerly, queue cannot
  be injected, or two factories accidentally share mutable state.
- **GREEN:** lazy `createCoordination` wiring config, queue, service,
  randomness, and JSONL audit dependency.
- **Evidence:** spies plus independent factory instances.

### E3/S01 — Seven MCP tool schemas and handlers

- **Write scope:** `gateway/src/tools/coordination.js` and builder tests.
- **RED:** missing/wrong tool name, unknown input accepted, service error
  changed, `restricted` becomes generic Zod error, or JS-character length masks
  UTF-8 overflow.
- **GREEN:** strict schemas and one-line handlers for register, heartbeat,
  discover, unregister, send, receive, and ack over the injected service.
- **Evidence:** schema/result/error tests.

### E3/S02 — Registry integration and disabled degradation

- **Write scope:** `gateway/src/tools/index.js`, three exact tool-list tests,
  and degradation test.
- **RED:** registry order/size mismatch, construction connects, no-config
  registry throws, disabled coordination breaks unrelated tools, or legacy
  `message.*` behavior changes.
- **GREEN:** one lazy service per registry; seven additive tools in stable
  order; unrelated tools remain usable.
- **Evidence:** scaffold, registry, stdio `tools/list`, and legacy regression.

### E3/S03 — JSONL-only coordination and MCP-call audit

- **Write scope:** additive local-only function in
  `gateway/src/core/audit.js`, coordination factory/service wiring,
  `gateway/src/mcp_server.js` routing, and focused audit tests.
- **RED:** sentinel body/token/digest/metadata reaches JSONL; a coordination
  domain event or generic `MCP_TOOL_CALL` invokes the `agents:events`
  publisher; a legacy tool stops invoking its existing publisher path.
- **GREEN:** strict allowlisted coordination events and coordination MCP-call
  metadata use JSONL-only append; existing `append` and every legacy tool keep
  their current JSONL + `agents:events` behavior.
- **Evidence:** publisher spy distinguishes coordination from legacy calls and
  serialized JSONL contains no sensitive sentinel.

### E3/S04 — MCP/direct cross-surface parity

- **Write scope:** in-process parity tests and narrowly required surface fixes.
- **RED:** MCP send cannot be received/ACKed directly, direct send cannot be
  received/ACKed through MCP, wire shapes/errors differ, or test harness writes
  lease tokens to disk.
- **GREEN:** both directions use one service/wire implementation; in-memory
  harness never persists arguments; Redis-backed parity is corroborated by
  E2/S05.
- **Evidence:** bidirectional parity and structured error comparison.

## E4 — Operability and closure

### E4/S00 — ADR and operator runbook convergence

- **Write scope:** `docs/adr/ADR-V5-01-redis-coordination-plane.md` and
  `docs/coordination-bus.md`.
- **RED:** any key, group, fence, lifetime, API shape, command, or limitation
  differs from tested behavior.
- **GREEN:** ADR accepted; runbook covers KYA mapping, direct/MCP examples,
  recovery, backpressure, error catalogue, Redis 7 standalone, ACL/TLS/network
  isolation, unique-prefix testing, and shared-MCP no-restart deployment.
- **Evidence:** module/config names resolve and claims map to tests.

### E4/S01 — Architecture, threat model, runtime docs, changelog

- **Write scope:** `docs/architecture.md`, `docs/threat-model.md`, runtime
  configuration docs, and `CHANGELOG.md`. Root `README.md` remains excluded
  unless a proven minimal non-overlapping patch is unavoidable.
- **RED:** architecture claims no direct channel; threats omit stale-lease,
  body injection, token disclosure, cross-scope/ACK, raw Redis, audit mirror,
  or dedupe-window risk; config/changelog omit V5.
- **GREEN:** each threat cites a real test; runtime docs include new bounds and
  no-restart rollout; changelog records additive V5.
- **Evidence:** documentation diff review and link/config checks.

### E4/S02 — Full test, audit, smoke, and CI gate

- **Write scope:** required test-only fixes; no broad dependency cleanup.
- **RED:** any focused, Gateway, E2E, smoke, policy, structure, CLI, or CI
  command fails.
- **GREEN:** targeted suites, `npm --prefix gateway test`, E2E, MCP smoke,
  policy validation, pytest structure/CLI, and `./scripts/ci.sh` pass;
  `npm --prefix gateway audit` findings are inspected without `audit fix`;
  `git diff --check` and a V5 secret scan pass.
- **Isolation:** no shared MCP restart/kill; test workspaces are temporary;
  Redis uses an exact unique prefix and never broad cleanup.
- **Evidence:** command/result table in the review submission.

### E4/S03 — Scoped commit and independent review loop

- **Write scope:** staged Project V5 paths, operator-authorized V5
  product/project documentation and README hunks, and
  `plan/PROJECT_V5/reviews/A_0_0-<trial>_*`.
- **RED:** the user's pre-existing root `README.md` hunk or `audit/` is staged,
  required checks are missing, or reviewer returns KO.
- **GREEN:** task/sheet-referenced English commits; complete final-tree review
  submission; clean independent reviewer returns explicit `OK`.
- **Correction:** every KO starts with a failing regression test, adds a new
  commit and next trial, and stops after trial 15 for human intervention.
- **Evidence:** commit range, staged-path allowlist, review artifact, final OK.

## Acceptance ownership matrix

Each criterion has exactly one accountable sheet. Other sheets provide
corroborating evidence but cannot mark it complete.

| Acceptance criterion | Accountable owner | Corroborating evidence |
|---|---|---|
| Register creates a safe leased identity | E1/S01 | E2/S01, E2/S05, E3/S01 |
| Heartbeat/unregister cannot mutate a replacement | E1/S02 | E2/S01, E2/S05 |
| Discovery returns only active same-scope peers | E1/S03 | E2/S05, E3/S01 |
| Addressed send enforces target/scope/content/idempotency window | E1/S04 | E2/S02, E2/S05 |
| Abandoned delivery is recovered without stale disclosure | E1/S05 | E2/S03, E2/S05 |
| ACK is recipient-scoped, atomic, and retry-bounded | E1/S06 | E2/S04, E2/S05 |
| Pending inbox entries are never silently trimmed | E2/S02 | E2/S04–S05 |
| Redis metadata contains no body/token/digest | E2/S01 | E2/S02, E2/S05 |
| No Redis is explicit and unrelated tools work | E3/S02 | E3/S00–S01 |
| Coordination MCP calls do not alter `agents:events` | E3/S03 | E4/S02 |
| MCP and direct surfaces share wire shapes and errors | E3/S04 | E2/S05 |
| Legacy `message.*` remains unchanged | E3/S02 | E3/S03, E4/S02 |
| Docs describe tested behavior and boundaries | E4/S00 | E4/S01 |
| Full repository verification passes without shared-MCP disruption | E4/S02 | — |
| Project V5 has scoped commits and independent OK review | E4/S03 | — |

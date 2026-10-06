# ADR V5-G-0-02: Standalone coordination consumer core

- Status: Proposed for independent `G_0_2_CORE` review
- Date: 2026-07-26
- Task: Project V5 `G/0/02`, dependency-gated core slice

## Context

The coordination service provides fenced receive and transport ACK primitives.
It intentionally does not decide how a process retries a transient handler,
deduplicates a business effect, quarantines poison input, or replays a
quarantined notice. ACK-on-receive would lose work, while an unconstrained
handler loop could repeat effects or reclaim poison forever.

This slice defines that domain core without changing the Redis adapter,
coordination service, client lifecycle, MCP surface, health wiring, shared
repositories, migrations, or process lifecycle. `agents:events` and the
legacy `message.*` tools remain untouched.

## Decision

### Injected boundaries

`createCoordinationConsumer()` has no Redis credential or lease-token surface.
It receives these trusted dependencies:

- a bound transport with `receive` and `ack`;
- a receipt repository port;
- a business handler;
- a quarantine body store with `put` and `get`;
- an optional server-side replay authorizer;
- clock and abort-aware sleep functions;
- body-free audit and metric sinks whose synchronous throws and asynchronous
  rejections are non-authoritative; and
- a deterministic fault seam used by crash tests.

The production composition must bind transport authentication outside this
module and configure the expected scope and recipient participant. The core
checks both values before the handler; optional trace/correlation identifiers
must use the bounded safe identifier form or the envelope is quarantined.
A coordination body, participant capability, caller-supplied
`authorized` field, or quarantine metadata is never replay authority.

### Canonical consume identity

The stable key is:

```text
coord-consume-v1-SHA256(JSON([1, scopeId, fromParticipantId,
                              toParticipantId, messageId]))
```

It is fixed at 81 ASCII characters. It excludes the delivery ID, body,
classification, trace, raw errors, credentials, and secrets. Reclaim of the
same Stream entry and a later at-least-once delivery for the same semantic
message therefore reach one handler idempotency key.

A malformed envelope receives a separate body-free key derived from its
delivery ID and any safe identity fields. It can be quarantined, but it cannot
be replayed as a valid message.

### Receipt and claim fencing

The repository state machine records safe envelope metadata, handler attempts,
observed delivery IDs, the committed effect or quarantine locator, and replay
state. It also retains a private, bounded list of consumed blocked-quarantine
recovery IDs for the lifetime of the receipt. Neither that list nor its IDs
cross the public receipt projection. The repository never accepts a `body`
metadata field.

Every processing claim returns a monotonically replaced `claimToken`. All
attempt, effect, quarantine, blocking, and release mutations compare both
`ownerId` and that token. Expiry makes the claim reclaimable, including when a
new process reuses the same owner ID. A stale incarnation cannot commit an
effect or reach transport ACK after another claim has taken ownership.
Replay claims use the same rule with a distinct monotonically replaced
`replayClaimToken`; stale same-owner replay work can neither commit nor record
a failure after reclaim.

A blocked-quarantine recovery is a third explicit claim transition. It requires
an operator-supplied, bounded `quarantineRecoveryId`. The initial receipt claim
fixes `maxConsumedRecoveryIdsPerReceipt`; the core defaults it to four and
rejects values above the repository contract ceiling of eight.

The blocked-recovery compare-and-set rejects an ID already in the receipt
history and rejects every fresh ID once the fixed capacity is full. Otherwise,
after checking any active lease, the same atomic transition appends the ID and
replaces the processing `claimToken`. A concurrent claim with the same ID is
therefore denied even while the winning claim is active. Returning to
`quarantine_blocked` never removes an ID from history, so A, then B, then A
cannot produce a third claim. A distinct ID may replace work only after the
prior lease expires or the current fenced owner returns the receipt to blocked.
Recovery resumes the already-known poison outcome at quarantine body storage;
it never invokes the business handler again.

The authoritative order is:

```text
receive
  -> claim receipt
  -> durable/idempotent handler by consumeKey
  -> commit effect receipt OR commit quarantine receipt
  -> transport ACK
  -> record ACK completion
```

Receipt outcome commit always precedes ACK. If ACK fails, or the process
crashes after receipt commit, redelivery sees the committed outcome and
retries only the transport ACK. If the process crashes after the effect but
before receipt commit, the handler receives the same key and must return its
already-committed result instead of repeating the effect. The injected seams
cover `afterClaim`, `beforeEffect`, `afterEffect`, `afterReceipt`, `beforeAck`,
and `afterAck`.

The bound transport preserves the existing coordination ACK contract. A return
of `ackedCount: 0` is accepted only with the exact requested `deliveryIds`;
this is the documented idempotent tombstone retry after an earlier ACK.
Unknown or cross-inbox delivery IDs do not return zero: the service throws
`COORDINATION_DELIVERY_NOT_FOUND`.

### Retry and shutdown

Only an explicit safe-code allowlist is transient by default:
`COORDINATION_UNAVAILABLE`, `ECONNRESET`, `ETIMEDOUT`, and `EAI_AGAIN`.
Unknown failures are permanent. An injected classifier may replace that rule,
but it must return exactly `retryable` or `permanent`.

Retry uses injected clock/sleep and deterministic exponential delays:

```text
min(maxDelayMs, baseDelayMs * 2^(failedAttempt - 1))
```

The number of handler attempts is finite. Permanent failure consumes one
attempt. The runner passes an `AbortSignal` through receive, handler, and
sleep. Abort during receive, idle sleep, retry sleep, or a handler that rejects
with abort stops without quarantine or ACK; an in-flight claim is released for
later reclaim. Once a handler has returned a valid `committed` result, the
effect is already authoritative: the core commits its receipt and ACKs even if
the signal was concurrently aborted. Dropping that result would reopen the
effect/receipt crash window unnecessarily.

Busy claims wait through the same abort-aware idle delay before another
receive, so one active receipt cannot create a hot receive loop. The default
sleep removes its abort listener on both resolution and rejection.

Startup applies these explicit ceilings:

| Setting | Maximum |
|---|---:|
| handler attempts | 32 |
| quarantine-store attempts | 8 |
| base/max retry delay | 300,000 ms |
| claim lease | 3,600,000 ms |
| idle delay | 30,000 ms |
| blocking receive | 30,000 ms |
| reclaim idle | 86,400,000 ms |
| consumed quarantine-recovery IDs per receipt | 8 |

Public error codes use exact closed allowlists for core-created failures and
known coordination/network transport failures. Core-created errors carry a
module-private, unforgeable brand; constructing the exported public error class
does not create that brand. An arbitrary dependency code, including a forged
`COORDINATION_CONSUMER_*` or credential-shaped `TOKEN_*` value, collapses to
the operation's fixed fallback. Every error crossing a public boundary is
reconstructed with a static message, so raw exception text is discarded.

Audit and metric sinks remain fire-and-forget. The core catches synchronous
throws and immediately attaches rejection handling to returned promises or
thenables without awaiting them. Sink failure therefore cannot change the
business effect, receipt, ACK, replay result, or host unhandled-rejection state.

### Body-safe quarantine and pause

The receipt, status, result, audit, and metric projections never contain the
message body, raw exception text, or a secret-bearing locator. The body is sent
only to the injected quarantine store. `put({consumeKey, body})` must be
idempotent for the key and return exactly one opaque, safe locator. `get`
must return the exact stored body for authorized replay.

The locator is repository-private: neither `getReceipt()` nor the replay
authorizer projection exposes it. Receipt metadata is a closed, bounded scalar
shape with validated protocol, identifiers, classification, timestamp, and
optional malformed marker; nested or unknown values fail before storage.

Handler-attempt exhaustion and malformed envelopes commit quarantine metadata
before ACK. If the body store fails or returns an invalid/hostile locator, the
core retries storage only to its independent finite cap. Exhaustion transitions
the receipt to `quarantine_blocked`, leaves the transport delivery pending,
sets the status to `degraded`, and returns from the runner. It performs no ACK
and issues no further receive, preventing an automatic poison reclaim loop.
The blocked receipt preserves the already-known quarantine reason, not the
body. An ordinary call, the same runner, or a replacement consumer without a
recovery ID remains paused.

After the body-store condition is corrected, an operator starts a replacement
consumer incarnation with a fresh `quarantineRecoveryId`. The core asks the
repository to claim that exact blocked receipt once, receives a new claim
token, and retries only `put`, quarantine commit, and ACK under the existing
finite vault-attempt and lease limits. Reusing that recovery ID cannot trigger
another store attempt. If recovery fails again, it returns to
`quarantine_blocked` without ACK and without deleting its consumed ID; a later
operator attempt needs a distinct recovery ID. A fresh authorized recovery
continues to work while the receipt has capacity. Once capacity is exhausted,
the receipt fails closed: the runner returns degraded after one receive and
does not enter the handler or quarantine store, ACK, or receive again. This
core exposes no administrative bypass for an exhausted receipt. Successful
commit follows the normal duplicate/ACK-only path on redelivery.

### Exact authorized replay

Replay first resolves a committed quarantine and checks the caller's expected
consume key. It then invokes the injected server authorizer with a body-free
command and quarantine projection. The decision must bind exactly:

- command ID;
- quarantine ID;
- consume key;
- safe decision ID; and
- safe principal ID.

Any mismatch denies replay before body load or handler execution. An allowed
command loads the body by opaque locator, reconstructs the original safe
envelope, recomputes the consume key, and invokes the same idempotent handler.
Scope, recipient, protocol, and malformed-context state are revalidated after
the server decision and before body load/handler execution.
The repository commits one replay effect for the quarantine. Repeating the
same command or presenting another independently authorized command ID returns
that committed result without another handler effect. Authorization and
completion audit include only the decision/principal identifiers and safe
domain keys.

### Bounded status

`getStatus()` returns a recursively frozen, fixed-shape DTO:

- state and in-flight flag;
- one safe last-error code or `null`; and
- eight numeric counters for processed, duplicate, quarantined, retry, ACK,
  blocked, failure, and replay outcomes.

It contains no arrays, bodies, locators, receipt history, raw errors, or
credentials. This is the future health/inventory input; this core does not
wire or advertise a health endpoint.

## Durability boundary

The provided in-memory repository is explicitly:

```json
{
  "durable": false,
  "atomicWithBusinessEffect": false,
  "bodyStorage": false,
  "purpose": "deterministic-conformance-only",
  "maxConsumedRecoveryIdsPerReceipt": 8
}
```

It proves state-machine and fencing behavior in deterministic tests. It does
not satisfy production durability, cross-process exclusion, or atomicity with
a real business effect.

A production adapter and migration must preserve claim-token compare-and-set,
receipt transitions, replay uniqueness, safe metadata, and the receipt-fixed
recovery-history capacity. Testing membership, checking capacity, appending a
fresh recovery ID, and replacing the claim token must be one durable atomic
transition. The history must survive every return to `quarantine_blocked` and
must never grow beyond the fixed maximum. The business handler must durably
deduplicate by `consumeKey`; where the business store and receipt store can
share a transaction, their adapter should commit the effect and receipt
atomically. Otherwise the handler must return the prior durable commit for the
same key after a crash. These adapter, migration, and wiring changes are
dependency-gated and outside `G_0_2_CORE`.

## Consequences

- At-least-once transport can produce one durable idempotent business effect
  once a conforming production repository/handler adapter is supplied.
- Poison input is ACKed only after body-safe quarantine metadata commits.
- A failed quarantine store pauses instead of dropping or hot-looping poison.
- Blocked recovery IDs are one-shot for the receipt lifetime; their bounded
  history trades automatic recovery after exhaustion for fail-closed behavior.
- Replay is exact, server-authorized, audited, and converges on the same
  idempotency key.
- Redis crash/reclaim integration, durable store/migration, service/lifecycle
  composition, and health/inventory wiring remain required before the full
  `G/0/02` sheet can claim completion.

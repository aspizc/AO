# ADR V5-G-0-02: Durable SQLite coordination consumer store

- Status: Proposed for independent `G_0_2_STORE` review
- Date: 2026-07-26
- Task: Project V5 `G/0/02`, durable store slice

## Context

The accepted coordination consumer core defines a receipt, quarantine, ACK,
blocked-recovery, and replay state machine. Its in-memory repository is a
deterministic conformance oracle only. It does not survive process restart,
exclude another process using the same database, or retain a quarantine body.

The consumer's authoritative order remains:

```text
receive
  -> claim receipt
  -> durable/idempotent handler by consumeKey
  -> commit effect receipt OR commit quarantine receipt
  -> transport ACK
  -> commit ACK completion
```

This slice supplies the durable repository and quarantine vault needed by that
order. It does not wire the adapter into the coordination service or Redis
consumer lifecycle, expose health, change the consumer core, or close the full
`G/0/02` sheet.

## Decision

### SQLite baseline and backend boundary

The baseline adapter uses the existing lock-matched `better-sqlite3`
dependency and migration `002_coordination_consumer.sql`. Callers pass an
already-open, already-migrated SQLite database. The adapter performs every
state transition in a synchronous SQLite transaction. Mutating transitions use
`BEGIN IMMEDIATE`, so two connections to the same file serialize their
compare-and-set decision and update.

Both factories reject an explicitly non-SQLite backend. PostgreSQL support,
including an equivalent transaction and constraint contract, is deferred to
Project V5 `I/0/05`; this slice does not emulate or advertise it.

The repository descriptor is:

```json
{
  "durable": true,
  "atomicWithBusinessEffect": false,
  "bodyStorage": false,
  "backend": "sqlite",
  "purpose": "durable-coordination-consumer-baseline",
  "maxConsumedRecoveryIdsPerReceipt": 8
}
```

`durable: true` means a committed repository transition survives database
close and reopen. It does not mean the receipt transaction includes an
arbitrary business store.

`atomicWithBusinessEffect: false` is intentional and must remain visible.
The handler is still required to durably deduplicate by the canonical
`consumeKey`. If a process crashes after the business effect and before the
receipt, the replacement invocation must return the prior durable commit for
that key. A handler that performs the effect again is not conforming.

### Receipt layout and private state

The public receipt table stores bounded scalar metadata and state-machine
fields. It has no message-body, locator, or JSON column. Child tables hold:

- observed deliveries and ACK state;
- the bounded, receipt-private recovery-ID history;
- a private quarantine-ID-to-locator reference; and
- replay command, lease, result, and failure state.

The public projection is identical to the in-memory conformance repository.
It excludes the processing claim token, replay claim token, recovery history,
and quarantine locator. The consumer can resolve the locator only through the
repository's private `getQuarantine()` boundary after it has identified an
exact quarantine record. The replay authorizer projection continues to omit
that locator.

The migration applies relational checks and bounded indexes for states, ACK
status, replay status, recovery order, quarantine identifiers, and vault
locators. Runtime decoding additionally validates canonical identifiers,
epochs, lease shape, transition-specific fields, and cross-table consistency.
Unknown or corrupt state fails closed with a static error. Raw SQL errors,
stored values, bodies, JSON, and locators are never copied into an adapter
error.

### Fencing and atomic transitions

Processing ownership is the exact pair `(ownerId, claimToken)`. Replay
ownership is the exact pair `(ownerId, replayClaimToken)` plus its command.
Each replacement increments the stored epoch and derives the next token from
that epoch. Reusing an owner ID does not preserve ownership after replacement.
A stale token cannot record an attempt, effect, quarantine, replay commit, or
replay failure.

Blocked quarantine recovery performs all of these steps in one immediate
transaction:

1. validate the receipt and active lease;
2. check that the recovery ID was not consumed;
3. check the receipt-fixed history capacity;
4. append the fresh recovery ID;
5. increment the claim epoch; and
6. install the replacement lease and claim token.

Returning to `quarantine_blocked` does not remove the consumed ID. The history
survives close and reopen. Once the fixed capacity is full, a fresh recovery
claim remains blocked.

Rejected transitions validate before their writes or roll back the whole
transaction. A stale or conflicting transition therefore cannot leave a
partial delivery, history, private quarantine, receipt, or replay mutation.

### Durable quarantine vault

The quarantine vault is a separate adapter and may use a separate SQLite file.
It is keyed by canonical `consumeKey`, stores a string body as its exact UTF-8
bytes in a BLOB, represents a missing malformed-envelope body as a distinct
empty `absent` value, and returns a canonical opaque locator:

```text
coord-vault-v1-SHA256(JSON([1, consumeKey]))
```

The locator contains neither the consume key nor the body. `put()` compares
the exact stored UTF-8 bytes:

- the same key and same bytes return the same locator;
- the same key and different bytes fail closed; and
- a damaged key, digest, body, or locator relation fails closed.

`get()` accepts only the exact canonical locator and has no lookup by consume
key. A missing exact locator returns `null`. This makes a vault write left
behind before a receipt commit safe to retry: the replacement consumer gets
the same locator and can complete the receipt transition.

The body is present only in the private vault table and the `put`/`get`
boundary. The locator is present only in the vault and private quarantine
reference tables. Neither is present in public receipt DTOs, status, audit,
metrics, or public errors.

## Crash and contention evidence

Directed tests use the real consumer with SQLite files that are closed and
reopened. They cover:

- a business effect committed before its receipt, with a durable
  `consumeKey`-deduplicating handler converging after replacement;
- an effect receipt committed before transport ACK, where redelivery retries
  only ACK;
- a quarantine receipt and body committed before ACK, where redelivery retries
  only ACK;
- a vault `put` left behind before quarantine receipt commit, which converges
  through byte-idempotent `put`;
- blocked recovery history surviving multiple replacements; and
- an authorized replay commit surviving reopen and deduplicating a later
  authorized command.

Separate two-connection tests show one active processing claimant and one
active replay claimant. Expired claims can be replaced, epochs increase, and
the stale owner-token pair cannot mutate.

## Consequences

- Receipt, quarantine, blocked-recovery, ACK, and replay transitions are
  durable on the SQLite baseline.
- Quarantine body storage is durable and does not widen public projections.
- Process replacement and two connections share one fenced state machine.
- At-least-once business correctness still depends on a handler that durably
  deduplicates by `consumeKey`.
- Atomic commit across an arbitrary business database is not claimed.
- Redis receive/reclaim wiring, service lifecycle, health/inventory
  projection, PostgreSQL parity, and the full `G/0/02` exit gate remain open.

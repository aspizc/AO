# Review Submission — Project V5 G/0/02 STORE (Trial 1)

## Review requested

Independent, evidence-based review is requested for the frozen Trial 1
technical range ending at
`69730e7ba9a51905716badea98d149b07498c082`.

This is request-only evidence. It contains no automatic verdict, result,
integration, Redis/service wiring, health projection, promotion, release, or
full-`G/0/02` completion claim.

## What was done

The slice adds the SQLite durable baseline for every operation in the accepted
coordination-consumer repository port:

- processing claim and expired-claim replacement;
- blocked-quarantine recovery claim;
- attempt recording;
- effect commit;
- quarantine commit, block, and claim release;
- ACK prepare and commit;
- receipt and private quarantine lookup; and
- replay begin, commit, and fail.

Every mutating operation uses a synchronous `better-sqlite3`
`BEGIN IMMEDIATE` transaction. Processing and replay compare-and-set operations
fence the exact owner plus monotonically replaced claim token. Blocked recovery
atomically checks membership and receipt-fixed capacity, appends one private
recovery ID, increments the epoch, and installs the next lease. Rejected stale,
conflicting, full-capacity, corrupt, or invalid transitions leave the whole
transition unchanged.

Migration `002_coordination_consumer.sql` stores bounded scalar metadata,
deliveries, ACK state, private recovery history, a private quarantine locator
reference, and replay state. The public receipt table has no body, locator, or
JSON column. Runtime decoding validates cross-table state and fails closed with
static errors when a state, epoch, lease, locator relation, or projection is
unknown or corrupt.

The separate SQLite quarantine vault is keyed by canonical `consumeKey`.
`put()` returns a stable opaque canonical locator for the same exact body bytes,
rejects a different body for the same key, and distinguishes a malformed
envelope's absent body from an empty string. `get()` accepts only the exact
locator. Bodies remain in the private vault table; locators remain in that
table and the private quarantine-reference table.

The durable repository descriptor is exactly:

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

The handler remains responsible for durable idempotency by `consumeKey`.
Neither the descriptor nor the ADR claims an atomic transaction with an
arbitrary business store. Both SQLite factories reject an explicitly
non-SQLite backend; PostgreSQL is deferred explicitly to Project V5 `I/0/05`.

## Crash, reopen, and contention evidence

The directed tests exercise the real accepted consumer with databases closed
and reopened:

- crash after a durable business effect but before its receipt: a
  `consumeKey`-deduplicating test handler returns the existing effect and the
  business table retains one row;
- effect receipt before ACK: reopen/redelivery invokes ACK only;
- quarantine receipt and vault body before ACK: reopen/redelivery invokes ACK
  only;
- malformed envelope with no body: durable quarantine succeeds without
  invoking the handler;
- vault `put` before receipt commit: reopen repeats the same put, retains one
  vault row, then commits quarantine;
- blocked recovery A fails, repeated A remains consumed after reopen, and B
  can recover within the fixed capacity; and
- authorized replay commit survives reopen and a later independently
  authorized command returns the committed replay without another handler
  effect.

Separate two-connection tests prove one processing claimant and one replay
claimant. A replacement receives the next epoch token even when it reuses the
same owner ID. The stale token cannot record an attempt, effect, quarantine,
block, release, replay commit, or replay failure.

## TDD evidence

### Initial RED

- Commit:
  `9c81a928ed012c3b18d87173176fe6061429b27c`
- Subject:
  `test(consumer): define durable SQLite store contract (G/0/02 STORE)`
- Tree:
  `b9ed532b7922a8c7c93e3f5d7588f0222cec603c`
- Direct parent:
  `0a5b6d9882f3599c4fa2bde53e3720ddfbde2a3b`
- Changed paths:
  `tests/gateway/coordination_consumer_sqlite_repo.test.js` and
  `tests/gateway/coordination_consumer_sqlite_integration.test.js`

Command:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_sqlite_repo.test.js \
  tests/gateway/coordination_consumer_sqlite_integration.test.js
```

Expected RED result:

- **0 passed / 2 failed / 0 skipped**;
- both files failed with `ERR_MODULE_NOT_FOUND` for the intentionally absent
  `sqlite_coordination_consumer_repo.js`;
- the vault adapter and migration were also absent.

### RED correction and extension

- Commit:
  `30fec70a1d4ba976165afe2ed1f35fc3d0f4799c`
- Subject:
  `test(consumer): correct and extend SQLite RED matrix (G/0/02 STORE)`
- Tree:
  `06e78cf9723070029876f805727954935f9b1cc4`
- Direct parent:
  `9c81a928ed012c3b18d87173176fe6061429b27c`
- Changed paths: the same two test files only.

No acceptance was removed or weakened. The adjustments are explicit:

1. The crash fault seam now expects
   `COORDINATION_CONSUMER_FAULT`, the branded behavior already fixed by the
   accepted consumer core, rather than an incorrect delivery fallback.
2. A test that attempted `commitEffect` from `quarantine_blocked` now performs
   `commitQuarantine`, the transition required by the accepted port and
   in-memory oracle.
3. Only the crash-before-receipt harness uses two total attempts, allowing the
   replacement to re-enter the required idempotent handler. At a one-attempt
   cap the accepted core correctly quarantines without another invocation.
4. The matrix was strengthened with malformed/absent-body durability, exact
   absent-versus-empty vault conflict, correct and stale claim release, stale
   quarantine commit, and stale block all-or-nothing assertions.

The corrected commit was re-run from an isolated `git archive` containing no
production adapter or migration:

- **0 passed / 2 failed / 0 skipped**;
- exact exit code **1**;
- both files still failed on the intentionally absent SQLite repository
  import.

### GREEN

- Commit:
  `69730e7ba9a51905716badea98d149b07498c082`
- Subject:
  `feat(consumer): add durable SQLite coordination store (G/0/02 STORE)`
- Tree:
  `b1f0f5c21c9e65c84bc54ad6bfb1a3ca39d3fa06`
- Direct parent:
  `30fec70a1d4ba976165afe2ed1f35fc3d0f4799c`
- Changed paths:
  - `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js`
  - `gateway/src/core/sqlite_quarantine_store.js`
  - `gateway/migrations/002_coordination_consumer.sql`
  - `docs/adr/ADR-V5-G-0-02-coordination-consumer-store.md`

The directed RED command passed:

- **18 passed / 0 failed / 0 skipped**.

## Directed verification

Store, vault, differential port, two-connection, crash, reopen, blocked
recovery, ACK-only, malformed, and replay tests:

```text
NODE_PATH=/home/carase/git/personal/agents-orchestrator/gateway/node_modules \
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_sqlite_repo.test.js \
  tests/gateway/coordination_consumer_sqlite_integration.test.js
```

- **18 passed / 0 failed / 0 skipped**.
- The reused `better-sqlite3` is **11.10.0**, exactly matching this candidate's
  lock.
- No install or network command was run.

Accepted consumer plus unchanged queue/service receive and ACK contracts:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_receive.test.js \
  tests/gateway/coordination_queue_ack.test.js \
  tests/gateway/coordination_service_receive.test.js \
  tests/gateway/coordination_service_ack.test.js
```

- **77 passed / 0 failed / 0 skipped**.
- A task-owned temporary Node loader resolved bare packages from a
  lock-identical pre-existing dependency tree because this isolated worktree
  intentionally had no `node_modules`; the loader was deleted after the run.
- No Redis instance or service was started or consulted.

Lock-matched ESLint covered both adapters and both new test files:

```text
/tmp/agents-orchestrator-v5-c100-rebaseline.5s8B2b/worktree/gateway/\
node_modules/.bin/eslint \
  --config \
  /tmp/agents-orchestrator-v5-c100-rebaseline.5s8B2b/worktree/gateway/\
eslint.config.js \
  <the two adapters or the two directed test files>
```

- passed with ESLint **10.8.0**;
- candidate and tool-provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
- candidate and tool-provider ESLint configuration SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.

The migration was applied twice to one task-owned temporary SQLite file:

```json
{
  "migration": "002_coordination_consumer",
  "tables": 6,
  "foreignKeys": 1,
  "integrity": "ok"
}
```

The database and temporary directory were deleted after validation.

Exact structure and range checks:

- the technical range contains exactly the six paths listed in
  [Frozen identity and scope](#frozen-identity-and-scope);
- restricted-path comparison found no change to the accepted consumer,
  in-memory port, `state.js`, packages/locks, existing migration, config,
  catalog, tools, services, lifecycle, Redis, MCP, health, shared plan sheets,
  policies, or workflows;
- `git diff --check
  0a5b6d9882f3599c4fa2bde53e3720ddfbde2a3b..69730e7ba9a51905716badea98d149b07498c082`
  passed; and
- an added-line credential-signature scan found **0 hits**.

Runtime identity:

- Node **22.22.1**.

## Frozen identity and scope

- Exact Trial 1 base:
  `0a5b6d9882f3599c4fa2bde53e3720ddfbde2a3b`
- Base tree:
  `dabec4310f2c76803aea24895ba3194158bcef24`
- Initial RED:
  `9c81a928ed012c3b18d87173176fe6061429b27c`
- Corrected/extended RED:
  `30fec70a1d4ba976165afe2ed1f35fc3d0f4799c`
- Technical commit:
  `69730e7ba9a51905716badea98d149b07498c082`
- Trial 1 technical range:
  `0a5b6d9882f3599c4fa2bde53e3720ddfbde2a3b..69730e7ba9a51905716badea98d149b07498c082`
- Range identity:
  **3 commits / 6 files / 3,929 insertions**
- Branch:
  `feat/V5-G-0-02-store`
- Worktree:
  `/tmp/agents-orchestrator-v5-g002-store.8d906A/worktree`

The technical range changes exactly:

- `docs/adr/ADR-V5-G-0-02-coordination-consumer-store.md`
- `gateway/migrations/002_coordination_consumer.sql`
- `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js`
- `gateway/src/core/sqlite_quarantine_store.js`
- `tests/gateway/coordination_consumer_sqlite_integration.test.js`
- `tests/gateway/coordination_consumer_sqlite_repo.test.js`

No aggregate npm test, full CI, network, shared/live Redis, MCP, KYA, provider,
tmux, agent, service, lifecycle, configuration, catalog, health, PostgreSQL,
integration, promotion, release, or shared-plan mutation was run or performed.

## Remaining dependency-gated scope and limitations

This is the SQLite store/vault slice only:

- The repository is durable but remains explicitly
  `atomicWithBusinessEffect: false`; correctness after an effect-before-receipt
  crash requires the handler to durably deduplicate by `consumeKey`.
- The adapter is not wired into the coordination service, Redis receive/reclaim
  runner, lifecycle, configuration, or health/inventory.
- No live Redis crash/reclaim or service restart is claimed.
- PostgreSQL parity remains deferred to Project V5 `I/0/05`.
- Retention, quotas, and reaping remain outside this slice.
- The four full `G/0/02` acceptance criteria and the sheet exit gate remain
  open pending effect composition, wiring, health, and integration evidence.

## Review focus

- Confirm public receipt projections match the accepted in-memory oracle while
  the locator, claim tokens, replay claim token, and recovery history remain
  private.
- Confirm every stale/rejected state transition is transactionally
  all-or-nothing and the exact owner-token pair fences replacement work.
- Confirm blocked recovery membership, capacity, append, epoch, and lease form
  one durable transaction and survive reopen.
- Confirm two connections produce one processing/replay winner and monotonically
  replaced tokens.
- Confirm vault idempotency is exact for same bytes, conflicts fail closed, and
  only the exact locator can load a body.
- Confirm unknown/corrupt database state and raw SQLite errors cannot expose
  stored metadata, body, locator, or JSON through errors.
- Confirm the descriptor and ADR do not overstate business-effect atomicity,
  PostgreSQL support, Redis/service wiring, health, or full-sheet completion.

Independent review is requested. No automatic review or integration follows
from this file.

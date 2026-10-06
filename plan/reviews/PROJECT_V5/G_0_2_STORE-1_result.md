# Independent Review Result — Project V5 G/0/02 STORE (Trial 1)

## Verdict

**KO** for technical candidate
`69730e7ba9a51905716badea98d149b07498c082`.

- P0 findings: **0**
- P1 findings: **3**

The candidate demonstrates real SQLite durability, immediate-transaction
serialization, owner/token fencing, private bounded recovery history, durable
ACK state, exact vault idempotency, and the requested consumer reopen paths.
It cannot receive an independent OK because it still diverges from the
accepted public port at safe-integer boundaries, accepts corrupt metadata and
recognized-but-impossible receipt combinations, and exposes raw
`better-sqlite3` `TypeError` messages instead of fixed adapter errors.

This verdict is limited to the frozen SQLite STORE slice. It does not change
the accepted consumer core, integrate or promote this candidate, mark the full
`G/0/02` sheet complete, or claim Redis/service wiring, health projection,
PostgreSQL support, business-effect atomicity, or release readiness.

## Reviewer profile

- Requested model profile: **GPT-5.6 Sol**
- Requested reasoning profile: **ultra**
- Requested service profile: **Priority/Fast**
- Review date: **2026-07-27**

The review was performed independently without delegation, agents, Redis,
MCP, services, or network access.

## Frozen identity and scope

- Branch: `feat/V5-G-0-02-store`
- Exact base:
  `0a5b6d9882f3599c4fa2bde53e3720ddfbde2a3b`
- Base tree:
  `dabec4310f2c76803aea24895ba3194158bcef24`
- Initial RED:
  `9c81a928ed012c3b18d87173176fe6061429b27c`
- Initial RED tree:
  `b9ed532b7922a8c7c93e3f5d7588f0222cec603c`
- Corrected/extended RED:
  `30fec70a1d4ba976165afe2ed1f35fc3d0f4799c`
- Corrected RED tree:
  `06e78cf9723070029876f805727954935f9b1cc4`
- Technical candidate:
  `69730e7ba9a51905716badea98d149b07498c082`
- Technical tree:
  `b1f0f5c21c9e65c84bc54ad6bfb1a3ca39d3fa06`
- Request-only review HEAD:
  `d48e96bb7116c060bd5558c80f2a1eae5c051673`
- Request tree:
  `1ee04243fdcdbd63e8f4fccf1ace4c1551c468dd`
- Exact technical range:
  `0a5b6d9882f3599c4fa2bde53e3720ddfbde2a3b..69730e7ba9a51905716badea98d149b07498c082`
- Review worktree:
  `/tmp/agents-orchestrator-v5-g002-store.8d906A/worktree`

Parentage is exact and linear: RED1 is the direct child of the base, RED2 is
the direct child of RED1, the technical commit is the direct child of RED2,
and the request is the direct child of the technical commit.

The technical range contains exactly **3 commits / 6 files / 3,929
insertions**:

```text
docs/adr/ADR-V5-G-0-02-coordination-consumer-store.md
gateway/migrations/002_coordination_consumer.sql
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
gateway/src/core/sqlite_quarantine_store.js
tests/gateway/coordination_consumer_sqlite_integration.test.js
tests/gateway/coordination_consumer_sqlite_repo.test.js
```

RED1 adds only the two tests. RED2 changes only those same tests. The
technical commit adds only the ADR, migration, repository adapter, and vault
adapter. The request commit adds only
`plan/reviews/PROJECT_V5/G_0_2_STORE-1_to_review.md`.

There is no technical-range change to the accepted core, in-memory
repository, `state.js`, configuration, catalog, services, Redis, MCP, health,
packages, locks, existing migrations, workflows, or shared plan sheets.

## Findings

### P1-1 — Eager expiry derivation breaks the accepted public port on non-winning paths

The accepted in-memory oracle validates `now` and `leaseMs` independently, but
derives `now + leaseMs` only when it will install a new lease:

- `claim()` returns `blocked`, a committed outcome, or `busy` before
  `safeExpiry()` is needed
  (`gateway/src/core/repositories/coordination_consumer_repo.js:330-355`);
- `claimBlockedQuarantine()` returns a committed outcome, `blocked`, or
  `busy` before deriving the replacement expiry (`:379-403`); and
- `beginReplay()` returns `not_found`, `duplicate`, `conflict`, or `busy`
  before deriving the replacement expiry (`:643-674`).

The SQLite adapter instead calls `safeExpiry()` before it opens the
transaction or reads the existing state:

- `claim()` at
  `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:793-821`;
- `claimBlockedQuarantine()` at `:976-990`; and
- `beginReplay()` at `:1407-1428`.

Therefore an individually valid `now` and `leaseMs` whose sum exceeds
`Number.MAX_SAFE_INTEGER` rejects operations for which no replacement lease
is needed. A completed delivery cannot reach its committed/ACK-only path, a
blocked or already-consumed recovery cannot return `blocked`, and a missing
replay source cannot return `not_found`.

Minimal reproduction from the frozen worktree:

```text
NODE_PATH=/tmp/agents-orchestrator-v5-c100-rebaseline.5s8B2b/worktree/gateway/node_modules \
node --input-type=module <<'NODE'
import fs from "node:fs";
import { createRequire } from "node:module";
import {
  createInMemoryCoordinationConsumerRepository,
} from "./gateway/src/core/repositories/coordination_consumer_repo.js";
import {
  createSqliteCoordinationConsumerRepository,
} from "./gateway/src/core/repositories/sqlite_coordination_consumer_repo.js";

const require = createRequire(new URL("./gateway/package.json", import.meta.url));
const Database = require("better-sqlite3");
const db = new Database(":memory:");
db.backend = "sqlite";
db.exec(fs.readFileSync(
  "./gateway/migrations/002_coordination_consumer.sql",
  "utf8",
));
const memory = createInMemoryCoordinationConsumerRepository();
const sqlite = createSqliteCoordinationConsumerRepository({ database: db });
const consumeKey = `coord-consume-v1-${"a".repeat(64)}`;
const input = {
  consumeKey,
  deliveryId: "1-0",
  recovered: false,
  metadata: {
    protocolVersion: 1,
    scopeId: "scope",
    messageId: "message",
    fromParticipantId: "sender",
    toParticipantId: "recipient",
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    createdAt: "2026-07-26T00:00:00.000Z",
  },
  ownerId: "owner",
  now: 0,
  leaseMs: 1,
  maxConsumedRecoveryIdsPerReceipt: 2,
};
const [memoryClaim, sqliteClaim] = await Promise.all([
  memory.claim(input),
  sqlite.claim(input),
]);
await Promise.all([
  memory.commitEffect({
    consumeKey,
    ownerId: "owner",
    claimToken: memoryClaim.claimToken,
    commitId: "effect",
    now: 1,
  }),
  sqlite.commitEffect({
    consumeKey,
    ownerId: "owner",
    claimToken: sqliteClaim.claimToken,
    commitId: "effect",
    now: 1,
  }),
]);
const overflow = {
  ...input,
  deliveryId: "2-0",
  recovered: true,
  ownerId: "replacement",
  now: Number.MAX_SAFE_INTEGER,
  leaseMs: 1,
};
async function settle(value) {
  try {
    return { kind: "return", status: (await value).status };
  } catch (error) {
    return { kind: "throw", name: error.name, message: error.message };
  }
}
console.log(await settle(memory.claim(overflow)));
console.log(await settle(sqlite.claim(overflow)));
db.close();
NODE
```

Observed:

```text
{ kind: 'return', status: 'committed' }
{
  kind: 'throw',
  name: 'TypeError',
  message: 'claim expiry exceeds the safe integer range'
}
```

The same directed matrix produced these public divergences:

```json
{
  "completedClaim": ["committed", "TypeError"],
  "blockedClaim": ["blocked", "TypeError"],
  "consumedRecovery": ["blocked", "TypeError"],
  "missingReplay": ["not_found", "TypeError"]
}
```

Required correction: derive and validate the expiry inside the serialized
winning branch, after the same status decisions as the oracle but before the
first write. Add differential boundary tests for completed, blocked,
already-consumed, missing, conflict, duplicate, and busy outcomes, plus
all-or-nothing tests for an overflow on a path that really would install a
lease.

### P1-2 — Runtime decoding accepts corrupt metadata and impossible recognized state

The corruption decoder is not exhaustive:

- `storedMetadata()` maps every non-null raw `metadata_malformed` value to
  `row.metadata_malformed === 1`
  (`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:252-275`).
  A corrupt value such as `2` is silently projected as `false`.
- `validateBundle()` requires a `processing` receipt to have a lease, but does
  not require its effect, quarantine, and replay fields to be empty
  (`:568-600`). A row can therefore be `processing` with an active lease and a
  committed effect.

The latter impossible combination is permitted by the migration's independent
column checks, so it does not require disabling SQLite constraints. It is
returned as an authoritative public receipt and can subsequently re-enter
processing instead of failing closed.

Reproduction:

```text
NODE_PATH=/tmp/agents-orchestrator-v5-c100-rebaseline.5s8B2b/worktree/gateway/node_modules \
node --input-type=module <<'NODE'
import fs from "node:fs";
import { createRequire } from "node:module";
import {
  createSqliteCoordinationConsumerRepository,
} from "./gateway/src/core/repositories/sqlite_coordination_consumer_repo.js";

const require = createRequire(new URL("./gateway/package.json", import.meta.url));
const Database = require("better-sqlite3");
const migration = fs.readFileSync(
  "./gateway/migrations/002_coordination_consumer.sql",
  "utf8",
);
const consumeKey = `coord-consume-v1-${"b".repeat(64)}`;
const claim = {
  consumeKey,
  deliveryId: "1-0",
  recovered: false,
  metadata: {
    protocolVersion: 1,
    scopeId: "scope",
    messageId: "message",
    fromParticipantId: "sender",
    toParticipantId: "recipient",
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    createdAt: "2026-07-26T00:00:00.000Z",
  },
  ownerId: "owner",
  now: 10,
  leaseMs: 10,
  maxConsumedRecoveryIdsPerReceipt: 2,
};
function open() {
  const database = new Database(":memory:");
  database.backend = "sqlite";
  database.exec(migration);
  return {
    database,
    repository: createSqliteCoordinationConsumerRepository({ database }),
  };
}

const first = open();
await first.repository.claim(claim);
first.database.prepare(
  "UPDATE coordination_consumer_receipts "
  + "SET effect_commit_id = 'effect-corrupt', effect_committed_at = 11 "
  + "WHERE consume_key = ?",
).run(consumeKey);
const impossible = await first.repository.getReceipt(consumeKey);
console.log({
  state: impossible.state,
  effect: impossible.effect,
  hasLease: impossible.lease !== null,
});
first.database.close();

const second = open();
await second.repository.claim(claim);
second.database.pragma("ignore_check_constraints = ON");
second.database.prepare(
  "UPDATE coordination_consumer_receipts "
  + "SET metadata_malformed = 2 WHERE consume_key = ?",
).run(consumeKey);
second.database.pragma("ignore_check_constraints = OFF");
console.log((await second.repository.getReceipt(consumeKey)).metadata);
second.database.close();
NODE
```

Observed:

```text
{
  state: 'processing',
  effect: { commitId: 'effect-corrupt', committedAt: 11 },
  hasLease: true
}
{
  protocolVersion: 1,
  scopeId: 'scope',
  messageId: 'message',
  fromParticipantId: 'sender',
  toParticipantId: 'recipient',
  messageType: 'IMPACT_NOTICE',
  classification: 'internal',
  createdAt: '2026-07-26T00:00:00.000Z',
  malformed: false
}
```

Both reads should instead reject with code
`COORDINATION_CONSUMER_STORE_CORRUPT` and the fixed message
`coordination consumer store state is invalid`.

Required correction: validate the raw stored boolean domain before projecting
it, and define an exhaustive per-state invariant matrix for receipt lease,
effect, blocked/committed quarantine, replay, and completion combinations.
Add directed corruption tests for every recognized state with impossible
cross-fields and for every stored metadata boolean outside `NULL`, `0`, and
`1`; assert the fixed code/message and absence of stored content.

### P1-3 — Raw SQLite `TypeError` messages cross both adapter boundaries

Both adapters preserve every `TypeError` on the assumption that it came from
caller validation:

- repository `safely()` at
  `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:771-782`;
- vault `safely()` at
  `gateway/src/core/sqlite_quarantine_store.js:172-183`.

`better-sqlite3` also uses `TypeError` for database-phase failures. Operations
against a closed real connection therefore expose the dependency's raw error
name and message instead of the candidate's fixed
`COORDINATION_CONSUMER_STORE_FAILED` /
`COORDINATION_QUARANTINE_VAULT_FAILED` errors.

Reproduction:

```text
NODE_PATH=/tmp/agents-orchestrator-v5-c100-rebaseline.5s8B2b/worktree/gateway/node_modules \
node --input-type=module <<'NODE'
import fs from "node:fs";
import { createRequire } from "node:module";
import {
  createSqliteCoordinationConsumerRepository,
} from "./gateway/src/core/repositories/sqlite_coordination_consumer_repo.js";
import {
  createSqliteQuarantineStore,
} from "./gateway/src/core/sqlite_quarantine_store.js";

const require = createRequire(new URL("./gateway/package.json", import.meta.url));
const Database = require("better-sqlite3");
const database = new Database(":memory:");
database.backend = "sqlite";
database.exec(fs.readFileSync(
  "./gateway/migrations/002_coordination_consumer.sql",
  "utf8",
));
const repository = createSqliteCoordinationConsumerRepository({ database });
const vault = createSqliteQuarantineStore({ database });
database.close();
for (const [kind, operation] of [
  ["repository", () => repository.getReceipt(
    `coord-consume-v1-${"a".repeat(64)}`,
  )],
  ["vault", () => vault.get({
    locator: `coord-vault-v1-${"a".repeat(64)}`,
  })],
]) {
  try {
    await operation();
  } catch (error) {
    console.log({
      kind,
      name: error.name,
      code: error.code ?? null,
      message: error.message,
    });
  }
}
NODE
```

Observed twice:

```text
{
  name: 'TypeError',
  code: null,
  message: 'The database connection is not open'
}
```

This contradicts the ADR and request claim that raw SQLite errors never cross
the adapter boundary.

Required correction: separate caller-input validation from database execution,
then translate every unbranded database-phase exception, including
`TypeError`, to the fixed adapter failure. Preserve only deliberately created
input `TypeError` values and branded static adapter errors. Add real
closed-connection tests for both adapters and a database/schema failure test
that asserts fixed code/message and no raw SQL, path, body, locator, metadata,
or dependency text.

## RED1 to RED2 disposition

The post-RED changes correct the test/oracle or add acceptance; they do not
soften the intended behavior:

1. Expecting `COORDINATION_CONSUMER_FAULT` at the `afterEffect` seam matches
   the accepted branded `injectFault()` behavior
   (`gateway/src/core/coordination_consumer.js:636-641`). The original
   `COORDINATION_CONSUMER_DELIVERY_FAILED` expectation was incorrect.
2. A blocked-recovery winner must resume quarantine storage, so
   `commitQuarantine()` is the accepted operation from
   `quarantine_blocked`; `commitEffect()` accepts only `processing` in the
   oracle. The corrected durable test now exercises the legal port
   transition.
3. Raising only the crash-before-receipt harness to two total attempts is
   necessary for the replacement to re-enter the idempotent handler. With a
   one-attempt receipt the accepted consumer correctly goes directly to
   quarantine instead.
4. The remaining RED2 changes add absent-body durability, absent-versus-empty
   vault conflict, correct/stale release behavior, stale quarantine commit,
   and stale block all-or-nothing assertions.

RED2 contains **118 insertions and 10 deletions** across only the two tests.
At RED2, both adapters and the migration are still absent from the tree, so
the corrected tests remain structurally RED rather than receiving production
code early.

## Verified behavior outside the findings

Source inspection and directed execution confirm:

- every mutating repository/vault operation executes through a synchronous
  `better-sqlite3` immediate transaction;
- the read/decision/write sequence stays inside that transaction, so the
  submitted implementation has no cross-connection read-modify-write gap on
  the normal paths;
- two connections elect one processing claimant and one replay claimant, and
  same-owner replacements receive monotonically increasing tokens that fence
  the stale incarnation;
- blocked recovery membership, receipt-fixed capacity, append, epoch, and
  replacement lease are one transaction and survive reopen;
- rejected stale effect, attempt, quarantine, block, release, replay commit,
  and replay failure operations leave the directed database snapshot
  unchanged;
- effect and quarantine receipts persist before ACK, and reopen/redelivery
  takes the ACK-only path without another handler call;
- a dangling vault write converges through exact idempotent `put`;
- replay commit and deduplication survive reopen;
- ACK `pending` / `acknowledging` / `acked` state persists, while the unchanged
  accepted consumer preserves the exact zero-count tombstone ACK contract;
- the vault distinguishes absent body from empty string, stores exact UTF-8
  bytes, returns a stable canonical opaque locator for the same key/body,
  rejects a conflicting body, and loads only by exact locator;
- public receipt projection omits processing/replay claim tokens, recovery
  history, locator, and body; the locator remains in the private lookup;
- the descriptor is exactly durable SQLite, body-free at the repository
  boundary, and explicitly non-atomic with an arbitrary business effect;
- both factories explicitly reject a declared non-SQLite backend; and
- the ADR does not claim PostgreSQL, Redis/service wiring, health, full-sheet
  completion, integration, promotion, or release.

## Independent verification

Runtime identity: Node **22.22.1**.

- Store/vault/differential/reopen/two-connection/consumer integration:

  ```text
  NODE_PATH=/tmp/agents-orchestrator-v5-c100-rebaseline.5s8B2b/worktree/gateway/node_modules \
  node --test --test-concurrency=1 \
    tests/gateway/coordination_consumer_sqlite_repo.test.js \
    tests/gateway/coordination_consumer_sqlite_integration.test.js
  ```

  Result: **18 passed / 0 failed / 0 skipped**.

- Accepted consumer plus unchanged queue/service receive and ACK contracts:

  ```text
  node --experimental-loader '<read-only lock-matched bare-package resolver>' \
    --test --test-concurrency=1 \
    tests/gateway/coordination_consumer.test.js \
    tests/gateway/coordination_queue_receive.test.js \
    tests/gateway/coordination_queue_ack.test.js \
    tests/gateway/coordination_service_receive.test.js \
    tests/gateway/coordination_service_ack.test.js
  ```

  Result: **77 passed / 0 failed / 0 skipped**. The worktree has no local
  `node_modules`; the in-memory loader redirected only otherwise-unresolved
  bare packages to the pre-existing lock-identical dependency tree and wrote
  no file.

- Lock-matched ESLint **10.8.0** passed over both adapters and both new test
  files. Candidate/provider lock hashes both equal
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
  candidate/provider ESLint configuration hashes both equal
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.
- Applying migration `002_coordination_consumer.sql` twice to one in-memory
  SQLite database produced:

  ```json
  {
    "tables": 6,
    "migrationRows": 1,
    "foreignKeyViolations": 0,
    "integrity": "ok"
  }
  ```

- Exact structure selection
  `tests/structure/test_project_layout.py` plus
  `tests/structure/test_v5_coordination_docs.py`:
  **11 passed / 0 failed** with Python **3.13.13** and pytest **9.1.1**;
  bytecode and pytest cache writes were disabled.
- `git diff --check` passed for the technical range and the
  technical-to-request range.
- Gitleaks scanned the exact three-commit technical range with redaction and
  found no leaks.
- The worktree was clean at intake and remained free of test/cache/temp
  residue before this result was created.

No aggregate `npm test`, suite aggregation, full CI, install, network, live or
shared Redis, MCP, KYA, provider, service, lifecycle, tmux, integration,
promotion, release, agent, or subagent command was run.

## Final conclusion

**KO.** The normal-path durability and contention evidence is substantial and
the RED2 corrections are legitimate, but the submitted adapter is not yet a
closed durable realization of the accepted port. It rejects non-winning
boundary calls that the oracle resolves, treats corrupt metadata and
impossible recognized receipt combinations as authoritative, and exposes raw
SQLite `TypeError` messages. All three P1 findings require directed RED tests
and technical correction before a new trial.

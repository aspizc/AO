# Independent Review Result — Project V5 G/0/02 STORE (Trial 2)

## Verdict

**KO** for technical candidate
`99cab71f6ce1ab7303f73bd853566873c93178ee`.

- P0 findings: **0**
- P1 findings: **1**
- P2 findings: **0**

Trial 2 closes the expiry-ordering and exhaustive-decoder findings from Trial
1. It also closes the ordinary closed-connection, missing-schema, fresh
dependency-`TypeError`, and freshly forged exported-error cases. It cannot
receive an independent OK because the module-global `WeakSet` provenance
survives after a legitimate error is returned to the caller. If a later
database dependency throws that exact previously observed object, both
adapters treat the old identity as current authority. Depending on the
captured error, the later dependency failure is misclassified as corruption,
passes an old control code such as `NOT_FOUND` or `CONFLICT`, or exposes the
same raw `TypeError` instance.

This verdict is limited to the SQLite STORE slice. It does not change the
accepted consumer core, integrate or promote this candidate, mark the full
`G/0/02` sheet complete, or claim Redis/service wiring, health projection,
PostgreSQL support, business-effect atomicity, or release readiness.

## Reviewer identity and execution profile

- Role: independent Trial 2 reviewer
- Requested model profile: **GPT-5.6 Sol**
- Requested reasoning profile: **ultra**
- Requested execution profile: **Priority/Fast**
- Review date: **2026-07-27**

No model, reasoning, or service-tier telemetry was exposed to this review.
The entries above record the requested profile; they are not invented runtime
measurements.

The review used no delegation, agents, subagents, worktrees, tmux, background
processes, services, Redis, MCP, KYA, or network access.

## Frozen identity and scope

- Branch: `feat/V5-G-0-02-store`
- Original STORE base:
  `0a5b6d9882f3599c4fa2bde53e3720ddfbde2a3b`
- Original base tree:
  `dabec4310f2c76803aea24895ba3194158bcef24`
- Trial 2 base / Trial 1 KO:
  `8fc8010d3ebf93aa3759f05faef6391a16fbe33a`
- Trial 2 base tree:
  `1db5d89fbb8466e3a72a0e0bdada17287c857e40`
- Trial 2 RED:
  `abb8ca6f1558923b3dcc40421c15900c3c461c86`
- Trial 2 RED tree:
  `e027163575dac51fba6d9db6b32697739766f8e6`
- Trial 2 technical candidate:
  `99cab71f6ce1ab7303f73bd853566873c93178ee`
- Trial 2 technical tree:
  `5c69126d79e205b5223d3360ee769e1bb13ad7af`
- Request-only review HEAD at intake:
  `8d94a088967f5a317b38b46c5acb1189c7cc0e30`
- Request tree:
  `59ca3ddab9a534feafed1195adb9ec4ddbb745aa`
- Exact Trial 2 technical range:
  `8fc8010d3ebf93aa3759f05faef6391a16fbe33a..99cab71f6ce1ab7303f73bd853566873c93178ee`
- Full reviewed STORE lineage:
  `0a5b6d9882f3599c4fa2bde53e3720ddfbde2a3b..8d94a088967f5a317b38b46c5acb1189c7cc0e30`
- Review worktree:
  `/tmp/agents-orchestrator-v5-g002-store.8d906A/worktree`

Parentage is exact and linear. Trial 2 RED is the direct child of the Trial 1
KO, the technical candidate is the direct child of RED, and the Trial 2
request is the direct child of the technical candidate.

The Trial 2 technical range contains exactly **2 commits / 3 files / 1,094
insertions / 65 deletions**:

```text
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
gateway/src/core/sqlite_quarantine_store.js
tests/gateway/coordination_consumer_sqlite_repo.test.js
```

The RED commit changes only the repository test. The GREEN commit changes
only the two adapters. The exact RED test blobs remain unchanged at GREEN:

- repository test:
  `af1c21febea52ae4ce78d0a41b1febf4fc580ebf`
- integration test:
  `296f8f5524c3e315aa36b9e26f62f92134b234f4`

The full reviewed lineage from the original STORE base through the request is
exactly **8 commits / 9 files / 6,117 insertions**. It includes the original
ADR, migration, two adapters, two directed test files, Trial 1 request and KO,
and Trial 2 request. Source review covered that complete lineage rather than
treating either request as authority.

There is no Trial 2 technical change to the migration, ADR, SQLite integration
test, accepted consumer, in-memory repository, `state.js`, packages, locks,
configuration, catalog, services, Redis, MCP, health, workflows, or shared
plan sheets.

## Finding

### P1-1 — Emitted errors retain reusable cross-operation authority

The attempted boundary hardening uses module-global identity sets:

- repository provenance sets at
  `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:30-32`;
- repository error creation/branding at `:51-93` and operation-error branding
  at `:134-141`;
- repository public/database-zone catches at `:849-882`;
- vault provenance sets at
  `gateway/src/core/sqlite_quarantine_store.js:5-6`;
- vault error creation/branding at `:23-54`; and
- vault public/database-zone catches at `:182-215`.

Fresh exported error instances are correctly untrusted: the exported
constructors do not add their instances to the private sets, and the directed
forgery tests at
`tests/gateway/coordination_consumer_sqlite_repo.test.js:1622-1630` pass.
That does not close the identity boundary. A legitimate error added by the
module remains in its `WeakSet` after `safely()` returns it to the caller.
Possession of that emitted object is therefore a durable capability that can
be replayed through a later dependency call.

#### Independent exact-instance probe

The probe first captured a legitimate error from one public call, then made a
functional injected database throw that same object in a later public call.
No constructor forgery or private-set access was used.

Observed:

```json
[
  {
    "adapter": "repository validation TypeError",
    "dependencyResult": "COORDINATION_CONSUMER_STORE_CORRUPT",
    "expected": "COORDINATION_CONSUMER_STORE_FAILED",
    "sameInstance": false
  },
  {
    "adapter": "vault validation TypeError",
    "dependencyResult": "COORDINATION_QUARANTINE_VAULT_CORRUPT",
    "expected": "COORDINATION_QUARANTINE_VAULT_FAILED",
    "sameInstance": false
  },
  {
    "adapter": "repository safeExpiry TypeError",
    "dependencyResult": "raw TypeError: claim expiry exceeds the safe integer range",
    "expected": "COORDINATION_CONSUMER_STORE_FAILED",
    "sameInstance": true
  },
  {
    "adapter": "repository NOT_FOUND control error",
    "dependencyResult": "COORDINATION_CONSUMER_RECEIPT_NOT_FOUND",
    "expected": "COORDINATION_CONSUMER_STORE_FAILED",
    "sameInstance": true
  },
  {
    "adapter": "vault CONFLICT control error",
    "dependencyResult": "COORDINATION_QUARANTINE_VAULT_CONFLICT",
    "expected": "COORDINATION_QUARANTINE_VAULT_FAILED",
    "sameInstance": true
  }
]
```

The first two cases show that a previously emitted input-validation identity
is mistaken for current decoder validation and converted to `*_CORRUPT`.
The remaining cases are more direct: an old operation or static control error
crosses the later database boundary unchanged. The repository `NOT_FOUND`
probe returned the same object with the fixed not-found code and message even
though the actual later failure came from `database.prepare()`.

The behavior is externally observable despite the sets themselves being
module-private. It also lets a caller mutate a once-legitimate error and replay
that trusted identity, bypassing the protection demonstrated by the fresh
constructor-forgery tests. Old `NOT_FOUND`, `NOT_OWNED`, `CONFLICT`, or raw
`TypeError` signals may drive a caller down the wrong control branch instead of
the fail-safe infrastructure branch.

No body or secret leak was observed in these specific probes because the
captured built-in messages are static. The finding is nevertheless blocking:
the adapter boundary promises that every untrusted database/dependency
exception becomes the fixed `*_FAILED` error, independent of object identity
history.

Required correction:

1. Make error provenance operation-local and phase-aware rather than
   module-global reusable authority.
2. Preserve caller-validation and winning-expiry `TypeError` values only in
   the public call that created them.
3. Preserve current-operation static control/corruption errors only while they
   traverse that same call.
4. Treat every exception originating from a later database/dependency zone as
   untrusted, even if it is the exact object emitted by an earlier operation.
5. Revoke or consume any identity provenance before an error crosses the
   public boundary. An operation-local set/context is preferable; deleting
   global membership before exposure would at minimum need equivalent
   reentrancy and phase tests.
6. Add repository and vault regressions that capture each legitimate category
   and inject the same object later. Assert `*_FAILED`, a fresh result object,
   static messages, and no old code/message/canary. Keep the existing fresh
   constructor-forgery and closed-real-SQLite cases.

## Trial 1 finding disposition

### P1-1 expiry derivation — closed

The SQLite adapter now derives expiry only on a serialized branch that will
install or extend a lease:

- new and stale processing claims at
  `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:913-1013`;
- blocked-quarantine recovery after committed/blocked/busy decisions at
  `:1086-1132`;
- owned attempt extension at `:1177-1186`; and
- replay after not-found/duplicate/conflict/busy decisions at `:1524-1570`.

Each winning calculation precedes its first write. The ten non-winning
overflow cases preserve in-memory/SQLite status and projection parity
(`tests/gateway/coordination_consumer_sqlite_repo.test.js:927-1064`).
The five winning overflow transitions leave the complete durable table
snapshot unchanged (`:1066-1181`).

The exact Trial 2 RED reproduced these failures; GREEN passes them. No expiry
finding remains.

### P1-2 exhaustive state decoding — closed

Stored `metadata_malformed` is accepted only for the exact raw values
`NULL`, `0`, and `1`
(`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:267-294`).
Lease, effect, quarantine, delivery/ACK, recovery, replay, and per-receipt
state invariants are decoded at `:304-724`.

The directed corruption matrix at
`tests/gateway/coordination_consumer_sqlite_repo.test.js:1209-1521` rejects
impossible recognized states and invalid stored metadata booleans with the
fixed corruption error. An independent probe also built, serialized, reopened,
and decoded **17** legal lineages:

- processing;
- effect pending, acknowledging, and completed;
- initial blocked, recovery-leased blocked, and reblocked recovery;
- quarantine pending and acknowledging;
- quarantine replay-processing;
- completed quarantine;
- replay-processing after a completed quarantine;
- failed replay before and after ACK;
- replay committed before and after ACK; and
- completed replay-commit after ACK.

All 17 reopened without false corruption. No decoder finding remains.

### P1-3 ordinary adapter error mapping — partially closed

The following directed cases now pass:

- caller input `TypeError` values remain exact even after the real database is
  closed (`tests/gateway/coordination_consumer_sqlite_repo.test.js:1523-1560`);
- real closed SQLite and missing-schema failures map to fixed adapter failures
  (`:1590-1611`);
- a fresh hostile dependency `TypeError` maps to the fixed failure
  (`:1613-1620`); and
- freshly constructed exported adapter errors are not trusted
  (`:1622-1630`).

The persistent-identity case in P1-1 above leaves this boundary finding open.

## Verified behavior outside the finding

### Repository port, transactions, and fencing

The accepted consumer requires exactly 13 repository operations at
`gateway/src/core/coordination_consumer.js:376-394`. All 13 are implemented;
the SQLite adapter additionally exposes `getReceipt()` for durable
introspection.

Every mutating repository operation runs through
`database.transaction(action).immediate()`
(`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:864-873`).
`getQuarantine()` and the additional `getReceipt()` use one deferred
transactional snapshot (`:875-883`). Vault `put()` is immediate and vault
`get()` is deferred
(`gateway/src/core/sqlite_quarantine_store.js:196-215`).

Source inspection and the directed tests confirm:

- exact owner plus claim-token fencing;
- monotonic claim and replay epochs even when the replacement reuses the same
  owner ID;
- one winner across two real SQLite connections;
- stale attempt, effect, quarantine, block, release, replay-commit, and
  replay-failure paths leave the snapshot unchanged;
- blocked recovery membership, capacity, append, epoch, and lease are one
  immediate transaction; and
- private recovery history survives reopen and is absent from public
  projections.

### Crash, reopen, ACK-only, and replay

The unchanged real-consumer integration file covers:

- durable idempotent effect convergence after effect-before-receipt crash
  (`tests/gateway/coordination_consumer_sqlite_integration.test.js:175-256`);
- effect receipt before ACK and ACK-only redelivery (`:258-322`);
- quarantine receipt/body before ACK and ACK-only redelivery (`:324-393`);
- malformed envelope with absent body (`:395-431`);
- dangling vault write convergence (`:433-505`);
- private one-shot blocked recovery across restarts (`:507-628`); and
- authorized replay persistence/deduplication (`:630-720`).

### Vault, descriptor, and migration

The vault preserves exact absent-body versus empty-string semantics, stable
byte-idempotent locators, exact-locator lookup, reopen durability, and static
conflict/corruption errors
(`tests/gateway/coordination_consumer_sqlite_repo.test.js:1667-1782`).

The repository descriptor remains exactly durable SQLite, body-free at the
repository boundary, and explicitly
`atomicWithBusinessEffect: false`
(`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:34-41`).

An independent double-application migration probe produced:

```json
{
  "coordinationTables": 6,
  "migrationRows": 1,
  "appliedAtUnchanged": true,
  "schemaUnchanged": true,
  "foreignKeyViolations": 0,
  "integrity": "ok",
  "receiptHasBodyLocatorJson": false
}
```

A real lock-matched `better-sqlite3` database with no synthetic `backend`
property was accepted by both factories and returned `null` for valid missing
repository/vault lookups. This is not a finding: the accepted ADR promises to
reject an **explicitly** non-SQLite backend
(`docs/adr/ADR-V5-G-0-02-coordination-consumer-store.md:41-43`), and the
factory checks at repository `:227-242` and vault `:114-129` implement that
boundary without requiring later WIRING configuration.

### Scope and leakage

- Public receipt schema/projections contain no body, locator, JSON, claim
  token, replay token, or recovery-history field.
- The exact added-line credential-signature scan over the full technical STORE
  lineage found **0** matches.
- `git diff --check` passed for both the Trial 2 technical range and the full
  technical STORE range.
- Trial 2 changed exactly the three declared paths.
- The worktree was clean at intake and had no test/cache/temp residue before
  this result was created.

## Independent verification

Runtime identity:

- Node **22.22.1**
- `better-sqlite3` **11.10.0**

The pre-existing dependency provider used for execution had the exact
candidate lock and ESLint-configuration hashes:

```text
gateway/package-lock.json
71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0

gateway/eslint.config.js
31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252
```

No install command or network access was used.

### Exact RED replay

An isolated `git archive` of
`abb8ca6f1558923b3dcc40421c15900c3c461c86` ran:

```text
NODE_PATH=<pre-existing lock-identical gateway/node_modules> \
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_sqlite_repo.test.js \
  tests/gateway/coordination_consumer_sqlite_integration.test.js
```

Result: **91 tests / 52 passed / 39 failed / 0 skipped**, exit **1**.
The archive was removed after the run. This independently confirms the exact
39 RED failures and 52 already-green guards.

### GREEN

The same command at the technical candidate produced:

- **91 passed / 0 failed / 0 skipped**
- exit **0**

The exact-instance error-reuse probe is not in the submitted suite and
reproduces P1-1 independently.

No aggregate npm suite, full CI, live/shared Redis, MCP, KYA, provider,
service, lifecycle, configuration, health, PostgreSQL, integration,
promotion, release, tmux, agent, subagent, or network command was run.

## Remaining dependency-gated scope and limitations

This remains the SQLite store/vault slice:

- the repository is durable but intentionally not atomic with an arbitrary
  business store;
- handlers remain responsible for durable `consumeKey` idempotency;
- the adapters are not wired into configuration, services, lifecycle, Redis,
  or health/inventory;
- no live Redis crash/reclaim or service restart is claimed;
- PostgreSQL parity remains deferred to Project V5 `I/0/05`;
- retention, quotas, and reaping remain outside this slice; and
- the full `G/0/02` acceptance and exit gates remain open.

## Final conclusion

**KO.** Expiry placement/rollback, exhaustive state decoding, metadata boolean
handling, SQLite durability, contention, fencing, ACK-only recovery, replay,
vault semantics, migration idempotence, and ordinary fresh dependency/error
mapping are substantiated. The public error boundary is still not closed:
module-global `WeakSet` membership turns every emitted legitimate error into a
reusable cross-operation capability. Trial 3 must make provenance
call-scoped/phase-separated and add exact-instance replay regressions for both
adapters before this slice can receive an independent OK.

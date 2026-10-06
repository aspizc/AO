# Independent Review Result — Project V5 G/0/02 STORE (Trial 4)

## Verdict

**OK** for technical candidate
`f95ce85be10942625c4ba238607ef58beba87787`.

- P0 findings: **0**
- P1 findings: **0**
- P2 findings: **2**

Trial 4 removes the mutable module-global provenance stacks rejected in Trial
3. Direct AST and call-graph inspection, rather than the submitted regular
expressions, confirms that each public operation creates one lexical
capability, passes that exact capability through every error factory,
validator, decoder, projection, ownership/change helper, and database zone,
and clears its local identity sets in `finally`.

No module-level or adapter-instance mutable error authority remains. There is
no `WeakSet`, `WeakMap`, current-scope lookup, stack, registry, symbol,
property/class/code brand, or equivalent semantic trust check. Previous,
foreign, nested, cross-instance, and later-operation error identities cannot
acquire current-call authority under the declared synchronous
`better-sqlite3` contract.

The two P2 findings are non-blocking:

1. the structural regression is naming/indentation-sensitive and is not an
   architectural proof; direct AST review closes the current gate; and
2. `safely()` relies on the explicitly synchronous transaction contract.
   A future thenable/asynchronous database facade would need an explicit
   thenable rejection or a capability lifetime that extends through
   settlement.

No Trial 5 is required for the submitted SQLite STORE slice. This verdict does
not integrate or promote the candidate, mark the full `G/0/02` sheet complete,
or claim Redis/service wiring, health projection, PostgreSQL support,
business-effect atomicity, or release readiness.

## Reviewer identity and execution profile

- Role: independent Trial 4 reviewer
- Requested model profile: **GPT-5.6 Sol**
- Requested reasoning profile: **ultra**
- Requested execution profile: **Priority/Fast**
- Review date: **2026-07-27**

No service-tier telemetry was exposed to this review, so Priority/Fast records
the requested profile and is not a claimed runtime measurement.

The review used no delegation, agents, subagents, tmux, background process,
service, Redis, MCP, KYA, install, network access, or shared development
instance.

## Frozen identity and scope

- Branch: `feat/V5-G-0-02-store`
- Exact Trial 4 base / Trial 3 KO:
  `d7b679606adce41f706c105ad5a71cea0d0e8ce1`
- Base tree:
  `08599f1da7074fc9d472426ec94bbea8fc3bf50d`
- Trial 4 RED:
  `7244ea1151c84d9914b682617d7fab945a9b7292`
- RED tree:
  `4ffae31c2c7ad21a18cf8d306dc9bcfc42778bfc`
- Trial 4 technical candidate:
  `f95ce85be10942625c4ba238607ef58beba87787`
- Technical tree:
  `5a7f7b4ed5dea728fc5e1f9b2d979fe3da7caed9`
- Request-only HEAD at intake:
  `4bee2788691cebdd38b2733ddcb6e5c47492d7b7`
- Request tree:
  `08ffd0188f1f030cb20a06f4c1a868b140d0e5c9`
- Exact technical range:
  `d7b679606adce41f706c105ad5a71cea0d0e8ce1..f95ce85be10942625c4ba238607ef58beba87787`
- Review worktree:
  `/tmp/agents-orchestrator-v5-g002-store.8d906A/worktree`

Parentage is exact and linear. RED4 is the direct child of the Trial 3 result,
the technical candidate is the direct child of RED4, and the request is the
direct child of the technical candidate. The worktree was clean at intake.

The technical range contains exactly **2 commits / 3 files / 753 insertions /
353 deletions**:

```text
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
gateway/src/core/sqlite_quarantine_store.js
tests/gateway/coordination_consumer_sqlite_repo.test.js
```

RED4 changes only the repository test. GREEN4 changes only the two adapters.
The RED4 test blob is unchanged at GREEN4:

```text
d3da0bd25a3f855a14d16ed66c28e19104e161eb
```

The unchanged integration-test blob is:

```text
296f8f5524c3e315aa36b9e26f62f92134b234f4
```

Migration 002 and the ADR are unchanged throughout Trial 4:

```text
migration  1c2306c2b31c00eb905ef17745c35197d3049aab
ADR        4cf11b34333870a9b5674a8226246cb600653e2f
```

There is no technical-range change to the migration, ADR, integration test,
accepted consumer, in-memory repository, `state.js`, packages, locks,
configuration, catalog, services, Redis, MCP, health, workflows, or shared
plan sheets.

## P2 findings

### P2-1 — The source regex is useful defense in depth, not durable architectural coverage

The structural guard at
`tests/gateway/coordination_consumer_sqlite_repo.test.js:1795-1825` relies on:

- authority-related substrings in identifier names;
- declarations indented at exactly zero or two spaces; and
- a fixed list of collection and stack method spellings.

A renamed, differently indented, or indirectly accessed ambient registry can
therefore evade it. The behavioral additions also do not independently prove
the no-global rule: the exact RED4 replay passed the ten identity-reuse cases,
both synchronous reentrancy cases, and both two-instance cases. Only the two
structural tests failed at RED4.

This is not a P1 because direct AST/call-graph inspection of both submitted
adapters closes the current authority gate. A future hardening change should
replace or complement the regex with a parser-based invariant that:

1. enumerates module and factory-closure declarations independent of names and
   indentation;
2. rejects mutable provenance reachable outside one invocation;
3. verifies every public operation enters through a lexical capability; and
4. resolves each capability argument to that operation's exact lexical
   binding.

### P2-2 — The fail-closed lifetime is correct only under the declared synchronous transaction contract

Repository `safely()` returns `action(scope)` and clears all three local sets
in `finally`
(`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:905-947`);
the vault does the same for its two sets
(`gateway/src/core/sqlite_quarantine_store.js:188-217`).
Their database zones return the transaction result directly
(`sqlite_coordination_consumer_repo.js:950-969`;
`sqlite_quarantine_store.js:220-239`).

A deliberately nonconforming but structurally accepted database facade whose
transaction method returns a thenable and invokes the retained callback in a
microtask reproduces a fail-closed escape:

```json
{"kind":"repository","sameRawCanary":true,"name":"Error","message":"async-repository-raw-canary","code":null}
{"kind":"vault","sameRawCanary":true,"name":"Error","message":"async-vault-raw-canary","code":null}
```

That facade is outside this adapter's accepted contract. The ADR states that
every transition uses a synchronous SQLite transaction
(`docs/adr/ADR-V5-G-0-02-coordination-consumer-store.md:34-39`).
The lock-exact `better-sqlite3` 11.10.0 implementation invokes the callback
synchronously and explicitly rejects a Promise returned by it. An independent
runtime probe produced:

```json
{
  "version": "11.10.0",
  "order": ["callback", "returned"],
  "exactReturnIdentity": true,
  "thenable": false,
  "synchronousThrow": true
}
```

All submitted transaction callbacks are themselves synchronous and return
plain results. The reproduction is therefore future-proofing evidence, not a
current SQLite defect. Before accepting an asynchronous backend or refactoring
an action to return a Promise/thenable, the adapter should either reject
thenables while still inside `safely()` or retain and revoke the capability
only after settlement.

## Direct authority and call-graph audit

### Declarations and authority ownership

The repository's module declarations are limited to regular expressions,
closed-domain `Set` constants, a scalar maximum, the frozen descriptor, the
exported error class, and functions
(`sqlite_coordination_consumer_repo.js:1-48`). The four domain sets are never
mutated after initialization and are not error-authority collections.

The vault has only its regular expressions, frozen descriptor, exported error
class, and functions at module scope
(`sqlite_quarantine_store.js:1-21`).

AST inspection found none of these forms in either adapter:

```text
WeakSet / WeakMap
Symbol or symbol-keyed marker
module/factory-instance authority array, Set, Map, or stack
current-scope or top-of-stack lookup
instanceof trust decision
error code/name trust decision
authority/trust property write or read
Object.defineProperty / Reflect property brand
```

The exported classes and their `code` fields remain public error contracts,
but neither class identity nor code is used to decide provenance. Fixed
`*_FAILED` errors are freshly constructed without registration
(`sqlite_coordination_consumer_repo.js:62-67`;
`sqlite_quarantine_store.js:35-40`).

Each repository invocation allocates three local `Set` objects and one frozen
capability at `sqlite_coordination_consumer_repo.js:905-931`. Each vault
invocation allocates two local sets and one frozen capability at
`sqlite_quarantine_store.js:188-206`. The sets are cleared in the respective
`finally` blocks. The capability is not returned, stored on an adapter, stored
on an error, passed as a SQL value, or published through a module variable.

### Helper propagation

The AST enumerated **29** repository functions whose first parameter is
`scope`:

```text
storeError, corruptStore, notOwned, notFound, validationError,
plainObject, safeIdentifier, safeCode, safeInteger, safeExpiry,
consumeKey, deliveryId, metadata, storedMetadata, validateLease,
validateEffect, validateQuarantine, validateDeliveries,
validateRecoveryHistory, validateReplay, validateBundle,
completedOutcome, assertOwned, assertChanged, decodedReceipt,
publicReceipt, observeDelivery, write, read
```

It enumerated **11** equivalent vault functions:

```text
vaultError, corruptVault, conflictVault, validationError, plainObject,
consumeKey, locator, normalizeBody, decodeRow, write, read
```

Every call to those 40 functions supplies the lexical `scope` identifier as
argument zero. The AST found **zero** missing or substituted capability
arguments.

The nine decoder/invariant helpers named in the request are all covered:

```text
repository:
  storedMetadata, validateLease, validateEffect, validateQuarantine,
  validateDeliveries, validateRecoveryHistory, validateReplay,
  validateBundle
vault:
  decodeRow
```

`validateBundle()` threads the capability through every child decoder and
converts only identities registered as current validation errors into fixed
corruption (`sqlite_coordination_consumer_repo.js:559-628`). Foreign errors
are rethrown to the outer fixed-failure boundary. Vault `decodeRow()` applies
the same phase distinction at
`sqlite_quarantine_store.js:134-175`.

The AST classified every reference to `scope` as one of:

- a function or operation-callback parameter;
- the local frozen capability declaration inside `safely()`;
- argument zero to a scope-aware helper;
- the receiver of a capability method; or
- the one `action(scope)` entry call.

There is no assignment, property publication, return, or other capability
escape in the submitted call graph.

### All 16 public operations

All 14 repository operations enter through their own
`safely((scope) => ...)` call:

```text
claim, claimBlockedQuarantine, recordAttempt, commitEffect,
commitQuarantine, blockQuarantine, releaseClaim, prepareAck, commitAck,
getReceipt, getQuarantine, beginReplay, commitReplay, failReplay
```

Their entry sites are
`sqlite_coordination_consumer_repo.js:972-973`,
`:1166-1173`, `:1265-1272`, `:1312-1319`, `:1350-1359`,
`:1409-1416`, `:1454-1460`, `:1498-1503`, `:1554-1559`,
`:1601-1602`, `:1611-1612`, `:1646-1655`, `:1781-1789`, and
`:1852-1860`.

Both vault operations do the same at
`sqlite_quarantine_store.js:242-243` and `:293-294`.

Nested transaction callbacks close over only their operation's lexical
capability. Separate adapter instances allocate separate sets. A nested call
cannot change which set an outer callback consults because there is no ambient
selection step.

## Churn and semantic-diff audit

The GREEN4 adapter-only diff is:

```text
                                              added  removed
sqlite_coordination_consumer_repo.js             424      281
sqlite_quarantine_store.js                         76       72
total                                              500      353
```

With `--ignore-all-space` it is:

```text
                                              added  removed
sqlite_coordination_consumer_repo.js             424      281
sqlite_quarantine_store.js                         75       71
total                                              499      352
```

The large count is real parameter propagation, not a formatter pass, moved
state logic, or duplicated SQL. Full hunk review found:

- removal of both ambient stacks and their lookup/register helpers;
- local capability construction and cleanup;
- explicit capability parameters and arguments;
- the required distinction between current validation identities and foreign
  decoder/database throws; and
- multiline wrapping required by the additional argument.

No SQL statement, transition condition, public DTO, descriptor, migration,
effect/ACK/replay ordering, or fencing rule changed. There is one isolated
non-semantic indentation delta at
`gateway/src/core/sqlite_quarantine_store.js:301`; it accounts for the only
physical whitespace-only edit and does not explain or conceal the churn.

## Error-boundary verification

### Same-call behavior

An independent real-SQLite probe reconfirmed the exact same-call phase
contract:

```text
input validation
  TypeError / consumeKey must be canonical
winning safe expiry
  TypeError / claim expiry exceeds the safe integer range
missing receipt
  COORDINATION_CONSUMER_RECEIPT_NOT_FOUND
stale or wrong owner/token
  COORDINATION_CONSUMER_RECEIPT_NOT_OWNED
corrupt stored state
  COORDINATION_CONSUMER_STORE_CORRUPT
same-key/different-body vault write
  COORDINATION_QUARANTINE_VAULT_CONFLICT
missing replay source
  { "status": "not_found" }
```

The focal suite also preserves winning-expiry rollback with an unchanged
durable snapshot and all non-winning overflow outcomes.

### Later, foreign, nested, and cross-instance identities

All ten Trial 3 replay cases pass:

- repository and vault validation `TypeError`;
- repository winning safe-expiry `TypeError`;
- repository `NOT_FOUND`, `NOT_OWNED`, `CORRUPT`, and mapped `FAILED`;
- vault `CONFLICT`, `CORRUPT`, and mapped `FAILED`.

The four focused nesting tests pass for repository and vault synchronous
reentrancy plus two-instance callback throws. Previous inner-instance control
errors, nested validation errors, and later dependency replays all become a
fresh fixed failure when they are foreign to the current lexical capability.
Legitimate current-call control errors and control-result values remain exact
after cleanup.

An independent thrown-value matrix injected each of these through both
database boundaries:

- ordinary `Error`;
- `RangeError`;
- `AggregateError`;
- `DOMException` with `AbortError`;
- string;
- number;
- `null`;
- `undefined`; and
- frozen control-like object with code/context canaries.

Results:

```json
{"kind":"repository","cases":9,"correct":9,"fresh":9,"retainedThrownIdentity":0}
{"kind":"vault","cases":9,"correct":9,"fresh":9,"retainedThrownIdentity":0}
```

Every repository case became a fresh
`COORDINATION_CONSUMER_STORE_FAILED`; every vault case became a fresh
`COORDINATION_QUARANTINE_VAULT_FAILED`. No raw identity or canary survived.

## Durable-store, migration, and state-machine evidence

The 107-test focal suite reconfirms:

- exact differential projection against the in-memory port;
- immediate mutation transactions and deferred transactional reads;
- two-connection processing and replay winner election;
- exact owner plus monotonically replaced claim/replay-token fencing;
- stale attempt, effect, quarantine, block, release, replay-commit, and
  replay-failure rejection;
- bounded private recovery history across close/reopen;
- effect and quarantine receipt durability before ACK;
- ACK-only redelivery after reopen;
- dangling vault-write convergence;
- authorized replay persistence and later-command deduplication;
- non-winning safe-expiry parity and winning-expiry rollback;
- exhaustive recognized-state corruption rejection;
- exact stored metadata boolean decoding;
- body-free public receipt projection; and
- absent-body/empty-string, exact-byte, exact-locator, and vault-corruption
  contracts.

Applying the unchanged migration twice to one in-memory SQLite database
produced:

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

## Required verification

Runtime and lock identity:

- Node **22.22.1**
- `better-sqlite3` **11.10.0**
- ESLint **10.8.0**
- candidate/provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`
- candidate/provider ESLint configuration SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`

No install or network command was used. Dependencies came from a pre-existing
lock-identical provider.

### Exact RED4 replay

An isolated `git archive` of
`7244ea1151c84d9914b682617d7fab945a9b7292` ran the two directed SQLite
files:

- **107 tests / 105 passed / 2 failed / 0 skipped**
- exit **1**
- the failures were exactly the repository and vault structural provenance
  guards
- all 103 inherited tests and both new two-instance behavioral tests passed

The active archive path was removed after the run; no worktree or `/tmp`
archive residue remains.

### GREEN4 focal

```text
node --test --test-concurrency=1
  tests/gateway/coordination_consumer_sqlite_repo.test.js
  tests/gateway/coordination_consumer_sqlite_integration.test.js
```

Result: **107 passed / 0 failed / 0 skipped**, exit **0**.

### Focused nesting and two-instance matrix

```text
--test-name-pattern='synchronous .* reentrancy|two .* instances'
```

Result: **4 passed / 0 failed / 0 skipped**, exit **0**.

### Accepted consumer and queue/service regression

The accepted consumer plus unchanged queue/service receive and ACK contracts
ran with an in-memory loader resolving bare packages from the lock-identical
dependency provider:

- **77 passed / 0 failed / 0 skipped**
- exit **0**

The loader was a `data:` URL and created no file. No Redis instance or service
was started or consulted.

### Lock-exact ESLint

ESLint covered both adapters and both directed SQLite test files with
`--max-warnings=0`:

- **0 errors**
- **0 warnings**
- exit **0**

### Structure

```text
PYTHONDONTWRITEBYTECODE=1 pytest -p no:cacheprovider
  tests/structure/test_project_layout.py
  tests/structure/test_v5_coordination_docs.py
```

Result: **11 passed / 0 failed**, with Python **3.14.4** and pytest **9.0.3**.
Bytecode and pytest cache writes were disabled.

### Integrity and residue

- `git diff --check` passed for the exact technical range.
- `git diff --check` passed from the technical candidate to the request.
- The exact RED4 and GREEN4 repository-test blobs match.
- Migration 002 and the ADR are byte-identical across the Trial 4 range.
- No test, cache, loader, database, or active temporary archive residue
  remained before this result was written.

No aggregate npm suite, full CI, live/shared Redis, MCP, KYA, provider
execution, service, lifecycle, configuration, health, PostgreSQL,
integration, promotion, release, tmux, agent, subagent, install, or network
command was run.

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

**OK.** Trial 4 replaces ambient provenance selection with genuinely lexical,
per-invocation capabilities and preserves the complete SQLite durability,
fencing, reopen, rollback, ACK, replay, corruption, and fail-closed behavior.
The structural-regression weakness and synchronous-lifetime assumption are
documented P2 hardening items; neither is a defect under the directly
inspected call graph and the declared lock-exact `better-sqlite3` contract.

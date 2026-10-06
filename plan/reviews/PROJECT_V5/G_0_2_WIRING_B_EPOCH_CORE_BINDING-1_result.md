# Independent Review Result — Project V5 G/0/02 WIRING-B EPOCH-CORE STORE-BINDING (Trial 1)

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 3 |
| P2 | 2 |

The candidate has a sound narrow shape in several important respects. The
actual Lua uses string decimal arithmetic through `Number.MAX_SAFE_INTEGER`,
the normal allocation/bind/read path is atomic and persistent in a real
isolated Redis, SQLite receives the exact six-migration profile and one
main-qualified tuple before bind, the intended lost-reply cases converge, and
the new export remains private to the test-profile module.

It cannot be accepted as the STORE-BINDING foundation. A known counter
rollback mutates lower permanent reservation state and can be retried through
old keys until allocation succeeds. `dispose()` can race both binding and
admission and still allow a successful result backed by a closed database.
The committed fake does not execute or otherwise constrain the submitted Lua:
a deliberately broken reservation-write mutant retained the marker and all
29 tests stayed green. Additionally, dependency/caller getters escape the
closed error taxonomy, and the Lua programs do not enforce their exact
KEYS/ARGV arity.

This result covers only the private test-profile STORE-BINDING foundation. It
does not approve epoch bootstrap, runtime, transport, recovery, the remainder
of G/0/02, integration, production support, promotion, or release.

## Reviewer identity, session, and independence

- Reviewer role: fresh independent implementation reviewer; the reviewer did
  not author the candidate or request and used no delegated or second-model
  verdict.
- Agent/model profile: Codex `gpt-5.6-sol`, reasoning effort `max`, service
  tier `priority`, selected by explicit operator override.
- Orchestration trace: `tr-d2004f44-5a9b-413c-ac`, as encoded in the supervised
  session name.
- Session: `ag-tr-d2004f44-5a9b-413c-ac-codex-reviewer`, pane `0.0`.
- Codex thread: `019fc8ea-5cdf-7022-9cf2-e55749840beb`.
- Review branch: `review/V5-G-0-02-epoch-core-binding-t1-sol`.
- Independence disclosure: this is a distinct-session procedural review, but
  it is same-vendor Codex review of Codex-authored work. It is not cross-vendor
  diversity and makes no claim equivalent to the repository's supported
  Codex/Claude pairing.

## Material read before adjudication

The reviewer read the following completely before deciding the verdict:

- `AGENTS.md`, `.claude/orchestration-profile.md`,
  `.codex/skills/ao-build-orchestration/SKILL.md`, and
  `.codex/skills/tdd-implementation/SKILL.md`;
- `plan/README.md`, `plan/PROJECT_V5/G/README.md`, and
  `plan/PROJECT_V5/G/0/02.md`;
- both complete G/0/02 store-identity and durable-epoch designs, including
  durable-epoch sections 1.2, 2.1-2.3, 10, 12, and 13;
- WIRING-B Design Trial 6 request and accepted result;
- EPOCH-CORE/MIGRATIONS Trials 1-2 requests/results and the intervening
  operator clarification;
- this Trial 1 request;
- migration `005`, migration-set/state implementations and tests;
- WIRING-A profile, provision, repository binding, owner, lineage, and runtime
  implementations and their affected tests; and
- all candidate source/test files, every immediate caller, and the shared
  utilities reached by the new factory.

The three submitted Lua programs were reasoned through as executable Redis
programs and then executed against an isolated Redis. The handoff, its totals,
the fake, and the accepted design were treated as untrusted leads.

## Authenticated Git objects and range

All identities below were read from Git, not copied as authority from the
request.

| Object | Commit | Tree | Sole parent | Exact subject |
|---|---|---|---|---|
| reviewed baseline | `f904a2884f19fe5a9aafa9af58b3070a0b29059c` | `ac582da210e0f2ac722a4c6b6077090d1310eb60` | `485a499c78c8df304ffff07a6c745751b831758e` | `review(v5): approve G/0/02 EPOCH-CORE migrations Trial 2` |
| RED | `788da671ab3007f468bb571ba0eb30d7245b79a4` | `0b795e475d6ff8259fbe7ec5755c6385f4a3bdc9` | baseline | `test(v5): expose G_0_2 epoch store binding gaps` |
| GREEN | `727d4b11723cbd5acacf5e7c026a92171446e2d1` | `365d2635d220b6880b49ff22728b079240accaeb` | RED | `feat(v5): bind durable epoch test store origins` |
| request | `38abe53dd1893b26afcf2a9d4373c07eaa65d383` | `fd0e6f2252067f1795e1e509d5729a7bf706aa60` | GREEN | `docs(review): request G_0_2 epoch store binding Trial 1` |

The baseline's exact parent-to-baseline review-only path set was:

```text
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_MIGRATIONS-2_result.md
```

The exact RED path set was one added test:

```text
A tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

The exact GREEN path set was:

```text
A gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js
M gateway/src/core/coordination_consumer_runtime_test_profile.js
```

The exact request path set was:

```text
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-1_to_review.md
```

The RED test blob was byte-identical at RED, GREEN, and request:
`e90d9fcc4b5af2b64889c0c81ac2108745c247b7`. The request index change added
exactly one pending STORE-BINDING Trial 1 row.

The complete baseline-to-request path set was exactly these five paths:

```text
A gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js
M gateway/src/core/coordination_consumer_runtime_test_profile.js
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-1_to_review.md
A tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

There was no hidden migration, policy, dependency, lockfile, workflow, CI,
public-contract, production-profile, prior-trail, or unrelated change.
Baseline is an ancestor of RED. Before the result write, tracked status was
clean and only the disclosed untracked `gateway/node_modules` dependency link
was present.

## Findings

### P1-01 — rollback and hard collision are mutable/retryable rather than permanent

The allocation Lua derives `next_ordinal` from the possibly rolled-back
counter and mutates before the JavaScript high-water check
(`gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js:69-84,444-455`).
On any existing string binding key it also advances the counter before
returning `binding_collision` (line 79). The JavaScript checks
`highestObservedOrdinal` only after an `allocated` reply; the collision branch
returns first.

This contradicts durable-epoch section 2.2 and the request's own closed
taxonomy: counter rollback is `RECOVERY_REQUIRED`, a repeated/pre-existing key
is a hard `BINDING_COLLISION`, and neither condition is an online repair path.

The real Redis 8.8 Unix-socket probe reproduced two schedules:

```json
{
  "counterRollback": {
    "originalOrdinal": 1,
    "counterWasSetTo": "0",
    "firstResult": "BINDING_COLLISION",
    "counterAfterCollision": "1",
    "retryOrdinal": 2
  },
  "counterRollbackGap": {
    "originalOrdinal": 6,
    "counterWasSetTo": "4",
    "firstResult": "RECOVERY_REQUIRED_after_mutating_lower_reservation_5",
    "secondResult": "BINDING_COLLISION_and_counter_6",
    "thirdRetryOrdinal": 7
  }
}
```

The second schedule is the committed test's intended high-water shape. The
first failed call leaves a new permanent ordinal-5 reservation below the
already observed ordinal 6. The next call advances through binding 6, and the
third succeeds at 7. Likewise, separately seeded exact `reserved` and `bound`
ordinal-1 records each produced `BINDING_COLLISION`, advanced the counter, and
allowed retry at ordinal 2. Nothing latches the hard outcome.

Bounded next-trial correction:

- pass the profile's last observed ordinal into the allocation script and
  reject a lower counter before any Redis mutation;
- never advance the counter on a collision; the original allocation commit,
  not collision handling, owns counter advancement;
- latch a recovery/collision fault for the profile where the accepted design
  requires offline handling, while preserving the intentional lost-allocation
  orphan-and-greater-retry path; and
- add real-script REDs for both rollback schedules and for a retry after each
  exact-looking hard collision, asserting no counter or lower-key mutation.

### P1-02 — dispose races can publish a closed store or a false admission

`runRedis()` checks `disposed` only before awaiting the command
(`...epoch_store_binding_test_profile.js:418-429`). The bind path bypasses
`runRedis()` for its first command and likewise has no post-await activity
check (lines 492-515). `createStore()` publishes the capabilities immediately
after that await (lines 537-580), and `admitStore()` returns admitted after its
read await (lines 653-657). `dispose()` marks the profile disposed, closes all
databases, closes the Redis origin, and removes the root without coordinating
in-flight work (lines 660-668).

An independent deferred-command-port probe returned:

```json
{
  "disposeDuringBind": {
    "createReturnedAfterDispose": true,
    "returnedDatabaseOpen": false,
    "replayResult": "STORE_ORIGIN_MISMATCH"
  },
  "disposeDuringAdmission": {
    "returned": "admitted",
    "databaseOpenAtReturn": false
  }
}
```

The first case issues a new store capability after disposal for an already
closed database. The second reports successful admission after the exact
database it purported to admit has been closed. A non-racing capability replay
after disposal does reject, but that does not close the in-flight publication
window.

Bounded next-trial correction:

- establish an explicit in-flight lifecycle barrier or recheck the same
  profile generation synchronously after every awaited Redis result and before
  every capability/admission return;
- on disposal races, allow any already committed Redis record to remain as a
  safe permanent orphan, close the database once, perform no Redis cleanup,
  and return only a closed deterministic error; and
- add deferred allocate, bind, bind-readback, and admission-read REDs proving
  no post-dispose success or capability publication.

### P1-03 — the focused fake does not test the submitted Lua semantics

`FakeRedisBindingOrigin.sendCommand()` chooses behavior only by the script's
marker comment and then runs separate JavaScript implementations
(`tests/gateway/coordination_consumer_epoch_store_binding.test.js:52-218`). It
does not execute the Lua, does not constrain its commands to Redis's TYPE/PTTL
semantics, and can agree with behavior absent from the script.

I materialized the request tree in a disposable directory and changed only
the actual allocation Lua write, retaining its marker:

```diff
-redis.call('SET', binding_key, ARGV[3] .. next_ordinal .. ARGV[4])
+redis.call('SET', binding_key, 'deliberately-broken-reservation')
```

That mutation makes a real bind fail because the reservation bytes are wrong.
The committed focused suite nevertheless remained exactly 29/29 green, with
0 fail/cancelled/skipped/todo, in 476.308265 ms (0.58 s wall). This is a direct
mutation-survival result, not a textual suspicion.

Bounded next-trial correction:

- exercise all three submitted scripts in a disposable isolated Redis lane,
  or use another harness whose verdict is causally tied to executing those
  exact script bytes;
- retain deterministic command-port tests for JS-only failure timing, but do
  not credit them as Lua semantics evidence; and
- require independent mutants of authority/PTTL checks, counter validation,
  decimal increment, reservation write, bind transition, readback, collision,
  and arity to turn the appropriate test red.

### P2-01 — caller/dependency getters escape the closed taxonomy

Reply-shape inspection occurs outside the Redis rejection catch
(`...epoch_store_binding_test_profile.js:263-269,431-450,492-515,483-490`).
Admission destructures the caller object directly (lines 587-593), invoking
accessors before any boundary error can be selected. SQLite tuple insertion
also rethrows raw dependency errors (lines 517-535,537-584).

The independent probe observed:

```json
{
  "poisonedAllocationReply": {"rawMessage":"poisoned allocation reply getter","code":null},
  "poisonedBindReply": {"rawMessage":"poisoned bind reply getter","code":null},
  "poisonedReadReply": {"rawMessage":"poisoned read reply getter","code":null},
  "callerProxy": {"rawMessage":"caller-controlled input getter","code":null},
  "accessorEnvelope": {"result":"admitted","getterCalls":5},
  "nonPlainPrototypeEnvelope": "admitted",
  "sqliteInsertFailure": {
    "rawMessage":"injected SQLite tuple insert failure",
    "code":null,
    "bindCallsBeforeFailure":0,
    "failedDatabaseClosed":true,
    "retryOrdinal":2,
    "retryMigrationRows":6
  }
}
```

No proxy, getter, prototype, identifier, record bytes, or copied value could
forge the WeakMap capabilities without the genuine references; that authority
property remains intact. The defect is error timing and closed classification:
untrusted getters run and raw exceptions escape. The insert-failure ordering
is otherwise safe: allocation happened first, bind did not run, the database
closed, and retry used the greater ordinal.

Bounded next-trial correction:

- accept only an exact plain own-data-property admission envelope, inspect
  descriptors without invoking accessors, and map proxy/descriptor failures to
  the appropriate closed mismatch;
- normalize a bounded Redis reply inside the same catch that owns the command,
  before reading `length` or elements; and
- preserve recognized migration/binding codes while mapping unknown SQLite
  initialization errors to one documented closed outcome after close.

### P2-02 — the Lua programs accept surplus arguments

The internal calls are currently exact: allocation sends 2 KEYS/5 ARGV, bind
sends 3/5, and read sends 3/4
(`...epoch_store_binding_test_profile.js:431-480,492-509`). None of the three
scripts checks `#KEYS` or `#ARGV` before reading its positions (lines 17-183).

Using the captured real allocation script and exact keys, an isolated EVAL
with one extra ARGV returned `['allocated','1']` and mutated the counter to
`'1'`. Thus exact arity is a property of this caller today, not of the atomic
command being adjudicated.

Bounded next-trial correction: make the first executable guard in each script
require its exact KEYS and ARGV counts and return `recovery_required` without
reads or writes otherwise; add missing and surplus arity probes against the
actual Lua.

## Positive source and boundary adjudication

### Lua and Redis behavior that was independently supported

- IDs are restricted to 1-128 safe characters, bounding derived keys and
  canonical authority/binding records.
- Authority is required to be an exact persistent Redis string. Counter input
  is absent or a persistent canonical decimal no longer than the max-safe
  decimal. Bind/read require exact persistent string records and a counter not
  below the named ordinal.
- Decimal increment is performed digit-by-digit as a string in Lua. JavaScript
  conversion occurs only after a canonical decimal is bounded to
  `9007199254740991`. Real Redis allocated ordinal
  `9007199254740991` from `9007199254740990`; the next operation returned
  `RECOVERY_REQUIRED` without wrap.
- Ordinal choice and binding-key derivation are server-side. The caller cannot
  propose an ordinal.
- Each Redis transition is one EVAL. Normal writes are plain `SET` with no TTL.
  Real readback showed string/string/string and PTTL `-1/-1/-1` for authority,
  counter, and bound record.
- No candidate Redis path contains DEL, UNLINK, expiry-setting, decrement, or
  TTL-bearing replacement. `dispose()` removes only the disposable SQLite root
  and closes the origin; it issues no Redis cleanup.
- Wrong authority/counter/binding types, expiring authority/counter/binding
  values, malformed/unsafe/overflow counters, and malformed/wrong-type bound
  records returned `RECOVERY_REQUIRED` in the real probe.
- Lost allocation reply left exact ordinal 1 `reserved`; retry initialized
  ordinal 2. Lost bind reply converged through exact bound readback only for
  that initialized origin. Definite pre-bind failure left ordinal 1 reserved,
  closed the SQLite origin, and retry initialized ordinal 2.
- Twelve concurrent real-Redis creates allocated each ordinal 1-12 exactly
  once and all twelve later admissions succeeded.

### SQLite ordering and sealing

Source order is allocation, store creation, exact selected migrations, one
`transaction().immediate()` tuple insert, captured schema version, and only
then Redis bind (`...epoch_store_binding_test_profile.js:537-580`). The
independent insert-failure probe observed zero bind calls, a closed failed
database, and retry ordinal 2. The successful retry had exactly six main
migration ledger rows and one immutable bound tuple.

The focused suite independently exercised and passed main qualification,
TEMP/attached lookalikes, changed main schema, outside-set ledger rows,
missing/extra/malformed tuple state, valid-looking tuple changes, second
handles, reopened/copied files, copied Redis planes, foreign issuers, and
wrong-state/readback cases. Inspection confirms admission re-runs the exact
fixed migration set, requires unchanged `main.schema_version`, selects the
main table explicitly, admits exactly one canonical row, and compares every
tuple field before the exact bound Redis read. There is no fresh-origin adopt,
reserved-to-new-origin, cleanup, move, or caller-supplied ordinal API.

### Capability and surface reachability

The profile exposes only:

```json
["createStore","admitStore","redisAuthorityNamespaceCapability","dispose"]
```

The returned store exposes the intentionally caller-owned database plus four
opaque capabilities/origins. Store and Redis capabilities are frozen empty
objects backed only by module-private WeakMaps. The raw command port is held
only in a private record and was not reachable from the profile, store
capabilities, admitted result, errors, module exports, or WIRING-A objects.

A foreign issuer could not admit a genuine first-profile store; replacing any
capability with an empty lookalike failed. Spreading the returned envelope and
retaining its exact original capabilities remained admitted, which preserves
rather than forges authority. IDs, canonical record bytes, copied database
handles/files, another namespace/plane, prototypes, or a second issuer did not
manufacture WeakMap membership.

The only production-tree references to the new symbol are its definition and
the four-line re-export at
`gateway/src/core/coordination_consumer_runtime_test_profile.js:37-39`; the
focused test is its only caller. There is no service, tool, MCP, public
coordination, production profile, auto-start, or runtime consumer. The
existing WIRING-A factory body and return shape are unchanged, and its affected
runtime/ownership aggregate remained green.

## Semantic RED and verification evidence

### Independently materialized RED

The exact RED Git object was archived to
`/tmp/g002-binding-red-review.AMUnCI`; only the disclosed dependency symlink was
added. The exact command was:

```text
node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

Result: exit 1; exactly 29 tests, 1 pass, 28 fail, 0 cancelled, 0 skipped,
0 todo; Node duration 151.926209 ms; tool wall 0.156257281 s. All dependencies
loaded. The one pass proved WIRING-A lacked the epoch capability; all 28
failures were semantic assertions that the named foundation factory was
missing. This is a valid RED, not a dependency or syntax failure.

### GREEN and affected aggregate

| Exact command | Independent result |
|---|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_store_binding.test.js` | exit 0; exactly 29/29 pass; 0 fail/cancelled/skipped/todo; 628.611129 ms Node; 0.611547722 s tool wall |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js tests/gateway/coordination_consumer_runtime.test.js tests/gateway/coordination_consumer_store_ownership.test.js` | exit 0; exactly 76/76 pass; 0 fail/cancelled/skipped/todo; 14604.264503 ms Node; 14.615454181 s tool wall |

The handoff's coder totals were not credited; the table contains the
reviewer's independent runs.

### Static gates and guards

| Gate | Result |
|---|---|
| `node --check` on the candidate source, runtime test profile, and focused test | all exit 0; no Node diagnostics; tool walls 0.008484782 s, 0.046673644 s, and 0.033531041 s |
| repository-local ESLint 10.8.0 with `--no-cache --config gateway/eslint.config.js` on the same three files | exit 0; 0 diagnostics; 0.271427419 s tool wall |
| `git diff --check` baseline-to-GREEN and baseline-to-request | both exit 0; no output |
| RED/GREEN/request test-blob comparison | all exactly `e90d9fcc4b5af2b64889c0c81ac2108745c247b7` |
| commit/tree/parent/subject/path-set checks | exact identities and path sets recorded above; ancestry exit 0 |
| protected path guard | no migration, policy, dependency, lockfile, workflow, CI, public contract, production profile, prior evidence, or unrelated path |
| Redis deletion/expiry/decrement source scan | `rg` exit 1 as expected; no forbidden mutation match |
| initial tracked status | clean; only `?? gateway/node_modules` |

Node was `v22.22.1`; Redis was isolated Redis `8.8.0` on a private Unix socket
under `/tmp`, with TCP disabled, persistence disabled, and no shared Redis
touched. The substantive real-Redis probe exited 0 in 0.802547703 s tool wall.
The lifecycle/error command-port probe exited 0 in 0.28 s wall.

### Discarded diagnostic variance, reported explicitly

One early parallel tool launch made the aggregate reporter expose only three
file-level suites; it exited 0 in 14509.373342 ms but was not credited as
76-test evidence. Direct per-file runs then exposed 19/19, 19/19, and 38/38
with Node durations 189.721052, 257.557709, and 13635.114676 ms. Finally, the
required exact aggregate command was rerun alone and produced the credited
76/76 result above.

Two exploratory invocations added
`--experimental-test-isolation=none`. They were not the required command and
both exited 1 at 73/76 (6564.755952 and 6472.046193 ms): the three tests that
fork ownership workers inherited the parent test-runner argv and their workers
exited 1. One run was repeated outside the sandbox and failed identically.
This diagnostic option was discarded; the exact required isolated command and
the direct per-file executions both passed 76/76. No red or partial lane is
being summarized as green.

Some sandboxed shell calls emitted environment-level
`Failed to create stream fd: Operation not permitted` lines. Those messages
were absent from the final exact focused/aggregate results and are not treated
as product diagnostics.

## Lanes not run and limitations

- The full `bash scripts/ci.sh` repository gate was not run. Its unexecuted
  Node, Python, packaging, and other lanes are not inferred from the focused
  evidence.
- No live PostgreSQL, Docker composition, Gateway/MCP dry run, networked/shared
  Redis, production profile, deployment, promotion, release, or tag/main
  identity lane was run.
- Redis 8.8 was the safely available isolated executable; no Redis 7 matrix or
  cross-version compatibility claim is made.
- The disposable probes exercised actual Redis atomicity within one server and
  process/concurrent Promise schedules. They do not prove crash durability
  across Redis persistence/restart, replication/failover, or forbidden online
  snapshot restore.
- Perfectly indistinguishable concurrently writable clones remain outside the
  accepted section-1.2 non-cloning premise. Distinguishable copied handles,
  files, Redis capabilities, namespaces, and planes were exercised and
  rejected.
- This is review evidence only. No candidate source/test/plan, prior immutable
  evidence, policy, dependency, workflow, or CI file was modified.

## Required Trial 2 scope

A bounded correction trial should address only the five findings:

1. make rollback/collision outcomes non-mutating and non-retryable online while
   preserving the intentional lost-allocation greater-ordinal retry;
2. close every post-dispose publication/admission race;
3. execute and mutation-protect the actual Lua in the committed tests;
4. close getter/proxy/dependency error timing and classification; and
5. enforce exact Lua KEYS/ARGV arity before any read or mutation.

Trial 2 must preserve the positive properties independently established here:
string-safe max arithmetic, exact persistent bytes/PTTL, server-only ordinals,
atomic EVAL transitions, allocation-before-SQLite ordering, exact six-entry
main admission, no Redis cleanup/decrement/reuse, opaque WeakMap authority, and
the private test-only export boundary.

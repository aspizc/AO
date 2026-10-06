# Independent Review Result — Project V5 G/0/02 WIRING-B EPOCH-CORE STORE-BINDING (Trial 2)

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 2 |
| P2 | 0 |

The correction closes most of Trial 1's implementation defects. Corrected
RED is authentic and semantic, GREEN and the affected suites pass, all three
submitted Lua programs enforce exact arity before Redis work, rollback and
collision are non-mutating in the current source, disposal publication
windows close, and descriptor/capability/schema boundaries fail closed.

The candidate is not acceptable yet. A committed bind followed by a lost bind
reply and a second lost exact-readback reply returns `RECOVERY_REQUIRED`, but
does not latch it: the next `createStore()` performs more Redis work and
successfully allocates ordinal 2 while ordinal 1 remains permanently `bound`.
That contradicts the request's terminal-fault claim and its sole documented
lost-allocation retry exception. Separately, deleting the bind authority-PTTL
guard, read authority-PTTL guard, or exact bound-record equality guard leaves
the committed focused suite 49/49 green. The current predicates work, but the
mandatory TDD/mutation evidence does not protect them.

This result adjudicates only the private test-profile STORE-BINDING slice. It
does not approve or claim the remaining epoch state machine, runtime,
transport, recovery, G/0/02 completion, integration, promotion, rollout,
support, or release.

## Reviewer identity and independence

- Role: fresh independent implementation reviewer; this session authored no
  candidate code, test, request, or prior result and used no subagent verdict.
- Agent/model: Codex `gpt-5.6-sol`, reasoning effort `max`, service tier
  `priority`, as required by the operator brief.
- Trace: `tr-tr-v5-g002-binding-t2-so-8c839cda-c4df-4bb7-84c4-1dfe26561d0f`.
- Task: `ts-a98a752a-6183-414d-969e-9bfdbcdfa15c`.
- Authenticated review brief:
  `art-40948ede-ea24-4ad1-bbf5-e67d1bab4257`, kind `review-brief`, internal,
  produced by `codex-orchestrator` for the same trace.
- Review branch: `review/V5-G-0-02-binding-t2-sol`.
- Process route: the operator records that canonical `agent.spawn` returned a
  generic `TOOL_ERROR` and created no tmux; this is the documented persistent
  supervised fallback for the same trace/task. This result makes no claim of
  a successful Gateway spawn or cross-vendor diversity.
- Independence boundary: fresh non-author Git/source/runtime derivation. This
  is same-vendor Codex review and is not equivalent to the profile's supported
  Codex/Claude pairing.

## Material read and one missing requested artifact

The reviewer read completely before ruling:

- `AGENTS.md`, `.claude/orchestration-profile.md`, and the complete
  `.codex/skills/ao-build-orchestration/SKILL.md`;
- `plan/README.md`, `plan/PROJECT_V5/G/README.md`, and
  `plan/PROJECT_V5/G/0/02.md`;
- both STORE-BINDING Trial 1 request/result artifacts and the complete amended
  Trial 2 request;
- durable-epoch section 2.2 and its authority, path-scope, test/mutation,
  rollout, and acceptance boundaries; the accepted WIRING-B Design Trial 6
  request/result; and the directly reached WIRING-A/migration profile code;
- the complete candidate source and focused test, immediate export/caller,
  migration-set helper, disposable-Redis helper, and affected tests.

The brief names `plan/PROJECT_V5/G/0/README.md`, but that path does not exist
at the candidate tree. `plan/PROJECT_V5/G/README.md` is the only G-stage
README. This is recorded as a review-input limitation, not silently replaced
with an invented contract and not attributed to this two-path technical
candidate.

## Independently authenticated Git custody

All values below were derived from Git objects rather than trusted from the
handoff.

| Object | Commit | Tree | Sole parent | Exact subject |
|---|---|---|---|---|
| Trial 1 KO | `507a9d9f83791ff3a0287b4c219b13834c6792dd` | `c6e3ddd374383ddf8228d3eac03c8c0099ad9a77` | `38abe53dd1893b26afcf2a9d4373c07eaa65d383` | `review(v5): reject G_0_2 epoch store binding Trial 1` |
| superseded RED, custody only | `2b4a0aac12d7ac10939ad5dac15230301ecb679b` | `8ed805f6f3bd4a99dcb4a20847cb58ac89bc176d` | Trial 1 KO | `test(v5): expose G_0_2 epoch store binding Trial 2 gaps` |
| corrected RED | `546107b22662595be89301e1061aaabe0813e0a6` | `59101120580de029008569703e929a2b00ca061b` | Trial 1 KO | `test(v5): expose G_0_2 epoch store binding Trial 2 gaps` |
| GREEN | `053e722ef8ae1fa6278ea86147568b055038c75f` | `2f2d2f663d5b5457e7f625232a42565565ca5c60` | corrected RED | `fix(v5): seal epoch store binding recovery boundaries` |
| original Trial 2 request | `40eb873fde626de9612667e05409286d7e847e44` | `59d4961bcd422863f06967eba13312d7bddea2cf` | GREEN | `docs(review): request G_0_2 epoch store binding Trial 2` |
| amended request / review HEAD | `401e8b19cbde2fe33feec3705bf074566954ab95` | `27ed75e43fd2618938a965f41b79a80d2541c8b3` | original request | `docs(review): correct G_0_2 epoch binding RED evidence` |

Each final-chain ancestry check exited 0. Superseded RED is a sibling of the
corrected RED, not an ancestor of GREEN, and receives no TDD credit.

Exact per-commit path sets were:

```text
507a9d9 (Trial 1 KO)
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-1_result.md

2b4a0aa (superseded RED, custody only)
M tests/gateway/coordination_consumer_epoch_store_binding.test.js

546107b (corrected RED)
M tests/gateway/coordination_consumer_epoch_store_binding.test.js

053e722 (GREEN)
M gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js

40eb873 (original request)
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-2_to_review.md

401e8b1 (evidence correction)
M plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-2_to_review.md
```

The Trial 1-KO-to-GREEN technical path set is exactly the source and focused
test. Original request-to-correction changes only the Trial 2 request by 64
insertions and 15 deletions. The original request appended exactly one
pending Trial 2 row; the correction did not change the index.

Blob authentication:

```text
Trial 1 KO source       a3a99f7f23cacae69c7cbeb58533d2b9ef2bf7de
corrected RED source    a3a99f7f23cacae69c7cbeb58533d2b9ef2bf7de
GREEN source            cd4c090bbc9858bcc219a309689e21b7ff87459c
superseded RED test     19ed1efc9b385cf8282505180357be0a4596490e
corrected RED test      926a331d842c283113e29bf43297fe3fd8419f7c
GREEN test              926a331d842c283113e29bf43297fe3fd8419f7c
```

Thus corrected RED contains the exact Trial 1-KO source and a test blob which
is frozen through GREEN. It does not contain post-source bytes.

## Findings

### P1-01 — a lost exact readback reply bypasses the claimed terminal latch

`runRedis()` maps every transport rejection to a new `RECOVERY_REQUIRED`
error but does not call `latchFault()`
(`coordination_consumer_epoch_store_binding_test_profile.js:571-579`). The
semantic reply/snapshot paths do latch at lines 581-585 and 602-615. The bind
path catches a lost bind reply and delegates to `readExactBound()` at lines
655-677. If that read command also rejects after Redis returned its exact
bound result, its `RECOVERY_REQUIRED` crosses `createStore()` without setting
`terminalFaultCode`; the database closes at lines 755-759, and the next call
passes `assertOperational()`.

The independent actual-Redis probe used a wrapper which executed each exact
submitted command, then discarded the first bind reply and the following
readback reply. It observed:

```json
{
  "first": "RECOVERY_REQUIRED",
  "ordinal1State": "bound",
  "commandsBeforeRetry": 3,
  "nextCreate": "RESOLVED",
  "retryOrdinal": 2,
  "commandsAfterRetry": 5
}
```

The first three markers were `allocate`, `bind`, `read`; the later call added
`allocate`, `bind`. This is not the documented lost-allocation exception: an
exact SQLite origin had already been initialized, bind had committed, and the
only allowed resolution was exact readback for that origin. The request says
observed recovery/collision faults are online-terminal, subsequent create or
admit calls issue no Redis work, and only a lost allocation may allocate a
greater reservation. Current behavior contradicts all three statements.

Bounded Trial 3 correction:

1. keep only allocation transport loss deliberately unlatched;
2. when bind reply recovery proceeds to exact readback and readback cannot be
   confirmed, latch `RECOVERY_REQUIRED` before closing/publication, so later
   create/admit calls issue no Redis command (or retain only that exact origin
   for a separately specified exact-readback continuation; do not allocate a
   fresh origin); and
3. add an actual-Redis RED which commits bind, loses both replies, proves
   ordinal 1 remains bound, then proves the next create returns the same code
   with an unchanged command count and no ordinal 2.

### P1-02 — three safety predicates have surviving deletion mutants

The current Lua correctly enforces the three predicates. The independent
current-source probe expired authority immediately before bind and immediately
before read and received `RECOVERY_REQUIRED` in both cases; corrupt exact
bound bytes also produced `RECOVERY_REQUIRED`. The defect is mandatory test
evidence: the focused suite remains green if those checks are deleted.

Each mutant was an isolated GREEN archive with exactly one source deletion and
the frozen test blob. Direct `node --test` with the dot reporter completed all
49 tests; 49 dots, no fail or skip marker, and exit 0 were observed:

| Deleted predicate | Candidate line | Mutant source SHA-256 | Result | Wall |
|---|---:|---|---|---:|
| bind authority `PTTL == -1` | 126 | `7c846272b47c4cbe88081177da0c7535b5f91eee95aec9b40bbaa80c70f4afeb` | **survived**, 49 pass / 0 fail | 1.693697695 s |
| read authority `PTTL == -1` | 177 | `1b7da44d66d6a3e44bef8c44f4bbae79a094c6534e18e70d91062bd8a561f0c6` | **survived**, 49 pass / 0 fail | 1.820770894 s |
| read exact bound-record equality | 197 | `6f545936796811b844161834710a7cedd52c369617177aa4841ca8878bd5346a` | **survived**, 49 pass / 0 fail | 1.676400309 s |

A separate direct TAP rerun of the readback-deletion mutant also exited 0 at
49/49, Node duration 1329.573156 ms and tool wall 1.316643041 s.

The deterministic fake independently implements authority/value checks and
does not execute Lua (`tests/gateway/coordination_consumer_epoch_store_binding.test.js:136-268`).
Its authority check ignores its own TTL field. The actual-Redis negative PTTL
case at test lines 1075-1106 runs only before allocation; the actual bind and
read executions at lines 968-1006 are positive. Consequently those three
deletions are not causally observed. This violates AGENTS Rule 9, Trial 1
P1-03's required authority/PTTL and readback mutations, and the request's
claim that these semantic families are independently killed.

Bounded Trial 3 correction:

1. add actual-submitted-Lua tests which expire authority only after allocation
   but before bind, expire it only after a successful bind but before read,
   and corrupt the bound bytes before actual read;
2. make each test assert state/transcript non-mutation as well as the closed
   result; and
3. rerun exact deletion mutants for lines 126, 177, and 197 and require all
   three to turn the frozen focused suite red for the intended reason.

## TDD and required suite evidence

### Corrected RED materialization

Corrected RED `546107b...` was independently archived from Git at:

```text
/tmp/g002-binding-t2-review.kZeGdi/corrected-red
```

Only the declared `gateway/node_modules` dependency symlink was supplied. The
materialized source/test hashes were recomputed with `git hash-object` as
`a3a99f7...` and `926a331...`, matching the Git objects above. The exact
command was:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

Result: exit 1 required; 49 total, 29 pass, 20 fail, 0 cancelled, 0 skipped,
0 todo; Node duration 1516.982373 ms; tool wall 1.538926105 s. Dependencies,
SQLite, and private Redis loaded and ran.

The 20 failures independently partition as:

| Semantic class | Fail count |
|---|---:|
| rollback/collision non-mutation and terminality | 9 |
| four disposal windows plus parent | 5 |
| exact admission envelope | 1 |
| reply/SQLite boundary subtests plus parent | 4 |
| actual-Lua arity | 1 |

No failure is import, dependency, worker-bootstrap, or Redis-start noise. The
superseded RED and any post-source run are excluded.

### GREEN and affected tests, run serially

| Exact command | Exit and exact result | Duration |
|---|---|---:|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_store_binding.test.js` | exit 0; 49/49 pass; 0 fail/cancelled/skipped/todo | 1391.120247 ms Node; 1.331164390 s tool |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js tests/gateway/coordination_consumer_runtime.test.js tests/gateway/coordination_consumer_store_ownership.test.js` | exit 0; 76/76 pass; 0 fail/cancelled/skipped/todo | 17142.856277 ms Node; 17.081193792 s tool |

These commands ran one after the other, not concurrently. Their passing state
is credited, but it does not erase either P1.

## Exact Lua and independent adversarial probe

The final independent probe is:

```text
/tmp/g002-binding-t2-review.kZeGdi/independent_probe.mjs
SHA-256 481507693ddf0b3699e1c00b19a8bd8eb70f3822acc978fe9a6a3da98fb53d13
```

Exact command:

```text
node /tmp/g002-binding-t2-review.kZeGdi/independent_probe.mjs
```

The final host-permitted run used Redis 8.8.0 on private Unix socket
`/tmp/ack-redis-6ST1ec/r.sock`, PID `1234303`, TCP disabled and persistence
disabled. It exited 0 in 0.662917793 s. The helper removed the socket/root and
stopped the process afterward. Captured exact submitted Lua hashes were:

```text
allocate 904e21ff5a864289e2ec313ce3cb1be7ac61da79c2d0c9931750ac378d13c2a2
bind     fe5aecce8120438b60b5330bf54c5d8e871e0e63301622f83ad97257c96a8e0b
read     338e46706a062560e82d73af7a5350074d8f7a8c4db2df990c41105a3aa13af6
```

The normal transcript was exactly allocation, bind, read. Authority, counter,
and bound record had PTTL `-1/-1/-1`; ordinal 1 was present in SQLite `main`,
counter was `1`, and the exact Redis record was `bound`.

### Exact arity, including KEYS and ARGV

For each captured script, the probe ran four malformed forms: missing KEYS,
surplus KEYS, missing ARGV, and surplus ARGV. All 12/12 returned exactly
`["recovery_required"]`. Before/after `INFO commandstats` deltas for internal
`TYPE`, `PTTL`, `STRLEN`, `GET`, and `SET` were zero in every case, and exact
key/canary snapshots were unchanged. This is stronger than the committed test,
which varies only ARGV partitioning.

### Positive adversarial results

| Lane | Independent result |
|---|---|
| rollback/high-water | first and retry `RECOVERY_REQUIRED`; one first fault command, zero later commands, zero state mutation |
| exact-looking collision | first and retry `BINDING_COLLISION`; counter/record unchanged, zero retry commands |
| decimal carry | counter `99 -> 100`, SQLite ordinal 100 |
| reservation/bind/read | exact persistent reserved-to-bound transition; malformed bound readback `RECOVERY_REQUIRED` |
| bind/read authority PTTL | expiry immediately before each operation returned `RECOVERY_REQUIRED` |
| lost allocation reply | ordinal 1 stayed orphaned `reserved`; retry safely created bound ordinal 2 |
| lost bind reply | exact sequence allocate/bind/read returned initialized ordinal 1 |
| all four dispose windows | allocate, bind, bind-readback, and admission-read each returned `STORE_ORIGIN_MISMATCH`; Redis origin close once |
| close once | two concurrent dispose calls produced one SQLite close and one Redis-origin close |
| descriptor snapshots | reply getter/trap calls `0/0`; admission getter/trap calls `0/0`; exact spread envelope admitted |
| SQLite mapping | unknown tuple insertion failure became `STORE_SCHEMA_UNSUPPORTED`; origin closed once |
| sealed `main` | TEMP lookalike did not redirect admission; changed main tuple became `REDIS_AUTHORITY_MISMATCH` |
| capability origin | foreign profile could not admit genuine store: `STORE_ORIGIN_MISMATCH` |
| WIRING-A | `createEpochStore` and `admitEpochStore` both absent |

The double-lost bind/readback row is excluded from this positive table and is
P1-01.

## Independent mutation matrix

Each mutation tree is an isolated archive under
`/tmp/g002-binding-t2-review.kZeGdi/mutants/` with one source-only change and
the frozen `926a331...` test. Direct dot-reporter runs completed 49 tests each.
An `X` is a semantic failure; there were no skip markers.

| Mutant | SHA-256 prefix | Exit | Exact focused result | Wall | Disposition |
|---|---|---:|---:|---:|---|
| delete allocation authority PTTL | `35bfa7508d1a` | 1 | 47 pass / 2 fail | 1.999782175 s | killed |
| delete bind authority PTTL | `7c846272b47c` | 0 | 49 pass / 0 fail | 1.693697695 s | **survived** |
| delete read authority PTTL | `1b7da44d66d6` | 0 | 49 pass / 0 fail | 1.820770894 s | **survived** |
| delete rollback/high-water conjunct | `358b9b488dd5` | 1 | 47 pass / 2 fail | 1.729791117 s | killed |
| break decimal carry | `9a992be7618a` | 1 | 47 pass / 2 fail | 1.583849903 s | killed |
| corrupt reservation write | `9fbede7e5c7f` | 1 | 43 pass / 6 fail | 1.538652869 s | killed |
| remove bind transition | `565a8ad6280b` | 1 | 47 pass / 2 fail | 1.945358183 s | killed |
| delete exact bound readback equality | `6f5459367968` | 0 | 49 pass / 0 fail | 1.676400309 s | **survived** |
| mutate counter on collision | `d21c4adb10e0` | 1 | 47 pass / 2 fail | 1.912829201 s | killed |
| disable terminal latch | `01fe3145795f` | 1 | 40 pass / 9 fail | 1.731273596 s | killed |
| delete first allocation arity guard | `3e5d31cb5b68` | 1 | 48 pass / 1 fail | 1.557831888 s | killed |

Aggregate: 11 semantic mutants, 8 killed, 3 survived. The request's reported
8/8 matrix used different mutations and cannot establish deletion sensitivity
for the three surviving guards.

## Static, forbidden-command, and scope evidence

The following exact checks passed:

- `node --check` on the changed source and focused test: both exit 0, no
  diagnostics;
- `gateway/node_modules/.bin/eslint --no-cache --config
  gateway/eslint.config.js` on both files: exit 0, zero diagnostics;
- `git diff --check 507a9d9..053e722` and
  `git diff --check 507a9d9..401e8b1`: exit 0, no output;
- the combined syntax/lint/diff/path/static batch wall was 0.384440407 s;
- source scans found no Lua `DEL`, `UNLINK`, `EXPIRE`, `PEXPIRE`, `EXPIREAT`,
  `PEXPIREAT`, `DECR`, or `DECRBY`, and no TTL-bearing `SET`; the only Lua
  writes are plain persistent `SET` at source lines 95, 96, and 147;
- actual command transcripts contain only the three `EVAL` programs for the
  product operations.

KO-baseline-to-GREEN changed only:

```text
M gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js
M tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

There is no migration, migration-set, WIRING-A runtime-profile, service, tool,
public server, production profile, policy, dependency, lockfile, workflow, CI,
or manifest change. The WIRING-A runtime-test-profile blob is exactly
`24be1a2b34c6e85c99a6a4a08e4b0795cea17051` at both KO and GREEN. Repository
symbol reachability is limited to the private implementation, its test-profile
re-export, and the focused test; no service/tool/MCP/production caller exists.

## Failed, unavailable, and discarded reviewer lanes

No failed lane is represented as passing evidence:

- The first sandbox launch of the independent probe exited 1 because Redis
  could not open its private Unix socket:
  `setsockopt SO_REUSEADDR: Operation not permitted`. It is unavailable
  infrastructure evidence, not a product failure. The exact probe was then
  run with host permission limited to its disposable `/tmp` Redis origin.
- The first host probe revision exited 1 because the reviewer captured the
  collision before-state before its asynchronous fixture initialization. The
  probe was corrected to await initialization; no candidate change occurred.
- The next host probe revision reached every stage but exited 1 during helper
  cleanup because the reviewer had not awaited an otherwise unused foreign
  profile initializer (`DisconnectsClientError`). It was corrected, rerun,
  and only the final exit-0 evidence above is credited.
- Initial mutation attempts that wrapped or redirected Node output produced
  one file-level failure and, in the explicit piped reproduction,
  `Failed to create stream fd: Operation not permitted`. Those bootstrap
  results are void. The direct dot-reporter runs above had real subtest output
  and are the sole mutation evidence.
- A direct unredirected readback-mutant TAP run was also performed and is
  recorded under P1-02, confirming that survivor independently of the dot
  matrix.

## Unrun lanes and limitations

- Full `bash scripts/ci.sh` was deliberately not run; its Node, Python,
  packaging, CLI, LangGraph, and other lanes remain unexecuted here because
  the operator owns that serialized gate.
- Shared Redis/PostgreSQL, Docker composition, live Gateway/MCP, integration,
  promotion, rollout, tag/main equality, release, and support lanes were not
  run and are not inferred.
- Redis evidence is Redis 8.8.0 on disposable private non-persistent Unix
  sockets. It is not Redis 7 compatibility, cluster, replication/failover,
  process-crash persistence, shared-service, or production evidence.
- No JSON changed, so a JSON parser gate is not applicable rather than passed.
- The injected Redis-origin factory remains trusted test-fixture
  infrastructure. Perfectly indistinguishable writable origin clones remain
  outside the explicit non-cloning premise.
- Capability reissuance, online repair/rebind/move/cleanup, durable epoch
  runtime lineage, bootstrap, transport fencing, recovery, health, and
  inventory remain later slices.
- Before result writing, tracked status was clean and the only untracked entry
  was the permitted dependency symlink `gateway/node_modules`.

## Required Trial 3 scope

A bounded correction should address only the two P1 findings:

1. make the bind-plus-readback transport-failure schedule terminal (or retain
   only the exact initialized origin under a separately specified exact
   continuation), with no fresh allocation or Redis work after the returned
   `RECOVERY_REQUIRED`; and
2. add actual-Lua negative witnesses and deletion mutations for bind PTTL,
   read PTTL, and exact bound-record equality.

Trial 3 must preserve the independently supported current behavior: corrected
semantic RED custody, exact first arity guards, persistent string-safe
allocation and decimal carry, non-mutating rollback/collision, intentional
lost-allocation orphan/greatest retry, successful single lost-bind readback,
all disposal barriers and close-once behavior, descriptor-only snapshots,
closed SQLite mapping, sealed `main`, opaque origin capabilities, unchanged
WIRING-A/migrations/public surfaces, and absence of destructive/expiring Redis
writes.

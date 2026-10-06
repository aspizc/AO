# Independent Review Result — Project V5 G/0/02 WIRING-B EPOCH-CORE STORE-BINDING (Trial 3)

## Verdict

**reviewed_OK**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |

Trial 3 closes both Trial 2 P1 findings without broadening the private
test-profile STORE-BINDING slice. The exact RED is authentic and semantic,
GREEN and the proportional affected suite pass serially, the double-lost
bind/readback schedule is terminal after the already committed ordinal-1
binding, and all three previously surviving Lua-guard deletions are now killed
by actual-Redis witnesses with the frozen test blob.

The correction preserves the intentional allocation-reply-loss orphan and
strictly greater retry, successful single-lost-bind exact readback, every
accepted Trial 2 boundary, exact two-technical-path scope, and the absence of
destructive, expiring, decrementing, reuse, or cleanup Redis writes.

This verdict reviews only the private STORE-BINDING foundation. It does not
claim integration, promotion, rollout, release, production support, the
remaining epoch state machine/runtime/transport work, or completion of
G/0/02.

## Reviewer identity, trace, and independence

- Role: fresh independent implementation reviewer. This session authored no
  candidate source, test, request, or prior result and delegated no part of the
  verdict.
- Agent/model: Codex `gpt-5.6-sol`, reasoning effort `max`, service tier
  `priority`.
- Trace:
  `tr-tr-v5-g002-binding-t3-so-7c86d06b-58c0-4f4c-a625-dfbe0c956c89`.
- Task: `ts-8946d4be-5825-4511-bfcb-596b59c87e24`.
- Supervised fallback tmux at verdict time:
  `ag-tr-v5-g002-binding-t3-sol-codex-reviewer:0.0`.
- Review branch: `review/V5-G-0-02-binding-t3-sol`.
- Authenticated internal review brief:
  `art-2e50b33d-0ddb-430c-af40-ce85e43677cb`, kind `review-brief`, produced by
  `codex-orchestrator` under the same trace.
- Authenticated internal fallback record:
  `art-1599fa36-aa9d-4e2d-9a54-3c5b6a76d462`, kind
  `orchestration-fallback`, produced by `codex-orchestrator` under the same
  trace.

The fallback record says the corrected canonical `agent.spawn` returned a
generic `TOOL_ERROR` and created no tmux, after the task assignment without an
explicit filesystem repo succeeded. This review therefore claims neither
canonical Gateway spawn success nor cross-vendor evidence. It is fresh
same-vendor Codex review through the documented persistent direct-tmux
fallback.

## Material read before adjudication

The reviewer read completely before ruling:

- `AGENTS.md`, `.claude/orchestration-profile.md`, and the complete
  `.codex/skills/ao-build-orchestration/SKILL.md`;
- `plan/README.md`, `plan/PROJECT_V5/G/README.md`, and
  `plan/PROJECT_V5/G/0/02.md`;
- all 321 lines of the Trial 3 request and the complete STORE-BINDING Trial 1
  and Trial 2 request/result trail;
- durable-epoch authority/non-cloning premises, migration-set contract,
  section 2.2 store binding, mutation ownership, path scope, and rollout
  boundary;
- the complete 860-line candidate source and 1,448-line focused test;
- the complete immediate re-export/caller
  `coordination_consumer_runtime_test_profile.js`, migration-set helper
  `sqlite_migration_sets.js`, and disposable-Redis helper
  `tests/gateway/helpers/ephemeral_redis.js`; and
- the exact RED-to-GREEN diff, direct symbol reachability, affected migration,
  runtime, and ownership tests, and the review index.

The request prose, prior totals, and artifact content were treated as
untrusted leads. Git identities, source behavior, Redis results, test counts,
and mutation outcomes below were derived independently.

## Independently authenticated Git custody

All object identities came from `git show`, `git diff-tree`, `git rev-parse`,
and ancestry checks against the local object database.

| Object | Commit | Tree | Sole parent | Exact subject |
|---|---|---|---|---|
| Trial 2 KO | `c13cf0bfd60510a90066414d5940a1b99da4854f` | `f4a4ab3554c321b93fb0b0cb2b9f2828aaea35d2` | `401e8b19cbde2fe33feec3705bf074566954ab95` | `review(v5): reject G_0_2 epoch store binding Trial 2` |
| RED | `1146c14f0eeb26a8a37005f8f4b4efe064c20e9b` | `536bfe8f43e14dcd8b9c530ce700aa48da1b5bd8` | Trial 2 KO | `test(v5): expose G_0_2 epoch binding Trial 3 gaps` |
| GREEN | `63ba3e1ca9783f7f76d32bcfd14dc041a92cb22e` | `970ef365ce940e7045986b13bc20f32f3da1ec1c` | RED | `fix(v5): latch G_0_2 epoch bind recovery` |
| request / review HEAD | `45ca68c80fe441ee8e91959dde37f831f3afc7d8` | `8b9e8a9c5193a32a821e8c19cdd44e3904c28a0f` | GREEN | `docs(review): request G_0_2 epoch store binding Trial 3` |

All three consecutive `git merge-base --is-ancestor` checks exited `0`.
Exact per-commit path sets were:

```text
c13cf0b (Trial 2 KO)
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-2_result.md

1146c14 (RED)
M tests/gateway/coordination_consumer_epoch_store_binding.test.js

63ba3e1 (GREEN)
M gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js

45ca68c (request)
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-3_to_review.md
```

The Trial 2-KO-to-GREEN technical path set is exactly:

```text
M gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js
M tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

The request changes only its two review documents, and its index diff adds
exactly one Trial 3 row whose verdict is `pending`.

Blob authentication:

```text
Trial 2 KO source   cd4c090bbc9858bcc219a309689e21b7ff87459c
RED source          cd4c090bbc9858bcc219a309689e21b7ff87459c
GREEN source        a76cc1c6022835ca4a9d291fe2bbd5ba6396f521
RED test            60b966abfdb2ffe74505c1913f00d9b2487fd92b
GREEN test          60b966abfdb2ffe74505c1913f00d9b2487fd92b
request test        60b966abfdb2ffe74505c1913f00d9b2487fd92b
focused test SHA256 985d3b7f27317a4fb24c35753f71ccf206d7455b0f20bb7184d2740b7407dc7f
```

Thus the credited RED contains the exact Trial 2-KO product source and never
contains GREEN source bytes.

## TDD and serial suite evidence

### Exact RED materialization

The reviewer created fresh scratch root
`/tmp/g002-binding-t3-review.yPtR2P`, archived exact RED into its `red/`
subdirectory, and supplied only the disclosed dependency symlink:

```text
git archive 1146c14f0eeb26a8a37005f8f4b4efe064c20e9b |
  tar -x -C /tmp/g002-binding-t3-review.yPtR2P/red
ln -s /home/carase/git/personal/agents-orchestrator/workspace/clones/wt-c003-t22-parser/gateway/node_modules \
  /tmp/g002-binding-t3-review.yPtR2P/red/gateway/node_modules
```

`git hash-object` in that archive returned source `cd4c090...` and test
`60b966...`. The source SHA-256 was
`831eeaf748f98d8a09aac32b1d27d54a806335a6a7b215470766ce5cbf2f252c`.

Exact credited command:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

Result: exit `1` as required; **54 total, 53 pass, 1 fail, 0 cancelled,
0 skipped, 0 todo**; Node duration **1461.709546 ms**; tool wall
**1.451720445 s**.

The sole failure was semantic: the double-loss witness observed counter `3`
instead of required `1` after the later create/admit attempts. Before that
assertion, the witness had already proved first result `RECOVERY_REQUIRED`,
the exact `allocate/bind/read` product transcript, and the canonical ordinal-1
`bound` record. All dependencies, SQLite setup, and disposable Redis loaded;
no import, package, worker-bootstrap, or fixture failure is credited.

### Exact GREEN and affected suite, serially

The reviewer separately archived exact GREEN into
`/tmp/g002-binding-t3-review.yPtR2P/green`, authenticated source `a76cc1c...`
and frozen test `60b966...`, then ran these commands one after the other:

| Exact command | Exit and exact counters | Node duration | Tool wall |
|---|---|---:|---:|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_store_binding.test.js` | exit 0; 54/54 pass; 0 fail/cancelled/skipped/todo | 1575.068511 ms | 1.556293147 s |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js tests/gateway/coordination_consumer_runtime.test.js tests/gateway/coordination_consumer_store_ownership.test.js` | exit 0; 76/76 pass; 0 fail/cancelled/skipped/todo | 14030.972198 ms | 14.022533211 s |

No suite was run concurrently with the other. The focused test executes the
actual submitted Lua in disposable Redis; the 76-test lane preserves the
accepted migration-set, WIRING-A runtime, ownership, lineage, and public
authority-absence behavior.

## Independent exact-Lua Redis probe

The reviewer wrote a separate probe only under `/tmp`:

```text
/tmp/g002-binding-t3-review.yPtR2P/independent_probe.mjs
SHA-256 90050c72240a29bcfb38fce31351ad085ae00d942dff16e703e5de6016016d3e
```

It imports the candidate through the immediate test-profile re-export,
captures each product `EVAL`, forwards those exact bytes to Redis, and only
then discards selected replies. It does not implement or simulate allocation,
bind, or read semantics in JavaScript.

Exact command:

```text
node /tmp/g002-binding-t3-review.yPtR2P/independent_probe.mjs
```

The final scoped host-permitted run exited `0` with execution wall
**0.319379452 s** against Redis **8.8.0**, PID `1330241`, on private socket
`/tmp/ack-redis-nN7JxW/r.sock`, TCP disabled and persistence disabled. After
the run, `ps -p 1330241` exited `1`, and checks proved both socket and temporary
Redis directory absent.

Captured exact submitted script SHA-256 values were:

```text
allocate 904e21ff5a864289e2ec313ce3cb1be7ac61da79c2d0c9931750ac378d13c2a2
bind     fe5aecce8120438b60b5330bf54c5d8e871e0e63301622f83ad97257c96a8e0b
read     338e46706a062560e82d73af7a5350074d8f7a8c4db2df990c41105a3aa13af6
```

Independent results:

| Schedule | Observed result |
|---|---|
| bind commits, bind reply lost, exact read executes, read reply lost | first `RECOVERY_REQUIRED`; product transcript exactly `allocate, bind, read`; ordinal 1 exact canonical `bound`; counter `1`; ordinal 2 absent |
| four later operations | `create, admit, create, admit` all returned `RECOVERY_REQUIRED`; command count remained exactly `3`, so no later Redis command ran |
| allocation reply lost after commit | first `RECOVERY_REQUIRED`; ordinal 1 remained canonical `reserved`; retry created canonical `bound` ordinal 2; transcript `allocate, allocate, bind` |
| one bind reply lost after commit | `createStore` returned the initialized ordinal-1 store after exact readback; ordinal 1 remained canonical `bound`; transcript `allocate, bind, read` |

Every captured product command was `EVAL`. Authority `SET` initialization was
fixture-only, and reply loss occurred after actual Redis execution. Neither is
part of the product transcript.

## Independent frozen-test mutation matrix

Each mutation started from a separate exact GREEN archive, changed one source
line only, retained frozen test blob `60b966...`, and ran the full exact
focused command with `--test-concurrency=1`. The two failures per killed
mutant are one intended leaf witness and its parent aggregation, not two
independent defects.

| Deleted GREEN guard | Mutant source SHA-256 | Exit and exact focused result | Intended actual-Lua leaf failure | Node / tool duration |
|---|---|---|---|---|
| bind authority `PTTL == -1`, source line 126 | `13e54a35960b875150a092ced55a279caee7ec2435b6cc3a3f7f7d849c0f6e3a` | exit 1; 54 total, 52 pass, 2 fail, 0 cancelled/skipped/todo | authority expiry after allocation and before bind returned `RESOLVED` instead of `RECOVERY_REQUIRED` | 1537.569085 ms / 1.525603906 s |
| read authority `PTTL == -1`, source line 177 | `6f7a362415760eb542cec1a97601093c96eef7a9c04166d09728da0399d91e67` | exit 1; 54 total, 52 pass, 2 fail, 0 cancelled/skipped/todo | authority expiry after bind and before read returned `RESOLVED` instead of `RECOVERY_REQUIRED` | 1503.029324 ms / 1.494951511 s |
| exact bound-record equality, source line 197 | `d782df6d2b49b823c163ef90a5f408b4fdd655903c9497ec862e1a6c3589bfd9` | exit 1; 54 total, 52 pass, 2 fail, 0 cancelled/skipped/todo | same-length `b0und` bytes returned `RESOLVED` instead of `RECOVERY_REQUIRED` | 1589.801507 ms / 1.578556088 s |

Aggregate: **3/3 killed, 0 survived; 162 total, 156 pass and 6 expected
mutant-detecting fail, 0 cancelled/skipped/todo; 4630.399916 ms aggregate Node
duration and 4.599111505 s aggregate tool wall**.

The `beforeCommand` hooks mutate Redis directly before the captured product
EVAL. The product command is then executed unchanged. Bind/read PTTL witnesses
compare key type/value before and after the product command and separately
prove the injected PTTL remains positive. The equality witness snapshots the
same-length corrupted value and all relevant key state before and after read.
All three assert terminal retry with an unchanged product command count. Thus
the injected `PEXPIRE`/`SET` is out-of-band fault setup, while the killed
semantic reason is execution of the actual submitted Lua guard.

## Ordering, publication, and accepted Trial 2 behavior

Source inspection supports the test observations:

- `createStore` allocates first, creates and migrates SQLite, inserts the exact
  `main` tuple, then binds Redis. Only after bind/readback returns and
  `assertOperational()` succeeds does it mark the origin bound, mint the store
  capability, and return it.
- The Trial 3 change is limited to the lost-bind catch at source lines
  674-680. If exact readback rejects, `latchFault(error)` records
  `RECOVERY_REQUIRED` before the enclosing `createStore` catch closes the
  unpublished SQLite database. Later create/admit calls stop in
  `assertOperational()` before Redis.
- A successful exact readback still returns to the same initialized origin and
  permits its capability publication. Allocation transport loss still exits
  from `runRedis` without a terminal latch, before SQLite creation, preserving
  the specified orphan-and-greater-retry schedule.
- Admission resolves opaque origin/store/Redis capabilities, revalidates the
  sealed `main` schema/ledger/exact tuple, performs exact bound readback, then
  rechecks operational state before publishing `{status:"admitted"}`.

The frozen 54-test GREEN suite plus direct inspection preserve all accepted
Trial 2 behavior: first-executable exact KEYS/ARGV guards; persistent
string-safe allocation and decimal carry; non-mutating terminal rollback and
collision; lost-allocation retry; successful single-lost-bind readback; all
dispose await barriers and close-once handling; descriptor-only Redis reply
and store-envelope snapshots; closed SQLite failure mapping; exact `main`
migration/schema/row/tuple sealing; TEMP/attached lookalike rejection; opaque
process-local capabilities; foreign/copied origin rejection; WIRING-A epoch
issuance absence; and no online cleanup, decrement, reuse, rebind, or repair.

## Scope, static checks, and forbidden-write audit

The exact Trial 2-KO-to-GREEN path set contains only the private binding source
and its focused test. The direct WIRING-A re-export/caller, migration-set
helper, and profile migration are blob-identical at Trial 2 KO and GREEN:

```text
coordination_consumer_runtime_test_profile.js 24be1a2b34c6e85c99a6a4a08e4b0795cea17051
sqlite_migration_sets.js                       1fb2aa9aa028047be8c2b1e3f9c315a7597fbd52
005_coordination_consumer_runtime_epoch.sql   772149ca6b5e499fc3ea38458cda7f032d06dbc0
```

Repository-wide symbol reachability is exactly the private definition, its
test-profile re-export, and the focused test. No service, tool, MCP, public
server, production profile, policy, dependency, lockfile, workflow, CI,
migration, or WIRING-A behavior changed.

| Exact check | Result |
|---|---|
| `node --check gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js` in exact GREEN | exit 0; no Node diagnostic; 0.023457302 s wall |
| `node --check tests/gateway/coordination_consumer_epoch_store_binding.test.js` in exact GREEN | exit 0; no Node diagnostic; 0.038858061 s wall |
| `gateway/node_modules/.bin/eslint --no-cache --config gateway/eslint.config.js` on those two paths | exit 0; 0 diagnostics; 0.304957815 s wall |
| `git diff --check c13cf0b..63ba3e1` | exit 0; no diff diagnostic |
| `git diff --check 1146c14..63ba3e1` | exit 0; no diff diagnostic |
| `git diff --check c13cf0b..45ca68c` | exit 0; no diff diagnostic |
| Lua destructive/expiry/decrement call scan | `rg` exit 1 as expected; no `DEL`, `UNLINK`, `EXPIRE`, `PEXPIRE`, `EXPIREAT`, `PEXPIREAT`, `DECR`, or `DECRBY` call |
| Lua TTL-bearing `SET` option scan | `rg` exit 1 as expected; no `EX`, `PX`, `EXAT`, or `PXAT` write |

All Lua writes are exactly three plain persistent `SET` calls at source lines
95, 96, and 147. No JSON changed, so a JSON parser lane is not applicable
rather than silently counted as passed.

## Failed, unavailable, corrected, and intentionally red lanes

No failed or unavailable lane is represented as passing evidence:

- The first independent-probe launch inside the sandbox exited `1` before any
  candidate adjudication because disposable Redis could not open its private
  Unix socket: `setsockopt SO_REUSEADDR: Operation not permitted`. That result
  is unavailable infrastructure evidence. The exact same reviewer-owned
  `/tmp` command was submitted for one scoped host run; no reusable approval
  prefix was requested. Only its final exit-0 output is credited.
- The first preparation of the bind-PTTL mutant used ambiguous patch context
  and removed the allocation PTTL line. An exact source diff caught it before
  any mutant test ran. That setup was discarded, the allocation line was
  restored, the bind line alone was deleted and re-diffed, and only the latter
  execution is reported in the matrix.
- Some non-test shell/hash/static invocations emitted environment-level
  `Failed to create stream fd: Operation not permitted` lines before the
  command output. Their stated exit codes and hashes remained reproducible;
  the noise is not credited as a clean-output product observation. The exact
  RED, GREEN, affected, and mutation TAP runs did not contain that noise.
- RED exit `1` is the required semantic TDD witness. Each mutant exit `1` is
  the required killed-mutant result. They are not represented as passing
  product lanes.
- `rg` exit `1` in the two forbidden-write scans means no match and is the
  expected successful scan disposition. `diff -u` exit `1` during mutation
  authentication means the intended one-line difference exists.

There were no skipped, cancelled, todo, deferred, dependency-unavailable, or
worker-bootstrap test cases in credited lanes.

## Unrun lanes and limitations

- Full `bash scripts/ci.sh` was deliberately not run. Its Node, Python,
  packaging, CLI, LangGraph, and other lanes remain orchestrator-owned and
  unexecuted by this reviewer.
- Shared Redis/PostgreSQL, Docker composition, live Gateway/MCP, integration,
  promotion, rollout, tag/main equality, release, and support lanes were not
  run and are not inferred.
- Redis evidence is Redis 8.8.0 in disposable private non-persistent processes
  over Unix sockets. It is not Redis 7 compatibility, cluster,
  replication/failover, persistence/restart, shared-service, or production
  evidence.
- The injected Redis-origin factory remains trusted test-fixture
  infrastructure. Perfectly indistinguishable concurrently writable clones
  remain outside durable-epoch section 1.2's explicit non-cloning premise.
- Capabilities remain private, process-local, non-transferable, and
  non-reissuable after exit. No online recovery, rebind, clone, move, cleanup,
  repair, or maintenance authority is added.
- Before result writing, tracked state was clean. The pre-existing permitted
  untracked dependency symlink `gateway/node_modules` remained untouched.

## Findings

No reproducible P0, P1, or P2 finding remains in this bounded Trial 3
candidate. The result is **reviewed_OK** for STORE-BINDING Trial 3 only.

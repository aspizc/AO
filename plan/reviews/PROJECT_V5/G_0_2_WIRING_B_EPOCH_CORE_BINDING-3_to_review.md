# Review Submission — Project V5 G/0/02 WIRING-B EPOCH-CORE STORE-BINDING (Trial 3)

## Request state and reviewer

Request state: **pending independent review**.

This request supplies no verdict. It requests a fresh independent Codex
gpt-5.6-sol reviewer with reasoning effort max. The reviewer must write one
substantive result at:

plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-3_result.md

The coder did not create that result and does not review this candidate. The
reviewer owns the independent verdict and the pending index-cell replacement.

## Candidate boundary

This is the bounded STORE-BINDING Trial 3 correction required by the Trial 2
KO. It addresses only P1-01 and P1-02: terminal handling when both a committed
bind reply and its exact-readback reply are lost, plus actual-submitted-Lua
negative witnesses and deletion-mutation evidence for the bind authority PTTL,
read authority PTTL, and exact bound-record equality guards.

The candidate remains a private, test-profile-only SQLite/Redis foundation for
durable-epoch design section 2.2. It does not broaden recovery design or
production support. Allocation transport loss deliberately remains unlatched
so its specified retry creates a strictly greater orphan-safe reservation.

## Authenticated Trial 2 KO baseline

- Commit: c13cf0bfd60510a90066414d5940a1b99da4854f.
- Tree: f4a4ab3554c321b93fb0b0cb2b9f2828aaea35d2.
- Sole parent: 401e8b19cbde2fe33feec3705bf074566954ab95.
- Subject: review(v5): reject G_0_2 epoch store binding Trial 2.
- Exact review-only pathset:

~~~text
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-2_result.md
~~~

Before editing, the branch was authenticated as an ancestor of this object and
advanced only with:

~~~text
git merge --ff-only c13cf0bfd60510a90066414d5940a1b99da4854f
~~~

Tracked state was clean before and after that fast-forward. The sole untracked
entry was and remains the permitted dependency link:

~~~text
gateway/node_modules -> /home/carase/git/personal/agents-orchestrator/workspace/clones/wt-c003-t22-parser/gateway/node_modules
~~~

## Frozen TDD identities

### RED

- Commit: 1146c14f0eeb26a8a37005f8f4b4efe064c20e9b.
- Tree: 536bfe8f43e14dcd8b9c530ce700aa48da1b5bd8.
- Sole parent: c13cf0bfd60510a90066414d5940a1b99da4854f.
- Subject: test(v5): expose G_0_2 epoch binding Trial 3 gaps.
- Exact pathset:

~~~text
M tests/gateway/coordination_consumer_epoch_store_binding.test.js
~~~

- Focused test Git blob:
  60b966abfdb2ffe74505c1913f00d9b2487fd92b.
- Focused test SHA-256:
  985d3b7f27317a4fb24c35753f71ccf206d7455b0f20bb7184d2740b7407dc7f.
- Product-source blob at both the RED parent and RED:
  cd4c090bbc9858bcc219a309689e21b7ff87459c.

### GREEN

- Commit: 63ba3e1ca9783f7f76d32bcfd14dc041a92cb22e.
- Tree: 970ef365ce940e7045986b13bc20f32f3da1ec1c.
- Sole parent: RED
  1146c14f0eeb26a8a37005f8f4b4efe064c20e9b.
- Subject: fix(v5): latch G_0_2 epoch bind recovery.
- Exact pathset:

~~~text
M gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js
~~~

- Product-source Git blob:
  a76cc1c6022835ca4a9d291fe2bbd5ba6396f521.
- Product-source SHA-256:
  c65e7a6ccf969b2dcac0c21577af3998ca553310652f935aa2264617abf690f5.
- Focused test Git blob:
  60b966abfdb2ffe74505c1913f00d9b2487fd92b, byte-identical to RED.

The exact parent chain is:

~~~text
c13cf0bfd60510a90066414d5940a1b99da4854f
  -> 1146c14f0eeb26a8a37005f8f4b4efe064c20e9b
  -> 63ba3e1ca9783f7f76d32bcfd14dc041a92cb22e
  -> Trial 3 request commit
~~~

The request commit cannot embed its own commit/tree identity without a
self-referential Git object. The reviewer must derive and authenticate that
commit, its tree, sole GREEN parent, subject, and exact two-document pathset.

## Independently materialized RED custody

The exact RED commit was archived into
/tmp/g002-binding-t3-red.ZMDbAW. Its focused test hashes to the RED Git blob
60b966abfdb2ffe74505c1913f00d9b2487fd92b. Its product source hashes to
cd4c090bbc9858bcc219a309689e21b7ff87459c, exactly matching both the RED
commit and parent c13cf0b; the GREEN source was absent.

The sole credited RED command was:

~~~text
node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_store_binding.test.js
~~~

It exited 1 as required: **54 total, 53 pass, 1 semantic fail, 0 cancelled,
0 skipped, 0 todo; 1518.079575 ms**.

Before reaching the failure, the witness proved that the first create returned
RECOVERY_REQUIRED, the exact product transcript was allocate/bind/read, and
ordinal 1 held the canonical bound record. The failure was exact counter value
3 versus required 1 after two subsequent create/admit pairs. Thus the
unlatched Trial 2 source performed new allocations instead of preserving the
terminal result; it was not an import, dependency, bootstrap, or fixture
failure.

The other three new real-Redis negative witnesses passed on intact RED source:
authority expiry between allocation and bind, authority expiry between bind
and read, and same-length exact-bound corruption before read. Their causal
strength is established by the deletion mutations below rather than credited
from a post-source run.

## Test changes and substantive witnesses

The focused test-only harness gained before-command and after-command hooks
around the exact submitted Redis EVAL. Hooks use the real disposable Redis
client; they do not replace or simulate Lua.

- The double-loss witness executes and commits bind, discards its reply,
  executes exact readback, discards that reply, then performs two further
  create/admit pairs. GREEN proves all four later calls return
  RECOVERY_REQUIRED, the transcript stays at three EVALs, ordinal 1 remains
  exactly bound, the counter remains 1, and ordinal 2 is absent.
- The bind PTTL witness applies out-of-band PEXPIRE only after allocation and
  immediately before the submitted bind EVAL. Bind returns recovery, leaves
  the counter and exact reserved record unchanged, and latches terminal.
- The read PTTL witness applies out-of-band PEXPIRE only after successful bind
  and immediately before the submitted read EVAL. Read returns recovery,
  leaves the exact bound tuple unchanged, and latches terminal.
- The equality witness replaces bound with a same-length b0und record only
  immediately before the submitted read EVAL. Matching length isolates the
  exact GET equality guard. Read returns recovery and leaves the corrupted
  bytes and other Redis state unchanged.

The out-of-band PEXPIRE/SET commands are fault injection, not profile output.
The profile transcript separately contains only EVAL. Existing transcript
assertions still prove that the product issues no deletion, expiry, TTL-bearing
replacement, decrement, or cleanup command.

## Minimal GREEN reasoning

The only product change wraps the exact readback invoked after a lost bind
reply. If that readback cannot confirm the already initialized exact origin,
its recognized error is passed through the existing latchFault boundary before
createStore closes the unpublished SQLite handle. All later create/admit calls
therefore fail at assertOperational without Redis work.

A successful exact readback still returns the original initialized store.
runRedis remains unchanged, so allocation transport loss remains deliberately
unlatched and retains the orphan/strictly-greater retry behavior. Ordinary
admission transport behavior and every Lua program are unchanged. No recovery,
rebind, cleanup, clone, move, or maintenance authority was added.

## Verification

| Exact command or gate | Result |
|---|---|
| Exact archived RED with explicit serial concurrency | exit 1 required; 54 total, 53 pass, 1 semantic fail, 0 cancelled/skipped/todo; 1518.079575 ms |
| node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_store_binding.test.js at GREEN | exit 0; 54/54 pass, 0 fail/cancelled/skipped/todo; 1600.302547 ms |
| node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js tests/gateway/coordination_consumer_runtime.test.js tests/gateway/coordination_consumer_store_ownership.test.js | exit 0; 76/76 pass, 0 fail/cancelled/skipped/todo; 14867.0067 ms |
| Three isolated guard-deletion mutation lanes | 3/3 killed; aggregate 162 total, 156 pass and 6 expected mutant-detecting fail, 0 cancelled/skipped/todo; aggregate 4924.367218 ms |
| node --check on changed source | exit 0; no output; 0.05 s real |
| node --check on frozen focused test | exit 0; no output; 0.06 s real |
| repository-local ESLint with --no-cache and gateway/eslint.config.js on both paths | exit 0; 0 diagnostics; 0.31 s real |
| git diff --check c13cf0b..63ba3e1 and 1146c14..63ba3e1 | both exit 0; no output |
| Baseline-to-GREEN protected path guard | exact two paths below; no policy, dependency, lockfile, workflow, CI, migration, or review-artifact path |
| RED blob comparison | exact 60b966abfdb2ffe74505c1913f00d9b2487fd92b equality at RED and GREEN |
| Lua destructive/expiry/decrement call scan | no DEL, UNLINK, EXPIRE, PEXPIRE, EXPIREAT, PEXPIREAT, DECR, or DECRBY call; corrected literal TTL-option scan has no match |
| All Lua SET writes | exactly three plain persistent SET calls at source lines 95, 96, and 147 |
| JSON parser gate | not applicable; no JSON changed |
| Final pre-request tracked status | clean; only permitted untracked gateway/node_modules link |

The complete Trial 2 KO baseline-to-GREEN technical pathset is:

~~~text
M gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js
M tests/gateway/coordination_consumer_epoch_store_binding.test.js
~~~

The following accepted blobs are identical at c13cf0b and GREEN:

| Preserved path | Git blob |
|---|---|
| gateway/src/core/coordination_consumer_runtime_test_profile.js | 24be1a2b34c6e85c99a6a4a08e4b0795cea17051 |
| gateway/src/core/sqlite_migration_sets.js | 1fb2aa9aa028047be8c2b1e3f9c315a7597fbd52 |
| gateway/migrations/profiles/sqlite-redis-disposable-epoch-test-v1/005_coordination_consumer_runtime_epoch.sql | 772149ca6b5e499fc3ea38458cda7f032d06dbc0 |

## Deterministic deletion-mutation evidence

Each mutant is an isolated archive of GREEN 63ba3e1 with one source line
deleted and the frozen test blob 60b966abfdb2ffe74505c1913f00d9b2487fd92b.
Every focused command used the real disposable Redis server and exited 1 for
the intended semantic witness. The two reported failures are the leaf witness
and its parent aggregation, not two independent defects.

| Deleted guard | Mutant source SHA-256 | Exact focused result | Intended leaf failure | Node duration |
|---|---|---:|---|---:|
| bind authority PTTL at GREEN line 126 | 13e54a35960b875150a092ced55a279caee7ec2435b6cc3a3f7f7d849c0f6e3a | 52 pass / 2 fail | authority-expiry-before-bind returned RESOLVED instead of RECOVERY_REQUIRED | 1658.139402 ms |
| read authority PTTL at GREEN line 177 | 6f7a362415760eb542cec1a97601093c96eef7a9c04166d09728da0399d91e67 | 52 pass / 2 fail | authority-expiry-before-read returned RESOLVED instead of RECOVERY_REQUIRED | 1636.197228 ms |
| exact bound-record equality at GREEN line 197 | d782df6d2b49b823c163ef90a5f408b4fdd655903c9497ec862e1a6c3589bfd9 | 52 pass / 2 fail | same-length corrupted bound bytes returned RESOLVED instead of RECOVERY_REQUIRED | 1630.030588 ms |

The mutation directories remain available for independent inspection:

~~~text
/tmp/g002-binding-t3-bind_pttl.C4m40r
/tmp/g002-binding-t3-read_pttl.S0xOBC
/tmp/g002-binding-t3-read_exact.6FtsdD
~~~

## Preserved Trial 2 behavior

The frozen focused GREEN suite still covers and passes:

- exact first-executable KEYS/ARGV arity guards for allocate, bind, and read;
- persistent string-safe allocation, safe-integer bounds, and decimal carry;
- counter rollback and existing-key collision non-mutation plus terminal latch;
- the intentional lost-allocation orphan and strictly greater retry;
- successful single lost-bind exact readback for its initialized origin;
- every allocate/bind/read disposal barrier and close-once behavior;
- descriptor-only Redis reply and store-envelope snapshots;
- closed SQLite failure mapping, sealed main schema/ledger/table admission,
  exact immutable tuple admission, and TEMP/attached lookalike rejection;
- opaque process-local origin, store, and Redis authority capabilities;
- WIRING-A absence of epoch issuance and unchanged migration foundations; and
- absence of destructive, expiring, decrementing, reuse, or cleanup writes.

## Failed, unavailable, superseded, and discarded lanes

No failed or discarded lane is represented as passing evidence.

- The initial pre-commit worktree RED run exited 1 with 53 pass / 1 fail in
  1619.518625 ms. It was semantic but is not credited because frozen Git-object
  custody had not yet been established.
- The first exact archived RED run exited 1 with 53 pass / 1 fail in
  1625.614163 ms. It used the same authenticated blobs but omitted the explicit
  --test-concurrency=1 flag, so it was superseded by the credited explicit
  serial run.
- The first GREEN focused run passed 54/54 in 1736.84054 ms but likewise
  omitted the explicit concurrency flag. It was superseded by the credited
  explicit serial GREEN run.
- An initial static regex for TTL-bearing SET options was too broad and
  falsely matched the letters ex inside next_ordinal at source lines 95–96.
  That scan is discarded. The replacement requires a quoted Redis option token
  EX, PX, EXAT, or PXAT and returned no match.
- Mutation commands intentionally exited 1; each had substantive leaf output
  shown above and is credited only as a killed mutant.
- There were no permission prompts, sandbox/bootstrap failures, unavailable
  dependencies, skipped test cases, or other failed verification lanes.

Full bash scripts/ci.sh, shared Redis/PostgreSQL, Docker composition, live
Gateway/MCP, integration, promotion, rollout, tag/main equality, release, and
support gates were deliberately not run. The orchestrator owns those serialized
lanes.

## Limitations and non-claims

- Redis evidence uses Redis 8.8.0 in disposable, private, non-persistent
  processes over Unix sockets under /tmp. It is not a shared/live, clustered,
  replicated, failover, production, or crash-persistence claim.
- The injected Redis-origin factory remains trusted test-fixture
  infrastructure. This slice does not attest infrastructure-level non-cloning.
- Capabilities remain opaque, process-local, non-transferable, and
  non-reissuable after process exit.
- A lost allocation reply may permanently orphan a reservation. There is
  deliberately no cleanup, decrement, reuse, or adoption.
- A bind/readback failure now requires offline operator handling. No online
  retry, recovery, repair, rebind, clone, move, or maintenance authority is
  added.
- This slice adds no Redis epoch state keys, generation/bootstrap/controller/
  activation/release state machines, runtime credentials or permits,
  participant guards, receive/ACK/effect fencing, recovery/rejoin, transport
  scripts, health/inventory, public contract, or production profile.
- No dependency, lockfile, workflow, CI manifest, policy, migration, public
  service/tool/MCP surface, integration, promotion, push, tag, rollout,
  release, support, or completion claim is included.

## Requested independent ruling

Authenticate c13cf0b, RED 1146c14, GREEN 63ba3e1, and the committed request
object, including trees, sole parents, subjects, exact pathsets, and the frozen
test blob. Reproduce the exact archived RED or independently rematerialize it
from Git, then run focused GREEN and the proportional 76-test lane serially.

Independently reproduce all three one-line deletion mutants. Inspect that the
double-loss path commits and reads ordinal 1 before both replies are discarded,
then latches RECOVERY_REQUIRED before SQLite publication/close so later
create/admit calls issue no Redis work. Verify allocation loss remains
unlatched, single lost-bind exact readback still succeeds, fault injection is
outside the product transcript, and all preserved Trial 2 behavior and
scope/non-claims remain true.

Return exactly reviewed_OK or reviewed_KO with substantive reproducible
findings. This request contains no coder verdict.

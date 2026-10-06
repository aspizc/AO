# Review Submission — Project V5 G/0/02 WIRING-B EPOCH-CORE STORE-BINDING (Trial 2)

## Request state and reviewer

Request state: **pending independent review**.

This request supplies no verdict. It requests a fresh independent Codex
`gpt-5.6-sol` reviewer with reasoning effort `max`. The reviewer must write
exactly one substantive result at:

`plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-2_result.md`

The coder did not create that result and does not review this candidate. The
reviewer owns the independent verdict and the matching pending index-cell
replacement under the append-only review convention.

## Candidate boundary

This is the bounded STORE-BINDING Trial 2 correction required by the Trial 1
KO. It remains a private, test-profile-only SQLite/Redis origin foundation for
durable-epoch design section 2.2. It does not modify migration `005`, the
accepted migration sets, WIRING-A behavior, or any public/production surface.

The correction makes rollback and collision non-mutating and terminal,
closes every post-disposal publication window, executes the exact submitted
Lua on disposable Redis, closes caller/dependency object boundaries, and adds
first-executable exact `KEYS`/`ARGV` guards to all three scripts.

This candidate does **not** implement or claim Redis epoch state keys,
generation/bootstrap/controller/activation/release state machines, runtime
credentials or permits, participant guards, receive/ACK/effect fencing,
recovery/rejoin, transport scripts, health/inventory, public contracts,
production profiles, online rebind/clone/move/cleanup/repair/maintenance,
integration, promotion, rollout, support, or release.

## Authenticated Trial 1 KO baseline

- Commit: `507a9d9f83791ff3a0287b4c219b13834c6792dd`.
- Tree: `c6e3ddd374383ddf8228d3eac03c8c0099ad9a77`.
- Sole parent: Trial 1 request
  `38abe53dd1893b26afcf2a9d4373c07eaa65d383`.
- Subject: `review(v5): reject G_0_2 epoch store binding Trial 1`.
- Exact review-only pathset:

```text
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-1_result.md
```

The branch, HEAD, tree, parent, subject, pathset, tracked cleanliness, and
sole untracked dependency link were authenticated before editing. Accepted
WIRING-B Design Trial 6, EPOCH-CORE/MIGRATIONS Trials 1–2, migration `005`,
the fixed migration-set foundation, and WIRING-A artifacts remain immutable.

## Frozen TDD identities

### RED

- Commit: `546107b22662595be89301e1061aaabe0813e0a6`.
- Tree: `59101120580de029008569703e929a2b00ca061b`.
- Sole parent: Trial 1 KO
  `507a9d9f83791ff3a0287b4c219b13834c6792dd`.
- Subject: `test(v5): expose G_0_2 epoch store binding Trial 2 gaps`.
- Exact pathset:

```text
M tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

- Focused test blob:
  `926a331d842c283113e29bf43297fe3fd8419f7c`.

#### RED amendment and evidence custody

The first Trial 2 RED commit was
`2b4a0aac12d7ac10939ad5dac15230301ecb679b`, tree
`8ed805f6f3bd4a99dcb4a20847cb58ac89bc176d`, sole parent
`507a9d9f83791ff3a0287b4c219b13834c6792dd`, focused test blob
`19ed1efc9b385cf8282505180357be0a4596490e`, with the same required subject
and one-test-path pathset. It was superseded by amended RED `546107b...` after
source work had begun. It is disclosed for custody only and is not credited as
the final RED object or evidence.

The amendment changed exactly two harness assertions:

1. The Redis-reply proxy counter now excludes only the unavoidable Promise
   thenable-assimilation lookup of property `then`. That lookup occurs before
   the awaited reply reaches the product boundary. Every actual reply-shape
   access remains counted and must stay zero.
2. The SQLite close counter now counts only the origin database whose filename
   is under `/g002-epoch-profile-`. This excludes the migration utility's
   legitimate temporary expected-schema database close and retains the exact
   once-only assertion for the origin under test.

The run of superseded `2b4a0aa...` and the earlier corrected-RED run made after
source work are explicitly withdrawn from final RED credit. The sole final RED
evidence below was independently materialized after this custody requirement.

Corrected RED `546107b...` was freshly archived at
`/tmp/g002-binding-corrected-red-final.4eWo9P`. Authentication proved:

```text
RED parent                         507a9d9f83791ff3a0287b4c219b13834c6792dd
RED/materialized source blob       a3a99f7f23cacae69c7cbeb58533d2b9ef2bf7de
parent source blob                 a3a99f7f23cacae69c7cbeb58533d2b9ef2bf7de
GREEN source blob                  cd4c090bbc9858bcc219a309689e21b7ff87459c
RED/materialized focused-test blob 926a331d842c283113e29bf43297fe3fd8419f7c
```

Thus the materialized corrected RED contains the exact parent source, not the
GREEN source. Only the disclosed dependency symlink was supplied. The fresh
focused command exited `1` as required: **49 tests, 29 pass, 20 semantic fail,
0 cancelled, 0 skipped, 0 todo**, Node duration **1399.342455 ms**. Its TAP log
is `/tmp/g002-binding-corrected-red-final.4eWo9P/corrected-red.tap`.

The 20 semantic failures partition exactly into **9** terminal/non-mutating
rollback-or-collision failures, **5** disposal-race failures, **1** exact
admission-envelope failure, **4** Redis-reply/SQLite-initialization boundary
failures, and **1** actual-Lua arity failure. Imports, dependencies, SQLite
setup, disposable Redis, and prior positive behavior worked; no bootstrap
failure is credited.

The RED definitions add decisive coverage for:

- counter rollback and exact-looking collision with before/after Redis state,
  no counter advance, and no later online command/success after a hard fault;
- repeated allocator ordinals latching `BINDING_COLLISION`, while a lost
  allocation reply still leaves an orphan and retries at a greater ordinal;
- deferred allocation, bind, bind-readback, and admission-read replies racing
  disposal, plus exact once-only origin database closure;
- exact plain own-data admission envelopes, rejecting proxies, accessors,
  symbols, unexpected keys, and foreign prototypes without invoking caller
  shape getters/traps;
- bounded Redis reply snapshots and closed SQLite tuple-initialization error
  mapping;
- actual submitted allocation/bind/read Lua executed by Redis 8.8 on a private
  Unix socket with exact persistent records and command transcripts;
- real authority PTTL, counter form, decimal carry, rollback, collision,
  reservation write, bind transition, and bound readback behavior; and
- missing/surplus Lua arguments returning `recovery_required` before any
  Redis read or write, verified with command statistics and state snapshots.

### GREEN candidate

- Commit: `053e722ef8ae1fa6278ea86147568b055038c75f`.
- Tree: `2f2d2f663d5b5457e7f625232a42565565ca5c60`.
- Sole parent: RED `546107b22662595be89301e1061aaabe0813e0a6`.
- Subject: `fix(v5): seal epoch store binding recovery boundaries`.
- Exact pathset:

```text
M gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js
```

The RED test blob is byte-identical at RED and GREEN:

```text
926a331d842c283113e29bf43297fe3fd8419f7c
```

The complete KO-baseline-to-GREEN technical pathset is exactly the focused
test and the one private source above. No migration, policy, dependency,
lockfile, workflow, CI manifest, JSON, public contract, production profile,
or prior review artifact changed.

### Request handoff and evidence correction

The original committed request is
`40eb873fde626de9612667e05409286d7e847e44`, tree
`59d4961bcd422863f06967eba13312d7bddea2cf`, with GREEN as its sole parent and
subject `docs(review): request G_0_2 epoch store binding Trial 2`. It changed
exactly:

```text
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-2_to_review.md
```

The index mutation remains exactly one appended Trial 2 row with verdict
`pending`. This append-only evidence correction has the original request as
its sole parent, uses subject
`docs(review): correct G_0_2 epoch binding RED evidence`, and changes only this
request path. It does not rewrite the original request commit or alter review
status. A commit cannot contain its own commit/tree identity without a
recursive Git object dependency, so the reviewer must derive and authenticate
the correction commit and tree independently.

## Implementation and changed-source reasoning

The allocation Lua now begins with exact `2 KEYS / 6 ARGV` admission. It
receives the process-local last observed ordinal, validates both counter and
high-water values as bounded canonical decimals, and rejects a lower Redis
counter before increment or write. An existing binding key returns collision
without changing the counter. Normal allocation retains decimal-string
increment, server-selected ordinal, canonical non-TTL counter/reservation
writes, and the lost-reply orphan/strictly-greater retry behavior.

Bind and read Lua begin with exact `3 KEYS / 5 ARGV` and `3 KEYS / 4 ARGV`
guards respectively. All arity failures return `recovery_required` before a
Redis command. The existing exact authority, PTTL, type, length, counter, and
record checks remain in the atomic scripts.

The profile latches observed `RECOVERY_REQUIRED` or `BINDING_COLLISION` as an
online-terminal fault. Subsequent create/admit calls return the same taxonomy
without issuing Redis work. A transport-level lost allocation reply is not
latched because its safe specified resolution is a new, greater reservation;
a lost bind reply still resolves only through exact bound readback for the
already initialized origin.

Every Redis await now rechecks disposal before a result can create SQLite,
publish capabilities, mark an origin bound, or return admission. Allocation
may leave a permanent orphan and bind may complete remotely, but no disposed
profile publishes success. A close-once registry makes concurrent disposal
and operation cleanup close each origin database at most once.

Redis replies are copied from exact bounded plain arrays through own data
descriptors before any status/ordinal read. Proxies, accessors, symbols,
unexpected properties, prototypes, and malformed values fail closed. Store
admission similarly snapshots exactly five own data properties from a plain
object before capability resolution; caller getters and proxy shape traps are
not invoked. Ordinary spread envelopes remain admissible only because they
retain the original opaque capabilities and exact handle values.

Unknown SQLite/dependency failures during store initialization close the
origin and map to `STORE_SCHEMA_UNSUPPORTED`; recognized binding, migration,
authority, origin, and recovery codes remain unchanged. Main-qualified schema,
ledger, table, exact-row, tuple, and bound-record admission is preserved.

## Verification

| Exact command/gate | Result |
|---|---|
| Sole credited, independently materialized corrected RED `546107b...` against parent source | exit 1 required; 49 total, 29 pass, 20 semantic fail, 0 cancelled/skipped/todo; 1399.342455 ms; classes 9 rollback/collision, 5 disposal, 1 admission envelope, 4 reply/SQLite boundary, 1 Lua arity |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_store_binding.test.js` at GREEN | exit 0; 49/49 pass, 0 fail/cancelled/skipped/todo; 1296.423462 ms |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js tests/gateway/coordination_consumer_runtime.test.js tests/gateway/coordination_consumer_store_ownership.test.js` | exit 0; 76/76 pass, 0 fail/cancelled/skipped/todo; 15837.766564 ms |
| Actual-Lua malformed `KEYS` probe for missing/surplus allocation, bind, and read keys | 6/6 pass, 0 fail/skip; command-stat and state snapshots prove zero reads/writes; 216.616 ms |
| Eight isolated source mutation lanes | 8/8 mutants killed; aggregate 18 tests, 6 pass and 12 expected mutant-detecting fail, 0 cancelled/skipped/todo; aggregate Node duration 2388.571307 ms |
| `node --check` on changed source and focused test | exit 0; no output; 0.12 s wall |
| Repository-local ESLint with `--no-cache --config gateway/eslint.config.js` on changed source and focused test | exit 0; 0 diagnostics; 0.34 s wall |
| RED blob comparison | exact `926a331d842c283113e29bf43297fe3fd8419f7c` equality at RED and GREEN |
| Commit ancestry/pathsets and KO-baseline-to-GREEN `git diff --check` | exact; exit 0; no diff-check output |
| Protected policy/dependency/workflow/CI/migration/prior-review path guard | empty; pass |
| Forbidden Redis delete/unlink/expiry/decrement/TTL-write source scan | no matches; pass |

Mutation results by isolated archived candidate were:

| Mutant | Focused result | Node duration |
|---|---:|---:|
| authority PTTL guard | killed: 2 pass / 2 fail | 302.390191 ms |
| counter high-water guard | killed: 1 pass / 2 fail | 294.012866 ms |
| decimal increment carry | killed: 2 pass / 2 fail | 295.596224 ms |
| reservation write | killed: 0 pass / 1 fail | 305.436299 ms |
| bind transition | killed: 0 pass / 1 fail | 307.609865 ms |
| bound readback | killed: 0 pass / 1 fail | 297.871968 ms |
| collision counter mutation | killed: 1 pass / 2 fail | 295.398139 ms |
| first allocation arity guard | killed: 0 pass / 1 fail | 290.255755 ms |

No JSON changed, so a JSON parser gate was not applicable rather than silently
counted as a pass. Full `bash scripts/ci.sh`, shared Redis/PostgreSQL, live
integration, promotion, and release gates were deliberately not run; the
orchestrator owns those serialized lanes.

## Limitations and non-claims

- Redis evidence uses Redis 8.8 disposable processes with TCP and persistence
  disabled and a private Unix socket under `/tmp`. It is not a shared/live,
  clustered, production, crash-recovery, or deployment Redis claim.
- The deterministic injected Redis-origin factory remains trusted test fixture
  infrastructure. The profile binds its exact returned lane process-locally;
  it does not attest infrastructure-level non-cloning.
- Capabilities are deliberately non-transferable and process-local. This slice
  adds no durable capability reissuance after process exit and no maintenance
  authority.
- A transport-lost allocation may permanently orphan a reservation. There is
  deliberately no cleanup, decrement, reuse, adoption, or online repair path.
- A latched recovery/collision requires offline operator handling. This slice
  adds no online retry, rebind, clone, move, or recovery authority for those
  state faults.
- The store capability is the origin-owned immutable assignment for this
  foundation, not a WIRING-B runtime/lineage permit. Runtime lineage,
  bootstrap, epoch state, and consumer work remain later reviewed slices.
- Direct raw-database or Redis-plane corruption is outside supported
  composition. Admission detects the directed distinguishable cases and fails
  closed. Perfectly indistinguishable concurrently writable clones remain
  outside durable-epoch section 1.2's explicit non-cloning premise.
- No migration, dependency, policy, workflow, CI manifest, public API, MCP
  tool, production profile, transport, health, integration, deployment,
  promotion, tag, push, release, or support claim is included.
- The sole permitted untracked dependency entry remains:

```text
gateway/node_modules -> /home/carase/git/personal/agents-orchestrator/workspace/clones/wt-c003-t22-parser/gateway/node_modules
```

## Requested independent ruling

Authenticate the Trial 1 KO baseline, RED, GREEN, and committed request
objects, including trees, sole parents, subjects, exact pathsets, and RED blob
identity. Reproduce exact RED materialization, GREEN, proportional affected,
real-Lua malformed-arity, and mutation lanes. Inspect that all three Lua
scripts reject exact `KEYS`/`ARGV` arity before any Redis command, allocation
rejects rollback/collision without writes, lost allocation remains retryable,
and state faults latch offline. Exercise every disposal await window and exact
close-once behavior. Verify descriptor-only reply/admission snapshots,
recognized taxonomy preservation, unknown SQLite mapping, sealed `main`
admission, capability origin checks, WIRING-A immutability, forbidden-command
absence, and every limitation/non-claim. Return exactly `reviewed_OK` or
`reviewed_KO` with reproducible findings.

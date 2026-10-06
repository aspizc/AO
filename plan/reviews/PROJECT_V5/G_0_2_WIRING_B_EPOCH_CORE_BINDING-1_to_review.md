# Review Submission — Project V5 G/0/02 WIRING-B EPOCH-CORE STORE-BINDING (Trial 1)

## Request state and reviewer

Request state: **pending independent review**.

This request supplies no verdict. It requests a fresh independent Codex
`gpt-5.6-sol` reviewer with reasoning effort `max`. The reviewer must write
exactly one substantive result at:

`plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-1_result.md`

The coder did not create that result and does not review this candidate. The
reviewer owns the independent verdict and the matching pending index-cell
replacement under the append-only review convention.

## Candidate boundary

This is the bounded STORE-BINDING Trial 1 foundation required by
`02-DESIGN-durable-epoch.md` section 2.2. It adds a separately named,
test-profile-only SQLite/Redis origin issuer, injective server-side binding
allocation, exact SQLite `main` anchor insertion, exact Redis
`reserved -> bound` transition, and joint later admission through opaque
process-local capabilities.

The existing `sqlite-disposable-local-test-v1` WIRING-A profile object remains
unable to issue an epoch-store capability. No production profile or public
service/tool/MCP surface is added.

This candidate does **not** implement or claim Redis epoch state keys,
bootstrap/generation/controller/activation/release state machines, runtime
credentials or permits, participant guards, receive/ACK/effect fencing,
recovery/rejoin, transport scripts, health/inventory, public contracts,
production profiles, online rebind/clone/move/cleanup/repair/maintenance,
integration, promotion, rollout, support, or release.

## Authenticated reviewed baseline

- Reviewed migrations Trial 2 commit:
  `f904a2884f19fe5a9aafa9af58b3070a0b29059c`.
- Tree: `ac582da210e0f2ac722a4c6b6077090d1310eb60`.
- Sole parent: `485a499c78c8df304ffff07a6c745751b831758e`.
- Subject:
  `review(v5): approve G/0/02 EPOCH-CORE migrations Trial 2`.
- Its exact review-only pathset is:

```text
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_MIGRATIONS-2_result.md
```

The author branch was clean at request `485a499c78c8df304ffff07a6c745751b831758e`
apart from the disclosed untracked dependency link, authenticated the object,
tree, sole parent, ancestry, and exact pathset above, then advanced by
`git merge --ff-only`. No merge-around or rewrite occurred.

Accepted WIRING-B Design Trial 6, EPOCH-CORE/MIGRATIONS Trials 1–2, migration
`005`, the fixed migration-set foundation, and WIRING-A ownership/profile
evidence remain immutable.

## Frozen TDD identities

### RED

- Commit: `788da671ab3007f468bb571ba0eb30d7245b79a4`.
- Tree: `0b795e475d6ff8259fbe7ec5755c6385f4a3bdc9`.
- Sole parent: reviewed baseline `f904a2884f19fe5a9aafa9af58b3070a0b29059c`.
- Subject: `test(v5): expose G_0_2 epoch store binding gaps`.
- Exact pathset:

```text
A tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

- Focused test blob:
  `e90d9fcc4b5af2b64889c0c81ac2108745c247b7`.

The exact RED object was materialized with `git archive` under
`/tmp/g002-binding-red.dGeBXr`; only the disclosed dependency symlink was
supplied. The exact command was:

```text
node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

It exited `1`: **29 tests, 1 pass, 28 fail, 0 cancelled, 0 skipped,
0 todo**, Node-reported duration **138.131559 ms**. The one pass proves the
existing WIRING-A profile still cannot issue epoch authority. Every failure
is the explicit semantic assertion that the separately named test-only
store-binding foundation is missing; the existing module and all dependencies
load successfully. No import, package, worker-bootstrap, or dependency failure
is credited as RED.

The committed RED definitions independently name and exercise after GREEN:

- exact authority/counter/binding keys, canonical records, persistent writes,
  and server-selected ordinals;
- lost allocation reply/orphan reservation and strictly greater retry;
- lost bind reply/exact initialized-origin readback and fresh allocation;
- repeated ordinal, pre-existing exact-looking reserved/bound collision;
- wrong Redis types, malformed authority/counter/binding state, counter
  rollback, safe-integer overflow, and unsafe values;
- original versus foreign Redis issuer/namespace/plane capability;
- copied/spread capability, second handle, copied SQLite file, and copied
  exact-looking Redis plane;
- qualified `main` admission in the presence of TEMP/attached lookalikes;
- missing/extra rows, mutable schema, outside-set ledger, wrong allocation
  state, and valid-looking tuple mismatch; and
- command/script transcripts excluding deletion, expiry, and TTL-bearing
  replacement writes.

### GREEN candidate

- Commit: `727d4b11723cbd5acacf5e7c026a92171446e2d1`.
- Tree: `365d2635d220b6880b49ff22728b079240accaeb`.
- Sole parent: RED `788da671ab3007f468bb571ba0eb30d7245b79a4`.
- Subject: `feat(v5): bind durable epoch test store origins`.
- Exact RED-to-GREEN pathset:

```text
A gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js
M gateway/src/core/coordination_consumer_runtime_test_profile.js
```

The worktree RED test blob at GREEN is byte-identical to the RED Git object:

```text
e90d9fcc4b5af2b64889c0c81ac2108745c247b7
```

The complete reviewed-baseline-to-GREEN technical pathset is exactly the one
focused test plus those two source paths. No migration, policy, dependency,
lockfile, workflow, CI manifest, JSON, public contract, or prior review
artifact changed.

### Request handoff

The commit adding this request must have GREEN as its sole parent, use subject
`docs(review): request G_0_2 epoch store binding Trial 1`, and change exactly:

```text
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-1_to_review.md
```

The index mutation is exactly one appended Trial 1 row with verdict `pending`.
A commit cannot contain its own commit/tree identity without a recursive Git
object dependency, so the reviewer must derive and authenticate the committed
request commit, tree, parent, subject, and pathset independently.

## Implementation and changed-source reasoning

`coordination_consumer_epoch_store_binding_test_profile.js` is the one new
private test-profile foundation. Its construction receives a deterministic
Redis-origin factory, asks that factory to create the exact disposable origin
for profile-selected authority/namespace keys, retains the raw command lane in
closure, and issues an opaque `RedisAuthorityNamespaceCapability`. IDs and
matching bytes never grant authority; module-private `WeakMap` records bind
the exact profile instance, Redis origin, SQLite handle/origin, and final store
capability.

Allocation is one EVAL. It validates exact string types, persistent PTTL,
bounded lengths, canonical authority bytes, and a canonical decimal counter;
increments the counter with decimal-string arithmetic before JavaScript-unsafe
arithmetic can occur; derives the binding key from the server-selected next
ordinal; distinguishes wrong-type state from an existing string-key
collision; and writes the counter plus canonical `reserved` record with plain
non-TTL `SET`. Callers have no ordinal input.

The profile creates a new SQLite file only after allocation succeeds, applies
the exact six-entry `WIRING_B_EPOCH_SQLITE` set, and inserts exactly one
authority/namespace/ordinal/`bound` tuple into
`main.coordination_consumer_runtime_epoch_store` in an immediate transaction.
One second EVAL changes only the exact canonical `reserved` record to
`bound`. If that reply is lost, only the already initialized origin performs
the exact bounded readback EVAL; allocation never reads back or adopts an
orphan.

Later admission jointly requires the original store capability, exact SQLite
handle/origin capability, original Redis authority/namespace capability,
unchanged sealed `main` schema version and exact six-entry migration
admission, exactly one canonical main row matching the immutable tuple, and
the exact persistent `bound` Redis record through the retained raw lane.
Capability/origin failures happen before schema or Redis work as applicable.

The four-line change to
`coordination_consumer_runtime_test_profile.js` only re-exports the separately
named factory. It does not change `createSqliteDisposableRuntimeProfile`, its
returned object, its migration set, or any WIRING-A provision/owner behavior.

Closed dispositions are the accepted design taxonomy:

- `BINDING_COLLISION` for a repeated issued ordinal or existing string
  binding key;
- `RECOVERY_REQUIRED` for malformed/wrong-type/expiring Redis state,
  rollback, overflow, unsafe values, lost allocation uncertainty, or bound
  readback mismatch;
- `STORE_ORIGIN_MISMATCH` for foreign/copied SQLite or store capabilities;
- `REDIS_AUTHORITY_MISMATCH` for a foreign Redis capability or tuple/plane
  mismatch;
- `STORE_SCHEMA_UNSUPPORTED` for a changed main schema or malformed/missing/
  extra store row; and
- `MIGRATION_PROFILE_MISMATCH` from the accepted exact migration ledger/schema
  admission.

## Verification

| Exact command/gate | Result |
|---|---|
| Exact RED materialization focused command | exit 1 as required; 29 total, 1 pass, 28 semantic fail, 0 cancelled/skipped/todo; 138.131559 ms |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_store_binding.test.js` at GREEN | exit 0; 29/29 pass, 0 fail/cancelled/skipped/todo; 641.878256 ms |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js tests/gateway/coordination_consumer_runtime.test.js tests/gateway/coordination_consumer_store_ownership.test.js` | exit 0; 76/76 pass, 0 fail/cancelled/skipped/todo; 14727.494283 ms |
| `node --check` on both changed sources and the focused test | three files; exit 0; no output; 0.049578464 s wall |
| Repository-local ESLint 10.8.0 with `--no-cache --config gateway/eslint.config.js` on both changed sources and focused test | exit 0; 0 diagnostics; 0.180368827 s wall |
| RED blob worktree/object comparison | exact `e90d9fcc4b5af2b64889c0c81ac2108745c247b7` equality |
| RED/GREEN/aggregate pathset checks | exact pathsets above; exit 0 |
| Protected policy/dependency/workflow/CI/migration/prior-review path guard | empty; exit 0 |
| Forbidden Redis deletion/expiry/TTL-write source scan | no matches; `rg` exit 1 as expected |
| `git diff --check f904a288..727d4b1` | exit 0; no output |

No JSON file changed, so a JSON parser gate was not applicable rather than
silently counted as a pass. Full `bash scripts/ci.sh` was deliberately not
run; the orchestrator owns that serialized lane.

## Limitations and non-claims

- Redis behavior is exercised through a deterministic injected command-port
  fake with exact command transcripts. No real Redis server, socket, Redis
  process crash, Redis Cluster, or Lua-engine integration lane was run. The
  reviewer should inspect the Lua decimal-string, type/PTTL/length, key, and
  response logic directly and may use an isolated disposable Redis origin if
  authorized; no shared Redis may be touched.
- The injected origin factory is trusted test fixture infrastructure. The
  profile binds the exact returned lane process-locally but does not launch a
  production Redis daemon or attest infrastructure-level non-cloning.
- Capabilities are deliberately process-local. This slice adds no durable
  capability reissuance after process exit and no maintenance authority.
- The store capability is the origin-owned immutable store assignment for this
  foundation. It is not yet a WIRING-B runtime/lineage permit; runtime lineage,
  bootstrap, and epoch work are later independently reviewed slices.
- Direct code with raw database or fake-plane access can corrupt state and is
  outside supported composition; admission detects the directed distinguishable
  corruption cases and fails closed.
- Perfectly indistinguishable concurrently writable clones remain outside the
  theorem under durable-epoch section 1.2's explicit non-cloning premise.
- No live PostgreSQL, MCP/Gateway, Docker, integration, deployment, promotion,
  tag, push, release, or production-support gate ran or is implied.
- No dependency was installed or changed. The sole permitted untracked entry
  remains:

```text
gateway/node_modules -> /home/carase/git/personal/agents-orchestrator/workspace/clones/wt-c003-t22-parser/gateway/node_modules
```

## Requested independent ruling

Authenticate the reviewed baseline, RED, GREEN, and committed request objects,
including trees, sole parents, subjects, exact pathsets, and RED blob identity.
Reproduce the exact RED materialization and GREEN/affected gates. Inspect the
three Lua commands adversarially for bounded canonical decoding, persistent
key/type requirements, safe pre-overflow decimal increment, server-selected
ordinal, collision/rollback classification, and absence of destructive or
TTL-bearing writes. Verify allocation and bind reply-loss schedules, fresh
non-adoption, main-qualified sealed admission, exact capability reachability,
and every copied/foreign origin counterexample. Confirm WIRING-A is unchanged
and all limitations/non-claims remain honest. Return exactly `reviewed_OK` or
`reviewed_KO` with reproducible findings.

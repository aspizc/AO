# Independent Review Result — Project V5 G/0/02 WIRING-B EPOCH-CORE/MIGRATIONS (Trial 1)

## Verdict

**reviewed_KO**

| Severity | Count | Finding |
|---|---:|---|
| P0 | 0 | None |
| P1 | 1 | Journal-mode handling straddles the migration trust boundary: generic state writes before authentication, while WIRING-A loses the authenticated root migration's WAL effect. |
| P2 | 0 | None beyond the P1 root cause. |

The fixed literal sets, file authentication, authenticated-buffer execution,
ledger admission, schema validation, rollback, profile-local `005` schema, and
bounded regression suites otherwise held under independent inspection and
disposable probes. The P1 is nevertheless inside this checkpoint's explicit
generic/WIRING-A preservation and authenticate-before-write boundary, so Trial
1 cannot be accepted.

This is a narrow migration-foundation verdict. It does not adjudicate or
claim an epoch runtime profile, Redis allocation, bootstrap/controller state
machines, transport or effect fencing, recovery, crash/rejoin behavior,
health, inventory product surfaces, complete G/0/02 implementation,
integration, promotion, production support, rollout, or release.

## Reviewer identity and independence

- Review date: `2026-08-03`.
- Review branch: `review/V5-G-0-02-epoch-core-migrations-t1-sol`.
- Reviewer: fresh operator-appointed Codex `gpt-5.6-sol`, reasoning effort
  `max`, service tier `priority`, selected by the explicit operator override.
- Codex thread: `019fc8a8-e4b6-7d13-861a-787ba507848a`.
- Supervised tmux session:
  `ag-tr-v5-g002-epoch-core-mi-codex-reviewer`.
- Candidate authorship: none. This session did not author RED, GREEN, the
  request, or the operator clarification.
- Delegation: none. No subagent or other model was asked for a verdict.
- Independence disclosure: this is procedural same-vendor independence by a
  fresh non-author Codex session. It is not cross-vendor diversity and makes
  no such equivalence claim.
- No separate Gateway trace/task/artifact identifier was exposed to this
  reviewer session; none is invented here. The thread and supervised session
  identifiers above are the available review-session identity.

The review used the repository's `ao-build-orchestration` and
`tdd-implementation` operating rules only to enforce the immutable evidence,
TDD, independent-verdict, and explicit-path commit boundaries. It did not run
a coder/reviewer delegation loop because the authoritative reviewer mandate
forbids delegation.

## Immutable candidate authentication

The linear chain was derived from Git objects, not from the request summary:

| Object | Commit | Tree | Sole parent |
|---|---|---|---|
| RED | `972e427269a56a172b751e03e4a01ab18515aec9` | `f8e35b74d929f500deee1dc170be41cedde1c7aa` | `837206cca88686020a5e079aab8c7f3c46548263` |
| GREEN | `1787547c56a1329c261974aef1e4ae2a1ec0f62b` | `f3ea56f1e79f9fbc2f1e15d0f803cc19a8b95095` | RED |
| Request | `1304684fcc41d1a15b8bd6f8776fa280b13b29d1` | `66d426b87318dab9668c3d8994c01fc7a574ecee` | GREEN |
| Clarification | `312f522780808af3f741b89eab99dc5d377d1c8a` | `4b30c1939b7d7d31aa34d0b5b023898ed4fd47c8` | Request |

Subjects are exact:

```text
test(coordination): lock WIRING-B epoch migration sets (V5 G/0/02 EPOCH-CORE RED)
feat(coordination): isolate WIRING-B epoch migrations (V5 G/0/02 EPOCH-CORE GREEN)
docs(review): request WIRING-B epoch migration review (V5 G/0/02 Trial 1)
docs(review): clarify WIRING-B epoch migration handoff tooling (V5 G/0/02 Trial 1)
```

RED adds only:

```text
A tests/gateway/coordination_consumer_epoch_migrations.test.js
```

The RED-to-GREEN candidate is exactly:

```text
M ci/suites.json
A gateway/migrations/profiles/sqlite-redis-disposable-epoch-test-v1/005_coordination_consumer_runtime_epoch.sql
M gateway/src/core/coordination_consumer_runtime_test_profile.js
A gateway/src/core/sqlite_migration_sets.js
M gateway/src/core/state.js
M tests/gateway/coordination_consumer_epoch_migrations.test.js
```

The request commit adds only its request file. The clarification commit adds
only its clarification file. The request blob is
`8b94538b7c71db3cbbe0b6295f4eb09d0078ec01` both at request commit
`1304684` and at the pre-verdict HEAD, and an exact diff exits `0`; the
immutable request was never amended.

Accepted Design Trial 6 commit `8507fc8` is an ancestor of baseline
`837206c` (`git merge-base --is-ancestor` exit `0`). The technical candidate
contains no policy, dependency manifest/lock, public API schema, workflow,
shared-root `005`, prior review-trail, or unrelated plan mutation. The
forbidden shared-root migration and an epoch runtime profile are absent.

## Operator clarification and tooling identity

The clarification is accepted exactly as append-only evidence: the request's
claim that the dependency symlink was untouched is superseded, but the request
itself remains immutable. At review time:

```text
gateway/node_modules -> /home/carase/git/personal/agents-orchestrator/workspace/clones/wt-c003-t22-parser/gateway/node_modules
ESLint v10.8.0
better-sqlite3 11.10.0
```

The symlink is untracked and absent from RED, GREEN, request, and
clarification Git objects. It was used only as the authenticated local
dependency/tool installation and is not candidate evidence.

## Finding

### P1-01 — journal-mode handling violates both sides of the migration trust boundary

The shared loader authenticates every selected file at
`gateway/src/core/sqlite_migration_sets.js:250-252`, then wraps every pending
migration in one outer transaction at lines `268-280`. Root migration
`gateway/migrations/001_initial.sql:1-2` contains:

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
```

SQLite cannot switch a file database to WAL from inside that active
transaction. The SQL call succeeds, but the persistent journal-mode effect is
lost. The existing WIRING-A profile opens a file database, establishes only
`foreign_keys` and `busy_timeout`, and calls the loader
(`gateway/src/core/coordination_consumer_runtime_test_profile.js:141-168`).
It therefore no longer gets the root migration's WAL behavior.

The regression is exact and survives every origin path:

| Tree | Fresh WIRING-A | Reopened handle | Copied origin |
|---|---|---|---|
| RED/baseline production (`972e427` / `837206c`) | `wal` | `wal` | `wal` |
| GREEN candidate (`1787547`) | `delete` | `delete` | `delete` |

The generic caller masks the same loader defect by taking the inverse unsafe
order. It persistently sets `journal_mode = WAL` before invoking the
authenticated loader (`gateway/src/core/state.js:58-64`). In a disposable
GREEN tree I created an existing `DELETE`-mode database with a sentinel,
changed the bytes of selected root migration `001`, and called `initState`.
The loader correctly returned `MIGRATION_PROFILE_MISMATCH` and wrote no
migration ledger, but the rejected open had already changed the target file:

```json
{
  "mismatchCode": "MIGRATION_PROFILE_MISMATCH",
  "journalModeAfterRejectedOpen": "wal",
  "sentinelRows": 1,
  "migrationLedgerRows": 0
}
```

Thus neither caller satisfies the complete boundary:

- generic state preserves WAL only by mutating the target before selected
  bytes are authenticated; and
- WIRING-A authenticates first but silently remains in `DELETE` mode because
  the authenticated root PRAGMA is executed at an ineffective point.

This is not a cosmetic pragma difference. It is a persistent database
configuration mutation on rejected input and a deterministic change to the
already accepted WIRING-A store behavior. It also leaves the new application
seam unable to guarantee the semantics of its selected root migration for a
future file-backed epoch caller. The latter statement is limited to the seam;
no epoch runtime profile exists in this candidate.

#### Exact next-trial correction

1. Add RED cases which prove that a digest/path authentication failure through
   generic `initState` leaves an existing file's journal mode and schema
   unchanged and leaves global state uninitialized.
2. Add RED cases requiring fresh, reopened, and copied WIRING-A file handles
   to be `wal`, plus a direct file-backed application-seam case so migration
   `001`'s persistent effect cannot be silently suppressed.
3. Move journal-mode establishment behind successful selected-file
   authentication and database ledger/schema admission. Do not keep the
   pre-authentication `state.js` write. Preserve the atomic schema/ledger
   transaction, then establish/verify WAL before returning a trusted
   file-backed handle, including the already-complete reopen path. A failed
   migration transaction must still leave no partial schema/ledger.
4. Retain deterministic `MIGRATION_PROFILE_MISMATCH`, failed-open handle
   closure, caller ownership of successful runtime handles, generic/WIRING-A
   five-entry isolation, and epoch six-entry isolation. Rerun the same RED,
   focused, affected, lint, manifest, and path gates in the next immutable
   trial.

## Migration-set and application-seam ruling

Apart from P1-01, the new selection seam held:

- `GENERIC_APPLICATION_SQLITE` and `WIRING_A_SQLITE` are distinct deeply
  frozen five-entry objects. Each retains both root `002` entries.
- `WIRING_B_EPOCH_SQLITE` is a distinct deeply frozen six-entry object whose
  only suffix is the separately named profile-local `005`.
- Only the three exact exported object identities are admitted. Disposable
  clone, entry-clone, reorder, and path-substitution probes all rejected with
  `MIGRATION_PROFILE_MISMATCH` before creating a target object. Committed tests
  also reject extension, reduction, duplication, and traversal.
- No `readdir`, glob, environment, or mutable directory selection remains in
  the generic/WIRING-A application paths.
- Every literal path component is `lstat`-checked, final paths must be regular
  non-symlink files, real paths must match the repository root, and digests are
  checked before ledger access. Actual changed-byte, final-symlink,
  intermediate-symlink, and non-file attacks all rejected before target
  schema writes.
- A replacement performed after the final authenticated read did not change
  executed SQL: the stored authenticated `Buffer` created the epoch schema and
  the replacement marker table remained absent.
- An injected failure while executing `005` mapped to
  `MIGRATION_PROFILE_MISMATCH`, rolled the ledger and all schema changes back,
  and left the caller-owned database open and usable.

Ledger admission requires the exact duplicate-free selected prefix. The
focused suite operationally rejects duplicates, unknown IDs, missing-prefix
order, and cross-profile rows. Reopen validation rejects a missing expected
table/index, an unexpected migration-owned index, and an unexpected
migration-owned trigger in reviewer probes. Source inspection confirms the
same exact comparison covers tables, indexes, triggers, views, table owner,
and normalized stored SQL. Repeated complete opens are no-ops after
revalidation.

The state caller closes a newly opened failed database before publishing
global state. The WIRING-A profile revokes and closes only the newly issued
failed handle; successful runtime databases remain caller-owned. No separate
lifecycle defect was reproduced.

## Profile-local `005` schema ruling

The migration SHA-256 values independently recomputed from actual bytes are:

```text
260eb6663adc38eb443cd6763d0b1b5acc31e317f0fbef59373ab055d6c2920d  gateway/migrations/001_initial.sql
257cab639e9cac9c9be14d197dd9f2fdca9917acca37b13f570b028a7f6200a3  gateway/migrations/002_coordination_consumer.sql
d1be59ac7968888c30234401ea779137848a08d88ac8638c90dcf40d5fb6037d  gateway/migrations/002_lifecycle.sql
fb12640b8fd79318f1efbb31a6fb8654d3e396b5c5da0542605be6bc5802366f  gateway/migrations/003_coordination_ack_outbox.sql
38ba4d8e84dd447a176c2c4f83b96cbb416681cd077d404f4469b4a459cdd6fb  gateway/migrations/004_coordination_consumer_runtime_owner.sql
ba5cef90d2d30d89339acbf3a3fdbe3cb43815f23737a5faeb1e00c78523ea7d  gateway/migrations/profiles/sqlite-redis-disposable-epoch-test-v1/005_coordination_consumer_runtime_epoch.sql
```

The profile migration itself matches the accepted bounded schema. Operational
reviewer probes, not regex alone, established:

- the one-row protocol/binding table and its singleton, protocol, identifier,
  ordinal, allocation-state, and uniqueness constraints;
- the epoch-fence table and valid `initializing`, `active`, `fencing`,
  `recovering`, `releasing`, `released`, and `faulted` shapes;
- foreign-key rejection for a fence without an owner;
- valid `open`, `drained`, and `recovery_required` recovery-source shapes,
  invalid tuple rejection, and foreign-key rejection without a fence;
- valid `redis_pending`, `confirmed`, and `recovery_required` permanent
  release-completion shapes, invalid tuple rejection, completion-id checks,
  uniqueness, and foreign-key rejection;
- the five nullable receipt authority columns and ten nullable ACK
  claim/settlement authority columns, including valid active/recovery tuples
  and mismatched-controller rejection;
- all six exact indexes, foreign-key enforcement, exact ledger order,
  idempotent complete application, and successful close/reopen revalidation.

No shared-root `005` or separately named epoch runtime profile exists. The
schema checks do not by themselves claim the unimplemented cross-store Redis
protocol or runtime transition controller.

## TDD and executable evidence

### Committed RED

The exact RED was materialized with `git archive` under `/tmp`, with only the
clarified dependency symlink supplied. The exact command was:

```text
node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js
```

At RED `972e427` it exited `1`: **13 tests, 1 pass, 12 fail, 0 cancelled,
0 skipped, 0 todo**. This is a substantive RED, not only missing fixtures:
both generic and WIRING-A cases actually appended and applied
`999_directory_scan_canary`, and the generic and WIRING-A unknown-ledger cases
reported missing expected rejection. Other cases then failed because the
fixed-set module/profile migration correctly did not yet exist.

### GREEN and directly affected suites

| Exact command | Result |
|---|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js` | exit 0; 13 tests; 13 pass; 0 fail; 0 cancelled; 0 skipped; 0 todo |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js tests/gateway/state_init.test.js tests/gateway/sqlite_migrations.test.js tests/gateway/coordination_consumer_runtime.test.js tests/gateway/coordination_consumer_store_ownership.test.js tests/gateway/coordination_consumer_sqlite_repo.test.js tests/gateway/coordination_consumer_sqlite_integration.test.js tests/gateway/coordination_ack_outbox_sqlite.test.js` | exit 0; 202 tests; 202 pass; 0 fail; 0 cancelled; 0 skipped; 0 todo |
| `node --test --test-concurrency=1 tests/gateway/postgres_state.test.js` | exit 0; 19 tests; 10 pass; 0 fail; 0 cancelled; **9 skipped**; 0 todo |

The nine PostgreSQL skips are opt-in live Postgres tests and are not counted
or described as passes. The ten passes cover SQLite default selection, fake
PostgreSQL selection/migration/adapter behavior, and fake repository
contracts. The candidate diff leaves PostgreSQL discovery and application
logic unchanged.

### Reviewer-owned disposable probes

All probe code lived outside tracked reviewer paths in `/tmp` and ran against
a disposable GREEN materialization:

| Probe | Result |
|---|---|
| `node /tmp/g002_epoch_adversarial.mjs /tmp/g002-epoch-green.r7CuK9` | exit 0 before the separately reported WAL comparison; 4 real path attacks rejected before writes, authenticated buffer survived replacement, injected failure rolled back, 7 fence phases and all 3+3 recovery/release states admitted, FK/authority checks and 6 indexes operational, reopen validated; WIRING-A fresh/open/copy each reported `delete` |
| `node /tmp/g002_epoch_schema_tamper.mjs /tmp/g002-epoch-green.r7CuK9` | exit 0; missing table, missing index, unexpected owned-table index, and unexpected owned-table trigger all rejected deterministically |
| `node /tmp/g002_epoch_set_identity.mjs /tmp/g002-epoch-green.r7CuK9` | exit 0; 4 clone/entry-clone/reorder/substitution cases rejected before writes |
| `node /tmp/g002_epoch_preauth_write.mjs /tmp/g002-epoch-green.r7CuK9` | exit 0; reproduced P1 pre-authentication persistent WAL mutation shown above |
| Baseline versus candidate WIRING-A fresh/open/copy journal probe | baseline `wal/wal/wal`; candidate `delete/delete/delete` |
| Generic successful state journal probe | candidate generic state remains `wal`, confirming that its caller-side pre-write masks the shared-loader defect |

## Static, manifest, and scope gates

| Gate | Result |
|---|---|
| `node --check` on the three changed/new source files and focused test | 4 commands, all exit 0 |
| Repository-local ESLint v10.8.0 on the exact three source paths and focused test | exit 0; 0 ESLint errors; 0 ESLint warnings |
| Repository-local ESLint v10.8.0 on `gateway/src gateway/tests gateway/scripts` | exit 0; 0 ESLint diagnostics |
| `python3 -m json.tool ci/suites.json` and `ci/suites-contract.json` | both exit 0 |
| `python3 scripts/ci_gate.py --repo-root . --validate-only` | exit 0; status passed; 0 executed tests |
| `python3 scripts/ci_gate.py --repo-root . --refresh-inventory` in disposable GREEN tree | exit 0; status passed; refreshed file byte-identical, SHA-256 `f6f619028473c2ffc9831f610d7a74d544d3478cd6ec3cb87d57b2492a68ef58` |
| `sha256sum` on all six selected files | exit 0; exact values listed above |
| `git diff --check` on RED-to-GREEN, GREEN-to-request, request-to-clarification, and the pre-verdict worktree | all exit 0 |
| Candidate path/policy/dependency/workflow/shared-root/prior-trail guards | exit 0; no out-of-scope path found |

`ci/suites.json` changes only the `lint.gateway` and `test.gateway`
`inventorySha256` fields. An independent refresh in the disposable candidate
tree produced no byte change, and `ci/suites-contract.json` is unchanged.

Some sandboxed Node/Python invocations printed three
`Failed to create stream fd: Operation not permitted` environment lines while
still exiting `0`; repository-local ESLint itself emitted no lint diagnostic.
Those sandbox messages are not restated as lint warnings or hidden as gate
failures.

Before this result was written, tracked status was clean and the only status
entry was the clarified allowed untracked `gateway/node_modules` symlink.

## Explicit limitations and unrun lanes

The following evidence is absent and is not converted into a pass:

- full `bash scripts/ci.sh` was not run;
- the full manifest `test.gateway` suite beyond the named 202-test directly
  affected aggregate was not run;
- broad repository Python CLI, orchestrator-langgraph, end-to-end Gateway/MCP,
  Docker/deployment, and release lanes were not run;
- no live Redis lane, live Redis race lane, or real Redis smoke/E2E was run;
- all nine opt-in live PostgreSQL cases were skipped because the live lane was
  not enabled; no live Postgres claim is made;
- no full standalone mutation matrix, coverage lane, or broad long-running
  stress campaign was run; the review used the named committed tests and
  bounded disposable adversarial probes above;
- no production profile, network VFS, online upgrade of a WIRING-A store,
  crash recovery, automatic takeover, rejoin, rollout, tag, or push was
  exercised.

The result therefore records only the bounded candidate evidence and P1-01.
An OK in a later immutable trial will require the exact correction and scoped
gates above; it will still not imply integration, promotion, support, rollout,
or release.

# Review Submission — Project V5 G/0/02 WIRING-B EPOCH-CORE migrations (Trial 2)

## Request state and reviewer

Request state: **pending independent review**.

This request supplies no verdict. It requests a fresh independent Codex
`gpt-5.6-sol` reviewer with reasoning effort `max`. The reviewer must write
exactly one substantive result at:

`plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_MIGRATIONS-2_result.md`

The coder did not create that result and does not review this candidate. The
reviewer owns the independent verdict and the matching pending index-cell
replacement under the repository's append-only convention.

## Candidate boundary

This is the narrow correction for the sole Trial 1 P1 journal-mode finding.
It moves persistent WAL establishment behind selected-file authentication and
ledger/schema admission, verifies the result before a trusted file-backed
handle returns, and preserves SQLite's real `memory` journal mode for
in-memory databases.

It does **not** implement or claim an epoch runtime profile, Redis allocation,
bootstrap/controller transitions, transport or effect fencing, recovery,
crash/rejoin behavior, health, inventory product surfaces, complete G/0/02,
integration, promotion, rollout, production support, or release.

## Authenticated baseline and prior evidence

- Trial 1 independent KO commit:
  `a359e26284e1c030a29a430553b4137de4eb915f`.
- Trial 1 KO tree:
  `6f3da8fd228f51301d88c39f7fb389c1988e191e`.
- Trial 1 KO sole parent:
  `312f522780808af3f741b89eab99dc5d377d1c8a`.
- Trial 1 KO subject:
  `review(v5): reject G/0/02 EPOCH-CORE migrations Trial 1`.
- The KO commit changes exactly the Trial 1 result plus its index row.
- Accepted Design Trial 6 result commit:
  `8507fc8d9014cad6fb773391f0b83b9d95e994af`.
- `git merge-base --is-ancestor 8507fc8 a359e262`: exit `0`.
- Accepted WIRING-A Trial 6 result commit:
  `e90fb8a85c6bc7b7020d301475354ac438f119d8`.
- Branch: `feat/V5-G-0-02-wiring-b-epoch-core`.

The full Trial 1 request, operator clarification, and result remain immutable.
This trial changes none of them.

## Frozen TDD identities

### RED

- Commit: `47ddae5282391f59534a6769067c657949751778`.
- Tree: `bd562118e0752fb5d4ab126767f3ba668c8af062`.
- Sole parent: `a359e26284e1c030a29a430553b4137de4eb915f`.
- Subject:
  `test(coordination): expose pre-auth WAL mutation (V5 G/0/02 EPOCH-CORE Trial 2 RED)`.
- Exact path set:

```text
M tests/gateway/coordination_consumer_epoch_migrations.test.js
```

The exact RED command was:

```text
node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js
```

It exited `1`: **19 tests, 15 pass, 4 fail, 0 cancelled, 0 skipped,
0 todo**. The four failures were operational distinctions:

1. rejected generic initialization changed an existing file from `delete` to
   `wal` before the selected migration digest failed;
2. WIRING-A fresh, reopened, and copied handles reported
   `delete/delete/delete` instead of `wal/wal/wal`;
3. direct file application reported `delete` both after initial application
   and after an already-complete reopen; and
4. an injected non-WAL pragma result observed zero WAL attempts and no
   rejection, rather than one verified attempt and
   `MIGRATION_PROFILE_MISMATCH`.

The later-migration rollback and in-memory semantics cases already passed at
RED. They preserve accepted Trial 1 behavior rather than manufacture a
regression: the injected later failure left no schema/ledger object and kept
the caller-owned handle open, while `:memory:` remained `memory`.

### GREEN candidate

- Commit: `97da2c1bf829890a8d9a26f0462b0ca0b16439b9`.
- Tree: `d6230d345c007fbe863640048701fcbed1da5d45`.
- Sole parent: `47ddae5282391f59534a6769067c657949751778`.
- Subject:
  `fix(coordination): authenticate before establishing WAL (V5 G/0/02 EPOCH-CORE Trial 2 GREEN)`.
- Exact parent-to-candidate path set:

```text
M gateway/src/core/sqlite_migration_sets.js
M gateway/src/core/state.js
```

The complete Trial 2 technical path set from the KO baseline is therefore the
focused test plus those two source files. No migration, profile, manifest,
contract, policy, dependency, workflow, public schema, or prior review
artifact changes in the technical candidate.

### Request handoff

The commit adding this request must have GREEN as its sole parent, use subject
`docs(review): request WIRING-B epoch migration review (V5 G/0/02 Trial 2)`,
and change exactly:

```text
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_MIGRATIONS-2_to_review.md
M plan/PROJECT_V5/reviews/README.md
```

The index mutation is exactly one appended Trial 2 pending row. A commit
cannot contain its own commit/tree identity without a recursive object
dependency, so the reviewer must derive and authenticate the committed
request commit/tree/parent/subject/path set independently.

## What changed

- `state.js` no longer executes persistent `journal_mode = WAL` before the
  selected files are authenticated.
- `applySqliteMigrationSet` still authenticates every selected path and digest
  before target ledger/schema access.
- Pending schema and ledger work remains one outer transaction using the
  already authenticated buffers.
- After exact schema/ledger admission or successful transaction commit, the
  seam establishes `journal_mode = WAL` on a file-backed database and requires
  the observed result to be exactly `wal` before returning.
- The already-complete reopen path performs the same schema validation and WAL
  establishment/verification.
- A non-WAL result or pragma failure is deterministic
  `MIGRATION_PROFILE_MISMATCH`; the direct caller retains ownership of its
  open handle, while existing state/profile callers close only their newly
  issued failed handle and publish no global/profile capability.
- In-memory databases skip file-WAL establishment and retain SQLite's actual
  `memory` journal mode.

No new abstraction or production surface was introduced outside the existing
migration seam.

## WAL and authentication evidence

- A file database was created in `delete` mode with one sentinel table/row and
  no migration ledger. A changed selected migration digest through generic
  `initState` returned `MIGRATION_PROFILE_MISMATCH`; the rejected handle was
  observed closed, `getDb()` remained uninitialized, the journal remained
  `delete`, the schema remained byte-for-byte equivalent at `sqlite_master`,
  the sentinel remained, and no ledger appeared.
- WIRING-A create, `openHandle`, and `copyStore` each returned a file-backed
  handle whose observed mode was exactly `wal`.
- Direct application established `wal` on a fresh file. After an external
  downgrade to `delete`, complete-set reapplication restored and verified
  `wal` while retaining the exact five applied IDs.
- A file-backed pragma stub returning `delete` was called exactly once and
  caused `MIGRATION_PROFILE_MISMATCH`; the caller-owned database remained
  open.
- An injected failure in later root migration `002_coordination_consumer`
  caused `MIGRATION_PROFILE_MISMATCH`, left the caller-owned database open in
  `delete` mode, and rolled back every schema and ledger object.
- Direct in-memory application completed the exact five-entry set and observed
  journal mode `memory`, not a false WAL claim.

## Preserved Trial 1 boundaries

The correction does not reopen the independently accepted Trial 1 evidence:

- exact identity-only admission for the three distinct deeply frozen sets;
- generic/WIRING-A five-entry and epoch six-entry isolation, including both
  root `002` migrations and only profile-local `005` for the epoch set;
- literal path/digest authentication, symlink/non-file/traversal rejection,
  no directory discovery, and authenticated-buffer execution;
- duplicate-free exact-prefix ledger admission and exact applied schema
  revalidation;
- one atomic schema/ledger transaction and rollback on a later failure;
- deterministic `MIGRATION_PROFILE_MISMATCH`;
- failed state/profile handle closure, global-state non-publication, and
  caller ownership of successful/direct handles;
- exact profile-local `005` schema/digest and absence of shared-root `005`;
  and
- unchanged PostgreSQL selection, migrations, and adapter behavior.

The six selected migration digests remain:

```text
260eb6663adc38eb443cd6763d0b1b5acc31e317f0fbef59373ab055d6c2920d  gateway/migrations/001_initial.sql
257cab639e9cac9c9be14d197dd9f2fdca9917acca37b13f570b028a7f6200a3  gateway/migrations/002_coordination_consumer.sql
d1be59ac7968888c30234401ea779137848a08d88ac8638c90dcf40d5fb6037d  gateway/migrations/002_lifecycle.sql
fb12640b8fd79318f1efbb31a6fb8654d3e396b5c5da0542605be6bc5802366f  gateway/migrations/003_coordination_ack_outbox.sql
38ba4d8e84dd447a176c2c4f83b96cbb416681cd077d404f4469b4a459cdd6fb  gateway/migrations/004_coordination_consumer_runtime_owner.sql
ba5cef90d2d30d89339acbf3a3fdbe3cb43815f23737a5faeb1e00c78523ea7d  gateway/migrations/profiles/sqlite-redis-disposable-epoch-test-v1/005_coordination_consumer_runtime_epoch.sql
```

## Verification

| Exact command | Result |
|---|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js` | post-GREEN exit 0; 19 tests; 19 pass; 0 fail; 0 cancelled; 0 skipped; 0 todo |
| Same command with `--test-name-pattern='generic authentication\|WIRING-A fresh\|file-backed application\|later migration\|in-memory application'` | exit 0; 6 selected tests; 6 pass; 0 fail; 0 cancelled; 0 skipped; 0 todo |
| `node --test --test-concurrency=1` with the same eight affected files recorded in Trial 1 | exit 0; 208 tests; 208 pass; 0 fail; 0 cancelled; 0 skipped; 0 todo. The prior 202 total increased only by the six new focused tests. |
| `node --test --test-concurrency=1 tests/gateway/postgres_state.test.js` | exit 0; 19 tests; 10 pass; 0 fail; 0 cancelled; **9 skipped**; 0 todo. The skips are the opt-in live PostgreSQL lane and are not passes. |
| Repository-local ESLint v10.8.0 on the two changed sources and focused test | exit 0; 0 diagnostics |
| Repository-local ESLint v10.8.0 on `gateway/src gateway/tests gateway/scripts` | exit 0; 0 diagnostics |
| `node --check` on both changed source files and the focused test | three direct commands, all exit 0 |
| `python3 -m json.tool ci/suites.json` and `ci/suites-contract.json` | both direct commands exit 0 |
| `python3 scripts/ci_gate.py --repo-root . --validate-only` | exit 0; status passed; 0 executed tests |
| `python3 scripts/ci_gate.py --repo-root . --refresh-inventory` | exit 0; status passed; `ci/suites.json` remained byte-identical before/after at SHA-256 `f6f619028473c2ffc9831f610d7a74d544d3478cd6ec3cb87d57b2492a68ef58` |
| `sha256sum` on all six selected migration files | exit 0; exact values listed above |
| Shared-root `005` and epoch runtime-profile absence checks | both exit 0 |
| KO-to-GREEN policy/dependency/workflow/contract guards and `git diff --check` | exit 0; no out-of-scope path or whitespace error |

One first static-check batch was constructed by a local orchestration wrapper
that escaped embedded newlines as the literal characters `n`. It produced
non-product errors such as `sqlite_migration_sets.jsnnode`, JSON-tool extra
arguments, `test: too many arguments`, and ambiguous revision
`97da2c1ngit`. No candidate command ran under those malformed tokens. The
exact syntax, JSON, absence, object, scope, and diff commands were immediately
rerun directly and all exited `0`, as recorded above. This attribution is
retained rather than presenting a silent retry as first-pass evidence.

## Process and explicit limitations

- The prompt-listed `.claude/skills/tdd-implementation/SKILL.md` is absent at
  this commit. The available repository-local
  `.codex/skills/tdd-implementation/SKILL.md` was read completely and used;
  no nonexistent path is claimed.
- Full `bash scripts/ci.sh` was not run. The orchestrator owns the serialized
  aggregate gate.
- No live Redis, live Redis race, live MCP/Gateway, Docker, deployment, or
  release lane was run.
- The nine opt-in live PostgreSQL tests were skipped; no live PostgreSQL claim
  is made.
- No dependency was installed or changed. The permitted untracked
  `gateway/node_modules` link remains outside every commit.
- No production profile, network VFS, online WIRING-A upgrade, crash/rejoin,
  automatic takeover, rollout, tag, push, integration, promotion, support, or
  release was exercised or claimed.

## Requested independent ruling

Authenticate the KO, RED, GREEN, and committed handoff objects; reproduce the
four RED distinctions and the two preservation cases; adversarially verify
that no persistent WAL mutation precedes selected-file authentication and
schema/ledger admission; verify file fresh/reopen/copy/direct and in-memory
semantics; rerun the affected and static gates; and return exactly
`reviewed_OK` or `reviewed_KO` with reproducible findings.

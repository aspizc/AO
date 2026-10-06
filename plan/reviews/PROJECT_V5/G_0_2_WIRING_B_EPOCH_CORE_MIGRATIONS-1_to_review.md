# Review Submission — Project V5 G/0/02 WIRING-B EPOCH-CORE migrations (Trial 1)

## Request state and reviewer

Request state: **pending independent review**.

This request supplies no verdict. It requests a fresh independent Codex
`gpt-5.6-sol` reviewer with reasoning effort `max` and service tier `priority`.
The reviewer must write exactly one substantive result at:

`plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_MIGRATIONS-1_result.md`

The coder did not update either review index. The reviewer owns the verdict
row under the repository's current convention.

## Candidate boundary

This is the first bounded implementation checkpoint of EPOCH-CORE. It builds
only fixed SQLite migration-set selection, generic/WIRING-A isolation, the
profile-local epoch migration schema, and the internal application seam needed
by a later separately named epoch profile.

It does **not** implement or claim an epoch profile, Redis allocation, origin
binding at runtime, bootstrap/controller state machines, transport/effect
fencing, recovery, crash/rejoin behavior, health, inventory product surfaces,
production support, integration, promotion, rollout, or release.

Accepted design authentication was checked before editing:

- Design Trial 6 result commit: `8507fc8`; verdict `reviewed_OK`.
- Branch baseline: `837206cca88686020a5e079aab8c7f3c46548263`.
- `git merge-base --is-ancestor 8507fc8 837206cca88686020a5e079aab8c7f3c46548263`:
  exit `0`.
- Branch: `feat/V5-G-0-02-wiring-b-epoch-core`.

## Frozen TDD identities

### RED

- Commit: `972e427269a56a172b751e03e4a01ab18515aec9`.
- Tree: `f8e35b74d929f500deee1dc170be41cedde1c7aa`.
- Sole parent: `837206cca88686020a5e079aab8c7f3c46548263`.
- Subject:
  `test(coordination): lock WIRING-B epoch migration sets (V5 G/0/02 EPOCH-CORE RED)`.
- Exact path set:
  `A tests/gateway/coordination_consumer_epoch_migrations.test.js`.

### GREEN candidate

- Commit: `1787547c56a1329c261974aef1e4ae2a1ec0f62b`.
- Tree: `f3ea56f1e79f9fbc2f1e15d0f803cc19a8b95095`.
- Sole parent: `972e427269a56a172b751e03e4a01ab18515aec9`.
- Subject:
  `feat(coordination): isolate WIRING-B epoch migrations (V5 G/0/02 EPOCH-CORE GREEN)`.
- Exact parent-to-candidate path set:

```text
M ci/suites.json
A gateway/migrations/profiles/sqlite-redis-disposable-epoch-test-v1/005_coordination_consumer_runtime_epoch.sql
M gateway/src/core/coordination_consumer_runtime_test_profile.js
A gateway/src/core/sqlite_migration_sets.js
M gateway/src/core/state.js
M tests/gateway/coordination_consumer_epoch_migrations.test.js
```

`ci/suites.json` changes only the `lint.gateway` and `test.gateway`
`inventorySha256` values. `ci/suites-contract.json` is unchanged.

### Request handoff

- Required subject:
  `docs(review): request WIRING-B epoch migration review (V5 G/0/02 Trial 1)`.
- Required sole parent:
  `1787547c56a1329c261974aef1e4ae2a1ec0f62b`.
- Required path set: exactly this added request file.

A commit cannot contain its own commit/tree identity without a recursive Git
object dependency. The reviewer must therefore derive the committed handoff
commit and tree, require the exact parent/path/subject above, and record those
derived immutable identities in the result. No mutable working-tree summary is
authority for the handoff identity.

## What was implemented

- `sqlite_migration_sets.js` exposes three distinct deeply frozen arrays and
  one application function. The application function accepts only those exact
  set objects; caller clones, extensions, reductions, reordered entries, and
  path substitutions reject as `MIGRATION_PROFILE_MISMATCH`.
- The five-entry generic and WIRING-A sets explicitly retain both root `002`
  migrations. Only the six-entry epoch set appends the profile-local `005`.
- Every selected file is resolved from its literal repository-relative path.
  Every path component is checked with `lstat`, symlinks/non-files/traversal
  reject, and SHA-256 is verified before the target database enters a write
  transaction.
- Applied migration rows must be a duplicate-free exact prefix of the selected
  IDs. Unknown, duplicate, out-of-order, missing-prefix, and cross-profile rows
  reject. Already-applied table/index definitions and unexpected triggers on
  migration-owned tables are validated before a suffix is applied.
- Generic `state.js` selects only `GENERIC_APPLICATION_SQLITE`, closes a failed
  SQLite open, and leaves PostgreSQL discovery/application unchanged.
- The existing disposable WIRING-A profile selects only `WIRING_A_SQLITE` on
  create, reopen, and copied-origin opens. A validation failure closes only the
  newly issued handle. Runtime databases remain caller-owned.
- Profile-local migration `005` creates the store binding, epoch fence,
  recovery-source, and permanent release-completion tables; exact phase/state
  checks; nullable receipt/ACK claim and settlement authority shapes; and six
  supporting indexes. It records only
  `005_coordination_consumer_runtime_epoch` in `main.schema_migrations`.
- No shared-root `005` and no epoch runtime profile were created.

## Literal migration identities

```text
260eb6663adc38eb443cd6763d0b1b5acc31e317f0fbef59373ab055d6c2920d  gateway/migrations/001_initial.sql
257cab639e9cac9c9be14d197dd9f2fdca9917acca37b13f570b028a7f6200a3  gateway/migrations/002_coordination_consumer.sql
d1be59ac7968888c30234401ea779137848a08d88ac8638c90dcf40d5fb6037d  gateway/migrations/002_lifecycle.sql
fb12640b8fd79318f1efbb31a6fb8654d3e396b5c5da0542605be6bc5802366f  gateway/migrations/003_coordination_ack_outbox.sql
38ba4d8e84dd447a176c2c4f83b96cbb416681cd077d404f4469b4a459cdd6fb  gateway/migrations/004_coordination_consumer_runtime_owner.sql
ba5cef90d2d30d89339acbf3a3fdbe3cb43815f23737a5faeb1e00c78523ea7d  gateway/migrations/profiles/sqlite-redis-disposable-epoch-test-v1/005_coordination_consumer_runtime_epoch.sql
```

## TDD and negative evidence

The committed RED command was:

```text
node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js
```

At the RED tree it exited `1`: 13 tests, 1 pass, 12 fail, 0 cancelled,
0 skipped. The two directory-canary cases showed the generic and WIRING-A
loaders actually applying `999_directory_scan_canary`; unknown applied rows
were accepted; the fixed-set module and profile migration were absent. These
were operational failures, not a prospective test list.

At the GREEN candidate the same command exits `0`: 13 tests, 13 pass, 0 fail,
0 cancelled, 0 skipped.

Executable negative cases cover:

- directory-scan canaries for generic and WIRING-A selection;
- caller extension, reduction, duplicate entry, and traversal attempts;
- changed migration bytes, symlink and non-file entries, each before any
  target schema write;
- duplicate, unknown, non-prefix, and profile-only applied ledger rows;
- missing expected indexes and unexpected migration-table triggers;
- generic/WIRING-A fresh, existing, and reopened isolation;
- epoch fresh/reopened exact order and schema constraints; and
- invalid store singleton, epoch phase, recovery-source state, completion ID,
  receipt authority, and ACK settlement authority shapes.

Literal source checks are used only to prove that reviewed digests are written
as literals. Digest mismatch and all filesystem/database behavior are tested
operationally. No standalone source-mutant runner is claimed in this bounded
checkpoint.

## Verification

| Exact command | Result |
|---|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js tests/gateway/state_init.test.js tests/gateway/sqlite_migrations.test.js tests/gateway/coordination_consumer_runtime.test.js tests/gateway/coordination_consumer_store_ownership.test.js tests/gateway/coordination_consumer_sqlite_repo.test.js tests/gateway/coordination_consumer_sqlite_integration.test.js tests/gateway/coordination_ack_outbox_sqlite.test.js` | exit 0; 202 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js` | post-commit exit 0; 13 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/postgres_state.test.js` | post-commit exit 0; 10 pass, 0 fail, 0 cancelled, 9 skipped; skips are the opt-in live Postgres lane |
| `node gateway/node_modules/eslint/bin/eslint.js --config gateway/eslint.config.js --no-cache gateway/src/core/sqlite_migration_sets.js gateway/src/core/state.js gateway/src/core/coordination_consumer_runtime_test_profile.js tests/gateway/coordination_consumer_epoch_migrations.test.js` | exit 0; 0 errors, 0 warnings |
| `node node_modules/eslint/bin/eslint.js --config eslint.config.js --no-cache src tests scripts ../tests/gateway/coordination_consumer_epoch_migrations.test.js` from `gateway/` | exit 0; 0 errors, 1 warning that the extra root test argument is outside that config's base; Gateway `src tests scripts` passed |
| `python3 scripts/ci_gate.py --repo-root . --refresh-inventory` | exit 0; status passed; 0 tests; changed only two inventory digests |
| `python3 scripts/ci_gate.py --repo-root . --validate-only` | exit 0; status passed; 0 tests |
| `python3 -m json.tool ci/suites.json` | exit 0 |
| `node --check` on the three changed/new source files and the focused test | four commands, all exit 0 |
| `sha256sum` on all six selected migration files | exit 0; exact values listed above |
| `test ! -e gateway/migrations/005_coordination_consumer_runtime_epoch.sql` | exit 0 |
| `test ! -e gateway/src/core/coordination_consumer_runtime_epoch_test_profile.js` | exit 0 |
| `git diff --check` | exit 0 |

The ordinary `npm run lint -- --no-cache ...` wrapper was also attempted. It
exited `2` before linting because this checkout's untracked dependency symlink
has no `.bin/eslint`, so npm fell back to system ESLint `v6.4.0`, which cannot
load the ESM flat config. The repository-local ESLint `v10.8.0` commands above
are the completed lint evidence.

## Scope and limitations

- No live Redis lane and no full `bash scripts/ci.sh` were run, per the coder
  sandbox instruction. The orchestrator owns serialized host gates.
- Nine live PostgreSQL tests were explicitly skipped; fake PostgreSQL and
  selection coverage passed. PostgreSQL migration behavior was not changed.
- `policies/`, `ci/suites-contract.json`, public MCP schemas, dependency
  manifests/locks, shared-root migrations, prior review artifacts, and
  unrelated plan files are unchanged.
- The pre-existing untracked `gateway/node_modules` symlink remains untouched
  and is not part of either candidate commit.
- This candidate provides no evidence for automatic crash recovery or rejoin.
  WIRING-A remains the built non-expiring test-profile behavior; the separately
  named WIRING-B epoch profile and every runtime protocol above this migration
  foundation remain unimplemented.

## Requested independent ruling

Authenticate the RED, GREEN, and handoff Git objects; review the exact six-path
candidate; rerun the focused and directly affected serial tests; verify every
literal path/digest/order and negative case; inspect the exact `005` checks and
indexes; confirm generic/WIRING-A/profile isolation and PostgreSQL preservation;
and return exactly `reviewed_OK` or `reviewed_KO` with reproducible findings.

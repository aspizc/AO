# Independent Review Result — Project V5 G/0/02 WIRING-B EPOCH-CORE/MIGRATIONS (Trial 2)

## Verdict

**reviewed_OK**

Candidate findings:

| Severity | Count | Finding |
|---|---:|---|
| P0 | 0 | None |
| P1 | 0 | None |
| P2 | 0 | None |

Non-candidate request-evidence defects:

| Severity | Count | Finding |
|---|---:|---|
| P0 | 0 | None |
| P1 | 0 | None |
| P2 | 1 | The handoff's printed escaped name-pattern selects zero tests rather than the claimed six; the intended unescaped JavaScript-regex alternation independently passed 6/6. |

Trial 2 closes the sole Trial 1 P1. Selected paths and bytes are authenticated
before target ledger/schema access; exact ledger/schema admission and the
atomic migration transaction precede persistent WAL establishment; every
trusted file-backed return verifies the observed mode as exactly `wal`; and
real in-memory SQLite remains `memory`. Generic rejection mutates no journal,
schema, sentinel, or ledger before authentication, closes the rejected handle,
and publishes no global state.

The post-transaction WAL-failure schedule is also closed. A WAL failure is a
deterministic `MIGRATION_PROFILE_MISMATCH`, never success. State/profile
callers close or revoke the new handle and publish no capability; the direct
seam preserves caller ownership. The already authenticated, atomically
committed schema/ledger can be revalidated and the identical WAL step retried.
No inconsistent public state or trust-boundary blocker was reproduced.

This verdict reviews only the bounded migration foundation. It does not claim
an epoch runtime profile, Redis allocation, bootstrap/controller transitions,
transport/effect fencing, automatic recovery, crash/rejoin behavior, health,
inventory, complete G/0/02 implementation, integration, promotion, production
support, rollout, or release.

## Reviewer identity and instruction route

- Review date: `2026-08-03`.
- Review branch:
  `review/V5-G-0-02-epoch-core-migrations-t2-sol`.
- Reviewer: operator-appointed Codex `gpt-5.6-sol`, reasoning effort `max`,
  service tier `priority`, role `reviewer`.
- Task:
  `ts-998be412-1969-47c1-b519-766fe2180dee`.
- Trace:
  `tr-tr-v5-g002-epoch-core-mi-bba1d46b-bdc8-41d1-8684-a679fe21e68f`.
- Candidate authorship: none. This session did not author the KO, RED, GREEN,
  request, or prior evidence.
- Delegation: none. No subagent or other model was used.
- Independence disclosure: this is fresh, same-vendor procedural independence,
  not cross-vendor diversity.

`AGENTS.md`, `.claude/orchestration-profile.md`, `plan/README.md`, the G stage
and sheet, the complete 2,513-line durable-epoch design, accepted Design Trial
6 and WIRING-A Trial 6 requests/results, and both migration trials were read
completely. The repository-local `.codex/skills/ao-build-orchestration/SKILL.md`
and `.codex/skills/tdd-implementation/SKILL.md` were used. The former is
byte-identical to `.claude/skills/ao-build-orchestration/SKILL.md`; no
`.claude/skills/tdd-implementation/SKILL.md` exists at this commit, so the
available `.codex` path is the honest instruction-path substitution.

## Immutable object authentication

The required chain was derived directly from Git:

| Object | Commit | Tree | Sole parent |
|---|---|---|---|
| Trial 1 KO | `a359e26284e1c030a29a430553b4137de4eb915f` | `6f3da8fd228f51301d88c39f7fb389c1988e191e` | `312f522780808af3f741b89eab99dc5d377d1c8a` |
| Trial 2 RED | `47ddae5282391f59534a6769067c657949751778` | `bd562118e0752fb5d4ab126767f3ba668c8af062` | Trial 1 KO |
| Trial 2 GREEN | `97da2c1bf829890a8d9a26f0462b0ca0b16439b9` | `d6230d345c007fbe863640048701fcbed1da5d45` | Trial 2 RED |
| Trial 2 request | `485a499c78c8df304ffff07a6c745751b831758e` | `c6c64356db818933feb8dac8f1e45adbf1409fc9` | Trial 2 GREEN |

Subjects match the request exactly. RED changes only:

```text
M tests/gateway/coordination_consumer_epoch_migrations.test.js
```

RED-to-GREEN changes only:

```text
M gateway/src/core/sqlite_migration_sets.js
M gateway/src/core/state.js
```

The complete Trial 2 technical pathset from the KO is therefore exactly that
focused test and those two sources. The request changes only:

```text
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_MIGRATIONS-2_to_review.md
```

Its index diff is one appended Trial 2 row whose verdict cell was `pending`.
Accepted Design Trial 6 result `8507fc8d9014cad6fb773391f0b83b9d95e994af`
and accepted WIRING-A Trial 6 result
`e90fb8a85c6bc7b7020d301475354ac438f119d8` are both ancestors of the request.
The Trial 1 request, operator clarification, and result compare byte-identical
between the Trial 1 KO and Trial 2 request.

Tracked state was clean before this result. The only status entry was the
disclosed untracked dependency symlink:

```text
gateway/node_modules -> /home/carase/git/personal/agents-orchestrator/workspace/clones/wt-c003-t22-parser/gateway/node_modules
```

No policy, dependency manifest/lock, workflow, public schema/contract,
`ci/suites.json`, `ci/suites-contract.json`, migration, prior review artifact,
or shared-root `005` changes in the Trial 2 technical candidate.

## TDD RED and dependency authentication

The exact RED commit was materialized with `git archive` under
`/tmp/g002-t2-red-review.5uo7z9`. The only supplied path was the dependency
symlink above. RED's package manifests recomputed to:

```text
eb48688f805cb62f4e122b6f4319ae310ca12befc6c8782f3eda55f71ed2be4f  gateway/package.json
71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0  gateway/package-lock.json
```

The dependency target worktree's current manifests have drifted and were not
credited as provenance. Instead, its installed
`node_modules/.package-lock.json` was compared directly with the exact RED
lock: all 197 non-root package records matched, with zero missing, extra, or
mismatched version/integrity/resolution/dependency records. The exercised
versions were `better-sqlite3 11.10.0` and ESLint `10.8.0`.

The exact RED command was:

```text
node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js
```

It exited `1` with **19 tests, 15 pass, 4 fail, 0 cancelled, 0 skipped**. The
four operational failures were independently observed as:

1. rejected generic initialization changed `delete` to `wal` before the
   selected digest failed;
2. WIRING-A fresh/reopened/copied handles were
   `delete/delete/delete` instead of `wal/wal/wal`;
3. direct fresh and complete-reopen application remained `delete`; and
4. the non-WAL stub saw zero WAL attempts and no mismatch instead of one
   verified attempt and `MIGRATION_PROFILE_MISMATCH`.

The later-migration rollback and in-memory cases were already green at RED,
which correctly preserved prior behavior rather than manufacturing failures.
This is a semantic RED, not a dependency or bootstrap failure.

## GREEN behavior and ordering review

The changed sources, complete focused test, complete WIRING-A file-backed
caller, and complete `mcp_server.js` startup caller were read. The exact order
in `sqlite_migration_sets.js` is:

1. exact set identity, canonical ids/paths, every path-component `lstat`,
   regular-file/realpath checks, byte read, and SHA-256 authentication at
   lines 115–142;
2. ledger existence and duplicate-free exact-prefix admission at lines
   145–175;
3. exact applied schema admission at lines 187–236 and 275–277;
4. one outer schema/ledger transaction using only authenticated buffers,
   followed by final prefix/schema verification, at lines 278–296; and
5. file-only WAL establishment plus exact observed-result verification at
   lines 251–260 and 297.

The already-complete path still executes steps 1–3 before step 5. `state.js`
has no `journal_mode` write; it sets only connection-local foreign-key state,
calls the authenticated seam, closes on any error, and assigns global `db`
only after success (lines 56–68). WIRING-A similarly closes and revokes only
the newly issued failed handle and returns a pair only after the seam succeeds
(`coordination_consumer_runtime_test_profile.js:141-175`).

### Independent file and ownership probes

Two direct commands of the form
`node --input-type=module -e '<inline reviewer probe>'` ran outside tracked
candidate paths. They established:

- A pre-existing `delete`-mode file with a sentinel and changed selected
  migration bytes returned `MIGRATION_PROFILE_MISMATCH`; journal mode remained
  `delete`; the `sqlite_master` rows were byte-equivalent; the sentinel stayed
  `kept`; no ledger appeared; the rejected handle was closed; and `getDb()`
  remained unpublished.
- Fresh, reopened, and copied WIRING-A handles were all real file databases,
  open, and `wal`.
- Direct fresh application was `wal`; after an external downgrade to
  `delete`, complete-set reapplication restored `wal`, preserved the exact
  five ids, and left the caller-owned handle open.
- Direct `:memory:` application retained the real `memory` flag/mode and the
  exact five ids.
- A returned non-WAL result and a thrown WAL pragma both mapped to
  `MIGRATION_PROFILE_MISMATCH`, attempted WAL exactly once, left the direct
  handle open, and reported no false success.
- A later-migration failure attempted WAL zero times, returned the fixed
  mismatch code, left the caller handle open in `delete`, and rolled back all
  schema and ledger objects.
- On a forced post-commit WAL failure, the exact five-entry schema/ledger was
  durable but no trusted return occurred. Generic state closed the handle and
  remained unpublished; the profile closed/revoked its new handle. An exact
  retry revalidated the durable prefix/schema and converged to `wal`.
- The direct post-commit failure retained raw caller ownership, as required;
  restoring the pragma and retrying the same authenticated seam converged to
  `wal` without changing ids.

This last schedule does not create an admitted half-state. Schema/ledger and
WAL cannot be one SQLite transaction, so the designed boundary commits the
authenticated schema first and treats WAL failure as a retryable closed
admission failure. No state/profile capability or global database is exposed
until both facts hold.

### Preserved Trial 1 boundaries

Proportional re-review confirmed all accepted Trial 1 behavior:

- three distinct identity-only, deeply frozen sets; exact five-entry generic
  and WIRING-A sets; exact six-entry epoch set; both root `002` entries; and
  only profile-local `005` in the epoch set;
- no directory discovery, glob, basename grouping, environment selection, or
  numeric-id collapse;
- exact literal paths and digests, path-component symlink rejection,
  non-file/traversal rejection, and zero target objects on each path attack;
- authenticated-buffer execution: replacing migration bytes after the
  authenticated read did not create the replacement marker, while the exact
  prefix and WAL result succeeded;
- duplicate/unknown/non-prefix ledger rejection and exact table/index/trigger/
  view admission for applied schema;
- atomic schema/ledger rollback for a later migration failure;
- failed generic/profile handle closure and direct successful/failure caller
  ownership; and
- unchanged PostgreSQL selection/migration/adapter code and accounting.

The six independently recomputed migration SHA-256 values remain:

```text
260eb6663adc38eb443cd6763d0b1b5acc31e317f0fbef59373ab055d6c2920d  gateway/migrations/001_initial.sql
257cab639e9cac9c9be14d197dd9f2fdca9917acca37b13f570b028a7f6200a3  gateway/migrations/002_coordination_consumer.sql
d1be59ac7968888c30234401ea779137848a08d88ac8638c90dcf40d5fb6037d  gateway/migrations/002_lifecycle.sql
fb12640b8fd79318f1efbb31a6fb8654d3e396b5c5da0542605be6bc5802366f  gateway/migrations/003_coordination_ack_outbox.sql
38ba4d8e84dd447a176c2c4f83b96cbb416681cd077d404f4469b4a459cdd6fb  gateway/migrations/004_coordination_consumer_runtime_owner.sql
ba5cef90d2d30d89339acbf3a3fdbe3cb43815f23737a5faeb1e00c78523ea7d  gateway/migrations/profiles/sqlite-redis-disposable-epoch-test-v1/005_coordination_consumer_runtime_epoch.sql
```

The forbidden shared-root `005` and the still-unimplemented epoch runtime
profile are absent.

## Executable gates

| Command/gate | Independent outcome |
|---|---|
| RED focused command at exact RED | exit 1 as required; 19 total, 15 pass, 4 semantic fail, 0 skipped |
| Focused command at GREEN/request tree | exit 0; 19/19 pass, 0 fail/skipped |
| Intended WAL/auth subset with unescaped alternation | exit 0; exactly 6 selected, 6 pass, 0 fail/skipped |
| Same eight affected files as Trial 1 | exit 0; 208/208 pass, 0 fail/skipped |
| `tests/gateway/postgres_state.test.js` | exit 0; 19 total, 10 pass, 0 fail, 9 explicitly skipped live cases |
| Repository-local ESLint on the two changed sources and focused test | exit 0; 0 diagnostics |
| Repository-local ESLint on Gateway `src tests scripts` | exit 0; 0 diagnostics |
| `node --check` on both changed sources and focused test | three exits 0 |
| `python3 -m json.tool ci/suites.json` and `ci/suites-contract.json` | both exit 0 |
| `python3 scripts/ci_gate.py --repo-root . --validate-only` | exit 0; status passed; 0 tests executed |
| Inventory refresh in exact disposable GREEN tree | exit 0; before/after byte-identical SHA-256 `f6f619028473c2ffc9831f610d7a74d544d3478cd6ec3cb87d57b2492a68ef58` |
| Six migration digests and root/profile absence guards | exact values above; all guards exit 0 |
| KO-to-GREEN and GREEN-to-request `git diff --check` | exit 0 |
| Policy/dependency/workflow/public-contract/shared-root/prior-trail scope guards | exit 0; exact pathsets only |

The nine PostgreSQL skips are not passes. The full host aggregate
`bash scripts/ci.sh` was deliberately not run; the orchestrator owns that
serialized lane.

## P2-REQUEST-01 — printed subset command selects zero tests

**Severity: P2. Scope: handoff evidence, not candidate behavior. Non-blocking
for this candidate verdict.**

The request prints this pattern inside its verification table:

```text
--test-name-pattern='generic authentication\|WIRING-A fresh\|file-backed application\|later migration\|in-memory application'
```

With the exact shell text, JavaScript `RegExp` treats `\|` as a literal pipe.
The independent run selected zero inner tests (`1..0`) and the outer isolated
file process reported one passing file, not 6/6. Replacing only the pattern
separators with unescaped `|` selected the intended six named tests and
returned 6/6. The full focused suite also returned 19/19 and the affected
aggregate 208/208, so no technical coverage or trust-boundary behavior is
missing from this review.

Future handoffs should print an executable unescaped JavaScript-regex
alternation and distinguish selected-test counts from the outer file-process
count. The immutable Trial 2 request is not rewritten.

## Retry and environment attribution

- The first disposable RED setup invoked `git archive` from the empty target
  directory, so Git reported “not a git repository”; extraction and the test
  did not occur. The same directory was populated with `git -C <review-tree>
  archive`; this orchestration error supplied no evidence.
- The first sandboxed exact RED run then failed only at the Node test-worker
  boundary with `Failed to create stream fd: Operation not permitted` and a
  one-file bootstrap failure. It is not credited. The approved host rerun
  produced the 19-test semantic RED recorded above.
- A dependency comparison wrapper attempted a nested `spawnSync git` and the
  sandbox returned `EPERM`; its noisy captured stdout was not credited. Direct
  comparison of the exact RED lock with the installed hidden lock produced
  the zero-difference 197-package result.
- The first printed subset command selected zero because of the request's
  escaped pipes. It is retained as `P2-REQUEST-01`; the corrected selector
  passed 6/6.
- Sandboxed direct `node --check` and inventory commands printed three
  environment lines about stream FDs while exiting `0`; ESLint itself emitted
  no diagnostic. No failed or skipped product check is summarized as green.

## Limitations and canonical status

No live Redis, live Redis race, live PostgreSQL, live MCP/Gateway, Docker,
deployment, or release lane was run. The nine opt-in PostgreSQL tests remain
explicitly skipped. No production profile, network VFS, online WIRING-A
upgrade, automatic takeover, crash/rejoin protocol, rollout, tag, push,
integration, promotion, support, or release was exercised or inferred.

This result makes the Trial 2 migration correction **reviewed** only. It does
not integrate it, promote it, release it, close the later EPOCH-CORE slices,
or complete G/0/02. Unimplemented crash/rejoin/runtime behavior receives no
credit.

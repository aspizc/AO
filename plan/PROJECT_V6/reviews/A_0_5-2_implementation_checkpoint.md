# A_0_5 — Implementation checkpoint 2: append-only SQLite migrations

Date: 2026-10-07. Status: **partial implementation; recovery remains unimplemented**.
This is a coder checkpoint, not an independent verdict, review request or approval.
The original discovery checkpoint and all plan-review evidence remain unchanged.

- Base: `b06f1f6b4b0c21799f2ba07631137b055c2a3364`.
- Worktree: `workspace/clones/wt-v6-a05-build`.
- Branch: `feat/V6-A-0-05-local-recovery`.
- Trace: `tr-v6-a05-dc1ac6b8-c492-4d91-8702-ad4f2010dcdd`.
- Execution: root-assigned built-in Codex coder fallback after the reported
  Gateway `REQUEST_CONTEXT_DENIED`; no Gateway session grant or Claude
  invocation is claimed.
- Contract: reviewed sheet `A/0/05.md`, including independent plan trial 2 OK
  and the same-principal/every-repository/no-extra-approval operator decision.

## Exact changed paths

1. `gateway/migrations/005_request_context_lineage.sql` (new).
2. `gateway/src/core/sqlite_migration_sets.js`.
3. `tests/gateway/coordination_consumer_epoch_migrations.test.js`.
4. `plan/PROJECT_V6/reviews/A_0_5-2_implementation_checkpoint.md` (this new checkpoint).

The build tree was clean before the test addition. No other existing file,
policy, historical SQL, historical digest, shared index, CI script or
CHANGELOG was edited. No commit, push, host restart, subagent, independent
verdict, provider call or full gate was performed.

## Implemented and verified

The new migration adds nullable `tasks.target_action` and a versioned
`request_context_lineage` table carrying owner, original expiry, local
identity/state bindings, revision and JSON task/session payload. There is
no recovery service or identity derivation yet; the table itself grants
no authority.

Migration `R` is appended independently: generic and WIRING-A are `H,R`,
WIRING-B is `H,E,R`. All six historical migration files and their verified
digests are untouched. The new SQL digest is
`bd583a4311f34751c75b0478f958800514199c6fd7163d3fe819b54658e28429`.

The three named tests create exact historical databases with business task
rows, upgrade through the production profile and reopen. They query actual
`SELECT rowid, id, applied_at FROM main.schema_migrations ORDER BY rowid`
rows, assert unchanged historical rows, null legacy task actions and zero
legacy recovery rows. WIRING-B also preserves nontrivial epoch store/fence,
receipt and ack authority/settlement data across both openings. Existing
unknown/duplicate/non-prefix/schema/digest and cross-profile refusal tests
remain. The WIRING-A cross-profile fixture is recreated from raw historical
SQL rather than attempting to switch a new `H,R` database to `H,E,R`.

## Meaningful RED before production changes

Only the new tests were written when this command ran:

```bash
node --test --experimental-test-isolation=none --test-name-pattern='legacy .* upgrades and reopens' tests/gateway/coordination_consumer_epoch_migrations.test.js
```

Exit **1**: **0 passed, 3 failed, 0 cancelled, 0 skipped, 0 todo**.
Each failed at the emitted ordered-ledger assertion with `ERR_ASSERTION`:
the actual historical ledger omitted expected `005_request_context_lineage`.

- `legacy generic H upgrades and reopens with H then R`.
- `legacy WIRING-A H upgrades and reopens with H then R`.
- `legacy WIRING-B H then E upgrades and reopens with H then E then R`.

Raw local log: `/tmp/v6-a05-recovery-migration-red.log`. A separate direct
baseline execution of the complete suite produced **19 passed, 3 failed**;
only the three new upgrade tests failed. That direct execution was also
before any production edit.

The initially attempted default isolated test runner exited 1 before
assertions with one file-level `testCodeFailure` and no diagnostic from its
child. It is an environment/runner failure, **not RED evidence**. The
isolation-disabled runs execute the assertions normally without changing
sandbox permissions or filesystem ownership.

## GREEN and focused regression checks

Same focused command after production migration edits: exit **0**,
**3 passed, 0 failed/cancelled/skipped/todo**.
Log: `/tmp/v6-a05-recovery-migration-green-focused.log`.

Each complete suite ran separately, using `node --test
--experimental-test-isolation=none <file>`:

| Suite | Passed | Failed | Cancelled | Skipped | Todo | Exit |
|---|---:|---:|---:|---:|---:|---:|
| `coordination_consumer_epoch_migrations.test.js` | 22 | 0 | 0 | 0 | 0 | 0 |
| `state_init.test.js` | 6 | 0 | 0 | 0 | 0 | 0 |
| `sqlite_migrations.test.js` | 5 | 0 | 0 | 0 | 0 | 0 |

Logs are respectively `/tmp/v6-a05-recovery-migration-green.log`,
`/tmp/v6-a05-state-init-green.log`, and
`/tmp/v6-a05-sqlite-migrations-green.log`. The first complete migration
GREEN attempt found a fixture error (21 passed, 1 failed): `storeOrigin` is
an opaque capability rather than a filename. The corrected fixture uses
its disposable database's actual path and seeds exact historical SQL;
the rerun is the **22/22** result above. This fixture repair did not relax
the refusal assertion or change production behavior.

`git diff --check`: exit **0** before this checkpoint. Node: **v22.22.1**.

## Remaining work and environment limits

The coder task is checkpointed before further work would exceed its 20,000
token budget. Continue in a fresh bounded coder task without rebuilding
the completed migration slice.

Still unimplemented: trusted Linux startup/recheck identity and machine/private
state verification; immediate-transaction lineage repository and authoritative
task-action writes (SQLite only; ordinary PostgreSQL calls must keep working);
durable result recording before memory publication; lifecycle/kill cleanup;
prior-owner liveness and bounded tmux probes; explicit reattach and discovery;
continued recovered-owner/state checks; private denial observer; additive 34th
tool/action/capability, strict DTOs and generated projections; Gateway docs.
No successful runtime recovery, bootstrap provenance or authority claim is made.

Root reported the sandbox maps `/tmp` and `/home` file owners to UID 65534
while process euid is 1000. Private-state positive/bootstrap fixtures may
therefore be unavailable here. Preserve the contract, report these separately
from intentional RED, and use dependency-injected observations only for
bounded deterministic tests; those are not actual bootstrap or live evidence.

Remaining required evidence: all non-migration RED/GREEN named by the sheet,
full focused request-context/lifecycle/catalog/error suites, root's serial
`bash scripts/ci.sh` with exact totals/skip budget, independently assigned
implementation review, and operator-run live Codex spawn/restart/explicit
reattach/ask/view acceptance. None was run by this coder. Integration,
promotion and release are not performed or claimed.

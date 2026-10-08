# A_0_5 — Implementation checkpoint 3: identity and SQLite persistence helpers

Date: 2026-10-07. Status: **partial implementation; runtime recovery remains unwired**.
This is a coder checkpoint, not an independent verdict, review request or approval.
Checkpoints 1 and 2, the complete plan-review trail and root's archived migration
logs are unchanged. Continue from the completed migration slice rather than
rebuilding it.

- Base: `b06f1f6b4b0c21799f2ba07631137b055c2a3364`.
- Worktree: `workspace/clones/wt-v6-a05-build`.
- Branch: `feat/V6-A-0-05-local-recovery`.
- Root continuation trace: `tr-ao-v6-v7-resume-b5f36fd5-b6a3-44f0-b8ed-d2dc46ee7cea`.
- Historical A05 trace: `tr-v6-a05-dc1ac6b8-c492-4d91-8702-ad4f2010dcdd`
  is provenance only after the request-context reset; no current task or
  session grant is inferred from it.
- Execution: separately assigned built-in Codex coder continuation under the
  root-reported Gateway-denial fallback; no provider or Claude invocation.
- Contract: reviewed `A/0/05.md` and independent plan trial 2 OK. No new
  identity, repository, approval, portability or lifecycle decision was made.

## Exact new changes in this continuation

1. `gateway/src/core/request_recovery_identity.js` (new).
2. `gateway/src/core/repositories/request_context_repo.js` (new).
3. `gateway/src/core/repositories/task_repo.js`.
4. `gateway/src/services/task_service.js`.
5. `tests/gateway/request_context_reattach_identity.test.js` (new).
6. `tests/gateway/request_context_reattach_repository.test.js` (new).
7. `tests/gateway/task_service.test.js`.
8. `plan/PROJECT_V6/reviews/A_0_5-3_implementation_checkpoint.md` (this new checkpoint).

Prior checkpoint-2 migration changes and the five root-owned `*.txt.gz`
migration evidence files were present at startup and preserved. There is no
policy, shared-index, CI, CHANGELOG, historical-SQL, historical-digest or
projection change in this continuation. No commit, push, metadata-permission
workaround, subagent, self-review, host restart, full gate or provider call.

## Implemented helper behavior

`createLocalRecoveryIdentity` supports Linux/SQLite only and derives
`linux-uid:<uid>` from equal nonnegative safe numeric real/effective UIDs.
It accepts no identity assertion as authority. Its bounded descriptor read
opens `/etc/machine-id` without following symlinks, checks the same descriptor
for a root-owned regular file, rejects group/other write permissions and
invalid/zero values, and retains only the specified application-keyed HMAC.
It checks the real SQLite state path and the immediate state directory for
effective-UID ownership and private write modes. `verify()` re-observes
credentials, machine digest, canonical path and permissions. Unsupported or
unavailable observations return null/false without throwing a startup error.
This helper is **not called by the actual MCP bootstrap yet**.

`createRequestContextRepository` is internal SQLite persistence, using existing
state and synchronous immediate transactions. It creates version-1 metadata,
merges bindings from the latest durable payload rather than a caller snapshot,
compares them with actual business rows and authoritative task actions, and
uses revision-checked owner/payload writes. Claim preconditions validate local
identity recheck, audience, exact original expiry, canonical active/paused
state, task completeness, action/agent/role/target consistency, and live
supervised-row completeness. Same-owner retries retain revision; reusing a
connection ID with another process tuple refuses. Terminal cleanup and owner
release primitives preserve original expiry. PostgreSQL returns no repository
without querying it.

The repository **does not implement a standalone recovery authority path**.
Its required `claimTrace.validate` callback is a trusted service composition
point executed under the immediate write lock, after current authoritative
rows are read. It must still implement freshly verified **every-repository**
bindings, positively established prior-owner absence and bounded exact-target
tmux probes, returning staged bindings/DTOs only. It must never publish memory
ownership, perform provider work or use an async callback inside the transaction.
Async/thenable callbacks refuse; failed validation or durable writes return no
claim result and commit no owner change. Actual discovery/protected-call
integration must reuse these guards without acquiring ownership implicitly.

Task assignment now persists `targetContext.action` into SQLite's
`tasks.target_action`; callers that create legacy task rows without an action
persist null. PostgreSQL continues to use its historical task insert columns;
no PostgreSQL migration or transaction API was invented.

## RED evidence before each production implementation/fix

All commands use `node --test --experimental-test-isolation=none`, Node
**v22.22.1**, from this worktree with non-login shells. Default runner failure
from checkpoint 2 remains recorded separately and was not reclassified.

### Meaningful behavior assertions

1. Task-action RED, before changing either task production file:

   ```bash
   node --test --experimental-test-isolation=none --test-name-pattern='new task persists authoritative' tests/gateway/task_service.test.js
   ```

   Exit **1**, **0 passed, 2 failed, 0 cancelled/skipped/todo**. Names:
   `new task persists authoritative code.read instead of inferring authority from its role`
   and the corresponding `code.write` test. Both query the actual task row
   and fail because stored `target_action` is null rather than the resolved
   action. Log: `/tmp/v6-a05-task-action-red.log`.

2. Machine-ID format RED after the first helper GREEN, before its decoding fix:

   ```bash
   node --test --experimental-test-isolation=none --test-name-pattern='machine ID format' tests/gateway/request_context_reattach_identity.test.js
   ```

   Exit **1**, **0 passed, 1 failed, 0 cancelled/skipped/todo**. The test
   `machine ID format absence permissions ownership and symlinks refuse`
   adds bytes with their high bits set; ASCII decoding incorrectly masked
   them into valid hexadecimal bytes and returned an identity. UTF-8 decoding
   now rejects them. Log: `/tmp/v6-a05-identity-format-red.log`.

3. Binding/process guard RED after the first repository GREEN, before guard fixes:

   ```bash
   node --test --experimental-test-isolation=none --test-name-pattern='supervised session target cannot|same connection ID cannot' tests/gateway/request_context_reattach_repository.test.js
   ```

   Exit **1**, **0 passed, 2 failed, 0 cancelled/skipped/todo**. Names:
   `supervised session target cannot exceed its recorded task agent and role`
   and `same connection ID cannot retry using a different process identity`.
   Both initially fail with missing expected `REQUEST_CONTEXT_DENIED` throws.
   The added guards compare session targets with recorded task targets and
   prohibit a changed process tuple for a same-connection retry.
   Log: `/tmp/v6-a05-lineage-guards-red.log`.

### Initial API-absence RED, separately attributed

- Identity helper suite before creating its production module: exit **1**,
  **0 passed, 9 failed, 0 cancelled/skipped/todo**. Tests fail the explicit
  assertion that the required helper export exists; they have not reached
  the behavioral assertions at this stage.
  Log: `/tmp/v6-a05-identity-helper-red.log`.
- Repository suite before creating its production module: exit **1**,
  **0 passed, 8 failed, 0 cancelled/skipped/todo**. Tests fail the assertion
  that the transactional repository export exists. This is missing-feature
  evidence, not proof of the later transaction/guard behaviors.
  Log: `/tmp/v6-a05-lineage-repository-red.log`.

## Final focused GREEN

Each suite ran separately with `node --test --experimental-test-isolation=none <file>`:

| Suite | Passed | Failed | Cancelled | Skipped | Todo | Exit |
|---|---:|---:|---:|---:|---:|---:|
| `request_context_reattach_identity.test.js` | 9 | 0 | 0 | 0 | 0 | 0 |
| `request_context_reattach_repository.test.js` | 10 | 0 | 0 | 0 | 0 | 0 |
| `task_service.test.js` | 9 | 0 | 0 | 0 | 0 | 0 |

Final logs: `/tmp/v6-a05-identity-helper-green.log`,
`/tmp/v6-a05-lineage-repository-green.log`,
`/tmp/v6-a05-task-action-green.log`. The repository first GREEN had 8/8
before the two additional meaningful guard REDs; the final log has 10/10.
Task-service GREEN includes the ordinary PostgreSQL insert-column assertion
through its existing adapter with a fake executor, with no actual PostgreSQL
server or external command invocation.

Identity tests use real disposable file bytes, mode checks, symlink/open and
descriptor reads, plus **dependency-injected UID/ownership observations**.
The sandbox remaps owners to 65534 while euid is 1000; these tests do not
claim an actually owned private host workspace or production UID provenance.
Repository tests use actual SQLite transactions, two database handles, current
business rows and a forced durable-write failure. A contention test proves
denial while another handle holds an immediate lock; it is not the full
two-connection asynchronous recovery race acceptance test. These helper tests
create no in-memory request-context ownership or actual recovered session.

`git diff --check`: exit **0** before this checkpoint. No full gate, bootstrap
process, live child, host restart, tmux probe or recovered protected tool call
was run. Prior checkpoint-2 migration totals are preserved, not rerun here.

## Pending before implementation review

Stop this bounded coder task here. Root requested checkpoint 3 and no automatic
next chunk. Current `.git` metadata remains read-only; integration/publication
is blocked in this environment, without workaround.

Remaining implementation: actual bootstrap identity and owner PID/start/boot
composition through existing process identity utilities; supported/unsupported
request-context wiring; durable result recording before memory publication;
fresh repository/liveness/tmux service validation and fixed probe budgets;
explicit reattach/discovery and post-hydration durable owner/state checks;
lifecycle and kill cleanup hooks; private protected-wrapper denial observer;
additive 34th action/tool/capability and strict DTOs; generated projections and
Gateway recovery docs. Keep original connection-mismatch, cancellation,
headless/artifact/approval exclusions and no-extra-approval decision intact.

Pending evidence: actual stdio principal provenance; all non-helper runtime
RED/GREEN from the sheet; safe discovery, live-owner/reused-PID/ambiguous
liveness, concurrent winner and lifecycle races; protected ask/view reaching
the same recorded target; ordinary denial reaching the private observer;
full focused lifecycle/catalog/error/request-context suites; root's serial
full gate with exact totals; separately assigned independent implementation
review; operator-run live Codex restart acceptance with actual versions and
transcript. No implementation-complete, reviewed, integrated, promoted or
released status is claimed by this checkpoint.

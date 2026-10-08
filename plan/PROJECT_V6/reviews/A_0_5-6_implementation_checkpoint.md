# A_0_5 — Implementation checkpoint 6: bounded acceptance continuation

Date: 2026-10-07. **Partial implementation, unreviewed; stopped by operator.**
This is an immutable coder checkpoint, not a verdict or trial-1 submission.
The operator requires the next coder to use **GPT-6.1 / medium**. Stop this
session here; a fresh `gpt-6.1-sol`, `reasoningEffort: medium`, priority coder
can resume from the preserved worktree. Do not rebuild the earlier slices.

Actual Gateway session trace:
`tr-ao-a05-accept-3390fd6e-2992-4837-a5ad-a4bbae8a0cf1`.
This continuation is on that operator-supplied Gateway session; it is not a
built-in fallback. The available connector's read-only `orchestration.view`
call for this trace returned the fixed `REQUEST_CONTEXT_DENIED` envelope.
That access limitation does not replace the actual session identity or grant
new authority. No new trace, agent, reviewer, or production Gateway was started.
Root owns attaching the checkpoint to its accessible Gateway evidence chain.

Base: `b06f1f6b4b0c21799f2ba07631137b055c2a3364`.
Branch: `feat/V6-A-0-05-local-recovery`.
Worktree: `workspace/clones/wt-v6-a05-build`.
Brief: `workspace/root-a05-acceptance.md`; contract:
`plan/PROJECT_V6/A/0/05.md`, plan trial 2 OK, checkpoint 5 and its manifest.
All **25/25** checkpoint-5 file hashes matched before implementation began.
All prior code and evidence were preserved. The operator's stop instruction
supersedes further implementation and testing in this session.

## Exact candidate and evidence binding

[Checkpoint 6 manifest](v6-a05-accept-checkpoint-6-manifest.json) binds **35
files** by SHA-256 and Git blob SHA-1 and **eight new compressed logs**, including
their uncompressed SHA-256 and emitted totals. Manifest SHA-256:
`2ef489b8af2248862a3c21a54fb618b1ce336bb70e91b8f0c88bda762088bf20`.
It excludes itself and this checkpoint to avoid circular hashes. It includes
the previous checkpoint/manifest and root acceptance brief. Existing evidence
files were not overwritten; these archives and this checkpoint are new files.

Changed checkpoint-5 candidate files:

- `gateway/src/core/request_context.js`
- `gateway/src/mcp_server.js`
- `gateway/src/services/request_recovery_service.js`
- `tests/gateway/request_context_reattach.test.js`

Additional existing tracked files changed in this continuation:

- `gateway/src/core/repositories/lifecycle_repo.js`
- `gateway/src/services/agent_service.js`
- `gateway/src/tools/agent.js`
- `tests/gateway/mcp_bootstrap.test.js`

New test files:

- `tests/gateway/helpers/reattach_race_worker.js`
- `tests/gateway/request_context_reattach_bootstrap.test.js`
- `tests/gateway/request_context_reattach_observations.test.js`

No production edit followed the operator's stop. The last edit before the stop
was the additive 34th-tool expectation in `mcp_bootstrap.test.js`; its pending
host verification is separately recorded below.

## Completed changes and what the tests demonstrate

1. **Canonical terminal cleanup.** SQLite lifecycle persistence now uses an
   immediate transaction. Successful canonical completion/cancellation deletes
   durable trace metadata inside the lifecycle transaction; canonical session
   close/error removes its recovery entry there. Per-database terminal
   subscribers forget hydrated trace/children or session bindings after
   lifecycle persistence returns. The recovery service exposes the private
   subscription; context revocation unsubscribes even if owner release throws.
   The existing public cancellation refusal remains unchanged. Tests execute
   an issued canonical cancellation command, prove refused cancellation retains
   authority, prove actual canonical session closure removes both kinds of
   binding, and prove a cleanup-trigger failure rolls back cancellation without
   forgetting still-valid memory.
2. **Shutdown cleanup after release failure.** `shutdownGateway` is the real
   bootstrap's extracted shutdown path. Revocation occurs before release;
   registry close, transport close and stdin pause still run if release fails.
   The original release failure remains an error. The distinguishing test
   observes the actual cleanup order and rejects subsequent use as revoked.
3. **Ask revalidation after the pre-send await.** The protected agent tool now
   forwards its private request binding to `agentService.ask`. After its
   awaited pre-send pane observation, ask revalidates before sending input.
   The binding retains a private server-supplied snapshot and monotonic elapsed
   time for rechecking context validity and recovered durable authority. Five
   distinguishing tests change completion, cancellation, session closure,
   owner or revocation during that observation; each reaches the observation
   once and sends provider input zero times.
4. **Expanded runtime acceptance guards.** Added whole-trace denial cases for
   wrong registry ID, changed root under the same ID, taskless/incomplete
   metadata, legacy/tampered task action, task role/agent, session target,
   unsupported metadata version and exact original expiry. Added current
   context expiry, closed-session reporting, unchanged durable expiry and
   atomic refusal at the five-second overall probe budget. Darwin and a
   PostgreSQL-shaped unsupported backend refuse recovery while ordinary
   creation remains available. Discovery over 103 real persisted traces
   returns 100 sorted eligible entries, excludes foreign/expired records from
   truncation, leaves ownership untouched, exposes no private binding fields,
   and permits explicit reattach beyond the cap. Existing identity,
   multi-repository, migration, denial-observer and replay tests remain intact.
5. **Real two-process claim race.** Separate Node processes open separate
   SQLite handles, reach an IPC readiness barrier, and race actual protected
   reattach calls. Exactly one commits ownership. The loser has no trace,
   task or session memory authority; the winner does. Workers remain alive
   through both results, and production owner observations guard against
   stealing the competing live process. The seed's old owner and target
   existence are fixture inputs; this is not a real provider/tmux race.
6. **Durable task/spawn error paths.** Protected result-recording tests perform
   real business-row writes in fixture tool handlers, then force SQLite
   metadata merge failure with a trigger. They prove the handler reached the
   authoritative row write, the tool reports an error, no new memory binding
   is published, and the prior durable payload remains unchanged. These do
   not invoke a provider or replace an actual spawn-service race test.
7. **Actual disposable bootstrap provenance, host-executed.** The real stdio
   entry point starts against an existing empty private 0600 DB in a private
   disposable directory. With provider assertions changed between `codex`
   and `pi`, and changed username/configured-principal assertions, the
   persisted principal equals the parent's actual numeric OS UID. The test
   observes the subprocess's actual PID/start token/kernel boot, canonical
   state path and machine digest, checks that raw machine identity is absent,
   and observes owner fields cleared by actual shutdown. `AGENTS_DRY_RUN=1`;
   no provider executable is invoked. The principal-ID environment assertion
   is not a supported `loadConfig` setting; actual production configuration
   and the identity helper's guards were not weakened to honor it.
8. **Production observation helpers, host-executed.** Tests exercise actual
   live process identity and confirmed child exit, different recorded start
   token at the live PID, changed verified boot identity, and ambiguity caused
   by unreadable/malformed proc observations. An isolated tmux server proves
   a live longer target cannot satisfy a missing exact prefix target and that
   a killed target is gone. Disposable executable fixtures test ambiguous
   command failure and the real one-second subprocess timeout. Filesystem
   mocking is confined to the proc ambiguity test; the real owner reader is
   called, rather than replacing the service's owner predicate.
9. **Bootstrap regression expectation.** The existing bootstrap test still
   expected 33 tools. Its real output contained the appended
   `orchestration.reattach`; the expected ordered list now includes it.
   Host GREEN after this test-only change was cancelled for transition and
   remains pending. Catalog/contract/docs were not imported from A04.

## RED/GREEN logs and exact totals

Node `v22.22.1`; actual tmux `3.6`. Commands use non-login shells and
`--experimental-test-isolation=none`, preserving the prior lane's convention.
All completed runner totals below have zero cancelled/skipped/todo tests.

| Evidence archive | Actual command result | Classification |
|---|---|---|
| [runtime RED](v6-a05-accept-runtime-red.txt.gz) | exit 1; 34 passed, 2 failed | Canonical cancellation retained metadata; shutdown test reached missing helper export. The latter is API-absence RED, not behavioral cleanup evidence. |
| [runtime GREEN 1](v6-a05-accept-runtime-green-1.txt.gz) | exit 0; 36 passed, 0 failed | Terminal/shutdown fixes plus added runtime guards. |
| [await RED](v6-a05-accept-await-red.txt.gz) | exit 1; 2 passed, 5 failed | All five actual pre-send races leaked success before the ask revalidation fix. |
| [runtime GREEN 2](v6-a05-accept-runtime-green-2.txt.gz) | exit 0; 44 passed, 0 failed | Includes actual two-process claim race and fixed ask boundaries. |
| [sandbox observation attempt](v6-a05-accept-host-attempt-1.txt.gz) | exit 1; 3 passed, 2 failed | Environment failures: bootstrap process exited during initialization; isolated tmux socket returned `Operation not permitted`. Not product RED or passing acceptance. |
| [host observation GREEN](v6-a05-accept-host-attempt-2.txt.gz) | exit 0; 5 passed, 0 failed | Actual bootstrap and four production observation tests outside sandbox. |
| [focused regression GREEN](v6-a05-accept-focused-1.txt.gz) | exit 0; 265 passed, 0 failed | Includes subsequent canonical-close/rollback and five-second budget tests; no host-only suites included. |
| [existing bootstrap regression RED](v6-a05-accept-bootstrap-regression-red.txt.gz) | exit 1; 3 passed, 1 failed | Stale 33-tool ordered expectation, subsequently corrected; host GREEN pending. |

New guard tests that already passed existing production predicates are guard
coverage, not new RED evidence. Do not combine overlapping runner totals into
a fictitious unique count or describe environment failures as implementation
RED. No independent review has occurred.

Runtime RED/GREEN 1/GREEN 2 exact command:

```bash
node --test --experimental-test-isolation=none tests/gateway/request_context_reattach.test.js
```

Await RED exact command:

```bash
node --test --experimental-test-isolation=none --test-name-pattern='ask refuses|recovery fails closed' tests/gateway/request_context_reattach.test.js
```

Observation sandbox attempt and successful host rerun exact command:

```bash
node --test --experimental-test-isolation=none tests/gateway/request_context_reattach_observations.test.js tests/gateway/request_context_reattach_bootstrap.test.js
```

Focused regression GREEN exact command:

```bash
node --test --experimental-test-isolation=none tests/gateway/request_context_reattach.test.js tests/gateway/request_context.test.js tests/gateway/request_context_boundary.test.js tests/gateway/request_context_execution_binding.test.js tests/gateway/request_context_reattach_repository.test.js tests/gateway/request_context_reattach_identity.test.js tests/gateway/tool_catalog.test.js tests/gateway/tool_projection_contract.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/lifecycle_rebaseline_core_repository.test.js tests/gateway/lifecycle_rebaseline_core_service.test.js tests/gateway/state_init.test.js tests/gateway/sqlite_migrations.test.js tests/gateway/coordination_consumer_epoch_migrations.test.js tests/gateway/tool_agent.test.js tests/gateway/tool_agent_model.test.js tests/gateway/agent_errors.test.js
```

Existing bootstrap regression RED exact command:

```bash
node --test --experimental-test-isolation=none tests/gateway/mcp_bootstrap.test.js
```

`git diff --check`: exit 0 before this checkpoint. No full gate was run.

## Pending host command: operator cancellation, no test verdict

The following host command was requested after correcting the bootstrap
expectation, then **cancelled by the operator for the effort transition**.
It is neither a test failure nor a GREEN result. At checkpoint creation
`/tmp/v6-a05-accept-host-green.txt` did not exist. Root will execute it:

```bash
node --test --experimental-test-isolation=none tests/gateway/mcp_bootstrap.test.js tests/gateway/request_context_reattach_observations.test.js tests/gateway/request_context_reattach_bootstrap.test.js > /tmp/v6-a05-accept-host-green.txt 2>&1
```

## Outstanding work for the fresh medium coder

1. Preserve these changes, read the reviewed sheet and both checkpoints, and
   verify this manifest before editing. Root runs the pending host command;
   do not relabel its cancellation as a failure or rerun it blindly.
2. Finish checkpoint-5 item 3: create distinguishing recovery-versus-canonical
   completion/session-kill races across independent handles or processes.
   The passing claim-versus-claim race and ask-observation races do not prove
   those lifecycle contention cases. Verify terminal business rows defeat
   residual metadata and already-hydrated maps under either race ordering.
3. Finish the async-boundary analysis and targeted TDD beyond ask's pre-send
   observation. `agentService.spawn`/`delegate` await adapters before later
   business-row writes; `view`/`kill` await adapters before returning pane
   output or changing status. Only ask's pre-send boundary was fixed here.
   Determine the necessary rechecks without holding SQLite locks across
   provider work, changing cancellation semantics, or importing A04 code.
   Include expiry elapsing during an await and relevant durable-owner changes.
4. Check nested transaction/notification behavior before claiming complete
   lifecycle integration: the terminal observer runs after its lifecycle
   transaction returns, which can be a nested savepoint if a surrounding
   transaction exists. This continuation does not prove memory publication
   waits for an outermost commit or survives an outer rollback. Add a
   distinguishing test and resolve any defect within the reviewed contract.
5. Finish the sheet's acceptance matrix with exact named tests and honest
   evidence. Strengthen the original-expiry/no-renewal case using a new context
   whose expiry is later than the original (the current closed-session test
   shares the original expiry). Check any remaining session task/agent/role,
   malformed identity and multi-repository/root conjunctions against actual
   runtime behavior; helper coverage is preserved but must not be silently
   counted as complete bootstrap/runtime coverage. Do not weaken identity
   validation or chmod existing operator state.
6. Run only new/changed focused suites justified by those additions and archive
   new evidence immutably. If implementation is then ready, write
   `A_0_5-1_to_review.md` with the complete acceptance matrix, exact hashes and
   pending operator/full-gate entries. Otherwise create checkpoint 7. No
   reviewer verdict, status promotion, commit or integration is authorized.

Root retains ownership of full `bash scripts/ci.sh` execution solo on host,
CHANGELOG, shared CI/write-scope registry, indexes/status and serial A04/V7
reconciliation. Full gate, actual Codex child restart/reattach/ask/view,
provider-version transcript and operator live acceptance remain **not run**.
The disposable bootstrap and isolated tmux tests are not live Codex evidence.

No Claude invocation, provider call, subagent, policy edit, self-review,
commit, push, reset, stash, or shared CI/CHANGELOG/index/status edit occurred.
No implementation-complete, reviewed, integrated, promoted or released claim
is made. Work stops here for the operator's fresh medium session.

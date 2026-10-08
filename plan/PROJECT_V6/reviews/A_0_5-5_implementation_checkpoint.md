# A_0_5 — Implementation checkpoint 5: partial runtime recovery wiring

Date: 2026-10-07. **Partial implementation, unreviewed.** This coder checkpoint
is not a verdict, implementation-complete claim or trial-1 review submission.
Stopping near the 20k coder budget under the root continuation brief. Continue
from these files; do not rebuild the preserved migration/identity slices.

Base: `b06f1f6b4b0c21799f2ba07631137b055c2a3364`.
Worktree: `workspace/clones/wt-v6-a05-build`.
Branch inherited from checkpoint 3: `feat/V6-A-0-05-local-recovery`.
Root brief: `workspace/root-a05-continuation.md`; reviewed contract:
`plan/PROJECT_V6/A/0/05.md`, plan trial 2 OK. No Gateway task/session authority
is inferred from historical trace IDs. No Gateway calls were needed; the
root-provided repo handle remains `AO` if later calls are made.

## Completed in this continuation

- Added synchronous recovery service composition using the existing SQLite
  repository. Refactored its existing validation into shared claim/inspection/
  durable-owner checks under immediate transactions; original expiry, identity,
  business-row completeness and canonical state guards remain required.
- Wired the actual MCP bootstrap after `initState` to local identity and
  PID/start-token/kernel-boot owner helpers. The service composes the existing
  Linux process reader and argv tmux helper. Null process observations alone
  do not establish absence. Exact `has-session -t =<target>` probes have a
  maximum 1-second timeout and 5-second overall budget in the service.
- Request-context result recording calls durable recording before publishing
  trace/task/supervised-session memory. Unsupported recovery keeps ordinary
  calls available. No connect/discovery/denial hydration was added.
- Added explicit strict reattach and optional strict discovery through protected
  wrappers. Reattach stages bindings until the claim commits, then publishes
  matching tasks/surviving sessions; gone/closed sessions receive safe reasons.
  Recovered protected calls recheck durable owner, original expiry, canonical
  state, authoritative binding completeness and fresh repository roots.
- Successful protected completion and kill result paths remove durable and
  memory bindings. Context revocation precedes explicit owner release. Existing
  cancellation refusal was left unchanged.
- Caught context denials now reach a server-supplied private observer before
  public sanitization. Allowlisted reason/tool metadata excludes raw arguments;
  eligible ordinary trace/session denials can emit `context.trace_reattachable`.
  Observer failure leaves the fixed generic public denial unchanged.
- Appended the 34th catalog/tool/action entry with catalog version 1 retained;
  updated order assertions, regenerated the JSON digest and Markdown through
  `catalogProjection`/`renderToolCatalogMarkdown`, and added local recovery
  sequence/support-boundary documentation to `gateway/README.md`.

## Exact files and hashes

The immutable [checkpoint manifest](v6-a05-runtime-checkpoint-5-manifest.json)
contains SHA-256 and Git blob SHA-1 for all 24 production/test/docs candidate
files plus checkpoint 4, including preserved earlier slices. Its SHA-256 is
`e0d5d38edb6519cb0ea08de48ea327c9a48f2206ad20d18754d175c6f60b03ec`.
It also binds each compressed evidence file and its uncompressed bytes.
The manifest does not include itself or this checkpoint, avoiding circular
hashes. No files from the other A04 worktree were imported.

New production/test files this continuation:
`gateway/src/adapters/request_recovery_observations.js`,
`gateway/src/services/request_recovery_service.js`,
`tests/gateway/request_context_reattach.test.js`.

Existing files changed this continuation:
`gateway/src/core/repositories/request_context_repo.js` (preserved and extended),
`gateway/src/core/request_context.js`, `gateway/src/core/policy_types.js`,
`gateway/src/mcp_server.js`, `gateway/src/tools/catalog.js`,
`gateway/src/tools/index.js`, `gateway/src/tools/orchestration.js`,
`gateway/src/tools/tool_helpers.js`, `tests/gateway/tool_catalog.test.js`,
`gateway/contracts/mcp-tools-v1.json`, `docs/mcp-tool-catalog.md`,
`gateway/README.md`. Earlier migration, task-action and identity helpers/tests
are preserved; historical SQL files/digests are unchanged.

## Revalidated historical anchors

The sheet's line numbers describe its historical base; current counterparts:

| Historical concern | Current anchor |
|---|---|
| Empty startup lineage | `gateway/src/core/request_context.js:155` |
| Protected owned trace | `gateway/src/core/request_context.js:418` |
| Connection mismatch retained | `gateway/src/core/request_context.js:324` |
| Durable-before-memory result publication | `gateway/src/core/request_context.js:875` |
| Gateway context factory | `gateway/src/core/request_context.js:997` |
| Actual state/bootstrap identity wiring | `gateway/src/mcp_server.js:236`, `:258` |
| Canonical cancellation requires an outcome | `gateway/src/services/orchestration_service.js:83` |
| Canonical cancellation action | `gateway/src/core/lifecycle.js:58` |
| Existing lifecycle transaction | `gateway/src/core/repositories/lifecycle_repo.js:270` |
| Linux process identity reader | `gateway/src/adapters/process_supervisor.js:402` |
| Existing synchronous argv tmux helper | `gateway/src/adapters/tmux_client.js:28` |
| Generic/A/B explicit migration profiles | `gateway/src/core/sqlite_migration_sets.js:60`, `:64`, `:68` |

## RED and GREEN evidence

Node v22.22.1; non-login shells; `--experimental-test-isolation=none` retained
from checkpoint 3. All totals below are actual emitted runner totals.

1. Initial runtime RED before production edits:
   `node --test --experimental-test-isolation=none tests/gateway/request_context_reattach.test.js`.
   Exit 1: **0 passed, 16 failed, 0 cancelled/skipped/todo**.
   [Full RED](v6-a05-runtime-red.txt.gz). The durable-write-failure, caught
   denial-observer and 34th-tool tests reached distinguishing existing behavior.
   Thirteen others stopped at the missing service-export assertion and are
   separately classified as API-absence evidence, not behavioral guard RED.
2. First runtime GREEN attempt: **15 passed, 1 failed**, exit 1.
   [Attempt log](v6-a05-runtime-green-attempt1.txt.gz). The synthetic ask test
   omitted the existing required `traceId`; corrected the test input without
   changing that schema or importing A04 behavior.
3. Initial regression attempt: **162 passed, 4 failed**, exit 1, with no skips.
   [Regression log](v6-a05-runtime-regression-attempt1.txt.gz). Failures were
   stale 33-tool order/golden assertions and generated Markdown; subsequently
   updated/generated under the sheet's additive projection contract.
4. Additional meaningful denial-hint RED after initial runtime wiring:
   `node --test --experimental-test-isolation=none --test-name-pattern='private observer allowlists|ordinary session denial logs' tests/gateway/request_context_reattach.test.js`.
   Exit 1: **0 passed, 2 failed, 0 cancelled/skipped/todo**.
   [Hint RED](v6-a05-denial-hint-red.txt.gz). A service-supplied sensitive reason
   was forwarded to the observer, and a saved eligible session without a
   caller trace failed to emit the operator hint. The allowlist and trusted
   session-to-trace lookup fixes distinguish these failures.
5. Final focused GREEN, exit 0: **217 passed, 0 failed/cancelled/skipped/todo**.
   [Complete focused log](v6-a05-runtime-focused-green.txt.gz).

Final exact command:

```bash
node --test --experimental-test-isolation=none tests/gateway/request_context_reattach.test.js tests/gateway/request_context.test.js tests/gateway/request_context_boundary.test.js tests/gateway/request_context_execution_binding.test.js tests/gateway/request_context_reattach_repository.test.js tests/gateway/request_context_reattach_identity.test.js tests/gateway/tool_catalog.test.js tests/gateway/tool_projection_contract.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/lifecycle_rebaseline_core_repository.test.js tests/gateway/lifecycle_rebaseline_core_service.test.js tests/gateway/state_init.test.js tests/gateway/sqlite_migrations.test.js tests/gateway/coordination_consumer_epoch_migrations.test.js
git diff --check
```

`git diff --check`: exit 0. Runtime suite now has 18 passing tests. Its fake
agent service observes actual stored target rows through the protected wrappers
but invokes no provider. The concurrency test uses two contexts over one
SQLite handle and competing promises; it is not a multi-process race. The
prior helper two-handle lock test remains in the focused set.

## Required next work before trial-1 review submission

This slice is incomplete; **do not write or approve `A_0_5-1_to_review.md`
from these GREEN totals alone**. Continue with targeted RED before each fix:

1. Add actual disposable stdio bootstrap provenance coverage. The bootstrap
   composition exists, but it has not been executed or proven by this coder.
   Verify the durable owner against actual OS UID/PID/start/boot observations,
   with changed provider/username/configured-principal assertions. The sandbox's
   owner remapping noted in checkpoint 3 remains a constraint; root must run
   the actual private-owned workspace check on the host if needed. No injected
   identity test substitutes for this acceptance test.
2. Exercise production process/tmux observations, including live owner,
   unreadable ambiguity, reused PID/start and changed boot identity, exact
   prefix-sensitive tmux targets, command failures, 1-second timeout and total
   5-second budget. Current runtime tests inject probe/liveness observations;
   production adapters are wired but not execution-tested.
3. Finish lifecycle integration at the canonical cancellation boundary.
   Tool-result completion/kill hooks exist; direct canonical cancellation does
   not yet trigger automatic durable/memory cleanup. Add actual canonical
   cancellation and refused-cancel retention tests, completion/kill racing
   recovery tests and any necessary hooks. Preserve the current cancel refusal.
   Check shutdown behavior when durable owner release fails so transport/registry
   cleanup still runs after revocation. Audit provider-await boundaries for
   ownership/state changes before protected side effects; current rechecks
   occur at protected request binding, not at every later async boundary.
4. Add runtime distinguishing coverage for every repository ID/root (including
   changed root with same ID), taskless/incomplete/tampered binding denial,
   session-closed skips, exact original/current context expiry and expiry
   non-renewal, unsupported Darwin/PostgreSQL normal-call compatibility,
   foreign/incomplete discovery privacy and the 100-entry/truncation cap.
   Helper tests cover several of these predicates, but the complete sheet's
   runtime acceptance matrix has not yet been demonstrated.
5. Prove a two-database-handle or multi-process runtime race yields one winner
   and no loser memory ownership; forced transaction failure and same-context
   retries already pass in the current runtime suite. Test durable task/spawn
   failure before memory publication through actual result-recording paths.
6. Rerun only changed/focused suites as justified by those additions, archive
   exact logs/hashes, then create the immutable trial-1 review request with the
   complete acceptance checklist. Only root's independent reviewer may approve.

Root owns shared CHANGELOG, CI, status, plan/review indexes and write-scope
registry reconciliation. Root must serially reconcile A05's catalog/contract/
docs/action changes with independently reviewed A04 changes; these projections
contain this worktree's baseline agent.ask contract only. No A04 reliability
implementation or error projection was imported. Update shared 34-tool/count/
write-scope expectations as required at integration; do not infer this from
focused GREEN alone.

Full `bash scripts/ci.sh`: **not run**; root runs it solo on host outside sandbox.
Actual stdio process, tmux/provider child, host restart, operator Codex live
acceptance and actual runtime/provider version transcript: **not run**.
No Claude invocation, provider invocation, subagent, self-review, policy edit,
commit, push, reset, stash, or shared index/status/CI/CHANGELOG edit occurred.
No implemented/reviewed/integrated/promoted/released status update is claimed.

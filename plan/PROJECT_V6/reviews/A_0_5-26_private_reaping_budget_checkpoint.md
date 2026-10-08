# A/0/05 trial4 private-reaping continuation checkpoint

2026-10-08. UNREVIEWED, UNCOMMITTED, INCOMPLETE. Fresh coder continuation
on HEAD6317df1481eff19fc504ef6334dccd48be3648eb, branch
feat/V6-A-0-05-local-recovery. Stop within the requested 20k task budget.
No A_0_5-4_to_review.md: wider residue remains unexplained. No new trace,
task/session receipt, verdict, full gate, commit, integration or release claim.
Root owns permissions, independent Claude review, full project gate, shared
source/CI inventory reconciliation, integration and live restart acceptance.

Read AGENTS/profile/plan README/Stage A README/sheet, trial3 scoped OK,
request/root full-gate failure, checkpoints19-24, cleanup source and callers,
tmux receipts, kernel identity reader and fixtures before edits. Build skill
orchestration defaults yield to explicit coder-only scope. No agents spawned.

## Proven attribution and test-first fixes

Checkpoint25 records the exact two independent causes with authoritative raw
stat identities in private-panes-red. Verified closure killed private server
before reaping its two direct panes: server1435992/start18253582/PGID1435931/
SID1435931; pane1435997/start18253584/PGID=SID1435997 and1436002/start18253585/
PGID=SID1436002 become Z under supervisor1435924, from parent1435992.
Ambiguous production refusal correctly preserves server1436015/start18253590
and panes1436019/start18253592 and1436023/start18253593, PGID=SID=PID for each
pane. Its separate fixture cleanup kills the server first and strands both Z
under1435924. These exact observed identities are not inferred for earlier runs.

New RED assertions: verified closure requires pane ENOENT and kill(0) ESRCH
BEFORE teardown; ambiguous case separately requires fixture pane absence
AFTER fixture teardown. Actual parent linkage and full retained identities
are proved before closure. RED0pass/2fail, exit1, process_tree_leak precedes
source changes. Production-only intermediate1pass/1fail confirms verified
closure fixed while ambiguous fixture still fails. No fixture success is
credited as ambiguous production cleanup.

Only two baseline files differ:
- request_launch_cleanup.js: shares existing postorder per-descendant waits
  between pane cleanup and verified wholly-owned private-server close. Close
  rechecks exact socket/server identity before traversal and before signal,
  requires no remaining descendants before ending server, retains strict
  kernel absence. Individual waits remain50x10ms for children,100x10ms for
  server and1000ms wrapper wait. A five-second cap bounds the added server
  traversal and probes; pane cleanup retains its existing five-second cap.
  No command timeout, signal authority or identity predicate weakened.
- request_context_reattach.test.js: new distinguishing pane absence tests,
  exact identity/parent diagnostics, zero production signals and preserved live
  panes under ambiguity. FixtureServerCleanup independently binds exact
  socket/server/PID/start/PGID/SID, pane tuple and direct parent, reaps each
  pane while the verified server lives, then closes that server. This fixture
  handles only its own direct-pane fixtures, not general provider containment.

private-panes-green4/4 and final-focused42/42 have CI completed, not residue.
Final focused includes unchanged timeout receipt, ordered hierarchy,
original failure, ambiguity, provider parity and late-audit tests. Logs record
production absence before fixture teardown for verified closure; ambiguity
retains live identities and emits zero production signals. Fixture-only
absence has separate diagnostics.

## Actual supervised results (overlap; do not sum)

All run host ci_gate.py::_execute_command with pinned tmux3.6a-agents.1,
Nodev22.22.1, DEFAULT isolation/concurrency1. No harness file modified.
All zero cancelled/todo. Exact argv, SHA256 and outcome JSON archived.

| Run | Pass | Fail | Skip | Node exit | CI status |
|---|---:|---:|---:|---:|---|
| early-delegate | 4 | 0 | 0 | 0 | process_tree_leak |
| early-others | 12 | 0 | 0 | 0 | completed |
| focused-final | 42 | 0 | 0 | 0 | completed |
| private-panes-green | 4 | 0 | 0 | 0 | completed |
| private-panes-red | 0 | 2 | 0 | 1 | process_tree_leak |
| production-only | 1 | 1 | 0 | 1 | process_tree_leak |
| refusal-ambiguous | 1 | 0 | 0 | 0 | process_tree_leak |
| refusal-verified | 1 | 0 | 0 | 0 | process_tree_leak |
| remaining-runtime | 122 | 0 | 0 | 0 | process_tree_leak |
| runtime-diagnostic | 122 | 0 | 0 | 0 | completed |
| runtime-kill | 1 | 0 | 0 | 0 | completed |
| runtime-race | 1 | 0 | 0 | 0 | completed |
| split-early | 16 | 0 | 0 | 0 | process_tree_leak |
| split-late | 18 | 0 | 0 | 0 | completed |
| wider-a | 172 | 0 | 0 | 0 | completed |
| wider-final | 384 | 0 | 0 | 0 | process_tree_leak |

**wider-final is RED:**384 assertions pass, exit0, process_tree_leak.
Its26-file argv is archived. Includes sheet verification, service, migrations,
contracts, bootstrap, scaffold and previous root-failure files. No full
project gate or skip-budget certification was run.

remaining-runtime used a negative regex that unexpectedly executes ALL122
runtime tests (ancestor matching); it is NOT a valid excluded subset. It
reports process_tree_leak and cannot localize to unseen tests. Exact process
race and final real-kill tests each complete clean1/1. Wider-a first12 files
excluding runtime completes clean; complementary wider-b was NOT run.

runtime-diagnostic executes122/122 with completed, using temporary bounded
fixture-only before/after descendant observation. This clean diagnostic run
DOES NOT explain previous residue or supersede wider-final RED. Diagnostic
helper source archived, restored byte-for-byte to continuation baseline;
production behavior unchanged during diagnosis. No rerun-to-green claim.
The remaining wider/runtime residue needs exact case and PID/start/PGID/SID/
parent attribution. Use bounded owned-domain supervisor diagnostics if fixture
records are insufficient; preserve original supervisor status and decisions.
Do not increase timeouts, broaden matching or count zombies as absent.

## Evidence, absence and remaining work

Every prior review/checkpoint/archive matches baseline bytes. New archives
v6-a05-residue-* preserve full diagnostic/raw bytes, runner, argv/source
bindings, baseline and final PID absence observations. Manifest
v6-a05-residue-checkpoint-manifest.json binds exact current dirty candidate
and archives; source snapshots retained. Final host reads333 exact emitted
PIDs: all /proc stat ENOENT and kill(0) ESRCH AFTER containment/fixture
cleanup. This is final absence, NEVER successful production cleanup evidence
for RED runs. Each supervisor result required quiescence/root-reaped/
subreaper-restored/zero-open-pidfds. No manual signals or global PID cleanup.

Syntax checks and git diff --check pass. No policies changes, commit, push,
tag, provider invocation/restart, self-review or subagents. No evidence file
was overwritten. Host scoped runs were explicitly approved. Initial aborted
RED request did not produce a command/log; the actual RED is preserved.

Next fresh coder: read checkpoint24-26 and exact wider-final/remaining-runtime
RED, inspect diagnostic-helper source/log without treating clean run as
attribution. Localize remaining runtime-file residue first. Narrow test-first
fix only after exact attribution, then clean focused+wider on final source.
Only then issue A_0_5-4_to_review.md for independent Claude. Root alone
coordinates later full solo project gate and operator live acceptance.

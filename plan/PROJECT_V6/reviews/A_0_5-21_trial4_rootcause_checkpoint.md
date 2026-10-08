# A/0/05 trial4 unresolved root cause and budget checkpoint

2026-10-08. UNREVIEWED, UNCOMMITTED, INCOMPLETE. Stop before task-budget
overrun; resume in a fresh root-authorized coder session, same required model.
No independent verdict, full-sheet OK, integration or release is claimed.
Trace `tr-r4-a05-fullsuite-28e39a62-09ec-4d36-bea4-b60245de8f6e`;
root-registered task placeholder is still unresolved locally.

## Reproduction and actual failure

After checkpoint20 the focused supervised run reproduces the historical
assertion:40pass/1fail/0skip, Node exit1, CI command status
`process_tree_leak`. This is NOT GREEN. The timeout variant passes, but the
original before-response case remains RED. A second attributed targeted run
is0pass/1fail/0skip, exit1, `process_tree_leak`.

For that targeted run, actual creation command status0, signalnull,
timeout1000ms, complete response `a05-create-v1 $0 %0 1241164\n`.
Receipt exists: cleanup executes `cleanPanes`, not a timeout/no-receipt path.
Original adapter error: `tmux send-keys failed: unknown error` (the shim's
intentional exit1). Actual emitted error: `ADAPTER_CLEANUP_FAILED`, stack at
`request_launch_cleanup.js:88`, the observed-child absence check after signals.
Actual public return:TOOL_ERROR/isErrortrue. No business session/lineage
publication succeeded.

Before teardown:session$0/pane%0, PID1241164/start18134925,
PGID1241164/SID1241164 still alive; replacement$1/%1,
PID1241173/start18134926, PGID1241173/SID1241173 still alive.
Exact foreground fixture server PID1241144/start18134908 (see actual log
for authoritative token), actual runtime tmux3.6a-agents.1, Nodev22.22.1.

The signalled subtree distinguishes the cause:

- conda PID1241250/start18134935, PGID1241164/SID1241164, initiallyR,
  PPID1241249; after signalling it isZ with PPID1241037 (CI supervisor).
- bash PID1241249/start18134935, same PGID/SID, initiallyS,
  PPID1241164; after signalling it is positively ENOENT.

`cleanPanes` signals every descendant before waiting for any to be reaped.
It kills the intermediate parent before that parent reaps the leaf; the
leaf is adopted by the subreaper and staysZ until supervisor cleanup.
The guard correctly refuses to treat that still-existing kernel process as
absent. This is a business cleanup ordering defect exposed by uncontrolled
interactive-shell startup descendants in the fixture, not a proven flake.
Historical full-gate attribution remains limited: its log does not retain
these descendant identities, so this reproduction proves a mechanism,
not an invented exact identity/error for the original invocation.

## Candidate and next authorized work

Only production change this turn is an unreviewed independent timeout-receipt
correction in `gateway/src/adapters/tmux_client.js`. It has a valid pre-source
RED (`timeout-red.txt`), and the timeout case passes in `focused.txt`, but it
DOES NOT fix the historical cleanup-ordering failure. No additional wait,
retry, guessed name authority, policy edit or provider invocation.
Test changes only `tests/gateway/request_context_reattach.test.js`: diagnostics,
new deterministic complete-response timeout case, positive kernel absence
checks. Initial GREEN attempt was fixture-invalid; retained as such.

Next session must write a deterministic two-level fixture where the parent
must reap a delayed exiting child, record RED before cleanup-source changes,
and narrowly make observed leaves settle before signalling their parents.
Preserve PID/start/PGID/SID and tmux tuple predicates; do not count zombies,
null readers, fixture teardown or supervisor cleanup as production absence.
Read immediate cleanup callers/shared utilities again as necessary.
Then focused default-isolation/concurrency1 and Gateway full suite with
exact owned-residue proof. Full `bash scripts/ci.sh` remains PENDING ROOT,
with no overlap; live real-Codex acceptance remains operator-owned.

All this turn's processes have settled. Existing CI supervisor returned only
after verified quiescence/root-reaped/subreaper-restored/zero-open-pidfds
protocol checks; `process_tree_leak` means it needed fixture/containment
cleanup, NOT clean production execution. Final exact PID kernel absence
observations are bound in trial4-checkpoint manifest. No global process scan,
broad/name cleanup or manual signals were used. Harness directory untouched.
Prior request/verdict/manifests/archives preserved. No commits/push/subagents,
self-review, Gateway restart, production-provider work or full-gate run.

Exact commands and source bindings: archived `focused-command.json`,
`attributed-command.json`, their outcome JSON, immutable raw log archives.
Runner calls existing `scripts/ci_gate.py::_execute_command` for these tests
only, not the project gate. Prior baseline hashes and runner also archived.

# A/0/05 ordered-reaping budget checkpoint

2026-10-08. Unreviewed, uncommitted, incomplete. Stop within the user task
budget, with no independent review request. Actual current HEAD and every
supervised command HEAD: 6317df1481eff19fc504ef6334dccd48be3648eb. Checkpoint23
incorrectly repeats historical HEAD 5dde9f0; this immutable correction supersedes
that transcription. Checkpoint23 itself is unchanged. No commit was made here.
User specifies GPT-6.1 medium, 20k task-token cap, no agents; no provider banner
or Gateway task/session identity was fabricated. Root owns further authority.

## Implemented correction and TDD

Only two pre-existing file byte sets changed from this continuation baseline:
request_launch_cleanup.js and request_context_reattach.test.js. New production
change is the postorder per-child absence wait. Exact tuple and PID/start/PGID/SID
predicates are unchanged; null identity remains ambiguous, zombies remain live,
ENOENT+ESRCH remains the absence requirement, and the shared deadline stays five
seconds. A naturally ended ancestor is skipped after the unchanged matching
predicate establishes that its retained identity ended. No timeout increase,
name-only PID match, retry or inferred cleanup authority was added. Existing
timeout-receipt edit in tmux_client.js is unchanged and remains separately
unreviewed. No README, CI inventory, harness or policies edit was made here.

New test: `ordered descendant cleanup lets each parent reap before signalling
that parent`. Actual two-level ancestry and live identities are asserted; the
leaf delays exit after SIGTERM, the parent waits and records reaping before
its own signal. The observed original session is renamed and its old name is
reused; cleanup must preserve the replacement's full kernel identity. Successful
cleanup requires pane/parent/leaf ENOENT and ESRCH BEFORE fixture teardown.

## Exact supervised results

All use /tmp/ao-tmux-tools/bin pinned tmux 3.6a-agents.1, Node v22.22.1,
default process isolation, concurrency1, and existing ci_gate.py::_execute_command.
Runner argv/source hashes and exact outcome JSON are archived alongside raw TAP.
All runs have zero cancelled/skipped/todo. Counts overlap, do not sum them.

| Run | Pass | Fail | Node exit | CI status | Meaning |
|---|---:|---:|---:|---|---|
| red | 0 | 1 | 1 | process_tree_leak | parent signal reaped=false; adopted leaf Z; valid pre-source RED |
| green | 1 | 0 | 0 | completed | parent signal reaped=true; every original identity absent before teardown |
| focused | 42 | 0 | 0 | process_tree_leak | NOT GREEN despite all assertions passing |
| attributed | 1 | 0 | 0 | completed | historical before-response case alone; conda absent before teardown |
| observation | 8 | 0 | 0 | completed | creation-observation suite alone |
| runtime | 34 | 0 | 0 | process_tree_leak | remaining runtime cleanup group; residue localized to this group |

The sandbox initial RED attempt failed before Node with truncated supervisor
protocol frame. Excluded from behavioral evidence. Original host RED followed
before cleanup source changed. Diagnostic split commands attribute the wider
failure; they are not a retry-to-green claim. Historical original full-gate
failure is preserved and is NOT described as flaky or passed. Wider runtime
residue exact process/case/mechanism is still UNATTRIBUTED. No complete Gateway
suite, full project gate, service regression or live provider acceptance ran.

Source syntax checks for both edited files and git diff --check exit0. Prior
immutable review files and archives match the baseline bytes. Final observations
for exact PIDs actually emitted by these logs are in the manifest: all show
/proc-stat ENOENT and kill(0) ESRCH after supervisor/fixture containment. This is
final absence only, NEVER production cleanup success for process_tree_leak runs.
Existing supervisor return includes verified quiescence/root-reaped/subreaper-
restored/zero-open-pidfds; no harness change or manual signalling was performed.

## Continuation required

Attribute runtime group's process residue to exact identities and originating
case before any candidate GREEN or review request. Preserve all failed evidence;
do not simply repeat to green. The ordered-reaping mechanism and historical
case have scoped clean evidence, but the combined regression is NOT GREEN.
Then prepare a fresh source-bound A_0_5-4_to_review.md for independent Claude
only after clean focused verification. Root coordinates full solo gate, CI
inventory and skip budget, shared A04 reconciliation, integration, Gateway
artifacts and live restart acceptance. No new trace/artifact receipt, verdict,
self-review, commit, push, tag, provider invocation or restart is claimed.

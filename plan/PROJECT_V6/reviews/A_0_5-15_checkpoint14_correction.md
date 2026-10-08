# A/0/05 — checkpoint 15: correction to premature GREEN attribution

2026-10-08. Partial, unreviewed. Checkpoint14's combined 3/0 GREEN claim
is **incorrect and void**: the log had not completed when that checkpoint was
written. Its first two cases passed, but the late case failed in its teardown
hook (`ADAPTER_CLEANUP_FAILED`) during a second settlement, and a private server
kept the test runner alive. No green aggregate is credited to that run.

`settleRequestLaunch` now caches one cleanup promise per private receipt so
concurrent callers share settlement rather than issuing a second cleanup.
This is an owned-receipt lifecycle correction, not expanded cleanup authority.
The subsequent combined log `/tmp/v6-a05-cp15-settlement-green.txt` is actually
**1 pass / 2 fail**, exit1, no cancelled/skipped/todo. The late case passes.
The two guards failed their explicit precondition witnesses before mutation/
signal; they cannot establish product failures or be dismissed as a green run.
Launch-error diagnostics were then added to the disposable adapter fixture.
The attribution run `/tmp/v6-a05-cp15-guard-attribution.txt` completed 2/0,
exit0, zero cancelled/skipped/todo. It did not reproduce the earlier precondition
failures; those earlier failures remain unattributed, not erased by retry.

The original hung runner was inspected only through its exact known owned
Node PID624475's children. Its sole child was the empty private fixture tmux
server PID624918, startToken17584906, PGID/SID624473. A separate focused host
approval rechecked that exact identity and empty children, then sent SIGTERM
to that server so its Node parent could reap it. No global process scan or
name-only signal was used. This intervention is fixture cleanup and provides
no production containment proof. Root retains intervention/evidence governance.

No prior checkpoint was overwritten. No source verdict, complete handoff,
policy edit, model switch, subagent, commit, push or production restart.
Remaining work continues; all final totals must be read after completion.

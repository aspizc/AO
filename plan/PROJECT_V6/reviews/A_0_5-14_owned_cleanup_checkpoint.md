# A/0/05 — checkpoint 14: owned late-result and ambiguity corrections

2026-10-08. Partial, unreviewed. Checkpoints12–13 remain immutable. Root
explicitly authorized narrow corrections to owned-launch cleanup in existing
task source; no broader authority, global scan or name-only cleanup is inferred.
Trace/task/model remain those in checkpoint12. No model switch, quota notice,
subagent, review, commit, push, policy edit or production restart.

`agent_service.js` now retains an abandoned-request flag and a continuation
on its delegate invocation. When a late owned result arrives after the request
has failed, the continuation settles its private receipt without publication.
Cleanup errors are audited as `agent.delegate.late_cleanup`. No timeout
authority or result-derived cleanup handle is introduced. Checkpoint13's valid
late-result RED now passes in `/tmp/v6-a05-cp14-late-green.txt`: 1/1, exit0.

Two new tests ran before the cleanup adapter correction in
`/tmp/v6-a05-cp14-cleanup-red.txt`: 0 passed / 2 failed, exit1.
`spawn multiwindow ...` creates a second real pane in another window and
records the actual two-pane mutation. Existing cleanup enumerated only the
current window and killed the entire session, including its unobserved pane.
`spawn ambiguous-after-signal ...` simulates a signal attempt followed by an
exact descendant's unreadable stat; the child is deliberately kept alive by
the fixture. Existing polling treated the null reader as absence and closed
its parent. Both failed before teardown; they are behavioral RED evidence.

`request_launch_cleanup.js` now enumerates all panes in the retained immutable
session using `list-panes -s -t <id>`. Extra panes in any window refuse cleanup.
Identity matching compares retained PID/start/PGID/SID. Null requires both
ENOENT for that exact proc directory and ESRCH from its exact PID zero-signal
probe before it is counted as absence; permission/parse errors fail loudly.
A changed start token ends only the old identity and grants no replacement
signal authority. No global proc enumeration is performed.

Focused GREEN `/tmp/v6-a05-cp14-cleanup-green.txt`: 3 pass / 0 fail, exit0,
zero cancelled/skipped/todo, including the late delegate case:

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none --test-name-pattern='spawn multiwindow|spawn ambiguous-after-signal|delegate late' tests/gateway/request_context_reattach.test.js
```

Short host test approvals were separate from normal-workspace source patches.
Remaining: full focused regression, late cleanup failure observation, exact
non-tmux descendant tests/boundary, other executable-provider cleanup, overall
bounds and immutable evidence binding. No complete-sheet claim is made.

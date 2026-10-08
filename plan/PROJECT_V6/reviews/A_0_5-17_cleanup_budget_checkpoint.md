# A/0/05 — checkpoint 17: fixed owned-pane cleanup budget

2026-10-08. Partial, unreviewed; checkpoints12–16 remain immutable. No model
switch, subagent, self-review, commit, push, policy edit or production restart.

Before budget edits, `/tmp/v6-a05-cp17-focused-regression.txt` completed **32
pass / 0 fail**, exit0, zero cancelled/skipped/todo. It covers four other
providers' production registry spawn/delegate calls with disposable executables,
Codex late settlement, private receipt single-flight, failed publication,
name replacement, multipane/multiwindow, unreadable identity before/after
signalling, resistant descendants, non-tmux setsid ancestry and receipt parsing.
The existing service/context/catalog regression completed **144/0**, exit0
with no skips/cancellations in `/tmp/v6-a05-cp17-service-regression.txt`.
Counts overlap earlier runs and do not prove full CI or live-provider acceptance.

The first timing fixture called Codex spawn repeatedly under the same trace/
agent/role, whose session target is deterministic. It failed before the timing
witness (`/tmp/v6-a05-cp17-bound-red.txt`, 0/1 exit1); this is fixture error,
not behavioral RED. The corrected fixture creates five distinct supported
detached sessions inside the private observer scope and proves all five exist
before setting the cleanup clock. Its shim delays only cleanup `list-panes`
probes by 700 ms each; no global scan or name-only cleanup is used.

Valid RED `/tmp/v6-a05-cp17-bound-valid-red.txt`: **0/1**, exit1, observed
cleanup elapsed **8399.142863 ms**, failing the 5500 ms assertion for a shared
five-second budget. No new durable session lineage is published. The owned
foreground fixture reaps all remaining panes/server after the assertion.

`request_launch_cleanup.js` now uses one five-second monotonic deadline for
the entire `cleanPanes` invocation, shared across all retained creations.
Every exact-target tmux query receives min(1000 ms, remaining budget), and
ancestry traversal, signals and polling check the same deadline. Exhaustion
is explicit `ADAPTER_CLEANUP_FAILED`; it grants no extra signal or target scope.
This fixes cumulative per-command timeout growth, not kernel pidfd races.

GREEN `/tmp/v6-a05-cp17-bound-green.txt` completed **1/0**, exit0, zero
cancelled/skipped/todo. Exact RED/GREEN command:

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none --test-name-pattern='spawn bounded' tests/gateway/request_context_reattach.test.js
```

The five-second bound covers retained pane settlement. Delegate private-server
close separately retains its existing one-second exit wait; provider work and
server startup are outside the cleanup timer. These are application budgets,
not a guarantee that arbitrary hostile native commands or kernel I/O can be
preempted. A cleanup refusal may preserve owned live resources rather than
guess authority. Detached/reparented children without receipts remain the
explicit supervisor/containment boundary in checkpoint16.

Syntax checks for touched source/test paths and `git diff --check` pass.
The post-budget combined regression and immutable final evidence binding remain
to run. Independent review, full solo host gate/skip budget and real Codex
restart acceptance remain root/operator-owned. No complete-sheet claim.

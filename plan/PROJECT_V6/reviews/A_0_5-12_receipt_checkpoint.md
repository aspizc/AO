# A/0/05 — checkpoint 12: creation-bound receipt

2026-10-08. **Partial, unreviewed; not a verdict or complete handoff.**
Trace `tr-v6-a05-cp11-resume-0be117f4-aad5-4c2b-aa65-6d7e5817d7d0`;
task `ts-e4cd104e-171b-4c9b-a0bc-05ed9e718df9`. The exact coder pane `%7`
was read on the host: `GPT-6.1-Sol medium fast`, Codex v0.160.1.
No model switch or quota notice was observed at this checkpoint.

AGENTS.md, plan/README.md, Stage A README, A/0/05, review index, historical
source OK/full-gate failure, append-only plan OK and checkpoints 9–11 were
read before edits. Root had verified both checkpoint11 test hashes.
Root's `/tmp/v6-a05-cp12-red.txt` was read through complete TAP totals before
production edits: **1 pass / 8 fail / 0 cancelled / 0 skipped / 0 todo**.
The original child remained alive in the before-response replacement case;
the actual scoped argv assertion and six malformed-output cases also failed.
The async-scope guard already passed and is not new RED evidence.

Only `gateway/src/adapters/tmux_client.js` production bytes changed in this
slice. The A05 Linux observer scope executes the supported six-argument
detached creation command plus fixed `-P -F` template
`a05-create-v1 #{session_id} #{pane_id} #{pane_pid}`. It requires exactly one
complete framed row and a readable Linux PID/start identity, freezes the
private receipt before returning and exposes empty stdout/output[1] as the
original command does. No name query grants creation authority. Ordinary
argv/returns and the builder remain unchanged. Unsupported scoped shapes,
custom encoding/stdio, malformed or unverifiable receipts refuse authority.
Failed creation grants no receipt. Cleanup still rechecks immutable tmux
session/pane/PID and retained start token; this is not a pidfd guarantee.

Focused host GREEN, `/tmp/v6-a05-cp12-receipt-green.txt`: **9 pass / 0 fail /
0 cancelled / 0 skipped / 0 todo**, exit 0:

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none --test-name-pattern='adapter-failure-before-response|creation observ|malformed creation' tests/gateway/request_context_reattach.test.js tests/gateway/request_launch_observation.test.js
```

The before-response replacement case reaps the original identity and leaves
the replacement alive before fixture teardown. These are disposable pinned
tmux/disposable provider tests, not real-provider acceptance. All nine owned
foreground fixture servers report exit. Syntax and `git diff --check` pass.
Source patches and short focused host test approvals were separate.

Remaining: receipt guards, prior cleanup regressions, timeout/late settlement,
non-tmux descendants, ambiguity/resistance/multipane and other providers.
Checkpoint9's limits still apply, including overall containment bounds and
numeric-PID races. Broad provider/process-control implementation is outside
the narrow creation-receipt source grant; new failures must be preserved and
handed to root rather than treated as acceptance or guessed cleanup authority.
Full solo host gate, skip budget, real Codex restart acceptance and independent
review remain root/operator-owned. Dirty work was preserved; no policies,
subagents, self-review, commits, push or production Gateway restart.

This file is immutable. Later work and final evidence binding go in a new
checkpoint; no complete-sheet status is claimed.

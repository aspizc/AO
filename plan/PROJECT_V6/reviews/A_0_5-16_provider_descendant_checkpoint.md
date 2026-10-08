# A/0/05 — checkpoint 16: executable-provider and non-tmux ancestry guards

2026-10-08. Partial, unreviewed. Checkpoints12–15 remain immutable. No model
switch, subagent, self-review, commit, push, policy edit or production restart.
The separately approved failed-test fixture intervention from checkpoint15
let `/tmp/v6-a05-cp14-cleanup-green.txt` emit final totals: **2 pass / 1 fail**,
exit1, zero cancelled/skipped/todo. Checkpoint14's 3/0 claim stays void.

Four new production-registry tests, one each for claude-code, antigravity, pi
and opencode, use only disposable executables and private foreground tmux.
They rebind their fixture's authoritative task/session and recovery payload to
the actual provider, explicitly reattach, launch through `getToolRegistry`,
wait for the actual provider witness, then force durable publication failure.
Before production registration changes, `/tmp/v6-a05-cp16-providers-red.txt`
completed **0/4**, exit1: every started identity remained alive before teardown.

`tools/index.js` now applies the existing private owned-launch wrapper to those
four executable providers, as already done for Codex. Registry-only gemini-cli
is unchanged. Ordinary/unbound/dry-run calls bypass the wrapper. No adapter
provider argv, public projection, policy or A04 input transport was changed.
The same four tests then completed **4/0**, exit0 in
`/tmp/v6-a05-cp16-providers-green.txt`. Additional actual-registry headless
delegate guards for the four providers create owned private tmux descendants
and verify they are gone after success. The combined eight-case log
`/tmp/v6-a05-cp16-providers-all-guard.txt` completed **8/0**, exit0.
All complete runs have zero cancelled/skipped/todo; counts overlap.

`spawn detached-descendant ...` uses a disposable provider that retains its
Node child handle. Its child actually calls setsid through `detached:true`,
records its own PID/start/PGID/SID and remains a descendant of the live provider.
The fixture asserts PGID=SID=PID and retained liveness before revocation;
the production cleanup follows only exact observed ancestry and both parent
and child must be absent before teardown. The parent waits for its child exit
on SIGTERM so fixture ownership/reaping is retained; C-c teardown also reaps it.
This is observed non-tmux ancestry guard coverage, not detached orphan parity.

First log `/tmp/v6-a05-cp16-detached-guard.txt`: **0/1**, exit1. The attribution
log `/tmp/v6-a05-cp16-detached-attribution.txt` also completed **0/1**, exit1,
showing an adapter-fixture assertion: the provider ready marker was missing
after the bounded one-second wait. Neither establishes a cleanup behavior
failure, because the required launch witness was never reached. Adding a
private exact-fixture-pane diagnostic did not reproduce that condition:
`/tmp/v6-a05-cp16-detached-fixture-error.txt` completed **1/0**, exit0, with both
identities gone before teardown. Timing remains a verification limit, not a
claimed product fix. The fixture ready wait was subsequently aligned to its
existing two-second adapter bound; the late result assertion now polls its
exact retained identity for at most one second rather than sleeping 20 ms.
Those final fixture changes still require the combined regression.

## Exact authority boundary

The ordinary headless adapters execute `spawnSync`. A child may fork, setsid
and reparent before that blocking provider invocation returns. Neither the
private tmux server nor a returned adapter result proves ownership of such a
non-tmux process, and this implementation has no prior PID/start receipt for
it. Task-local `/proc/<known-pid>/children` then cannot recover the lost
ancestry. Broad process enumeration, command-name matching or signalling a
guessed group would add forbidden authority. Full parity for that case requires
a launch-owned supervisor/subreaper or kernel containment/identity receipt,
with separately assessed ownership and settlement semantics. No such feature
is implemented or safety guarantee claimed in this continuation.

Remaining independently safe work: combined focused regression, late cleanup
failure logging guard, overall cleanup deadline assessment, final immutable
binding. Full gate/skip budget, real-provider restart acceptance, independent
review and integration remain root/operator-owned. No complete-sheet handoff.

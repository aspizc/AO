# A/0/05 — Checkpoint 9: scoped creation observation

2026-10-08. **Partial, unreviewed candidate.** Immutable coder checkpoint,
not a verdict or complete sheet handoff. No independent review was invoked.

## Entry, operator scope and command-shape correction

HEAD `98ebd202aff5a92dc401e260b69ff73a1421be70`, branch
`feat/V6-A-0-05-local-recovery`. Checkpoint8 verified **49/49 file hashes** and
**3/3 compressed and uncompressed archive hashes** before edits. The earlier
checkpoint7 verification remains **47/47 files and 8/8 compressed archives**.
The dirty candidate and all prior evidence were preserved.

The operator explicitly authorized a narrowly scoped observation-only hook in
`gateway/src/adapters/tmux_client.js` for A05. Existing command arguments and
behavior must be preserved; immutable observed tmux session/pane and Linux
process identity may be captured only after successful creation. No name-only
or global cleanup authority is authorized. A04 review is in a separate worktree;
root owns serial reconciliation of this shared file. A04's `base_adapter.js`,
Codex base path and Claude paths remain untouched, as do policies and release
files. No subagents, self-review, push, tag, commit or production Gateway work.

The first proposed host command mixed a large source edit with test execution.
The operator declined it as unreviewable command shape, explicitly retaining
the hook authorization. Inspection confirmed that its test/source additions
and output log did not exist. **It did not execute and has no test outcome.**
Subsequent source/test edits used separate normal-workspace patches; each host
approval contained only the focused Node test command and log redirection.

## Changes and observed behavior

Only four candidate paths changed from checkpoint8:

- `gateway/src/adapters/tmux_client.js`
- `gateway/src/adapters/request_launch_cleanup.js`
- `tests/gateway/request_context_reattach.test.js`
- `tests/gateway/request_launch_observation.test.js` (new)

`withTmuxCreationObserver` uses AsyncLocalStorage to bind a private callback to
one launch scope. Ordinary calls have no observer. `tmuxSync` still invokes the
original argv/options and returns its original result. Only a successful Linux
`new-session` in the existing six-argument detached creation shape triggers an
additional bounded exact-target `list-panes` observation. That query obtains
actual immutable session ID, pane ID and Linux PID/start/PGID/SID identity;
the receipt and identity are frozen. Failed creation, non-creation calls and
unrelated async scopes emit no receipt. No tmux global hook is installed.
Unsupported creation shapes or failed identity observations throw, rather than
manufacture cleanup authority. The query uses the command's environment and
has a one-second timeout and an 8192-byte output bound.

The supervised cleanup wrapper retains its receipt synchronously at creation,
before the next adapter operation can fail. Cleanup continues to require the
retained immutable tmux IDs and the observed kernel process identity, with
rechecks before signalling descendants or killing the immutable session ID.
It no longer derives supervised cleanup authority from `result.tmuxTarget`.
A successful returned result without an observed creation receipt fails closed.
Delegate behavior is unchanged by this slice; its existing private-server path
remains separate. No SQLite transaction spans provider work.

## TDD RED and GREEN

Host RED before production edits: **0 passed / 4 failed**, exit 1, zero
cancelled/skipped/todo. Two failures are behavioral orphan RED, two are new
observer API-absence RED and must not be described as behavioral evidence.

Distinguishing cases:

1. `spawn adapter-failure settles only its observed child after durable publication`
   — checkpoint8 real-child failure repeated before the fix. Despite the
   parameterized label, this case publishes nothing: actual CodexAdapter.spawn
   rejects at `send-keys`, after a disposable provider starts, before returning
   any result. The child was still alive before fixture teardown in RED.
2. `spawn adapter-failure-name-reused settles only its observed child after durable publication`
   — actual adapter failure, then rename the original session and start another
   child under its old name before the cleanup wrapper sees the error. RED
   leaves the original alive. GREEN reaps the retained original before fixture
   teardown and leaves the replacement identity alive.
3. `creation observation retains frozen real identity and failed creation grants no receipt`
   — obtains real session/pane/process identity; a second create against the
   existing name fails and emits no additional receipt. The final regression
   also forwards through a disposable executable shim and asserts the actual
   creation argv exactly equals the original argv, with original empty stdout.
4. `creation observer stays scoped across awaits and ignores unrelated and non-creation commands`
   — an unrelated launch outside a suspended observer scope emits no receipt;
   the scoped launch after its await does; probing another named target does not.

Exact RED and initial GREEN command (different immutable logs):

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none --test-name-pattern='spawn adapter-failure|creation observ' tests/gateway/request_context_reattach.test.js tests/gateway/request_launch_observation.test.js
```

Initial GREEN: **4 passed / 0 failed**, exit 0, zero cancelled/skipped/todo.
Then strengthen the first observer test with an actual emitted-argv check;
this is additional guard coverage, not a new behavioral RED claim.
Final cleanup/observation regression: **10 passed / 0 failed**, exit 0, zero
cancelled/skipped/todo, including the six preserved checkpoint7 cleanup cases:

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none --test-name-pattern='settles only|post-await denial must leave|creation observ' tests/gateway/request_context_reattach.test.js tests/gateway/request_launch_observation.test.js
```

All host tests use disposable providers and private foreground tmux fixtures;
fixture diagnostics confirm each owned foreground server exits. They do not
run global containment or inspect other agent process command lines.
Node v22.22.1; observed pinned tmux `3.6a-agents.1`.

Service regressions, normal workspace: **144 passed / 0 failed**; command-builder
regressions: **2 passed / 0 failed**; both exit 0, zero cancelled/skipped/todo.
Counts overlap prior checkpoint runs; do not sum them as unique acceptance.
Commands:

```bash
node --test --experimental-test-isolation=none tests/gateway/tool_agent.test.js tests/gateway/tool_agent_model.test.js tests/gateway/agent_errors.test.js tests/gateway/request_context.test.js tests/gateway/request_context_boundary.test.js tests/gateway/request_context_execution_binding.test.js tests/gateway/tool_catalog.test.js tests/gateway/tool_projection_contract.test.js
node --test --experimental-test-isolation=none --test-name-pattern='builds tmux|uses default' tests/gateway/tmux_client.test.js
```

Syntax checks for both production files and the new test, plus
`git diff --check`: exit 0. No broad process-containment probe or full CI run.

## Unresolved limits and continuation

This slice closes the tested **failure after observed creation but before
adapter result receipt**. It does not complete A/0/05 or general orphan safety.

- Creation and its exact-target observation are separate tmux commands. This
  does not prove atomic creation-to-identity capture if another actor replaces
  the name between those commands. The new replacement test covers replacement
  **after receipt capture**, not that earlier interval. Do not claim the latter
  race is closed; it needs independent assessment/design before a broad safety
  claim. Preserving original creation arguments precludes simply adding tmux
  `-P/-F` output to claim atomic receipt emission in this slice.
- If the identity query fails after a successful creation, no receipt is
  granted. The error is explicit; no guessed-name kill is allowed. Positive
  cleanup is not proved for that ambiguity. The hook currently supports only
  the existing single-pane detached command shape and Linux observations.
- Existing helper absence checks still use the earlier reader returning null;
  unreadable proc versus confirmed absence, identity replacement, resistant
  descendants, multi-pane mutations and one end-to-end cleanup bound remain
  checkpoint7 open items. Per-query/poll bounds are not an overall proof.
- Delegate service timeout/late-result settlement and detached non-tmux
  descendants remain unproved. The private delegate server is not general
  provider-tree containment. Other executable providers remain unwrapped.
- The checkpoint7 stale running business-row consistency limit remains:
  denied real kill can leave dead-target state; recovery skips that dead target.

Root retains serial shared-file reconciliation with A04, broader containment
when live agent sessions have closed, full solo host gate and skip budget,
actual live Codex restart/reattach/ask/view acceptance, evidence commits,
integration and release. Independent **Opus 5.5 medium** review must be separately
assigned when ready. No coder verdict or complete handoff is issued here.

## Immutable evidence binding

[Manifest](v6-a05-cleanup-checkpoint-9-manifest.json) binds **53 files** by
SHA-256/Git blob SHA-1 and **five sanitized archives** by compressed/uncompressed
SHA-256, including original raw local log hashes. Manifest SHA-256:
`6cf6c6c29b32c75218f52873eb46d380bd1e14f7003871f549f018bcd49b8565`.
The manifest excludes itself and this checkpoint to avoid circular hashes.
Archives omit JSON diagnostics and redact checkout paths/process tokens; no
process command lines are published. Previous evidence remains immutable.
This checkpoint is written but not committed. Candidate status remains partial,
unreviewed, unintegrated and unreleased; continuation starts from these bytes.

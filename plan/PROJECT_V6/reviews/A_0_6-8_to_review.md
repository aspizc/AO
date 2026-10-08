# V6 A/0/06 — Trial 8 review request

Uncommitted candidate on HEAD `d7264d29dcc232aeb60e6f34d33c457267ab9032`
(committed Trial 7 independent OK review trail). This narrow follow-up addresses
only [Trial 7 OK](A_0_6-7_reviewed_OK.md), Finding 6: the responder-path
`SESSION_PROMPT_ERROR` audit lost its `traceId` after `reportError` gained a
third parameter. This is a coder handoff, not an independent verdict.

## Minimum correction

`gateway/src/services/session_prompt_service.js` now passes
`binding.traceId` from the registered responder's authoritative captured binding
to `reportError`. No state lookup is added to the error path. The only runtime
difference from the independently reviewed Trial 7 candidate is that argument.

`tests/gateway/session_prompt.test.js` adds one regression case:
`responder-path failure audit retains the session trace for investigation`.
It observes a pending prompt, then makes the role's scope lookup throw while
`approval.respond(granted)` invokes the actual registered responder. It asserts:

- the response path does not throw;
- exactly one `SESSION_PROMPT_ERROR` records the actual error and session;
- its `traceId` equals the authoritative session row's trace;
- no transport input is sent.

This verifies the emitted audit, not an implementation structure or fixture.
It fails with missing trace attribution on the unchanged Trial 7 runtime.
The test was written and run RED before the one-argument source correction.

## Exact RED/GREEN

```bash
node --test --experimental-test-isolation=none \
  --test-name-pattern='responder-path failure audit' \
  tests/gateway/session_prompt.test.js
```

- [RED](evidence/A_0_6-8-responder-red.log): **1 test, 0 pass, 1 fail,
  0 skipped; exit 1**. The intended assertion reports actual `undefined`,
  expected `trace`. The error event and session ID checks passed first.
- [GREEN](evidence/A_0_6-8-responder-green.log): **1 test, 1 pass, 0 fail,
  0 skipped; exit 0**, after the source correction.

Relevant focused host verification:

```bash
node --test tests/gateway/*prompt*.test.js \
  tests/gateway/autoapprove_mechanism.test.js tests/gateway/approval_service.test.js \
  tests/gateway/tool_agent.test.js tests/gateway/tool_approval.test.js \
  tests/gateway/approval_state.test.js tests/gateway/approval_wait.test.js \
  tests/gateway/tool_catalog.test.js
npm --prefix gateway run lint
git diff --check
```

[Focused GREEN](evidence/A_0_6-8-focused-green.log): **304 tests, 304 pass,
0 fail/cancelled/skipped/todo; exit 0**. Includes the new audit test, six real
pinned-tmux guard cases, crash/CAS tests and Trial 7 watcher lifecycle tests.
[Full Gateway lint](evidence/A_0_6-8-full-lint-green.log): exit 0, no ESLint
errors/warnings. [Diff check](evidence/A_0_6-8-diff-check-green.log): exit 0.

Host verification used the repo `.venv`, pinned `tmux 3.6a-agents.3`, isolated
`TMUX_TMPDIR`, `A04_TEST_TMUX`, `D007C_RUN_REAL_TMUX_PROBE=1` and
`D007C_TEST_TMUX_PATH=/tmp/a06-test-bin`. All inherited `AGENTS_*` variables
were removed from child environments; only their names were printed.
[Command results](evidence/A_0_6-8-host-command-results.json) record the expanded
argument vectors and exit codes. No full gate or live provider check was run.

## Preserved inputs and immutable bindings

All 29 Trial 7 candidate hashes and 17 evidence hashes matched before edits.
Only the service and existing prompt test differ afterward. Reversing the one
argument and removing the appended test reproduce their exact Trial 7 hashes;
the other 27 candidate files remain identical. Trial 7 handoff, verdict,
manifest, JSON evidence and all bound logs remain unchanged. The Git index is
empty. No policies, action names, role decisions, watcher scheduling, answer
keys, transport guard or publication semantics changed.

Trial 7 OK SHA256:
`7c97b19e2830e574067c447d3898063ad68bb644c6718927eb3211cf56b0784b`.
Trial 7 manifest SHA256:
`e112b499df6701cb851c431d5ce40f7b8eb37b8f1d107e74210b9eaa063575c2`.

[Trial 8 candidate/evidence manifest](evidence/A_0_6-8-candidate-and-evidence-sha256.json)
SHA256: `41d173e330ff60e761c0ba511ecc7475b0e13777982fc5964a41db61b4e16579`.
It binds the full 29-file candidate, six new evidence files, prior immutable
Trial 7 artifacts and the pinned tmux hash. This handoff and its evidence were
exclusively created and made read-only.

The change restores audit attribution without broadening error handling.
Existing best-effort audit behavior during sink/state shutdown is unchanged.
Independent review, root-owned full gate and live acceptance remain required.
No self-review, commit, source staging, push or policies edits occurred.

# A/0/05 trial4 attribution checkpoint

2026-10-08. Unreviewed coder work. Fresh user-supplied trace
`tr-r4-a05-fullsuite-28e39a62-09ec-4d36-bea4-b60245de8f6e`; task ID
is still the root-registered placeholder (no fabricated receipt). Root owns
communication, approval, independent review, commit and integration.

Read AGENTS/profile/plan README/Stage A README/A/0/05, trial3 scoped OK,
trial3 request and manifest in full. Baseline read found only root-owned
`ci/suites.json` and review README differing from trial3 binding. Prior evidence
was not edited. Baseline hashes are `/tmp/v6-a05-r4/baseline.json`.

Original `/tmp/a05-trial3-full-gate.log` records not-ok1316, TOOL_ERROR,
start token18054836 still alive before fixture teardown. It lacks the
originating adapter error/command result. Its final gate status is failed,
including owned-process residue. This is NOT labelled a flake.

A focused host reproduction of the historical case passes1/fails0, exit0;
originating and emitted error are `tmux send-keys failed: unknown error`.
A NEW deterministic response-timeout variant emits the complete creation
response before a1500ms wrapper delay, with the same immutable session/pane,
renames the original and creates a replacement. RED before source changes:
pass0/fail1, exit1, original child remains live, originating and emitted
error `tmux new-session failed: spawnSync tmux ETIMEDOUT`. Exact identities
and tuple are in `/tmp/v6-a05-r4/timeout-red.txt`.
This proves a timeout receipt gap, but does NOT prove the missing originating
error in the historical full gate was the same. Original attribution remains
limited by the original log.

Narrow production edit ONLY `gateway/src/adapters/tmux_client.js`: an
ETIMEDOUT with complete fixed-version tuple and live Linux identity retains
that observed receipt, then returns the original failed command unchanged.
No name lookup, inferred authority, timeout increase or retry. Existing
cleanup must still match immutable tuple and PID/start/PGID/SID.
Immediate callers/cleanup/service/shared process reader were read first.

Test diagnostics record actual command status/signal/error/output/timeout,
originating and emitted adapter error, witness, exact before-teardown tuple
and process identity. Successful timeout cleanup additionally requires
/proc ENOENT and kill(0) ESRCH before fixture teardown; replacement stays live.
An initial attempted GREEN had misplaced diagnostics before launch:
10pass/2fail, exit1, fixture-invalid (empty pre-launch command list), NOT a
production failure or GREEN. Corrected without a production change.
Sandbox attempt produced only file-level failure (0pass/1fail), excluded.

Focused command now runs via existing scripts/ci_gate.py command supervisor,
default Node isolation/concurrency1, pinned tmux. Runner/command binding and
results are `/tmp/v6-a05-r4/`. Gateway full-suite verification remains to
complete. Full project gate remains PENDING ROOT; no overlapping full gate,
real provider, Gateway restart, policies edit, commit, push, subagent or
self-review. Harness folder was not edited. No global process scan or broad
cleanup. Fixture cleanup is never credited as production cleanup.

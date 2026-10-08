# Review A_0_5-4 — OK (trial-4 candidate scope only)

**Task:** plan/PROJECT_V6/A/0/05.md
**Trial:** 4
**Branch:** feat/V6-A-0-05-local-recovery
**Commit:** none. Uncommitted dirty candidate on HEAD
`6317df1481eff19fc504ef6334dccd48be3648eb`, bound by
`v6-a05-cp27-manifest.json`. The submission is
[A_0_5-4_to_review.md](A_0_5-4_to_review.md).
**Reviewer:** Claude reviewer agent (Claude Opus 5.5), independent session.
I used no subagents. I did not author or modify this candidate.
**Date:** 2026-10-08

## Summary

**OK, scoped to the trial-4 candidate.** It fixes the trial-3 root-gate
residue on the exact bound bytes, with distinguishing REDs for each fix:

- the creation-timeout receipt in `tmux_client.js`
- ordered postorder reaping, and private-server reaping, in
  `request_launch_cleanup.js`
- the inert fixture shell in `owned_tmux_fixture.js`

I reproduced the narrow RED, the narrow GREEN, focused 43/43 and wider
385/385. Every run used the existing CI command supervisor, and every run
reported `completed`, not `process_tree_leak`.

**This is not a full-sheet OK.** A/0/05 is not complete, integrated, promoted
or released. The full solo gate, skip budget and live Codex acceptance remain
open (see "Remaining").

## Scope and limits of this review

- **Read:**
  - AGENTS.md
  - A/0/05
  - the trial-3 scoped OK and the trial-3 root-gate failure
  - checkpoints 20–23, 26 and 27
  - the trial-4 request
  - the cp27 manifest and its attribution archive
- **Statically inspected:**
  - `request_launch_cleanup.js` (full)
  - the `tmux_client.js` diff against HEAD
  - `owned_tmux_fixture.js` (full)
  - the new test, and the "adapter post-await denial survives its own cleanup
    refusal" test
- **Not done:**
  - no source edits, commit, push or tag
  - no full `bash scripts/ci.sh`
  - no live Codex, real providers or production Gateway
- **Runs:** every run used `scripts/ci_gate.py::_execute_command` with pinned
  `/tmp/ao-tmux-tools/bin/tmux` (3.6a-agents.1, SHA-256 `d4fa7abc…5346d21`),
  Node v22.22.1, `--test-concurrency=1` and default isolation.
  - I checked first: no other gate or `node --test` run was active.
  - Logs are in the reviewer scratchpad and are not committed. Their SHA-256
    values are listed below.

## Checks

- [x] **Exact binding.**
  - Recomputed **606/606** bound files: SHA-256 all match.
  - Recomputed **42/42** archives: compressed, uncompressed and raw-local
    `/tmp/v6-a05-cp27` SHA-256 all match.
  - All 225 dirty paths are bound, except two manifests. The cp27 manifest
    itself is excluded, as expected. The other is checkpoint 26's
    `v6-a05-residue-checkpoint-manifest.json` (see observation 1).
  - Against checkpoint 26's manifest, the only differing non-evidence files
    are the two the request names: `owned_tmux_fixture.js` and
    `request_context_reattach.test.js`.
  - Against the trial-3 manifest, the changed non-plan files are:
    - `tmux_client.js`
    - `request_launch_cleanup.js`
    - the fixture
    - the test file
    - the root-owned `ci/suites.json`
- [x] **Production predicates unchanged in this continuation.** The source
  hashes of `request_launch_cleanup.js` (`7f6cd064…`) and `tmux_client.js`
  (`4285630a…`) match the cp26 binding and the final-run metadata.
- [x] **Prior trail immutable.**
  - `git diff HEAD -- plan/PROJECT_V6/reviews policies` is empty.
  - There is no `orchestrator/` directory, and `git diff --check` exits 0.
- [x] **Narrow RED, reproduced.**
  - Setup: the new test runs on a scratch copy of the candidate whose only
    change is the restored trial-3/baseline fixture (`helper-baseline.js`,
    whose hash equals the trial-3 bound fixture).
  - Result: **0/1, exit 1**, supervisor completed. The emitted
    `default-shell` is the caller shell, and `startupRan: true`.
  - Log: `cb250230…a69b590`.
- [x] **Narrow GREEN, on the candidate.**
  - Result: **1/1, exit 0**, completed. The emitted setting is `/bin/sh`,
    and `startupRan: false`.
  - Log: `4109dc98…bac0016`.
- [x] **Mutation check (my own).** Each fixture setting is load-bearing for
  the test.
  - Removing only the `default-shell` line fails on the actual startup
    marker (log `d016f477…5481191`).
  - Removing only the `default-command` line fails on the emitted
    `default-command` value (log `a43e767f…1700883`).
- [x] **Focused, exact cp27 argv:** **43/43 pass**, 0
  fail/cancelled/skipped/todo, Node exit 0, supervisor `completed`
  (log `8c713f6e…e830f9`).
- [x] **Wider, exact cp27 26-file argv:** **385/385 pass**, 0
  fail/cancelled/skipped/todo, Node exit 0, supervisor `completed`
  (log `d3acd67e…81a57`).
  - The same file set gave 384/384 with `process_tree_leak` in cp26/cp27.
    That earlier wider run stays failed evidence, as the request says.
- [x] **Earlier trial-4 REDs present in bound archives.**
  - `r4-timeout-red`: 0/1
  - `ordered-red`: 0/1
  - `residue-private-panes-red`: 0/2
  - `cp27-shell-final-red`: 0/1
  - `cp27-wider-observed`: 384/0, with `process_tree_leak`
- [x] **No residue from my runs.**
  - There are no new `agents-delegate-*` or `a05-*` temporary directories.
  - The only tmux servers present predate my runs.
  - I sent no signals.
- [ ] **Full gate / skip budget / CI inventory:** not run (PENDING ROOT).
- [ ] **Live Codex acceptance:** not run (PENDING OPERATOR).
- [x] **Global invariants.**
  - Text is in English.
  - No stdout writes added; no push; no `policies/` edits.
  - The server name stays `agents-gateway`, and the approval flow is
    untouched.

## Findings verified

1. **Timeout receipt (`tmux_client.js`).** It records a receipt only on
   `ETIMEDOUT`, and only when all three hold:
   - the stdout is exactly the full `a05-create-v1 $N %N PID\n` tuple
   - `readLinuxProcessIdentity` is live for that PID
   - the observed creation uses the fixed six-arg detached shape

   The failed result still returns unchanged. A partial or absent response
   throws, so no name is used as a receipt. Ordinary calls outside the
   private `AsyncLocalStorage` scope are unaffected.
2. **Ordered reaping (`reapDescendants`).**
   - **Ordering.** It walks the tree in postorder, and signals each
     descendant only while it still matches PID/start/PGID/SID. It waits for
     that descendant to settle before moving to the next, so a parent stays
     alive to reap its own child.
   - **Fail-closed checks.** Zombies still match, so they fail closed.
     Absence still requires `/proc` ENOENT plus `kill(0)` ESRCH. The shared
     five-second budget is unchanged.
   - **Private server close.** Before it signals the server, `close()`
     rechecks the socket PID and that no descendants remain.
3. **Inert fixture shell.**
   - **What it changes.** The fixture now sets `default-shell /bin/sh` and
     `default-command "exec /bin/sh"`, after the socket is ready and before
     any pane exists. The default command makes panes start a non-login
     shell, so `/bin/sh` does not run login profiles.
   - **What it leaves alone.** Fixture teardown, its waits and its signals
     are unchanged.
   - **Why this attribution holds.** The cp27 residue (`grep`, Z, adopted by
     the CI supervisor, PGID=SID of the live bash pane) came from the denial
     test in which production *refuses* cleanup with two panes and sends zero
     signals. That puts the residue in the fixture's teardown domain, not in
     production cleanup.
   - **Real cleanup is still exercised.** Explicit trees still exercise it:
     ordered two-level Python, thread-owned, detached descendant, and private
     server panes.
   - **Limits are stated honestly.** The request does not claim that this
     RED reproduces the exact `grep` signal path. Its parent before adoption
     is marked as unsampled.

## Non-blocking observations (no correction required)

1. **Unbound prior manifest.** The cp27 manifest does not hash
   `v6-a05-residue-checkpoint-manifest.json`. Its SHA-256 is now
   `5ace0a5f…527357895`.
   - Its file entries agree with cp27 for every file except the two changed
     ones and the new cp27 evidence, so I found no evidence of tampering.
   - The next manifest should bind every prior manifest.
2. **Indexing this verdict changes a bound file.** Adding this verdict's
   index row changes `plan/PROJECT_V6/reviews/README.md`, which the cp27
   manifest binds. That is the expected root/reviewer delta, not a candidate
   change.
3. **Real operator-shell startup is now untested by design.** Synthetic
   fixtures no longer run real operator-shell startup.
   - Production panes created by `new-session -d -s … -c …` still start the
     operator's default shell, profiles included.
   - A cleanup that races profile startup can miss children spawned after
     the descendant snapshot. Those children are then unobserved, reparented
     non-tmux descendants. `gateway/README.md` already declares that case
     unsupported.
   - Root should keep this boundary visible when the full gate and live
     acceptance are assessed.
4. **Login-profile coverage is by setting only.** For the `default-command`
   half, the new test catches a regression only through the emitted setting,
   not through observed login-profile work. I judged this sufficient for a
   fixture-only setting.
5. **Redundant line.** The ordered-descendant test still sets
   `default-shell /bin/sh` itself. That is now redundant, but harmless.

## Remaining (not counted as passed)

- **PENDING ROOT:**
  - CI inventory refresh and `ci_gate.py --validate-only`
  - a full solo `bash scripts/ci.sh` and skip budget on one exact candidate,
    with no owned-process-group residue
  - serial A04 `tmux_client.js`/contract reconciliation
  - Gateway artifacts
  - commit of the candidate and review trail, and integration
- **PENDING OPERATOR:** live Codex restart/reattach/ask/view acceptance.
- **Unchanged declared boundaries:**
  - unobserved reparented non-tmux descendants
  - numeric-PID races
  - tmux ID reuse
  - stale `running` rows
  - no pidfd or provider-tree containment

## Next step

Root runs the full gate solo on this exact candidate, and the operator runs
live acceptance. Only after both may root commit and integrate. This verdict
grants no integration, promotion or release authority.

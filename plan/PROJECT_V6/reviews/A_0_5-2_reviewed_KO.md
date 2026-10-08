# Review A_0_5-2 — KO

**Task:** plan/PROJECT_V6/A/0/05.md
**Trial:** 2
**Branch:** feat/V6-A-0-05-local-recovery
**Commit:** none. Uncommitted dirty candidate on HEAD
`2ed684f82174c57cc43298bb90a296ce810996b0`. The candidate is bound by
`v6-a05-checkpoint18-manifest.json` (SHA-256
`1c1eb9311cd7ad1e44834ed356cdabddb96c00183a5c3fb46327a79970fe5d52`).
The submission is [checkpoint 18 handoff](A_0_5-18_unreviewed_handoff.md).
No `A_0_5-2_to_review.md` exists. This verdict answers that handoff as the
trial-2 candidate.
**Reviewer:** Claude reviewer agent (Claude Opus 5.5), independent session.
I used no subagents. I did not author or modify this candidate.
**Date:** 2026-10-08

## Summary

**KO** for the trial-2 candidate as a whole.

The parts that are sound:

- The trial-1 gate corrections verify.
- The core recovery source is byte-identical to the trial-1 source-only OK.

The parts that block:

- The new owned-launch cleanup layer has a deterministic test failure under
  the CI runner's default process isolation.
- That same layer has a production cleanup defect that orphans real tmux
  servers. This is the same process-leak class that failed the trial-1 full
  gate.
- The provider-parity claim is broader than the code supports.

This verdict is not full-sheet completion, integration, promotion or release.
Three items remain unrun: the full gate, the skip budget, and the live Codex
restart acceptance.

## Scope and limits of this review

- **Read:** AGENTS.md, `plan/README.md`, Stage A README, A/0/05, the review
  index, the trial-1 request/OK/root gate failure, the trial-2 bounded
  correction checkpoint, the human decision and escalation files, checkpoints
  3–17, the checkpoint 18 handoff and both the checkpoint 13 and checkpoint
  18 manifests.
- **Static inspection:** the changed production paths, including
  `request_launch_cleanup.js`, `tmux_client.js`, `agent_service.js`,
  `tools/index.js` and `tool_helpers.js`.
- **Not run:** the full `bash scripts/ci.sh` gate, live Codex, real providers
  and the production Gateway. No Gateway session or trace was created.
- **Test logs:** my reproduction logs are in the reviewer scratchpad and are
  not committed. Their SHA-256 values are listed below.
- **Process cleanup:** I sent SIGTERM only to the exact orphaned
  `tmux: server` processes created by my own test runs. Each run was placed in
  its own `setsid` session, and each process was verified by SID and command
  name before signalling. I did no global or name-only cleanup.
- **Other session's residue:** four identical orphaned private servers from a
  concurrent run in this worktree (SID 756956, PIDs 757237, 757723, 758093,
  758738) were left untouched. Root should attribute and handle them.

## Checks

- [x] **Exact binding.** Manifest SHA-256 matches the handoff. I recomputed all
  **60/60 bound files** (SHA-256 plus `git hash-object`) and all **18/18
  archives**: compressed, uncompressed, and raw-local `/tmp` SHA-256, which
  were 18/18 present and matching. The dirty set equals the bound set plus
  exactly the handoff and the manifest.
- [x] **Prior checkpoints immutable.**
  - `git diff HEAD -- plan/PROJECT_V6/reviews` is empty, so every committed
    review file is unchanged.
  - Checkpoint 12 SHA-256 is `73f6b89e…1899`, matching.
  - Checkpoint 13 manifest SHA-256 is `8272bd88…1824`, matching.
  - Against checkpoint 13: 42/46 files and 8/8 archives are unchanged. The
    only changed files are the four the handoff names.
  - Checkpoint 14's premature 3/0 claim is voided by checkpoint 15. The
    handoff carries the corrected 2/1, exit 1 result, and I did not credit 3/0.
- [x] **No policies.** `policies/` has no tracked or untracked change. There is
  no `orchestrator/` directory. `git diff --check` exits 0.
- [x] **Handoff commands reproduced as written** (with
  `--experimental-test-isolation=none`, pinned tmux `3.6a-agents.1`, Node
  v22.22.1):
  - focused: **33 pass / 0 fail**, 0 cancelled/skipped/todo, exit 0
    (log `3a964f00…e0b8b8`)
  - service: **144 pass / 0 fail**, 0 cancelled/skipped/todo, exit 0
    (log `a8c940be…0fc00`)
- [ ] **Sheet Verification command under default isolation** (as the CI
  runner invokes it). I ran the sheet command plus the five trial-1
  gate-failure files, `request_launch_observation`, `task_service` and
  `mcp_bootstrap`.
  - Result: **356 tests: 355 pass / 1 fail**, 0 cancelled/skipped/todo,
    exit 1 (log `253328d8…a8d64c`).
  - It left **4 orphaned private tmux servers**.
- [x] **Trial-1 gate failures corrected.** The scaffold, coordination
  registry (two cases), orchestration task and orchestrator-profile cases all
  pass in that run.
- [ ] **CI manifest.** `python3 scripts/ci_gate.py --validate-only` reports
  `invalid_manifest`, because `lint.gateway` and `test.gateway` have stale
  `inventorySha256` values. Expected values:
  - `lint.gateway`: `sha256:e2d03978…13de8`
  - `test.gateway`: `sha256:42297689…9b9883`

  `ci/suites.json` is root-owned and bound dirty.
- [ ] **Full gate and skip budget:** not run (PENDING ROOT). The trial-1 failed
  gate remains the only full-gate evidence.
- [ ] **Live Codex restart/reattach/ask/view:** not run (PENDING OPERATOR).
  Synthetic providers are not live acceptance.
- [x] **Global invariants.** Text is in English. The new modules write nothing
  to stdout. The approval flow is unchanged. No push. The server name stays
  `agents-gateway`.

## Assessment by area

**Unchanged since the trial-1 source OK and still acceptable at source level.**
These files are byte-identical to the trial-1 manifest:

- identity, repository and lineage service
- recovery observations, migrations, request context and catalog
- `mcp_server.js`
- the README and contract docs

This covers the following areas, which the 355 passing tests exercise again:

- durable lineage and stale-merge protection
- same-UID, machine and state binding
- every-repository reattach
- original-expiry refusal
- live and ambiguous owner refusal, and PID/boot reuse
- the one-winner race
- terminal and lifecycle cleanup
- discovery privacy and cap
- denial observer
- append-only migration profiles

The trial-1 non-blocking observations 1, 3 and 4 still apply. Observation 2
(orphan after post-await denial) is the subject of this trial.

**Changed in trial 2: candidate safety.**

- **Exact creation receipt:** sound for the supported shape. The scoped
  6-argument detached `new-session` gets a fixed `-P -F` template with
  strictly framed parsing. Ordinary tmux calls keep their argv and stdout.
  Unsupported shapes refuse.
- **Identity checks before signalling:** sound. These cover the PID, start
  token, PGID and SID; absence requires ENOENT plus ESRCH; and the complete
  `list-panes -s` set refuses extra panes.
- **Shared five-second budget:** sound.
- **Single-flight settlement and late settlement:** sound.
- **Defects found:** see the required corrections below. One is a production
  cleanup defect, one is a traversal gap, one is a public envelope regression
  and one is a test-ordering defect.

The handoff declares an unsupported boundary: a reparented non-tmux descendant
without a retained receipt. That boundary is accepted as declared, but only if
README/operator docs name it. It is not counted as a defect. It must not be
described as provider-tree containment.

## Required corrections

1. **Deterministic test failure under the CI runner.** The Gateway lane uses
   `node --test --test-concurrency=1` with default process isolation. In
   `tests/gateway/request_context_reattach.test.js`, the provider-registry
   tests are registered at lines 31–96 before `const api = await import(...)`
   at line 98. `fixture()` (line 163) therefore hits the TDZ.
   - Failure: `claude-code registry launch reaps its observed child when
     durable publication fails` fails with `ReferenceError: Cannot access
     'api' before initialization`.
   - Reproduction: two runs of
     `node --test --test-concurrency=1 --test-name-pattern="registry launch reaps" tests/gateway/request_context_reattach.test.js`
     each gave 7 pass / 1 fail, exit 1 (logs `4a60599b…1e0b`, `b57479f0…1631`).
   - Every handoff run used `--experimental-test-isolation=none`, which hides
     this.
   - **Fix:** move the provider loop after all top-level imports and
     declarations, or resolve `api` before registering tests.
   - **Verify:** rerun the focused and service evidence **without**
     `--experimental-test-isolation=none` and record both modes.

2. **The private delegate server is closed on unverified identity, so the
   real server is orphaned.**
   - **Where:** `privateDelegateServer()` in
     `gateway/src/adapters/request_launch_cleanup.js:89-112`.
   - **What it does:** it spawns `"tmux"` resolved through `PATH`, records the
     identity of the direct child, and `close()` treats that child's exit as
     proof that the server ended. It then deletes the socket directory.
   - **What breaks:** when `tmux` on PATH does not `exec` the server (the
     registry tests' Node shim is one such case, and a user wrapper is
     another), SIGTERM ends only the wrapper. The real `tmux: server`
     survives. It is reparented to the subreaper and listens on a deleted,
     unreachable socket. Cleanup still reports success.
   - **Evidence:** every run of the four `… after headless success` guards
     left one orphan each, while those tests passed. This is the same
     `command left processes in its owned process group` class that
     invalidated the trial-1 Gateway lane. The handoff's statement that these
     guards "verify they are gone" covers only the `sleep` pane child, not
     the server.
   - **Fix:** establish the actual server identity over the private socket.
     For example, use `display-message -p '#{pid}'` or the `#{pid}` format via
     the private `run`, and require it to equal the retained start-token
     identity. Terminate that exact identity (or `kill-server` through the
     private socket) and verify kernel absence before removing the directory.
     If the identity mismatches or is ambiguous, raise
     `ADAPTER_CLEANUP_FAILED` and keep the directory.
   - **RED test:** the four headless guards must assert that the private
     server identity is gone, not only the pane child. They must fail on the
     current code with the shim.

3. **`scope.close()` is skipped when pane cleanup throws.**
   - **Where:** `receipt.clean()` (`request_launch_cleanup.js:173-176`) runs
     `cleanPanes` and then `scope.close()`. The proxy catch (`:180-182`) only
     closes `scope` when there is no receipt.
   - **Effect:** any headless pane-cleanup refusal, for example an extra pane,
     unreadable identity or budget exhaustion, leaves the owned private server
     running with no remaining owner or audit target.
   - **Decision for root:** whether refusal should close the
     wholly-owned private server, or record it as retained. Either way it must
     be explicit, audited and tested; it must not be a silent leak.

4. **Descendant traversal sees only the main thread's children.**
   - **Where:** `descendants()` reads
     `/proc/<pid>/task/<pid>/children` (`request_launch_cleanup.js:46`).
   - **Experiment:** I ran a scratch experiment on this kernel with Python, a
     live worker thread and `subprocess.Popen`. The child is absent from the
     main task's `children` file but present under the worker task.
   - **Effect:** multithreaded providers such as Codex can fork tool processes
     from worker threads. Those children are not signalled before
     `kill-session`, so "other executable providers" parity is overstated.
   - **Fix:** union `children` across every `/proc/<pid>/task/<tid>`. Keep the
     same identity checks.
   - **RED test:** a disposable provider spawns a child from a live
     non-main thread, and the test proves it is reaped.

5. **A cleanup failure replaces the public denial envelope.**
   - **Where:** in `gateway/src/tools/tool_helpers.js:200-202`, a failed
     `settleRequestLaunch(value, false)` overwrites `error`.
   - **Effect:** a post-await `REQUEST_CONTEXT_DENIED` becomes public
     `TOOL_ERROR`, and the private denial observer is skipped. The sheet
     requires every authorization denial to keep the fixed denial envelope.
     It also contradicts the service layer (`agent_service.js:626-628`,
     `:714-716`), which audits cleanup errors and rethrows the original error
     (Rule 7).
   - **Fix:** keep one pattern. Preserve the original error and audit the
     cleanup failure privately.
   - **Test:** a revoked spawn with resistant cleanup returns
     `REQUEST_CONTEXT_DENIED` and still reaches the observer.

6. **Gate inventory (root-owned, required before any gate).** Refresh the
   `ci/suites.json` inventory through the CI tool's `--refresh-inventory` path
   after corrections 1–5. Then run `bash scripts/ci.sh` solo on the host.
   - The Gateway lane must report no owned-process-group residue.
   - Record the aggregate and the skip budget.

7. **Evidence and documentation.**
   - **Unsupported boundaries in `gateway/README.md`:** the reparented
     non-tmux, no-receipt descendant boundary, the numeric-PID/pidfd limits
     and the `running`-row-after-lapsed-kill limitation must each appear
     there.
   - **Handoff wording:** the next trial's handoff must not describe the
     delegate guards as proving the private server is gone, unless correction
     2 is tested.
   - **Late-cleanup audit:** add the missing real failing late-cleanup audit
     observation for `agent.delegate.late_cleanup`, or label it untested.

## Exact remaining unresolved items (not counted as passed)

- Live Codex restart/reattach/ask/view: **PENDING OPERATOR**.
- Full `bash scripts/ci.sh` and skip budget on one candidate: **PENDING ROOT**.
- CI inventory reconciliation and serial A04 `tmux_client.js` and
  contract/docs reconciliation: **PENDING ROOT**.
- The unsupported reparented non-tmux descendant boundary. A
  supervisor/subreaper or kernel containment receipt would need its own
  assessment and operator decision.
- Root must attribute the residue from the other session (SID 756956).

## Next step

Coder applies corrections 1–5 and 7 test-first. Every RED must be shown in
**default** isolation as well. The coder then issues
`A_0_5-3_to_review.md` with a new manifest. Root handles item 6, the full
gate and the operator live check. A/0/05 remains unfinished. The trial-1
source-only OK still covers only its own bytes.

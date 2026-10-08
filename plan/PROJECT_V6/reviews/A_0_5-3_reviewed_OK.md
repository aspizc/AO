# Review A_0_5-3 — OK (trial-3 candidate scope only)

**Task:** plan/PROJECT_V6/A/0/05.md
**Trial:** 3
**Branch:** feat/V6-A-0-05-local-recovery
**Commit:** none. Uncommitted dirty candidate on HEAD
`5dde9f0066fec7392ff4c7bf806cc0c653a42f10`, bound by
`v6-a05-trial3-manifest.json` (SHA-256
`57a53728c3a85eec15337f43e411706ff1d72fdc19ff921cf97d28244ed530c2`).
The submission is [A_0_5-3_to_review.md](A_0_5-3_to_review.md).
**Reviewer:** Claude reviewer agent (Claude Opus 5.5), independent session.
I used no subagents. I did not author or modify this candidate.
**Date:** 2026-10-08

## Summary

**OK, scoped to the trial-3 candidate.** It covers trial-2 KO corrections 1–5
and 7 on the exact bound bytes. Each correction verifies in source and in
tests under DEFAULT Node process isolation. My runs left no private tmux
servers behind.

**This is not a full-sheet OK.** A/0/05 is not complete, integrated, promoted
or released. These items stay open (see "Remaining"):

- KO6: CI inventory refresh, full solo gate and skip budget (**PENDING ROOT**)
- live Codex restart/reattach/ask/view acceptance (**PENDING OPERATOR**)

## Scope and limits of this review

- **Read:** AGENTS.md, `plan/README.md`, Stage A README, A/0/05, the trial-2
  KO, the trial-3 request and the trial-3 manifest.
- **Statically inspected:** `request_launch_cleanup.js` (full),
  `tool_helpers.js` (the catch path), `agent_service.js` (the delegate
  timeout/late path), the README diff, and the new and changed tests in
  `request_context_reattach.test.js` (lines 133–410).
- **Not done:**
  - no source edits, commit or push
  - no full `bash scripts/ci.sh` (other Gateway sessions and a root A04 gate
    were active)
  - no live Codex, real providers or production Gateway
- **tmux:** every run used pinned `/tmp/ao-tmux-tools/bin/tmux` (3.6a-agents.1,
  SHA-256 `d4fa7abc…346d21`) on Node v22.22.1, with `--test-concurrency=1` and
  default isolation. Each run had its own `setsid` session.
- **Process cleanup:** after each run, the run's SID held no processes, and no
  tmux process had started inside the run window. I sent no signals.
- **Logs:** in the reviewer scratchpad, not committed. Their SHA-256 values are
  listed below.

## Checks

- [x] **Exact binding.**
  - Recomputed **98/98** bound files (SHA-256 and `git hash-object`): all match.
  - Recomputed **10/10** evidence archives: compressed, uncompressed and
    raw-local `/tmp` SHA-256 all match.
  - The dirty set equals the bound set plus only the manifest itself, which
    is excluded to avoid circular hashing.
  - The six bound paths that are not dirty are committed files, unchanged
    against HEAD.
- [x] **Prior trail immutable.**
  - `git diff HEAD -- plan/PROJECT_V6/reviews policies` is empty.
  - The checkpoint 18 manifest SHA-256 is still `1c1eb931…0fe5d52`.
  - Against it: 55/60 files and 18/18 archives are unchanged. The only
    changed files are exactly the five the request names.
  - There is no `orchestrator/` directory. `git diff --check` exits 0.
- [x] **Focused, request command** (pinned PATH, default isolation): **40/40
  pass**, 0 fail/cancelled/skipped/todo, exit 0
  (log `541effd4…6584ae0`).
- [x] **Service, request command** (default isolation; I also pinned PATH):
  **144/144 pass**, 0 fail/cancelled/skipped/todo, exit 0
  (log `c70712c7…f84c6631`).
- [x] **Wider default-isolation run.** I ran the sheet Verification node set
  plus `request_launch_observation`, `task_service`, `mcp_bootstrap`,
  `scaffold`, `tool_coordination_registry`, `tool_orchestration_task` and
  `orchestrator_profile_contract`.
  - Result: **363/363 pass**, 0 fail/cancelled/skipped/todo, exit 0
    (log `93b1bba7…0e440021`).
  - No orphaned private servers. In trial 2 this same kind of run gave
    355/1 with 4 orphans.
- [ ] **Full gate / skip budget:** not run. `ci_gate.py --validate-only` still
  reports `invalid_manifest`, with stale `inventorySha256` for `lint.gateway`
  and `test.gateway`. This is KO6, root-owned.
- [ ] **Live Codex acceptance:** not run (operator).
- [x] **Global invariants.**
  - Text is in English, and the new code writes nothing to stdout.
  - No push, no policies edits.
  - The server name stays `agents-gateway`, and the approval flow is
    untouched.

## Corrections verified

1. **KO1, TDZ.** `const api` (test line 32) now precedes provider-loop
   registration (line 133). The registry tests pass under default isolation.
2. **KO2, actual private server identity.**
   - **Identity binding at startup.** `privateDelegateServer()` reads
     `#{pid}` over the exact `-S` private socket. It binds that PID to the
     Linux PID/start/PGID/SID identity and rechecks the socket PID, then
     freezes the identity and records it in a 0600 `server-identity.json`.
   - **Close.** `close()` signals only that identity, after rechecking the
     start token and the socket PID. It requires `/proc` ENOENT plus ESRCH and
     the wrapper's exit before it removes the directory. Any ambiguity throws
     `ADAPTER_CLEANUP_FAILED` and keeps the directory.
   - **Tests.** The four headless registry guards use the non-exec Node PATH
     shim and assert that `/proc/<socket-observed server pid>` is absent
     before teardown.
3. **KO3, refusal closure.**
   - `receipt.clean()` runs `scope.close()` in `finally`, which follows the
     root USER decision.
   - "Closes verified wholly-owned server" proves that a two-pane refusal
     still reaps the exact server.
   - "Retains ambiguous identity and socket" proves that an unreadable
     identity keeps the socket and identity file, and grants no signal.
4. **KO4, all-TID traversal.**
   - `descendants()` unions `children` across every
     `/proc/<pid>/task/<tid>`, rechecking the parent identity per TID.
   - The thread test proves its own preconditions: a live non-main TID, an
     empty main-task `children` file, and the child listed under the worker
     TID.
   - The child is started with `start_new_session`, so the old main-only code
     would leave it alive. It is now proven absent.
5. **KO5, denial envelope.**
   - **Tool layer.** `tool_helpers.js` audits a cleanup failure privately
     under allowlisted metadata (`tool.launch.cleanup`, code only). It keeps
     the original error and still runs the denial observer.
   - **Adapter layer.** The adapter's own catch rethrows the original
     `REQUEST_CONTEXT_DENIED` after a private `adapter.launch.cleanup` audit.
   - **Service layer.** This matches the pattern there (Rule 7: one
     pattern).
   - **Tests.** Both have tests that assert the public denial, one observer
     event, and that the target name does not appear in the audit.
7. **KO7, documentation and evidence.**
   - **README.** `gateway/README.md` states three limits:
     - unobserved reparented non-tmux descendants are unsupported
     - numeric-PID/pidfd limits
     - a stale `running` row after a kill whose authority lapsed
   - **Late cleanup.** A single `.catch` continuation in `agent_service.js`
     audits `agent.delegate.late_cleanup` exactly once. Both cases are
     tested: the real late settlement refusal (two-pane) and the post-timeout
     adapter rejection. The request correctly labels the settlement-refusal
     case as guard coverage, because it passed before the source edits.
   - **Handoff wording.** It no longer overclaims: the server-absence claims
     are now tested.

## Non-blocking observations (no correction required for this trial)

1. **Startup leak before identity is bound.** Suppose startup fails before
   identity is established: the socket is not ready within about 1 s, or
   `display-message` fails.
   - What happens: `close()` throws on the null identity. The directory and
     an `identity: null` file are retained, and the error surfaces as
     `ADAPTER_CLEANUP_FAILED`.
   - The leak: the spawned direct child (wrapper or server) is not
     signalled, even though it is an unreaped own child.
   - Assessment: this is consistent with "ambiguity retains, fails loud". On
     a heavily loaded host it could still leave a live private server. Root
     may want the README limit text to mention it, or the startup budget to
     be widened later.
2. **Thread race error code.** In `descendants()`, a task that exits between
   `readdirSync` and `readFileSync`, or a parent that exits, raises a raw
   `ENOENT` instead of `failure()`.
   - It still fails closed, as the code comment intends.
   - But the surfaced code is not `ADAPTER_CLEANUP_FAILED`. Tool audits record
     it as `CLEANUP_FAILED`.
3. **Audit label scope.** `agent.delegate.late_cleanup` is recorded for any
   post-timeout adapter rejection, not only for cleanup failures. The request
   documents this. It is acceptable as an audit label.
4. **Residue for root (not from my runs).** `/tmp/agents-delegate-9FnwLC`
   predates this candidate and has no listening attribution.
   - Its mtime is 10:02, it holds a socket, and it has no
     `server-identity.json`, so it predates the trial-3 identity-file code.
   - I did not touch it. Root should attribute it alongside the SID 756956
     PIDs the request reports as ENOENT.

## Remaining (not counted as passed)

- **PENDING ROOT:**
  - CI inventory refresh (KO6)
  - full solo `bash scripts/ci.sh` and skip budget on one candidate, with no
    owned-process-group residue
  - serial A04 `tmux_client.js`/contract reconciliation
  - Gateway artifact publication
  - commit of this candidate and the review trail, and integration
- **PENDING OPERATOR:** live Codex restart/reattach/ask/view acceptance.
- **Unchanged declared boundaries:**
  - unobserved reparented non-tmux descendants
  - numeric-PID races
  - tmux ID reuse
  - stale `running` rows
  - no pidfd or provider-tree containment

## Next step

Root refreshes the CI inventory and runs the full gate solo on this exact
candidate. The operator runs live acceptance. Only after both may root commit
and integrate. This verdict does not grant integration authority.

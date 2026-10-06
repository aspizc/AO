# Review Result — Project V5 D/0/07c (Trial 7): OK

Fresh independent reviewer (Claude Fable 5, maximum effort), trace
`tr-d007c-t7-review-cc90aef7-907f-41f0-a297-09548290bc2c`, task
`ts-39ded179-d615-434b-910a-b1c3db7070e1`. Reviewed exact candidate HEAD
`2bd93689d6fe81c688226baf71284f37b04e20bd` (tree
`6d9d2986b98c0bad10bf910f36b53c5705510c53`), technical commit
`d79fd00ea3b5dca03625b2ff2911803c6bf2d741` (tree
`bb1294fabc043fc7f8edb511bfef768a5e5f5cfa`, parent = Trial 6 KO baseline
`43687afabbf0db3faee997afd2364aaaf4336cd6`), against the frozen Decision 4C
ownership rules, `D_0_7C-6_result.md`, and `D_0_7C-7_to_review.md`. The
reviewer did not implement the candidate and did not mutate it. Technical
pathset verified as exactly the three files claimed (helper, fixture, PTY
test suite).

## Verdict: OK

Both Trial 6 findings are corrected at source, verified by direct reading of
the exact baseline-to-candidate diff and the current file. No P1 or P2
remains in the reviewed scope. Three P3 hardenings are recorded below.

## Security determinations (independent, from source)

1. **ECHILD can no longer authorize a later/recycled PID.**
   `_wait_pre_release_utility` returns an explicit tri-state
   (`_PreReleaseUtilityWait`): `ChildProcessError` → `"ownership_lost"`,
   deadline expiry → `"running"`, exact `waitpid(pid, WNOHANG)` hit →
   `"reaped"` with the decoded status
   (`gateway/src/adapters/process_supervisor_helper.py:2099-2121`). In
   `_abort_pre_release_utility`, any outcome other than `"reaped"` returns
   `False` (`:2178-2179`). The Trial 6 fresh `process_identity(pid)`
   substitution and the self-consistency gate are deleted; no post-wait
   identity lookup exists in the abort path.
2. **No parent pre-release PID/PGID signal or group-cleanup fallback
   remains.** The abort path contains no `os.kill`/`os.killpg` and no longer
   calls `_bounded_session_port_utility_cleanup`. Remaining callers of that
   helper (`:5199`, `:5218`, `:5775`, `:5797`) are post-transfer paths;
   `:5775` is additionally unreachable-defensive because `_spawn_utility`
   returns `utility=None` on every `reason` path. The pre-arm abort call
   sites (`:2286`, `:2321`) and the pre-existing non-PTY branch
   (`:2305-2312`) run before any `waitpid`, while the forked child is still
   un-reaped and its PID cannot recycle — wait ownership is intact there
   (see limitation 3).
3. **Only an exact reaped normal exit 126 preserves the original reason.**
   Clean requires `outcome == "reaped"`, `signal_name is None`, and
   `exit_code == 126` (`:2178-2185`); the caller maps unclean to
   `supervisor_lost` (`:2388`). Exit 124, other exits, signals,
   `ownership_lost`, and bounded expiry are all unclean.
4. **Observer closure precedes every consuming wait.** The abort closes the
   release writer, the PTY, `exec_read`, then the observer, before calling
   `_wait_pre_release_utility` (`:2148-2170`). Sites `:2286`/`:2321` predate
   observer arming (default `observer=None` is correct). On Linux
   `ChildObserver` holds no descriptor and `close()` cannot fail (`:1189`);
   its `exited()` uses `waitid(WNOWAIT)` and never consumes status. On
   Darwin `close()` is `kqueue.close()`; a raise would propagate and abort
   the settlement before any clean report — blocking in the fail-closed
   direction (see P3-1).
5. **The monotonic bound is finite and covers the child algorithm.**
   Deadline = `monotonic() + terminationGraceMs/1000 +
   PRE_RELEASE_CHILD_REAP_SECONDS (2.0) + 0.25` (`:2161-2169`); the same 2.0
   constant is now the child authority's exact final reap budget
   (`:1565-1567`). Maximum validated grace 2000 ms → 4.25 s. The Trial 6 P2
   (0.75 s parent window under 4.0 s child algorithm) is closed.
6. **Child-side live-or-zombie ownership is safe on the supported Node
   launcher.** No SIGCHLD handler, `waitpid(-1)`, `os.wait()`, or thread
   exists in the helper (grep-verified); the Linux observer never consumes
   status; `execve` from the Node launcher leaves SIGCHLD at `SIG_DFL`
   (libuv installs a handler, not `SIG_IGN`, and handlers reset on exec).
   Even under an unsupported `SIG_IGN` embedder, auto-reap now lands in
   `ownership_lost` and fails closed with zero signals.
7. **Scope/platform/leaks.** Technical pathset touches no adapter, DTO,
   policy, or public surface. `exec_read` is closed exactly once (moved into
   the abort body, removed from its `finally`); `identity_read` closes in
   the `finally`. Darwin-only: see P3-1/P3-2. The ignored
   `_drain_retained_identity` return in the wait loop is fail-closed — a
   dead identity pipe no longer short-circuits into the old substitution
   path; the wait stays bounded by the deadline.
8. **Tests assert causal events.** The three new probes drive the real
   `_spawn_utility` → `_abort_pre_release_utility` →
   `_wait_pre_release_utility` chain with only kernel seams faked (fork,
   `waitpid`, logical monotonic clock, recording `kill`/`killpg`,
   `_bounded_session_port_utility_cleanup` recorder), and assert the wait
   outcome, observer-closed-before-every-wait, zero post-wait fresh lookups,
   empty signal and group-cleanup lists, the clean/unclean mapping, the
   preserved `timed_out` vs `supervisor_lost` public reason, and the
   4.0–4.25 s / 4.25–4.5 s elapsed bounds
   (`tests/gateway/process_supervisor_session_port_pty.test.js:576-633`,
   `tests/gateway/process_supervisor_session_port_fixture.py:2644-2841`).
   Each of the seven claimed mutations maps to a distinct one of these
   assertions; the mapping is textually coherent, though the mutations were
   not rerun (below).

## P3 findings (recorded, not KO material)

1. **P3 — `observer.close()` sits outside the identity-fd `try`/`finally`**
   (`:2158-2159` vs `:2186-2190`). On Darwin a raising `kqueue.close()`
   would propagate before the wait and leak `identity_read` (the failure is
   still fail-closed — no clean report). Confirmed from the preflight;
   hardening: move the close inside the guarded region or swallow-and-mark
   unclean. Linux unaffected.
2. **P3 — the `pty is None` observer-arm-failure branch no longer closes the
   observer** (`:2384-2387`; Trial 7 removed the old trailing
   `observer.close()`). Linux close is a no-op; on Darwin the kqueue fd
   stays open only until the caller emits the terminal event and returns 0
   (`:5772-5781`), so process exit bounds the leak. Hygiene only; new in
   Trial 7 but moot-at-exit.
3. **P3 — no SIGCHLD normalization before the first fork.** Confirmed from
   the preflight: explicitly setting `SIG_DFL` alongside the existing
   handler setup (`:1394-1397`, `:5704-5706`) would future-proof unsupported
   embedders whose inherited `SIG_IGN` auto-reaps children. With the
   tri-state fix the consequence is already fail-closed, so this stays P3.

## Gates run / not rerun

- Run (this review): `git diff --check` through
  `scripts.ci_gate._execute_command` → `completed`, rc 0. Read-only
  `git show`/`git diff`/`grep`/file reads for SHA/tree/pathset and all cited
  regions. No node, python-under-test, or tmux process was started.
- Not rerun: the submitted GREEN matrix (5/4/3/62/2/21 focused and
  regression gates), the RED evidence, and the seven mutations. An operator
  budget checkpoint at ~13.9k tokens ordered discovery and gate expansion
  stopped; the verdict therefore rests on direct source verification of
  every security property above, which is textual and unconditional. The
  coder's gate and mutation tables are treated as unverified evidence,
  internally consistent with the code and tests read. Full repository CI
  remains the orchestrator's post-OK integration gate, and the orchestrator
  should treat the focused matrix as unreproduced by review.

## Limitations

1. The three probes fake kernel seams (fork/waitpid/clock); no live PID
   recycling or wall-clock 4-second wait was exercised. The properties they
   assert were independently confirmed in the product source.
2. Darwin behavior (kqueue observer close ordering, P3-1/P3-2) was reviewed
   from source only; no live Darwin host ran.
3. The pre-existing non-PTY abort branch (`:2305-2312`) still performs a
   fresh `process_identity(pid)` when the sealed identity is missing. It
   runs strictly before any wait on a still-un-reaped child (ownership
   intact, PID unrecyclable), was reviewed under earlier trials, and is
   unchanged by Trial 7 — recorded here as context, not a Trial 7 defect.
4. The real-tmux relay lanes and Trial 4 pair were not re-executed; their
   scope is untouched by this diff (helper pre-release path plus new tests
   only).

## Process and survivor check

This review spawned only `git`, `grep`, `sed`, and two in-process
`python3 -c` invocations of `scripts.ci_gate._execute_command` (signature
probe and the whitespace gate). No node/python-under-test/tmux process
survives. PIDs 1019690/1020609 and unrelated tmux/orchestration state were
never touched. Worktree left clean apart from the two reviewer-owned files
below.

## Scope and canonical non-claims

Reviewer wrote only `plan/reviews/PROJECT_V5/D_0_7C-7_result.md` and
replaced the Trial 7 pending cell in `plan/PROJECT_V5/reviews/README.md`
with the verdict link. No product, test, status, request, or policy edits;
no fixes implemented; all prior files preserved. This OK is the independent
review verdict only: no status closure, integration, D/0/07d claim,
promotion, main/develop movement, tag, push, release, support, publication,
or public-contract claim. Policies unchanged.

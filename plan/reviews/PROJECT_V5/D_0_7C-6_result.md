# Review Result — Project V5 D/0/07c (Trial 6): KO

Fresh independent reviewer (Claude Fable 5, maximum effort), trace
`tr-d007c-t6-review-final-4a4b686c-f206-4abe-b3e3-2d7076934778`, task
`ts-af0de3fc-4328-4a50-b738-f111e5a90ebf`. Reviewed exact candidate HEAD
`15d898697862013fa941e24a0a210fac20e34933` (tree
`dbb46fac925cdc0600f9e7c684bc2d2754e8c9ad`), technical commit
`4f072a724619d7508f3c58902b534e72fcf97c53` (tree
`959c54bd94453e367144044f409ece6308e07a11`, parent = Trial 5 KO baseline
`9aafa77a2f54db2e06711699286f8a2041cf3cc6`), against the frozen Decision 4C
ownership rules, `D_0_7C-5_result.md`, and `D_0_7C-6_to_review.md`. The
reviewer did not implement the candidate and did not mutate it.

## Verdict: KO

The parent-side pre-release abort violates the frozen no-later-PID/PGID
authority rule on a supported path, and directly contradicts the submission's
own custody claim. That is P1; per the sheet bar (exact ownership on every
supported path) the trial is KO regardless of the green gate matrix.

## Findings

### 1. P1 — Pre-release abort substitutes a fresh identity for a missing or mismatched sealed identity, then authorizes group signaling

- `_wait_pre_release_utility` maps `ChildProcessError` (ECHILD) to the same
  `None` as a cooperative timeout
  (`gateway/src/adapters/process_supervisor_helper.py:2103-2104`, timeout at
  `:2095-2110`), so the caller cannot distinguish "child still running" from
  "wait ownership lost (already reaped elsewhere or never our child)".
- In `_abort_pre_release_utility`, on `status is None` the code takes a fresh
  `process_identity(pid)` and, when the sealed/late identity is absent **or
  mismatched**, replaces it with that fresh lookup
  (`process_supervisor_helper.py:2161-2168`). The only remaining gate is
  self-consistency of the fresh identity (`pid == pgid == sid`,
  `:2169-2175`), after which `_bounded_session_port_utility_cleanup` signals
  the whole group via `os.kill(-pgid, …)` (`:2176-2181`, `:2009-2012`) and can
  return clean.
- Invariant violation (unconditional): Decision 4C freezes that signaling
  authority derives only from a previously recorded, still-matching composite
  identity. Here a *mismatch* — affirmative evidence of identity drift — is
  treated as license to re-derive authority from a later PID lookup. The
  submission itself claims the opposite property ("a mismatched recorded
  `startToken` is … not authority to wait or signal a recycled identity",
  `D_0_7C-6_to_review.md`); the child-owned path honors it
  (`:1527-1534`, `:1544-1551` fail closed on mismatch), the parent abort path
  does not.
- Concrete unrelated-victim reachability (conditional): on the ECHILD branch
  wait ownership is provably lost and the PID is recyclable; a recycled PID
  landing on any unrelated session leader (`pid == pgid == sid`) passes the
  `:2169-2175` gate and receives group TERM/KILL with cleanup reported clean.
  Within this file no concurrent reaper exists (the Linux `ChildObserver`
  uses `waitid(…, WNOWAIT)` and does not consume the status, `:1171-1180`;
  no `waitpid(-1)`/`os.wait()`/SIGCHLD handler found), so the stranger-kill
  endpoint requires an external reaper in the embedding process (e.g. an
  asyncio child watcher, SIG_IGN on SIGCHLD, or any future thread). ECHILD is
  nevertheless a supported, explicitly handled outcome of the code itself, and
  the frozen rule exists precisely so authority never depends on such
  whole-process reasoning. Classification: P1 security/correctness — fail-open
  identity substitution after lost wait ownership.
- Fail-closed correction (for the next trial, not implemented here): treat
  ECHILD as a distinct terminal "wait ownership lost" state; never substitute
  `process_identity(pid)` for a missing/mismatched sealed identity; signal
  only with a recorded composite identity that still matches; report unclean
  otherwise. Add a RED test forcing the ECHILD branch and asserting no signal
  is sent and cleanup is not reported clean.

### 2. Question 2 — tmux socket replacement: no P1

Both JS harnesses now bind live `#{pid}` to the spawned `-D` direct child and
compare `readLinuxProcessIdentity(child.pid)` to the retained composite
identity at startup (`tests/gateway/process_supervisor_session_port_pty.test.js:100-117`;
`…relay.test.js:194-211`). Teardown `kill-server` does go through a mutable
socket path (`…pty.test.js:161-176`, `…relay.test.js:303-319`), but the
socket lives inside a per-test `fs.mkdtempSync` workspace
(`…relay.test.js:433`, `…pty.test.js:283`), unique per run, under the
harness's own UID. A same-UID sibling able to replace that socket could
equally signal the server directly — no privilege boundary is crossed — and
regardless of what `kill-server` hits, the harness still waits, TERMs, and
KILLs the exact retained child identity (`…relay.test.js:321-348`), so its own
server is exactly retired and failures are preserved. This is gate harness
code, not product authority. Residual TOCTOU on the socket is P3 hardening
(identity recheck before `kill-server`), not KO material. Python's
pid+time_ns socket name (verified unique by the prior session) only reduces
collision; it does not change this conclusion — same non-finding for that path.

### 3. Question 3 — cleanup budget overlap: P2 hardening, no P1

Child-owned pre-release cleanup can spend `terminationGraceMs` (up to
2000 ms) plus a 2-second exact reap (`process_supervisor_helper.py:1535-1558`),
while the parent's cooperative window is fixed at 0.75 s
(`PRE_RELEASE_COOPERATIVE_SECONDS`, `:43`, `:2095`). With maximum grace the
parent's validated group fallback can interrupt the child mid-cleanup. This
does not launder reasons or lose exact ownership: a child killed mid-cleanup
cannot report exit 126, so the parent's clean predicate (`:2156-2160`) fails
and the result is unclean; each PID has a single wait owner at a time (parent
waits the leader; the leader waits the authority; on leader death the
authority reparents and is reaped only through the identity-validated exact
adopted-child path); no double-reap sequence exists. Effect is a false
"unclean" under max grace — a P2 liveness/accuracy gap (parent bound should
cover the child algorithm, plus a max-grace test), not an authority defect.

## Public surface, shell, policy, discovery — clean

Technical pathset is exactly the four helper/test files (verified via
`git show --stat 4f072a7`): no adapter/DTO/policy file touched, so no public
`ptyAuthority` exposure (Trial 5's DTO check remains valid;
`pty.authority_identity` at `:2155` is helper-internal). Harness `spawnSync`
calls use `shell: false`. No `waitpid(-1)`, descendant scan, name/fresh-PID
discovery, or broad kill was added in the reviewed regions.

## Independent commands run / not rerun

- Run (read-only): `git log`/`git show --stat` for SHA/tree/pathset
  verification; `grep`/`sed`/file reads over the exact cited regions. No
  product, test, or tmux process was started.
- Not rerun: the entire GREEN matrix (focused pre-release regression, tmux
  fault/PID-binding gates, real-relay cases, full relay suite, Trial 4 pair,
  PTY+Darwin, whitespace) and all six mutations. Justification: a confirmed
  P1 makes the verdict KO; per the review instruction, happy-path gate
  reproduction cannot override a supported security/correctness defect, and
  the remaining token budget was reserved for the verdict. The coder's
  reported totals are treated as unverified evidence, neither confirmed nor
  disputed.

## Limitations

- Finding 1's unrelated-victim endpoint was established by code analysis, not
  a live PID-reuse reproduction (which would require an injected concurrent
  reaper and PID-space cycling); the invariant violation itself is textual and
  unconditional.
- `cleanup_sealed_utility_group` internals and `_reap_exact_adopted_child`
  were relied on as characterized by the Trial 4/5 reviews and the mutation
  table, within the signal-ordering visible at `:2003-2017`.
- Two earlier reviewer sessions ended without verdicts (budget); their only
  carried-forward claim used here is the Python fixture socket-name
  uniqueness, independently consistent with the fixture design.

## Process and survivor check

This review spawned only `git`, `grep`, and `sed` under the worktree; no
node/python/tmux process was launched, and none survives. PIDs
1019690/1020609 and unrelated tmux/process state were never touched. Worktree
left clean apart from the two review-owned files below.

## Scope and canonical non-claims

Reviewer wrote only `plan/reviews/PROJECT_V5/D_0_7C-6_result.md` and updated
the Trial 6 pending row in `plan/PROJECT_V5/reviews/README.md`. No product,
test, status, request, or policy edits; no fixes implemented; all prior files
preserved. No verdict beyond Trial 6 KO: no status closure, D/0/07d claim,
integration, promotion, main/develop movement, tag, push, release, support,
publication, or public-contract claim. Policies unchanged.

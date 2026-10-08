# Review A_0_4-live-profile-10 — KO

**Task:** plan/PROJECT_V6/A/0/04.md
**Trial:** 10 (live-profile series)
**Branch:** feat/V6-A-0-04-safe-submit
**Commit:** none — dirty candidate on base `73223e9a1a46b27f97cb59144cb85a348e9d732f`
(bound by `evidence/A_0_4-live-profile-10-files.json`)
**Reviewer:** Claude reviewer agent (Opus 5.5), independent of the coder session
**Date:** 2026-10-08

## Summary

The first-prompt-only Claude completed-response witness is correctly scoped to
the operator's option 1 memo, and the source rejects every scenario I probed
(older identical prompt/response, reused/reattached session, PID/pane change,
ambiguous viewport). KO because the sheet requires the tests to fail when the
intended logic breaks (AGENTS.md Rule 9; sheet test `stale acceptance text in
scrollback does not confirm this submission`). Mutations show that the main
guard against stale identical turns, the attempt-0 restriction and kill
cleanup can each be removed with all 8 trial-10 tests still passing. The fix
is tests only.

Status: implemented, **not** reviewed-OK, integrated, promoted or released.

## Checks

- [x] Candidate identity: all 18 path SHA-256s in
  `A_0_4-live-profile-10-files.json` match the working tree (source, test,
  fixture, manifest, memo, every archived log).
- [x] Tests (ran independently on the host:
  `A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test <request's focused command>`,
  Node v22.22.1, tmux SHA-256 `6487f795…c386` = `3.6a-agents.3`). Result:
  **213/213 pass**, 0 fail/cancelled/skipped/todo. This matches the archived
  pinned-host log.
- [~] TDD RED/GREEN: the recovered host RED log shows 7 tests (5 pass, 2 fail),
  and the two failures are the positive witness and consumption tests, as
  claimed. The commands and pre-RED source hashes were not recovered. The 8th
  (spawn-wiring) test has no RED evidence. The request discloses this
  correctly. It is accepted as a disclosed gap, not proven TDD.
- [ ] Tests encode intent (Rule 9): see findings 1–3.
- [x] Scope and authority: only `base_adapter.js`, `claude_adapter.js`,
  `gateway/README.md`, the new test and one inventory digest in
  `ci/suites.json` changed. The digest change is justified: the old value is
  reproduced without the new test. No policies, push, tag or commit. No text
  replay was added: the witness returns success only on attempt 0, and every
  other path falls through to the existing busy/uncertain logic. The README
  states the limits honestly (pane, not binary, identity; wrapper assumption;
  no turn ID).
- [ ] Full gate `bash scripts/ci.sh`: **not run** (root-owned, outstanding).
- [ ] Live Claude/Codex acceptance: **not run** (outstanding). The trial 9
  sanitized fixture is reused and is not new live evidence.
- [x] Global invariants: English, `agents-gateway` naming, stderr logging,
  async approval untouched.

## Independent validation of the witness (source behaviour)

- **Older identical prompt/response.** I built a scratch test (outside the repo)
  where ready/draft/guard already show the exact `❯ <prompt>` / `● <response>`
  cells and the after frame is unchanged. The original source rejects it as
  `acceptance_uncertain`. The test passes **only** because of the blank-prior
  check `prior.some(... slice(0, 35) ... trim() !== "")`
  (`gateway/src/adapters/base_adapter.js:312`). With that line neutralised, the
  stale turn is accepted (`Missing expected rejection`).
- **Reused session / reattach / Gateway restart.** Eligibility exists only in
  the per-instance private `#freshClaudeSpawns` map. It is set only after a
  successful non-dry-run launch whose executable matches `^[A-Za-z0-9_./-]+$`.
  The first `submitPrompt` deletes it synchronously before any I/O. Spawn
  forgets it before `new-session`, and kill forgets it too. Correct.
- **PID/pane changes.** `serverPid`, `target` (pane id), `panePid`, width and
  height are compared across spawn, ready, pending, guard and after.
  Mutation-tested: removing this check fails test 4. Note: `panePid` is the
  launch shell, so this proves pane continuity, not continuity of the Claude
  process. The README wording ("server/pane identity") is accurate.
- **Ambiguous viewport.** The check requires a 41-row capture at 120×40, a
  single exact echo, a single-line printable assistant cell, blank rows
  everywhere else, the exact borders, empty composer, cursor (2,36) and auto
  mode footer, and mode/inputOff/synchronized all `0`. Long prompts that wrap
  fail the exact echo match, so they stay uncertain. Correct, but see finding 4.

## Findings (mutation testing on a scratch copy; repository untouched)

| Mutation in `base_adapter.js` | Trial 10 tests |
|---|---|
| baseline | 8/8 pass |
| identity comparison → `false` | test 4 fails ✔ |
| remove first-ask `delete` | tests 7, 8 fail ✔ |
| ignore `after.mode` | test 5 fails ✔ |
| **blank-prior transcript check → `false`** | **8/8 pass ✘** |
| **prefix equality (`rows.slice(0, index)` vs prior) removed** | **8/8 pass ✘** |
| **`echoes.length !== 1` → `< 1`** | **8/8 pass ✘** |
| **`attempt === 0` restriction removed** | **8/8 pass ✘** |
| **`rows[38] !== prior[2][38]` removed** | **8/8 pass ✘** |

Removing `forgetFreshClaudeSpawn` from `kill` is also untested: no trial 10
test calls `kill`.

1. **The stale identical-turn guard has no test that can fail.** The test
   `trial10 prior rendered conversation, hidden-history reuse and marker spoof cannot prove a first turn`
   puts the prior text only in ready/pending/guard. It is then also caught by
   the prefix check and the other-rows-blank check, so it never isolates the
   blank-prior conjunct. This is the scenario the operator memo excludes
   ("no prior rendered conversation") and the sheet requires
   (`stale acceptance text in scrollback does not confirm this submission`).
2. **The attempt-0-only scope is untested.** The memo authorises the witness
   only for the first Enter. Accepting a completed layout after the retry Enter
   (attempt 1) would widen the authority with no test failing.
3. **Kill cleanup is untested.** The request lists "forgets it on kill" as a
   behaviour. No test shows that `kill` removes eligibility.
4. Non-blocking: the duplicate-echo, prefix-equality and row-38 conjuncts are
   each redundant with another check, so single mutations survive. Isolated
   cases are recommended but not required.
5. Non-blocking: an `ask` refused by `preflight` (policy) returns before
   `submitPrompt`, so eligibility is **not** consumed on that refusal. The code
   comment ("even on … refusal") is about submit-level refusals. Nothing is
   written to the pane, so this is safe. Either make the wording precise or
   leave it as is.
6. Non-blocking: `rememberFreshClaudeSpawn` can throw (`unknown_state`)
   after `new-session` and launch. Spawn then fails and leaves the tmux session
   running. A failed `submitLaunchCommand` already behaves this way, so this is
   not a new class of problem, but root should know.

## Required corrections

1. Add a test to `tests/gateway/claude_first_prompt.test.js`, for example
   `trial10 an older identical completed turn already on screen cannot confirm the first ask`.
   Copy rows 0–34 of `profile.after` into ready, postPaste **and** guard, keep
   `profile.after` unchanged, and assert `acceptance_uncertain` with exactly one
   `\r` and no owned buffers. Then show it fails when the blank-prior check at
   `base_adapter.js:312` is neutralised.
2. Add a test where attempt 0's after frame is the unchanged pending composer
   (so the retry path runs) and attempt 1's after frame is the exact
   `profile.after` completed layout. Assert it is **not** accepted through the
   witness (`acceptance_uncertain`; at most two `\r`; no replay beyond the
   existing bounded retry). Show it fails when `attempt === 0` is removed.
3. Add a test with a plain-launch `ClaudeAdapter` (fake transport, like test 8)
   that calls `kill` before the first `ask`. Assert the ask is uncertain on the
   completed layout. Show it fails when `forgetFreshClaudeSpawn` is removed
   from `kill`.
4. Record RED evidence for each new test (a mutation or pre-change run with its
   log) and the refreshed `test.gateway` inventory digest. Put this in trial 11
   with a new files/SHA map. Do not overwrite trial 10 artifacts.

Outstanding regardless of this verdict, owned by root: run `bash scripts/ci.sh`
solo on the host with the patched tmux and a disposable Redis 7, recording
exact counts and skip budget, and run a new live Claude/Codex acceptance
check. Neither is claimed here.

## Next step

KO → the coder applies corrections 1–4 and writes
`A_0_4-live-profile-11_to_review.md`. The re-review needs a fresh reviewer
trace/session.

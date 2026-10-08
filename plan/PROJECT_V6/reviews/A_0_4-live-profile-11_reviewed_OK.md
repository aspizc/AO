# Review A_0_4-live-profile-11 — OK

**Task:** plan/PROJECT_V6/A/0/04.md
**Trial:** 11 (live-profile series)
**Branch:** feat/V6-A-0-04-safe-submit
**Commit:** none. This is a dirty candidate on HEAD `4e0441e05d2175d5a5903c2e6d4fa9222dd79d73`
(historical base `73223e9a1a46b27f97cb59144cb85a348e9d732f`; see
[HEAD checkpoint](A_0_4-live-profile-11_head-checkpoint.md)). It is bound by
`evidence/A_0_4-live-profile-11-files.json`.
**Reviewer:** Claude reviewer agent (Opus 5.5). This is a fresh session, independent of the coder session and of the trial 10 reviewer.
**Date:** 2026-10-08

## Summary

Trial 11 applies required corrections 1–4 from the
[trial 10 KO](A_0_4-live-profile-10_reviewed_KO.md) as a tests-only change.
Three new tests each fail on exactly one isolated guard mutation: the
blank-prior stale-turn predicate, the `attempt === 0` restriction, and the
removal of `forgetFreshClaudeSpawn` from `kill`. They pass on the candidate. I
reproduced all of this myself and did not rely only on the archived logs. The
production source is byte-identical to the source reviewed in trial 10.

Scope of this OK: the trial 10 Rule 9 blockers are closed for this candidate.
Status after this verdict: **implemented and reviewed (trial 11 scope)**. It is
**not** integrated, promoted or released. The sheet's acceptance criteria for
the full gate and live check are still open (see Outstanding).

## Checks

- [x] **Candidate SHA map.** All 23 entries in
  `A_0_4-live-profile-11-files.json` and all 3 entries in
  `A_0_4-live-profile-11-handoff-seal.json` match the working tree.
- [x] **No unreviewed source drift.** In `A_0_4-live-profile-11-entry.json`
  (25 paths), every path still matches except
  `tests/gateway/claude_first_prompt.test.js`, which is the intended change.
  This includes `base_adapter.js` `ebfa9f4c…`, `claude_adapter.js`
  `51886842…`, `gateway/README.md`, `ci/suites.json` and every trial 10
  artifact. The trial 10 files map gives the same result: only the test file
  changed. `git diff HEAD --stat` touches only the 5 tracked paths reviewed in
  trial 10 plus the untracked new test. Nothing changed under `policies/`.
  HEAD moved from `73223e9` to `4e0441e` only through root's trial 10
  review-trail commit, which touched plan/review files only. The additive
  checkpoint discloses this.
- [x] **The test delta is additive and matches the archive.** Diffing
  `evidence/A_0_4-live-profile-11-entry-test.js` (SHA `3b22ec56…`, equal to
  the trial 10 test hash) against the current test gives 0 removed lines and
  3 new tests. `A_0_4-live-profile-11-tests.patch` applies cleanly to the
  entry file and reproduces the current test byte-for-byte. Its hunk headers
  differ cosmetically from a plain `diff -u`, but the content is the same.
  The original 8 tests are unchanged.
- [x] **The three mutation RED logs.** I checked the archived logs and
  `mutations.json`. Each run has exit 1, `# tests 1 / # fail 1`, and
  `Missing expected rejection (uncertain).` on the targeted test. The recorded
  source SHA is `ebfa9f4c…` (base adapter) or `51886842…` (Claude adapter),
  and the recorded test SHA is `646020ff…`. Both are the candidate hashes.
  The setup-failure log is kept separately and is correctly excluded from the
  RED claims.
- [x] **Independent mutation reproduction.** I ran this in a scratch copy
  under my session scratchpad, without the coder's runner, and ran the
  **whole** first-prompt file each time instead of a name filter:
  | Mutation | Result |
  |---|---|
  | none | 11/11 pass |
  | `prior.some(... slice(0, 35) ... trim() !== "")` → `false` | 10 pass, only `trial11 an older identical completed turn…` fails |
  | `provider === "claude-code" && attempt === 0` → `provider === "claude-code"` | 10 pass, only `trial11 a completed response after the retry Enter…` fails |
  | `this.forgetFreshClaudeSpawn({ tmuxTarget });` removed from `kill` only (not from spawn) | 10 pass, only `trial11 killing a plain-launch Claude…` fails |

  Each new test is therefore the only test that catches its guard. This
  closes trial 10 findings 1–3.
- [x] **Focused GREEN at 216/216.** I re-ran the request's exact focused
  command on the host with `A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux`
  (`tmux 3.6a-agents.3`, SHA-256 `6487f795…c386`) on Node v22.22.1. Result:
  exit 0, **216 tests, 216 pass, 0 fail/cancelled/skipped/todo**. This
  matches the archived `green-host.log.gz`. 213 (trial 10) + 3 = 216.
- [x] **Inventory.** `ci/suites.json` is unchanged since trial 11 entry.
  `inventory_digest` (`scripts/ci_gate.py:173`) hashes only sorted paths, and
  adding tests to an existing file adds no path, so keeping the digest
  unchanged is correct. `python3 scripts/ci_gate.py --validate-only` passed
  with no errors. `git diff --check` is clean.
- [x] **Tests encode intent (Rule 9).**
  - *Test 1* copies after-frame rows 0–34 into ready, pending and guard. The
    old turn then also passes the prefix and post-transcript checks, so only
    the "no prior rendered conversation" condition from the operator memo
    rejects it. This is the sheet's `stale acceptance text in scrollback does
    not confirm this submission`.
  - *Test 2* drives the existing bounded retry: one paste and exactly two
    `\r`. It shows that a completed layout seen after the retry Enter is not
    credited, which matches the memo's first-Enter-only scope.
  - *Test 3* uses real `ClaudeAdapter` spawn → kill → ask wiring. Only
    `submitLaunchCommand`, the `run` used for fresh-identity capture, and the
    `submitPrompt` transport/wait are injected. The fake kill leaves frames
    that are otherwise valid for the witness, so only revoking eligibility
    separates them, as the mutation shows.

  All three tests assert no owned buffers remain and assert the exact input
  sequence, so no replay or extra keys were sent.
- [x] **Scope and authority.** The change is tests only. No production source,
  policy, manifest or doc edits, no staging or commits, no push or tag. Trial
  10 non-blocking findings 4–6 are explicitly left out of scope. They stay
  non-blocking and are recorded in the trial 10 verdict.
- [x] **Global invariants.** Everything is in English. Naming, stderr logging
  and async approval are untouched.

## Notes (non-blocking)

1. In test 3 the fake `tmux` on `PATH` always exits 0, so the "kill succeeded"
   assertion shows only the adapter's return shape, not real session teardown.
   That is acceptable here because the test is about eligibility revocation.
2. Earlier RED limits that were disclosed in trial 10 still apply: the
   recovered pre-change RED for the original 8 tests is partial, and the
   spawn-wiring test has no RED. Trial 11 adds real distinguishing RED for its
   three tests only.

## Outstanding (not claimed here; root-owned)

- [ ] Full gate `bash scripts/ci.sh`: **not run** by coder or reviewer. Root
  must run it solo on the host once agent sessions are inactive, with the
  patched tmux runtime and a disposable Redis 7, and record exact totals and
  the skip budget.
- [ ] Live acceptance: **not run**. This needs a new operator-run Claude Code
  and Codex `agent_spawn` + `agent_ask` check with pane snapshots and the
  measured provider versions/markers. The trial 9 sanitized fixture is not
  live evidence.
- [ ] Integration: the candidate is uncommitted. Root commits with an explicit
  pathspec, then integrates.

A/0/04 cannot be marked complete, integrated, promoted or released until these
are done.

## Next step

OK → root commits the candidate and trial 11 review trail with explicit
pathspecs. Root then runs the full gate and the live acceptance check before
any integration claim.

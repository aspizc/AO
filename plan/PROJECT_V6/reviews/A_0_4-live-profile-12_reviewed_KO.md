# Review A_0_4-live-profile-12 — KO

**Task:** plan/PROJECT_V6/A/0/04.md
**Trial:** 12 (live-profile series)
**Branch:** feat/V6-A-0-04-safe-submit
**Commit:** none. This is a dirty candidate on HEAD `e6d241ed2d6981121f739d0b9941384295b2fb54`.
It is bound by `evidence/A_0_4-live-profile-12-files.json`.
**Reviewer:** Claude reviewer agent (Opus 5.5). This is a fresh session,
independent of the coder session and of the trial 10 and trial 11 reviewers.
**Date:** 2026-10-08

## Summary

Trial 12 adds `freshClaude294Response` and a bounded observation-only poll
for the Claude Code 2.1.294 first ask. The safety boundary is sound. Identity
is checked on every frame, prior history must be blank, there is no second
Enter, the poll is bounded and buffers are cleaned up. Every mismatch fails
closed. I reproduced the RED and GREEN results myself.

**KO for one blocking reason.** The positive witness keys on cosmetic text that
2.1.294 chooses at random on each turn: the spinner verb, the animated spinner
glyph and the completion verb. The installed 2.1.294 binary shows this (see
finding 1). The fixture records a single random sample and the tests pin that
sample. As a result, the delayed path will almost never succeed live, and the
immediate path will succeed on about 1 turn in 8. It does not fix what it was
built to fix: the live first ask still reports `acceptance_uncertain`. The
tests also cannot catch this, which conflicts with Rule 9 and with the sheet's
"provider-specific, tested input and acceptance markers".

Status after this verdict: **implemented, review KO (trial 12)**. The trial 11
OK still covers the trial 11 candidate. Nothing is integrated, promoted or
released.

## Checks

- [x] **Binding.** All 24 entries in `A_0_4-live-profile-12-files.json` and
  both entries in `A_0_4-live-profile-12-handoff-seal.json` match the working
  tree. Compared with `A_0_4-live-profile-12-entry.json`, only the declared
  paths changed: `base_adapter.js`, the first-prompt test, `gateway/README.md`
  and the reviews README. `claude_adapter.js` (`51886842…`) and
  `ci/suites.json` (`03d2d2dd…`) are byte-identical to entry. The archived
  entry `base_adapter.js` is `ebfa9f4c…`, which is the trial 11 reviewed
  source. Nothing changed under `policies/`.
- [x] **Delta scope.** `diff -u` of the entry base adapter against the
  candidate shows two changes only: the new `freshClaude294Response`
  predicate, and the attempt-0 Claude branch in `submitPrompt`
  (`gateway/src/adapters/base_adapter.js:329-357`, `:388-408`). There are no
  other source changes.
- [x] **RED reproduced independently.** I built my own scratch tree in my
  session scratchpad, without the coder's runner, using the candidate test,
  the fixtures and the archived entry `base_adapter.js`. Result: exit 1,
  **17 tests, 13 pass, 4 fail**, 0 skipped. The 4 failures are exactly the
  four claimed: delayed reply, spinner exhaustion, immediate completion with
  no retry credit, and identity drift/ambiguous intermediate. The 2 other new
  tests pass on the baseline, as the handoff disclosed.
- [x] **GREEN reproduced.** I ran the exact focused command on the host with
  `A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux` (`tmux 3.6a-agents.3`)
  on Node v22.22.1. Result: exit 0, **222/222 pass**, 0 fail, cancelled,
  skipped or todo. `python3 scripts/ci_gate.py --validate-only` passed with
  no errors. `git diff --check` is clean.
- [x] **Same-process and blank-history guard.** All four frames (ready,
  pending, guard, after) and every polled frame must match the remembered
  spawn on `serverPid`, `target`, `panePid`, `width` and `height`. Rows 0–3
  must equal the ready header in every frame. Prior rows 4–33 must be blank.
  The echo row is pinned to row 6, and the rest of rows 4–33 must be blank,
  so a duplicated or shifted echo cannot pass. The witness is still limited
  to `attempt === 0` and to the consumed fresh-spawn record.
- [x] **No second Enter.** Once the working witness matches, the loop either
  returns or throws. It never falls through to the composer retry. The delayed
  test asserts exactly one paste and one `\r`.
- [x] **Bounded poll.** There are at most 8 waits of 1000 ms and at most 8
  extra observations. An unexpected intermediate frame throws immediately,
  and running out of polls throws `acceptance_uncertain`.
- [x] **Cleanup.** Each `observe` adds its buffer to `owned`, and the
  `finally` block deletes every owned buffer. Every throw after delivery is
  `acceptance_uncertain`, which is never replayed.
- [ ] **Markers match real 2.1.294 behavior.** They do not. See finding 1.
- [ ] **Tests encode intent (Rule 9).** Not met. See finding 2.
- [x] **Global invariants.** Everything is in English. Nothing changed in
  policies. There was no push, tag or commit. MCP naming and stderr logging
  are untouched.

## Findings

1. **Blocking: the witness depends on per-turn random wording.** I checked the
   installed binary `~/.local/share/claude/versions/2.1.294`
   (`claude --version` reports `2.1.294 (Claude Code)`) with a byte search.
   - **Completion verb.** The binary has
     `var kg=["Baked","Brewed","Churned","Cogitated","Cooked","Crunched","Sautéed","Worked"]`
     and `function xg(m){let l=(Fre(m)>>>0)%kg.length;return kg[l]??LD}`. It
     is called as `xg(l.uuid)` on the assistant message, so the verb is a
     hash of a random message UUID. The candidate requires
     `^✻ Sautéed for …` (`base_adapter.js:355`), which is 1 of 8 values.
   - **Spinner verb.** It is set by `dF(nDt())`, where `dF` is lodash
     `sample` and `nDt()` returns the 188-entry built-in list (`"Accomplishing"`
     … `"Twisting"` … `"Zigzagging"`), extended by any `spinnerVerbs`
     setting. The candidate requires `Twisting`
     (`base_adapter.js:351`), which is 1 of 188 values.
   - **Spinner glyph.** It animates with `zi(m?null:120)`, a 120 ms tick, over
     the frames `["·","✢","*","✶","✻","✽"]` and then back in reverse (outside
     Ghostty). The candidate requires `✽`. Each 1 s poll lands on an arbitrary
     frame, so even a `Twisting` turn will hit a non-`✽` frame within the 8
     polls, and the code then throws at `:402-404`.

   I swapped one value at a time in a scratch copy of the fixture, using real
   2.1.294 values. The candidate's own positive tests then fail with
   `AGENT_PROMPT_NOT_SUBMITTED`. The failure is fail-closed, so this is not a
   safety issue.

   | Fixture variant (one change) | delayed test | immediate test |
   |---|---|---|
   | as submitted | pass | pass |
   | `Sautéed` → `Brewed` | **fail** | **fail** |
   | `Twisting` → `Pondering` | **fail** | pass |
   | working glyph `✽` → `✻` | **fail** | pass |

   Taken together, a live first ask on 2.1.294 succeeds with probability of
   about 1/8 when the turn has completed by the first observation, and close
   to 0 when the delayed path is needed. The trial 12 observation itself
   (`initialObservationDelayMs` 1756, reply at about 7 s) is the delayed case.
2. **Blocking (Rule 9): the tests pin one sample instead of the marker
   contract.** No test exercises another completion verb, another spinner
   verb, or the glyph changing between polls. A test suite that passes while
   real 2.1.294 fails about 7 times in 8 does not verify the intended
   behavior.
3. **Verify, not proven blocking: the cwd in header row 3.** The regex
   `^ ▝▝   ▝▝   \/[A-Za-z0-9_./-]+$` (`base_adapter.js:342`) requires an
   absolute path that starts with `/`. Claude Code headers usually shorten
   `$HOME` to `~`. The private observation removed the home path, and the
   fixture uses `/tmp/a04-fixture`. A Gateway child whose cwd is under
   `$HOME`, as in the live acceptance repository, might therefore never
   match. Check the raw private observation and record what you find.
4. **Non-blocking, unverified risk.** The binary contains idle mascot
   animation tables (`wink`, `right-12`, `right-30`, …). If the header mascot
   animates while idle, the check that rows 0–3 are equal across frames would
   reject a valid frame. This also fails closed. Record it if the live
   evidence shows it.

## Required corrections

1. **Completion row.** Accept exactly the 2.1.294 completion verb set and
   cite the binary as the source:
   `^✻ (?:Baked|Brewed|Churned|Cogitated|Cooked|Crunched|Sautéed|Worked) for \d+s · done \d{1,2}:\d{2} [AP]M$`.
   Keep the version-exact header gate, so this set applies only to 2.1.294.
2. **Working row.** Accept any glyph from the 2.1.294 frame set
   (`·`, `✢`, `*`, `✶`, `✻`, `✽`; add `✳` only if you also support
   `TERM=xterm-ghostty`). Accept a spinner verb from the 2.1.294 built-in
   list, or a strict `^[A-Z][A-Za-z]*(?:-[a-z]+)*$` word. The verb must stay
   the **same** across all working frames in one ask, because it is chosen
   once per turn. The glyph, seconds and token count may change. Keep the
   measured parenthetical format unless you have live evidence of other
   forms. Unknown forms keep failing closed.
3. **Tests (RED first).** Add parametrized cases that fail on the trial 12
   candidate and pass after the fix:
   - delayed success where the glyph changes between polls (for example
     `✶` → `✻` → `✽`) and the verb is not `Twisting`;
   - immediate success for each of the 8 completion verbs;
   - rejection when the spinner verb changes between frames;
   - rejection for a completion verb outside the set (for example
     `Finished`).

   Keep every existing negative test for identity drift, history, duplicate
   echo, retry credit and buffer leaks.
4. **Header cwd.** Resolve finding 3 against the private observation. If the
   live header uses `~/`, allow a `~`-prefixed path with the same character
   class, and add a fixture or test for it. State the result in the handoff
   either way.
5. In the handoff, record that the wording sets come from the 2.1.294 binary
   and name the exact byte-search evidence. Do not claim that these sets are
   live-tested beyond what the observation shows.

## Outstanding (not claimed here; root-owned)

- [ ] Full gate `bash scripts/ci.sh`: not run by the coder or by me.
- [ ] Live Claude Code and Codex acceptance: not run by me. Even with the
  corrections, the fixtures do not satisfy it.
- [ ] Integration: the candidate is uncommitted. I did not stage or commit
  any candidate or source file.

## Next step

KO → coder applies corrections 1–5 and writes
`A_0_4-live-profile-13_to_review.md`. Trial count is 12 of 15.

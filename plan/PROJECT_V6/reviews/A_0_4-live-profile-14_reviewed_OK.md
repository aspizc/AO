# Review A_0_4-live-profile-14 — OK

**Task:** plan/PROJECT_V6/A/0/04.md
**Trial:** 14 (live-profile series)
**Branch:** feat/V6-A-0-04-safe-submit
**Commit:** none. This is a dirty candidate on HEAD `2ca00213171d85e68c468765f13562987998e856`.
It is bound by `evidence/A_0_4-live-profile-14-files.json`.
**Reviewer:** Claude reviewer agent (Opus 5.5). This is a fresh session,
independent of the trial 14 coder session and of earlier reviewers.
**Date:** 2026-10-08

## Summary

Trial 14 admits one more working frame to the existing 2.1.294 first-ask
observation poll. The frame is an empty assistant row 8 with a bare
`* Proofing…` spinner and no parenthetical, as observed live. The frame only
keeps the poll going. It never counts as acceptance. I reproduced the RED,
guard mutations, the 239/239 focused GREEN and all hashes myself.

**OK** for the trial 14 candidate as bound by its file map. Status:
**implemented, reviewed OK (trial 14)**. Nothing is integrated, promoted or
released.

## Checks

- [x] **Binding.** All 21 entries in `A_0_4-live-profile-14-files.json` and
  both entries in `A_0_4-live-profile-14-handoff-seal.json` matched the
  working tree before this verdict was written. All 18 trial 13 artifacts in
  `A_0_4-live-profile-14-entry.json` still match, so no immutable trial was
  edited. HEAD matches the entry head. `claude_adapter.js`, `ci/suites.json`
  and the trial 13 fixture still hash as they did at entry. Nothing changed
  under `policies/`.
- [x] **Delta scope.** I ran `diff -u` on the archived entry `base_adapter.js`
  (`7d648ac8…`) against the candidate. Only the `working` branch of
  `freshClaude294Response` changed (`gateway/src/adapters/base_adapter.js:350-360`).
  Row 8 `""` selects the bare `^[·✢*✶✻✽] <word>…$` form. Row 8 `"●"` selects
  the existing parenthetical form. Any other row 8 value returns `null`.
  Identity, header, blank-history, echo, composer, footer and completion
  checks, and the `submitPrompt` loop, are byte-identical to trial 13.
- [x] **The bare spinner is observation only.** The function returns the
  bare-spinner verb only when called with `working = true`. That value is used
  only to enter or continue the 8-poll loop
  (`base_adapter.js:390-405`). Success still needs the non-working witness:
  `● <reply>` on row 8 plus the version-bound completion row 10. A bare
  spinner shown alongside `●`, or a parenthetical spinner with an empty
  row 8, fails closed. Tests cover both, and so do my mutations below.
- [x] **Same-process and blank-history guard.** These are unchanged. The
  guard requires `firstPromptProcess` and matching
  server/pane PID, target and geometry on every frame. It also requires
  blank rows 4–33 in the ready, pending and guard frames, and the exact echo
  on row 6.
- [x] **Stable spinner word.** The per-ask `!== workingVerb` comparison is
  reused, so the word must survive the change from the bare frame to the
  `●` frame. The glyph may animate.
- [x] **Bounded to 8 polls, no second Enter, no stale success.** Inside the
  attempt-0 Claude branch the loop either returns or throws. It cannot reach
  the composer retry. Every trial 14 test asserts exactly one bracketed
  paste and one `\r`, with no leaked buffers. The exhaustion test asserts
  `[150, 1500, 1000×8]` waits.
- [x] **Sanitized fixture versus live evidence.** I parsed the raw private
  `workspace/root-a04-live-acceptance-result.json` without copying it. The
  `errorPane` has non-blank rows 4–33 at only {6, 33}, an empty row 8 and
  row 33 `* Proofing…`. The `laterPane` has {6, 8, 10}, a `● ` reply and
  `✻ Cooked for …`. The submit state and header are unchanged across all
  three panes. Elapsed times are 1765 ms and +7010 ms. The fixture
  reproduces this layout using a synthetic prompt, cwd, PIDs and clock.
  It contains no home path, token or session identity.
- [x] **RED reproduced independently.** I built my own scratch tree with the
  candidate tests and the archived trial 13 source (`7d648ac8…`). Result:
  exit 1, **34 tests, 30 pass, 4 fail**, 0 skipped or cancelled. The four
  failures are the four claimed tests (bare observe, transition, exhaustion,
  changed word or ambiguous cells). The reused/prior/identity test passes on
  the baseline, which the handoff discloses.
- [x] **Guards fail when removed (my own mutations, scratch only).**
  - Poll bound raised from `< 8` to `< 9`: both exhaustion tests fail
    (trial 12 and trial 14).
  - Verb stability changed to `=== false`: the trial 13 changed-verb test and
    the trial 14 changed-word test fail.
  - Parenthetical form accepted without `●`: the trial 12 ambiguous-cells
    test fails.
  - Bare form accepted with `●`: 6 tests fail.
  - Blank-history check removed from the 2.1.294 witness: the trial 12 and
    trial 14 reused/prior tests fail.
  - Spawn identity removed from the 2.1.294 witness: 5 tests fail.
- [x] **GREEN reproduced.** I ran the exact focused host command on Node
  v22.22.1 with `A04_TEST_TMUX` set to tmux `3.6a-agents.3`. Result: exit 0,
  **239/239 pass**, 0 fail, cancelled, skipped or todo. This matches the
  archived `green-host` log. `python3 scripts/ci_gate.py --validate-only`
  exited 0 with no errors and 0 suite tests, as disclosed. `git diff --check`
  is clean.
- [x] **Rule 14 honesty.** The handoff says the live run proves the trial 13
  false negative, not refined-candidate acceptance. It also says the
  repeated working frames in tests are synthetic inputs. It claims no
  integration or release.
- [x] **Global invariants.** Everything is in English. There was no policy
  edit, push, tag or commit, and no subagents. MCP naming and stderr logging
  are untouched.

## Non-blocking notes

1. The trial 13 note 2 gap is still there. If the final `throw` after the 8
   polls is removed, no test fails, because the generic path also throws
   `acceptance_uncertain` for these fixtures. This is inherited, not a
   regression.
2. The poll window is tight. The 1500 ms delay plus 8 × 1000 ms polls gives
   about 9.5 s. Live, the reply was first seen about 8.8 s after preAsk, and
   the true completion time is not known. A slower reply would still fail
   closed as uncertain. Only the root's live acceptance can show whether the
   window is enough.
3. A bare frame that follows a `●` frame with the same word is accepted
   while polling. This only keeps the observation going and cannot produce
   success.

## Outstanding (not claimed here; root-owned)

- [ ] Full gate `bash scripts/ci.sh`: not run by me.
- [ ] Live Claude Code and Codex acceptance with the refined candidate: not
  run by me. Sheet acceptance criteria stay open until it succeeds.
- [ ] Integration: the candidate is uncommitted. I did not stage or commit
  any candidate, source or review file.

## Next step

Root runs the full gate and live acceptance on this exact candidate. Then it
commits the review trail and the candidate with explicit pathspecs.

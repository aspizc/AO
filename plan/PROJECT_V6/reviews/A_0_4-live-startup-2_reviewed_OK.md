# Review A_0_4-live-startup-2 — OK

**Task:** plan/PROJECT_V6/A/0/04.md (live startup-notice draft profile, raw-padding correction)
**Trial:** 2
**Branch:** feat/V6-A-0-04-live-startup-profile
**Commit:** none. The candidate is uncommitted on base `71425f1667316c1dc1da60960dcfa7e424d18992`.
**Reviewer:** Claude reviewer agent (claude-opus-5-5, medium effort), independent of the coder session
**Date:** 2026-10-08

## Summary

Trial 2 fixes all four trial-1 KO findings. The draft profile now accepts
trailing U+0020 padding, and only that padding, on rows 11, 12 and 38. A new
fixture labels each row as raw or reconstructed. `gateway/README.md` documents
the profile and its limits. The two equivalent guards were removed, and the
cwd-regex mutant is now killed. I reproduced the behavioural RED against the
exact archived trial-1 source and the focused GREEN on the candidate. All 18
coder mutants fail at least one test. This verdict approves a
**conditionally safe first submission only**. It does not approve live
acceptance: a successful submission on this layout still ends in
`acceptance_uncertain`. **OK.**

## Review identity and evidence chain

- Gateway trace: `tr-v6-a04-startup-r2-95134c53-11af-49fa-aaff-222d6234b99d`
- Gateway task: `ts-84d4ec14-f3ee-4f99-9eda-9e8718a38875`
- Gateway session: `ag-tr-v6-a04-startup-r2-951-claude-code-reviewer`
- Runtime: Claude Code, `claude-opus-5-5`, medium effort. This is a new
  reviewer session; it is not the trial-1 reviewer.
- Handoff seal: both entries match (`to_review` `adf25b1e…688d22`,
  `files.json` `ecf0313b…cd7f53`). Every entry in `files.json` matches the
  worktree.
- Entry map: all 13 preserved trial-1 files match their pinned SHA256 values,
  including the trial-1 handoff, the KO, the identity note and the original
  fixture.
- Archived entry source: `entry-source.js.gz` decompresses to SHA256
  `911dd144…3e07`. The trial-1 `files.json` binds the same value for
  `base_adapter.js`, so this is the exact trial-1 candidate. The candidate
  source hashes to `a4702838…5da62`, which matches `binding.json`.
- Diff between entry and candidate (`diff`): only `codexUpdateWelcomeDraft`
  (padding and width predicates), its two call sites (now passing
  `pane.width`), and the reduced ready-footer guard in `submitPrompt` changed.
  `guardedSubmit`, `freshCodexWork` and the transport are untouched.

## Checks

- [x] **Files:** there are three functional paths (`base_adapter.js`,
      `prompt_submission.test.js`, the new raw-padding fixture), plus
      `gateway/README.md` and the new review evidence. The original fixture is
      byte-identical. There is no `policies/` change, and no status, release,
      A05 or review-index edit.
- [x] **TDD RED reproduced:** I copied the tree to my scratchpad and swapped in
      the archived trial-1 `base_adapter.js`. The `startup|trial17` selection
      ran **19 tests: 17 pass, 2 fail, 0 skipped**. The failures are
      `startup2 raw padded rows permit only the guarded first Enter with
      acceptance uncertain` and `startup2 each raw padding predicate accepts
      spaces through the pane width`. This matches the archived RED log and
      the handoff.
- [x] **Focused GREEN reproduced:** I ran the handoff's 11-file `node --test`
      command with the pinned `A04_TEST_TMUX`: **291 pass, 0 fail,
      0 skipped/cancelled/todo, exit 0**, on Node v22.22.1.
- [x] **Static checks:** `npm --prefix gateway run lint` exit 0;
      `check_public_hygiene.py` 0 findings; `ci_gate.py --validate-only`
      exit 0; `git diff --check` clean.
- [x] **Mutations:** I ran a copy of the coder's runner, with its output
      redirected to my scratchpad. All **18** mutants exit 1 with at least one
      relevant failure, matching `mutations.json` test for test:
  - `width` fails test 17.
  - `blank-padding` fails tests 11 and 17.
  - `greeting-padding` and `status-padding` each fail test 17.
  - `cwd` fails test 18.
  - The other 13 mutants also fail; see `mutations.json`.
- [x] **Extra reviewer mutants (8):** six are killed:
  - removing the early shifted-header guard;
  - `\s` instead of a literal space in each of the three padding regexes;
  - `trim()` instead of `trimEnd()` on the greeting;
  - width + 1.

  Two survive, and both are equivalent (see observation 2).
- [x] **KO finding 1 (raw padding):** fixed. `base_adapter.js:138-147`
      accepts only `/^ *$/` on row 11. For rows 12 and 38 it compares the
      `trimEnd()` value exactly, then requires a space-only suffix. All three
      rows must also fit within `pane.width`. Tab, NBSP, `x` and width-121
      padding are refused with no Enter (test 17). Changing padding between
      ready, pending and guard is refused (test 19). The greeting set still
      holds 88 entries, and every other pin is exact.
- [x] **KO finding 2 (provenance):** accepted through an alternative to the
      two options the KO offered (see observation 1). The new fixture's
      `sourceKind` and `rawRows` separate four kinds of row:
  - raw draft rows 10, 11, 12, 38 and 39, and raw ready row 39;
  - rows 0–9, exact pins confirmed by `notice=true`;
  - row 36, derived from the transcript;
  - blanks 13–35 and 37 and ready rows 10–12 and 38, which are
    reconstructed or hypothesised.

  The fixture values agree with the trial-1 KO's raw-length table:
  - row 11 is 61 spaces;
  - row 12 is 70 characters, with "Welcome to our little rectangle of
    possibility.";
  - row 38 is 116 characters with one trailing space;
  - row 10 is 92 characters (= 116 − 1 − 28 + 5);
  - ready and draft row 39 equal the trial-1 pins;
  - cursor X 86 = 84-character payload + 2.

  I could not inspect the private diagnostic file itself. Its hash
  (`59ccb93f…27ba`) matches the value the trial-1 KO recorded.
- [x] **KO finding 3 (README):** fixed. The new paragraph covers:
  - the pinned notice, session, greetings and OnceLock source links;
  - the 88-greeting slot;
  - the space-only padding within width;
  - the reconstructed cursor/LF in the original fixture;
  - that neither fixture is a complete raw sequence;
  - that `acceptance_uncertain` is the current outcome;
  - the reported, unverified post-Enter output;
  - the unsupported variants (other versions or commands, YOLO row, truncated
    or space-containing cwd, wrapped notice, menus, changed footers).
- [x] **Docs canonical-tool URL:** the session renderer link uses
      `session%2Ers`. I fetched both spellings from GitHub (HTTP 200). The raw
      `%2E` and `.` URLs return byte-identical content (SHA256
      `15574118…acad4`), so the link target is preserved. The retained
      `green-doc-failure` log shows the earlier 290/1 run, which failed only
      on `non-canonical tool reference session.rs`.
- [x] **KO finding 4 (intent tests and simplicity):**
  - The cwd-regex mutant is now killed by test 18, through its `›`,
    `not-a-path` and `…` cases.
  - The `ready.cursorY/cursorX` check and the mixed-flag check were removed.
    The ready row-39 footer pin remains, and its `ready-footer` mutant is
    killed.
  - Removing those checks did not weaken any test: GREEN is 291/291, and the
    `stable-capture`, `ready-prefix` and `process` mutants are still killed.
- [x] **Global invariants:**
  - Code and docs are in English.
  - There is no commit, push or staging by the coder.
  - The `agents-gateway` naming is unchanged, and logs still go to stderr.
  - The async approval flow is untouched.
  - No menu, decision or retry authority was added: the first Enter is still
    limited to attempt 0 (the `first-enter` mutant is killed).
- [x] **Private literals:** I decompressed every new or changed file,
      including all `.gz` logs, plus the tracked diff. Neither `/home/`, the
      operator's name, nor a private mirror path appears in them. The only
      32-hex value is the synthetic `0123456789abcdef…`. The `/tmp` strings
      that do appear are the coder's scratch paths and the pinned tmux build
      path. That tmux build path already appears in committed review files.

## Non-blocking observations

1. **Original fixture `sourceKind`.** KO finding 2 offered two fixes: rebuild
   the fixture from a raw capture, or annotate the fixture. The coder instead
   kept the trial-1 fixture byte-identical and added a separately labelled raw
   fixture. The README now states that the original fixture omitted raw
   padding. I accept this because the false "raw" claim is corrected in the
   tracked docs and the new fixture. However, read on its own, the original
   fixture still says only "Sanitized captured ready/draft transcripts". The
   next change that touches it should add one clause saying that trailing
   padding was stripped. That fixture is candidate test data, not part of the
   immutable review trail.
2. **Two equivalent mutants survive.**
   - Adding a space to the cwd character class survives.
   - Replacing `rows[38].trimEnd() === status` with
     `rows[38].trim() === status.trim()` also survives.

   Both are unreachable: the outer `codexLiveStatus`
   (`/^ {2}GPT-6\.1-Sol medium fast · \S+\s*$/`) already forbids spaces inside
   the cwd and requires exactly two leading spaces. As a result, test 18's
   `"/fixture/space containing"` case is refused by `codexLiveStatus`, not by
   the cwd regex. The refusal is still correct; the case just does not test
   the regex. No change is required.
3. **The docs checker flags URL path segments** (`session.rs`) as tool
   references. The `%2E` encoding works around this correctly. Teaching the
   checker to skip link targets is a separate cleanup and outside this
   sheet's scope (Rule 7: flagged, not blended).

## Limits of this verdict

- **No live acceptance claim.** I ran no live provider session.
  - The operator's post-Enter observation is taken as **reported only**: one
    guarded Enter, `acceptance_uncertain`, and a delayed frame 3 s later
    showing history at row 15, `• Working` at row 33, an empty composer and a
    spinner status. Its sanitized JSON binds the candidate hash
    `a4702838…5da62`, but I could not verify the frame, the cleanup or the
    Enter count myself.
  - A frame captured after the bounded window does not show what was visible
    at the acceptance check.
  - Acceptance on the shifted-header layout (row 9) needs a separate,
    reviewed acceptance profile. This candidate proves it neither by fixture
    nor live.
- The private diagnostic evidence was not available to me. I checked the
  fixture's raw-row claims only against the trial-1 KO's recorded values, its
  hash, and internal length arithmetic.
- Not run: the full `bash scripts/ci.sh`, which is root-owned, and any live
  tmux/provider acceptance.
- This approval does not move A/0/04 to integrated, promoted or released
  (Rule 14). Nothing here supports an A05 completion or a `1.1.0` claim.
- Per the brief, this verdict is not committed and not indexed in
  `reviews/README.md`. The orchestrator owns commit, index and integration.

## Next step

OK → the orchestrator may commit the candidate and this verdict with explicit
pathspecs, then index the verdict. The bounded acceptance profile for the
shifted-header Working frame remains a separate follow-up and needs its own
review.

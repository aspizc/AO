# Review A_0_4-live-profile-13 — OK

**Task:** plan/PROJECT_V6/A/0/04.md
**Trial:** 13 (live-profile series)
**Branch:** feat/V6-A-0-04-safe-submit
**Commit:** none. This is a dirty candidate on HEAD `b42b94cff1c904242903f113c0cd8c8a4bc8a6ea`.
It is bound by `evidence/A_0_4-live-profile-13-files.json`.
**Reviewer:** Claude reviewer agent (Opus 5.5). This is a fresh session,
independent of the coder session and of the trial 10, 11 and 12 reviewers.
**Date:** 2026-10-08

## Summary

Trial 13 applies trial 12 KO corrections 1–5 and nothing else. The 2.1.294
first-ask witness now accepts the eight binary completion verbs, any glyph
from the standard six-frame spinner set, and a strict spinner word that must
stay identical across every working frame of one ask. The trial 12 safety
boundary is untouched. I reproduced the RED, the guard mutations, the 234/234
focused GREEN and the binary evidence myself.

**OK** for the trial 13 candidate as bound by its file map. Status:
**implemented, reviewed OK (trial 13)**. Nothing is integrated, promoted or
released.

## Checks

- [x] **Binding.** All 22 entries in `A_0_4-live-profile-13-files.json` and
  both entries in `A_0_4-live-profile-13-handoff-seal.json` matched the
  working tree before this verdict was written. Nothing changed under
  `policies/`. (This verdict's index row changes `reviews/README.md`
  afterwards, as expected.)
- [x] **Delta scope.** `diff -u` of the archived entry `base_adapter.js`
  (`f3d28c72…`) against the candidate equals the source part of
  `A_0_4-live-profile-13-delta.patch`. It touches only the working-row regex
  and verb return in `freshClaude294Response`, the completion-verb regex, and
  the `workingVerb` binding in the attempt-0 poll
  (`gateway/src/adapters/base_adapter.js:351-361`, `:399-410`). Identity,
  header, blank-history, echo, composer, footer, cursor, attempt-0 and
  first-prompt-record checks are byte-identical to trial 12.
- [x] **Correction 1: completion verbs.** Rows match exactly
  `Baked|Brewed|Churned|Cogitated|Cooked|Crunched|Sautéed|Worked`. This is
  still gated by the exact `Claude Code v2.1.294` header.
- [x] **Correction 2: spinner.** The glyph class `[·✢*✶✻✽]` is the binary's
  standard array `p`. I read the selector myself: `isn()`/`KRe()` return the
  `✳` array only for `TERM==="xterm-ghostty"`, so excluding `✳` is correct
  under tmux. The verb is a strict word, returned by the witness and compared
  with `!==` on every poll. Seconds, tokens and glyph may change. A changed
  verb throws `acceptance_uncertain` before any later completed frame is
  read.
- [x] **Binary evidence.** I checked the installed
  `~/.local/share/claude/versions/2.1.294` myself. SHA-256 is `27122ca7…f262`,
  and all five needle offsets match the handoff table: `var kg=[` at
  232211480, `function xg(m)` at 232211586, `function nDt()` at 222876832,
  `dF(nDt())` at 222882987 (4 occurrences, the first at that offset) and
  `zi(m?null:120)` at 229360213. The glyph arrays are at 222934022.
- [x] **Correction 4: header cwd.** I parsed the raw private
  `workspace/root-a04-live-acceptance-result.json` without copying it. Its
  `preAskPane`, `errorPane` and `laterPane` headers are identical, contain no
  `~`, and the cwd row matches the existing absolute-path regex. Keeping that
  regex is justified.
- [x] **RED reproduced independently.** In my own scratch tree, the candidate
  test against the archived trial 12 entry source gave exit 1:
  **29 tests, 21 pass, 8 fail**. The 8 failures are the animated non-Twisting
  test and the 7 non-Sautéed completion verbs, as claimed.
- [x] **Negative guards fail when removed (my own mutations).**
  - Verb stability (`!== workingVerb` → `!…`): "changed spinner verb" fails.
  - Completion set widened to `[A-Z][a-zé]+`: "outside the version-bound set"
    fails.
  - Glyph class widened to `.`: "unknown spinner forms" fails.
  - Blank-prior-history check removed: "reused Claude and stale prior
    transcript" fails.
  - Spawn identity check removed: 3 identity/provenance tests fail.
- [x] **GREEN reproduced.** I ran the exact focused host command on Node
  v22.22.1 with `A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux`. Result:
  exit 0, **234/234 pass**, 0 fail, cancelled, skipped or todo. This matches
  the archived GREEN log. `python3 scripts/ci_gate.py --validate-only` exited
  0 and `git diff --check` is clean.
- [x] **No widened stale or reused acceptance and no second Enter.** The
  first-turn record, identity on every frame, blank rows 4–33 in prior frames
  and the pinned echo row are all unchanged. The poll still returns or throws
  and never reaches the composer retry. Every new positive and negative test
  asserts exactly one paste and one `\r`, and that no buffers leak.
- [x] **Correction 5 / Rule 14 honesty.** The handoff labels the wording sets
  as binary-derived and not live-tested beyond the Twisting/✽/Sautéed
  sample. It makes no live, integration or release claim.
- [x] **Global invariants.** Everything is in English. There was no policy
  edit, push, tag or commit. MCP naming and stderr logging are untouched.

## Non-blocking notes

1. Strict-word spinner matching rejects built-in or configured verbs that
   contain apostrophes or other punctuation. That path fails closed as
   `acceptance_uncertain`, and the handoff discloses it.
2. Removing the final `throw` after the 8 polls is not caught by any test:
   the fall-through then throws `acceptance_uncertain` on the generic path
   for these fixtures. This is inherited from trial 12 and is not a
   regression. A future trial could pin it if the generic path ever
   classifies a working frame as `busy`.
3. Mascot animation in the header stays unverified. It fails closed.

## Outstanding (not claimed here; root-owned)

- [ ] Full gate `bash scripts/ci.sh`: not run by me.
- [ ] Live Claude Code and Codex acceptance with the refined candidate: not
  run by me. Sheet acceptance criteria stay open until it succeeds.
- [ ] Integration: the candidate is uncommitted. I did not stage or commit
  any candidate or source file.

## Next step

Root runs the full gate and live acceptance on this exact candidate. Then it
commits the review trail and the candidate with explicit pathspecs.

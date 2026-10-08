# Review A_0_4-live-profile-18 — OK

**Task:** plan/PROJECT_V6/A/0/04.md
**Trial:** 18 (live-profile series)
**Branch:** feat/V6-A-0-04-safe-submit
**Commit:** none. Uncommitted one-line candidate on HEAD
`fd2c4004d6bdb008727acb6155050ca79337d9fd` (trial 17 reviewed code), bound by
`evidence/A_0_4-live-profile-18-files.json` and
`evidence/A_0_4-live-profile-18-handoff-seal.json`.
**Reviewer:** Claude reviewer agent (Opus 5.5). Fresh session, independent of
the trial 18 coder session and of earlier reviewers. No subagents were used.
**Date:** 2026-10-08

## Summary

Trial 18 fixes the `no-regex-spaces` lint error that root's full gate hit at
`base_adapter.js:369:9`. It rewrites two runs of three literal spaces in the
`freshClaude294Response` cwd header regex as ` {3}`. I recomputed the diff
and all bound hashes, reproduced ESLint RED and GREEN, ran the 131-test
prompt_submission suite and checked that both regexes accept and refuse the
same strings.

**OK** for the trial 18 candidate as bound by its file map. Status:
**implemented, reviewed OK (trial 18)**. Nothing is integrated, promoted or
released. The full gate was not run (see Limits).

## Checks

- [x] **Exact diff.** `git diff HEAD` shows one file and one line,
  `gateway/src/adapters/base_adapter.js:369`:
  `/^ ▝▝   ▝▝   \/[A-Za-z0-9_./-]+$/` → `/^ ▝▝ {3}▝▝ {3}\/[A-Za-z0-9_./-]+$/`.
  It is byte-identical to `evidence/A_0_4-live-profile-18-delta.patch`.
  Anchors, flags (none), the path class, captures, callers and control flow
  are unchanged.
- [x] **Bound hashes.** All 9 entries of the file map and both entries of
  the seal match the working tree.
  - HEAD blob of `base_adapter.js`: `9c9a96b1…`. This equals the declared
    "before" hash and the trial 17 OK candidate.
  - Working tree: `8ce501e1…`, which equals the declared "after" hash.
  - `prompt_submission.test.js`: `fa39402b…`, unchanged from trial 17.
  - Entry map: HEAD and branch match. 318 hashed paths. The only one that
    differs is the declared `base_adapter.js`.
- [x] **ESLint RED/GREEN, reproduced independently from `gateway/`.**
  - HEAD blob via `--stdin --stdin-filename src/adapters/base_adapter.js`:
    exit 1, exactly one error, `369:9 Spaces are hard to count. Use {3}
    no-regex-spaces`.
  - Candidate (`--config eslint.config.js src/adapters/base_adapter.js`):
    exit 0, no diagnostics.
- [x] **Focused tests.** `node --test tests/gateway/prompt_submission.test.js`
  exits 0: 131 pass, 0 fail, cancelled, skipped or todo. The Claude 2.1.294
  fixtures (`claude_2_1_294_first_prompt.json`, `..._pre_assistant.json`)
  contain this exact header row, so the suite exercises the changed regex.
  `git diff --check` exits 0.
- [x] **Regex equivalence (independent script).** I took both regex literals
  directly from line 369 of the HEAD blob and of the working tree, so I did
  not retype them.
  - I ran 10,692 generated strings through both regexes. The inputs varied:
    - 4 prefixes
    - 9 options for each gap: 0–5 spaces, three tabs, three NBSP, and
      space-tab-space
    - 11 paths: valid, empty, with spaces, non-ASCII, `:`, no leading slash
    - 3 tails: none, `\n`, space
  - Result: 0 disagreements. Both accept the same 5 strings: exactly a
    single-space prefix, three spaces in each gap and a valid path.
  - Explicit boundaries, before and after:
    - Accepted: `" ▝▝   ▝▝   /home/carase/git"`.
    - Refused: two or four spaces in either gap, a tab gap, a missing `/`,
      a bare `/` and a path containing a space.
  - ` {3}` is a literal U+0020 with an exact quantifier. It is not `\s`, so
    tabs and NBSP stay refused.
- [x] **Prior review trail immutable, no policy edit.** `git diff --quiet
  HEAD -- plan/ policies/` exits 0. `policies/` has no untracked files. The
  only tracked change is `base_adapter.js`. The only untracked files are the
  9 trial 18 handoff/evidence files. The entry map's hashes for every prior
  A_0_4 review/evidence artifact still match.
- [x] **Global invariants.** English, no push, no commit or staging by the
  coder, no `orchestrator/` path, no tests added or changed, and no change
  to behavior or the public contract.

## Findings

All green. Observations (non-blocking):

1. The handoff mentions an unrelated untracked "structure mutant file" that
   was present at entry. It is not in the worktree now (`git status
   --ignored` shows nothing besides the trial 18 files). It is not part of
   this candidate and has no effect on the verdict.
2. ESLint RED is a lint check, not a behavior test. That is appropriate for
   a change that only touches syntax. The equivalence evidence above stands
   in for a behavioral RED.

## Limits

- No full gate (`bash scripts/ci.sh`) was run by the coder or by me. Root
  ended its gate attempt after the known lint.gateway failure. A clean
  focused ESLint result on one file does not show that `lint.gateway` or the
  full gate passes. The sheet's acceptance criterion "Full gate green"
  remains open until root reruns the gate on the committed candidate.
- Live checks are unchanged from trial 17. This trial makes no live claim.

## Next step

Root commits the bound candidate with an explicit pathspec, reruns the full
gate and owns integration. This verdict does not grant integration authority.

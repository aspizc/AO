# Review A_0_6-5 — OK

**Task:** plan/PROJECT_V6/A/0/06.md
**Trial:** 5
**Branch:** feat/V6-A-0-06-permission-prompts (uncommitted candidate on HEAD `c0405b1dc9c19c505a61ed48e4244b4e0228baaf`; implementation baseline `7982e422577ad6dfb37ef0c7b1e3c8433735430a`)
**Commit:** none (working-tree candidate only)
**Reviewer:** independent Claude reviewer session (claude-opus-5-5); no subagent, no code or `policies/` edit, no commit/push
**Date:** 2026-10-08

## Summary

Trial 5 adds one tracked Git attribute and nothing else. The attribute turns
off text diffs for the three raw terminal-grid fixtures, so a staged
`git diff --cached --check` passes on the whole reviewed set. It does not change
any bytes. I reproduced the result in a scratch index:

- The 28 reviewed paths without the attribute give **exit 2**. All 112 output
  lines come from the three `.txt` fixtures.
- The same paths plus `.gitattributes` give **exit 0**.

All 23 Trial 4 candidate hashes are unchanged. Verdict: **OK**. Full CI and
the live provider check remain root-owned and get no credit here.

## Bound inputs

- `A_0_6-5_to_review.md` sha256
  `441f0fafa99b712ef7c3fb38ecff9a008efca656f3b72ed51f940928cfa519a0`
  (read-only, 5472 bytes).
- `.gitattributes` sha256
  `9b11142cb8669010a8963af230a1ada76d144a2c40d7a9da940681bd87e166d0`, which
  matches the handoff.
- Trial 5 manifest sha256
  `a324d8a8cc30b35b65c176c459b69fd7e2333a3e752b2cbbd60eeccc424ca529`, which
  matches the handoff. All 83 file hashes bound by the Trial 5 manifest match
  the working tree, and so do all 82 bound by the Trial 4 manifest
  (`bd5c9964…94ee`, which also matches).
  `reviewIndexSha256` `ddc80c78…12b7` equals `reviews/README.md` before this
  verdict.
- Trial 4 handoff `eded916c…b58e` and Trial 4 OK `3f9c4c16…12da` both match.
- Candidate delta: the Trial 5 `candidateFiles` are the Trial 4 set plus
  `.gitattributes`. That is 0 changed and 0 removed. `git status` shows exactly
  those 24 candidate paths plus the review-trail files.

## Checks

- [x] **Exact one-line scope.** `.gitattributes` is 51 bytes:
      `tests/gateway/fixtures/session_prompts/*.txt -diff` followed by one LF.
      It has no other rules, no CR and no BOM. It is the only `.gitattributes`
      in the tree. `info/attributes` does not exist, and `core.attributesFile`
      and diff/whitespace settings are not set in any Git config.
- [x] **Attribute scope** (`check-attr` against the staged tree):
  - The three fixtures have `diff: unset`, and this is their only attribute
    (`check-attr -a`).
  - These paths have `diff: unspecified`:
    - `README.json`
    - `session_prompt.test.js`
    - `gateway/src/adapters/session_prompt.js`
    - root `README.md`
    - `fixtures/a.txt` outside the directory
    - `session_prompts/sub/a.txt` (the pattern contains a slash, so `*` does
      not match nested directories)
    - `x.TXT` (case-sensitive)

  No `text`, `eol`, `filter`, `merge` or `whitespace` attribute is set.
- [x] **Unchanged candidate.** The 23 Trial 4 hashes are identical in the
      Trial 4 manifest, the Trial 5 manifest and the working tree. There is no
      source, test, fixture, README, CI inventory or policy change, and
      `git diff HEAD -- policies` is empty.
- [x] **Raw fixture bytes preserved.** The fixtures have:
  - `claude-permission.txt`: 2270 B, 7 lines with trailing spaces;
  - `codex-command.txt`: 1924 B, 23 lines with trailing spaces;
  - `codex-trust.txt`: 1864 B, 25 lines with trailing spaces;
  - blank rows at EOF, and 0 CR bytes.

  Every blob staged in the scratch index equals
  `git hash-object --no-filters` of its working-tree file (29/29), so staging
  applies no transformation. `-diff` only affects how diffs are shown, not the
  stored content.
- [x] **Staged RED and GREEN reproduced independently** (see Verified).
- [x] **Handoff honesty (Rule 12).** The handoff admits that earlier
      unstaged `git diff --check` claims did not cover the then-untracked
      fixtures. It keeps the RED log and claims no rerun of behaviour suites,
      no CI and no live check.
- [ ] Full gate `bash scripts/ci.sh` green: not run. Root-owned, no credit.
- [ ] Live check: operator-run and not performed.

## Verified

I used a scratch index (`GIT_INDEX_FILE` in the session scratchpad, seeded by
`git read-tree HEAD`) and the 28 paths from `initialUnstagedPaths` in the
command evidence. I staged with `git add -- <explicit paths>`. The staged set
was exactly those 28 paths.

The worktree contains `.gitattributes`, and Git would otherwise read it, so I
passed `--attr-source` to force where attributes come from:

1. **RED:** `git --attr-source=HEAD diff --cached --check` gave **exit 2**.
   HEAD has no `.gitattributes`. All 112 output lines are in the three `.txt`
   fixtures (8, 23 and 26 diagnostic lines: trailing whitespace and new blank
   line at EOF). These lines are byte-identical to the body of the coder's
   `A_0_6-5-staged-check-red.log`. The same check restricted to every other
   path, `-- . ':!tests/gateway/fixtures/session_prompts/*.txt'`, gives exit
   0. The fixtures are the only source of the failure.
2. **GREEN:** I added `-- .gitattributes`, giving 29 staged paths, and wrote
   tree `914fed24…`. Then `git --attr-source=914fed24… diff --cached --check`
   gave **exit 0**, so the staged attribute alone makes the check pass. A
   plain `git diff --cached --check` using default attribute lookup also gave
   exit 0.
3. **Cleanup:** I deleted the scratch index. The real index sha256 was the
   same before and after (`sha256sum -c` OK), and `git diff --cached` is empty.
   HEAD is unchanged.

## Findings

No blocking findings. Non-blocking observations:

- A. **Known trade-off.** `-diff` also affects `git log -p`, `git show`,
  `git format-patch` and `git diff` without `--binary`. These show the
  fixtures as "Binary files differ" and leave their content out of textual
  patches. A patch-based transfer of these fixtures needs `--binary`.
  Reviewers can still inspect changes with `git diff --text`. The handoff
  discloses this. Repository-wide whitespace checking is unchanged for every
  other path.
- B. **Untracked evidence logs.** As in Trial 4 note B, the three new `.log`
  evidence files are git-ignored (`.gitignore:59 *.log`). The manifest binds
  their hashes, but the committed trail will contain only the `.json`
  evidence. This verdict reproduces RED and GREEN on its own, so it does not
  depend on those logs.
- C. **Notes carried forward.** Trial 4 notes A and C still apply unchanged.

## Status

Trial 5 is **OK**, as an independent review of the uncommitted candidate: the
23 Trial 4 files plus `.gitattributes`, all bound above. Under the canonical
status rule, A/0/06 is `reviewed` for this candidate only. It is not
committed, integrated, promoted or released.

## Next step

Root commits the 24 candidate files and the review trail with an explicit
pathspec. The staged `git diff --cached --check` now passes, so no bypass is
needed. Root then runs `bash scripts/ci.sh` with required Redis on that commit
and the operator live check. Any change to a bound file voids this verdict for
that file.

# Review A_0_6-merge-1 — OK

**Task:** plan/PROJECT_V6/A/0/06.md (release integration merge)
**Trial:** merge-1
**Branch:** release/1.1.0, merge staged and uncommitted in the root tree
**Commit:** none. The staged tree is `f37bc267e7a712bdfa84314ae7c955ad96a2a112`. The parents are
`5a6b26b0f824f6e332f7f62ef7a59fe931e867ad` (first) and
`97a16a2fd333c321ce2bc27d897478b697e99c1d` (second).
**Reviewer:** Claude reviewer agent (independent Opus 5.5 session; I did not code, resolve or stage this merge)
**Date:** 2026-10-09

## Summary
Staged tree `f37bc267` keeps both parents exactly. It takes every blob that
only the A/0/06 branch changed from the second parent, and every blob that
only the release branch changed from the first parent. The only path changed
on both sides is the conflicted `reviews/README.md`. Its resolution adds
exactly 8 A/0/06 rows over the first parent and exactly 2 A/0/05 rows over
the second parent, with no other edits. **OK** for the staged merge tree only.

## Checks
- [x] Merge state:
  - `HEAD` = `5a6b26b0f824…` and `.git/MERGE_HEAD` = `97a16a2fd333…`, both
    as required.
  - Merge base is `7982e422`.
  - `git ls-files -u` and `git diff --name-only --diff-filter=U` are both
    empty.
  - The working tree equals the index (`git diff --quiet`), and there are
    0 untracked files.
- [x] Path classification (base to each parent, `LC_ALL=C` sorted):
  - 65 paths changed only on the second parent.
  - 12 paths changed only on the first parent.
  - 1 path changed on both: `plan/PROJECT_V6/reviews/README.md`.
  - `git diff --name-only 5a6b26b f37bc267` is exactly the 65 source-only
    paths plus the 1 both-side path.
- [x] Source-only blobs: all 65 staged blob ids equal the blobs at `97a16a2`
  (0 mismatches). This covers all 51 added and 14 of the 15 modified paths,
  including `ci/suites.json`, `gateway/src/**`, `.gitattributes`, the tests
  and the A/0/06 review trail.
- [x] Target-only blobs: all 12 staged blob ids equal the blobs at `5a6b26b`
  (0 mismatches). These are the A/0/05 status docs, `docs/project-status.md`,
  `README.md`, `plan/README.md`, `plan/PROJECT_V6/{README,SHEETS}.md`,
  `A/README.md` and `A/0/05.md`.
- [x] Conflict resolution, `plan/PROJECT_V6/reviews/README.md` (staged blob
  `a882a9c3`):
  - `git diff --numstat 5a6b26b f37bc267` gives `8 0`. The 8 added lines are
    byte-identical to the A/0/06 Trial 1–8 rows that `7982e42..97a16a2` adds.
  - `git diff --numstat 97a16a2 f37bc267` gives `2 0`. The 2 added lines are
    byte-identical to the A/0/05 status-2 and status-1 rows that
    `7982e42..5a6b26b` adds.
  - There are no deletions on either side, so all shared rows, including the
    A/0/04 merge row and everything below it, are unchanged.
  - Row order: the A/0/06 block sits above the A/0/05 status rows. The table
    is not strictly chronological, but nothing requires that order.
- [x] Both-side auto-merges: none. The only path touched by both parents is
  the conflict file above.
- [x] `ci/suites.json` inventory:
  - The file is source-only, so its blob equals `97a16a2`.
  - It changes only the two `inventorySha256` values (the `gateway/tests/**`
    suite and the `tests/` suite that excludes `*_live.test.js`).
  - The 12 target-only paths are all docs/plan Markdown, outside every suite
    include glob.
  - `.venv/bin/python -I scripts/ci_gate.py --validate-only` on the merged
    working tree (equal to the index) exits 0 with `errors: []`, so the
    digests match the merged inventory.
- [x] Gated candidate identity:
  - `97a16a2` differs from `eee883e` only by adding
    `reviews/A_0_6-8-full-gate.md`.
  - `eee883e^{tree}` = `9387d24a…`, which matches the gate record.
  - All 29/29 `candidateFiles` SHA-256s in
    `A_0_6-8-candidate-and-evidence-sha256.json` match at `eee883e` and in
    staged tree `f37bc267`.
- [x] `policies/`: `git diff 7982e42 97a16a2 -- policies` and
  `git diff 5a6b26b f37bc267 -- policies` are both empty.
- [x] Hygiene:
  - `git diff --cached --check` exits 0.
  - `scripts/check_public_hygiene.py --repo-root .` reports
    `0 finding(s)` and exits 0.
- [x] Global invariants on the merged delta:
  - There is no `orchestrator/` tree.
  - No added `console.log` or `process.stdout.write` under `gateway/`.
  - No `agents-orchestrator` server renaming.

## Findings
All green for the merge. Two non-blocking observations:

1. Five `A_0_6-8-*.log` evidence files listed in the Trial 8 manifest's
   `evidenceFiles` are absent from both `eee883e` and the staged tree because
   of `.gitignore:59` (`*.log`). The Trial 8 verdict (Finding 4) already
   disclosed this, and the merge neither causes nor changes it. The operator
   decision it asked for (force-add the logs, or keep only the JSON manifest
   and command results) is still open.
2. `plan/PROJECT_V6/A/0/06.md` still reads `Status: planned`, with the live
   check and full-gate boxes unticked. This is correct for an uncommitted
   merge. Any status change belongs to a later root-owned, reviewed status
   update.

## Not verified by this review (root/operator-owned)
- **Full merged gate:** I did not run `bash scripts/ci.sh` on the merged tree
  `f37bc267`. The gate record `A_0_6-8-full-gate.md` (3,312 passed, 0 failed,
  12 declared skips, Redis 22/22) covers tree `9387d24a` (`eee883e`) only. It
  is not a merged-tree result.
- **Sheet live check:** the A/0/06 operator live check was **not run**.
- **Gate log:** the raw gate log `/tmp/ao-v6-a06-gate-eee883e.log` was not
  inspected.
- **Commit and indexing:**
  - I did not create the merge commit.
  - I did not add the README index row for this verdict, because editing
    `reviews/README.md` would change the staged conflict file.
  - I did not stage these two review files.
- **Status claims:** integration, promotion and release are not claimed. An
  OK on a staged tree is not integration.

## Next step
The root orchestrator then does the following:
1. Commit the staged merge, and confirm that the commit's tree is still
   `f37bc267e7a712bdfa84314ae7c955ad96a2a112`.
2. Commit this request/verdict pair and its README index row with an explicit
   pathspec.
3. Run the full merged gate.
4. Run the A/0/06 live check.
5. Only after that, record any status change.

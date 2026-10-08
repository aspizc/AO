# A/0/00 integration merge candidate — review request 1

Date: 2026-10-08. This is an integration-only review, not a replacement for
the independent implementation verdicts `A_0_0-1` through `A_0_0-3`.

- Target first parent: `6fe7f11e29b09907b5fa9406e2acc4966532de8a`
  (`release/1.1.0`).
- Source second parent: `f56ed568621a5a1971b4aa4cfbd8efb9186a94e9`
  (`feat/V6-A-0-00-cli-write-access`).
- Staged candidate tree before this request file: 
  `21938e204160deb8c89a084926e89ae1bd74b3ca`.
- The sole content conflict was `plan/PROJECT_V6/reviews/README.md`; the
  resolution retains the target's A/0/03 verifier row and adds the source's
  A/0/00 trial 1–3 rows in descending order.
- Source feature gate on `3dee8b8` exited 0: 3,000 pass, 0 fail, 12 declared
  infrastructure skips; owned Redis 22/22. See
  `A_0_0-trial3-feature-gate.md` and its hash-bound raw archive.
- `python3 scripts/ci_gate.py --validate-only` passed on the staged merge;
  staged non-evidence `git diff --check` passed.

Reviewer: independently verify parents and candidate tree, one-sided path
blobs, the sole conflict resolution, review trail preservation, no `policies/`
edits, inventory and public hygiene. Write `A_0_0-integration-1_reviewed_OK.md`
or `_KO.md`; index the verdict. Do not commit, push, tag, or claim the merged
tree gate. Root owns merge commit and integrated gate after verdict.

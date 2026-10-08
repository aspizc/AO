# A/0/01 integration merge candidate — review request 1

Date: 2026-10-08. Integration-only review for the worker marker, separate
from independent implementation verdict `A_0_1-1_reviewed_OK.md`.

- Target first parent: `3a154f5f89b8fb06d6f80b1e09f9763ba4244c1b`
  (`release/1.1.0`, A/0/00 integrated status).
- Source second parent: `d45584ddfc34a5a7ce152e634f0f0f2377d823b6`
  (`feat/V6-A-0-01-worker-marker`).
- Staged candidate tree before this request file:
  `6cb85854df5e9fa88e996c254686ba2398e9d67c`.
- The sole content conflict was `plan/PROJECT_V6/reviews/README.md`.
  The resolution preserves the target's A/0/00 trial/status rows and adds
  the source's A/0/01 trial-1 row verbatim above them.
- Source feature gate exited 0: 3,067 pass, 0 fail, 12 declared
  infrastructure skips; owned Redis 22/22. See `A_0_1-feature-gate.md`
  and its hash-bound raw archive.
- Staged `python3 scripts/ci_gate.py --validate-only` and non-evidence
  `git diff --cached --check` passed.

Reviewer: independently verify parents, staged candidate tree, one-sided
path blobs, sole conflict resolution, review trail and policy preservation,
inventory and public hygiene. Write indexed immutable
`A_0_1-integration-1_reviewed_OK.md` or `_KO.md`; no commit, push, tag or
merged-tree gate claim. Root owns the merge commit and integrated gate.

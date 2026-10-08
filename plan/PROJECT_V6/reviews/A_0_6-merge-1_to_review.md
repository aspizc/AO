# Review request A_0_6-merge-1 — staged A/0/06 merge into release/1.1.0

**Task:** plan/PROJECT_V6/A/0/06.md (integration merge, not a new trial of the sheet)
**Trial:** merge-1
**Branch:** release/1.1.0 (root tree, merge staged, uncommitted)
**Requested by:** root orchestrator (brief transcribed by the reviewer session)
**Date:** 2026-10-09

## Candidate
- First parent (`HEAD`): `5a6b26b0f824f6e332f7f62ef7a59fe931e867ad`
  docs(status): record A/0/05 integrated acceptance (V6 A/0/05 Trial status-2)
- Second parent (`MERGE_HEAD`): `97a16a2fd333c321ce2bc27d897478b697e99c1d`
  test(gate): record A06 complete suite (PROJECT_V6 A/0/06), on
  `feat/V6-A-0-06-permission-prompts`
- Merge base: `7982e422577ad6dfb37ef0c7b1e3c8433735430a`
- Staged tree (`git write-tree`): `f37bc267e7a712bdfa84314ae7c955ad96a2a112`
- Prepared message: `Merge branch 'feat/V6-A-0-06-permission-prompts' into release/1.1.0`

## Declared resolution
The only conflict is `plan/PROJECT_V6/reviews/README.md`. It is resolved as
the eight A/0/06 rows from the second parent (Trials 1–8) plus the two A/0/05
status rows from the first parent, with all shared rows unchanged.

## Requested checks
The reviewer must check:
- the parents are correct and there are no unmerged paths;
- every source-only staged blob equals the second parent's blob;
- every target-only blob equals the first parent's blob;
- the both-side paths and the `ci/suites.json` inventory are correct;
- `policies/` has no changes;
- `git diff --cached --check`, suite `--validate-only` and public hygiene pass.

## Root-owned, outside this review
These steps stay with the root orchestrator:
- the full merged gate (`bash scripts/ci.sh`);
- the live operator check of sheet A/0/06;
- committing the merge;
- the README index row for this verdict;
- any status, promotion or release claim.

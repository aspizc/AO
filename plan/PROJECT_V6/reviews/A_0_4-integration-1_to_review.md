# A/0/04 integration trial 1 — review request

Date: 2026-10-08.

- Target branch: `release/1.1.0`, parent `c4bc008b1acf06b7f9a6f9e0d0d6af6bcd5ea7e8`.
- Reviewed feature tip: `7195cf1` on `feat/V6-A-0-04-safe-submit`.
- Candidate is an uncommitted `git merge --no-commit --no-ff` with index tree `ba589f76a1c4ffb327cd1c225b1819ea630cbeb3`; no merge commit exists yet.
- Feature code's latest independent verdict: `A_0_4-live-profile-18_reviewed_OK.md`.
- Feature full gate: `A_0_4-live-profile-18-root-gate.md`, exit 0, 2,822 passed, 0 failed, 12 allowed skips. This does not cover the merged candidate.
- Conflict resolution: `ci/suites.json` inventory SHA refreshed by `python3 scripts/ci_gate.py --refresh-inventory` for the merged tree; `--validate-only` passed. `plan/PROJECT_V6/reviews/README.md` retains both parents' review rows and both checkpoint sections, and updates trial 18 with the root gate evidence. These were the only two textual conflicts.
- `git write-tree` and `git diff --cached --check` restricted to `ci/suites.json`, the reviews index, `gateway/src`, and `tests/gateway` passed. The unrestricted check flags trailing spaces in immutable historical pane captures and diff evidence brought by the feature branch; do not rewrite those artifacts or count the unrestricted check as passed.
- No `policies/` path is staged.

Reviewer: inspect both parent diffs and exact conflict resolution, ensure the merged production code and CI inventory preserve V7 generic-profile changes as well as A/0/04. Issue an immutable OK or KO verdict and index it. Root will commit only after OK, rerun the full gate on the merged commit, and keep release status separate.

# A/0/06 integrated status: trial 1 review request

Base: `4caec2c60697a5d29bea66c50f472d72a8e7466a` on `release/1.1.0`.
The candidate changes only these seven status documents: `README.md`,
`docs/project-status.md`, `plan/README.md`, `plan/PROJECT_V6/README.md`,
`plan/PROJECT_V6/SHEETS.md`, `plan/PROJECT_V6/A/README.md`, and
`plan/PROJECT_V6/A/0/06.md`. No code or policy file changes.

Review the uncommitted diff against the A/0/06 sheet, its Trial 8 OK verdict,
the release merge verdict, and `A_0_6-merged-gate.md`. Verify that every
integration, gate and live-provider statement is supported, all V6 counts and
links agree, and no text claims promotion or release. The live Codex provider
acceptance is still open; the optional provider lane ran zero tests. The
merged-tree gate on `6187aca` exited 0 with 3,312 passed, 0 failed, 12 declared
infrastructure skips, Redis 22/22 and public hygiene 0.

Local checks before review: `git diff --check` clean;
`python3 scripts/check_public_hygiene.py --repo-root .` exits 0;
`python3 scripts/ci_gate.py --validate-only` passes. Docs-only scope does not
require rerunning the full gate. Check the file list, English, canonical status
rule and absence of `policies/` edits independently.

Write an independent `A_0_6-status-1_reviewed_OK.md` or `_reviewed_KO.md` with
concrete evidence and any limitations. Do not edit candidate documents, prior
trail, index, code or policies; do not commit or push.

# A/0/03 release candidate: trial 1 review request

Candidate: `release/1.1.0` at `2d9d7ca2da095edaa8b36a9d9dde542c657db06a` (tree `f073d1037f1deacc3b0443974236c0e9305b078b`). It descends from `1.0.0`
(`41f9ce28aa59673283a7c5494200e0ec7b56e2f6`, operator lineage option a).

Review this exact commit against `plan/PROJECT_V6/A/0/03.md` (scope items 0–4 and acceptance criteria):

- **Contents.** The six V6 leaves A/0/00–02 and A/0/04–06 must be present. Each is reviewed OK and
  integrated; see `plan/PROJECT_V6/SHEETS.md` and `reviews/README.md`. A/0/06 includes the
  operator-response path, the `3.6a-agents.4` live-fix and the hygiene fix, and its live acceptance
  passed (`A_0_6-operator-live-3.md`). The two named V7 foundations, A/0/00 and A/0/01, are also
  included.
- **CHANGELOG.** `CHANGELOG.md` `## [1.1.0]` is as approved in `A_0_3-changelog-3_reviewed_OK.md`.
- **Verifier.** The release verifier prerequisite is integrated (`A_0_3-verifier-1_reviewed_OK.md`).
- **New since the last reviews: the trust-store entry.** `ci/reviewer-trust-roots.json` now registers
  one public Ed25519 key, added by commits `a2fc098` and `2d9d7ca`. Its fields are:
  - keyId `ao-release-reviewer-2026`;
  - subject `mailto:release-reviewer@ao.invalid`;
  - role `independent-reviewer`;
  - validity `2026-10-09T21:09:14Z`–`2027-10-09T00:00:00Z`.

  The private key is held by the operator outside the repository. Check that the file is canonical,
  that `python3 scripts/release_candidate.py verify-repository --repo-root .` passes, and that no
  private material is present.
- **Gate.** The full host gate on this candidate is running. Its totals are recorded separately in
  `A_0_3-candidate-gate.md` once it finishes, and are not part of this request.

Verify the claims yourself: git ancestry and contents, `git diff 1.0.0..2d9d7ca2da095edaa8b36a9d9dde542c657db06a --stat`, the CHANGELOG
against the code, the verifier, and public hygiene. Write `A_0_3-candidate-1_reviewed_OK.md` or
`_reviewed_KO.md` bound to the full commit and tree above. Do not decide promotion, tag or publication.

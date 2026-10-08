# Review A_0_3-verifier-1 — OK

**Task:** plan/PROJECT_V6/A/0/03.md — Scope 0 only (release-verifier prerequisite)
**Trial:** verifier-1
**Branch:** feat/V6-A-0-03-release-verifier
**Commit:** none — uncommitted working-tree candidate on HEAD
`e42818c2b9d72eebc88d858965fafa45c0fa1417` (tree `14ac3b9ff7288518f152961ac241d3f0522315d6`)
**Reviewer:** Claude reviewer session (Opus 5.5), independent of the coder
**Date:** 2026-10-08

## Summary

The one-character production change (`v` → `v?` in `SEMVER_TAG`) and the
parametrized real-Git ledger test satisfy Scope 0 of A/0/03. RED on the base
production, GREEN 73/73, legacy `v` acceptance, malformed-ref refusal and the
unchanged identity/ancestry/checklist checks were all reproduced
independently. This verdict covers **Scope 0 only**: it is `reviewed`, not
`integrated`, and it is **not** completion of A/0/03. Scopes 1–5 and every
other acceptance criterion of the sheet remain open.

## Bound candidate (verified by this reviewer)

| Item | SHA-256 |
|---|---|
| `scripts/release_candidate.py` (base, `git show HEAD:`) | `2918c7c4474946ac403f4f3f097406c963d5de0b27f28d9f95ee4b0c99676720` |
| `scripts/release_candidate.py` (submitted) | `1552f09686643c022d67242c0c8ae747e831fee7b2ce0ae1173de6b57e83e664` |
| `tests/structure/test_release_candidate_contract.py` (base) | `838cf6251bd800a4dbf2c2533af10f674631657116ce8295fbe131c82ef15243` |
| `tests/structure/test_release_candidate_contract.py` (submitted) | `87c18f1957bf50f8abaae5558cd5162e0953f1b9e4389c7561d4e03c92bc3cb7` |
| `git diff -- <both files>` | `8c01f854a7cebedb982486156a3bf5324163f177f8198f5d1adbbb81deac42e0` |
| `A_0_3-verifier-1_to_review.md` | `519ead38f102a671ca8fbabdb3599fc38c4b9c136eb7c61d45a9785c65e37e77` |

All match the request. Hashes were re-checked after the test runs; HEAD
unchanged, no tag at HEAD, no `policies/` diff, `git status` shows only the
two modified files and the untracked request. Any later byte change to either
file voids this verdict for the changed bytes.

## Checks

- [x] Files: only `scripts/release_candidate.py:68` (production) and the
      existing ledger test (`tests/structure/test_release_candidate_contract.py:1224-1377`) changed; `git diff --stat` 2 files, +56/−8.
- [x] TDD RED reproduced: `git archive` of `e42818c` into the reviewer
      scratchpad (production hash `2918c7c4…` confirmed) plus the submitted
      test bytes (`87c18f19…`); `-k test_real_state_ledger_verifies_each_ref_review_tag_and_release_provenance`
      → exit 1, **1 failed, 6 passed, 66 deselected**; the single failure is
      `[refs/tags/1.1.0-True]` with `stateLedger.transitions[5]: release must bind one canonical SemVer tag`.
      The other six cases (legacy `v1.0.0` accepted, five malformed refused)
      pass on base, as expected for an unchanged-behavior guard.
- [x] TDD GREEN reproduced in the worktree with
      `/home/carase/git/personal/AO/.venv/bin/python -m pytest tests/structure/test_release_candidate_contract.py -q -rs`
      → exit 0, **73 passed, 0 failed, 0 skipped**.
- [x] Legacy acceptance: `refs/tags/v1.0.0` case passes all its assertions.
- [x] Malformed refusal: `refs/tags/1.1`, `01.1.0`, `1.1.0.0`, `vv1.1.0`,
      `refs/heads/1.1.0` each exist at the promoted commit with
      digest-valid evidence and are rejected with the emitted
      "canonical SemVer tag" error, not an absent-ref error.
- [x] Identity/ancestry unchanged: for both accepted forms the test asserts
      (a) tag at the candidate commit with matching recorded identity →
      "release tag does not identify the promoted commit" (`:3785`);
      (b) original ledger after the move → "ref moved or differs from its
      evidence identity" (`:3729`); (c) outside-ancestry tag →
      "ref resolves outside the candidate ancestry" (`:3738`);
      (d) incomplete checklist → "canonical checklist". None of these code
      paths was modified.
- [x] Mutation probes (scratch copy only, discarded): `refs/tags/v*`,
      `refs/tags/[v]?v?` and `refs/(?:tags|heads)/v?` each make the focused
      test fail (1 failed, 6 passed), so the malformed cases kill over-broad
      widenings; the base `v` regex is killed by the unprefixed case.
- [x] Focused verifier: `release_candidate.py verify-repository --repo-root .`
      → exit 0, `{"errors": [], "productionAdvisories": 0, "registeredWaivers": 0, "status": "passed"}`.
- [x] Hygiene: `check_public_hygiene.py --repo-root .` → exit 0,
      `0 finding(s)`; `git diff --check` → exit 0.
- [x] Global invariants: English; no push, tag, commit, release assembly,
      CHANGELOG or `policies/` edit; test Git writes confined to pytest temp
      repositories.

## Regex scope audit

`SEMVER_TAG` is used once (`scripts/release_candidate.py:3797`, release-tag
evidence). The change adds only an optional single `v`; anchors, full match,
`refs/tags/` namespace, no-leading-zero numeric components and the
prerelease suffix are unchanged. Exact-ref, identity, ancestry, review,
checklist and provenance validation are untouched, matching the sheet's
"no other identity, ancestry, or provenance check changes".

## Findings (non-blocking)

1. Pre-existing, unchanged grammar looseness: the prerelease suffix
   `-[0-9A-Za-z.-]+` accepts non-SemVer forms such as `1.1.0-01` or
   `1.1.0-..`, and build metadata (`+…`) is not accepted. Out of Scope 0
   (the sheet forbids other changes); flag for a later sheet if wanted.
2. Both `refs/tags/1.1.0` and `refs/tags/v1.1.0` now verify. That is what
   Scope 0 specifies; the "no `v` prefix" choice for 1.1.0 is enforced by
   Scope 4's procedure, not by the verifier.
3. Trial id: the sheet text says "trial `A_0_3-1` covers it"; this trail
   uses `A_0_3-verifier-1` as assigned by the operator. The release
   candidate review should use its own id so the two are not conflated.
4. The coder's raw logs under `/tmp/` are not durable evidence; this
   verdict's reproduced results above stand on their own.
5. Not verified by this review (outside Scope 0, not claimed by the
   request): `bash scripts/ci.sh` full gate and skip budget, the
   release-evidence RED checks (hygiene on a 1.0.0 checkout,
   released-without-promoted ledger), collect/verify against a real
   candidate, CHANGELOG, tag and publication.

## Status

Scope 0: `implemented` and independently `reviewed` OK for the bound hashes
above. Not committed, not integrated, not promoted, not released. Per the
sheet, this change must be committed, integrated, and re-gated before the
1.1.0 candidate is frozen. A/0/03 as a whole remains `planned`.

## Next step

Operator/root commits the two bound files with an explicit pathspec, runs the
full gate on the integrating commit, and integrates before Scope 2's candidate
freezes. No reviewer commit was made.

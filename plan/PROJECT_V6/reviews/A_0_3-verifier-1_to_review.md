# A/0/03 scope 0 — release verifier prerequisite, trial 1

Status: implemented, uncommitted; independent review pending. This is a coder
handoff, not a verdict. Only scope 0 is submitted. The operator will arrange
independent Claude Opus 5.5 medium review; no reviewer session was spawned.
This request is immutable; corrections belong in a subsequent trial.

## Identity and bounds

- Assigned Gateway task: `ts-ed782db2-e0c9-42fe-8b9d-244752254c49`, repo ID `AO`
  (the explicit task instruction overrides the profile's historical repo ID).
- Worktree: `/home/carase/git/personal/AO/workspace/clones/wt-v6-a03-verifier`.
- Base and unchanged HEAD: `e42818c2b9d72eebc88d858965fafa45c0fa1417`.
- Base Git tree: `14ac3b9ff7288518f152961ac241d3f0522315d6`.
- Initial working tree was clean. No index changes or commits were made.
- This submission is identified by working-file SHA-256 hashes below; there
  is no assembled release candidate commit/tree or release ledger.

Read before editing: `AGENTS.md`, `.claude/orchestration-profile.md`,
`plan/README.md`, `plan/PROJECT_V6/A/README.md`, `A/0/03.md`, the review index,
`A_0_3_human_decision.md`, and the preparation trial 2 request/verdict.
The A/0/03-specific trail contains the operator lineage decision and no prior
implementation verdict at this base. The operator's scope overrides the
profile's broader build lifecycle: no nested spawn, commit, release assembly,
CHANGELOG, checkout tag, push, policy edit or self-review.

## Verified anchors at the base

Every path:line anchor in A/0/03 was inspected against this checkout before
editing; none was stale.

| Path | Lines | Verified content |
|---|---|---|
| `scripts/release_candidate.py` | 67–71 | Mandatory `v` prefix in `SEMVER_TAG` |
| `scripts/release_candidate.py` | 3795–3801 | Release evidence uses `SEMVER_TAG.fullmatch` |
| `scripts/release_candidate.py` | 1394–1409 | Exact, existing Git ref validation |
| `scripts/release_candidate.py` | 3919–3925 | `_git_identity` restricts refs to `refs/heads/` |
| `scripts/release_candidate.py` | 3940–3941 | Collector resolves base and branch through `_git_identity` |
| `tests/structure/test_release_candidate_contract.py` | 1312, 2795 | Existing `refs/tags/v1.0.0` ledger evidence |
| `docs/release-candidate.md` | 36–41 | Repository verifier command |
| `docs/release-candidate.md` | 114–131 | External collection, full refs and technical subject |
| `docs/release-candidate.md` | 162–170 | Verify command and success/failure exit semantics |
| `docs/release-candidate.md` | 175–198 | Ordered ledger, release identity and provenance contract |

Also read the validator imports/constants, existing fixture and Git helpers,
`transition_evidence`, repository-ledger validator, and its `_cmd_verify`
caller. No shared helper or caller change is required.

## Implementation and intent

The only production change is `v` to `v?` at
`scripts/release_candidate.py:68`. Existing numeric component rules,
prerelease grammar, full matching, exact refs, identity, ancestry, review,
checklist and provenance checks remain unchanged. This does not attempt to
expand or repair the existing SemVer grammar beyond optional `v`.

The existing real-Git test
`test_real_state_ledger_verifies_each_ref_review_tag_and_release_provenance`
is parametrized with seven cases: canonical `refs/tags/1.1.0`, legacy
`refs/tags/v1.0.0`, and rejected `refs/tags/1.1`, `refs/tags/01.1.0`,
`refs/tags/1.1.0.0`, `refs/tags/vv1.1.0`, `refs/heads/1.1.0`.
Each malformed ref exists at the correct commit with digest-valid evidence,
so the assertion exercises the emitted canonical-tag rejection rather than
an absent-ref error or a direct regex assertion.

For both accepted forms, the test also verifies:

- A tag at the candidate commit with matching recorded identity still fails
  because it is not the promoted merge commit. This isolates promotion
  equality from ancestry: the candidate is an ancestor of itself.
- The original ledger rejects the moved tag as an identity mismatch.
- A tag outside candidate ancestry still fails (retained negative case).
- An incomplete canonical checklist still fails (retained negative case).

All Git writes, synthetic signatures and ledger construction are confined to
pytest's temporary fixture repositories. They are test data, not an actual
release, independent review evidence or modifications to this worktree's refs.

## TDD RED — actual unchanged-production failure

The shell's default `python3` is `/home/carase/miniconda3/bin/python3` and
cannot import pytest. The initial attempt exited 1 with
`No module named pytest`; this is an environment failure, not TDD RED.
The existing AO virtualenv was used without installing or changing dependencies.

Final RED command, before modifying production code:

```bash
/home/carase/git/personal/AO/.venv/bin/python -m pytest \
  tests/structure/test_release_candidate_contract.py \
  -k test_real_state_ledger_verifies_each_ref_review_tag_and_release_provenance -q
```

Exit **1**; **1 failed, 6 passed, 66 deselected**, no skips, in 2.37s.
Actual output excerpt:

```text
>       assert errors == []
E       AssertionError: assert ['stateLedger...l SemVer tag'] == []
E         Left contains one more item: 'stateLedger.transitions[5]: release must bind one canonical SemVer tag'
tests/structure/test_release_candidate_contract.py:1346: AssertionError
FAILED tests/structure/test_release_candidate_contract.py::test_real_state_ledger_verifies_each_ref_review_tag_and_release_provenance[refs/tags/1.1.0-True]
1 failed, 6 passed, 66 deselected in 2.37s
```

An earlier run with the same logic before assertion-format cleanup likewise
returned 1 failed, 6 passed, 66 deselected in 2.41s. The final RED above uses
the exact final test bytes, unchanged between RED and GREEN.

RED production SHA-256 (identical to HEAD):
`2918c7c4474946ac403f4f3f097406c963d5de0b27f28d9f95ee4b0c99676720`.
Final RED/GREEN test SHA-256:
`87c18f1957bf50f8abaae5558cd5162e0953f1b9e4389c7561d4e03c92bc3cb7`.
Raw final RED log: `/tmp/A_0_3-verifier-1-red-final.log`, SHA-256
`4ac472ed2e83350a14fc4d952f6a188ba482f2c8f453bd269f49fb77ab22425f`.
A pre-GREEN checkpoint was saved at
`/tmp/A_0_3-verifier-1-red-checkpoint.txt`.

## TDD GREEN and relevant verifier checks

```bash
/home/carase/git/personal/AO/.venv/bin/python -m pytest \
  tests/structure/test_release_candidate_contract.py -q
/home/carase/git/personal/AO/.venv/bin/python \
  scripts/release_candidate.py verify-repository --repo-root .
/home/carase/git/personal/AO/.venv/bin/python \
  scripts/check_public_hygiene.py --repo-root .
git diff --check
```

- Full focused contract file: exit **0**, **73 passed, 0 failed, 0 skipped**
  in 25.41s; all seven new parameter cases included, none deselected.
  Raw output: `/tmp/A_0_3-verifier-1-green.log`.
- Repository verifier: exit **0**, actual JSON:
  `{"errors": [], "productionAdvisories": 0, "registeredWaivers": 0, "status": "passed"}`.
  Raw log `/tmp/A_0_3-verifier-1-verify-repository.log`, SHA-256
  `46a634bcf2e3db582a078df94cc5c6c8606adcd7a50472cfb5070667dd042f07`.
- Public hygiene: exit **0**, `public hygiene: 0 finding(s)`.
- `git diff --check`: exit **0**.

## Submitted hashes and verification limits

| File | Base SHA-256 | Submitted SHA-256 |
|---|---|---|
| `scripts/release_candidate.py` | `2918c7c4474946ac403f4f3f097406c963d5de0b27f28d9f95ee4b0c99676720` | `1552f09686643c022d67242c0c8ae747e831fee7b2ce0ae1173de6b57e83e664` |
| `tests/structure/test_release_candidate_contract.py` | `838cf6251bd800a4dbf2c2533af10f674631657116ce8295fbe131c82ef15243` | `87c18f1957bf50f8abaae5558cd5162e0953f1b9e4389c7561d4e03c92bc3cb7` |

SHA-256 of `git diff -- scripts/release_candidate.py tests/structure/test_release_candidate_contract.py`:
`8c01f854a7cebedb982486156a3bf5324163f177f8198f5d1adbbb81deac42e0`.

The repository-wide `bash scripts/ci.sh` gate was not run in this narrowly
authorized prerequisite task; no full-gate totals or skip-budget acceptance
are claimed. No production candidate was collected or verified against an
external released ledger, and no release-state transition was performed.
The sheet's release-assembly RED checks and scopes 1–5 remain outside this
submission. Fixture validation uses the existing fixed test clock, not an
override of the CLI's trusted wall-clock check. Temporary raw logs are local
supporting evidence; the actual RED/GREEN results are preserved above.

Independent review and later integration remain required before a release
candidate freezes. The sheet remains planned overall; this prerequisite is
implemented only, not reviewed, integrated, promoted or released.

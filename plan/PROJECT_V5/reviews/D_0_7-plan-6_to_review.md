# Plan Review Submission — Project V5 D/0/07 integration-overlay status reconciliation (plan trial 6)

## Requested reviewer

- Review mode: independent plan review of one integration-overlay Status-cell correction.
- Claim boundary: plan status only. No implementation verdict, integration of the Plan Trial 5
  branch, D/0/07c review result, D/0/07c integration, D/0/07d advancement, promotion, or release
  is claimed.
- Historical Trials 1–5 requests and verdicts are immutable inputs. This request makes no
  self-verdict.

## Frozen candidate

- Candidate commit:
  `9b8842b1f3ca5152f22c1f05356422e70bdf3afc`
  (`docs(plan): reconcile D07 integration status (V5 D/0/07 Trial 6)`).
- Candidate tree:
  `8b16f47d518f5522ca6afe9b1ee4b3ae43d5169e`.
- Candidate parent:
  `f2a05baf2526a48bf781c530c6be552a2ac40f77`.
- Candidate branch:
  `plan/V5-D-0-07-trial6-integration-overlay`.
- Candidate blob:
  `plan/PROJECT_V5/D/0/07c.md` =
  `73031fda34f3187cfac60a4af352a0745598647e`.
- Stable patch-id:
  `d4eb46e245c8fa38fc92791f284bc666258b71af`.

Candidate path allowlist:

```text
plan/PROJECT_V5/D/0/07c.md
```

`git diff-tree --no-commit-id --name-status -r 9b8842b...` reports exactly that one modified
path. `git diff-tree --no-commit-id --numstat -r 9b8842b...` reports exactly `1  1` for that
path. The sole changed hunk replaces only the header table's `Status` value.

No parent/index contract, `07a`, `07b`, `07d`, product, test, fixture, design, human-decision,
policy, manifest, lockfile, schema, migration, ADR, runbook, workflow, or historical review
artifact is in the candidate.

## Authenticated integration baseline

The dedicated worktree started at the exact requested baseline:

```text
commit  f2a05baf2526a48bf781c530c6be552a2ac40f77
tree    8eb3db00c98a8e1cc71c9dab52c91c42c05999c9
parent  2f840e82b18c4b74515b3c528ff74ef3af2996db
subject docs(review): record D_0_7 plan trial 5 verdict OK (V5 D/0/07 Trial 5)
scope   A plan/PROJECT_V5/reviews/D_0_7-plan-5_reviewed_OK.md
        M plan/PROJECT_V5/reviews/README.md
```

The candidate parent is that exact commit and tree. The pre-candidate worktree was clean except
for the permitted untracked `gateway/node_modules`.

## Trial 5 patch and review authentication

The original Trial 5 plan candidate and the integration transplant are distinct commits on
different parents:

| Object | Commit | Tree | Parent | Authenticated scope |
|---|---|---|---|---|
| Original Trial 5 candidate | `794591dc38ed7151d75c3fe65b95e0ea9c0baefb` | `81ba5234361a5ff8abfff55ede9ee60e656ab702` | `c38762a379a3d060fcf5e6ed21a58b95ecec27a2` | exactly `D/0/07.md`, `D/0/07c.md`, and `D/0/07d.md` modified |
| Integration transplant | `714f6f498f5cf7a69bea2d5ae3fbda0f9416e6e4` | `bce0332d4f2e02ada127a39db9423b6540f836ab` | `4236b765fbf18fa519fb4692fea551f9485fe506` | exactly the same three plan paths modified |
| Original Trial 5 request | `c91262ea30835964573b1389a31789d4edf8304f` | `d0eea48bc09fd07ddc5bdaa32fb4a5d423261cff` | `794591dc38ed7151d75c3fe65b95e0ea9c0baefb` | request added and one pending index row appended |
| Independent Trial 5 OK | `03b2994d826d5418cbc7db51d7c554178a61293e` | `7e12a6a0ef84a901782e7ea13d6bb5d7464fd46a` | `c91262ea30835964573b1389a31789d4edf8304f` | verdict added and its index row changed from pending to OK |

Both candidate commits have the same stable patch-id:

```text
0377cad284e4e7ddbb42b5f50fab2abc5aebff73  794591dc...
0377cad284e4e7ddbb42b5f50fab2abc5aebff73  714f6f4...
```

The Trial 5 request blob at `c91262e` and integration request commit `2f840e8` is byte-identical:
`1bf28752df0ae9e2faa6a598d5050ff4b1df292f`. The independent verdict blob at `03b2994` and
integration baseline `f2a05ba` is byte-identical:
`9d3778962add4bc7fe3d815c713d943d6ee3d635`.

The integration line contains transplant `714f6f4`, request commit `2f840e8`, and verdict-record
commit `f2a05ba`. The original `794591dc` Plan Trial 5 branch commit is not an ancestor of
`f2a05ba`; this request therefore does **not** claim that the Plan Trial 5 branch itself was
integrated.

## Why the contradiction appears only after the integration overlay

Trial 5 corrected Decision 4C cleanup ownership, not status. Its `D/0/07c.md` patch begins below
the header and does not modify the `Status` row.

The two parents supplied different inherited values:

- original parent `c38762a` and original candidate `794591dc` contain the short value
  ``| Status | `planned` |``; they do not assert that operator ratification is outstanding;
- integration parent `4236b76` inherits the longer value introduced at `03c873c`, which says
  the operator still must ratify five amendments and implementation remains blocked until a
  response.

Applying the byte-equivalent Trial 5 patch to `4236b76` correctly transplanted the reviewed
Decision 4C plan changes while leaving that unrelated inherited cell byte-untouched. The
integration-only result at `714f6f4..f2a05ba` therefore retained a claim that had become false:
all five amendments had already been ratified, and a new D/0/07c implementation trial had
already been submitted for review.

Trial 6 changes only that inherited integration-overlay value. It does not alter or re-review
the stable Trial 5 patch and imports none of the off-branch design, decision, implementation,
test, or request artifacts.

## Canonical state authenticated by the replacement value

| State | Binding evidence | Exact claim boundary |
|---|---|---|
| D/0/07a | Trial 3 independent OK `f100ceb`; integration merge `aaf4817`, which is an ancestor of the baseline | reviewed OK and integrated; not promoted or released |
| D/0/07b | Trial 2 independent OK `e6c832b`; integration merge `d65e9f4`, which is an ancestor of the baseline | reviewed OK and integrated; not promoted or released |
| D/0/07c design | design `95185e0`; independent Trial 9 approvals `e230faf` and `83252f6` | dual-reviewed OK design only |
| Human amendments | `ac92d51afc329449e31be7bfa91b77b255ae8fa4`, tree `974963e12fb39b74826fc55449584fb3b3d81ba5`, parent `0db688bda8b5a85599ef61c94cb54dd0302d205d`; sole scope `A plan/reviews/PROJECT_V5/D_0_7C_DESIGN_human_decision.md` | all five amendments ratified; implementation authorized, nothing later |
| D/0/07c Trial 3 implementation | `d7873eba1a9405fec92875020854ed67f16a03b1`, tree `1db04ff47b71b1f6d04ecf453a53b96dc0e83dba`, parent `8f848b3f9ee8a72a6b4872f0fe64b445bd10ba98`; nine final-correction code/test/vendor paths | implemented candidate only |
| D/0/07c Trial 3 request | `c38762a379a3d060fcf5e6ed21a58b95ecec27a2`, tree `447fef5ad5b3981326b6f02ca52d907832986b70`, parent `d7873eba1a9405fec92875020854ed67f16a03b1`; sole scope `A plan/reviews/PROJECT_V5/D_0_7C-3_to_review.md` | requested and currently under independent review; explicitly unreviewed |
| D/0/07d | current sheet status remains `planned` | blocked until D/0/07c receives independent OK and is integrated |

The three current reviewer refs `review/V5-D-0-07c-3`,
`review/V5-D-0-07c-3b`, and `review/V5-D-0-07c-3c` all still resolve to request commit
`c38762a`. The request tree contains only `D_0_7C-3_to_review.md` for Trial 3, and no
`D_0_7C-3_result*.md` commit exists. Both `d7873eb` and `c38762a` are non-ancestors of the
integration baseline and candidate. They are therefore neither reviewed nor integrated by this
status correction.

The replacement Status value says exactly:

```text
in_progress
D/0/07a and D/0/07b: independently reviewed OK and integrated
D/0/07c design Trial 9: independently reviewed OK by both reviewers
all five amendments: ratified at ac92d51
D/0/07c Trial 3: implemented/requested and under independent review,
                  not yet independently reviewed OK or integrated
D/0/07d: planned and blocked until D/0/07c receives independent OK and is integrated
```

## Scope preservation

The candidate deliberately does not:

- claim the `plan/V5-D-0-07-trial5` branch itself was integrated;
- import the design, human-decision, D/0/07c code/test/vendor, or implementation-review request
  paths from the off-branch lineage;
- change the Trial 5 Decision 4C cleanup contract;
- touch the Trial 5 P2 concerning `D/0/07b`;
- change any product, test, fixture, policy, gate, manifest, dependency, public contract, or
  other plan semantic;
- mark D/0/07c reviewed or integrated;
- mark D/0/07d implemented, reviewed, or unblocked; or
- write an independent verdict.

## Exact validation evidence

The candidate was validated before its scoped commit:

1. Status search:

   ```text
   rg -n '^\| Status \|' \
     plan/PROJECT_V5/D/0/07.md \
     plan/PROJECT_V5/D/0/07a.md \
     plan/PROJECT_V5/D/0/07b.md \
     plan/PROJECT_V5/D/0/07c.md \
     plan/PROJECT_V5/D/0/07d.md
   ```

   It reports `07a` and `07b` complete/reviewed/integrated, `07c` in progress with the exact
   replacement value, the parent index with `07c` in progress, and `07d` planned.

2. One anchored regex requiring every requested clause in the `D/0/07c` Status row matched
   exactly line 5.

3. Stale-contradiction sweep over `D/0/07c.md` searched case-insensitively for
   `operator.*(ratif|respond)`, `blocked until.*operator`, `requires.*ratif`,
   `no integrated candidate`, and a planned Status cell. `rg` exited 1 with zero matches, the
   expected no-match result.

4. The local Markdown-link resolver across `D/0/07.md`, `D/0/07c.md`, and `D/0/07d.md`
   checked 13 local links: 13 resolved, 0 missing.

5. All zero-argument assertions loaded directly from
   `tests/structure/test_project_layout.py`,
   `tests/structure/test_v5_coordination_docs.py`, and
   `tests/structure/test_v5_coordination_integration_docs.py` passed:
   16 run, 16 passed.

6. `node --test tests/gateway/planner_review_contract.test.js` passed:
   5 tests, 5 passed, 0 failed, 0 cancelled, 0 skipped.

7. `git diff --check` before commit and
   `git diff --check f2a05ba..9b8842b` after commit both exited zero.

8. `git diff --quiet f2a05ba..9b8842b -- ci scripts tests gateway cli
   orchestrator-langgraph policies` exited zero. The candidate changes no source, test, gate,
   or policy input.

The repository-wide CI gate was not requested or run for this one-cell integration-overlay
correction and is not claimed as passed. The focused checks above are reported only for their
actual scopes.

## Orchestration disclosure

Gateway `agent_spawn` failed three times. The authoring path then used a direct supervised tmux
fallback. That is a process deviation from the resolved orchestration profile; this request
does **not** claim profile compliance. The fallback grants no review authority, and no
author-owned output is represented as an independent verdict.

## Review focus

1. Confirm the candidate commit/tree/parent/blob/path and one-line `1/1` delta match this
   submission.
2. Confirm the replacement value states each canonical state without upgrading review,
   integration, promotion, or release.
3. Confirm the original Trial 5 patch and transplant share stable patch-id `0377cad...`, the
   Trial 5 candidate received independent OK at `03b2994`, and the original Plan Trial 5 branch
   is not claimed as integrated.
4. Confirm the false operator-block claim comes from the integration parent and is absent from
   the original Trial 5 candidate's inherited Status value, so Trial 6 is an
   integration-overlay correction rather than a Trial 5 contract rewrite.
5. Confirm no design/code artifact, `07b` P2, product/test/policy path, or other plan semantic
   entered the candidate.
6. Confirm this append-only request and exactly one pending Trial 6 index row preserve all
   Trials 1–5 artifacts.

## Verdict contract

Write `plan/PROJECT_V5/reviews/D_0_7-plan-6_reviewed_OK.md` or
`plan/PROJECT_V5/reviews/D_0_7-plan-6_reviewed_KO.md`. Keep the result append-only and make
every KO finding actionable from the submitted files alone. Replace only the pending Trial 6
index verdict cell when recording the independent result. This request makes no self-verdict.

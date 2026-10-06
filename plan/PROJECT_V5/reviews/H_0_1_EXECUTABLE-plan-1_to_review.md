# Plan Review Submission — Project V5 H/0/01 EXECUTABLE (plan trial 1)

## Requested independent review

Review the frozen three-file plan candidate below once, independently, under
PRP-1 T2. This is the single substantive plan review round. It is not an
implementation review, and it does not consume any of the future
`H_0_1_EXECUTABLE` T1 allowance, which remains `0/3`.

The substantive review surface is only the candidate range and three paths
listed below. This request and its pending index row are T3 process evidence;
they are not additional review surfaces. The author of the candidate and this
request has no verdict authority and must not self-review.

## Frozen base and candidate

| Object | Commit | Tree | Relationship |
|---|---|---|---|
| Required current-main base | `f10d35c1c161280abd384ee7c8f3d35e074ba9fb` | `aa9ed5538a30343a46682d5d7d4d766cf7870d32` | exact candidate parent |
| Plan candidate | `9188b58a040a0345e205658f29f25cbe989db2ee` | `2cabd6fcddfeb3b29f9a61b827e43752121e64f3` | sole child of the required base |

Candidate branch:
`feat/V5-H-0-01-close-prp1-r1`.

Exact candidate pathset and blobs:

```text
M  plan/PROJECT_V5/H/0/01.md      68be374d30cd3ea2eaf9823a1a1f402137f6fd8d
M  plan/PROJECT_V5/H/README.md    342ebaaf2fa61fc3ed9356874cc9ef323d529f09
M  plan/PROJECT_V5/SHEETS.md      d3b8769e78b4cc5f7be0aca09e1eef91387d80be
```

`git diff --numstat f10d35c..9188b58` reports `127/4`, `10/4`, and
`1/1` respectively. No production source, test, policy, old review artifact,
shared CI surface, changelog, or final documentation is in the candidate.

## Plan claim boundary

The candidate materializes `H_0_1_EXECUTABLE` as a named PRP-1 subleaf inside
the existing H/0/01 sheet. It does not add an executable sheet, so the Project
V5 inventory remains exactly 82. It reconciles already accepted evidence and
freezes only the smallest behavior not present on the base:

- a production factory for the first six Doctor bindings;
- `agent-run doctor` composition and narrow CLI registration;
- an exact CLI-level TDD RED using injected clean first-six inputs and the
  reviewed final-six seams; and
- a disjoint five-file future task pathset with accepted and shared surfaces
  frozen.

The candidate does not reopen DOCTOR, PROBES, or PORTABILITY, claim that
D-owned authority is available, complete H/0/01, or claim integration,
promotion, native release evidence, a tag, or a push.

## Dependency authentication

All prerequisite verdict and integration commits below are ancestors of both
the required base and the candidate:

| Slice | Reviewed evidence | Integrated evidence |
|---|---|---|
| DOCTOR Trial 13 | `f967c4e95d513da2f159d3a3ea030fc76ec6966f` | `616a4de12d047d1cee4fbfb2f7be32921c627907` |
| PROBES Trial 4 | `3615aeb26bf0f83a417c13b189f12ec3025579e0` | `6fecc59ed9d18eed31b20c8185b5f250a37a777b` |
| PORTABILITY Trial 2 | `a5a405cf63a1b0a50897e2ceaf475481a2e9a34d` | `900007a12abbd598b193fba27e16a1edc0e27a53` |

PROBES Trials 1–3 remain its complete T1 implementation-review history;
Trial 4 is integration evidence, not a new implementation round. The new
EXECUTABLE leaf therefore starts at T1 `0/3` without resetting or repeating
PROBES. Full H/0/01 exit still depends on `D/0/02` and `D/0/03`, and the
candidate leaves native source-build/release evidence with `I/0/04`.

## Required substantive checks

### Buildability

Confirm that the candidate is sufficient for a coder to produce one causal
RED and minimum GREEN without choosing new product policy:

1. RED invokes the registered `agent-run doctor --json`, validates the exact
   twelve-check order and JSON schema, expects exit `1` with only
   `ISOLATION_UNAVAILABLE` and `STATE_OWNERSHIP_UNVERIFIABLE` failing in the
   clean case, rejects every named canary, and parameterizes semantic failures
   across the first six inputs so a constant result stub cannot pass.
2. GREEN is bounded to a production first-six binding factory, CLI
   composition, rendering/exit propagation, and narrow registration while
   reusing unchanged `doctor.py` and `doctor_probes.py`.
3. The exact new modules/tests and the narrow `main.py` registration are a
   sufficient, disjoint pathset; no hidden requirement forces a frozen,
   policy-owned, or integrator-owned edit.
4. The focused commands are exact and runnable, and aggregate CI occurs only
   after the integrator refreshes shared inventory on the combined tree.

### Contradictions and nonclaims

Confirm that the H/0/01 sheet, Stage H index, and Project V5 registry agree on
all of these points: accepted slice state, T1 `0/3`, non-counted subleaf
status, 82-sheet inventory, frozen paths, D/0/02–03 ownership, I/0/04 native
evidence, and the absence of any completion/promotion/release claim. Reject a
substantive contradiction; do not reopen accepted behavior merely to restyle
or re-review it.

### Anchors and links

Confirm that the new `H_0_1_EXECUTABLE build-ready contract` heading is unique
and navigable,
all local Markdown targets and fragments in the three candidate files resolve,
and the Stage H and SHEETS links still point to the existing H/0/01 sheet
rather than a fabricated 83rd sheet.

### Dependency and ancestry

Reproduce the exact base/candidate parentage and verify that all six accepted
review/integration commits above are ancestors. Confirm that D/0/02–03 and
I/0/04 remain future dependency-owned gates rather than behavior assigned to
this subleaf.

## Author validation retained for reproduction

The plan author recorded only plan-scope checks:

- exact candidate path allowlist: three modified plan files and no other
  path;
- local Markdown resolver: 73 links/anchors checked across the candidate
  files, zero missing; the new heading occurs once;
- accepted prerequisite ancestry: all six `merge-base --is-ancestor` checks
  exited zero;
- `git diff --check f10d35c..9188b58`: passed; and
- no new sheet file was created; the existing 82-sheet inventory expression
  and H/0/00–H/0/05 materialized range remain intact.

Repository-wide CI was not run for this plan-only candidate and is not claimed.
The future implementation verification commands in the sheet are obligations,
not evidence that executable behavior already exists.

## PRP-1 verdict contract

Publish exactly one independent substantive verdict:

```text
plan/PROJECT_V5/reviews/H_0_1_EXECUTABLE-plan-1_reviewed_OK.md
```

or:

```text
plan/PROJECT_V5/reviews/H_0_1_EXECUTABLE-plan-1_reviewed_KO.md
```

The verdict must identify the exact candidate commit/tree/base and record the
buildability, contradiction, anchor, and dependency checks actually performed.
A KO must name a substantive implementation-blocking defect in the submitted
plan; style, wording preference, or metadata-only observations do not consume
another round. PRP-1 permits no second T2 review round for this plan delta.
Preserve this request and all older review artifacts unchanged, and replace
only this trial's pending index cell when the independent verdict is recorded.

The reviewer must not edit the candidate, implement the subleaf, integrate,
promote, release, tag, push, or treat this request as its own verdict.

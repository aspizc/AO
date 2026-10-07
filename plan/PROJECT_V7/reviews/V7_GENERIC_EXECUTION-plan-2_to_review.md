# V7 generic execution — Plan Trial 2 review request

Status: **ready for candidate freeze and independent plan review**. Author
issues no verdict. Root records the settled tree/blob/trace before submission;
these blank bindings do not claim the candidate is already frozen or reviewed.

| Binding | Value |
|---|---|
| Correction base observed | `327043a50316f3918b06fe30e019ecdc5799b4d3` |
| Previous independently KO tree | `93dad2d0d900675d972a87039f75c1dfa16f3d2e` |
| Trial 2 candidate tree | Root binds the exact tree and request blob in the independent reviewer assignment and verdict (avoids a self-referential hash). |
| Review trace | `tr-r2-v7-plan-9085070c-1b3e-490c-ac25-7b13118bc419` |
| Author scope | V7 README status; sheets A/0/00, 02, 03, 04; reviews index; this new request |
| Runtime implementation / gate evidence | None; plan-only correction |

## Required corrections addressed for review

- **R1:** A/0/00 validates A/0/02's bounded explicit `wave-prior-facts/v1`
  input and project/profile/task/earlier-wave membership before startup. The
  selected wave uses controller-supplied historical local results; absent or
  contradictory facts cannot manufacture readiness, negative history blocks
  its dependent, and prior tasks never replay. A/0/03 freezes input/digest for
  resume; A/0/04 observes two ordered wave invocations and negative cases.
- **R2:** A/0/02 applies `maxConcurrentTasks` independently of shared capacity.
  One logical `admissionHeld` slot spans coding, awaiting control, checks,
  review, cleanup and possible-active recovery. Confirmed effect retirement
  and full release precede terminal advancement/slot release. A/0/03 persists
  and validates slots; focused/external tests isolate ceiling one with ample
  count/provider/memory budget and observe no second admission while waiting.
- **R3:** Accepted/blocked/changes-requested review inputs become pending
  dispositions, then exact owned reviewer close, confirmation and full vector
  release precede terminal task/dependent advancement. Normal wave success
  closes the owned SDK before Gateway release and success output; borrowed
  ownership stays external. Unknown close/release retains memory/logical holds
  and returns recovery required. A/0/03 records each boundary; A/0/04 completes
  two tasks at session/provider capacity one and injects retirement failures.

No sixth sheet, new authority surface, V5 gate closure, provider spend, automatic
prior replay, or V6 release dependency was added. Trial 1 request/verdict bytes
are preserved and KO is indexed. Root owns top-level registration files and
candidate freeze; this author did not edit them, implement, commit, invoke
Claude, run a full gate, or issue an independent verdict.

## Exact candidate path inventory

Review these 16 paths, with the two registration paths frozen by root. No other
candidate path is authorized by this request:

```text
plan/README.md
plan/PROJECT_V6/GENERIC_WORKFLOWS.md
plan/PROJECT_V7/README.md
plan/PROJECT_V7/EPICS.md
plan/PROJECT_V7/SHEETS.md
plan/PROJECT_V7/COVERAGE_MATRIX.md
plan/PROJECT_V7/A/README.md
plan/PROJECT_V7/A/0/00.md
plan/PROJECT_V7/A/0/01.md
plan/PROJECT_V7/A/0/02.md
plan/PROJECT_V7/A/0/03.md
plan/PROJECT_V7/A/0/04.md
plan/PROJECT_V7/reviews/README.md
plan/PROJECT_V7/reviews/V7_GENERIC_EXECUTION-plan-1_to_review.md
plan/PROJECT_V7/reviews/V7_GENERIC_EXECUTION-plan-1_reviewed_KO.md
plan/PROJECT_V7/reviews/V7_GENERIC_EXECUTION-plan-2_to_review.md
```

## Independent reviewer brief

Use a fresh separately assigned Codex session/trace under the no-Claude
exception. Read the immutable [Trial 1 KO](V7_GENERIC_EXECUTION-plan-1_reviewed_KO.md)
and try to break only these R1–R3 corrections while checking their consistency
with accepted five-sheet boundaries. Verify earlier-wave fact identity/negative
states/resume semantics, the logical ceiling independent of shared capacity,
and exact retirement ordering under close/release loss. Require distinguishing
emitted-effect tests and preserve historical-local-result versus authority and
memory-estimate versus OS-enforcement limits. Root supplies exact tree/blob
bindings before review. Do not treat this author summary as a verdict.

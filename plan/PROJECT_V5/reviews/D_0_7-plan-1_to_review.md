# Plan Review Submission — Project V5 D/0/07 session-control port (plan trial 1)

## Requested reviewer

- Model profile: GPT-5.6 Sol, reasoning `max`, service Priority/Fast
- Review mode: independent plan review of a NEW sheet and its registry wiring; no
  implementation exists and none is claimed

## What is submitted

Ratified Option 1 of the operator gate
(`plan/reviews/PROJECT_V5/D_0_1_SPLICE_to_check_by_human.md` on
`feat/V5-D-0-01-c100-splice`, ratified 2026-07-27) materialized as plan work on
`integration/V5-functional-wave-2`:

- new sheet `plan/PROJECT_V5/D/0/07.md` — authenticated persistent session-control port,
  the reviewed prerequisite for `D_0_1_SPLICE`;
- registry wiring: `plan/PROJECT_V5/D/README.md` (intro + table),
  `plan/PROJECT_V5/D/0/01.md` (status, depends-on, `D_0_1_SPLICE` prerequisites),
  `plan/PROJECT_V5/SHEETS.md` (D and C stage rows).

Source evidence the sheet must faithfully reflect:

- `D_0_1_SPLICE-1_to_review.md` (blocked submission, `b56da0b`, splice lane branch);
- `D_0_1_SPLICE-1_result.md` (`blocked_confirmed` + Option 1 recommendation §C, `f85c621`
  on `review/V5-D-0-01-splice-1`, cherry-picked to the lane branch as `8f3ce77`).

## Review focus

1. **Buildability**: is `D/0/07` executable as one S/M sheet — one branch, one review id,
   a TDD RED a coder can write without guessing? Flag anything under-specified.
2. **Fidelity to the ratified boundary**: the sheet must cover the reviewer's six port
   requirements completely and must NOT smuggle in Option 2 (public-contract change) or
   Option 3 (tmux exception), nor revive rejected C/1/00 Trial 1–15 process code.
3. **Dependency graph**: acyclic; `D/0/07` depends on integrated `D_0_1_CORE`; the splice
   depends on reviewed `D/0/07`; no other sheet silently gains or loses a dependency.
4. **Registry integrity**: every status cell touched follows the canonical status rule
   (`plan/README.md`) — nothing claims beyond its evidence; anchors and links resolve in
   this tree.
5. **Non-scope honesty**: the sheet's non-scope keeps the adapter/service splice in
   `D_0_1_SPLICE` and makes no live-execution claim.

## Verdict contract

Write `plan/PROJECT_V5/reviews/D_0_7-plan-1_reviewed_OK.md` or
`..._reviewed_KO.md` (append-only; numbered, actionable findings — each KO fixable from
the file alone). Stage only the verdict with an explicit pathspec and commit on your
current branch with message `review(v5): approve|reject D/0/07 plan trial 1`. Then print
exactly `REVIEW D007 PLAN DONE`.

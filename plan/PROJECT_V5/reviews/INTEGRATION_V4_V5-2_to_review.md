# Review Submission — V4/V5 Integration Candidate (Trial 2)

## Outcome

Trial 1 KO is preserved. The single blocker is corrected by reconciling the
root plan index with the active Project V5 registry and the materialized
Project V4 plan.

## Correction range

- Trial 1 candidate: `24992c22435ef0278a0f6f2095fbb8b1ee95ad11`.
- Review `24992c2..HEAD` and the resulting plan state.
- Production behavior, prior OK/KO artifacts, audit reports and service
  configuration are unchanged by this correction.

## Blocker disposition

- `plan/README.md` no longer claims all of Project V5 is complete or integrated.
- It distinguishes the delivered 25-sheet A foundation from the 50 active B–I
  sheets and limits the A final OK to A/0/00.
- It describes V4's 72-sheet plan as materialized/integrated but its behavior
  as still planned.
- It requires implementation, tests, independent review and integration
  evidence per B–I sheet and does not infer promotion/release from review.

## Verification

- Root index counts and statuses must match `PROJECT_V4/SHEETS.md`,
  `PROJECT_V5/SHEETS.md` and `PROJECT_V5/README.md`.
- Project V4/V5 local links and structure tests must pass.
- `git diff --check` and an added-line credential-signature scan must pass.
- No Redis, MCP, runtime code, policy, `message.*`, `agents:events`, credential
  or shared configuration may change.

## Review request

Independently reproduce the Trial 1 status contradiction and confirm it is
gone. Write exactly one of `INTEGRATION_V4_V5-2_reviewed_OK.md` or
`INTEGRATION_V4_V5-2_reviewed_KO.md`; preserve every prior artifact.

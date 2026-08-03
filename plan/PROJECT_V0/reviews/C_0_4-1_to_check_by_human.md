# C/0/4 Trial 1 - To Check By Human

## Decision to review

`evaluateSanitization` explicitly checks `ctx.role === "orchestrator"` to deny restricted raw artifacts to the orchestrator while still allowing reviewers to receive `allow_with_sanitization`.

## Why this was done

The current role registry does not distinguish these two cases with data:

- `reviewer` denies `artifact.get.raw_restricted` and allows `artifact.get.sanitized`.
- `orchestrator` also denies `artifact.get.raw_restricted` and allows `artifact.get.sanitized`.

C/0/4 acceptance criteria require:

- reviewer + restricted `raw_diff` -> `allow_with_sanitization`
- orchestrator + restricted `raw_diff` -> `deny`

The literal role check is the smallest implementation that satisfies the current spec and tests.

## Suggested future cleanup

Add an explicit role policy field, for example `canConsumeSanitizedRaw`, and make the sanitization layer data-driven instead of checking the role name directly.

This is non-blocking for C/0/4 because the reviewer accepted the implementation and marked the task OK.

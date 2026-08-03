# N/0/2 trial 1 human check

## Decision to validate

I introduced a narrower policy permission, `artifact.get.sanitized.raw_restricted`, to distinguish:

- reading an artifact that is already sanitized/internal, and
- receiving a sanitized replacement for an originally raw restricted artifact.

## Reason

The N/0/2 matrix requires Codex `tester` to be denied raw restricted artifacts while still allowing internal `test_report` artifacts. The previous `artifact.get.sanitized` permission was too broad for that distinction because `tester` has it.

## Current implementation

- `reviewer` has `artifact.get.sanitized.raw_restricted`.
- `tester` keeps `artifact.get.sanitized` but does not receive sanitized replacements for raw restricted artifacts.
- `orchestrator` remains explicitly denied raw restricted consumption.

## Human question

Please confirm whether `artifact.get.sanitized.raw_restricted` is the desired policy vocabulary, or whether this should be represented with a different registry field/action before later stages depend on it.

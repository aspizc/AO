# Project reviewer prompt template

The orchestrator assigns a distinct reviewer session; fill these inputs from
the same project profile and the prepared candidate.

Review `<task-id>` in `<absolute-project-path>` at `<candidate-sha-or-diff>`.
Repository id: `<repository-id>`; trace: `<review-trace>`; trial: `<trial>`.
Read `<task-sheet>`, `<parent-plan>`, AGENTS.md and
`<review-directory>/<task-id>-<trial>_to_review.md`. Check the actual diff and
acceptance criteria. Verify the RED test would fail if the business rule were
broken; run `<verification-commands>` and record exact outcomes and skipped
checks. Confirm write scope, conventions and dependency contracts.

Use the assigned review authority. Read-only review is the default; any
artifact write needs an explicitly assigned evidence location and permission.
A project example never grants production write or narrow-fix permission.
Report actionable defects without implementing changes. Never issue a verdict
for your own implementation or a coder-owned session's work.

Write an immutable `<task-id>-<trial>_reviewed_OK.md` or
`<task-id>-<trial>_reviewed_KO.md` at the assigned evidence location. State
coverage, commands and counts, residual risks, and exact KO corrections.
An OK verdict means reviewed, and grants no integration or release authority.
Do not commit, tag, push, reset, stash, rebase or alter policy files.
Human decisions go to `<task-id>_to_check_by_human.md`. Use English; report
unverified behavior explicitly.

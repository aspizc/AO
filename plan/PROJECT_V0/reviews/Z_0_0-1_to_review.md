# Review Submission - Task Z/0/0 (Trial 1)

## What was done
- Added `artifact.put.review_notes` to the `planner` role while preserving `code.write` and `agent.spawn` denies.
- Registered `agents-orchestrator` as an `internal` repository with `gemini-cli` and `claude-code` allowed.
- Bumped `policies/roles.json` and `policies/repositories.json` versions.
- Added `tests/gateway/planner_review_contract.test.js` covering planner review notes, planner write/spawn denies, Claude coder writes in this repo, planner write denial in this repo, and restricted repo invariants.
- Updated `CHANGELOG.md`.

## Why
- Z/0/0 establishes the policy contract for assisted planning: the planner can draft and review plan changes, while a coder applies plan file edits in this repository.

## Decisions Taken
- Kept `agents-orchestrator` classified as `internal`, matching the task spec and avoiding accidental broadening to `unrestricted`.
- Did not add Codex to `agents-orchestrator`; the planning loop uses `claude-code`.
- Verified restricted repos remain Gemini-only.

## Verification
- `node --test tests/gateway/planner_review_contract.test.js` - passed.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate` - passed.
- `npm --prefix gateway test` - passed, 60 tests.

## Commit
- `f0ee806` - `feat(policy): add planner review contract (Z/0/0)`

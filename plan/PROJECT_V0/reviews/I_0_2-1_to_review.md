# I/0/2 trial 1 to review

## Implemented

- Added Gemini adapter policy preflight via `policy_engine.evaluate`.
- Added preflight before:
  - `delegate`
  - `spawn`
  - `ask`
- Added adapter `ERROR` audit events for denied policy and adapter exceptions.
- Kept errors rethrown after audit.
- Updated existing Gemini tests to inject policy registries explicitly.
- Added `tests/gateway/gemini_policy_audit.test.js`.
- Updated `CHANGELOG.md`.

## Why

ADR-003 requires policy before process launch. This task adds an in-adapter defense-in-depth gate so denied operations cannot start a headless Gemini process or supervised tmux session even if an upstream service misses policy enforcement.

## Decisions

- `ask` also gets preflight, even though the plan headline emphasizes `delegate` and `spawn`, because the task's common-errors section explicitly calls out not omitting `ask`.
- `view` and `kill` are not preflighted in this trial because they do not launch or send prompts; they only observe or close an existing session.
- Policy denial is represented as a normal thrown `Error` with `err.policy` attached, so the audit event can persist the policy decision without introducing a new public error type yet.
- Existing dry-run tests now pass fake allow registries to make the policy dependency explicit.

## Verification

- Red: `node tests/gateway/gemini_policy_audit.test.js` failed because policy deny did not reject and adapter errors were not audited.
- Green: `node --test tests/gateway/gemini_delegate.test.js tests/gateway/gemini_supervised.test.js tests/gateway/gemini_policy_audit.test.js`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `e662ec6 feat(adapters): add gemini policy preflight (I/0/2)`

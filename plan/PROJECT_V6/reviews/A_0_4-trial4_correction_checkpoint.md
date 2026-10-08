# A/0/04 trial 4 correction checkpoint

Status: uncommitted narrow correction; independent review pending.
Task: `ts-14a554be-4f07-4c24-aada-77a6cbdd924e`.
HEAD and committed trial-3 KO: `03d7f45d37cc30eda6faa0cb85056f57e98434b1`.
Date: 2026-10-08.

## Scope and change

Read the committed trial-3 KO, trial-3 request/checkpoint, sheet, stage README,
`plan/README.md`, CP3 transport contract, plan trial-6 OK, the helper, caller
and tmux builders before editing. Only trial-3 F1 is addressed here.

`gateway/src/adapters/base_adapter.js` adds two lines in the existing outer
catch: an `acceptance_uncertain` error records possible CR delivery before
cleanup. Thus cleanup uses `acceptance_uncertain` even if the first guarded
submit returns a nondiagnostic status or throws after CR. The existing
`guardedSubmit` uncertainty classification remains intact. Fixed first-submit
refusal remains `unknown_state`; cleanup failure after that zero-CR refusal
remains pre-delivery `transport_failed`. Existing retry and positive
`not_submitted` behavior is unchanged.

`tests/gateway/prompt_submission.test.js` appends six tests. All inherited
bytes are preserved as an exact prefix. Four cover status 2 and a thrown
transport error, each with successful and failing cleanup. The stub records
one real fixture CR before returning/throwing. Each requires fixed public
code/message and `acceptance_uncertain`, exact framed text plus one CR, one
guarded-submit call, and cleanup attempts for all four distinct owned buffers.
Failed deletes leave three fixture buffers, explicitly demonstrating actual
cleanup failure rather than deleting successfully and merely reporting failure.
Two controls require zero CR and preserve fixed-refusal mappings for both
cleanup outcomes. No private transport/cleanup message is projected publicly.

## TDD RED

Before the production change, final test bytes:

```bash
node --test --test-name-pattern='first_submit_' tests/gateway/prompt_submission.test.js
```

Host exit 1: **4 passed, 2 failed, 0 cancelled/skipped/todo**. Failures:

- `first_submit_status2_cleanup_failure_preserves_uncertainty_and_one_cr`
- `first_submit_throws_cleanup_failure_preserves_uncertainty_and_one_cr`

Both fail the public uncertainty expectation; inherited code lets cleanup
replace it with `transport_failed`. The successful-cleanup and fixed-refusal
controls pass before implementation. `red-final-host.log.gz` binds the final
appended tests. Earlier host RED before moving the new block to the end has
the same 4/2 result and is retained as `red-host.log.gz`. The sandbox's generic
runner failure is retained as `red.log.gz`; it is infrastructure evidence,
not behavioral RED. Host runs succeed in starting the runner.

## GREEN

```bash
node --test tests/gateway/prompt_submission.test.js
```

Host exit 0: **54 passed, 0 failed/cancelled/skipped/todo**.

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/prompt_submission.test.js tests/gateway/guarded_submit.test.js tests/gateway/guarded_paste.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/tmux_client.test.js tests/gateway/tool_error_serialization.test.js
npm --prefix gateway run lint
git diff --check
```

Scoped host exit 0: **83 passed, 0 failed/cancelled/skipped/todo**.
Lint exit 0; diff check exit 0 before packaging and repeated after packaging.
The inherited isolated tmux binary is used without source/runtime modification;
its SHA-256 is `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`.
No live provider was invoked or provider acceptance inferred.

## Preservation and review boundary

`evidence/A_0_4-trial4-entry-files.json` binds 60 entry paths, including the
inherited deletion as null. `A_0_4-trial4-preservation.json` records exactly
two changed entry paths and 58 unchanged paths. `A_0_4-trial4-correction.diff`
is the narrow delta against entry bytes, distinct from the full inherited
uncommitted candidate. Earlier review/evidence files are unchanged.

No policy, other source/test, runtime patch, provider profile, CI inventory,
review index or verdict was edited. No staging, commit, push or self-review.
The immutable fresh handoff binds a fresh path/hash manifest; all writes use
exclusive creation. Root owns a fresh independent reviewer and any later
review indexing/commit. This is coder evidence, not an independent verdict.

The trial-3 KO's entire Not examined list and open limits remain for review.
No full `bash scripts/ci.sh` gate, native Darwin, live provider acceptance,
provider version/timing validation or sheet closure is claimed. Positive
Antigravity profile, root inventory/full gates and historical source-review
limits remain open. Scoped GREEN implies no integration, promotion or release.
Stop after handoff and manifest verification.

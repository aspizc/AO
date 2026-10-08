# A/0/04 bounded live-profile correction 7 — independent review verdict: OK

Review task: `ts-9e01ed0c-b0a6-45be-be06-e22c847e1bed`.
Handoff: [A_0_4-live-profile-7_to_review.md](A_0_4-live-profile-7_to_review.md)
(correction assignment `ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`, trial 7 follow-up).
Branch `feat/V6-A-0-04-safe-submit`, HEAD `e5e6387a4b62d0ad3c13cfca74be76bb8fb38d12`.
The candidate is an uncommitted working-tree diff.
Reviewer: Claude reviewer session, separate from the coder. Date: 2026-10-08.

## Scope

As assigned, this review covers only the two blocking items of the
[trial 6 KO](A_0_4-live-profile-6_reviewed_KO.md): the untested
previously-blank-row guard and the untested single-line ASCII guard, their
RED/GREEN proof, and that the rest of the trial 6 candidate is unchanged.
The trial 6 verdict already reviewed the rest of the candidate. This review
does not re-review it.

I did not edit any source, test, fixture, policy, prior verdict or evidence
file. I did not stage, commit or push. I used no subagents, providers or live
panes. Mutation runs used a scratch copy outside the repository, deleted
afterwards.

## Candidate binding

- All 12 SHA-256 values in
  [evidence/A_0_4-live-profile-7-files.json](evidence/A_0_4-live-profile-7-files.json)
  match the working tree.
- Against the [trial 6 manifest](evidence/A_0_4-live-profile-6-files.json),
  every file is hash-identical except `tests/gateway/prompt_submission.test.js`.
  That includes `base_adapter.js` (`d3350f29…`), the README (`c2866225…`) and
  both fixtures.
- The first 1300 lines of the current test file hash to `6c3a250b…`, which is
  the trial 6 test hash. So the only change is the 34 appended lines, and
  they match [test-delta](evidence/A_0_4-live-profile-7-test-delta.txt)
  exactly: two new tests and nothing else.
- `git diff --check` is clean.

## Guard 1 — previously-blank row (`base_adapter.js:293`)

Test `trial7 fresh echo replacing a prior nonblank non-echo row cannot
confirm this Enter`. Row 17 holds the same non-echo text in both the ready and
guard snapshots. The post-Enter capture is the trial 6 error profile, with the
exact echo at row 17, the rows above unchanged, and an active modern Working
layout (asserted in the test). The test expects `acceptance_uncertain`,
exactly the bracketed paste plus one CR, and no owned buffers left. This
matches trial 6 required item 1.

## Guard 2 — single-line ASCII prompt (`base_adapter.js:284`)

Test `trial7 exact printable non-ASCII prompt echo with fresh Working cannot
confirm this Enter`. Prompt `héllo` has no trailing space, its exact padded
echo is in a previously blank row, and the test asserts both the draft parse
and modern Working. It has the same expectations as guard 1. The test keeps
the warnings footer on purpose, so the separate queue-footer ASCII refusal
cannot be the thing that rejects. That makes the witness guard the only check
being tested. This matches trial 6 required item 2.

## RED reproduced independently

I applied each one-occurrence mutation separately in its own scratch copy.
Each copy had `gateway/src`, `package.json` and `contracts`, the
`tests/gateway` tree, and a symlink to the installed `node_modules`. Then I ran
`node --test tests/gateway/prompt_submission.test.js`:

| Mutation | Resulting source SHA-256 | Result |
|---|---|---|
| drop `before[index]?.trim() === ""` | `3a3edae0…` (matches evidence) | 116 tests, 115 pass, 1 fail: only the guard 1 test, `Missing expected rejection.` |
| drop the ASCII/trailing-space line | `6b67f86e…` (matches evidence) | 116 tests, 115 pass, 1 fail: only the guard 2 test, `Missing expected rejection.` |

`Missing expected rejection` means that without the guard the ask resolves as
accepted. So each guard alone is what stops a false acceptance, and each test
fails only for its own guard. This matches the coder's
[prior-blank RED](evidence/A_0_4-live-profile-7-prior-blank-red.txt) and
[ascii RED](evidence/A_0_4-live-profile-7-ascii-red.txt).

## GREEN reproduced

I ran the focused command from the handoff on the candidate: 191 tests,
191 pass, 0 fail, 0 skipped. This matches the
[GREEN evidence](evidence/A_0_4-live-profile-7-green.txt).

## Not covered by this verdict

- I did not rerun the native captured-prompt test, the full `scripts/ci.sh`
  gate or any live retry. The handoff does not claim any of them for trial 7
  either. Trial 6's native reproduction is still the only native evidence.
- The Claude operator evidence request
  ([trial 5](A_0_4-live-profile-5_operator-evidence-request.md)) is still open.
  This verdict does not decide it.
- Trial 6's non-blocking liveness observations about the title-pending
  spinner still apply.

## Verdict

**OK.** Both trial 6 blockers are closed. Each guard now has a test that fails
only when that guard is removed, which I reproduced independently. GREEN
reproduces. The combined trial 5+6 candidate is byte-identical apart from the
two appended tests. This is a review verdict only. It does not authorize
integration, does not close the sheet and makes no live-tool-success claim.
The orchestrator owns committing the candidate and this verdict.

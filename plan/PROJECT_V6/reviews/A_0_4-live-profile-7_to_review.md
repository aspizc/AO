# A/0/04 acceptance guard coverage — trial 7 handoff

Status: implemented, uncommitted, awaiting fresh independent review.
Assignment: `ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49` (trial 7 follow-up).
Entry HEAD: `e5e6387a4b62d0ad3c13cfca74be76bb8fb38d12`.
Read [trial 6 KO](A_0_4-live-profile-6_reviewed_KO.md): it reviewed the full
inherited trial 5+6 candidate and found two untested acceptance guards.
This handoff addresses those two gaps; it is not an independent verdict.

## Exactly two new tests

Only `tests/gateway/prompt_submission.test.js` changes relative to the entry
candidate. [Test delta](evidence/A_0_4-live-profile-7-test-delta.txt) records the
exact addition. Production source, README and sanitized fixtures remain
unchanged. The trailing-space guard is retained; no simplification is part
of this bounded coverage correction.

1. `trial7 fresh echo replacing a prior nonblank non-echo row cannot confirm this Enter`:
   ready and final guard both contain `existing transcript content` at row 17.
   Post-Enter has the exact prompt echo at that row, with the unchanged prefix
   above it, active Working at row 32 and observed `⠼` spinner at row 38.
   A replaced occupied row cannot prove the required newly inserted echo.
2. `trial7 exact printable non-ASCII prompt echo with fresh Working cannot confirm this Enter`:
   prompt is single-line printable `héllo`; its exact padded echo appears in
   the previously blank row with active Working and spinner. The simulated
   pasted draft uses the admitted warnings footer so the queue footer's
   separate ASCII gate cannot hide the acceptance-witness guard being tested.
   Measured fixture geometry and cursor start are retained; draft cursor X is
   explicitly simulated as prompt length plus two.

Both require `acceptance_uncertain`, exact bracketed paste followed by exactly
one CR, no replay and cleaned owned buffers. Neither adds a new positive
acceptance marker or broadens a provider profile. They reuse only published
sanitized trial 6 observations; the ignored raw root result was not needed
or read during this trial.

## Isolated mutation RED before GREEN

Shared production source was never mutated for RED. Two independent scratch
copies under `/tmp/a04-trial7-mutations/` contain copied `gateway/src`,
`gateway/package.json`, `gateway/contracts`, this test file and its fixture
directory. They read the existing installed `gateway/node_modules` through
symlinks; no dependencies were installed. Only scratch `base_adapter.js`
was changed, separately for each run. The exact one-occurrence replacements
and resulting source hashes are in
[mutation evidence](evidence/A_0_4-live-profile-7-mutations.json).

```text
# Run separately in each scratch root after applying only its mutation:
node --test tests/gateway/prompt_submission.test.js
```

- Remove only `before[index]?.trim() === ""`:
  [RED](evidence/A_0_4-live-profile-7-prior-blank-red.txt) has 116 tests,
  115 passed, 1 failed, 0 skipped. Only the new occupied-row test fails with
  `Missing expected rejection.` The non-ASCII regression still passes.
- Remove only the line containing the ASCII/trailing-space guard:
  [RED](evidence/A_0_4-live-profile-7-ascii-red.txt) has 116 tests,
  115 passed, 1 failed, 0 skipped. Only the new non-ASCII test fails with
  `Missing expected rejection.` The occupied-row regression still passes.
  Since `héllo` has no trailing space, this failure specifically proves
  the ASCII refusal matters, not the trailing-space branch.

Initial scratch runs also exposed missing dependency and static-contract
setup files in an existing tool-envelope test. Those were supplied as above;
final RED evidence contains only the intended mutation failure. No policy
engine or provider was invoked.

## Candidate GREEN and binding

```text
node --test tests/gateway/base_adapter.test.js tests/gateway/prompt_submission.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/tool_error_serialization.test.js
```

[Focused GREEN](evidence/A_0_4-live-profile-7-green.txt): 191 passed, 0 failed,
0 skipped. Both new tests pass on the candidate with its original guards.
`git diff --check` passes. The native captured-prompt test was not rerun for
this test-only correction; trial 6's independent reproduction remains the
prior evidence, not a new trial 7 result. No full gate or live retry was run.

[Checks](evidence/A_0_4-live-profile-7-checks.json) record unchanged source,
exactly two test additions and prior-artifact preservation. All previously
tracked trial 1–6 handoffs/verdicts/evidence and tracked fixtures remain
byte-identical to entry HEAD; untracked trial 5 and 6 fixtures retain their
trial 6 manifest hashes. Every file in the trial 6 manifest except the test
file remains hash-identical. The
[new candidate manifest](evidence/A_0_4-live-profile-7-files.json) re-seals
source, README, tests, both fixtures and trial 7 handoff/evidence.

No provider, policy, commit, push or subagent actions were taken. No live tool
success, integration, sheet closure or independent acceptance is claimed.
Claude's prior operator evidence request remains open. Stop here for a fresh
independent reviewer to assess the combined candidate and both mutation proofs.

# A/0/04 lint correction 1 — independent review verdict: OK

Review task: `ts-31f6db7e-fa96-41f2-9abb-56782270c785`.
Handoff: [A_0_4-lint-1_to_review.md](A_0_4-lint-1_to_review.md).
Branch `feat/V6-A-0-04-safe-submit`, HEAD `8e92565ada31f3301005b88b6a9899850997ab0a`.
The candidate is an uncommitted working-tree diff.
Reviewer: Claude reviewer session, separate from the coder. Date: 2026-10-08.

## Scope

This review covers only the `no-regex-spaces` lint correction in
`gateway/src/adapters/base_adapter.js`. It does not re-review the rest of
A/0/04, does not run the full gate, and does not close the sheet.

I did not edit any source, test, policy or prior review artifact. I did not
stage, commit or push. I used no subagents, providers or live panes.

## Candidate binding

- `gateway/src/adapters/base_adapter.js` SHA-256 is
  `f77309f78e4bdb541fb75984110fb2c7be25f1d097335fd6fc99f8d3cb6ddb1d`,
  matching the handoff.
- `git diff --stat`: one file, 4 insertions, 4 deletions. The only other
  working-tree entry is the untracked handoff itself.
- `git diff --check` passed.

## Findings

1. **Exactly four substitutions.** A line-by-line comparison against
   `HEAD:gateway/src/adapters/base_adapter.js` (440 lines both sides) found
   four changed lines: 12 (`codexQueueFooter`), 15 (`codexLiveStatus`),
   17 (`codexSpinnerStatus`) and 178 (inline Claude cwd row regex). Each one
   is the old line with the leading `/^  ` replaced by `/^ {2}`. No other
   byte changed.
2. **Semantics preserved.** Two literal spaces and ` {2}` are equivalent in
   JavaScript regex syntax. Flags are unchanged (none). I also compared each
   old/new regex pair on 196 inputs: prefixes `""`, one, two and three
   spaces, tab mixes and NBSP, crossed with matching and trailing-space
   bodies. Results matched in every case, so the anchored two-space indent
   still rejects one and three spaces exactly as before.
3. **Lint.** `npm run lint` in `gateway/` exited 0.
4. **Affected tests.** I ran with the gate-pinned `tmux 3.6a-agents.3` binary
   (`A04_TEST_TMUX`, SHA-256
   `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`, the
   same as in [the root gate record](A_0_4-root-full-gate-redis7.md)) and a
   private `TMUX_TMPDIR`. Every `tests/gateway` suite that imports the
   adapters, plus `guarded_submit` and `guarded_paste`, passed 413/413 with
   0 skipped. The suites are antigravity_adapter, base_adapter, claude_adapter,
   claude_policy, codex_adapter, codex_supervised,
   orchestrator_profile_authority, prompt_submission_capture,
   prompt_submission, request_context_execution_binding, guarded_submit and
   guarded_paste.

## Observations (non-blocking)

- With the system `tmux 3.6` instead of the pinned binary,
  `prompt_submission_capture.test.js` fails with `AGENT_PROMPT_NOT_SUBMITTED`.
  This is environmental: the test depends on the `agents-submit-v1`
  command, which only the pinned build provides. The failure is not caused by
  this diff. Future handoffs should name `A04_TEST_TMUX` explicitly.
- The handoff's "191/191" does not name its suite set. I could not reproduce
  that exact count. My own sets gave 172/172, 189/189 and 413/413, all
  passing, which covers the claim.
- The handoff does not include a TDD RED test, which is acceptable here. The
  change is a syntax-only substitution, and the lint diagnostics it removes
  serve as its failing check.

## Status

OK for this lint correction only. It is **reviewed**, not integrated. The full
`bash scripts/ci.sh` gate on this corrected candidate has not run. Claude live
acceptance and the remaining A/0/04 sheet criteria are still open.

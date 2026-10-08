# A/0/04 bounded acceptance markers — trial 5 handoff

Status: implemented, uncommitted, awaiting independent review. No live tool
success, full gate, integration or sheet closure is claimed.
Assignment: `ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`, trial 5 follow-up.
Clean entry HEAD: `a5d061c18b9d65ade3cbbd5d120610b39c58af6d`.
The trial 4 source-only OK is inherited; previous trial artifacts are immutable.

## Measured evidence and timing

Ignored `workspace/root-a04-live-acceptance-result.json` was read locally only.
Its input fingerprint was retained locally and rechecked: no evidence drift
occurred during this task. No raw capture/token/account/path was published.
[New sanitized fixtures](../../../tests/gateway/fixtures/a04_live_profiles_trial5.json)
retain pre-ask/error/later rendered rows, measured pre/error metadata and every
trailing literal-space count. Relevant current user/answer rows are retained;
private history/account/quota text is removed, paths/identity redacted, and the
unique marker replaced consistently with same-length benign ASCII.
Later captures explicitly have `pane: null`: root did not record later metadata.

Both providers received one guarded Enter and answered the unique root marker.
Both `agent.ask` calls nevertheless returned `acceptance_uncertain`, not success.
Codex's error capture has the current user prompt at row 17, active Working at
row 32, placeholder at row 36 (cursor 2), measured status plus `· ⠦` at row 38,
and shortcuts/warnings at row 39. The Working clock reads 1s. The later capture
contains the response and a different status suffix, but is not admitted as an
acceptance witness. Claude's error capture already contains user and completed
assistant rows; its later capture repeats them. Its blank padded composer is
still unknown, and the code still returns uncertainty without replay.

The configured observation default is 1500 ms after CR; the root diagnostic
script captures error only after tool failure, then sleeps 7000 ms before the
later pane. There are no monotonic stage timestamps, no actual pre-CR guard
snapshot in the root file, and no later metadata. The 1s renderer clock is not
an exact wall-clock latency measurement. Claude completing within the default
window is consistent with these captures, not precisely timed evidence.

## Source-backed correction

Pinned Codex 0.160.1 source establishes the active task renderer's Working
clock/interrupt form ([status_indicator_widget.rs](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/status_indicator_widget.rs),
lines 88–96 and 202–238) and user-history `› ` prefix/padding
([history_cell/messages.rs](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/history_cell/messages.rs),
lines 166–229). These sources were read; no provider executable was invoked.
The spinner suffix is observed rendering only, never an acceptance witness.

Codex classifies the measured four-row Working region as busy, with or without
the measured spinner suffix. A padded placeholder at the input-start cursor is
empty; typed text is not trimmed. Unknown gap content or spinner-only state
refuses. Only the observed spinner glyph is admitted; other suffixes stay closed.

After CR, positive Codex acceptance also checks server/pane identity and size,
and rejects any prior Working history in initial or final-guard capture,
independent of timer/row movement. For the new measured layout it requires:

- exactly one current single-line ASCII prompt echo before the active Working;
- that echo absent from both initial and final-guard transcript;
- insertion into a previously blank row, with identical viewport prefix in
  both baselines, so reflow/stale-history movement cannot satisfy the witness;
- no intervening user turn between echo and Working.

The retained source-profile active Working path gains the prior-history and
identity checks; its other behavior remains. Decisions, paste/Enter guards,
max-two-Enter bound, concurrency, cleanup and error projection are unchanged.
No completed-only answer marker, blank composer, disappearance or spinner alone
confirms acceptance. Nondiagnostic submit failure still cannot reach the witness.

Claude has no new completed-response matcher. A 2.1.292 embedded source fixture
cannot establish 2.1.293 completed-turn semantics; the available captures omit
the final-guard baseline needed to bind a response to this CR.
[Specific operator evidence request](A_0_4-live-profile-5_operator-evidence-request.md)
asks for verified renderer/turn identity and timed exact guard/post-CR frames.

## TDD RED and GREEN

Six trial 5 groups were added before production edits. Host RED:

```bash
node --test tests/gateway/prompt_submission.test.js
```

Exit 1: **89 tests, 86 passed, 3 failed, 0 skipped/cancelled/todo**.
[RED log](evidence/A_0_4-live-profile-5-red.txt). Failures:

- `trial5 observed Codex four-row Working and spinner status refuse initial input as busy`
- `trial5 fresh exact prompt transcript plus Working establishes Codex acceptance after one Enter`
- `trial5 stale source-profile Working history cannot become acceptance after reflow`

During GREEN, three more groups cover reflow/duplicate/intervening-turn and pane
replacement, completed-only Codex refusal, and Working-without-spinner/gap
refusal. The intermediate draft in tests is simulated because root did not
capture it; only Codex error metadata is used for observed busy acceptance.
Later metadata reused in the negative test is explicitly labeled derived.

Final focused host command:

```bash
node --test tests/gateway/base_adapter.test.js tests/gateway/prompt_submission.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/tool_error_serialization.test.js
```

Exit 0: **167 passed, 0 failed/skipped/cancelled/todo**, including 92 prompt tests.
[GREEN log](evidence/A_0_4-live-profile-5-green.txt).
Retained native capture test:

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/prompt_submission_capture.test.js
```

Exit 0: **1 passed, 0 failed/skipped/cancelled/todo**; covers exact literal
whitespace/multiline/key-name inputs on the owned terminal simulator, not live
providers. [Native log](evidence/A_0_4-live-profile-5-capture.txt).
`git diff --check` passed.

The tests assert one framed paste/one CR for new positive Codex evidence;
stale/missing/wrong echoes, stale Working, spinner alone, reflow, duplicate
turns, pane replacement and completed-only captures stay uncertain after one
CR, without retry/success. Initial observed busy state receives zero input.
The actual completed Claude capture stays uncertain after one simulated CR.
Existing security/refusal and bounded-retry tests pass.

[Candidate hashes](evidence/A_0_4-live-profile-5-files.json) bind source, tests,
fixture, README, logs and operator request. Published fixtures/logs were scanned
locally against raw token/session values and private identity/path markers.

## Stop boundary

Stop for a fresh independently assigned review. No provider invocation, policy
edit, staging, commit/push or subagent occurred. Root owns the live retry and
solo full gate; neither was performed here. Simulated Codex success is not live
`agent.ask` success. Claude remains explicitly uncertain pending evidence.

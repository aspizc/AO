# A/0/04 bounded live-profile correction — trial 3 handoff

Status: implemented, uncommitted, awaiting fresh independent review.
No independent verdict, integration, sheet closure or live acceptance is claimed.

Same bounded coder ownership as assignment
`ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`, with the operator's trial 3 follow-up.
Base HEAD: `0edb75e5d06d3e4a16f78cebe404a4bffbedd5c7`, containing the
[trial 2 source-only OK](A_0_4-live-profile-2_reviewed_OK.md).
All tracked trial 1/2 handoffs, verdicts, evidence and fixtures were verified
byte-identical to that base. No previous trial artifact was edited.

## Actual observations and publication boundary

The ignored `workspace/root-a04-live-acceptance-result.json` was read locally
only, not changed or published. This root result now records `errorState` as
well as `preAskState`; the new fixture preserves those measured fields.

- Codex 0.160.1: pre-ask ready cursor (2,36), 120x40. After paste the draft is
  still on row 36, with measured cursor (57,36). Row 38 retains the measured
  status row and row 39 becomes exactly `  tab to queue message`. The guard
  refused `unknown_state` before Enter.
- Claude Code 2.1.293: both recorded panes are the same placeholder at cursor
  (2,36), 120x40. The row after the bottom border is a local status row, followed
  by the full auto-mode footer with its agents suffix. Initial readiness
  refused `unknown_state`; no input was received.
- All recorded mode/input-off/synchronized fields are zero. Pane identifiers,
  session/account/policy-resolution information are excluded.

[Trial 3 sanitized fixtures](../../../tests/gateway/fixtures/a04_live_profiles_trial3.json)
retain exact relevant row positions and footer text/padding. Privacy changes:
history/account/quota rows are blanked before the composer neighborhood; local
paths become `/workspace/project`, status identity becomes `user@host`, and
the prompt marker becomes benign ASCII of the same length. Codex's measured
cursor remains 57 after sanitization, matching the sanitized ASCII draft.
Claude's `error` observation is intentionally a duplicate of `preAsk`, not a
fabricated post-paste state. Claude draft sequences in tests are explicitly
simulated, with derived cursor metadata.

Fixtures and published logs were scanned against actual raw token/session
values locally and for operator identity, home paths, raw disposable paths and
account markers. None remain. The raw root result remains ignored and local.

## Narrow correction and phase contract

The classifier and internal observation helper now take an optional phase,
defaulting to `ready`. Initial pre-paste observation uses that default.
Post-paste pending, fresh guarded-Enter and unchanged-draft-after-CR observations
explicitly use `draft`. That phase never selects a provider or grants authority.

Codex's exact queue footer is added to its footer/gap matching, with the same
measured status row and 120x40 requirements. It recognizes only a nonempty,
fully visible ASCII single-line draft in the `draft` phase, with cursor at the
end and blank rows after the footer. Queue layouts in initial readiness,
unknown phases, blank inputs and blank placeholders refuse. The current prompt
and composer identity must still match in `requireComposer` before Enter;
changed drafts, decisions or busy states cannot receive a guarded CR.

Claude's existing local-status branch now allows either of the two exact
observed auto-mode footers, including the full agents-suffix form. The previous
blank/full and status/short cases remain. Borders, ASCII, geometry, cursor,
trailing-blank, blank-editor and status-row checks are unchanged.

Acceptance remains the existing fresh busy-with-empty-composer check, not
presence of a queue/auto-mode footer or disappearance alone. A queued draft
cannot establish acceptance. If the same exact queued draft remains after CR,
only the existing single bounded retry is possible. A busy queue pane retaining
the prompt is `acceptance_uncertain`, never success and never retried.

No provider invocation, policy invocation/edit, transport/runtime change,
subagent, staging, commit or push was performed.

## TDD RED

Eight trial 3 test groups were added before production edits. Host command:

```bash
node --test tests/gateway/prompt_submission.test.js
```

Exit 1: **76 tests, 71 passed, 5 failed, 0 skipped/cancelled/todo**.
[Sanitized RED evidence](evidence/A_0_4-live-profile-3-red.txt).
A direct sandbox test run exposed the same five behavioral failures:

- `trial3 observed Codex queue footer is a draft only in the post-paste phase`
- `trial3 observed Claude status plus full footer is ready with recorded metadata`
- `trial3 observed queue draft supports guarded Enter and bounded retry without claiming acceptance`
- `trial3 Claude measured ready footer permits exact simulated drafts without false acceptance`
- `trial3 queue draft cannot authorize Enter on a fresh decision or changed draft`

Before RED, one obsolete rejection case was removed from the trial 2 test's
near-miss list: local status plus full agents footer. The root's new actual
observation contradicts that expectation. Its exact observed positive case is
now covered in the trial 3 readiness test. This changes a candidate test only;
the committed trial 2 fixture, verdict and evidence are immutable.

During GREEN, two additional groups verify busy queued-draft refusal and
Claude full-footer near misses. The queue near-miss group gained a cursor-at-
width boundary case. No behavioral RED failure was removed.

## GREEN and verification

Final host command:

```bash
node --test tests/gateway/base_adapter.test.js tests/gateway/prompt_submission.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/tool_error_serialization.test.js
```

Exit 0: **153 passed, 0 failed, 0 skipped/cancelled/todo**. The prompt-submission
subset has 78 tests. [Sanitized GREEN evidence](evidence/A_0_4-live-profile-3-green.txt).
`git diff --check` passed.
[Candidate hashes](evidence/A_0_4-live-profile-3-files.json) bind the source,
tests, new fixture, README and both logs.

Tests assert emitted framed paste and at most two guarded CRs ending in
`not_submitted`, not false success. Disappearance produces uncertainty after
one CR. Queue placeholders and initial queue drafts receive zero input;
menu/trust/busy/unknown panes refuse with zero input. Fresh decision or changed
draft yields one paste and zero CRs. Wrong providers, phase, status/footer,
geometry, non-ASCII/wrapped drafts, cursor drift, trailing overlays and pane
modes refuse. Synthetic negative panes and retry sequences are test evidence,
not newly observed live acceptance or busy rendering.

## Stop boundary

Stop here for a fresh separately assigned independent reviewer. Reproduce the
focused command and inspect the phase wiring, observed metadata, sanitized
fixtures and bounded diff. Root owns live retries, successful acceptance and
its metadata/timing, positive busy rendering and the solo full gate.
`bash scripts/ci.sh` was not run by this bounded task; A/0/04 remains open.

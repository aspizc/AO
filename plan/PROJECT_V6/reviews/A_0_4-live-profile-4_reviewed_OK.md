# A/0/04 bounded live-profile correction 4 — independent review verdict: OK (source only)

Review task: `ts-56f7a868-a0f8-49fe-b8da-e22248b14652`.
Handoff: [A_0_4-live-profile-4_to_review.md](A_0_4-live-profile-4_to_review.md)
(correction assignment `ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`, trial 4 follow-up).
Branch `feat/V6-A-0-04-safe-submit`, HEAD `88724c7c8b675fce0cd400a5c55e9499a4b0bc93`.
The candidate is an uncommitted working-tree diff.
Reviewer: Claude reviewer session, separate from the coder. Date: 2026-10-08.

## Scope

This review covers the exact combined candidate: the trial 4 padding fix plus
the inherited trial 3 phase and Claude-footer changes, which the trial 3 KO
had not reviewed. It also covers the TDD evidence for both parts.

This is a **source-only** review. It does not establish any of the following:

- successful live Codex or Claude acceptance
- the full gate (`bash scripts/ci.sh`), which I did not run
- integration
- closure of A/0/04

I did not edit any candidate source, test, fixture, policy, prior verdict or
evidence file. I did not stage, commit or push anything. I used no subagents,
provider processes or live panes. I read the ignored root result
`workspace/root-a04-live-acceptance-result.json` locally only. This verdict
reproduces no raw pane text, token, session, account or registry value from it.

## Candidate binding

Every SHA-256 in `evidence/A_0_4-live-profile-4-files.json` matches the working
tree: source, tests, trial 4 fixture, README, RED/GREEN logs and the source
delta. The untracked trial 3 fixture is still
`d701b65b…3f48bbf`. Only `gateway/README.md`, `gateway/src/adapters/base_adapter.js`
and `tests/gateway/prompt_submission.test.js` are modified. Nothing under
`policies/` changed. `git diff --check` passes.

## Checks

- [x] **Trial 3 KO correction.** `codexQueueFooter` is now `/^  tab to queue message *$/`
  at `gateway/src/adapters/base_adapter.js:12`, and all six former equality
  sites use it. I probed the trial 4 draft observation in the draft phase:
  - accepted (`composer`): the observed 119-char row and the trimmed 22-char row
  - refused (`unknown_state`): trailing tab, trailing NBSP, three-space indent,
    extra trailing text, or a 120-char row
  - refused in the `ready` phase in every variant
- [x] **Bounded delta.** Reverse-applying `A_0_4-live-profile-4-source-delta.patch`
  to the candidate source reproduces exactly the trial 3 source hash
  `a0d95754…5515245`. Trial 4 changes nothing except the matcher.
- [x] **Inherited trial 3 phase wiring** (`base_adapter.js:100-121`, `205-227`, `288-299`):
  - The first readiness observation uses the default `ready`. Pending,
    guarded-Enter and post-CR observations use `draft`.
  - Phase is read only by the Codex queue branch. It does not select a provider
    and does not affect Claude or other footers.
  - The queue branch requires all of:
    - a nonempty, ASCII, single-line draft
    - cursor on the composer row with `cursorX === text.length + 2 < width`
    - 120x40 geometry and the measured status row
    - blank rows after the footer
  - A queue draft cannot set `busy && text === ""`, so it can never count as
    acceptance. The decision check still runs first.
- [x] **Inherited Claude footer** (`base_adapter.js:163-171`): the local-status
  branch adds only the exact full agents-suffix string. Near misses, a relative
  path, unknown status, an overlay and 41-row geometry refuse.
- [x] **TDD, reproduced independently.** I copied the tree to a scratch
  directory and changed only the source.
  - Inherited trial 3 source with the candidate tests: exit 1, **83 tests,
    79 passed, 4 failed**. The four failures are exactly the trial 4 groups the
    handoff names, and the Claude trial 4 test passes. This matches the RED log.
  - Committed HEAD source with the candidate tests: 10 failures, the six trial 3
    behavioral groups plus the four trial 4 groups. So the inherited tests also
    fail without the trial 3 change.
- [x] **GREEN.** I ran the handoff's focused command on the candidate: exit 0,
  **158 passed, 0 failed/skipped/cancelled/todo**. This matches the GREEN log.
- [x] **Test intent (Rule 9).**
  - Exact emitted bytes are asserted: one framed paste and at most two CRs
    ending in `not_submitted`, or one CR ending in `acceptance_uncertain`.
  - An initial queue draft gets zero input and no `load-buffer`.
  - Busy, unknown status, cursor drift and decision observations at the guard
    get one paste and zero CRs, and buffers are cleaned.
  - The padding tests now fail against exact equality, which closes the gap
    found in the trial 3 KO.
- [x] **Privacy.** Both fixtures, the README, the handoff and all trial 4
  evidence files contain none of the following:
  - the raw tokens, session IDs, profile IDs or registry digests
  - the home path, the operator name or an email address
- [x] **Global invariants.** Everything is in English. Nothing was pushed or
  committed, and no policy edit was made. Logs/stdout behavior is unchanged.
  There is no provider inference in the source.

## Findings (non-blocking; for root and the next bounded task)

1. **The root raw result changed after the coder read it, so the Codex draft
   fixture cannot be re-verified against it now.** The root rewrote
   `workspace/root-a04-live-acceptance-result.json` at 02:08:34, about 0.3 s
   before the handoff was saved. That run used the trial 4 working tree, since
   the source was saved at 02:06:40. The current Codex `errorPane` is a post-Enter
   pane, not the queued draft:
   - `errorState` cursor (2,36)
   - a Working row on row 32
   - an empty placeholder
   - a spinner suffix on the status row
   - the `? for shortcuts` footer

   The handoff's "current" description, and the fixture's per-row trailing
   counts for Codex rows 14, 17, 32, 36, 38 and 39, therefore do not match the
   file as it exists now. That is evidence drift, not a candidate defect. The
   fixture's key fact, row 39 = footer + 97 spaces (119 chars), agrees with the
   trial 3 KO reviewer's independent read of the earlier raw file. The new run
   also corroborates the fix: Codex reached a delivered CR (`acceptance_uncertain`
   after Enter) instead of the earlier pre-Enter `unknown_state`. The coverage
   test for `observedTrailingSpacesByRow` checks the fixture against itself, not
   against the raw capture. Rows 13 and 15-18 match the current raw file byte for byte.
2. **Live Codex acceptance after Enter is still unrecognized.** This is
   pre-existing logic outside this trial's scope, and it fails safe. With the
   candidate, the current raw Codex `errorPane` classifies as `unknown_state` in
   both phases. That pane appears to show real acceptance, and `laterPane`
   contains the token. Two things prevent the busy match:
   - The Working row sits four rows above the composer, but the busy check scans
     only `start-2..start`.
   - The status row has a spinner suffix (`· <glyph>`) that `codexLiveStatus`
     (`\S+\s*$`) rejects.

   The Gateway therefore reported `acceptance_uncertain` with one CR, no retry
   and no false success. That is the correct fail-closed behavior. However,
   A/0/04's live acceptance cannot pass until a separately reviewed task
   measures and admits this busy layout.
3. **Claude.** The current raw Claude `errorPane` also classifies as
   `unknown_state` after one Enter, which leads to uncertainty without retry.
   It is consistent with the trial 4 fixture: the trailing counts match
   on every row. Live acceptance is still unconfirmed.

## Verdict

**OK — source only**, for the combined trial 3 + trial 4 candidate as bound by
`evidence/A_0_4-live-profile-4-files.json`. This verdict does not cover
integration, the full gate, live acceptance or A/0/04 closure. Root owns the
commit, `bash scripts/ci.sh` and the live retry, and should treat findings 1-2
as open inputs for the next bounded task.

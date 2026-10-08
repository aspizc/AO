# A/0/04 bounded live-profile correction 6 — independent review verdict: KO

Review task: `ts-98d60c6e-d453-4951-b20a-c4498a20cb01`.
Handoff: [A_0_4-live-profile-6_to_review.md](A_0_4-live-profile-6_to_review.md)
(correction assignment `ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`, trial 6 follow-up).
Branch `feat/V6-A-0-04-safe-submit`, HEAD `3c74d3fb36dad0b29aa2218f20c300572d7a2357`.
The candidate is an uncommitted working-tree diff.
Reviewer: Claude reviewer session, separate from the coder. Date: 2026-10-08.

## Scope

This verdict covers the full inherited candidate plus the trial 6 change:
production source, tests, README, sanitized fixtures and evidence. Trial 5
reviewed only one blocker, so this review also covers the rest.

I did not edit any candidate source, test, fixture, policy, prior verdict or
evidence file. I did not stage, commit or push anything. I used no subagents,
provider processes or live panes. I made the mutation runs below in a scratch
copy outside the repository. No raw live pane text, token, account, session or
path value appears in this file.

## Candidate binding

The SHA-256 of all ten files listed in
[evidence/A_0_4-live-profile-6-files.json](evidence/A_0_4-live-profile-6-files.json)
matches the working tree. The README is `c2866225…`, `base_adapter.js` is
`d3350f29…`, the tests are `6c3a250b…`, the trial 5 fixture is `326ca1d3…` and
the trial 6 fixture is `258f7c8e…`. The evidence files also match.
[source-delta](evidence/A_0_4-live-profile-6-source-delta.txt) shows that only
the spinner comment and the regex changed since trial 5. That agrees with
`git diff`.

## What passes

- **Pinned frame table, checked from the source.** I downloaded
  `status_surfaces.rs` and `thread_title_status.rs` from the
  `rust-v0.160.1` tag. Their SHA-256 values match the provenance file
  (`e96ac7db…` and `58b43abc…`). Lines 31–36 define
  `TERMINAL_TITLE_SPINNER_FRAMES` with these ten frames:
  `⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏`. Lines 1029–1034 pick a frame every 100 ms.
  `with_thread_title_progress` appends that frame to the status-line items
  ThreadName, ThreadTitle and SessionId. `codexSpinnerStatus` lists exactly
  this set with no inferred range. The trial 5 blocker is fixed.
- **Trial 5 required items.** Each frame has its own busy, fresh-acceptance
  and spinner-only tests. Unknown glyphs `⠿ ⣿ *`, tabs, extra text, doubled
  suffixes and changed indentation stay `unknown_state`. The new `⠼` capture
  is sanitized into the trial 6 fixture, which contains exactly one `⠼`. The
  spinner is never an acceptance witness by itself: spinner-only post-Enter
  stays uncertain, and a spinner without the measured Working layout returns
  `unknown_state`.
- **Tests reproduced.** The focused command from the handoff gave 189 pass,
  0 fail, 0 skipped. The native capture test with
  `A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux` gave 1 pass, 0 fail,
  0 skipped. `git diff --check` is clean.
- **RED is real.** I narrowed the class back to `⠦` and got 104 pass and
  10 fail, the same as the RED evidence.
- **Most witness guards are tested.** Removing any of the following makes at
  least one test fail:
  - the prior-Working rejection
  - the server/pane identity and size check
  - the unchanged-preceding-viewport check
  - the intervening-user-turn check
  - the spinner-without-Working `unknown_state`
- **Phase gate and Enter bound.** The phase gate, the guarded-Enter protocol
  and the two-Enter maximum are unchanged. The fixture path sends one Enter
  and does not replay.
- **Privacy.** Both fixtures and all trial 6 evidence files are clean.
  Pattern scans found no home paths, user names, e-mail addresses, UUIDs,
  key or JWT prefixes, or session IDs. The only hit in the handoff is the
  public task ID.
- **Claims.** The README and the handoff do not claim live tool success, a
  full gate, integration or sheet closure. The Claude operator evidence
  request is still open.
- **Invariants.** Code and documents are in English. The server name is
  unchanged. No `policies/` edits. No push.

## Blocking finding — two documented acceptance guards have no test (Rule 9)

`freshCodexWork` decides positive acceptance, and a false positive there means
the prompt is never replayed. Two of its guards are documented in the README,
but I removed each one in the scratch copy and the suite still passed
(`node --test tests/gateway/prompt_submission.test.js`):

1. **Previously-blank row**, `base_adapter.js:293`,
   `before[index]?.trim() === ""`. With it removed: 114 pass, 0 fail. The
   README says the echo must be "newly inserted into a previously blank
   transcript row". No test has a prior snapshot where the echo row held
   other non-blank, non-echo text while the rows above stayed the same.
2. **Single-line ASCII prompt**, `base_adapter.js:284`,
   `/[^\x20-\x7e]/.test(prompt) || prompt.endsWith(" ")`. With it removed:
   114 pass, 0 fail. The README says "current single-line ASCII prompt echo".
   Trailing-space, tab and newline prompts can never match the trimmed
   single-row echo anyway. A printable non-ASCII prompt such as `héllo` is
   different: its echo renders exactly, so the code without the guard would
   report acceptance where the documented contract says uncertain. No test
   covers this. The `é` test at line 926 changes the draft snapshot, not the
   fresh-work prompt.

Neither gap breaks the observed captures. Both are guards the handoff relies
on for safety, and no test fails if they are removed.

Removing `echoes.length !== 1` also leaves all tests passing. That is not a
gap: a second new echo already fails the intervening-user-turn check, and an
old echo fails the prior-echo check. No action needed.

## Required for the next trial

1. Add a test that fails when `before[index]?.trim() === ""` is removed. In
   the ready and guard snapshots, put other non-blank, non-echo text in the
   row where the post-Enter echo will appear, and keep the rows above
   unchanged. With the active Working and spinner layout present, expect
   `acceptance_uncertain`, exactly one Enter and no replay.
2. Add a test that fails when the ASCII guard is removed. Use a printable
   non-ASCII single-line prompt, for example `héllo`, whose exact echo
   appears in a blank row with fresh Working. Expect `acceptance_uncertain`
   and one Enter. Keep or drop the trailing-space part; it is redundant with
   the trimmed comparison.
3. Show the RED (both new tests fail against a scratch copy without the
   guard) and then the GREEN. Re-seal the candidate manifest.

## Non-blocking observations

- In 0.160.1 the status-line spinner shows that thread-title generation is
  pending. It does not show that a turn is running. That confirms it is
  rendering evidence only. If the title is pending while the pane is idle,
  the ready composer becomes `unknown_state` and input is refused. This is
  safe but can cost liveness. If a thread name is present, the row renders
  `<name> ⠼`, which this pattern does not match, so it also stays
  `unknown_state`.
- Per Rule 6, this review went past the 20,000-token per-task budget.

## Verdict

**KO.** Trial 6 fixes the trial 5 spinner-frame blocker, and the rest of the
candidate passed review except for the two untested guards above. Trial 6
artifacts stay immutable; corrections go in trial 7. This is not an
integration authorization and does not close the sheet.

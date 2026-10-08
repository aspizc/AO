# Review A_0_4-live-profile-16 — OK

**Task:** plan/PROJECT_V6/A/0/04.md
**Trial:** 16 (live-profile series)
**Branch:** feat/V6-A-0-04-safe-submit
**Commit:** none. This is a dirty candidate on HEAD `8b040490f31bbdecb6f0ad4bac5f306b36cdcaca`.
It is bound by `evidence/A_0_4-live-profile-16-files.json` and
`evidence/A_0_4-live-profile-16-handoff-seal.json`.
**Reviewer:** Claude reviewer agent (Opus 5.5). This is a fresh session,
independent of the trial 16 coder session and of earlier reviewers. It ran no
subagents.
**Date:** 2026-10-08

## Summary

Trial 16 adds one narrow Codex 0.160.1 witness. It covers the measured
welcome viewport, where the first-turn `Working` row sits at row 33, three
rows above the composer at row 36. That layout now classifies as busy. It
can confirm a submission only on the first Enter, with the exact prompt echo
at row 15 and every ask frame bound to the same server, pane, pane PID and
geometry. I reproduced the RED, all nine guard mutations, plus extra
adversarial ones, and the 253/253 focused GREEN. I also verified every hash.

**OK** for the trial 16 candidate as bound by its file map. Status:
**implemented, reviewed OK (trial 16)**. Nothing is integrated, promoted or
released.

## Checks

- [x] **Binding.** All 36 entries in `A_0_4-live-profile-16-files.json` and
  both entries in the handoff seal matched the working tree before this
  verdict was written. In `A_0_4-live-profile-16-entry.json`, HEAD and branch
  match. 32 of its 36 hashes still match. The 4 that differ are exactly the
  files the handoff says changed: `base_adapter.js`,
  `prompt_submission.test.js`, `gateway/README.md` and the reviews index.
  - The archived entry `base_adapter.js` (`2041f12a…`) equals the
    trial 15 bound source.
  - `claude_adapter.js`, `claude_first_prompt.test.js`, both Claude 2.1.294
    fixtures and `ci/suites.json` are unchanged.
  - All trial 15 review and evidence files are committed at HEAD and are
    unchanged: `git diff --quiet HEAD` on them exits 0.
  - Nothing changed under `policies/`.
- [x] **Delta scope.** I ran `diff -u` on the archived entry source against
  the candidate. All production hunks are in `base_adapter.js`:
  - **Classifier.** A new `welcomeWork` flag requires all of:
    - 120×40 geometry, composer `start === 36` and footer `=== 39`
    - 41 captured lines with an empty final line
    - the exact `>_ OpenAI Codex (v0.160.1)` header on row 1
    - strict `codexWorking` on row 33, blank rows 34–35 and
      `codexSpinnerStatus` on row 38

    `welcomeWork` is OR-ed into `modernWork` as a whole operand, so the
    operator precedence is correct. `workRow` is pinned to 33.
  - **`freshCodexWork`.** It now takes `pending` and `attempt`. For
    `welcomeWork` only:
    - it requires `attempt === 0`
    - it requires `ready` and `pending` to match `guard` on all five
      identity and geometry keys
    - the prior-Working history check also covers `pending`
    - the single exact echo must sit at index 15, with rows 16–32 blank

    The existing checks also still apply to the welcome path:
    - the echo must be new
    - the cell must have been blank in every prior frame
    - the preceding rows must be unchanged
    - there can be no intervening `› ` user turn
  - **Caller.** The one call site passes the extra arguments.
  - **Unchanged.** The non-welcome `modernWork` and source-profile paths,
    the transport, the delays, the retry budget and the Claude paths are
    unchanged.
  - **Not broad.** No standalone Working or spinner heuristic was added.
    Working outside this exact frame cannot confirm a submission.
- [x] **Initial busy refusal.** `welcomeWork` makes the frame `busy` in any
  phase, so `requireComposer(ready, "")` refuses before any input. The test
  asserts `busy` with no inputs and no leaked buffers.
- [x] **First Enter only.** On attempt 1, `freshCodexWork` returns false for a
  welcome frame, so the result is `acceptance_uncertain` after exactly
  `[paste, CR, CR]`. A completed-only reply (`later` frame) is uncertain after
  one Enter.
- [x] **RED reproduced independently.** I built my own `mktemp` scratch tree
  under the session scratchpad, with the candidate tests, fixtures and
  contracts, and the archived trial 15 source. Result: exit 1, **123 tests,
  121 pass, 2 fail**, 0 skipped, cancelled or todo. The two failures are
  exactly the `trial16 measured Codex welcome Working … one Enter` test and
  the `trial16 welcome Working refuses initial input as busy without keys`
  test. The coder's disclosed confounded first RED is correctly excluded as
  behavioral evidence.
- [x] **Guard mutations (my own runner, scratch only).** Each of the nine
  named guards fails at least one trial 16 test when removed:
  - attempt-zero: 1 fail (second-Enter/completed test)
  - `[ready, pending]` process binding emptied: 1 fail
  - `pending` alone dropped from that binding: 1 fail
  - pending history removed: 2 fail
  - echo position: 1 fail
  - blank rows 16–32: 2 fail
  - version header: 1 fail
  - Working marker: 1 fail
  - gap34: 1 fail
  - gap35: 1 fail

  Two adversarial extras also failed. Making welcome frames non-busy gave
  2 fail. Removing the `after`/`guard` identity check gave 2 fail, including
  the trial 5 replacement test. No working-tree file was altered.
- [x] **GREEN reproduced.** I ran the exact focused host command from the
  handoff on Node v22.22.1, with `A04_TEST_TMUX` set to tmux
  `3.6a-agents.3`. Result: exit 0, **253/253 pass**, 0 fail, cancelled,
  skipped or todo.
  - `python3 scripts/ci_gate.py --validate-only` exited 0 with no errors and
    0 suite tests, as disclosed.
  - `git diff --check` is clean.
- [x] **Tests assert emitted input.** Every acceptance and post-Enter
  refusal asserts the literal bracketed paste, the CR count and no leaked
  owned buffers. The decision-before-Enter case asserts the paste only, with
  no CR.
- [x] **Fixture sanitization.** The fixture contains no home path, user
  name, `/tmp` path, UUID-like ID, or live session ID or token. It uses
  synthetic server and pane IDs (`100`/`%12`/`200`).
  - Its ready frame's non-blank row layout (1, 2, 4, 6, 8–12, 36, 38, 39)
    matches root's latest Codex pre-ask pane.
  - The only differing rows are the sanitized header/path rows and the
    status/footer rows, and both versions still match the same footer
    regexes.
- [x] **Root live run (inspected locally, not copied).** I read the ignored
  private `workspace/root-a04-live-acceptance-result.json` and copied no IDs,
  paths, tokens or pane text from it. What it shows:
  - It ran at 2026-10-08T08:13:38Z, on candidate HEAD `8b04049`. That is
    after the final `base_adapter.js` mtime (10:06:28 +02:00).
  - Runtime: tmux `3.6a-agents.3`, codex-cli `0.160.1` and Claude Code
    `2.1.294`.
  - **Codex** (`gpt-6.1-sol`): `askReturned=true`, `acceptance=true`, and the
    token appears twice.
  - **Claude** (`claude-opus-5-5`, disposable trusted folder):
    `askReturned=true`, `acceptance=true`, and the token appears twice.
  - Both pre-ask panes are 120×40 with the cursor on row 36.

  Limits: the result records HEAD only, with no hash of the dirty tree. It
  does not record the Enter count or the post-ask frames. It supports, but
  does not by itself prove, live acceptance of this exact candidate.
- [x] **Rule 14 honesty.** The handoff claims no live acceptance,
  integration, promotion or release. It labels the pasted draft as simulated
  and the completed-only fixture as negative coverage.
- [x] **Global invariants.** Everything is in English. There was no policy
  edit, push, tag or commit. MCP naming and stderr logging are untouched.

## Documented limitation (not fixed by trial 16)

Root also observed one intermittent Codex pre-submit `unknown_state`. It
happened when the post-paste draft frame lacked the measured
`  tab to queue message` footer. The draft-phase classifier still admits a
pasted draft only with the queue footer, or with the trial 7 warnings-footer
draft layout. Trial 16 does not change that path, and neither the handoff
nor `gateway/README.md` claims to fix it.

The refusal fails closed, before Enter. That is safe, but the live first
ask is not reliable in that state. It stays an open limitation for A/0/04's
live criterion. A later trial should record it in `gateway/README.md` with
measured evidence before any change is made. I am recording it here because
I may not edit the docs.

## Non-blocking notes

1. Three `welcomeWork` conjuncts survive removal, because other checks
   already cover them:
   - The 120×40 geometry conjunct is covered by the warnings-footer and
     queue-footer 120×40 requirement, plus the guard identity binding.
   - The 41-line/final-empty conjunct is covered by the capture height.
   - The row-38 spinner conjunct is weaker: `codexGap` would still admit
     an idle `codexLiveStatus` row there.

   The spinner conjunct is defense in depth, and the handoff does not claim
   mutation coverage for it. A future test should replace row 38 of the
   `after` frame with the idle live-status row, so that removing the spinner
   pin is detected.
2. The delta patch shows only `base_adapter.js` and the test file. I checked
   the `gateway/README.md` and index changes directly with `git diff`. The
   README text matches the code.
3. Inherited: process provenance is the tmux server, pane and pane-shell
   PID, not the Codex PID. A change that reverts between two captures is not
   proven detectable.
4. Updating the reviews index to record this verdict changes
   `plan/PROJECT_V6/reviews/README.md`. That file's hash in the trial 16 file
   map is therefore expected to differ after this verdict. Every other bound
   path is unchanged.

## Outstanding (not claimed here; root-owned)

- [ ] Full gate `bash scripts/ci.sh`: not run by me.
- [ ] Live acceptance for both providers, bound to this exact dirty-tree
  candidate, with the Enter count and both pane snapshots recorded as the
  sheet requires.
- [ ] The intermittent Codex missing-queue-footer `unknown_state` limitation
  described above.
- [ ] Integration: the candidate is uncommitted. I did not stage or commit
  anything.

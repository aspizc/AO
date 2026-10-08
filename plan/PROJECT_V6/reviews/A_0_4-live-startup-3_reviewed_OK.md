# Review A_0_4-live-startup-3 — OK

**Task:** plan/PROJECT_V6/A/0/04.md (Codex 0.160.1 startup-notice Working witness)
**Trial:** 3
**Branch:** feat/V6-A-0-04-live-startup-profile
**Commit:** none. The candidate is uncommitted on base `82f8e7455faec213edf054f70e3e47ffab1406a4`.
**Reviewer:** Claude reviewer agent (claude-opus-5-5, medium effort), independent of the coder session
**Date:** 2026-10-08

## Summary

Trial 3 adds `codexUpdateWelcomeWork`. It is a strict busy profile for the
raw Codex 0.160.1 viewport where the header sits at row 9. That profile feeds
the unchanged first-Enter `freshCodexWork` proof, so a fresh first ask on this
layout can be confirmed instead of ending in `acceptance_uncertain`. I
reproduced the behavioural RED against `82f8e74`, the focused GREEN, and all
18 mutations. The only surviving mutant is the inherited `new-echo` conjunct,
which the coder disclosed; it is equivalent for this profile (observation 1).
Submission transport is unchanged. **OK**, for a fixture-level first-ask
witness only. This verdict claims neither full A05 live acceptance nor a
release.

## Review identity and evidence chain

- Gateway trace: `tr-v6-a04-startup-r3-b028077f-8904-4f5a-854c-67282941aa31`
- Gateway task: `ts-8e9cbd07-bfce-493a-adb9-5efe639aa2e2`
- Gateway session: `ag-tr-v6-a04-startup-r3-b02-claude-code-reviewer`
- This is a new reviewer session. It is not the trial-1 or trial-2 reviewer.
- **Handoff seal:** `to_review` `35a51c9c…d315f` and `files.json`
  `ee798ded…b9995e` both match.
- **File map:** all 16 hashed paths in `files.json` match the worktree.
  All 27 entries in `entry-hashes.json` match, so the prior trial-1/2 review
  files are intact.
- **Source binding:** the base adapter at `82f8e74` hashes to
  `a4702838…5da62`, and the candidate hashes to `9636c498…afaf`. Both match
  `binding.json`.
- **Scope:** `git diff --numstat` shows 4 tracked files. The test file has
  +102/−0, so no existing test was edited. Nothing changed under `policies/`
  or in earlier review files.

## Checks

- [x] **Files:** the changes match the handoff's file list.
  - `base_adapter.js`: header predicates moved into
    `codexUpdateWelcomeHeader`, a new `codexUpdateWelcomeWork`, and one early
    branch in `classifyProviderPane`.
  - `gateway/README.md`: one paragraph and a one-word qualifier.
  - The new working fixture.
  - The original draft fixture: its `sourceKind` clause only, which closes
    trial-2 observation 1. Snapshot bytes are unchanged.
  - Eight `startup3` tests.
- [x] **TDD RED reproduced:** I ran a copy of the coder's runner with its
      output moved to my scratchpad. The `82f8e74` adapter was combined with
      the final tests and fixtures, and the run exited 1 with exactly 2
      failures:
  - `startup3 raw fresh update welcome Working confirms the exact prompt after one guarded Enter`
  - `startup3 measured Working refuses initial input in every phase`
- [x] **Focused GREEN reproduced:** the handoff's 11-file `node --test`
      command with `A04_TEST_TMUX` (tmux 3.6a-agents.3, Node v22.22.1) gave
      **299 pass, 0 fail, 0 skipped/cancelled/todo**.
- [x] **Static checks:**
  - `npm --prefix gateway run lint`: exit 0.
  - `check_public_hygiene.py`: 0 findings.
  - `ci_gate.py --validate-only`: exit 0.
  - `git diff --check`: clean.
- [x] **Mutations:** 18 mutants were run, and 17 are killed, matching
      `mutations.json`. Each layout conjunct is killed by a `startup3` test:
  - geometry, cursor, capture, `working` and `cwd-status` by test 146;
  - width, header and spinner by test 149;
  - echo-shape by test 150;
  - blank-history, placeholder, gap and footer by tests 146 and 149.

  The inherited freshness mutants are killed by older tests:
  - after-process by tests 90, 121 and 147;
  - first-enter by test 123;
  - prior-working by test 89;
  - prefix by tests 90, 119 and 146.

  `new-echo` survives, as disclosed.
- [x] **Strict guards:** the profile requires:
  - pane 120×40, cursor 36/2, 41 rows ending with an empty final slot, and
    every row within the pane width;
  - the exact notice and header rows 0–9, a cwd at row 10, the pinned
    88-greeting slot at row 12, and space-only padding;
  - exactly one printable-ASCII `› ` cell at row 15, the strict
    `codexWorking` line at row 33, and spaces only in rows 13–35 otherwise;
  - the placeholder composer at row 36 and a blank row 37;
  - spinner status at row 38 that starts with the header cwd;
  - the exact shortcuts/2-warnings footer at row 39.

  The branch runs after `activeDecision`, so menus are still classified first.
  Its result sets `welcomeWork`, which triggers the inherited first-ask rules
  in `freshCodexWork`:
  - attempt 0 only;
  - the same server, pane, PID and geometry across all four frames;
  - no Working row in ready, pending or guard;
  - one exact echo at row 15, with rows 16–32 blank;
  - a blank insertion cell, and unchanged preceding rows.

  A long prompt that wraps fails the row-15 echo check and ends in
  `acceptance_uncertain`, which is the safe outcome.
- [x] **Transport unchanged:** the diff touches no code in `submitPrompt`,
      `guardedSubmit`, `freshCodexWork` or tmux.
  - `startup3OneEnter` asserts the emitted bytes: exactly one bracketed paste
    and one CR, one `agents-submit-v1`, no `send-keys`, and zero owned
    buffers left behind.
  - The initial-input refusal (`busy`) asserts that no input was sent.
- [x] **Negative tests:** each case below is refused with exactly one Enter
      and `acceptance_uncertain`, or with no input at all:
  - a missing, changed, duplicated or shifted echo;
  - an old echo or a stale Working row in the ready, pending or guard frame;
  - a menu, or a spoofed header, greeting, status, footer, gap or cursor;
  - a changed server, pane or PID in any frame;
  - `◦ Working`, a completed reply, or a pending draft after Enter;
  - padding past the width limit, other glyphs, or a duplicated notice.
- [x] **Fixture shape and provenance:** I checked the four captures directly.
  - Each has 41 rows ending in `""`, and no row is longer than 120.
  - Row 9 is the header. Row 10 is 92 characters, matching trial 2.
  - Row 15 is an 86-character echo of the 84-character synthetic prompt.
  - Row 33 reads `• Working (1s…)` in capture 0, `(2s…)` in capture 1 and
    `◦ Working (3s…)` in capture 2. In capture 3 it is spaces, and row 18
    holds a synthetic response of preserved length.
  - Row 38 is 119–120 characters, and row 39 is 119.

  `sourceKind` labels the equal-length replacements, the reconstructed cursor
  and process metadata, and that ready, draft and guard are reconstructed from
  capture 0. It states that this is not live acceptance evidence.
  `privateRawSha256` lists four hashes that agree with `binding.json`. I could
  not inspect the private raw files themselves.
- [x] **Docs:** the README paragraph states:
  - the recognition boundary;
  - the reuse of the freshness proof;
  - that the evidence is delayed and reconstructed;
  - that `◦ Working` and completed-only output are unconfirmed;
  - that no polling, timing or retry was added.

  `docs-final.log.gz` is included. Tool-error serialization and projection
  tests pass within GREEN.
- [x] **Private hygiene:** I checked every new or changed file, including the
      decompressed `.gz` logs and the tracked diff. None contains `/home/`,
      the operator's name or email address.
- [x] **Global invariants:**
  - Code and docs are in English.
  - The coder made no commit, push or staging.
  - There is no `policies/` edit, and no status, release or A05 edit.
  - `agents-gateway` naming and stderr logging are unchanged.
  - The async approval flow is untouched.
  - No new retry, poll or Enter authority was added.

## Non-blocking observations

1. **The `new-echo` survivor is equivalent for this profile.** The pending
   and guard frames must pass `codexUpdateWelcomeDraft` in the warning-draft
   branch, which requires rows 13–35 to be blank. The guard is the last frame
   before Enter, so an echo at row 15 in the post-Enter frame cannot come
   from the guard. The ready frame is already constrained: row 15 must be
   blank, rows 0–14 must be identical, and there must be no Working row. A
   ready frame with an identical echo lower down would need history to vanish
   before the pending frame, and the pending and guard frames would still
   anchor freshness. The conjunct remains load-bearing for other layouts that
   share `freshCodexWork`; it was correctly left in place.
2. **First-Enter and prior-Working rules are covered only by inherited
   tests** (`trial16`, `trial5`), not by a `startup3` fixture. Because the
   welcome-work rules are shared, that is acceptable. A future
   startup-specific second-Enter case would make the intent local.
3. **Evidence boundary.** The pre-Enter frames, cursor and process IDs are
   reconstructions. Confirmation still depends on Gateway-observed frames
   matching capture 0/1 inside the existing bounded window.

## Operator live run (reported only, not verified by this reviewer)

- **Reported result:** a new operator live run used trial-3 source
  byte-identical to the candidate. The operator reports:
  - first-ask success with the exact response;
  - a successful Gateway restart and reattach;
  - a **second ask** blocked before paste by a distinct post-turn `R…`
    status line.
- **Why the block is safe:** it is a pre-paste refusal, so no input reaches
  the pane. This is the existing unknown/busy guard working, not a defect in
  this candidate.
- **Follow-up needed:** recognising that post-turn status for later asks is a
  **separate follow-up**. It needs its own measured profile and review.
- **Not verified by me:** I ran no live provider session, and I could not
  check the operator's frames, Enter count or cleanup.

## Limits of this verdict

- No full A05 live acceptance claim, and no promotion or release claim
  (Rule 14). The second-ask path remains open.
- Not run: the full `bash scripts/ci.sh`, which is root-owned, and any live
  tmux/provider acceptance.
- Per the brief, this verdict is not committed and not indexed in
  `reviews/README.md`. I made no code, policy or prior-review edits. The
  orchestrator owns the commit, the index entry and integration.

## Next step

OK → the orchestrator may commit the candidate and this verdict with explicit
pathspecs, then index the verdict. The post-turn `R…` second-ask status needs
its own sheet or trial.

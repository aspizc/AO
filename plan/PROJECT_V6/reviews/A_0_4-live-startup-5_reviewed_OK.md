# Review A_0_4-live-startup-5 — OK

**Task:** plan/PROJECT_V6/A/0/04.md (Codex 0.160.1 second-turn post-Enter confirmation)
**Trial:** 5
**Branch:** feat/V6-A-0-04-live-startup-profile
**Commit:** none. The candidate is uncommitted on base `3504b498b58c8ba98d3321da57ad77a305a4e65f`.
**Reviewer:** Claude reviewer (claude-opus-5-5, medium effort), independent of the coder session
**Date:** 2026-10-08

## Summary

Trial 5 adds `freshCodexSecondTurn`. It is a Codex-only confirmation witness
that runs only after the existing single guarded Enter. It accepts exactly two
measured post-Enter shapes for the trial-4 post-turn layout:

- a fresh prompt echo at row 23 plus the `Working` row at 33;
- a fresh prompt echo at row 23 plus a new ASCII assistant cell at 26 and a
  new completion at 28.

In both shapes, the rest of history must be blank, rows 0–22 must be
unchanged, and composer, status and footer must equal the ready frame.

I reproduced the following independently:

- the final RED;
- the focused GREEN;
- all 24 coder mutants;
- the seal, the file map and the prior-trial hashes;
- base equivalence;
- the three newly pinned upstream sources.

I also ran 6 extra adversarial tests against the candidate and the 7
survivors.

- Six survivors are equivalent at the submission level.
- One survivor (`capture`) is not redundant, but only for a truncated capture
  that tmux cannot produce at a fixed pane height. The candidate keeps that
  guard. See observation 1.

No path sends a second Enter, replays, or confirms on old, partial, drifted or
unknown state. **OK**, at fixture level only. This verdict does not claim live
second-ask acceptance, A05 acceptance, integration or release.

## Review identity and evidence chain

- Gateway trace: `tr-v6-a04-startup-r5-c4d111fb-c28b-406f-8328-93dfbc9ea19a`
- Gateway task: `ts-3594129d-e113-474d-b672-8ab274685c5b`
- This is a new reviewer session. It is not a reviewer from trials 1–4, and it
  spawned no sub-agents.
- **Candidate identity:**
  - `git diff 3504b49` covers 3 tracked files (README +18/−2, adapter +30,
    test +107). Its SHA256 is
    `61c67096199f74c723eb831204a09cc170344100cb81fc1761acec35da06738c`.
  - **Code tree** `0a243817f091d10146b0393246a1afc7ecf28632`: the `3504b49`
    tree plus the 3 tracked files and the new fixture. I built it with a
    throwaway `GIT_INDEX_FILE`, so the worktree index was not touched.
  - **Full tree** `6378ef47a30a424723ae60380b48a1646062f11d`: the code tree
    plus the handoff and the 15 `evidence/A_0_4-live-startup-5-*` files.
- **File hashes:**
  - `base_adapter.js` `bc039cb5…99e7`
  - test file `6d534b1d…ad47`
  - README `30c088c1…0977`
  - fixture `345ebc09…f6`
- **Handoff seal:** the `to_review` hash `4a68f0c8…474` and the `files.json`
  hash `7cf1e461…070d` both match `handoff-seal.json`.
- **File map:** all 18 paths in `files.json` match the worktree. All 54
  entries in `entry-hashes.json` match, so the files from trials 1–4 are intact.
- **Source binding:**
  - At `3504b49`, the base adapter hashes to `7cd947a4…1278`, as the binding
    states.
  - I removed exactly the new helper and its 3-line call from the candidate.
    The result is byte-identical to the base adapter.
  - So classification, the pre-Enter guards, `guardedSubmit`,
    `freshCodexWork`, transport, delays and retry are unchanged.

## Checks

- [x] **Scope:**
  - The adapter change is one function plus one call, placed after the Enter
    and the Claude branch and before the existing busy/composer handling.
  - Test changes are additions only, with 0 removed lines.
  - There is one new fixture, and the README paragraph is updated.
  - Nothing changed under `policies/`. There is no status, A05, index,
    release or prior-trial edit.
- [x] **TDD RED reproduced:** I ran a copy of the coder runner, with its
      `/tmp` outputs moved to my scratchpad. With the `3504b49` adapter and the
      final tests, it gave 166 tests: 164 pass and exactly the 2 named
      failures (159 and 164). The mutant source hashes and failure lists match
      `mutations.json` exactly. The claimed ordering of the earlier,
      unarchived RED is the coder's own record.
- [x] **Focused GREEN reproduced:** I ran the 11-file command with
      `A04_TEST_TMUX` (tmux 3.6a-agents.3, Node v22.22.1). Result: **315 pass,
      0 fail, 0 skipped/cancelled/todo**.
- [x] **Exactly one Enter:** `startup5OneEnter` asserts all of the following
      for every confirming and refusing case:
  - only the bracketed paste plus one CR;
  - one `agents-submit-v1`;
  - no leaked buffer.

  Witness-only frames get no paste (`unknown_state`). In my extra test, an
  unchanged draft followed by a Working frame still produced one CR and
  `acceptance_uncertain`. The attempt-1 warning-draft guard throws before any
  second Enter.
- [x] **Unchanged history and footer:**
  - Rows 0–22 of `after` must equal ready, pending and guard.
  - Rows 36–40 must equal ready.
  - The echo must be unique, and must be absent from rows 0–35 of all prior
    frames. A repeated identical prompt is therefore refused.
- [x] **Fail-closed:** these all end in `acceptance_uncertain` after one Enter:
  - partial reply, old ready frame, unchanged draft;
  - drift in process, PID, target, mode, cursor or geometry;
  - extra LF, over-width rows, tabs;
  - spoofed menus, a misplaced completion, a malformed clock;
  - a non-ASCII or empty reply;
  - the echo moved to row 24 or row 37 (extra test);
  - Working and completion present together (extra test);
  - a menu-like reply in history (extra test).

  A first-welcome layout cannot borrow the witness.
- [x] **Mutations:** 17/24 killed, as reported. I assessed each survivor
      individually:
  - `attempt`: equivalent. A warning draft at attempt 1 throws in the
    existing guard block before `guardedSubmit`. A non-warning pending fails
    the helper's own `warningDraft` check.
  - `warning-binding`: equivalent. The helper requires the ready frame to be
    `codexPostTurnPane` and pending rows 0–22 to equal ready. With this header,
    the only draft classifier that can return `composer` is
    `codexPostTurnPane`'s draft phase, which always sets `warningDraft`. The
    generic warning branch needs blank history, and the shifted-header guard
    returns `unknown_state`. My extra test, with a ready footer on the draft,
    got `unknown_state` and no Enter.
  - `prompt-ascii`: equivalent.
    - A non-ASCII prompt is refused by the trial-4 draft profile before Enter.
    - A trailing-space prompt can never match the right-trimmed echo
      comparison. My extra test got one CR and then `acceptance_uncertain`
      under the mutant.
    - Removing `attempt`, `warning-binding` and `prompt-ascii` together also
      passes all 14 startup5 and extra tests.
  - `new-echo`, `unique-echo`, `prior-echo`: each one alone is equivalent.
    - Rows 24–35 admit only blank, `•`-prefixed, `Worked` or `Working` rows.
    - Rows 0–22 and 36–40 are pinned to the prior frames.
    - So a `› prompt` row can only appear at row 23, and only once.
    - The pairwise compound mutants are killed.
  - `capture`: **not purely redundant** (observation 1).
- [x] **Provenance:**
  - I fetched the three newly bound `rust-v0.160.1` files. All match
    `binding.json`: `messages.rs` `df4e0da0…`, `separators.rs` `403e09b7…`,
    `completion.rs` `64b0b4c9…`.
  - The source shows:
    - `› ` user prefix: `messages.rs:235–237`;
    - `• ` assistant prefix: `messages.rs:389`, `457` and others;
    - `Worked for {elapsed}` joined with ` • `: `separators.rs:74–93`.
  - Elapsed times of 60s or more render as `Xm Ys` and are deliberately
    unsupported, so they stay uncertain.
- [x] **Fixture:**
  - All five frames have 41 rows, end with `""`, and no row exceeds 120
    columns.
  - Row lengths match across frames: cwd row 92, rows 15/18/23/26 at
    86/76/86/69, status row 120.
  - `completed` and `completedRepeat` are byte-identical, which matches the
    two identical raw hashes.
  - The fixture's `privateRawSha256` matches the binding.
  - `sourceKind` discloses what is reconstructed: metadata and the pre-Enter
    draft.
  - The synthetic reply is the reversed synthetic nonce.
  - I could not inspect the private raw panes, so I cannot confirm that the
    replacement was equal-length beyond the internal length consistency
    above.
- [x] **Static checks:**
  - `npm --prefix gateway run lint`: exit 0.
  - `check_public_hygiene.py`: exit 0.
  - `git diff --check`: clean.
  - No `/home/`, user name or email appears in any new or modified file,
    decompressed `.gz` logs included.
- [x] **Docs and invariants:**
  - The README states the bounded witness, what it does not prove (reply
    semantics, screen authenticity) and the operator-owned live boundary.
  - English throughout, and `agents-gateway` naming is unchanged.
  - No commit, staging or push.

## Non-blocking observations

1. **The `capture` survivor is a test gap, not overlap.** The handoff says the
   ready-tail and prefix comparisons cover row count and the final LF. That is
   true for longer captures, but not for shorter ones:
   `rows.slice(36).some(...)` compares only the rows that exist.
   - My extra test truncated the `after` snapshot to 38 rows, dropping status,
     footer and the final LF. The `capture` mutant **accepted** it. The
     candidate refuses it.
   - This is not reachable in practice. `observe` binds width and height to
     tmux, and a capture of a 40-row pane always emits 40 rows.
   - The guard is real defense in depth, and the candidate keeps it.
   - Suggested follow-up, not required for this trial: add a truncated-capture
     case to the startup5 drift test so that removing the guard is caught.
2. **The reply check is lexical, and the witness is screen text.** Any
   printable-ASCII `• …` cell at row 26 with a new completion at 28 confirms
   submission. This is safe as submission evidence, because the fresh unique
   echo and the new completion only appear after this Enter. It is not ACK
   validation, which stays with the live harness, as the handoff states.
3. **Narrow by design.** These cases all remain `acceptance_uncertain` (safe,
   no replay):
   - a capture taken while only the partial `• ACK:` frame is visible;
   - a turn of 60s or more;
   - wrapped or Unicode replies;
   - a third turn.

   The live second ask may still report uncertain if `tmuxAskDelayMs` samples
   the partial frame.
4. **The runner writes to `/tmp`.** It is evidence only. I ran a copy that
   writes to the scratchpad.

## Limits of this verdict

- Not independently observed:
  - the raw captures;
  - the operator's live first ask, restart, reattach and second ask;
  - the claim of exactly one live Enter.

  The cursor and process metadata and the draft and guard frames are
  reconstructions.
- Not run:
  - the full `bash scripts/ci.sh`, which is root-owned;
  - `ci_gate.py` inventory refresh and validate-only;
  - any live tmux or provider session.

  The live two-ask and restart acceptance remains operator-run.
- No integration, promotion or release claim (Rule 14).
- Per the brief, I did not commit this verdict or index it in
  `reviews/README.md`. I did not edit the candidate, the handoff, prior
  reviews or policies.

## Next step

OK → the orchestrator may commit the candidate, its evidence and this verdict
with explicit pathspecs, then index the verdict. Then:

1. The operator repeats the live A05 restart, reattach and second-ask
   acceptance on the reviewed tree.
2. Optionally, a later trial adds the truncated-capture test from
   observation 1.

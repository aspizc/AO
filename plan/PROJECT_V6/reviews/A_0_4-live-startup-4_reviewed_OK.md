# Review A_0_4-live-startup-4 — OK

**Task:** plan/PROJECT_V6/A/0/04.md (Codex 0.160.1 post-turn clipped `R…` Ready profile)
**Trial:** 4
**Branch:** feat/V6-A-0-04-live-startup-profile
**Commit:** none. The candidate is uncommitted on base `fecc3e510f8aa40ada1b11c69c96df329d46d960`.
**Reviewer:** Claude reviewer (claude-opus-5-5, medium effort), independent of the coder session
**Date:** 2026-10-08

## Summary

Trial 4 adds `codexPostTurnPane`. It is a strict Codex-only classifier for one
measured viewport: a completed single-line turn after explicit reattach, with
the idle `Ready` label clipped to `R…` by an 87-column cwd at 120×40.

- The ready phase returns an empty composer, so the unchanged path may paste.
- The draft phase returns the inherited `warningDraft` marker. The first Enter
  therefore stays behind the existing attempt-0, stable-capture, process and
  ready-prefix bindings.

I independently reproduced the RED, the focused GREEN, all 23 coder mutants,
and the pinned upstream source hashes and clipping arithmetic. Of 5 extra
mutants I wrote, 2 are killed. The 3 survivors are equivalent at the
submission level (observation 1). No path sends an Enter on unknown, drifted
or old-response state. **OK**, for fixture-level readiness only. This verdict
does not claim second-ask acceptance, A05 live acceptance, integration or a
release.

## Review identity and evidence chain

- Gateway trace: `tr-v6-a04-startup-r4-1ff494f6-cc58-439b-8631-5fdc61f09afb`
- Gateway task: `ts-b4f8a96f-73b4-4d65-8f65-a7bb466452f2`
- This is a new reviewer session. It is not the trial-1, 2 or 3 reviewer, and
  it spawned no sub-agents.
- **Candidate identity:**
  - `git diff fecc3e5` (3 tracked files, +146/−3) has SHA256
    `afe5a2d26d7e0fa9c5a0c8712c7cc8f29da6370c8d9c82396b9de9fef38bb080`.
  - The code tree adds the 3 tracked files and the new fixture to `fecc3e5`.
    I built it with a throwaway `GIT_INDEX_FILE`, so the worktree index was
    not touched. Tree: `5961b1b2ed0683a547bab20c702d350c84893016`.
  - The same tree plus the handoff and the 11 `evidence/A_0_4-live-startup-4-*`
    files: `b451c9453ac71b881c473c9e2bdc81f2dedaeca1`.
- **File hashes:** `base_adapter.js` `7cd947a4…`, test file `e3fdd501…`,
  README `3615655b…`, fixture `aff01537…`.
- **Handoff seal:** `to_review` `52cb0d2c…ee0db43` and `files.json`
  `949fed77…45dcd` both match.
- **File map:** all 14 paths in `files.json` match the worktree. All 41 entries
  in `entry-hashes.json` match, so the prior trial-1/2/3 review files are
  intact.
- **Source binding:** the base adapter at `fecc3e5` hashes to
  `9636c498…afaf` and the candidate to `7cd947a4…1278`, as `binding.json` says.

## Checks

- [x] **Scope:** `git diff --numstat` shows 3 tracked files (README +17,
      adapter +25, test +104/−3). There is one new fixture, and the rest is
      handoff and evidence.
  - The 3 removed test lines are the `startupFixture` helper, which gained an
    optional `prompt` argument that defaults to the old value. No existing
    assertion changed.
  - `submitPrompt`, `guardedSubmit`, `freshCodexWork` and tmux transport are
    unchanged. The adapter diff is one new function plus a two-line call.
  - Nothing changed under `policies/`, and there is no status, release, A05
    or index edit.
- [x] **TDD RED reproduced:** I ran a copy of the coder's runner, with its
      `/tmp` outputs moved to my scratchpad. The `fecc3e5` adapter with the
      final tests and fixture gave exit 1 with exactly 3 failures, the ones
      the handoff names (tests 151, 152 and 156):
  - `startup4 completed turn with cwd-bound clipped Ready permits exactly one guarded Enter`
  - `startup4 measured empty composer and visible draft are phase and exact cursor bound`
  - `startup4 prior response or unchanged draft never confirms a second ask or permits retry`

  The claim that the earlier "6 tests, 3 pass" RED came before the production
  edit is the coder's own record. I cannot check it after the fact.
- [x] **Focused GREEN reproduced:** the handoff's 11-file command with
      `A04_TEST_TMUX` (tmux 3.6a-agents.3, Node v22.22.1) gave **307 pass,
      0 fail, 0 skipped/cancelled/todo**.
- [x] **Static checks:**
  - `npm --prefix gateway run lint`: exit 0.
  - `ci_gate.py --validate-only`: exit 0, but it executes 0 suite tests.
  - `check_public_hygiene.py`: 0 findings.
  - `git diff --check`: clean.
- [x] **Mutations:** all 23 coder mutants fail at least one relevant test,
      which matches `mutations.json`.
  - Profile conjuncts are killed by `startup4` tests 153, 154, 157 and 158.
  - `first-enter`, `stable-capture`, `process` and `ready-prefix` are also
    killed by `startup4` tests 155 and 156, as well as by older trial-17 and
    startup tests.

  My 5 extra mutants:
  - `warningDraft: false` (draft skips the inherited Enter bindings): killed
    by tests 155 and 156.
  - `R…` relaxed to any status suffix: killed by test 154.
  - Removing `!text`, the placeholder-equality check, and
    `cursorX >= width`: all three survive. See observation 1.
- [x] **Provenance:** I fetched the three `rust-v0.160.1` files. All three
      SHA256 values match `binding.json`:
  - `status_surfaces.rs` `e96ac7db…`
  - `status_surface.rs` `454cabfa…`
  - `line_truncation.rs` `f0561006…`

  The source supports the profile:
  - `run_state_status_text` returns `Ready` only when no task is running and
    MCP startup is finished. The other labels are `Starting`, `Working`,
    `Waiting` and `Thinking`, and none of them starts with `R`.
  - `truncate_line_with_ellipsis_if_overflow` keeps `max_width − 1` columns
    and appends `…`.
  - The status prefix is 28 columns, plus the 87-column cwd, giving 115.
    The full ` · Ready` would end at column 123. Clipping to 120 leaves
    exactly ` · R…`. The fixture's row 38 is 120 columns and ends in `R…`.

  I could not inspect the private raw panes. Their hash (`f41f0515…`, listed
  twice as byte-identical) is recorded in the fixture and the binding.
- [x] **Fixture:** ready and draft each have 41 rows, a final `""`, and rows
      that fit in 120 columns.
  - Row 10's cwd is 87 characters.
  - Row 15 is `› ` followed by the 84-character `priorPrompt`, which differs
    from the new prompt.
  - Row 18 is the reply, and row 20 is `  Worked for 5s • 14:23`.
  - Ready has cursor 36/2. The draft has the 84-character prompt at row 36,
    cursor 36/86, and the warning-only footer.

  `sourceKind` says which parts are reconstructed: cursor, modes, process
  metadata, and the draft and guard frames.
- [x] **Safety of Ready recognition:** `activeDecision` still runs first.
      I also checked the profile directly and through `submitPrompt`.
  - **Refused before paste** (`unknown_state`): a Working, Starting or Thinking
    status label (`W…`, `S…`, `T…`), the full `Ready` label, a different cwd
    length, a Working row at row 33, a queue footer, a stale draft, extra or
    missing history, and a malformed or altered clock.
  - **Phases:** the ready frame is refused in the draft phase, and a draft is
    refused in the ready phase. An unknown phase is refused.
- [x] **No unsafe Enter:** across ready, pending and guard, Enter is never
      sent on any of these (tests 155 and 157):
  - a changed process, target or PID;
  - changed history, status, padding or footer;
  - a changed payload;
  - a non-ASCII, empty, placeholder or multi-line draft.

  After the one guarded Enter, two cases end in `acceptance_uncertain` with
  exactly one CR and no leaked buffer (test 156):
  - the old Ready pane, so the old reply and completion do not confirm;
  - an unchanged draft, so there is no retry.
- [x] **Docs and invariants:**
  - The README paragraph states the readiness-only boundary, the
    reconstructed draft, and that second-turn acceptance is outstanding.
  - Code and docs are in English, and `agents-gateway` naming is unchanged.
  - No commit, staging or push was made.
  - No `/home/`, user name or email appears in the new files, decompressed
    `.gz` logs included.

## Non-blocking observations

1. **Three defensive draft conjuncts are untested, and their mutants are
   equivalent:**
   - Without `!text`, an empty draft can never satisfy
     `requireComposer(pending, prompt)`, because the prompt is non-empty.
   - Without the placeholder check, the placeholder at cursor 2 still fails
     `cursorX === text.length + 2`.
   - `cursorX >= width` cannot be reached. tmux reports `cursorX ≤ width − 1`,
     and a 118-character draft would wrap off row 36.

   None of these removals can produce an Enter that the base adapter would
   refuse.
2. **The row-18 reply check is lexical.** For example, `• Working (1s)` is
   accepted in that slot. Busy panes are still excluded, because the idle
   proof is the source-backed `R…` status: `Working`, `Waiting`, `Thinking`
   and `Starting` clip to other letters and are refused. The profile does not
   check what the old reply says, as the handoff states.
3. **Successful second asks will probably report `acceptance_uncertain`.** I
   found no post-Enter profile for this layout that `freshCodexWork` would
   accept. The result is safe, with one Enter and no replay. But a successful
   live second ask may still return `AGENT_PROMPT_NOT_SUBMITTED`
   (`acceptance_uncertain`) instead of success. Confirming the second ask
   would need its own measured post-Enter profile.
4. **The coder-shipped runner writes to `/tmp`.** It is evidence, not product
   code. I ran a copy that writes to the scratchpad instead.

## Limits of this verdict

- The draft and guard frames, the cursor and the process metadata are
  reconstructions. The live post-paste shape has not been observed and may
  still be refused.
- Not run:
  - the full `bash scripts/ci.sh`, which is root-owned;
  - any live tmux or provider session;
  - the A05 restart, reattach and second ask, which remain operator-run.
- No integration, promotion or release claim (Rule 14).
- Per the brief, I did not commit this verdict, did not index it in
  `reviews/README.md`, and did not edit code, the handoff, prior verdicts or
  policies.

## Next step

OK → the orchestrator may commit the candidate, its evidence and this verdict
with explicit pathspecs, then index the verdict. Then:

1. The operator runs the reviewed tree through real A05 recovery and the
   second ask.
2. If the second ask reaches `acceptance_uncertain` (observation 3), a new
   trial needs a measured post-Enter capture to define its confirmation
   profile.

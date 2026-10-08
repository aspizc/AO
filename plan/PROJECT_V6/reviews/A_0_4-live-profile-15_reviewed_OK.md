# Review A_0_4-live-profile-15 — OK

**Task:** plan/PROJECT_V6/A/0/04.md
**Trial:** 15 (live-profile series)
**Branch:** feat/V6-A-0-04-safe-submit
**Commit:** none. This is a dirty candidate on HEAD `3cf3e6a225e92eb08f1059bef28fe98028cdd5b9`.
It is bound by `evidence/A_0_4-live-profile-15-files.json` and
`evidence/A_0_4-live-profile-15-handoff-seal.json`.
**Reviewer:** Claude reviewer agent (Opus 5.5). This is a fresh session,
independent of the trial 15 coder session and of earlier reviewers. It ran no
subagents.
**Date:** 2026-10-08

## Summary

Trial 15 splits the fresh-spawn record into two parts. Process identity
(`serverPid`, `target`, `panePid`) is still bound from spawn through every
ask frame. Geometry is now pinned at the first-ask `ready` frame instead of at
spawn. A same-process, same-pane resize before the first ask therefore no
longer causes a false negative. Any resize during the ask still fails closed.
I reproduced the RED, the guard-removal mutations and the 246/246 focused
GREEN myself. I also verified every hash.

**OK** for the trial 15 candidate as bound by its file map. Status:
**implemented, reviewed OK (trial 15)**. Nothing is integrated, promoted or
released.

## Checks

- [x] **Binding.** All 35 entries in `A_0_4-live-profile-15-files.json` and
  both entries in the handoff seal matched the working tree before this
  verdict was written. In `A_0_4-live-profile-15-entry.json`, HEAD matches.
  `claude_adapter.js`, `ci/suites.json` and all 16 trial 14 review and
  evidence artifacts still hash as they did at entry. The only entry hashes
  that differ are the four files the handoff says it changed: `base_adapter.js`,
  the first-prompt test, `gateway/README.md` and the reviews index. The
  archived entry `base_adapter.js` (`9b74e1a0…`) equals the trial 14 bound
  source. Nothing changed under `policies/`.
- [x] **Delta scope.** I ran `diff -u` on the archived entry source against
  the candidate. There are three hunks, and all are in
  `gateway/src/adapters/base_adapter.js`:
  - `freshClaudeResponse` (2.1.293, lines 304-307) drops `width`/`height`
    from the spawn identity. It adds a conjunct that requires pending, guard
    and after to equal `ready` in width and height.
  - `freshClaude294Response` (lines 333-336) makes the same change.
  - `rememberFreshClaudeSpawn` (line 507) now records only
    `serverPid`/`target`/`panePid`.
  The 120×40 after-layout pin, cursor, mode, header, blank-history, echo,
  composer, footer and completion checks are byte-identical to trial 14. So
  are the 8-poll loop and the `submitPrompt` retry path.
- [x] **Same fresh process, no reused transcript.** Every frame (ready,
  pending, guard, after and each poll) must still match the spawn-recorded
  server PID, pane target and pane PID. Eligibility is still consumed
  synchronously before the ask (`base_adapter.js:520-522`). It is still
  cleared on kill and respawn, and limited to an unadorned executable path
  (`claude_adapter.js:338-346`). The blank-history rows (4–33) and the
  exact single echo cell are unchanged. They are now evaluated at the pinned
  120×40 geometry, because `after` must be 120×40 and must equal `ready`.
  A pre-ask resize cannot make a prior transcript count as fresh. It only
  removes the earlier requirement that the spawn snapshot was already 120×40.
- [x] **Resize before ask allowed, resize during ask uncertain.**
  - A geometry change on `ready` (with a valid shortcuts composer) or on
    `after` gets one paste and one CR, then `acceptance_uncertain`.
  - A change on `pending` or `guard` refuses before Enter with
    `unknown_state`. The composer identity includes the geometry.
  - A 2.1.294 poll resize fails immediately as uncertain, even if a later
    frame restores the original layout. The test asserts waits
    `[150, 1500, 1000]`.
  - The resize-and-revert-between-captures blind spot is disclosed and was
    already true before this trial.
- [x] **One Enter, no replay.** The tests assert one bracketed paste and one
  `\r` on every accept and every post-Enter failure path, and no leaked
  owned buffers. The Claude attempt-0 branch still either returns or throws
  inside the observation loop. A geometry mismatch after Enter cannot reach the
  composer retry with a matching identity, because the identity embeds
  width:height.
- [x] **Both Claude profiles.** The new tests are parameterized over the
  2.1.293 and 2.1.294 fixtures: accept after pre-ask resize, process-field
  replacement for each of the three keys, and geometry drift at all four
  stages × both dimensions. The 2.1.294 poll-resize test is additional. The
  prompt echo and the completed-response requirements are unchanged for both.
- [x] **RED reproduced independently.** I built my own `mktemp` scratch tree
  with the candidate tests, fixtures and contracts, and the archived trial 14
  source. Result: exit 1, **41 tests, 39 pass, 2 fail**, 0 skipped or
  cancelled. The two failures are exactly the two
  `trial15 <version> same-process pre-ask resize accepts…` tests.
- [x] **Guards fail when removed (my own mutations, scratch only).**
  - Geometry conjunct removed from both witnesses: 2 fail, the trial 15
    geometry-drift test for each version.
  - Geometry conjunct removed from the 2.1.293 witness only: 1 fail (2.1.293).
  - Geometry conjunct removed from the 2.1.294 witness only: 1 fail (2.1.294).
  - Spawn identity emptied in both witnesses: 7 fail. These include both
    trial 15 replacement tests and the trial 10, 12 and 14 identity tests.
  - Only `panePid` dropped from the identity: 6 fail, including both trial 15
    replacement tests.
- [x] **GREEN reproduced.** I ran the exact focused host command from the
  handoff on Node v22.22.1, with `A04_TEST_TMUX` set to tmux
  `3.6a-agents.3`. Result: exit 0, **246/246 pass**, 0 fail, cancelled,
  skipped or todo. A scratch copy of the candidate also gave 41/41 for
  `claude_first_prompt.test.js` alone. `python3 scripts/ci_gate.py
  --validate-only` exited 0 with no errors and 0 suite tests, as disclosed.
  `git diff --check` is clean.
- [x] **Docs.** The `gateway/README.md` wording matches the code. Process
  identity is bound from spawn. Geometry is pinned at the first ask to the
  measured 120×40 size. A pre-ask same-process resize is allowed, and a
  resize during the ask stays unproven.
- [x] **Root live run (inspected locally, not copied).** I read the ignored
  private `workspace/root-a04-live-acceptance-result.json` and copied no IDs,
  paths or pane text from it. What it shows:
  - It ran on 2026-10-08, about 2.5 minutes after the final
    `base_adapter.js` was written, on the trial 15 entry HEAD.
  - Runtime: tmux `3.6a-agents.3` and Claude Code `2.1.294`, with model
    `claude-opus-5-5` at medium effort in a disposable trusted folder.
  - `askReturned=true`, `acceptance=true`, and the token appears twice.
  - The pre-ask state is 120×40 with the cursor at (2, 36). Pre-ask
    non-blank rows are limited to the header (1–3) and the effort-hint,
    composer and footer area (34–39), so the history was blank.
  Limits: the result records the HEAD commit but no hash of the dirty
  tree. It does not record the spawn geometry or the Enter count. It has
  only one Claude result (2.1.294) and no Codex result. It supports, but
  does not by itself prove, live acceptance of this exact candidate.
- [x] **Rule 14 honesty.** The handoff labels the 80×24 spawn frame as
  synthetic and the root probe as supplied, not reproduced, evidence. It
  claims no integration, live acceptance, promotion or release.
- [x] **Global invariants.** Everything is in English. There was no policy
  edit, push, tag or commit. MCP naming and stderr logging are untouched.

## Non-blocking notes

1. Process provenance is the tmux server, pane and pane-shell PID, not the
   Claude PID. A Claude restart inside the same pane shell is not detected.
   The plain-launch rule and the blank-history and header checks guard
   against it. This limit is inherited and disclosed.
2. The `ready` frame's own geometry is checked only indirectly, through
   `after` being 120×40 and `after` equalling `ready`. The result is correct
   but implicit. An explicit `ready` 120×40 conjunct would read more clearly.
3. The inherited trial 13 and 14 note still holds: removing the final `throw`
   after the poll loop is not detected by any test.
4. For a full live-acceptance claim, the root's live result should bind the
   dirty-tree hash, the pre-ask resize and the input count. A Codex result is
   also still needed.

## Outstanding (not claimed here; root-owned)

- [ ] Full gate `bash scripts/ci.sh`: not run by me.
- [ ] Live acceptance for both Claude Code and Codex, bound to this exact
  candidate tree, with both pane snapshots recorded as the sheet requires.
- [ ] Integration: the candidate is uncommitted. I did not stage or commit
  anything.
- [ ] Updating the reviews index to record this verdict changes
  `plan/PROJECT_V6/reviews/README.md`. That file's hash in the trial 15 file
  map is therefore expected to differ after this verdict. Every other bound
  path is unchanged.

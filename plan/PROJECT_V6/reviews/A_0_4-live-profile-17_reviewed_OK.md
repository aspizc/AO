# Review A_0_4-live-profile-17 — OK

**Task:** plan/PROJECT_V6/A/0/04.md
**Trial:** 17 (live-profile series)
**Branch:** feat/V6-A-0-04-safe-submit
**Commit:** none. Dirty candidate on HEAD `5197f6683fcfa312c246b6bda6c9cc094c5e7f03`,
bound by `evidence/A_0_4-live-profile-17-files.json` and
`evidence/A_0_4-live-profile-17-handoff-seal.json`.
**Reviewer:** Claude reviewer agent (Opus 5.5, medium). Fresh session,
independent of the trial 17 coder session and of earlier reviewers. No
subagents were used.
**Date:** 2026-10-08

## Summary

Trial 17 adds one narrow Codex 0.160.1 classifier branch. It covers a
post-paste draft whose row 39 holds only padding and `⚠ 2 warnings · f2 to
view`. The branch can authorize only the guarded first Enter. It needs two
byte-identical draft observations that are bound to the ready frame's
process, geometry, prefix and cwd status. I reproduced the 5-test RED, all
12 guard mutations and the 261/261 focused GREEN, and I verified every bound
hash.

**OK** for the trial 17 candidate as bound by its file map. Status:
**implemented, reviewed OK (trial 17)**. Nothing is integrated, promoted or
released. The warning-only branch has fixture coverage only and was **not**
validated live (see Limits).

## Checks

- [x] **Binding.** All 37 entries of the trial 17 file map and both entries
  of the seal matched the working tree before I wrote this verdict.
  - Candidate hashes: `base_adapter.js` `9c9a96b1…`,
    `prompt_submission.test.js` `fa39402b…`, fixture
    `codex_0_160_1_warning_only_draft.json` `fe1aef6b…`. All three match
    the file map and the operator-live file.
  - Entry map: HEAD and branch match. 33 of its 37 hashes still match. The 4
    that differ are exactly the declared ones: `base_adapter.js`,
    `prompt_submission.test.js`, `gateway/README.md` and the reviews index.
  - The archived entry source and test equal their entry hashes. The entry
    `base_adapter.js` (`81e92409…`) equals the trial 16 bound source.
  - The trial 16 verdict and evidence are committed and unchanged
    (`git diff --quiet HEAD` exits 0). Nothing changed under `policies/`.
- [x] **Delta scope.** I ran `diff -u` of the entry source against the
  candidate. There are exactly two hunks, both in `base_adapter.js`:
  - **Classifier.** The branch triggers only on
    `/^ +⚠ 2 warnings · f2 to view *$/` at row 39. It runs after
    `activeDecision`, so menus still win. It returns `composer` with
    `warningDraft` only when every one of these holds:
    - `phase === "draft"`
    - 120×40 geometry, cursor on row 36, 41 lines with an empty final line
    - the exact v0.160.1 header
    - idle `codexLiveStatus` on row 38 and a blank row 37
    - blank rows 13–35 and no `codexWorking` in rows 0–35
    - non-placeholder printable-ASCII text under 800 characters
    - `cursorX === text.length + 2` and less than the width

    Any other frame matching this footer returns `unknown_state`. The
    existing queue/warnings regexes, `codexGap` and `welcomeWork`/`modernWork`
    are not broadened.
  - **Guard.** It runs before `guardedSubmit` when either frame is a
    warning draft. Both frames must be warning drafts, their snapshots must
    be identical, ready and pending must match guard on all five
    identity/geometry keys, ready rows 0–35 and row 38 must equal pending,
    and `attempt === 0`. A failure throws `unknown_state` before any CR.
  - **Unchanged.** The post-Enter acceptance path (`freshCodexWork`, Claude
    witnesses), delays, retry budget, transport builders and the Claude
    adapter.
- [x] **Phase only and no initial input.** Ready-phase classification of
  the variant is `unknown_state`, so `requireComposer(ready, "")` refuses
  with no input and no leaked buffers (test 125).
- [x] **No retry Enter.** On attempt 1 a pending warning-only frame fails
  the guard with `attempt !== 0`. Because a CR was already delivered, this
  surfaces as `acceptance_uncertain` after exactly one CR (test 131).
- [x] **Menus.** A decision frame in the guard slot rejects with
  `decision_required` and no CR (test 128).
- [x] **Not acceptance evidence.** If composer disappearance is followed by
  a non-busy ready frame, the result is `acceptance_uncertain` after one CR.
  Atomic paste refusal sends no input, no `agents-submit-v1` and no
  `send-keys` (test 130).
- [x] **RED reproduced independently.** I used my own runner under the
  session scratchpad with the candidate tests and fixtures and the archived
  entry source. Result: exit 1, **131 tests, 126 pass, 5 fail**, 0 skipped,
  cancelled or todo. The 5 failures are exactly the names in the handoff.
- [x] **12 guard mutations reproduced.** I used my own runner, in scratch
  only. Each removal fails exactly one trial 17 test:
  - phase → test 125
  - version, cursor, status, history, prior-working and gap → test 126
  - first-enter → test 131
  - stable-capture, process, ready-prefix and ready-status → test 127

  Reviewer extras:
  - Dropping `pending` from the process binding fails test 127.
  - Removing the whole guard block fails tests 127 and 131.
  - Widening the count to `\d+` fails test 126.
  - Dropping the final-empty-row check fails test 126.
- [x] **GREEN reproduced.** I ran the exact focused host command from the
  handoff on Node v22.22.1 with `A04_TEST_TMUX` set to tmux `3.6a-agents.3`.
  Result: exit 0, **261/261 pass**, 0 fail, cancelled, skipped or todo.
  - `python3 scripts/ci_gate.py --validate-only` exited 0 with no errors and
    0 suite tests, as disclosed.
  - `git diff --check` is clean.
- [x] **Tests assert emitted input.** The trial 17 tests assert the literal
  bracketed paste, `-G -p -r`, one `agents-submit-v1` on success, CR counts
  through the `trial16OneEnter`/`trial17NoEnter` helpers, no `send-keys` and
  no leaked buffers.
- [x] **Fixture.** It is labelled as a reconstruction. Its prompt, path,
  IDs and padding are synthetic. It holds no home path, user name, UUID or
  token, and it claims no live stability.
- [x] **Operator-live file.** I read
  `workspace/root-a04-live-snapshot-result.json` locally and copied nothing
  from it.
  - It ran at 2026-10-08T08:33:28Z on `candidate` = HEAD `5197f66`. That is
    after the final source mtime (10:25:21 +02:00) and after the handoff
    (10:32:09 +02:00).
  - Runtime: tmux `3.6a-agents.3`, codex-cli `0.160.1` and Claude Code
    `2.1.294`.
  - **Codex** (`gpt-6.1-sol`, effort medium): `askReturned` and
    `acceptance` are both true. The token appears 3 times: echo, reply and
    status row.
  - **Claude** (`claude-opus-5-5`, effort medium, disposable trusted
    folder): `askReturned` and `acceptance` are both true. The token
    appears 2 times.
  - I compared the four sanitized grids row by row with the raw panes. The
    non-blank row layout is identical. The only differing rows are
    path/token/user rows: Codex rows 2, 15, 18 and 38, and Claude rows 3,
    6, 8 and 38.
  - The Codex pre-ask footer is the normal `? for shortcuts … ⚠ 2 warnings`
    form, not the warning-only form.
- [x] **Rule 14 honesty.** The handoff, the Gateway README and the index
  claim no live validation of the warning-only branch and no reliability,
  integration, promotion or release.
- [x] **Global invariants.** Everything is in English. There was no policy
  edit, push, tag or commit. MCP naming and stderr logging are untouched.

## Limits (not validated by this OK)

1. **The warning-only branch is not live-validated.** The rare frame was
   reported once and never observed stable twice. The live run did not hit
   it. Its safety rests on the reconstructed fixture and on the guard
   design. If the real rare frame is not byte-stable across re-observation,
   it is still refused. That is fail-closed, but the intermittent
   `unknown_state` may persist.
2. **The live result binds HEAD only.** The private JSON does not record the
   dirty-tree hashes. Those hashes appear only in the root-written markdown.
   The mtime ordering is consistent with the hashed candidate, but it does
   not prove it. The transport Enter count was not captured. "No manual
   Enter" rests on the root's statement.

## Non-blocking notes

1. Three conjuncts survive removal in my extra mutants:
   - **`!pending.warningDraft || !guard.warningDraft`.** Mostly entailed by
     snapshot equality plus the attempt-0 identity check.
   - **The placeholder check.** Entailed by the cursor check: a placeholder
     has `cursorX` 2.
   - **The ASCII check.** Not fully entailed. A one-column non-ASCII
     character such as `é` passes the cursor arithmetic. The exact
     prompt-match requirement still applies, so I see no unsafe Enter, but
     the handoff lists this conjunct as a requirement. A later trial should
     add a draft test with a one-column non-ASCII prompt.
2. Updating the reviews index to record this verdict changes
   `plan/PROJECT_V6/reviews/README.md`. Its hash in the trial 17 file map is
   therefore expected to differ after this verdict. Every other bound path
   is unchanged.
3. Inherited: process provenance is the tmux server, pane and pane-shell
   PID, not the Codex PID. A change that reverts between two captures is not
   proven detectable.

## Outstanding (not claimed here; root-owned)

- [ ] Full gate `bash scripts/ci.sh`: not run by me.
- [ ] Live acceptance bound to the dirty-tree hashes in a machine-written
  record, with the transport Enter count.
- [ ] Live observation of the warning-only draft, stable twice, before any
  claim that this branch fixes the intermittent refusal.
- [ ] Integration: the candidate is uncommitted. I did not stage or commit
  anything.

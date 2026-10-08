# Review A_0_4-live-startup-1 — KO

**Task:** plan/PROJECT_V6/A/0/04.md (live startup-notice draft profile)
**Trial:** 1
**Branch:** feat/V6-A-0-04-live-startup-profile
**Commit:** none — candidate is uncommitted on base `b4506d26950ce7b9a6af92fc63c8c56db4daea09`
**Reviewer:** Claude reviewer agent (claude-opus-5-5), independent of the coder session
**Date:** 2026-10-08

## Summary

The candidate adds a draft-phase Codex 0.160.1 profile for the static
update-available notice layout and closes the generic footer fallback for the
shifted header. Its fixture-level guarding is strict and the inherited atomic
transport is untouched. It does not work on real panes, though. A new operator
live run with the same classifier logic refused the challenge draft with
`unknown_state`, before any Enter. The cause is raw trailing-space padding
that the fixture leaves out. **KO.**

## Review identity and evidence chain

- Reviewer session: Claude Code session `e6206d8c-ab1a-4ccf-86bb-fd3719af0b18`.
  This reviewer was assigned directly by the operator. It was not spawned
  through a Gateway trace, so there is no reviewer `traceId`.
- Handoff seal checked: the handoff hashes to `b8ba2be6…fe0b1d` and
  `files.json` hashes to `49ed3477…39c193`. All 11 entries in `files.json`
  match the files in the worktree.
- Operator live evidence: an A05 live-acceptance run with trace
  `tr-a05-live-1d787d5d-8a7c-436f-bf94-a65d605db06e`. Its private
  `evidence.jsonl` (SHA256 `59ccb93f4611897c04c4fff4b55a165bf2432d9d55a51667a96185b5fa4527ba`,
  33 records) sits in an operator disposable mirror. The private path and
  nonce are not copied here. Runtime versions recorded: tmux 3.6a-agents.3,
  Node v22.22.1, codex-cli 0.160.1, 120×40.
- Mirror equivalence, checked by this reviewer: the mirror's `tmux_client.js`
  is byte-identical to the candidate. The mirror's `base_adapter.js` differs
  only by two added `console.error` diagnostics (`A04PROFILE` and `A04DIAG`),
  which add stderr logging and change no logic. The classifier logic that ran
  is therefore the candidate's logic.

## Checks

- [x] Files to create/modify: there are only three functional paths
      (`base_adapter.js`, `prompt_submission.test.js`, the new fixture), plus
      new evidence files. `tmux_client.js`, `guardedSubmit` and
      `freshCodexWork` are unchanged.
- [x] TDD RED reproduced independently. I ran a copy of the coder's runner
      with its output redirected to my scratchpad. With the baseline
      `b4506d2` adapter, the 14 `startup |trial17` tests gave 11 passes and 3
      failures: the positive path, the phase/retry test, and the spoof test.
      The spoof-test failure is real behaviour. Without the candidate, a
      shifted-header draft that carries the full shortcuts/warnings footer
      goes through the generic composer path.
- [x] Focused GREEN reproduced: 286 passed, 0 failed, 0 skipped (pinned tmux
      3.6a-agents.3). Inside the Claude Code sandbox, 5 fake-CLI delegate
      tests failed with ENOENT on `/tmp/*-root-*/argv.json`. They pass outside
      the sandbox, so the cause is environmental and not this candidate.
- [x] Lint exit 0. `check_public_hygiene.py` reports 0 findings.
      `ci_gate.py --validate-only` exit 0. `git diff --check` is clean.
      Full `bash scripts/ci.sh` was not run.
- [x] The coder's 13 mutations were reproduced. All 13 fail at least one
      relevant test.
- [x] Source provenance reproduced. I fetched the four `rust-v0.160.1` files
      and their SHA256 values match the source binding. The 88 greetings
      match `GREETINGS` in `greetings.rs` exactly, with no missing or extra
      entries. The notice glyph `✨` is followed by U+200A, as in
      `notices.rs`. The header layout (blank row, title, 5-space cwd, blank
      row, 2-space greeting) matches `SessionHeaderHistoryCell::display_lines`.
- [ ] **Live behaviour: fails.** The real draft is refused (see defect 1).
- [ ] Documentation convention: `gateway/README.md` was not updated (defect 2).
- [x] Global invariants: English only, no push or commit, no `policies/` edit,
      `agents-gateway` naming unchanged, logs on stderr, async approval
      untouched. No private path or nonce in the new public files: I grepped
      them, including the gz logs.

## Findings

What holds up:

- Menu/spoof: `activeDecision` still runs first. Rows 13–35 must be blank and
  rows 0–12 are exact or come from a closed set, so an update picker or
  approval menu cannot reach the composer profile. The greeting slot cannot
  carry menu or history text (tested).
- Phase/retry: the profile is limited to the draft phase. The first Enter is
  only sent at attempt 0. A pending draft that is still present after Enter
  ends in `acceptance_uncertain` and gets no second Enter (tested, and the
  mutants fail).
- Cross-provider: all changes are inside `provider === "codex"`. Claude
  first-prompt regressions pass.
- Atomic transport: there is exactly one `agents-submit-v1` call, no
  `send-keys`, and buffers are cleaned up.
- The fail-closed early guard behaved correctly live: no Enter was sent on
  the unrecognised draft, and cleanup was `EXACT_OWNED_IDENTITIES_ABSENT`.

Observed live failure (operator run above). Pre-ask `ready` was classified
`composer`. The first post-paste `draft` was `unknown_state`, with
`notice/path/footer = true` and `blank/greeting/status = false`. Raw Gateway
capture lengths:

| row | content | raw length |
|---|---|---|
| 11 | 61 spaces | 61 (candidate expects `""`) |
| 12 | `  Welcome to our little rectangle of possibility.` + trailing spaces | 70 (candidate expects an exact set member) |
| 38 | `  GPT-6.1-Sol medium fast · <cwd>` + one trailing space | 116 (candidate expects an exact string) |

The ready footer (`  ? for shortcuts` + 77 spaces + warnings) and the draft
footer (94 spaces + warnings) did match the pins exactly in this run.

## Required corrections

1. **The profile rejects real raw padding on rows 11, 12 and 38**
   (`gateway/src/adapters/base_adapter.js:141-142`,
   `codexUpdateWelcomeDraft`). Change these three checks to tolerate trailing
   spaces only:
   - row 11: `/^ *$/`
   - row 12: `codexStartupGreetings.has(rows[12].trimEnd())`, with
     `/^ *$/.test(rows[12].slice(<greeting length>))`
   - row 38: `rows[38].trimEnd() === \`  GPT-6.1-Sol medium fast · ${cwd}\``

   Keep every other byte exact, and keep `rows[i].length <= pane.width`. Do
   not trim leading characters or allow any other padding characters. The
   pending/guard/ready equality checks still pin the exact padded bytes
   within one ask.

   Add RED tests built from the observed raw shape: row 11 as 61 spaces,
   row 12 padded to 70 characters, row 38 with one trailing space, and the
   real greeting "Welcome to our little rectangle of possibility." They must
   fail on this candidate and pass after the fix.

   Add negative tests in the same change: trailing non-space characters
   after the greeting, padding beyond width, and tab padding all stay
   `unknown_state` with no Enter. Re-run the mutation set with mutants for
   the new padding predicates.

2. **The fixture misstates its provenance**
   (`tests/gateway/fixtures/codex_0_160_1_update_welcome_draft.json`, and the
   handoff text that says it "preserves all 40 row positions and row
   lengths"). The live raw capture shows trailing padding that the source
   transcript event had removed. In the next trial, either rebuild the
   fixture from a raw `-N -T` capture, or state in `sourceKind` exactly which
   rows have reconstructed padding. Also check which other pinned rows
   (notice, row 9 header, row 10 cwd, row 37, footers) were raw and which
   were reconstructed.

3. **`gateway/README.md` is not updated.** The classifier comment at
   `base_adapter.js:227-228` says the evidence and the unverified live/version
   boundary are recorded in `gateway/README.md`, and trials 16 and 17 each
   added a paragraph there. Add a paragraph for this profile. It should cover:
   - the static update-notice layout (0.160.1 → 0.161.0, rows 0–12) and its
     pinned source links;
   - the single varying greeting slot and its OnceLock binding;
   - padding tolerance (after fix 1);
   - that cursor/LF are reconstructed;
   - that a successful submission currently ends in `acceptance_uncertain`,
     because no post-Enter frame exists;
   - unsupported variants: other versions/commands, a YOLO permissions row,
     truncated or space-containing cwd, wrapped notice.

4. **Some guards have no test that fails without them** (Rule 9). The
   following mutants pass the whole `prompt_submission.test.js`:
   - replacing the cwd regex at `base_adapter.js:140` with `true` (a
     surviving mutant). Add a test where rows 10 and 38 carry a matching
     non-path token, e.g. `     ›` and `  GPT-6.1-Sol medium fast · ›`,
     expecting `unknown_state` with no Enter. Or remove the regex if you can
     argue it is redundant.
   - removing `ready.cursorY !== "36" || ready.cursorX !== "2"` (line 554),
     and removing the `!pending.updateWelcomeDraft || !guard.updateWelcomeDraft`
     mixed-flag check. These are equivalent mutants: the generic ready
     classification already requires the placeholder cursor at 36/2, and
     guard/pending snapshot equality already excludes mixed flags. Remove
     both checks as dead code (Rule 2), or show a test that fails without
     them.

## Limits of this verdict

- Live acceptance of this profile is **unproven and was not run by this
  reviewer**. The only live evidence is the operator run above, and it is a
  refusal. Even after fix 1, the positive path ends in `acceptance_uncertain`
  after one Enter. Nothing here supports an A05 acceptance or release claim.
- Not run: full `bash scripts/ci.sh` and any live provider session.
- The operator's diagnostic mirror differs from the candidate by stderr
  logging only, which I checked by `diff`. I read the private evidence only
  for the fields cited here.
- This verdict has not been committed or indexed in `reviews/README.md`, per
  the operator brief. The orchestrator owns that step.

## Next step

KO → the coder applies corrections 1–4 and writes
`A_0_4-live-startup-2_to_review.md`. A fresh live capture on the corrected
candidate (stable draft/guard, actual post-Enter frame) is needed before any
live claim.

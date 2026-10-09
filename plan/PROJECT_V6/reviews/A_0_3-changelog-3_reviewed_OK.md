# A/0/03 changelog: trial 3 — OK

Reviewer: independent Claude Opus 5.5 (`claude-opus-5-5`) Claude Code session in
the read-only worktree `wt-v6-a03-review`, detached at
`4f6a3c19109c362e5269e8ce6b579608e2cbe9c6` (the local `release/1.1.0` tip). The
brief gave no Gateway trace or session id. This session did not write the
change, take part in trials 1–2 or write any A/0/06 code. I used no sub-agents
and wrote no files: the Write tool was disabled, so I printed this verdict for
the orchestrator to save. Candidate: `b1f2c6610aa2e31563533de1215b6d5b62cb923e`
(`b1f2c66^..b1f2c66`). Date: 2026-10-09.

## Verdict

**OK, no blocking correction.** Both trial-2 corrections are applied, word for
word as trial 2's examples, and both match the code. The rest of the A/0/06
and tmux-runtime entries still match the evidence named in
`A_0_3-changelog-2_to_review.md`.

## Corrections 1–2

1. **The cutover covers any older server (`CHANGELOG.md:38-42`).**
   - All three `.4` gates require the server's `#{version}` to equal
     `3.6a-agents.4` exactly. Each check runs before any input or handshake:
     - prompt answers: `session_prompt.js:52`, refused with
       `transport_unavailable` before input.
       `session_prompt_diagnostics.test.js:192` covers `.3`, plain `3.6a` and
       `.40`;
     - composer submits: `base_adapter.js:405`, called at `:613`, before the
       load and paste at `:618-619`;
     - retained relay: `process_supervisor_helper.py:4333` raises before
       `listener.accept()` (`:4878`) and authentication (`:4890`). The relay
       waits for the helper's challenge (`:4082`), which is never sent, so no
       handshake takes place.
   - 1.0.0 shipped `.1` (`1.0.0:gateway/vendor/tmux-agents/manifest.json:3`,
     `1.0.0:gateway/src/adapters/process_supervisor_helper.py:4333`). Its
     vendor README tells operators to make it their default `tmux` (`:52`),
     and its patch keeps the default server alive (`:9-12`). `1.1.0-dev.1`
     also pins `.1`. `git tag --contains` prints nothing for `61d4ec5` (`.3`)
     or `3a8fdcc` (`.4`).
   - The bullet does not claim that the Gateway accepts only `.4`. It limits
     the requirement to guarded input and the retained relay. The parenthetical
     matches decision item 1 (`A_0_6_pending_wrap_cutover_decision.md:9-12`)
     and `docs/tmux-runtime.md:66-67`.
   - Manual restart: the runbook is `docs/tmux-runtime.md:56-64`. `gateway/src`
     and `cli/src` contain no `kill-server` or `start-server`.
2. **Stage codes are recorded only before input (`CHANGELOG.md:34`).**
   - Pre-input stages are fixed literals (`session_prompt.js:49-88`,
     `session_prompt_service.js:88-92,100-133`).
   - The stage is cleared at `session_prompt.js:89`, just before the guarded
     write. An atomic guard refusal therefore stores `refused`/`guard_refused`
     with no `detail` (`session_prompt_diagnostics.test.js:154-164`).
   - The suite itself calls these refusals "before input" (`:192`), and so does
     `gateway/README.md:102`. Invalidation details are fixed literals too
     (`approval_service.js:24-25`, `approval_repo.js:147`).

## Re-checked entries as of `b1f2c66`

- **No auto-answer, and "don't ask again" is never sent (lines 27-29).**
  - `policies/` contains no `sessionPromptScopes`. Without a matching scope,
    auto is false (`session_prompt_service.js:31-43`), and the request has
    empty auto-approve scopes (`:186`).
  - Only `Enter` is accepted (`session_prompt.js:50`). Both recognizers
    require the cursor on option 1 (`codex_adapter.js:35`,
    `claude_adapter.js:33`).
- **Same-account authority and exit contract (lines 29-32).**
  - The CLI passes the fixed decider `operator`
    (`cli/src/agents_cli/main.py:233`). The Node script rejects reserved
    deciders (`gateway/scripts/approval-respond.mjs:14-17`). Both match
    `A_0_6_operator_response_decision.md`.
  - For prompt approvals, both exit zero only for `answered/sent` or
    `denied` (`main.py:248-271`, `approval-respond.mjs:29-30`).
- **Pending wrap and wrapped option (lines 32-34).**
  - The `.4` patch refuses only `cx > width`
    (`tmux-3.6a-agents.4.patch:191`). Its SHA-256 `785a1df2…` matches
    `manifest.json:11`.
  - The wrapped `p` row is joined at `codex_adapter.js:39-46`.
- **Live acceptance (line 35).** I checked `A_0_6-operator-live-3.md` against
  the gitignored `workspace/a06-live/run-211417/` in the main checkout:
  - case outputs: `answered/sent` with exit 0 for cases 1–4 (case 3 reuses
    case 2's id), and `denied` with exit 0 for case 5;
  - audit: 4 detections (1 trust, 3 command), 3 operator grants and 1
    operator denial;
  - 6 `SESSION_PROMPT_ANSWER_ATTEMPT` events: three `attempting`→`sent`
    pairs, all `Enter`, none with `detail`;
  - 3 `SESSION_PROMPT_ANSWERED` events, 1 `prompt_changed` invalidation of the
    denied id and 0 `SESSION_PROMPT_ERROR` events;
  - the recorded `.4` executable hashes to `837d0103…7aac`.

  The claim covers only Codex 0.162.0, and so does the evidence.
- **Runtime and platform (lines 36-38).** `manifest.json:3` reports
  `3.6a-agents.4`. "linux/amd64 only" matches decision item 2 and
  `docs/tmux-runtime.md:49-54`.
- **Merged gate.** `A_0_6-livefix-merged-gate-2.md` is green at `8ee0933`.
  Since then only `plan/` and `CHANGELOG.md` have changed. The changelog makes
  no gate claim.

## Scope and hygiene

- `b1f2c66` changes only `CHANGELOG.md` (+6/−3), and `git diff --check` exits
  0. No `policies/` file changes. The added lines are English and contain no
  non-ASCII bytes. `4f6a3c1` adds only the trial-3 request.
- `check_public_hygiene.py` reports 0 findings (exit 0).
- The structure tests that read `CHANGELOG.md` passed: 26 tests in
  `test_repo_metadata.py`, `test_mvp2_gate.py`,
  `test_v5_coordination_integration_docs.py`, `test_planner_loop_prompts.py`,
  `test_planner_assisted_profile.py`, `test_planning_runbook_smoke.py` and
  `test_release_candidate_contract.py::test_candidate_operator_contract_documents_external_evidence_and_states`.
  - I ran them with the AO venv and without cache or bytecode writes.
  - `git status --porcelain --ignored` stayed empty.
- The commit subject follows the convention. The local `origin/release/1.1.0`
  (`c4bc008`, 2026-10-08) does not contain `b1f2c66`. I checked local refs
  only.

## Non-blocking notes

1. `CHANGELOG.md:34` is 81 columns wide. Every other line of the 1.1.0
   section is at most 78. If the file is touched again, reflow lines 34-35:

   ```text
     are recognized. Refusals before input record a fixed, non-sensitive stage
     code. Real-provider acceptance with Codex 0.162.0 passed.
   ```

2. The A/0/06 bullet does not name providers.
   - The watcher serves only `codex` and `claude-code` sessions
     (`session_prompt_service.js:24`).
   - Codex has trust and command recognizers. Claude Code has only a
     permission-dialog recognizer, which matches sheet scope item 1
     (`A/0/06.md:30-31`).
   - Antigravity, pi and OpenCode children get no prompt detection.

   "For Codex trust and command prompts and Claude Code permission prompts"
   would be exact. Trials 1 and 2 accepted the current wording.
3. Trial 2's non-blocking notes 1–5 are still unapplied. They remain optional.

## Follow-ups outside this CHANGELOG-only trial

- `docs/tmux-runtime.md:56-69` still describes the cutover only for `.3`. The
  changelog now also names 1.0.0's `.1`.
- The status conflict from trial 2 is still present at `b1f2c66`:
  - still open: `README.md:36`, `docs/project-status.md:184`,
    `plan/README.md:17-18`, `plan/PROJECT_V6/README.md:13-14`,
    `plan/PROJECT_V6/A/README.md:4,13` and `SHEETS.md:23`;
  - passed: `SHEETS.md:4`, `A/0/06.md:5` and this changelog.
- Carried from trial 1: recheck the `2026-10-09` date at tag time.
- Save this verdict as `A_0_3-changelog-3_reviewed_OK.md` and index it in
  `reviews/README.md`. I wrote no files.

## Limits

- I ran no full gate, rebuild, tmux server or live provider.
- The `.1` refusal and the relay's fail-closed path rest on source (exact
  string inequality) and the unit fixtures at
  `session_prompt_diagnostics.test.js:192`. Neither was run against a `.1`
  server.
- The live-3 cross-check reads local artifacts kept by the orchestrator.
- This verdict binds no release candidate. It implies no integration,
  promotion or release.

## Next step

The 1.1.0 changelog wording at `b1f2c66` is accepted. The orchestrator saves
and indexes this verdict. The candidate-bound A/0/03 release review and Scope
steps 2–5 remain open.

# A/0/03 changelog: trial 2 — KO

Reviewer: independent Claude Opus 5.5 (`claude-opus-5-5`) Claude Code session in
the read-only worktree `wt-v6-a03-review`, detached at
`9eb518250c0f56d718c01dba754f3d198c8d6e88` on `release/1.1.0`. The brief gave
no Gateway trace or session id. I did not write the candidate or any A/0/06
code. I used no sub-agents and wrote only this file. Candidate:
`b4b60e73ae9d7a3d142a9d377aa55230708f15fe` (`b4b60e7^..b4b60e7`).
Date: 2026-10-09.

## Verdict

**KO, two corrections.** Most new claims match the integrated code and the
A/0/06 evidence. Two sentences must change:

- The cutover sentence names only `3.6a-agents.3`, which no tag ever shipped.
  It omits `3.6a-agents.1`, the runtime 1.0.0 shipped.
- The stage-code sentence covers more refusals than the code does.

## Required corrections

1. **The cutover note must cover 1.0.0's runtime** (`CHANGELOG.md:36-39`).
   This section lists changes since 1.0.0, so 1.0.0 operators are its readers.
   1.0.0 pins `3.6a-agents.1`
   (`1.0.0:gateway/vendor/tmux-agents/manifest.json:3`,
   `1.0.0:gateway/src/adapters/process_supervisor_helper.py:4333`). It told
   operators to make `.1` their default `tmux`
   (`1.0.0:gateway/vendor/tmux-agents/README.md:52`). That patch keeps the
   default server alive when its last session ends (same file, `:9-12`).

   `.3` arrived with A/0/04 (`61d4ec5`). `git tag --contains 61d4ec5` prints
   nothing, and the `1.1.0-dev.1` snapshot also pins `.1`. The exact `.4`
   checks refuse `.1` just as they refuse `.3`:
   `gateway/src/adapters/session_prompt.js:52`, `base_adapter.js:405` and
   `process_supervisor_helper.py:4333`. A 1.0.0 operator therefore needs the
   same manual restart, but the bullet does not say so.

   State that a 1.1.0 Gateway fails closed against any still-running older
   server, including 1.0.0's `.1`, until the operator restarts that server
   manually with `.4`. Plain session start still works on any tmux, so do not
   claim that the Gateway accepts only `.4`. Example:

   > Guarded input and the retained relay require a running server that reports
   > exactly `3.6a-agents.4`. Against a still-running older server, including
   > 1.0.0's `3.6a-agents.1`, a 1.1.0 Gateway fails closed (no prompt answers,
   > composer submits or retained relay handshake) until the operator manually
   > restarts that server with `.4`.

   The parenthetical is optional. It matches decision item 1
   (`A_0_6_pending_wrap_cutover_decision.md`) and `docs/tmux-runtime.md:66-67`
   more closely than "guarded input" does.

2. **Not every refusal records a stage code** (`CHANGELOG.md:34`). Fixed stage
   literals are set before input (`session_prompt.js:49-88`,
   `gateway/src/services/session_prompt_service.js:88-133`). The stage is
   cleared before the atomic write (`session_prompt.js:89`). A tmux-guard
   refusal therefore stores `refused`/`guard_refused` with no `detail`, and
   `tests/gateway/session_prompt_diagnostics.test.js:154-164` asserts this.
   Example fix: "Refusals before input record a fixed, non-sensitive stage
   code."

## Verified

- **Scope and hygiene.**
  - `b4b60e7` changes only `CHANGELOG.md` (+11/−2), and `git diff --check`
    exits 0.
  - No `policies/` file changes. The new lines are English ASCII, at most 78
    columns.
  - `check_public_hygiene.py` reports 0 findings.
  - Since the gated tree `8ee0933`, only `plan/` and `CHANGELOG.md` differ.
- **Same-account authority (lines 29-31).** This matches decision option 1.
  - The CLI passes the fixed decider `operator`
    (`cli/src/agents_cli/main.py:233`).
  - The Node script rejects reserved deciders (`approval-respond.mjs:14-17`).
  - The residual is documented in `docs/operator-guide.md:267-270`.
  - Not overstated.
- **Exit contract (lines 31-32).** For prompt approvals, `main.py:248-271` and
  `approval-respond.mjs:29-30` exit zero only for `answered/sent` or a stored
  `denied`. The wait is bounded at 10 s (`approval_service.js:162-192`).
- **Pending wrap and wrapped option (lines 32-34).**
  - `session_prompt.js:69` refuses only x > width or y >= height.
  - The patch refuses only `cx > width` (`tmux-3.6a-agents.4.patch:191`). Its
    SHA-256 `785a1df2…` matches the manifest and both builders.
  - The wrapped `p` row is handled at `codex_adapter.js:39-46`.
- **Live acceptance (line 35).** `A_0_6-operator-live-3.md` records cases 1–5.
  I cross-checked its local artifacts in the main checkout's gitignored
  `workspace/a06-live/run-211417/`:
  - audit: 4 detections, 3 operator grants and 1 denial;
  - 6 `SESSION_PROMPT_ANSWER_ATTEMPT` events: three `attempting`→`sent` pairs,
    all with response `Enter`;
  - 3 `SESSION_PROMPT_ANSWERED` events and 1 `prompt_changed` invalidation;
  - case outputs: `answered/sent` with exit 0 for cases 1–4, and `denied` with
    exit 0 for case 5;
  - the recorded `.4` executable hashes to `837d0103…7aac`.

  The claim is limited to Codex 0.162.0. Claude Code prompts and auto-answer
  scopes were not tested live, and the changelog does not claim them.
- **Runtime and platform (lines 36-38).**
  - The manifest reports `3.6a-agents.4`, and exact `.4` checks exist at the
    three sites above.
  - The linux/amd64-only claim matches decision item 2 and
    `docs/tmux-runtime.md:49-54`.
  - `gateway/src` and `cli/src` contain no `kill-server` or `start-server`,
    which is consistent with a manual restart.
  - Live-3 did not exercise a cutover. The `.3` refusal rests on source and
    `session_prompt_diagnostics.test.js:192`.
- **Gate log.** `workspace/tmux-pinned/gate-8ee0933.log` hashes to the recorded
  `df4ad3fa…b233`. The changelog makes no gate claim.

## Non-blocking notes

1. Add sheet ids to the runtime bullet: A/0/04 moved `.1` to `.3` (`61d4ec5`),
   and A/0/06 moved `.3` to `.4` (`3a8fdcc`).
2. "Codex 0.162 command menus are delivered" reads as if the menus themselves
   are sent. "Approved answers to Codex 0.162 command menus are delivered" is
   exact.
3. "It exits zero only…" applies to prompt approvals only. Ordinary approvals
   exit zero whenever the decision call succeeds.
4. "(linux/amd64 only for this release)" could be read as a platform-specific
   pin. "(supported and tested on linux/amd64 only; Darwin is not claimed)"
   mirrors decision item 2.
5. The `x == width` sentence describes the runtime primitive. Composer
   submission still requires x < width (`base_adapter.js:420`).

## Follow-ups outside this CHANGELOG-only trial

- **Status conflict.** Reconcile these before the candidate freezes:
  - still open: `README.md:36`, `plan/PROJECT_V6/A/README.md:4,13` and
    `SHEETS.md:23`;
  - passed: `SHEETS.md:4`, `A/0/06.md:5` and this changelog.
- `docs/tmux-runtime.md:56-69` has the same `.3`-only cutover framing as
  correction 1.
- Carried from trial 1: recheck the `2026-10-09` date at tag time.

## Limits

- I ran no tests, full gate, rebuild or live provider.
- The live-3 cross-check reads local artifacts kept by the orchestrator.
- `codex --version` on this host reports 0.162.0 today. That does not prove the
  version used in that run.
- The `.1` refusal comes from source (exact version equality), not from a run
  against a `.1` server.
- This verdict binds no release candidate. It implies no integration,
  promotion or release.

## Next step

Apply corrections 1–2 to `CHANGELOG.md` only. Commit with an explicit pathspec,
then request trial 3 from a fresh reviewer session.

# Review A_0_6-7 — OK

**Task:** plan/PROJECT_V6/A/0/06.md
**Trial:** 7
**Branch:** feat/V6-A-0-06-permission-prompts
**Commit:** uncommitted candidate on HEAD 85f4f30 — review(v6): reject permission prompt trial 6 (PROJECT_V6 A/0/06); runtime RED baseline 7ac9438
**Reviewer:** Claude reviewer agent (independent Opus 5.5 session; no coder material reused as verdict evidence)
**Date:** 2026-10-09

## Summary
Trial 7 closes all five Trial 6 KO corrections. I verified the manifest and
the exact delta. I replayed all three RED tests on frozen 7ac9438 sources, and
each fails for the intended reason. I reproduced every targeted GREEN on pinned
tmux. One non-blocking audit regression is recorded below. **OK** for the
targeted scope. Full CI and live acceptance were not run (see the last section).

## Checks
- [x] Archivos a crear / modificar: the manifest SHA256 is `e112b499…`, and
  29/29 candidate hashes and 17/17 evidence hashes match. The red product
  sources match `git show 7ac9438:<path>` for all four files. The Trial 6
  handoff and verdict hashes match, and the pinned tmux SHA256 `6487f795…`
  matches. The delta against HEAD is exactly the 7 declared tracked files plus
  the new `tests/gateway/session_prompt_tick_fixture.mjs`, and the Git index
  is empty. HEAD's `gateway/` is byte-identical to 7ac9438.
  `gateway/README.md` has no delta and contains the literal
  `session.prompt.{command,trust,permission,unknown}` names (6 occurrences).
  `policies/` was not touched, and no earlier review files were modified.
- [x] Tests requeridos: details under Reproduction.
- [x] Criterios de aceptacion: the RED tests fail on the baseline and pass on
  the candidate. The full gate and the live check are still open; they are
  root-owned and the operator runs them.
- [x] Errores comunes evitados: there is no `orchestrator/` directory, the
  server is still named `agents-gateway`, `policies/` has no edits, and the
  `p` option is never sent (no answer key changed).
- [ ] Definition of done: the candidate is uncommitted, and the full gate is
  pending under root ownership.
- [x] Global invariants: English only, no push, no restricted paths, and logs
  are not written to stdout.

## Reproduction (reviewer-run, this session)
Environment: every inherited `AGENTS_*` variable unset (count verified as 0),
`TMUX` unset, PATH prefixed with `/tmp/a06-test-bin` (`tmux -V` =
`3.6a-agents.3`) and the repo `.venv`, `D007C_RUN_REAL_TMUX_PROBE=1`,
`D007C_TEST_TMUX_PATH=/tmp/a06-test-bin`,
`A04_TEST_TMUX=/tmp/a06-test-bin/tmux`, and a reviewer-scratch `TMUX_TMPDIR`.
The RED baseline is a `git archive 7ac9438` snapshot in reviewer scratch space.
Only the three changed test files and the new fixture were overlaid on it, and
it shares `gateway/node_modules`.

| Target | RED on 7ac9438 + new tests | GREEN on candidate |
| --- | --- | --- |
| `session_prompt.test.js` `watcher tick` (state-loss, audit-failure) | 2 tests, 0 pass, 2 fail, exit 1; uncaught `state not initialized; call initState first` and `audit sink failed` | included in focused 303/303 |
| `request_context_reattach.test.js` `spawn record-failure` | 1 test, 0 pass, 1 fail, exit 1; `failed durable publication must never arm a prompt watcher` expected 0, actual 1 | included in reattach 124/124 |
| `tool_projection_contract.test.js` `prompt policy actions` (isolation=none) | 1 test, 0 pass, 1 fail, exit 1 | full file 11/11, exit 0 |
| `request_context_reattach.test.js` (full) | — | 124/124, 0 skipped, exit 0; no `asynchronous activity` / `state not initialized` |
| `*prompt*` + autoapprove/approval/tool_agent/tool_approval/approval_state/approval_wait/tool_catalog | — | 303/303, 0 skipped, exit 0 |
| otel_tool_spans + registry_overlay + e2e mcp_two_agent (concurrency=1, scrubbed) | — | 21/21, 0 skipped, exit 0 |
| `npm --prefix gateway run lint` | — | exit 0 |
| `git diff --check`, plus a trailing-whitespace scan of the new fixture | — | exit 0, clean |

The counts I reproduced match the coder's logs exactly.

## Findings
1. **KO6-1, nonthrowing tick: closed.** `session_prompt_service.js` `tick`
   wraps both `observe` and the `live()` re-arm in one `try`. On error it
   calls `stop` (guarded) and does not re-arm. `watch` captures `traceId` when
   the timer is armed and returns early if that lookup throws. `reportError`
   swallows audit-sink failures. `stop` clears the timer, `current` and the
   bindings before the best-effort `invalidatePromptApproval`, and per-binding
   failures are reported without escaping. The fixture runs in a separate
   process with an `uncaughtException` collector and a tick-timer tracker, and
   it never calls `close()`. That proves the product is safe without relying
   on fixture cleanup.
2. **KO6-2, watcher only after durable publication; shared settlement
   ordering and races: closed.** `agent_service.spawn` no longer calls
   `watch()`. It passes a one-use callback to `transferRequestLaunch`, which
   stores it in a private `WeakMap` keyed by the published result. No public
   field is added. `settleRequestLaunch` takes the callback and deletes it
   *synchronously, before any `await`*, so only the first settlement can
   publish. The callback runs only when `accepted` is true and the receipt is
   not headless, after the receipt is released. In `tool_helpers.js:192-199`,
   `recordRequestContextResult` runs before `settleRequestLaunch(value, true)`.
   The watcher therefore arms only after durable recording. On the race paths:
   if a rejection or timeout settlement (`false`) comes first, the callback is
   discarded and a later accepted settlement cannot arm it. If recording
   throws, the catch path settles `false`, so nothing arms. Delegate never
   registers a callback. The spawn error path settles the pre-transfer
   `launched` object, whose receipt has already moved, so it cannot publish.
   `tools/agent.js:11` is the only caller of `agentService.spawn`, so no
   supervised entry point loses its watcher. The test asserts exactly one tick
   timer on accepted spawn and zero on record-failure.
3. **KO6-3, literal policy-action projection: closed.** The four names are
   added to `NON_TOOL_DOTTED_TOKENS`, derived from `Actions` in
   `policy_types.js` rather than copied by hand. The new test asserts each
   name passes `validateToolReferences` in prose and is still rejected as an
   `mcp-tool-call` tool. The README matches its committed bytes.
4. **KO6-4, fixture close: closed.** `t.after(() => service?.close())` is
   registered before `fixture(t)` in the spawn/delegate matrix, and the
   reattach file no longer produces the file-level async failure.
5. **KO6-5, evidence: meaningful.** Each RED fails on the behavior under test,
   not on harness output. The handoff marks the earlier invalid sandbox tick
   runs, including the misleadingly named `tick-green.log`, as having no
   semantic credit. I gave them none.
6. **Non-blocking, introduced by this trial: the responder-path error audit
   lost its `traceId`.** `gateway/src/services/session_prompt_service.js:165`
   still calls `reportError(sessionId, error)` without the new third
   argument. A failed answer triggered by a human or autonomous decision now
   writes `SESSION_PROMPT_ERROR` with `traceId: undefined`. Before this trial,
   `reportError` looked up the trace itself. The event keeps `sessionId`, and
   the sheet's required answer audit (`SESSION_PROMPT_ANSWER_ATTEMPT`) still
   carries `binding.traceId`. That is why this does not block. Flagged for
   cleanup in a separately reviewed change: pass `row.trace_id` (in scope at
   `:165`) and add an assertion on the audited `traceId`.
7. **Accepted design consequence (as the Trial 6 correction required):** a
   failing tick stops supervision and invalidates the pending prompt binding.
   It does not retry. A later `view` or reattachment resumes observation.

## Not verified by this review (root/operator-owned)
- Full `bash scripts/ci.sh` with disposable Redis and a scrubbed `AGENTS_*`
  environment, and its skip budget: **not run**.
- Live operator check: a Codex child's real prompt answered per policy, and a
  non-granted command waiting for `approval_respond`: **not run**.
- Commit, integration, promotion and release: none performed or implied. The
  candidate is uncommitted, so status stays `implemented` + `reviewed` for
  the targeted scope only.

## Next step
OK → the orchestrator commits the candidate with an explicit pathspec, runs
the root-owned full gate and live check, and then integrates. Finding 6 is
flagged for a follow-up cleanup.

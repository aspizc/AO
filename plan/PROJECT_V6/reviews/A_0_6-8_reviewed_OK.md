# Review A_0_6-8 — OK

**Task:** plan/PROJECT_V6/A/0/06.md
**Trial:** 8
**Branch:** feat/V6-A-0-06-permission-prompts
**Commit:** uncommitted candidate on HEAD d7264d2 — review(v6): approve permission prompt trial 7 (PROJECT_V6 A/0/06)
**Reviewer:** Claude reviewer agent (independent Opus 5.5 session; no coder material reused as verdict evidence)
**Date:** 2026-10-09

## Summary
Trial 8 is a narrow follow-up that closes Trial 7 Finding 6, the
responder-path `SESSION_PROMPT_ERROR` that lost its `traceId`. I verified the
manifest, the exact delta against Trial 7, and the RED/GREEN result of the new
regression test, which I reproduced myself. The Trial 7 lanes are unaffected.
**OK** for the targeted scope. Full CI and live acceptance were not run (see the
last section).

## Checks
- [x] Archivos a crear / modificar: the manifest SHA256 is `41d173e3…`, which
  matches the handoff. All 29/29 candidate hashes, 6/6 Trial 8 evidence hashes
  and 6/6 prior-trial artifact hashes match. The Trial 7 OK verdict
  (`7c97b19e…`) and manifest (`e112b499…`) are unchanged, and all 17 Trial 7
  evidence hashes still match. The pinned tmux SHA256 `6487f795…` matches.
  Compared with the Trial 7 candidate manifest, exactly two files differ:
  `gateway/src/services/session_prompt_service.js` and
  `tests/gateway/session_prompt.test.js`. I rebuilt both Trial 7 files from
  the candidate by reverting the one argument at `:165` and removing the
  appended test. Each rebuilt file hashes to its Trial 7 manifest value. The
  Git index is empty, `policies/` is untouched, and no earlier review file
  changed.
- [x] Tests requeridos: details under Reproduction.
- [x] Criterios de aceptacion: the targeted RED fails on Trial 7 and the
  targeted GREEN passes on the candidate. The full gate and the live check
  are root-owned.
- [x] Errores comunes evitados: there is no `orchestrator/` directory, the
  server is still named `agents-gateway`, `policies/` has no edits, and no
  answer key, action name, role decision or transport guard changed.
- [ ] Definition of done: the candidate is uncommitted, and the full gate is
  pending under root ownership.
- [x] Global invariants: English only, no push, no restricted paths, and logs
  are not written to stdout.

## Reproduction (reviewer-run, this session)
Environment: every inherited `AGENTS_*` variable unset, `TMUX` unset, PATH
prefixed with `/tmp/a06-test-bin` (`tmux -V` = `3.6a-agents.3`) and the repo
`.venv`, `D007C_RUN_REAL_TMUX_PROBE=1`,
`D007C_TEST_TMUX_PATH=/tmp/a06-test-bin`,
`A04_TEST_TMUX=/tmp/a06-test-bin/tmux`, and a reviewer-scratch `TMUX_TMPDIR`.
The RED snapshot is a `git archive d7264d2` copy in reviewer scratch space.
The working-tree candidate was overlaid on it, then the service was replaced
with the rebuilt Trial 7 bytes (hash verified). The snapshot shares
`gateway/node_modules`.

| Target | Result |
| --- | --- |
| `responder-path failure audit` (isolation=none), Trial 7 service + new test | RED: 1 test, 0 pass, 1 fail, exit 1. Fails only on the trace assertion (expected `'trace'`, actual missing); the error count, session ID and error message assertions pass first |
| same, candidate service (byte-identical to worktree `d316dd53…`) | GREEN: 1 test, 1 pass, 0 skipped, exit 0 |
| `*prompt*` + autoapprove/approval_service/tool_agent/tool_approval/approval_state/approval_wait/tool_catalog | 304/304, 0 fail/cancelled/skipped/todo, exit 0 (Trial 7 had 303, plus this new test) |
| `request_context_reattach` + `tool_projection_contract` (Trial 7 KO6-2/3/4 lanes) | 135/135 (124 + 11), 0 skipped, exit 0; no `asynchronous activity` / `state not initialized` |
| `npm --prefix gateway run lint` | exit 0 |
| `git diff --check` | exit 0 |

The counts I reproduced match the coder's logs.

## Findings
1. **Trial 7 Finding 6: closed.** `session_prompt_service.js:165` now calls
   `reportError(sessionId, error, binding.traceId)`. `binding.traceId` is
   captured from `row.trace_id` in `observe` (`:149`). It is the same value
   written to `SESSION_PROMPT_DETECTED` and to the answer audits, so all
   events for a prompt share one trace. The error path adds no state lookup,
   which keeps the Trial 7 rule that a watcher callback never escapes during
   state or audit shutdown. All three `reportError` call sites (`:165`,
   `:204`, `:220`) now pass a trace.
2. **The test exercises the real path and checks the emitted audit.** The
   test does the following:
   - It makes `roleData.sessionPromptScopes` throw.
   - It sends a real `approval.respond(granted)`, which runs the actual
     registered responder. That responder calls `answer` and then `policy`
     (`:68`), which throws inside `onDecision`.
   - It reads the stored `SESSION_PROMPT_ERROR` from the audit with `query`.
     It does not inspect a fixture.
   - It checks that no transport input was sent.

   The fixture's trace (`'trace'`) differs from its session ID (`'session'`),
   so the test also fails if the session ID were passed in place of the
   trace.
3. **Counterexamples considered, none blocking.**
   - If the session row is deleted before the decision, the captured trace is
     still correct. The Trial 6 version looked the trace up at error time and
     would have lost it in that case.
   - A policy failure on a granted approval leaves the prompt unanswered.
     That is fail-closed, and the test asserts no input is sent.
   - Audit-sink failure is still swallowed. That is unchanged from Trial 7.
4. **Non-blocking, unchanged from Trial 7:** the `*.log` evidence files match
   `.gitignore:59`. The manifest binds their hashes, but a commit will not
   carry them. The operator should decide whether to force-add them or keep
   only the JSON manifest and command results.

## Not verified by this review (root/operator-owned)
- Full `bash scripts/ci.sh` with disposable Redis and a scrubbed `AGENTS_*`
  environment, and its skip budget: **not run**.
- Live operator check: a Codex child's real prompt answered per policy, and a
  non-granted command waiting for `approval_respond`: **not run**.
- Commit, integration, promotion and release: none performed or implied. The
  candidate is uncommitted, so status stays `implemented` + `reviewed` for
  the targeted scope only.

## Next step
OK → the orchestrator commits the Trial 7+8 candidate with an explicit
pathspec, runs the root-owned full gate and live check, and then integrates.

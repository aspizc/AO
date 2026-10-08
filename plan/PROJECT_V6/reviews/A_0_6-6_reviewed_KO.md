# Review A_0_6-6 — KO

**Task:** plan/PROJECT_V6/A/0/06.md
**Trial:** 6
**Branch:** feat/V6-A-0-06-permission-prompts
**Commit:** 7ac9438 — feat(gateway): handle supervised permission prompts (PROJECT_V6 A/0/06), plus uncommitted `gateway/README.md` wording delta
**Reviewer:** Claude reviewer agent (independent Opus 5.5 session; no coder material reused as verdict evidence)
**Date:** 2026-10-08

## Summary
The Trial 6 README change clears the projection-contract failure, and the
pre-A06 baseline comparison for the four MCP/E2E failures holds. The candidate
still has a runtime regression that A06 introduced: after a supervised spawn,
the prompt watcher's timer callback throws `state not initialized` once state
has been torn down. I reproduced it on the pinned tmux. The full gate cannot go
green with it, and the handoff itself does not claim a green candidate.
**KO.**

## Checks
- [x] Archivos a crear / modificar: the delta from 7ac9438 is only
  `gateway/README.md`, and the Git index is empty. Manifest `177e8c30…`
  matches (35/35 bound file hashes). README SHA256 `4c1dd291…` matches, and
  full-gate log SHA256 `b8704bac…` matches.
- [ ] Tests requeridos: reattachment fails, details below.
- [ ] Criterios de aceptacion: the full gate is red because of a candidate
  regression.
- [x] Errores comunes evitados: no `orchestrator/` directory, the MCP server
  name is unchanged, and `policies/` was not touched.
- [ ] Definition of done: blocked by the regression. The full gate stays
  root-owned.
- [x] Global invariants: English only, no push, no restricted paths.

## Reproduction (reviewer-run, this session)
Environment for all runs: PATH prefixed with `/tmp/a06-test-bin` (tmux
`3.6a-agents.3`) and the repo `.venv`, `D007C_RUN_REAL_TMUX_PROBE=1`,
`D007C_TEST_TMUX_PATH=/tmp/a06-test-bin`, separate `TMUX_TMPDIR` per tree.
The baseline is a `git archive c0405b1` snapshot in reviewer scratch space that
shares the worktree's `node_modules`.

| Target | Candidate (7ac9438 + README) | Pre-A06 baseline c0405b1 |
| --- | --- | --- |
| `tool_projection_contract.test.js` (isolation=none) | 10/10 pass, exit 0 | n/a |
| `validateToolReferences` on HEAD README vs worktree README | HEAD: 4 violations (`session.prompt.{command,permission,trust,unknown}`); worktree: `[]` | n/a |
| otel_tool_spans + registry_overlay + e2e mcp_two_agent (concurrency=1) | 21: 17 pass / 4 fail, exit 1 | 21: 17 pass / the same 4 fail, exit 1, identical assertion diffs |
| same three files, all inherited `AGENTS_*` variables unset | **21/21 pass, exit 0** | — |
| `request_context_reattach.test.js` | 125: 124 pass / 1 file-level fail, exit 1 | 124/124 pass, exit 0 |

Candidate reattachment error, verbatim:
`Test "spawn accepted settles only its observed child after durable publication" … generated asynchronous activity after the test ended. This activity created the error "Error: state not initialized; call initState first"`.
The original full-gate log (lines 11681–11682) shows the same error for
**`spawn record-failure`** as well as `spawn accepted`.

Side note: my first reattachment run used the unpinned system tmux. That
produced an unrelated `tmux 3.6` vs `3.6a-agents.3` assertion, and the async
error was attributed to whichever test was running at the time. The pinned
rerun above is the authoritative result.

## Findings
1. **README fix (verified, but corrected via the wrong pattern).** The
   wording edit clears the projection-contract failure; I reproduced the RED
   on HEAD and the GREEN on the worktree. However, the repository already has
   a tested mechanism for policy-action names that look like tools:
   `NON_TOOL_DOTTED_TOKENS` in `gateway/src/tools/contract_projection.js:12`,
   which already holds `artifact.put.review_notes`, covered by the
   "review-note policy actions are not callable MCP tool names" test. The
   Trial 6 wording takes out the literal strings an operator has to type into
   `allowActions` and `AGENTS_AUTOAPPROVE`, and asks them to work the names
   out from a "joins with dots" rule. This weakens the operator docs to get
   past a validator (Rule 7). It is not blocking on its own, but it must be
   reworked together with Finding 3 (see correction 3).
2. **MCP/E2E failures were not introduced by A06 (confirmed), and the cause is
   now identified.** Their assertion diffs are identical on c0405b1. Removing
   every inherited `AGENTS_*` variable (not only `AGENTS_WORKER_*`) makes all
   21 tests pass on the candidate. These tests are not isolated from the
   gateway-spawned parent environment (`AGENTS_DRY_RUN`, `AGENTS_AUTOAPPROVE`,
   `AGENTS_POLICIES_DIR`, `AGENTS_REPOSITORIES_OVERLAY`, `AGENTS_WORKER_*`,
   etc.). This is a pre-existing test-hygiene defect outside A06 scope. It
   does not block this sheet, but the root-owned full gate must run with a
   scrubbed `AGENTS_*` environment, or the defect must be fixed under its own
   task.
3. **Blocking: A06 regression in the prompt watcher lifecycle.**
   - `gateway/src/services/session_prompt_service.js:205-214`: `tick` catches
     errors from `observe()`, but its `catch` calls `reportError`
     (`:189-191`). `reportError` queries `sessions.getSessionById` without a
     guard. The following `if (!closed && live(sessionId))` is also outside
     any `try`. When state has been reset or closed, an exception escapes a
     `setTimeout` callback and becomes an `uncaughtException`. In a production
     gateway that is a process-level crash path during shutdown or state loss,
     not only a test artifact.
   - `gateway/src/services/agent_service.js:761` arms `promptWatcher.watch()`
     *before* durable launch recording; the comment right below says the
     protected tool keeps cleanup ownership until recording. If recording
     fails (`spawn record-failure`), nothing stops the watcher. The original
     full gate shows that leak.
   - The test-side counterpart: the spawn fixture at
     `tests/gateway/request_context_reattach.test.js:1160ff` resets state in
     `t.after` and never calls `service.close()`.

## Required corrections (KO only)
1. **Make the watcher tick fail-closed and non-throwing**
   (`session_prompt_service.js` `watch`/`tick`/`reportError`). Wrap the whole
   tick body (observe, error reporting and the `live()` re-arm check) so that
   no exception can leave the timer callback. On any error, `stop(sessionId)`
   and do not re-arm. `reportError` must not throw if state lookup fails:
   capture the `traceId` when `watch()` arms the timer, or guard the lookup,
   and still send audit to stderr-safe sinks only.
   **RED first:** a focused test that arms `watch()` for a running session,
   calls `_resetForTests()` on state, waits past one tick, and asserts that no
   `uncaughtException` fires and no timer stays pending. It must fail on
   7ac9438.
2. **Do not leave a watcher armed for a launch that was never durably
   recorded** (`agent_service.js:761`). Arm it only after durable
   publication succeeds, or call `promptWatcher.stop(result.sessionId)` on
   every record-failure/cleanup path. **RED:** extend or add a test where the
   spawn `record-failure` path leaves zero pending prompt timers. The test
   must fail on 7ac9438.
3. **Restore exact policy-action names in `gateway/README.md` using the
   existing allowlist pattern.** Add the four `session.prompt.*` action names
   (taken from `policy_types.js:52-55`, not duplicated by hand if a shared
   export is practical) to `NON_TOOL_DOTTED_TOKENS`. Add a unit assertion
   alongside the `artifact.put.review_notes` test: these names pass
   `validateToolReferences` but are rejected as `mcp-tool-call` tools. Then
   put the literal `session.prompt.command|trust|permission|unknown` names
   back in the README.
4. **Close services in the spawn fixture.** Register
   `t.after(() => service.close())` *before* the state-reset hook, so it runs
   first, in every test that creates a real-spawn `createAgentService`
   (`request_context_reattach.test.js` spawn/delegate matrix). Do not count
   this as the fix: correction 1 must make the product safe even when the
   fixture does not close the service.
5. **Re-verify and report:** `request_context_reattach.test.js` passes with
   pinned tmux (125/125, or the new count with no file-level failure);
   the new RED tests fail on 7ac9438 and pass on the candidate;
   `tool_projection_contract.test.js` passes; `lint.gateway` exit 0;
   `git diff --check` exit 0. Record in the handoff the scrubbed-`AGENTS_*`
   environment used for the three MCP/E2E files (Finding 2). Code edits
   require the operator's authorization for that lane. The full `ci.sh` with
   Redis and live acceptance stay root-owned.

## Next step
KO → once runtime edits are authorized, the coder applies corrections 1–5 and
writes `A_0_6-7_to_review.md` with a fresh candidate manifest. No integration,
promotion or release is implied by any prior OK on this sheet.

# Review A_0_6-operator-1 — KO

**Task:** plan/PROJECT_V6/A/0/06-operator-response.md (option 1)
**Trial:** 1
**Branch:** feat/V6-A-0-06-operator-response
**Commit:** uncommitted candidate on HEAD ebe5535
**Reviewer:** Claude reviewer agent (independent Opus 5.5 session; no coder material reused as verdict evidence)
**Date:** 2026-10-09

## Summary
The candidate does what the option-1 design asks on every path I ran. TDD RED
is real and fails for the stated reasons. Every spot mutation the brief
requires goes red: timeout SQL CAS, rearm guard, in-flight no-write path and
Python exit predicate. Security invariants and docs hold.

**KO** because two spec-listed guards have no test that fails when the guard is
removed, and the handoff's predicate audit claims coverage for both:

1. the re-read after a lost timeout CAS;
2. the Node script's own exit-code predicate.

Both corrections are test-only, in `tests/gateway/session_prompt_external.test.js`.
I found no source defect.

## Checks
- [x] Manifest: all 9 candidate SHA-256 values match the handoff table. The
  working tree contains exactly those 9 paths (7 modified, 2 untracked) and the
  index is empty. `89225f5..ebe5535` adds only review artifacts. `policies/`,
  `gateway/src/core/request_context.js` and `gateway/src/tools/` are unchanged
  against HEAD. `git diff --check` is clean.
- [x] TDD RED reproduced on base sources, with the reasons confirmed (see Reproduction).
- [x] TDD GREEN: the focused Node lane and the CLI lane pass (see Reproduction).
- [ ] Guards tested: 32/39 mutants red. The 7 survivors are 3 real gaps
  (Findings 1–2) and 4 equivalent mutants (non-blocking notes 2–3).
- [x] Security invariants and docs (sections below).
- [ ] Definition of done: the full gate, live acceptance and commit are still open (see last section).

## Reproduction (reviewer-run, this session)
Environment:
- Every inherited `AGENTS_*` and `TMUX*` variable unset.
- `PATH` prefixed with `/home/carase/git/personal/AO/.venv/bin`.
- `TMPDIR` in reviewer scratch; node v22.22.1.

`PYTHONPATH` matters. Without it, the venv's editable `agents_cli` resolves to
the main checkout (`/home/carase/git/personal/AO/cli/src`). With
`PYTHONPATH=<root>/cli/src`, which the test's `fresh()` env sets,
`APPROVAL_RESPOND` resolves inside the tree under test. So the cross-process
tests do exercise this tree's wrapper and Node script.

Scratch copies were `git archive ebe5535` plus the overlays named below, sharing
`gateway/node_modules`. The worktree itself was only read and tested; its
`git status` is unchanged.

| Target | Result |
| --- | --- |
| `node --test tests/gateway/session_prompt_external.test.js tests/gateway/session_prompt.test.js tests/gateway/session_prompt_crash.test.js` (worktree) | 50 tests, 50 pass, 0 fail/cancelled/skipped, exit 0. The 14 new tests are `ok 37`–`ok 50`. |
| `PYTHONPATH=cli/src pytest -q tests/cli/test_approve.py` (worktree) | 28 passed, exit 0 |
| RED: the three RED tests of the final test file on base sources (`--test-name-pattern`) | 0/3 pass, exit 1. Failures at `:62` (inputs `[]` vs `['\r']`), `:79` (exit 0 vs 1) and `:93` (exit 0 vs 1). Same as `A_0_6-operator-1-red.txt.gz`. |
| RED reasons (diagnostic copy on base) | **RED1:** the base CLI returned `status: expired` with `promptAnswer not_answered/prompt_no_longer_bound/orphaned` and decider `session-prompt-watcher`. It wrote one `SESSION_PROMPT_INVALIDATED` for the live ID and sent no input. Text mode printed `<id>: expired` with exit 0. **RED2:** the dead owner got the same orphan expiry, exit 0 and a bare `expired`. **RED3:** `--decided-by operator-autonomous-mode` exited 0 and moved the row from pending to expired. |
| Dead-owner `agent-run approve` wall time | 10.2 s, exit 1, detail `external_response_timeout`. The declared 10 s bound was observed. |
| `node --test tests/gateway/tool_projection_contract.test.js` | 11/11, exit 0 |
| `npm --prefix gateway run lint` | exit 0. It does not reach repo-root `tests/gateway/`: linting the two new files directly reports them as outside the base path. |
| `ruff check cli/src/agents_cli/main.py tests/cli/test_approve.py` | passes |

The counts I reproduced match the coder's focused, CLI and doc-contract logs.

## Mutation results (scratch candidate copy)
Each mutant was applied alone, both lanes above were run, and the file was
restored and hash-checked. The unmutated control was green before each batch.

| Area | Mutant | Result |
| --- | --- | --- |
| Timeout SQL CAS (`approval_repo.js:148-150`) | drop `payload = ?` / drop `status = 'granted'` / drop `approval_id = ?` / also set `status='expired'` | RED (`:168`) / RED (`:168`, `:251`) / RED (`:260`) / RED (`:75` keeps `granted`) |
| In-flight / consumed no-write | pre-check without `promptAnswer` / without `consumed` | RED (`:168` isolated in-flight fixture) / RED (`:168`, `:238`) |
| | timeout via `recordPromptAnswer(..., null)` / via `invalidatePromptApproval` | RED both (`:131`, `:195`, `:238`, `:270`) |
| | poll loop or final read treats `in_flight` as terminal | RED (`:195`; `:195`+`:270`) |
| Re-read (`approval_service.js:180`) | re-read removed entirely | RED (`:75`, `:131`) |
| | **re-read only when the CAS won** | **SURVIVED** (50/50, 28/28): Finding 1 |
| External bypass (`approval_service.js:134`) | drop `!external` | RED (`:56` exit 1 vs 0; `:75` expired vs granted); `:195` hangs (note 1) |
| Same-process path | `respond` forced external | RED: 3 existing tests (restart orphan, crash recovery, legacy consumed rows) |
| Owner tick (`session_prompt_service.js:160-162`) | tick `answer` removed | RED (`:56`); `:195` hangs |
| Rearm guard (`session_prompt_service.js:151-152`) | drop status / detail / consumed / attemptedAt / response / target | RED each (`:149`) |
| | block removed / `previous` kept | RED (`:131`) |
| | drop `current.delete` / `bindings.delete` / `unregister` | SURVIVED, judged equivalent (note 2) |
| Reserved deciders | check removed / `session-prompt-watcher` missing | RED (`:87`) |
| Node exit predicate (`approval-respond.mjs:29-30`) | drop denial exemption / drop `isSessionPrompt` gate | RED (`:120`) / RED (`test_approve_granted`) |
| | **drop `outcome === "sent"` / remove whole predicate** | **SURVIVED** both: Finding 2 |
| Python predicate (`main.py:246-271`) | status-only `delivered` / drop returncode / drop `delivered` / drop denial / ignore `isSessionPrompt` / bare status text | RED each |
| | drop dict guard | SURVIVED, same exit code (note 3) |

## Defect-class checks
1. **Declared-not-observed.** Two coverage claims in the handoff's predicate
   audit table were not observed:
   - "Re-read after lost CAS": the cited fixture reports `uncertain` with or
     without the re-read.
   - "Node prompt success requires answered AND sent": the cited "dead-owner and
     in-flight subprocesses exit 1" are `agent-run` exits. The Python wrapper
     forces those to 1 whatever Node returns.

   Values I did observe: the 10 s bound (10.2 s measured), `isSessionPrompt: true`
   (`:64`, `:126`), and `answered/sent` in both JSON (`:65-66`) and text (`:70`).
2. **Authenticated-then-written-unbound.** The timeout write binds to the exact
   payload it read. `timeoutUnattemptedPrompt(latest)` builds the new payload by
   parsing `latest.payload`, then updates
   `WHERE approval_id = ? AND status = 'granted' AND payload = ?` with that same
   string. Each conjunct's mutant goes red. The owner still writes only through
   the existing exact-payload consume CAS inside `authorize`. I found no new
   write that is detached from the value it was authorized from.
3. **Recorded-as-done-without-running.** The CLI never reports `answered`
   because a grant persisted: it reports only a stored terminal answer, an
   explicit denial or `uncertain`. Every count I was asked to rerun reproduced.

## Security invariants
- `respondExternal` is imported only by `gateway/scripts/approval-respond.mjs`
  (and tests).
- MCP `approval.respond` is still bound to `approvalService.respond`
  (`gateway/src/tools/approval.js:11`). That function forwards four named fields
  to `decide`, where `external` defaults to false. The schema is still
  `strictObject` (`catalog.js:460-467`). Test `:226` asserts all of the following:
  `external` and `externalResponse` are rejected, the default context gives
  `context.capability_denied`, and the orchestrator deny is present.
- The CLI cannot supply a key, prompt text or persistent scope. The script reads
  only approval-id, decision, decided-by and note. For `session.prompt.*` rows,
  `decideApproval` never writes the note into the payload. The response stays
  fixed to `Enter`.
- Reserved deciders are rejected before `loadConfig`/`initState`
  (`approval-respond.mjs:14-17`). Test `:87` compares the whole approvals table
  before and after.
- No `policies/` change. No new stdout or console write in `gateway/src`; the
  script's JSON on stdout is its existing CLI channel. All text is English; the
  only non-ASCII character is the `›` glyph inside the Codex prompt fixture.

## Docs
`docs/operator-guide.md:261-270` meets the requirement:
- It uses the exact names `session.prompt.command`, `session.prompt.trust`,
  `session.prompt.permission` and `session.prompt.unknown`.
- It states the 10 s wait and the possible outcomes.
- It says a stored `granted` does not prove delivery, and that an uncertain
  timeout may still be finalized.
- It states the same-account residual, including shell-capable child agents.

This matches `A_0_6_operator_response_decision.md`.

## Findings (blocking)
1. **The spec guard "if that update changes zero rows, re-read before reporting"
   is untested.** The test at `:270` is named for this re-read, but its injected
   owner only reaches `in_flight`, so the result is `uncertain` either way.

   I probed a case where the owner finalizes between the CLI's deadline read and
   its CAS:
   - The candidate correctly reports the stored `answered/sent`.
   - The surviving mutant reports
     `uncertain/uncertain/external_response_timeout` (exit 1) while the stored
     result is `answered/sent`.

   That is a misreport for a delivered command, and the suite stays green.
2. **The Node script's prompt exit predicate is never observed directly.**
   `script()` (`:54`) is used only for reserved deciders. All other prompt exits
   go through `agent-run`, which recomputes success, so deleting
   `approval-respond.mjs:29-30` leaves the suite green. The spec's "returns
   nonzero unless answered/sent or an explicit denial" and "Neither CLI..."
   cover this script, and TDD GREEN says "not just the Node script".

## Corrections (KO)
1. In `tests/gateway/session_prompt_external.test.js`, extend the test at `:270`
   (or add a sibling) with a finalize case:
   - Inside the intercepted `run`, let the owner consume and then finalize:
     `const token = approvals.consumePromptApproval(id, row.payload, attempt)`,
     then `approvals.recordPromptAnswer(id, { status: "answered", outcome: "sent" }, token)`.
     Only then execute the CLI's statement.
   - Assert that `result.promptAnswer` has `status: "answered"` and
     `outcome: "sent"`, and equals `approvals.promptAnswerResult(approvals.getApproval(id))`.
   - Keep the existing in-flight case.
   - Record RED against this mutant of `approval_service.js:175/:180`:
     `const won = repo.timeoutUnattemptedPrompt(latest); if (won) {...}` with
     `const finalRow = won ? repo.getApproval(args.approvalId) : latest;`.
2. In the same file, assert the Node script's own exit code for prompt rows
   with `script()`:
   - (a) At the end of the dead-owner test (`:75`),
     `(await script(fx, orphan.approvalId)).code === 1`. The row is already
     terminal `not_answered`, so this returns at once; I measured exit 1 in 0.1 s.
   - (b) For a granted `session.prompt.command` row whose payload carries
     `promptAnswer: { status: "answered", outcome: "refused" }` (crafted with
     `UPDATE approvals SET payload` as at `:159`/`:180`), `script()` exits 1.
   - Record RED for both mutants: deleting `approval-respond.mjs:29-30` fails
     (a), and reducing `:30` to `result.promptAnswer?.status === "answered"`
     fails (b). The exit-0 sides are already pinned through `agent-run`
     (`:56`, `:120`), because the wrapper requires `returncode == 0`.

## Non-blocking notes
1. **Some regressions hang instead of failing.** `next()` (`:203`) has no bound,
   and the owner fixture's `setInterval` runs until it sees `answered`.
   - Under the `!external` and tick-`answer` mutants, `:195` hung until my
     driver killed it (600 s, then 120 s).
   - The kill left an orphaned `session_prompt_external_owner.mjs` process,
     which I killed.
   - Test `:56` still failed explicitly in both cases.

   I recommend bounding `next()` and giving the owner fixture an overall
   deadline.
2. **Three survivors are equivalent mutants:** dropping `current.delete`,
   `bindings.delete` or `unregister` from the rearm block. Once a row is
   retired it is terminal, so nothing observable can happen through those
   entries:
   - `consumePromptApproval` refuses it.
   - `decide` returns before calling any responder for a non-pending row.
   - `invalidate()` clears `current`.
   - `stop()` writes nothing for a terminal row.

   The plan-2 "reuse" hazard is enforced by `previous = null`, whose mutant is
   red at `:131`.
3. **The dict-guard survivor exits 1 either way.** Without the guard, an
   uncaught `AttributeError` also exits 1. The malformed-input tests
   (`test_approve.py:148`) assert only the exit code; asserting
   `invalid approval response` would pin the guard.
4. **Drive-by import reorder** at `tests/cli/test_approve.py:7-9`. The recorded
   `ruff check` invocation does not need it (the base ordering passes at repo
   root); it is what `ruff --config cli/pyproject.toml --fix` produces.
   Rule 3: revert it, or keep it deliberately.
5. **`agent.view` can now deliver a prompt.** `agent.view`
   (`agent_service.js:808`) calls `observe` directly, so it can be the call
   that delivers an externally granted prompt (`session_prompt_service.js:160-162`).
   An exception from `answer` would then propagate into `agent.view`, as it
   already can from the auto-grant branch at `:184`. This adds no authority:
   delivery still needs a granted row and the unchanged authorize/transport
   guards.
6. **The restart case does not model a crashed owner.** The `restart` mode of
   `:99` stops the first watcher before the restarted one observes, so the old
   ID is already `session_stopped`. Safety after a real crash follows from
   bindings being in-memory only, and `:75` covers the no-owner CLI path.
7. **Doc gap.** The guide does not say that after an external-timeout
   `not_answered (prompt_no_longer_bound)`, the owner requests the
   still-visible prompt again under a new approval ID, which needs a new
   decision.
8. **Audit events are not asserted.** The new tests do not check the external
   timeout's `SESSION_PROMPT_INVALIDATED` event, or the external grant's
   `APPROVAL_GRANTED` event with decider `operator`. Both come from code paths
   that are unchanged or mirror existing ones.

## Human-gated items (not decided by this review)
1. **Exit code when the stored decision differs from the requested one.**
   `agent-run approve <id> --decision granted` on an already-denied prompt
   exits 0 and prints `<id>: denied`; I confirmed this with a probe. The
   reverse case (a `denied` request on an already-delivered prompt) exits 0
   with `answered/sent`, by the same code path. This mirrors the existing
   idempotent semantics for ordinary approvals and the spec's wording
   "explicit `denied` exits zero". Whether a grant request should exit nonzero
   when the row is already denied is the operator's choice.
2. **Same-account residual.** It was accepted in
   `A_0_6_operator_response_decision.md` and is documented. This review neither
   grants nor revisits it.

## Not verified by this review (root/operator-owned)
- Full `bash scripts/ci.sh` (excluded by the brief) and full
  `npm --prefix gateway test`: **not run**. The host-attribution runs were not
  reproduced. The pinned `tmux 3.6a-agents.3` gate is still open.
- Real tmux transport and real-provider acceptance: **not run**. All delivery
  evidence comes from the deterministic transport fixture.
- Two Gateway watchers on one session at the same time: not exercised.
- Commit, integration, promotion and release: none performed or implied. The
  status stays `implemented`, not `reviewed`.

## Next step
KO, so Trial 2 adds Corrections 1–2 with RED evidence against the named
mutants. No source change is expected unless the new tests expose one. Then a
new handoff, and an independent review in a fresh trace and session.

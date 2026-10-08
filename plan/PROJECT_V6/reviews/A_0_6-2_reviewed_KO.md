# Review A_0_6-2 — KO

**Task:** plan/PROJECT_V6/A/0/06.md
**Trial:** 2
**Branch:** feat/V6-A-0-06-permission-prompts (uncommitted candidate on HEAD `5570d182e7fd8bf88f6513e5e9a2aa9f34ffb998`; implementation baseline `7982e422577ad6dfb37ef0c7b1e3c8433735430a`)
**Commit:** none (working-tree candidate only)
**Reviewer:** independent Claude reviewer session (claude-opus-5-5, medium); no subagent, no code edit, no commit/push, no `policies/` change
**Date:** 2026-10-08

## Summary

Trial 2 closes the Trial 1 race: every answer is now one CR through the pinned
`agents-submit-v1` guard, and I reproduced zero bytes on a real redraw for all
three prompt kinds. Stale and orphaned approvals now get durable, visible
results. The verdict is still **KO** on audit truth. The candidate consumes
the approval and sends the key before it writes any durable attempt record.
I reproduced a Gateway crash in that window: the child received the CR, no
`SESSION_PROMPT_ANSWER_ATTEMPT` was audited, and a later
`approval_respond` stamped the decision `not_answered` /
`prompt_no_longer_bound`. That record is false. Trial 1 wrote the attempt
audit before transport; Trial 2 dropped that write-ahead record.

## Bound inputs

- `A_0_6-2_to_review.md` sha256 `08e894cd4b3e470710d609f3be2102ab201d0919f81ced7fb9e1cbc5f97ac5df`.
- `evidence/A_0_6-2-candidate-and-evidence-sha256.json` sha256
  `f29b3e88bbcfb0644aec331eafd3ad739452839a140e659bbdc8cc9d71d9778d`
  matches the handoff. All 33 hashes it lists (21 candidate files and 12
  evidence files) match the working tree.
- The pinned `/tmp/a06-test-bin/tmux` is `tmux 3.6a-agents.3`, sha256
  `6487f795…c386`, which matches the manifest.
- The 21 candidate paths match `git status` exactly. `policies/` is
  untouched, and `git diff --check` exits 0.
- Trial 1 sources frozen in `/tmp/a06-trial1-replay` match
  `A_0_6-2-trial1-input-sha256.json`.

## Checks

- [x] Files to create/modify: recognizers, watcher, guarded answer path,
      `session.prompt.*` catalog actions, fixtures, README and CI inventory.
- [x] Tests required: ran as described below. GREEN passes. Lifecycle and
      real-tmux RED reproduce on Trial 1.
- [ ] Acceptance criteria: scope item 4 ("every answer … is audited") fails
      in the crash window. See KO-1.
- [x] Common mistakes avoided: no `p`, no persistent or auto-mode choice, no
      composer `submitPrompt`, no unguarded fallback.
- [ ] Definition of done: an uncommitted candidate is expected at this stage.
      Full CI and live acceptance are root-owned and were not run.
- [x] Global invariants: English, no push, `agents-gateway`, async approval,
      deterministic policy, `policies/` untouched.

## Verified

1. **Focused GREEN.** I ran the handoff's exact command with the pinned
   binary. Result: 296 tests, 296 pass, 0 fail/cancelled/skipped/todo.
2. **Real pinned-tmux guard.** `A04_TEST_TMUX=/tmp/a06-test-bin/tmux node
   --test tests/gateway/session_prompt_guard.test.js` passed 6/6. The test
   drives the real `observe` → human `respond` → watcher path on an owned
   server, and it redraws inside `run` immediately before
   `agents-submit-v1`, which is after the evidence capture and the approval
   CAS.
   - Redrawn command, trust and permission prompts each receive zero bytes,
     return `not_answered` and audit `refused`.
   - Unchanged prompts each receive exactly one `\r`.
   - A replay sends nothing.
   - The only write operation is `agents-submit-v1`, and no evidence buffer
     leaks.
   - The test asserts the tmux version instead of skipping, so a missing
     pinned runtime fails loudly. This matches A/0/04's guard tests.
3. **Lifecycle RED.** I copied the final `session_prompt.test.js` and the
   transport fixture onto the frozen, hash-verified Trial 1 sources. Result:
   28 tests, 16 pass, 12 fail, 0 skipped. All six new lifecycle and
   terminal-outcome cases (23–28) fail, along with the guarded-Enter and
   replay cases. This is consistent with the handoff's RED logs.
4. **Atomicity of the send.** `answerSessionPrompt`
   (`gateway/src/adapters/session_prompt.js:39-102`) runs these steps:
   - Checks the version and that `agents-submit-v1` exists.
   - Binds the PID, pane, geometry and cursor (`buildSubmitStateCmd`).
   - Captures `-b <uuid> -N -T`, then reads the raw bytes with strict UTF-8
     decoding.
   - Runs the recognizer, binding, live session, policy and approval CAS on
     those exact bytes.
   - Sends with `buildGuardedSubmitCmd`.

   Only a clean exit counts as `sent`. The exact guard diagnostic means
   `refused`, and anything else after the attempt means `uncertain`. Nothing
   is retried, and buffers are always deleted. The permit is a `WeakMap`
   capability used once, and callers cannot supply keys.
5. **Policy and role defaults.** No role ships `sessionPromptScopes`.
   - An automatic answer needs all of these: an exact `kind`+`command` scope
     with a canonical action, `allow` for both the prompt action and the
     underlying action, both actions in `allowActions`, the underlying action
     outside `NEVER_AUTO`, and operator auto-approve on.
   - Unknown prompts get `{ autoApproveScopes: [] }` and are refused even
     after a grant.
   - A human grant still respects role denies (`code.write` for unmapped
     commands).
   - Every check is a registry lookup with no model judgment.
6. **Replay and persistent choice.** A replay is blocked by both
   `binding.consumed` and the `consumePromptApproval` payload CAS. Every
   kind requires the first one-time choice to be selected, and the response
   is always a single CR.
7. **Stale and orphan results.** Invalidation, watcher stop and close, and
   orphan grants after a restart all record a durable terminal `promptAnswer`
   and `SESSION_PROMPT_INVALIDATED`.
   - A pending row moves to `expired`.
   - A granted row keeps its decision history.
   - `approval.respond` and `approval.poll` expose the result.
   - Only the dedicated `registerPromptResponder` grants answer authority;
     `approval.wait` and bus listeners do not.

## Adversarial check: crash between consume and outcome record

The order in `session_prompt_service.js:87-105` together with
`session_prompt.js:78-100` is:

1. `authorize` → `consumePromptApproval`: the payload gets
   `consumed:true`. No audit is written.
2. `agents-submit-v1`: the CR is delivered.
3. `onOutcome` → `finish`: `recordPromptAnswer` writes the outcome, and
   `SESSION_PROMPT_ANSWER_ATTEMPT` is audited.

If the process dies between steps 1 and 3, the database holds a granted,
consumed row with no result, and the audit holds no attempt. Examples are a
SIGTERM or SIGKILL, an OOM, or the host stopping while the 1000 ms tmux call
blocks the event loop. On the next `approval_respond`,
`approval_service.js:128-131` sees no responder and no `promptAnswer`, and
calls `invalidatePromptApproval`. That records `not_answered` /
`prompt_no_longer_bound` / `orphaned`.

**Reproduction.** The script is in the reviewer scratchpad. It is not
committed and does not edit the repository.

- Process 1: repository modules with the repository's
  `promptTransportFixture`. The guard callback writes `child_received` and
  then calls `process.exit(0)` (a crash after delivery).
- Process 2: the same SQLite file and audit log, a new watcher, then
  `respond(granted)` and `poll`.

```
child received CR before crash: true
row after crash: "granted" {...,"underlyingAction":"code.write","consumed":true}
audit after crash: APPROVAL_REQUIRED,SESSION_PROMPT_DETECTED,APPROVAL_GRANTED
respond again: {...,"status":"granted",...,"promptAnswer":{"status":"not_answered","reason":"prompt_no_longer_bound","detail":"orphaned"}}
audit final: APPROVAL_REQUIRED,SESSION_PROMPT_DETECTED,APPROVAL_GRANTED,SESSION_PROMPT_INVALIDATED(orphaned)
```

The child acted on a decision, but there is no attempt audit, and the durable
record says it was not answered. This breaks scope item 4 and the requirement
that a result is never claimed without proof. In this window the only true
state is `uncertain`.

## Required corrections

1. **Write ahead before transport (blocking).** In the same CAS that
   consumes the approval (`consumePromptApproval`), durably record an
   in-flight marker in the payload. Example:
   `promptAnswer: { status: "in_flight", outcome: "attempting", response: "Enter", target, attemptedAt }`.
   Then append `SESSION_PROMPT_ANSWER_ATTEMPT` with
   `outcome: "attempting"`, the command, the approval ID, the decider and
   the target, before `buildGuardedSubmitCmd` runs. If that audit append
   throws, send nothing.

   `finish` must then replace only an `in_flight` marker with the terminal
   `sent` / `refused` / `uncertain` result, using a CAS on the in-flight
   payload. It must audit the terminal outcome. `SESSION_PROMPT_ANSWERED`
   must be emitted only when that terminal write succeeded with `sent`.
   Today it is emitted at `session_prompt_service.js:106` even if
   `recordPromptAnswer` returned `false`.
2. **Resolve in-flight orphans as uncertain, never as unbound (blocking).**
   Two paths must handle this case:
   - `invalidatePromptApproval` / `recordPromptAnswer`, reached through
     `approval_service.respond`, `watcher.answer` with no binding, and the
     watcher's invalidate and stop.
   - A row that is `consumed:true` or `in_flight` and has no terminal result.

   Both must record `{ status: "not_answered", outcome: "uncertain", reason: "transport_uncertain_after_restart" }`
   (or an equivalent explicit uncertain result) and audit it. They must never
   record `prompt_no_longer_bound`, and must never send keys or retry.
   `prompt_no_longer_bound` stays correct only for rows that were never
   consumed.
3. **Add a RED test for the crash window, then GREEN.** Model the crash with
   a guard or transport callback that stops before `onOutcome`. A
   two-process test like the reproduction above, or a thrown sentinel that
   escapes `answerSessionPrompt`, both work, as long as the state is
   "consumed and key delivered, no terminal result". Then build a fresh
   watcher and assert all of the following:
   - (a) A `SESSION_PROMPT_ANSWER_ATTEMPT` with `outcome: "attempting"`
     already exists.
   - (b) `respond(granted)` and `poll` report `uncertain`, not
     `prompt_no_longer_bound`.
   - (c) No `SESSION_PROMPT_ANSWERED` exists.
   - (d) No second input is sent.

   Record RED on the Trial 2 candidate and GREEN after the fix. Keep the
   existing six real-tmux guard cases green.
4. **Update the handoff and `gateway/README.md`.** Document the in-flight
   marker, the crash-recovery `uncertain` result, and that an `uncertain`
   prompt is never re-answered automatically. Put this next to the existing
   refusal and uncertainty text.

## Non-blocking notes

- A. A consumed binding whose identical prompt is still on screen (for
  example after a guard `refused` caused by pending output with an unchanged
  grid, or after a `policy_denied` refusal) is returned unchanged by
  `observe` (`session_prompt_service.js:124-125`). No new request is raised,
  so the child stays waiting until the pane changes or a person types. This
  fails safe and is acceptable for this sheet. Consider surfacing it in
  `view` as needing a human.
- B. A human grant for an unmapped command needs `code.write`. A reviewer
  role that denies `code.write` can therefore never have even `npm test`
  answered by a human grant (`policy_denied`) until the operator adds a
  scope. This is conservative and deterministic. Say it explicitly in
  `gateway/README.md`.
- C. Trial 1 notes A (no load-time validation of `sessionPromptScopes`) and
  B (the whole unknown pane is stored as `command` in the payload and audit,
  which may include secrets) are still open and non-blocking.
- D. Prompt ownership across Gateway processes is not leased, as the handoff
  says. The guard stops a duplicate approval from answering a changed
  prompt, but two processes can still raise duplicate approvals.
- E. Full `bash scripts/ci.sh` with required Redis, and the operator's
  live Codex/Claude acceptance, are root-owned and were not run. This
  review gives them no credit.

## Status

Trial 2 is **KO**. A/0/06 remains `planned`/unimplemented under the
canonical status rule. Nothing is reviewed OK, integrated, promoted or
released. Trial 3 needs new immutable `A_0_6-3_*` files, a fresh
orchestration trace and a fresh reviewer session.

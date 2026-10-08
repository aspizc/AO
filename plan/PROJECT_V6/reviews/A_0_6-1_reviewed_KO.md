# Review A_0_6-1 — KO

**Task:** plan/PROJECT_V6/A/0/06.md
**Trial:** 1
**Branch:** feat/V6-A-0-06-permission-prompts (uncommitted candidate on base `7982e422577ad6dfb37ef0c7b1e3c8433735430a`)
**Commit:** none (working-tree candidate only)
**Reviewer:** independent Claude reviewer session (claude-opus-5-5, medium); no subagent, no code edit, no commit/push
**Trace:** `tr-v6-a06-r1-a812294d-7992-4561-9728-b3826dec7550`
**Task id:** `ts-3cb4b6cd-9f7f-469e-ba84-5a6a7b4307c4`
**Date:** 2026-10-08

## Summary

Recognizers, fixtures, policy evaluation, async approval, audit, unknown-menu
handling and replay protection hold. RED and GREEN reproduce. The verdict is
**KO** on scope item 6: "A changed/disappeared prompt receives no keys". The
candidate rechecks the pane with one set of tmux commands, then sends the
answer with a plain `send-keys` in a separate command. On the pinned runtime I
showed that a `y` approved for `npm test` reached a changed prompt for
`rm -rf ~/important`. The pinned runtime already has a server-side guard,
`agents-submit-v1`, that compares the grid and sends in one command. It
refused the same interleaving and wrote zero bytes. The coder flagged this gap
in the handoff. The tools to close it already exist, so the sheet requirement
is not met.

## Bound inputs

- `A_0_6-1_to_review.md` sha256 `ecafbf16c28cb0812be75ba76d9e9597286ef1bb051ad1720ca5f75a2ece6a80`.
- `evidence/A_0_6-1-candidate-sha256.json` sha256 `7d659e7fd147aa07194042eeb725c47d70b8bdc87a08d33af23854258f1f52b0`.
  I recomputed all 16 listed hashes, and each matches the working tree.
- `A_0_6_human_decision.md` sha256 `c74de48d7ab4810d552df4e84daa275e6a8b6ecbf43e86de3b584fb3ffb1e864`.
- `HEAD` = `7982e422577ad6dfb37ef0c7b1e3c8433735430a`. The 15 status entries
  are the 9 modified and 6 untracked paths from the handoff.

## Verified

1. **RED.** I extracted a clean `git archive 7982e42` and added the final
   `session_prompt.test.js` and fixtures. Result: 22 tests, 0 pass, 22 fail,
   0 skipped. All ten sheet-required names are among the failures.
2. **GREEN.** I ran the handoff's focused command with
   `/tmp/a06-test-bin/tmux` (`tmux 3.6a-agents.3`). Result: 273 tests, 273
   pass, 0 fail/cancelled/skipped/todo.
3. **Raw captures and sanitized fixtures.** Each pair has the same byte
   length (1924, 1864, 2270) and matches line by line, except for private
   absolute paths:
   - codex-command: lines 2 and 13. `/home/carase/git/personal/AO/.venv`
     becomes a padded `/tmp/a06-fixture…` of equal length.
   - codex-trust: line 2, the `/tmp/ao-a04-live-probe/...` path.
   - claude-permission: lines 3, 12 and 30, the `/tmp/ao-a06-claude-capture`
     path.

   No other byte changed. `README.json` states the provenance accurately.
4. **Exact choices.** `answerSessionPrompt` accepts only `y` or `Enter`. The
   permit is internal to a `WeakMap`, and callers cannot supply keys.
   - Codex commands get literal `y`.
   - Trust and Claude permission get one Enter. The recognizers require the
     one-time first choice to be selected (`› 1.` / `❯ 1. Yes`).
   - `p`, "always allow", "don't ask again" and the "switch to auto mode"
     choice (option 3 of Claude's four-choice dialog) are never sent.
5. **Default scopes and determinism.**
   - `policies/` is untouched, and no role defines `sessionPromptScopes`.
   - Automatic answers need four things: an exact `kind`+`command` scope with
     a canonical action, `allow` (not `require_approval`) for both the prompt
     action and the underlying action, both actions in the role's
     `allowActions`, and the underlying action outside `NEVER_AUTO`.
   - `AGENTS_AUTOAPPROVE` must also be on. Otherwise `config` is replaced by
     `{ autoApproveScopes: [] }`.
   - Human grants still respect role denies. Unmapped commands need
     `code.write`.
   - Every check is a registry lookup with no model judgment.
   - `registry.js validateRoles` does not reject the extra role key, so an
     operator-added scope does load. See note A.
6. **Async approval.** The watcher uses non-blocking `request` plus
   `approvalBus.once`, and answers after `approval.respond` without another
   view.
7. **Audit.** `SESSION_PROMPT_DETECTED`, `SESSION_PROMPT_ANSWER_ATTEMPT`
   (written before transport) and `SESSION_PROMPT_ANSWERED` carry the command
   text, approval ID, target and decider.
8. **Unknown prompts fail closed.** `kind === "unknown"` never gets the
   auto-approval config and is refused in `answer` even after a grant.
9. **Replay protection.** `binding.consumed` and the
   `consumePromptApproval` compare-and-set on `status='granted' AND payload=?`
   come before transport. Replay is not retried.
10. **Stale and disappeared prompts.** If the capture is missing or the prompt
    is not recognised, the binding is invalidated, so an identical prompt
    that returns needs a new request. This is correct up to the race in KO-1.

## Adversarial check: the gap between recheck and send

`answerSessionPrompt` (`gateway/src/adapters/session_prompt.js:37-49`) runs
these steps:

1. `display-message`, `capture-pane` and `display-message`, each a separate
   tmux command.
2. `authorize`: a recognizer rerun, an approval read, the SQLite
   compare-and-set and an audit append, all in the Gateway process.
3. A plain `send-keys -l -- y` or `send-keys Enter`.

The pane state is not checked at the moment of the write.

**Reproduction.** I used the pinned binary on a private socket
(`tmux -L a06race`) and killed only that socket afterwards. The pane ran a
script that showed a Codex command prompt for `npm test` and read one key.
Inside `authorize`, which is the compare-and-set/audit window, the script was
told to redraw the same menu for `rm -rf ~/important`. Output:

```
recognized before: {"kind":"command","command":"npm test","options":["y","esc"]}
answer returned: true
child log: key=[y] while prompt=B
```

So a changed prompt received the approved key. `answer returned: true` would
also lead the watcher to audit `SESSION_PROMPT_ANSWERED` for `npm test`, which
is false.

**Control.** Same pane and same redraw, using the existing runtime guard:
`capture-pane -b <uuid> -N -T`, then the redraw, then
`agents-submit-v1 -b <uuid> -r <pid> -p <pane_pid> -x/-y/-c/-l ... -t %N`.
Output:

```
guarded submit status 1 "agents: guarded submit refused"
child log: (no key received)
```

Real-world triggers for this window include:

- A human answering the same pane in tmux while the watcher is in its send
  window.
- A provider redrawing the menu, for example a queued second approval.
- A second Gateway process watching the same session, since each process has
  its own in-memory watcher.

The window is short, but the sheet says the prompt "receives no keys", not
"rarely receives keys".

## Lifecycle after restart or reattach

The watcher state (`bindings`, `current`, timers) is in memory only. A
Gateway restart is handled safely: old IDs cannot answer, and the next `view`
or spawn starts a new observation. Two weaknesses remain:

- Approvals that were invalidated or orphaned stay `pending` in the database
  and can still be granted. A grant on them is silently ignored, with no
  audit or status saying the decision was void.
- Each process watches separately, so two Gateway processes create duplicate
  approvals for one prompt.

These are covered by KO-3.

## Required corrections

1. **Close the recheck-to-send race (blocking).** Send the decision through
   the pinned runtime's atomic guard, never through plain `send-keys` after a
   separate recheck:
   - Capture the evidence with `capture-pane -b <uuid> -N -T`.
   - Run the recognizer, binding and approval compare-and-set on those exact
     buffer bytes.
   - Deliver with `agents-submit-v1`, which compares grid, PIDs, size and
     cursor and enqueues one CR in the same server command.

   Codex's command menu requires `› 1. Yes, proceed (y)` to be selected, and
   its own footer reads "Press enter to confirm", so one CR is the same
   one-time answer as `y`. That makes all three kinds a single guarded CR.
   Use the low-level builders (`buildSubmitEvidenceCmd`,
   `buildSubmitStateCmd`, `buildGuardedSubmitCmd`), not the composer
   `submitPrompt`, as the sheet requires.

   A guard refusal or an uncertain result must:
   - send nothing more and not retry;
   - audit an attempt with outcome `refused` or `uncertain`;
   - never emit `SESSION_PROMPT_ANSWERED`.

   If a different primitive is truly needed for `y`, add a guarded
   compare-and-send variant to the pinned runtime under A/0/04's runtime
   ownership instead. Do not keep the unguarded path.
2. **Add a real-input RED test for the race.** Use an isolated `tmux -L`
   server on the pinned runtime, as in the reproduction above. Redraw the
   pane to a different command inside the window after evidence capture and
   before transport. Assert that the child receives zero bytes, `answer`
   reports `not_answered`, and no `SESSION_PROMPT_ANSWERED` is audited. The
   current test "changed or disappeared approved prompt receives no keys"
   changes the mocked capture before the recheck, so it cannot see this
   window. Record RED on the Trial 1 transport, then GREEN.
3. **Make voided prompt approvals durable and visible.** When the watcher
   invalidates a binding, stops a session, or finds a granted approval with
   no live binding, record it. Either move the row out of a grantable
   `pending` state or audit it (for example `SESSION_PROMPT_INVALIDATED` with
   the approval ID and reason). Then a human grant on a stale or orphaned ID
   gets an explicit "not answered: prompt no longer bound" result instead of
   being silently ignored. Test both an invalidation and a restart/new-watcher
   orphan.
4. **Update the handoff and `gateway/README.md`.** Remove the statement that
   the recheck and send "do not provide the server-side atomic guard". Then
   describe the guarded path and its refusal semantics.

## Non-blocking notes

- A. `sessionPromptScopes` entries are not validated when the registry
  loads. A typo in `kind` or an action that is not canonical is silently
  ignored, which fails closed. The operator-owned `policies/` change could
  ship with load-time validation later. This is not required for this sheet.
- B. `session.prompt.unknown` stores the whole visible pane as `command` in
  the approval payload and the audit. That is intended for the human, but
  the pane may contain secrets. Consider the existing sanitization rules for
  the audit copy.
- C. The full `bash scripts/ci.sh` with required Redis and the operator live
  check are still open and owned by root. No gate or live acceptance is
  credited by this review.

## Status

Trial 1 is **KO**. A/0/06 remains `planned`/unimplemented under the
canonical status rule. Nothing is reviewed, integrated, promoted or released.
The next trial needs a fresh orchestration trace and a fresh reviewer
session.

# V6 A/0/06 — Trial 2 review request

Uncommitted candidate in `wt-v6-a06`, branch
`feat/V6-A-0-06-permission-prompts`, HEAD
`5570d182e7fd8bf88f6513e5e9a2aa9f34ffb998` (committed independent Trial 1 KO).
Implementation baseline remains `7982e422577ad6dfb37ef0c7b1e3c8433735430a`.
This is a coder handoff, not a verdict. Root owns the fresh independent review,
actual-provider live acceptance and full CI with required Redis.

No commit, staging, push, subagent, self-review, policy edit or full CI run was
performed in this correction. Trial 1 handoff, verdict and evidence were not
edited. Their bound hashes still match the independent verdict:

- Trial 1 handoff: `ecafbf16c28cb0812be75ba76d9e9597286ef1bb051ad1720ca5f75a2ece6a80`.
- Trial 1 candidate manifest: `7d659e7fd147aa07194042eeb725c47d70b8bdc87a08d33af23854258f1f52b0`.

## The four required corrections

1. **Atomic guarded input.** All Codex command/trust and Claude permission
   answers now send one CR through pinned `agents-submit-v1`, never ordinary
   `send-keys`. The response remains an internal one-use permit, separate from
   composer `submitPrompt`. Version/command support is checked first. The
   answer path captures `capture-pane -b agents-submit-<uuid> -N -T`, reads its
   exact raw bytes with `save-buffer`, decodes UTF-8 strictly, and reruns the
   recognizer, prompt binding, live session/role policy and approval CAS against
   that evidence. `buildSubmitStateCmd` binds the server/pane PID, exact pane ID,
   dimensions and cursor. `buildGuardedSubmitCmd` invokes the pinned runtime's
   atomic grid/PID/geometry/cursor/mode/pending-output comparison and single-CR
   enqueue. The selected first one-time choice is required for every kind.
   There is no `y`, `p`, persistent permission, auto-mode choice or fallback.
   Owned evidence buffers are consumed or cleaned on all paths.

   A known guard diagnostic produces `refused`. Exceptions, nondiagnostic
   failures, ambiguous successful returns and uncertain post-attempt cleanup
   produce `uncertain`. There is no retry. Both outcomes persist a visible
   `not_answered` result and audit `SESSION_PROMPT_ANSWER_ATTEMPT` with command,
   approval ID, decider, response, target and outcome. They do not emit
   `SESSION_PROMPT_ANSWERED`; only a confirmed successful guard does.
2. **Real-input race proof.** A disposable Python raw-terminal fixture renders
   menus and records input bytes; it never executes the shown commands. The
   existing foreground ownership helper uses a unique private absolute `-S`
   socket (equivalent isolation to a private named `-L` server), then closes
   only owned sessions and reaps that server. The runner redraws the child
   after evidence capture/authorization and immediately before the transport
   operation, waits until the different menu is visibly captured, then runs
   the original or fixed write. Tests cover all three kinds and their
   unchanged positive controls, visible response outcomes, audit and replay.
3. **Durable visible invalidation.** Invalidated bindings/session stops expire
   pending prompt approvals and record terminal `promptAnswer` context plus
   `SESSION_PROMPT_INVALIDATED`. Granted decisions keep their decision history
   but receive an explicit voided answer result. `approval.respond` and
   `approval.poll` expose that result. A dedicated registered responder grants
   answer authority; ordinary EventEmitter/approval-wait listeners do not.
   Orphaned pending or already granted IDs are marked unbound when answered or
   granted after restart/new-watcher creation. They report
   `not_answered` / `prompt_no_longer_bound`; stale grants no longer silently
   succeed. Original command/options/context survive these terminal results.
4. **Documentation and handoff.** `gateway/README.md` now describes the atomic
   evidence/guard path, one-time CR, refusal/uncertainty and stale/orphan result
   semantics. The prior non-atomic-path limitation was removed. This new
   request is exclusive-created and immutable; Trial 1 remains historical KO.

## RED evidence before corrections

The Trial 1 candidate's 16 source/fixture hashes were checked against its
reviewed manifest before any correction. Those originals were frozen in
`/tmp/a06-trial1-transport`; their hashes are retained in
[`A_0_6-2-trial1-input-sha256.json`](evidence/A_0_6-2-trial1-input-sha256.json).

- `node tests/gateway/session_prompt.test.js`: 26 tests, **22 pass / 4 fail**,
  zero skips. New failing names: invalidation expires durably with a visible
  stale-grant outcome; watcher stop makes decisions non-grantable; new-watcher
  restart orphan has durable response/poll outcomes; approval respond alone
  rejects an orphan even when an approval-wait listener exists.
  [Lifecycle RED](evidence/A_0_6-2-lifecycle-red.log).
- `node tests/gateway/session_prompt_transport.test.js`: **0 pass / 4 fail**,
  zero skips. New failing names cover exact buffered guarded Enter, refused
  outcomes/no retry, uncertain delivery/no retry, and unavailable runtime or
  denied authorization with cleaned evidence.
  [Transport RED](evidence/A_0_6-2-transport-red.log).
- Host real-tmux command below: **0 pass / 6 fail**, zero skips. On Trial 1,
  the changed command received hex `79` (`y`); changed trust/Claude menus each
  received hex `0d` (CR). Positive controls also rejected Trial 1's unguarded
  path or missing visible answer outcome.
  [Real-tmux RED](evidence/A_0_6-2-real-tmux-red.log).

```bash
A04_TEST_TMUX=/tmp/a06-test-bin/tmux \
node --test tests/gateway/session_prompt_guard.test.js
```

Two additional terminal-outcome cases were replayed against a `git archive`
of HEAD overlaid with the frozen, hash-verified Trial 1 candidate sources.
They cover an already-granted orphan preserving history, and uncertain watcher
input producing an audit/result without any answered event:

```bash
node --test --experimental-test-isolation=none \
  --test-name-pattern='granted restart orphan|uncertain watcher delivery' \
  /tmp/a06-trial1-replay/tests/gateway/session_prompt.test.js
```

**0 pass / 2 fail**, zero skips:
[Terminal-outcome RED](evidence/A_0_6-2-terminal-outcomes-replay-red.log).
An earlier invocation used unsupported `--test-isolation=none`; its separate
logs are retained but are NOT counted as RED or GREEN evidence.

## GREEN and verification

Pinned binary: `/tmp/a06-test-bin/tmux`, `tmux 3.6a-agents.3`, SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`.
Same real-tmux command/fixture on the fix: **6 pass / 0 fail**, zero skips.
All three redraw cases receive zero bytes, response `not_answered`, an audited
`refused` outcome and no answered event. All three positive controls receive
exactly one CR through `agents-submit-v1`, with no replay and no leaked evidence
buffers: [Real-tmux GREEN](evidence/A_0_6-2-real-tmux-green.log).
The two terminal-outcome tests pass on the corrected worktree with the same
pattern command and relative test path: **2 pass / 0 fail**, zero skips:
[Terminal-outcome GREEN](evidence/A_0_6-2-terminal-outcomes-replay-green.log).

Final focused host command:

```bash
PATH="/tmp/a06-test-bin:$PATH" A04_TEST_TMUX=/tmp/a06-test-bin/tmux \
node --test tests/gateway/*prompt*.test.js \
  tests/gateway/autoapprove_mechanism.test.js \
  tests/gateway/approval_service.test.js tests/gateway/tool_agent.test.js \
  tests/gateway/tool_approval.test.js tests/gateway/approval_state.test.js \
  tests/gateway/approval_wait.test.js tests/gateway/tool_catalog.test.js
```

**296 tests / 296 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo**:
[Final focused GREEN](evidence/A_0_6-2-final-focused-green.log).
Includes all 28 watcher/recognizer cases, four transport cases and six
real-input cases. The historical fixture strings and sanitized recorded pane
files were retained; the historical `y` assertion is updated to guarded CR per
the independent correction. Trial 1's immutable logs preserve its former
behavior and failing gap.

Changed Gateway sources passed ESLint (exit 0):
[Final lint](evidence/A_0_6-2-final-lint.log).
The terminal fixture passed `.venv/bin/ruff check` (exit 0):
[Python lint](evidence/A_0_6-2-python-lint.log).
`git diff --check` passed (exit 0):
[Diff check](evidence/A_0_6-2-sealed-diff-check.log).
CI inventory hashes were refreshed without changing requirements/skip budgets.
`python3 scripts/ci_gate.py --validate-only` passed with no manifest errors:
[Inventory validation](evidence/A_0_6-2-final-inventory-validation.log).
That command does not execute the full CI gate.

## Candidate and evidence hashes

Every changed/new candidate source, test, fixture and README/CI path, every
credited RED/GREEN/verification log and the Trial 1 binding hashes are enumerated
in [the SHA-256 manifest](evidence/A_0_6-2-candidate-and-evidence-sha256.json).
Manifest SHA-256: `f29b3e88bbcfb0644aec331eafd3ad739452839a140e659bbdc8cc9d71d9778d`.
This uncommitted file manifest identifies the review candidate; no candidate
commit/tree SHA or integration/release status is invented.

## Root-owned checks and limits

No full `ci.sh`, required Redis lane, actual-provider live answer acceptance or
independent verdict was run here. Root must perform those checks on this
candidate. Missing pinned runtime or unavailable input modes intentionally
refuse; there is no unguarded fallback. Approval bindings remain process-local:
this correction makes stale/orphan decisions durable and visible, but does not
introduce a multi-Gateway prompt-ownership lease or claim cross-process dedup.
Unknown panes still require a human and receive no automatic keys. Operator
policy scopes remain absent by default and `policies/` is untouched.

The ignored evidence logs must be included explicitly by root when committing
reviewed work. This request and the bound evidence manifest were created once;
subsequent corrections need Trial 3 files rather than overwriting this trial.

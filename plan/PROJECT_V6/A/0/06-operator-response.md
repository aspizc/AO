# A/0/06 operator response across processes — proposed refinement

Status: **proposed; security choice pending**. This refines A/0/06's manual
approval acceptance after the integrated implementation at `44c215f`. It
does not change the default of zero automatic command scopes.

## Observed gap

The default stdio request context excludes `approval.respond` and the base
orchestrator role denies it. This deliberately prevents a model using the MCP
connection to grant its own approval. Prompt approvals created by the watcher
also do not enter request-context ownership, so adding only the capability
would still fail.

The existing `agent-run approve` command starts a separate Node process. Its
`approval_service.respond` sees no process-local `promptResponders` entry and
invalidates an otherwise live pending `session.prompt.*` approval as orphaned.
The script can exit zero with a `not_answered` result. An in-process unit test
cannot establish the operator CLI path. Source evidence:
`gateway/src/core/request_context.js` (default capabilities, `ownedApproval`),
`gateway/src/services/approval_service.js` (`promptResponders`, `respond`),
`gateway/src/services/session_prompt_service.js` (`observe`, `answer`, `watch`),
`gateway/scripts/approval-respond.mjs`, and
`gateway/src/core/repositories/approval_repo.js`.

## Security gate

The existing CLI can be run by any process with the operator's OS account and
access to its SQLite state. Some non-Codex CLI read-only profiles can still
expose a shell (A/0/00 residual), so this is not strong separation from every
agent. Making this path deliver prompt approvals would make that limit
material to A/0/06. Per AGENTS.md Rule 15, the operator must choose:

1. Accept this local-account authority for 1.1.0 and use the existing CLI,
   with its residual documented and tested. This is the smallest correction.
2. Require a separately protected operator identity or secret first. That is
   a larger design and blocks A/0/06 release acceptance until reviewed.
3. Leave manual prompt approval and 1.1.0 pending.

Record the answer in `reviews/A_0_6_operator_response_decision.md` before
implementing the selected path. The human decision is not inferred from a
model review or a successful shell command.

## Proposed local-account path, contingent on option 1

Keep default MCP `approval.respond` capability and the orchestrator role deny
unchanged. Keep ordinary approvals and same-process prompt responders on their
existing path. The operator CLI alone selects an explicit external-response
mode; its grant is persisted with the existing `decideApproval` compare-and-set,
audit event and decider. It must not report `answered` merely because grant
persistence succeeded.

The owning Gateway watcher checks its already-bound pending approval on each
tick. If another process has granted that exact ID, it calls the existing
`answer` path only while the original in-memory binding, session, prompt,
target and role policy remain valid. `answer` retains its write-ahead attempt,
guarded tmux CR, exact-payload consume CAS and terminal result. A different or
restarted Gateway never reconstructs the old binding and never sends keys for
its ID.

The CLI waits for a terminal `promptAnswer` for a bounded interval (proposed
10 seconds). It returns nonzero unless the result is `answered/sent` or an
explicit denial. At timeout it re-reads the row:

- A granted row with neither `consumed` nor `promptAnswer` can be marked
  `not_answered` with reason `prompt_no_longer_bound` and detail
  `external_response_timeout`, using one SQL compare-and-set on the exact
  payload just read. If that update changes zero rows, re-read before
  reporting. Keep the granted decision history.
- A row with `promptAnswer.status=in_flight` or `consumed` without a terminal
  answer receives **no CLI write**. Report `uncertain` and exit nonzero. Only
  the owning watcher may settle its exact in-flight token; its later `sent`
  result must remain writable. The CLI must not use
  `invalidatePromptApproval` or `recordPromptAnswer(..., null)` for this
  granted timeout path, because those convert in-flight delivery into an
  incorrect restart-uncertain result.
- A terminal row is reported exactly as stored. No timeout result implies
  that the command certainly did not run unless no input attempt began.

On every watcher tick, before reusing an unchanged screen, `observe` re-reads
the existing approval. If an external timeout finalized it as
`not_answered/external_response_timeout` before any input attempt, the watcher
removes the old binding and unregisters it without another consume or key.
The next observation of the same prompt creates exactly one fresh pending ID.
An `answered/sent` or uncertain terminal result is **not** rearmed merely
because the old menu remains visible; the prompt must change before a new
request. This prevents duplicate input after uncertain delivery.

No input key travels through the CLI, no prompt text is taken from its flags,
and it cannot request a persistent allow rule. The `agent-run approve` wrapper
sends the fixed decider `operator`; the Node script rejects reserved
`operator-autonomous-mode` and `session-prompt-watcher` deciders before any DB
mutation. Document clearly that this is same-account local authority, not
authenticated human presence.

The Node script identifies a `session.prompt.*` row in its JSON response with
an explicit `isSessionPrompt` boolean. `cli/src/agents_cli/main.py` preserves
ordinary approval output, but for prompt approvals prints the terminal
`promptAnswer.status/outcome` and optional reason. It exits zero only for
`answered/sent` or explicit `denied`; missing answer, `not_answered`,
`uncertain`, script error or malformed JSON exit nonzero. Neither CLI prints a
bare `granted` as proof that a command ran.

## TDD RED

Add a cross-process test that starts a watcher with a pending prompt and
executes **`agent-run approve`** against the same temporary SQLite DB (which
invokes the actual Node script). On this base it fails because the CLI
invalidates the live ID. Require: one guarded CR, one
`SESSION_PROMPT_ANSWERED`, `promptAnswer=answered/sent`, CLI exit zero,
parsed JSON and text both report delivery, and no `SESSION_PROMPT_INVALIDATED`
for the live ID. A second RED test makes a dead-owner CLI grant exit nonzero
with `not_answered`; the current wrapper exits zero and prints bare
`granted`/`expired`. A third rejects a reserved decider without a DB change.

## TDD GREEN and guards

Add only the external CLI response path, Python CLI output/exit contract, and
owner-watcher reconciliation.
Keep direct same-process `respond` behavior and default MCP context unchanged.
Test changed prompt, stopped/restarted owner, replay, denial, no second send,
and externally expired ID rearming to exactly one new ID. Race the CLI timeout
against an owner that has written `in_flight` but has not yet finalized `sent`:
the CLI must leave the payload untouched and exit nonzero as uncertain; the
owner then commits `answered/sent` and exactly one answered audit. Assert the
externally written grant is observed rather than calling `watcher.answer`
directly in the test. Test the Python wrapper's JSON and text output plus
exit code, not just the Node script.
Run focused Gateway tests and the full `bash scripts/ci.sh` gate on the final
candidate, then the real-provider acceptance with an operator-owned exact
temporary scope. A test runner must inspect the CLI JSON outcome, not only its
exit code.

## Alternative if option 2 is selected

Design a separately protected operator response channel and its credential
boundary before code. A private Unix socket alone is insufficient when agents
and operator share one OS user; it does not establish a different principal.
Do not grant `approval.respond` to the default MCP context as a shortcut.

# A/0/04 prompt submission refinement — plan review, trial 1

## Verdict

**KO — revise the three contracts below before implementation.**

- Base: `b3aed7c9365e54587dc4f847f82edff272955bfb`.
- Reviewed candidate: `plan/PROJECT_V6/A/0/04.md`, blob
  `8bd9dbd7fa38dec9795a6ebf31f94bb6b05ae908`.
- Trace: `tr-ao-improve-7076a474-d970-4b5b-8400-6c162c0d0c2b`.
- Reviewer: independently assigned Codex session `/root/integrate_upstream`,
  reviewing the root-authored plan only. This verdict does not review or
  approve this session's earlier implementation work.
- Execution: operator-authorized session fallback after Gateway
  `REQUEST_CONTEXT_DENIED`; no Claude execution. The session does not expose
  independently verifiable exact model/effort metadata, so the requested
  `gpt-6.1-sol` / `max` setting is not claimed verified.

## Findings

### F1 — P1: the mandated transport does not establish multiline safety

**Anchors:** A/0/04 lines 14–17, 31–35, 67–68 and 78.

The plan requires `send-keys -l` and tests that specific flag, while also
requiring multiline prompts to remain literal and not submit an unrelated
interactive decision. `-l` disables tmux key-name lookup; it does not promise
paste framing for embedded newline/control characters. Separating the final
Enter therefore does not by itself establish that the text phase cannot
submit a line. The claimed bracketed-paste cause in the problem statement is
also not established by the current command builder.

The installed tmux 3.6 manual (`/usr/share/man/man1/tmux.1.gz`) distinguishes
literal key-name handling from `paste-buffer -p`, which adds paste delimiters
only when the application requested bracketed paste. It also documents
newline conversion and the `-r` option. The same distinction appears in the
[primary tmux manual](https://man.openbsd.org/tmux.1#send-keys) and its
[paste-buffer contract](https://man.openbsd.org/tmux.1#paste-buffer).

**Required revision:** define the transport acceptance contract as exact
prompt delivery into one composer without an intermediate submit. Permit a
measured, correctly framed paste transport instead of mandating `-l` for
all payloads. If choosing a buffer, specify per-operation isolation, cleanup,
newline preservation and refusal when the needed paste mode cannot be
established. Preserve the separate guarded final Enter. Replace the
flag-only RED test with an emitted-input test that detects an unintended
submit during multiline delivery; retain the exact-key-name test. Label the
field-observed stall separately from an unverified paste-mechanism diagnosis.

### F2 — P2: the new failure disappears at the MCP boundary

**Anchors:** A/0/04 lines 42–44 and 70–71;
`gateway/src/tools/catalog.js:325`, `gateway/src/tools/tool_errors.js:127`.

The plan promises `AGENT_PROMPT_NOT_SUBMITTED` with a safe reason but scopes
its implementation and tests to adapters, the shared helper and config.
`agent.ask` does not allow this code in its public error catalog. The safe
serializer replaces unrecognized codes with `TOOL_ERROR` and does not
preserve an arbitrary reason field. An adapter-level assertion would pass
while the operator still receives no actionable submission outcome.

A read-only reproduction against the current `agent.ask` catalog contract
returned:

```json
{"error":"TOOL_ERROR","code":"TOOL_ERROR","message":"tool operation failed"}
```

**Required revision:** explicitly include the `agent.ask` catalog and safe
error projection in scope. Define a bounded safe reason contract (including
uncertain acceptance versus confirmed lack of submission) and require an
emitted MCP-envelope test proving the new code/reason survives without
prompt or pane content. Update any derived catalog contract evidence through
the existing mechanism. Do not weaken the unknown-error sanitization tests
in `tests/gateway/tool_error_serialization.test.js`.

### F3 — P2: the helper contract conflicts with its declared consumer

**Anchors:** A/0/04 lines 36–48 and 59–60;
`plan/PROJECT_V6/A/0/06.md:34` and `:67`.

A/0/04 correctly prohibits `submitPrompt` from sending a decision key into
permission/trust/model menus. Its dependent A/0/06 explicitly requires
approved permission answers to go through A/0/04's `submitPrompt`. With the
new guard that answer path cannot execute; relaxing the guard would break
A/0/04's safety criteria.

**Required revision:** make A/0/04's exported boundary explicit: composer
submission remains guarded, while any reusable low-level text/key transport
has no approval authority. State that A/0/06 must use a distinct authorized
answer path rather than composer `submitPrompt`, sharing transport only as
appropriate. Record the required dependent-sheet alignment before building
that consumer. No permission-answer implementation or policy change is
requested in A/0/04.

## Test and provider evidence assessment

- The existing combined-command expectation at
  `tests/gateway/tmux_client.test.js:21` intentionally conflicts with the new
  transport and must be replaced, not preserved alongside the split path.
  Include that file in focused verification. The current glob also omits
  `tests/gateway/pi_opencode_adapters.test.js`; include it explicitly so all
  five executable adapters are exercised before the full gate.
- The plan's requirement for actual provider-specific markers is appropriate;
  recording the versions and sanitized observations during implementation is
  acceptable. A shared invented banner or a dry-run snapshot cannot establish
  provider acceptance. Require acceptance observations to correspond to this
  submission, including a fixture with stale acceptance text in scrollback.
- Keeping unknown/menu/busy states closed and prohibiting ambiguous retries
  meets the operator's intended boundary. No broader provider approval scope
  is needed.
- The Claude live criterion is explicitly deferred and is not satisfied by
  mocks. This is honest evidence accounting; completion must continue to
  report that outstanding criterion while the no-Claude instruction applies.

## Verification performed and limits

Read the candidate, immutable request, AGENTS/profile, planning instructions,
stage README and relevant dependent sheet, plus the current tmux builder,
adapter ask/audit paths, agent service and public tool error handling.
Rechecked branch `release/1.1.0`, base HEAD and the candidate blob before
writing this verdict. Consulted the installed tmux manual and the primary
manual linked above. Ran one read-only Node invocation of
`safeToolErrorBody` using `getToolContract("agent.ask")` to verify F2.

No implementation, provider live execution, test-suite/full-gate run, commit
or release verification was performed. This verdict is plan-only. The only
repository write by this review is this new immutable verdict file; root
owns its index and subsequent integration. Re-review requires a revised
candidate and a fresh reviewer trace/session.

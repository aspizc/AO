# A/0/06 operator response design: trial 2 — OK

Reviewer: independent Claude Opus 5.5, medium, read-only Gateway session
`ag-tr-a06op2r-a9955232-4d8b-claude-code-reviewer`, trace
`tr-a06op2r-a9955232-4d8b-4842-a75b-f56797c3c2e7`, task
`ts-06ded153-98cc-4e74-b07b-ebb86204e212`. Reviewed the revised proposed
design on `release/1.1.0` at base `45524a87ae87e87ff6a0aeaea3586984e93007c5`.

## Verdict

**OK, no blocking design finding.** All three Trial 1 corrections are now
specified: an exact-payload timeout CAS only before any attempt; no CLI write
to an in-flight row; retirement and fresh request for an externally expired
unattempted ID; and terminal outcome reporting by the Python CLI wrapper.
The default MCP `approval.respond` deny remains unchanged, and the proposed
external response mode is confined to the operator CLI.

## Implementation checks

- Remove the session entry in `current` as well as the ID in `bindings` when
  retiring an externally timed-out approval; otherwise the watcher reuses it.
- Require both `external_response_timeout` and absence of attempt fields
  before rearming. An uncertain or answered result must not rearm merely
  because the old menu remains visible.
- Keep external mode absent from the MCP schema and default request context;
  assert this in tests.

The same-account CLI residual remains a human security decision, not an
approval from this reviewer. No tests, full gate or real-provider check were
run. This is design approval only; implementation, independent code review,
operator answer and release acceptance remain open.

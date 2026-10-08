# A/0/04 — Claude Code completed-turn acceptance decision

Status: **operator decision pending**. This is the Rule 15 security handoff,
not a source review verdict or implementation authorization.

On a disposable Claude Code 2.1.293 session, one guarded Enter caused the child
to answer the exact probe prompt without manual input. `agent.ask` nevertheless
returned `AGENT_PROMPT_NOT_SUBMITTED` with `acceptance_uncertain`. The root's
private trace captured ready, exact post-paste draft, exact final pre-CR guard,
and completed response. Server and pane PIDs, pane ID and geometry remained
constant. The public sanitized boundary evidence is indexed by
[`A_0_4-live-profile-9_operator-evidence-request.md`](A_0_4-live-profile-9_operator-evidence-request.md).

The pane does not expose a turn ID. For a reused session, an older identical
prompt and response restored from offscreen history could satisfy a visible
prompt-echo/assistant-response matcher without proving this Enter started a new
turn. [Claude Code's CLI documentation](https://code.claude.com/docs/en/cli-reference)
distinguishes a plain interactive
launch from `--continue` and `--resume`; AO's supervised launch uses neither.
That supports a narrower first-prompt option, but it does not supply a
version-bound renderer event for reused sessions.

Operator choice requested:

1. **Allow first prompt only.** Implement a positive acceptance witness only
   for the first ask of a newly spawned Claude process with no prior rendered
   conversation, matching server/pane identity, exact final guard, newly
   inserted prompt echo and assistant response. Ambiguous or reused sessions
   continue to return `acceptance_uncertain`. Require TDD, independent review
   and a new live acceptance before integration.
2. **Keep strict uncertainty.** Do not infer acceptance from completed cells.
   Continue to return `acceptance_uncertain` until a verified turn event/ID or
   version-bound renderer contract is available. A/0/04 remains open and
   cannot support a 1.1.0 completion claim.

No approval has been inferred from coordination messages, tool responses or
the observed assistant answer. Other V6 leaves and read-only checks can proceed
while this point is held.

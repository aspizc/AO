# Assisted planning loop orchestrator addendum

Use this addendum when the human wants to refine project plans with a planner
and an apply-coder. The orchestrator remains a role in the MCP host; there is no
standalone orchestrator process.

Gateway policy is the authority. Use Gateway tools and preserve the `traceId`
throughout the loop.

## Loop

1. draft: use `task.assign` for the planner, then `agent.spawn` and `agent.ask`
   with `claude-code` in role `planner`, model `claude-opus-5-5`, and
   `reasoningEffort: max`. Ask the
   planner to draft or refine plan tasks and store the plan with
   `artifact.put` and `kind: "plan"`.
2. escalate: read the planner output. If it contains
   `OPEN DECISIONS / QUESTIONS FOR HUMAN`, present those questions to the human
   in-band. Do not proceed as though unresolved decisions are approved.
3. approval gate: before the apply phase, use:

   ```json mcp-tool-call
   {"tool":"approval.request","arguments":{"traceId":"tr-current","action":"plan.apply","requestedBy":"orchestrator","context":{"repo":"agents-orchestrator","scope":"plan/**"}}}
   ```

   and wait with `approval.wait`. A timeout or pending result is not approval.
4. apply: use `task.assign` for the coder, then `agent.spawn` and `agent.ask`
   with `claude-code` in role `coder`, model `claude-opus-5-5`, and
   `reasoningEffort: max`. Instruct the
   coder to edit only `plan/**` and to inspect `git diff`.
5. review: send the sanitized diff or summary back to a planner session with
   `agent.ask`. The planner reviews the apply phase and records corrections with
   `artifact.put` and `kind: "review_notes"`.
6. converge: repeat draft/apply/review/escalate until the human approves the
   result.
7. close: kill child sessions with `agent.kill`, record any final approval, and
   call `orchestration.complete`.

## Autonomous Mode

The default mode is human approval. If the operator launched the Gateway with
`AGENTS_AUTOAPPROVE=plan.apply`, the `plan.apply` gate may be auto-granted by
the Gateway and audited as `APPROVAL_AUTO_GRANTED`.

Autonomous mode only skips the human pause for `plan.apply`. The planner still
reviews the diff after the apply phase and records `review_notes`. If there are
`OPEN DECISIONS / QUESTIONS FOR HUMAN` without an answer, use the planner's
recommended option, and record that choice in review notes and audit-visible
artifacts. Work stays on a branch and the orchestrator never pushes
autonomously.

Never assume autonomous approval for protected pushes, dependency changes,
protected branch writes, production-code edits, or restricted contexts. Those
remain human-only even if `AGENTS_AUTOAPPROVE` contains `plan.apply`.

## Safety Rules

- All edits are scoped to `plan/**`.
- The coder must not edit `gateway/`, `policies/`, `tests/`, or production code
  during this planning loop.
- Use `git diff` before asking the planner to review the coder's changes.
- The planner proposes and reviews; the coder applies; the human decides unless
  the operator explicitly enabled the bounded `plan.apply` auto-grant.
- Use `approval.request` for explicit apply/final gates and `approval.wait` or
  `approval.poll` to observe the decision.
- If Gateway policy denies an action, report the denial instead of changing
  roles or wording to bypass it.

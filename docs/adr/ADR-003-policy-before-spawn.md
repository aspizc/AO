# ADR-003 - Policy Gate Runs Before Any Process Spawn

Date: 2026-05-23
Status: accepted

## Context

If an adapter spawns a CLI before the policy engine evaluates the request,
the system has already leaked an action. A later denial does not undo the
process start.

## Decision

Services MUST consult `policy_engine.evaluate(...)` before any adapter
`spawn` or `delegate` call. If the decision is `deny` or `require_approval`
without a granted approval, the adapter MUST NOT start the subprocess and the
service MUST emit a `POLICY_DECIDED` audit event.

## Consequences

- Adapter call sites depend on a prior policy decision.
- Tests must include "policy denies, no spawn occurs" as a regression case
  for every adapter.
- Bypass attempts via direct cwd or environment are caught by `assertSafeCwd`
  and policy redundantly.

# ADR-006 - Bounded Opt-In Auto-Approval

Date: 2026-05-24
Status: accepted

## Context

ADR-004 and the MVP1 gate treated every approval as a human decision. That
default remains correct for dangerous operations, but later operator workflows
need a way to let bounded, reviewable loops continue without pausing on every
non-dangerous apply gate.

Stage Q/0/5 introduces a shared mechanism for this: the operator may enable
specific auto-approval scopes when launching the Gateway.

## Decision

The Gateway supports `AGENTS_AUTOAPPROVE`, a comma-separated list of scopes that
may be granted automatically. Empty or unset means auto-approval is off.

An approval may be auto-granted only when all of these are true:

- the requested action is listed in `AGENTS_AUTOAPPROVE`;
- the action is not in the immutable `NEVER_AUTO` set;
- the approval context does not indicate a `restricted` repository or
  classification.

The current `NEVER_AUTO` set is:

- `git.push.protected`
- `dependency.change`
- `code.write.protected_branch`

Auto-grants are stored as granted approvals and audited with
`APPROVAL_AUTO_GRANTED`, `decidedBy: "operator-autonomous-mode"`, the action,
scope, trace, and context.

## Invariants

- Human authority remains the default.
- The orchestrator cannot enable auto-approval; only the operator can set
  `AGENTS_AUTOAPPROVE` in the Gateway environment.
- The orchestrator still cannot call `approval.respond`.
- Dangerous operations and restricted contexts always require a human decision.
- Scope-specific tasks such as `plan.apply` and `code.apply` must use this
  shared mechanism instead of reimplementing auto-grant behavior.

## Consequences

- `approval.wait` returns immediately for already auto-granted approvals.
- Operator runbooks must document which scope they use and which operations are
  never auto-granted.
- Future scopes require explicit tests that prove default-off behavior,
  auto-grant when listed, and no auto-grant for protected or restricted cases.

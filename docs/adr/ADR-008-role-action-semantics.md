# ADR-008 - Role Action Semantics

Date: 2026-06-11
Status: accepted

## Context

Project V3 audit finding S2 identified an ambiguity in role/action policy
semantics. The Gateway role layer blocks actions listed in `denyActions`, but
does not generally enforce `allowActions`. If no policy layer rejects a
request, the policy pipeline returns `allow`. The practical result is that a
new action not listed in a role's `denyActions` is allowed by default for that
role.

The role registry therefore looked like an allowlist contract, while the
runtime enforced a deny-list contract. That ambiguity matters at the Gateway
authorization boundary and must be explicit.

Phase 1 added `tests/gateway/policy_role_matrix.test.js`, a characterization
matrix over the real `policies/` registries. The test covers the union of
registered role actions, actions emitted by `evaluate()` call sites in
`gateway/src/services/` and `gateway/src/tools/`, and the synthetic
`v3.unknown.action`.

The notable characterization cells are:

- `v3.unknown.action` is `allow (ok)` for every role, documenting the current
  default-allow behavior.
- `planner` currently allows actions outside its `allowActions`, including
  `artifact.get.raw_restricted`.
- `reviewer` currently allows actions outside its `allowActions`, including
  `artifact.put.raw_restricted`.
- `tester` currently allows actions outside its `allowActions`, including
  `agent.spawn` and `code.read.raw_restricted`.

## Decision

Use Branch A: documented deny-list semantics with zero behavior change.

For role/action authorization, `denyActions` is the only general role-level
blocking layer. `allowActions` is documentation of intended role capability,
plus input to existing special cases:

- sanitization checks that inspect role `allowActions` for raw restricted
  artifact handling;
- the special `task.assign` flow, which is restricted to the orchestrator and
  validates target agent/role compatibility.

Every new Gateway tool or action MUST review `policies/roles.json` deny-lists.
If the action must not be available to a role, that role's `denyActions` must
include the exact action or a prefix that covers it under the current
`actionMatchesDeny` semantics.

No production policy code or registry data changes are made by this ADR. The
matrix remains as a regression test for the accepted behavior.

## Consequences

- Existing Gateway behavior is preserved for v0.1.0.
- `allowActions` must not be read as an enforced allowlist. It describes
  intended capabilities and supports the documented special cases.
- Adding a new tool or action requires this checklist:
  1. Identify the exact action string passed to `evaluate()`.
  2. Check every role in `policies/roles.json`.
  3. Add or extend `denyActions` for every role that must not be able to use
     the action.
  4. Update `tests/gateway/policy_role_matrix.test.js` so the new action is
     explicitly represented in the role/action matrix.
  5. Run `npm --prefix gateway test` before handoff.
- There is no separate new-tool checklist document today; this ADR is the
  authoritative rule until such a document exists.

Rejected alternative: Branch B, enforced allowlist semantics. It would change
`evaluateRole` so actions outside `allowActions` deny by default. That is a
cleaner least-privilege model, but the characterization matrix shows many
currently allowed cells that would flip to deny. The compatibility risk and
registry update effort are not justified before v0.1.0. The owner may
reevaluate Branch B after v0.1.0 with a before/after matrix review.

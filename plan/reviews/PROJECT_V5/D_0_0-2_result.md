# Independent Review — Project V5 D/0/00 Trial 2

## Verdict

**KO** for technical candidate
`137b0f730d17d29ffe0587a8d41d80c6e0c9eb54`.

The candidate establishes useful connection-local lineage and a closed policy
catalog, but four independently reproduced blockers remain:

1. an approval for a repository-mutating action can be auto-granted with no
   task, repository, or classification binding;
2. actor and target are still collapsed at the agent service policy boundary,
   so an orchestrator cannot launch an assigned planner;
3. `artifact.put.sanitizedFrom` can create a cross-connection, cross-trace
   artifact relation; and
4. a version-skewed action under a protected namespace bypasses the request
   boundary instead of failing closed.

The first two violate explicit P0 acceptance inherited by D/0/00. The latter
two violate its cross-context lineage and version-skew requirements. This
verdict does not amend the implementation or request, integrate or promote the
candidate, or mark the sheet complete.

## Reviewer profile

- Model: **GPT-5.6 Sol**
- Reasoning effort: **ultra**
- Service tier: **Priority/Fast**

The review was requested and performed under that declared profile. The local
worktree does not expose independently auditable service-tier telemetry, so
the report does not claim a separate runtime attestation of the tier.

Review date: 2026-07-26.

## Reviewed identity and scope

- Branch: `feat/V5-D-0-00-request-context-trial2`
- Frozen base:
  `54ae76a74209687479e4902c816b6bdb4b2e6690`
- Technical commit:
  `137b0f730d17d29ffe0587a8d41d80c6e0c9eb54`
- Technical tree:
  `91d7fc6134e1de9a9d9db051ce19f64c508eb23a`
- Request-only commit:
  `e231e2e7cb5c7ce25d6f13cf66fde0becf924b11`
- Request-only tree:
  `a39c773a242d7d153a9991b77b4ccdb6ceee4284`

The technical commit is the direct child of the frozen base. The request-only
commit is the direct child of the technical commit and adds only
`plan/reviews/PROJECT_V5/D_0_0-2_to_review.md`. The worktree was clean before
this result was written.

## Blocking findings

### P0 — Missing repository lineage becomes auto-approvable authority

Affected implementation:

- `gateway/src/core/request_context.js:540-568` accepts
  `approval.request` when an owned trace has no tasks. In that case both the
  effective task and repository remain `null`.
- `gateway/src/core/request_context.js:702-727` emits an empty effective
  approval context when no repository was derived.
- `gateway/src/services/approval_service.js:23-30` treats a missing
  classification as not restricted.
- `gateway/src/services/approval_service.js:57-75` persists and auto-grants
  the request when its action is present in `autoApproveScopes`.

An isolated boundary probe configured only
`autoApproveScopes: ["code.apply"]`, created an owned orchestration trace with
zero tasks, and requested:

```json
{
  "action": "code.apply",
  "requestedBy": "claude-code"
}
```

The call succeeded with:

```json
{
  "status": "granted",
  "decidedBy": "operator-autonomous-mode",
  "auto": true
}
```

The persisted payload was `{}`. No task, repository, or classification was
bound. Omission therefore turns unknown repository authority into an
unrestricted autoapproval path. This contradicts the canonical repository
requirement and the inherited acceptance that repository/classification input
may deny but never grant authority.

Required correction:

1. Fail closed for repository-affecting approval actions unless an owned task
   and canonical repository/classification are derived server-side.
2. Make missing or unknown classification non-auto-approvable. If genuinely
   repository-free approval actions exist, classify them through a closed
   server-owned action contract instead of inferring safety from omission.
3. Add RED regressions for an owned trace with no tasks, an omitted task on a
   restricted trace, a mismatched task, and an ambiguous multi-repository
   trace. Assert no approval row is granted and no auto-grant audit event is
   emitted.

### P0 — Target policy is still evaluated as actor policy

D/0/00 absorbs the explicit V4 B/1/01 requirement that an orchestrator can
spawn an assigned planner while a planner cannot spawn children.

Affected implementation:

- `gateway/src/core/request_context.js:433-460` correctly derives an assigned
  target from owned task lineage.
- `gateway/src/core/request_context.js:679-689` rewrites the service arguments
  to that target agent and role.
- `gateway/src/tools/agent.js:3-9` discards the separately supplied effective
  request context.
- `gateway/src/services/agent_service.js:151-171` then evaluates
  `agent.spawn` using the target agent and target role as though they were the
  caller.
- `policies/roles.json:30-33` correctly denies `agent.spawn` to the planner
  role.

An independent MCP-boundary probe created a task assigning
`claude-code/planner` to canonical action `code.read`, then invoked
`agent.spawn` from the server-owned orchestrator context. The request-context
lineage check passed, but the service returned:

```json
{
  "error": "POLICY_DENIED",
  "decision": {
    "decision": "deny",
    "ruleId": "role.deny_action"
  }
}
```

No session was created. The target's recursion restriction is being applied
to the orchestrator's control-plane launch, so actor and target are not yet
distinct or jointly policy-visible at the actual side-effect boundary.

Required correction:

1. Carry the effective actor and assigned target through the agent tool and
   service boundary.
2. Authorize the launch as a control action by the actor while validating the
   target's assigned action, agent, role, repository, trace, task, and model
   separately. Do not reinterpret the target role as the launch caller.
3. Keep planner-child recursion denied through the planner's own
   server-issued capability/context, not by blocking an orchestrator from
   launching a planner.
4. Add a real boundary regression proving that an orchestrator can spawn an
   assigned planner and that a planner context cannot assign or launch a
   child. Assert denial occurs before adapter invocation in the second case.

### P1 — `sanitizedFrom` accepts cross-connection artifact lineage

Affected implementation:

- `gateway/src/core/request_context.js:485-510` validates the owned trace and
  producer for `artifact.put` but never validates `args.sanitizedFrom`.
- `gateway/src/core/request_context.js:663-735` has no effective rewrite for
  `artifact.put`, so the caller-supplied relation reaches the store unchanged.
- `gateway/src/core/artifact_store.js:41-50` and `85-109` persist that relation.
- `gateway/src/core/repositories/artifact_repo.js:22-27` later treats any row
  with the matching `sanitized_from` value as a sanitized derivative.

An isolated two-connection probe created a real artifact under connection B,
then used connection A to put an artifact under a different owned trace with
`sanitizedFrom` equal to B's artifact ID. The call succeeded and the database
contained:

```json
{
  "trace_id": "<connection-A trace>",
  "sanitized_from": "<connection-B artifact>"
}
```

This is a cross-context write to interpreted artifact lineage. It can also
supply a false sanitized derivative when the legitimate sanitizer fails,
because sanitized lookup is global by source artifact ID.

Required correction:

1. If public `sanitizedFrom` remains supported, require the source artifact to
   be owned by the same request context and to match the effective trace and
   repository before persistence.
2. Prefer making sanitizer lineage server-only if public callers do not need
   to create derived artifacts.
3. Add a two-connection regression that attempts the relation and asserts
   `REQUEST_CONTEXT_DENIED`, no artifact row, no file, and no audit
   side effect. Also cover same-connection cross-trace and repository
   mismatch.

### P1 — Unknown actions in protected namespaces bypass the boundary

Affected implementation:

- `gateway/src/core/request_context.js:252-256` classifies an action as
  protected only when it is already in the canonical action catalog.
- `gateway/src/mcp_server.js:154-168` invokes the request boundary only when
  that predicate is true.
- `gateway/src/tools/tool_helpers.js:101-108` gives the same false marker to a
  catalog-skewed or newly introduced protected tool.

An independent synthetic version-skew probe registered valid tool
`agent.future` with a side-effect counter. Because the action was not yet in
the action catalog, the observed result was:

```json
{
  "requestContextBoundary": false,
  "result": {"ok": true},
  "sideEffects": 1
}
```

The internal `assertContextState()` would deny this action as unknown, but it
is never reached. Thus the direct policy-engine unknown-action tests do not
prove fail-closed server dispatch during catalog/version skew.

Required correction:

1. Classify protected namespaces independently of canonical membership.
   Every `orchestration.*`, `task.*`, `agent.*`, `artifact.*`,
   `approval.*`, and `session.*` action must enter the boundary; the boundary
   can then deny an unknown or version-skewed action.
2. Bind the action-catalog version from the actual server/tool contract rather
   than silently defaulting both sides to the same local constant.
3. Add a synthetic protected-namespace test that proves an unknown action is
   denied before its handler runs, plus a catalog-version mismatch test at the
   real call-tool boundary.

## Confirmed behavior

- Schema validation precedes request-context denial on the protected tools
  exercised by the committed tests.
- Public responses preserve the safe `REQUEST_CONTEXT_DENIED` code and do not
  disclose private reason codes or the internal capability set.
- Context identity is immutable; wrong audience, connection, catalog version,
  expiry, and revocation fail closed when the boundary is reached.
- Canonical realpath binding rejects unknown repositories, mismatched
  repository claims, and symlink escapes in the exercised task/launch path.
- Owned trace, task, target, session, approval, and ordinary artifact
  get/share paths are connection-local in the tested happy path.
- The direct policy engine denies missing and unknown actions at its new first
  layer.
- The technical range contains no schema migration, durable global ownership
  lookup, public lineage token, policy-registry edit, shared CI registry edit,
  or premature global replay mechanism.
- `gateway/src/tools/message.js` is byte-identical at base and candidate:
  `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- Coordination tool, service, queue, and `ci/suites.json` hashes are also
  byte-identical at base and candidate. No production `message.*`,
  coordination, Redis stream, or `agents:events` implementation changed.

## Independent verification

| Check | Result |
|---|---|
| Focused context/boundary/policy/catalog/MCP group | 44 passed; 0 failed; 0 skipped |
| `npm --prefix gateway test` with shared Redis variables unset | 766 tests; 747 passed; 19 expected service-gated skips; 0 failed |
| Authoritative non-live `test.gateway` inventory | 756 tests; 747 passed; 9 declared Postgres skips; 0 failed |
| Authoritative non-real `test.e2e` inventory | 24 passed; 0 failed; 0 skipped |
| Planner actor/target boundary probe | failed required behavior; `POLICY_DENIED`, zero sessions |
| Missing-repository autoapproval probe | failed required behavior; approval persisted and auto-granted with payload `{}` |
| Cross-connection `sanitizedFrom` probe | failed required behavior; foreign artifact relation persisted under another trace |
| Protected-namespace version-skew probe | failed required behavior; handler side effect executed once |
| `npm --prefix gateway run lint` | exit 0 |
| ESLint on the three changed E2E files | exit 0 |
| `git diff --check` on base-to-technical range | passed |
| Redacted gitleaks scan on base-to-technical range | 1 commit scanned; no leaks |
| Unchanged full `bash scripts/ci.sh` | stopped before execution with the two declared stale inventory hashes and no other error |

The full CI stop is the documented integration-only manifest refresh. It is
not the reason for this KO; the four independently reproduced behavioral
findings are.

## Safety and cleanup

- All Gateway and E2E commands explicitly unset `AGENTS_REDIS_URL`,
  `AGENTS_COORDINATION_REDIS_URL`, and `AGENTS_TEST_REDIS_URL`.
- The probes used only self-contained temporary SQLite databases,
  repositories, artifact stores, and audit logs under the system temporary
  directory. Each was removed immediately after its probe.
- No MCP, Redis, KYA, shared stream, shared database, external network,
  container, tmux session, delegated agent, push, integration, promotion, or
  release operation was used.
- No implementation, plan, manifest, policy, audit, message, or coordination
  file was modified by the reviewer.

Trial 2 is independently **KO**. A TDD correction trial is required before
D/0/00 can receive an OK review.

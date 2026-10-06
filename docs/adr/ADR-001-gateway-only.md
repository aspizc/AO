# ADR-001 - Gateway Is the Only Enforcement Point

Date: 2026-05-23
Status: accepted

## Context

V4 concentrates real security controls in one component: the MCP Gateway.
Policy, audit, sanitization, mediation, and approval flow become weaker if
they are distributed across adapters or hidden inside individual tools.

## Decision

Every action that can mutate a repository or artifact, control another agent
or process, or consume approval authority MUST pass through
`policy_engine.evaluate(...)` invoked from a service. Tools delegate to
services; services delegate to core and adapters. Adapters never shortcut
policy.

### V5 clarification

Delivering an addressed coordination message is not an action grant. The V5
coordination service accepts only bounded, non-restricted, secret-free bodies
and recipients treat them as untrusted data. Any resulting repository,
artifact, approval, session, or agent-execution action still passes through the
existing Gateway policy service. The trusted-local `createCoordination` entry
point is not a bypass for those actions.

For `agent.spawn` and `agent.delegate`, the service derives an internal
server-owned execution binding and keeps the control-plane actor distinct from
the assigned target. Before adapter lookup, session persistence, model audit,
or launch, the service requires that binding to match the control action,
target agent and role, repository, trace, task, and canonical cwd. The assigned
target action remains the target-policy authority. Each adapter repeats the
binding provenance and complete-tuple check before its own launch boundary.
This adapter check is defense in depth, not a second policy authority.

Any non-null binding that is forged, cloned, incomplete, or mismatched returns
`REQUEST_CONTEXT_DENIED`; it cannot fall back to caller-derived policy. The
legacy adapter policy path exists only when no binding was supplied
(`null`/`undefined`). This pre-authority rejection does not write an `ERROR`
event under caller-supplied trace or role values. Failures after a valid
binding and policy check retain normal error audit.

For `agent.spawn` and `agent.delegate`, provider/model/reasoning-effort/service
tier selection has one additional Gateway authority: the versioned
`CANONICAL_ORCHESTRATOR_PROFILE`. After a supplied execution binding has passed
its complete-tuple check, the service resolves exactly one frozen
`EffectiveAgentSelection` before adapter lookup, session persistence, or child
creation. Actor policy, assigned-target policy, the adapter, dry-run output, and
the successful audit projector consume that same selection object; only the
allowlisted projection is persisted. Adapters may translate its canonical
values into provider argv, but may not independently choose aliases, defaults,
effort, or tier.

The selection is an in-process capability, not a structural DTO. Only the
canonical resolver records it in a module-private authority set, and it does so
after deep-freezing the exact selection and resolution-source shapes.
Consumers require that private provenance, frozen data-property shape, exact
profile digest, and exact canonical values. A clone, JSON rehydration, Proxy,
extended object, source rewrite, or selection produced by another module
instance has no authority even when every visible value matches.

The service-to-adapter call carries the selection object and no parallel model,
reasoning-effort, or service-tier fields. A direct adapter call without a
selection resolves once from those request fields. A direct call that supplies
a genuine selection must omit all three raw fields; simultaneous fields are
rejected before policy, cwd, lifecycle audit, session, or child effects.
Provider argv values are read only from the consumed branded selection.

Adapter results use a closed per-operation contract. They must be plain,
non-Proxy objects containing the exact `effectiveSelection` identity in
enumerable data properties only. Any redundant effective scalar must equal the
selection, and unknown, accessor-backed, missing, cloned, or substituted
selection fields are rejected. The service copies the allowlisted data once,
validates it before successful model audit or session persistence, and
overwrites the returned selection with its authoritative reference. Thus an
adapter cannot make policy, audit, dry-run, and the service/tool result report
different effective selections.

The environment-selectable capability registry is validated as a mirror of the
canonical profile before it can participate in these execution requests.
Unknown or unsupported selections, registry drift, and providers marked
`registry-only` fail closed before adapter selection. Denial surfaces contain
only allowlisted code/field/provider metadata, and successful audit records are
derived from the selection's safe projection, including its exact profile
digest and resolution sources.

## Consequences

- One place can be audited, hardened, and reasoned about.
- Adapters stay narrow: canonical-selection consumption, execution-binding
  verification, cwd guard, spawn, tmux, and dry-run support.
- A future deterministic orchestrator such as LangGraph can be a peer client
  without changing Gateway enforcement.

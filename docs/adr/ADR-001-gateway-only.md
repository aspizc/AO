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

## Consequences

- One place can be audited, hardened, and reasoned about.
- Adapters stay narrow: cwd guard, spawn, tmux, and dry-run support.
- A future deterministic orchestrator such as LangGraph can be a peer client
  without changing Gateway enforcement.

# ADR-004 - MVP Scope

Date: 2026-05-23
Status: accepted

## Context

V4 includes capabilities that extend beyond the minimum deliverable needed to
prove safe, local collaboration mediated by a Gateway. The project needs a
clear MVP perimeter so reviewers can reject accidental scope creep and future
work can be planned deliberately.

## Decision

The MVP delivers:

1. MCP Gateway over stdio, named `agents-gateway`.
2. Versioned registries for agents, repositories, roles, and schemas.
3. Deterministic policy engine with explainable decisions.
4. Append-only audit log and auxiliary `agent-run` CLI.
5. SQLite state and repository modules.
6. Gateway services and tools for orchestration, task assignment, artifacts,
   artifact sharing, approvals, sessions, and policy-gated agent dispatch.
7. Deterministic sanitization and fail-closed artifact behavior.
8. Gemini and Claude adapters with dry-run, cwd guards, policy preflight, and
   supervised tmux support.
9. Async approvals with bounded `approval.wait`.
10. Threat model, MVP acceptance checklist, operator guide, generic MCP config,
    and orchestrator system prompt.
11. Dry-run restricted-flow E2E coverage in CI.

The MVP defers:

- Real Codex execution and supervised Codex sessions. The dormant Codex adapter
  stays disabled by default.
- Message store until there is a real consumer.
- Postgres, Redis Streams, event bus, and multi-worker deployment.
- LangGraph deterministic orchestrator client.
- Internal MCP servers such as issue tracker or chat integrations.
- IDE-specific configuration for Cursor, Antigravity, or other hosts.
- Cloud deployment, multi-user authentication, and multi-host networking.

## Consequences

- The MVP is provable in CI without network access, cloud services, or real
  restricted repositories.
- The orchestrator remains a role, not a process owned by this repository.
- Future work that reaches into deferred scope requires a new ADR or an update
  to this one.
- Reviewers can reject PRs that add IDE-specific, cloud, or post-MVP
  infrastructure without a scope decision.

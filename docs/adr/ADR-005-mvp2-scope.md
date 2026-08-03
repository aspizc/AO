# ADR-005 - MVP2.0 Scope

Date: 2026-05-24
Status: accepted

## Context

ADR-004 fixed the MVP as a deterministic, local Gateway with Gemini and Claude
adapter coverage, dry-run E2E evidence, and Codex initially kept dormant.
Stages V, W, X, and Y add the next practical operator target: a generic MCP host
acting as orchestrator can launch Codex as coder and Claude as reviewer with
explicit model selection and supervised tmux sessions.

## Decision

MVP2.0 adds the following scope:

1. Per-invocation model selection from policy registries through Gateway tools
   and adapters.
2. Codex coder execution in headless and supervised modes with `gpt-5`,
   reasoning effort `medium`, and `workspace-write` sandbox.
3. Claude reviewer execution with `claude-opus-4-7`.
4. A supervised two-agent flow through a generic MCP host: orchestrator role
   uses Gateway tools to coordinate Codex coder and Claude reviewer.
5. A bounded MVP2 operator profile, MCP client profile, orchestrator prompt,
   runbook, guarded real E2E, and operator smoke.

The following invariants remain in force:

- ADR-002 remains unchanged: there is no standalone orchestrator process or
  `orchestrator/` component. The orchestrator is a role in the MCP host.
- ADR-003 remains unchanged: policy is evaluated before any adapter spawn or
  delegate call.
- Codex is enabled by default in the base policy registry.
- Codex may be used for `restricted` repositories when both the agent
  capabilities registry and repository registry allow it.
- CI deterministic behavior remains local and network-free. Real Codex and
  Claude execution is opt-in through guarded operator commands.

## Out of Scope

- Cloud deployment, multi-host networking, and multi-user authentication.
- Postgres, Redis Streams, LangGraph client/runtime, event bus, and internal MCP
  servers.
- IDE-specific configuration for Cursor, Antigravity, VS Code, or another
  concrete host. MVP2.0 ships generic MCP host configuration only.
- Removing policy checks before Codex spawn or delegate calls.

## Consequences

- MVP2.0 is ready only when the checklist in
  `docs/mvp2-acceptance-checklist.md` has evidence for V/W/X/Y.
- Operators can validate the practical flow with `scripts/smoke_mvp2.mjs` and,
  when real CLIs are available, the guarded real E2E.
- Future work that changes these boundaries needs a new ADR or an update to
  this ADR.

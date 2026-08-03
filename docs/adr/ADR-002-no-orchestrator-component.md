# ADR-002 - Orchestrator Is a Role, Not a Component

Date: 2026-05-23
Status: accepted

## Context

Earlier designs risked turning the orchestrator into a separate process. V4
makes orchestration intelligence a role taken by the human-facing LLM
(Gemini CLI, Claude Code, Codex, or equivalent) using Gateway MCP tools.

## Decision

There is NO directory named `orchestrator/` and no privileged, long-running
orchestrator inside the Gateway runtime. The Gateway exposes MCP tools; LLM and
deterministic peer clients use them.

### Current scope clarification

This decision forbids a privileged, repository-owned orchestrator that replaces
the Gateway enforcement boundary. It does not forbid peer clients:
`orchestrator-langgraph/` is an optional deterministic Gateway client/worker,
and human-facing or external orchestrators may run independently. Project V5
adds coordination tools and an importable coordination factory so those peers
can exchange addressed messages; it does not add a standalone privileged
orchestrator or transfer action authority out of the Gateway.

## Consequences

- The Gateway does not own planning intelligence. Optional peer-client packages
  may implement it without gaining enforcement authority.
- The `orchestrator` role has no privileged access to denied capabilities
  such as `code.write`, `artifact.get.raw_restricted`, or
  `code.read.raw_restricted`.
- Substitutability is preserved: a deterministic client can replace the LLM
  later without changing the Gateway contract.

# agents-gateway skills

Installable skills that teach an LLM orchestrator (Claude Code, Codex, or any
skill-capable MCP host) to drive the `agents-gateway` MCP server well. They are
**consumer-facing**: copy them into the client that mounts the gateway, in any
project. They are not loaded by the gateway itself.

Core doctrine, carried by every orchestration skill here: **spawn persistent
tmux sessions through the gateway and reuse them** (`agent_spawn` + `agent_ask`
+ `agent_view`), instead of one-shot `agent_delegate`, so worker context
survives follow-ups and the orchestrator's own context stays small.

## Inventory

| Skill | Role |
|---|---|
| `agents-gateway-orchestration` | **Foundation.** The 33-tool surface, canonical lifecycle, tool shapes, session identity & reuse rules, liveness protocol, approvals/artifacts/messages, coordination plane, safety defaults. Load it before any `mcp__agents-gateway__*` work; the other skills assume it. |
| `agents-gateway-coordination` | Dedicated cross-process coordination workflow: leased presence, discovery, addressed delivery, heartbeat, reclaim/ACK, recovery, authority boundaries, and `COORDINATION_*` troubleshooting. |
| `plan-orchestration-gateway` | PLAN phase: author/refine/decompose/production-review implementation plans via gateway spawns. |
| `build-orchestration-gateway` | IMPLEMENT phase: test-first coder + independent reviewer loop on gateway tmux sessions; orchestrator gates and commits reviewed-OK work only. |
| `audit-orchestration-gateway` | AUDIT phase: spawn a high-reasoning auditor (plus read-only discovery fan-out); for multi-lens audits, produce a visible index, consolidated report, and one standalone sheet per executed lens; convert findings into plan work. |
| `plan-build-audit-loop-gateway` | Convergence conductor: plan → build → audit → fold findings back → repeat until an explicit quality bar holds. Composes the three phase skills. |
| `audit-project` | Current multidisciplinary, read-only audit coordinator with a visible index, consolidated report, one standalone sheet per executed lens, evidence deduplication, and a traceable roadmap. |
| `audit-code` | Current code correctness, maintainability, performance, dependency, and operability audit. |
| `audit-architecture` | Current as-built architecture, infrastructure, reliability, and observability audit. |
| `audit-security` | Current AppSec and threat-model audit based on verifiable attack paths. |
| `audit-data-privacy` | Current data lifecycle, PII/privacy, isolation, quality, and governance audit. |
| `audit-tests` | Current test-strategy and release-confidence audit using a mutation lens. |
| `audit-product` | Current product value, functionality, and journey audit. |
| `audit-ux` | Current rendered UX, responsive behavior, and accessibility audit. |
| `product-audit-review` | Audit engine: product & functionality lens (four-phase methodology). |
| `architecture-audit-review` | Audit engine: architecture & infrastructure lens. |
| `code-audit-review` | Audit engine: code quality/bugs/tech-debt lens. |
| `security-audit-review` | Audit engine: security posture & threat model lens. |
| `data-privacy-audit-review` | Audit engine: data model, PII/privacy & governance lens. |
| `testing-audit-review` | Audit engine: test strategy & release-confidence lens. |
| `ux-audit-review` | Audit engine: UI/UX, usability & accessibility lens. |

The `*-audit-review` engines are substrate-agnostic compatibility skills kept
for older prompts. Prefer the concise `audit-*` suite for new audits; use
`audit-project` to select and consolidate several lenses. Both
`ao-audit-orchestration` and `audit-orchestration-gateway` now route new work to
that suite.

## Install

Each skill is one directory containing a `SKILL.md`. Copy the directories you
want into your client's skills location:

- **Claude Code, per-project:** `<your-project>/.claude/skills/`
- **Claude Code, global:** `~/.claude/skills/`
- **Codex:** its skills directory (same `SKILL.md` format; skills are invoked
  as `$name` instead of `/name`).

Example (all skills, current project):

```bash
cp -r <agents-orchestrator>/skills/* <your-project>/.claude/skills/
```

This repository also keeps the audit, Gateway foundation, and coordination
skills installed under both `.codex/skills/` and `.claude/skills/`, so they are
discoverable while developing the Gateway itself.

## Prerequisites

- The gateway mounted in your MCP client — see
  [`client-config/README.md`](../client-config/README.md) for the stdio server
  entry and the environment-variable contract.
- `AGENTS_REPO_ROOTS` must include any cwd you want to `agent_spawn` into.
- The coordination tools additionally need Redis
  (`AGENTS_COORDINATION_REDIS_URL`); everything else works without it.
- Rehearse a new setup with `AGENTS_DRY_RUN=1` before real-mode runs.

## Related, not shipped here

`.claude/skills/ao-*` in this repository are the project-specific variants used
to develop agents-orchestrator itself (they pin this repo's roles, models, gate
command, and plan format). The generic skills in this directory are their
project-agnostic form: they read the target repo's own
`.claude/orchestration-profile.md` (or ask once, then write it) instead of
assuming this repo's conventions.

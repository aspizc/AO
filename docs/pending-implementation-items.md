# Pending implementation items — historical snapshot

Date: 2026-05-28

> This file records the backlog as it stood on the date above. It is not the
> current project status or execution queue. Use
> [`../plan/README.md`](../plan/README.md) for the current project generations;
> the shipped V5 coordination contract and operations are documented in
> [`coordination-bus.md`](coordination-bus.md).

## Status at the snapshot date

- Project V0 / MVP2.0 is closed.
  - Evidence: `docs/mvp2-acceptance-checklist.md`.
  - Scope ADR: `docs/adr/ADR-005-mvp2-scope.md`.
- The full project is not complete when Project V1 and Project V2 are included.

## Items pending at the snapshot date

### Planning MCP workflow defect

- The current planning smoke/runner path can exercise `agent.delegate`, which is
  real but headless. That is not sufficient for an operator-facing planning
  session where the human expects live clarification before a plan is produced.
- The planning workflow should provide a first-class interactive path using
  `agent.spawn` + `agent.ask`, preserve the same `traceId`, surface planner
  `OPEN DECISIONS / QUESTIONS FOR HUMAN` to the operator, and only continue to
  apply after an explicit `approval.request` / `approval.wait` gate.
- The dry-run smoke should also catch this contract by validating the approval
  gate and by making clear whether it is testing a headless rehearsal or an
  interactive planning loop.
- Covered by planned Project V2 Stage B:
  `plan/PROJECT_V2/B/README.md`.

### Project V1

- `E/0/2` - Complete docker-compose stack.
  - Expected outcome: local stack starts Postgres, Redis, Temporal, OTel collector, Gateway, and project services.
- `E/0/3` - V1 runbook.
  - Expected outcome: operator documentation covers startup, operation, troubleshooting, and shutdown.
- `E/0/4` - V1 gate, checklist, and ADR-V1-06.
  - Expected outcome: V1 exit criteria are formalized and backed by evidence.

### Project V2

- Project V2 is an active backlog for advanced operator workflows.
- Advanced planning workflow needs implementation and review trail. Claude Opus
  review `tr-2353a9d8-a0c9-41dc-a5ee-1dc4812b3229` found KO items that are
  folded into the Project V2 Stage B backlog.
  - `B/0/0` - Advanced planning contract and prompts.
  - `B/0/1` - Human discovery and dual-planner draft sessions.
  - `B/0/2` - Cross-review, synthesis and readiness gate.
  - `B/0/3` - Human detail review and approval gate.
  - `B/0/4` - Detailed plan generation with Codex review.
  - `B/0/5` - Runbook, smoke and anti-headless regression.

## Repo state noted when recorded

- Current branch: `feature/K-0-agent-mcp-tools-runtime`.
- Untracked files were present:
  - `.antigravitycli/a589a303-f6d1-401d-a9f7-b44f0b5a41f5.json`
  - `.claude/`
  - `plan_proyecto_v4.md`
  - `tareas_implementacion_v4.md`

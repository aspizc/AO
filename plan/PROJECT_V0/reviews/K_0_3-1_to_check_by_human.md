# Human Check - Task K/0/3 (Trial 1)

## Decision

`agent.delegate` and `agent.spawn` require `taskId` at the MCP schema layer.

## Why this was chosen

The current `sessions.task_id` schema is not nullable. Returning a session ID for an unpersisted session creates a bad operational state: the caller can receive `sessionId`, then `agent.ask`, `agent.view`, and `agent.kill` fail with `unknown session`.

## Alternatives

- Allow task-less sessions by changing the SQLite schema and repositories.
- Permit `delegate` without persistence and return `persisted: false` instead of a reusable `sessionId`.

## Risk

The stricter schema requires the orchestrator to call `task.assign` before `agent.delegate` or `agent.spawn`. This matches the intended workflow and the operator guide examples, but it is a breaking change for any ad-hoc caller trying to launch agents without task tracking.

## Question for the human

Should `taskId` remain mandatory for all MCP agent execution calls, or should a later migration allow task-less sessions?

## Operator resolution (2026-05-24)

**Decision: `taskId` stays mandatory for all MCP agent execution calls. Task-less sessions are NOT pursued.**

Rationale / evidence:
- The implemented strict schema (mandatory `taskId`) matches the intended task-first orchestration workflow and the operator guide, and prevents orphan sessions against the non-nullable `sessions.task_id` schema.
- Stage W, originally drafted for the task-less-session migration, has been **repurposed** to "Codex real como coder (MVP2.0)" (`plan/W/README.md`). No stage now plans a task-less migration.

Recorded by the Claude reviewer (authoritative per operator) at the operator's direction. This closes the open question.


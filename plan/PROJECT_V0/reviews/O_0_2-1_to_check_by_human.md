# O/0/2 Trial 1 - Human Check

## Decision Needing Human Review

O/0/2 requires integration tests through `AgentService`, but `gateway/src/services/agent_service.js` did not exist because Stage K has not been implemented in this execution order.

To avoid blocking while the operator is away, I implemented a minimal AgentService as part of O/0/2.

## Scope Implemented

- Service-level policy check before adapter lookup/execution.
- `PolicyDeniedError` for denied policy decisions.
- `delegate` and `spawn` adapter dispatch.
- Optional session persistence when `taskId` is provided.
- `ask`, `view`, and `kill` requiring an existing persisted session.

## Compatibility Decision

The O/0/2 task example passes `taskId: null`, but the current SQLite `sessions.task_id` column is `NOT NULL`. I chose to skip persistence when `taskId` is absent instead of fabricating task rows inside AgentService.

## Human Review Question

Please confirm whether Stage K should treat this AgentService as the accepted base implementation, or whether Stage K should replace/refactor it to require a valid `taskId` for every session-producing operation.

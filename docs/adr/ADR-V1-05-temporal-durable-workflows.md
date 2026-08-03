# ADR-V1-05: Temporal durable workflows

## Status

Accepted.

## Date

2026-05-25.

## Context

PROJECT_V1 Stage D adds Temporal to make orchestration recovery durable across
worker restarts. The existing security boundary remains the agents-gateway MCP
contract: planner, coder, reviewer, approval, artifact, and push-intent actions
must continue to enter through Gateway tools and policies.

TV-03 requires that retries and recovery do not silently bypass human approval
or duplicate dangerous side effects.

## Decision

Temporal wraps the LangGraph-style implement-test-review-push flow as a durable
workflow. Workflow state and replay are owned by Temporal history. Side effects
remain activities that call MCP Gateway tools:

- `agent.delegate` for implementation and test execution.
- `agent.delegate` for review execution.
- `approval.request` for human-gated push approval.
- `artifact.put` for push-intent and workflow checkpoint artifacts.

Approval is modeled as an explicit Temporal signal after `approval.request`.
The workflow never auto-grants a protected action from replay or retry. If no
approval signal arrives before the configured timeout, the workflow records an
approval-timeout checkpoint and exits without push-intent.

The workflow writes checkpoints through Gateway artifacts after meaningful
steps. These checkpoints are observational records for audit and operator
visibility. They are not the recovery source of truth and do not bypass Gateway
repositories or MCP tools. When the Gateway state backend is configured for
Postgres, artifact metadata is stored through that backend; artifact content
remains in the configured artifact store.

Activity retry defaults stay conservative (`activity_retry_max_attempts=1`)
until Gateway tools expose a durable idempotency key. The Stage D activity
runner uses deterministic activity ids and in-process response caching, but that
cache is not crash-durable and is not treated as duplicate prevention after a
worker restart.

## Crash-Recovery Coverage

`orchestrator-langgraph/tests/test_temporal_crash_recovery.py` is an opt-in
Temporal integration harness. It starts the workflow in a Temporal test
environment, stops the first worker after the implementation result is durable
enough for the workflow to schedule the implementation checkpoint, starts a new
worker, verifies that replay reaches the approval gate without rerunning the
first implementation activity, and verifies that no push-intent runs before an
explicit approval signal.

The harness is skipped by default because `temporalio.testing` may require a
Temporal test server binary or external service that is not available in every
local CI environment. Run it explicitly with:

```bash
AGENTS_TEMPORAL_INTEGRATION=1 \
PYTHONPATH=orchestrator-langgraph/src \
.venv/bin/pytest orchestrator-langgraph/tests/test_temporal_crash_recovery.py
```

## Consequences

- Worker crashes can be recovered by Temporal replay without promoting Gateway
  checkpoints into a second workflow state backend.
- Human approval remains required for protected push-intent continuation;
  Temporal retries and replay cannot synthesize approval.
- Duplicate prevention for external Gateway side effects is partial until
  Gateway tools support durable idempotency keys. The workflow therefore keeps
  activity retries conservative and records the limitation explicitly.
- Default CI can validate the harness import/skip behavior, while live Temporal
  crash recovery remains an opt-in integration check.
- The harness models a clean worker stop/restart. Abrupt mid-activity process
  death remains a separate at-least-once execution risk until Gateway durable
  idempotency keys are available.

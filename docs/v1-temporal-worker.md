# PROJECT_V1 Temporal worker

`orchestrator-langgraph` includes a minimal Temporal worker scaffold for Stage D.
It registers a local no-op healthcheck activity named
`orchestrator_langgraph_worker_health_check` plus MCP-facing activity wrappers
for delegate, review, and push-intent steps. Those wrappers call the existing
`GatewayClient`; they do not import Gateway internals or add MCP tools.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `TEMPORAL_ADDRESS` | `localhost:7233` | Temporal frontend address used by `temporalio.client.Client.connect`. |
| `TEMPORAL_TASK_QUEUE` | `orchestrator-langgraph` | Task queue used by the worker. |

The worker emits one JSON object per line to stderr with
`component=temporal_worker`.

## Activities

| Activity | Gateway tool | Idempotency key |
|---|---|---|
| `delegate_activity` | `agent.delegate` | `trace_id:node_name:attempt_number` |
| `review_activity` | `agent.delegate` | `trace_id:node_name:attempt_number` |
| `approval_request_activity` | `approval.request` | `trace_id:node_name:attempt_number` |
| `push_activity` | `artifact.put` | `trace_id:node_name:attempt_number` |
| `checkpoint_activity` | `artifact.put` | `trace_id:node_name:attempt_number` |

The activity runner caches successful responses by deterministic `activity_id`
for repeated invocations in the same worker process. Current Gateway MCP tool
schemas do not expose an explicit idempotency-key field, so activities avoid
sending unsupported `metadata` or `context` arguments and preserve the published
tool contracts.

## Workflow

`ImplementTestReviewPushWorkflow` maps the durable flow to Temporal activities:
implement, test, review, approval request, and push-intent. After review it
requests approval through Gateway and waits for the `approval_response` signal
with a default 24 hour timeout. A granted/approved signal continues to
push-intent; denied signals and timeouts end without push. It writes
`workflow_checkpoint` artifacts through `checkpoint_activity` after each step and
on final test failure. When the Gateway state backend is configured for
Postgres, the artifact metadata rows are stored through that backend while
artifact content remains in the configured artifact store. Runtime resume
durability comes from Temporal history; checkpoints are observational records
and do not bypass MCP tools or Gateway repositories.

## Crash recovery

The opt-in crash-recovery harness in
`orchestrator-langgraph/tests/test_temporal_crash_recovery.py` starts the
workflow, stops the first worker after the implementation result is durable
enough for the workflow to schedule the implementation checkpoint, restarts a
worker on the same task queue, and verifies that replay reaches the approval
gate without rerunning the first implementation activity. It also verifies the
TV-03 boundary that push-intent does not run before an explicit approval signal.

This models a clean worker stop/restart. Abrupt mid-activity process death is
still governed by Temporal at-least-once activity execution and the ADR's
idempotency limitation.

Run it explicitly when a Temporal test environment is available:

```bash
AGENTS_TEMPORAL_INTEGRATION=1 \
PYTHONPATH=orchestrator-langgraph/src \
.venv/bin/pytest orchestrator-langgraph/tests/test_temporal_crash_recovery.py
```

## Local run

With a local Temporal service listening on `localhost:7233`:

```bash
PYTHONPATH=orchestrator-langgraph/src \
python -m orchestrator_langgraph.worker
```

For a non-default task queue:

```bash
TEMPORAL_ADDRESS=localhost:7233 \
TEMPORAL_TASK_QUEUE=project-v1 \
PYTHONPATH=orchestrator-langgraph/src \
python -m orchestrator_langgraph.worker
```

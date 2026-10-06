# orchestrator-langgraph

This optional Python package is a peer client of `agents-gateway`; it does not
replace the Gateway policy boundary. It contains plan/refinement and
implementation/review flows plus Temporal activities/workflow support.

## Install and verification

From the AO root, use the shared [locked installation](../docs/ci-contract.md#reproducible-installation).
The reviewed environment pins LangGraph 1.2.5 and LangGraph SDK 0.4.4.
The latest full candidate gate recorded 81 package tests passing and three
explicit Gateway/Temporal integration skips. This does not establish a live
Temporal deployment or real provider workflow. See
[project status](../docs/project-status.md) for the exact commit and evidence.

## Telemetry

`orchestrator-langgraph` includes dependency-free, OTel-inspired span recording for tests and service diagnostics.

- `AGENTS_OTEL_ENABLED=1` enables real-time span export from non-workflow side-effect code such as activities and GatewayClient-backed calls.
- When enabled, spans are written to stderr as JSON lines with `type: "otel_span"`.
- Telemetry is disabled by default. With `AGENTS_OTEL_ENABLED` unset or false, the runtime exporter is a no-op.
- `AGENTS_OTEL_SERVICE_NAME` overrides the default service name, `orchestrator-langgraph`.

Temporal workflow code does not create real-time IDs, read clocks, write stderr/stdout, or call exporters from `@workflow.run` logic. Tests can inject an in-memory tracer into the pure workflow runner to inspect deterministic span records. Safe span attributes are limited to `trace_id`, `task_id`, `session_id`, `node_name`, `activity_name`, `attempt`, `status`, and `error_code`.

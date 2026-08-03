# orchestrator-langgraph

## Telemetry

`orchestrator-langgraph` includes dependency-free, OTel-inspired span recording for tests and service diagnostics.

- `AGENTS_OTEL_ENABLED=1` enables real-time span export from non-workflow side-effect code such as activities and GatewayClient-backed calls.
- When enabled, spans are written to stderr as JSON lines with `type: "otel_span"`.
- Telemetry is disabled by default. With `AGENTS_OTEL_ENABLED` unset or false, the runtime exporter is a no-op.
- `AGENTS_OTEL_SERVICE_NAME` overrides the default service name, `orchestrator-langgraph`.

Temporal workflow code does not create real-time IDs, read clocks, write stderr/stdout, or call exporters from `@workflow.run` logic. Tests can inject an in-memory tracer into the pure workflow runner to inspect deterministic span records. Safe span attributes are limited to `trace_id`, `task_id`, `session_id`, `node_name`, `activity_name`, `attempt`, `status`, and `error_code`.

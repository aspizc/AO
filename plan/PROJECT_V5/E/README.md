# Stage E — Operator inventory and approval control

Status: **planned**. Six concrete sheets make running work visible, keep
approval authority outside the agent-facing MCP surface, and turn broad
orchestrator autonomy into an explicit grant. `E/0/04` consumes the D/0/05
single-daemon boundary plus supervised execution, writer/reconciliation,
global-budget, and inventory signals. Its external health-only watchdog can
observe a dead or stalled daemon without becoming a second Gateway or gaining
store/mutation access.

Operator health remains local and metadata-only. It adds no MCP tool or public
network endpoint, treats Redis as optional for base Gateway readiness, and does
not change `coordination.status`, `agents:events`, or `message.*`. E/0/04 also
owns A-08's bounded OTLP metric pipeline, durable cursor, RED/USE contract,
SLO/alert rules, and dashboard. G/0/03, H/0/04, I/0/05, and I/0/07 are its
declared consumers and add only typed sources or live-lane evidence.

`A/0/00` is implemented. Rebaselined Project V4 specifications are integrated
into this plan; behavior remains `planned` until implementation commits, tests,
and reviews exist. `absorbed_from` records specification traceability.

| Sheet | Outcome | Status | Functional priority |
|---|---|---|---|
| [E/0/00](0/00.md) | Local operator inventory | planned | P0 |
| [E/0/01](0/01.md) | Immutable approval context | planned | P0 |
| [E/0/02](0/02.md) | Signed single-use decisions | planned | P0 |
| [E/0/03](0/03.md) | Operator CLI for status/approval/audit | planned | P1 |
| [E/0/04](0/04.md) | Closed Gateway health, external stall/recovery evidence, and bounded observability | planned | P1 |
| [E/0/05](0/05.md) | Scoped YOLO grants and informed control | planned | P0 |

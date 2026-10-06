# Stage I — Durable state, recovery, governance, and release

Status: **planned**. Ten concrete sheets `I/0/00–09` complete durability from
operation identity through atomic artifacts, Temporal truth, PostgreSQL,
portable worker, full-stack proof, canonical cutover, restore, and governed
release. `I/0/09` supplies data catalog, lineage, audit-integrity, and quality
evidence. Despite its stable ID, `I/0/04` is the final gate and depends on the
later-numbered implementation/integration sheets, including `I/0/09`.
`I/0/06` owns the pending-history worker transport shim; `I/0/08` separately
owns the complete public MCP 0.1→0.2 endpoint, consumer, atomic retirement, and
common rollback gate together with the canonical ITRP cutover.

`A/0/00` is implemented. Rebaselined Project V4 specifications are integrated
into this plan; behavior remains `planned` until implementation commits, tests,
and reviews exist. `absorbed_from` records specification traceability.

| Sheet | Outcome | Status | Functional priority |
|---|---|---|---|
| [I/0/00](0/00.md) | Durable operations and transactional outbox | planned | P1 |
| [I/0/01](0/01.md) | Atomic artifact staging/commit | planned | P1 |
| [I/0/02](0/02.md) | Temporal durable workflows | planned | P1 |
| [I/0/03](0/03.md) | Verified backup/restore | planned | P1 |
| [I/0/05](0/05.md) | Parameterized PostgreSQL driver and live lane | planned | P1 |
| [I/0/06](0/06.md) | Portable worker and server-bound task identity | planned | P1 |
| [I/0/07](0/07.md) | Required disposable full-stack live lane | planned | P1 |
| [I/0/08](0/08.md) | Canonical ITRP and MCP 0.1→0.2 cutovers, retirement, and rollback | planned | P1 |
| [I/0/09](0/09.md) | Data governance, lineage, and integrity controls | planned | P2 |
| [I/0/04](0/04.md) | Retention, erase/export, and exact release gate | planned | P1 |

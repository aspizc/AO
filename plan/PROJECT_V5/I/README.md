# Stage I — Durable state, recovery, governance, and release

Status: **planned**. Nine concrete sheets `I/0/00–08` complete durability from
operation identity through atomic artifacts, Temporal truth, PostgreSQL,
portable worker, full-stack proof, canonical cutover, restore, and governed
release. Despite its stable ID, `I/0/04` is the final gate and depends on the
later-numbered implementation/integration sheets.

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
| [I/0/08](0/08.md) | Canonical ITRP cutover, retirement, ADR convergence | planned | P1 |
| [I/0/04](0/04.md) | Retention, erase/export, and exact release gate | planned | P1 |

# PROJECT_V4 — Índice canónico de tareas

Este registro enlaza exactamente **72 fichas detalladas**, una por task ID. La
especificación ejecutable vive en cada fichero
`<stage>/<stream>/<task>.md`; este documento ya no duplica su contenido.

Cada ficha incluye estado, épica, objetivo, scope/evidencia, aceptación,
tests/gate, dependencias, esfuerzo/riesgo, detalle de implementación, rollback
y fuente. Estado actual: **G-1/G0 autorizados; las 72 hojas continúan
planificadas o parciales hasta que su owner V5 satisfaga el
[ledger de absorción](../PROJECT_V5/V4_ABSORPTION.md)**.

## M0 — 12 tareas

| ID | Título | Épica | Estado |
|---|---|---|---|
| [`M0/0/00`](M0/0/00.md) | Reconciliar topología de release y congelar base/manifest | [EP-00](epics/EP-00.md) | Planificada |
| [`M0/0/01`](M0/0/01.md) | Harness bootstrap seguro de review | [EP-09](epics/EP-09.md) | Planificada |
| [`M0/1/00`](M0/1/00.md) | KYA profile y policy | [EP-01](epics/EP-01.md) | Planificada |
| [`M0/1/01`](M0/1/01.md) | KYA runner y verdict | [EP-01](epics/EP-01.md) | Planificada |
| [`M0/1/02`](M0/1/02.md) | Prompts y runbook KYA | [EP-01](epics/EP-01.md) | Planificada |
| [`M0/2/00`](M0/2/00.md) | Schema, registry y policy de modelos | [EP-01](epics/EP-01.md) | Planificada |
| [`M0/2/01`](M0/2/01.md) | Adapters y service tier | [EP-01](epics/EP-01.md) | Planificada |
| [`M0/2/02`](M0/2/02.md) | Consumidores y activación | [EP-01](epics/EP-01.md) | Planificada |
| [`M0/3/00`](M0/3/00.md) | SCA npm completo y lock corregido | [EP-00](epics/EP-00.md) | Planificada |
| [`M0/4/00`](M0/4/00.md) | Gate reproducible y manifest de suites/skips | [EP-00](epics/EP-00.md) | Planificada |
| [`M0/4/01`](M0/4/01.md) | Redis 7 y V5 concurrente required | [EP-11](epics/EP-11.md) | Planificada |
| [`M0/4/02`](M0/4/02.md) | Estado, aceptación y promoción verificables | [EP-00](epics/EP-00.md) | Planificada |
## A — 3 tareas

| ID | Título | Épica | Estado |
|---|---|---|---|
| [`A/0/00`](A/0/00.md) | Reconciliar ADR MVP↔V1 y declarar V1 fenced | [EP-02](epics/EP-02.md) | Planificada |
| [`A/0/01`](A/0/01.md) | `docs/models.md` como vista verificada del registry | [EP-02](epics/EP-02.md) | Planificada |
| [`A/0/02`](A/0/02.md) | Config MCP local sin autonomía ni workspace solapado | [EP-02](epics/EP-02.md) | Planificada |
## B — 29 tareas

| ID | Título | Épica | Estado |
|---|---|---|---|
| [`B/0/00`](B/0/00.md) | Repo context canónico | [EP-03](epics/EP-03.md) | Planificada |
| [`B/0/01`](B/0/01.md) | Async process runner primitivo | [EP-03](epics/EP-03.md) | Planificada |
| [`B/0/02`](B/0/02.md) | Migrar adapters al runner | [EP-03](epics/EP-03.md) | Planificada |
| [`B/0/03`](B/0/03.md) | Cancelación y concurrencia MCP | [EP-03](epics/EP-03.md) | Planificada |
| [`B/0/04`](B/0/04.md) | Projector restricted determinista | [EP-06](epics/EP-06.md) | Planificada |
| [`B/1/00`](B/1/00.md) | Formato de handles/capabilities internos | [EP-04](epics/EP-04.md) | Planificada |
| [`B/1/01`](B/1/01.md) | Enforcement actor/target server-side | [EP-04](epics/EP-04.md) | Planificada |
| [`B/1/02`](B/1/02.md) | Authority y lineage de artifacts | [EP-04](epics/EP-04.md) | Planificada |
| [`B/1/03`](B/1/03.md) | Máquina de estados lifecycle | [EP-04](epics/EP-04.md) | Planificada |
| [`B/1/04`](B/1/04.md) | Runtime root y child env privado | [EP-04](epics/EP-04.md) | Planificada |
| [`B/1/05`](B/1/05.md) | Backend de sandbox | [EP-04](epics/EP-04.md) | Planificada |
| [`B/1/06`](B/1/06.md) | Mounts/worktree por task | [EP-04](epics/EP-04.md) | Planificada |
| [`B/1/07`](B/1/07.md) | Canaries de isolation reales | [EP-04](epics/EP-04.md) | Planificada |
| [`B/1/08`](B/1/08.md) | Ownership y lock single-writer | [EP-04](epics/EP-04.md) | Planificada |
| [`B/1/09`](B/1/09.md) | Reconciliación y fault injection | [EP-04](epics/EP-04.md) | Planificada |
| [`B/2/00`](B/2/00.md) | Control socket read-only | [EP-05](epics/EP-05.md) | Planificada |
| [`B/2/01`](B/2/01.md) | Challenge y verificación de firma | [EP-05](epics/EP-05.md) | Planificada |
| [`B/2/02`](B/2/02.md) | Mutación, wake y retirada MCP | [EP-05](epics/EP-05.md) | Planificada |
| [`B/2/03`](B/2/03.md) | Grants de orquestador YOLO y launch unconfined | [EP-05](epics/EP-05.md) | Planificada |
| [`B/3/00`](B/3/00.md) | Mediación de `agent.*` output | [EP-06](epics/EP-06.md) | Planificada |
| [`B/3/01`](B/3/01.md) | Audit data minimization | [EP-06](epics/EP-06.md) | Planificada |
| [`B/3/02`](B/3/02.md) | Catálogo, retention y derechos de datos | [EP-06](epics/EP-06.md) | Planificada |
| [`B/3/03`](B/3/03.md) | Export/erase y retention ejecutables | [EP-06](epics/EP-06.md) | Planificada |
| [`B/4/00`](B/4/00.md) | Server/schema 0.2 detrás de flag | [EP-07](epics/EP-07.md) | Planificada |
| [`B/4/01`](B/4/01.md) | Shim worker V1 hacia Gateway único | [EP-07](epics/EP-07.md) | Planificada |
| [`B/4/02`](B/4/02.md) | Migrar clientes y retirar 0.1 | [EP-07](epics/EP-07.md) | Planificada |
| [`B/5/00`](B/5/00.md) | Authority/spoof MCP E2E | [EP-07](epics/EP-07.md) | Planificada |
| [`B/5/01`](B/5/01.md) | Artifact/egress/audit MCP E2E | [EP-07](epics/EP-07.md) | Planificada |
| [`B/5/02`](B/5/02.md) | Lifecycle/control-plane E2E | [EP-07](epics/EP-07.md) | Planificada |
## C — 5 tareas

| ID | Título | Épica | Estado |
|---|---|---|---|
| [`C/0/00`](C/0/00.md) | Audit legible y seguro | [EP-08](epics/EP-08.md) | Planificada |
| [`C/0/01`](C/0/01.md) | Cola y detail de approvals por control socket | [EP-08](epics/EP-08.md) | Planificada |
| [`C/0/02`](C/0/02.md) | Consentimiento informado y firma de operador | [EP-08](epics/EP-08.md) | Planificada |
| [`C/0/03`](C/0/03.md) | Inventario y recovery operables | [EP-08](epics/EP-08.md) | Planificada |
| [`C/0/04`](C/0/04.md) | Consentimiento y perfil de orquestador YOLO | [EP-08](epics/EP-08.md) | Planificada |
## D — 7 tareas

| ID | Título | Épica | Estado |
|---|---|---|---|
| [`D/0/00`](D/0/00.md) | Roles y schemas | [EP-09](epics/EP-09.md) | Planificada |
| [`D/0/01`](D/0/01.md) | Change manifest y Reviewer A | [EP-09](epics/EP-09.md) | Planificada |
| [`D/0/02`](D/0/02.md) | Reviewer B raw/read-only | [EP-09](epics/EP-09.md) | Planificada |
| [`D/1/00`](D/1/00.md) | State reducer dual-review | [EP-09](epics/EP-09.md) | Planificada |
| [`D/1/01`](D/1/01.md) | Gate evaluator | [EP-09](epics/EP-09.md) | Planificada |
| [`D/1/02`](D/1/02.md) | Migrar runner y prompts | [EP-09](epics/EP-09.md) | Planificada |
| [`D/1/03`](D/1/03.md) | E2E y cierre bootstrap | [EP-09](epics/EP-09.md) | Planificada |
## E — 16 tareas

| ID | Título | Épica | Estado |
|---|---|---|---|
| [`E/0/00`](E/0/00.md) | Runtime fence, Python y dependency scan | [EP-10](epics/EP-10.md) | Planificada |
| [`E/0/01`](E/0/01.md) | Semántica estricta de resultados | [EP-10](epics/EP-10.md) | Planificada |
| [`E/0/02`](E/0/02.md) | Verdict estricto plan-refine | [EP-10](epics/EP-10.md) | Planificada |
| [`E/1/00`](E/1/00.md) | Golden legacy y contrato normativo V2 | [EP-10](epics/EP-10.md) | Planificada |
| [`E/1/01`](E/1/01.md) | Shell V2 y namespaces de deployment | [EP-10](epics/EP-10.md) | Planificada |
| [`E/1/02`](E/1/02.md) | Cliente V2 sobre el canal worker único | [EP-10](epics/EP-10.md) | Planificada |
| [`E/1/03`](E/1/03.md) | Operation IDs durables | [EP-10](epics/EP-10.md) | Planificada |
| [`E/1/04`](E/1/04.md) | Approval autoritativo `change.accept` | [EP-10](epics/EP-10.md) | Planificada |
| [`E/1/05`](E/1/05.md) | Dual review sin raw en history | [EP-10](epics/EP-10.md) | Planificada |
| [`E/1/06`](E/1/06.md) | Replay, crash y contrato V2 | [EP-10](epics/EP-10.md) | Planificada |
| [`E/1/07`](E/1/07.md) | Selector y cutover | [EP-10](epics/EP-10.md) | Planificada |
| [`E/2/00`](E/2/00.md) | `v1-temporal-real` | [EP-11](epics/EP-11.md) | Planificada |
| [`E/2/01`](E/2/01.md) | `v1-stack-real` | [EP-11](epics/EP-11.md) | Planificada |
| [`E/2/02`](E/2/02.md) | `v1-agents-real` | [EP-11](epics/EP-11.md) | Planificada |
| [`E/2/03`](E/2/03.md) | Promotion/stability evidence | [EP-11](epics/EP-11.md) | Planificada |
| [`E/3/00`](E/3/00.md) | Retirar ITRP LangGraph | [EP-10](epics/EP-10.md) | Planificada |

## Navegación

- [12 hojas detalladas de épica](epics/README.md)
- [Mapa de auditoría y trazabilidad](AUDIT.md)
- Índices por stage: [M0](M0/TASKS.md), [A](A/TASKS.md), [B](B/TASKS.md), [C](C/TASKS.md), [D](D/TASKS.md), [E](E/TASKS.md)

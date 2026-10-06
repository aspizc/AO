# B — Índice de hojas atómicas

Este fichero es un índice; las especificaciones canónicas viven en los ficheros
`B/<stream>/<task>.md` enlazados a continuación. Estado actual:
**planificadas para absorción V5; G-1/G0 autorizados**.

## B/0 — Contexto y ejecución

[Índice del stream](0/README.md)

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [B/0/00](0/00.md) | Repo context canónico | [EP-03](../epics/EP-03.md) | Planificada |
| [B/0/01](0/01.md) | Async process runner primitivo | [EP-03](../epics/EP-03.md) | Planificada |
| [B/0/02](0/02.md) | Migrar adapters al runner | [EP-03](../epics/EP-03.md) | Planificada |
| [B/0/03](0/03.md) | Cancelación y concurrencia MCP | [EP-03](../epics/EP-03.md) | Planificada |
| [B/0/04](0/04.md) | Projector restricted determinista | [EP-06](../epics/EP-06.md) | Planificada |
## B/1 — Authority, lifecycle e isolation

[Índice del stream](1/README.md)

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [B/1/00](1/00.md) | Formato de handles/capabilities internos | [EP-04](../epics/EP-04.md) | Planificada |
| [B/1/01](1/01.md) | Enforcement actor/target server-side | [EP-04](../epics/EP-04.md) | Planificada |
| [B/1/02](1/02.md) | Authority y lineage de artifacts | [EP-04](../epics/EP-04.md) | Planificada |
| [B/1/03](1/03.md) | Máquina de estados lifecycle | [EP-04](../epics/EP-04.md) | Planificada |
| [B/1/04](1/04.md) | Runtime root y child env privado | [EP-04](../epics/EP-04.md) | Planificada |
| [B/1/05](1/05.md) | Backend de sandbox | [EP-04](../epics/EP-04.md) | Planificada |
| [B/1/06](1/06.md) | Mounts/worktree por task | [EP-04](../epics/EP-04.md) | Planificada |
| [B/1/07](1/07.md) | Canaries de isolation reales | [EP-04](../epics/EP-04.md) | Planificada |
| [B/1/08](1/08.md) | Ownership y lock single-writer | [EP-04](../epics/EP-04.md) | Planificada |
| [B/1/09](1/09.md) | Reconciliación y fault injection | [EP-04](../epics/EP-04.md) | Planificada |
## B/2 — Control de operador

[Índice del stream](2/README.md)

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [B/2/00](2/00.md) | Control socket read-only | [EP-05](../epics/EP-05.md) | Planificada |
| [B/2/01](2/01.md) | Challenge y verificación de firma | [EP-05](../epics/EP-05.md) | Planificada |
| [B/2/02](2/02.md) | Mutación, wake y retirada MCP | [EP-05](../epics/EP-05.md) | Planificada |
| [B/2/03](2/03.md) | Grants de orquestador YOLO y launch unconfined | [EP-05](../epics/EP-05.md) | Planificada |
## B/3 — Egress y audit

[Índice del stream](3/README.md)

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [B/3/00](3/00.md) | Mediación de `agent.*` output | [EP-06](../epics/EP-06.md) | Planificada |
| [B/3/01](3/01.md) | Audit data minimization | [EP-06](../epics/EP-06.md) | Planificada |
| [B/3/02](3/02.md) | Catálogo, retention y derechos de datos | [EP-06](../epics/EP-06.md) | Planificada |
| [B/3/03](3/03.md) | Export/erase y retention ejecutables | [EP-06](../epics/EP-06.md) | Planificada |
## B/4 — Cutover MCP 0.2

[Índice del stream](4/README.md)

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [B/4/00](4/00.md) | Server/schema 0.2 detrás de flag | [EP-07](../epics/EP-07.md) | Planificada |
| [B/4/01](4/01.md) | Shim worker V1 hacia Gateway único | [EP-07](../epics/EP-07.md) | Planificada |
| [B/4/02](4/02.md) | Migrar clientes y retirar 0.1 | [EP-07](../epics/EP-07.md) | Planificada |
## B/5 — Gate adversarial

[Índice del stream](5/README.md)

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [B/5/00](5/00.md) | Authority/spoof MCP E2E | [EP-07](../epics/EP-07.md) | Planificada |
| [B/5/01](5/01.md) | Artifact/egress/audit MCP E2E | [EP-07](../epics/EP-07.md) | Planificada |
| [B/5/02](5/02.md) | Lifecycle/control-plane E2E | [EP-07](../epics/EP-07.md) | Planificada |

## Reconciliación de absorción V5

- `B/0/04` → D/0/02.
- `B/2/03` → E/0/05 y sus prerequisitos/consumidores.
- `B/4/00` y `B/4/02` → I/0/08 como owner del endpoint/cutover MCP 0.2;
  C/0/01, D/0/00, E/0/02 e I/0/03 son dependencias. `B/4/01` → I/0/06 como
  owner del worker shim, con D/0/05 e I/0/08 para non-recursion y drain.
- `B/5/02` → C/0/03 + C/1/03 + D/0/04 + E/0/05.

[← Proyecto V4](../README.md) · [Catálogo global de tareas](../SHEETS.md)

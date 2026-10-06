# B/4 — Cutover MCP 0.2

Hojas atómicas y canónicas de este stream. Cada fichero contiene estado,
objetivo, scope, aceptación, tests/gate, dependencias, esfuerzo/riesgo,
especificación detallada, rollback y trazabilidad.

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [B/4/00](00.md) | Server/schema 0.2 detrás de flag | [EP-07](../../epics/EP-07.md) | Planificada |
| [B/4/01](01.md) | Shim worker V1 hacia Gateway único | [EP-07](../../epics/EP-07.md) | Planificada |
| [B/4/02](02.md) | Migrar clientes y retirar 0.1 | [EP-07](../../epics/EP-07.md) | Planificada |

Absorción reconciliada: V5 `I/0/08` es el owner planificado del endpoint 0.2
tras flag (`B/4/00`) y del consumer cutover/retirada/rollback (`B/4/02`);
`C/0/01`, `D/0/00`, `E/0/02` e `I/0/03` son fuentes/dependencias, no nuevos
owners completos. `B/4/01` conserva `I/0/06` como owner del worker shim, con
`D/0/05` e `I/0/08` para non-recursion y drain.

[← Stage B](../README.md) · [Índice de stage](../TASKS.md) · [Catálogo global](../../SHEETS.md)

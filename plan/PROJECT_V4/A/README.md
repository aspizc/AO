# Stage A — Coherencia y configuracion segura

Estado: backlog. [`TASKS.md`](TASKS.md) indexa las tres fichas físicas. Cada
tarea usa las dependencias M0 exactas de la tabla; G1 se cierra solo cuando las
tres tareas A estan integradas.

| ID | Tarea | Depende de | Esfuerzo |
|---|---|---|---|
| [A/0/00](0/00.md) | Reconciliar ADR MVP↔V1 y declarar V1 fenced | M0/0/00 | S |
| [A/0/01](0/01.md) | `docs/models.md` derivado del registry | M0/2/02 | S/M |
| [A/0/02](0/02.md) | Config MCP local sin autonomia ni workspace solapado | M0/0/00 | S/M |

Salida: ninguna contradiccion sobre arquitectura soportada, modelos o alcance;
config de ejemplo fail-safe. A no arregla aislamiento runtime: solo documenta y
evita defaults inseguros; B/1/04 implementa la frontera real.

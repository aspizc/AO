# E/0 — Fence y correctitud inmediata

Hojas atómicas y canónicas de este stream. Cada fichero contiene estado,
objetivo, scope, aceptación, tests/gate, dependencias, esfuerzo/riesgo,
especificación detallada, rollback y trazabilidad.

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [E/0/00](00.md) | Runtime fence, Python y dependency scan | [EP-10](../../epics/EP-10.md) | Parcial |
| [E/0/01](01.md) | Semántica estricta de resultados | [EP-10](../../epics/EP-10.md) | Planificada |
| [E/0/02](02.md) | Verdict estricto plan-refine | [EP-10](../../epics/EP-10.md) | Planificada |

Absorción reconciliada: `E/0/00` es parcial por C/0/00+C/0/02 y queda abierta
por I/0/06; `E/0/02` cierra por el parser fail-closed de I/0/08.

[← Stage E](../README.md) · [Índice de stage](../TASKS.md) · [Catálogo global](../../SHEETS.md)

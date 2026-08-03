# Stage J — Orchestration y task tools

## Objetivo del stage

Servicios y tools MCP para gestionar el ciclo de vida de una `orchestration_session` (la unidad de trabajo que el LLM-orchestrator inicia con `orchestration.create`) y sus `tasks` hijas (asignadas con `task.assign`).

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [J/0/0](0/00.md) | Orchestration service | F/0/3, D/0/0 | `feature/J-0-0-orchestration-service` |
| [J/0/1](0/01.md) | Task assignment service | J/0/0, C/0/5, F/0/2 | `feature/J-0-1-task-assignment-service` |
| [J/0/2](0/02.md) | MCP tools for orchestration and task | J/0/0, J/0/1, G/0/1 | `feature/J-0-2-orchestration-task-tools` |

## Criterio de salida del stage

- `orchestration.create/view/cancel/pause/resume` y `task.assign` listadas por MCP.
- Cada operacion deja audit trail con `traceId`.
- `task.assign` aplica policy al caller (orchestrator) y al target (rol del hijo).

## Que NO se hace en este stage

- Ejecutar realmente al hijo (eso es K).
- Persistir artifacts (L).

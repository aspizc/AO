# Stage A - Task-less sessions

## Objetivo del stage

Permitir sesiones de agente sin `taskId` para uso exploratorio/controlado desde
MCP, sin romper el flujo trazable recomendado `orchestration -> task.assign ->
agent.*`.

El camino con `taskId` sigue siendo el flujo principal para trabajo auditable.
Las sesiones sin tarea existen para casos practicos donde el operador necesita
abrir una sesion supervisada o headless antes de formalizar una task, o para
clientes MCP que quieren usar el Gateway como wrapper seguro de agentes.

## Tareas

> Nota de compatibilidad: estas tareas conservan IDs historicos `W/0/*` porque
> fueron extraidas del backlog post-MVP2.0 antes de crear Project V2. Dentro de
> Project V2 se referencian como `PROJECT_V2/A W/0/*`.

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [W/0/0](0/00.md) | Nullable session task migration | K/0/3, F/0/1, F/0/2 | `feature/W-0-0-nullable-session-task` |
| [W/0/1](0/01.md) | Task-less agent tool semantics | W/0/0, K/0/3 | `feature/W-0-1-taskless-agent-tools` |
| [W/0/2](0/02.md) | Task-less session E2E and docs | W/0/1, U/0/5 | `feature/W-0-2-taskless-session-e2e-docs` |

## Criterio de salida del stage

- `sessions.task_id` acepta `NULL` con migracion idempotente.
- `agent.delegate` y `agent.spawn` pueden recibir o no `taskId`.
- Las respuestas indican claramente si la sesion quedo asociada a task.
- `ask/view/kill`, `session.attach_info`, audit y listados funcionan para
  sesiones con y sin task.
- La documentacion mantiene `task.assign` como camino recomendado para trabajo
  planificado.

## Que NO se hace en este stage

- Eliminar `task.assign` del flujo recomendado.
- Permitir que sesiones sin task salten policy, cwd allowlist, audit o
  sanitization.
- Cambiar clasificaciones de repos ni permitir Codex en `restricted`.

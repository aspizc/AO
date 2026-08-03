# Stage B - Advanced planning workflow

## Objetivo del stage

Implementar una planificacion avanzada para el Gateway MCP donde el operador
primero conversa con el orquestador para aclarar la funcionalidad a alto nivel.
Cuando el alcance esta razonablemente claro o el operador lo indica, el sistema
lanza dos planners con modelos distintos, compara sus drafts mediante revision
cruzada, sintetiza la mejor propuesta, vuelve al humano para explicar el proyecto
en detalle y, con aprobacion, genera un plan stage/tarea revisado por Codex.

Este stage corrige la limitacion operacional detectada en el flujo actual:
`agent.delegate` headless no sirve como planificacion conversacional.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [B/0/0](0/00.md) | Advanced planning contract and prompts | V0 Z/0/3 | `feature/V2-B-0-0-advanced-planning-contract` |
| [B/0/1](0/01.md) | Human discovery and dual-planner draft sessions | B/0/0 | `feature/V2-B-0-1-dual-planner-drafts` |
| [B/0/2](0/02.md) | Cross-review, synthesis and readiness gate | B/0/1 | `feature/V2-B-0-2-planner-cross-review` |
| [B/0/3](0/03.md) | Human detail review and approval gate | B/0/2 | `feature/V2-B-0-3-human-detail-gate` |
| [B/0/4](0/04.md) | Detailed plan generation with Codex review | B/0/3 | `feature/V2-B-0-4-detailed-plan-generation` |
| [B/0/5](0/05.md) | Runbook, smoke and anti-headless regression | B/0/4 | `feature/V2-B-0-5-advanced-planning-smoke` |

Stage B usa nombres de archivo de tarea con dos digitos (`0/00.md` ...
`0/05.md`) de forma intencional.

## Criterio de salida del stage

- El operador tiene una fase inicial interactiva para describir la funcionalidad.
- Dos planners con modelos distintos producen drafts independientes y auditados.
- Cada planner revisa el draft del otro y emite comparacion, correcciones,
  elementos combinables y readiness assessment.
- El sistema resume al humano los puntos clave en cada iteracion.
- Si ambos planners recomiendan pasar a detalle, el orquestador explica el
  proyecto y pide aprobacion humana antes de generar el plan detallado.
- Claude genera el plan stage/tarea detallado.
- Codex revisa cada stage/tarea y sus hallazgos se incorporan o escalan.
- El flujo avanza automaticamente por defecto, pero cualquier indicacion humana
  recibida se transmite al planner y al planner-reviewer antes de continuar.
- Las iteraciones de discovery/draft/review tienen limite y escalan al humano si
  no convergen.
- Los caps quedan activos y auditados: tres rondas dual-draft/cross-review,
  cinco ciclos de discovery, tres intentos reviewer por stage/tarea, y
  `maxModelCalls`/`maxTokens`; cada cap pausa en `OPEN DECISION`.

## Que NO se hace en este stage

- No se permite que un planner escriba archivos directamente.
- No se aplica ningun plan sin approval del operador.
- No se sustituye la policy del Gateway por instrucciones de prompt.
- No se obliga a usar Codex en repos `restricted`; policy sigue mandando.
- No se deja indefinido el comportamiento de approvals denegados o pendientes.

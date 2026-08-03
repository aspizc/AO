# Stage N — Artifact share + visibilidad cross-role

## Objetivo del stage

Implementar `artifact.share` como canal mediado para el patron artifact-mediated (§17.2.2 V4) y bloquear la matriz de visibilidad §15 V4 con tests adversariales.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [N/0/0](0/00.md) | Artifact share service | M/0/2, C/0/5 | `feature/N-0-0-artifact-share-service` |
| [N/0/1](0/01.md) | `artifact.share` MCP tool | N/0/0, G/0/1 | `feature/N-0-1-artifact-share-tool` |
| [N/0/2](0/02.md) | Visibility matrix tests | N/0/1 | `feature/N-0-2-visibility-matrix-tests` |

## Criterio de salida del stage

- raw restricted nunca se comparte directamente a reviewer; se devuelve sanitized.
- `ARTIFACT_SHARED` auditado.
- Matriz §15 V4 cubierta por tests de tabla.

## Que NO se hace en este stage

- Mensajeria entre hijos (S).
- Workflow-mediated communication (V/0/2).

# Stage L — Artifact store basico

## Objetivo del stage

Persistir artefactos en filesystem (`workspace/artifacts/<traceId>/`) y SQLite, con policy aplicada en `artifact.get`. Sin sanitizer aun: la frontera real para raw restricted la cierra Stage M.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [L/0/0](0/00.md) | Filesystem artifact store | F/0/2, D/0/0 | `feature/L-0-0-filesystem-artifact-store` |
| [L/0/1](0/01.md) | Artifact MCP tools | L/0/0, G/0/1 | `feature/L-0-1-artifact-mcp-tools` |
| [L/0/2](0/02.md) | `artifact.get` policy | L/0/1, C/0/5 | `feature/L-0-2-artifact-get-policy` |

## Criterio de salida del stage

- `artifact.put/get/list` listadas por MCP y persistidas.
- `artifact.get` consulta policy con (requesterAgent, requesterRole, kind, classification).
- `ARTIFACT_CREATED` auditado.

## Que NO se hace en este stage

- Sanitization automatica (M).
- `artifact.share` (N).

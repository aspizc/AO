# Stage O — Claude adapter

## Objetivo del stage

Adapter Claude Code CLI con la misma interfaz que Gemini, restringido por policy a clasificaciones non-restricted.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [O/0/0](0/00.md) | Claude CLI invocation research | H/0/3 | `feature/O-0-0-claude-cli-research` |
| [O/0/1](0/01.md) | Claude adapter implementation | O/0/0, H/0/3, K/0/0 | `feature/O-0-1-claude-adapter` |
| [O/0/2](0/02.md) | Claude policy enforcement | O/0/1, C/0/5 | `feature/O-0-2-claude-policy-enforcement` |

## Criterio de salida del stage

- `task.assign` a `claude-code` en `coder` sobre `sample-apps` ejecuta (manual o dry-run).
- `agent.spawn` con repo `cvision` para Claude se rechaza antes de tocar el adapter.
- Documento `docs/adapters/claude-code.md` describe version y modos de invocacion.

## Que NO se hace en este stage

- Codex (P).
- Cambiar la matriz de policy (la matriz ya impide a Claude tocar restricted desde C/0/1).

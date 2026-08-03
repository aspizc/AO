# Stage P — Codex adapter (opcional MVP)

## Objetivo del stage

Registrar Codex como adapter opcional con dry-run obligatorio. Si la CLI codex no esta disponible o es inestable, el adapter queda registrado pero **deshabilitado** con razon clara.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [P/0/0](0/00.md) | Codex adapter dry-run | H/0/3, K/0/0 | `feature/P-0-0-codex-adapter-dry-run` |
| [P/0/1](0/01.md) | Codex real headless delegate | P/0/0, K/0/3 | `feature/P-0-1-codex-headless-delegate` |
| [P/0/2](0/02.md) | Codex supervised tmux sessions | P/0/1, H/0/1, H/0/2, K/0/3 | `feature/P-0-2-codex-supervised-tmux` |
| [P/0/3](0/03.md) | Codex MCP activation workflow | P/0/2, K/0/4 | `feature/P-0-3-codex-mcp-activation-workflow` |

## Criterio de salida del stage

- MVP cierra sin Codex real si Gemini + Claude estan estables.
- Estado deshabilitado documentado en README + adapter registry.
- Si P/0/1-P/0/3 se ejecutan, Codex puede usarse como `coder` solo en repos `unrestricted`/`internal`, via MCP, y sigue disabled por defecto.

## Que NO se hace en este stage

- Codex en repos `restricted` (lo prohibe la policy de C/0/1).
- Habilitar Codex por defecto para todos los operadores.

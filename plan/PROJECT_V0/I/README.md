# Stage I — Gemini adapter (headless + supervisado)

## Objetivo del stage

Implementar el adapter de Gemini CLI con dos modos: headless (`gemini -p --yolo`) y supervisado (sesion tmux persistente). Reusa logica del experimento `gemini-orchestrator`. Es el unico adapter aprobado para repos `restricted`.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [I/0/0](0/00.md) | Gemini headless delegate | H/0/3, D/0/0 | `feature/I-0-0-gemini-headless-delegate` |
| [I/0/1](0/01.md) | Gemini supervised tmux sessions | I/0/0, H/0/0, H/0/1 | `feature/I-0-1-gemini-supervised-tmux` |
| [I/0/2](0/02.md) | Policy and audit integration | I/0/1, C/0/5, D/0/0 | `feature/I-0-2-gemini-policy-audit` |

## Criterio de salida del stage

- delegate y spawn funcionan en `AGENTS_DRY_RUN=1` (CI) y en modo real (manual).
- Ningun spawn ocurre cuando policy = deny.
- SESSION_STARTED, SESSION_CLOSED, ERROR auditados.

## Que NO se hace en este stage

- Adapters de Claude o Codex.
- Tools MCP `agent.*` (Stage K).

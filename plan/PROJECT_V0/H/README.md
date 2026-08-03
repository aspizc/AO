# Stage H — Adapter base y tmux client

## Objetivo del stage

Definir la interfaz comun de adapters CLI (delegate / spawn / ask / view / kill), portar el `tmux-client.js` del experimento `gemini-orchestrator`, y construir un guard de `cwd` independiente de la policy.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [H/0/0](0/00.md) | Port tmux client | A/0/4 | `feature/H-0-0-port-tmux-client` |
| [H/0/1](0/01.md) | Session naming helpers | H/0/0 | `feature/H-0-1-session-naming` |
| [H/0/2](0/02.md) | Base adapter contract and cwd guard | C/0/5, H/0/1 | `feature/H-0-2-base-adapter-cwd-guard` |
| [H/0/3](0/03.md) | Adapter registry | H/0/2 | `feature/H-0-3-adapter-registry` |

## Criterio de salida del stage

- `assertSafeCwd` rechaza cualquier path fuera del allowlist (incluso via symlinks).
- `buildTmuxTarget(traceId, agent, role)` produce nombres seguros (`ag-<traceId>-<agent>-<role>`).
- El registry de adapters expone agentes registrables sin que tools/services importen adapters concretos.

## Que NO se hace en este stage

- Implementar Gemini, Claude o Codex (Stages I/O/P).
- Detector de intervencion humana (R/0/1).

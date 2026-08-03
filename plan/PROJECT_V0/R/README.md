# Stage R — Session tools y human intervention

## Objetivo del stage

Tools `session.attach_info` y `session.intervention_note`, mas un detector best-effort de input humano no solicitado en sesiones tmux que emite `HUMAN_TMUX_INTERVENTION`.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [R/0/0](0/00.md) | Session attach info tool | K/0/1 | `feature/R-0-0-session-attach-info` |
| [R/0/1](0/01.md) | Intervention detector | H/0/0, I/0/1, D/0/0 | `feature/R-0-1-human-intervention-detector` |
| [R/0/2](0/02.md) | Manual intervention notes | R/0/0, D/0/0 | `feature/R-0-2-session-intervention-note` |

## Criterio de salida del stage

- `attach_info` devuelve `tmuxTarget` y `attachCommand` correctos.
- `intervention_note` persiste audit con `traceId` y `sessionId`.
- Detector marcado explicitamente como **best-effort** en docs (no garantia de captura completa).

## Que NO se hace en este stage

- Forzar canal unico humano-Gateway: tmux sigue siendo legitimo en avanzado.
- Capturar intervenciones con 100% fidelidad (no es factible).

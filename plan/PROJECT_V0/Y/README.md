# Stage Y — E2E real de 2 agentes + gate MVP2.0

## Objetivo del stage

Demostrar y blindar que el flujo completo del MVP2.0 funciona de punta a punta
con ejecucion **real**: orquestador (host MCP generico) -> Codex coder
(gpt-5 medium, workspace-write) -> Claude reviewer (opus-4.7), via el gateway
MCP stdio. Cerrar el alcance con un gate, una checklist y un ADR.

## Contexto

Stages V/W/X entregan modelo, Codex real y el launcher generico. Stage Y los
junta: una prueba real guardada (no rompe CI), un smoke que el operador corre en
su maquina, y la documentacion de cierre que declara el MVP2.0 listo y fija su
alcance.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [Y/0/0](0/00.md) | E2E real 2 agentes (guarded) | W/0/1, V/0/2, X/0/0 | `feature/Y-0-0-real-two-agent-e2e` |
| [Y/0/1](0/01.md) | Smoke MVP2.0 para operador | Y/0/0, X/0/2 | `feature/Y-0-1-mvp2-smoke` |
| [Y/0/2](0/02.md) | Gate, checklist y ADR MVP2.0 | Y/0/1, U/0/5 | `feature/Y-0-2-mvp2-gate-adr` |
| [Y/0/3](0/03.md) | Modo autonomo coder+reviewer (scope `code.apply`) | Q/0/5, X/0/1 | `feature/Y-0-3-code-autoapprove-scope` |

## Criterio de salida del stage

- Existe un E2E real de 2 agentes que solo corre con `AGENTS_E2E_REAL=1`
  (y `tmux`/CLIs presentes); en CI normal queda **skipped**, manteniendo CI
  determinista y sin red.
- Existe un smoke `scripts/smoke_mvp2.mjs` que el operador ejecuta para confirmar
  el flujo en su maquina con evidencia (audit + artefactos).
- La checklist de aceptacion MVP2.0 y un ADR fijan el alcance: Codex coder real,
  seleccion de modelo, flujo supervisado de 2 agentes y launcher generico estan
  **in scope**; Codex sigue disabled por defecto.
- (Y/0/3) El flujo coder+reviewer admite **modo autonomo opt-in** (scope
  `code.apply` sobre el mecanismo Q/0/5): default off, nunca auto-concede
  operaciones peligrosas ni acepta trabajo con veredicto KO del reviewer.

## Que NO se hace en este stage

- Habilitar el E2E real en CI por defecto.
- Cloud/multi-host/multi-user (sigue fuera de scope).
- Cambiar el default seguro de Codex.

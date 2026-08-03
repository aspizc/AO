# Stage D — Durabilidad Temporal (F4)

## Objetivo del stage

Envolver el grafo `implement-test-review-push` en un workflow Temporal. Las llamadas MCP son activities idempotentes con reintentos; approvals largos funcionan via signals; el workflow sobrevive reinicios del worker.

Invariante central: Temporal no llama APIs internas ni salta el Gateway. Las activities llaman MCP tools existentes.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [D/0/0](0/00.md) | Temporal worker scaffold | B + C | `feature/K-0-D-0-0-temporal-scaffold` |
| [D/0/1](0/01.md) | MCP calls como Temporal activities | D/0/0 | `feature/K-0-D-0-1-temporal-activities` |
| [D/0/2](0/02.md) | Workflow `implement-test-review-push` | D/0/1 | `feature/K-0-D-0-2-itrp-workflow` |
| [D/0/3](0/03.md) | Long approval timer (Temporal signal) | D/0/2 | `feature/K-0-D-0-3-long-approval` |
| [D/0/4](0/04.md) | Test crash recovery + ADR-V1-05 | D/0/3 | `feature/K-0-D-0-4-crash-recovery-adr` |

## Criterio de salida

- El workflow Temporal completa `implement-test-review-push` con estado en Postgres.
- Crash del worker a mitad del workflow: al reiniciar, continua desde donde quedo.
- `NEVER_AUTO` sigue exigiendo aprobacion humana incluso con reintentos.
- ADR-V1-05 queda planificado en `docs/adr/`.

## Invariante TV-03

Los reintentos durables no duplican acciones peligrosas ni bypassean approvals humanos. Activities idempotentes y `NEVER_AUTO` bloqueante son obligatorios.

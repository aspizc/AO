# Stage U — E2E y cierre MVP

## Objetivo del stage

Validar el flujo canonico V4 §22.3 end-to-end con adapters dry-run, atar evidencia a la checklist de aceptacion §30 V4, y bloquear regresiones futuras con la suite adversarial derivada del threat model.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [U/0/0](0/00.md) | Restricted-flow E2E dry-run | N/0/2, O/0/2, Q/0/3, R/0/2, T/0/2 | `feature/U-0-0-restricted-flow-e2e` |
| [U/0/1](0/01.md) | V4 acceptance checklist | U/0/0 | `feature/U-0-1-v4-acceptance-checklist` |
| [U/0/2](0/02.md) | Final README and MVP ADR | U/0/1 | `feature/U-0-2-mvp-docs-closure` |
| [U/0/3](0/03.md) | MVP regression gate | U/0/2 | `feature/U-0-3-mvp-regression-gate` |
| [U/0/4](0/04.md) | Bypass regression suite | U/0/3, A/0/6, M/0/3, N/0/2, Q/0/4 | `feature/U-0-4-bypass-regression-suite` |
| [U/0/5](0/05.md) | Operational usability gate | K/0/4 | `feature/U-0-5-operational-usability-gate` |

## Criterio de salida del stage (= cierre MVP)

- E2E dry-run del flujo restricted pasa.
- Cada item §30 V4 tiene evidencia trazable.
- README y ADR-004 (MVP scope) presentes.
- `./scripts/ci.sh` verde, incluyendo bypass regression suite.
- E2E MCP stdio real de orchestrator + coder + reviewer incluido en CI.

## Que NO se hace en este stage

- Verificacion en IDEs concretos (Cursor/Antigravity son fuera de scope).
- Migrar persistencia (V).
- Hacer Codex obligatorio para el cierre restricted. Codex real se valida por P/0/3 si se necesita.

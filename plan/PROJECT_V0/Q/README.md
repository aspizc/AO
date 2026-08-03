# Stage Q — Approval workflow async

## Objetivo del stage

Implementar approvals **async-first**: `approval.request` retorna inmediatamente con `pending`; el operador resuelve con `approval.respond`; el cliente espera con `approval.poll` o `approval.wait` (con timeout acotado por servidor). Ninguna call MCP queda colgada indefinidamente.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [Q/0/0](0/00.md) | Approval repository and state machine | F/0/2 | `feature/Q-0-0-approval-state-machine` |
| [Q/0/1](0/01.md) | Async approval service (non-blocking core) | Q/0/0, D/0/0 | `feature/Q-0-1-async-approval-service` |
| [Q/0/2](0/02.md) | Approval MCP tools (request, respond, poll) | Q/0/1, G/0/1 | `feature/Q-0-2-approval-mcp-tools` |
| [Q/0/3](0/03.md) | Approval CLI (`agent-run approve`) | Q/0/1, A/0/3 | `feature/Q-0-3-agent-run-approve` |
| [Q/0/4](0/04.md) | `approval.wait` primitive with bounded timeout | Q/0/1, Q/0/2 | `feature/Q-0-4-approval-wait-primitive` |
| [Q/0/5](0/05.md) | Auto-approval acotada opt-in (mecanismo compartido) | Q/0/1, Q/0/2 | `feature/Q-0-5-bounded-autoapprove` |

## Criterio de salida del stage

- `approval.request` nunca bloquea (retorna `pending` en milisegundos).
- `approval.wait` jamas excede `AGENTS_APPROVAL_MAX_WAIT_MS`.
- `approval.respond` es idempotente sobre approvals ya decididos.
- `agent-run approve <id>` permite resolver desde CLI sin IDE.
- Estado granted/denied auditado.
- (Q/0/5) Existe un mecanismo de auto-approval **opt-in, acotado y auditado**,
  desactivado por defecto, sobre el que se apoyan los flujos autonomos.

## Que NO se hace en este stage

- Notificaciones push/SSE.
- Aprobacion automatica **por defecto o sin limites**. Tras Q/0/5 existe
  auto-approval **opt-in** habilitada por el operador y acotada por scopes; el
  humano sigue siendo la autoridad por defecto y **siempre** para operaciones
  peligrosas (`git.push.protected`, `dependency.change`,
  `code.write.protected_branch`) y repos `restricted`. Ver
  `docs/adr/ADR-006-bounded-autoapprove.md`.

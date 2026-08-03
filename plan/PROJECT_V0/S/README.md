# Stage S — Message store MVP

## Objetivo del stage

Implementar `message.send/list/reply` persistido en SQLite. Patron message-mediated (§17.2.3) queda preparado pero **no es obligatorio en MVP**.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [S/0/0](0/00.md) | Message repository | F/0/2 | `feature/S-0-0-message-repository` |
| [S/0/1](0/01.md) | Message MCP tools | S/0/0, G/0/1 | `feature/S-0-1-message-mcp-tools` |

## Criterio de salida del stage

- Mensajes confinados a su `traceId` (no cross-trace).
- `MESSAGE_SENT` auditado.

## Que NO se hace en este stage

- Pub/sub Redis Streams (V/0/1).
- Notificaciones push.

# Stage K — Agent tools (`agent.delegate/spawn/ask/view/kill`)

## Objetivo del stage

Conectar los adapters (Stage I, despues O y opcionalmente P) con MCP. Cualquier ejecucion real de un CLI hijo pasa por aqui, gateada por policy y registrada con audit.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [K/0/0](0/00.md) | Agent service | I/0/2, J/0/1, F/0/2 | `feature/K-0-0-agent-service` |
| [K/0/1](0/01.md) | Agent MCP tools | K/0/0, G/0/1 | `feature/K-0-1-agent-mcp-tools` |
| [K/0/2](0/02.md) | Timeouts and structured errors | K/0/1 | `feature/K-0-2-agent-timeouts-errors` |
| [K/0/3](0/03.md) | Agent MCP runtime wiring | K/0/2, I/0/2, O/0/2, P/0/0, R/0/1 | `feature/K-0-3-agent-mcp-runtime-wiring` |
| [K/0/4](0/04.md) | Two-agent MCP usability flow | K/0/3, N/0/2, Q/0/4, T/0/2 | `feature/K-0-4-two-agent-mcp-usability-flow` |

## Criterio de salida del stage

- `agent.delegate/spawn/ask/view/kill` listadas por MCP.
- Ningun adapter recibe llamada antes de que policy diga `allow`.
- Errores de adapter no rompen la conexion MCP; se devuelven como respuestas estructuradas y se auditan como `ERROR`.
- Un flujo MCP stdio real puede ejecutar orchestrator + coder + reviewer en dry-run sin llamar services internos.

## Que NO se hace en este stage

- Sanitizar outputs (M).
- Compartir artefactos cross-role (N).

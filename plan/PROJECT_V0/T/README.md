# Stage T — Generic MCP config y orchestrator system prompt

> **Out of scope:** Cursor, Antigravity IDE y cualquier IDE/cliente concreto. Esta stage solo entrega artefactos genericos.

## Objetivo del stage

Entregar un ejemplo MCP **client-agnostic** (`client-config/mcp.json.example`), un system prompt para el rol `orchestrator` independiente de cualquier IDE, y una guia de operador que no asume host concreto.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [T/0/0](0/00.md) | Generic MCP client config example | G/0/3 | `feature/T-0-0-generic-mcp-client-config` |
| [T/0/1](0/01.md) | Orchestrator system prompt | J/0/2, K/0/1, Q/0/2 | `feature/T-0-1-orchestrator-system-prompt` |
| [T/0/2](0/02.md) | Operator guide (client-agnostic) | T/0/0, T/0/1 | `feature/T-0-2-operator-guide` |

## Criterio de salida del stage

- `mcp.json.example` valido, sin claves IDE-specific.
- System prompt menciona limites del rol orchestrator (no `code.write`, no raw restricted, approvals async).
- Guia del operador lleva al primer dry-run sin nombrar Cursor/Antigravity salvo para marcarlos out-of-scope.

## Que NO se hace en este stage

- Configurar Cursor, Antigravity ni rules `.mdc`.
- Documentar integraciones especificas con IDEs.

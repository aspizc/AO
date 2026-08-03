# Stage G — MCP Gateway skeleton + `policy.check`

## Objetivo del stage

Levantar un servidor MCP stdio real, registrar tools dinamicamente, validar inputs con Zod, y exponer la primera tool funcional: `policy.check`.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [G/0/0](0/00.md) | MCP stdio bootstrap | A/0/2, B/0/4, D/0/2, F/0/1 | `feature/G-0-0-mcp-stdio-bootstrap` |
| [G/0/1](0/01.md) | Tool input validation (Zod) | G/0/0 | `feature/G-0-1-tool-input-validation` |
| [G/0/2](0/02.md) | `policy.check` MCP tool | G/0/1, C/0/5, D/0/0 | `feature/G-0-2-policy-check-tool` |
| [G/0/3](0/03.md) | Generic MCP client smoke config | G/0/2 | `feature/G-0-3-generic-mcp-smoke-config` |

## Criterio de salida del stage

- El Gateway arranca via stdio sin emitir basura no-JSON a stdout.
- Cualquier MCP host puede listar tools y ver `policy.check`.
- Cada call queda auditada con `POLICY_DECIDED`.

## Que NO se hace en este stage

- Crear configs especificos de Cursor / Antigravity / cualquier IDE.
- Implementar adapters reales (Stage I/O/P).
- Tools de orchestration / artifact / approval (J/K/L/Q).

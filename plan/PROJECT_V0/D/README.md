# Stage D — Audit log y configuracion runtime

## Objetivo del stage

Implementar audit log JSONL append-only y normalizar la configuracion de paths runtime (`AGENTS_*` env vars). Este stage habilita el primer side effect persistente del proyecto.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [D/0/0](0/00.md) | Audit JSONL writer | A/0/2 | `feature/D-0-0-audit-jsonl-writer` |
| [D/0/1](0/01.md) | Audit reader and filters | D/0/0 | `feature/D-0-1-audit-reader` |
| [D/0/2](0/02.md) | Runtime path configuration | A/0/2, D/0/0 | `feature/D-0-2-runtime-path-config` |
| [D/0/3](0/03.md) | `agent-run audit show` command | D/0/1, A/0/3 | `feature/D-0-3-audit-cli` |

## Criterio de salida del stage

- Append-only verificado por test.
- `agent-run audit show` filtra por traceId, type y limit.
- Paths runtime resuelven contra `AGENTS_WORKSPACE` y caen en defaults seguros locales.

## Que NO se hace en este stage

- Conectar audit a tools MCP (eso ocurre desde G/0/2 en adelante).
- Rotacion automatica diaria (puede quedar como TODO post-MVP).

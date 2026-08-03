# Stage F — SQLite, modelos de dominio e IDs

## Objetivo del stage

Persistencia local con SQLite segun §21 V4. Repository pattern para que ningun tool MCP ejecute SQL directo. Generadores de IDs estables.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [F/0/0](0/00.md) | Initial SQLite migration | A/0/2 | `feature/F-0-0-sqlite-initial-migration` |
| [F/0/1](0/01.md) | State initialization | F/0/0, D/0/2 | `feature/F-0-1-state-initialization` |
| [F/0/2](0/02.md) | Domain repositories | F/0/1 | `feature/F-0-2-domain-repositories` |
| [F/0/3](0/03.md) | ID generation | F/0/1 | `feature/F-0-3-domain-ids` |

## Criterio de salida del stage

- `001_initial.sql` es idempotente y crea todas las tablas V4 §21.
- Foreign keys habilitadas.
- Repositorios cubiertos por tests con DB temporal.

## Que NO se hace en este stage

- Conectar SQLite a tools MCP (eso es J/K/L/Q en adelante).
- Postgres (V/0/0).

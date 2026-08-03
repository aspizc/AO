# Stage C — Alto apalancamiento

Estado: backlog.

## Objetivo del stage

Cambios que abaratan todo el trabajo futuro: reproducibilidad del entorno
Python (pins + lockfile + dependencia `redis` declarada), reconciliacion de
la documentacion con el codigo real (tabla de env vars, alcance V1
experimental, docker-compose), y cobertura opt-in endurecida contra un
Postgres real. Es el Milestone 2 de [`../AUDIT.md`](../AUDIT.md).

Decision del owner aplicable: la ruta Postgres NO va a produccion en V3; la
migracion del executor `psql` a un driver `pg` con parametros bound queda
explicitamente fuera de alcance (ver `plan/PROJECT_V3/README.md`).

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [C/0/0](0/00.md) | Pins Python + lockfile + extra `redis` | A/0/2 (soft) | `feature/V3-C-0-0-python-pins-lockfile` |
| [C/0/1](0/01.md) | Reconciliacion docs↔codigo + structure-test de paridad | — | `feature/V3-C-0-1-docs-reconciliation` |
| [C/0/2](0/02.md) | Test de integracion Postgres real opt-in | C/0/0 | `feature/V3-C-0-2-postgres-integration-optin` |

## Criterio de salida del stage

- Ambos `pyproject.toml` tienen versiones acotadas, existe lockfile
  commiteado y `redis` esta declarado como extra.
- La tabla de env vars del README coincide con `gateway/src/config.js` y un
  structure-test lo verifica automaticamente.
- Existe una suite opt-in documentada que ejecuta los contratos de repositorio
  y casos adversariales contra Postgres real via docker-compose.

## Que NO se hace en este stage

- No se migra `postgres_db.js` a un driver `pg`: fuera de V3 por decision
  del owner.
- No se anade infraestructura nueva a docker-compose; se usa la existente.
- No se reescriben guias de operador completas; solo se corrigen las
  discrepancias detectadas en la auditoria.

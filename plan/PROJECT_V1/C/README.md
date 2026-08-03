# Stage C — Estado y eventos (F3)

## Objetivo del stage

Anadir backend Postgres para los repos del Gateway, publisher de eventos en Redis Streams y compose local con Postgres + Redis, manteniendo SQLite y JSONL como defaults/fallback.

Invariante central: Postgres y Redis son infra detras del Gateway. No cambian el contrato MCP ni se convierten en frontera de autorizacion.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [C/0/0](0/00.md) | Backend Postgres para repos | A | `feature/K-0-C-0-0-postgres-backend` |
| [C/0/1](0/01.md) | Tests de paridad repo (SQLite vs Postgres) | C/0/0 | `feature/K-0-C-0-1-repo-parity-tests` |
| [C/0/2](0/02.md) | Publisher Redis Streams | A | `feature/K-0-C-0-2-redis-publisher` |
| [C/0/3](0/03.md) | Consumer de metricas basico | C/0/2 | `feature/K-0-C-0-3-metrics-consumer` |
| [C/0/4](0/04.md) | docker-compose (Postgres + Redis) + ADRs | C/0/1 + C/0/3 | `feature/K-0-C-0-4-compose-adrs` |

## Criterio de salida

- Los mismos tests de contrato de repos pasan con `AGENTS_TEST_DB=postgres`.
- SQLite es default; `AGENTS_DB_URL=postgres://...` activa Postgres.
- Redis Streams es opcional (`AGENTS_REDIS_URL`); si Redis cae, JSONL audit sigue escribiendo.
- `docker/docker-compose.yml` arranca Postgres + Redis localmente.
- ADR-V1-03 y ADR-V1-04 quedan planificados en `docs/adr/`.

## Invariante de seguridad TV-02

El publisher nunca emite campos `restricted` ni raw artifacts. El consumer descarta y loguea como error cualquier campo `restricted` que aparezca en el stream.

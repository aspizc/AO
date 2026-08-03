# ADR-V1-03 - Postgres State Backend

Date: 2026-05-25
Status: accepted

## Contexto

PROJECT_V1 necesita permitir ejecuciones locales y de CI con estado persistente
mas robusto que SQLite cuando el operador lo decida. El Gateway ya mantiene la
frontera autorizada para policy, agentes, artifacts, approvals y audit, y esa
frontera no cambia por elegir otro backend de repositorio.

SQLite sigue siendo suficiente como default local y como fallback operacional.
Postgres se introduce para escenarios donde el operador necesita concurrencia,
persistencia y herramientas de inspeccion externas sin modificar el contrato MCP.

El stack local de desarrollo puede levantar Postgres desde
`docker/docker-compose.yml` y configurar:

- `AGENTS_DB_URL=postgres://agents:agents@localhost:5432/agents`

## Decision

Postgres es un backend opcional para el estado de repositorio del Gateway. Se
activa solo cuando `AGENTS_DB_URL` esta configurado con una URL Postgres valida.
Si `AGENTS_DB_URL` no existe, no es Postgres o no puede usarse, SQLite permanece
como default o fallback segun la ruta operacional existente.

El backend Postgres queda detras de las mismas APIs internas del Gateway. No
anade, elimina ni modifica MCP tools. Tampoco cambia la frontera de
autorizacion: policy, sanitizacion, artifacts, approvals y audit siguen pasando
por el Gateway.

## Consecuencias

- Los operadores pueden usar Postgres localmente mediante
  `docker/docker-compose.yml` sin cambiar clientes MCP.
- Los tests y runbooks deben cubrir default SQLite y activacion por
  `AGENTS_DB_URL`.
- Fallos de conexion o migracion no autorizan a saltarse policy ni a escribir
  estado fuera del repositorio controlado por el Gateway.
- Cualquier cambio que altere tools MCP o reglas de autorizacion requiere otra
  decision explicita.

## Estado

Accepted. Stage C considera Postgres integrado cuando estan verdes:

- SQLite default sin `AGENTS_DB_URL`;
- Postgres activado con
  `AGENTS_DB_URL=postgres://agents:agents@localhost:5432/agents`;
- paridad funcional de repositorio entre SQLite y Postgres;
- sin cambios en MCP tools ni en la frontera de autorizacion.

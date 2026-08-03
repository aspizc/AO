# ADR-V1-04 - Redis Streams Event Bus

Date: 2026-05-25
Status: accepted

## Contexto

PROJECT_V1 necesita observabilidad realtime de eventos del Gateway para
operadores y herramientas locales. El audit JSONL existente sigue siendo la
fuente de verdad porque es simple, append-only y suficiente como fallback cuando
no hay servicios auxiliares.

Redis Streams se introduce como bus opcional de observabilidad, no como sistema
de autorizacion ni como sustituto del audit persistente. El Gateway MCP sigue
siendo la frontera autorizada para policy, agentes, artifacts, approvals y
audit.

El stack local de desarrollo puede levantar Redis desde
`docker/docker-compose.yml` y configurar:

- `AGENTS_REDIS_URL=redis://localhost:6379/0`

## Decision

Redis Streams es un bus opcional para eventos realtime y observabilidad. Se
activa solo cuando `AGENTS_REDIS_URL` esta configurado con una URL Redis valida.
Si `AGENTS_REDIS_URL` no existe o Redis no esta disponible, JSONL permanece como
fuente de verdad y fallback.

Publicar en Redis no anade, elimina ni modifica MCP tools. Tampoco cambia la
frontera de autorizacion: policy, sanitizacion, artifacts, approvals y audit
siguen pasando por el Gateway antes de que cualquier evento sea observable.

Esta decision gobierna exclusivamente el mirror de audit `agents:events`.
Project V5 toma la decision posterior y explicita de anadir siete tools
`coordination.*` sobre el namespace independiente `agents:coord:v1`; vease
[`ADR-V5-01`](ADR-V5-01-redis-coordination-plane.md). Los eventos de
coordinacion no convierten `agents:events` en una cola y su audit local no se
publica en ese Stream legado.

Los eventos publicados deben estar sanitizados. Datos restricted o raw no deben
publicarse en Redis. Los consumidores deben rechazar y registrar cualquier campo
restricted que reciban, porque ese caso indica un fallo de productor o contrato.

## Consecuencias

- Los operadores pueden activar observabilidad realtime local mediante
  `docker/docker-compose.yml` y
  `AGENTS_REDIS_URL=redis://localhost:6379/0`.
- JSONL conserva autoridad para reconstruccion, auditoria y fallback.
- Redis no puede ser usado para saltarse approvals, policy o clasificacion.
- Productores y consumidores deben tratar campos restricted/raw como error de
  contrato: no publicar, rechazar y dejar evidencia en logs.
- Cualquier cambio que convierta Redis en fuente de verdad o altere MCP tools
  requiere otra decision explicita.

## Estado

Accepted. Stage C considera Redis Streams integrado cuando estan verdes:

- JSONL default sin `AGENTS_REDIS_URL`;
- Redis activado con `AGENTS_REDIS_URL=redis://localhost:6379/0`;
- eventos realtime derivados de audit sanitizado;
- rechazo y logging de campos restricted/raw por consumidores;
- sin cambios en MCP tools ni en la frontera de autorizacion.

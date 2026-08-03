# ADR-V1-01 - LangGraph as Gateway Client

Date: 2026-05-24
Status: accepted

## Contexto

PROJECT_V1 introduce `orchestrator-langgraph/` para ejecutar flujos
deterministas con LangGraph sin cambiar la frontera operacional que ya existe:
el Gateway MCP sigue siendo el unico punto autorizado para policy, agentes,
artifacts, approvals y audit.

Stage A probo el camino minimo con un cliente Python MCP stdio, un grafo
`delegate -> review` en dry-run, y un test de paridad audit normalizado frente
al camino LLM. El resultado esperado aguas abajo es indistinguible despues de
normalizar timestamps e identificadores generados.

## Decision

LangGraph es cliente del Gateway. No reemplaza al Gateway, no llama adapters
directamente y no escribe audit por su cuenta.

El contrato MCP del Gateway es inmutable para V1 Stage A:

1. LangGraph consume tools existentes por MCP stdio.
2. El grafo usa `agent.delegate` para el paso coder y `agent.delegate` con
   `role="reviewer"` para el paso review, porque no existe una tool
   `agent.review` en el contrato actual.
3. Policy, sanitizacion, artifacts, approvals y audit siguen siendo
   responsabilidad del Gateway.
4. Temporal, Postgres y Redis, cuando entren en stages posteriores, seran
   infraestructura o clientes detras del Gateway. Ninguno cambia el contrato MCP.

Esta congelacion se limita a Stage A. Project V5 anade siete tools
`coordination.*` mediante la decision explicita
[`ADR-V5-01`](ADR-V5-01-redis-coordination-plane.md); no cambia que LangGraph
sea un cliente ni le permite saltarse el Gateway para acciones gobernadas por
policy.

## Consecuencias

- Los nodos LangGraph deben depender de un cliente Gateway inyectable.
- Los tests dry-run pueden usar fixtures, pero no pueden introducir nuevos
  campos de audit ni nuevas tools en produccion.
- Cualquier cambio futuro que requiera anadir, renombrar o alterar una MCP tool
  del Gateway necesita una ADR nueva o una actualizacion explicita de esta.
- Stage B puede construir selector hibrido encima del cliente y el grafo, pero
  debe preservar la frontera Gateway-first.

## Estado

Accepted. Stage A esta cerrado cuando estan verdes:

- Scaffold e import de `orchestrator-langgraph/`.
- Cliente MCP stdio Python.
- Grafo minimo `delegate -> review` en dry-run.
- Test de paridad audit sin Gateway real.
- Test estructural que confirma que los commits Stage A no modifican `gateway/`.

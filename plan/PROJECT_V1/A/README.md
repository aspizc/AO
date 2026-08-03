# Stage A — Cimientos LangGraph (F1)

Estado: cerrado.

## Objetivo del stage

Tener `orchestrator-langgraph/` como cliente Python del Gateway, con un grafo minimo (`delegate->review`) funcionando en dry-run y produciendo los mismos eventos de audit que el camino LLM.

Invariante central: el contrato MCP del Gateway no cambia. LangGraph es un cliente del Gateway, no una extension privilegiada ni un reemplazo.

## Reconciliacion del contenido anterior

El contenido previo de `plan/PROJECT_V1/A/` correspondia al Stage V post-MVP de Project V0: spikes de Postgres, Redis Streams, LangGraph y MCP outline. Esos spikes quedan deprecados por este Stage A real de V1. V1 ya no planifica spikes exploratorios aqui; planifica el primer bloque implementable de produccion.

## Tareas

| ID | Titulo | Depende de | Estado |
|---|---|---|---|
| [A/0/0](0/00.md) | Scaffold `orchestrator-langgraph/` | V0 Y/0/2 | cerrado |
| [A/0/1](0/01.md) | Cliente MCP stdio (Python) | A/0/0 | cerrado |
| [A/0/2](0/02.md) | Grafo minimo `delegate->review` | A/0/1 | cerrado |
| [A/0/3](0/03.md) | Test de paridad de audit | A/0/2 | cerrado |
| [A/0/4](0/04.md) | ADR-V1-01 + tests estructurales | A/0/3 | cerrado |

## Criterio de salida del stage

- `orchestrator-langgraph/` existe, se importa sin errores y tiene tests verdes.
- El grafo minimo llama a las mismas MCP tools que el LLM-orchestrator; el audit log es indistinguible tras normalizar timestamps/IDs aleatorios.
- Ningun tool del Gateway fue modificado para acomodar LangGraph.
- ADR-V1-01 esta aceptado en `docs/adr/ADR-V1-01-langgraph-gateway-client.md`.

## Que NO se hace en este stage

- No se anade Postgres, Redis, Temporal ni OTel.
- No se implementa selector hibrido; eso entra en Stage B.
- No se cambia el contrato MCP del Gateway.

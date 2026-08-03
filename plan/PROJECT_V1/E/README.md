# Stage E — Observabilidad y empaquetado (F5)

## Objetivo del stage

Cerrar V1 con observabilidad end-to-end, stack local completo y gate operativo. Gateway, `orchestrator-langgraph` y adapters propagan `trace_id`; `docker-compose` levanta Postgres, Redis, Temporal y OTel; el runbook permite operar el flujo `implement-test-review-push`.

Invariante central: observar y empaquetar no cambia el contrato MCP del Gateway. La telemetria viaja como metadata/contexto y no introduce tools nuevas ni bypasses.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [E/0/0](0/00.md) | OTel en Gateway | A | `feature/K-0-E-0-0-otel-gateway` |
| [E/0/1](0/01.md) | OTel en orchestrator-langgraph | E/0/0 | `feature/K-0-E-0-1-otel-orchestrator` |
| [E/0/2](0/02.md) | docker-compose completo | D + C | `feature/K-0-E-0-2-full-compose` |
| [E/0/3](0/03.md) | Runbook V1 | E/0/2 | `feature/K-0-E-0-3-v1-runbook` |
| [E/0/4](0/04.md) | Gate V1 + checklist + ADR-V1-06 | E/0/1 + E/0/3 | `feature/K-0-E-0-4-v1-gate` |

## Criterio de salida

- `implement-test-review-push` corre como workflow durable LangGraph/Temporal con estado en Postgres.
- Redis publica eventos del flujo y el Gateway sigue siendo el unico borde MCP.
- Trazas OTel visibles de Gateway, orchestrator y adapters con `trace_id` correlacionado.
- `docker-compose` levanta el stack completo: Postgres, Redis, Temporal, OTel collector y servicios del proyecto.
- Runbook V1 cubre arranque, operacion, troubleshooting y parada.
- Gate V1 queda cumplido con checklist y ADR-V1-01 a ADR-V1-06 formalizados.

## Invariante TV-04

La observabilidad es transversal pero no funcionalmente autoritativa: no concede approvals, no reintenta actions por fuera de Temporal, no persiste estado canonico fuera de Postgres y no modifica nombres, schemas ni semantica de las tools MCP.

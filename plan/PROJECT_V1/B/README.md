# Stage B — Catalogo hibrido (F2)

## Objetivo del stage

Implementar los dos grafos de produccion (`implement-test-review-push`, `plan-refine`), el selector de orquestador (LLM vs LangGraph) y la integracion con approvals.

Invariante central: los grafos llaman tools MCP existentes; el Gateway aplica policy, sanitizacion, audit y approvals. El contrato MCP no cambia.

## Contrato MCP real para Stage B

Stage B no introduce tools nuevas. Las tareas deben usar esta traduccion cuando
el nombre conceptual del flujo no coincide con una tool real:

| Concepto del flujo | Tool MCP real |
|---|---|
| asignar trabajo | `task.assign` |
| implementar, testear o revisar con agente | `agent.delegate` con `role="coder"`, `role="tester"` o `role="reviewer"` |
| guardar planes, diffs, reportes o intenciones | `artifact.put` |
| leer o compartir artifacts | `artifact.get`, `artifact.list`, `artifact.share` |
| pedir puerta humana | `approval.request`, `approval.wait` |
| push real de git | fuera de scope hasta que exista una tool MCP de push |

No existen `agent.review`, `artifact.store` ni una tool MCP de `git push`.
Cuando el grafo necesite representar push en dry-run, debe registrar una
intencion/resultado por fixture; B/0/3 cubre la aprobacion humana previa, no la
ejecucion real de `git push`.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [B/0/0](0/00.md) | Grafo `implement-test-review-push` | A | `feature/K-0-B-0-0-itrp-graph` |
| [B/0/1](0/01.md) | Grafo `plan-refine` | A | `feature/K-0-B-0-1-plan-refine-graph` |
| [B/0/2](0/02.md) | Selector de orquestador | B/0/0 + B/0/1 | `feature/K-0-B-0-2-orchestrator-selector` |
| [B/0/3](0/03.md) | Approvals desde grafo | B/0/0 | `feature/K-0-B-0-3-graph-approvals` |
| [B/0/4](0/04.md) | E2E smoke hibrido + ADR-V1-02 | B/0/2 + B/0/3 | `feature/K-0-B-0-4-hybrid-e2e-adr` |

## Criterio de salida

- Los dos grafos corren E2E a traves del Gateway en modo integracion.
- El selector elige LangGraph o LLM segun configuracion por flujo.
- `approval.request`/`approval.wait` funcionan desde un nodo LangGraph igual que desde el LLM.
- ADR-V1-02 queda planificado en `docs/adr/`.

## Errores comunes del stage

- Implementar policy en nodos.
- Anadir `auto_approve` al estado del grafo.
- Hacer `push_node` idempotente aqui; eso pertenece a Stage D/Temporal.
- Prometer ejecucion real de `git push` sin una tool MCP existente.

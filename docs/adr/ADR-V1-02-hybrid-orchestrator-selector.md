# ADR-V1-02 - Hybrid Orchestrator Selector

Date: 2026-05-24
Status: accepted

## Contexto

PROJECT_V1 Stage B introduce dos caminos de orquestacion para los mismos flujos
operativos:

- LangGraph para flujos deterministas, repetibles y faciles de observar.
- LLM para flujos abiertos donde la tarea requiere interpretacion, planificacion
  flexible o interaccion humana frecuente.

El Gateway MCP ya es la frontera autorizada para policy, agentes, artifacts,
approvals y audit. El selector hibrido no debe cambiar esa frontera.

## Decision

El selector esta fuera del Gateway. Decide localmente si un flujo usa
`langgraph` o `llm`, y registra una decision estructurada con:

- `flow`
- `selected`
- `source`
- `env_var`

Ambos caminos usan las mismas MCP tools del Gateway. LangGraph no llama adapters
ni servicios internos directamente; usa `task.assign`, `agent.delegate`,
`artifact.put`, `approval.request` y `approval.wait` segun el flujo. El camino
LLM conserva el mismo contrato: cuando actua, lo hace como cliente del Gateway.

La seleccion por defecto es `llm`. El operador puede activar LangGraph por flujo
con variables como:

- `AGENTS_ORCHESTRATOR_IMPLEMENT_TEST_REVIEW_PUSH=langgraph`
- `AGENTS_ORCHESTRATOR_PLAN_REFINE=langgraph`

## Criterios De Uso

Usar LangGraph cuando:

- el flujo tiene pasos estables y verificables;
- las transiciones son mecanicas, como implement -> test -> review -> approval;
- se requiere observabilidad estructurada de cada estado;
- los retries tienen condiciones claras.

Usar LLM cuando:

- el objetivo todavia es ambiguo;
- la interaccion con el humano cambia el plan;
- el flujo requiere sintetizar informacion abierta;
- todavia no hay un grafo probado para ese caso.

## Consecuencias

- El Gateway no incorpora conocimiento del selector hibrido.
- El selector no implementa policy ni auto-approval.
- Los grafos deben seguir atravesando `approval.request` y `approval.wait`
  cuando una accion lo requiere.
- Stage B no introduce una tool MCP de `git push`; el smoke solo puede registrar
  una intencion de push tras aprobacion concedida.
- Los artifacts de seleccion facilitan auditar por que se uso LangGraph o LLM.

## Estado

Accepted. Stage B queda cerrado cuando estan verdes:

- selector `llm|langgraph`;
- smoke hibrido con decision `langgraph`;
- smoke default con decision `llm`;
- approvals desde grafo;
- este ADR.

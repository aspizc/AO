# Auditoría de producto y funcionalidad

## Executive Summary

**Product readiness: D; F para el job “delegar trabajo real a agentes no
confiables con enforcement verificable”.** El producto ofrece un Gateway MCP,
CLI, policies, audit, artifacts, approvals, sesiones, workflows experimentales
y coordinación Redis que funcionan en dry-run y tienen tests sustanciales. Sin
embargo, el core promise de “colaboración segura” no se cumple todavía frente
al actor que el propio threat model declara no confiable: identidad, rol,
contexto y aprobación siguen siendo parcialmente autoclarados. Los tres riesgos
principales son falsa autoridad, cierre que no implica trabajo terminal y una
operación humana dependiente de IDs/conocimiento tribal. Las tres oportunidades
principales son convertir el Gateway en authority real, dar al operador una
vista recuperable de trabajo/decisiones y hacer del candidato de release una
entidad verificable. V5 añade una coordinación bien diseñada, pero amplía el
producto antes de cerrar el core loop. V4 es el programa correcto y no debe
competir con un V6. La capacidad YOLO puede ser diferenciadora si se presenta
como consentimiento/grant explícito y no como un flag que desactiva controles.

## Product Map

### Propósito, usuarios y trabajos

**Propuesta de valor inferida.** “Permitir que un operador coordine agentes de
coding locales mediante MCP, con policy, trazabilidad, aprobación y handoffs
seguros, y que varios orquestadores se coordinen opcionalmente por Redis.”

**Usuario primario.** Desarrollador u operador experto que controla el host MCP,
los repositorios y los CLIs de agentes. No hay una experiencia destinada a un
usuario final no técnico ni un modelo multiusuario/cloud soportado
(`README.md:174-199`).

**Jobs-to-be-done principales:**

1. iniciar una orquestación y asignar trabajo a un coder;
2. ejecutar o supervisar un agente con límites de repo/policy;
3. transferir evidencia a un reviewer sin filtrar material restricted;
4. resolver approvals con contexto suficiente;
5. reconstruir, cancelar o reanudar el estado después de una interrupción;
6. coordinar participantes independientes con entrega at-least-once;
7. ejecutar deliberadamente un agente `workspace-yolo` o
   `host-unconfined` sólo con autoridad humana explícita;
8. demostrar qué versión fue revisada, integrada, promovida y publicada.

El “aha moment” debería ser un trace completo coder→reviewer→approval→cierre
que otro operador pueda comprender y recuperar sin leer SQLite, JSONL, prompts
o tmux directamente.

### Inventario BUILT vs SPECCED

| Superficie/capacidad | Estado verificable | Evidencia |
|---|---|---|
| Gateway MCP stdio y registry de tools | **BUILT** | `gateway/src/mcp_server.js`, `gateway/src/tools/index.js` |
| Policy, state SQLite, audit JSONL, artifacts, approvals | **BUILT**, con gaps de authority/lifecycle | `gateway/src/core/`, `gateway/src/services/` |
| Adapters Codex/Claude/Gemini y tmux | **BUILT**; dry-run fuerte, aislamiento real insuficiente | `gateway/src/adapters/` |
| CLI `agent-run` | **BUILT**, limitada a policy/audit/approve | `cli/src/agents_cli/main.py:27-247` |
| Primer dry-run / MVP2 smoke | **BUILT** | `scripts/smoke_mvp2.mjs`, `tests/e2e/mcp_two_agent_workflow.test.js` |
| Coordinación V5 | **BUILT**; live Redis no es gate universal | `gateway/src/services/coordination_service.js`, `docs/coordination-bus.md` |
| LangGraph/Temporal V1 | **BUILT EXPERIMENTAL**, no supported | `orchestrator-langgraph/`, `README.md:182-197` |
| Inventario/recovery de operador | **SPECCED V4** | `plan/PROJECT_V4/C/0/03.md` |
| Doble review trustworthy | **SPECCED V4** | `plan/PROJECT_V4/D/TASKS.md` |
| Grants YOLO y launch no confinado | **SPECCED V4** | `plan/PROJECT_V4/B/TASKS.md`, `plan/PROJECT_V4/C/0/04.md` |
| Candidate manifest y promoción verificable | **SPECCED V4** | `plan/PROJECT_V4/M0/TASKS.md` |

La etiqueta **SPECCED** no se contabiliza como funcionalidad entregada.

### Journeys principales

| Journey | Camino publicado | Estado |
|---|---|---|
| Activación | clone → venv/npm → policy validate → CI → configurar MCP → prompt | Parcial; requiere conocimiento de cwd, entorno y variante de prompt |
| Core loop | create → assign → spawn/ask → artifact → review → approval → complete | Existe en smoke/tests; la guía manual está incompleta y el cierre no valida tasks |
| Approval | descubrir ID → entender contexto → grant/deny → reanudar | Bloqueado por falta de queue/detail y por autoridad no autenticada |
| Recovery | recordar trace/task/session IDs → view/tmux | No hay inventario integrado; depende de conversación o inspección externa |
| Coordinación V5 | register → heartbeat → discover → send → receive/reclaim → ack | Coherente, pero el cliente debe implementar lifecycle y no está en el prompt primario |
| YOLO | solicitar modo → verificar scope/riesgo → grant/consume → revoke/expire | Sólo planificado |
| Release | review OK → integration → main → tag → publicación | Estados históricamente divergentes; alineación local post-audit no crea tag/publicación |

### Madurez

MVP técnico/internal pilot. El dry-run es real y V5 no es un mero mock, pero el
modo de agentes reales no debe presentarse como frontera segura hasta cerrar
authority, confinement, egress y lifecycle. El producto no está en GA aunque el
README declare `Current release: v0.1.0` (`README.md:7`) sin existir ese tag en
el repositorio auditado.

## Product Audit

### Findings priorizados

| ID | Sev. | Dimensión | Hallazgo y consecuencia | Evidencia |
|---|---|---|---|---|
| PROD-C01 | Critical | Promise/correctness | El caller elige agent/role/repo/trace y `approval.respond` no demuestra presencia de operador. El producto promete enforcement pero recibe autoridad como input. | `gateway/src/tools/orchestration.js:5-28`, `gateway/src/tools/artifact.js:17-30`, `gateway/src/tools/approval.js:20-29` |
| PROD-C02 | Critical | Protected actions | Policy decide si se lanza un proceso, no limita de forma verificable los efectos que ejecuta dentro del CLI. | `gateway/src/services/agent_service.js`, `gateway/src/adapters/gemini_adapter.js:108-121`, `docs/adr/ADR-003-policy-before-spawn.md` |
| PROD-H01 | High | Functional completeness | Una orchestration puede quedar `completed` con tasks `pending`; no existe lifecycle público completo de task. “Completed” no significa outcome terminado. | `gateway/src/tools/task.js:4-25`, `gateway/src/services/task_service.js:81-104`, `gateway/src/services/orchestration_service.js:58-72` |
| PROD-H02 | High | Approval journey | No hay `approvals list/show`; `approve` recibe un ID opaco y decisión sin preview completo de acción/repo/branch/digest. | `cli/src/agents_cli/main.py:203-247`, `docs/operator-guide.md:170-187` |
| PROD-H03 | High | Recovery | No existe inventario coherente de orchestrations/tasks/sessions/approvals; varias operaciones exigen IDs retenidos fuera del producto. | `gateway/src/tools/session.js`, `gateway/src/tools/orchestration.js`, `plan/PROJECT_V4/C/0/03.md` |
| PROD-H04 | High | Onboarding | La guía promete un dry-run completo, pero el ejemplo omite entregar el prompt al coder, cerrar sesiones y completar; el smoke sí contiene esas acciones. | `docs/operator-guide.md:91-168`, `scripts/smoke_mvp2.mjs` |
| PROD-H05 | High | Content/contract | Prompts históricos nombran aliases como tools (`policy.check`, `artifact.get.sanitized`, `artifact.put.review_notes`) que no forman parte del registry MCP. | `prompts/orchestrator_system_prompt.md`, `prompts/orchestrator_mvp2_two_agent.md`, `gateway/src/tools/index.js` |
| PROD-H06 | High | Release trust | README, CLI, planes, reviews, refs y tag usaron versiones/estados distintos. Al corte, V5 auditó develop mientras main estaba 78 commits detrás. | `README.md:7`, `cli/src/agents_cli/main.py:27-32`, `plan/README.md`, refs del corte |
| PROD-H07 | High | Review trust | Reviewer recibe proyección o output cuya procedencia no demuestra que corresponda exactamente al change-set actual; KO puede avanzar en V1 legacy. | `gateway/src/services/artifact_share_service.js`, `orchestrator-langgraph/src/orchestrator_langgraph/graphs/implement_test_review_push.py:192-238` |
| PROD-M01 | Medium | Activation | El primer valor exige componer manualmente muchas tools y copiar trace/task/session/artifact IDs. No hay comando de “run/recover core loop”. | `docs/operator-guide.md:91-168`, help real de `agent-run` |
| PROD-M02 | Medium | API usability | Algunos fallos de dominio viajan como body normal con `isError:false`; hosts/LLMs deben recordar semánticas por tool. | `gateway/src/tools/tool_helpers.js:51-88`, `docs/gateway-error-contract.md` |
| PROD-M03 | Medium | Focus | V5 añade lifecycle Redis sofisticado mientras approval, task lifecycle y recovery del core siguen abiertos. | `docs/coordination-bus.md`, `plan/PROJECT_V4/AUDIT.md` |
| PROD-M04 | Medium | Measurement | No hay métricas de activación, time-to-first-result, task completion, KO/rework, recovery o approval latency como señales de producto. | `gateway/src/core/telemetry.js`, `orchestrator-langgraph/src/orchestrator_langgraph/consumers/metrics.py` |
| PROD-M05 | Medium | YOLO | La capacidad pedida está bien especificada en V4, pero aún no existe en el producto. Usar hoy `--yolo`/env equivale a ampliar ejecución sin grant consumible. | `gateway/src/adapters/gemini_adapter.js:108-121`, `plan/PROJECT_V4/B/TASKS.md`, `plan/PROJECT_V4/C/0/04.md` |
| PROD-L01 | Low | Messaging | README habla de V3/v0.1.0, CLI se denomina V4 y el árbol contiene V5; esa taxonomía exige conocimiento histórico. | `README.md:7`, `cli/src/agents_cli/main.py:27-32`, `gateway/package.json` |

### Say–do gaps

1. **“Gateway enforcement boundary” vs authority autoclarada.**
2. **“Successful local dry-run” vs tutorial que no completa el flujo.**
3. **“Current release v0.1.0” vs tag ausente.**
4. **“Completed” vs work pendiente.**
5. **“Human approval” vs `decidedBy`/context sin principal autenticado.**
6. **“Safe restricted review” vs provenance y egress no vinculados al digest.**

### Strengths a preservar

- El core loop dry-run atraviesa la superficie MCP real; no es sólo
  documentación.
- Policy devuelve decisión, razón y `ruleId`, una base buena para explicación.
- El estado disabled de coordinación falla localizado y preserva tools legacy.
- La coordinación V5 explicita leases, backpressure, dedupe, reclaim y ACK con
  más rigor que muchos MVP.
- CLI separa JSON y salida humana y usa exit codes útiles.
- La distinción V1 experimental vs MVP soportado está ya mejor reflejada en el
  README post-V3.
- El requisito YOLO ya distingue `workspace-yolo` de `host-unconfined` y
  reconoce la pérdida de boundary del segundo.

## Product Strategy

| Tema | Estado objetivo | Principio | Señal de éxito |
|---|---|---|---|
| Trustworthy delegation | Principal, scope, task, repo y capabilities son server-owned; protected effects consumen grants | La autoridad nunca es un argumento libre | Mutar caller/role/context no cambia authority efectiva |
| Honest state | Trace sólo completa cuando tasks/sessions/approvals/verdict convergen | “Completed” significa completo | Cero cierre con trabajo abierto salvo override humano auditado |
| Operador informado y recuperable | Queue/detail/status/recover permiten actuar sin recordar IDs | Reconocimiento sobre recuerdo | Operador nuevo recupera un flujo en <2 min |
| Contract that compiles | Prompts, docs, schemas y registry se validan juntos | La documentación es parte del producto | Cero tool/action/example inexistente en gate |
| Controlled autonomy | YOLO es un grant scoped, visible, revocable y consumido | Autonomía explícita, no bypass | 100% launches amplios con receipt válido o aceptación |
| Release identity | Candidate, review, main, tag y publicación son estados ligados | Una versión es un objeto verificable | Todos resuelven al mismo tree SHA |

### Trade-offs explícitos

- No construir UI web/TUI antes de resolver queue/status/recovery en CLI.
- No crear V6 ni más perfiles verticales; aumentar superficie agravaría drift.
- No productizar Redis Cluster, cloud ni multiusuario en este ciclo.
- No promocionar Temporal/LangGraph como golden path hasta usar authority y
  envelopes reales.
- No convertir `host-unconfined` en default ni en propiedad de un role.

## Roadmap

Escala: S <2 h, M medio día, L 1–2 días, XL requiere desglose. Los IDs apuntan
al plan V4, que contiene la especificación ejecutable.

### Milestone 0 — Validar y medir

| Item | Outcome de usuario | Criterio observable | Esfuerzo | Riesgo | Dependencias |
|---|---|---|---:|---|---|
| P0.1 Candidate manifest | El operador sabe qué producto se prueba | SHA/tree/locks/suites/skips/review digest únicos | M | Bajo | G-1, M0/0/00 |
| P0.2 Contract replayable | El hero flow tiene estados/outputs normativos | Corpus común cubre happy, deny, KO, recovery y disabled | L | Medio | M0/4/00, E/0/01 |
| P0.3 Métricas de outcome | Se mide éxito, no sólo eventos | activation, time-to-value, task completion, KO y recovery disponibles sin payload sensible | M | Bajo | B/3/01 |

### Milestone 1 — Corregir la promesa central

| Item | Outcome de usuario | Criterio observable | Esfuerzo | Riesgo | Dependencias |
|---|---|---|---:|---|---|
| P1.1 Authority server-side | Un child no puede elegir su autoridad | tests de spoof/replay/IDOR fallan cerrado | XL | Alto | B/0/00, B/1/00–03, B/5/00 |
| P1.2 Execution boundary | Confined realmente confina y cancela | canaries prueban repo/control/secret isolation y kill convergente | XL | Alto | B/0/01–03, B/1/04–09 |
| P1.3 Trusted review | Acceptance corresponde a bytes revisados | KO/digest stale bloquean y Reviewer B ve source RO exacto | XL | Medio | D/0–D/1 |

### Milestone 2 — Operación y autonomía de alto leverage

| Item | Outcome de usuario | Criterio observable | Esfuerzo | Riesgo | Dependencias |
|---|---|---|---:|---|---|
| P2.1 Approval queue/consent | El operador entiende antes de decidir | list/show/preview/firma/TOCTOU sobre un objeto exacto | L | Medio | B/2, C/0/00–02 |
| P2.2 Inventory/recovery | El turno puede transferirse sin perder control | status/list/show/reattach/cancel/reconcile sin IDs externos | L | Medio | B/1/09, C/0/03 |
| P2.3 YOLO grants | Autonomía amplia, pero deliberada | grant scoped/expiring/maxUses/revocable consumido atómicamente | XL | Alto | B/2/03, C/0/04 |
| P2.4 Honest task lifecycle | Cierre y métricas son fiables | todas las tasks terminales o excepción explícita antes de complete | L | Medio | B/1/03 |

### Milestone 3 — Coherencia y polish

| Item | Outcome de usuario | Criterio observable | Esfuerzo | Riesgo | Dependencias |
|---|---|---|---:|---|---|
| P3.1 Unificar lenguaje/versiones | Se entiende qué está soportado | una vista de estado sin contradicciones V/MVP/release | S | Bajo | M0/4/02 |
| P3.2 Quickstart cerrado | Primer éxito en <10 min | checkout→close copiable, sin tool desconocida | M | Bajo | A/0/02, C/0 |
| P3.3 Coordination progressive disclosure | V5 se descubre sólo cuando aporta valor | prompt/runbook diferencian core y coordinación avanzada | S | Bajo | A/0/00 |

### Quick wins

- Enlazar desde README el índice de auditorías y las hojas V4.
- Retirar la claim `v0.1.0` hasta que exista tag/candidate verificable.
- Marcar explícitamente en CLI/help qué versión es producto y cuál es plan.
- Añadir una tabla “BUILT / EXPERIMENTAL / PLANNED” generada desde el manifest.
- Validar nombres de tools de prompts contra `tools/list`.

### Design sketches — top 3

#### 1. Operator overview

`agent-run status` abre con traces activos y badges textuales de tasks,
sessions, approvals y blockers. `show <trace>` presenta el árbol completo;
`recover` ofrece sólo acciones válidas y requiere challenge/firma para mutar.
Se valida con un handoff: un segundo operador debe recuperar un trace sin
consultar conversación, JSONL ni tmux.

#### 2. Approval / YOLO consent

Una queue muestra action, repo, target, agent, mode, digest, expiry y riesgo.
`show` explica la diferencia entre confined, workspace-yolo y
host-unconfined. Grant/deny firma exactamente el preview; cualquier cambio
produce TOCTOU error y nuevo challenge. Se valida intentando replay, scope
expansion y segundo consumo.

#### 3. Honest completion

`orchestration.complete` devuelve un preflight de blockers y falla si hay task
no terminal, sesión activa, approval pendiente o verdict stale. Un override
humano es una acción distinta y auditada, no el mismo botón/verb. Se valida
plantando cada blocker y comprobando que ninguno produce `completed`.

## Decisiones del owner

| Tema | Decisión |
|---|---|
| Primer piloto | Local y single-user; multiusuario/cloud permanecen fuera de V4. |
| `pilot ready` | Requiere simultáneamente review trustworthy y ejecución YOLO gobernada. |
| `host-unconfined` | Puede autorizarse one-shot o por sesión. El grant de sesión sigue siendo scoped, expirable, revocable, limitado por usos/budget y explícito sobre la ausencia de boundary frente al UID. |
| LangGraph ITRP | Se mantiene fenced hasta que Temporal V2 alcance paridad, las lanes H4 sean verdes y E/3/00 pueda retirarlo sin perder replay; Temporal queda como implementación canónica. |
| Versionado | SemVer `major.minor.patch`. Las versiones `<1.0.0` son desarrollo/prueba interna, pero cada minor debe ser funcional y usable. El primer MVP mostrable/publicable será `1.0.0`. |

## Open Question restante

El objetivo numérico de activación y recovery no se fija sin baseline. M0 debe
medir ambos tiempos; antes de G4 el owner establece los límites soportados a
partir de esa evidencia.

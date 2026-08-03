# Auditoría independiente de producto — agents-orchestrator V5

Model: gpt-5.6-sol  
Reasoning: ultra  
Execution profile: fast/priority  
Snapshot: `develop` en `/tmp/agents-orchestrator-v5-audit.dx0UlX/worktree`, commit exacto `d521afb12a6520b95f1a9fb172911b16ab77a1ff`  
Independencia: análisis realizado desde cero; no se consultaron informes previos, contenidos de `audit/**`, `plan/**/AUDIT*.md`, `plan/**/reviews/**` ni otros informes de auditoría o revisión.  
Fecha: 2026-07-25  

## Executive Summary

1. **Calificación de preparación de producto: D**: existe una demostración técnica coherente del happy path local, pero el producto todavía no entrega de forma confiable su promesa central de colaboración segura, aprobada y trazable.
2. En su madurez declarada de `v0.1.0`/MVP2 con V5 aún en `Unreleased`, es un MVP técnico o prepiloto, no una herramienta lista para confiarle cambios reales sensibles sin supervisión adicional.
3. **Riesgo 1:** la identidad y la autoridad se autodeclaran en argumentos MCP, por lo que el mismo cliente puede suplantar otro rol, leer raw restringido y responder su propia aprobación.
4. **Riesgo 2:** policy y approvals no están ligadas a la acción que el hijo ejecuta, y una acción desconocida como `deploy.production` obtiene `ALLOW`.
5. **Riesgo 3:** los artefactos, el review y el cierre no están vinculados criptográfica ni semánticamente al cambio real, mientras una orquestación puede quedar `completed` con todas sus tareas todavía `pending`.
6. **Oportunidad 1:** convertir el Gateway en una autoridad real con principal inmutable por conexión y receipts de aprobación ligados a una acción concreta.
7. **Oportunidad 2:** hacer de la evidencia verificable —diff/commit, procedencia, verdict y digest revisado— el centro del loop coder-reviewer.
8. **Oportunidad 3:** ofrecer un único contrato ejecutable, un primer arranque guiado y una superficie de estado/recuperación que lleve al operador desde clone hasta valor y permita retomar un flujo sin `grep` ni conocimiento tribal.
9. Los dry-runs herméticos de MVP2 y planificación finalizaron en `OK`, y el estado sin Redis falló correctamente con `COORDINATION_UNAVAILABLE`, pero no se verificaron CLIs reales ni el runtime Redis por las restricciones de esta auditoría.

## Product Map

### Propósito, usuario y trabajos principales

**Propósito declarado.** `agents-orchestrator` es un Gateway MCP local que permite a un LLM humano-facing coordinar agentes de código especializados mientras el Gateway aplica policy, persiste estado, sanitiza artefactos, registra auditoría y gestiona aprobaciones (`README.md:3-13`, `plan_proyecto_v4.md:15-31`).

**Usuario primario.** Un operador técnico individual, en una máquina local de confianza, que ya usa un host MCP y tiene instalados/autenticados Codex, Claude Code o Gemini CLI; no es un producto multiusuario ni cloud (`plan_proyecto_v4.md:129-152`, `docs/adr/ADR-004-mvp-scope.md:32-41`).

**Usuarios secundarios.**

- El mantenedor de registries de agentes, roles y repositorios.
- El auditor/operador que investiga decisiones, sesiones, artefactos y aprobaciones.
- En V5, el autor de un orquestador o cliente Node independiente que necesita presencia efímera y mensajería dirigida (`docs/adr/ADR-V5-01-redis-coordination-plane.md:61-90`).

**Jobs-to-be-done prioritarios.**

1. “Quiero pedir un cambio una sola vez a mi agente habitual y que este coordine coder y reviewer sin obligarme a operar varias terminales.”
2. “Quiero impedir técnicamente que un agente o rol actúe sobre un repositorio o artefacto que no le corresponde.”
3. “Quiero pasar resultados entre agentes sin filtrar material `restricted`.”
4. “Quiero aprobar solo efectos externos irreversibles y saber exactamente qué estoy aprobando.”
5. “Quiero ver, explicar y recuperar el estado completo de una ejecución multiagente.”
6. “Quiero que orquestadores independientes se descubran e intercambien mensajes locales sin convertir Redis en autoridad de negocio.”

**Propuesta de valor en una frase.** Permitir que un operador coordine varios agentes de código desde su cliente habitual, localmente, con policy, sanitización, aprobación y trazabilidad centralizadas.

**Momento “aha” pretendido.** El operador formula un objetivo en lenguaje natural y, sin salir de su host, ve que un coder trabaja, un reviewer recibe solamente evidencia sanitizada, una única aprobación humana desbloquea la acción irreversible y el trace termina con un resultado verificable (`plan_proyecto_v4.md:1158-1189`).

**Momento “aha” realmente verificable.** Una vez instaladas las dependencias, el smoke dry-run crea coder y reviewer, genera tres artefactos, aplica sanitización y termina en `OK` en 5,6 segundos; ese resultado prueba transporte y composición de APIs, pero no que el código real, el review, la aprobación y el cierre estén causalmente ligados.

### Madurez aparente

Hay dos niveles distintos:

- **Madurez de ingeniería: MVP técnico avanzado.** La release es `0.1.0`; existen Gateway MCP, CLI, registries, SQLite, adapters, artefactos, approvals, smokes, E2E dry-run y una extensión V5 extensa (`README.md:7`, `CHANGELOG.md:6-24`).
- **Madurez de producto: prepiloto.** No hay evidencia de activación con usuarios, medición del outcome, recuperación operativa completa ni una prueba real obligatoria del hero flow; el real E2E es opt-in y normalmente queda skipped (`docs/mvp2-orchestrator-runbook.md:33-64`, `tests/e2e/mcp_two_agent_real.test.js:20-24`).

La calificación D no exige polish de GA: penaliza que las garantías que justifican el producto —autoridad, aprobación, procedencia y estado— no estén cerradas ni siquiera al nivel de un MVP de confianza.

### Inventario de superficies: BUILT vs SPECCED

| Superficie | Estado | Qué está realmente disponible | Evidencia / observación |
|---|---|---|---|
| Gateway MCP sobre stdio | **BUILT, ejercitado en dry-run** | 32 tools: 25 core y 7 `coordination.*` | Registro real en `gateway/src/tools/index.js:16-37`; `tools/list` hermético devolvió 32 nombres. |
| Orchestration | **BUILT, incompleto como producto** | `create`, `view`, `pause`, `resume`, `cancel`, `complete` | `gateway/src/tools/orchestration.js:7-54`; carece de listado, blockers de cierre y transiciones de negocio. |
| Tasks | **BUILT parcial** | Solo `task.assign` | `gateway/src/tools/task.js:4-25`; no existen `task.start/succeed/fail/cancel/list`. |
| Agent execution | **BUILT; dry-run ejercitado; real no verificado aquí** | `delegate`, `spawn`, `ask`, `view`, `kill`; Gemini/Claude/Codex | `gateway/src/tools/agent.js:44-78`; los CLIs reales requieren login, tmux y ejecución opt-in. |
| Artifacts y sanitización | **BUILT, ejercitado** | `put`, `get`, `list`, `share`; sanitización determinista | `gateway/src/tools/artifact.js:58-127`; el smoke creó raw, sanitized y review notes. |
| Approvals | **BUILT como registro de estado; incompleto como autoridad** | `request`, `respond`, `poll`, `wait`; autoapproval acotada | `gateway/src/tools/approval.js:4-48`; no hay binding entre approval y ejecución. |
| Mensajería legacy | **BUILT, secundaria** | `message.send/list/reply`, trace-scoped con token | `gateway/src/tools/message.js:50-102`; no forma parte del hero smoke. |
| Session/operator intervention | **BUILT parcial** | `attach_info`, `intervention_note`; no list/recover | `gateway/src/tools/session.js:5-42`. |
| V5 coordination MCP | **BUILT; estado disabled ejercitado; Redis no verificado aquí** | `register`, `heartbeat`, `discover`, `unregister`, `send`, `receive`, `ack` | `gateway/src/tools/coordination.js:66-111`; sin URL devuelve explícitamente `COORDINATION_UNAVAILABLE`. |
| V5 direct Node service | **BUILT; runtime Redis no verificado aquí** | `createCoordination` comparte dominio con MCP | `gateway/README.md:72-122`. |
| CLI `agent-run` | **BUILT, ejercitado** | `policy validate`, `policy check`, `audit show`, `approve`; salida humana y JSON | `cli/src/agents_cli/main.py:27-247`; validate devolvió 3 agentes, 7 repos y 8 roles. |
| Prompts, perfiles y runbooks | **BUILT como contenido, parcialmente desalineado** | Prompt general, MVP2, planning, perfiles MCP, guías | Existen, pero contienen tools inexistentes y decisiones contradictorias; véanse P-05 y P-08. |
| Smokes | **BUILT, ejercitados** | MCP discovery, MVP2 y planning | `scripts/smoke_mvp2.mjs`, `scripts/smoke_planning.mjs`; ambos `OK`, con cobertura insuficiente del contrato prometido. |
| KYA workflow | **BUILT como vertical específica** | Runner y prompts especializados para un repo/ruta concretos | `docs/kya-implementation-runbook.md:1-17`, `scripts/kya_run_task_mcp.sh:9-39`. |
| `orchestrator-langgraph` | **BUILT experimental / no productizado** | Grafos, cliente, Temporal scaffolds y métricas experimentales | El propio README lo marca experimental (`README.md:182-193`); su README de producto solo documenta telemetría (`orchestrator-langgraph/README.md:1-12`). |
| Postgres, Redis audit stream, Temporal, OTel | **BUILT experimental / no default** | Spikes, componentes y flags opt-in | `README.md:182-193`; no deben contarse como valor GA. |
| `policy.check` MCP | **SPECCED/documentado, no BUILT** | Está en prompts y roles, pero no en las 32 tools | `prompts/orchestrator_system_prompt.md:11-20`; ausencia en `gateway/src/tools/index.js:28-37`. |
| Jira/Confluence/Git/test-runner MCP, dashboard, RBAC, cloud/multiuser | **SPECCED/ROADMAPPED o fuera de scope** | No existe superficie operativa | `plan_proyecto_v4.md:1120-1128`; `docs/adr/ADR-004-mvp-scope.md:32-41`. |
| Web, móvil, email/notificaciones, pricing | **No existe / no aplica al posicionamiento actual** | El frontend deliberado es el host ya usado por el operador | `plan_proyecto_v4.md:115-125`. |

### Journeys principales

| Journey | Pasos observables | Time-to-value | Dónde se atasca el usuario |
|---|---|---|---|
| Onboarding desde clone | Preparar Python y Node, instalar dos ecosistemas, validar policy, ejecutar CI, ejecutar dos smokes, editar paths/env, adaptar config al host e inyectar prompt | No medido end-to-end sin red; hay al menos 8 acciones de setup antes de conectar el host (`README.md:15-49`, `docs/mvp2-orchestrator-runbook.md:17-100`) | `uv` no figura en prerequisitos del quickstart; paths relativos dependen del cwd; el proyecto deja la adaptación al host al operador; no hay `doctor` ni starter guiado. |
| Hero flow coder → reviewer | `create` → `assign` → `spawn` → `ask/view` → `artifact.put/share/get` → reviewer `assign/spawn/ask/view` → review artifact → gates → kill → complete | Dry-run medido: 5,6 s una vez preparado; el flujo lógico requiere aproximadamente 18 tool calls | Tools documentadas inexistentes; artifact manual; no señal robusta de “agent done”; approval no ligada a acción; complete acepta trabajo pendiente. |
| Planning loop | Planner → artifact → coder apply → reviewer → artifact → complete | Dry-run medido: 3,7 s | El smoke usa `delegate` headless y no ejecuta el gate humano que el prompt exige. |
| Approval humana | `approval.request`, transportar `approvalId` al humano, CLI/MCP `respond`, `poll/wait` | Sin métrica | No existe cola/listado; audit humano no muestra `approvalId`; el mismo cliente puede responder; poll no devuelve action/context. |
| Observación/recuperación | Conservar `traceId` y `sessionId`, `orchestration.view`, `agent.view`, `session.attach_info`, CLI audit/tmux | Sin métrica | No se pueden listar traces o sesiones, `orchestration.view` omite sesiones y la tarea no cambia de estado. |
| V5 coordination | register → heartbeat periódico → discover → send → receive/reclaim → ack → unregister | No medido; Redis no usado en esta auditoría | El cliente debe implementar leasing, backpressure, dedupe e idempotencia; las siete tools aparecen aun deshabilitadas. |

### Convenciones de producto

- Tools con namespace y verbo (`artifact.share`, `coordination.receive`), `traceId` como correlación, JSON como contrato y errores estables.
- Inputs públicos mayoritariamente camelCase; repositorios SQLite devuelven snake_case en algunas lecturas.
- Local-first, un operador, default humano para approvals, dry-run determinista y stdout reservado a MCP.
- Documentación y código recientes en inglés, plan V4 histórico en español, con terminología mixta (`raw`, `restricted`, `traceId`, `orchestration`).
- No hay navegación propia: la IA del host es el frontend normal; CLI, tmux y filesystem son superficies auxiliares.

### Sorpresas de discovery

1. La extensión V5 tiene tokens de lease y fences de identidad más fuertes que el hero flow legacy al que supuestamente protege.
2. `policy.check`, la acción recomendada “cuando haya duda”, no existe como tool MCP.
3. El smoke oficial termina una orquestación cuyas dos tareas siguen `pending`.
4. El test real valida un fichero creado, pero construye después un `raw_diff` hardcoded que no procede de ese fichero.
5. La política base permite Codex en `restricted`, mientras el prompt MVP2 lo prohíbe.

## Product Audit

### Método y límites de evidencia

Se inspeccionaron solamente superficies del snapshot y se realizaron comprobaciones herméticas sobre una copia temporal con dependencias instaladas/compiladas offline. No se inició, detuvo ni contactó ningún MCP, Redis, Postgres o Temporal compartido; no se usó red; no se modificó código, configuración ni documentación del snapshot.

| Evidencia ejecutada | Resultado |
|---|---|
| `git rev-parse HEAD` | `d521afb12a6520b95f1a9fb172911b16ab77a1ff`; worktree limpio al inicio. |
| MCP `tools/list` | 32 tools; no `policy.check`, `artifact.get.sanitized` ni `artifact.put.review_notes`. |
| `node scripts/smoke_mvp2.mjs`, `AGENTS_DRY_RUN=1` | `OK` en 5,6 s; 2 sesiones, 3 artefactos. |
| `node scripts/smoke_planning.mjs`, `AGENTS_DRY_RUN=1` | `OK` en 3,7 s; 3 sesiones, 2 artefactos. |
| `coordination.register` sin URL Redis | Error MCP estructurado `COORDINATION_UNAVAILABLE`; el core siguió disponible. |
| `agent-run policy validate` | `OK`; 3 agentes, 7 repositorios, 8 roles. |
| `agent-run policy check ... --action deploy.production` | `ALLOW ruleId=ok`, exit 0. |
| `artifact.get` sobre el mismo raw | Como `claude-code/orchestrator`: `POLICY_DENIED`; cambiando solo argumentos a `codex/restricted-coder`: contenido raw completo, incluido el token sintético. |
| `orchestration.view` tras smoke `OK` | Orchestration `completed`; las dos tasks `pending`, `closed_at: null`. |
| `agent-run audit show --trace-id ...` | Timeline visible, pero sin acción, decisión, reason, actor, approvalId ni outcome en modo humano. |

No se ejecutó el E2E real con Codex/Claude ni la coordinación sobre Redis. Esas capacidades se clasifican como BUILT por código/contrato, pero su funcionamiento real permanece **no verificado en esta auditoría**.

### Resumen de findings

| ID | Severidad | Dimensión | Resumen |
|---|---|---|---|
| P-01 | **Critical** | Promise / correctness | Identidad, rol y autoridad humana son autodeclarados. |
| P-02 | **Critical** | Promise / correctness | Policy/approval no controlan la acción real y lo desconocido falla abierto. |
| P-03 | **Critical** | Trust / JTBD | El review no está ligado al cambio real ni a procedencia verificable. |
| P-04 | **High** | Journey / completeness | `completed` no significa trabajo terminado. |
| P-05 | **High** | Onboarding / content | El golden path manda llamar tools inexistentes. |
| P-06 | **High** | Measurement / correctness | Los smokes oficiales declaran OK sin probar sus gates prometidos. |
| P-07 | **High** | Recovery / usability | No hay inventario ni recuperación de traces/sesiones. |
| P-08 | **High** | Positioning / coherence | La fuente de verdad de agentes, scope y versión se contradice. |
| P-09 | **High** | Approval UX | La aprobación carece de cola y contexto recuperable. |
| P-10 | **Medium** | Activation | El primer valor requiere demasiada composición manual. |
| P-11 | **Medium** | Observability | La auditoría humana muestra actividad, no explicación ni outcome. |
| P-12 | **Medium** | API usability | Shapes y schemas públicos son inconsistentes o poco expresivos. |
| P-13 | **Medium** | Measurement | No se mide éxito de producto ni existe feedback loop. |
| P-14 | **Medium** | Focus / scope | V5 amplía el plano conceptual antes de cerrar el core. |
| P-15 | **Medium** | Focus / correctness | KYA introduce una vertical hardcoded y cierre débil en el producto base. |

### Value proposition, functional correctness y confianza

#### P-01 — La identidad y la autoridad se autodeclaran — **Critical — FACT**

**Qué se encontró.** Las tools legacy reciben del propio caller campos que deciden la autorización: `callerAgent/callerRole`, `requesterAgent/requesterRole`, `requestedBy` y `decidedBy`. `artifact.get` construye su contexto de policy directamente con los argumentos recibidos (`gateway/src/tools/artifact.js:17-21`, `gateway/src/tools/artifact.js:40-47`, `gateway/src/tools/artifact.js:77-112`). `approval.respond` acepta `decidedBy` como string y pasa directamente al servicio (`gateway/src/tools/approval.js:20-29`, `gateway/src/services/approval_service.js:74-100`).

**Prueba en superficie.** Sobre el mismo artifact raw restringido, la llamada declarada como `claude-code/orchestrator` devolvió `sanitization.orchestrator_raw`; repitiendo desde el mismo proceso MCP y cambiando únicamente los argumentos a `codex/restricted-coder`, devolvió el contenido completo y el secreto sintético. El E2E core normaliza además que el mismo cliente MCP solicite y responda la aprobación (`tests/e2e/mcp_two_agent_workflow.test.js:110-124`).

**Por qué importa.** El producto declara que el prompt no es la frontera y que un orquestador confundido o inyectado queda limitado por policy (`prompts/orchestrator_system_prompt.md:8-9`, `plan_proyecto_v4.md:184-203`). En realidad, ese orquestador puede elegir la identidad con la que policy lo evalúa y puede presentarse como humano aprobador; por tanto, la promesa de protección frente al propio LLM no se cumple.

**Juicio.** Esto no es un detalle de hardening multiusuario: rompe el principal beneficio de un producto que se vende como enforcement boundary incluso bajo un único operador local.

#### P-02 — La policy aprueba el dispatch, no la acción ejecutada — **Critical — FACT**

**Qué se encontró.** `agent.ask` solo recibe `sessionId`, `prompt` y `traceId` (`gateway/src/tools/agent.js:28-32`). El servicio reenvía el prompt al adapter sin repo, acción concreta ni receipt de approval (`gateway/src/services/agent_service.js:184-201`); el adapter evalúa únicamente la acción genérica `agent.ask` y después escribe el prompt en tmux (`gateway/src/adapters/codex_adapter.js:336-350`). No existe un paso que consuma una aprobación al ejecutar `git.push`, `dependency.change` o `code.write.protected_branch`.

El motor enumera acciones canónicas, pero no rechaza una que no esté en la lista (`gateway/src/core/policy_types.js:8-34`, `gateway/src/core/policy_types.js:42-67`). La comprobación real de `deploy.production` devolvió `ALLOW ruleId=ok`.

**Por qué importa.** Un child puede recibir mediante `agent.ask` “haz push a main” tanto antes como después de una approval; para el Gateway ambas llamadas son indistinguibles. Las approvals son registros de intención, no gates de ejecución. La afirmación “policy-governed actions” (`README.md:9-13`) y la regla de interrumpir solo ante efectos irreversibles (`README.md:84-94`) no tienen una cadena causal verificable.

**Juicio.** Hasta que cada acción sensible requiera y consuma autorización vinculada, `AGENTS_AUTOAPPROVE` tampoco debe presentarse como modo autónomo seguro.

#### P-03 — El reviewer puede revisar una representación inventada — **Critical — FACT**

**Qué se encontró.** `artifact.put` permite al caller afirmar libremente `producedBy` y aportar cualquier `content`; la tool lo persiste sin verificar sesión, tarea, repo, commit o worktree (`gateway/src/tools/artifact.js:8-15`, `gateway/src/tools/artifact.js:60-71`). En el E2E real, el test espera a que Codex cree `HELLO.md`, valida el fichero y luego publica un diff hardcoded con un secreto sintético, no un diff derivado del repositorio (`tests/e2e/mcp_two_agent_real.test.js:108-128`). El resultado del reviewer se reduce a un pane snapshot o fallback de texto y se guarda como `review_notes` sin verdict estructurado (`tests/e2e/mcp_two_agent_real.test.js:166-183`).

**Por qué importa.** El reviewer puede dar OK a bytes distintos de los que finalmente existen, y una modificación posterior no invalida ese OK. Un operador recibe una señal de confianza que no prueba el job “el cambio real fue revisado”.

**Juicio.** La sanitización determinista está bien resuelta sobre el contenido que recibe, pero no puede compensar que la procedencia de ese contenido sea una afirmación no verificada.

### Jobs-to-be-done, journeys y completitud

#### P-04 — `completed` no significa que el trabajo esté terminado — **High — FACT**

**Qué se encontró.** Después del smoke MVP2 oficial, `orchestration.view` devolvió la session como `completed`, pero coder y reviewer seguían `pending` con `closed_at: null`. Solo existe `task.assign` (`gateway/src/tools/task.js:4-25`); no hay transición pública de task. `orchestration.complete` cambia el status sin comprobar tasks, sesiones, approvals o review (`gateway/src/services/orchestration_service.js:58-89`). La vista incluye tasks y artifacts, pero ni siquiera sesiones (`gateway/src/services/orchestration_service.js:47-55`).

**Por qué importa.** El status deja de ser una señal operativa o medible: dashboards futuros, métricas, recuperación y decisiones humanas contarían éxito donde el propio modelo de dominio dice pendiente.

**Juicio.** En un producto de coordinación, un cierre falso es más grave que no tener estado: induce una decisión incorrecta.

#### P-05 — El contrato que aprende el orquestador contiene tools inexistentes — **High — FACT**

**Qué se encontró.**

- El prompt general y el MVP2 recomiendan `policy.check` (`prompts/orchestrator_system_prompt.md:11-20`, `prompts/orchestrator_mvp2_two_agent.md:7-10`), pero `tools/list` no la expone y el registry no construye tools de policy (`gateway/src/tools/index.js:28-37`).
- El prompt y el runbook usan `artifact.get.sanitized` y `artifact.put.review_notes` (`prompts/orchestrator_mvp2_two_agent.md:33-40`, `docs/mvp2-orchestrator-runbook.md:114-136`), mientras la API real usa `artifact.get` y `artifact.put { kind: "review_notes" }`.
- Los structure tests comprueban que esas palabras existan en el prompt, no que sean ejecutables (`tests/structure/test_mvp2_orchestrator_prompt.py:59`).

**Por qué importa.** El frontend del producto es un LLM que decide herramientas a partir de nombres y descripciones; enseñarle nombres falsos genera tool errors precisamente en policy preflight y review handoff.

**Juicio.** Esta es una rotura del producto shipped, no deuda de documentación secundaria.

#### P-06 — Los smokes oficiales prueban composición, no la promesa que anuncian — **High — FACT**

**Qué se encontró.** El smoke MVP2 realiza coder/reviewer/sanitización y completa, pero no llama a ninguna approval (`scripts/smoke_mvp2.mjs:146-278`), aunque el runbook presenta `code.apply` como gate obligatorio y propone ejecutar ese mismo smoke con autoapproval (`docs/mvp2-orchestrator-runbook.md:128-161`). El planning smoke usa tres `agent.delegate` headless y completa sin `approval.request/wait` (`scripts/smoke_planning.mjs:128-233`), mientras su prompt requiere un loop interactivo y gate antes de apply (`prompts/orchestrator_planning_loop.md:10-33`).

**Por qué importa.** Ambos reportaron `result: OK` en esta auditoría. El operador y el release gate pueden interpretar ese OK como evidencia de aprobación, interacción y cierre, aunque esos comportamientos no se ejecutaron.

**Juicio.** Un smoke es una superficie de confianza; debe nombrar con precisión qué prueba y fallar si la promesa de su flow se rompe.

#### P-07 — Recuperar un flujo requiere IDs conservados fuera del producto — **High — FACT**

**Qué se encontró.** No hay `orchestration.list`, `task.list`, `session.list` ni `approval.list`. `agent.ask/view/kill` requieren `sessionId`; `session.attach_info` también (`gateway/src/tools/agent.js:28-42`, `gateway/src/tools/session.js:5-29`). `orchestration.view` necesita un `traceId` ya conocido y omite las sesiones. Los runbooks remiten a `tmux ls`, filesystem y audit (`docs/mvp2-orchestrator-runbook.md:163-204`).

**Por qué importa.** Si el host pierde contexto, se reinicia o el operador cambia de terminal, el producto no puede responder “qué está activo y cuál es el siguiente paso seguro”. Se pierde el supuesto beneficio de un plano de control único.

**Juicio.** Para un MVP local no hace falta alta disponibilidad, pero sí recuperación básica desde el estado que ya se persiste.

### Usabilidad, contenido, onboarding y aprobación

#### P-08 — No hay una fuente de verdad única para scope, agentes y versión — **High — FACT**

**Qué se encontró.** El prompt MVP2 dice dos veces que Codex está prohibido en repos `restricted` (`prompts/orchestrator_mvp2_two_agent.md:21-23`, `prompts/orchestrator_mvp2_two_agent.md:71-76`), pero el registry base permite `restricted`, el rol `restricted-coder` y ejecución real (`policies/agent-capabilities.json:49-96`); `cvision` y `cvlib` permiten Codex (`policies/repositories.json:4-12`), y README afirma lo mismo (`README.md:117-119`). El README anuncia v0.1.0 con V5, mientras CLI y package todavía se presentan como “V4” (`cli/src/agents_cli/main.py:27-32`, `gateway/package.json:1-8`). El plan V4 enlazado desde README describe schemas y approvals bloqueantes que ya no son el contrato (`README.md:249-251`, `plan_proyecto_v4.md:1158-1187`).

**Por qué importa.** La selección de agente en un repo sensible no puede depender de qué documento leyó el LLM. Versiones y contratos contradictorios erosionan credibilidad y hacen que soporte/operación no sepan qué comportamiento defender.

**Juicio.** La decisión sobre Codex restricted debe resolverse primero como decisión de producto/policy y después propagarse a todas las superficies.

#### P-09 — La aprobación puede quedar huérfana y carece de contexto para decidir — **High — FACT**

**Qué se encontró.** `approval.poll` devuelve status y quién/cuándo decidió, pero no action, context, trace ni resumen (`gateway/src/services/approval_service.js:103-112`). No existe listado de pendientes. El modo humano de `agent-run audit show` muestra `ts`, `type`, `traceId` y `eventId`, no `approvalId` (`cli/src/agents_cli/output.py:45-65`). El CLI `approve` exige un ID ya conocido (`cli/src/agents_cli/main.py:203-247`).

**Por qué importa.** Tras perder el mensaje del host, el operador no puede descubrir qué espera aprobación ni evaluar repo, branch, diff o riesgo desde la superficie oficial. A la vez, P-01 permite que el propio LLM responda; la UX facilita el camino inseguro y dificulta el humano.

**Juicio.** Una aprobación sin contexto recuperable es un botón administrativo, no una decisión informada.

#### P-10 — El onboarding reduce infraestructura, pero no composición manual — **Medium — FACT + JUDGMENT**

**Qué se encontró.** Hay una guía detallada y buenos dry-runs, pero el operador debe ensamblar Python, Node, native SQLite, tmux, dos CLIs, env vars, cwd allowlist, config MCP y prompt. El quickstart usa `uv` sin incluirlo en prerequisitos (`README.md:15-34`); el ejemplo genérico usa rutas relativas y no incluye `AGENTS_REPO_ROOTS` (`client-config/mcp.json.example:1-14`), y adaptar el formato a cualquier host es responsabilidad del usuario (`client-config/README.md:46-57`).

**Por qué importa.** El target es técnico, así que esta fricción es aceptable hasta cierto punto; aun así, cada path/env se convierte en un fallo anterior al aha y no hay un `doctor` que distinga dependencia, login, policy, cwd o config.

**Juicio.** La ventaja “sin frontend nuevo” solo se materializa si conectar el frontend existente es casi mecánico.

#### P-11 — La auditoría humana muestra actividad, no explicación — **Medium — FACT**

**Qué se encontró.** El output observado lista una timeline densa, con tipos y IDs truncados, pero no muestra actor, action, decision, reason, model, task status, approval ni outcome. El JSON contiene más información, pero la superficie humana exige posprocesarla.

**Por qué importa.** El operador no puede responder rápidamente “qué se denegó, por qué, quién actuó y qué falta” desde el comando creado para ese job.

**Juicio.** La trazabilidad técnica es una fortaleza de backend aún no convertida en valor de operador.

#### P-12 — El API público cambia de shape y explica poco al LLM — **Medium — FACT**

**Qué se encontró.** `orchestration.create` y `task.assign` responden camelCase, pero `orchestration.view` expone filas SQLite con snake_case y paths internos; así apareció en la respuesta real. El conversor Zod → JSON Schema conserva tipos básicos, pero pierde restricciones para records/unions y no aporta descripción por campo (`gateway/src/tools/tool_helpers.js:10-40`). Varias schemas aceptan strings libres donde el dominio tiene enums.

**Por qué importa.** El consumidor primario es un LLM: shapes consistentes, enums y descripciones son parte de la UX y reducen reintentos, suposiciones y errores de routing.

**Juicio.** No hace falta un SDK completo, pero sí un contrato público deliberado que no filtre accidentalmente el modelo de persistencia.

### Diferenciación, medición, coherencia y foco

#### P-13 — Se instrumenta actividad, no éxito de usuario — **Medium — FACT**

**Qué se encontró.** El audit permite reconstruir eventos y la telemetría experimental cuenta tool calls. El consumidor experimental calcula counts y latencia media (`orchestrator-langgraph/src/orchestrator_langgraph/consumers/metrics.py:35-49`, `orchestrator-langgraph/src/orchestrator_langgraph/consumers/metrics.py:78-100`), pero no activation, time-to-first-value, task outcome, review verdict, approval conversion, recuperación ni cambio aceptado. No se encontró canal de feedback.

**Por qué importa.** El equipo puede saber que se llamaron tools, pero no si el operador consiguió un cambio correcto, seguro y recuperable. P-04 hace además que contar `ORCHESTRATION_COMPLETED` sobreestime éxito.

**Juicio.** Antes de añadir analytics sofisticada, el producto necesita outcomes canónicos y estado honesto.

#### P-14 — V5 es técnicamente diferenciada, pero aumenta el ancho antes de cerrar el fondo — **Medium — JUDGMENT**

**Qué se encontró.** V5 añade una API bien delimitada de siete operaciones, 900 líneas de runbook y obligaciones de lease, heartbeat, reclaim, ACK e idempotencia. Está separada correctamente de `message.*` y falla de forma segura al estar disabled (`README.md:121-146`, `docs/coordination-bus.md:204-446`). Sin embargo, esas tools son visibles para todo host aunque no haya Redis, mientras el hero flow carece de identidad fiable, provenance y lifecycle.

**Por qué importa.** Para el usuario primario, `message.*`, `coordination.*`, tasks y artifacts son cuatro conceptos vecinos que debe distinguir. El beneficio V5 corresponde a un cliente/orquestador avanzado distinto del operador del MVP.

**Juicio.** Conviene tratar coordination como perfil/SDK opt-in hasta validar que su persona y frecuencia justifican ser parte del surface por defecto.

#### P-15 — La vertical KYA diluye la generalidad y hereda cierres débiles — **Medium — FACT + JUDGMENT**

**Qué se encontró.** El producto base contiene paths personales por defecto (`/home/carase/git/experiments/kya`), un wrapper que entra en real mode por defecto y una excepción de policy para que reviewer escriba (`scripts/kya_run_task_mcp.sh:9-39`, `docs/kya-implementation-runbook.md:78-94`). El runner publica stdout/stderr como artefacto y llama `orchestration.complete` al final sin un verdict estructurado Gateway-side (`scripts/kya_mcp_task_runner.mjs:145-199`).

**Por qué importa.** Un caso de uso real es valioso, pero incorporarlo como rama especial hace más difícil saber qué contrato general soporta el producto y qué comportamiento depende de una máquina/proyecto.

**Juicio.** KYA debe convertirse en ejemplo o paquete de perfil sobre primitivas robustas, no marcar la evolución del core antes de cerrar P-01–P-04.

### Strengths — qué preservar

1. **Local-first real y sin frontend impuesto.** La arquitectura aprovecha el host MCP existente y mantiene el Gateway como proceso stdio (`README.md:60-82`), reduciendo infraestructura y cambio de hábito.
2. **Happy path dry-run rápido y reproducible.** Tras preparar dependencias, el smoke MVP2 completó en 5,6 s sin red ni CLIs reales; es una base excelente para iteración.
3. **Sanitización determinista y fail-closed dentro del contexto declarado.** Artifact sharing produjo una copia `internal` sin el secreto sintético, y el rol orchestrator declarado recibió deny.
4. **Errores estructurados y degradación aislada.** V5 devolvió `COORDINATION_UNAVAILABLE` como error estable y no impidió listar/usar tools core (`gateway/src/mcp_server.js:21-41`, `gateway/README.md:120-122`).
5. **Registries explícitos y explicabilidad.** Agentes, roles, repos y defaults de modelo están versionados; CLI policy ofrece `ruleId` y reason en formato humano/JSON.
6. **Buen instinto de scope original.** “Orchestrator como rol, no componente”, approvals async, dry-run y tmux opcional son decisiones de producto coherentes para un único operador local.
7. **V5 tiene semántica de mensajería madura.** Scope fence, lease digest, at-least-once, dedupe, ACK tombstone y límites están descritos con precisión; debe preservarse aunque se empaquete como superficie avanzada.

## Product Strategy

### Temas estratégicos

| Tema | Estado objetivo | Principio de producto | Señales de éxito |
|---|---|---|---|
| 1. Autoridad real, no declarada | La conexión determina principal/rol; el humano dispone de un canal de autoridad distinto; ninguna tool autoriza por strings de caller | **La autoridad viene del canal, nunca del payload** | 0 bypasses al cambiar `requesterRole`; 100% de decisiones atribuidas a principal verificado; el mismo host LLM no puede autoaprobar. |
| 2. La evidencia es el producto | Cada review está ligado a una representación derivada del cambio real y cada acción sensible consume un receipt exacto | **No hay confianza sin procedencia y binding** | 100% de verdicts incluyen digest revisado; cualquier mutación posterior invalida el OK; 100% de acciones protegidas consumen approval válida. |
| 3. Estado que dice la verdad | Tasks, sessions, approvals y reviews tienen lifecycle observable; `complete` es un resultado derivado, no un setter | **Todo estado terminal debe probar su outcome** | 0 traces completed con trabajo pending; error/KO bloquea cierre; recuperación tras reinicio sin inspección manual. |
| 4. Un contrato ejecutable y un golden path | Tools, schemas, prompts, runbooks y smokes se validan contra la misma fuente; onboarding y recovery muestran el siguiente paso seguro | **Un nombre, un significado, un ejemplo reproducible** | 0 tools inexistentes en contenido shipped; primer dry-run sin ayuda; ejemplos replayables en CI. |
| 5. Medir profundidad antes de añadir amplitud | El equipo conoce activation, time-to-value, success, KO, approval y recovery antes de expandir V5, LangGraph o verticales | **Primero demostrar el job principal** | Funnel base disponible; ≥95% de hero flows herméticos completan con invariantes; feedback de operadores identifica menos intervención manual. |

### Trade-offs explícitos: qué no construir todavía

- **No ampliar autoapproval** hasta que una aprobación esté ligada y consumida por una acción real; ampliar scopes ahora automatizaría una convención.
- **No añadir más agentes, modelos o perfiles verticales** hasta consolidar principal, provenance, lifecycle y contrato; la matriz actual ya es suficiente para validar el job.
- **No productizar dashboard, cloud, multiusuario, RBAC completo ni Redis Cluster.** Se necesita binding local estrecho, no una plataforma IAM ni una UI nueva.
- **No profundizar Temporal/LangGraph como golden path.** Automatizar un estado y un review no confiables multiplica el riesgo y oculta la causa.
- **No añadir más verbos de coordination o message.** Primero decidir si V5 pertenece al core operator o a un SDK/perfil avanzado.
- **No construir integraciones Jira/Confluence/Git internas** antes de que el handoff coder-reviewer y la recuperación sean demostrablemente correctos.

### Definición medible de “done”

El producto estará listo para un piloto interno cuando:

1. Un operador objetivo, partiendo de dependencias instaladas, alcance el primer dry-run válido en **menos de 10 minutos**, con como máximo una edición de config y cero tool names desconocidos.
2. Un trace solo pueda completar si todas las tasks son terminales, no hay sesiones activas ni approvals pendientes y existe un verdict válido sobre el digest actual.
3. El 100% de acciones protegidas exija un receipt ligado a principal, trace, task, repo, acción, target, evidencia y caducidad.
4. Cambiar `callerAgent`, `requesterRole` o `decidedBy` en un payload no cambie la autoridad efectiva.
5. Un reviewer KO o un cambio posterior al review impida acceptance/completion.
6. Un operador distinto pueda recuperar un flujo interrumpido desde CLI/MCP en **menos de 2 minutos**, sin buscar IDs en JSONL o tmux.
7. El equipo pueda calcular por versión: activation, median time-to-first-child-result, core-flow success, KO/rework, approval wait, recovery y human intervention.
8. En una prueba cualitativa, el operador pueda responder sin ayuda “qué cambió, quién lo hizo, qué bytes se revisaron, quién aprobó y qué falta”.

## Roadmap

Escala: **S** = menos de 2 horas de diseño/scoping o cambio trivial; **M** = medio día; **L** = 1–2 días; **XL** = necesita desglose.

### Milestone 0 — Validate & instrument

#### M0-1 — Contrato replayable del hero flow

**Outcome.** El equipo y el operador comparten una definición observable de éxito para happy path, restricted deny, protected action, reviewer KO, interruption/recovery y coordination disabled; deja de usarse “la tool respondió OK” como sustituto de “el job terminó bien”.

- **Superficies:** tools MCP core, prompts, smokes, CLI y fixtures.
- **Criterios de aceptación:** cada escenario tiene precondición, pasos, outcome de usuario y blockers; los casos de spoof, unknown action y completed/pending fallan; el contrato se puede ejecutar herméticamente.
- **Esfuerzo:** L.
- **Riesgo del cambio:** Bajo; el principal riesgo es fijar demasiado pronto semántica equivocada.
- **Dependencias:** decisión humana sobre qué significa `completed` y cuál es el trust boundary del host.

#### M0-2 — Funnel y señales de confianza

**Outcome.** Product/operación puede ver si un operador activó, obtuvo resultado, revisó, aprobó y completó, sin registrar prompts ni contenido sensible.

- **Superficies:** audit events, metrics consumer, CLI/JSON export.
- **Criterios de aceptación:** por trace se calculan activation, time-to-first-child-result, artifact-ready, review verdict, approval wait, rework, completion/failure y recovery; diez dry-runs producen un baseline; completed/pending no cuenta como éxito.
- **Esfuerzo:** L.
- **Riesgo del cambio:** Medio; cardinalidad, datos sensibles y métricas mal definidas pueden crear incentivos erróneos.
- **Dependencias:** M0-1; taxonomía de outcomes.

#### M0-3 — Tres walkthroughs de onboarding y recovery

**Outcome.** Tres operadores del segmento objetivo completan clone/config/dry-run y recuperan un trace interrumpido sin ayuda del mantenedor, dejando evidencia de los drop-offs reales.

- **Superficies:** README, profiles, CLI, host MCP, smoke, troubleshooting.
- **Criterios de aceptación:** se mide tiempo por etapa, número de ediciones y errores; cada bloqueo se asigna a contenido, tooling o contrato; se valida el objetivo de <10 minutos tras dependencias.
- **Esfuerzo:** M.
- **Riesgo del cambio:** Bajo; muestra pequeña o demasiado experta.
- **Dependencias:** M0-1 y un entorno limpio reproducible.

### Milestone 1 — Fix the core promise

#### M1-1 — Principal inmutable y autoridad humana separada

**Outcome.** El operador puede confiar en que un caller no se convierte en reviewer, restricted-coder u operador cambiando strings, y que solo una acción humana autenticada decide approvals.

- **Superficies:** bootstrap/config del Gateway, todas las tools que reciben identidad, artifact access, task assignment, approvals, audit y compatibilidad de clientes.
- **Criterios de aceptación:** la identidad efectiva viene del canal/config y no del payload; spoofing de agent/role no modifica policy; el host orquestador no puede responder approvals sin autoridad de operador; cada decisión muestra principal verificado.
- **Esfuerzo:** XL.
- **Riesgo del cambio:** Alto; rompe contratos actuales y puede añadir fricción local.
- **Dependencias:** M0-1; decisión de trust boundary; estrategia de compatibilidad/migración.

#### M1-2 — Receipts de ejecución ligados a la acción

**Outcome.** Una acción rutinaria continúa fluida, pero un push protegido, dependency change o protected write es imposible hasta que el Gateway disponga de autorización exacta y consumible.

- **Superficies:** policy, approval, agent dispatch/ask, adapters, audit, prompts.
- **Criterios de aceptación:** unknown action deniega; una acción sensible sin receipt falla antes del efecto; receipt liga principal, trace, task, session, repo, acción, target, evidencia, expiración y uso; replay o mismatch falla; dry-run demuestra allow y deny.
- **Esfuerzo:** XL.
- **Riesgo del cambio:** Alto; overblocking, falsa clasificación de intención y approval fatigue.
- **Dependencias:** M1-1; catálogo cerrado de acciones y definición de cómo el adapter materializa cada efecto.

#### M1-3 — Artefacto derivado y verdict ligado al digest

**Outcome.** El reviewer y el humano saben que revisaron exactamente el cambio que se pretende aceptar, no un texto aportado por el orquestador.

- **Superficies:** adapter result, artifact store/share, sanitizer, reviewer contract, approval context y completion.
- **Criterios de aceptación:** el Gateway crea o verifica la procedencia del change artifact; `producedBy` no es autodeclarable; raw y sanitized quedan unidos por digest/provenance; verdict `OK/KO` referencia digest; cualquier cambio posterior marca review stale y bloquea acceptance.
- **Esfuerzo:** XL.
- **Riesgo del cambio:** Alto; worktrees sucios, binarios, archivos untracked y sanitización restringida.
- **Dependencias:** M1-1; decisión sobre identidad canónica del cambio (tree/diff/commit).

#### M1-4 — Lifecycle y completion honestos

**Outcome.** “Active”, “pending”, “failed”, “cancelled” y “completed” significan lo mismo para humano, LLM, audit y métricas.

- **Superficies:** task/session/orchestration repositories y tools, approvals, status, KYA runner y smokes.
- **Criterios de aceptación:** tasks recorren estados terminales explícitos; session outcome actualiza task; complete enumera blockers y no muta si hay pending/active/approval/review stale; cancel limpia o declara residuos; todo completed cumple invariantes.
- **Esfuerzo:** XL.
- **Riesgo del cambio:** Alto; migración de traces existentes y cleanup parcial.
- **Dependencias:** M0-1 y M1-3.

#### M1-5 — Contrato de tools y policy sin drift

**Outcome.** Un LLM siguiendo cualquier prompt/runbook shipped llama exclusivamente herramientas reales con shapes válidos y aplica una única regla sobre Codex restricted.

- **Superficies:** prompts, runbooks, MCP registry/schema, roles, README, ADR vigente y structure tests.
- **Criterios de aceptación:** todo nombre de tool en contenido existe en `tools/list`; todos los ejemplos se replayean; `policy.check` se implementa como MCP o se retira del flow; artifact calls usan el shape real; la decisión Codex/restricted es única.
- **Esfuerzo:** L.
- **Riesgo del cambio:** Medio; cambiar prompts puede alterar comportamiento del orquestador.
- **Dependencias:** decisión de producto sobre Codex restricted y policy preflight.

#### M1-6 — Smokes que prueban la promesa

**Outcome.** Un `OK` oficial significa que identidad, evidencia, review, approval y cierre funcionaron, no solo que las tools respondieron.

- **Superficies:** `smoke_mvp2`, `smoke_planning`, real E2E y CI.
- **Criterios de aceptación:** MVP2 usa evidencia derivada, demuestra bloqueo previo y consumo de approval, KO bloquea y termina sin pending; planning incluye interacción/gate; el output separa claramente dry-run de real; todo permanece network-free por defecto.
- **Esfuerzo:** L.
- **Riesgo del cambio:** Medio; mayor duración/flakiness si se mezclan gates reales.
- **Dependencias:** M1-1 a M1-5.

### Milestone 2 — High-leverage product bets

#### M2-1 — `agent-run doctor` y starter guiado

**Outcome.** El operador obtiene una única diagnosis accionable de Node/Python/native deps, policies, paths absolutos, cwd, tmux, CLIs/login y modo dry-run, además de config lista para copiar.

- **Superficies:** CLI, profiles, README y sample repo.
- **Criterios de aceptación:** distingue cada clase de fallo; genera paths absolutos; ofrece “siguiente comando”; el primer dry-run necesita como máximo una edición; funciona sin Codex/Claude en dry-run.
- **Esfuerzo:** L.
- **Riesgo del cambio:** Medio; diversidad de hosts y falsas detecciones de login.
- **Dependencias:** M1-5 y learnings de M0-3.

#### M2-2 — Control plane de estado y recuperación

**Outcome.** Desde CLI o MCP, un operador ve traces activos, tasks, sessions, approvals, artifacts, verdicts, blockers y siguiente acción, y retoma el trabajo tras perder contexto.

- **Superficies:** nuevas lecturas/listados MCP, CLI status, repos de estado y redacción de errores.
- **Criterios de aceptación:** lista por estado/fecha; detail no expone paths/raw; pending approvals incluyen contexto; resume/recover devuelve checkpoint; prueba de reinicio se resuelve en <2 minutos sin JSONL/tmux.
- **Esfuerzo:** XL.
- **Riesgo del cambio:** Medio; exposición de metadata sensible y nueva IA.
- **Dependencias:** M1-4 y M0-2.

#### M2-3 — Golden templates basados en un cambio real

**Outcome.** El operador puede elegir “one-shot”, “coder-reviewer” o “planning” y recibir un flow predecible que opera sobre un sample repo y produce evidencia real, no strings sintéticos.

- **Superficies:** profiles, prompts, sample repo, smokes y CLI starter.
- **Criterios de aceptación:** cada template declara persona, scope y gates; el sample genera un diff verificable; no requiere editar código del orchestrator; el output enlaza status y audit.
- **Esfuerzo:** L.
- **Riesgo del cambio:** Bajo; templates pueden convertirse en otra fuente de drift.
- **Dependencias:** M1-3, M1-5, M2-1.

#### M2-4 — Decisión de packaging para V5 coordination

**Outcome.** El usuario core no carga complejidad que no necesita y el autor de clientes V5 obtiene un lifecycle de referencia completo.

- **Superficies:** tool registry/profile, direct Node API, coordination docs y ejemplos.
- **Criterios de aceptación:** se validan tres usos reales; se decide core vs perfil/SDK; si es opt-in, discovery lo hace explícito sin romper compatibilidad; el usuario V5 dispone de register→heartbeat→receive/reclaim→ack→unregister y health check.
- **Esfuerzo:** XL.
- **Riesgo del cambio:** Alto si se ocultan tools o cambia discovery.
- **Dependencias:** M0-3; M1 core estable; decisión de persona.

### Milestone 3 — Polish & delight

#### M3-1 — Shapes, copy y versión consistentes

**Outcome.** Humano y LLM reciben camelCase estable, enums/descripciones útiles, versiones coherentes y errores con siguiente acción.

- **Superficies:** JSON schemas MCP, response mappers, CLI help, package metadata, README y changelog.
- **Criterios de aceptación:** persistencia no filtra snake_case/path; schemas describen cada campo y enum; `V4/v0.1/V5` se explica una vez; compatibilidad se versiona.
- **Esfuerzo:** L.
- **Riesgo del cambio:** Medio; clientes que dependan de shapes accidentales.
- **Dependencias:** M1-5 y política de versionado.

#### M3-2 — Audit humano explicable

**Outcome.** El operador diagnostica un deny, una approval o un fallo de agent desde una sola vista, sin procesar JSON.

- **Superficies:** `agent-run audit show`, trace summary y export JSON.
- **Criterios de aceptación:** columnas/detail muestran actor, action, decision, reason, task/session/approval y outcome; secrets/raw nunca aparecen; un deny se explica en <2 minutos.
- **Esfuerzo:** M.
- **Riesgo del cambio:** Bajo; ancho de terminal y redacción de datos sensibles.
- **Dependencias:** M0-2 y M1-4.

#### M3-3 — KYA como ejemplo configurable, no rama del core

**Outcome.** El caso KYA demuestra extensibilidad sin paths personales ni semántica especial invisible.

- **Superficies:** scripts, prompts, policy profile y docs/examples.
- **Criterios de aceptación:** cero paths absolutos personales por defecto; config explícita; usa verdict/lifecycle core; está etiquetado como example/profile y puede retirarse sin afectar el Gateway.
- **Esfuerzo:** M.
- **Riesgo del cambio:** Medio; puede interrumpir un workflow interno activo.
- **Dependencias:** M1-3, M1-4 y propietario de KYA.

### Quick wins

| Quick win | Impacto | Esfuerzo | Resultado observable |
|---|---|---:|---|
| Corregir ya `artifact.get.sanitized`/`artifact.put.review_notes` y dejar claro que `policy.check` es CLI-only mientras no exista en MCP | Alto | S | El LLM deja de llamar tools inexistentes. |
| Resolver y propagar la frase Codex + `restricted` en prompt, README y runbook | Alto | S | Un solo routing esperado para repos sensibles. |
| Cambiar el mensaje de ambos smokes para enumerar explícitamente lo que **no** prueban | Alto | S | `OK` deja de interpretarse como approval/review real. |
| Añadir `approvalId`, action, decision/reason y actor al modo humano de audit, sin contenido sensible | Alto | S | El operador puede encontrar una approval o deny. |
| Añadir `AGENTS_REPO_ROOTS` al ejemplo genérico y advertir que command/args/env relativos dependen del cwd del host | Medio-alto | S | Menos fallos de primer arranque. |
| Alinear help/package con `v0.1.0 + V5 Unreleased` y marcar `orchestrator-langgraph` como experimental en su propia landing | Medio | S | Se entiende qué está soportado hoy. |

### Design sketches de los tres items prioritarios

#### Sketch 1 — Principal inmutable y approval receipt (M1-1 + M1-2)

**Enfoque.** Al arrancar, cada conexión/cliente recibe un principal efectivo desde configuración local o un handshake; las tools no aceptan identidad autorizadora, aunque puedan aceptar un subject descriptivo. La aprobación humana ocurre por un canal de operador distinto —CLI local o una capability explícita del host— y produce un receipt opaco, de un solo uso, ligado a action, repo, target, trace/task/session, digest y expiración. El adapter debe consumir ese receipt justo antes del efecto.

**Flujo clave.**

1. Host se conecta como `principal=orchestrator-host`, roles permitidos conocidos.
2. Solicita una acción sensible; Gateway responde blocker y contexto humano.
3. CLI muestra change digest, repo/branch/action y risk; operador grant/deny.
4. Gateway emite receipt opaco.
5. La operación exacta consume el receipt; cualquier mismatch/replay/expiry deniega.
6. Audit enlaza request, decisión, consumo y outcome.

**Gotchas.** Backward compatibility, almacenamiento de secret local, hosts que mezclan UI humana y LLM en el mismo proceso, expiry durante tareas largas, y evitar convertir esto en IAM multiusuario.

**Validación.** Repetir el experimento P-01: cambiar requester/decidedBy no modifica autoridad; mismo cliente no se autoaprueba; protected action sin receipt y con receipt de otro digest falla; routine action no añade pasos.

#### Sketch 2 — Evidence-bound coder/reviewer (M1-3)

**Enfoque.** Al empezar una task, registrar baseline del worktree/branch. Al cerrar el coder, el Gateway o adapter obtiene un manifest del cambio real y crea un artifact inmutable con digest; si es restricted, crea una representación sanitizada ligada al digest raw. El reviewer recibe esa representación y responde un objeto estructurado `{ verdict, reviewedDigest, findings }`. La aceptación comprueba que el digest actual sigue coincidiendo.

**Pantallas/superficies clave.**

- Trace status: baseline, current digest y procedencia.
- Reviewer handoff: sanitized artifact + digest + limitaciones de sanitización.
- Verdict: `OK`, `KO` o `INCONCLUSIVE`, findings y digest.
- Approval: “aprobar exactamente digest X”, no “code.apply” abstracto.

**Gotchas.** Worktree ya sucio, untracked/binaries, cambios concurrentes, review parcial, sanitización que altera contexto y repos donde el commit no es la unidad adecuada.

**Validación.** Cambiar un byte después del OK vuelve el verdict stale; falsificar `producedBy` es imposible; el real E2E deriva el artifact de `git diff`/tree real y el reviewer ve el digest que completion valida.

#### Sketch 3 — Lifecycle, status y recovery (M1-4 + M2-2)

**Enfoque.** Tratar el status como una proyección de subestados. Una vista resumida muestra goal, tasks, sessions, artifacts, review, approvals, blockers y “next safe action”. `complete` se convierte en intento de cierre: si faltan outcomes devuelve blockers estructurados sin cambiar estado; recovery permite listar y retomar desde checkpoint.

**Flujo clave.**

1. `agent-run status` muestra traces active/blocked.
2. `agent-run status <trace>` muestra coder running, reviewer pending y approval ausente.
3. Tras reinicio, el operador elige “resume”, “cancel + cleanup” o “inspect”.
4. Completion solo aparece disponible cuando todas las invariantes están verdes.

**Gotchas.** Sesiones tmux desaparecidas, cleanup que falla, traces antiguos sin nuevos campos, tareas paralelas y diferencia entre “worker terminó” y “outcome aceptado”.

**Validación.** Matar el host a mitad de coder/reviewer, reiniciar y recuperar en <2 minutos; ningún estado `completed` contiene pending; KO/error ofrece una acción concreta y no se oculta tras un setter.

## Open Questions

1. **Trust boundary:** ¿el host MCP/LLM debe considerarse no confiable aunque la máquina y el humano sí lo sean? La documentación actual dice que sí; la implementación legacy actúa como si el host fuera trusted.
2. **Autoridad humana:** ¿qué canal representa de verdad al humano: CLI separada, UI del host con capability distinta o ambos? Sin esa decisión, `approval.respond` no puede ser un gate.
3. **Definición de completed:** ¿significa que cesó la ejecución, que todas las tasks tuvieron outcome, que el reviewer dio OK o que el humano aceptó el cambio?
4. **Identidad del cambio:** ¿se aprueba/revisa un diff digest, tree hash, commit SHA, patchset o combinación? ¿Cómo se resuelve un worktree ya sucio?
5. **Codex restricted:** ¿la decisión vigente permite Codex como `restricted-coder` en `cvision/cvlib` o el prompt MVP2 expresa la política real? Debe haber un único owner de esta decisión.
6. **Policy preflight:** ¿`policy.check` debe ser una tool MCP pública o deliberadamente solo CLI? Si es pública, ¿qué identidad efectiva evalúa?
7. **Reviewer outcome:** ¿qué taxonomía mínima se desea (`OK/KO/INCONCLUSIVE`, blockers, digest) y qué cambios exigen re-review?
8. **Persona V5:** ¿coordination es parte del producto principal para el operador o un SDK/perfil para autores de orquestadores independientes?
9. **Real-mode gate:** ¿con qué frecuencia y en qué entorno se ejecutará el real E2E con CLIs autenticados para poder afirmar que la release funciona fuera de dry-run?
10. **Métricas de éxito:** ¿prima seguridad, reducción de tiempo, menos intervención humana, mayor throughput o trazabilidad? Hace falta una métrica primaria y dos guardrails.
11. **KYA:** ¿es un cliente de referencia que debe vivir fuera del core, o una vertical estratégica que justifica soporte y compatibilidad explícitos?
12. **Adopción/posicionamiento:** ¿el objetivo inmediato es un único operador interno, un pequeño equipo de ingeniería o un proyecto open-source general? La respuesta cambia cuánto onboarding y compatibilidad debe cerrarse antes del piloto.

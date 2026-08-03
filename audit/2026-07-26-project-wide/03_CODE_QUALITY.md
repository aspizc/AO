# Auditoría de código y repositorio

## Executive Summary

**Salud del código: D.** El repositorio tiene una separación reconocible
`tools → services → core/adapters`, tests rápidos y contratos explícitos para
varios dominios; V5, en particular, contiene validación y semánticas Redis
cuidadas. La deuda decisiva no es estilo, sino que varias invariantes de
seguridad existen sólo como campos del payload y no como propiedades del
runtime. Los tres riesgos principales son authority autoclarada, subprocesses
sin boundary efectivo y transiciones/store writes no atómicos bajo una
topología multi-proceso. Las oportunidades de mayor leverage son introducir un
`RequestContext` server-owned, un runner async/cancelable común y contratos
ejecutables Gateway↔clientes. El core puede evolucionar sin reescritura total:
las capas actuales ofrecen seams razonables. No conviene microservicizar ni
refactorizar V5 por estética antes de cerrar las invariantes. La confianza de
release depende además de que CI ejecute los mismos contratos y runtimes que el
candidato.

## Repo Map

### Stack y runtimes

| Área | Tecnología | Responsabilidad |
|---|---|---|
| Gateway | Node.js ESM, MCP SDK, Zod, better-sqlite3 | composition root, tools, policy, state, adapters |
| Coordination | Node.js + Redis CLI/protocol adapter | leases, discovery, inbox, dedupe, reclaim, ACK |
| CLI | Python 3.11+, Typer/Rich | policy, audit y approval de operador |
| V1 orchestration | Python, LangGraph, Temporal | workflows experimentales y durable activities |
| Contratos | JSON Schema + JSON registries | messages, tasks, artifacts, agents, coordination |
| Tests | `node:test` + pytest | unit, service, structure, E2E stdio y lanes opt-in |
| Local infra | Compose Postgres/Redis | backends experimentales/live tests |

### Entry points y flujo

```text
MCP JSON-RPC
  -> gateway/src/mcp_server.js
  -> gateway/src/tools/*
  -> gateway/src/services/*
  -> policy/state/audit/artifacts
  -> adapters Codex/Claude/Gemini o coordination queue

agent-run
  -> cli/src/agents_cli/main.py
  -> subprocess Node helpers / stores legacy

LangGraph/Temporal
  -> gateway_client.py
  -> mismo MCP Gateway
```

### Tamaño y hotspots

- `gateway/src/`: aproximadamente 8.491 líneas JS en el corte post-merge.
- `coordination_queue.js`: 2.176 líneas.
- `coordination_service.js`: 1.281 líneas.
- `workflows.py`: 555 líneas.
- `policy_engine.js`: 354 líneas.
- Python productivo CLI+orchestrator: aproximadamente 2.905 líneas.

Los dos módulos de coordinación concentran codec, Lua/wire semantics,
validación, lifecycle y recovery. No son por sí solos un bug, pero elevan el
coste de verificar cambios y favorecen fixtures acopladas a implementación.

## Audit Report

### Resumen priorizado

| ID | Sev. | Dimensión | Hallazgo |
|---|---|---|---|
| CODE-C01 | Critical | Authorization | Principal, role, repo y scope proceden de inputs; no existe `RequestContext` autoritativo. |
| CODE-C02 | Critical | Approvals | `approval.respond` no autentica operador ni produce un grant ligado/consumible. |
| CODE-C03 | Critical | Execution | Policy autoriza launch/delegate, no los efectos reales del proceso. |
| CODE-C04 | Critical | Shell | tmux puede enviar input no confiable a un shell residual. |
| CODE-H01 | High | Availability | `spawnSync` bloquea el event loop y hace ineficaz el timeout de service. |
| CODE-H02 | High | Lifecycle | El proceso arranca antes de persistir/validar la sesión y task/trace no quedan ligados. |
| CODE-H03 | High | Policy | Acciones desconocidas terminan allow si ninguna deny coincide. |
| CODE-H04 | High | Data/egress | Prompt previews y outputs raw atraviesan audit/responses sin una mediación común. |
| CODE-H05 | High | Provenance | `sanitizedFrom`, producer y requester son autoclarados o se resuelven globalmente. |
| CODE-H06 | High | Concurrency | SQLite/audit/approval wake suponen un writer/process, pero runtime permite muchos. |
| CODE-H07 | High V1 | Correctness | LangGraph legacy ignora `exitCode`; reviewer KO/non-zero puede avanzar. |
| CODE-M01 | Medium | Contracts | JSON Schema, Zod/MCP response shapes y fixtures no comparten una fuente ejecutable. |
| CODE-M02 | Medium | Atomicity | Filesystem, DB, subprocess y audit se actualizan en secuencias con residuos parciales. |
| CODE-M03 | Medium | Modularity | Coordinación concentra 3.400+ líneas en dos módulos y recrea seams difíciles de aislar. |
| CODE-M04 | Medium | Testability | Singletons/config global y subprocess wrappers reducen aislamiento/composición. |
| CODE-M05 | Medium | Portability | Worker/Gateway path depende del cwd y el wheel no empaqueta el runtime Node. |
| CODE-M06 | Medium | Dependencies | SCA detecta advisories corregibles y el lock/reachability no es gate único de candidato. |
| CODE-L01 | Low | Documentation | Comentarios, README, prompts y estados de plan pueden describir contratos distintos. |

### Hallazgos Critical

#### CODE-C01 — Authority como datos del caller

**Hecho.** `orchestration.create` recibe `callerAgent/callerRole`;
`artifact.get/share` recibe `requesterAgent/requesterRole`; agent/task reciben
repo/trace/task declarativos (`gateway/src/tools/orchestration.js:5-28`,
`gateway/src/tools/artifact.js:17-30`, `gateway/src/tools/agent.js:3-25`).
El service de orchestration sólo comprueba que el literal role sea
`orchestrator` (`gateway/src/services/orchestration_service.js:17-20`).

**Consecuencia.** Un caller con acceso al mismo registry puede cambiar el
string que gobierna policy o leer por ID global. La API expresa identidad, pero
no la demuestra.

**Target.** Contexto inmutable creado por el transporte, handles internos con
audience/scope, consultas por `(object, trace/capability)` y eliminación de
campos autorizativos públicos.

#### CODE-C02 — Approval narrativa, no capability de ejecución

**Hecho.** La tool acepta `approvalId`, `decision` y `decidedBy`; el service
first-wins persiste la decisión, pero no autentica un canal humano ni consume
el resultado en la operación protegida (`gateway/src/tools/approval.js:20-29`,
`gateway/src/services/approval_service.js:51-100`).

**Consecuencia.** El sistema puede registrar “approved” sin poder probar quién
estuvo presente, qué digest vio o si la acción ejecutada fue exactamente esa.

**Target.** Challenge firmado, tuple inmutable
`principal/trace/task/repo/action/target/digest`, expiry/nonce/maxUses y consumo
atómico por el effect handler.

#### CODE-C03 — Enforcement en el borde equivocado

**Hecho.** `agent.spawn/delegate` aplica policy y entrega prompt/entorno al CLI;
Gemini se invoca con `--yolo` (`gateway/src/services/agent_service.js:103-177`,
`gateway/src/adapters/gemini_adapter.js:108-121`). No hay wrapper que consuma
un grant en cada push/dependency/protected write realizado dentro del child.

**Consecuencia.** Una task declarada `code.read` puede solicitar efectos
distintos en el prompt. El audit demuestra launch autorizado, no effect
autorizado.

**Target.** Capabilities efectivas mediante mounts/worktree/secret isolation y
wrappers protegidos; prompts/digests son evidencia adicional, no sandbox.

#### CODE-C04 — Framing shell inseguro en tmux

**Hecho.** tmux recibe una línea y `Enter`; adapters construyen comandos con
`join(" ")` y `ask` vuelve a enviar texto sin verificar que el CLI siga siendo
foreground (`gateway/src/adapters/tmux_client.js:11-17`,
`gateway/src/adapters/claude_adapter.js:203-248`,
`gateway/src/adapters/codex_adapter.js:293-350`).

**Consecuencia.** Si el CLI termina o no arranca, el siguiente prompt puede ser
interpretado por el shell. El cwd tampoco confina a un proceso del mismo UID.

**Target.** `exec`/argv sin shell residual, token de instancia/PID/readiness,
closed-on-exit y sandbox OS comprobado con canaries.

### Hallazgos High

#### CODE-H01 — Timeout no cancela `spawnSync`

Los adapters headless usan `spawnSync` (`codex_adapter.js:218-243`,
`claude_adapter.js:159-181`, `gemini_adapter.js:108-121`). Un `Promise.race`
en el service no preempta el event loop bloqueado. Un agent lento congela
approvals, MCP y coordinación, o continúa después del timeout lógico.

#### CODE-H02 — Session lifecycle no transaccional

El adapter arranca y después se crea la sesión
(`gateway/src/services/agent_service.js:145-180`). Task, trace, agent y role no
se recargan como tuple autoritativo; un fallo DB deja tmux/proceso huérfano y
dos targets derivados de atributos pueden colisionar
(`gateway/src/adapters/session_naming.js`).

#### CODE-H03 — Default allow para acción nueva

El engine evalúa denylists y, si todas las capas pasan, retorna allow
(`gateway/src/core/policy_engine.js:82-117,313-336`). `allowActions` se usa para
capacidades concretas, no como allowlist exhaustiva. Añadir un verbo nuevo es
una operación de seguridad y hoy puede quedar permitido por omisión.

#### CODE-H04 — Egress y audit no comparten una política de datos

Adapters escriben los primeros 200 caracteres del prompt
(`codex_adapter.js:61-69`, `claude_adapter.js:78-86`,
`gemini_adapter.js:43-51`); delegate/ask pueden devolver stdout/stderr. El audit
JSONL hace append síncrono (`gateway/src/core/audit.js:69-81`). No existe un
único projector allowlisted que gobierne response, audit, telemetry y review.

#### CODE-H05 — Lineage falsificable

`artifact.put` permite propiedades de procedencia del caller; el artifact se
escribe al filesystem antes de cerrar DB/audit
(`gateway/src/tools/artifact.js`, `gateway/src/core/artifact_store.js:85-110`).
`artifact.get` resuelve IDs globales antes de policy. Un derivado puede parecer
sanitizado sin demostrar productor/regla/digest.

#### CODE-H06 — Topología multi-writer no modelada

Approval wait usa un bus local al proceso; SQLite WAL y JSONL son compartidos
sin ownership de Gateway. La observación del corte encontró 35 Gateways sobre
el mismo workspace. El código tolera algunos interleavings de DB, pero no
define quién es el writer, cómo despiertan procesos distintos ni cómo se
reconcilia un crash.

#### CODE-H07 — Oráculos V1 divergentes

El Gateway real devuelve `exitCode`; el parser LangGraph sólo mira
`passed/status` (`graphs/implement_test_review_push.py:266-269`) y la fixture
inventa ambos campos
(`tests/fixtures/implement_test_review_push_responses.json:31-37`). El node de
review marca cualquier response como `reviewed` y conecta hacia approval
(`implement_test_review_push.py:192-238`). Temporal ya contempla `exitCode`
(`workflows.py:468-475`), por lo que dos implementaciones del mismo flow
divergen.

### Hallazgos Medium/Low

- **CODE-M01 — Contract drift.** Zod se proyecta a un JSON Schema parcial y
  fixtures/runbooks repiten shapes. Falta un corpus normativo ejecutado contra
  MCP real, direct service, LangGraph y Temporal.
- **CODE-M02 — Partial writes.** Artifact bytes, DB row y audit no comparten
  commit; spawn, session row y tmux tampoco. Rollback manual deja huérfanos.
- **CODE-M03 — Hotspots V5.** `coordination_queue.js` (2.176 líneas) y
  `coordination_service.js` (1.281) mezclan muchas invariantes. La extracción
  debe seguir seams probados, no “clean architecture” cosmética.
- **CODE-M04 — Hidden globals.** Registry/config/repos/event buses se
  configuran como estado de módulo, complicando dos Gateway instances en el
  mismo proceso y tests de crash/restart.
- **CODE-M05 — Packaging.** El cliente Python usa
  `gateway/src/mcp_server.js` relativo al cwd
  (`orchestrator-langgraph/.../gateway_client.py:61`); instalar el wheel no
  instala Gateway.
- **CODE-M06 — Supply chain.** El corte obtuvo 2 high, 2 moderate y 1 low con
  fix. Reachability reduce el riesgo de Hono en stdio, pero no justifica un
  lock con advisories sin owner/expiry.
- **CODE-L01 — Drift.** Los tests structure comprueban presencia/texto, pero
  no siempre equivalencia semántica entre docs, prompts y runtime.

### Strengths to preserve

- Capas tools/services/core/adapters suficientemente claras para migración
  incremental.
- Schemas Zod cerrados (`additionalProperties:false`) y errores de validation
  con paths.
- IDs aleatorios, HMAC/constant-time en componentes sensibles y first-wins de
  approvals.
- SQLite activa WAL y foreign keys.
- `artifact.share` comprueba trace y falla cerrado sin derivación.
- Coordinación V5 limita body, clasificación y TTL; usa tokens hasheados y
  operaciones Redis atómicas.
- Telemetry ya muestra una alternativa allowlisted a prompt logging.
- Tests de policy/coordination contienen aserciones conductuales fuertes.

## Improvement Strategy

| Tema | Target | Principio | Fitness function |
|---|---|---|---|
| Authority | `RequestContext` + handles server-owned | Never trust caller claims | Matriz MCP de spoof/IDOR/replay fail-closed |
| Execution | runner async, cancelable y sandbox verificable | A timeout owns cancellation | Kill/restart/canary E2E sin huérfanos |
| State | un writer y state machines transaccionales | Persist intent before effect | Fault injection en cada boundary converge |
| Contracts | envelope normativo común | One contract, many adapters | Mismo corpus en service/MCP/V1 |
| Data flow | projector allowlisted único | Raw only through explicit capability | Secret/canary scan de responses/audit/history |
| Maintainability | seams por responsabilidad | Refactor only behind characterization | Complexity/import checks + tests invariantes |

### Qué no hacer

- No reescribir Gateway ni migrar a microservicios.
- No reemplazar SQLite/Redis por otra tecnología antes de resolver ownership.
- No perseguir 100% de coverage; priorizar mutations de authority/lifecycle.
- No separar coordination modules hasta congelar wire/contract tests.
- No mezclar upgrades major con el cierre de Criticals.

## Task Plan

| Milestone | Item | Áreas | Acceptance verificable | Effort | Riesgo | Dependencias V4 |
|---|---|---|---|---:|---|---|
| M0 | Corpus MCP real | tools/services/V1 | envelopes reales detectan `exitCode`, KO y error semantics | L | Bajo | M0/4/00, E/0/01 |
| M0 | Fault-injection baseline | state/artifacts/session | fallos antes/después de cada effect no dejan estado ambiguo | L | Medio | B/1/03, B/1/09 |
| M1 | RequestContext/handles | MCP/tools/repos | caller fields no amplían authority; lookups scopeados | XL | Alto | B/1/00–02, B/5/00 |
| M1 | Async runner | adapters/service | event loop responde; timeout mata process group y persiste estado | XL | Alto | B/0/01–03 |
| M1 | Sandbox/mounts | adapters/runtime | canaries fuera de scope inaccesibles en confined/workspace-yolo | XL | Alto | B/1/04–07 |
| M1 | Signed approvals/grants | approval/effects | receipt ligado al digest se consume una vez | XL | Alto | B/2/00–03 |
| M2 | Single writer/recovery | Gateway/state/audit | segundo owner rechazado; restart reconcilia intents/children | L | Alto | B/1/08–09 |
| M2 | Unified projector | audit/artifact/agent/V1 | prompt/output/raw no aparece en sinks no autorizados | L | Medio | B/0/04, B/3/00–01 |
| M2 | Contract 0.2 cutover | schemas/tools/clients | mixed version falla; clients migran atómicamente | XL | Alto | B/4/00–02 |
| M2 | Split hotspots by seams | coordination | codec/Lua/repo/service separados sin cambiar wire | L | Medio | tras M0/4/01 |
| M3 | Packaging portable | Python/Node | worker arranca desde install fuera del checkout | L | Medio | E/1/02 |
| M3 | Docs-as-contract | docs/prompts/tests | tool/action/model examples se validan contra runtime | M | Bajo | A/0/00–02 |

### Quick wins

- Hacer fallar el gate ante una acción desconocida en nuevos namespaces.
- Retirar prompt previews del audit y conservar sólo digest/longitud.
- Corregir el parser LangGraph para `exitCode` y KO antes de seguir
  extendiendo V1.
- Añadir `sessionId` al target tmux y validar foreground antes de `ask`.
- Clasificar advisories con owner/expiry en candidate manifest.

### Implementation sketches — top 3

#### 1. RequestContext y handles

Crear el principal en la conexión MCP/config autorizada, no en cada payload.
Los tools reciben un context interno que contiene audience, Gateway boot ID,
subject y capabilities. Al crear trace/task/session se emiten handles
opacos/scoped; repos consultan por handle+object. Introducir en shadow mode,
registrar mismatches y retirar los campos 0.1 en un cutover único. Pruebas:
spoof de role/repo/trace, cross-trace ID y replay después de restart.

#### 2. Runner async/cancelable

Centralizar `spawn` con argv, env allowlisted, process group, stdout/stderr
bounded, AbortSignal y estados starting/running/cancelling/terminal. Persistir
intent antes de spawn y PID/instance token después. Timeout inicia TERM→grace→
KILL y no resuelve hasta reconciliar. Pruebas: child ignora TERM, Gateway crash,
output flood y request concurrente de approval.

#### 3. Single writer y recovery

Adquirir ownership por workspace con boot ID/lease; CLI mutante habla con el
Gateway vivo. Toda operación effectful usa intent/outbox y transición CAS. En
restart se comparan intents, rows y procesos, y se decide reattach/cancel/fail.
Pruebas: dos Gateways, kill en cada transición y aprobación desde otro proceso.

## Open Questions

1. ¿El Gateway seguirá siendo single-host/single-user durante todo V4? Si
2. ¿Qué sandbox OS es soportado en Linux/macOS/WSL? Linux
3. ¿Se acepta retirar compatibilidad MCP 0.1 en un único cutover?
4. ¿Debe el package Python depender de una instalación Node externa o
   distribuir un artifact combinado?
5. ¿Qué límites de proceso/output/disco/coste son defaults soportados?
6. ¿Qué parte de LangGraph se conserva después de Temporal V2?

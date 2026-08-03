# Auditoría integral del proyecto — 2026-07-26

## Identificación

| Campo | Valor |
|---|---|
| Alcance | Proyecto completo V0–V5, no sólo V5 |
| Superficies | Gateway, CLI, LangGraph, Temporal, adapters de agentes, policies, schemas, stores, coordinación V5, operación, tests, CI, documentación, planes, reviews y promoción |
| Corte principal observado | `41d194a9cb5276cd0e90541b23ff47a41b3ad123` |
| Comparación de integración | `develop@d521afb12a6520b95f1a9fb172911b16ab77a1ff` |
| Método | Inspección estática, ejecución de suites, SCA, comparación de refs y observación read-only de metadata operativa |
| Dictamen | **D global; F en ejecución de agentes reales hasta cerrar la frontera de confianza** |

La auditoría combina y revalida las revisiones anteriores, pero sus conclusiones
no son una repetición de V5. Los findings `OPS-01`, `REL-01`, `QA-01`,
`QA-02`, `QA-03`, `V1-01`, `V1-02`, `GOV-01` y `DEP-01` nacen o se amplían
materialmente en este corte global.

## Documentos detallados por área

| # | Área | Documento | Foco |
|---:|---|---|---|
| 01 | Producto y funcionalidad | [01_PRODUCT_FUNCTIONAL.md](01_PRODUCT_FUNCTIONAL.md) | value proposition, jobs, journeys, completeness y roadmap |
| 02 | Arquitectura e infraestructura | [02_ARCHITECTURE_INFRASTRUCTURE.md](02_ARCHITECTURE_INFRASTRUCTURE.md) | topology, boundaries, contracts, data plane y delivery |
| 03 | Código y repositorio | [03_CODE_QUALITY.md](03_CODE_QUALITY.md) | correctness, quality, performance, dependencies y DevEx |
| 04 | Seguridad y threat model | [04_SECURITY_THREAT_MODEL.md](04_SECURITY_THREAT_MODEL.md) | assets, trust boundaries, STRIDE, exploit paths y remediation |
| 05 | Operaciones y reliability | [05_OPERATIONS_RELIABILITY.md](05_OPERATIONS_RELIABILITY.md) | runtime topology, single-writer, recovery, capacity y observability |
| 06 | Testing y release confidence | [06_TESTING_RELEASE_CONFIDENCE.md](06_TESTING_RELEASE_CONFIDENCE.md) | suites, mutation strength, live lanes, CI y promotion |
| 07 | Datos y privacidad | [07_DATA_PRIVACY.md](07_DATA_PRIVACY.md) | stores, lineage, minimization, retention y data rights |
| 08 | UX del operador | [08_UX_OPERATOR_EXPERIENCE.md](08_UX_OPERATOR_EXPERIENCE.md) | CLI/MCP/runbooks, approvals, recovery, accessibility y YOLO consent |
| 09 | Gobernanza y trazabilidad | [09_GOVERNANCE_PLANNING_TRACEABILITY.md](09_GOVERNANCE_PLANNING_TRACEABILITY.md) | plan/review/integration/promotion/release y candidate identity |

La planificación derivada se publica en
[12 hojas detalladas de épica](../../plan/PROJECT_V4/epics/README.md) y
[72 ficheros de tarea enlazados](../../plan/PROJECT_V4/SHEETS.md) en sus
directorios stage/stream. Los índices no marcan trabajo como implementado:
hacen visible la descomposición ejecutable y su trazabilidad a findings y
gates.

## Resumen ejecutivo

El proyecto tiene una base de ingeniería valiosa: separación
`tools → services → core → adapters`, decisiones de policy trazables, IDs
fuertes, SQLite con WAL/FKs, first-wins de approvals, HMAC, coordinación V5
defensiva y una suite local extensa. No es un prototipo vacío.

La barrera para operar agentes reales no es la falta de funcionalidad, sino que
la autoridad y el aislamiento todavía descansan en datos afirmados por el
caller y en procesos que comparten UID, entorno y filesystem con el control
plane. La observación runtime mostró que este riesgo ya toma forma de topología
recursiva y multi-writer: decenas de Gateways hijos sobre un mismo workspace,
no una única frontera duradera.

La segunda barrera es de confianza de release. En el corte auditado, la rama
revisada, la rama principal, los checklists y el tag prometido describían
estados distintos. La alineación local posterior de `main` y `develop` corrige
la divergencia estructural inmediata, pero no crea por sí sola un candidato
reproducible, un tag ni una publicación remota.

Por ello:

1. no debe declararse un release real-agent seguro todavía;
2. no hace falta crear V6: V4 es el programa de convergencia;
3. V4 debe empezar por identidad de candidato y rebase verificable;
4. la ejecución YOLO debe existir como capacidad explícita y consentida, no
   como bypass de seguridad.

## Alcance y evidencia

Se revisaron:

- contratos MCP, registry, dispatch y flujo de authority;
- policy engine, approvals, artifacts, audit y state stores;
- adapters Codex, Claude y Gemini, incluyendo ejecución directa y tmux;
- coordinación V5 en memoria/Redis y sus límites de concurrencia;
- workflows LangGraph y Temporal y sus fixtures;
- suites structure, Gateway, E2E, CLI y Python;
- manifests npm/Python, CI y compose local;
- planes V0–V5, reviews, checklists, ramas y tags;
- metadata de procesos y ficheros abiertos, sin leer prompts, artifacts ni
  datos personales y sin detener procesos.

Baseline ejecutado en el corte:

- 823 tests pasaron y 14 quedaron skipped al sumar las suites ejecutadas;
- cobertura Node diagnóstica: 90,57 % de líneas y 90,22 % de ramas, sin gate;
- `npm audit --omit=dev`: 2 high, 2 moderate y 1 low, todos con fix;
- muestra operativa: 36 procesos Gateway, 35 sobre el mismo workspace
  SQLite/WAL y aproximadamente 3,16 GiB RSS agregados.

Los conteos describen el corte auditado. No sustituyen un manifest de candidato
ligado a SHA, runtimes, locks, skips y digest de review.

## Hallazgos priorizados

### P0 — bloquean confianza real-agent o release

| ID | Severidad | Hallazgo | Evidencia principal | Consecuencia |
|---|---|---|---|---|
| AUTH-01 | Critical | Agent, role, repo, trace y parte del contexto de policy proceden del caller; `approval.respond` no autentica un principal operador server-side. | `gateway/src/tools/agent.js`, `gateway/src/tools/approval.js`, `gateway/src/services/approval_service.js`, `gateway/src/core/policy_engine.js` | Un child puede autoafirmar autoridad o intentar concederse el gate. |
| EXEC-01 | Critical | Los agentes comparten UID/entorno/filesystem con el Gateway y las rutas de delegate/ask/view pueden devolver stdout, stderr o snapshots raw. | `gateway/src/adapters/*_adapter.js`, `orchestrator-langgraph/src/orchestrator_langgraph/gateway_client.py` | Exfiltración, modificación del control state y ausencia de frontera frente al child. |
| SHELL-01 | Critical | El framing tmux construye/envía texto a un shell y no demuestra que el foreground siga siendo el CLI esperado. | `gateway/src/adapters/tmux_client.js` y adapters de agentes | Inyección o ejecución de comandos después de terminar/cambiar el proceso objetivo. |
| OPS-01 | Critical | La configuración de proyecto permite cargar el Gateway recursivamente dentro de children; se observaron decenas de Gateways hijos con registry de control completo. | `.mcp.json`, `.claude/settings.local.json`, `gateway/src/tools/index.js`, `gateway/src/mcp_server.js`; metadata runtime | La frontera MCP se replica dentro del sujeto no confiable y amplifica AUTH-01. |
| REL-01 | High | En el corte, `develop` estaba 78 commits y 99 paths por delante de `main`; la auditoría V5 revisó develop, no el producto expuesto por main. No existía `v0.1.0`. | refs Git, `plan/PROJECT_V3/reviews/`, README/planes y ausencia de tag | “Reviewed”, “complete”, “merged”, “promoted” y “released” no significaban lo mismo. |

Estado posterior: `main` y `develop` se alinearon localmente como acción
correctiva inmediata. `REL-01` sólo se cierra completamente cuando un gate
reproducible liga candidato, review, `main`, tag y publicación al mismo objeto.

### P1 — alto riesgo funcional, operativo o de gobernanza

| ID | Severidad | Hallazgo | Consecuencia |
|---|---|---|---|
| OPS-02 | High | Múltiples Gateways escriben el mismo SQLite/audit; los wakeups de approval son process-local y no hay ownership/lock de workspace. | Waits perdidos, interleaving, policy drift, consumo de RAM y recovery ambiguo. |
| QA-01 | High V1 / Medium global | La fixture LangGraph inventa `passed/status`; el Gateway real devuelve `exitCode`, que el parser legacy ignora. | La suite verde no valida el workflow insignia con el contrato real. |
| QA-02 | High V1 / Medium global | Reviewer KO o non-zero se transforma en `reviewed` y puede avanzar a approval/push-intent. | Evidencia de fallo se interpreta como autorización de avance. |
| QA-03 | High | El helper E2E arranca un Gateway nuevo por tool call. | No prueba una conexión MCP persistente, concurrencia, bloqueo, cancelación ni cleanup. |
| DATA-01 | High | No hay retention/export/erase coordinado para SQL, artifacts, JSONL, Redis, Temporal y backups. | Persistencia indefinida y derechos/lifecycle no demostrables. |
| ABUSE-01 | High | Falta un presupuesto común de procesos, bytes, concurrencia, disco y coste de proveedor. | Un caller o child puede agotar host o presupuesto. |
| POLICY-01 | High | Unknown actions pueden terminar allow y la declassification se apoya en regex/provenance incompleta. | Bypass por acción o tipo nuevo y salida de material restricted. |
| UX-01 | High | El operador no puede reconstruir traces, tasks y sessions si pierde IDs externos. | Recovery, cancelación y respuesta a incidentes dependen de conocimiento fuera del producto. |
| DEP-01 | High upstream / Medium contextual | SCA detectó advisories corregibles en Hono/body-parser/fast-uri. | El lock de release conserva riesgo conocido, aunque el transporte stdio reduzca reachability de Hono. |
| GOV-01 | High | Los 27 criterios MVP seguían sin marcar y el test aceptaba tanto `[ ]` como `[x]`; planes y reviews divergían. | La documentación no funciona como fuente ejecutable de readiness. |

### P2 — deuda que erosiona portabilidad y mantenibilidad

| ID | Severidad | Hallazgo | Consecuencia |
|---|---|---|---|
| V1-01 | Medium | Temporal reutiliza un único `taskId` para implement, test y review pese a que task liga agent/role. | Attribution falsa o ruptura al endurecer authority server-side. |
| V1-02 | Medium | El worker invoca `node gateway/src/mcp_server.js` relativo al cwd y el wheel no contiene Gateway. | Falla fuera del checkout aunque los tests desde root pasen. |
| OPS-03 | Medium | `agent-run approve` actualiza JSONL/SQLite pero puede omitir el sink Redis usado por consumidores. | Approval resuelta aparece pending hasta reconciliación/timeout. |
| PLAN-01 | Medium | El volumen y duplicación de estados en `plan/` supera ampliamente al core productivo. | La evidencia histórica oculta el estado efectivo y aumenta drift. |
| TEST-01 | Medium | Live Redis/Postgres/Temporal/agentes reales son opt-in o skipped; no hay presupuesto estricto de skips ni mutation gate. | Regresiones en seams reales y oráculos débiles pueden pasar CI. |

## Fortalezas verificadas

- La coordinación V5 valida tamaños y clasificación, usa tokens aleatorios
  hasheados, comparación constant-time y operaciones Redis atómicas.
- `artifact.share` comprueba trace y falla cerrado si falta una derivación
  saneada.
- SQLite activa WAL y foreign keys; approvals tienen semántica first-wins.
- El secreto legacy se crea con permisos restrictivos y el HMAC usa comparación
  constant-time.
- La proyección Redis del audit minimiza campos y limita tamaños.
- Temporal separa workflow determinista de activities y ofrece una base válida
  para replay y recovery.
- La arquitectura por capas permite introducir principal server-side,
  single-writer y adapters seguros sin reescribir el producto completo.

## Decisión para agentes YOLO/no confinados

La capacidad solicitada es compatible con una frontera de confianza explícita:

| Modo | Alcance | Autoridad requerida |
|---|---|---|
| `confined` | Default con sandbox/policy completos | Authority ordinaria |
| `workspace-yolo` | Escritura y red amplias dentro de repo/scratch aprobados; el control plane sigue aislado | Grant firmado de sesión o aprobación explícita |
| `host-unconfined` | Mismo UID/host; se suspende la frontera de seguridad frente al child | Grant explícito one-shot o por sesión |

Un “orquestador YOLO” no es un role, prompt, flag ni variable de entorno: es una
sesión con `orchestrator_execution_grant` firmado y propiedad del servidor. El
grant debe ligar, como mínimo:

- subject/session y audiencia/boot del Gateway;
- repo/cwd canónicos y scope de tareas;
- agentes/roles destino y `maxMode`;
- digest de la operación;
- expiración, `maxUses`, nonce y revocación.

El consumo debe ser atómico en el launch protegido. Un orquestador normal puede
recibir un grant one-shot o acotado. Sin un grant aplicable, el launch queda
pending hasta aceptación explícita del usuario. `--yolo`, `--yes`,
`AGENTS_AUTOAPPROVE`, env o claims de role nunca fabrican authority.

Para `workspace-yolo` se permiten grants acotados a la sesión. El owner decidió
que `host-unconfined` también pueda autorizarse one-shot o por sesión; el grant
de sesión debe conservar scope, expiry, revocación, `maxUses`, budget y una
declaración visible de que el child puede leer o alterar todo lo accesible al
UID.

## Decisiones de producto posteriores a la auditoría

- Primer piloto: local y single-user.
- Readiness: exige review trustworthy y ejecución YOLO gobernada.
- LangGraph ITRP: permanece fenced hasta paridad Temporal V2 + H4 y se retira
  mediante E/3/00.
- Versionado: SemVer; `<1.0.0` es desarrollo/prueba interna pero cada minor debe
  ser funcional y usable; el primer MVP mostrable/publicable será `1.0.0`.
- El objetivo numérico de activación/recovery se decidirá después de medir un
  baseline y antes de G4.

## Estrategia de remediación

No se crea V6. La auditoría rebasó PROJECT_V4 a 72 tareas:

1. **G-1 / M0:** manifest canónico de candidato, rebase, SCA, gate reproducible,
   lane Redis concurrente y validador de estado/promoción.
2. **A:** configuración MCP segura; los children no heredan el control MCP y
   ninguna config/flag concede YOLO.
3. **B:** principal server-side, subprocess async, single-writer, lifecycle de
   datos, quotas, egress/provenance y grants YOLO consumibles.
4. **C:** cola/consentimiento de approvals, inventario/recovery y UX específica
   para `workspace-yolo`/`host-unconfined`.
5. **D:** reviewer independiente con acceso raw autorizado y evidencia ligada
   al candidato.
6. **E:** contratos reales Gateway↔V1, KO fail-closed, identidad de tasks,
   worker portable y lanes live obligatorias.
7. **G8:** el SHA revisado debe ser exactamente el promovido a `main`, taggeado
   y publicado.

Detalle ejecutable:

- [Auditoría y trazabilidad V4](../../plan/PROJECT_V4/AUDIT.md)
- [Programa PROJECT_V4](../../plan/PROJECT_V4/README.md)
- [Índice de épicas](../../plan/PROJECT_V4/EPICS.md)
- [12 hojas detalladas de épica](../../plan/PROJECT_V4/epics/README.md)
- [Índice y rutas de las 72 tareas físicas](../../plan/PROJECT_V4/SHEETS.md)
- [Tareas M0](../../plan/PROJECT_V4/M0/TASKS.md)
- [Tareas core/security/operations B](../../plan/PROJECT_V4/B/TASKS.md)
- [Tareas de integración E](../../plan/PROJECT_V4/E/TASKS.md)

## Criterio de salida

El proyecto puede subir de D/F cuando demuestre simultáneamente:

- identidad/authority server-side y approval de operador autenticada;
- aislamiento del control plane incluso cuando el child es YOLO;
- launch, cancelación, quotas y single-writer bajo concurrencia real;
- egress raw sólo por canales autorizados y auditables;
- retention/export/erase end-to-end;
- workflows V1 contra envelopes reales, con KO/non-zero fail-closed;
- candidato reproducible, skips controlados y lanes live;
- mismo commit para review OK, `main`, tag y publicación.

Hasta entonces, la coordinación V5 puede considerarse una mejora sólida dentro
de una plataforma todavía no apta para tratar a agentes reales como sujetos no
confiables.

# PROJECT_V4 — Auditoria y trazabilidad

La fuente canónica del rebaseline es la
[auditoría integral del proyecto del 2026-07-26](../../audit/2026-07-26-project-wide/README.md).
V4 parte además de los
[informes multi-lente del 2026-06-19](../../audit/2026-06-19-gpt-5.5/README.md)
y del delta técnico revalidado el 2026-07-11 sobre
`feature/enable-codex-planner` y `develop`. El delta comprobó código, tests, CI,
dependencias, V1 y la frontera MCP; no sustituye los informes por lente, los
actualiza.

## Revalidacion integral 2026-07-26

### Alcance y baseline

- Auditoria del proyecto completo V0–V5, no solo de la coordinacion V5:
  Gateway/CLI, LangGraph/Temporal, policies/schemas, stores, operacion, tests,
  documentacion, planes, reviews y promocion.
- Checkout observado: `HEAD` y `main` =
  `41d194a9cb5276cd0e90541b23ff47a41b3ad123`;
  `develop` = `d521afb12a6520b95f1a9fb172911b16ab77a1ff`, 78 commits y 99 paths
  por delante (5.469 inserciones / 174 borrados).
- La suite independiente del 2026-07-25 audito `develop@d521afb`, no el `main`
  actual. Sus findings de trust boundary siguen siendo validos, pero sus cierres
  V3/CI no describen la rama principal.
- Gate en HEAD con venv activo: 115 structure, 585 Gateway, 24 E2E y 29 CLI
  pasan; 11 tests Node quedan skipped. LangGraph/Temporal ejecutado aparte:
  70 pasan, 3 skipped. El gate sin venv falla antes de empezar y el gate de
  `main` no incluye Python.
- Cobertura Node diagnostica (no gateada, incluyendo tests): 90,57% lineas /
  90,22% ramas. Los huecos productivos principales son state/registry y seams
  de adapters reales.
- `npm audit --omit=dev`: 2 high, 2 moderate y 1 low con fix disponible. Hono
  no es alcanzable por el transporte stdio soportado y Ajv parece test-only, por
  lo que la severidad upstream no se presenta como exploit Critical confirmado.
- Muestra operativa, solo metadata: 36 procesos Gateway vivos; 35 apuntaban al
  mismo workspace KYA, mantenian el mismo SQLite/WAL y consumian ~3,16 GiB RSS.
  La mayoria eran hijos directos de Codex/Claude, `DRY_RUN=0` y autoapprove.
  No se leyo contenido de prompts, audit, artifacts ni datos personales, y no se
  detuvo ningun proceso.

### Corrección de integración posterior al corte

Como acción inmediata de la auditoría, `main` y `develop` se alinearon
localmente e incorporaron el hardening V3, la implementación revisada V5, los
informes y el rebaseline V4. Esto mitiga la divergencia concreta observada en
`REL-01`, pero no equivale a cerrar release: no existe `v0.1.0`, no hay remote
configurado para publicar y G-1/G8 deben demostrar que candidate, review,
`main`, tag y publicación corresponden al mismo objeto. Las 72 tareas siguen
planificadas, no implementadas por este cambio documental.

### Trazabilidad por área auditada

| Área | Informe detallado | Tasks V4 primarias | Gates |
|---|---|---|---|
| Producto/funcionalidad | [`01_PRODUCT_FUNCTIONAL.md`](../../audit/2026-07-26-project-wide/01_PRODUCT_FUNCTIONAL.md) | M0/4/02, B/1/03, B/2/03, C/0/00–04, D/1/03 | G1, G4, G6, G8 |
| Arquitectura/infraestructura | [`02_ARCHITECTURE_INFRASTRUCTURE.md`](../../audit/2026-07-26-project-wide/02_ARCHITECTURE_INFRASTRUCTURE.md) | A/0/00–02, B/1/00–09, B/4/00–02, E/1/00–07 | G1, G2, G5, G7 |
| Código/repositorio | [`03_CODE_QUALITY.md`](../../audit/2026-07-26-project-wide/03_CODE_QUALITY.md) | B/0/00–04, B/1/00–09, B/4/00–02, E/0/01–02 | G2, G3, G5, G7 |
| Seguridad/threat model | [`04_SECURITY_THREAT_MODEL.md`](../../audit/2026-07-26-project-wide/04_SECURITY_THREAT_MODEL.md) | A/0/02, B/0–B/5, C/0/02, C/0/04, D/0–D/1 | G2–G6 |
| Operaciones/reliability | [`05_OPERATIONS_RELIABILITY.md`](../../audit/2026-07-26-project-wide/05_OPERATIONS_RELIABILITY.md) | B/0/01–03, B/1/03–09, B/5/02, C/0/03, E/2/00–03 | G5, G7 |
| Testing/release | [`06_TESTING_RELEASE_CONFIDENCE.md`](../../audit/2026-07-26-project-wide/06_TESTING_RELEASE_CONFIDENCE.md) | M0/4/00–02, B/5/00–02, E/0/00–02, E/2/00–03 | G1–G8 |
| Datos/privacidad | [`07_DATA_PRIVACY.md`](../../audit/2026-07-26-project-wide/07_DATA_PRIVACY.md) | B/1/04, B/1/08–09, B/3/00–03, E/1/05 | G3, G5, G7 |
| UX operativa | [`08_UX_OPERATOR_EXPERIENCE.md`](../../audit/2026-07-26-project-wide/08_UX_OPERATOR_EXPERIENCE.md) | A/0/01–02, C/0/00–04, B/1/03, B/2/03 | G1, G4, G5 |
| Gobernanza/trazabilidad | [`09_GOVERNANCE_PLANNING_TRACEABILITY.md`](../../audit/2026-07-26-project-wide/09_GOVERNANCE_PLANNING_TRACEABILITY.md) | M0/0/00–01, M0/4/00–02, E/2/03 | G-1, G0, G1, G8 |

La agrupación por outcome está materializada en
[12 hojas de épica](epics/README.md); [`EPICS.md`](EPICS.md) es su índice.
[`SHEETS.md`](SHEETS.md) enlaza los 72 ficheros de tarea que viven en su ruta
canónica `<stage>/<stream>/<task>.md`. Esta tabla relaciona áreas con trabajo;
no cambia el estado `planned` de las tareas.

### Findings nuevos, reabiertos o materialmente ampliados

| ID | Sev. | Delta y evidencia | Consecuencia | Plan |
|---|---|---|---|---|
| REL-01 | High, reabierto | `main` apunta al tip de una feature V5 y esta 78 commits detras de `develop`; faltan CI remoto, lint, LICENSE, lock Python, contracts y fixes V3. | El producto/auditoria que recibe `main` es distinto y menos endurecido que el reviewed. | G-1, M0/0/00, M0/4/00, G8 |
| REL-02 | High, nuevo | V3 D/0/3 obtuvo review OK sin merge/tag/push; hoy no existe `v0.1.0`. Reviews, checklists, branch y release usan semanticas distintas. | Una tarea puede estar “cerrada” sin que el outcome prometido exista. | M0/4/02, G8 |
| OPS-04 | Critical, evidencia operativa nueva | La config de proyecto carga el Gateway recursivamente en children; el registry incluye `approval.respond` y dispatch no aporta principal server-side. La muestra observo decenas de Gateways hijos reales. | El child no confiable puede reentrar como caller, autoafirmar rol/repo/trace y alcanzar control/approvals/spawn. | A/0/02, B/1/00–01, B/2/02, B/5/00–02 |
| OPS-05 | High, evidencia operativa nueva | 35 Gateways sobre un mismo workspace/SQLite, sin workspace lock; approval wake es process-local y audit es append directo. | Multi-writer, waits perdidos, policy drift por proceso, ~3 GiB RSS y recovery ambiguo ya ocurren en operacion real. | B/1/08–09, B/4/01, B/5/02, E/1/02 |
| QA-02 | High V1 / Medium global, nuevo | Fixture LangGraph inventa `passed/status`; el Gateway real entrega `exitCode`. El parser legacy ignora `exitCode`, por lo que exit 0 real falla o envelopes falsos avanzan. | La suite verde no prueba el workflow insignia V1. | E/0/01, E/1/00 |
| QA-03 | High V1 / Medium global, nuevo | LangGraph y Temporal V1 marcan cualquier reviewer response como reviewed; KO/nonzero puede llegar a approval/push-intent. | Review fallida se convierte en evidencia de avance. | E/0/01, E/1/00, E/1/05 |
| QA-04 | High, nuevo | El helper E2E arranca un Gateway nuevo por tool call. | No prueba conexion MCP persistente, concurrencia, bloqueo del event loop, cleanup ni globals de proceso. | B/5/02 |
| V1-06 | Medium, nuevo | Temporal reutiliza un `taskId` para implement/test/review aunque task fija agent/role. | El cierre server-side de authority rompera el workflow o mantendra attribution falsa. | E/1/03 |
| V1-07 | Medium, nuevo | Worker instalado usa por defecto `node gateway/src/mcp_server.js` relativo al cwd y el wheel no contiene Gateway. | Temporal falla fuera del checkout aunque tests desde root pasen. | E/1/02 |
| OPS-06 | Medium, nuevo | Helper `agent-run approve` configura audit JSONL pero omite Redis aun cuando Gateway publica alli. | Consumidores pueden ver approval pending despues de la decision humana. | B/2/02, C/0/02, E/2/01 |
| GOV-01 | High, nuevo | Los 27 criterios MVP siguen `[ ]`; V3 figura backlog en `main`; V4 decia no iniciado pese a worktrees. Tests aceptan `[ ]` o `[x]`. | Plan/review no es una fuente ejecutable de readiness. | M0/4/02 |
| DEP-02 | High upstream / Medium contextual | SCA actual suma `fast-uri` high y advisories Hono/body-parser; todos tienen fix. | Lock de release acumula riesgo corregible aunque reachability stdio reduzca explotabilidad. | M0/3/00 |
| PLAN-01 | Medium, nuevo | `plan/` tiene 602 ficheros/~37,5k lineas frente a ~11,4k lineas productivas core; estados se repiten y divergen. | La evidencia se convierte en deuda y oculta el estado integrado/promovido. | M0/4/02; no crear V6 |
| DP-01 | High, conocido y ahora planificado | No existe retention/export/erase end-to-end para SQL, artifacts, JSONL, Redis, Temporal y backups. | Datos/prompts/outputs persisten sin demostrar minimizacion ni derechos/lifecycle. | B/3/02–03 |
| UX-02 | High, conocido y ahora planificado | El operador no puede listar/reconstruir traces, tasks y sessions si pierde los IDs del host. | Recovery y cancelacion requieren conocimiento fuera del producto. | C/0/03 |
| ABUSE-01 | High, conocido y ahora planificado | No hay presupuesto comun de procesos, bytes, concurrencia ni coste de proveedor. | Un caller/child puede agotar event loop, RAM, disco o presupuesto. | B/0/03 |

### Findings previos que siguen bloqueando

La revalidacion no rebaja los tres Critical de la suite 2026-07-25: autoridad
autoafirmada, subprocess/raw-output sin confinamiento y shell framing tmux.
Siguen abiertos tambien provenance/declassification, approval action-binding,
lifecycle transaccional, unknown-action fail-open, retention/erase, lanes live,
quotas y operabilidad. V4 M0–E los mapea ahora; el delta anterior corrige los
huecos que no estaban representados.

### Decision de programa

No se crea V6. V4 es el programa de convergencia correcto, pero queda en
**REBASE REQUIRED**: G-1 debe decidir la linea canonica; M0/0/00 repite intake
sobre un base actual; M0/4/00–02 restaura release confidence y estado
verificable. Los worktrees V4 existentes no se borran ni se rebasean; se
preservan como evidencia historica y ninguna approval anterior se recicla.

### Requisito de producto añadido por el owner — 2026-07-26

El sistema debe poder lanzar agentes `workspace-yolo` y realmente
`host-unconfined`. No se resuelve eliminando el safety gate global:

- un orquestador YOLO es una session con grant firmado/server-owned;
- un orquestador normal puede recibir un grant one-shot o acotado a sesión;
- sin grant aplicable, cada launch amplio requiere aceptacion explicita;
- el grant liga session/audience/repo/task/target/mode/digest/expiry/maxUses y se
  consume en el launch;
- `host-unconfined` declara que el child comparte privilegios del UID y que el
  threat boundary frente a ese child queda suspendido por decision humana.

Trazabilidad: B/1/05, B/1/07, B/2/03, B/5/02 y C/0/04. Ningun role, prompt,
flag/env `--yolo` o `AGENTS_AUTOAPPROVE` puede fabricar esta autoridad.

Decisiones posteriores del owner: piloto local/single-user; readiness requiere
review trustworthy y YOLO; `host-unconfined` puede usar grant one-shot o por
sesión; LangGraph ITRP permanece fenced hasta Temporal V2+H4 y luego se retira;
SemVer con `<1.0.0` interno/funcional y primer MVP mostrable en `1.0.0`.

## Estado de base 2026-07-11

- Rama observada: `feature/enable-codex-planner`.
- Divergencia en el corte: `develop` 76 commits por delante; feature 5 por
  delante, 61 ficheros de delta.
- `develop` ya contiene los cierres V3 de CI, lint, LICENSE, lock Python,
  reconciliacion README y suite LangGraph en gate.
- Gate ejecutado en el worktree observado: structure, Gateway, E2E, MCP smoke
  y CLI verdes. La combinacion Python 3.14.4 + LangGraph 1.2.1 cuelga en los
  tests de grafo y no queda cubierta por el rango publicado.
- Dependencias npm: Hono 4.12.22 transitivo presenta high con fix disponible.

## Hallazgos 2026-07-11

| ID | Sev. | Evidencia resumida | Riesgo | Tareas |
|---|---|---|---|---|
| BR-01 | High | La feature esta 76 atras / 5 delante y mezcla 61 ficheros | Merge ciego reabre deuda V3 y mezcla seguridad con modelos | M0/0/00, M0/1/00–02, M0/2/00–02 |
| DEP-01 | High upstream | `hono@4.12.22` via MCP SDK | Lock con advisories corregibles | M0/3/00 |
| GW-01 | Critical | `approval.respond` aparece en `tools/list`, acepta `decidedBy` y evita policy | Un LLM se auto-concede el gate | B/2/00–02, C/0/02, B/5/02 |
| GW-02 | Critical | `agent.delegate/ask/view` devuelven stdout, stderr y snapshots raw | Egress restricted fuera de artifact policy | B/3/00–01, B/5/01 |
| GW-03 | Critical | `artifact.put.kind` es string; raw policy usa lista cerrada parcial | `raw_diff_v2` evita sanitizacion/policy | B/1/02, B/5/01 |
| GW-04 | Critical | State, audit, artifacts y HMAC viven por defecto dentro del repo | Hijos del mismo UID leen/manipulan control state | B/1/04–09, B/5/02 |
| GW-05 | High | `artifact.get` busca por ID global y confia en requester agent/role | Cross-trace e identity spoofing | B/1/00–02, B/5/00–01 |
| GW-06 | High | Autoapprove usa classification/context del caller | Repo restricted puede presentarse como seguro | B/0/00, B/1/01, B/5/00 |
| GW-07 | High | Regex superficial siempre baja restricted→internal | Codigo restricted sale intacto si no hay match | B/0/04, B/1/02, B/5/01 |
| GW-08 | Critical availability | `spawnSync` bloquea; `agentTimeoutMs` no gobierna el adapter | Gateway no atiende tools y no cancela hijos | B/0/01–03 |
| GW-09 | High | Spawn ocurre antes de persistir/bind task+trace | Tmux huerfano y cross-trace task | B/1/03, B/1/09, B/5/02 |
| GW-10 | High | `approval.wait` usa EventEmitter local; CLI escribe en otro proceso | Respuesta visible solo tras timeout; multi-writer | B/1/08–09, B/2/00–02 |
| GW-11 | High | Repo/path/excludedPath proceden de inputs o solo guardan cwd | Spoof de repo y acceso lateral a paths excluidos | B/0/00, B/1/05–07 |
| QA-01 | High | Tests de seguridad ejercitan servicios, no el boundary MCP real | Bugs de self-grant, spoof y raw egress pasan verdes | B/5/00–02 |
| V1-01 | High | LangGraph ignora `exitCode` real | Tests verdes se interpretan como fallo | E/0/01 |
| V1-02 | High | Python 3.14 permitido pero grafo se cuelga | Runtime soportado nominalmente no termina | E/0/00 |
| V1-03 | High | Temporal acepta signal no ligada a approvalId/poll autoritativo | `push_ready` con approval incorrecta | E/1/04 |
| V1-04 | Medium/High | ITRP existe en LangGraph y Temporal y ya diverge | Fixes y semantics distintos por ruta | E/1/00–E/3/00 |
| V1-05 | Medium | `"not approved"` pasa por substring `approved` | Refinement se salta por falso positivo | E/0/02 |
| UX-01 | High | No hay cola util de approvals y se aprueba por ID opaco | Consentimiento no informado | C/0/01–02 |
| REV-01 | Critical trust | Reviewer sin raw solo puede validar summary | Ninguna persona/agente autorizado valida el codigo real | D/0/00–D/1/03 |

## Decisiones que cambian el plan anterior

1. B/0/04 ya no abre una pregunta humana: summary-only es decision aceptada.
2. El invariante “schemas MCP inmutables” se retira; la seguridad requiere un
   contrato 0.2 versionado y migracion atomica.
3. Un `flock` no cierra single-writer mientras la CLI escriba SQLite/audit de
   forma directa. La CLI debe hablar con el Gateway vivo.
4. `--json` es formato, nunca consentimiento; `--yes` solo suprime prompt
   despues de autenticar/firma de operador.
5. V1 ya no queda fuera de V4: se retiene experimental y Temporal converge
   como implementacion durable canonica.
6. Codex esta autorizado en restricted; el stale prompt “Gemini-only” se
   elimina. La review raw puede usar Codex o Gemini segun independencia.

## Trazabilidad por stage

| Stage | Hallazgos principales |
|---|---|
| M0 | BR-01, DEP-01, drift de modelos/KYA |
| A | AB1, DOC2, SEC9 y coherencia de configuracion |
| B | GW-01…GW-11, QA-01, SEC1/2/4, A1, RS1, DA1 |
| C | UX1/2/5/6 y operacion segura de approvals |
| D | REV-01 y topologia de revision restricted |
| E | V1-01…V1-05 y lanes reales omitidas |

## Fortalezas que no deben perderse

- Capas tools→services→core→adapters y policy decisions con `ruleId`.
- IDs, SQLite WAL/FKs, first-wins de approvals y HMAC de mensajes.
- `artifact.share` falla cerrado cuando falta una derivacion valida.
- Gateway como unica frontera de side effects para la capa Python.
- Temporal separa workflow determinista de activities y conserva replay.
- Gate rapido y suite CLI estable; cobertura Node observada cercana a
  89% lineas / 81% ramas.

## Deuda registrada, no cerrada en V4

- Driver Postgres basado en `psql`, parametrizacion/fallback y Redis durable.
- Encryption/tamper evidence del audit at-rest mas alla de minimization,
  isolation y single-writer; SEC7 raw-content se cierra en B/3/01.
- Consola `status`, TUI/UI, sample repo y packaging autonomo del wheel CLI.
- Publicacion de release y promocion de V1 a supported.

OPS3 (`MCP_TOOL_CALL` con telemetria off) fue cerrado en `develop`, pero REL-01
lo reabre en el `main` actual: alli el append sigue condicionado por telemetria.

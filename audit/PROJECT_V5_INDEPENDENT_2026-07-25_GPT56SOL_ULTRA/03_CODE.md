# Auditoría independiente de código y repositorio — PROJECT V5

Model: gpt-5.6-sol  
Reasoning: ultra  
Execution profile: fast/priority  
Snapshot: `develop` @ `d521afb12a6520b95f1a9fb172911b16ab77a1ff`, inspeccionado en `/tmp/agents-orchestrator-v5-audit.dx0UlX/worktree`  
Independencia: revisión nueva e independiente; no se consultaron auditorías, planes de auditoría ni artefactos de revisión previos.  
Fecha: 2026-07-25

## 1. Executive Summary

Se auditó de forma estática el snapshot exacto indicado, cubriendo arquitectura, calidad, seguridad, pruebas, rendimiento, dependencias, experiencia de desarrollo y coherencia documental.  
La calificación global es **D**: hay una base de ingeniería apreciable, pero la promesa central de enforcement no queda garantizada frente al actor no confiable descrito por el propio threat model.  
La causa sistémica es que identidad, rol, alcance de trace, contexto de aprobación y acción declarada proceden en demasiados puntos del mismo llamante al que deben restringir.  
La coordinación V5, la persistencia SQLite, la sanitización canónica, la telemetría prudente y la amplitud de pruebas son fortalezas reales que conviene preservar.  
El segundo eje de riesgo es operacional: los adaptadores bloquean el event loop, los timeouts no cancelan el trabajo y el modo supervisado puede volver a un shell que interprete un prompt como comando.  
La oportunidad principal es convertir policy, approval y ejecución en una cadena de capacidades propiedad del servidor, acompañada de un supervisor de procesos asíncrono y contratos runtime verificables.  
No se ejecutaron pruebas ni se arrancaron o contactaron MCP, Redis, Postgres, Temporal u otros servicios, conforme al alcance; por tanto, los resultados de test y rendimiento descritos son conclusiones de inspección, no mediciones de una ejecución.  
Con los Critical cerrados y gates live/reproducibles, la base podría subir con rapidez a una calificación B sin abandonar su enfoque local-first.

| Top 3 | Riesgo | Oportunidad correspondiente |
|---|---|---|
| 1 | Identidad, rol y alcance de datos autoclarados permiten eludir policy y consultar artifacts fuera del trace. | Contexto de principal/capability establecido por servidor y consultas siempre scopeadas. |
| 2 | Las aprobaciones no distinguen operador de agente ni se enlazan de extremo a extremo con la acción ejecutada. | Grant inmutable, específico y de un solo uso para `trace/task/action/repo/target`. |
| 3 | El subproceso puede actuar fuera de la acción declarada; `tmux` y `spawnSync` añaden ejecución accidental, bloqueo y timeouts aparentes. | Supervisor asíncrono, sandbox efectivo, lanzamiento directo sin shell residual y cancelación comprobable. |

## 2. Repo Map

### 2.1 Alcance y método

- Snapshot verificado: `d521afb12a6520b95f1a9fb172911b16ab77a1ff` sobre `develop`, con worktree limpio al inicio de la revisión.
- Análisis read-only de código, manifiestos, migraciones, contratos, CI, documentación técnica y pruebas.
- Se excluyeron deliberadamente `audit/**`, `plan/**/AUDIT*.md`, `plan/**/reviews/**` y demás artefactos previos de auditoría/revisión.
- No se usó red; no se verificaron CVE, licencias ni frescura de versiones contra registros externos.
- No se ejecutaron tests porque el alcance prohibía arrancar/contactar servicios y el repositorio contiene variantes MCP/live; la cobertura indicada procede del inventario estático.

### 2.2 Topología observada

```text
Operador / cliente MCP
└── gateway/ (Node.js ESM, stdio)
    ├── tools/                  validación y superficie MCP
    ├── services/               casos de uso
    ├── core/
    │   ├── policy / approval / audit / artifacts
    │   ├── repositorios SQLite
    │   └── coordinación V5, con backend Redis opcional
    ├── adapters/               Codex, Claude y Gemini
    │   ├── headless
    │   └── supervised mediante tmux
    └── estado local
        ├── SQLite
        ├── artifacts en filesystem
        └── audit JSONL

cli/                            `agent-run`, wrapper Python del monorepo
orchestrator-langgraph/         flujos Python experimentales LangGraph/Temporal
schemas/                        contratos JSON publicados
policies/                       roles y repositorios
tests/                          unitarias, estructura, e2e y variantes live opt-in
docker-compose.yml              Redis/Postgres/Temporal opcionales
```

### 2.3 Componentes y responsabilidades

| Componente | Responsabilidad observada | Persistencia / dependencia | Estado |
|---|---|---|---|
| Gateway MCP | Entrada, validación de herramientas, policy, audit y delegación | Node.js, stdio | Núcleo actual |
| SQLite state | Traces, tasks, sessions, approvals, messages y artifacts | SQLite con WAL y FK | Default local |
| Artifact store | Contenido, clasificación y derivados sanitizados | Filesystem + SQLite | Núcleo actual |
| Adapters | Lanzar/consultar/matar agentes externos | Procesos locales y tmux | Núcleo actual |
| Coordination V5 | Participantes, mensajes, discovery, heartbeat y fencing | Redis opcional, scripts Lua | Add-on V5 |
| `agent-run` | UX CLI y acceso a scripts Node del checkout | Python + layout del monorepo | Local/developer |
| LangGraph/Temporal | Orquestación durable y observabilidad experimental | Python, Temporal/Redis/Postgres opcionales | Experimental |

### 2.4 Flujos críticos

1. Un llamante invoca una tool y aporta campos como `callerAgent`, `callerRole`, `traceId`, `action` o `requesterRole`.
2. La tool valida forma y delega a un service; en varias rutas, esos campos se emplean directamente como contexto de autorización.
3. Policy decide principalmente por denylist y el Gateway lanza un CLI con un prompt libre.
4. El CLI delegado opera con las capacidades de su proceso; el Gateway no consume un grant por cada acción protegida efectivamente realizada.
5. Estado, artifacts y audit se escriben en almacenes locales; coordinación V5 usa operaciones Redis atómicas cuando está habilitada.

Este flujo deja una separación incompleta entre **declaración del actor** y **autoridad del actor**. Esa diferencia explica los tres hallazgos Critical.

### 2.5 Tamaño y señales de mantenibilidad

- Aproximadamente 11.396 líneas de código fuente en los componentes principales inspeccionados.
- Hotspots: `gateway/src/core/coordination_queue.js` tiene unas 2.176 líneas y `gateway/src/services/coordination_service.js` unas 1.281; concentran Lua, validación, transporte, decoding y dominio.
- Inventario estático: unas 599 declaraciones `test(` en Node y 231 funciones `def test_` en Python, repartidas entre Gateway, estructura, CLI, e2e y orquestador.
- La separación nominal `tools → services → core → adapters` es útil, pero tools de artifacts y otros flujos atraviesan directamente repositorios/core, mientras varios singletons mutables viven a nivel de módulo.
- Los componentes opcionales están etiquetados como experimentales, aunque CI no ejerce de forma obligatoria sus contratos live.

## 3. Audit Report

### 3.1 Escala de severidad

| Severidad | Criterio usado |
|---|---|
| Critical | Permite romper una frontera central de autorización/ejecución o comprometer el sistema con un actor dentro del threat model, sin control compensatorio fiable. |
| High | Puede producir acceso, ejecución, pérdida de disponibilidad o corrupción de trazabilidad importantes; requiere condiciones adicionales o tiene menor alcance que Critical. |
| Medium | Degrada corrección, mantenibilidad, release confidence o rendimiento de manera relevante, sin romper por sí solo la frontera principal. |
| Low | Deuda acotada, higiene o deriva documental con impacto operativo limitado. |

### 3.2 Resumen priorizado

| ID | Sev. | Dimensión | Hallazgo |
|---|---|---|---|
| C-01 | Critical | Security / architecture | Principal, rol y alcance de trace son datos autoclarados; `artifact.get` hace lookup global. |
| C-02 | Critical | Security / correctness | `approval.respond` no demuestra autoridad de operador y el autoapprove no enlaza el contexto real. |
| C-03 | Critical | Security / execution | Policy autoriza el lanzamiento, no la acción que el subproceso termina ejecutando. |
| H-01 | High | Security / reliability | El modo tmux conserva un shell y no aporta confinamiento efectivo del filesystem. |
| H-02 | High | Performance / reliability | `spawnSync` bloquea el Gateway y vuelve ineficaces los timeouts de servicio. |
| H-03 | High | Correctness / operability | Sesiones no se enlazan de forma íntegra con task/trace y colisionan por nombre. |
| H-04 | High | Security / extensibility | El modelo de policy es default-allow para acciones desconocidas. |
| H-05 | High | Privacy / auditability | Audit conserva fragmentos de prompts y acepta metadatos/atribuciones no autoritativos. |
| H-06 | High | Data integrity / security | La procedencia de artifacts sanitizados es autoclarada y los payloads carecen de límites. |
| M-01 | Medium | Contracts / API | Los JSON Schema publicados divergen del runtime y no se prueban contra respuestas reales. |
| M-02 | Medium | Correctness / persistence | Máquinas de estado, FK y secuencias filesystem/DB dejan transiciones y fallos parciales inválidos. |
| M-03 | Medium | Testing / release | Redis, Postgres, Temporal y el e2e real quedan fuera del gate normal de CI. |
| M-04 | Medium | Dependencies / DevEx | CI ignora el lock Python y el lint no cubre toda la superficie ejecutable. |
| M-05 | Medium | Architecture / performance | Coordinación V5 concentra demasiadas capas y recrea conexiones Redis por operación. |
| M-06 | Medium | Reliability | La idempotencia Temporal es sólo memoria de proceso. |
| M-07 | Medium | Architecture / testability | Singletons mutables y bypass de capas reducen aislamiento y composabilidad. |
| L-01 | Low | Dependencies / docs / packaging | Dependencias, metadatos V4/V5 y packaging CLI presentan deriva acotada. |

### 3.3 Hallazgos detallados

#### C-01 — La autorización confía en principal, rol y scope aportados por el llamante

**Hechos observados**

- `artifact.get` recibe `requesterAgent` y `requesterRole` junto con un `artifactId`; el repositorio resuelve el ID globalmente antes de evaluar policy.
- `artifact.list` y `orchestration.view` usan un `traceId` sin capability/token asociado.
- La creación de orchestration comprueba que el literal aportado en `callerRole` sea `orchestrator`, no que exista una identidad de servidor con ese rol.
- La role policy permite contenido restricted/raw al rol `restricted-coder`; cualquier llamante que pueda elegir ese string obtiene ese contexto de decisión.
- El threat model afirma que no se expone lookup global y que las consultas quedan scopeadas por trace, pero el contrato real de `artifact.get` contradice esa afirmación.

**Evidencia**

- `gateway/src/tools/artifact.js:17-25`
- `gateway/src/tools/artifact.js:77-112`
- `gateway/src/core/repositories/artifact_repo.js:14-16`
- `gateway/src/tools/orchestration.js:5-28`
- `gateway/src/services/orchestration_service.js:17-20`
- `gateway/src/core/policy_engine.js:269-310`
- `policies/roles.json:40-49`
- `docs/threat-model.md:119-129`
- `tests/e2e/bypass_regression.test.js:123-140`
- `tests/e2e/bypass_regression.test.js:386-405`

**Impacto**

Con conocimiento de un artifact ID o trace ID, un cliente con acceso a la superficie MCP puede impersonar un rol más privilegiado, obtener metadatos fuera de su scope y, en determinadas clasificaciones, recuperar contenido raw. La suite comprueba decisiones con roles honestos, pero no prueba el spoofing de identidad de extremo a extremo.

**Juicio**

Critical bajo el threat model documentado, que considera no confiables a los agentes/prompts. Si en producción sólo un proceso operador plenamente confiable puede invocar todas las tools y ningún agente delegado puede hacerlo, la explotabilidad baja, pero entonces las APIs de rol no constituyen una frontera de seguridad y la documentación debe decirlo explícitamente.

**Recomendación**

Crear un `RequestContext` inmutable en el transporte/servidor, eliminar principal y rol de los argumentos autorizativos, emitir capabilities de trace/session no reutilizables y hacer que todos los repositorios de lectura requieran scope. `artifact.get` debe consultar por `(artifact_id, trace_id)` o capability equivalente; el rol nunca debe ser un string libre del payload.

#### C-02 — La decisión de aprobación no demuestra autoridad y no queda ligada a la acción real

**Hechos observados**

- `approval.respond` acepta `approvalId`, `decision` y un `decidedBy` libre; el service no ejecuta policy ni autentica un canal de operador.
- La policy declara que `orchestrator` no puede responder aprobaciones, pero esa regla no se consulta en esta ruta.
- El autoapprove determina restricción mediante campos del `context` entregado por el llamante y una lista de acciones exactas.
- El workflow pide la acción genérica `git.push` y coloca repo/rama en context; la prohibición incondicional sólo contiene `git.push.protected`, por lo que una configuración que autoapruebe `git.push` puede conceder una rama protegida sin normalizarla contra repository policy.
- Añadir una nota de decisión reemplaza el payload JSON original, perdiendo el contexto que debería sostener la trazabilidad.

**Evidencia**

- `gateway/src/tools/approval.js:20-28`
- `gateway/src/services/approval_service.js:7-11`
- `gateway/src/services/approval_service.js:17-25`
- `gateway/src/services/approval_service.js:51-100`
- `gateway/src/core/repositories/approval_repo.js:68-75`
- `gateway/src/core/policy_engine.js:131-145`
- `policies/roles.json:23-28`
- `orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:60-84`
- `orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:265-285`
- `docs/adr/ADR-006-bounded-autoapprove.md:38-46`
- `tests/e2e/bypass_regression.test.js:519-549`
- `tests/gateway/approval_state.test.js:44-56`

**Impacto**

Un actor con acceso a tools puede registrar una decisión como si fuera humana, o construir contexto benigno para obtener autoapprove. Aunque se cree un approval correcto, no existe un grant de un solo uso consumido por la acción protegida, de modo que la aprobación es evidencia narrativa, no enforcement transaccional.

**Juicio**

Critical porque rompe explícitamente la invariante “el orquestador no puede aprobar” y afecta operaciones que la policy considera humanas. El problema no se limita a UI o logging: la autoridad y el objeto aprobado no están vinculados criptográfica o transaccionalmente.

**Recomendación**

Separar el canal de operador, mantener immutable el tuple `(trace, task, principal, action, repo, target, digest)` y producir un grant server-side, expirante y de consumo único. Resolver `git.push` contra branch policy antes del autoapprove; no confiar en `classification`, `protected` ni `decidedBy` del llamante. Guardar notas en columna/evento separado, sin sobrescribir el request original.

#### C-03 — Policy autoriza el proceso delegado, no la acción efectivamente ejecutada

**Hechos observados**

- `agent.delegate` y `agent.spawn` evalúan una acción fija de delegación y luego entregan un prompt arbitrario al CLI.
- `task.assign` recibe una acción declarada por el llamante, pero la fila persistida no conserva de forma vinculante acción ni digest del brief.
- No se encontró una ruta de ejecución que consuma un approval ID/grant antes de `git.push`, cambios de dependencias o escrituras protegidas.
- Los adaptadores ejecutan CLIs con modos no interactivos; Gemini añade `--yolo`, ampliando lo que el prompt puede ordenar al proceso.
- La policy contiene reglas para acciones protegidas, pero éstas no interceptan los efectos realizados dentro del subproceso.

**Evidencia**

- `gateway/src/services/agent_service.js:119-135`
- `gateway/src/services/agent_service.js:157-177`
- `gateway/src/services/task_service.js:52-90`
- `gateway/src/adapters/gemini_adapter.js:91-120`
- `gateway/src/core/policy_engine.js:131-145`
- `docs/adr/ADR-003-policy-before-spawn.md:12-17`

**Impacto**

Una task puede declarar `code.read` mientras el prompt solicita escritura, push o cambio de dependencias. El Gateway registra que autorizó delegación, pero no puede demostrar ni impedir que el proceso real exceda esa intención.

**Juicio**

Critical porque el Gateway se presenta como enforcement boundary frente a agentes no confiables, pero la decisión termina en el borde equivocado. La validación de prompt o un campo `action` adicional no resuelve el problema: hace falta controlar capabilities efectivas y/o interceptar los efectos protegidos.

**Recomendación**

Vincular task, prompt digest, workspace y capabilities de ejecución; lanzar el agente en un entorno donde las operaciones sensibles sólo sean posibles mediante wrappers/gates que consuman grants. Para acciones de filesystem, usar worktrees/permisos/mounts efectivos; para push, dependencias y rutas protegidas, proporcionar comandos mediadores sin credenciales directas al subproceso.

#### H-01 — tmux puede interpretar un prompt como shell y el CWD no es un sandbox

**Hechos observados**

- Una sesión tmux se crea sin comando, por lo que arranca el shell por defecto; después se escribe una línea con `send-keys ... Enter`.
- Codex y Claude construyen la línea de lanzamiento con `join(" ")`, sin una capa de quoting robusta.
- Las operaciones `ask` escriben el prompt y Enter sin comprobar PID, `pane_current_command`, readiness ni que el CLI siga vivo.
- Si el binario no arranca, termina o devuelve al shell, el siguiente prompt se interpreta como comando de shell.
- `assertSafeCwd` sólo demuestra que el CWD inicial está dentro del repo tras `realpath`; no impide al proceso leer/escribir otras rutas con los permisos del usuario.
- La comprobación adicional de `excludedPaths` aparece en Codex, pero no de forma equivalente en Gemini/Claude; las rutas excluidas de policy no se pasan en el contexto normal de delegación.

**Evidencia**

- `gateway/src/adapters/tmux_client.js:11-17`
- `gateway/src/adapters/base_adapter.js:20-39`
- `gateway/src/adapters/codex_adapter.js:128-143`
- `gateway/src/adapters/codex_adapter.js:293-313`
- `gateway/src/adapters/codex_adapter.js:336-350`
- `gateway/src/adapters/claude_adapter.js:203-248`
- `gateway/src/adapters/gemini_adapter.js:108-113`
- `gateway/src/adapters/gemini_adapter.js:128-182`
- `policies/repositories.json:24-28`
- `docs/threat-model.md:44-58`
- `tests/gateway/codex_supervised.test.js:170-194`

**Impacto**

Un fallo de lifecycle convierte datos no confiables en código de shell. Incluso en el camino nominal, el agente puede salir del CWD y tocar `policies/`, credenciales u otros paths accesibles por el usuario, pese a que la aplicación los marque como excluidos.

**Juicio**

High por ser una ruta directa de command execution accidental y una discrepancia material con el modelo de confinamiento. No se afirma que todos los CLIs carezcan de sandbox propio; sí se confirma que el Gateway no lo establece ni lo verifica de forma uniforme.

**Recomendación**

Arrancar tmux con comando/argv directo y un `exec` que no deje shell residual; no construir líneas con concatenación. Antes de cada input, verificar proceso, sesión y token de instancia; cerrar la sesión al terminar el CLI. Añadir confinamiento OS/worktree explícito y pruebas de lectura/escritura de paths excluidos para cada adapter.

#### H-02 — Los timeouts no preemptan `spawnSync` y el Gateway queda bloqueado

**Hechos observados**

- La configuración expone `agentTimeoutMs`, mientras los adaptadores consultan `adapterTimeoutMs` y caen a 600.000 ms.
- Los CLIs headless se ejecutan mediante `spawnSync` dentro de métodos aparentemente asíncronos.
- El service envuelve la Promise en `Promise.race`, pero el timer no puede dispararse mientras `spawnSync` bloquea el event loop.
- Cuando la operación subyacente sí es asíncrona, `_with_timeout` rechaza al vencer pero no cancela el trabajo ni sus efectos.
- README describe este límite como un cap server-side.

**Evidencia**

- `gateway/src/core/config.js:155-160`
- `gateway/src/services/_with_timeout.js:1-11`
- `gateway/src/services/agent_service.js:77-79`
- `gateway/src/services/agent_service.js:131-135`
- `gateway/src/adapters/codex_adapter.js:218-233`
- `gateway/src/adapters/claude_adapter.js:159-170`
- `gateway/src/adapters/gemini_adapter.js:108-113`
- `README.md:218-220`

**Impacto**

Una delegación larga congela el servidor stdio, incluyendo aprobaciones, heartbeats y coordinación. El llamante puede recibir timeout mientras el proceso continúa y produce efectos, o esperar mucho más que el límite configurado.

**Juicio**

High por disponibilidad e inconsistencia operacional; el riesgo crece cuando coordinación V5 comparte el mismo proceso.

**Recomendación**

Sustituir `spawnSync` por `spawn` con `AbortSignal`, process groups y kill escalonado; usar una única configuración validada. El contrato de timeout debe significar “proceso detenido o estado explícito `cancelling`”, no sólo “Promise rechazada”.

#### H-03 — La identidad y lifecycle de sesiones no preservan invariantes task/trace

**Hechos observados**

- El adapter arranca antes de insertar la sesión en DB; una FK inválida o fallo de persistencia deja un proceso/tmux huérfano.
- `createSession` persiste `taskId`, `traceId`, `agent` y `role` aportados sin cargar la task y verificar que pertenecen al mismo tuple.
- La migración sólo declara FK sobre `task_id`; `sessions.trace_id` no forma una FK compuesta con task.
- `ask`, `view` y `kill` cargan la sesión, pero aceptan otro `traceId` para audit/operación sin compararlo con la fila.
- El target tmux deriva sólo de trace truncado, agent y role; dos tasks paralelas con igual combinación colisionan de forma determinista.

**Evidencia**

- `gateway/src/services/agent_service.js:29-41`
- `gateway/src/services/agent_service.js:145-180`
- `gateway/src/services/agent_service.js:184-221`
- `gateway/src/adapters/session_naming.js:1-28`
- `gateway/migrations/001_initial.sql:30-39`
- `gateway/src/tools/session.js:23-39`
- `tests/gateway/session_naming.test.js:5-46`

**Impacto**

Procesos huérfanos, mensajes o kills atribuidos al trace equivocado, audit engañoso y fallo de concurrencia para roles repetidos. El problema afecta operación normal, no sólo un actor malicioso.

**Juicio**

High porque sesiones son el objeto operativo que enlaza task, agente y proceso, y actualmente ese enlace no es íntegro ni único.

**Recomendación**

Reservar primero una sesión UUID/target único en estado `starting`, validar task/trace/agent/role desde DB, arrancar después y transicionar a `running`; compensar cualquier fallo. Derivar el target de `sessionId`, no de atributos truncables, y comparar siempre el scope persistido.

#### H-04 — Acciones desconocidas se autorizan por defecto

**Hechos observados**

- El engine aplica `denyActions`, pero no usa `allowActions` como allowlist exhaustiva.
- Si ninguna regla deniega, el pipeline devuelve allow.
- Una prueba congela explícitamente que una acción desconocida se permita para todos los roles.
- Un ADR documenta esta semántica como decisión de compatibilidad.

**Evidencia**

- `gateway/src/core/policy_engine.js:82-117`
- `gateway/src/core/policy_engine.js:313-336`
- `docs/adr/ADR-008-role-action-semantics.md:8-17`
- `docs/adr/ADR-008-role-action-semantics.md:36-55`
- `tests/gateway/policy_role_matrix.test.js:407-422`

**Impacto**

Cada nueva tool/acción queda autorizada hasta que todas las denylists relevantes se actualicen. En un sistema extensible, el fallo esperado es por omisión y favorece escaladas silenciosas.

**Juicio**

High aunque sea intencional: es una deuda de seguridad consciente, no un bug accidental. La compatibilidad histórica no compensa el riesgo en el boundary central.

**Recomendación**

Migrar por fases a default-deny: inventariar acciones, activar modo shadow con métricas, completar allowlists y finalmente rechazar desconocidas. Las acciones administrativas/operator-only deben quedar fuera del namespace invocable por agentes.

#### H-05 — El audit local conserva prompts y no es una fuente de atribución autoritativa

**Hechos observados**

- Los adaptadores registran los primeros 200 caracteres del prompt en JSONL.
- El append local es síncrono, sin rotación ni retención visible.
- La proyección Redis intenta sanitizar metadatos, pero ante fallo devuelve el valor crudo.
- `traceId`, actor y notas de intervención proceden en varias rutas del payload; `session.intervention_note` no comprueba que sesión y trace coincidan.
- La telemetría OTel, en contraste, usa atributos acotados y evita prompts crudos.

**Evidencia**

- `gateway/src/adapters/codex_adapter.js:61-69`
- `gateway/src/adapters/claude_adapter.js:78-86`
- `gateway/src/adapters/gemini_adapter.js:43-51`
- `gateway/src/core/audit.js:69-81`
- `gateway/src/core/audit.js:226-232`
- `gateway/src/tools/session.js:23-39`
- `gateway/src/core/telemetry.js:68-105`
- `gateway/src/core/telemetry.js:187-210`

**Impacto**

Secretos o PII presentes al principio de un prompt quedan en un archivo ordinario del workspace. A la vez, los eventos pueden atribuirse a un actor/trace no verificado, reduciendo su valor forense.

**Juicio**

High por la combinación de privacidad e integridad de evidencia. No se observó exfiltración externa por defecto, pero el almacenamiento local no elimina la obligación de minimización y retención.

**Recomendación**

Eliminar previews crudos o reemplazarlos por hash/digest y metadata allowlisted; hacer fail-closed la sanitización de cualquier sink remoto. Obtener identidad y trace de estado server-side, firmar/encadenar eventos si se exige valor forense y definir rotación/retención.

#### H-06 — La procedencia de sanitización es falsificable y los contenidos no están acotados

**Hechos observados**

- `artifact.put` acepta `sanitizedFrom` del llamante y sólo auto-sanitiza cuando ese campo es null.
- El repositorio considera derivado sanitizado cualquier registro con `sanitized_from`, sin demostrar que lo produjo la regla canónica.
- El contenido se escribe en filesystem antes de completar DB/audit; un fallo posterior deja un archivo huérfano.
- Artifact content y message body carecen de máximos visibles; se leen/escriben completos mediante APIs síncronas.
- `orchestration.view` retorna filas de artifact directamente, incluidas propiedades que `artifact.get` oculta explícitamente como `path`.

**Evidencia**

- `gateway/src/tools/artifact.js:8-15`
- `gateway/src/tools/artifact.js:34-38`
- `gateway/src/tools/artifact.js:60-71`
- `gateway/src/core/artifact_store.js:41-110`
- `gateway/src/core/artifact_store.js:115-119`
- `gateway/src/core/repositories/artifact_repo.js:22-27`
- `gateway/src/services/orchestration_service.js:47-55`
- `gateway/src/tools/message.js:50-61`
- `gateway/migrations/001_initial.sql:42-50`

**Impacto**

Tras cerrar C-01, un actor aún podría presentar un derivado no canónico como sanitizado, provocar consumo de memoria/disco/event loop o dejar residuos fuera de la base. La exposición de paths reabre metadata que otra ruta trata como sensible.

**Juicio**

High porque afecta la frontera de clasificación de datos; los problemas de tamaño/atomicidad serían Medium de forma aislada.

**Recomendación**

Hacer que sólo el sanitizer server-side cree lineage, con regla/version/digest verificables; prohibir `sanitizedFrom` en la API pública. Añadir límites y streaming, FK de trace, cleanup compensatorio y un único DTO público sin paths internos.

#### M-01 — Los contratos JSON publicados no describen el runtime

**Hechos observados**

- Task schema requiere `repo` y estados como `queued/running/blocked`; runtime acepta repo opcional y crea estado `pending`, coherente con DB pero no con el schema.
- Message schema publica `from`/`to`; runtime expone `fromId`/`toId`.
- Artifact schema requiere `path`, limita `kind` y no representa el DTO público con `content`; la tool oculta path.
- Las pruebas validan fixtures construidos manualmente, no outputs reales de tools/services.
- La conversión artesanal Zod→JSON Schema inspecciona `_def` privado y pierde parte de constraints.

**Evidencia**

- `schemas/task.schema.json:7-17`
- `gateway/src/services/task_service.js:81-90`
- `gateway/migrations/001_initial.sql:19-27`
- `schemas/message.schema.json:7-15`
- `gateway/src/tools/message.js:11-20`
- `schemas/artifact.schema.json:7-30`
- `tests/gateway/schemas.test.js:41-59`
- `gateway/src/core/tool_helpers.js:11-41`

**Impacto**

Consumidores y agentes pueden generar/esperar payloads incompatibles; los tests verdes no detectan la deriva. El generador depende además de internals de una librería.

**Juicio**

Medium: no se confirmó un fallo de producción inmediato, pero la deriva compromete interoperabilidad y hace engañosa la documentación de contratos.

**Recomendación**

Elegir una fuente canónica por DTO y generar la otra representación con una API estable. Validar en tests las respuestas reales de cada tool contra su schema publicado y versionar cambios incompatibles.

#### M-02 — Las máquinas de estado y secuencias de persistencia permiten estados inválidos

**Hechos observados**

- Orchestration status se actualiza sin tabla explícita de transiciones; una orchestration terminal puede volver a estados activos.
- Task assignment comprueba existencia del trace, no que la orchestration admita nuevas tasks.
- Session se arranca antes de persistirse y artifact se escribe antes de la fila DB.
- `artifacts.trace_id` y `sessions.trace_id` no expresan por FK la pertenencia esperada al trace/task.
- SQLite sí habilita FK/WAL y migrations transaccionales, pero esas garantías no cubren efectos de proceso/filesystem.

**Evidencia**

- `gateway/src/services/orchestration_service.js:58-89`
- `gateway/src/services/task_service.js:46-53`
- `gateway/src/services/agent_service.js:145-180`
- `gateway/src/core/artifact_store.js:85-110`
- `gateway/migrations/001_initial.sql:30-50`
- `gateway/src/core/state.js:19-38`
- `gateway/src/core/state.js:70-76`
- `tests/gateway/orchestration_service.test.js:87-128`

**Impacto**

El modelo acepta histories imposibles y deja recursos huérfanos en fallos parciales. Los tests cubren principalmente transiciones felices.

**Juicio**

Medium; parte del lifecycle de sesiones eleva H-03, mientras el resto es deuda de consistencia recuperable.

**Recomendación**

Definir tablas de transición por agregado, constraints/FK donde SQLite lo permita y patrones `reserve → effect → commit/compensate`. Añadir recovery al arranque para filas `starting` y archivos/procesos huérfanos.

#### M-03 — Las integraciones opcionales no forman parte del release gate

**Hechos observados**

- CI no arranca Redis, Postgres ni Temporal.
- Los tests Redis live se saltan sin `AGENTS_TEST_REDIS_URL`.
- Postgres y Temporal crash recovery son opt-in/skip por defecto.
- El e2e con agentes reales depende de variables y binarios externos y queda fuera del gate.
- `scripts/ci.sh` documenta el e2e real como opcional.

**Evidencia**

- `.github/workflows/ci.yml:21-48`
- `tests/gateway/coordination_queue_send_live.test.js:67-70`
- `tests/gateway/postgres_state.test.js:16-55`
- `orchestrator-langgraph/tests/test_temporal_crash_recovery.py:1-40`
- `tests/e2e/mcp_two_agent_real.test.js:13-24`
- `tests/e2e/mcp_two_agent_real.test.js:60`
- `scripts/ci.sh:28-30`

**Impacto**

La lógica Lua, diferencias de driver, recovery durable y compatibilidad real de CLIs pueden romperse en `develop` sin señal obligatoria. Para V5 Redis, esto afecta una capacidad anunciada, no sólo prototipos.

**Juicio**

Medium: hay tests y diseño explícito, pero su señal no protege cada merge. Redis V5 merece gate obligatorio; Postgres/Temporal pueden permanecer scheduled mientras sigan experimentales.

**Recomendación**

Crear lane Redis obligatorio con service container y pruebas de fencing/concurrencia; lane Postgres/Temporal scheduled y required antes de promoverlos. Mantener un smoke real de adapters en entorno controlado, separado de PRs si coste/credenciales lo exigen.

#### M-04 — CI no reproduce el grafo Python bloqueado y deja código fuera de lint

**Hechos observados**

- El lock declara haber sido compilado para Python 3.13.
- CI usa Python 3.11 e instala editables con `pip install`, sin sincronizar `requirements.lock`.
- El lint de Gateway se ejecuta desde `gateway/` sobre `src tests scripts`, mientras gran parte de tests/scripts está en la raíz.
- Ruff cubre paquetes Python, no todo el Python de estructura/tests raíz.
- El lock npm sí existe y CI usa `npm ci`.

**Evidencia**

- `requirements.lock:1-2`
- `README.md:17-34`
- `.github/workflows/ci.yml:32-48`
- `gateway/package.json:8-13`
- `scripts/ci.sh:7-9`

**Impacto**

Dos ejecuciones de CI pueden resolver dependencias Python diferentes y código ejecutable puede no pasar lint. El lock ofrece una confianza que el gate no consume.

**Juicio**

Medium por reproducibilidad y DevEx; no se verificó que exista actualmente una dependencia vulnerable o incompatible.

**Recomendación**

Alinear versión Python y lock, usar sync determinista en CI y añadir un check que regenere/verifique el lock. Ejecutar lint desde root con globs explícitos para toda la superficie.

#### M-05 — Coordinación V5 mezcla dominio, Lua, transporte y lifecycle de conexión

**Hechos observados**

- `coordination_queue.js` supera 2.100 líneas e incluye alrededor de mil líneas de Lua además de validación, encoding, backend memory y Redis.
- `coordination_service.js` supera 1.200 líneas y concentra numerosos casos de uso.
- El helper Redis crea, conecta y destruye cliente por operación.
- Discovery recorre el conjunto completo de participantes para construir la respuesta.
- A la vez, las operaciones emplean validación estricta, fencing y scripts atómicos, una base sólida que no conviene reescribir.

**Evidencia**

- `gateway/src/core/coordination_queue.js:58-115`
- `gateway/src/core/coordination_queue.js:1023-1028`
- `gateway/src/core/coordination_queue.js:1589`
- `gateway/src/core/coordination_queue.js:1719-1805`
- `gateway/src/core/coordination_queue.js:2140-2170`
- `gateway/src/services/coordination_service.js:801-850`
- `gateway/src/services/coordination_service.js:854-1281`

**Impacto**

La revisión y evolución son costosas, un cambio cruza capas y cada heartbeat/send puede pagar handshake de conexión. El scan de discovery limita escala si crece el número de participantes.

**Juicio**

Medium. No hay medición que pruebe un cuello de botella actual; la conclusión de rendimiento es una inferencia directa del lifecycle por operación y debe validarse con benchmark.

**Recomendación**

Extraer scripts Lua versionados, codec/modelo, backend memory y backend Redis detrás de una interfaz; reutilizar un pool/cliente con lifecycle del Gateway. Medir p95 y cardinalidad antes de optimizar discovery.

#### M-06 — La idempotencia de activities Temporal desaparece al reiniciar el worker

**Hechos observados**

- Activities generan IDs deterministas pero guardan resultados en un diccionario en memoria.
- Un crash borra el cache y un retry at-least-once puede repetir delegate, approval o escritura.
- La documentación reconoce explícitamente el límite y que Gateway no recibe idempotency keys durables.
- El componente está etiquetado como experimental.

**Evidencia**

- `orchestrator-langgraph/src/orchestrator_langgraph/activities.py:127-139`
- `orchestrator-langgraph/src/orchestrator_langgraph/activities.py:295-335`
- `docs/v1-temporal-worker.md:19-33`
- `docs/v1-temporal-worker.md:49-61`

**Impacto**

Tras un crash en la ventana equivocada, el workflow puede duplicar side effects aunque Temporal reintente correctamente.

**Juicio**

Medium por el estatus experimental; sería High antes de declarar esta ruta production-ready.

**Recomendación**

No promocionar Temporal hasta que Gateway acepte idempotency keys persistentes con unique constraints y devuelva el resultado previo. Mantener el cache local sólo como optimización.

#### M-07 — Singletons mutables y accesos cruzados erosionan las capas

**Hechos observados**

- State, audit, artifact root/sanitizer y reglas de sanitizer se configuran mediante variables de módulo.
- Tools como artifact combinan validación, repositorio, storage, policy y DTO público.
- El paquete Gateway ejecuta tests serializados, compatible con el riesgo de estado global compartido.
- El directorio de infraestructura no concentra estas dependencias; DB/filesystem/audit permanecen mezclados en core.

**Evidencia**

- `gateway/src/core/state.js:7`
- `gateway/src/core/audit.js:9`
- `gateway/src/core/artifact_store.js:9-10`
- `gateway/src/core/sanitizer.js:3`
- `gateway/src/tools/artifact.js:60-112`
- `gateway/package.json:12`

**Impacto**

Tests paralelos, múltiples instancias/configuraciones y sustitución de backends requieren mutar estado global; los boundaries nominales no siempre son composables.

**Juicio**

Medium por mantenibilidad/testabilidad, no una exigencia de “arquitectura enterprise”. En una aplicación local monoproceso, algunos singletons son razonables, pero deben encapsularse en un composition root.

**Recomendación**

Crear `GatewayContext`/factory con repos, clock, audit, policy y adapters inyectados; mantener un singleton sólo en el entrypoint. Mover lógica de artifact a service y dejar tools como validación/mapping.

#### L-01 — Higiene de dependencias, packaging y metadata

**Hechos observados**

- Ajv y `ajv-formats` aparecen como runtime dependencies del Gateway, aunque el uso observado está en pruebas de schemas.
- GitHub Actions usa tags de versión, no SHAs inmutables.
- README habla de V5 y release actual, mientras descripciones de package/CLI aún mencionan V4.
- El CLI deriva el repo root y ejecuta scripts Node del checkout; el wheel sólo empaqueta `agents_cli`, por lo que no es autónomo fuera del monorepo.

**Evidencia**

- `gateway/package.json:17-23`
- `.github/workflows/ci.yml:21-35`
- `cli/src/agents_cli/main.py:21-25`
- `cli/pyproject.toml:22-27`
- `cli/src/agents_cli/gateway_client.py:56-82`
- `README.md:1-8`

**Impacto**

Instalaciones ligeramente mayores, supply-chain menos fijada, expectativas confusas y un paquete CLI que puede instalarse correctamente pero no operar fuera del checkout.

**Juicio**

Low mientras la distribución soportada sea explícitamente editable/monorepo. Si se promete un CLI standalone, packaging subiría a Medium.

**Recomendación**

Mover dependencias sólo-test, fijar Actions por SHA con actualización automatizada, alinear metadata y decidir/documentar si el CLI es monorepo-only o debe incluir/localizar el Gateway.

### 3.4 Fortalezas que conviene preservar

1. **Coordinación defensiva:** schemas `.strict()`, validación de dominio, comparación constant-time de tokens, fencing y Lua atómico reducen carreras y entradas ambiguas (`gateway/src/tools/coordination.js:10-64`, `gateway/src/services/coordination_service.js:801-850`).
2. **Persistencia local sólida:** SQLite activa foreign keys y WAL, y aplica migrations en transacción (`gateway/src/core/state.js:19-38`, `gateway/src/core/state.js:70-76`).
3. **Actualización CAS de approval:** la transición de estado usa condición sobre el estado previo, evitando doble decisión concurrente (`gateway/src/core/repositories/approval_repo.js:68-79`).
4. **Token de trace:** la validación HMAC usa comparación timing-safe y secret local configurable (`gateway/src/core/trace_access.js:9-19`).
5. **Sanitización canónica fail-closed:** para restricted/raw, la lectura exige derivado cuando el flujo server-side se usa correctamente; es una base adecuada para reforzar provenance.
6. **Telemetría prudente:** OTel limita atributos y registra tipo de excepción, no prompts completos (`gateway/src/core/telemetry.js:68-105`, `gateway/src/core/telemetry.js:187-210`).
7. **Suite amplia y orientada a regresiones:** existe cobertura explícita de matrices de policy, bypasses, persistencia, adapters, schemas y coordinación, aunque falten los adversariales indicados y gates live.
8. **Documentación técnica honesta en lo experimental:** ADRs y docs explican decisiones y límites, incluido Temporal; esta disciplina facilitará una migración segura.
9. **Guard de CWD por `realpath`:** bloquea escapes triviales `..` y symlink en el CWD inicial (`gateway/src/adapters/base_adapter.js:20-39`); debe conservarse como una capa, sin confundirla con sandbox.

## 4. Improvement Strategy

### 4.1 Tema A — Autoridad propiedad del servidor

**Estado objetivo**

- Cada llamada recibe un `RequestContext` creado por el Gateway: principal, tipo de actor, scopes/capabilities, trace y session.
- Los argumentos funcionales no contienen campos que alteren autorización.
- Toda lectura/escritura se scopea en repositorio; no hay lookup global expuesto por DTO público.
- Approval conserva request inmutable y produce un grant específico, expirante y de un solo uso.
- Acciones desconocidas fallan closed.

**Trade-off**

No hace falta introducir IAM cloud, cuentas multiusuario ni un identity provider para un producto local-first. Capabilities locales de alta entropía, separadas por trace/session y un canal operador explícito son suficientes si el modelo de despliegue sigue siendo monousuario.

**Métricas de terminado**

- Cero campos `callerRole`/`requesterRole` usados en decisiones de autorización.
- 100% de queries de artifacts/messages/sessions verifican scope server-side.
- Tests de role spoof, cross-trace y actor forging fallan closed.
- 100% de acciones protegidas consumen exactamente un grant enlazado a `(trace, task, action, repo, target, digest)`.
- Cero acciones desconocidas permitidas después del periodo shadow.

### 4.2 Tema B — Ejecución supervisada y cancelable

**Estado objetivo**

- Un `ProcessSupervisor` único lanza argv sin shell, mantiene PID/process group, readiness, liveness y estado.
- tmux ejecuta el binario directamente y la pane muere con él; nunca queda un shell que reciba prompts.
- El timeout cancela y verifica la terminación del proceso dentro de un grace definido.
- Cada sesión tiene workspace/capabilities mínimos y paths excluidos realmente inaccesibles.
- Task/acción/prompt digest quedan vinculados al proceso y a los gates que median efectos sensibles.

**Trade-off**

El sandbox más fuerte puede variar por plataforma. Debe definirse un mínimo portable y un perfil reforzado Linux; no conviene prometer aislamiento sólo con CWD ni bloquear toda la entrega esperando una solución universal.

**Métricas de terminado**

- Cero `spawnSync` en handlers MCP.
- El proceso se detiene dentro de `timeout + grace` en pruebas de integración.
- Heartbeat/approval responden dentro de SLO mientras un agente headless trabaja.
- Un prompt enviado después de la salida del CLI nunca alcanza un shell.
- Pruebas por adapter demuestran que paths excluidos no se pueden leer/escribir.

### 4.3 Tema C — Contratos e invariantes ejecutables

**Estado objetivo**

- Una sola fuente canónica genera JSON Schema, validación runtime y tipos/DTO.
- Tasks, orchestrations, sessions y approvals tienen máquinas de estado explícitas.
- Los efectos externos siguen `reserve → execute → commit/compensate`.
- DB expresa las relaciones que sí son invariantes y recovery limpia estados intermedios.

**Trade-off**

No se recomienda reescribir todas las capas ni sustituir SQLite. La mejora debe empezar por los agregados críticos y mantener el backend local, que es apropiado para el producto.

**Métricas de terminado**

- 100% de respuestas reales de tools validan el schema publicado.
- Cero transición terminal→activa no declarada.
- Dos tasks con mismo agent/role/trace mantienen sesiones distintas.
- Pruebas de fallo entre reserve/effect/commit dejan cero procesos y archivos huérfanos.

### 4.4 Tema D — Release confidence reproducible

**Estado objetivo**

- CI consume los lockfiles que el repositorio declara canónicos.
- Redis V5 corre en cada PR; Postgres/Temporal corren scheduled hasta su promoción.
- La suite adversarial cubre identidad, approvals, tmux y límites de payload.
- Lint y checks estructurales abarcan todo el código ejecutable.

**Trade-off**

Los e2e con proveedores reales pueden seguir fuera de PR por coste/credenciales, pero deben ejecutarse periódicamente en un entorno controlado y producir una señal visible.

**Métricas de terminado**

- Resolver dependencias Python dos veces produce el mismo grafo.
- Lane Redis obligatorio verde en cada merge.
- Cero skip silencioso de una feature marcada estable.
- Todos los archivos JS/Python ejecutables quedan incluidos en lint.

### 4.5 Tema E — Modularidad gradual de V5 y durabilidad experimental

**Estado objetivo**

- Lua, codecs, dominio y backends de coordinación son módulos separados con contratos comunes.
- Redis reutiliza conexiones y expone métricas de p50/p95/error/cardinalidad.
- Idempotency keys son durables antes de promocionar Temporal.
- Dependencias y config se inyectan desde un composition root.

**Trade-off**

No reescribir los scripts Lua bien probados ni productizar Postgres/Temporal por inercia. Si V1 sigue experimental, basta con mantener explícitos sus límites; la inversión durable debe preceder, no seguir, a su promoción.

**Métricas de terminado**

- Una conexión/pool por lifecycle, no una conexión por operación.
- Benchmarks documentan p95 de send/receive/heartbeat/discover con cardinalidades objetivo.
- Retry tras restart devuelve el mismo resultado por idempotency key.
- Tests unitarios pueden crear dos `GatewayContext` aislados en el mismo proceso.

## 5. Task Plan

### 5.1 Convenciones

- **S:** hasta 2 días.
- **M:** 3–5 días.
- **L:** 1–2 semanas.
- **XL:** debe descomponerse antes de implementación; estimación inicial superior a 2 semanas.
- Riesgo de cambio indica probabilidad de regresión/compatibilidad, no severidad del hallazgo.

### M0 — Safety net y decisiones irreversibles

#### T0.1 — Suite adversarial de caracterización

**Descripción:** añadir tests que reproduzcan role spoof, lookup cross-trace, `approval.respond` por agente, autoapprove de `git.push` a rama protegida, prompt tras muerte del CLI, payloads grandes y dos sesiones homónimas. Primero deben demostrar el comportamiento vulnerable y convertirse en criterios de cierre.

- Archivos: `tests/e2e/bypass_regression.test.js`, `tests/gateway/*approval*`, `tests/gateway/*supervised*`, nuevos fixtures de integración.
- Aceptación: cada escenario tiene test con expected seguro claramente marcado; no depende de red ni proveedores reales salvo un lane aislado.
- Esfuerzo: M.
- Riesgo de cambio: Bajo.
- Dependencias: ninguna.

#### T0.2 — Definir principal, capability y grant canónicos

**Descripción:** documentar el trust boundary real y el contrato mínimo de `RequestContext`, capability de trace/session y approval grant; resolver si el único principal humano llega por transporte separado o token local.

- Archivos: `docs/threat-model.md`, ADR nuevo, contratos de tools relevantes.
- Aceptación: ninguna decisión de autorización futura depende de un rol libre; el ADR incluye lifecycle, expiración, revocación y compatibilidad.
- Esfuerzo: M.
- Riesgo de cambio: Medio.
- Dependencias: respuesta a Open Questions 1–3.

#### T0.3 — Baseline CI reproducible y lanes

**Descripción:** fijar la versión Python objetivo, verificar el lock y separar lanes local, Redis-required y experimental-scheduled antes de tocar semántica.

- Archivos: `.github/workflows/ci.yml`, `scripts/ci.sh`, `requirements.lock`, configuración de tests.
- Aceptación: lane local determinista; Redis real obligatorio; Postgres/Temporal visibles como scheduled; skips se reportan.
- Esfuerzo: M.
- Riesgo de cambio: Bajo.
- Dependencias: disponibilidad de imágenes/service containers.

### M1 — Cierre de riesgos Critical/High de ejecución

#### T1.1 — Introducir `RequestContext` y scope server-side

**Descripción:** crear el contexto en el boundary MCP, retirar campos de identidad/rol de schemas autorizativos y scopear artifact, orchestration, message, session y task en service/repository.

- Archivos: `gateway/src/index.js` o entrypoint equivalente, `gateway/src/tools/*.js`, `gateway/src/services/*.js`, `gateway/src/core/repositories/*.js`, migrations si se requieren capabilities.
- Aceptación: tests C-01 fallan closed; no existe lookup público de artifact sólo por ID; actor/role de audit provienen del contexto.
- Esfuerzo: XL, dividir por agregado.
- Riesgo de cambio: Alto por compatibilidad de API.
- Dependencias: T0.1, T0.2.

#### T1.2 — Convertir approval en grant inmutable y consumible

**Descripción:** separar request, decision y note; autenticar la respuesta de operador; normalizar acción/repo/branch con policy; emitir un nonce/grant transaccional que la operación protegida consume una sola vez.

- Archivos: `gateway/src/tools/approval.js`, `gateway/src/services/approval_service.js`, `gateway/src/core/repositories/approval_repo.js`, `gateway/src/core/policy_engine.js`, migrations, workflows Python.
- Aceptación: agente/orchestrator no puede responder; `git.push` a rama protegida nunca autoaprueba; replay, cambio de target y decisión doble fallan; payload original permanece intacto.
- Esfuerzo: L.
- Riesgo de cambio: Alto.
- Dependencias: T0.1, T0.2, T1.1.

#### T1.3 — Enlazar task y capabilities con los efectos ejecutables

**Descripción:** persistir acción normalizada, prompt digest, repo/workspace y capabilities en la task/session; retirar credenciales/capacidades directas y mediar push, cambios de dependencias y paths protegidos mediante gates que consuman T1.2.

- Archivos: `gateway/src/services/task_service.js`, `gateway/src/services/agent_service.js`, adapters, policy, migrations y wrappers de comandos.
- Aceptación: declarar `code.read` no permite escribir/push; alterar prompt/target invalida el grant; los paths excluidos son inaccesibles en tests por adapter.
- Esfuerzo: XL, descomponer por clase de efecto.
- Riesgo de cambio: Alto.
- Dependencias: T1.1, T1.2.

#### T1.4 — `ProcessSupervisor` asíncrono y tmux fail-closed

**Descripción:** sustituir lanzamientos síncronos y líneas shell por argv directo, modelar estados/process groups/readiness y hacer cancelación real; tmux debe terminar con el CLI y validar instancia antes de cada ask.

- Archivos: `gateway/src/adapters/base_adapter.js`, `*_adapter.js`, `tmux_client.js`, `gateway/src/services/_with_timeout.js`, config.
- Aceptación: cero `spawnSync`; timeout mata descendientes dentro del grace; el Gateway sigue respondiendo; prompt post-exit se rechaza; paths con espacios/metacaracteres son seguros.
- Esfuerzo: L.
- Riesgo de cambio: Alto.
- Dependencias: T0.1.

#### T1.5 — Lifecycle y unicidad transaccional de sesiones

**Descripción:** reservar session UUID/target antes del spawn, validar tuple task/trace/agent/role, compensar fallos y añadir recovery de estados intermedios.

- Archivos: `gateway/src/services/agent_service.js`, `gateway/src/adapters/session_naming.js`, repositorio/session migration, tools de session.
- Aceptación: dos sesiones iguales en trace/agent/role coexisten; fallo DB no deja tmux/proceso; ask/kill con trace distinto se rechaza; restart recupera `starting`.
- Esfuerzo: M.
- Riesgo de cambio: Medio.
- Dependencias: T1.1, T1.4.

### M2 — Hardening de datos, contratos y operación

#### T2.1 — Migrar policy a default-deny

**Descripción:** inventariar acciones, completar allowlists, introducir shadow mode con eventos y activar rechazo de desconocidas tras observar compatibilidad.

- Archivos: `gateway/src/core/policy_engine.js`, `policies/roles.json`, tests de matriz, ADR.
- Aceptación: toda acción registrada tiene owner/clasificación; unknown deny en modo enforcement; cero denies legítimos durante ventana shadow acordada.
- Esfuerzo: L.
- Riesgo de cambio: Alto.
- Dependencias: T1.1, telemetría shadow.

#### T2.2 — Provenance, límites y atomicidad de artifacts/messages

**Descripción:** retirar `sanitizedFrom` público, firmar/versionar lineage server-side, fijar máximos/streaming, unificar DTO y añadir cleanup/reconciliation de filesystem.

- Archivos: `gateway/src/tools/artifact.js`, `artifact_store.js`, artifact/message services/repos, schemas y migrations.
- Aceptación: derivado falso se rechaza; límites se aplican antes de Buffer/write; ningún DTO expone path; fault injection deja cero huérfanos.
- Esfuerzo: L.
- Riesgo de cambio: Medio.
- Dependencias: T1.1.

#### T2.3 — Audit minimizado y autoritativo

**Descripción:** eliminar prompt preview, usar metadata allowlisted/digest, derivar attribution de `RequestContext`, hacer fail-closed sinks remotos y añadir rotación/retención.

- Archivos: adapters, `gateway/src/core/audit.js`, config, docs y tests.
- Aceptación: secretos fixture no aparecen en JSONL/Redis/OTel; eventos no aceptan actor/trace libre; policy de retención probada.
- Esfuerzo: M.
- Riesgo de cambio: Bajo.
- Dependencias: T1.1.

#### T2.4 — Contrato único y máquinas de estado

**Descripción:** escoger schema runtime canónico, generar JSON Schema estable, validar respuestas reales y formalizar transiciones de orchestration/task/session/approval.

- Archivos: `schemas/*.json`, schemas Zod, DTO mappers, services, migrations y tests contractuales.
- Aceptación: 100% de outputs públicos validan; fixtures manuales dejan de ser la única prueba; transiciones inválidas retornan error tipado.
- Esfuerzo: L.
- Riesgo de cambio: Medio.
- Dependencias: T0.2, T1.1.

#### T2.5 — Completar reproducibilidad, lint y gates live

**Descripción:** consolidar T0.3 en el gate definitivo, incluir todo el árbol ejecutable en lint, pinnear Actions por SHA y automatizar updates/scans.

- Archivos: workflows, scripts, manifests/locks, configuración ESLint/Ruff.
- Aceptación: instalación sólo desde lock; root lint sin huecos; Redis lane required; reporte SBOM/license/CVE generado sin findings Critical sin triage.
- Esfuerzo: M.
- Riesgo de cambio: Bajo.
- Dependencias: T0.3.

### M3 — Escala, modularidad y polish

#### T3.1 — Extraer módulos de coordinación y reutilizar conexión Redis

**Descripción:** separar Lua, codec, modelo y backends sin cambiar semántica; introducir cliente/pool por lifecycle y benchmark antes/después.

- Archivos: `gateway/src/core/coordination_queue.js`, nuevos módulos de coordinación, factory/config, tests live.
- Aceptación: paridad de todos los tests; una conexión/pool reutilizado; p95 no empeora y handshake por operación desaparece.
- Esfuerzo: L.
- Riesgo de cambio: Medio.
- Dependencias: lane Redis T0.3/T2.5.

#### T3.2 — Inyección de dependencias desde composition root

**Descripción:** encapsular state/audit/policy/artifacts/adapters en `GatewayContext`; adelgazar tools y mover casos de uso a services sin reescritura masiva.

- Archivos: entrypoint Gateway, módulos globales de core, tools/services.
- Aceptación: dos contextos aislados funcionan en un proceso; tests dejan de requerir orden serial por estado global; tools sólo validan/mapean.
- Esfuerzo: L.
- Riesgo de cambio: Medio.
- Dependencias: T1.1, T2.4.

#### T3.3 — Idempotencia durable antes de promocionar Temporal

**Descripción:** aceptar idempotency key en Gateway, persistir outcome con unique constraint y hacer activities reentrantes tras restart.

- Archivos: activities Python, tools/services Gateway, repositorios/migrations, tests de crash recovery.
- Aceptación: retry después de restart no duplica efectos; misma key/payload devuelve outcome y misma key/payload distinto se rechaza.
- Esfuerzo: L.
- Riesgo de cambio: Medio.
- Dependencias: decisión de promoción de V1, T2.4.

#### T3.4 — Resolver packaging y deriva documental

**Descripción:** decidir CLI monorepo-only vs standalone, alinear metadata V5, mover dependencias de test y documentar claramente estabilidad por componente.

- Archivos: `cli/pyproject.toml`, CLI paths/resources, `gateway/package.json`, README y docs de instalación.
- Aceptación: instalación soportada funciona en entorno limpio; versiones/descripciones coinciden; Ajv queda en el grupo correcto.
- Esfuerzo: M.
- Riesgo de cambio: Bajo.
- Dependencias: decisión de producto/distribución.

### 5.2 Quick wins

| Quick win | Impacto | Esfuerzo | Nota |
|---|---|---|---|
| Dejar de guardar los 200 caracteres de prompt en audit. | Alto en privacidad | S | No sustituye attribution server-side. |
| Añadir `sessionId`/nonce al target tmux. | Alto en concurrencia | S | Debe acompañarse después de lifecycle transaccional. |
| Pasar temporalmente `agentTimeoutMs` al timeout nativo de spawn. | Alto en contención | S | Sólo mitigación; `spawnSync` seguirá bloqueando hasta T1.4. |
| Limitar artifact/message/prompt antes de alloc/write. | Alto en disponibilidad | S | Elegir límites configurables y documentados. |
| Deshabilitar por defecto `approval.respond` en el transporte de agentes hasta disponer de principal operador. | Alto en seguridad | S | Puede requerir un flujo manual alternativo explícito. |
| Mover Ajv/ajv-formats a devDependencies y alinear metadata V5. | Bajo | S | Cambio mecánico. |
| Añadir tests de outputs runtime contra schemas existentes. | Medio | S–M | Hará visible la deriva antes de rediseñarla. |

### 5.3 Bocetos de implementación de las tres recomendaciones principales

#### Boceto 1 — Principal y approval grant

```text
Transporte autenticado/local capability
        │
        ▼
RequestContext (server-owned)
  principalId, actorKind, traceScope, capabilities
        │
        ├── artifactRepo.getScoped(id, traceScope)
        └── policy.evaluate(action normalizada, resource server-owned)

ApprovalRequest inmutable
  hash(trace, task, action, repo, target, promptDigest)
        │ decisión operador
        ▼
ApprovalGrant { nonce, expiresAt, requestHash, consumedAt=null }
        │ transacción al ejecutar
        ▼
UPDATE grant SET consumedAt=now
WHERE nonce=? AND requestHash=? AND consumedAt IS NULL AND expiresAt>now
```

Regla clave: un payload nunca puede elevar su propio `actorKind`, rol, clasificación o scope.

#### Boceto 2 — Supervisor de procesos y tmux seguro

```javascript
const child = spawn(binary, args, {
  cwd: workspace,
  env: restrictedEnv,
  shell: false,
  detached: true,
  signal: abortController.signal,
});
```

- Crear sesión tmux como `tmux new-session -d -s <sessionId> -- <launcher>`, donde `<launcher>` hace `execve` del CLI y termina con él.
- Persistir PID, instance token y estado `starting/running/exited`; `ask` verifica los tres antes de escribir.
- En timeout: marcar `cancelling`, enviar TERM al process group, esperar grace, enviar KILL y confirmar exit.
- Hacer que credenciales de push y rutas protegidas no estén presentes en el entorno del agente; los wrappers autorizados consumen el grant del Boceto 1.

#### Boceto 3 — Reserva y compensación de sesión

```text
BEGIN
  cargar task por ID
  verificar task.trace == context.trace y estado asignable
  insertar session UUID, target único, estado=starting
COMMIT
        │
        ▼
spawn mediante ProcessSupervisor
   ├── éxito → CAS starting→running + PID/token
   └── fallo  → CAS starting→failed + kill/cleanup idempotente

startup recovery:
  para cada starting/cancelling antiguo
  reconciliar DB ↔ proceso/tmux ↔ workspace
```

El patrón debe reutilizarse para artifact filesystem/DB: reservar metadata temporal, escribir con nombre temporal, fsync/rename, confirmar fila y reconciliar residuos.

## 6. Open Questions

1. ¿Qué proceso puede invocar hoy las tools MCP: sólo una UI/operador confiable, el orquestador LLM, o también agentes delegados? La respuesta cambia la explotabilidad inmediata de C-01/C-02, no la inconsistencia del boundary.
2. ¿Cómo se autentica actualmente una persona al responder `approval.respond` y cómo se impide que la misma credencial llegue al agente?
3. ¿Los CLIs se ejecutan dentro de un contenedor/sandbox externo no visible en el repositorio, o comparten usuario y filesystem con el Gateway?
4. ¿Qué operaciones concretas deben poder realizar los agentes sin wrapper: escritura de código, instalación, git commit, push, acceso de red y lectura de secretos?
5. ¿Existe una obligación de retención, borrado o clasificación para prompts, audit JSONL y artifacts?
6. ¿Redis V5 se considera estable/required en producción o aún opt-in? Esto determina si M-03 debe subir a High.
7. ¿Postgres/Temporal tienen fecha de promoción? Si no, conviene evitar inversión de producción salvo aislamiento y claridad contractual.
8. ¿Debe `agent-run` funcionar como wheel standalone o sólo desde un checkout editable del monorepo?
9. ¿Qué ventana de compatibilidad se acepta para retirar campos `callerRole/requesterRole` y migrar a default-deny?
10. ¿Cuáles son los SLO y cardinalidades objetivo de coordinación (participantes por trace, heartbeat rate, tamaño de body, p95)?


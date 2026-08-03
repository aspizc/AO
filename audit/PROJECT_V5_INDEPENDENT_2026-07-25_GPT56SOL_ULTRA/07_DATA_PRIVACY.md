# Auditoría independiente de datos, calidad, privacidad y gobernanza — PROJECT V5

Model: gpt-5.6-sol
Reasoning: ultra
Execution profile: fast/priority
Snapshot: `develop` @ `d521afb12a6520b95f1a9fb172911b16ab77a1ff`
Independence: revisión independiente del snapshot; no se leyeron ni reutilizaron auditorías, reviews o informes previos.
Fecha: 2026-07-25

## Alcance y método

La revisión cubre modelos, contratos, flujos y configuración de datos del Gateway, `orchestrator-langgraph`, SQLite/Postgres, filesystem, JSONL, Redis, Temporal, procesos CLI/tmux y telemetría. Se inspeccionaron exclusivamente schemas, migraciones, código, configuración, documentación operativa y fixtures sintéticos. No se leyó, muestreó, movió ni exportó ningún registro personal real; tampoco se conectó a Redis, Postgres, Temporal, MCP ni a proveedores externos, no se ejecutaron migraciones y no se modificó el snapshot.

Las clasificaciones `PII` o `sensible` que aparecen a continuación describen la **capacidad del campo o flujo para contener esos datos**, no prueban que existan registros reales. Cada hallazgo separa hechos observables de juicio de riesgo. Las referencias a GDPR, CCPA u otros marcos son preguntas de alcance y controles a validar con privacy/legal counsel; este documento no es una opinión legal ni una certificación de cumplimiento.

## Executive Summary

1. **Calificación general: D**: la base técnica tiene controles útiles de clasificación, scope y minimización de telemetría, pero no dispone de un ciclo de vida gobernado para los datos potencialmente personales o confidenciales.
2. **Exposición/compliance, sin conclusión legal:** no se observó una fuga real porque no se inspeccionaron registros, pero el snapshot no permite sostener una postura demostrable de minimización, retención, borrado, residencia o derechos del interesado si entran datos personales.
3. **Riesgo 1:** no existe una ruta de borrado end-to-end ni retención aplicada para SQL, artifacts, JSONL audit, Temporal y varios Streams de Redis.
4. **Riesgo 2:** prompts y resultados completos, incluidos `stdout`/`stderr`, pueden multiplicarse en Temporal y en checkpoints plaintext clasificados por defecto como `internal`, sin saneado previo.
5. **Riesgo 3:** la clasificación y parte del control de acceso dependen de etiquetas, roles e IDs aportados por el caller, un límite insuficiente fuera del modelo declarado de una sola persona y host local de confianza.
6. **Oportunidad 1:** convertir `traceId`/`scopeId` en el eje de un inventario, autorización y borrado uniformes para todos los stores.
7. **Oportunidad 2:** reutilizar el patrón fuerte de V5 —fences, proyección audit allowlisted, token hash y TTL— para artifacts, approvals, mensajes legacy y checkpoints.
8. **Oportunidad 3:** reducir drásticamente copias persistidas guardando referencias y metadatos de resultados, con contratos canónicos y tests de lineage/retention.
9. No se confirmó ningún hallazgo Critical ni procesamiento regulado específico; su existencia y el alcance jurídico deben decidirse con counsel y los dueños del despliegue.

## Data Map

### 1. Clasificación usada en esta auditoría

El producto tiene una taxonomía técnica `unrestricted | internal | restricted` para repositorios, artifacts y mensajes V5, pero no una taxonomía de datos personales. Los repositorios se clasifican y asignan a agentes en `policies/repositories.json:3-39`; los artifacts aceptan esas tres etiquetas en `schemas/artifact.schema.json:24-28`; coordinación solo acepta `unrestricted` e `internal` en `schemas/coordination-message.schema.json:54-60`.

Para analizar privacidad se añade, sin cambiar el producto, esta lectura:

| Clase de auditoría | Ejemplos en este sistema | Observación |
|---|---|---|
| Pública / publicable | Código o docs de un repositorio realmente público, artifacts `unrestricted` verificados | `unrestricted` es una etiqueta del caller, no prueba de publicación segura. |
| Interna | Trace/task/session IDs, métricas agregadas, eventos de lifecycle body-free | Puede permitir correlación y revelar actividad operativa. |
| Confidencial | Código privado, diffs, prompts, goals, briefs, outputs, paths, approval context | Es la clase materialmente dominante. |
| PII potencial | Nombres/display names, `requestedBy`/`decidedBy`, notas humanas y texto libre en prompts, bodies, artifacts y logs | No hay detector, registro ni minimización específica de PII. |
| Sensible/regulada potencial | Secretos, credenciales o datos especiales introducidos accidentalmente en código/texto libre | No existe intención o evidencia de procesarlos; deben prohibirse o gobernarse explícitamente. |

### 2. Inventario de stores y realidad at-rest

| Store / modelo | Datos y sensibilidad potencial | Writer / reader y contrato | Realidad at-rest y ciclo de vida | Owner |
|---|---|---|---|---|
| SQLite por defecto / Postgres opcional | Orchestrations (`goal`), tasks, sessions, artifact metadata/path, mensajes legacy con `body`, policy decisions, approvals con identidad/contexto/nota | Migraciones en `gateway/migrations/001_initial.sql:9-89`; repositorios SQL en `gateway/src/core/repositories/*.js` | SQLite local con WAL y FK activadas (`gateway/src/core/state.js:70-76`) o Postgres por URL (`gateway/src/core/state.js:60-67`). Sin cifrado de aplicación, TTL, purge ni API de borrado. Cifrado de volumen, backups y HA no verificables desde el repo. | Steward técnico inferido: Gateway; **data owner formal no definido**. |
| Artifact filesystem | Bytes arbitrarios: código, diff, stacktrace, docs, test output, checkpoints y push intents; potencial PII/secretos | `artifact.put/get/list`, metadata en SQL; bytes en `<workspace>/artifacts` (`gateway/src/config.js:153-154`) | El raw se escribe plaintext antes del derivado saneado (`gateway/src/core/artifact_store.js:41-62,85-102`). No hay TTL, delete, explicit file mode ni cifrado. | Gateway como steward; owner y retention owner no definidos. |
| Audit JSONL local | Goals, briefs truncados, prompt prefix, IDs, paths/workspace, notas humanas, approval metadata/context en algunos eventos y errores | Append síncrono de todo el objeto (`gateway/src/core/audit.js:69-90`); query/CLI (`gateway/src/core/audit.js:248-273`) | Append-only funcional, pero sin rotación, TTL, compactación, integrity chain, borrado o explicit file mode. Es la copia local primaria y **no** pasa por la proyección saneada de Redis. | Gateway/operator como stewards inferidos; owner/retention no definidos. |
| Redis legacy `agents:events` opcional | Proyección saneada de metadata de audit no-V5 | `streamEnvelope` excluye keys restringidas y aplica sanitizer (`gateway/src/core/audit.js:171-230`) | `XADD` sin política de retention observable en el publisher (`gateway/src/core/audit.js:94-117`). Redis, TLS, ACL, persistencia y backups dependen del operador. | Gateway + operador de Redis; no owner formal. |
| Redis V5 coordination | Presence, display name/capabilities/metadata, token digest, inbox bodies, dedupe copies, ACK tombstones y body-free metadata events | Contrato de claves en `gateway/src/core/coordination_contract.js:69-96`; schema de participant/message; Lua atómico | Presence tiene lease TTL; dedupe y ACK, 24 h por defecto; inbox se borra al ACK o recibe TTL tras unregister/discovery de stale; events no tienen límite (`docs/coordination-bus.md:98-107,127-144`). Docker local usa AOF y volumen (`docker/docker-compose.yml:27-33`), por lo que “ephemeral” no significa “solo memoria”. | Cada participant es owner operacional de inbox, Redis es autoritativo; no hay data owner/DPO formal. |
| Temporal history | Workflow input con tres prompts, paths/repo/branch, activity payloads/results, approval signals y outputs | Worker en `orchestrator-langgraph/src/orchestrator_langgraph/worker.py:21-32,53-67`; input en `orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:60-84` | La propia documentación declara que la durabilidad de resume procede de Temporal history (`docs/v1-temporal-worker.md:35-47`). El código no configura namespace retention, payload codec, cifrado o borrado. | Operador de Temporal + equipo del orchestrator; owner formal no definido. |
| Checkpoint artifacts | Copia JSON de `state`, que incluye resultados de implement/test/review/approval/push | `checkpoint_activity` serializa el estado entero a `artifact.put` (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:256-293`) | Plaintext en artifact filesystem; `classification="internal"` por defecto (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:99-107`) y kind no sujeto al saneado raw. Sin delete/TTL. | Orchestrator/Gateway como stewards; owner no definido. |
| In-process activity cache | Respuestas completas del Gateway, incluido output de agentes | `_responses_by_cache_key` (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:135-140,295-335`) | Memoria hasta terminar el worker; no límite explícito ni zeroization. No sobrevive al restart. | Worker. |
| Subprocess / tmux / MCP stdout | Prompt en argv o send-keys; código accesible desde `cwd`; stdout/stderr y pane snapshot | Codex (`gateway/src/adapters/codex_adapter.js:32-38,218-253,336-365`), Claude (`gateway/src/adapters/claude_adapter.js:26-38,159-181,235-262`), Gemini (`gateway/src/adapters/gemini_adapter.js:91-121,169-196`) | Transitorio en memoria, process list, tmux scrollback y respuesta MCP; puede terminar persistido por Temporal, el MCP host o checkpoints. La persistencia del vendor no es controlada aquí; Claude sí usa `--no-session-persistence` en headless (`gateway/src/adapters/claude_adapter.js:26-38`). | Caller, host MCP y proveedor CLI; obligaciones no inventariadas. |
| Repositorio/worktree/git | Código, docs, tests y potenciales datos/secretos accidentales | Agentes reciben un `cwd` allowlisted; Codex aplica además excluded paths (`gateway/src/adapters/codex_adapter.js:128-143,187-193`) | Persistencia normal del repo y Git, fuera del store del Gateway pero dentro del flujo de tratamiento. Borrado/retention dependen del repositorio y sus backups/remotes. | Repo owner; no mapeado a data owner. |
| Message access secret file | Secreto HMAC para mensajes legacy | Creación/carga en `gateway/src/config.js:54-85`; HMAC en `gateway/src/core/trace_access.js:9-19` | Archivo local con modo `0600`, el único mode explícito observado (`gateway/src/config.js:69-72`). Sin rotación/versionado de claves. | Operador del Gateway. |

El `.gitignore` excluye artifacts, audit, secrets y state del workspace por defecto (`.gitignore:13-22`), una defensa útil contra commits accidentales. No cubre automáticamente un `AGENTS_WORKSPACE` personalizado ni otras copias como Temporal, Redis, logs del host o backups.

### 3. Linaje end-to-end por clase de datos

#### Prompts, goals y briefs

1. El caller introduce `goal`, `brief` o `prompt` por MCP (`gateway/src/tools/orchestration.js:10-21`, `gateway/src/tools/task.js:7-23`, `gateway/src/tools/agent.js:3-13,28-32`).
2. `goal` se persiste en SQL y entero en JSONL audit (`gateway/src/services/orchestration_service.js:17-42`); `brief` no va a SQL, pero sus primeros 500 caracteres van a audit (`gateway/src/services/task_service.js:92-102`).
3. El prompt de headless se pasa como argumento al CLI; el de sesión se envía a tmux. La entrada de sesión guarda hasta 200 caracteres en JSONL (`gateway/src/adapters/codex_adapter.js:61-69` y equivalentes Claude/Gemini).
4. En Temporal, `implement_prompt`, `test_prompt` y `review_prompt` forman parte del workflow input y activity payload (`orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:60-84,171-250`), por lo que participan en history.
5. Se comparten con el subprocess/vendor seleccionado; no hay finalidad, residency o retention del proveedor registrada en el repo.
6. No existe purge ni redacción retroactiva end-to-end.

#### Código y artifacts

1. El agente obtiene acceso al worktree mediante `cwd`; el policy registry clasifica el **repositorio**, no cada campo o dato (`policies/repositories.json:3-39`).
2. El caller puede persistir contenido arbitrario mediante `artifact.put`, eligiendo `kind` y `classification` (`gateway/src/tools/artifact.js:8-15,58-71`).
3. `artifact_store` escribe primero el raw y su metadata SQL; solo después, si es `restricted` y uno de tres raw kinds, crea un derivado saneado (`gateway/src/core/artifact_store.js:41-69,85-110`; raw kinds en `gateway/src/core/policy_types.js:36-40`).
4. `artifact.get/share` aplica policy y, cuando corresponde, devuelve el derivado (`gateway/src/tools/artifact.js:77-113`; `gateway/src/services/artifact_share_service.js:30-67`).
5. No hay borrado de bytes, metadata, derivados ni copias en history/checkpoints.

#### Mensajes legacy

1. `message.send/reply` recibe `body` sin clasificación, límite de tamaño o PII/secret scan (`gateway/src/tools/message.js:50-65,81-99`).
2. Un HMAC de `traceId` autoriza send/list (`gateway/src/core/trace_access.js:9-19`).
3. El body se persiste plaintext en SQL (`gateway/src/tools/message.js:23-43`; `gateway/src/core/repositories/message_repo.js:3-10`).
4. `parentMessageId` se valida y se emite en audit, pero no se guarda en la tabla (`gateway/src/tools/message.js:33-43,92-99`).
5. No hay delete/TTL/portability export específico; `list` devuelve todos los mensajes del trace.

#### Presence y mensajes V5

1. Registro recibe display name, capabilities y metadata escalar; devuelve una vez el lease token y guarda solo SHA-256 (`gateway/src/services/coordination_service.js:218-257,568-607,877-932`).
2. Presence se guarda con lease TTL y es visible a participantes autenticados del mismo scope (`gateway/src/core/coordination_queue.js:1634-1708`; filtro en `gateway/src/services/coordination_service.js:982-1037`).
3. `send` impide `restricted`, aplica un detector estrecho de secretos y limita bytes (`gateway/src/services/coordination_service.js:335-393`).
4. El envelope completo se guarda en inbox y también temporalmente en dedupe; body no va a events/audit (`gateway/src/core/coordination_queue.js:268-560`; proyección en `gateway/src/services/coordination_service.js:1157-1169`).
5. ACK elimina el entry de inbox y crea tombstone TTL (`gateway/src/core/coordination_queue.js:987-1023`).
6. Presence expiry no inicia por sí sola el TTL del inbox; unregister o una discovery posterior sí lo hacen (`docs/coordination-bus.md:127-131`).

#### Approvals

1. `approval.request` acepta `context` arbitrario, identities como strings y trace opcional (`gateway/src/tools/approval.js:7-17`).
2. Context se serializa entero en `approvals.payload`; metadata de request también entra en audit (`gateway/src/services/approval_service.js:51-71`).
3. Auto-approval añade el contexto completo a audit (`gateway/src/services/approval_service.js:27-46`).
4. Al responder, una `note` no vacía reemplaza `payload`, perdiendo el contexto original (`gateway/src/core/repositories/approval_repo.js:57-75`); hasta 500 caracteres de nota entran en audit (`gateway/src/services/approval_service.js:74-99`).
5. No hay retención, erase, portabilidad ni auth vinculada a trace para poll/respond.

#### Audit y telemetría

1. Cada evento local se enriquece con UUID/timestamp y se escribe íntegro a JSONL (`gateway/src/core/audit.js:69-91`).
2. Solo la copia Redis pasa por una proyección que elimina keys de prompt/payload/content/stdout/stderr y sanea strings (`gateway/src/core/audit.js:11-42,171-230`).
3. OTel está desactivado por defecto y, si se activa, allowlistea IDs/status y tipo de excepción, no payload (`gateway/src/core/telemetry.js:68-105,187-210,214-227`; Python equivalente en `orchestrator-langgraph/src/orchestrator_langgraph/telemetry.py:14-23,56-64,132-152`).
4. El audit local no tiene retention, integrity chain ni erase; el Stream Redis legacy tampoco muestra trim/TTL.

#### `stdout` / `stderr`

1. Los adapters headless capturan ambos streams y los devuelven al caller (`gateway/src/adapters/codex_adapter.js:218-253`; Claude `gateway/src/adapters/claude_adapter.js:159-181`; Gemini `gateway/src/adapters/gemini_adapter.js:108-121`).
2. En supervised, se devuelve una captura de hasta 400 líneas del pane (`gateway/src/adapters/codex_adapter.js:336-365`).
3. Temporal activity output conserva el `result`, y el workflow copia resultados completos en checkpoints (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:141-191`; `orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:171-263`).
4. `checkpoint_activity` serializa ese state a un artifact plaintext (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:256-287`).
5. El logger de audit suele registrar exit code, pero mensajes de error pueden incorporar contenido procedente de stderr (`gateway/src/adapters/codex_adapter.js:72-82,95-98`).

### 4. Flujo resumido y fronteras

```text
Caller/MCP host
  ├─ goal/brief/message/approval context ──> Gateway ──> SQL
  ├─ artifact/code/output ─────────────────> Gateway ──> artifact filesystem + SQL metadata
  ├─ prompt ──> Gateway ──> CLI/tmux ──> model provider / worktree
  │                               └──────> stdout/stderr ──> MCP caller
  │                                                        ├─> Temporal history
  │                                                        └─> checkpoint artifact
  ├─ coordination body/metadata ───────────> Redis inbox/presence/dedupe/events
  └─ every operation metadata ─────────────> local JSONL
                                           └─> optional sanitized Redis audit Stream
```

Fronteras de sharing/sub-processing potenciales: host MCP, CLIs/model providers, Postgres administrado, Redis remoto, Temporal y remotes Git. El código permite seleccionar endpoints, pero no mantiene un inventario de proveedores, países, finalidad, base contractual o DPA/SCC. No se verificó la conducta real de ningún tercero.

### 5. Ownership y alcance regulatorio

No se encontró un owner explícito por dataset, DPO/privacy owner, registro de actividades de tratamiento, matriz de finalidad/base, residency, subprocessors ni retention. “Gateway”, “worker” u “operator” son stewards técnicos inferidos, no accountability de negocio.

Si una persona identificable aparece en prompts, commits, notas, bodies, display names o outputs, el flujo puede quedar dentro del alcance de GDPR/UK GDPR o de leyes estatales de privacidad según las jurisdicciones y roles reales. HIPAA, eIDAS, PCI DSS u otros marcos no son inferibles por la arquitectura y no deben asumirse. Counsel debe resolver controller/processor roles, base jurídica, notices/consent cuando proceda, transferencias internacionales, DPIA, DSR SLAs y obligaciones de conservación.

### 6. Realidad at-rest frente a intención declarada

| Tema | Intención declarada | Realidad observada |
|---|---|---|
| Raw restricted | Compartir únicamente una variante saneada según policy (`docs/operator-guide.md:123-153`) | El raw plaintext se guarda siempre antes de sanear; las reglas solo cubren cuatro patrones y tres raw kinds (`gateway/src/core/artifact_store.js:41-69`; `policies/sanitization-rules.json:3-31`). |
| Coordination “ephemeral” | Presence y delivery con TTL/backpressure (`docs/coordination-bus.md:3-20,24-43`) | Presence sí expira; inbox queda sin TTL hasta cleanup y events es infinito; Docker AOF lo persiste en volumen. |
| Audit seguro | Redis recibe metadata saneada; coordination es JSONL-only (`docs/coordination-bus.md:146-156`) | La copia JSONL contiene el objeto de evento original y no tiene política de retention o redacción. |
| Telemetría | No prompts/content/stdout/stderr (`gateway/README.md:19-29`) | El código implementa esa allowlist; es una fortaleza que debe preservarse. |
| Claude headless | No session persistence en el CLI (`gateway/src/adapters/claude_adapter.js:26-38`) | No cubre Gateway JSONL, Temporal, artifacts, MCP host ni otros adapters/vendors. |
| State durability | SQLite default, Postgres experimental y Temporal history durable (`README.md:182-193`; `docs/v1-temporal-worker.md:35-47`) | No se define cifrado, backup/restore, retention o erase coordinado para ninguna alternativa. |

### 7. Aspectos sorprendentes

- El contenido de un checkpoint puede ser mucho más sensible que su etiqueta fija `internal`, porque encapsula `stdout`/`stderr` completos.
- La tabla `policy_decisions` existe, pero los flujos de servicios observados escriben decisions al audit JSONL; el repositorio SQL no aparece conectado a esos servicios, creando dos nociones de source of truth (`gateway/src/core/repositories/policy_decision_repo.js:3-19`; ejemplo del writer real en `gateway/src/services/task_service.js:34-43`).
- `approval.payload` significa primero “context” y después “note”; una decisión puede destruir el contexto que justificaba la approval.
- Los JSON Schemas publican un catálogo de kinds/statuses distinto de los valores escritos por runtime.

## Data & Privacy Audit

### Resumen de hallazgos

| ID | Severidad | Dimensión | Hallazgo |
|---|---|---|---|
| DP-01 | **High** | Retention & deletion | No existe lifecycle/erase end-to-end para los stores durables. |
| DP-02 | **High** | PII handling / derived data | Outputs y prompts se duplican en Temporal/checkpoints sin minimización ni saneado. |
| DP-03 | **High** | Classification / minimization | La clasificación es caller-asserted y el gate de ingestión no valida sensibilidad real. |
| DP-04 | **High** | Data access / tenant isolation | Autorización legacy inconsistente y basada parcialmente en identidad declarada. |
| DP-05 | **High** | Audit / exposure | JSONL local conserva texto potencialmente sensible sin proyección, retention ni ACL explícita. |
| DP-06 | **High** | Encryption / access at rest | No hay cifrado de aplicación ni modos explícitos para state/artifacts/audit. |
| DP-07 | **Medium** | Subprocessors / sharing | Egress y obligaciones de terceros no están inventariados ni enforced. |
| DP-08 | **Medium** | Governance / regulatory posture | No hay owner, finalidad, RoPA/DPIA trigger, lawful-basis o rights policy verificable. |
| DP-09 | **Medium** | Retention / Redis | Cleanup de inbox es diferido y metadata events no tienen límite. |
| DP-10 | **Medium** | Data contracts | JSON Schema, tool/runtime y SQL divergen en kinds, status y fields. |
| DP-11 | **Medium** | Modeling & integrity | FKs incompletas permiten records huérfanos o traces incoherentes. |
| DP-12 | **Medium** | Quality / lineage | Approval context se sobrescribe y message parent lineage no se persiste. |
| DP-13 | **Medium** | Migration safety | Postgres aplica migration y marker sin una transacción común ni rollback. |
| DP-14 | **Medium** | Caching / consistency | Idempotencia Temporal depende de cache de proceso y puede duplicar datos tras restart. |
| DP-15 | **Medium** | Data observability | Hay métricas de eventos, pero no SLAs/monitores de calidad, retention, orphans o DSR. |

### A. Privacidad, minimización, retention y deletion

#### DP-01 — No existe lifecycle/erase end-to-end

**Severidad: High**

**Hecho.** El registro completo de tools solo contiene create/view/update operacionales y no una operación de delete/erase/export (`gateway/src/tools/index.js:28-37`). Los repositorios de artifacts y mensajes ofrecen create/get/list sin delete (`gateway/src/core/repositories/artifact_repo.js:3-27`; `gateway/src/core/repositories/message_repo.js:3-27`), mientras audit solo append/query (`gateway/src/core/audit.js:69-90,248-273`). Temporal configura address/task queue, no retention o payload deletion (`orchestrator-langgraph/src/orchestrator_langgraph/worker.py:21-32`). Redis V5 sí borra un delivery al ACK, pero eso no borra sus metadata events, audit ni copias previas.

**Juicio.** No hay una ruta funcional de acceso/rectificación/portabilidad/erasure que atraviese SQL, artifact bytes, JSONL, Redis, Temporal, caches y backups. Los `ON DELETE CASCADE` de tasks/sessions (`gateway/migrations/001_initial.sql:19-40`) no son una capacidad de derechos si ninguna operación borra la orchestration y si artifacts/messages/approvals carecen de esas FKs.

**Consecuencia.** Acumulación indefinida, imposibilidad de acreditar purpose limitation/storage limitation y alto coste o imposibilidad de cumplir una solicitud de borrado si el sistema procesa PII. Backups y remotes no tienen una política de supresión o exclusión documentada. La conclusión jurídica depende de counsel.

#### DP-02 — Outputs y prompts se multiplican sin minimización

**Severidad: High**

**Hecho.** El workflow input contiene tres prompts (`orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:60-84`). Las activities retornan el `result` completo de `agent.delegate` (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:141-191`), que incluye `stdout`/`stderr` de los adapters. El workflow incorpora esos resultados a state de checkpoints (`orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:171-263`), y `checkpoint_activity` serializa el state entero como artifact (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:256-287`). El default es `internal`, no una clasificación derivada del contenido (`orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:78-80`).

**Juicio.** Un único output puede existir en la respuesta MCP, Temporal activity/history, cache del worker y filesystem de artifacts. `workflow_checkpoint` no es raw kind, por lo que no activa el saneado automático de `artifact_store`.

**Consecuencia.** Source code, secretos no detectados, nombres o texto personal de tests/logs pueden quedar replicados con distintas retenciones y controles. Cada copia amplía el blast radius y complica DSR, incident response y consistency.

#### DP-03 — Clasificación caller-asserted y saneado posterior/estrecho

**Severidad: High**

**Hecho.** `artifact.put` acepta cualquier string como `kind`, una clasificación elegida por el caller y contenido libre, y escribe sin una evaluación policy previa (`gateway/src/tools/artifact.js:8-15,58-71`). El raw se crea antes de sanear (`gateway/src/core/artifact_store.js:41-62`). El sanitizer solo aplica reglas regex de secret/path/UUID/internal-file y no PII (`policies/sanitization-rules.json:3-31`). Mensajes legacy aceptan bodies libres sin etiqueta o cap (`gateway/src/tools/message.js:50-65`), y approval context es `record(any)` (`gateway/src/tools/approval.js:7-17`). Coordinación mejora el límite/secret scan, pero el detector es un único patrón y no escanea participant metadata (`gateway/src/services/coordination_service.js:20-21,218-228,335-360`).

**Juicio.** El sistema controla el valor de la etiqueta, no su veracidad. Etiquetar un output sensible como `internal` o un artifact raw como kind no reconocido evita el flujo de saneado.

**Consecuencia.** Data downgrading accidental o malicioso, sobre-collection y falsa confianza en artifacts “sanitized”. Un scanner PII universal sobre código tendría falsos positivos; el control correcto es clasificación contextual y allowlist de payloads antes de persistir.

#### DP-05 — Audit JSONL local conserva contenido sensible

**Severidad: High**

**Hecho.** `appendJsonl` escribe el objeto original completo (`gateway/src/core/audit.js:69-90`), mientras la sanitización solo se aplica al envelope Redis (`gateway/src/core/audit.js:171-230`). Ejemplos: `goal` íntegro (`gateway/src/services/orchestration_service.js:35-42`), 500 caracteres de brief (`gateway/src/services/task_service.js:92-102`), 200 de prompt (`gateway/src/adapters/codex_adapter.js:61-69`), 4.000 de intervention note (`gateway/src/tools/session.js:23-38`) y errores (`gateway/src/services/agent_service.js:50-58`). Una línea JSON corrupta se devuelve como `{raw}` en query (`gateway/src/core/audit.js:257-265`) y puede imprimirse completa en modo JSON (`cli/src/agents_cli/main.py:187-200`).

**Juicio.** Audit mezcla evidence metadata con contenido humano, sin una política que justifique esa necesidad. Tampoco configura mode, rotación, integrity chain o retention.

**Consecuencia.** Un store pensado para observabilidad se convierte en una segunda base de texto confidencial/PII potencial. La exposición puede prolongarse más que el dato fuente y la línea corrupta elude incluso el parseo estructurado.

#### DP-06 — Cifrado y permisos at-rest no son propiedades del producto

**Severidad: High**

**Hecho.** SQLite se abre directamente sobre el path (`gateway/src/core/state.js:70-76`), artifacts usan `fs.writeFileSync(filePath, content)` sin mode ni cifrado (`gateway/src/core/artifact_store.js:85-102`) y audit usa append sin mode (`gateway/src/core/audit.js:69-81`). El message secret sí usa `0600`, demostrando que el proyecto puede expresar un mode cuando lo considera (`gateway/src/config.js:69-72`). Docker dev expone Postgres/Redis en host ports, usa password estático y volúmenes persistentes/AOF (`docker/docker-compose.yml:8-17,27-33`). Para Redis remoto, `rediss://` es soportado, pero ACL/TLS automatizados no están implementados (`gateway/README.md:137-163`).

**Juicio.** La aplicación no aporta field/application encryption ni asegura filesystem modes para los stores de mayor contenido. El cifrado de disco, Postgres, Redis, Temporal, backup y tránsito real puede existir en el entorno, pero no se puede acreditar desde el snapshot.

**Consecuencia.** Lectura por otros principals del host, copias de volumen/backups no gobernadas y exposición de datos confidenciales en una configuración reutilizada fuera del dev local. La severidad se reduce en un host single-user cifrado y bien administrado, pero no es una propiedad demostrable del producto.

#### DP-07 — Egress y subprocessors no gobernados

**Severidad: Medium**

**Hecho.** Prompt y `cwd` se entregan a Codex, Claude y Gemini subprocesses (`gateway/src/adapters/codex_adapter.js:218-243`; `gateway/src/adapters/claude_adapter.js:159-179`; `gateway/src/adapters/gemini_adapter.js:108-119`). Las policies permiten operar sobre repos `restricted` a Codex/Gemini (`policies/agent-capabilities.json:4-24,49-96`; `policies/repositories.json:4-13`). Redis, Postgres y Temporal aceptan endpoints configurables. Solo Claude headless incluye un flag explícito de no persistencia de sesión (`gateway/src/adapters/claude_adapter.js:26-38`).

**Juicio.** El repo no permite determinar qué código contextual adicional lee cada CLI, qué sale por red, dónde se procesa, cuánto retiene el proveedor o bajo qué contrato. No hay egress allowlist por data class, subprocessor register o residency guard.

**Consecuencia.** Transferencia inadvertida de PII/código a un tercero o región no aprobados. Counsel/procurement deben decidir DPA, SCC, controller/processor roles, training/retention settings y residency; esta auditoría no adjudica su suficiencia.

#### DP-08 — Accountability y privacy posture no están formalizadas

**Severidad: Medium**

**Hecho.** La clasificación versionada describe repos, agents y roles, no datasets, finalidad, PII, owner, lawful basis, retention o rights. No se encontró un contrato de processing record o privacy owner en los artefactos permitidos del snapshot. Los campos libres permiten contenido personal, pero no capturan purpose o provenance.

**Juicio.** La gobernanza depende de conocimiento tribal del operador. No hay trigger que obligue a DPIA/revisión privacy cuando se habilita multi-user, un store remoto, un repo regulado o captura de PII.

**Consecuencia.** No se puede demostrar accountability ni responder de forma consistente a “qué datos tenemos, por qué, dónde, durante cuánto y con quién se comparten”. Counsel debe confirmar si esas obligaciones aplican.

### B. Acceso, aislamiento y sharing

#### DP-04 — Autorización legacy inconsistente y no tenant-ready

**Severidad: High**

**Hecho.** `message.*` exige un HMAC de trace (`gateway/src/tools/message.js:50-78`; `gateway/src/core/trace_access.js:9-19`). En contraste, `artifact.get` recibe `requesterAgent/requesterRole` del caller y evalúa policy con esos strings (`gateway/src/tools/artifact.js:17-21,77-112`); `artifact.list` solo recibe `traceId` (`gateway/src/tools/artifact.js:115-120`); `orchestration.view` solo `traceId` (`gateway/src/tools/orchestration.js:24-29`); approval poll/respond operan por ID (`gateway/src/tools/approval.js:19-35`). El producto declara multi-user authentication fuera de scope (`README.md:174-180`).

**Juicio.** No hay principal autenticado uniforme ni tenant model para los datos legacy. Un caller con acceso al MCP stdio y conocimiento/descubrimiento de IDs puede autoafirmar identidad o leer metadata en superficies que no reutilizan el token de trace. No se confirma una fuga cross-tenant en V5: coordination sí aplica lease, scope y fences.

**Consecuencia.** El límite es aceptable únicamente bajo la hipótesis explícita de un proceso local controlado por un único operador. Compartir el Gateway, exponerlo mediante relay o integrar hosts no confiables convertiría esta carencia en riesgo directo de disclosure y modificación.

#### DP-09 — Retention de Redis V5 es parcialmente bounded

**Severidad: Medium**

**Hecho.** Presence usa TTL y dedupe/ACK tienen 24 h por defecto (`gateway/src/core/coordination_contract.js:4-6`; `gateway/src/config.js:138-152`). Mientras el participant está activo, el inbox se marca `PERSIST` (`gateway/src/core/coordination_queue.js:115-172`). Tras crash, solo unregister o discovery de stale inicia el orphan inbox TTL (`gateway/src/core/coordination_queue.js:175-264`). El events Stream recibe `XADD` y no trim/TTL; la documentación lo reconoce (`docs/coordination-bus.md:133-144`).

**Juicio.** “Inbox max length” es backpressure, no edad máxima. Si no vuelve a haber discovery, un inbox huérfano puede persistir; los body-free events crecen indefinidamente.

**Consecuencia.** Mensajes `internal` y metadata correlacionable permanecen más de lo esperado, especialmente con AOF/volumen. También existe riesgo de memory exhaustion, aunque el cuerpo no se replica en events.

### C. Modelado, ownership, contratos e integridad

#### DP-10 — Contratos JSON, runtime y SQL divergentes

**Severidad: Medium**

**Hecho.**

- Task schema permite `queued/blocked` y exige `repo`, `goal/parentTaskId` opcionales (`schemas/task.schema.json:7-18`), mientras SQL acepta `pending` y no tiene `goal/parent_task_id`; `repo` es nullable (`gateway/migrations/001_initial.sql:19-28`).
- Artifact schema enumera nueve kinds (`schemas/artifact.schema.json:11-22`), pero runtime acepta cualquier string y escribe `workflow_checkpoint`/`push_intent` (`gateway/src/tools/artifact.js:8-15`; `orchestrator-langgraph/src/orchestrator_langgraph/activities.py:238-245,271-285`).
- Approval schema no contiene `payload` (`schemas/approval.schema.json:7-18`), mientras SQL y service lo usan (`gateway/migrations/001_initial.sql:71-80`; `gateway/src/services/approval_service.js:51-60`).
- Los JSON Schemas se compilan en tests, mientras las tools se validan con sus propios Zod schemas (`gateway/src/tools/tool_helpers.js:58-87`).

**Juicio.** No hay un contrato canónico ejecutado en cada boundary. La `version` del schema no garantiza compatibilidad del dato realmente escrito.

**Consecuencia.** Consumers y migrations pueden interpretar distinto un status/kind/campo, omitir datos durante export/erase o fallar al rehidratar. También impide data-quality checks confiables.

#### DP-11 — Integridad referencial incompleta

**Severidad: Medium**

**Hecho.** Tasks referencia orchestration y sessions referencia task, ambos con cascade (`gateway/migrations/001_initial.sql:19-40`). Sin embargo, `sessions.trace_id`, `artifacts.trace_id`, `messages.trace_id`, `policy_decisions.trace_id` y `approvals.trace_id` no referencian orchestration; los dos últimos incluso permiten null (`gateway/migrations/001_initial.sql:30-80`). `sanitized_from` es una self-FK sin una regla explícita de delete (`gateway/migrations/001_initial.sql:42-50`).

**Juicio.** El mismo session puede declarar un trace distinto al de su task, y artifacts/messages/approvals pueden quedar huérfanos o apuntar a traces inexistentes.

**Consecuencia.** Lineage y erase por trace quedan incompletos; métricas, audit y decisiones pueden no reconciliar. Añadir constraints requiere preflight de datos y rollout cuidadoso.

#### DP-12 — Approval context se pierde y message lineage es solo audit

**Severidad: Medium**

**Hecho.** Approval request guarda JSON context en `payload` (`gateway/src/services/approval_service.js:51-60`), pero `decideApproval` ejecuta `payload = COALESCE(note, payload)` (`gateway/src/core/repositories/approval_repo.js:57-75`). Una nota no vacía destruye el context. En mensajes, `parentMessageId` se comprueba, pero no forma parte de la fila SQL y solo se incluye en el audit event/response (`gateway/src/tools/message.js:23-43,92-99`).

**Juicio.** La procedencia y justificación se dividen entre SQL y JSONL, y una actualización muta el significado de una columna.

**Consecuencia.** Evidencia incompleta para investigar quién aprobó qué y por qué, respuestas sin thread durable y export/rectification ambiguos. La nota tampoco tiene límite persistido en la tool schema.

#### DP-13 — Postgres migration no es atómica

**Severidad: Medium**

**Hecho.** SQLite envuelve migration SQL y marker en `transaction` (`gateway/src/core/state.js:19-38`). Postgres ejecuta el fichero y después inserta el marker mediante otra ejecución, sin transacción común (`gateway/src/core/state.js:41-57`). El adapter usa invocaciones separadas a `psql` (`gateway/src/core/postgres_db.js:72-75`). No hay down migration o schema-drift verification.

**Juicio.** Un fallo entre schema apply y marker deja estado parcialmente aplicado que el siguiente startup vuelve a ejecutar bajo `CREATE IF NOT EXISTS`, sin comprobar que la forma real coincida.

**Consecuencia.** Drift entre entornos, constraints ausentes o migration manual difícil de auditar. Para futuras encryption/retention/FK migrations, el blast radius de datos aumenta.

### D. Caching, consistencia y observabilidad de calidad

#### DP-14 — Idempotencia Temporal no sobrevive al worker

**Severidad: Medium**

**Hecho.** El activity ID es determinista, pero el Gateway schema no recibe una idempotency key; la documentación lo reconoce (`docs/v1-temporal-worker.md:19-33`). El único dedupe de respuestas es `_responses_by_cache_key` en memoria del runner (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:135-140,295-335`). Temporal puede reejecutar activities at-least-once tras fallos (`docs/v1-temporal-worker.md:49-61`).

**Juicio.** Tras restart, un retry puede crear otra sesión, approval o checkpoint artifact, aunque la actividad tenga el mismo ID lógico.

**Consecuencia.** Duplicados, outputs adicionales, decisiones ambiguas y más copias que borrar. El control debe residir en el boundary Gateway/store, no solo en memoria.

#### DP-15 — Observabilidad parcial, no data-quality governance

**Severidad: Medium**

**Hecho.** El metrics consumer cuenta eventos/rechazos y latencia del Stream saneado (`orchestrator-langgraph/src/orchestrator_langgraph/consumers/metrics.py:36-49,78-100,238-255`). No mide orphans SQL, clasificación incorrecta, retention lag, tamaño/edad de JSONL/events, duplicados, completitud de lineage, erasure coverage o backup age. Coordination audit es best-effort y sus fallos no alteran el resultado (`gateway/src/services/coordination_service.js:814-851`).

**Juicio.** Existe observabilidad operativa inicial, pero no un SLO de datos ni reconciliación entre SQL, filesystem, Redis, Temporal y audit.

**Consecuencia.** El sistema detectará tarde una retención infinita, una copia sin metadata, un orphan o una DSR incompleta. No puede probar continuamente que los controles de privacidad siguen verdaderos.

### Strengths a preservar

1. **Scope y fencing en V5.** Presence guarda hash del token, discovery/send/receive/ACK se restringen por lease y `scopeId`, y el body no entra en los eventos/audit V5 (`gateway/src/services/coordination_service.js:591-607,801-811,1084-1169`; `gateway/src/core/coordination_contract.js:18-55`).
2. **TTL explícito donde sí existe.** Lease, dedupe, ACK tombstones y orphan cleanup son configurables y validados como enteros positivos (`gateway/src/config.js:92-152`).
3. **Proyección de observabilidad minimizada.** Redis audit y OTel excluyen prompts/content/stdout/stderr y exception messages (`gateway/src/core/audit.js:11-42,183-230`; `gateway/src/core/telemetry.js:68-105,187-195`).
4. **Control de sharing de raw restricted.** Existe derivación `sanitized_from`, deny cuando falta el derivado y cross-trace deny en share (`gateway/src/core/artifact_store.js:52-79`; `gateway/src/services/artifact_share_service.js:30-67`).
5. **Contratos estrictos de coordination.** Unknown fields, tamaños, timestamp, classification y envelope se validan tanto en service como en Lua (`gateway/src/services/coordination_service.js:162-228,335-393`; `gateway/src/core/coordination_queue.js:268-365`).
6. **Integridad SQL básica.** IDs primarios, checks de status/classification, índices de trace y cascades tasks/sessions están presentes (`gateway/migrations/001_initial.sql:9-89`).
7. **Defensas locales.** Runtime workspace está gitignored y el message secret se crea con `0600` (`.gitignore:13-22`; `gateway/src/config.js:69-72`).
8. **Redacción de errores en el orchestrator.** El contrato Python redacta keys sensibles antes de incluir payload en excepciones (`orchestrator-langgraph/src/orchestrator_langgraph/_contracts.py:8-19,39-61`).

## Strategy

### Temas, target state y controles

| Tema | Target state | Principio | Control que lo mantiene verdadero | Señal de “done” |
|---|---|---|---|---|
| 1. Inventario y accountability | Cada clase/dataset tiene owner, steward, finalidad, categorías de sujetos/datos, source, sinks, subprocessors, residencia, retention y lawful-basis question | One owner per dataset; purpose limitation | `data-inventory.yaml` versionado + revisión privacy al añadir store/tool/vendor | 100% de datasets del mapa con owner/finalidad/retention; cero flows sin boundary contract. |
| 2. Minimización antes de persistir | Prompt/output/body/context se clasifica y minimiza en ingest; checkpoints guardan referencias y summaries allowlisted | Privacy by design; collect once, reference many | Payload policy central, schema allowlist, pre-persistence scanner/context classifier y tests de no-downgrade | 0 prompts/bodies/stdout/stderr raw en audit; 0 checkpoint blobs completos; 100% artifacts con kind registrado y classification derivada/atestada. |
| 3. Lifecycle y derechos first-class | Retention automática y una operación idempotente de export/rectify/erase recorre live stores y contempla backups | Storage limitation; deletion as a product operation | Retention workers + erase manifest por subject/trace + deletion ledger sin PII + drills | Erase drill elimina/anonymiza todas las copias live dentro del SLA y documenta cuándo expira cada backup. |
| 4. Acceso, cifrado y egress | Todo acceso se vincula a un principal autenticado, tenant/trace y purpose; datos sensibles están cifrados y egress aprobado | Least privilege; defense in depth | Auth context no caller-asserted, ABAC por trace/tenant, filesystem modes, encryption/KMS, TLS policy y subprocessor allowlist | Tests negativos cross-tenant para cada read/write; 100% stores sensibles cifrados según policy; todo egress tiene owner/DPA/residency decision. |
| 5. Contratos, integridad y observabilidad | Un contrato canónico genera schema/runtime/migration; lineage e idempotency son comprobables | Single source of truth; quality by contract | Contract tests, transactional migrations, FKs, durable idempotency keys, DQ monitors | Cero drift en CI; cero orphans; duplicate rate bajo SLO; alertas de retention/stream growth/DSR completeness activas. |

### Trade-offs explícitos

- Para un producto local y single-operator no hace falta desplegar un catálogo empresarial: un inventario versionado, owners claros y tests automatizados son suficientes mientras no haya multi-tenancy ni PII deliberada.
- No se debe ejecutar un detector genérico de PII sobre todo el source code y bloquear por coincidencias; se debe combinar provenance, kind allowlisted, clasificación del repositorio y reglas específicas para texto humano/output.
- Los IDs body-free y métricas agregadas pueden conservarse más que el contenido si existe una finalidad de seguridad demostrable, una retention definida y pseudonimización; no deben arrastrar prompts/notas.
- Un audit inmutable puede entrar en tensión con erasure. La solución debe minimizar contenido desde el origen y valorar pseudonimización, crypto-shredding o excepciones de conservación con counsel, no borrar evidencia ad hoc.
- Temporal puede mantener durabilidad, pero no necesita que cada checkpoint filesystem duplique el resultado completo; references, hashes y summaries allowlisted preservan recoverability con menos exposición.

## Plan

### Quick wins

| ID | Acción inmediata | Propiedad verificable | Esfuerzo | Riesgo del cambio | Dependencias |
|---|---|---|---|---|---|
| QW-1 | Eliminar `prompt`, `goal`, `brief`, context y notas libres de eventos audit; sustituir por longitud, kind y hash keyed si es imprescindible correlacionar. | Una suite envía canaries en todos esos campos y confirma que ninguna aparece en JSONL/Redis/stderr. | S | Bajo; pierde detalle de diagnóstico textual. | Ninguna. |
| QW-2 | Crear dirs runtime con `0700` y state/artifact/audit files con `0600`, fallando seguro si el mode no puede aplicarse. | Test de filesystem comprueba mode efectivo y que un principal no-owner no puede leer. | S | Bajo; puede romper entornos con shared group intencional. | Decisión de access model. |
| QW-3 | Limitar bytes de message legacy body, approval context/note, goal y brief en la validación de tool. | Inputs sobre el límite fallan antes de escribir y no aparecen en audit. | S | Bajo; compatibilidad con callers que envían blobs grandes. | Definir caps. |
| QW-4 | Rechazar kinds de artifact no registrados y añadir explícitamente `workflow_checkpoint`/`push_intent` al contrato mientras se rediseña checkpoint. | Runtime, JSON Schema y fixtures aceptan exactamente la misma enum. | S | Bajo; puede descubrir callers informales. | DP-10 owner. |
| QW-5 | Añadir startup warning/fail policy para Redis/Postgres/Temporal remotos sin TLS/approved profile, preservando localhost dev. | Config remota plaintext no arranca en profile production; localhost dev sigue funcionando. | S | Bajo/medio por rollout. | Definir profile y excepciones. |

### Milestone 0 — Classify & gain visibility

| ID / título | Descripción | Datasets / stores / flows | Acceptance criteria | Esfuerzo | Riesgo / blast radius | Dependencias |
|---|---|---|---|---|---|---|
| M0-1 — Inventario y owners | Crear un inventario versionado de cada dataset/clase con owner, steward, finalidad, sensibilidad/PII, source, sinks, subprocessors, residencia, retention, access model y deletion mechanism. | Todos los del Data Map. | CI falla si una tool, table, artifact kind, Redis key family o Temporal payload no está inventariado; 100% tienen owner y retention decision. | L | Bajo; metadata only. | Decisiones humanas de owners/jurisdicción. |
| M0-2 — Data-flow y contract manifest | Definir un manifest canónico que conecte inputs MCP → modelos runtime → SQL/FS/Redis/Temporal → outputs, con schema version y lineage IDs. | Tools, schemas, migrations, activities. | Cada boundary tiene producer, consumer, version, classification y test de compatibilidad; no hay campos “unknown owner”. | L | Bajo; puede revelar drift que bloquee CI. | M0-1. |
| M0-3 — Baseline de access/cifrado/backups | Inventariar principals reales, filesystem modes, DB/Redis/Temporal ACL/TLS/encryption, backup destinations, restore age y key owners por entorno, sin leer records. | State, artifacts, audit, Redis, Temporal, Git/remotes. | Evidencia automatizada de encryption/TLS/ACL y un restore drill con datos sintéticos; backups con owner, retention y delete behavior. | L | Medio; restore drill solo en entorno aislado. | M0-1; operador infra. |
| M0-4 — Privacy/regulatory decision record | Con counsel, resolver jurisdicciones, controller/processor roles, datos prohibidos/permitidos, lawful basis questions, notices, DPIA triggers, subprocessors y transfers. | Flujos humanos y vendors. | Decision record aprobado y enlazado desde el inventory; cada flow de PII tiene finalidad/base/retention o está técnicamente prohibido. | M | Sin blast radius técnico; alto impacto de alcance. | M0-1; counsel/DPO/procurement. |

### Milestone 1 — Close exposure & rights gaps

| ID / título | Descripción | Datasets / stores / flows | Acceptance criteria | Esfuerzo | Riesgo / blast radius | Dependencias |
|---|---|---|---|---|---|---|
| M1-1 — Ingestion privacy gate | Centralizar clasificación y minimización antes de write: kind allowlist, provenance, content class, secret/PII policy contextual, cap de bytes y prohibición de downgrade. Sanear antes de persistir cuando la policy no autorice raw. | Artifacts, messages, approvals, goals/briefs, coordination metadata, outputs. | Un corpus sintético de canaries demuestra: contenido restricted/PII no puede escribirse como menor clase; raw no toca disco si no está autorizado; todo write genera classification decision body-free. | XL (requiere desglose) | Medio/alto: rechazo de inputs y cambio de semántica; no migrar históricos aún. | M0-1/M0-2. |
| M1-2 — Checkpoints y Temporal minimizados | Sustituir state blobs por IDs, hashes, status y summaries allowlisted; definir payload codec/encryption y retention del namespace Temporal. | Workflow input/history, activity results, cache, `workflow_checkpoint`. | History/checkpoint inspeccionados con datos sintéticos no contienen prompt, stdout, stderr, code ni approval note; recovery/crash tests siguen pasando. | L | Medio: puede afectar replay; rollout por nueva workflow/schema version. | M1-1; Temporal admin. |
| M1-3 — Auth context y trace/tenant isolation | Emitir un principal autenticado en el boundary y dejar de aceptar requester identity como autoridad; exigir scope a artifact/orchestration/approval/session reads/writes. | Todas las tools y repositorios. | Matriz de tests prueba deny cross-trace/cross-tenant y deny de role spoof en cada tool; audit registra principal pseudónimo, no identidad libre. | XL (requiere desglose) | Medio: rompe clients y tokens actuales; dual-read/versioned API temporal. | M0-2; decisión multi-user. |
| M1-4 — Erase/export coordinator | Implementar operación idempotente por subject locator y/o trace que produzca manifest, borre/anonymice SQL, artifact bytes/metadata, JSONL index/segments, Redis, Temporal y caches, y contabilice backups. | Todos los stores durables. | Drill sintético encuentra el subject en todas las copias, ejecuta erase, confirma cero matches live y reporta expiración/exception de backups; retry no falla ni borra otro tenant. | XL (requiere desglose) | **Alto data-loss blast radius**; dry-run, approval, scope fence, backups verificados y two-person control. | M0-1/M0-3/M1-3; counsel. |
| M1-5 — Audit privacy hardening | Adoptar schema allowlisted body-free, pseudonimizar actors, explicit modes, rotation/retention e integrity chaining; tratar corrupt records sin reemitir raw. | JSONL, CLI audit, Redis audit, stderr. | Canaries nunca aparecen; cada segment tiene hash chain/signature, owner y expiry; corrupt input devuelve metadata segura; access log cubre queries. | L | Medio: compatibilidad de parsers y menor detalle. | M0-1; M1-1. |
| M1-6 — Encryption y egress enforcement | Aplicar encryption-at-rest/keys por entorno, TLS/ACL obligatorios para endpoints remotos, secret rotation y adapters con approved vendor profile; evitar prompt en argv cuando el CLI soporte stdin. | SQLite/FS/Postgres/Redis/Temporal/backups/CLIs. | Config production falla si un store sensible no acredita encryption/TLS; key rotation drill; process listing sintético no expone prompt; cada vendor flow tiene decision record. | XL (requiere desglose) | Medio/alto por infra/compatibilidad; rollout por entorno y rollback de keys probado. | M0-3/M0-4. |

### Milestone 2 — Systematize governance

| ID / título | Descripción | Datasets / stores / flows | Acceptance criteria | Esfuerzo | Riesgo / blast radius | Dependencias |
|---|---|---|---|---|---|---|
| M2-1 — Retention automation | Ejecutar políticas de edad/estado por clase, incluyendo JSONL segments, SQL rows, artifact bytes, Temporal namespace y Redis events/inboxes. Cleanup de Redis debe respetar pending deliveries. | Todos los stores. | Clock-driven tests sintéticos prueban purge al vencer y preservación antes; no queda metadata sin bytes ni bytes sin metadata; oldest pending nunca se trunca. | XL (requiere desglose) | Alto si selector de datos es incorrecto; dry-run/counts/canary/approval antes de delete. | M0-1/M1-4. |
| M2-2 — Contrato canónico y schema evolution | Generar JSON Schema/Zod/DB mappings desde un contrato o verificarlos bidireccionalmente; versionar enums y response shapes. | Tasks, artifacts, approvals, messages, coordination. | CI demuestra equivalencia runtime-schema-SQL; old/new compatibility fixtures pasan; unknown kind/status no se escribe. | L | Medio; API consumers. | M0-2; QW-4. |
| M2-3 — Least privilege y access audit | Separar principals Gateway/metrics/worker/operator; limitar DB tables, Redis prefixes y filesystem; añadir break-glass/JIT para raw restricted y registrar reads. | SQL, artifacts, Redis, Temporal, CLI. | Cada principal solo ejecuta operaciones inventariadas; raw reads requieren approval/JIT y dejan evento body-free; quarterly access review exportable. | L | Medio: permisos demasiado estrechos pueden cortar operación. | M1-3/M1-6. |
| M2-4 — Subprocessor/residency gate | Conectar clasificación de repo/payload con vendors y regiones permitidas; bloquear el adapter o store si no hay decisión vigente. | Codex/Claude/Gemini, managed stores, Git remotes. | Test de policy niega restricted/PII a vendor/región no aprobados; inventario lista DPA/retention/training/residency owner y fecha de revisión. | L | Medio: reduce disponibilidad de modelos. | M0-4/M1-6. |

### Milestone 3 — Quality & observability polish

| ID / título | Descripción | Datasets / stores / flows | Acceptance criteria | Esfuerzo | Riesgo / blast radius | Dependencias |
|---|---|---|---|---|---|---|
| M3-1 — Integrity migration | Añadir FKs/tenant keys/checks, separar approval context/note, persistir parent message y reconciliar policy-decision source of truth. | SQL tables y repositorios. | Preflight reporta cero orphans/conflicts; constraints rechazan trace mismatch; approval conserva immutable request context y separate decision note. | XL (requiere desglose) | **Alto migration/data-loss blast radius**; shadow columns, backfill sintético/prod-safe, validation y cutover por fases. | M2-2; backups M0-3. |
| M3-2 — Durable idempotency | Propagar `activity_id` como idempotency key a Gateway y persistir request hash/result reference bajo unique constraint/TTL. | Temporal activities, sessions, approvals, artifacts. | Retry antes/después de restart produce un solo side effect; cambio de payload con misma key falla; retention de idempotency definida. | L | Medio: colisiones/false dedupe; namespace por operation+tenant. | M2-2/M1-3. |
| M3-3 — Data SLOs y reconciliación | Medir freshness, completeness, orphans, duplicate rate, classification coverage, retention lag, stream/JSONL age, DSR coverage y backup age. | Todos los stores. | Dashboards/alerts usan solo metadata; SLOs tienen owner; fallo de erase/retention/reconciliation abre incidente sintético en prueba. | L | Bajo; cuidar cardinalidad/PII en labels. | M0-1/M2-1/M3-1. |

### Top 3 — sketches de implementación y rollout

#### 1. M1-4 — Erase/export coordinator

**Enfoque.** Crear primero un `dry-run manifest` firmado que resuelva subject locator → traces → SQL rows → artifact IDs/paths → JSONL segment references → Redis keys/messages → Temporal workflow IDs. La ejecución debe requerir scope/tenant, idempotency key y approval; generar solo counts/hashes en el deletion ledger. Separar `delete`, `anonymize` y `retain-under-exception`.

**Rollout y blast radius.** Fase 1 report-only sobre fixtures sintéticos; fase 2 shadow execution en un workspace/Redis/Temporal aislados; fase 3 live con `--dry-run`, backup verificado, allowlist de datasets y two-person approval. El blast radius es máximo si el selector confunde sujetos o tenants, por lo que no debe aceptar búsquedas de texto libre ni path globs.

**Gotchas.** JSONL append-only requiere segmentación/rewriting o crypto-shredding; Redis events body-free pueden necesitar pseudonimización; Temporal history puede requerir namespace retention/API de delete administrada; Git/remotes y backups tienen reglas propias; evidencia audit puede tener excepción de conservación a decidir con counsel.

**Verificación.** Seed sintético único en todos los stores, dry-run exacto, erase, scan estructural de canary cero en live stores, retry idempotente, subject vecino intacto, restore de backup antiguo documentado y expiry drill.

#### 2. M1-1 — Ingestion privacy gate

**Enfoque.** Definir un `DataEnvelope` canónico con `kind`, `source`, `declared_class`, `effective_class`, `purpose`, `retention_class`, `tenant/trace` y `content_ref`. El gate calcula effective class, aplica caps/allowlists y decide `deny | store_raw | store_sanitized | store_reference`. Como primer consumer del gate, M1-2 hará que los checkpoints guarden result IDs, exit code, hashes y summary schema, no el blob.

**Rollout y blast radius.** Instrumentar primero en report-only para medir decisiones sin guardar contenido adicional; habilitar enforcement por kind; versionar workflow/checkpoint para que replays antiguos usen su código compatible. No reetiquetar ni reescribir históricos sin inventario/backup. Blast radius medio: callers pueden ser rechazados y replay puede romper si se cambia una workflow version in-place.

**Gotchas.** PII detection sobre código es ruidosa; clasificación del repo no basta para logs; sanitizer actual no es reversible ni completo; un hash sin key puede permitir correlación/dictionary attacks; summaries LLM también pueden filtrar contenido y necesitan schema.

**Verificación.** Corpus sintético de secretos/PII/code, tests de downgrade, canary absent de disk/history/audit, recovery test tras restart, y policy test que prueba que un kind nuevo falla closed hasta ser inventariado.

#### 3. M1-3 — Auth context y trace/tenant isolation

**Enfoque.** El boundary crea un `AuthContext` firmado con principal, tenant, trace scopes y roles derivados; services/repositories nunca aceptan requester role como autoridad. Introducir tenant/trace keys y ABAC común. M1-6 complementará este item con `0700/0600`, TLS/ACL para stores remotos, encryption/KMS y vendor profile por classification.

**Rollout y blast radius.** Emitir AuthContext en modo dual y comparar decisiones; migrar reads antes que writes; añadir tenant columns nullable, backfill/validate y luego `NOT NULL`/FK; rotar secrets/keys con dual decrypt temporal y rollback probado. Blast radius medio/alto: auth incorrecta bloquea operación; key mishandling puede volver datos ilegibles.

**Gotchas.** `traceId` no es un tenant; HMAC compartido por trace no identifica actor; raw Redis credentials siguen siendo bypass; subprocess argv puede exponer prompt; backups necesitan key lifecycle; local single-user necesita una ruta simple sin debilitar production profile.

**Verificación.** Matriz negativa por tool/store, role-spoof denied, cross-tenant canary invisible, access audit body-free, filesystem permission test, TLS config test, encryption/rotation/restore drill y break-glass con expiry.

## Open Questions

1. ¿En qué países se ejecutará el Gateway, viven los usuarios/sujetos y se ubican Redis, Postgres, Temporal, backups, Git remotes y model providers?
2. ¿Quién es controller, processor, data owner, security owner y DPO/privacy contact por dataset?
3. ¿Está permitido introducir datos personales en prompts, code, logs, approval notes, messages o artifacts, o debe existir una prohibición técnica absoluta?
4. ¿Qué categorías se consideran PII/sensibles en este contexto y qué repositorios podrían contener datos regulados?
5. ¿Cuál es la finalidad y, con counsel, la base jurídica aplicable a cada tratamiento y a la conservación de audit?
6. ¿Qué retención exacta requiere cada clase: SQL state, raw/sanitized artifacts, JSONL, Redis inbox/events, Temporal history, tmux/logs y backups?
7. ¿Qué SLA de acceso, rectificación, portabilidad y erasure se ofrece y qué identificador permite localizar a un sujeto sin búsquedas invasivas?
8. ¿Qué evidencia debe conservarse aunque exista una solicitud de borrado, durante cuánto y bajo qué excepción validada por counsel?
9. ¿Qué proveedores/CLIs son subprocessors aprobados, con qué DPA, training/retention settings, regiones y transfer mechanisms?
10. ¿El modelo soportado seguirá siendo single-operator/trusted-local o se prevé relay, multi-host o multi-tenant? Esa decisión cambia la prioridad inmediata de DP-04.
11. ¿Qué mecanismo de cifrado/KMS y rotación protege SQLite/filesystem, Postgres, Redis, Temporal y backups en cada entorno?
12. ¿Cuál es la política de backup/restore, RPO/RTO y crypto-shredding, y cómo se demuestra que una erasure se propaga o expira en backups?
13. ¿Debe Temporal conservar prompts/results en history, o se aprobará un payload codec cifrado y una representación por referencias?
14. ¿Quién aprueba schema migrations con data-loss risk y quién ejecuta los drills periódicos de retention, DSR y restore?

---

**Declaración final de exposición/compliance:** el snapshot contiene controles técnicos parciales y valiosos, pero no una postura completa y demostrable de privacidad para PII; la aplicabilidad y suficiencia regulatoria deben ser validadas por counsel sobre jurisdicciones, finalidades, contratos y despliegue reales.

# Auditoría de datos, calidad y privacidad — proyecto completo

## Identificación y límites

| Campo | Valor |
|---|---|
| Fecha | 2026-07-26 |
| Corte principal auditado | `41d194a9cb5276cd0e90541b23ff47a41b3ad123` |
| Integración comparada | `develop@d521afb12a6520b95f1a9fb172911b16ab77a1ff` |
| Estado posterior observado | `main` y `develop` alineados localmente en `b532c63823979d20e566aaeaed0be96b29fb4c45` |
| Alcance | Modelos SQL, filesystem artifacts/audit, Redis, Temporal, messages, approvals, lineage, contratos, migrations, egress y gobierno |
| Método | Inspección de schema/código/config y metadata de filesystem/procesos; no se leyó, muestreó, movió ni exportó contenido de registros |
| Límite legal | Se señalan preguntas de GDPR/CCPA y terceros; applicability, lawful basis, controller/processor y suficiencia contractual se remiten a counsel |

Las referencias `file:line` corresponden al corte auditado, salvo indicación de
estado posterior. El diff hasta `b532c638` mejora CI, bounds de dependencias,
redacción de errores Python y el wiring de audit MCP, pero no introduce
catálogo de datos, retention, export/erase, owner por dataset, cifrado,
single-writer, constraints de trace ni política de backups; por tanto los
riesgos estructurales de este informe permanecen abiertos.

## Executive Summary

1. **Calificación: D en salud de datos y postura de privacidad**, con exposición potencial alta si prompts, commits, logs o outputs contienen datos personales o secretos.
2. El mayor riesgo es que no existe retention, export ni erase coordinado para SQL, artifact bytes, JSONL, Redis, Temporal, caches y backups.
3. Prompts y resultados raw pueden duplicarse entre respuesta MCP, history Temporal, cache del worker y checkpoints etiquetados `internal`, sin minimización por contenido.
4. Clasificación, producer y provenance se aceptan del caller, y el acceso legacy no usa un principal uniforme, de modo que labels e IDs no constituyen aislamiento demostrable.
5. La evidencia nueva de runtime muestra decenas de Gateways sobre el mismo workspace y stores con modos `0644/0664`, haciendo que consistencia y confidencialidad dependan del UID, grupos y umask del host.
6. El modelo SQL tiene buenas constraints de status y algunas cascades, pero FKs de trace incompletas, contratos divergentes y lineage semántica que se pierde o sobrescribe.
7. Coordination V5, la proyección Redis de audit, WAL/FKs SQLite, HMAC de messages y tokens/fencing son controles sólidos que deben preservarse.
8. La oportunidad principal es ejecutar V4 `B/3/02-03`: catálogo con owner/purpose/class/retention, lifecycle end-to-end y rights drills, apoyado por un único Gateway y output/history minimizados.
9. No se confirmó la presencia de PII real ni se emite una conclusión de cumplimiento; el sistema admite texto libre y por ello debe diseñarse para PII potencial antes de usos con personas o repos regulados.

## Data Map

### Categorías y clasificación

| Categoría | Ejemplos estructurales | Clase mínima recomendada | ¿PII confirmada? |
|---|---|---|---|
| Identificadores operacionales | trace/task/session/artifact/approval/message IDs, timestamps, roles, agents | Interna; algunos pueden ser correlacionables | No |
| Texto aportado por personas | goal, brief, prompts, notes, messages, approval context | Interna; PII/confidencial según contenido | No; posible por diseño |
| Código y material de ingeniería | diffs, source, stack traces, paths, test output | `restricted` cuando lo define el repo | No necesariamente PII; puede contenerla |
| Output de modelos y procesos | stdout, stderr, pane snapshots, review/test result | Derivada de la clase de source, nunca `internal` por defecto | No; puede reproducir PII/secrets |
| Decisiones y provenance | policy context, approvals, producer, reviewer, status | Interna; integridad crítica | Identidad del operador podría ser PII |
| Coordination | display name, participant metadata, bodies, correlation IDs | `unrestricted`/`internal`; restricted prohibido | No; texto libre puede incluirla |
| Credenciales y configuración | message key, provider tokens, Redis/Postgres URLs | Secreto | No |
| Telemetría/audit | event IDs, tool/action/status, previews, errors | Interna; sólo metadata necesaria | Puede contener PII por previews/errors |

La aplicación no tiene tablas de cuentas, pagos, biometría o perfiles de
clientes. Eso reduce el alcance nativo, pero `TEXT`, `record(any)`, prompts,
commits y output permiten introducir datos personales sin que el schema pueda
detectarlo. No se inspeccionó el contenido existente para comprobarlo.

### Inventario de stores y modelos

| Store/dataset | Contenido y evidencia | Persistencia real | Acceso/control observado | Owner |
|---|---|---|---|---|
| SQLite `orchestration_sessions` | caller, role, goal, status (`gateway/migrations/001_initial.sql:9-17`) | Durable, WAL | Todo Gateway que abre workspace | Gateway, sólo owner técnico inferido |
| SQLite `tasks`, `sessions` | repo, assignment, role, lifecycle, tmux target (`:19-40`) | Durable | Repositorios internos; cascades parciales | Gateway, inferido |
| SQLite `artifacts` + filesystem | kind, class, producer, path, lineage y bytes (`:42-51`; `gateway/src/core/artifact_store.js:41-102`) | Durable plaintext | Policy parcial en read; caller controla ingest | Gateway/artifact store, inferido |
| SQLite `messages` | from/to/body (`gateway/migrations/001_initial.sql:53-60`) | Durable plaintext | HMAC por trace en tools legacy | Gateway, inferido |
| SQLite `policy_decisions` | context/decision/reason (`:62-69`) | Tabla durable, writer productivo no claro | Repositorio existe; servicios suelen escribir JSONL | Sin source of truth declarado |
| SQLite `approvals` | requester, action, status, actor, payload (`:71-81`) | Durable plaintext | IDs globales; respond MCP en corte | Gateway/operator, inferido |
| Postgres alternativo | Modelo equivalente y migrations | Durable externo | Adapter ejecuta `psql` y URL configurable | No declarado |
| Audit JSONL | Eventos originales enriquecidos (`gateway/src/core/audit.js:69-90`) | Append plaintext, sin rotación | Query local; varios writers posibles | No declarado |
| Redis audit stream | Proyección metadata saneada (`gateway/src/core/audit.js:171-233`) | Persistencia/retención depende de Redis | Publish best-effort | Observability, inferido |
| Redis coordination | Presence, inbox, dedupe, ACK tombstones, events | TTL parcial; AOF en compose | Lease/fencing tras registro | Coordination, inferido |
| Temporal history | Workflow input, signals y activity payload/result | Durable según cluster/namespace | Address/task queue; no policy de retention en repo | Temporal operator, no declarado |
| Checkpoint artifacts | Estado serializado de workflow (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:256-293`) | Durable en artifact store | Clase elegida en input, default `internal` | Worker/Gateway, inferido |
| Worker cache | Respuestas por `(tool, activity_id)` (`activities.py:295-335`) | Memoria de proceso | Worker local | Worker, inferido |
| tmux/process buffers | Prompt, stdout/stderr y pane snapshots | Efímero, pero puede copiarse a otros stores | UID del host y callers MCP | Adapter/operator, inferido |
| Message key | Secreto HMAC (`gateway/src/config.js:54-75`) | Fichero o fallback de proceso | `0600` al crear | Operator, inferido |
| Volúmenes/backups | Postgres/Redis volumes; copias externas posibles | Docker volumes durables | Política de backup no evidenciada | No declarado |

“Owner inferido” significa componente técnico que escribe, no accountability de
negocio ni data steward aprobado. No se encontró owner, purpose, retention,
legal hold o DSR SLA por dataset.

### Modelo relacional e integridad

```text
orchestration_sessions(trace_id UNIQUE)
  └── tasks(trace_id FK, ON DELETE CASCADE)
        └── sessions(task_id FK, ON DELETE CASCADE)
              └── sessions.trace_id             [sin FK/coherence check]

artifacts.trace_id                               [sin FK a orchestration]
  └── artifacts.sanitized_from -> artifacts.id  [FK, sin invariant de clase/digest]
messages.trace_id                                [sin FK; parent no persistido]
policy_decisions.trace_id                        [sin FK]
approvals.trace_id                               [sin FK; nullable]
```

El esquema protege enumeraciones de status y classification, y SQLite activa
FKs/WAL (`gateway/src/core/state.js:70-76`). No obstante, sólo tasks/sessions
tienen cascades de la orchestration; artifacts, messages, approvals y
policy_decisions pueden sobrevivir o referenciar un trace inexistente. Tampoco
hay constraint que obligue a `sessions.trace_id` a coincidir con el task.

### Lineage y flujo end-to-end

```text
 persona/repo/tool output
      |
      +-> goal/brief/prompt/message/approval context
      |          |
      |          +-> Gateway -> SQLite/Postgres
      |          +-> Gateway -> JSONL original
      |          +-> child CLI/provider
      |                    |
      |                    +-> stdout/stderr/pane -> response MCP
      |                                          -> Temporal result/history
      |                                          -> worker cache
      |                                          -> checkpoint artifact
      |
      +-> artifact.put(code/diff/output)
                 -> raw bytes primero
                 -> regex sanitizer si kind/clase exactos
                 -> metadata SQL + bytes filesystem
                 -> artifact.get/share -> caller
      |
      +-> coordination body/metadata
                 -> Redis inbox/presence/dedupe/events

 audit JSONL -> proyección saneada best-effort -> Redis stream -> consumer once
```

Los puntos donde la lineage cambia de forma insegura son: label elegida por el
caller al ingerir, “sanitized” derivado por regex sin digest semántico, output
normal convertido en checkpoint `internal`, approval context reemplazado por
note y reply parent presente sólo en respuesta/audit, no en la tabla.

### At-rest: intención frente a realidad

| Tema | Intención/documentación implícita | Realidad comprobada |
|---|---|---|
| Raw restricted | Otros roles consumen variante saneada | Raw se escribe primero; sólo tres kinds activan regex (`gateway/src/core/policy_types.js:36-39`; `artifact_store.js:41-69`) |
| Artifact classification | La etiqueta representa sensibilidad | `artifact.put` recibe kind/class/producer/lineage del caller (`gateway/src/tools/artifact.js:8-15`) |
| Audit seguro | Redis recibe metadata limitada | Correcto para Redis; JSONL conserva evento original (`gateway/src/core/audit.js:69-90,171-233`) |
| Coordination efímera | Leases, ACK y TTL limitan vida | Presence/dedupe/tombstones sí; inbox puede persistir y events no se trimmean automáticamente |
| Telemetría | No prompts/content/stdout/stderr | La allowlist de telemetry lo cumple; audit JSONL es otro sink |
| Ficheros privados | Workspace local bajo operador | Código no fija mode para DB/artifacts/audit; metadata observada mostró `0644/0664` |
| Durabilidad | SQLite/Postgres/Temporal soportan recovery | No hay política demostrada de backup, restore, retention o erase coordinado |
| Provider no persistence | Claude usa `--no-session-persistence` | No cubre provider policy, otros CLIs, MCP host, Temporal, JSONL o artifacts |

### Observación metadata-only del workspace

Sin abrir contenidos se observaron:

- `state.db`: 204.800 bytes, modo `0644`;
- `audit/events.jsonl`: aproximadamente 342 KiB, modo `0664`;
- 81 artifact files: aproximadamente 199 KiB agregados, todos modo `0664`;
- directorios del workspace/artifacts: `0775`;
- message access key: `0600`;
- una muestra runtime de 36 Gateways, 35 sobre el mismo SQLite/WAL.

Con semántica Unix ordinaria, `0644/0664` hace estos datos legibles por otros
usuarios del host y `0664` permite escritura al grupo; ACLs, namespaces o
cifrado de disco externos podrían reducir el riesgo, pero no son propiedades
demostradas por el producto. No se afirma que haya PII en esos ficheros.

### Sharing, subprocessors y alcance regulatorio

Codex, Claude y Gemini reciben prompt/cwd y pueden leer el repo según su runtime
(`gateway/src/adapters/codex_adapter.js:218-243`;
`gateway/src/adapters/claude_adapter.js:159-179`;
`gateway/src/adapters/gemini_adapter.js:108-119`). Redis, Postgres y Temporal
aceptan endpoints configurables. El repositorio no mantiene un registro de
proveedor, finalidad, categorías transmitidas, residencia, retención del
tercero, training settings, DPA/SCC o mecanismo de borrado.

Si los textos contienen una persona identificada o identificable, GDPR/UK GDPR,
CCPA/CPRA u otras normas podrían aplicar según jurisdicción, rol y uso real.
Counsel debe resolver controller/processor, lawful basis, notices/consent,
transferencias, DPIA, legal holds y SLAs de derechos. HIPAA, PCI DSS, eIDAS u
otros marcos no se pueden inferir de este código.

## Data & Privacy Audit

### Lista priorizada

| ID | Severidad | Dimensión | Estado al corte / posterior | Hallazgo |
|---|---|---|---|---|
| DATA-01 / DP-01 | **High** | Lifecycle y derechos | Abierto / abierto | No hay retention, export o erase end-to-end ni política de backups |
| DP-02 | **High** | Minimización/derived data | Abierto / abierto | Prompt/output se replica en Temporal, cache y checkpoints |
| DP-03 | **High** | Classification/lineage | Abierto / abierto | Labels y provenance son caller-asserted; sanitizer estrecho |
| DP-04 | **High** | Data access/isolation | Abierto / abierto | Principal y ownership inconsistentes; IDs sustituyen authZ |
| DP-05 | **High contextual** | At-rest/audit | Abierto / abierto | Plaintext sensible potencial con modes `0644/0664` y JSONL no minimizado |
| DP-06 | **High** | Consistencia/ownership | Observado / abierto | Decenas de Gateways comparten store sin single-writer ni outbox |
| DP-07 | **Medium** | Subprocessors/egress | Abierto / abierto | Terceros y transferencias no inventariados ni limitados por clase |
| DP-08 | **Medium** | Governance/privacy | Abierto / abierto | No hay owner, purpose, RoPA/DPIA trigger, lawful-basis o rights policy |
| DP-09 | **Medium** | Redis lifecycle | Abierto / abierto | TTL parcial, events unbounded y consumer sin cursor durable |
| DP-10 | **Medium** | Modeling/integrity | Abierto / abierto | FKs y coherence constraints incompletas |
| DP-11 | **Medium** | Semántica/lineage | Abierto / abierto | Approval payload se sobrescribe, reply parent se pierde y hay dual source |
| DP-12 | **Medium** | Migration safety | Abierto / abierto | Migration Postgres y marker no son una transacción común |
| DP-13 | **Medium** | Temporal/consistency | Abierto / abierto | Idempotencia en cache de proceso y approval signal no ligada |
| DP-14 | **Medium** | Data contracts | Abierto / parcialmente mejorado | JSON Schema, SQL, tools y runtime divergen |
| DP-15 | **Medium** | Observability/quality | Abierto / abierto | No hay SLAs/monitores de orphan, freshness, retention, lag o DSR |

### DP-01 — No existe lifecycle, export o erase end-to-end

- **Hechos:** el registry no expone export/delete/erase
  (`gateway/src/tools/index.js:28-37`). Los repositorios de artifacts y messages
  sólo crean/leen/listan (`gateway/src/core/repositories/artifact_repo.js:3-27`;
  `gateway/src/core/repositories/message_repo.js:3-27`) y audit sólo
  append/query (`gateway/src/core/audit.js:69-90,248-273`). Redis coordination
  borra deliveries al ACK, pero no todas sus copias de metadata; Temporal sólo
  configura address/task queue (`orchestrator-langgraph/src/orchestrator_langgraph/worker.py:17-33`).
- **At-rest reality:** los `ON DELETE CASCADE` sólo cubren
  orchestration→tasks→sessions (`gateway/migrations/001_initial.sql:19-40`);
  no existe una operación que inicie ese borrado y artifacts/messages/
  approvals/policy decisions no participan en la cascada.
- **Consecuencia:** retención implícita indefinida y una solicitud de acceso,
  portabilidad, rectificación o borrado no puede reconciliar SQL, files,
  JSONL, Redis, Temporal, caches y backups.
- **Backups:** Docker define volúmenes persistentes
  (`docker/docker-compose.yml:16-17,32-33`), pero no se encontró backup/restore,
  retention, legal-hold ni borrado de backups en el repo. No se afirma que no
  exista externamente.
- **Recomendación:** catálogo primero; coordinator idempotente por scope/trace
  que exporte, borre o tombstonee cada adapter, registre sólo metadata del
  resultado y tenga política explícita para backups e histories legacy.

### DP-02 — Outputs y prompts se multiplican sin minimización

- **Hechos:** el workflow input contiene repo/cwd y tres prompts
  (`orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:61-85`).
  Delegate/review devuelven el resultado completo
  (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:141-191`).
  El workflow inserta esos resultados en checkpoints (`workflows.py:250-264`)
  y `checkpoint_activity` serializa el state entero como
  `workflow_checkpoint` (`activities.py:256-293`).
- **Flujo:** el mismo output puede residir en respuesta MCP, history de
  activity, state/result del workflow, cache de proceso y artifact file. El
  default de checkpoint es `internal`, no derivado de la clasificación del
  repo (`workflows.py:79-80`).
- **Consecuencia:** código, path, secretos o texto personal potencial se
  replica en stores con distinta retención y acceso; una erasure se vuelve
  multistore y el blast radius de incidente crece.
- **Estado posterior:** el helper Python centralizado redacciona/trunca
  **errores** por keys sensibles, lo cual es positivo; no minimiza los
  resultados normales, history ni checkpoints.
- **Recomendación:** Temporal V2 sólo transporta IDs, digests, verdicts y
  metadata bounded; raw queda en private sink y no entra en history.

### DP-03 — Classification y provenance no se verifican en ingestión

- **Hechos:** `artifact.put` acepta cualquier kind, una classification elegida,
  `producedBy`, contenido y `sanitizedFrom`
  (`gateway/src/tools/artifact.js:8-15,58-71`). El raw se persiste antes de
  sanear (`gateway/src/core/artifact_store.js:41-69`). El sanitizer sólo cubre
  secret con label, path `/home`, UUID y `internal/private` path
  (`policies/sanitization-rules.json:3-31`).
- **Otros inputs:** `message.send/reply` acepta body libre sin class o byte cap
  (`gateway/src/tools/message.js:50-100`) y `approval.request.context` es
  `record(any)` (`gateway/src/tools/approval.js:7-17`).
- **Contraste positivo:** coordination prohíbe `restricted`, limita a 65 KiB,
  valida shape y escanea un patrón de secret
  (`gateway/src/services/coordination_service.js:209-228,335-393`).
- **Consecuencia:** un output restricted etiquetado `internal` o con kind nuevo
  evita la ruta de sanitization; `sanitizedFrom` no prueba una transformación
  autorizada ni digest.
- **Recomendación:** classification/source lineage server-derived, catálogo
  cerrado, invariants de source→derivative y validación antes de persistir.

### DP-04 — El modelo de acceso legacy no demuestra aislamiento

- **Hechos:** messages sí exige HMAC por trace
  (`gateway/src/tools/message.js:50-100`;
  `gateway/src/core/trace_access.js:9-19`). En contraste, `artifact.get` recibe
  requester agent/role del caller, `artifact.list` sólo trace, y
  `artifact.share` también recibe requester textual
  (`gateway/src/tools/artifact.js:17-31,74-125`). Approval poll/respond usa
  approval ID (`gateway/src/tools/approval.js:20-45`); lifecycle usa IDs.
- **Contexto operativo:** nested Gateways y múltiples procesos abren el mismo
  store, por lo que la hipótesis no es ya “un único proceso controlado”.
- **Consecuencia:** quien accede al MCP y conoce un ID puede autoafirmar role o
  leer metadata en superficies sin capability uniforme. No se confirma una
  fuga cross-tenant porque multi-user está fuera del scope declarado.
- **Recomendación:** principal server-side, handles scoped y access checks
  uniformes antes de considerar relay, daemon compartido o multi-tenant.

### DP-05 — Audit y stores plaintext tienen permisos demasiado amplios

- **Hechos de código:** audit escribe el objeto original, incluido texto que el
  producer añada (`gateway/src/core/audit.js:69-90`), mientras sólo Redis pasa
  por la proyección saneada (`:171-233`). Artifact usa
  `fs.writeFileSync(filePath, content)` sin mode
  (`gateway/src/core/artifact_store.js:85-102`) y state/audit tampoco fijan
  permisos privados al crear. No hay cifrado de aplicación.
- **Hechos metadata-only:** state `0644`, audit y 81 artifacts `0664`,
  directorios `0775`; message key `0600`. No se leyó contenido.
- **Ejemplos de sobrecolección:** SESSION_INPUT guarda hasta 200 chars de
  prompt (`gateway/src/adapters/codex_adapter.js:61-69`), approval auto-grant
  registra context completo (`gateway/src/services/approval_service.js:27-46`)
  y una línea corrupta se devuelve raw (`gateway/src/core/audit.js:257-265`).
- **Consecuencia:** en host multi-user, otros usuarios pueden leer stores y el
  grupo puede alterar audit/artifacts. Cifrado de disco o ACL externos podrían
  mitigar, pero no se validaron.
- **Recomendación:** root `0700`, files `0600`, umask/ACL verificadas, audit
  schema minimizado y, si el threat model lo exige, cifrado gestionado fuera o
  dentro de la aplicación con rotación probada.

### DP-06 — Multiwriter observado rompe ownership y consistencia

- **Hechos:** 35 Gateways de la muestra apuntaban al mismo SQLite/WAL. SQLite
  serializa transacciones, pero no resuelve ownership lógico, procesos
  duplicados ni writers con distinta config/policy.
- **Seams:** approval wake es `EventEmitter` process-local
  (`gateway/src/services/approval_service.js:114-149`); audit Redis es
  best-effort sin outbox (`gateway/src/core/audit.js:147-169`); el CLI puede
  decidir en SQLite/JSONL por una ruta distinta y dejar Redis desactualizado.
- **Consecuencia:** waits perdidos hasta timeout, eventos ausentes/duplicados,
  interleaving JSONL, estado observado distinto por consumer y attribution
  ambigua. Es un problema de calidad de datos además de operación.
- **Recomendación:** un owner long-lived, durable operations/idempotency,
  outbox/reconciliation y prohibición de DB/audit directo desde children/CLI.

### DP-07 — Egress y subprocessors no están gobernados

- **Hechos:** adapters entregan prompts y cwd a CLIs de Codex/Claude/Gemini; el
  alcance real de lectura/red depende de cada CLI y modo. Redis, Postgres y
  Temporal pueden ser remotos. No hay egress allowlist por data class,
  subprocessor register o residency control.
- **Consecuencia:** código o PII potencial puede llegar a proveedor/región o
  retención no aprobados, y una erasure local no demuestra borrado del tercero.
- **Recomendación:** registro de terceros y flows, approved destinations por
  clasificación, provider settings/retention verificables, y procurement/
  counsel para DPA/SCC/residency. No se evalúa aquí la suficiencia legal.

### DP-08 — Accountability y postura privacy no están formalizadas

- **Hechos:** registries describen agents/repos/roles, no dataset owner,
  purpose, PII, lawful basis, retention, rights, residency o legal hold. No se
  encontró RoPA, DPIA trigger, DPO/privacy owner ni DSR runbook.
- **Consecuencia:** no puede responderse de forma reproducible “qué datos
  tenemos, por qué, dónde, durante cuánto, quién accede y con quién se
  comparten”. La operación depende de conocimiento tribal.
- **Recomendación:** catálogo versionado y machine-checkable más decisiones de
  counsel; trigger de revisión al habilitar PII, multi-user, store remoto,
  provider nuevo o repo regulado.

### DP-09 — Redis tiene lifecycle y observabilidad parciales

- **Hechos:** presence, dedupe, ACK tombstone y orphan inbox tienen TTL
  configurable (`gateway/src/config.js:108-142`). Mientras un participant está
  activo, el inbox se marca `PERSIST`; tras unregister/stale se aplica TTL
  (`gateway/src/core/coordination_queue.js:115-212`). El stream de events usa
  `XADD` sin trim (`:134,168,206,456`).
- **Consumer:** metrics empieza en `$`, guarda cursor sólo en memoria, hace una
  lectura y sale (`orchestrator-langgraph/src/orchestrator_langgraph/consumers/metrics.py:137-184`).
- **Consecuencia:** inbox huérfano puede vivir hasta cleanup, events crece
  indefinidamente y restart del consumer pierde el cursor/lag; el sink audit
  Redis puede divergir de JSONL.
- **Recomendación:** retention por edad/tamaño, consumer group/cursor durable,
  DLQ, lag/freshness alerts y reconciliation con el source autorizado.

### DP-10 — Referential integrity y coherencia de trace son incompletas

- **Hechos:** tasks referencia orchestration y sessions referencia task, pero
  `sessions.trace_id`, artifacts, messages, policy decisions y approvals no
  tienen FK a trace (`gateway/migrations/001_initial.sql:19-81`). El FK
  `sanitized_from` no comprueba misma trace, clase, kind o digest (`:42-50`).
- **Consecuencia:** orphans, rows cross-trace incoherentes, cascades parciales y
  export/erase incompletos aunque se añada delete de orchestration.
- **Recomendación:** constraints o claves compuestas, migración con quarantine
  de orphans, invariant de derivative y tests de SQLite/Postgres parity.

### DP-11 — La lineage semántica se pierde o tiene dos fuentes

- **Approval:** al decidir con note, `payload = COALESCE(note,payload)`
  reemplaza el context original
  (`gateway/src/core/repositories/approval_repo.js:57-75`). Se pierde qué se
  aprobó, justo cuando más importa para audit.
- **Messages:** `parentMessageId` aparece en response/audit, pero no se persiste
  en la fila (`gateway/src/tools/message.js:23-43`;
  `gateway/src/core/repositories/message_repo.js:3-10`).
- **Policy:** existe tabla/repo `policy_decisions`, pero los services observados
  escriben decisiones principalmente a JSONL, creando dos candidatos a source
  of truth.
- **Consecuencia:** reconstrucción y DSR export incompletos, attribution falsa
  y joins temporales frágiles.
- **Recomendación:** columnas/records inmutables separados para request,
  decision y note; parent FK persistida; declarar un source y derivar sus
  proyecciones.

### DP-12 — Migrations Postgres pueden quedar parcialmente aplicadas

- **Hechos positivos:** cada migration SQLite se ejecuta con su marker en una
  transacción (`gateway/src/core/state.js:19-38`).
- **Gap:** Postgres ejecuta SQL y después inserta el marker en calls separadas
  (`gateway/src/core/state.js:41-57`); no hay una transacción común ni checksum
  de migration.
- **Consecuencia:** crash entre ambos deja schema aplicado pero no marcado, o
  reintento parcial. Las diferencias con SQLite pueden aparecer tarde.
- **Recomendación:** driver/transaction real, advisory lock, checksum, dry-run
  de forward migration, rollback/roll-forward documentado y parity CI.

### DP-13 — Idempotencia Temporal no sobrevive al proceso

- **Hechos:** `activity_id` es determinista, pero la deduplicación es un
  diccionario en memoria del runner
  (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:295-335`).
  Restart, otro worker o retry después de side effect no ve esa cache.
  Approval signal conserva un dict arbitrario y no consulta la decisión exacta
  (`workflows.py:88-123,266-378`).
- **Consecuencia:** duplicación de artifacts/approvals/sessions, history que no
  representa exactamente el state Gateway y lineage rota tras replay/crash.
- **Recomendación:** operation IDs durables con uniqueness y result persistido,
  más Temporal V2 exacto (`E/1/03-06`).

### DP-14 — Contratos publicados, tools y SQL divergen

- **Ejemplos:** artifact schema enumera un catálogo cerrado y exige `path`
  (`schemas/artifact.schema.json:7-30`), pero el tool acepta cualquier kind y
  oculta path. Task schema usa `queued/blocked` y `parentTaskId`
  (`schemas/task.schema.json:7-19`), mientras SQL usa `pending` y no tiene
  parent (`gateway/migrations/001_initial.sql:19-28`). Message schema usa
  `from/to` (`schemas/message.schema.json:7-16`), runtime/SQL usa
  `fromId/toId`.
- **Consecuencia:** validación “correcta” contra el schema equivocado,
  serializaciones incompatibles y migrations que no reflejan el contrato.
- **Estado posterior:** `_contracts.py` centraliza manejo de errores y reduce un
  tipo de drift Python, pero no reconcilia schemas, MCP y SQL.
- **Recomendación:** una fuente normativa versionada que genere o valide tool,
  SQL mapping y clientes; contract tests desde la respuesta MCP real.

### DP-15 — No hay data-quality SLAs ni monitores de lifecycle

- **Hechos:** hay métricas básicas de eventos aceptados/rechazados y latencia
  (`orchestrator-langgraph/src/orchestrator_langgraph/consumers/metrics.py:123-184`),
  pero no controles de orphan rate, trace coherence, duplicate operation,
  retention overdue, export/erase completeness, backup age/restore, Redis lag,
  audit parity o storage growth.
- **Consecuencia:** drift y acumulación sólo se detectan al fallar una operación
  o durante una auditoría manual.
- **Recomendación:** SLIs por dataset, thresholds, metadata-only reconciliation
  y drills periódicos sin exponer contenido.

### Fortalezas a preservar

- SQLite habilita WAL/FKs y ejecuta migrations locales en transacción
  (`gateway/src/core/state.js:19-38,70-76`).
- Status/classification tienen CHECK constraints y approvals son first-wins.
- Artifact paths usan segmentos seguros y `artifact.share` exige misma trace y
  falla cerrado si falta sanitized derivative.
- Message access usa HMAC y comparación constant-time; el key nuevo se crea
  `0600`.
- La proyección Redis de audit elimina keys raw/prompt/payload/content y limita
  tamaños (`gateway/src/core/audit.js:171-237`).
- Telemetry usa allowlist de metadata y no incluye los payloads principales.
- Coordination valida shape/tamaño/classification, usa TTL, dedupe, fencing,
  ACK atómico y no replica bodies en el stream de events.
- Temporal separa workflow determinista de I/O en activities, base adecuada
  para replay una vez que payload e idempotency se endurezcan.
- No existe un modelo nativo de perfiles de cliente o pagos; la gobernanza
  puede concentrarse primero en texto libre, código, output y operator identity.

## Strategy

### Temas, estado objetivo y controles

| Tema | Estado objetivo | Principio | Control permanente |
|---|---|---|---|
| Catálogo y accountability | Cada dataset/campo tiene owner, purpose, class, source, retention, rights y destinations | One owner, purpose limitation | Catálogo versionado; CI falla en store/campo no catalogado |
| Minimizar antes de persistir | Temporal/audit/MCP sólo IDs, digests, verdicts y metadata necesaria | Data minimization, privacy by design | Canaries que buscan prompt/diff/stdout/path/secret en history y sinks |
| Lifecycle como operación | Export/erase/retention coordinados, reanudables y auditables | Deletion first-class | Drill periódico multistore y backup policy test |
| Isolation y single source | Un Gateway owner, principal uniforme, outbox y lineage inmutable | Least privilege, one writer | Lock/capability tests y reconciliation metadata-only |
| Contratos/calidad observables | Schema normativo, migrations seguras y SLIs | Correctness by construction | Contract/parity CI, orphan/lag/retention alerts |

### Trade-offs recomendados

- No aplicar un detector PII universal a todo código: generaría falsos
  positivos y no sustituye class derivada del repo/task; sí usar canaries y
  reglas específicas para logs/egress.
- No hace falta una plataforma de data governance empresarial para UUIDs y
  metadata sintética de bajo volumen; un catálogo versionado en repo y owners
  explícitos es suficiente inicialmente.
- Puede aceptarse cifrado por full-disk/volume en despliegue single-user si se
  verifica y documenta, pero modes privados, no heredar secrets y retention
  siguen siendo obligatorios.
- No reescribir histories Temporal V1 in-place: mantener compatibilidad/replay,
  cerrar nuevas ejecuciones raw y dejar que expire/borrar según política.

### Señales de “done”

- 100 % de datasets y campos libres con owner, purpose, classification, source,
  retention, access y destinations aprobados; cero `forever` implícito.
- Export/erase por trace/scope probado sobre SQL, artifacts, JSONL compactado,
  Redis, Temporal y cache; backups tienen una política verificable.
- Ningún prompt/diff/stdout/stderr/path/secret canario aparece en audit público,
  Redis metadata, Temporal history o checkpoints.
- Stores sensibles se crean `0600` bajo dirs `0700`; acceso de otro principal
  del host falla en el lane correspondiente.
- Un solo writer por workspace y cero operación duplicada tras crash/replay.
- FKs/coherence y contract parity pasan igual en SQLite/Postgres.
- Redis tiene retention, cursor durable, lag/error alerts y restore/reconcile.
- Cada provider/store remoto tiene categoría, región, retención, owner y
  aprobación documentada; counsel valida las obligaciones aplicables.

## Plan

Se reutiliza PROJECT_V4; no se crea otro programa. `S` es menos de 2 horas, `M`
media jornada, `L` 1–2 días y `XL` requiere desglose.

### Milestone 0 — Clasificar y ganar visibilidad

| Item | Descripción y datasets | Criterio de aceptación verificable | Esfuerzo | Riesgo de cambio/data loss | Dependencias |
|---|---|---|---:|---|---|
| DATA-M0-01 / V4 `B/3/02` | Catálogo de SQL, files, JSONL, Redis, Temporal, caches y terceros | Cada dataset/campo libre declara owner, purpose, class, source, retention, rights, access y destination; CI rechaza huecos | L | Clasificación errónea bloquea flows legítimos | Decisión de owners |
| DATA-M0-02 | Inventario de backups/volúmenes y restore baseline | Se identifica cada copia, cifrado, RPO/RTO, edad y owner; restore a entorno aislado verifica integridad sin datos reales | L | Restore sobre destino equivocado; usar entorno desechable | Ops/infrastructure |
| DATA-M0-03 / V4 `B/1/04` | Runtime root privado y permisos explícitos | Dirs `0700`, files `0600`, umask/ACL tests en Linux; message key preexistente también se valida | M | Lockout del operador; migration rollback preparada | Inventario |
| DATA-M0-04 | Baseline metadata-only de calidad/acceso | Reporte cuenta orphans, duplicates, sizes, ages y writers sin mostrar body/content | M | Query pesada sobre store vivo; ejecutar snapshot/read replica | Single-writer plan |

### Milestone 1 — Cerrar exposición y derechos

| Item | Descripción y datasets | Criterio de aceptación verificable | Esfuerzo | Riesgo de cambio/data loss | Dependencias |
|---|---|---|---:|---|---|
| DATA-M1-01 / V4 `B/3/01` | Minimizar audit y todos los `auditAppend` | Schema cerrado no admite prompt/context/body/note/raw; canary no aparece en JSONL/Redis | L | Perder detalle forense; conservar IDs/digests | DATA-M0-01 |
| DATA-M1-02 / V4 `B/3/03` | Export/erase coordinator multistore | Operación idempotente elimina/exporta scope exacto, reanuda tras fallo y registra sólo metadata; no borra otro trace | XL | **Alto blast radius de borrado**; dry-run, manifest y backup obligatorio | Catálogo + backup |
| DATA-M1-03 / V4 `E/1/05` | Temporal V2 sin raw y checkpoints mínimos | History serializada carece de prompt/diff/stdout/path/secret; state usa IDs/digests | XL | Incompatibilidad replay; versionar workflow | MCP/operation IDs |
| DATA-M1-04 / V4 `B/1/00-02` | Principal, access y lineage server-side | Cross-trace/role spoof y classification falsa fallan antes de read/write; derivative ligada a source digest | XL | Clientes 0.1 dejan de funcionar | Authority/security |
| DATA-M1-05 / V4 `B/1/08-09` | Un writer, outbox y reconciliation | Segundo Gateway no abre workspace; JSONL/Redis convergen tras crash; no duplicate operation | XL | Lock/reconcile puede bloquear o revertir dato válido | Lifecycle model |
| DATA-M1-06 | Separar approval request/decision/note y persistir reply parent | Context original permanece inmutable; note no lo sobrescribe; parent FK sobre misma trace | L | Migration de payloads ambiguos | Backup + contract |

### Milestone 2 — Sistematizar governance e integridad

| Item | Descripción y datasets | Criterio de aceptación verificable | Esfuerzo | Riesgo de cambio/data loss | Dependencias |
|---|---|---|---:|---|---|
| DATA-M2-01 | FKs/coherence y cascade policy | No se puede crear session/artifact/message/approval cross-trace u orphan; erase sigue política por dataset | XL | Orphans legacy impiden migration; quarantine explícita | DATA-M0-04 |
| DATA-M2-02 | Migration engine Postgres transaccional | SQL+marker+checksum son atómicos bajo advisory lock; crash fixture reanuda sin drift | L | DDL no transaccional específico requiere roll-forward | Driver Postgres |
| DATA-M2-03 / V4 `B/4/00-02` | Contrato MCP 0.2 normativo | Schemas, SQL mapping, clients y responses reales pasan contract parity; 0.1 retirado tras compat window | XL | Cutover de CLI/Temporal | Authority/lineage |
| DATA-M2-04 | Redis retention y consumer durable | Events/inbox cumplen edad/tamaño; consumer group conserva cursor y expone lag/DLQ | L | Trim prematuro pierde evidencia; capacidad/edad aprobadas | Catálogo retention |
| DATA-M2-05 | Registro de providers/subprocessors y egress | Cada destination está allowlisted por class/purpose/region; destino no aprobado falla antes de launch | L | Bloquear provider necesario | Counsel/procurement |
| DATA-M2-06 | Política de backups vs erasure/legal hold | Backup expira o aplica tombstone en restore; legal hold es explícito, scoped y auditable | L | Borrado incompatible con obligaciones; decisión legal | DATA-M0-02, counsel |

### Milestone 3 — Calidad y observabilidad

| Item | Descripción y datasets | Criterio de aceptación verificable | Esfuerzo | Riesgo de cambio/data loss | Dependencias |
|---|---|---|---:|---|---|
| DATA-M3-01 | SLIs y alerts de calidad/lifecycle | Dashboards/alerts cubren orphan, duplicate, parity, lag, retention overdue, storage growth y DSR failures | L | Ruido y cardinalidad | Catálogo + metrics |
| DATA-M3-02 / V4 `B/5/01-02` | E2E data/isolation adversarial | Corpus prueba raw egress, cross-trace, crash, partial erase, grant/replay y audit parity con stores reales | XL | Fixtures contienen datos sensibles; usar canaries sintéticos | Milestones 1–2 |
| DATA-M3-03 / V4 `E/2/01` | Lane stack real | Postgres+Redis+Temporal+un Gateway prueba migration, restore, retention, approval parity y no-raw | XL | Flakiness/coste CI | DATA-M3-02 |
| DATA-M3-04 | Rights y recovery drills periódicos | Export/erase y restore/tombstone cumplen SLA medido; evidencia no contiene el dato exportado | L recurrente | Ejecución accidental en prod; environment guard | Ownership/runbook |

### Quick wins

- Crear workspace/artifacts/audit/state bajo `0700/0600` y verificar el mode de
  paths preexistentes al boot; **S/M, alto impacto**.
- Retirar previews de prompt y context completo de nuevos eventos JSONL,
  conservando IDs/digest/status; **S/M**.
- Añadir byte caps y classification explícita a messages y approval context;
  rechazar unknown keys; **S/M**.
- Separar `approval.note` de `approval.payload` para nuevas decisiones y dejar
  de sobrescribir context; **M**.
- Definir provisionalmente owner y retention para cada store actual, incluso
  antes de activar sweepers; **S**.
- Añadir `XTRIM`/retention configurable al stream de metadata y alertar cuando
  el consumer empieza en `$` sin cursor durable; **M**.
- Enrutar decisiones CLI por el mismo service/outbox que Gateway para evitar
  JSONL/Redis divergentes; **M**.

### Sketch de los tres items prioritarios

#### 1. Catálogo + export/erase end-to-end

- **Enfoque:** catálogo machine-readable alimenta un coordinator por scope,
  con adapters SQL, artifact bytes, JSONL compaction, Redis y Temporal.
- **Rollout:** inventario y export dry-run; backup/restore aislado; erase
  shadow que sólo produce manifest; luego habilitar por clase con two-person
  approval y rate limit.
- **Blast radius:** es la operación de mayor riesgo de pérdida; el scope debe
  resolverse server-side, congelar el manifest de objetos y rechazar IDs
  cross-trace.
- **Verificación:** dataset sintético con canary en todos los stores; export es
  completo, erase elimina live copies, restore respeta tombstone y ningún
  trace vecino cambia.

#### 2. Minimizar output, audit e history Temporal

- **Enfoque:** private sink conserva raw sólo si el catálogo lo autoriza;
  MCP/Temporal/audit transportan IDs, digest, verdict, status y tamaños.
- **Rollout:** workflow version V2; nuevas ejecuciones dejan de escribir raw;
  V1 queda read-only hasta expiry, sin reescribir histories existentes.
- **Blast radius:** bajo en datos live, medio en debugging/replay; asegurar
  que los IDs permiten recuperar material sólo con capability autorizada.
- **Verificación:** prompts/diffs/stdout/path/secrets canario no aparecen en
  histories, JSONL, Redis, errors ni checkpoints; el workflow sigue
  reproduciendo el mismo verdict.

#### 3. Runtime privado y single-writer

- **Enfoque:** mover state/audit/artifacts fuera del repo montado, modes
  privados, lock por workspace, outbox y reconciliation.
- **Rollout:** detener admissions, snapshot/backup, copiar a destino temporal,
  verificar checksums/row counts metadata-only, swap atómico y rollback path;
  no borrar el origen hasta el drill.
- **Blast radius:** medio/alto si se mueve el workspace equivocado o el lock
  queda huérfano; validar path canónico y boot ID.
- **Verificación:** segundo Gateway falla, child no abre stores, crash no
  duplica operations, JSONL/Redis convergen y la copia original sigue
  recuperable durante la ventana acordada.

## Open Questions

1. ¿Qué datos reales pueden aparecer en goals, prompts, commits, messages,
   approval notes y outputs: nombres, emails, tickets, customer data, secretos
   o categorías especiales?
2. ¿Qué jurisdicciones y roles legales aplican; quién es controller/processor y
   cuál es la lawful basis/purpose aprobada? Requiere counsel.
3. ¿Quién será data owner y privacy owner/DPO, si aplica, para cada dataset?
4. ¿Cuál es la retention por clase y store, incluyendo audit, Temporal history,
   Redis, artifacts y backups; qué legal holds prevalecen?
5. ¿Qué SLA se exige para access, rectification, portability y erasure, y cuál
   es la unidad de scope: persona, trace, repo, workspace u organización?
6. ¿El workspace actual contiene sólo fixtures/sintético o material real? No se
   inspeccionó contenido y no debería hacerse sin autorización/protocolo.
7. ¿Qué providers/modelos reciben cada clasificación, en qué región, con qué
   retención/training settings y bajo qué DPA/SCC?
8. ¿Redis, Postgres y Temporal serán locales o gestionados; qué encryption,
   ACL, namespace, backup y residency aporta el entorno?
9. ¿El host es estrictamente single-user y full-disk encrypted, o los modes
   `0644/0664` exponen datos a otros principals?
10. ¿Cuál es el RPO/RTO, dónde viven las copias y cuándo fue el último restore
    probado?
11. ¿Hay obligación de conservar audit inmutable; durante cuánto y cómo se
    reconcilia con el derecho de borrado/minimización?
12. ¿Qué métricas de calidad y privacidad deben bloquear release frente a sólo
    alertar en operación?

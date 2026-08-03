# Auditoría independiente de seguridad y threat model — PROJECT V5

- Model: gpt-5.6-sol
- Reasoning: ultra
- Execution profile: fast/priority
- Snapshot: `develop` @ `d521afb12a6520b95f1a9fb172911b16ab77a1ff` (`/tmp/agents-orchestrator-v5-audit.dx0UlX/worktree`)
- Independence: análisis nuevo y basado únicamente en el snapshot indicado; no se consultaron informes de auditoría o review previos ni sus conclusiones.

## Executive Summary

1. **Calificación: F en modo real**, porque tres rutas Critical rompen límites de confianza que el propio threat model declara obligatorios, aunque el transporte local reduzca mucho la exposición remota.
2. El primer riesgo permite a un LLM/MCP prompt-inyectado autoafirmar agente, rol, trace, task y repo, omitir `repo` y ejecutar un child sobre cualquier `cwd` situado bajo un root amplio, incluso repos o rutas excluidas.
3. El segundo devuelve `stdout` y `stderr` controlados por el child directamente al caller y ejecuta los CLIs con el UID y entorno del Gateway, saltándose el artifact store, la sanitización y la separación entre roles.
4. El tercero usa un shell interactivo de tmux como protocolo: Codex construye una línea sin quoting con `cwd`, y `agent.ask` puede convertirse en ejecución de shell cuando el CLI ya terminó.
5. Hay además un High end-to-end: la sanitización por regex puede copiar código restringido sin cambios y relabelarlo `internal`, mientras clasificación y provenance son campos aportados por el caller.
6. Otro High combina payloads, artefactos, procesos y streams sin cuotas globales, límites consistentes ni presupuesto de coste, por lo que un caller comprometido puede agotar disco, tiempo de worker o gasto de proveedor.
7. La coordinación Redis tiene controles sólidos de fencing, canonicalización, tamaño e inbox, pero su registro no prueba pertenencia al scope y el stream de metadata no tiene retención automática.
8. Temporal, Redis, Postgres y Docker son aceptables solo bajo el perímetro explícito de un operador y máquina confiables; si se comparten o quedan alcanzables, el riesgo residual escala a High.
9. La mayor oportunidad es convertir la política declarativa en una frontera real: principal server-derived, capacidades acotadas, repo/cwd canónicos, runtime aislado y resultados exclusivamente por artefactos clasificados.

## Alcance, método y calibración

La revisión cubrió el Gateway MCP, policy engine y registries, adapters de Codex/Gemini/Claude, tmux, estado SQLite/Postgres, artefactos y sanitizer, approvals, mensajes, coordinación Redis, worker Temporal/LangGraph, configuración local, Docker y CI. Se realizó análisis estático y trazado de rutas completas; no se ejecutaron exploits, procesos de agentes reales, llamadas de red, migraciones ni accesos a Redis, Postgres o Temporal compartidos. Los tests se usaron para entender contratos, no como sustituto de la implementación.

La severidad se calibró contra el alcance soportado —stdio, una máquina y un operador confiable— pero manteniendo como actores hostiles a los dos que el proyecto sí modela: el orchestrator prompt-inyectado y el child que controla su output (`docs/threat-model.md:19-42`). `Critical` se reserva a una ruta estática end-to-end con impacto alto dentro de ese perímetro; los riesgos que requieren desplegar infraestructura local como servicio compartido se marcan condicionales.

### Resumen de hallazgos

| Severidad | Cantidad | IDs |
|---|---:|---|
| Critical | 3 | SEC-01, SEC-02, SEC-03 |
| High | 2 | SEC-04, SEC-05 |
| Medium | 4 | SEC-06, SEC-07, SEC-08, SEC-09 |
| Low | 0 | — |

---

# Fase 1 — Architecture & Threat Model Discovery

## 1. Activos y security objectives

| Activo | Confidencialidad | Integridad | Disponibilidad / coste |
|---|---|---|---|
| Código y diffs `restricted` | Evitar que orchestrator, reviewer o provider no permitido reciban contenido raw | Solo el coder autorizado debe modificarlo | Debe seguir utilizable sin bloquear la máquina |
| Policies y registries | No contienen necesariamente secretos, pero revelan controles | Son la raíz de autorización; una escritura cambia la frontera | Carga determinista al boot |
| Credenciales y entorno del Gateway | Tokens de proveedor, URLs con credenciales y secretos de acceso | Evitar sustitución o uso por children | Rotación y recuperación sin downtime |
| Autoridad de approvals | La identidad del decisor puede ser sensible | Solo un operador real concede y solo para el objeto solicitado | Espera acotada, sin bypass |
| Trace/task/session state | Metadatos de trabajo y ownership | Transiciones y ownership correctos | Sin BOLA, bloqueo ni crecimiento ilimitado |
| Artefactos y provenance | Clasificación y contenido, especialmente raw | Relación source→sanitized inmutable y verificable | Retención y cuotas |
| Audit trail | Puede contener prompts, errores y contexto | No repudiable y resistente a tampering | Rotación, alertas y recuperación |
| Redis coordination plane | Metadata de participantes/mensajes | Fencing, sender/scope canónicos, ACK correcto | Backpressure y retención |
| Worker Temporal | Prompts, repo/cwd y resultados del workflow | Solo workflows y señales autorizados | Límites de intentos, tiempo y coste |
| Supply chain / CI | Secrets de CI | Dependencias y acciones no sustituibles | Builds repetibles y recuperables |

## 2. Topología y límites de confianza

```text
 Operador / MCP host / orchestrator LLM
                  |
                  | MCP stdio (una conexión; sin principal server-derived)
                  v
 +------------------------- agents-gateway --------------------------+
 | tools -> services -> policy registries                            |
 |        |             |                                            |
 |        |             +--> SQLite/Postgres                         |
 |        +----------------> artifact files + JSONL audit             |
 |        +----------------> Redis audit / coordination (opcional)    |
 |        +----------------> child CLI headless (spawnSync)           |
 |        +----------------> tmux shell + child CLI supervised        |
 +-------------------------------------------------------------------+
                  ^                         |
                  |                         +--> provider/network
                  |                              + repos/files/env
       LangGraph/Temporal worker
                  ^
                  |
     Temporal server + workflow clients/signals
```

Los límites relevantes son:

1. **LLM/host → Gateway:** stdio evita un listener de red, pero no distingue operador, orchestrator, child ni tool caller dentro de la conexión.
2. **Gateway → child CLI:** cambia de datos validados a ejecución de un proceso con el mismo UID, entorno y, salvo controles propios del CLI, filesystem/network del Gateway.
3. **Child output → Gateway/LLM:** `stdout`, `stderr` y pane snapshots son attacker-controlled según TM-02.
4. **Repo ID → cwd real:** la policy razona sobre un label opcional, mientras el adapter ejecuta sobre una ruta aportada por el caller.
5. **Raw restricted → sanitized/internal:** un transformador regex se usa como decisión de declassification.
6. **Operador → approval:** `approval.respond` está en el mismo registry MCP que consume el LLM.
7. **Proceso local → Redis/Postgres/Temporal:** el diseño confía en aislamiento de host/red externo al código.
8. **tmux → shell:** tmux crea un shell persistente y las líneas del control plane se interpretan en su foreground actual.

## 3. Entry points y datos no confiables

| Entry point | Datos controlables | Sink sensible |
|---|---|---|
| `CallTool` MCP | Nombre de tool y todos sus argumentos | Todos los services y adapters (`gateway/src/mcp_server.js:134-180`) |
| `agent.delegate/spawn/ask` | Identidad, rol, repo opcional, cwd, prompt, trace/task/session | Proceso real, tmux, repo y provider |
| `artifact.put/get/share/list` | Clasificación, producer, contenido, provenance e identidad requester | Filesystem, DB y cross-role disclosure |
| `approval.*` | Acción/contexto y decisión/decisor | Gating humano |
| `orchestration.*`, `task.assign`, `session.*` | Ownership y IDs | State machine y control de sesiones |
| `coordination.*` | Scope, display/capabilities, bodies y filtros | Redis streams e inputs de peers |
| Temporal workflow/signal | Repo, cwd, prompts, agents, roles, intentos, timeouts y status de approval | Actividades que invocan Gateway |
| Child stdout/stderr/pane | Texto arbitrario | Respuesta MCP, checkpoints, audit y siguientes prompts |
| Variables de entorno/policy JSON | Binaries, roots, URLs, auto-approval y modelos | Boot y autoridad runtime |
| CI/package metadata | Acciones y paquetes remotos | Código ejecutado en CI |

## 4. Actores y supuestos

| Actor | Confianza | Capacidad relevante |
|---|---|---|
| Operador local | Alta | Configura entorno, ejecuta Gateway y debería decidir approvals |
| MCP host / orchestrator LLM prompt-inyectado | **No confiable para autoridad** | Puede construir tool calls; TM-01 exige que policy lo contenga |
| Child agent comprometido | **No confiable** | Lee/escribe según su runtime y controla output; TM-02/TM-03 |
| Peer de coordination con lease válido | No confiable para negocio | Envía datos `internal`/`unrestricted`, nunca autoridad |
| Proceso del mismo UID | Privilegiado de facto | Puede leer env/archivos y alcanzar servicios locales según OS |
| Cliente de infraestructura compartida | Fuera del scope por defecto | Puede iniciar workflows o escribir Redis si el despliegue lo permite |
| Maintainer de dependencia/action comprometida | No confiable | Entrega código durante install/CI |

El supuesto “single trusted operator” es explícito para coordination (`docs/adr/ADR-V5-01-redis-coordination-plane.md:296-315`) y cloud/multi-user queda fuera de alcance (`docs/threat-model.md:10-16`; `docs/operator-guide.md:200-205`). No obstante, ese supuesto no vuelve confiables al texto que consume el LLM ni al output de un child: ambos están dentro del threat model.

## 5. Authentication, authorization y criptografía existentes

- El Gateway usa MCP stdio y no implementa principal de conexión; cada tool recibe identidad o solo IDs.
- `message.*` es la excepción: usa HMAC-SHA-256 sobre `traceId`, secreto aleatorio y comparación constant-time (`gateway/src/core/trace_access.js:1-20`).
- Coordination genera tokens aleatorios de 256 bits, almacena SHA-256, compara constant-time y usa fencing atómico en Redis (`gateway/src/services/coordination_service.js:591-593,801-811,854-860`).
- IDs de trace, task, session, artifact y approval usan UUID aleatorios (`gateway/src/core/ids.js:1-29`).
- El secreto legacy se crea con modo `0600`, pero el modo de un fichero preexistente no se verifica (`gateway/src/config.js:54-84`).
- La policy valida agent/repo/role/model, approvals y sanitization, pero el `repo` es opcional y `allowActions` no es una allowlist general (`gateway/src/core/policy_engine.js:49-118,313-336`).

## 6. STRIDE

| Categoría | Amenaza principal | Control actual | Gap |
|---|---|---|---|
| Spoofing | Caller afirma `role`, `agent`, `requester`, `decidedBy` o se registra en un scope | Registry syntax, UUID/lease después del registro | Sin principal/capability que pruebe quién llama |
| Tampering | Modificar repo/policies, approval, sesión o provenance | Cwd realpath, DB state transitions | Repo/cwd no ligados; operator tool compartida; provenance caller-controlled |
| Repudiation | Decisión o intervención con identidad inventada; edición del JSONL | Eventos append y UUID | Identidad no autenticada, sin cadena de integridad ni sink separado |
| Information disclosure | Raw stdout/env, “sanitized” equivalente al raw, logs | Regex, visibility matrix, telemetry allowlist | Canales directos evitan esos controles |
| Denial of service | Artefactos/payloads/processes/streams ilimitados | Timeout de adapter, inbox coordination acotado | Sin cuotas, rate/concurrency/cost budget o retención global |
| Elevation of privilege | Orchestrator se declara restricted-coder u opera sobre sesión ajena | DenyActions y agent role compatibility | Default-allow, ownership ausente y shell tmux |

---

# Fase 2 — Evidence-based Security Audit

## 7. Matriz priorizada

| ID | Severidad | Estado | Prerrequisito declarado | Impacto dominante |
|---|---|---|---|---|
| SEC-01 | Critical | Explotable; ruta estática completa | LLM/MCP caller prompt-inyectado, roots configurados y real mode | Ejecución sobre repo/ruta no autorizada; BOLA y spoof de autoridad |
| SEC-02 | Critical | Explotable; ruta estática completa | Delegación real legítima y child que controla output | Exfiltración restricted/secrets y ruptura de separación entre roles |
| SEC-03 | Critical | Explotable; ruta estática completa | Supervised tmux real y cwd malicioso o CLI terminado | Comandos arbitrarios como UID del Gateway, fuera del sandbox del CLI |
| SEC-04 | High | Explotable; ruta estática completa | Producer con acceso legítimo a raw restricted | Declassification incorrecta de código/secretos y provenance no fiable |
| SEC-05 | High | Explotable | Caller MCP comprometido; coordinación opcional para subruta Redis | Disk/CPU/provider cost exhaustion y bloqueo del Gateway |
| SEC-06 | Medium | Explotable, impacto contenido por diseño | Conocer un `scopeId` no secreto y llamar MCP | Sybil/spoof de presencia, discovery y spam same-scope |
| SEC-07 | Medium | Explotable local/defense-in-depth | Acceso mismo UID/host o datos sensibles en prompts/errors | Disclosure at rest y pérdida de evidencia confiable |
| SEC-08 | Medium → High fuera del scope local | Condicional | Temporal/Redis/Postgres/Docker compartido o alcanzable | Workflows no autorizados, forged signals, datastore takeover/DoS |
| SEC-09 | Medium | Teórico; no se afirmó CVE concreta | Compromiso de tag/action o resolución de paquete mutable | Supply-chain execution no reproducible |

## SEC-01 — Autoridad autoafirmada y recursos no ligados al principal

- **Severidad:** Critical
- **CWE / OWASP:** CWE-306, CWE-862, CWE-639, CWE-269; OWASP A01:2021, API2:2023 BOLA, API5:2023 BFLA.
- **Activos:** repos restricted, policies, approvals, sessions, artifacts y orchestration state.

### Hechos

- `createCallToolHandler` busca la tool y pasa directamente `request.params.arguments`; no crea ni propaga un principal autenticado (`gateway/src/mcp_server.js:134-180`).
- El registry LLM-facing incluye `approval.respond`, operaciones de sesiones, artifacts y todas las mutaciones de orchestration (`gateway/src/tools/index.js:28-36`).
- `agent.delegate` y `agent.spawn` aceptan `agent`, `role`, `repo?`, `cwd`, `traceId` y `taskId` del caller (`gateway/src/tools/agent.js:3-26`); el service usa esos valores como contexto de policy y arranca el adapter (`gateway/src/services/agent_service.js:105-177`).
- Si `repo` se omite, la capa de clasificación no valida clasificación, `allowedAgents` ni `excludedPaths` (`gateway/src/core/policy_engine.js:49-77`).
- `assertSafeCwd` solo prueba que el realpath esté bajo **alguno** de los `AGENTS_REPO_ROOTS`; no liga cwd a un repo lógico o task (`gateway/src/adapters/base_adapter.js:20-39`). La guía recomienda que el root sea el padre que contiene los repos (`docs/operator-guide.md:91-95`).
- La protección adicional de Codex para `excludedPaths` retorna inmediatamente cuando no hay `repo` (`gateway/src/adapters/codex_adapter.js:128-143`).
- `evaluateRole` comprueba que el agent pueda asumir el rol y aplica `denyActions`, pero no exige que la acción figure en `allowActions`; si ninguna capa deniega, el pipeline permite (`gateway/src/core/policy_engine.js:82-118,313-336`).
- Artifacts aceptan clasificación, producer, provenance e identidad requester aportados por el caller (`gateway/src/tools/artifact.js:8-31`); `approval.respond` solo exige ID, decisión y `decidedBy` textual (`gateway/src/tools/approval.js:20-29`; `gateway/src/services/approval_service.js:74-100`).
- `orchestration.view/pause/resume/cancel/complete` requieren únicamente `traceId` (`gateway/src/tools/orchestration.js:24-53`); `agent.ask/view/kill` resuelven una sesión global por `sessionId` y no comparan el `traceId` recibido con el almacenado (`gateway/src/services/agent_service.js:184-221`).

### Ruta end-to-end

1. Un artifact o mensaje inyecta al orchestrator y consigue una tool call, capacidad prevista por TM-01.
2. El caller invoca `agent.delegate` como `codex`/`restricted-coder`, omite `repo` y elige como `cwd` una ruta bajo el parent allowlisted, por ejemplo la subruta `policies/` que el registry del repo excluye.
3. Policy acepta el agent/role, omite por completo clasificación y repo/excluded paths, y `assertSafeCwd` acepta el realpath por pertenecer al parent.
4. Codex se ejecuta con `workspace-write` y `-C <cwd>` (`gateway/src/adapters/codex_adapter.js:28-38,166-243`), de modo que la frontera de autorización ya se cruzó antes de cualquier conducta del modelo.
5. Variantes con la misma causa permiten afirmar rol de requester para artifacts, conceder un approval conocido o controlar una sesión de otro trace; no se cuentan como Critical separados.

### Juicio

La ruta no necesita un atacante de red ni otro usuario del SO: usa exactamente el actor prompt-inyectado que la policy dice contener. UUIDs reducen guessing, pero un ID visible no es una capacidad y el caller normalmente conoce IDs del flujo. Es Critical porque permite cruzar repo/classification y alcanzar ejecución de código con impacto de confidencialidad e integridad.

### Remediación

Derivar el principal de la conexión/configuración del host; separar `caller` de `targetAgent/targetRole`; emitir capacidades opacas ligadas a `traceId`, `taskId`, repo canónico, acciones y expiración; resolver repo→root en servidor; exigir ownership en cada acceso; convertir `allowActions` en default-deny; y mover `approval.respond` a un canal de operador que el LLM no pueda enumerar ni invocar.

## SEC-02 — El boundary de subprocess permite raw I/O y privilegios del Gateway

- **Severidad:** Critical
- **CWE / OWASP:** CWE-200, CWE-250, CWE-284; OWASP A01:2021 y A04:2021.
- **Activos:** código restricted, tokens del entorno, filesystem, red/proveedor y separación de roles.

### Hechos

- Gemini ejecuta `spawnSync(... ["-p", "--yolo", prompt])` y devuelve `stdout`/`stderr` sin transformación (`gateway/src/adapters/gemini_adapter.js:91-121`).
- Claude usa `--permission-mode dontAsk`, no define un entorno acotado y devuelve raw I/O (`gateway/src/adapters/claude_adapter.js:26-38,126-181`).
- Codex usa un sandbox global `workspace-write`, no uno derivado del rol, y también devuelve raw I/O (`gateway/src/adapters/codex_adapter.js:24-38,166-253`).
- Al omitir `env` en `spawnSync`, los tres children heredan el entorno del Gateway y corren con su UID. El cliente LangGraph, además, copia todo `os.environ` al subprocess Gateway (`orchestrator-langgraph/src/orchestrator_langgraph/client/gateway_client.py:70-81`).
- `agentService.delegate` propaga el resultado completo y el helper lo serializa en la respuesta MCP; no se invoca artifact policy ni sanitizer (`gateway/src/services/agent_service.js:131-137`; `gateway/src/tools/tool_helpers.js:75-86`).
- El threat model ya considera que un restricted child controla su output y afirma que el artifact store es el canal legítimo entre roles (`docs/threat-model.md:32-58`).

### Ruta end-to-end

1. El orchestrator realiza una delegación **legítima** a un restricted-coder sobre un repo restricted.
2. Prompt injection en el repo, tool output o provider hace que el child imprima contenido raw —o una variable de entorno— en stdout/stderr.
3. El adapter lo incorpora al objeto result, el service lo expande y MCP lo devuelve al orchestrator.
4. La visibility matrix, `artifact.get`, sanitizer y clasificación nunca participan; arreglar solo SEC-01 no corta esta ruta.

### Juicio

Es Critical porque un child expresamente no confiable puede transferir el crown jewel completo a un rol al que la policy se lo prohíbe, y porque la falta de aislamiento deja al modelo operar con privilegios del proceso Gateway. El detalle exacto de herramientas del CLI depende de su instalación, pero la exfiltración por stdout es independiente y completa.

### Remediación

No retornar contenido de stdout, stderr, panes o exceptions desde `agent.*`; retornar solo status, métricas acotadas e IDs de artifacts. Ejecutar cada rol en un sandbox de SO con UID/worktree/env/egress mínimos; usar env allowlist sin secretos; hacer read-only los roles de lectura; y forzar que toda salida pase por un writer de artifacts server-side que asigna clasificación y provenance.

## SEC-03 — tmux convierte el control plane en una shell command channel

- **Severidad:** Critical
- **CWE / OWASP:** CWE-78; OWASP A03:2021 Injection.
- **Activos:** host, repos, credenciales y audit.

### Hechos

- `buildNewSessionCmd` crea una sesión tmux que mantiene el shell; `buildSendKeysCmd` escribe una línea seguida de `Enter` (`gateway/src/adapters/tmux_client.js:11-17`).
- Codex compone `[bin, flags, "-C", cwd].join(" ")` y envía esa línea al shell (`gateway/src/adapters/codex_adapter.js:41-47,299-313`). `assertSafeCwd` permite nombres de directorio con metacaracteres siempre que el realpath esté bajo un root.
- Los tres `ask` envían el `prompt` literal con `send-keys ... Enter` (`gateway/src/adapters/codex_adapter.js:336-350`; `gateway/src/adapters/gemini_adapter.js:169-182`; `gateway/src/adapters/claude_adapter.js:235-248`).
- El service no verifica que el proceso foreground siga siendo el CLI ni que la sesión esté `running`; solo busca el row por ID (`gateway/src/services/agent_service.js:184-201`).

### Rutas end-to-end agrupadas

1. **Launch injection:** un child que puede crear directorios prepara bajo un root permitido un cwd cuyo nombre altera el parseo del shell. El realpath pasa el guard, pero la línea Codex sin quoting se divide/interpreta al ejecutar el pane.
2. **Post-exit ask:** tras terminar o fallar el CLI interactivo, el shell de tmux vuelve a foreground. Una posterior `agent.ask` escribe el prompt en ese shell, por lo que el texto deja de ser prompt y pasa a ser comando.

Ambas rutas ejecutan como el UID del Gateway y fuera del sandbox interno del CLI.

### Juicio

La inyección no está en el argv con que Node llama a `tmux`; aparece después, cuando tmux teclea una línea en un shell. Por eso cambiar `spawnSync("tmux", args)` o escapar solo el target no resuelve la causa.

### Remediación

Reemplazar tmux-as-protocol por un proceso/PTY administrado con argv estructurado y un canal de input ligado al PID. Si tmux se conserva para observación, arrancar un wrapper fijo, no un shell genérico; verificar PID/executable y estado antes de cada input; cerrar la sesión al terminar el child; y rechazar `ask` si el foreground no es el proceso esperado.

## SEC-04 — Regex redaction se usa como declassification y provenance es caller-controlled

- **Severidad:** High
- **CWE / OWASP:** CWE-200, CWE-345, CWE-915; OWASP A01:2021 y A04:2021.
- **Estado:** explotable por un producer legítimamente autorizado para raw restricted.

### Evidencia y ruta

- El sanitizer aplica cuatro regex y devuelve éxito aunque `appliedRuleIds` quede vacío (`gateway/src/core/sanitizer.js:15-31`; `policies/sanitization-rules.json:1-33`).
- Para un `raw_code`, `raw_diff` o `raw_stacktrace` restricted, el store copia el resultado y lo marca automáticamente `internal` (`gateway/src/core/artifact_store.js:41-80`).
- Una línea de código propietario que no parezca token, UUID, home path o `internal/private` queda idéntica; un reviewer puede pedir el source y recibir el row “sanitized” (`gateway/src/tools/artifact.js:74-112`).
- `artifact.put` también permite aportar `classification`, `producedBy` y `sanitizedFrom`; si `sanitizedFrom` no es null se omite la sanitización automática (`gateway/src/tools/artifact.js:8-15,58-70`; `gateway/src/core/artifact_store.js:52-62`).
- `findSanitizedFor` confía en la relación declarada y devuelve el primer row sin validar trace, kind, clasificación, hash o attestation (`gateway/src/core/repositories/artifact_repo.js:22-27`).

### Juicio y fix

El regex es útil para redacción defensiva, no prueba que un blob deje de ser restricted. La corrección debe ser una transformación positiva: summaries/diagnostics con schema y campos allowlisted, clasificación derivada por el servidor, `sanitizedFrom` inmutable y server-only, hashes source/output y una policy que niegue cross-boundary si no existe una attestation del pipeline esperado. Añadir regex no cierra la clase.

## SEC-05 — No hay presupuesto común de recursos, concurrencia ni coste

- **Severidad:** High
- **CWE / OWASP:** CWE-400, CWE-770; OWASP API4:2023 Unrestricted Resource Consumption.
- **Estado:** explotable por un caller MCP comprometido.

### Evidencia

- Casi todos los schemas legacy usan `z.string()` sin `.max()`, incluido `prompt`, `goal`, `artifact.content`, approval context y legacy message body (`gateway/src/tools/agent.js:3-42`; `gateway/src/tools/artifact.js:8-31`; `gateway/src/tools/approval.js:11-27`; `gateway/src/tools/message.js:55-90`).
- Artifact writes son síncronos y no aplican cuota por trace, producer o workspace (`gateway/src/core/artifact_store.js:85-110`); `artifact.list`, `message.list` y `orchestration.view` no paginan (`gateway/src/tools/artifact.js:115-120`; `gateway/src/tools/message.js:68-79`; `gateway/src/services/orchestration_service.js:47-55`).
- Los adapters bloquean el event loop con `spawnSync` hasta diez minutos. `withTimeout` recibe el Promise **después** de que la llamada síncrona ya haya terminado; el timeout de service no cancela el proceso (`gateway/src/services/_with_timeout.js:1-12`; `gateway/src/adapters/codex_adapter.js:217-243`).
- No hay rate limit, límite global de procesos, budget de tokens/coste ni circuit breaker.
- Coordination sí limita bodies a 64 KiB e inbox a una longitud configurada, pero cada registro crea/persiste inbox y el metadata event stream usa `XADD` sin retención (`gateway/src/services/coordination_service.js:20-26,878-937`; `gateway/src/core/coordination_queue.js:115-139,437-457`; `docs/coordination-bus.md:141-144`).
- El audit JSONL también crece sin rotación (`gateway/src/core/audit.js:69-92`).

### Juicio y fix

Una request grande o una secuencia de artifacts llena disco; una secuencia de delegates bloquea/cuesta proveedor; múltiples registros/heartbeats hacen crecer Redis cuando está activo. Aplicar límites de request y campo antes de materializar buffers, paginación, cuotas por principal/trace, semaphore global por adapter, budget de coste, procesos async cancelables, límites de workspace y retención monitorizada para JSONL/Redis.

## SEC-06 — Coordination autentica una lease autoemitida, no la admisión al scope

- **Severidad:** Medium
- **CWE / OWASP:** CWE-287, CWE-284; OWASP A07:2021.
- **Estado:** explotable, con impacto deliberadamente contenido.

`coordination.register` requiere tipo, `scopeId`, display/capabilities/metadata y TTL, pero ninguna invitación o credencial del scope (`gateway/src/tools/coordination.js:10-17`; `gateway/src/services/coordination_service.js:231-258,878-937`). El `scopeId` está documentado como no secreto (`docs/coordination-bus.md:615-624`). Tras registrarse, el atacante sí posee una lease criptográficamente fuerte y puede descubrir peers de ese scope y enviarles mensajes (`gateway/src/services/coordination_service.js:982-1037,1084-1175`).

No se eleva a High porque el service construye sender/scope canónicos, rechaza restricted, limita tamaño/inbox y especifica que los bodies no otorgan autoridad (`docs/adr/ADR-V5-01-redis-coordination-plane.md:268-294`). Aun así, `displayName` y `capabilities` son claims no verificados y permiten Sybil, presencia engañosa y prompt spam. Si el scope representa membership, exigir una capability de bootstrap/invite emitida por el host, cap de participantes y rate limit; si se desea presencia abierta, renombrar/documentar esos claims como no autenticados y no seleccionarlos como “trusted identity”.

## SEC-07 — Audit, errores y datos locales amplían disclosure y no son tamper-evident

- **Severidad:** Medium
- **CWE / OWASP:** CWE-532, CWE-276, CWE-209, CWE-778; OWASP A09:2021.
- **Estado:** explotable por mismo UID/host; probabilidad menor en single-operator.

### Evidencia

- El JSONL escribe el evento completo; no hay hash chain, firma, sink inmutable, rotación ni modo explícito de archivo (`gateway/src/core/audit.js:69-92`).
- Los adapters guardan los primeros 200 caracteres de prompts; orchestration guarda `goal`, auto-approval el `context`, y intervention notes hasta 4.000 caracteres (`gateway/src/adapters/codex_adapter.js:61-69`; `gateway/src/services/orchestration_service.js:35-42`; `gateway/src/services/approval_service.js:37-46`; `gateway/src/tools/session.js:31-38`).
- Artifacts se escriben sin modo explícito y SQLite se crea con defaults del proceso (`gateway/src/core/artifact_store.js:85-110`; `gateway/src/core/state.js:60-76`).
- Errores de tools retornan `err.message`; el boot log puede incluir stack y rutas (`gateway/src/tools/tool_helpers.js:75-86`; `gateway/src/mcp_server.js:233-236`).
- URLs Redis/Postgres, potencialmente con password, se pasan en argv a `redis-cli` y `psql` (`gateway/src/core/audit.js:94-121`; `gateway/src/core/postgres_db.js:72-75`).

El modo `0600` del secreto legacy y la telemetry allowlist son fortalezas, pero no protegen el resto del workspace. Usar directorios `0700` y ficheros `0600`, comprobar/reparar modos preexistentes, redactar antes del JSONL, separar audit bajo otro UID/sink o encadenarlo criptográficamente, rotar por tamaño/tiempo, no retornar mensajes internos al caller y evitar credenciales en argv mediante clients nativos o mecanismos de credenciales del proceso.

## SEC-08 — El local-only boundary no falla cerrado al pasar a infraestructura compartida

- **Severidad:** Medium en el scope soportado; **High residual** si hay red/tenant no confiable.
- **CWE / OWASP:** CWE-306, CWE-319, CWE-400, CWE-1188; OWASP A05:2021.
- **Estado:** condicional; no se ejecutó contra infraestructura.

- El worker Temporal solo configura `address` y `task_queue`, y llama `Client.connect(address)` sin opciones de TLS, credencial o namespace (`orchestrator-langgraph/src/orchestrator_langgraph/worker.py:16-31,53-67`).
- El workflow payload controla repo, cwd, prompts, agents, roles, intentos y timeouts; solo se validan mínimos, no máximos (`orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:60-84,150-172`).
- La signal `approval_response` acepta un dict y el workflow solo mira `status`, sin ligar actor, `approvalId`, action, repo o attempt (`orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:87-122,265-377,478-479`).
- Docker publica Postgres y Redis en todas las interfaces por defecto, con password de desarrollo trivial y Redis sin auth/TLS (`docker/docker-compose.yml:8-33`).
- La documentación reconoce que raw Redis puede eludir validación y que el compose local no es un security boundary multi-tenant (`docs/adr/ADR-V5-01-redis-coordination-plane.md:92-95,296-315`; `docs/coordination-bus.md:759-771`).

Mientras todo permanezca loopback/host confiable, esto es una asunción de despliegue, no una exposición remota del Gateway. Para cualquier dirección no-loopback o servicio compartido, fallar al boot si faltan TLS/mTLS/API key, namespace y ACL; autenticar la identidad del starter/signal; poner máximos de workflow; correlacionar la signal con el approval persistido; bindear compose a `127.0.0.1`; y usar credenciales/ACL por prefix y network policy.

## SEC-09 — CI no consume el lock Python ni fija actions por digest

- **Severidad:** Medium
- **CWE / OWASP:** CWE-494, CWE-829; OWASP A06:2021.
- **Estado:** teórico; no se consultaron feeds de vulnerabilidades ni se afirma un CVE.

CI usa `actions/checkout@v4`, `setup-node@v4` y `setup-python@v5`, no SHAs inmutables (`.github/workflows/ci.yml:21-35`). Aunque existe `requirements.lock`, CI instala los dos proyectos editables resolviendo rangos desde sus `pyproject.toml` (`.github/workflows/ci.yml:38-43`; `cli/pyproject.toml:7-17`; `orchestrator-langgraph/pyproject.toml:7-19`). El gate local cae a `npm install` si falta `node_modules`, en vez de fallar o usar siempre `npm ci` (`scripts/ci.sh:19-25`). No hay secret scan, SCA/OSV, SBOM o provenance gate.

Como fortalezas, npm sí tiene lock v3 con integrity hashes y el workflow limita `GITHUB_TOKEN` a `contents: read` (`gateway/package-lock.json:1-4`; `.github/workflows/ci.yml:13-14,28-30,43`). Consumir un lock Python compatible con 3.11 y hashes, fijar actions por commit, eliminar el fallback mutable, ejecutar secret/SCA scanning y producir SBOM/provenance.

## 8. Cobertura por dimensión

| Dimensión | Resultado |
|---|---|
| Authentication / identity | Fallo central en SEC-01; lease/HMAC puntuales no forman una identidad común |
| Session / object ownership | SEC-01 y SEC-03; IDs no se ligan a principal/trace en todos los paths |
| Authorization / least privilege | SEC-01, SEC-02 y SEC-04; policy declarativa no controla el runtime |
| Input validation / injection | SEC-03 y SEC-05; coordination es la excepción positiva con validación estricta |
| Secrets / crypto | Primitivas correctas en IDs/HMAC/leases; handling runtime y at-rest en SEC-02/SEC-07 |
| Supply chain | SEC-09; no se verificó vulnerabilidad concreta |
| Web/API security | No aplica CORS/CSRF/cookies/headers: no existe HTTP listener en el snapshot |
| Configuration / deployment | SEC-08; seguro solo si se mantiene el perímetro local declarado |
| Data protection / privacy | SEC-02, SEC-04, SEC-07 |
| Logging / detection / IR | SEC-07; hay eventos útiles, pero sin integridad, retención o alertas suficientes |
| Abuse / rate / cost | SEC-05 y SEC-06 |

## 9. Fortalezas observadas

1. **Superficie remota pequeña:** MCP usa stdio y no abre HTTP (`gateway/src/mcp_server.js:187-230`).
2. **Paths básicos:** `realpath` bloquea `..`/symlink escape fuera de roots y artifact filenames se normalizan (`gateway/src/adapters/base_adapter.js:12-39`; `gateway/src/core/artifact_store.js:22-35`).
3. **Coordination robusta después de admission:** IDs/key parts canónicos, leases aleatorias, digest y constant-time, fencing Redis atómico, sender/scope construidos por servidor, dedupe, ACK validado, body/inbox bounds y errores estables (`gateway/src/core/coordination_contract.js:18-113`; `gateway/src/services/coordination_service.js:801-811,1084-1175`).
4. **Criptografía apropiada para tokens de alta entropía:** UUID/randomBytes, HMAC-SHA-256 y comparaciones timing-safe; no se observó criptografía casera reversible.
5. **Approval transition atómica e idempotente:** solo `pending` cambia una vez (`gateway/src/core/repositories/approval_repo.js:57-81`); el defecto es quién puede invocarla, no la transición.
6. **SQL y Redis injection:** SQLite usa prepared statements; el adapter Postgres escapa literales y las migraciones son estáticas; coordination restringe identifiers/key parts. No se identificó una ruta SQL/Redis command injection.
7. **Telemetry minimizada:** atributos allowlisted y exceptions sin mensaje/stack cuando OTel está activo (`gateway/src/core/telemetry.js:68-105,187-210`).
8. **CI con privilegios bajos y npm reproducible:** `contents: read`, `npm ci` remoto y lock con integrity hashes.
9. **Dry-run disponible:** permite validar flujos sin lanzar CLIs reales; debe seguir siendo una herramienta de test, no presentarse como boundary del modo real.

---

# Fase 3 — Security Strategy

## 10. Causas raíz y target state

Los nueve hallazgos convergen en cinco causas:

1. **Identidad confundida con argumentos:** se autoriza al target solicitado, no al caller real.
2. **Policy sin vínculo con recursos/runtime:** repo label, cwd, task, session y child process son dominios separados.
3. **Canales no mediados:** raw stdout, filesystem compartido y tmux shell evitan artifacts/approvals.
4. **Declassification negativa:** “no hizo match con regex” se interpreta como “ya no es restricted”.
5. **Local trust sin guardrails de transición:** límites de recursos y seguridad de infraestructura dependen de disciplina operacional.

Target state:

```text
 connection principal (server-derived)
          |
          v
 capability/authz middleware --default deny--> operator-only approval channel
          |
          +--> task capability {trace, task, repo, target role, actions, expiry}
                         |
                         v
             canonical repo resolver
                         |
                         v
       isolated role runtime (argv/PTY, clean env, egress policy)
                         |
                         v
       classified artifact writer -> positive declassifier -> consumer
                         |
                         +--> bounded, tamper-evident audit
```

## 11. Principios y guardrails

### Tema A — Principal y capacidades, no claims

- Una conexión tiene un principal inmutable, definido al arrancar el MCP host o mediante un bootstrap local protegido por permisos del SO.
- `agent`/`role` pasan a significar **target**, nunca caller.
- Cada mutación o lectura sensible exige una capability server-issued, de corta vida y ligada a trace/task/repo/action.
- IDs continúan siendo identificadores, nunca bearer tokens.
- `allowActions` se aplica como allowlist; acción desconocida o contexto incompleto deniega.
- Approvals se responden desde un executable/socket/registry separado que el LLM no recibe.

### Tema B — Repo y runtime como un único objeto autorizado

- El registry contiene root canónico; el caller no elige un cwd arbitrario.
- Un task fija repo, subpath permitido, target agent/role y permisos de filesystem.
- Todos los adapters aplican la misma política de excluded paths.
- El runtime usa UID/worktree/env/egress distintos por rol; reviewer/documenter son read-only y restricted nunca comparte mount con un rol inferior.
- El Gateway conserva solo secretos imprescindibles y no los hereda al child.

### Tema C — Protocolo de proceso estructurado

- Headless y supervised usan argv estructurado y procesos cancelables; no hay shell como framing.
- tmux, si continúa, es una vista de observación de un wrapper fijo.
- La respuesta de `agent.*` contiene solo estado, códigos acotados y artifact IDs.
- Pane/stdout/stderr se tratan como input hostil, con tamaño máximo y clasificación inicial `restricted`.

### Tema D — Declassification positiva y provenance verificable

- El producer no asigna clasificación final ni `sanitizedFrom`.
- Source/output se ligan por IDs, hashes, trace/task y versión de transformer.
- Un “sanitized artifact” es un objeto con schema allowlisted —por ejemplo verdict, contadores y referencias—, no el raw tras regex.
- Regex permanece como defensa en profundidad para logs/telemetry.
- Una transformación fallida, desconocida o sin attestation deniega.

### Tema E — Abuse-resistance y operaciones

- Límites de bytes, objetos, procesos, tiempo, retries, Redis entries, disk y gasto por principal/trace.
- Backpressure antes de spawn/write y cancellation real.
- Deployment mode explícito: `local-single-operator` o `shared`; el segundo no arranca sin controles requeridos.
- Audit minimizado, con permisos, rotación, integridad y alertas de deny/spawn/quota/approval.
- CI instala solo artefactos fijados y ejecuta secret/SCA/provenance gates.

## 12. Trade-offs y riesgos aceptables

- **No hace falta construir IAM cloud multi-tenant para el MVP local.** Un principal por conexión, capabilities locales y permisos del SO cierran el actor LLM sin ampliar producto.
- **tmux puede conservarse como observabilidad humana**, pero no como canal de comandos programático.
- **SQLite y JSONL pueden seguir como defaults locales** si tienen permisos, cuotas, rotación e integridad suficiente; cifrado at-rest puede delegarse a disco del host si la clasificación y el modelo de compliance lo permiten.
- **Coordination puede seguir transportando datos no confiables y at-least-once.** No debe convertirse en autorización; admission puede ser una invite ligera.
- **Dry-run no sustituye aislamiento.** Es aceptable para CI, no para puntuar seguridad del modo real.
- **Redis/Postgres/Temporal sin auth solo son aceptables en loopback/namespace privado verificable.** Cualquier compartición cambia formalmente el deployment mode y activa requisitos adicionales.

## 13. Definición medible de “done”

1. Cero Critical/High abiertos y threat-model tests para cada ruta de esta auditoría.
2. El 100% de tools sensibles recibe un `SecurityContext` server-derived; una matriz automatizada demuestra deny para principal ausente, rol falso, cross-trace y cross-owner.
3. Ningún `agent.delegate/spawn` acepta repo ausente ni cwd raw; un único resolver prueba repo/task/path antes de tocar un adapter.
4. Cero bytes de prompt, stdout, stderr, pane o env aparecen en resultados `agent.*`, errores o telemetry; solo artifact IDs y metadata allowlisted.
5. Los tres adapters pasan los mismos tests de filesystem, env, egress y permisos por rol.
6. `approval.respond` no aparece en la lista de tools de una conexión LLM y toda concesión está ligada a principal, approval/action/resource/attempt.
7. Todos los strings/arrays/listados tienen límites y paginación; hay un límite global de children y budget por trace con métricas de rechazo.
8. Todo artifact cross-boundary posee provenance server-issued, hashes y transformer version; no existe API pública para fijar `sanitizedFrom` o rebajar clasificación.
9. Audit files/sinks tienen permisos verificados, rotación, retención, señal de tampering y alertas probadas.
10. CI consume locks con hashes, actions por SHA y gates de secrets/SCA/SBOM; cualquier excepción queda documentada y expira.

---

# Fase 4 — Detailed Remediation Plan

## 14. Roadmap M0–M3

| ID | Hito | Cambio y archivos probables | Criterio de aceptación | Esfuerzo | Riesgo / dependencias |
|---|---|---|---|---|---|
| M0-01 | M0 Contención | Hacer real execution opt-in explícito y deshabilitar temporalmente `agent.spawn/ask`; `config.js`, `tools/agent.js`, adapters | Sin flag de operador, ningún binary/tmux se invoca; tests con process spies prueban cero calls | S | Cambia UX; documentar migración |
| M0-02 | M0 Contención | Retirar `approval.respond` del registry LLM y ofrecer canal local operator-only mínimo; `tools/index.js`, CLI/operator entrypoint | `tools/list` LLM no contiene `approval.respond`; una decisión requiere canal y principal de operador | S–M | Necesita definir mecanismo local de operador |
| M0-03 | M0 Contención | Rechazar `repo` ausente, `cwd` no ligado y `sanitizedFrom` externo; límites iniciales para prompt/artifact/context | Requests incompletas fallan antes de DB/fs/spawn; pruebas cubren omit/mismatch/oversize | M | Solución temporal hasta resolver canónico |
| M0-04 | M0 Contención | Eliminar raw I/O de respuestas `agent.*` y snapshots de conexiones LLM | Canaries en stdout/stderr/pane no aparecen en respuesta, error, audit o telemetry | M | Consumers actuales que parsean output deben usar artifacts |
| M0-05 | M0 Visibilidad | Métricas/alertas locales para spawn, deny, approvals, quota y disk; runbook de incidente | Smoke genera y valida cada alerta sin registrar contenido sensible | M | Requiere acordar destino local |
| M1-01 | M1 Identidad | Introducir `SecurityContext` de conexión y capability signer/verifier; middleware único en MCP | Todas las tools sensibles deniegan sin principal/capability válida y no aceptan caller identity | XL | Diseño de bootstrap y compatibilidad clients |
| M1-02 | M1 AuthZ | Ownership para trace/task/session/artifact/approval y `allowActions` default-deny | Property/matrix tests cubren roles, objetos, acciones desconocidas y cross-trace | L | Depende M1-01; migración de state |
| M1-03 | M1 Repo | Añadir root/subpaths canónicos al registry y resolver `repo→task→cwd`; aplicar excluded paths a todos adapters | Cwd no puede apuntar a sibling, parent ni excluded; symlink/metachar/mismatch tests antes de spawn | L | Profiles y repos existentes necesitan root mapping |
| M1-04 | M1 Runtime | Sandbox por rol: UID/worktree/mounts/env allowlist/egress; wrapper común para los tres CLIs | Matriz adversarial prueba read/write/env/network mínimos por rol y provider | XL | Depende de OS/containers y capacidades de cada CLI |
| M1-05 | M1 Process control | Sustituir shell tmux por PTY/process manager con argv y PID/state binding | Metachar cwd no ejecuta nada; `ask` tras exit deniega; cancellation mata process tree | L | Interactividad y attach humano |
| M1-06 | M1 Data boundary | Artifact writer server-side, clasificación derivada, provenance/hash/transformer attestation y schema de summaries | Raw sin attestation nunca cruza; zero-match regex no declassifica; fields provenance no son públicos | L | Requiere contratos de output de agents |
| M2-01 | M2 Resiliencia | Límites/paginación/cuotas, semaphore de children, budgets y async cancellation | Tests de carga acotados prueban memory/disk/process/cost caps y recuperación | L | Métricas de uso del provider |
| M2-02 | M2 Coordination | Invite/admission opcional por scope, participant/rate caps y retención del metadata stream | Peer sin invite no entra a scope cerrado; stream queda bajo bound sin perder inbox contract | M | Versionado de protocolo/compatibilidad KYA |
| M2-03 | M2 Shared mode | TLS/credenciales/namespaces para Temporal/Redis/Postgres, max workflow y approval correlation; loopback compose | Non-loopback/shared mode falla al boot sin controles; forged signal/massive workflow denegados | L | Infra y secret management externos |
| M2-04 | M2 Storage/audit | Permisos verificados, redacción, rotación, hash chain/sink separado y credenciales fuera de argv | Startup corrige/falla modos; tampering y rotación se detectan; canaries no aparecen | M | Gestión de claves/retención |
| M3-01 | M3 Supply chain | Actions por SHA, lock Python+hashes usado en CI, `npm ci` only, secrets/SCA/SBOM/provenance | CI offline/repetible desde locks; gates fallan con fixture vulnerable/secret y publican SBOM | M | Política de excepciones y actualización |
| M3-02 | M3 Detection/IR | Dashboards/runbooks para authz deny, shell/process anomaly, quota, audit gap y infra health | Tabletop local reproduce detección, contención, rotación y recuperación con owner/SLO | M | Depende de M0-05/M2-04 |
| M3-03 | M3 Assurance | Actualizar threat model y suite adversarial cross-adapter; revisión independiente de cierre | Cada SEC tiene test ID, control primario, residual y evidencia; revisión no encuentra Critical/High | L | Depende del roadmap completo |

## 15. Quick wins de alto impacto

Estas acciones son pequeñas y no sustituyen M1:

1. Invertir el default: real agent execution y supervised tmux requieren un flag explícito de operador.
2. Sacar inmediatamente `approval.respond` del registry expuesto al LLM.
3. Hacer `repo` obligatorio, denegar `sanitizedFrom` en `artifact.put` y rechazar todo `cwd` que no corresponda temporalmente al repo declarado.
4. Añadir `.max()` a prompt, body, goal, note, IDs, arrays y context; cap inicial de artifact y paginación obligatoria.
5. Bindear compose a `127.0.0.1:5432`/`127.0.0.1:6379` y remarcar credenciales dev.
6. Usar el lock Python en CI, fijar actions por SHA y eliminar el fallback `npm install`.
7. Cambiar permisos de workspace/audit/artifacts/state a `0700/0600` y comprobarlos al boot.

## 16. Top 3 — exploit scenario, fix, gotchas y regression strategy

### Top 1: SEC-01 — self-asserted authority

**Escenario:** texto atacante induce al orchestrator a llamar `agent.delegate` con target privilegiado, `repo` omitido y cwd dentro de un parent allowlisted pero fuera del recurso que el workflow debía tocar. Policy valida la identidad inventada, el repo layer no corre, el adapter acepta el realpath y arranca. Con IDs visibles, el mismo caller puede además responder approvals o operar sesiones sin ownership.

**Fix mínimo correcto:** principal inmutable por conexión; capability de task ligada a trace/repo/target/action; repo root server-side; middleware común antes del service; operator approval en canal separado; default-deny.

**Gotchas:**

- No usar `traceId`, `sessionId` o UUID como bearer capability.
- No reutilizar el HMAC global de `message.*` sin audience/action/resource/expiry y rotación.
- No validar solo “cwd bajo algún root”; debe ser “cwd bajo **el root del repo de esta task**”.
- No confundir target role solicitado con caller role.
- Aplicar lo mismo a profiles alternativos y a read/list/view, no solo mutaciones.

**Regresión:**

- Tabla exhaustiva `{principal, action, trace, task, repo, object owner}` con allow/deny.
- Casos repo omitido/desconocido/mismatched, role spoof, action desconocida, cross-trace, stale capability y capability replay.
- Adapter spies demuestran que todo deny ocurre antes de fs/spawn/tmux/DB mutation.
- Prueba MCP real comprueba que el LLM registry no enumera el operator responder.

### Top 2: SEC-02 — raw child channel y runtime privilege

**Escenario:** un restricted child legítimo imprime canaries que representan código raw y tokens en stdout y stderr. El adapter devuelve ambos, `agentService` los expande y el caller los recibe sin artifact policy. En paralelo, el child hereda el entorno del Gateway y comparte UID/filesystem, por lo que la cantidad de datos alcanzables supera el repo.

**Fix mínimo correcto:** wrapper de proceso con env allowlist y sandbox por rol; capturar I/O en un sink clasificado y acotado; respuesta MCP solo con status/artifact IDs; outputs cross-boundary generados por transformer positivo con attestation.

**Gotchas:**

- Cubrir stderr, exceptions, exit errors, dry-run echoes, pane captures, audit y checkpoints, no solo stdout.
- Bloquear filesystem lateral y egress; ocultar output no evita exfil por red o fichero compartido.
- No dar al reviewer/tester el mismo `workspace-write`.
- Evitar que el workflow serialice de nuevo el result crudo en artifacts.
- Definir qué diagnostics mínimos necesita realmente el operador.

**Regresión:**

- Fake CLIs adversariales para Codex/Gemini/Claude emiten canaries por todos los canales e intentan leer env/escribir sibling.
- La prueba busca canaries en tool result, JSONL, telemetry, DB, artifacts visibles y next-agent prompts.
- Matriz por rol demuestra mounts/env/egress y permisos esperados.
- Cancellation y timeout prueban terminación del process tree y cleanup.

### Top 3: SEC-03 — tmux shell framing

**Escenario:** en la variante launch, un cwd válido bajo el root contiene metacaracteres y se inserta sin quoting en la línea Codex; el shell la interpreta. En la variante post-exit, el CLI termina, el shell queda foreground y un posterior `agent.ask` escribe una línea que el shell ejecuta.

**Fix mínimo correcto:** process manager/PTY con argv estructurado, PID/executable/state esperado, input dirigido al PTY del proceso y cierre al exit; tmux queda attach-only sobre el wrapper.

**Gotchas:**

- `spawnSync("tmux", args)` ya evita un shell en el proceso padre, pero `send-keys` vuelve a introducirlo dentro del pane.
- Shell-quoting perfecto sigue siendo frágil para prompts interactivos; eliminar el shell del protocolo es más seguro.
- Considerar crash, CLI auto-update/restart, PID reuse, shell aliases y race exit→ask.
- `attachCommand` también debe construirse para UI, no ejecutarse como texto no confiable.

**Regresión:**

- Crear temp dirs con espacios/metacaracteres y comprobar ausencia de marker side effect.
- Fake CLI que sale inmediatamente; `ask` debe devolver `SESSION_NOT_RUNNING`, nunca escribir al shell.
- Race tests exit/ask/kill y validación de process identity.
- Pane snapshot se trata como datos y nunca se reinyecta automáticamente.

## 17. Open Questions

1. ¿El MCP host entrega realmente todas las tools enumeradas al LLM o existe una allowlist externa no versionada en este repo?
2. ¿Qué proceso o identidad representa al operador que responde approvals, y puede separarse físicamente de la conexión orchestrator?
3. ¿Qué repos restricted se sitúan en la práctica bajo cada `AGENTS_REPO_ROOTS`, y se usa normalmente un parent común como recomienda la guía?
4. ¿Qué CLIs reales están instalados, con qué permisos/network y qué secretos hereda el Gateway en producción local?
5. ¿Se necesita conservar supervised tmux como canal programático, o basta attach/view humano?
6. ¿Qué contenido está permitido en un artifact “sanitized”: extracto de código, summary semántico o solo metadata/verdict?
7. ¿Temporal, Redis o Postgres se usan fuera de loopback, por varios procesos/usuarios o en CI compartida?
8. ¿Cuál es el presupuesto aceptable por trace para bytes, children concurrentes, tokens/coste y duración?
9. ¿Qué requisitos de retención, privacidad y evidencias de incidente aplican a prompts, diffs, goals y audit?
10. ¿Quién es owner de rotación/IR y qué SLO se exige para detectar authz deny spikes, audit gaps o disk pressure?

## 18. Conclusión

El diseño tiene buenos componentes aislados —stdio local, primitives criptográficas correctas, realpath, state transitions, telemetry minimizada y una coordination plane especialmente cuidada—, pero sus garantías no componen todavía una frontera de seguridad. La prioridad no es añadir más reglas ad hoc: es hacer que identidad, task, repo, proceso y artifact sean una única cadena de autoridad verificable. M0 debe reducir exposición real de inmediato; M1 elimina las tres rutas Critical; M2 hace sostenible el control en operación; y M3 aporta confianza de supply chain, detección y cierre independiente.

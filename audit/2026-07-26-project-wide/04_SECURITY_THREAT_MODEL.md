# Auditoría de seguridad y threat model — proyecto completo

## Identificación y criterio temporal

| Campo | Valor |
|---|---|
| Fecha | 2026-07-26 |
| Corte principal auditado | `41d194a9cb5276cd0e90541b23ff47a41b3ad123` |
| Integración comparada | `develop@d521afb12a6520b95f1a9fb172911b16ab77a1ff` |
| Estado posterior observado | `main` y `develop` alineados localmente en `b532c63823979d20e566aaeaed0be96b29fb4c45` |
| Alcance | Gateway MCP, policy, approvals, artifacts, adapters, tmux, CLI, LangGraph/Temporal, Redis/Postgres, coordinación V5, configuración, CI y supply chain |
| Método | Revisión estática y de flujos end-to-end, SCA, comparación de refs y observación read-only de metadata de procesos/ficheros |
| Pruebas excluidas | No se explotaron sistemas, no se lanzaron agentes reales para ataque, no se leyó contenido de secrets/artifacts/audit y no se realizaron pruebas destructivas o de DoS |

Las referencias `file:line` describen el corte auditado salvo que se marque
explícitamente “estado posterior”. Los cuatro Critical de este documento siguen
presentes en el estado posterior: el diff hasta `b532c638` no modifica authority,
adapters, tmux, isolation ni ownership del workspace. En cambio, la auditoría
MCP condicionada a OTel sí se corrigió después del corte y se registra como tal,
para no presentar deuda ya resuelta como deuda abierta.

## Executive Summary

1. **Calificación: F para agentes reales y D para uso local dry-run**, porque existen cuatro rutas Critical explotables por el actor prompt-inyectado o child hostil que el propio threat model debe contener.
2. La primera permite autoafirmar agent, role, repo, trace y autoridad de operador en una conexión MCP sin principal server-side, incluyendo `approval.respond`.
3. La segunda ejecuta children con el UID y entorno del Gateway y devuelve `stdout`, `stderr` o snapshots raw al caller, fuera del artifact mediator.
4. La tercera usa un shell tmux como protocolo y puede interpretar como comandos tanto un launch construido sin quoting como un prompt enviado cuando el CLI ya no ocupa el foreground.
5. La cuarta, nueva respecto de la auditoría estática anterior, es una topología recursiva observada: decenas de Gateways hijos cargan el registry completo y escriben el mismo workspace, amplificando autoridad, egress, DoS y carreras.
6. `--yolo`, `dontAsk`, sandbox por variable de entorno y auto-approval no constituyen consentimiento; cualquier modo amplio necesita un grant firmado, server-owned, acotado y consumido atómicamente.
7. La oportunidad principal es converger en un único Gateway long-lived, principal/capabilities derivados por servidor, child runtime aislado y un único canal de salida clasificado.
8. Las otras dos oportunidades son retirar la decisión de operador de MCP y convertir SCA, canaries adversariales, cuotas y evidencia de release en gates obligatorios de V4.

## Threat Model Map

### Activos y objetivos de seguridad

| Activo | Clase | Objetivo dominante |
|---|---|---|
| Código, diffs, tests y documentación de repos | `internal` o `restricted` según repo | Evitar lectura raw por roles/proveedores no autorizados y escritura fuera del task |
| Tokens de proveedor, URLs con credenciales, message key y entorno del Gateway | Secreto | No heredarlos a children, no exponerlos en argv/logs y permitir rotación |
| Authority de traces, tasks, sessions y approvals | Crítico de integridad | Principal, ownership, acción y objeto deben ser server-derived y no reutilizables |
| Policies, registries y configuración MCP | Crítico de integridad | Un child no debe poder leerlos para eludir controles ni modificarlos |
| State SQLite/Postgres, artifact store y audit JSONL/Redis | Confidencial e íntegro | Aislamiento, single-writer, lineage, durabilidad y evidencia no repudiable |
| tmux/control de procesos | Capacidad privilegiada | Sólo controlar el proceso y sesión exactos; nunca degradar a shell implícitamente |
| Worker e history Temporal | Confidencial e íntegro | Señales ligadas a approvals reales, replay seguro y sin payload raw |
| Redis coordination plane | Interno | Scope, sender, lease, ACK y fencing auténticos; retención y backpressure |
| Presupuesto de host y proveedor | Recurso crítico | Límites de procesos, memoria, disco, bytes, concurrencia, tiempo y coste |
| Candidato, locks, CI y artefactos de release | Supply-chain | Reproducibilidad, provenance, advisories cerrados y promotion inequívoca |

### Topología efectiva y límites de confianza

```text
 operador / MCP host / orchestrator LLM (prompt-inyectable)
                         |
                         | MCP stdio; argumentos sin principal autenticado
                         v
  +---------------------- Gateway parent ---------------------------+
  | registry completo -> services -> policy                         |
  |       |              |                                          |
  |       |              +-> SQLite/Postgres + artifacts + JSONL     |
  |       |              +-> Redis audit/coordination                |
  |       |              +-> tmux shell                              |
  |       +----------------> Codex / Claude / Gemini ----------------+--> provider
  +-----------------------------------------------------------------+
                              |
                              | mismo UID, env heredado, repo con .mcp
                              v
              child CLI carga Gateway recursivo
                              |
                              +-> mismo registry y, observado,
                                  mismo SQLite/WAL/audit/artifacts

  Temporal client/server -> worker -> nuevo MCP stdio/Gateway legacy
                                   -> prompts/results/checkpoints
```

Los límites que deben existir, pero hoy no son fronteras técnicas completas,
son:

1. **Caller MCP → authority:** stdio reduce exposición de red, pero todos los
   argumentos llegan al handler sin identidad server-side
   (`gateway/src/mcp_server.js:134-180`).
2. **Repo lógico → cwd real:** policy razona sobre un `repo` opcional y el
   adapter sólo comprueba que `cwd` caiga bajo algún root amplio
   (`gateway/src/core/policy_engine.js:49-77`;
   `gateway/src/adapters/base_adapter.js:20-39`).
3. **Gateway → child:** los subprocesses comparten UID y heredan el entorno al
   no proporcionar una allowlist de `env`.
4. **Child output → caller:** el resultado raw cruza MCP directamente, sin
   clasificación, artifact ID ni capability de lectura.
5. **MCP host → operador:** `approval.respond` está en el mismo registry
   enumerado por el LLM (`gateway/src/tools/index.js:28-37`).
6. **tmux → proceso esperado:** `send-keys` escribe en el foreground actual,
   que puede ser el CLI o el shell que queda después de su salida.
7. **Proceso → workspace:** no hay lock/ownership que impida múltiples
   Gateways sobre el mismo state/audit/artifact store.
8. **Temporal signal → approval:** un diccionario con `status` sustituye la
   consulta a una decisión firmada y ligada al digest.
9. **Host → Redis/Postgres/Temporal:** el aislamiento depende del despliegue;
   los defaults de código no autentican Temporal y compose de desarrollo
   publica Redis/Postgres.
10. **Dependencia/acción → build:** packages y actions remotos ejecutan código
    sin SBOM, firma de release o pin por digest demostrados.

### Entry points y datos no confiables

| Entrada | Datos controlables | Sink sensible |
|---|---|---|
| `tools/call` MCP | Tool y argumentos completos | Todos los services, adapters y stores |
| `agent.delegate/spawn/ask/view/kill` | Agent, role, repo, cwd, prompt, trace/task/session | Proceso, shell, provider, filesystem y raw output |
| `artifact.put/get/list/share` | Kind, clasificación, producer, provenance e identidad requester | Bytes persistidos y disclosure cross-role |
| `approval.request/respond/poll/wait` | Acción, contexto, IDs, decisor y nota | Gate humano y audit |
| `orchestration.*`, `task.*`, `session.*` | IDs y ownership declarados | State machine y procesos ajenos |
| `message.*` | `from`, `to`, body | SQL y recipients del trace |
| `coordination.register/send/receive/ack` | Scope, participant type, capabilities, metadata y body | Redis presence/inbox/events |
| Workflow input/signal Temporal | Prompts, repo/cwd, roles, attempts y status de approval | Activities con autoridad Gateway |
| Child stdout/stderr/pane | Texto completamente controlado por child/provider | MCP response, Temporal state y checkpoints |
| `.mcp.json`, env y policy JSON | Paths, roots, autoapprove, binaries, endpoints y modos | Boot, authority y ejecución real |
| Manifests/locks/CI | Paquetes y actions | Código ejecutado en install/build |

### Actores y supuestos

| Actor | Confianza | Amenaza relevante |
|---|---|---|
| Operador local | Alta, pero falible | Configuración amplia, aprobación equivocada, exposición de servicios |
| Orchestrator LLM prompt-inyectado | **No confiable para authority** | Tool spoofing, self-grant, acceso a otro trace y coste |
| Child agent/repo/provider comprometido | **No confiable** | Exfiltrar output, modificar control state, persistir o abrir un Gateway hijo |
| Proceso del mismo UID | Privilegiado de facto | Leer env/ficheros, alcanzar sockets locales, alterar audit |
| Peer de coordination con lease | No confiable para negocio | Spam, metadata falsa y abuso dentro del scope |
| Cliente Redis/Postgres/Temporal alcanzable | Condicional | Forged workflows/signals, tampering o indisponibilidad |
| Maintainer de package/action comprometida | No confiable | Ejecución durante install/CI |
| Operador/maintainer interno malicioso | Fuera del control lógico actual | Bypass directo sobre workspace, DB o Git |

No se modela un atacante de Internet directo para MCP: el transporte es stdio.
Sí se modela el caller LLM comprometido, porque una prompt injection es parte
normal del riesgo de un sistema que procesa repos y output de agentes. El
supuesto de “un operador y una máquina confiables” limita multi-tenancy, pero no
convierte al child ni a su texto en actores confiables.

### AuthN/AuthZ, tokens y criptografía observados

- No existe principal de conexión MCP; el dispatcher entrega los argumentos
  directamente al tool (`gateway/src/mcp_server.js:148-166`).
- `message.*` sí usa HMAC-SHA-256 por `traceId` y comparación constant-time
  (`gateway/src/core/trace_access.js:9-19`); es un buen patrón parcial.
- Coordination emite 256 bits aleatorios, almacena sólo el hash, compara
  constant-time y comprueba expiración
  (`gateway/src/services/coordination_service.js:801-811,854-933`).
- Los IDs usan UUIDs, pero un ID observable no equivale a una capability ni
  reemplaza ownership.
- La policy valida agent/role/repo cuando esos campos se proporcionan; `repo`
  es opcional y `allowActions` no es una allowlist general
  (`gateway/src/core/policy_engine.js:49-118,313-336`).
- El message key nuevo se crea `0600`, pero el corte no verifica el modo de un
  fichero preexistente y degrada silenciosamente a un secreto de proceso si no
  puede leer/escribirlo (`gateway/src/config.js:54-75`); el estado posterior
  al menos emite warning.
- No se encontró un protocolo de firma, audience, nonce, expiración y consumo
  para decisiones de operador o modos YOLO.

### STRIDE por frontera

| Frontera | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| Caller → MCP | Agent/role/decisor autoafirmados | Mutación de trace ajeno | Actor de audit no autenticado | Lectura por IDs/roles falsos | Calls/procesos sin quota | Role y operator spoof |
| Repo/cwd → adapter | Repo omitido | Escritura fuera del task | Attribution incorrecta | Lectura de paths excluidos | Scans amplios | Root amplio sustituye scope |
| Gateway → child | Bin/env manipulables | Child altera workspace | Salida no atribuible | Env/state/control data | Coste y procesos | Mismo UID |
| Child → MCP | Producer/class falsos | Provenance inventada | Raw no ligado a digest | stdout/stderr/snapshot | Payloads grandes | Declassification |
| MCP → approval | `decidedBy` textual | Self-grant | Decisor repudiable | Context/note en audit | Wait races | Operador simulado |
| Gateway → tmux | Target por ID | Shell commands | Foreground no probado | Pane raw | Sesiones huérfanas | CLI → shell |
| Procesos → workspace | Workspace owner ausente | Multiwriter | JSONL interleaved | Stores legibles mismo UID/grupo | RAM/locks | Gateway hijo con registry |
| Temporal → Gateway | Input/role/status falsos | Signal forjada | Replay ambiguo | History/checkpoints raw | Retries/coste | Approval bypass futuro |
| Coordination → Redis | Registro sin invitación | Metadata/capabilities falsas | Scope membership débil | Bodies internos | Sybil/stream growth | Capabilities informativas |
| CI/deps → release | Artefacto/candidato ambiguo | Package/action mutable | Sin firma/provenance | Secrets de CI, si existieran | Build break | Supply-chain execution |

### Lo que sorprendió en este corte

La principal novedad no es otra variante teórica de AUTH-01, sino su
**materialización topológica**. La muestra read-only encontró 36 procesos
Gateway, 35 apuntando al mismo workspace SQLite/WAL y unos 3,16 GiB RSS
agregados. `.mcp.json:4-15` arranca el Gateway en modo real, con autoapprove,
root del repo completo y workspace dentro del proyecto; a la vez,
`.claude/settings.local.json:2-5` habilita los MCP de proyecto. El child puede
por tanto cargar otro control plane con el mismo registry
(`gateway/src/tools/index.js:28-37`). No se leyeron prompts, artifacts, audit ni
variables secretas para llegar a esta conclusión.

## Security Audit

### Lista priorizada

| ID | Severidad | Explotabilidad | Estado al corte / posterior | Riesgo |
|---|---|---|---|---|
| AUTH-01 | **Critical** | Ruta estática completa | Abierto / abierto | Principal, role, repo, trace y operator authority son caller-controlled |
| EXEC-01 | **Critical** | Ruta estática completa | Abierto / abierto | Child hereda privilegios y devuelve raw fuera del mediator |
| SHELL-01 | **Critical** | Ruta estática completa | Abierto / abierto | Launch o prompt termina interpretado por shell tmux |
| OPS-01 | **Critical** | Observado y explotable | Abierto / abierto | Gateway recursivo dentro del sujeto no confiable |
| POLICY-01 | **High** | Ruta estática completa | Abierto / abierto | Unknown kind/action y provenance declarada permiten declassification |
| YOLO-01 | **High** | Explotable por configuración/caller | Abierto / abierto | Modos amplios carecen de grant/consentimiento server-side |
| OPS-02 | **High** | Observado | Abierto / abierto | Multiwriter, wakeups process-local y recovery ambiguo |
| ABUSE-01 | **High** | Explotable; ya hay amplificación | Abierto / abierto | Sin presupuesto común de procesos, bytes, disco y coste |
| REL-01 | **High** al corte | Operacional | Divergencia / alineación local parcial | No había identidad única del objeto revisado y liberado |
| DEP-01 | High upstream / **Medium contextual** | Reachability parcial no demostrada | Abierto / abierto | 5 advisories corregibles y supply chain sin gate completo |
| TEMP-SEC-01 | Medium actual / **High latente** | Condicional | Abierto / abierto | Signal de status no ligada a approval; push actual sólo genera intent |
| COORD-SEC-01 | **Medium** | Explotable con acceso MCP | Abierto / abierto | Registro Sybil en un scope conocido |
| CFG-SEC-01 | **Medium** | Defensa en profundidad/condicional | Abierto / parcialmente mitigado | Credenciales en argv, servicios dev amplios y secret fallback |
| AUDIT-SEC-01 | **Medium** | Gap de detección | Abierto / generic MCP corregido | Audit local no minimizado ni tamper-evident |

### AUTH-01 — Authority y approval se derivan del caller

- **CWE/OWASP:** CWE-306, CWE-862, CWE-639, CWE-269; OWASP A01:2021,
  API2:2023 y API5:2023.
- **Hechos:** `agent.delegate/spawn` aceptan `agent`, `role`, `repo?`, `cwd`,
  `traceId` y `taskId` (`gateway/src/tools/agent.js:3-26`).
  `artifact.get/share` acepta la identidad requester
  (`gateway/src/tools/artifact.js:17-31`) y `approval.respond` acepta
  `decidedBy` textual sin un principal o firma
  (`gateway/src/tools/approval.js:20-29`;
  `gateway/src/services/approval_service.js:74-100`).
  Si `repo` falta, classification/repo/excludedPaths no se evalúan
  (`gateway/src/core/policy_engine.js:49-79`), y el pipeline termina allow si
  nada deniega (`gateway/src/core/policy_engine.js:313-336`).
- **Ruta de abuso:** una prompt injection induce una tool call; el caller se
  declara `codex`/`restricted-coder`, omite `repo`, elige un `cwd` bajo el root
  amplio y llega a ejecución real. Con IDs del flujo, variantes de la misma
  causa permiten leer artifacts con role afirmado, controlar sessions o
  responder el approval desde MCP.
- **Juicio:** explotable dentro del perímetro soportado; no requiere red,
  adivinar UUIDs ajenos ni otro usuario del host. Los IDs suelen estar ya en el
  contexto del flujo.
- **Remediación:** principal server-derived, handles opacos ligados a
  trace/task/repo/action/expiry, repo→root canónico, ownership en cada service,
  default-deny y retirada de `approval.respond` del registry LLM-facing.

### EXEC-01 — El child comparte privilegios y tiene un canal raw de retorno

- **CWE/OWASP:** CWE-200, CWE-250, CWE-284; OWASP A01 y A04:2021.
- **Hechos:** Codex, Claude y Gemini ejecutan subprocesses sin `env` acotado y
  devuelven `stdout`/`stderr` directamente
  (`gateway/src/adapters/codex_adapter.js:218-253`;
  `gateway/src/adapters/claude_adapter.js:159-181`;
  `gateway/src/adapters/gemini_adapter.js:108-121`).
  El helper serializa el resultado como respuesta MCP
  (`gateway/src/tools/tool_helpers.js:75-86`). El cliente Python construye el
  env del Gateway copiando todo `os.environ`
  (`orchestrator-langgraph/src/orchestrator_langgraph/client/gateway_client.py:71-83`).
- **Ruta de abuso:** una delegación legítima entrega un repo restricted a un
  child; prompt injection o una herramienta del child imprime código, una
  variable de entorno o output sensible; el Gateway lo devuelve al caller sin
  artifact, classification, sanitization ni capability.
- **Juicio:** explotable incluso si AUTH-01 se corrigiera, porque parte de una
  delegación autorizada. El mismo UID significa además que “ocultar” paths en
  prompts no es aislamiento.
- **Remediación:** env allowlist, runtime root privado, credenciales por broker,
  mounts/worktrees por task, backend de sandbox explícito y output sólo hacia
  un private sink que produzca artifact IDs clasificados.

### SHELL-01 — tmux convierte control de agente en ejecución de shell

- **CWE/OWASP:** CWE-78 y CWE-88; OWASP A03:2021.
- **Hechos:** Codex y Claude convierten argv a una línea con `.join(" ")`
  (`gateway/src/adapters/codex_adapter.js:299-312`;
  `gateway/src/adapters/claude_adapter.js:210-218`), y tmux envía esa línea más
  Enter (`gateway/src/adapters/tmux_client.js:11-20`). `agent.ask` repite el
  mismo mecanismo con un prompt arbitrario y no verifica el proceso foreground
  (`gateway/src/adapters/codex_adapter.js:336-350`; Claude
  `:235-248`; Gemini `gateway/src/adapters/gemini_adapter.js:169-182`).
- **Ruta de abuso 1:** un cwd/bin/model válido para el array original contiene
  sintaxis interpretada al reconstruir la línea, y el shell la ejecuta.
- **Ruta de abuso 2:** el CLI sale o cambia el foreground; el siguiente prompt
  de `agent.ask` se escribe en el shell persistente y se ejecuta como comando.
- **Juicio:** ruta estática completa. No se ejecutó el payload, pero la
  semántica de `send-keys` y el shell foreground basta para demostrar el sink.
- **Remediación:** no reconstruir shell strings; lanzar un wrapper con argv
  separado, hacer handshake de PID/TTY/boot nonce antes de cada input y cerrar
  la sesión al salir el CLI. El contenido de prompt debe viajar por el
  protocolo del CLI o stdin dedicado, nunca como shell line.

### OPS-01 — Recursión MCP replica el control plane dentro del child

- **CWE/OWASP:** CWE-284, CWE-668 y CWE-400; OWASP A05:2021.
- **Hechos:** el MCP de proyecto usa modo real, `code.apply` autoaprobado,
  `workspace-write`, repo root completo y workspace compartido
  (`.mcp.json:4-15`). La configuración local de Claude habilita todos los MCP
  de proyecto (`.claude/settings.local.json:2-5`). Cada instancia expone
  incluso approvals y lifecycle (`gateway/src/tools/index.js:28-37`).
- **Evidencia operativa:** se observaron 36 Gateways; 35 usaban el mismo
  SQLite/WAL y consumían aproximadamente 3,16 GiB RSS agregados. La inspección
  fue de metadata de proceso/ficheros abiertos, sin leer contenido.
- **Ruta de abuso:** un child iniciado sobre el repo descubre `.mcp.json`,
  arranca su propio Gateway y obtiene otra interfaz de control con la misma
  autoridad débil y el mismo state. Puede repetir el patrón, aumentar writers
  o usar el nested Gateway para saltarse la relación parent/child.
- **Juicio:** Critical porque elimina la suposición arquitectónica de que el
  Gateway está fuera del sujeto no confiable; además ya existe la topología
  necesaria, no es sólo una posibilidad.
- **Remediación:** runtime root fuera del repo, excluir `.mcp.json`/secrets/state
  de mounts, env de child sin configuración de control, un Gateway
  single-writer y un canal interno autenticado para workers.

### POLICY-01 — Declassification depende de labels y regex aportados por el caller

- **CWE/OWASP:** CWE-200, CWE-345, CWE-863; OWASP A01:2021.
- **Hechos:** `artifact.put` acepta cualquier `kind`, classification,
  `producedBy`, contenido y `sanitizedFrom`
  (`gateway/src/tools/artifact.js:8-15,58-71`). Sólo tres kinds exactos se
  consideran raw (`gateway/src/core/policy_types.js:36-39`). El raw se
  persiste antes de sanear (`gateway/src/core/artifact_store.js:41-69`) y las
  reglas cubren cuatro regex, no una transformación semántica
  (`policies/sanitization-rules.json:3-31`). `allowActions` sólo se consulta en
  casos especiales, no como allowlist global
  (`gateway/src/core/policy_engine.js:269-310`).
- **Ruta de abuso:** un producer etiqueta un diff como `workflow_checkpoint` o
  `internal`, o crea `sanitizedFrom` arbitrario; la ruta raw/sanitization no se
  activa y el artifact puede llegar a un consumidor que confía en la etiqueta.
- **Juicio:** High y explotable por un caller/producer con acceso legítimo a
  `artifact.put`; no hace falta romper el filesystem.
- **Remediación:** catálogo cerrado server-side, classification derivada del
  source/task, lineage inmutable, projector restricted determinista y API
  pública que nunca devuelva raw.

### YOLO-01 — Los modos amplios no tienen un grant consumible

- **CWE/OWASP:** CWE-269, CWE-272 y CWE-862.
- **Hechos:** Gemini headless usa siempre `--yolo`
  (`gateway/src/adapters/gemini_adapter.js:108-113`); Claude usa
  `--permission-mode dontAsk`
  (`gateway/src/adapters/claude_adapter.js:26-38`); Codex toma el sandbox de
  env/config (`gateway/src/adapters/codex_adapter.js:24-38`) y el proyecto lo
  fija a `workspace-write` (`.mcp.json:10-15`). Ninguno consume un objeto de
  autorización firmado en el launch.
- **Ruta de abuso:** basta con alcanzar `agent.delegate/spawn` y seleccionar el
  adapter/configuración ya amplia; no hay una segunda comprobación de
  subject, repo, cwd, digest, expiry, uses o revocation.
- **Juicio:** High. El flag puede ser una opción técnica válida, pero hoy
  también es la única “prueba” de consentimiento, cosa que no demuestra.
- **Estado objetivo:** `confined` por defecto; `workspace-yolo` y
  `host-unconfined` requieren `orchestrator_execution_grant` server-owned,
  firmado y ligado a session/audience/boot, repo/cwd canónicos, task scope,
  agents/roles, `maxMode`, operation digest, expiry, `maxUses`, nonce y
  revocation. El consumo debe ser atómico justo antes del spawn.
- **Límite honesto:** `host-unconfined` bajo el mismo UID suspende la frontera
  frente al child; el grant no lo hace seguro, sólo convierte esa aceptación
  de riesgo en explícita, exacta, auditable y revocable para launches futuros.

### OPS-02 y ABUSE-01 — Multiwriter y ausencia de presupuesto común

- **CWE/OWASP:** CWE-400, CWE-770 y CWE-362; OWASP API4:2023.
- **Hechos:** no hay lock de workspace al boot. El wake de approvals usa un
  `EventEmitter` de proceso (`gateway/src/services/approval_service.js:1-6,
  114-149`), mientras otros procesos pueden mutar la misma DB. Audit hace
  append JSONL y Redis best-effort (`gateway/src/core/audit.js:69-90,147-169`).
  Los adapters usan `spawnSync`, bloquean el event loop y sólo tienen timeout
  por proceso. Artifacts y mensajes legacy no tienen límite de bytes
  (`gateway/src/tools/artifact.js:8-15`;
  `gateway/src/tools/message.js:50-100`).
- **Ruta de abuso:** un caller dispara delegaciones, nested Gateways y payloads
  persistentes hasta consumir RAM, disco, tiempo del Gateway o coste de
  proveedor. Una decisión de approval escrita por otro proceso no despierta al
  waiter y sólo se descubre al timeout.
- **Juicio:** High; la muestra de procesos prueba amplificación real, aunque no
  se hizo una prueba de saturación.
- **Remediación:** runner async cancelable, quotas por principal/repo/trace,
  admission control, bytes máximos, budget de proveedor, un owner del
  workspace, durable wake/outbox y reconciliation tras crash.

### TEMP-SEC-01 — Temporal acepta una señal de approval no autoritativa

- **CWE/OWASP:** CWE-345, CWE-863 y CWE-294.
- **Hechos:** la signal acepta cualquier diccionario
  (`orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:88-123`);
  después se considera concedida si `status` es `approved` o `granted`, sin
  verificar approval ID, trace, action, digest o firma (`:266-378`).
  El worker sólo configura address/task queue y conecta sin TLS, credencial o
  namespace explícitos (`orchestrator-langgraph/src/orchestrator_langgraph/worker.py:17-33,54-68`).
- **Ruta de abuso:** un cliente Temporal que pueda señalar el workflow envía
  `{"status":"granted"}` y el workflow avanza.
- **Calibración:** el impacto actual es Medium porque `push_activity` sólo
  escribe un artifact de **dry-run push intent**
  (`orchestrator-langgraph/src/orchestrator_langgraph/activities.py:226-253`);
  sería High antes de habilitar un push real.
- **Remediación:** la signal sólo despierta; la activity consulta al Gateway y
  exige la decisión firmada exacta para `approvalId + traceId + action +
  changeSetDigest + reviewGateId`, como define V4 `E/1/04`.

### COORD-SEC-01 — Coordination autentica leases, no pertenencia inicial al scope

- **CWE/OWASP:** CWE-306 y CWE-284.
- **Hechos positivos:** tras registro, token hash, comparación constant-time,
  expiry, sender/scope canónicos, fencing y ACK atómico están bien
  implementados (`gateway/src/services/coordination_service.js:801-811,
  1084-1174`; `gateway/src/core/coordination_queue.js:430-555`).
- **Gap:** `register` acepta `participantType`, `scopeId`, capabilities y
  metadata sin invite/capability de scope
  (`gateway/src/services/coordination_service.js:231-257,878-937`). El detector
  de secrets sobre body es un único patrón y metadata no pasa por él
  (`:218-228,335-360`).
- **Ruta de abuso:** un caller MCP que conoce un scope no secreto registra
  participantes Sybil, descubre peers y envía spam `internal`; no obtiene por
  ello operator authority.
- **Juicio:** Medium, acotado al plano de coordinación y disponibilidad.
- **Remediación:** invite/registration capability emitida por el control plane,
  quotas por scope, scanner de tokens/PEM/JWT robusto y semántica explícita de
  capabilities como datos informativos, nunca autoridad.

### CFG-SEC-01 — Secrets e infraestructura dependen demasiado del host

- **CWE/OWASP:** CWE-522, CWE-532 y CWE-668; OWASP A02/A05:2021.
- **Hechos:** Postgres entrega URL completa y SQL en argv de `psql`
  (`gateway/src/core/postgres_db.js:72-75`); Redis hace lo mismo con `redis-cli
  -u` (`gateway/src/core/audit.js:94-120`). Compose usa password de desarrollo,
  Redis sin auth y publica `5432`/`6379` en todas las interfaces Docker
  (`docker/docker-compose.yml:8-17,27-33`). Temporal no configura TLS/auth.
- **Calibración:** se observó Redis ligado a loopback en el host auditado, lo
  que reduce la exposición inmediata. No se verificó una infraestructura
  productiva ni se afirma exposición remota.
- **Estado posterior:** el fallback del message key emite warning; no se
  corrigen argv, compose, Temporal ni herencia de env.
- **Remediación:** clientes nativos con parámetros, credenciales por file/socket
  o broker, servicios dev ligados a `127.0.0.1`, auth/TLS cuando sean remotos,
  namespaces/ACL y fail-closed para secretos de authority.

### DEP-01 y REL-01 — Supply chain y provenance de release incompletos

- **CWE/OWASP:** CWE-1104 y CWE-494; OWASP A06/A08:2021.
- **Hechos al corte:** `npm audit --omit=dev` detectó 5 vulnerabilidades
  corregibles: 2 high, 2 moderate y 1 low. El lock contiene
  `@modelcontextprotocol/sdk@1.29.0`, `@hono/node-server@1.19.14`,
  `body-parser@2.2.2`, `fast-uri@3.1.2` y `hono@4.12.22`
  (`gateway/package-lock.json:22-50,229-245,607-620,749-755`).
  Python declaraba lower bounds o paquetes sin versión
  (`cli/pyproject.toml:5-15`;
  `orchestrator-langgraph/pyproject.toml:5-10`) y el CI local omitía
  LangGraph, lint y SCA (`scripts/ci.sh:7-35`).
- **Reachability:** Hono/HTTP llega transitivamente por MCP pero el Gateway
  auditado usa stdio; no se demostró que las rutas HTTP vulnerables sean
  alcanzables. `fast-uri` entra por Ajv y su reachability productiva tampoco se
  demostró. Por eso la severidad contextual es Medium, sin ignorar el High
  upstream.
- **Estado posterior:** se añadieron workflow CI, bounds, lock y lint, y
  `main/develop` se alinearon. Persisten los advisories observados, actions
  fijadas por tag y no SHA, instalación Python que no consume un lock
  reproducible, y ausencia de SBOM/provenance/firma de release demostrada.
- **Remediación:** completar V4 `M0/0/00`, `M0/3/00` y `M0/4/00-02`: candidato
  por manifest/digest, upgrades SCA, lock consumido, actions por commit, SBOM y
  tag/release verificable.

### AUDIT-SEC-01 — Evidencia útil, pero no íntegra ni mínimamente sensible

- **CWE/OWASP:** CWE-117, CWE-532 y CWE-778; OWASP A09:2021.
- **Hechos:** JSONL escribe el evento original completo antes de la proyección
  Redis (`gateway/src/core/audit.js:69-90,171-233`), no define rotación,
  retention, mode, hash-chain ni writer ownership, y una línea corrupta se
  devuelve raw (`:248-273`). Ejemplos de producers incluyen preview de prompt
  (`gateway/src/adapters/codex_adapter.js:61-69`).
- **Gap al corte:** el wiring principal pasaba los appenders genéricos sólo si
  OTel estaba enabled (`gateway/src/mcp_server.js:216-223`), mezclando
  observabilidad con audit.
- **Estado posterior:** `b532c638` pasa ambos appenders siempre; este subgap está
  **corregido después del corte**. Permanecen minimización, integridad,
  single-writer, retention y alerting.
- **Remediación:** schema cerrado sin texto raw, append por único owner,
  rotación/retention, checkpoint de integridad o sink protegido, outbox para
  Redis y detecciones sobre self-grant, nested Gateway, grant replay, tmux
  foreground loss y quota denial.

### Fortalezas a preservar

- MCP es stdio y no abre por defecto un API web público.
- Coordination V5 usa validación estricta, límites de 65 KiB, lease tokens
  aleatorios hasheados, constant-time compare, fencing y operaciones Redis
  atómicas (`gateway/src/services/coordination_service.js:209-228,335-393,
  801-811`).
- `artifact.share` comprueba el trace y falla cerrado si falta el derivado
  saneado (`gateway/src/services/artifact_share_service.js:30-56`).
- El artifact path normaliza segmentos antes de escribir
  (`gateway/src/core/artifact_store.js:22-35`).
- SQLite activa WAL y foreign keys; la transición first-wins de approvals usa
  `WHERE status='pending'` (`gateway/src/core/state.js:70-76`;
  `gateway/src/core/repositories/approval_repo.js:57-81`).
- El HMAC de messages y los lease tokens usan primitivas y comparaciones
  apropiadas.
- La proyección Redis del audit elimina claves sensibles y limita strings
  (`gateway/src/core/audit.js:171-237`).
- Las capas tools/services/core/adapters permiten introducir enforcement
  server-side sin reescribir todo el producto.

## Security Strategy

### Temas, estado objetivo y guardrails

| Tema | Estado objetivo | Principio | Guardrail permanente |
|---|---|---|---|
| Authority como propiedad del servidor | Principal, target y object capability separados; repo/cwd/trace/task ligados | Default-deny, least privilege | Contract test negativo por cada tool MCP y capability |
| Un control plane fuera del child | Un Gateway long-lived, workspace privado y workers por canal autenticado | Isolation, complete mediation | Lock single-writer + canary que falla si el child abre state/audit/MCP |
| Data plane mediado | Ningún raw cruza MCP; labels/lineage se derivan del source | Minimize, fail-closed | E2E con secrets/código canario y catálogo cerrado |
| Operador y YOLO explícitos | Approval/grant firmado, exacto, expirable, revocable y consumido una vez | Separation of duties | Replay/race/revoke/expiry tests en cada launch mode |
| Release y abuso verificables | Candidato reproducible, dependencias limpias y budgets por principal | Secure by default, resilience | SCA/SBOM/action pins + quota/admission tests required |

### Riesgos que puede tener sentido aceptar

- Mantener MCP exclusivamente local/stdio y posponer auth multi-user es
  razonable mientras no exista relay ni listener compartido; no justifica
  authority autoafirmada dentro de esa conexión.
- El cifrado de aplicación para un workspace efímero single-user puede
  posponerse si el host usa disco cifrado, permisos privados y borrado
  probado; no debe afirmarse como propiedad del producto.
- Se puede aceptar temporalmente un advisory HTTP no reachable por stdio con
  excepción fechada, owner y evidencia de reachability; no una excepción
  indefinida cuando existe fix.
- `host-unconfined` puede existir sólo como aceptación explícita de que no hay
  security boundary frente al mismo UID; no debe presentarse como sandbox.

### Señales de “done”

- Cero Critical/High explotables abiertos en el threat model y cero launch
  amplio sin grant exacto.
- Un único Gateway posee cada workspace; un child no puede leer/abrir
  state, audit, artifact bytes, message key ni config MCP del parent.
- Todos los tools derivan principal y ownership server-side; tests prueban
  cross-trace, role spoof, omitted repo, unknown action y stale capability.
- Ningún response/history/audit público contiene prompt, diff, stdout, stderr,
  path o secret canario.
- Approval/grant resiste replay, race, crash, expiry, revoke y use `N+1`.
- SCA required sin High conocido no exceptuado, locks consumidos, actions por
  SHA, SBOM y candidate=`main`=`tag` verificado.
- Quotas cubren procesos, concurrencia, bytes, disco, tiempo y coste; overload
  no bloquea policy/approval/audit.
- Canaries reales y adversariales de V4 `B/5` y `E/2` son required y no pueden
  pasar por skip.

## Remediation Plan

La unidad de ejecución recomendada es PROJECT_V4 ya rebasado; no se propone
crear V6. `S` es menos de 2 horas, `M` media jornada, `L` 1–2 días y `XL`
requiere desglose.

### Milestone 0 — Cortar amplificación y recuperar evidencia

| Item | Descripción y superficie | Criterio de aceptación verificable | Esfuerzo | Riesgo del fix | Dependencias |
|---|---|---|---:|---|---|
| SEC-M0-01 / V4 `M0/0/00` | Manifest canónico de candidato y topología de integración | Manifest liga base, tree SHA, locks, suites/skips, review digest y estado; cualquier mismatch bloquea | L | Bloquear promoción legítima por manifest incompleto | Ninguna |
| SEC-M0-02 / V4 `M0/3/00`, `M0/4/00-02` | Cerrar advisories y hacer SCA/CI/Redis required | `npm audit --omit=dev` y scanner Python pasan o exigen excepción fechada; lock se consume | L | Upgrade de MCP/Hono rompe contrato | SEC-M0-01 |
| SEC-M0-03 / mitigación previa a `B/1/04`, `B/1/08` | Deshabilitar recursión MCP y declarar un owner por workspace | En canary, un child real no inicia Gateway ni abre DB/audit/artifacts; segundo owner falla al boot | M | Romper workflows que dependían del nested Gateway | Inventario de procesos |
| SEC-M0-04 / fix posterior a preservar | Hacer audit MCP independiente de OTel y alertar pérdida de sink | Tool call con OTel off produce evento; fallo Redis es visible y reconciliable | S | Volumen de audit mayor | Ninguna |
| SEC-M0-05 / V4 `E/2/01` | Endurecer servicios dev y quitar credenciales de argv | Compose sólo loopback/red efímera; test de procesos no encuentra URL secreta en argv | M | Romper scripts locales | Config documentada |

### Milestone 1 — Cerrar Critical/High explotables

| Item | Descripción y superficie | Criterio de aceptación verificable | Esfuerzo | Riesgo del fix | Dependencias |
|---|---|---|---:|---|---|
| SEC-M1-01 / V4 `B/0/00`, `B/1/00-01` | Repo canónico, handles y actor/target server-side | Spoof de agent/role/trace/task, repo omitido y acceso cross-trace fallan antes de side effects | XL | Incompatibilidad MCP 0.1 y pérdida de sesiones legacy | SEC-M0-01 |
| SEC-M1-02 / V4 `B/1/04-07` | Runtime root, env allowlist, sandbox y mounts por task | Child canary no ve secrets/control state y sólo escribe worktree/scratch del task | XL | Modelos dejan de funcionar por permisos/red | SEC-M1-01 |
| SEC-M1-03 / V4 `B/3/00` | Mediar todo output de agent | MCP sólo retorna IDs/status/metadata bounded; raw stdout/stderr/pane nunca cruza | L | Pérdida de UX diagnóstica | SEC-M1-02, artifact authority |
| SEC-M1-04 / V4 `B/1/08-09` | Single-writer, durable wake y reconciliation | Crash/restart/multi-process no duplica sesión ni pierde approval; segundo Gateway rechaza workspace | XL | Lock huérfano o recovery agresivo mata proceso válido | SEC-M0-03, lifecycle |
| SEC-M1-05 / V4 `B/2/00-02` | Control socket local, challenge/firma y retirada de `approval.respond` MCP | Registry público no contiene respond; self-grant y replay fallan; CLI decision aparece igual en JSONL/Redis | XL | Lockout del operador o pérdida de clave | SEC-M1-01, SEC-M1-04 |
| SEC-M1-06 / V4 `B/2/03` | Grants YOLO/unconfined consumibles | Sin grant no nace proceso; exact grant permite sólo su modo/scope/use y revoke/expiry/race fallan | XL | Grants demasiado rígidos bloquean trabajo legítimo | SEC-M1-02, SEC-M1-05 |
| SEC-M1-07 / V4 `B/0/01-03` | Runner async, cancelación y budgets | Una delegación lenta no bloquea approval/audit; quota denial es bounded y no crea proceso | XL | Cancelación deja procesos huérfanos | SEC-M1-04 |
| SEC-M1-08 / reemplazo tmux | Eliminar shell framing y atestar foreground | Metacaracteres en cwd/bin/prompt no ejecutan shell; salida del CLI cierra/fencea sesión | XL | Regresión de attach/intervención humana | SEC-M1-02, SEC-M1-07 |

### Milestone 2 — Hardening sistémico

| Item | Descripción y superficie | Criterio de aceptación verificable | Esfuerzo | Riesgo del fix | Dependencias |
|---|---|---|---:|---|---|
| SEC-M2-01 / V4 `B/0/04`, `B/1/02` | Catálogo cerrado, lineage y projector restricted | Kind/class/provenance falsos se rechazan; derivación es inmutable y ligada a digest | XL | Migración de artifacts legacy | SEC-M1-01 |
| SEC-M2-02 / V4 `B/3/01` | Minimizar y proteger audit | Schema no admite payload raw; mode/rotation/retention e integrity checkpoint están probados | L | Perder contexto forense útil | SEC-M1-04, SEC-M1-03 |
| SEC-M2-03 / V4 `B/4/00-02` | MCP 0.2 y retirada 0.1 | Inputs de authority desaparecen o son assert-only; ningún cliente usa 0.1 | XL | Cutover rompe CLI/workers | SEC-M1-01 a 06 |
| SEC-M2-04 / V4 `E/1/04-05` | Approval Temporal exacta e history sin raw | Signal forjada no avanza; history no contiene diff/prompt/stdout/path/secret | XL | Replay incompatible con histories V1 | MCP 0.2, operation IDs |
| SEC-M2-05 / coordinación | Invite de scope, secret scanning y stream bounds | Registro sin invite falla; Sybil quota y trim/TTL se verifican con Redis real | L | Romper bootstrap de peers | Principal/control socket |
| SEC-M2-06 / supply chain | Action SHA, SBOM, provenance y firma | CI produce SBOM y attestation; candidato/tag verifican digest y firma | L | Mayor fricción de release | SEC-M0-01/02 |

### Milestone 3 — Defensa en profundidad y detección

| Item | Descripción y superficie | Criterio de aceptación verificable | Esfuerzo | Riesgo del fix | Dependencias |
|---|---|---|---:|---|---|
| SEC-M3-01 / V4 `B/5/00-02` | Gate adversarial authority/artifact/lifecycle | Corpus prueba spoof, cross-trace, raw egress, tmux loss, restart y grant race con cobertura/mutación mínima | XL | Fixtures no representativas | Milestones 1–2 |
| SEC-M3-02 / V4 `E/2/01-02` | Lanes stack y agents reales | Postgres+Redis+Temporal+un Gateway y canaries reales required; cero skip silencioso | XL | Coste/flakiness de proveedor | SEC-M3-01 |
| SEC-M3-03 | Detección y respuesta | Alertas para nested Gateway, self-grant, stale capability, quota burst, audit gap y writer conflict | L | Ruido operacional | Audit minimizado |
| SEC-M3-04 | Drill de claves e incidente | Rotación de operator/message/coordination credentials y contención de workspace ensayadas | L | Invalidar sesiones válidas | Control socket e inventario |

### Quick wins

- Retirar `AGENTS_AUTOAPPROVE=code.apply` de la configuración de modo real o
  forzar dry-run hasta que exista el grant model; **S, alto impacto temporal**.
- Evitar que children carguen los MCP de proyecto y mover el workspace fuera
  del árbol montado; **S/M**, seguido por canary y single-writer durables.
- Llevar a la rama candidata el fix posterior que hace audit MCP independiente
  de OTel; **S**.
- Ligar Redis/Postgres de compose a `127.0.0.1` y documentar que no son defaults
  productivos; **S**.
- Crear runtime root `0700` y state/audit/artifacts `0600` mediante creación
  explícita/umask, no sólo `chmod` manual; **S/M**.
- Fallar startup si un secret de authority no puede persistirse de forma
  privada; **S**.

### Sketch de los tres items prioritarios

#### 1. Principal server-side y capabilities exactas

- **Exploit:** el orchestrator prompt-inyectado omite `repo`, afirma
  `restricted-coder`, elige un cwd dentro del root amplio y luego responde su
  propio approval.
- **Fix:** principal de conexión/host, target separado, task handle opaco,
  repo/cwd resueltos por servidor y operador fuera de MCP.
- **Gotchas:** no usar UUID visible como bearer token; rotar handles al restart;
  no confiar en claims duplicados “para compatibilidad”.
- **Regresión:** matriz negativa por tool con role spoof, repo omitted,
  cross-trace ID, stale/foreign handle, `approval.respond` inexistente y cero
  side effects/audit de éxito.

#### 2. Un Gateway aislado y output mediado

- **Exploit:** un child restricted hereda env/control paths, carga `.mcp.json`,
  abre otro Gateway y devuelve raw por stdout al orchestrator.
- **Fix:** runtime root privado, env allowlist, mounts por task, un owner del
  workspace, worker channel autenticado y private output sink.
- **Gotchas:** `host-unconfined` mismo UID puede leer fuera de mounts si no hay
  aislamiento OS; logs de error y attach también son canales de egress.
- **Regresión:** canaries secretos en env/state/config y output; el child no
  puede leerlos, no abre nested Gateway y MCP sólo ve artifact IDs.

#### 3. Launch sin shell y grant YOLO consumible

- **Exploit:** tmux interpreta un launch sin quoting o, tras terminar el CLI,
  interpreta el siguiente prompt; en paralelo un flag `--yolo` concede
  capacidad amplia sin consentimiento exacto.
- **Fix:** wrapper argv-safe con attestation de foreground y grant firmado
  consumido atómicamente en `agent.launch.<mode>`.
- **Gotchas:** un grant de sesión no debe sobrevivir a boot/audience/digest
  distintos; `host-unconfined` no recupera aislamiento frente al mismo UID.
- **Regresión:** corpus de metacaracteres, CLI exit/restart, replay, expiry,
  revoke, concurrent use, use `N+1`, scope mismatch y ausencia de grant; ningún
  fallo crea proceso.

## Open Questions

Decidido por el owner: el primer piloto es local/stdio y single-user;
`host-unconfined` sí se soporta y puede recibir grant one-shot o de sesión; el
primer MVP mostrable/publicable será `1.0.0`, no un `v0.1.0` retroactivo.

Cuestiones restantes:

1. ¿Qué acciones requieren siempre presencia humana y cuáles pueden recibir un
   grant de sesión; cuál es el máximo `maxUses`/TTL aceptable?
2. ¿Qué repos y paths contienen código restricted, credenciales, datos
   personales o material regulado, y qué providers pueden recibir cada clase?
3. ¿Quién posee las claves de operador, la rotación de secrets y la respuesta a
   incidentes; existe un canal break-glass separado y auditable?
4. ¿Redis, Postgres y Temporal se usarán sólo en loopback/dev o como servicios
   remotos; en ese caso qué TLS, ACL, namespace y network policy son obligatorios?
5. ¿Cuál es el presupuesto por trace de procesos, tokens/coste, bytes, disco y
   duración, y quién puede elevarlo?
6. ¿Qué esquema de firma/provenance y repositorio remoto constituyen la
   publicación oficial de `1.0.0`?
7. ¿Qué advisories pueden aceptarse temporalmente por no-reachability y quién
   firma, fecha y revalida esas excepciones?
8. ¿Qué RTO/RPO y evidencia forense se requieren antes de permitir agentes
    reales sobre repos no desechables?

# Auditoría de UX e interacción del operador

## Executive Summary

**UX quality: D.** No existe UI web propia; la experiencia controlada por el
repositorio es CLI, MCP schemas, prompts, runbooks y sesiones tmux. El happy
path dry-run funciona, la CLI ofrece texto/JSON consistentes y coordination V5
tiene errores y recovery bien documentados. Aun así, los tres momentos que más
confianza requieren —approval, recovery y completion— obligan a recordar IDs,
consultar fuentes distintas o aceptar estado incompleto. Los tres riesgos
principales son consentimiento desinformado, pérdida de control tras
interrupción y feedback MCP que presenta fallos como éxito. Las mejores
oportunidades son una vista `status/list/show/recover`, una approval queue con
preview firmado y un contrato MCP autoexplicativo. **No se puede declarar
conformidad WCAG 2.2 AA del producto completo** porque no hay DOM/UI final; en
la CLI se observaron barreras análogas a reflow y relaciones semánticas en
terminales estrechos. La solución inmediata no es una GUI, sino completar la
interacción textual con estados honestos y recuperables. El consentimiento
YOLO debe comunicar que `host-unconfined` suspende la frontera frente al child,
no esconderlo tras “advanced mode”.

## Interface Map

### Superficies

| Superficie | Usuario | Interacción | Estado |
|---|---|---|---|
| `agent-run` | operador local/CI | teclado, flags, tablas Rich, JSON | Built; policy/audit/approve |
| MCP `tools/list/call` | LLM host/orchestrator | schemas JSON y responses | Built; 30+ tools |
| Prompts de orchestrator/planner | LLM host | instrucciones y nombres de tools | Built, con drift |
| Runbooks/README | operador | pasos copiables y troubleshooting | Built, extensos pero divergentes |
| tmux supervised | operador/agent | attach, pane, ask/view/kill | Built, recovery manual |
| Coordination V5 | orquestadores/clientes | siete tools y códigos de error | Built, opcional |
| Inventory/recovery CLI | operador | status/list/show/recover | Planned V4 |
| YOLO grant/launch preview | operador/orchestrator | consent, expiry, revoke | Planned V4 |

### IA actual

```text
agent-run
├── policy
│   ├── validate
│   └── check
├── audit
│   └── show
└── approve <approvalId>
```

No hay ramas `orchestrations`, `tasks`, `sessions`, `approvals list/show`,
`status`, `recover`, `grants` o `launch preview`
(`cli/src/agents_cli/main.py:27-247`). En MCP, esas capacidades aparecen como
namespaces separados pero no existe una vista agregada de operador.

### Patrones

- feedback textual y JSON alternativo;
- exit codes diferenciados;
- policy decision con word/reason/`ruleId`;
- errors MCP como validation exception o como body `{error:...}`;
- IDs opacos (`tr-*`, `ts-*`, `ss-*`, `apr-*`) que enlazan pasos;
- prompts como navegación del LLM;
- tmux como superficie de supervisión fuera del CLI principal.

## Evidence Baseline

### Método

Se ejercitó la CLI real en el árbol integrado con:

- `agent-run --help`;
- `agent-run policy --help`;
- `agent-run audit --help`;
- `agent-run approve --help`;
- policy validate/check y fixtures sintéticas en la auditoría V5;
- help/audit en terminales de 80, 40 y 20 columnas en la baseline V5;
- walkthrough de runbooks y comparación con el smoke MCP.

No se leyó contenido personal ni prompts reales. No hay app web que renderizar,
por lo que no se generaron screenshots de viewport ni se ejecutó axe. La UI del
host MCP y el terminal concreto están fuera del control de este repo y deben
auditarse por separado.

### Matriz superficie/estado

| Superficie | Estados observados | Limitación |
|---|---|---|
| CLI help | root y subcommands | a 20 columnas los nombres se truncan |
| policy validate/check | valid, allow, deny, approval | feedback claro |
| audit show | data, empty, corrupt fixture, JSON | tabla pierde IDs/context a ancho estrecho |
| approve | help, invalid decision, unknown ID, success fixture | no list/detail/preview |
| MCP validation | missing/invalid fields | issues con path; schema preventivo pobre |
| coordination disabled | unavailable localizado | buen error/recovery |
| long agent call | inferido desde runtime | sin progress/cancel feedback en la misma call |

### Accesibilidad aplicable

| Check | Resultado | Nota |
|---|---|---|
| Keyboard-only | Pass para CLI; host/tmux dependiente | no hay pointer-only |
| No color-only | Pass | ALLOW/DENY/OK siguen siendo texto |
| `NO_COLOR` | Pass en baseline | alternativa sin ANSI |
| Reading order | Parcial | output lineal, tablas Unicode pierden relaciones |
| Reflow | Débil | IDs/actions se truncan a 40/20 columnas |
| Machine-readable alternative | Parcial | JSON conserva datos pero no contexto ausente |
| Screen reader | No verificado | depende de terminal/Orca/VoiceOver/NVDA |
| Focus/ARIA/touch/motion | N/A | no existe DOM/control touch |

Las barreras de reflow/estructura son analogías con WCAG 2.2 SC 1.4.10 y
1.3.1, no una declaración legal de incumplimiento.

## Interaction Flow Walkthroughs

### Flow 1 — Activación y primer dry-run

| Step | Acción | Feedback esperado | Realidad | Fricción | Sev. |
|---|---|---|---|---|---|
| 1.1 | instalar Python/Node | setup reproducible | README usa locks; guía histórica usa install parcial | dos recetas | Medium |
| 1.2 | `policy validate` + CI | “ready” | buen resultado, pero venv/cwd son prerequisitos implícitos | recovery limitado | Medium |
| 1.3 | configurar MCP | launcher inequívoco | paths relativos dependen del cwd del host | fallo antes de tools | Medium |
| 1.4 | elegir prompt | uno canónico | hay varias variantes y aliases que no son tools | carga cognitiva | High |
| 1.5 | ejecutar core loop | secuencia completa | guía omite `agent.ask`, kills y complete; smoke sí los usa | tutorial no cumple promesa | High |
| 1.6 | confirmar outcome | tasks/sessions terminales | complete no valida todo el trabajo | éxito falso | High |

### Flow 2 — Handoff coder→reviewer

| Step | Acción | Feedback esperado | Realidad | Fricción | Sev. |
|---|---|---|---|---|---|
| 2.1 | assign/spawn coder | tarea y session visibles | IDs devueltos por llamadas separadas | copiar/recordar | Medium |
| 2.2 | entregar prompt | progreso y cancel | `ask/delegate` puede esperar largo sin progress | incertidumbre | Medium |
| 2.3 | crear/share artifact | provenance y clasificación claros | schema/producer dependen de fields caller | falsa confianza | High |
| 2.4 | review | verdict ligado al digest | LangGraph legacy acepta cualquier response como reviewed | feedback semántico falso | High |
| 2.5 | close | bloqueos visibles | tasks/sessions pueden quedar abiertos | cierre no fiable | High |

### Flow 3 — Approval

| Step | Acción | Feedback esperado | Realidad | Fricción | Sev. |
|---|---|---|---|---|---|
| 3.1 | descubrir pending | queue/list | sólo evento/a través del LLM | no hay superficie | High |
| 3.2 | identificar ID | fila copiable | tabla audit puede truncar/no destacar `approvalId` | recall | High |
| 3.3 | entender objeto | repo/action/target/digest/expiry | `approve` sólo recibe ID, decision, note | consentimiento ciego | High |
| 3.4 | decidir | preview + confirm + receipt | no challenge/firma/presencia | no prueba quién/qué | High |
| 3.5 | corregir error | revoke/expire/retry claro | first-wins, sin UX de revocación | irreversible | Medium |

### Flow 4 — Interrupción y recovery

| Step | Acción | Feedback esperado | Realidad | Fricción | Sev. |
|---|---|---|---|---|---|
| 4.1 | volver después de perder contexto | lista de actividad | no status/inventory | dead end | High |
| 4.2 | relacionar trace/task/session | árbol navegable | IDs viven en responses/audit/tmux | reconstrucción manual | High |
| 4.3 | reattach/cancel | acción scopeada | exige `sessionId` conocido | no discoverable | High |
| 4.4 | reconciliar crash | estado y opción segura | no workflow de recovery | conocimiento interno | High |

### Flow 5 — Launch YOLO/no confinado

Estado actual: sólo planificado. La UX objetivo debe separar:

1. petición del modo y scope;
2. preview de capacidades y recursos;
3. explicación de boundary conservada/perdida;
4. grant one-shot o de sesión;
5. consumo visible;
6. expiry/revoke y resultado.

Si no existe grant aplicable, el flujo debe quedar pending y pedir aceptación,
no degradar silenciosamente ni tratar `--yes` como consentimiento.

## UX Audit

### Findings

| ID | Sev. | Hallazgo | Impacto |
|---|---|---|---|
| UX-H01 | High | Approval sin queue/detail/preview | decisión desinformada o bloqueo |
| UX-H02 | High | Prompts/runbooks nombran tools/aliases inexistentes | LLM falla en preflight/handoff |
| UX-H03 | High | Docs/policy discrepan sobre Codex restricted | operador rechaza trabajo válido o confía en policy incorrecta |
| UX-H04 | High | `completed` convive con task `pending` | estado visible falso |
| UX-H05 | High | Errores de dominio con `isError:false` | host continúa tras deny/not-found |
| UX-H06 | High | No hay inventario de sesiones/traces | recovery depende de memoria externa |
| UX-H07 | High | Guía de primer uso no cierra el flow | activación no alcanza el aha |
| UX-H08 | High planned | Consentimiento YOLO aún no tiene surface | riesgo de convertir autonomía en bypass |
| UX-M01 | Medium | Schemas MCP sin descriptions/bounds/enums suficientes | errores prevenibles y lookup en runbooks |
| UX-M02 | Medium | Mutaciones no anuncian destructive/idempotent/risk | host no puede presentar confirmación consistente |
| UX-M03 | Medium | Config host-agnostic depende del cwd | fallo de arranque opaco |
| UX-M04 | Medium | Llamadas largas sin progress/cancel visible | el host parece congelado |
| UX-M05 | Medium | Tablas no priorizan información por ancho | IDs/acciones inutilizables en split/SSH |
| UX-M06 | Medium | Coordination V5 no aparece en prompt primario | feature distintiva no se descubre |
| UX-L01 | Low | Versiones V3/V4/V5/MVP mezcladas | reduce orientación/confianza |

### Detalle de los blockers

#### UX-H01 — Consentimiento sin contexto

El renderer audit fija columnas reducidas
(`cli/src/agents_cli/output.py:45-65`) y la CLI sólo expone
`approve <approvalId>` (`cli/src/agents_cli/main.py:203-247`). El operador no
obtiene una vista estable de action/repo/branch/agent/digest/expiry antes de
decidir. Es el punto de mayor riesgo de error humano.

#### UX-H04 — Visibilidad de estado falsa

Task nace `pending` y no hay tools start/complete/cancel
(`gateway/src/tools/task.js:4-25`); orchestration puede cambiar status sin
preflight (`gateway/src/services/orchestration_service.js:58-72`). Viola
visibility of system status y error prevention.

#### UX-H06 — Recovery basado en recuerdo

`session.attach_info`, `agent.view/ask/kill` necesitan session ID; no existe
list. `orchestration.view` no sustituye un inventario operativo completo
(`gateway/src/tools/session.js`, `gateway/src/tools/agent.js`). Un reinicio del
host o compaction de conversación convierte una sesión persistente en
prácticamente huérfana.

#### UX-H08 — Riesgo de microcopy YOLO

`workspace-yolo` mantiene el control plane aislado; `host-unconfined` comparte
UID/host y no conserva boundary frente al child. Mostrar ambos como niveles de
“autonomía” sin esa diferencia induce consentimiento inválido. El preview debe
nombrar concretamente filesystem, secrets, red, otros repos y credenciales
accesibles.

### Strengths

- CLI compacta, keyboard-first y con JSON estable.
- Policy explica palabra, reason y `ruleId`; el color es redundante.
- Validation MCP reporta varios issues con path.
- Approval request/poll/wait no bloquea obligatoriamente todo el flow.
- Coordination V5 documenta lifecycle, idempotency y recovery con precisión.
- Disabled coordination falla localizado.
- Smoke MVP2 produce un resumen humano útil.
- Namespaces MCP hacen la superficie reconocible.

## UX Strategy

| Tema | Estado objetivo | Principio | Métrica |
|---|---|---|---|
| Estado honesto | overview que converge trace/tasks/sessions/approvals | Visibility before action | cero complete con blockers ocultos |
| Consentimiento informado | queue/detail/challenge/receipt | Nothing sensitive is approved blind | 100% approvals con preview exacto |
| Recovery | list/show/recover sin IDs externos | Recognition over recall | recovery <2 min |
| Contract usability | schemas y errors uniformes | Prevent before repair | cero unknown tool en golden prompts |
| Text accessibility | output vertical/wide/JSON equivalente | Essential data never truncates silently | usable a 40 cols o fallback explícito |
| YOLO clarity | modos/riesgo/grant visibles | Name the boundary being waived | usuario distingue ambos modos sin ayuda |

### Qué no rediseñar

- No construir dashboard web todavía.
- No sustituir stdio, namespaces o JSON.
- No ocultar codes/`ruleId` detrás de copy imprecisa.
- No simplificar semánticas Redis reales para “hacerlas amigables”.
- No prometer WCAG web para una CLI; sí probar terminal/screen reader soportado.

## Design Plan

| Milestone | Item | Superficies | Acceptance observable | Effort | Riesgo | Dependencias |
|---|---|---|---|---:|---|---|
| M0 | Baseline de tasks | CLI/MCP/runbooks | 5 operadores completan/recover con métricas | M | Bajo | corpus M0 |
| M0 | Contract lint | prompts/docs/tools | todo nombre/shape publicado existe | M | Bajo | A/0/00–02 |
| M1 | Approval queue/detail | CLI/control socket | decisión completa sin JSONL/LLM | L | Medio | B/2/02, C/0/00–02 |
| M1 | Honest completion | orchestration/task | blocker explica fix y no cambia status | L | Medio | B/1/03 |
| M1 | Inventory/recovery | CLI/control | segundo operador reattach/cancel/reconcile | L | Medio | B/1/09, C/0/03 |
| M1 | YOLO consent | grants/launch CLI | scope/riesgo/expiry/uses/receipt visibles | L | Alto | B/2/03, C/0/04 |
| M2 | Unified error envelope | MCP/clients | todo error usa `isError`/code/retry coherente | L | Medio | B/4 |
| M2 | Descriptive schemas | MCP tools | descriptions, units, bounds, risk annotations | M | Bajo | contract 0.2 |
| M2 | Progress/cancel | agent calls | feedback periódico y cancel/recover | L | Medio | B/0/01–03 |
| M3 | Adaptive terminal output | CLI | no ID/action perdido a ancho soportado | M | Bajo | C/0/00 |
| M3 | Canonical onboarding | docs/smoke | first dry-run cerrado en <10 min | M | Bajo | anteriores |

### Quick wins

- Añadir enlaces directos a `audit/` y `plan/PROJECT_V4/{EPICS,SHEETS}.md`.
- Retirar aliases inexistentes de prompts o etiquetarlos como action/kind.
- Añadir `--wide`/vista vertical y nunca truncar IDs sin indicador/copy path.
- Cambiar help “V4” por versión/capabilities derivadas del manifest.
- Documentar en una frase prominente que `host-unconfined` comparte privilegios
  del UID.

### Design sketches — top 3

#### 1. `agent-run status`

Vista por defecto: trabajo activo y bloqueos. Cada trace muestra
`tasks 2/3 · sessions 1 active · approvals 1 · verdict stale`. `show` abre una
vista vertical copiable; `--json` conserva el mismo envelope. Las acciones
mutantes aparecen sólo si son válidas y abren challenge/firma.

#### 2. Approval/YOLO preview

```text
ACTION       agent.launch
MODE         host-unconfined
TARGET       codex/coder
REPO         /canonical/repo
DIGEST       sha256:...
EXPIRES      10m       USES 1
BOUNDARY     Child shares this user's filesystem, env and credentials.
```

Confirmar firma ese objeto; cambiar scope/digest obliga a empezar de nuevo.
Para `workspace-yolo`, la copy enumera lo que sigue aislado.

#### 3. Recover flow

`status --stale` detecta session sin heartbeat, intent pendiente o approval
expirada. `recover <trace>` explica opciones `reattach`, `reconcile`, `cancel`
y el efecto esperado. Tras ejecutar, vuelve a mostrar estado convergente y
receipt; nunca pide al usuario manipular tmux/SQLite como camino normal.

## Open Questions

1. ¿Qué ancho mínimo de terminal y qué screen readers se soportarán?
2. El primer piloto será local/single-user; queda por decidir si se optimiza
   exclusivamente para operador experto o también para onboarding guiado.
3. ¿Qué acciones deben ofrecer undo/revoke y cuáles son first-wins definitivas?
4. Decidido: `workspace-yolo` y `host-unconfined` pueden usar grant de sesión;
   ambos conservan expiry/revoke/budget y el segundo advierte mismo UID.
5. ¿Se quiere completion estricta o un estado separado `abandoned/overridden`?
6. ¿Quién posee la terminología única de versiones, modos y estados?

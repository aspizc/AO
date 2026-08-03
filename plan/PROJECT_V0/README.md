# Plan de implementacion V4 — Vista jerarquica

Esta carpeta es el **plan operativo** para implementar el sistema descrito en [`../../plan_proyecto_v4.md`](../../plan_proyecto_v4.md).

Cada archivo `plan/PROJECT_V0/<stage>/<stream>/<task>.md` describe **una tarea atomica** con suficiente nivel de detalle para que un desarrollador junior o un agente IA pueda completarla sin tener que leer el plan V4 entero.

> **Estructura multi-proyecto.** Este README cubre **Project V0** (el MVP/MVP2.0,
> stages planos `A`-`Z`, que implementa `../../plan_proyecto_v4.md` ≈ v0.4). Los
> proyectos sucesores viven como hermanos de esta carpeta:
> - **Project V1** — orquestacion avanzada (LangGraph + Postgres + Redis Streams
>   + Temporal + OpenTelemetry): [`../PROJECT_V1/`](../PROJECT_V1/README.md).
> - **Project V2** — backlog futuro no prioritario: [`../PROJECT_V2/`](../PROJECT_V2/).

> Si solo vas a implementar una tarea, lee:
> 1. Este README.
> 2. El README del stage al que pertenece la tarea.
> 3. El archivo de tu tarea concreta.
>
> No necesitas leer todo el plan V4 para empezar.

---

## Como leer un archivo de tarea

Cada archivo `plan/PROJECT_V0/<stage>/0/<NN>.md` tiene esta estructura:

| Seccion | Para que sirve |
|---|---|
| Quick reference | Tabla con stage, branch, deps, esfuerzo y skills. |
| ¿Por que esta tarea existe? | Contexto y motivacion. Si no entiendes esto, no escribas codigo. |
| ¿Que hay que hacer? | Objetivo concreto en una frase larga. |
| Pre-requisitos | Lo que debe estar listo antes de empezar. |
| Plan de implementacion paso a paso | Lo que tienes que ejecutar en orden. |
| Archivos a crear / modificar | Tabla con paths exactos. |
| Tests requeridos | Tabla con id, tipo, archivo y caso. |
| Errores comunes a evitar | Bypass o malentendidos detectados en V4. |
| Verificacion manual | Comandos para confirmar que tu cambio funciona. |
| Criterios de aceptacion | Checklist binario que tu PR debe cumplir. |
| Definition of done | Checklist comun a todas las tareas. |

---

## Convenciones globales (re-leer antes de cada tarea)

- **ID de tarea:** `<Stage>/<Stream>/<Task>`. Ej: `A/0/0`. La carpeta refleja el ID: `plan/PROJECT_V0/A/0/00.md`.
- **Branch:** `feature/<id-normalizado>-<slug>`. Ej: `feature/A-0-0-folder-architecture`.
- **Base branch:** `develop`. Si no existe, crearla una vez desde `main`. Nunca trabajar directamente en `main`.
- **No push:** ninguna tarea puede hacer `git push` sin que el operador apruebe explicitamente.
- **No restricted paths:** ninguna tarea toca rutas fuera de este repo, ni los repos clasificados `restricted` (`cvision`, `cvlib`, etc.).
- **No componente orchestrator:** prohibido crear un proceso o directorio `orchestrator/`. El orquestador es un rol del LLM humano-facing.
- **Naming del MCP server:** el servidor MCP se llama **`agents-gateway`** en cualquier configuracion. `agents-orchestrator` es solo el nombre del repositorio raiz.
- **Clientes humano-facing fuera de scope:** Cursor, Antigravity IDE y otros IDEs concretos NO se configuran ni se testean en este proyecto. Solo se entrega un ejemplo MCP generico.
- **Approval async-first:** `approval.request` nunca bloquea; espera explicita via `approval.wait` con timeout acotado por el servidor.
- **Idioma:** codigo y comentarios en ingles; documentacion del operador y system prompt del orquestador en espanol o ingles a eleccion del operador.
- **Logs:** todos los logs estructurados (JSON) y a stderr. **stdout** queda reservado para el protocolo MCP.
- **Tests antes de cerrar:** cada tarea termina con tests automaticos verdes o checklist manual proporcional al cambio.
- **Changelog:** actualizar `CHANGELOG.md` `## Unreleased` con una linea por tarea cerrada. Si no existe, lo crea `A/0/1`.

---

## Mapa de stages

| Stage | Tema | Tareas | Carpeta |
|---|---|---:|---|
| **A** | Cimientos y arquitectura | 7 | [`A/`](A/README.md) |
| **B** | Registries y JSON Schemas | 6 | [`B/`](B/README.md) |
| **C** | Policy engine determinista | 6 | [`C/`](C/README.md) |
| **D** | Audit log y configuracion runtime | 4 | [`D/`](D/README.md) |
| **E** | CLI auxiliar (`agent-run`) | 3 | [`E/`](E/README.md) |
| **F** | SQLite, modelos de dominio | 4 | [`F/`](F/README.md) |
| **G** | MCP Gateway skeleton | 4 | [`G/`](G/README.md) |
| **H** | Adapter base + tmux | 4 | [`H/`](H/README.md) |
| **I** | Gemini adapter | 3 | [`I/`](I/README.md) |
| **J** | Orchestration y task tools | 3 | [`J/`](J/README.md) |
| **K** | Agent tools (delegate/spawn/ask/view/kill) | 5 | [`K/`](K/README.md) |
| **L** | Artifact store basico | 3 | [`L/`](L/README.md) |
| **M** | Sanitization layer | 4 | [`M/`](M/README.md) |
| **N** | Artifact share + visibilidad | 3 | [`N/`](N/README.md) |
| **O** | Claude adapter | 3 | [`O/`](O/README.md) |
| **P** | Codex adapter (opcional MVP) | 4 | [`P/`](P/README.md) |
| **Q** | Approval workflow async | 6 | [`Q/`](Q/README.md) |
| **R** | Session tools + intervencion tmux | 3 | [`R/`](R/README.md) |
| **S** | Message store MVP | 2 | [`S/`](S/README.md) |
| **T** | Config MCP generica + system prompt | 3 | [`T/`](T/README.md) |
| **U** | E2E y cierre MVP | 6 | [`U/`](U/README.md) |
| **V** | MVP2.0 · Seleccion de modelo en adapters | 3 | [`V/`](V/README.md) |
| **W** | MVP2.0 · Codex real como coder | 3 | [`W/`](W/README.md) |
| **X** | MVP2.0 · Lanzamiento del orquestador (generico) | 3 | [`X/`](X/README.md) |
| **Y** | MVP2.0 · E2E real de 2 agentes + gate | 4 | [`Y/`](Y/README.md) |
| **Z** | Planificacion asistida (planner+coder loop) | 5 | [`Z/`](Z/README.md) |
| **Total** | | **104** | |

> **Nota de renumeracion:** los stages **V** y **W** se reasignan al **MVP2.0**
> (lanzar desde terminal un orquestador con coder Codex `gpt-5 medium` +
> reviewer Claude `opus-4.7`). El contenido post-MVP que antes ocupaba esas
> letras (infra Postgres/Redis/LangGraph y sesiones sin `taskId`) pasa al
> **Backlog post-MVP2.0** mas abajo, sin carpeta asignada hasta que se programe.

---

## Orden de ejecucion priorizado (MVP)

```text
1. A + B + C + D + E      → foundation, registries, policy, audit, CLI
2. G + T/0/0 + T/0/1      → Gateway MCP minimo + config generica + system prompt
3. F + J + L              → estado, orchestration, artifacts
4. M + N                  → sanitizacion + visibility matrix
5. H + I                  → adapters base + tmux + Gemini
6. Q + R                  → approvals async + sesiones
7. O                      → Claude adapter
8. K/0/3 + K/0/4          → superficie `agent.*` real por MCP + flujo dos agentes
9. U/0/5                  → gate de usabilidad operacional
```

### Orden de ejecucion priorizado (MVP2.0 y extensiones, tras cerrar MVP)

Estado al planificar: **A-U** ✓, **V (V/0/0-V/0/2)** ✓, **W/0/0** en curso,
**Q/0/1-Q/0/4** ✓. La secuencia a nivel de tarea, ordenada por dependencias:

```text
# Track 1 — Codex real como coder (desbloquea todo el MVP2.0)
 W/0/0  Codex headless real            dep: V/0/1 ✓            (en curso)
 W/0/1  Codex supervised tmux          dep: W/0/0
 W/0/2  Perfil habilitacion Codex      dep: W/0/1

# Track 2 — Launcher + cierre MVP2.0
 X/0/0  Perfil MCP 2 agentes           dep: W/0/2, T/0/0 ✓
 X/0/1  System prompt 2 agentes        dep: X/0/0, T/0/1 ✓
 X/0/2  Runbook operador               dep: X/0/1, R/0/0 ✓
 Y/0/0  E2E real guarded               dep: W/0/1, X/0/0
 Y/0/1  Smoke MVP2.0                   dep: Y/0/0, X/0/2
 Y/0/2  Gate + ADR-005                 dep: Y/0/1, U/0/5 ✓

# Track 3 — Autonomia (mecanismo primero, luego los scopes)
 Q/0/5  Mecanismo auto-approval + ADR-006   dep: Q/0/1 ✓, Q/0/2 ✓  (sin bloqueos)
 Y/0/3  Scope code.apply (coder+reviewer)   dep: Q/0/5, X/0/1
 Z/0/4  Scope plan.apply (planning)         dep: Q/0/5, Z/0/2

# Track 4 — Planificacion asistida (independiente de W/X/Y; solo necesita V ✓)
 Z/0/0  Rol planner-review + registro repo  dep: V/0/0 ✓, C/0/1 ✓
 Z/0/1  Prompts del bucle                   dep: Z/0/0, T/0/1 ✓
 Z/0/2  Perfil MCP planning                 dep: Z/0/1, V/0/2 ✓
 Z/0/3  Runbook + smoke planning            dep: Z/0/2, R/0/0 ✓
```

Paralelizable: los 4 tracks son casi independientes. **Q/0/5** y el **Track 4
(planning)** pueden empezar ya (sus deps estan cerradas); **Track 1 (W)** es el
camino critico que habilita Track 2. Reglas de oro: (1) **Q/0/5 antes que Y/0/3 y
Z/0/4** (mecanismo unico; los scopes solo lo enchufan); (2) **W antes que X/Y**
(sin Codex supervised real no hay flujo de 2 agentes que lanzar ni E2E que validar).

El cierre MVP2.0 se valida como V/W/X/Y: V entrega model selection, W entrega
Codex real como coder, X entrega el launcher generico, y Y/0/2 fija el MVP2.0
gate con checklist y ADR.

MVP2.0 gate: `docs/mvp2-acceptance-checklist.md` + `docs/adr/ADR-005-mvp2-scope.md`.
Autonomia opt-in (Q/0/5 + Y/0/3 + Z/0/4): `docs/adr/ADR-006-bounded-autoapprove.md`.

> MVP2.0 = lanzar desde terminal un host MCP generico como orquestador que dirige
> coder Codex (`gpt-5 medium`) + reviewer Claude (`claude-opus-4-7`) en sesiones
> tmux supervisadas, via el gateway. Codex sigue disabled por defecto y prohibido
> en `restricted`.

> Stage Z = planner (Claude Opus 4.7) ayuda a definir/refinar `plan/*.md` en bucle:
> draft (planner+humano) -> apply (coder) -> review+corrige (planner) -> escala
> dudas (humano) -> converge. El coder escribe; el planner revisa. Con
> `AGENTS_AUTOAPPROVE=plan.apply` el bucle corre en modo autonomo (default off).

Tareas opcionales / fuera de MVP:

- **P/0/0** — Codex adapter dormido (base que W/0/0 activa).
- **P/0/1-P/0/3** — Tareas historicas de Codex real; **superadas** por Stage W
  (que anade seleccion de modelo y sandbox).
- **S/0/0, S/0/1** — Message store (solo si entra un consumidor real; en MVP usar artifact-mediated).

Backlog post-MVP2.0 (sin carpeta asignada):

- **Infra post-MVP** — Postgres, Redis Streams, LangGraph client, MCP servers internos.
- **Task-less sessions** — Sesiones sin `taskId` para uso exploratorio/controlado;
  mantiene `task.assign` como flujo recomendado.

---

## Glosario rapido

| Termino | Significado |
|---|---|
| Gateway | Unico componente nuevo a construir. Servidor MCP stdio. |
| Orquestador | Rol que asume el LLM humano-facing. **No** es un proceso. |
| Hijo | Instancia de agente (Gemini/Claude/Codex) en rol distinto de orchestrator. |
| Agente | CLI tecnico (`gemini`, `claude`, `codex`). |
| Rol | Funcion (`orchestrator`, `coder`, `reviewer`, `restricted-coder`, ...). |
| Clasificacion | `unrestricted` / `internal` / `restricted` por repo. |
| `traceId` | Identificador unico que correla toda una orquestacion. |
| Artefacto | Output persistido. Tiene tipo y clasificacion. |
| Raw artifact | Sin sanitizar. Solo accesible a roles autorizados. |
| Sanitized artifact | Procesado por sanitization layer. Compartible. |

---

## Como empezar

```bash
git fetch
git checkout develop || git checkout -b develop main
cat plan/PROJECT_V0/A/README.md       # Lee el overview del stage A
cat plan/PROJECT_V0/A/0/00.md         # Lee la primera tarea
git checkout -b feature/A-0-0-folder-architecture
# ... implementar paso a paso lo que dice el archivo ...
./scripts/ci.sh               # cuando exista (a partir de A/0/5)
```

Cada tarea es una rama. Cada rama es un PR. Cada PR cierra una tarea.

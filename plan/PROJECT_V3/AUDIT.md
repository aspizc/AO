# PROJECT_V3 — Auditoría técnica y plan de mejora

> Auditoría de código completa del repositorio (2026-06-10), generada con `/code-audit-review`.
> Análisis read-only sobre la rama `feature/K-0-agent-mcp-tools-runtime`.
> Este documento es la base del backlog V3: hardening del núcleo, gates de CI e higiene del repo.

## Executive Summary

**Nota global: B.** El proyecto es un MCP Gateway local-first con una postura de seguridad notablemente sólida (spawning por arrays, SQL parametrizado, sanitización fail-closed, comparación timing-safe de tokens) y una cultura de tests fuerte (~10k líneas de test para ~6,5k de código fuente, con trazabilidad plan→commit→review ejemplar). Las deducciones vienen de que **el núcleo de confianza (policy engine) es la pieza con menos tests directos**, de que la capa de roles es deny-list con default-allow (semántica sorprendente para un enforcement point), de que el subproyecto `orchestrator-langgraph` (~2,6k líneas) **no está en ninguna puerta de CI**, y de deuda de higiene: sin LICENSE, sin lockfile Python, sin linters, sin CI remota.

**Top 3 riesgos:**

1. Semántica default-allow y helpers no testeados en `policy_engine.js`.
2. `orchestrator-langgraph` sin gate + dependencias sin pinear → rot silencioso.
3. Ausencia de LICENSE bloquea legalmente cualquier difusión o contribución.

**Top 3 oportunidades:**

1. Un único gate que ejecute todo + linting (barato, alto retorno).
2. Unificar el manejo de errores duplicado en Python y documentar el contrato de error del Gateway.
3. Reconciliar README/docs con el código reutilizando el patrón de structure-tests que ya existe.

---

## Repo Map

**Propósito:** Gateway MCP por stdio (`agents-gateway`) que media la colaboración segura entre agentes LLM de código (Codex, Claude, Gemini), con políticas deterministas, auditoría JSONL append-only, estado SQLite y aprobaciones humanas. El orquestador no es un proceso: es un rol del LLM humano-facing conectado como cliente MCP (ADR-002). Madurez: **MVP2.0 cerrado** (PROJECT_V0, etapas A–Y); PROJECT_V1 (Postgres, Redis, LangGraph, Temporal, OTel) en curso; PROJECT_V2 planificado.

**Stack:** Node ≥20 ESM (gateway), Python ≥3.11 (CLI Typer y orquestador LangGraph/Temporal), SQLite (better-sqlite3), tmux para sesiones supervisadas.

**Arquitectura:** `tools/ (validación zod) → services/ → core/ (policy, audit, state, artifacts, sanitizer) → adapters/ (tmux, codex, claude, gemini)`. Capas limpias y consistentes.

| Directorio | Descripción |
|---|---|
| `gateway/` | El único runtime: servidor MCP, políticas, auditoría, estado, adaptadores |
| `cli/` | CLI de operador `agent-run` (Typer); delega toda la lógica a scripts Node del gateway |
| `orchestrator-langgraph/` | Trabajo V1: grafos LangGraph, workflows Temporal, consumidor Redis — **no gateado** |
| `policies/`, `schemas/`, `prompts/` | Registros versionados de política, JSON Schemas, prompts |
| `plan/` | 435 ficheros: árboles V0/V1/V2 con trail de reviews por tarea |
| `tests/` | Suites structure/gateway/cli/e2e en la raíz, además de las de cada subproyecto |
| `docs/` | ADRs 001–006, guías de operador, threat model, checklists de aceptación |
| `docker/` | compose opcional Postgres 16 + Redis 7 (V1) |

**Sorpresas:** directorios `.git/` vacíos dentro de `gateway/`, `docs/` y `orchestrator-langgraph/` (restos de una iteración anterior); 175 KB de specs v4 en español sin trackear en la raíz; el adaptador Postgres ejecuta SQL materializado vía `psql -c`.

---

## Audit Report

### Seguridad — la dimensión más sana

Sin hallazgos Critical/High. Hechos verificados que conviene preservar:

- **Spawning por arrays en todos los adaptadores** — el prompt nunca se interpola en un shell (`gateway/src/adapters/gemini_adapter.js:109`, `claude_adapter.js:127-135`, `codex_adapter.js:199-213`, `tmux_client.js:29`).
- **SQL parametrizado en todos los repositorios SQLite** (`gateway/src/core/repositories/*.js`).
- **Path traversal bloqueado**: `assertSafeCwd()` con realpath + allowlist (`base_adapter.js:20-40`), `safePathSegment()` en el artifact store (`artifact_store.js:22-34`), `safeChunk()` en nombres tmux (`session_naming.js:1-29`).
- **Secreto HMAC** generado con `crypto.randomBytes(32)`, persistido con modo `0600` (`gateway/src/config.js:52-53`); verificación con `timingSafeEqual` (`core/trace_access.js:13-20`); redacción de claves sensibles en auditoría (`core/audit.js`).

Hallazgos:

**[S1 · Medium · Hecho] Adaptador Postgres = SQL materializado en cliente ejecutado vía `psql -c`.** `gateway/src/core/postgres_db.js:61-76` sustituye `?`/`@named` por literales escapados (`pgLiteral`, líneas 105-115) y ejecuta con `execFileSync("psql", [...])`. El escapado (comillas dobladas) es correcto hoy, pero es frágil por diseño: cualquier tipo nuevo o cambio de `standard_conforming_strings` reabre la superficie de inyección. El propio fichero lo admite como scaffold (líneas 3-5). Consecuencia: si la ruta Postgres pasa a producción tal cual, el enforcement point depende de un escapado manual.

**[S2 · Medium · Hecho+Juicio] La capa de roles es deny-list y el pipeline es default-allow.** `evaluateRole` solo aplica `denyActions` (`policy_engine.js:92-94`); las `allowActions` declaradas en `policies/roles.json` no se aplican salvo los casos especiales de sanitización (`policy_engine.js:205-219`) y `task.assign` (96-115). Si ninguna capa objeta, `runPipeline` devuelve ALLOW (`policy_engine.js:271`). Consecuencia concreta: una acción nueva no listada en `denyActions` queda permitida por defecto para cualquier rol — al añadir una tool nueva hay que acordarse de actualizar todas las deny-lists. El registro de datos *sugiere* allowlist; el motor implementa denylist. Es una decisión que debe ser explícita, no accidental.

**[S3 · Low · Hecho] Fallback silencioso del secreto de acceso a mensajes.** `config.js:55-57` traga cualquier excepción y cae a un secreto por-proceso sin loguear nada; los tokens emitidos dejan de verificar tras un reinicio sin pista alguna.

### Testing

**[T1 · High · Hecho] `policy_engine.js` no tiene fichero de test propio.** El núcleo de autorización (289 líneas) se cubre solo indirectamente a través de 5 suites de aspecto (`tests/gateway/policy_*.test.js`) vía `evaluate()`. Helpers con casuística delicada — `normalizePolicyPath` (:19-35), `pathMatchesExcludedPath` (:37-47), `matchesProtectedBranch` (:120-125), `actionMatchesDeny` (:15-17) y el comportamiento default-allow del pipeline — no tienen tests unitarios directos. Un edge case erróneo aquí autoriza en silencio.

**[T2 · High · Hecho] `postgres_db.js` solo se testea con un executor falso** (`tests/gateway/postgres_state.test.js` usa `createFakePostgresExecutor()`); ninguna prueba toca un Postgres real, ni siquiera opt-in, pese a que `docker/docker-compose.yml` lo provee.

**[T3 · Medium · Hecho] Sin tests para `telemetry.js` (228 líneas), `trace_access.js`, y los caminos de error de `mcp_server.js`** (manejo de fallos de audit append, carga de config).

**[T4 · Medium · Juicio] Riesgo de flakiness en tests de espera de aprobación** — `tests/gateway/approval_wait.test.js` usa `setTimeout` de 20-30 ms y aserciones de latencia `<200ms` que pueden fallar bajo carga.

**Fortalezas:** tests de integración con I/O real (artifact store verifica ficheros, filas de BD y eventos de audit); E2E real con dos agentes correctamente gateado por `AGENTS_E2E_REAL=1` que verifica eliminación de secretos (`tests/e2e/mcp_two_agent_real.test.js:121-143`); aislamiento por proceso (`gateway/package.json:10`); skips defensivos en Python (`pytest.importorskip`); structure-tests que validan la documentación.

### Arquitectura y calidad de código

**[A1 · High · Hecho] `orchestrator-langgraph` no está en ninguna puerta de CI.** `scripts/ci.sh` ejecuta structure, gateway, e2e, smoke, policy y cli — sus 13 ficheros de test no se ejecutan nunca. ~2,6k líneas de código que pueden romperse sin detección, incluyendo `workflows.py` (556 líneas, el fichero más grande del repo).

**[A2 · High · Hecho] `_raise_on_tool_error` duplicada 4 veces con semántica divergente.** `activities.py:365` comprueba `error/code/isError`; `graphs/delegate_review.py:68` comprueba `tool_error/isError`; `graphs/plan_refine.py:41` y `nodes/approval.py:29` comprueban `tool_error/isError/error`. Un error del Gateway que llegue como `{"code": ...}` se detecta en un flujo y pasa silenciosamente en otro. `_require` está copiada 5 veces. Esto es deriva por copy-paste en el manejo de errores, la peor zona para tenerla.

**[A3 · Medium · Hecho] Dependencias Python sin pinear y sin lockfile.** `orchestrator-langgraph/pyproject.toml:6-10` declara `langgraph`, `mcp`, `temporalio` sin ningún límite de versión; no existe `uv.lock`/`requirements.txt` en el repo. Además `redis` se importa en runtime (`consumers/metrics.py:158-165`) pero no está declarado.

**[A4 · Low · Hecho/Por diseño]** El CLI delega todo a scripts Node del gateway (`cli/src/agents_cli/main.py:61-159`) — sin doble implementación de políticas. Correcto; preservar.

Arquitectura del gateway: capas coherentes, sin dependencias circulares detectadas, servicios pequeños. Dimensión sana en lo estructural.

### Documentación

**[D1 · Critical · Hecho] No hay fichero LICENSE.** `docs/license-decision-needed.md` lo reconoce explícitamente: "all rights reserved" por defecto. Bloquea contribución, publicación y cualquier uso por terceros.

**[D2 · Medium · Hecho] README contradice el código y omite variables.** `README.md:124` declara fuera de alcance "Postgres, Redis Streams, event bus, LangGraph client", pero `gateway/src/core/postgres_db.js` existe, `audit.js` publica a Redis Streams y `config.js:73-74,85-89` carga `AGENTS_REDIS_URL/STREAM` y los flags OTel. La tabla de variables del README (líneas 129-144) omite 7 variables que `config.js` sí carga (`AGENTS_MESSAGE_ACCESS_SECRET[_FILE]`, `AGENTS_OTEL_*`, `AGENTS_REDIS_*`). Es la distinción V0/V1 mal comunicada, no código fantasma — pero un operador no puede saberlo desde el README.

**[D3 · Medium · Hecho] Material sin trackear y restos:** `plan_proyecto_v4.md` (88 KB) y `tareas_implementacion_v4.md` (87 KB) sin trackear en la raíz; `docs/pending-implementation-items.md` (que documenta los gaps conocidos) también sin trackear; directorios `.git/` vacíos en `gateway/`, `docs/` y `orchestrator-langgraph/`.

**Fortalezas:** ADRs 001-006 disciplinados y decisorios; CHANGELOG granular trazable a etapas; guías de operador paso a paso verificadas por structure-tests; threat model presente.

### DevEx y operaciones

**[O1 · Medium · Hecho] Sin CI remota** (no existe `.github/workflows/`); el gate es `scripts/ci.sh` manual y local. Parcialmente por diseño (ADR-005), pero nada impide que un commit roto llegue a `main`.

**[O2 · Medium · Hecho] Cero linting/formateo:** sin eslint/prettier/ruff/black/mypy en ningún subproyecto; `cli/pyproject.toml` solo lista pytest como dev-dep.

**[O3 · Medium · Hecho] Auditoría de frontera acoplada a telemetría.** `mcp_server.js:126` pasa `append: telemetry.enabled ? auditAppend : null` — el evento `MCP_TOOL_CALL` solo se escribe si OTel está activado (apagado por defecto). Los servicios auditan por su cuenta, pero el registro a nivel de frontera MCP desaparece en la configuración por defecto, y nada documenta ese acoplamiento.

**[O4 · Low · Juicio]** 73 ramas `feature/*` ya mergeadas sin podar; `docker-compose.yml` funcional pero no referenciado desde ninguna guía.

### Rendimiento y dependencias

Dimensión sana para la escala del proyecto (proceso local, un operador): no se detectaron N+1, bloqueos en rutas async ni crecimiento sin límite — el audit JSONL es append-only por diseño y los waits están acotados por `AGENTS_APPROVAL_MAX_WAIT_MS`/`AGENTS_AGENT_TIMEOUT_MS`. Dependencias Node mínimas y razonables con lockfile presente; el único punto es la falta de pineo en Python (A3).

---

## Improvement Strategy

**Tema 1 — El núcleo de confianza es lo menos verificado.** El policy engine, el scaffold Postgres y el acoplamiento audit/telemetría concentran el riesgo de correctitud. *Target:* tests unitarios directos del motor y sus helpers, semántica allow/deny decidida y documentada en ADR, auditoría de frontera independiente de OTel. *Principio:* la pieza que decide qué se permite merece la mayor densidad de tests del repo, no la menor.

**Tema 2 — Repo de dos velocidades sin gate para la segunda.** El código V1 convive en el árbol con el MVP cerrado, pero sin CI que lo ejecute y con un README que lo niega. *Target:* `ci.sh` ejecuta también los tests de `orchestrator-langgraph`; README con sección explícita "V1 (experimental)". *Principio:* todo código en `main` se gatea o se marca explícitamente como experimental — nunca lo uno sin lo otro implícitamente.

**Tema 3 — Deuda de reproducibilidad e higiene.** Sin lockfile Python, sin linters, sin CI remota, sin LICENSE, ficheros sueltos. *Target:* lockfiles, ruff + eslint en `ci.sh`, LICENSE elegida, árbol limpio. *Principio:* un clon fresco en otra máquina debe producir el mismo resultado del gate.

**Tema 4 — Deriva por copy-paste en la orquestación Python.** Helpers de error duplicados con comprobaciones divergentes. *Target:* un módulo compartido y un contrato documentado de la forma de error del Gateway. *Principio:* el manejo de errores se escribe una vez.

**Qué NO arreglar ahora:** migrar `psql` → driver `pg` *solo* si la ruta Postgres va a producción (mientras sea scaffold V1, basta con un test de integración real opt-in); no montar CD/despliegue (es local-first por diseño); no reescribir el CLI en Python puro (la delegación es una fortaleza); no tocar la interpolación de `attachCommand` (segura por construcción); no introducir tooling de monorepo.

**Definición de "done":** `ci.sh` ejecuta las 7 suites incluyendo orchestrator-langgraph y falla en errores de lint · existe `policy_engine.test.js` cubriendo los 4 helpers y el caso default-allow · un solo `_tool_errors.py` importado por los 5 consumidores · lockfiles committeados · LICENSE presente · structure-test que verifica paridad README↔`config.js` · cero hallazgos Critical.

---

## Task Plan

### Quick wins (hacer ya — todos S, alto impacto)

| # | Tarea | Ficheros |
|---|---|---|
| QW1 | Añadir tests de orchestrator-langgraph a `ci.sh` | `scripts/ci.sh` |
| QW2 | Loguear warning en el fallback del secreto | `gateway/src/config.js:55-57` |
| QW3 | Limpiar árbol: decidir destino de los v4 `.md`, trackear `pending-implementation-items.md`, borrar `.git/` vacíos | raíz, `docs/` |
| QW4 | Elegir y añadir LICENSE (decisión humana, ejecución trivial) | `LICENSE` |

### Milestone 0 — Red de seguridad

| Tarea | Esfuerzo | Riesgo | Dep. |
|---|---|---|---|
| **M0.1** Tests unitarios directos de `policy_engine.js`: los 4 helpers, default-allow del pipeline, orden de capas | M | Nulo (solo tests) | — |
| **M0.2** QW1 (gate completo) + lint mínimo: ruff (Python) y eslint flat-config (gateway) cableados a `ci.sh` | M | Bajo (churn de formato inicial) | — |
| **M0.3** GitHub Actions mínimo que ejecute `scripts/ci.sh` (o ADR que formalice "CI local-only") | S | Nulo | M0.2 |

*Aceptación:* `ci.sh` falla si se rompe un test de orchestrator-langgraph o se introduce un error de lint; `policy_engine.test.js` existe con ≥15 casos incluyendo paths con `..`, ramas `release/*`, y acción desconocida.

### Milestone 1 — Correctitud y crítico

| Tarea | Esfuerzo | Riesgo | Dep. |
|---|---|---|---|
| **M1.1** LICENSE (QW4) | S | Nulo | decisión humana |
| **M1.2** Unificar `_raise_on_tool_error`/`_require` en `orchestrator_langgraph/_contracts.py`; documentar la forma real de error del Gateway y alinear los campos | M | Medio (cambia detección de errores en 5 flujos) | M0.1-2 |
| **M1.3** ADR sobre semántica de roles: si se mantiene deny-list, documentarlo y añadir test que lo fije; si se quiere allowlist, aplicar `allowActions` en `evaluateRole` | L | Alto si se cambia a allowlist (puede denegar flujos existentes) | M0.1 |
| **M1.4** Desacoplar `MCP_TOOL_CALL` de `telemetry.enabled` (o documentar el porqué + test) | S | Bajo | — |

### Milestone 2 — Alto apalancamiento

| Tarea | Esfuerzo | Riesgo | Dep. |
|---|---|---|---|
| **M2.1** Pinear deps Python + lockfile (uv) + declarar extra `redis` | S | Bajo | — |
| **M2.2** Reconciliación docs↔código: tabla de env desde `config.js`, sección "V1 experimental" en README, referenciar docker-compose; structure-test de paridad | M | Nulo | — |
| **M2.3** Test de integración Postgres real opt-in (`AGENTS_PG_INTEGRATION=1` contra docker-compose); decidir migración a driver `pg` según destino de V1 | L | Bajo (opt-in) | M2.1, decisión humana |

### Milestone 3 — Calidad y pulido

| Tarea | Esfuerzo |
|---|---|
| **M3.1** Tests de `telemetry.js`, `trace_access.js` y caminos de error de `mcp_server.js` | M |
| **M3.2** Tests de composición/precedencia del sanitizador | S |
| **M3.3** Relajar timings de `approval_wait.test.js` | S |
| **M3.4** Cortar release v0.1.0 en CHANGELOG marcando el cierre de MVP2.0 y podar ramas mergeadas | S |

### Sketches de implementación (top 3)

**M0.1 — `policy_engine.test.js`:** importar `evaluate`/`explain` y testear los helpers vía `explain()`, que ya expone el trace por capa — preferible a exportar helpers, no toca producción. Casos clave: `pathMatchesExcludedPath("a/secrets/b", "secrets")` → true (semántica de segmento-en-cualquier-posición, fijarla con test); `normalizePolicyPath("../../etc")` (el `pop()` sobre array vacío no lanza — verificar resultado); acción inventada `"foo.bar"` con agente/rol válidos → documenta el default-allow actual. *Gotcha:* usar registries de fixture temporal como hace `policy_model.test.js:147-192`, no los de `policies/` reales, para no acoplar tests a datos vivos.

**M1.2 — módulo compartido de errores:** crear `_contracts.py` con `raise_on_tool_error(result, tool)` que compruebe la unión de todos los campos actuales (`error`, `code`, `tool_error`, `isError`) y `require_state(state, key)`. Antes, confirmar empíricamente qué emite el Gateway: `gateway/src/tools/tool_helpers.js` y `mcp_server.js:29-39` (que parsea `parsed?.error || parsed?.code`) son la fuente de verdad. Sustituir las 4+5 copias por imports; los tests existentes de cada grafo deben pasar sin cambios. *Gotcha:* `hybrid_smoke.py:8` importa el helper desde `delegate_review` — actualizar ese import o dejar un re-export.

**M1.3 — ADR de semántica de roles:** escribir primero un test de caracterización que capture qué permite hoy cada rol (matriz rol×acción generada desde `roles.json`). Con esa foto, decidir: deny-list documentada (cambio cero, ADR + test que congela el default-allow) o allowlist (modificar `evaluateRole` para denegar acciones fuera de `allowActions`, con migración: ejecutar la matriz antes/después y revisar cada diferencia a mano). *Gotcha:* las acciones con sufijo (`artifact.get.sanitized`) usan matching por prefijo en `actionMatchesDeny` (:16) — la allowlist necesitará la misma semántica de prefijos o romperá `artifact.get`.

---

## Open Questions

1. **Licencia:** ¿qué licencia se quiere? (MIT/Apache-2.0 si habrá difusión; mantener propietario si no). Es el único Critical y solo el owner puede decidirlo.
2. **Destino de PROJECT_V1:** ¿Postgres/Redis/Temporal van a producción o son exploración? Decide si M2.3 es "test opt-in" (barato) o "migrar a driver real" (L).
3. **Semántica de políticas:** ¿la intención de `allowActions` en `roles.json` era allowlist enforced? La respuesta convierte M1.3 en documentación o en cambio de motor.
4. **CI remota:** ¿GitHub Actions, o el modelo "gate local + reviewer agent" es deliberado y permanente? Si es lo segundo, conviene fijarlo en un ADR.
5. **Ficheros v4 en la raíz:** ¿`plan_proyecto_v4.md` y `tareas_implementacion_v4.md` son la spec viva (→ commitear, quizá bajo `plan/`) u obsoletos frente a `plan/PROJECT_V2/` (→ borrar)?

---

**Cobertura de la revisión:** profundidad máxima en `gateway/src/core` y `tools/services` (el 20% crítico), con verificación directa de policy engine, config, postgres, sanitizer y mcp_server; los adaptadores tmux, los grafos LangGraph en detalle fino y los 435 ficheros de `plan/` recibieron revisión más ligera vía agentes de exploración.

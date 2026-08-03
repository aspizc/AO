# Auditoría independiente de testing y confianza de release — PROJECT_V5

Model: gpt-5.6-sol  
Reasoning: ultra  
Execution profile: fast/priority  
Snapshot: d521afb12a6520b95f1a9fb172911b16ab77a1ff  
Independence: revisión independiente del snapshot, basada únicamente en código, tests, manifiestos, CI y documentación operativa; no se consultaron auditorías, revisiones ni artefactos previos excluidos.

## Resumen ejecutivo

1. **Calificación global de confianza de release: D.**
2. **¿Es seguro publicar este snapshot? No: primero debe restaurarse un gate CI ejecutable sobre el runtime declarado y convertir la semántica Redis 7 de V5 en evidencia obligatoria, no en skips verdes.**
3. El bloqueador inmediato es una incompatibilidad estática de CI: Actions instala Node 20, mientras `npm test` usa una opción de aislamiento introducida en Node 22.8 y globs del test runner disponibles desde Node 22.6.
4. Aunque la base de tests es amplia —154 archivos y aserciones de servicio, política y workflow generalmente precisas— el gate publicado no puede demostrarla en su runtime configurado.
5. El núcleo distribuido de V5 tiene buenos tests live escritos, pero sus seis casos Redis/Lua se omiten por defecto y los dobles herméticos verifican sobre todo texto Lua y respuestas prefabricadas.
6. El único flujo real Codex + Claude + tmux también es opt-in, mientras los 24 E2E ordinarios usan MCP real con adaptadores dry-run.
7. Las fortalezas principales son la inyección de reloj/aleatoriedad/cola en V5, la cobertura adversarial de autorización y aislamiento, y las aserciones exactas sobre aprobaciones, auditoría y orden de workflows.
8. Los tres riesgos prioritarios son un CI que falla antes de ejecutar Gateway, regresiones atómicas de Redis que sobrevivan al gate y roturas de integración con CLIs reales que sólo aparezcan fuera de la suite ordinaria.
9. Las tres oportunidades prioritarias son alinear runtime y runner, añadir un job Redis 7 desechable sin skips y adoptar contratos concurrentes más oráculos independientes con mutation testing focalizado.
10. En comprobaciones herméticas se observaron 893 pases y 19 skips esperados, pero sobre Node 22 y dependencias locales redirigidas en modo sólo lectura, por lo que ese resultado es diagnóstico y no sustituye una ejecución nativa de CI.

## Alcance, método y límites

Se revisaron las superficies de testing de Gateway, CLI, LangGraph/Temporal, E2E, estructura, scripts y GitHub Actions. El análisis cubrió profundidad de cobertura, caminos críticos, calidad de aserciones, pirámide, determinismo, testabilidad, gates y una lente adversarial de mutación.

Restricciones respetadas:

- El snapshot auditado permaneció en `d521afb12a6520b95f1a9fb172911b16ab77a1ff` y limpio.
- No se inició, detuvo ni contactó ningún MCP, Redis, Postgres o Temporal compartido.
- No se ejecutaron Codex, Claude ni sesiones tmux reales.
- No se usó red ni se instalaron dependencias.
- No se ejecutó `scripts/ci.sh` completo: además del defecto Node 20, eso habría implicado instalaciones o superficies externas no autorizadas.
- Los checks Gateway/E2E se ejecutaron con Node 22.22.1 y un loader de sólo lectura que resolvió dependencias ya instaladas fuera del worktree; lint, smoke MCP y `agent-run policy validate` no forman parte del conteo observado.
- La protección de ramas y la obligatoriedad real del check de GitHub no son visibles en el repositorio; se mantienen como preguntas abiertas.

## Fase 1 — Mapa del sistema de tests

### Inventario

| Superficie | Archivos | Casos descubiertos/observados | Ejecución ordinaria | Papel |
|---|---:|---:|---|---|
| Gateway Node (`gateway/tests`, `tests/gateway`) | 96 | 651 bajo Node 22; auditoría: 635 pass, 15 skip y 1 caso tmux no ejecutado | `npm --prefix gateway test` | Unitarios, servicios, políticas, repositorios, contratos Redis/Lua, herramientas MCP |
| E2E Node (`tests/e2e`) | 4 | 25; auditoría: 24 pass, 1 skip real | `node --test tests/e2e/**/*.test.js` | MCP stdio y flujos adversariales dry-run; un flujo real opt-in |
| CLI Python (`tests/cli`) | 7 | 29 pass | `pytest tests/cli` | CLI, validación y comportamiento del operador |
| Estructura Python (`tests/structure`) | 32 | 124 pass | `pytest tests/structure` | Manifiestos, docs, registries y cableado |
| LangGraph/Temporal (`orchestrator-langgraph/tests`) | 15 | 84; auditoría: 81 pass, 3 skip | `pytest orchestrator-langgraph/tests` | Cliente Gateway, grafos, workflows y harness Temporal |
| **Total** | **154** | **913 potenciales; 893 pass + 19 skip + 1 no ejecutado en auditoría** | Gate secuencial único | Base amplia, con seams live fuera del camino verde |

Los conteos dinámicos superan las 830 declaraciones estáticas encontradas porque contratos y tablas instalan múltiples casos en runtime.

### Frameworks, fixtures y dependencias

| Área | Framework/runner | Fixtures y dobles principales | Dependencia real |
|---|---|---|---|
| Gateway/E2E | `node:test`, `node:assert/strict` | `createHarness`, queue en memoria, cliente Redis scripted, fake Postgres executor, workspaces/SQLite temporales, MCP child por stdio | Node, `better-sqlite3`; opcionalmente Redis 7, `psql`, tmux, Codex y Claude |
| CLI/structure | pytest | `tmp_path`, monkeypatch, lectura de manifiestos/docs, invocaciones CLI aisladas | Python y ejecutable `agent-run` |
| LangGraph/Temporal | pytest + asyncio | Gateway fixture/fake session, activities inyectadas, reloj Temporal time-skipping | MCP child dry-run opt-in; Temporal test environment opt-in |
| Live Redis | `node:test` | prefijo UUID por test, dos servicios independientes, inspección raw y cleanup exacto | Redis 7 standalone desechable |

El patrón de testabilidad es desigual: V5 expone dependencias útiles para inyección, mientras state/audit heredados dependen de singletons de módulo. Las fixtures live están bien aisladas, pero no forman parte del gate normal.

### Cobertura de caminos críticos

| Camino | Evidencia existente | Confianza |
|---|---|---|
| Policy, roles, sanitización, approval y audit | Matrices contra registries/call sites, casos adversariales y efectos exactos | Alta en proceso hermético |
| Tools MCP y E2E de bypass | MCP stdio real, workspaces temporales, adaptadores dry-run | Media-alta para Gateway; no prueba CLIs reales |
| V5 register/discover/heartbeat/send/receive/ack | Servicios con dobles detallados y E2E en memoria | Alta para validación/API |
| Lua/Redis Streams, leases, PEL, dedupe y capacity | Buenos tests live escritos pero omitidos por defecto | Baja como señal de release |
| SQLite/repositorios | Contratos ejecutados ordinariamente | Alta |
| Postgres | Fake executor requerido y 9 casos live opt-in | Media para SQL shape; baja para backend real, aceptable mientras sea experimental |
| LangGraph implement/review/approval/push | Secuencias, retries y no-push bien afirmados | Alta en unit/component |
| Temporal recovery | Harness de restart fuerte pero opt-in | Baja como señal ordinaria |
| Codex/Claude/tmux | Unitarios de construcción/fakes y un E2E real opt-in | Baja para compatibilidad externa |

### Pirámide efectiva

| Capa | Estado | Lectura |
|---|---|---|
| Unit/component | Ancha | Servicios, políticas, adaptadores, validadores y parsers tienen cobertura detallada |
| Contract/structure | Muy ancha | Hay 124 tests estructurales; varios prueban texto o existencia, no comportamiento |
| Integración hermética | Moderada | SQLite, MCP stdio dry-run, fake Postgres y dobles de Redis cubren cableado |
| Integración live | Estrecha y opt-in | 6 Redis, 9 Postgres y 3 seams Python/Temporal quedan omitidos por defecto |
| E2E real | Puntual | Un único flujo Codex + Claude + tmux, omitido salvo opt-in |
| Concurrencia/carga | Ausente | No se encontraron carreras simultáneas, soak ni presupuestos de latencia/conexiones |

### Topología de CI

El workflow tiene un único job `Local CI gate` en `ubuntu-latest`, para push y PR contra `develop`/`main` (`.github/workflows/ci.yml:1-19`). Configura Node 20 y Python 3.11 (`.github/workflows/ci.yml:25-36`), instala Python por resolución editable y Node con `npm ci` (`.github/workflows/ci.yml:38-43`), y delega toda la validación a `scripts/ci.sh` (`.github/workflows/ci.yml:45-48`).

El script usa `set -euo pipefail` y ejecuta, en serie, ruff/eslint, estructura, Gateway, E2E, smoke MCP, validación de política, CLI y LangGraph (`scripts/ci.sh:1-42`). No hay jobs de servicios, matriz de versiones, presupuesto de skips, cobertura, mutation testing, timeout explícito ni publicación de resultados.

### Inventario de skips por defecto

| Seam | Casos omitidos | Gate | Evidencia |
|---|---:|---|---|
| Redis 7 V5 | 6 | `AGENTS_TEST_REDIS_URL` | `tests/gateway/coordination_queue_*_live.test.js`; `tests/gateway/coordination_two_instance_live.test.js:181-184` |
| Postgres live | 9 | `AGENTS_PG_INTEGRATION=1` | `tests/gateway/postgres_state.test.js:33-49,147-174`; confirmado fuera de CI en `docs/v1-postgres-repository-tests.md:7-16` |
| E2E Codex + Claude + tmux | 1 | `AGENTS_E2E_REAL=1` y binarios disponibles | `tests/e2e/mcp_two_agent_real.test.js:13-24,60-64` |
| Gateway real desde Python | 2 | `AGENTS_INTEGRATION=1` | `orchestrator-langgraph/tests/test_gateway_client.py:120-145`; `orchestrator-langgraph/tests/test_plan_refine_graph.py:111-147` |
| Temporal recovery | 1 | `AGENTS_TEMPORAL_INTEGRATION=1` | `orchestrator-langgraph/tests/test_temporal_crash_recovery.py:34-40` |
| tmux local | 1 condicional | presencia/capacidad de tmux | `tests/gateway/tmux_client.test.js:48-60` |

Los 9 tests Postgres y el seam Temporal corresponden a capacidades declaradas experimentales (`README.md:182-193`); su separación es razonable mientras no se presenten como gate de producción. Redis V5 y el flujo real MVP2 sí aparecen dentro del alcance entregado (`README.md:154-172`).

## Fase 2 — Auditoría basada en evidencia

### Hallazgos Blocker

#### TST-B01 — El gate Gateway no es ejecutable sobre el Node configurado

- **Dimensión:** CI/CD, compatibilidad de runtime, release confidence.
- **Hecho:** GitHub Actions instala `node-version: "20"` (`.github/workflows/ci.yml:25-30`), pero el script de test usa `--experimental-test-isolation=process` y dos globs literales (`gateway/package.json:9-16`).
- **Hecho corroborativo:** la documentación API instalada con el runtime auditor registra `--experimental-test-isolation=mode` como añadido en Node 22.8 y `globPatterns` en Node 22.6; el shell usado por npm deja `tests/**/*.test.js` y `../tests/gateway/**/*.test.js` sin expandir porque no hay el nivel intermedio que el glob del shell exige.
- **Límite de evidencia:** no había un binario Node 20 local y no se usó red, por lo que no se reprodujo el fallo dinámicamente bajo Node 20.
- **Juicio:** es una incompatibilidad de alta confianza y un bloqueador, no una mera falta de cobertura; el job llegará a `npm test` y el runner rechazará la opción antes de demostrar la suite.
- **Riesgo:** el check requerido estará rojo o, si alguien evita el script manualmente, no será equivalente al contrato publicado.
- **Mutación/configuración que sobrevive:** cambiar la implementación de cualquier ruta Gateway no importa porque el gate no alcanza sus tests.
- **Remediación:** decidir explícitamente el mínimo soportado y hacer atómicos `engines`, Actions y el comando. Si se conserva Node 20, usar un manifest/runner que enumere archivos reales y opciones disponibles en ese mínimo; si se eleva el mínimo, actualizar contrato, CI y documentación en el mismo cambio.
- **Done:** `npm ci && npm test` descubre y ejecuta todos los archivos en un contenedor limpio del mínimo soportado y en el runtime primario; un test de CI valida sentinelas por suite y falla si descubre cero archivos.

### Hallazgos High

#### TST-H01 — La semántica atómica Redis/Lua de V5 no bloquea merges

- **Dimensión:** cobertura de camino crítico, integración, fuerza de aserción.
- **Hecho:** los seis casos live se saltan cuando falta `AGENTS_TEST_REDIS_URL`; por ejemplo send lo declara en `tests/gateway/coordination_queue_send_live.test.js:67-70` y two-instance en `tests/gateway/coordination_two_instance_live.test.js:181-184`.
- **Hecho:** CI no levanta Redis ni define ese gate (`.github/workflows/ci.yml:16-48`).
- **Hecho positivo:** los tests live son sustantivos: send valida `XLEN`, dedupe persistido, TTL, retry y conflicto contra Redis (`tests/gateway/coordination_queue_send_live.test.js:105-172`), y el runbook prescribe prefijos UUID y prohíbe `FLUSHDB` (`docs/coordination-bus.md:798-811`).
- **Hecho:** los tests herméticos inspeccionan claves/args y tokens de texto Lua (`tests/gateway/coordination_queue_send.test.js:111-148`) y mapean respuestas prefabricadas (`tests/gateway/coordination_queue_send.test.js:150-188`).
- **Juicio:** el código más sensible a diferencias reales de Redis —Lua, consumer groups, PEL, TTL, fences, `XACK`/`XDEL` y dedupe— puede romperse manteniendo verde el gate ordinario.
- **Mutación superviviente concreta:** invertir `==` por `~=` en una comparación de `same_message` conserva nombres de campos y orden textual comprobados en `tests/gateway/coordination_queue_send.test.js:255-284`; los dobles pueden seguir devolviendo `[2,...]`, y sólo Redis ejecutando Lua mata la mutación.
- **Remediación:** job requerido con Redis 7 desechable, URL exclusiva en `AGENTS_TEST_REDIS_URL`, ejecución de los seis casos live y fallo si alguno queda skipped.
- **Done:** los seis casos reportan pass, cero skip, inspeccionan sólo su prefijo y dejan cero claves; el job mata mutaciones de igualdad, fence, orden dedupe/capacidad y atomicidad ACK.

#### TST-H02 — No hay pruebas simultáneas de las carreras que define una coordinación distribuida

- **Dimensión:** concurrencia, determinismo, resiliencia.
- **Hecho:** el runner fuerza `--test-concurrency=1` (`gateway/package.json:12`) y no se encontraron `Promise.all`, barreras, pruebas “concurrent/simultaneous” ni actores realmente paralelos en los tests de coordinación.
- **Hecho:** el test two-instance cubre interleavings ricos, pero de forma secuencial; el adaptador crea y destruye un cliente RESP2 por operación (`gateway/src/core/coordination_queue.js:2140-2169`; contrato documentado en `docs/coordination-bus.md:503-508`).
- **Juicio:** la atomicidad declarada se comprueba por estados preparados y Lua, no bajo contención real de dos conexiones.
- **Riesgo:** duplicación de delivery/evento, sobrepaso de capacidad, ACK después de reclaim, o aceptación de un lease sustituido sólo aparecerían en producción.
- **Mutación superviviente concreta:** reemplazar una transición atómica por `GET` + decisión + `XADD` puede pasar todos los escenarios secuenciales y fallar con dos senders liberados por la misma barrera.
- **Remediación:** contratos live concurrentes con clientes independientes, barrera de inicio, múltiples semillas y aserciones sobre cardinalidad Redis final, no sólo resultados API.
- **Done:** al menos send/dedupe/capacity, heartbeat/unregister/re-register y ACK/reclaim se ejercitan simultáneamente 100 veces sin duplicados, pérdida ni estado residual; las pruebas tienen timeout acotado y reproducen la semilla al fallar.

#### TST-H03 — La integración real Codex/Claude/tmux no aporta evidencia al gate ordinario

- **Dimensión:** E2E, contratos externos, release confidence.
- **Hecho:** el helper E2E pone `AGENTS_DRY_RUN=1` por defecto (`tests/e2e/helpers/mcp_client.js:98-110`), coherente con la documentación de la suite ordinaria (`README.md:43-45`).
- **Hecho:** el único test real requiere `AGENTS_E2E_REAL=1` y los tres binarios (`tests/e2e/mcp_two_agent_real.test.js:13-24`), aunque ejecución headless/supervisada Codex y revisión Claude forman parte del alcance MVP2 (`README.md:166-172`).
- **Hecho positivo:** el E2E real sí fuerza `AGENTS_DRY_RUN=0` y entra por MCP stdio (`tests/e2e/mcp_two_agent_real.test.js:60-66`).
- **Juicio:** los 24 E2E verdes prueban mucho del Gateway, pero no compatibilidad de flags, prompts, streaming, captura tmux, versiones o salida real de los agentes.
- **Mutación superviviente concreta:** cambiar un flag de Codex/Claude o romper el comando enviado por tmux puede mantener verdes los fakes y fallar únicamente en el binario real.
- **Remediación:** dos niveles: ejecutables fake herméticos que registren argv/env/stdin y simulen éxito, error, hang y salida parcial en cada PR; canario real aislado, programado y previo a release, con credenciales y coste controlados.
- **Done:** los contratos fake son obligatorios y deterministas; ningún release se promueve sin un canario real reciente verde, artefacto sanitizado y cleanup demostrado.

### Hallazgos Medium

#### TST-M01 — La instalación Python del CI no usa el lock que define la reproducibilidad

- **Dimensión:** reproducibilidad, matriz de compatibilidad.
- **Hecho:** el quickstart sincroniza `requirements.lock` y luego instala editables sin resolver (`README.md:17-34`), pero Actions ejecuta `pip install -e "cli[dev]" -e orchestrator-langgraph` (`.github/workflows/ci.yml:38-43`).
- **Hecho:** los paquetes declaran Python `>=3.11` (`cli/pyproject.toml:1-17`; `orchestrator-langgraph/pyproject.toml:1-19`), CI sólo prueba 3.11 y el lock se genera para 3.13.
- **Hecho positivo:** Node sí usa `npm ci` y `package-lock.json`.
- **Juicio:** dos ejecuciones en fechas distintas pueden resolver distintas versiones Python dentro de rangos amplios, y no hay evidencia sobre más de una versión soportada.
- **Mutación/fallo latente:** una release transitoria incompatible puede romper CI sin cambio del repositorio o, inversamente, quedar sin probar la combinación realmente instalada por operadores.
- **Remediación:** job requerido desde lock compatible con el runtime objetivo, editable `--no-deps`, y canario flotante separado que avise de nuevas resoluciones sin reemplazar la señal reproducible.
- **Done:** el hash/estado del lock determina el entorno requerido; mínimo y runtime primario se prueban explícitamente; el canario flotante se identifica como tal.

#### TST-M02 — Hay oráculos derivados de la implementación y checks estructurales que pueden validar la regresión

- **Dimensión:** calidad de aserciones, mutation resistance.
- **Hecho:** el test de secret detection carga el patrón canónico desde el mismo policy file y deriva de él si cada muestra debe aceptarse o rechazarse (`tests/gateway/coordination_service_send.test.js:292-327`).
- **Hecho:** el contrato actual exige 12 caracteres tanto en policy como en el regex hardcoded del servicio (`policies/sanitization-rules.json:5-9`; `gateway/src/services/coordination_service.js:17-22,335-360`), pero el test fijo del sanitizer usa 16 (`tests/gateway/sanitizer.test.js:14-18`).
- **Hecho:** un test llamado “covers ... with real tests” sólo comprueba texto del threat model y existencia de rutas referenciadas (`tests/structure/test_v5_coordination_integration_docs.py:56-80`); el check del script CI también busca strings (`tests/structure/test_ci_script.py:11-22`).
- **Juicio:** estos tests son útiles como contratos de consistencia/documentación, pero no deben contarse como evidencia independiente del comportamiento.
- **Mutación superviviente concreta:** elevar simultáneamente `{12,}` a `{16,}` en policy y servicio mantiene consistente el oráculo derivado y deja pasar secretos de 12–15 caracteres.
- **Remediación:** tablas de aceptación propiedad del test/especificación, con límites `n-1/n/n+1`, y nombres que distingan `structure` de `behavior`.
- **Done:** las expectativas de seguridad no se calculan desde producción; la mutación 12→16 falla en sanitizer y coordinación; docs tests no se reportan como tests live.

#### TST-M03 — No existe una señal de cobertura o mutación focalizada por riesgo

- **Dimensión:** medición, suficiencia, prevención de huecos.
- **Hecho:** los manifiestos no incluyen `c8`, `pytest-cov`, Hypothesis/fast-check, Stryker/mutmut ni equivalentes; tampoco hay gate asociado en `scripts/ci.sh:7-42`.
- **Juicio:** el número alto de casos no responde qué ramas críticas de 2.176 líneas de queue Redis y 1.281 de servicio quedan sin ejecutar, ni si sus aserciones matan defectos.
- **Riesgo:** el equipo puede optimizar conteo de tests o estructura sin detectar oráculos débiles.
- **Remediación:** empezar por mutation testing selectivo en coordinación, policy, approval y workflows; usar cobertura de ramas como mapa diagnóstico y umbral de diff, no como proxy único de calidad.
- **Done:** baseline versionado, mutantes supervivientes triageados con owner y presupuesto, y umbral sobre código cambiado de caminos críticos.

#### TST-M04 — Estado global y serialización reducen la testabilidad de interacción

- **Dimensión:** aislamiento, testability, flakiness oculta.
- **Hecho:** state conserva un singleton de módulo y expone `_resetForTests` (`gateway/src/core/state.js:7-8,60-90`); audit conserva configuración global (`gateway/src/core/audit.js:9,44-63`).
- **Hecho:** la suite pretende aislamiento por proceso y concurrencia de archivos 1 (`gateway/package.json:12`).
- **Hecho positivo:** V5 está mejor diseñado: inyecta queue, clock, UUID, token y audit (`gateway/src/services/coordination_service.js:854-861`).
- **Juicio:** el aislamiento por proceso evita contaminación en tests, pero también puede ocultar problemas cuando varias instancias/configuraciones coexisten en un proceso y encarece paralelizar la suite.
- **Mutación/fallo latente:** una ruta que reutiliza accidentalmente DB/audit de otra instancia puede pasar porque cada archivo empieza en proceso limpio y llama a reset.
- **Remediación:** factorías/contexts explícitos para state y audit; conservar un pequeño test de composición global por compatibilidad.
- **Done:** dos Gateways con workspaces/configs distintos conviven en el mismo proceso sin contaminación, y la mayoría de tests deja de depender de resets.

### Hallazgos Low

#### TST-L01 — Una aserción de tiempo de pared puede ser flaky en runners cargados

- **Dimensión:** determinismo.
- **Hecho:** `approval.request` exige `elapsedMs < 100` (`tests/gateway/tool_approval.test.js:36-53`).
- **Juicio:** prueba una propiedad válida —no bloquear— mediante un límite sensible a carga ajena.
- **Remediación:** inyectar/simular la dependencia bloqueante o demostrar que la promesa resuelve antes de un sentinel controlado; dejar un presupuesto amplio sólo en smoke.
- **Done:** la prueba falla ante una espera real introducida y no ante pausas ocasionales del runner.

### Fortalezas que deben preservarse

1. **Aserciones conductuales precisas.** Send comprueba clasificación, secreto, bytes UTF-8 exactos y que la cola no se invoque al rechazar (`tests/gateway/coordination_service_send.test.js:250-290`).
2. **Cobertura adversarial de límites de confianza.** El E2E de bypass prueba lease obsoleto, cuerpos sensibles, no proyección de secretos, cross-scope/cross-inbox, estado raw malformado, aislamiento de audit y expiración de dedupe (`tests/e2e/bypass_regression.test.js:555-1018`).
3. **Política contra registries y call sites reales.** La matriz no se limita a mocks y verifica decisiones exactas (`tests/gateway/policy_role_matrix.test.js:398-423`).
4. **Workflows con efectos explícitos.** Los tests LangGraph validan orden, retries, aprobación y ausencia de push antes de permiso (`orchestrator-langgraph/tests/test_implement_test_review_push_graph.py:54-167`).
5. **Harness de recovery bien orientado.** Temporal reinicia worker y afirma una sola implementación/push y cero aprobación implícita (`orchestrator-langgraph/tests/test_temporal_crash_recovery.py:104-187`), aunque hoy sea opt-in.
6. **Live tests seguros para infraestructura desechable.** Prefijos únicos, limpieza exacta y prohibición expresa de `FLUSHDB` reducen riesgo operacional (`docs/coordination-bus.md:798-811`).
7. **Fail-fast local claro.** `set -euo pipefail` y una única entrada `scripts/ci.sh` simplifican equivalencia local/CI (`scripts/ci.sh:1-5`).

### Lente de mutación priorizada

| Mutación adversarial | ¿La mata el gate actual? | Test que falta |
|---|---|---|
| `==` → `~=` en `same_message` Lua | No con dobles; live está skipped | Redis live requerido con duplicate/conflict real |
| Separar dedupe/capacity de `XADD` en varias operaciones | No bajo ejecución secuencial | Dos conexiones liberadas por barrera |
| Eliminar segunda validación de fence antes de ACK/reclaim | Parcial; estados secuenciales, no carrera | Re-register concurrente con ACK/reclaim |
| Cambiar límite secreto 12 → 16 en policy + servicio | Puede sobrevivir | Tabla independiente 11/12/13 y property tests |
| Cambiar flag/modelo/argv de Codex o Claude | Puede sobrevivir a dry-run/fakes actuales | Fake executable contract + canario real |
| Reutilizar DB/audit global entre dos configuraciones | Puede sobrevivir por process isolation | Dos instancias en un proceso |
| No descubrir ningún archivo por incompatibilidad de glob | No hay sentinel de discovery | Manifest explícito + mínimo esperado/sentinelas |

## Fase 3 — Estrategia de testing objetivo

### Tema 1 — Restaurar una señal básica creíble

Estado objetivo:

- Un único contrato de versiones coherente entre `engines`, pyprojects, lockfiles, CI y documentación.
- Runner con lista de archivos explícita o manifest portable, sin depender de globs/opciones ausentes en el mínimo.
- Instalación requerida reproducible.
- Presupuesto de skips por job: cero en gates de producto; sólo skips nombrados en jobs experimentales.
- Un fallo de discovery, cero tests o sentinel ausente es rojo.

### Tema 2 — Hacer que la pirámide siga el riesgo de V5

Estado objetivo:

- Unitarios rápidos para validación, mapping de errores y servicios.
- Contratos Redis live requeridos para toda semántica Lua/Streams.
- Pruebas concurrentes con estado Redis final como oráculo.
- E2E MCP dry-run requerido para amplitud.
- Canario de agentes reales separado por coste y variabilidad.
- Postgres y Temporal permanecen en nightly/changed-path mientras sigan experimentales.

### Tema 3 — Fortalecer los oráculos, no sólo aumentar casos

Estado objetivo:

- Expectativas de seguridad y protocolo proceden de tablas de especificación independientes.
- Límites y particiones equivalentes se expresan explícitamente.
- Mutation testing semanal o por cambios sobre coordinación/policy/approval/workflow.
- Property tests sobre IDs/percent-encoding, envelopes, parser de respuestas Redis y secreto/UTF-8.
- Cobertura de ramas se usa para localizar huecos, con umbral de diff en código crítico.

### Tema 4 — Separar gates por propósito

| Gate | Trigger | Contenido | Presupuesto sugerido | Política |
|---|---|---|---:|---|
| `fast-required` | cada PR/push | lint, structure, unit/component, SQLite, MCP dry-run, CLI, LangGraph unit | 5–8 min | 0 skips inesperados; runtime mínimo + primario |
| `redis-v5-required` | cada PR que pueda afectar Gateway/V5; idealmente todo PR | Redis 7 desechable, seis live actuales y carreras nuevas | 3–5 min | 0 skips, timeout, cleanup por prefijo |
| `compatibility` | PR o nightly según coste | runtimes soportados, lock instalado, smoke packaging | 5–10 min | mínimo siempre requerido |
| `experimental-nightly` | programado/changed-path | Postgres real, Temporal recovery, matriz ampliada | 15 min | no bloquea core hasta promover capacidad |
| `real-agent-canary` | programado y release | Codex + Claude + tmux en repo efímero | presupuesto explícito | verde reciente requerido para release MVP2 |
| `mutation-risk` | nightly/changed-path | coordinación, policy, approval, workflows | 15–30 min | score y mutantes críticos sin justificar |

Tradeoffs:

- Los agentes reales no deben ir en cada PR: tienen coste, credenciales, variación externa y mayor latencia; sí deben producir evidencia reciente antes del release.
- Redis V5 sí puede ser required porque un Redis desechable es barato y sus tests ya están diseñados para aislamiento.
- Postgres/Temporal pueden seguir no bloqueantes mientras el producto los declare experimentales, pero un cambio en sus rutas debe activar su job.
- No se recomienda imponer cobertura global alta de golpe; primero se obtiene baseline y se fijan ramas/diffs de componentes críticos.
- Un rerun automático puede servir de diagnóstico, pero no debe convertir un primer rojo en verde sin registrar flake, owner y expiración.

### Gates de promoción

Un commit es candidato a merge cuando:

1. `fast-required` y `redis-v5-required` terminan verdes sobre el mínimo soportado.
2. Cada suite descubre sus sentinelas y respeta su presupuesto de skips.
3. No hay mutante crítico nuevo conocido sin test o excepción con caducidad.
4. Los artefactos TAP/JUnit y logs sanitizados quedan asociados al SHA.

Un release MVP2/V5 se promueve cuando, además:

1. El canario real Codex + Claude + tmux está verde sobre ese SHA o un ancestro sin cambios en las rutas relevantes.
2. Las carreras Redis pasan repetidas y el namespace queda limpio.
3. Las capacidades experimentales incluidas explícitamente en el release tienen sus jobs live verdes.
4. La configuración externa de branch protection exige los checks requeridos; esto debe verificarse fuera del repositorio.

## Fase 4 — Plan detallado

### Milestone 0 — Recuperar el gate (P0, 0–1 día)

| ID | Prioridad | Trabajo | Tests/evidencia | Done | Dependencias |
|---|---|---|---|---|---|
| T0.1 | P0 | Resolver contrato Node: conservar mínimo compatible o elevarlo; alinear `engines`, Actions y docs | Ejecución limpia en mínimo y primario | Gateway descubre 651 casos esperados o sentinelas equivalentes y sale 0 | Decisión de runtime |
| T0.2 | P0 | Sustituir globs frágiles por manifest enumerado portable | Unit del manifest + smoke en ambos runtimes | Ningún literal `**` llega al runner; cero archivos es error | T0.1 |
| T0.3 | P0 | Añadir resumen machine-readable y presupuesto de skips | Test del propio gate con skip inesperado | Required jobs fallan ante skip o suite vacía | T0.2 |
| T0.4 | P1 | Instalar Python desde lock y editables `--no-deps` | Rebuild limpio | Entorno requerido reproducible desde SHA | Ninguna |

### Milestone 1 — Cerrar el riesgo V5 (P0/P1, 2–4 días)

| ID | Prioridad | Trabajo | Tests/evidencia | Done | Dependencias |
|---|---|---|---|---|---|
| T1.1 | P0 | Crear job Redis 7 desechable requerido | Los 6 live existentes | 6 pass, 0 skip, prefijo limpio | T0.3 |
| T1.2 | P0 | Añadir carrera send/dedupe/capacity con dos clientes | 100 iteraciones/semillas registradas | 1 delivery, 1 evento, capacidad respetada | T1.1 |
| T1.3 | P0 | Añadir carreras lease replacement vs heartbeat/send y ACK vs reclaim | Estado final Redis + resultados API | Ningún lease viejo muta estado; ACK exactly-once | T1.1 |
| T1.4 | P1 | Introducir tablas independientes de secretos y límites UTF-8 | 11/12/13, quoting/case/Unicode | Mata 12→16 y divergencias policy/servicio | Ninguna |
| T1.5 | P1 | Verificar discovery por sentinelas de cada capa | Test negativo del runner | El gate falla si falta cualquier familia crítica | T0.2 |

### Milestone 2 — Contratos externos y testabilidad (P1, 1 semana)

| ID | Prioridad | Trabajo | Tests/evidencia | Done | Dependencias |
|---|---|---|---|---|---|
| T2.1 | P1 | Crear binarios fake Codex/Claude que graben argv/env/stdin y simulen outcomes | headless, supervised, partial output, error, hang | Contratos deterministas en PR, cleanup probado | T0 |
| T2.2 | P1 | Probar dos contexts state/audit en un proceso | aislamiento cruzado | Cero contaminación sin `_resetForTests` | Refactor acotado |
| T2.3 | P1 | Añadir property tests de IDs, percent-encoding, envelopes y replies Redis | semillas persistidas | Invariantes y round-trips explícitos | T1 |
| T2.4 | P1 | Establecer baseline de branch coverage y mutación focalizada | reporte por SHA | Mutantes críticos triageados; diff gate acordado | T1 |

### Milestone 3 — Confianza operativa y release (P2, 1–2 semanas)

| ID | Prioridad | Trabajo | Tests/evidencia | Done | Dependencias |
|---|---|---|---|---|---|
| T3.1 | P2 | Automatizar canario real aislado | E2E existente ampliado | Artefacto sanitizado, coste/timeout/cleanup visibles | Credenciales y runner |
| T3.2 | P2 | Programar Postgres y Temporal live | suites opt-in actuales | Nightly verde y owner de fallo | Infra desechable |
| T3.3 | P2 | Añadir carga corta para cliente por operación | conexiones, p50/p95, errores, cleanup | Presupuesto documentado y alerta de regresión | T1.1 |
| T3.4 | P2 | Publicar TAP/JUnit, política de flakes y timeouts por job | fallo sintético | Primer rojo nunca queda oculto por rerun | T0.3 |
| T3.5 | P2 | Verificar branch protection fuera del repo | captura/config export | Checks P0/P1 requeridos en `develop` y `main` | Acceso GitHub |

### Quick wins

1. Eliminar la opción Node 22-only o alinear inmediatamente el runtime; es el cambio con mayor retorno.
2. Hacer que `npm test` falle si no descubre sentinelas de `gateway/tests` y `tests/gateway`.
3. Crear `test:redis-live` y ejecutarlo en un Redis 7 desechable con presupuesto de skips cero.
4. Usar `requirements.lock` en el job requerido, manteniendo un canario flotante separado.
5. Cambiar el nombre/reporting de tests de estructura para que no se presenten como evidencia live.
6. Sustituir `<100 ms` por una comprobación determinista de no bloqueo.

### Tres diseños de test de mayor valor

#### Diseño A — Dedupe/capacidad Redis bajo contención

1. Registrar sender y recipient en un Redis 7 desechable con prefijo UUID.
2. Crear dos servicios y clientes distintos.
3. Preparar 50 sends con el mismo `messageId`, mismo contenido y capacidad 1.
4. Liberarlos con una barrera y `Promise.allSettled`.
5. Afirmar exactamente un `created`, 49 `duplicate`, un elemento en inbox, un evento público, un dedupe con TTL y ningún error de fence.
6. Repetir con mismo ID/contenido distinto: uno creado y el resto conflict, sin renovar TTL en conflicto.
7. Registrar semilla/iteración y limpiar sólo el prefijo.

Mata: separación no atómica de dedupe/XADD, orden incorrecto dedupe-capacidad y publicación duplicada.

#### Diseño B — Lease replacement contra ACK/reclaim

1. Entregar un mensaje y dejarlo pending con lease A.
2. Preparar en paralelo ACK con A, expiración/unregister, registro de replacement B y reclaim con B.
3. Coordinar dos órdenes mediante barreras controladas.
4. Afirmar que sólo el fence vigente puede mutar PEL/stream/tombstone, que no hay doble ACK y que el evento coincide con el ganador.
5. Ejecutar variantes de batch mixto para confirmar all-or-nothing.

Mata: fence comprobado demasiado pronto, ACK parcial y reclaim de una identidad sustituida.

#### Diseño C — Contrato independiente de secretos y agentes externos

Parte de secretos:

- Tabla fija de especificación con valores 11/12/13, mayúsculas/minúsculas, comillas, separadores, saltos, Unicode y bytes exactos.
- Ejecutar la misma tabla contra sanitizer, coordination send y receive sin calcular expectativas desde `sanitization-rules.json`.

Parte de agentes:

- Fake executables en `PATH` registran argv/env/stdin y emiten fragmentos, stderr, salida inválida, exit no-cero y hang.
- Probar headless y tmux supervised, selección de modelo/effort, cancelación y cleanup.
- Reusar el mismo contrato como preflight del canario real.

Mata: deriva coordinada del umbral secreto, cambios silenciosos de flags/modelo y parsers que sólo funcionan con una salida ideal.

## Preguntas abiertas

1. ¿Node 20 completo es todavía un contrato deliberado o se pretendía elevar el mínimo a una versión que soporte aislamiento/globs?
2. ¿El check `Local CI gate` está configurado como required en `develop` y `main`?
3. ¿Redis V5 “optional” significa soportado y releaseable cuando se activa, o debe etiquetarse experimental hasta tener gate live?
4. ¿Existe un sistema externo que ejecute y conserve resultados de `AGENTS_E2E_REAL`, `AGENTS_TEST_REDIS_URL`, Postgres o Temporal?
5. ¿Cuál es la frecuencia máxima aceptable para un canario real y qué presupuesto de coste/latencia tiene?
6. ¿Qué versiones de Node y Python se prometen realmente a usuarios, más allá de `>=20` y `>=3.11`?
7. ¿Qué SLO de throughput/p95/conexiones debe cumplir el cliente Redis por operación?
8. ¿Quién es owner de flakes y cuánto tiempo puede permanecer una cuarentena antes de bloquear?

## Conclusión

La suite contiene bastante más valor del que su calificación D podría sugerir: los servicios, políticas y workflows están probados con cuidado, y los autores ya escribieron buena parte de la aceptación Redis y real-agent necesaria. La D mide la señal de release del snapshot, no el esfuerzo acumulado: hoy el runtime de CI es incompatible con su runner y los seams que distinguen una coordinación distribuida real de un doble permanecen verdes por omisión. Corregir el contrato Node y promover Redis live a gate requerido elevaría la confianza de forma inmediata; concurrencia, oráculos independientes y canarios reales pueden llevarla después a un nivel B/A sin reescribir la base existente.

# Auditoría de testing y confianza de release

## Dictamen

| Dimensión | Nota | Lectura |
|---|---:|---|
| Suite determinista local | **B** | Amplia, rápida y con buenas aserciones en policy, servicios, repositorios y coordinación. |
| Contratos entre componentes | **D** | El workflow LangGraph insignia se prueba con un resultado que el Gateway real no produce. |
| Integración persistente y concurrencia | **D** | El E2E reinicia el Gateway por llamada y Redis se prueba de forma secuencial. |
| Lanes live | **D** | Redis, Postgres, Temporal y agentes reales quedan fuera del gate normal. |
| Reproducibilidad del candidato | **D** | Hay CI en el árbol integrado, pero runtime, lock, skips y SHA no forman aún una identidad verificable. |
| Confianza para release real-agent | **F** | Un verde actual no demuestra los seams que pueden autorizar avance, perder estado o filtrar output. |

**Nota global: D.** El proyecto no carece de tests: en el corte auditado pasaron
823 y, tras la integración local, pasaron 894. El problema es semántico. El
volumen verde está concentrado en unidades y procesos efímeros; no prueba que el
contrato real Gateway→workflow, un reviewer KO, una conexión MCP duradera, una
carrera Redis o la recuperación Temporal se comporten como exige un release.

## Corte, corrección posterior y límites

Esta auditoría conserva dos estados deliberadamente separados:

| Momento | Ref | Qué se verificó |
|---|---|---|
| Corte principal | `41d194a9cb5276cd0e90541b23ff47a41b3ad123` | Árbol que estaba expuesto como `main`; ejecución completa de suites, cobertura diagnóstica y reproducciones de contratos. |
| Integración comparada | `develop@d521afb12a6520b95f1a9fb172911b16ab77a1ff` | CI, lock, lint, tests V3 y diferencias de promoción que no estaban en el corte. |
| Corrección posterior | `main=develop@b532c63823979d20e566aaeaed0be96b29fb4c45` | Refs alineadas localmente y suites de componentes reejecutadas desde ese árbol. |

La alineación posterior corrige la divergencia inmediata de ramas, no reescribe
el diagnóstico del corte ni cierra por sí sola los hallazgos de contrato y lanes.
No existe remote configurado ni tag `v0.1.0`; por tanto no se pudo observar un
check requerido, branch protection, publicación ni artefacto remoto.

La revalidación posterior se hizo con Node `v22.22.1` y Python `3.14.4`, reutilizando
el entorno Python ya instalado pero forzando `PYTHONPATH` al árbol integrado. Las
suites de componentes pasaron; el wrapper completo paró antes de ejecutarlas
porque ese entorno no contenía `ruff`. Esto no equivale a una ejecución limpia
desde locks y queda registrado como limitación, no como fallo funcional.

## Mapa de suites y señal obtenida

### Resultado en el corte

| Superficie | Resultado | Skips | Duración observada | Señal principal |
|---|---:|---:|---:|---|
| Gateway Node | 585 pass | 10 | 17,69 s | Core, services, tools, adapters simulados, repositorios y coordinación. |
| E2E Node | 24 pass | 1 | 5,65 s | Flujos dry-run por stdio; agente real opt-in. |
| Structure Python | 115 pass | 0 | <1 s | Forma del repo, documentación, manifests y contratos textuales. |
| CLI Python | 29 pass | 0 | ~3 s | Render y comandos de operador. |
| LangGraph/Temporal Python | 70 pass | 3 | <1 s | Grafos, workflow/activity unitarios y fixtures; seams reales opt-in. |
| **Total** | **823 pass** | **14** | — | Baseline reproducible del corte, no manifest de release. |

### Resultado posterior sobre `b532c63`

| Superficie | Resultado | Skips | Cambio frente al corte |
|---|---:|---:|---:|
| Gateway Node | 636 pass | 15 | +51 pass, +5 skip |
| E2E Node | 24 pass | 1 | Sin cambio |
| Structure Python | 124 pass | 0 | +9 pass |
| CLI Python | 29 pass | 0 | Sin cambio |
| LangGraph/Temporal Python | 81 pass | 3 | +11 pass |
| **Total** | **894 pass** | **19** | **+71 pass, +5 skip** |

La subida es coherente con la integración de V3: lint/CI, policy
characterization, errores Gateway, reproducibilidad y contratos Python. Los cinco
skips nuevos son casos live Postgres añadidos al contrato existente. Un aumento
de tests no afecta QA-01/02/03 porque esas rutas siguen usando los mismos
oráculos y el mismo helper E2E.

### Pirámide real

```text
                   agentes reales       1 test opt-in
               Temporal / stack real    opt-in o ausente
             Redis/Postgres reales      15 skips post-integración
             MCP persistente real       0 tests
          E2E stdio proceso-por-call     25 tests
       contratos/unit/structure          mayoría de 894 pass
```

La base es sana, pero la parte superior que decide confianza operativa está
vacía o no es obligatoria.

## Hallazgos priorizados

### QA-01 — La fixture LangGraph inventa un resultado que el Gateway no emite

**Severidad: High para V1 / Medium para el producto global. Confianza: alta.**

El Gateway devuelve el envelope de ejecución:
`sessionId`, `stdout`, `stderr`, `exitCode`, `dryRun` y, según adapter, modelo.
Se ve en `gateway/src/adapters/codex_adapter.js:234-243`,
`gateway/src/adapters/claude_adapter.js:172-179`,
`gateway/src/adapters/gemini_adapter.js:114-119` y en la composición del servicio
`gateway/src/services/agent_service.js:131-137`.

La fixture feliz añade dos campos inexistentes:
`status: "passed"` y `passed: true`
(`orchestrator-langgraph/tests/fixtures/implement_test_review_push_responses.json:31-37`);
la fixture de retry repite el patrón en las líneas 95–114. El router, en cambio,
ignora `exitCode` y sólo acepta esos campos sintéticos
(`orchestrator-langgraph/src/orchestrator_langgraph/graphs/implement_test_review_push.py:271-279`
en el corte; líneas 266–274 en el árbol integrado).

Reproducción read-only: al retirar únicamente `passed/status` de la fixture y
mantener `exitCode: 0`, `max_attempts: 1` terminó en:

```text
status=failed_tests
test_result={sessionId:ss-test, stdout:"tests passed", exitCode:0, dryRun:true}
```

El smoke marcado como Gateway real sólo invoca `orchestration.create`
(`orchestrator-langgraph/tests/test_gateway_client.py:120-145`); no ejecuta el
grafo ITRP con respuestas reales. Temporal sí contempla `exitCode`
(`orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:469-476`), lo
que demuestra que las dos implementaciones ya divergen.

**Impacto.** Un test real exitoso se interpreta como fallo en LangGraph. Peor,
un productor que inyecte `passed/status` controla el branch sin que `exitCode`
sea autoritativo.

**Cierre verificable.**

- Un único parser tipado considera `exitCode == 0` success y cualquier non-zero
  dominante.
- Campos desconocidos o resultados ambiguos fallan cerrado.
- El mismo corpus de envelopes Gateway corre contra LangGraph legacy, Temporal
  V2 y un Gateway stdio real.
- Las fixtures no contienen campos que el schema real no permita.

### QA-02 — Un reviewer KO/non-zero puede llegar a approval y push-intent

**Severidad: High para V1 / Medium global mientras ITRP sea experimental.
Confianza: alta.**

`review_node` transforma toda respuesta en `status: "reviewed"` sin interpretar
el exit code ni el veredicto
(`orchestrator-langgraph/src/orchestrator_langgraph/graphs/implement_test_review_push.py:192-217`).
La arista `review → approval` es incondicional en las líneas 318–344. Temporal
también registra “reviewed” y solicita approval sin un gate de verdict
(`orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:235-287`).

Reproducción read-only con reviewer:

```json
{"stdout":"Verdict: KO\nBlocking finding","exitCode":1}
```

y approval concedida: el grafo terminó `push_ready` y creó `push_intent`.
Los tests Temporal sólo usan review OK; no existe caso KO equivalente.

Hoy el “push” es un intent dry-run, por lo que no se afirma un push remoto
real. Aun así, el estado y la evidencia que alimentarán una futura acción
irreversible ya son incorrectos.

**Cierre verificable.**

- Review devuelve schema cerrado `OK|KO` ligado al digest del change-set.
- Error de transporte, parse inválido, KO o non-zero nunca crean approval ni
  push-intent.
- Un test negativo observa ausencia de llamada a `approval.request`, no sólo un
  estado final.
- El gate exige reviewer independiente y dispone todos los findings.

### QA-03 — El E2E “MCP” crea un Gateway nuevo por cada llamada

**Severidad: High. Confianza: alta.**

`runMcpRequest` crea archivos temporales, construye initialize+una llamada y
lanza `node gateway/src/mcp_server.js` en cada request
(`tests/e2e/helpers/mcp_client.js:25-95`). `request` y `callTool` vuelven a
invocarlo para cada operación (`tests/e2e/helpers/mcp_client.js:112-119`). Tanto
el flujo dry-run como el real importan este helper; por ejemplo
`tests/e2e/mcp_two_agent_real.test.js:8,60-66`.

El estado parece persistir porque todos los procesos comparten el SQLite del
workspace. No se prueba:

- una sola conexión stdio mantenida durante el workflow;
- dos llamadas superpuestas en el mismo event loop;
- cancelación/timeout mientras otra llamada sigue viva;
- lifecycle de listeners, waits y recursos;
- single-writer, shutdown y ausencia de Gateways huérfanos.

Esto oculta precisamente los fallos que una suite E2E debería encontrar.

**Cierre verificable.** El helper debe poseer un proceso duradero, correlacionar
IDs JSON-RPC, permitir varias requests in-flight y cerrar stdin/esperar exit. Un
test debe completar el flujo entero con el mismo PID y otro solapar una llamada
lenta con una rápida.

### QA-04 — Los seams live están explícitamente fuera del gate

**Severidad: High. Confianza: alta.**

En el corte, los diez skips Gateway eran seis pruebas Redis y cuatro contratos
Postgres. Tras V3, los 15 skips Gateway son seis Redis y nueve Postgres:

- Redis se omite sin `AGENTS_TEST_REDIS_URL`, por ejemplo
  `tests/gateway/coordination_queue_send_live.test.js:69`,
  `coordination_queue_presence_live.test.js:54`,
  `coordination_queue_receive_live.test.js:103`,
  `coordination_queue_ack_live.test.js:88,493` y
  `coordination_two_instance_live.test.js:183`.
- Postgres envuelve todos los contratos live con `skipReason`
  (`tests/gateway/postgres_state.test.js` en el árbol integrado, líneas
  147–174) y borra tablas del destino en 157–167; el runbook exige una DB
  desechable (`docs/v1-postgres-repository-tests.md:16-27`).
- El agente real se omite salvo `AGENTS_E2E_REAL=1`
  (`tests/e2e/mcp_two_agent_real.test.js:13-24,60`).
- Dos tests Gateway↔Python requieren `AGENTS_INTEGRATION=1`
  (`orchestrator-langgraph/tests/test_gateway_client.py:120-145` y el smoke de
  plan-refine).
- Recovery Temporal completo requiere `AGENTS_TEMPORAL_INTEGRATION=1`
  (`orchestrator-langgraph/tests/test_temporal_crash_recovery.py:1-40`).

El CI normal no compara un presupuesto exacto de skips. Un nuevo skip conserva
verde el job. Los 19 skips posteriores muestran que integrar más pruebas live
sin lane ni presupuesto aumenta inventario, no evidencia.

### QA-05 — La concurrencia V5 se serializa dos veces

**Severidad: High para coordinación; Medium global. Confianza: alta.**

El runner fuerza `--test-concurrency=1`
(`gateway/package.json:10` en el corte; línea 12 integrada). La prueba “two
instance” usa dos servicios, pero intercala operaciones secuenciales; no existe
una barrera que las haga competir
(`tests/gateway/coordination_two_instance_live.test.js:181-200`).

No hay carreras simultáneas para:

- dos sends con la misma dedupe key;
- capacidad de inbox en el límite;
- heartbeat contra unregister/re-register;
- dos receivers reclamando pending;
- ACK contra reclaim/expiry.

Los scripts Lua y Redis pueden ser atómicos individualmente y aun romper una
invariante compuesta. El lane requerido debe ejecutar iteraciones sembradas,
registrar seed y fallar ante leak de prefijo o skip.

### QA-06 — CI y locks no reproducen la combinación que declaran

**Severidad: High para release. Confianza: alta.**

Este hallazgo no existía en `main` del corte porque allí ni siquiera estaban
workflow ni lock; aparece al evaluar el árbol que se pretendía promover:

- Actions instala Node 20 (`.github/workflows/ci.yml:25-30`), pero el test runner
  usa `--experimental-test-isolation=process` y
  `--test-concurrency=1` (`gateway/package.json:12` integrado), combinación
  señalada ya por la auditoría V5 como incompatible con el Node 20 del job. Se
  revalidó con `node@20.20.2`: el proceso termina con exit 9 y
  `node: bad option: --experimental-test-isolation=process` antes de descubrir
  tests.
- Actions instala Python 3.11 y hace `pip install -e ...`
  (`.github/workflows/ci.yml:32-43`), no `uv pip sync requirements.lock`.
- El lock declara que se compiló para Python 3.13
  (`requirements.lock:1-2`), distinto del runtime remoto.
- `scripts/ci.sh` instala con `npm install` si falta `node_modules`
  (`scripts/ci.sh:19-25` integrado), mientras Actions usa `npm ci`.
- El script bare del corte fallaba con exit 2 si `pytest` no estaba en `PATH`
  (`scripts/ci.sh:7-13`); el post-integrado añade una dependencia aún anterior:
  `ruff` (`scripts/ci.sh:7-9`).

**Impacto.** “Pasa local”, “pasa Actions” y “reproducible desde locks” son tres
afirmaciones distintas. Ninguna está ligada al mismo candidate SHA/runtime.

**Cierre verificable.** Matriz Node/Python soportada, instalación exclusivamente
desde locks, cero resolución de dependencias durante el gate, manifest con
versiones exactas y prueba deliberada del runtime mínimo.

### QA-07 — Cobertura alta agregada, pero sin gate de producción ni mutación

**Severidad: Medium. Confianza: alta.**

La cobertura diagnóstica de Node fue 90,57 % líneas, 90,22 % ramas y 94,14 %
funciones, pero el reporte incorporaba tests y no era un gate. Hotspots de
producción:

| Archivo | Líneas | Ramas |
|---|---:|---:|
| `gateway/src/core/state.js` | 56,38 % | 61,54 % |
| `gateway/src/core/registry.js` | 64,92 % | 74,23 % |
| `gateway/src/adapters/gemini_adapter.js` | 86,51 % | 59,38 % |
| `gateway/src/adapters/claude_adapter.js` | 90,88 % | 80,00 % |
| `gateway/src/adapters/codex_adapter.js` | 94,36 % | 70,31 % |
| `gateway/src/core/audit.js` | 80,51 % | — |
| `gateway/src/core/postgres_db.js` | 84,87 % | — |

No hay c8/nyc/pytest-cov, Stryker, mutmut, Hypothesis ni fast-check. La mutación
conceptual explica el problema mejor que el porcentaje:

- cambiar `_tests_passed` para ignorar `exitCode` ya “sobrevive” porque la
  fixture aporta `passed`;
- eliminar el gate de reviewer no rompe ningún test KO;
- hacer secuencial una operación Redis conserva toda la suite actual;
- aceptar `[ ]` en el checklist sigue pasando structure.

El objetivo no debe ser 100 % indiscriminado. Debe ser 85/75 sobre código
productivo y diff, con mutación focalizada en policy, approvals, parsers de
resultado, lifecycle e idempotencia.

### QA-08 — Parte de la suite verifica texto y oráculos derivados de la implementación

**Severidad: Medium. Confianza: alta.**

Los 115/124 structure tests dan feedback útil sobre forma y documentación, pero
muchos validan substrings. El ejemplo más importante permite explícitamente
`[ ]` o `[x]` y sólo exige evidence no vacío
(`tests/structure/test_acceptance_checklist.py:16-26`). No verifica que el path
exista, que el test pase ni que el criterio esté aceptado.

El gate MVP2 comprueba la presencia de tokens y enlaces
(`tests/structure/test_mvp2_gate.py:35-67`), no los doce `[x]` ni que la evidencia
pertenezca al candidate. Los tests de schemas y docs son valiosos como contrato
estructural; no deben contarse como prueba de comportamiento o release.

### QA-09 — Estado global y assertions temporales reducen sensibilidad

**Severidad: Medium/Low. Confianza: media-alta.**

`gateway/src/core/state.js:7,60-89` y `gateway/src/core/audit.js:9,44-63` mantienen
singletons mutables. El aislamiento por proceso evita interferencias entre
archivos, pero también impide descubrir acoplamientos reales y obliga a
`--test-concurrency=1`.

Quedan assertions de tiempo de pared, como el límite de 100 ms en
`tests/gateway/tool_approval.test.js:36-53`, y timeouts fijos en bootstrap MCP.
Son aceptables como smoke, no como contrato de scheduling. Conviene inyectar
clock/scheduler y reservar timeout real sólo para detectar hangs del job.

## Delta respecto de auditorías previas

| Hallazgo anterior | Estado al corte/post-integración | Lectura independiente |
|---|---|---|
| Junio: LangGraph no estaba en `scripts/ci.sh` | **Cerrado sólo en árbol integrado** | `scripts/ci.sh:41-42` integrado ya lo ejecuta. |
| Junio: no había CI remota ni lint | **Cerrado estructuralmente tras promoción local** | Existen workflow, ruff y eslint; falta demostrar ejecución hosted y runtime coherente. |
| V5 TST-B01: Node 20 incompatible con flags | **Abierto** | Workflow y package script no cambiaron su desacuerdo. |
| V5 TST-H01: Redis live skipped | **Abierto** | Seis casos siguen skipped y no hay service Redis requerido. |
| V5 TST-H02: sin carreras simultáneas | **Abierto** | Dos instancias no equivalen a dos operaciones concurrentes. |
| V5 TST-H03: agentes/tmux reales fuera del gate | **Abierto** | Continúa un único E2E opt-in. |
| V5 TST-M01: lock Python ignorado | **Abierto** | Actions resuelve editable sobre 3.11; lock dice 3.13. |
| V5 TST-M02: oráculos derivados/docs | **Abierto** | El checklist ilustra el falso positivo. |
| V5 TST-M03: sin coverage/mutation gate | **Abierto** | Sólo hubo medición diagnóstica. |
| V5 TST-M04: globales + process isolation | **Abierto** | La serialización sigue siendo configuración del runner. |
| V5 TST-L01: tiempos de pared | **Abierto parcial** | V3 endureció algunos waits, pero persisten límites temporales. |
| **Nuevo QA-01** | **No detectado antes** | Fixture incompatible con el envelope real. |
| **Nuevo QA-02** | **No detectado antes** | Reviewer KO puede avanzar. |
| **Nuevo QA-03** | **No detectado antes** | E2E proceso-por-call disfraza persistencia como conexión. |

## Fortalezas verificadas

- La suite es rápida y no contiene `.only` ni TODO silenciosos; los skips son
  explícitos y localizables.
- Policy, sanitizer, approvals, artifacts y coordinación tienen buenas
  aserciones de invariantes, no sólo snapshots felices.
- V5 inyecta clock, UUID, token, queue y audit, facilitando tests deterministas.
- Los tests Redis live usan prefijos únicos, cleanup y comprobaciones directas
  del estado Redis.
- SQLite activa WAL y foreign keys; los tests cubren migrations y contratos de
  repositorio.
- Temporal separa lógica determinista y activities; ya existe harness de
  crash-recovery, aunque opt-in.
- Los reviews conservan KO y el posterior OK en vez de borrar el fallo.
- V3 añadió characterization tests útiles y elevó la base posterior a 894 pass.

## Estrategia de mejora

### Principios

1. **Contract-first.** Fixtures generadas/validadas por el schema que produce el
   Gateway, no dicts inventados por el consumidor.
2. **Fail-closed observable.** El test comprueba la ausencia de efectos
   posteriores, no sólo un status.
3. **Un proceso donde producción usa un proceso.** MCP E2E debe conservar
   conexión, PID y writer.
4. **Lanes por riesgo.** PR determinista, Redis requerido, Temporal/stack
   candidate y agentes reales protegidos.
5. **Identidad antes que conteo.** Todo resultado se liga a SHA/tree, runtime,
   locks, images, seed y skip budget.
6. **Mutar reglas, no perseguir 100 %.** Mutation testing selectivo en decisiones
   de seguridad y lifecycle.

### Lanes objetivo

| Lane | Frecuencia | Obligatorio | Evidencia |
|---|---|---|---|
| `pr-deterministic` | Cada PR | Sí | Node/Python matrix, unit/contract/E2E persistente, coverage diff, skip budget exacto. |
| `redis7-concurrency` | Cada PR que toca V5; al menos required en integración | Sí | Redis efímero, 100 iteraciones con seed, prefix leak=0. |
| `postgres-contract` | Candidate/nocturno | Sí para release | DB desechable, contratos y adversarial literals, cleanup. |
| `temporal-real` | Candidate | Sí para V1/G7 | 5 ejecuciones consecutivas, replay/crash y cero skip. |
| `stack-real` | Candidate | Sí para V1/G7 | Postgres+Redis+Temporal+un Gateway+worker. |
| `agents-real` | Manual protegido por candidato | Sí antes de release real-agent | Presupuesto, repo efímero, no push, Codex/Claude y reviewer. |

## Milestones ejecutables

| Milestone | Aceptación verificable | Esfuerzo | Riesgo | Dependencias |
|---|---|---:|---|---|
| T0 — Candidate + skip manifest | JSON canónico con commit/tree, runtimes, hashes de locks, suites esperadas, pass/skip y allowlist exacta; cualquier diferencia falla. | 2–3 d | Bajo | G-1, M0/0/00 |
| T1 — Contrato de resultado único | Corpus real Gateway; exitCode 0 avanza, non-zero/ambiguo bloquea; KO no llama approval/push en LangGraph y Temporal V2. | 2–4 d | Alto por compatibilidad V1 | T0, E/0/01 |
| T2 — MCP persistente | Un PID y una conexión para flujo completo; múltiples IDs in-flight; cancel/timeout/shutdown sin listeners ni hijos. | 3–5 d | Medio | B/0/03, B/1/08 |
| T3 — Redis concurrente required | Redis 7 efímero, barreras reales, 100 seeds, no skips/leaks; failure artifacts conservan seed. | 3–5 d | Medio | T0, M0/4/01 |
| T4 — Coverage + mutation focalizada | Source/diff >=85/75; mutation threshold acordado en policy/approval/result/lifecycle, con survivors revisados. | 2–4 d | Bajo/medio | T1/T2 estables |
| T5 — Live candidate lanes | Temporal 5/5, stack 1/1, agents 1/1 sobre mismo candidate/locks/images; sin mezcla de SHA. | 5–8 d + ventana | Alto operativo | T2–T4, E/2 |
| T6 — Release gate | Review OK y manifest del mismo objeto que `main` y tag; checks requeridos observables; rollback ensayado. | 2–3 d | Alto de gobernanza | T0–T5, G8 |

## Top 3 diseños de tests

### 1. Corpus Gateway→workflow real

```text
fixture schema-valid ─┬─> parser compartido
Gateway stdio real ───┘          │
                     ┌───────────┴───────────┐
                     ▼                       ▼
              LangGraph legacy        Temporal V2
                     │                       │
       success / retry / block / no side effect
```

Casos mínimos: `exitCode` 0/1/-1, missing/boolean/string, `stderr`, tool error,
review OK/KO, digest stale y transport error. El oracle es una tabla normativa,
no la implementación existente.

### 2. Cliente MCP duradero

El fixture arranca un Gateway, espera initialize, conserva stdin/stdout y
correlaciona respuestas. Ejecuta create→assign→spawn→ask→view→approval→artifact
sin cambiar PID. En paralelo envía `approval.wait` y una llamada rápida; después
cancela, cierra stdin y exige exit limpio y cero procesos/locks restantes.

### 3. Harness Redis con barrera

Dos conexiones y dos servicios esperan una barrera común, ejecutan exactamente
al mismo tiempo y verifican el estado Redis final, no sólo las respuestas.
Iteraciones con seed cubren dedupe, capacity, lease y ACK/reclaim. El teardown
falla si queda una key con el prefijo del run.

## Quick wins

- Añadir un test con la fixture feliz sin `passed/status`; hoy reproduce QA-01.
- Añadir reviewer `KO + exitCode:1` y afirmar cero llamadas a
  `approval.request`/`artifact.put(push_intent)`.
- Fallar CI si el total de skips difiere del allowlist versionado.
- Cambiar Actions al Node realmente soportado o retirar flags incompatibles y
  probar el runtime mínimo.
- Sincronizar Python desde `requirements.lock` y compilar locks por cada runtime
  soportado o uno compatible común.
- Separar coverage de `gateway/src/**` y excluir tests del denominador.
- Etiquetar structure tests como evidencia documental, no contarlos como
  acceptance funcional.

## Qué no priorizar

- 100 % de cobertura global: incentiva líneas triviales y no corrige los tres
  falsos verdes principales.
- Agentes reales en cada PR: coste, credenciales y flakiness; deben ser un lane
  protegido por candidato.
- Load testing pesado antes de definir SLOs y cerrar las carreras deterministas.
- Reescribir todas las suites en otro framework: el runner actual es suficiente
  si se corrigen contratos, procesos y lanes.

## Preguntas abiertas

1. ¿V1 debe seguir ejecutable mientras se corrigen QA-01/02 o quedar
   explícitamente disabled hasta E/0/01?
2. ¿Qué versión mínima de Node es realmente soportada: 20 o la necesaria para
   process isolation? La respuesta debe estar en package, CI y manifest.
3. ¿Postgres es una promesa soportada o sólo un adapter experimental? El lane
   requerido depende de esa decisión.
4. ¿Qué presupuesto exacto de skips se acepta por lane y quién autoriza un
   cambio?
5. ¿Qué mutation threshold es suficiente para policy/approval/result parsing?
6. ¿Dónde se conservarán artifacts de seeds/replay sin incluir datos raw?

## Criterio de salida

La confianza puede subir a B cuando, sobre un único candidate SHA:

- el envelope real ejecuta ITRP y KO/non-zero bloquea antes de approval;
- un MCP persistente completa y solapa llamadas con un solo Gateway;
- Redis 7 concurrente es required y el skip budget es exacto;
- locks y runtimes del manifest son los usados por CI;
- coverage de producción y mutación focalizada superan los gates;
- Temporal/stack/agentes live aportan evidencia del mismo candidato;
- review, `main`, tag y publicación resuelven al mismo objeto.

Hasta entonces, **894 pass es una base de desarrollo fuerte, no evidencia
suficiente de release**.

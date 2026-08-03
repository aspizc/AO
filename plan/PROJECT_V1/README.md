# Plan de proyecto — Project V1: Orquestacion avanzada (LangGraph + infra durable)

Version 1.0 (borrador de diseno). Sucesor de **Project 0** (el MVP/MVP2.0,
descrito en [`../../plan_proyecto_v4.md`](../../plan_proyecto_v4.md), que en la
practica es **v0.4**: la 4a iteracion del diseno del MVP, no una version de
producto).

> Este documento es el **plan de proyecto** de V1 (vision, alcance, arquitectura,
> fases, decisiones). Las **tareas atomicas** viven en stages
> `plan/PROJECT_V1/A/` ... `E/`, al estilo de Project 0.

---

## 0. TL;DR / Posicionamiento

- **Project 0** entrego el Gateway MCP + orquestador-LLM (como rol) + adapters
  (Gemini/Claude/Codex) + policy/audit/sanitizacion + approvals + planificacion
  asistida, todo **local**, sobre SQLite/JSONL, sin infra pesada.
- **Project V1** eleva la plataforma a **orquestacion determinista y duradera**:
  introduce un orquestador basado en **LangGraph** (en modelo **hibrido** con el
  LLM), migra el estado a **Postgres**, anade **event bus (Redis Streams)**,
  **workflows durables (Temporal)** y **observabilidad (OpenTelemetry)**.
- **Invariante central que NO cambia:** el **contrato MCP del Gateway** sigue
  siendo la unica frontera de enforcement. LangGraph, Temporal, Postgres y Redis
  son **clientes/infra detras del Gateway**, no lo reemplazan. Se preservan
  policy-before-spawn, sanitizacion fail-closed, audit trace-first y "el
  orquestador no es privilegiado".

---

## 1. Por que Project V1 (motivacion)

- En Project 0 el orquestador es un LLM. Para flujos **repetitivos y bien
  definidos** (`implementa -> testea -> revisa -> push`) la variabilidad del LLM
  es ruido: caro, no determinista, dificil de reproducir.
- Falta **durabilidad**: workflows largos, con reintentos o approvals de horas, no
  estan soportados (`approval.wait` es acotado; el estado es local y volatil).
- Falta **concurrencia multi-hijo real** y **observabilidad** de grado produccion.
- El v4 ya lo anticipa (Fase 3 y Fase 5). Project V1 = materializar la **Fase 3
  completa** + las piezas de **durabilidad/observabilidad de Fase 5** que dan
  robustez.

---

## 2. Alcance de V1

**In scope:**

1. **Orquestador LangGraph** (`orchestrator-langgraph/`): proceso cliente del
   Gateway con grafos predefinidos por flujo (nodos = pasos, aristas =
   transiciones). Registra `orchestration_sessions.orchestrator_agent = langgraph`.
2. **Modelo hibrido**: selector de orquestador (LLM vs LangGraph) por tipo de
   flujo; el LLM-orchestrator sigue para flujos abiertos/exploratorios.
3. **Estado en Postgres**: backend Postgres detras de la interfaz de repositorios
   actual; SQLite se mantiene para uso local.
4. **Event bus (Redis Streams)**: publicacion de eventos de dominio (hoy solo en
   audit JSONL) para consumidores en tiempo real.
5. **Workflows durables (Temporal)**: envuelven grafos LangGraph; reintentos,
   timers y approvals largos sin bloquear ni perder estado.
6. **Observabilidad (OpenTelemetry)**: una traza por `traceId`, metricas y logs
   correlacionados Gateway <-> orquestador <-> adapters.
7. **Empaquetado**: `docker-compose` con Postgres, Redis, Temporal y OTel
   collector para el entorno local de V1.

**Out of scope (→ Project V2 / futuro):**

- RBAC multi-usuario, multi-host/cloud, dashboard UI completo.
- Task-less sessions (ya esbozado en `../PROJECT_V2/`).
- MCP servers internos (issue tracker, chat) e integraciones externas.
- **Reemplazar el Gateway o cambiar su contrato MCP.**

---

## 3. Principios

**Heredados de Project 0 (siguen siendo ley):**

- Seguridad **fuera del modelo**: el Gateway es la frontera, no el prompt.
- Policy-before-spawn (ADR-003), Gateway-only enforcement (ADR-001), orquestador
  no privilegiado (ADR-017), sin raw `restricted` al orquestador (ADR-018),
  sanitizacion determinista fail-closed, audit trace-first.
- **Sustituibilidad por contrato**: cambiar el orquestador (LLM -> LangGraph) o el
  estado (SQLite -> Postgres) no cambia el contrato MCP.

**Nuevos de V1:**

- **Determinismo opcional**: para un flujo dado, el operador elige orquestador
  determinista (LangGraph, reproducible y auditable nodo a nodo) o LLM.
- **Durabilidad extremo a extremo**: ningun workflow se pierde por reinicios; los
  estados intermedios persisten (Temporal).
- **Observabilidad de primera clase**: cada `traceId` se sigue con OTel por todas
  las capas.
- **El bus refleja, no autoriza**: Redis Streams transporta eventos; la autoridad
  sigue siendo el Gateway+policy. Publicar un evento no concede permisos.

---

## 4. Arquitectura V1 (vista de capas)

```text
human / trigger
   |
   |  (selector de orquestador por flujo)
   v
ORCHESTRATION LAYER  (hibrido)
   |- LLM-orchestrator (rol, flujos abiertos)        ----\
   |- orchestrator-langgraph (proceso, grafos)            |  MCP (mismo contrato)
   |     envuelto por Temporal (durabilidad)         ----/
                          |
                          v
              agents-gateway (MCP stdio)        <-- UNICA frontera de enforcement
              policy / audit / sanitize / state / artifacts / approvals
                          |
                          v
              adapters -> agent CLIs (gemini / claude / codex)

infra transversal:
   estado -> Postgres        eventos -> Redis Streams      trazas/metricas -> OpenTelemetry
```

**Componentes nuevos:**

- `orchestrator-langgraph/`: define grafos por flujo; cada nodo invoca **las
  mismas MCP tools** del Gateway que invocaria un LLM (`orchestration.*`,
  `task.assign`, `agent.*`, `artifact.*`, `approval.*`).
- **Adaptador Temporal**: cada grafo se ejecuta como un workflow Temporal; las
  llamadas MCP son *activities* idempotentes con reintentos/timers.
- **Publisher de eventos**: emite a Redis Streams los eventos de dominio que hoy
  van solo al audit.
- **Backend Postgres**: implementacion alternativa de los repositorios del core.
- **Instrumentacion OTel**: en Gateway, orquestador y adapters.

---

## 5. El contrato MCP no cambia (clave del diseno)

- LangGraph y Temporal son **clientes** del Gateway; no lo modifican.
- Todo lo de Project 0 (policy, sanitizacion, audit, visibility matrix, approvals,
  auto-approve acotado de ADR-006) **se reutiliza sin cambios**.
- El selector LLM/LangGraph vive **fuera** del Gateway; el Gateway no sabe (ni le
  importa) si el caller es un modelo o un grafo: solo aplica policy por contexto.
- Consecuencia practica: V1 es **incremental**, no un rewrite. El riesgo se acota
  a las capas nuevas.

---

## 6. Modelo hibrido de orquestacion

- **Catalogo de flujos**: flujos repetitivos y acotados se modelan como grafos
  LangGraph (ej. `implement-test-review-push`, `plan-refine`).
- **Flujos abiertos**: siguen con LLM-orchestrator.
- **Selector**: el operador elige por flujo (o una policy de seleccion futura).
  Queda en audit via `orchestrator_agent`.
- Un grafo y un LLM producen **las mismas llamadas MCP**; artefactos, approvals y
  audit son indistinguibles aguas abajo. Las puertas de approval (incluido el
  auto-approve acotado opt-in) funcionan igual desde un grafo.

---

## 7. Datos, eventos, durabilidad y observabilidad

| Capa | Project 0 | Project V1 | Nota |
|---|---|---|---|
| Estado | SQLite | **Postgres** (misma interfaz de repos) | SQLite sigue para local; tests de paridad. |
| Audit | JSONL append-only | Postgres/append-only + **export**; JSONL fallback | No se pierde el trazo a ojo. |
| Eventos | solo audit | **Redis Streams** (pub/sub) | Solo metadata/sanitizado; nunca raw `restricted`. |
| Workflows | sincronos, acotados | **Temporal** envolviendo grafos | Reintentos, timers, approvals largos, recuperacion ante crash. |
| Observabilidad | logs stderr + audit | **OpenTelemetry** (trazas/metricas) | Una traza por `traceId` cruzando capas. |

---

## 8. Invariantes de seguridad preservados

| Invariante de Project 0 | Como se preserva en V1 |
|---|---|
| Policy-before-spawn | Las activities Temporal / nodos LangGraph llaman al Gateway, que evalua policy antes de cualquier spawn. |
| Orquestador no privilegiado | El grafo LangGraph **no** tiene capability extra; sujeto a policy igual que el LLM. |
| Sanitizacion fail-closed + visibility matrix | Intactas en el Gateway. |
| Audit trace-first | Ampliado (Postgres + Redis + OTel) sin perder el JSONL. |
| Auto-approve acotado (ADR-006) | Sigue siendo opt-in del operador; un grafo no puede auto-concederse nada fuera de scope ni `NEVER_AUTO`. |
| Codex disabled by default; `restricted` solo Gemini | Intactos (policy registries). |
| Threat-model como living document | Se extiende con los vectores de V1 (§10). |

---

## 9. Fases del Project V1 y stages

```text
F1  Cimientos deterministas   scaffold orchestrator-langgraph; grafo minimo
                              (delegate->review) como cliente MCP; paridad de
                              audit con el flujo LLM.
F2  Catalogo hibrido          grafos implement-test-review-push y plan-refine;
                              selector de orquestador; approvals desde grafo.
F3  Datos y eventos           backend Postgres (paridad de repos); publisher
                              Redis Streams + un consumidor de metricas.
F4  Durabilidad               envolver grafos en Temporal; reintentos, timers,
                              approvals largos, recuperacion ante crash.
F5  Observabilidad + empaque  OTel end-to-end; docker-compose
                              (postgres/redis/temporal/otel); runbook V1; gate.
```

| Stage | Fase V1 | Tema | Tareas | Depende de |
|---|---|---|---|---|
| **A** | F1 | Cimientos LangGraph | 5 | V0 Y/0/2 (MVP2.0 gate) |
| **B** | F2 | Catalogo hibrido | 5 | A |
| **C** | F3 | Estado y eventos | 5 | A |
| **D** | F4 | Durabilidad Temporal | 5 | B + C |
| **E** | F5 | Observabilidad y empaquetado | 5 | A + B + C + D |
| **Total** | | | **25** | |

Orden de ejecucion: **A -> (B || C) -> D -> E**. B y C son paralelos porque B trabaja sobre la capa de orquestacion/grafos y C sobre repositorios/eventos/infra.

## 9.1 Convenciones globales de Project V1

Aplican todas las convenciones de `plan/PROJECT_V0/README.md` mas:

| Convencion | Detalle |
|---|---|
| Branch prefix | `feature/K-0-<stage>-<stream>-<task>-<slug>` donde `K-0` es el current branch base de V1. |
| Base branch | `develop` (si no existe, desde `main`). |
| Invariante central | Gateway contract inmutable: cada tarea incluye verificacion de que ningun tool del Gateway fue modificado para acomodar LangGraph/Temporal/infra. |
| `traceId` | Siempre presente en todos los eventos de audit, desde A/0/1 en adelante. |
| Idioma de codigo | Python para `orchestrator-langgraph/`; JS/TS para Gateway, igual que V0. |
| Docker | Cada stage que anade un servicio al compose lo hace de forma aditiva; el compose debe arrancar con solo los servicios disponibles en ese stage. |
| Logs | Python: `structlog` o `logging` con formatter JSON a stderr. Nunca stdout para no interferir con MCP stdio. |
| Threat model | Cada stage que introduce un vector nuevo crea/actualiza `docs/threat-model.md` con el TV correspondiente y su test de bypass. |

---

## 10. Threat-model: nuevos vectores de V1 (a formalizar al implementar)

- **TV-01** Cliente no autenticado del Gateway: un proceso local podria suplantar
  al orquestador LangGraph. Control: el Gateway no confia en el caller (policy por
  contexto); evaluar auth de cliente MCP local.
- **TV-02** Event bus como canal de fuga: un consumidor de Redis lee eventos
  sensibles. Control: publicar solo eventos sanitizados/metadata; nunca raw
  `restricted` en streams.
- **TV-03** Reintento durable de accion peligrosa: Temporal reintenta un `push`
  varias veces. Control: activities idempotentes; `NEVER_AUTO` sigue exigiendo
  humano por reintento.
- **TV-04** Superficie de infra: Postgres/Redis/Temporal anaden credenciales y
  puertos. Control: docker local, secretos fuera de repo, sin exponer puertos.

Cada vector entra en `docs/threat-model.md` con su test de bypass al implementarse.

---

## 11. Decisiones registradas (ADRs de V1, a formalizar en `docs/adr/`)

- **ADR-V1-01** LangGraph como orquestador determinista cliente del Gateway;
  contrato MCP inmutable.
- **ADR-V1-02** Modelo hibrido; selector por flujo; el LLM-orchestrator se mantiene.
- **ADR-V1-03** Postgres como backend de estado tras la interfaz de repos; SQLite
  sigue para local.
- **ADR-V1-04** Redis Streams refleja eventos; no es frontera de autorizacion.
- **ADR-V1-05** Temporal envuelve grafos para durabilidad; activities idempotentes.
- **ADR-V1-06** OpenTelemetry para trazas/metricas por `traceId`.

---

## 12. Criterio de "V1 listo"

- Un flujo (`implement-test-review-push`) corre extremo a extremo como **grafo
  LangGraph durable (Temporal)**, con estado en **Postgres**, eventos en **Redis**,
  trazas **OTel**, y **las mismas garantias** de policy/sanitizacion/audit que el
  flujo LLM.
- El operador puede elegir **LLM o LangGraph** para un flujo acotado.
- Gate + checklist V1 y ADRs V1 formalizados.

---

## 13. Relacion con el resto del plan

- **Project V0** — [`../PROJECT_V0/`](../PROJECT_V0/README.md) +
  [`../../plan_proyecto_v4.md`](../../plan_proyecto_v4.md): stages A-Z, la base
  sobre la que V1 construye **sin romper contrato**.
- **Project V2** — [`../PROJECT_V2/`](../PROJECT_V2/): backlog no prioritario
  (task-less sessions, etc.); puede fusionarse con otros cambios.
- **ADRs de implementacion** — `docs/adr/` (ADR-005 MVP2.0, ADR-006 auto-approve,
  ADR-007 planner-assisted) siguen vigentes en V1.

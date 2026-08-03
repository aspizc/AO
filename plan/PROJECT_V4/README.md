# Project V4 — Trust boundary, doble revision y convergencia V1

Estado: **G-1/G0 autorizados; ejecución canónica por absorción V5 activa**. Existen
worktrees preliminares M0/0/00–01 basados en `develop@bfab1fb`, pero la línea
canónica avanzó más allá de `d521afb` y `main`/`develop` se alinearon localmente
después de la auditoría. Sus manifests/reviews son evidencia histórica y no
cierran ninguna tarea del plan revisado. La decisión exacta del owner, base y
límites de promoción se registra en [`PLAN_APPROVAL.md`](PLAN_APPROVAL.md);
tag, push y publicación siguen fuera de alcance.

V4 remedia las auditorias 2026-06-19/2026-07-11 y la revalidacion integral
2026-07-26. El objetivo es que un host o
child prompt-injected no pueda inventar autoridad, extraer raw restricted,
autoaprobarse ni falsificar provenance. La trazabilidad vive en
[`AUDIT.md`](AUDIT.md), la procedencia de plan en
[`PLANNING_TRACE.md`](PLANNING_TRACE.md) y reviews en
[`reviews/README.md`](reviews/README.md). [`EPICS.md`](EPICS.md) y
[`SHEETS.md`](SHEETS.md) son índices estables: el contenido detallado vive en
las [12 hojas de épica](epics/README.md) y en los 72 ficheros atómicos
`<stage>/<stream>/<task>.md` enlazados desde cada stage.

## Estrategia de integracion unica

1. G-1 quedó resuelto con `main == develop == 85f7ab9`; la integración V4
   anterior y los worktrees preliminares quedan, sin rebase, como evidencia.
2. G0 autoriza ejecutar una sola línea de integración V5 desde ese baseline.
   Las 72 hojas V4 se cierran mediante el ledger de absorción, no duplicando
   ramas de producto.
3. Cada task branch nace del head de integración que ya contiene **todas** sus
   dependencias exactas.
4. Tras tests/reviews/gate, la tarea vuelve a integration y se registra su tree
   SHA recuperable; nunca se reescribe historia para rollback.
5. Cada wave requiere CI y review independiente; la autorización vigente
   permite integrarla localmente a `develop` y `main` sin una nueva pausa.
6. `feature/enable-codex-planner` (76 atras/5 delante en el corte) nunca se
   mergea completa: M0 porta hunks con source SHA. `.mcp.json` se rechaza.
7. Review OK, integracion, promocion a `main` y release/tag son estados distintos.
   G8 exige que candidate, `main` y tag resuelvan al mismo commit/tree.

## Decisiones vinculantes

| Tema | Decision |
|---|---|
| Host prompt-injected | Repo/identity/role/trace/task/session/classification son server-side; hints del caller solo pueden provocar deny. |
| Restricted | Raw nunca se rebaja por regex. No autorizado recibe proyeccion determinista sin texto derivado del codigo, o deny. |
| Approvals | `approval.respond` desaparece de MCP. CLI usa control local y decision firmada; UI futura reutiliza protocolo. |
| Agentes | Codex y Gemini pueden ser coder/reviewer restricted; Reviewer B siempre read-only y limpio. |
| Doble review | A no ve codigo ni aprueba; B lee source RO, considera y dispone todos los findings A y B. |
| V1 | Experimental/opt-in/fenced; Temporal V2 canonico para ITRP; LangGraph conserva plan-refine. |
| Python V1 | `>=3.11,<3.14` hasta evidencia/gate nuevos. |
| Supervision | Planner/coder/tester/reviewer usan `agent.spawn`; ninguna session tiene deadline automatico. |
| Piloto | Local y single-user. Multiusuario/cloud quedan fuera de V4. |
| Readiness | El piloto exige tanto review trustworthy como ejecución YOLO gobernada; uno no compensa la ausencia del otro. |
| YOLO/unconfined | `confined` es default. Un orquestador YOLO es una session con grant firmado server-side; un normal usa grant acotado. Sin grant, cada launch amplio exige aceptación explícita. `host-unconfined` admite grant one-shot o por sesión y declara que no existe boundary frente al mismo UID. |
| V1 ITRP | LangGraph permanece fenced hasta paridad Temporal V2 + H4; E/3/00 lo retira y Temporal queda canónico. |
| Versionado | SemVer. `<1.0.0` es desarrollo/prueba interna, con cada minor funcional y usable; el primer MVP mostrable/publicable será `1.0.0`. |
| Superficie | CLI primero; UI fuera de V4. |

## Arquitectura objetivo

```text
human/operator ── CLI + user-presence/signature ─► local control socket
                                                      │
MCP host (audience=orchestrator) ─────────────────────┤
                                                      ▼
                                              one long-lived Gateway
                                              state/audit/artifacts private
                                                │ scoped internal handles
                                                ▼
                                      per-task sandbox + source/scratch mounts

restricted change ─► deterministic projection ─► Reviewer A (no source)
                  └► source mount read-only ─────► Reviewer B (raw locally)
                                                     │ dispositions A+B
                                                     ▼
                                             gate + human change.accept
```

Public MCP nunca recibe child/reviewer handles ni raw, incluso si el host roba
un bearer. Un socket 0600 es defensa secundaria: firma, channel/audience
binding, user-presence y sandbox verificable forman la frontera.

## Stages y specs ejecutables

| Stage | Objetivo | Tareas |
|---|---|---:|
| [M0](M0/README.md) | Base, bootstrap review, KYA/modelos, SCA y confianza V0–V5 | 12 |
| [A](A/README.md) | ADRs, models doc y config local | 3 |
| [B](B/README.md) | Authority, isolation, artifacts, lifecycle, approvals, grants YOLO, data lifecycle y threat gate | 29 |
| [C](C/README.md) | Audit/approval CLI, inventario, recovery y consentimiento YOLO | 5 |
| [D](D/README.md) | Doble review A/B y gate | 7 |
| [E](E/README.md) | Fence y convergencia Temporal V2 | 16 |

Total: **72 tareas atómicas**, cada una acotada a ≤1 día, un commit y un
handoff. Las [12 hojas de épica](epics/README.md) las agrupan por outcome sin
convertir las épicas en unidades ejecutables; [`SHEETS.md`](SHEETS.md) enlaza
la ficha detallada de cada ID en su directorio canónico.

## DAG de alto nivel

```text
G-1 -> G0 -> M0/0/00 -> M0/0/01 -> M0 streams -> M0-ready -> A/0/00..02 -> G1
                                                                    └-> B/0/00 -> B/1/00 -> B/1/01
                                           │             ├-> artifacts/egress
                                           │             ├-> lifecycle/isolation
                                           │             └-> ownership/control
                                           └-----------------------> B/4 cutover
                                                                     -> B/5 -> G2..G5
C/0/00 -> C/0/01 -> C/0/02 -> C/0/03 -> C/0/04
B/5/02 -> D/0/* -> D/1/00 -> 01 -> 02 -> 03 -> G6
G1 -> E/0/* -> H0
G6 -> E/1/00 -> ... -> E/1/07 -> E/2/00 -> 01 -> 02 -> 03 -> H4 -> E/3/00 -> G7
```

El detalle sin wildcards scheduler vive en cada fichero
`<stage>/<stream>/<task>.md`; los README/TASKS de stage son sólo índices.

## Gates acumulativos

| Gate | Terminales/evidencia | Autoridad |
|---|---|---|
| G-1 candidate identity | **Resuelto** en `PLAN_APPROVAL.md`: base `85f7ab9`, refs alineadas e integración stale histórica | Owner; decisión de baseline registrada |
| G0 plan.apply | **Autorizado** para el programa V5/absorción, sujeto a TDD, CI y review por hoja | Mensaje explícito del owner registrado fuera del Gateway |
| G1 baseline/coherence | M0/1/02, M0/2/02, M0/3/00, M0/4/00–02, A/0/00–02 + gate V3 | Owner; candidate manifest y tree SHA de integration |
| G2 authority | B/5/00 | Bootstrap A+B + owner |
| G3 restricted/audit | B/5/01 | Bootstrap A+B + owner |
| G4 operator | B/5/02 + C/0/04 | Firma, inventario, recovery y consentimiento YOLO |
| G5 runtime | B/1/07, B/1/09, B/2/03, B/5/02 | Security/ops review + canaries |
| G6 dual review | D/1/03 | Gate D + review humana final no auto-certificada |
| G7 V1 | E/2/03, H4, E/3/00 | Owner + evidence del mismo candidate |
| G8 release | G1–G7, full gate, release diff y validator candidate=`main`=tag | Aprobacion separada merge/tag/push |

G0 no pretende usar una capacidad que todavia no existe. Desde B/2/02, las
decisiones mutantes usan envelope firmado. Gates H0–H4 estan definidos con
aprobador, digest, evidencia y efecto de deny en [`E/README.md`](E/README.md).

## Contrato MCP 0.2

- Internal handles tienen audience/channel binding y nunca salen al MCP host.
- Public principal es orchestrator; fields declarativos son eliminados o
  assertions exactas.
- `artifact.get/share` publicos no devuelven raw bajo ninguna capability.
- Kinds, classification, producer, trace y lineage son server-owned.
- B/4 implementa 0.2 detras de flag, migra todos los clientes y retira 0.1 en
  un cutover atomico; mixed version falla cerrado.
- Rollback restaura servidor+clientes+DB al ultimo tree compatible, no mezcla.

## Ejecucion y supervision

La skill `interactive-gateway-orchestration` es spawn-first:

1. preflight de policy/binario/tmux/repo/role;
2. `task.assign` + `agent.spawn` + `agent.ask`;
3. `agent.view` periodico y updates al humano;
4. ningun kill/failure solo por tiempo; transport timeout exige reattach;
5. `agent.kill` solo tras completion verificada, cancel humano o fallo terminal;
6. `agent.delegate` no es el camino normal.

La policy legacy niega hoy planner spawn. M0/0/01 lo registra y B/1/01 separa
actor orchestrator de target planner; hasta entonces no hay fallback a delegate.

## TDD, review y rollback

- Cada sub-spec lista dependencias, paths allowlisted, entrega, test rojo,
  verify, rollback y clase de review.
- Branch: `feature/V4-<stage>-<stream>-<task>-<slug>` desde integration head.
- Commit: `fix(v4): <summary> (PROJECT_V4 B/2/02)`.
- B usa harness bootstrap M0/0/01; D/1/03 lo sustituye solo tras review humana.
- Todo artifact/review/test/approval se liga al change-set digest. Cambiar un
  byte invalida evidencia.
- Migrations requieren backup/restore ensayado; gates conservan tree SHA y
  data-version compatibles.
- Sin `git push` desde coder/reviewer.

## Definition of done global

- 72 tareas terminales con tests/reviews/gates; cero tarea multi-dia ejecutable.
- Gate local desde locks, snapshot MCP, coverage >=85/75 y threat E2E verdes.
- npm y scanner Python sin high/critical no aceptados.
- Node/Python soportados ejecutan todas las suites esperadas; skip budget exacto,
  Redis 7 concurrente required y ningun suite vacio produce verde.
- Audit allowlisted sin prompt/payload/diff/output/snapshot/token/path sensible,
  telemetry on/off.
- Canaries demuestran no raw/control/operator access por host, A o child no
  autorizado; B source RO y scratch separado.
- Confined nunca degrada implicitamente; workspace-yolo preserva el control
  boundary y host-unconfined solo arranca tras grant/aceptacion que declara la
  ausencia de boundary frente al mismo UID.
- Un Gateway PID/writer; spawn/crash/restart/idempotency convergen.
- CLI interactiva/no interactiva, user-presence, replay y first-wins probados.
- Inventario/recovery no depende de IDs conservados en prompts; retention,
  export/erase y restore convergen en todos los stores declarados.
- Temporal history sin raw, V1 replay preservado y candidate lanes estables.
- El piloto local demuestra conjuntamente review trustworthy y grants YOLO
  one-shot/de sesión; no se declara ready si falta uno de los dos.
- Cada minor pre-1.0 es funcional/usable sin presentarse como release público;
  G8 sólo puede declarar el primer MVP mostrable como `1.0.0`.
- Estado de proyecto distingue implementado/reviewed/integrado/promovido/released;
  checklists no aceptados no pueden alimentar una claim de readiness.
- Changelog/ADRs/runbooks actualizados; en G8 candidate, `main` y tag son el mismo
  objeto y la promocion tiene evidencia separada del review.

Estimacion: **57–85 dias-persona** mas la ventana de estabilidad E/2. Dos tracks
reducen calendario, pero G2–G6 son secuenciales.

## Fuera de alcance

- UI/TUI; pentest destructivo/DoS; datos restricted/personales reales en CI.
- Promover V1 a supported o conectar git push real antes de G7/G8.
- Upgrades major Zod/better-sqlite3 junto a Hono.
- Redisenar Postgres/Redis como stores productivos; lanes exponen su deuda.
- Encryption/tamper-evident audit at rest mas alla de permissions, minimization
  y ownership V4.
- Release, merge a main, tag o push desde tareas.

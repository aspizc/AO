# Project V3 — Hardening y deuda tecnica post-auditoria

Backlog derivado de la auditoria tecnica del 2026-06-10. El informe completo,
con todos los hallazgos citados por `file:line`, vive en [`AUDIT.md`](AUDIT.md)
y es la fuente de verdad de cada tarea: cada spec referencia su hallazgo
(`QW*`, `M*`, `S*`, `T*`, `A*`, `D*`, `O*`).

Objetivo del proyecto: cerrar los riesgos detectados sin cambiar el contrato
MCP del Gateway ni el alcance funcional. V3 no anade features; endurece lo que
ya existe (tests del nucleo de policy, gates de CI completos, licencia,
reproducibilidad Python, reconciliacion docs↔codigo) y corta la release
v0.1.0.

## Decisiones del owner (registradas)

| Decision | Valor |
|---|---|
| Licencia | MIT, copyright "Carlos Asensio Pizarro" (cierra Open Question 1 de AUDIT.md) |
| CI remota | GitHub Actions minimo que ejecuta `scripts/ci.sh` (cierra OQ4) |
| Ruta Postgres | Solo test de integracion opt-in; migrar a driver `pg` queda FUERA de V3 (cierra OQ2) |
| Semantica de roles | Pendiente: se decide dentro de B/0/2 con ADR-008 y matriz de caracterizacion (OQ3) |

## Stages

| Stage | Topic | Audit refs | Estado |
|---|---|---|---|
| [A](A/README.md) | Red de seguridad y gates (CI completo, tests de policy engine, lint, Actions, higiene) | M0, QW1, QW3 | backlog |
| [B](B/README.md) | Correctitud y critico (LICENSE, contrato de errores Python, semantica de roles, audit de frontera, secreto) | M1, QW2, QW4 | backlog |
| [C](C/README.md) | Alto apalancamiento (pins/lockfile Python, reconciliacion docs, Postgres opt-in) | M2 | backlog |
| [D](D/README.md) | Pulido y release v0.1.0 | M3 | backlog |

## Orden de ejecucion

```text
A  ->  (B || C)  ->  D
```

Tareas sin dependencias duras, paralelizables en cualquier momento:
B/0/0, B/0/3, B/0/4, C/0/1, D/0/1, D/0/2.

## Convenciones V3

- Branches: `feature/V3-<stage>-<stream>-<task>-<slug>`
  (ej. `feature/V3-A-0-0-full-ci-gate`). Base: `develop`.
- Commits: `feat(v3)|test(v3)|docs(v3)|chore(v3): <resumen> (PROJECT_V3 A/0/0)`.
- CHANGELOG: una linea por tarea cerrada bajo `## Unreleased`, con
  `Closes V3 <ID>`.
- Reviews: contrato estandar coder/reviewer en `plan/PROJECT_V3/reviews/`
  (`<stage>_<stream>_<task>-<trial>_to_review.md` /
  `..._reviewed_OK|KO.md`); el directorio se crea con la primera review.
- ADRs nuevos: ADR-007 (politica de CI remota, A/0/3) y ADR-008 (semantica de
  acciones por rol, B/0/2). Continuan la serie core 001-006.
- Invariante global: el contrato MCP del Gateway (nombres de tools, schemas de
  entrada, formato de error) no cambia en V3, salvo lo que ADR-008 decida
  explicitamente para la capa de roles.
- Ficheros de tarea con dos digitos (`0/00.md`), como Project V2 Stage B.

## Contrato comun de ejecucion

Cada tarea V3 se ejecuta como una unidad cerrada: tests primero, cambio minimo,
verificacion, commit y handoff de review. Si el workspace tiene cambios ajenos,
el coder debe preservarlos y stagear solo los ficheros de su tarea.

Mapeo de review id:

| Spec | Review id | Trial 1 |
|---|---|---|
| `A/0/00.md` | `A_0_0` | `plan/PROJECT_V3/reviews/A_0_0-1_to_review.md` |
| `B/0/02.md` | `B_0_2` | `plan/PROJECT_V3/reviews/B_0_2-1_to_review.md` |

Reglas de review:

- El directorio de reviews de V3 es `plan/PROJECT_V3/reviews/`.
- Si existe `*_reviewed_OK.md`, la tarea esta cerrada y no se reabre salvo
  instruccion explicita del owner.
- Si existe `*_reviewed_KO.md`, la siguiente ejecucion incrementa trial y
  corrige SOLO los puntos del KO.
- Si existe `*_to_review.md` sin verdict, no se empieza una nueva trial.
- Las decisiones de owner se registran en
  `*_to_check_by_human.md`; una tarea no puede inventar una decision pendiente.
- Nunca se hace `git push` desde la tarea salvo peticion explicita del owner.
- Los comandos de branch de cada spec son orientativos; antes de ejecutarlos,
  comprobar `git status --short` y no descartar cambios existentes.

Contenido minimo de cada `*_to_review.md`:

```markdown
# Review Submission - Task PROJECT_V3/<stage>/<stream>/<task> (Trial <n>)

## What was done
- ...

## Why
- ...

## Decisions Taken
- ...

## Verification
- `<command>` - <result>

## Commit
- `<sha>` - <subject>
```

Definicion de done comun:

- La tarea actualiza `CHANGELOG.md` bajo `## Unreleased` con
  `Closes V3 <stage>/<stream>/<task>`, salvo D/0/3 que corta la release.
- Las pruebas especificas de la tarea estan verdes.
- `./scripts/ci.sh` esta verde o la review explica claramente el bloqueo
  ambiental y el comando alternativo ejecutado.
- El handoff de review incluye commit SHA real; no se entrega "pending".

## Trazabilidad tarea → hallazgo

| Tarea | Hallazgo de AUDIT.md |
|---|---|
| A/0/0 | QW1, A1 (orchestrator-langgraph sin gate) |
| A/0/1 | M0.1, T1 (policy engine sin tests directos) |
| A/0/2 | M0.2, O2 (cero linting) |
| A/0/3 | M0.3, O1 (sin CI remota) |
| A/0/4 | QW3, D3 (restos: `.git/` vacios) |
| B/0/0 | M1.1/QW4, D1 (sin LICENSE) |
| B/0/1 | M1.2, A2 (helpers de error duplicados y divergentes) |
| B/0/2 | M1.3, S2 (deny-list y default-allow) |
| B/0/3 | M1.4, O3 (audit de frontera acoplado a telemetria) |
| B/0/4 | QW2, S3 (fallback silencioso del secreto) |
| C/0/0 | M2.1, A3 (deps sin pinear, sin lockfile, redis sin declarar) |
| C/0/1 | M2.2, D2 (README contradice codigo; 7 env vars sin documentar) |
| C/0/2 | M2.3, T2, S1 (Postgres solo testeado con executor falso) |
| D/0/0 | M3.1, T3 (telemetry/trace_access/mcp_server sin tests) |
| D/0/1 | M3.2 (composicion del sanitizador sin tests) |
| D/0/2 | M3.3, T4 (timings fragiles en approval_wait) |
| D/0/3 | M3.4, O4 (release cut y poda de ramas) |

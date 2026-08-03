# Auditoría de gobernanza, planificación y trazabilidad

## Dictamen

**Nota: D.** El proyecto conserva mucha más evidencia que la mayoría de
repositorios de su tamaño, pero todavía no puede responder de forma
determinista a una pregunta elemental: “¿qué objeto exacto está implementado,
revisado, integrado, promovido y publicado?”. Los reviews son ricos y preservan
KO, pero los estados se declaran en README/checklists sin derivarse de refs,
digests, gates o tags.

La corrección posterior que alineó localmente `main` y `develop` fue adecuada y
reduce el riesgo inmediato. También expuso un problema más profundo: los textos
que decían “ausente de main” entraron en `main` durante la propia promoción y
quedaron obsoletos en el mismo commit. La gobernanza debe ser una proyección
validada del candidato, no una edición manual que describe el estado anterior.

## Modelo de estado que falta

El vocabulario canónico ya fue incorporado en
`plan/README.md:27-34`, pero aún no existe un reducer/validator que lo haga
ejecutable:

```text
planned
   │ plan approval + immutable spec digest
   ▼
implemented
   │ commit/tree + tests del mismo change-set
   ▼
reviewed
   │ verdict OK ligado al digest
   ▼
integrated
   │ reachable desde integration/develop
   ▼
promoted
   │ main resuelve al candidate aprobado
   ▼
released
   │ tag/publicación resuelven al mismo objeto
```

Ningún estado implica automáticamente el siguiente. En particular:

- un review OK no prueba integración;
- estar en `develop` no prueba promoción;
- una sección de changelog no crea un release;
- un número de versión en manifests no crea un tag;
- un tag local no prueba publicación;
- un checklist con links no prueba que su evidencia pertenezca al candidato.

## Corte auditado y corrección posterior

| Momento | Evidencia Git | Interpretación |
|---|---|---|
| Corte principal | `HEAD=main=41d194a`; `develop=d521afb`; `main...develop=0/78`; 99 paths de delta | V3 y V5 revisados no estaban promovidos al producto expuesto por `main`. |
| Después de la corrección local | `main=develop=b532c63` | V3, V5, auditoría y rebaseline V4 quedaron integrados/promovidos localmente. |
| Release observado | único tag `mvp2-autonomy-scopes-ok`; `v0.1.0` ausente; ningún remote | No existe release verificable ni publicación observable. |
| V4 actual | `PLAN_APPROVAL.md` pending; worktrees M0 sobre base anterior | Las 72 tareas siguen planificadas. La integración/documentación posterior no las implementa. |

Este informe mantiene el hallazgo del corte y registra la corrección sin
atribuirle un release que no ocurrió.

## Mapa V0–V5 por estado

| Proyecto | Planned | Implemented | Reviewed | Integrated | Promoted | Released | Lectura auditada |
|---|---:|---:|---:|---:|---:|---:|---|
| V0 MVP/MVP2 | Sí | Sí, histórico | Sí, histórico | Sí | Sí | **No demostrable** | MVP checklist 0/27 aceptado; MVP2 12/12 marcado, pero sin candidate/tag verificable. |
| V1 | Sí | Parcial | Parcial | Sí en árbol actual | Sí tras corrección | No | Experimental/opt-in; contratos y lanes abiertos. |
| V2 | Sí | No | No | No | No | No | Backlog explícito; estado coherente. |
| V3 | Sí | Sí | Sí | Sí en `develop` al corte | **Sí sólo tras `b532c63`** | No | El release `v0.1.0` fue preparado, no creado ni publicado. |
| V4 | Sí, 72 tareas | No para el plan rebaselined | No | No | No | No | G-1 y G0 pendientes; worktrees preliminares son evidencia stale. |
| V5 | Sí | Sí | Sí | Sí en `develop` al corte | **Sí sólo tras `b532c63`** | No | “Complete” describe implementación/review, no lanes live ni release. |

La tabla es una clasificación auditora, no un nuevo estado de proyecto. Debe
ser sustituida por una proyección generada cuando M0/4/02 exista.

## Hallazgos priorizados

### GOV-01 — “Complete” colapsa implementación, review, promoción y release

**Severidad: High. Confianza: alta.**

En el corte:

- `plan/PROJECT_V5/README.md:3` decía “complete — final independent review OK”,
  aunque V5 sólo era alcanzable desde `develop`.
- `plan/PROJECT_V3/README.md:25-30` seguía marcando todos los stages como
  `backlog`, aunque el trail de reviews los cerraba.
- `plan/README.md:13-15` distinguió correctamente esas divergencias después de
  la auditoría, pero sus frases “absent from current main” y “not promoted”
  quedaron obsoletas al incorporarse ellas mismas a `main@b532c63`.

La corrección de refs cierra el caso concreto “main 78 commits atrás”, pero no
la causa: el estado sigue escrito a mano y no se invalida al mover una ref.

**Cierre verificable.** Un fichero de estado generado desde evidencia nombra
candidate commit/tree, spec/review/test digests y refs observadas. El validador
falla si una claim supera el estado demostrable.

### GOV-02 — Existe una release textual `v0.1.0`, pero no su objeto Git

**Severidad: High. Confianza: alta.**

En el árbol integrado:

- `README.md:7` afirma “Current release: v0.1.0”.
- `CHANGELOG.md:20-24` tiene la sección `[0.1.0] - 2026-06-11`.
- Los manifests reportan versión `0.1.0`.
- El review final de V3 dice expresamente que el tag no se creó y dejó merge,
  tag y push al operador
  (`plan/PROJECT_V3/reviews/D_0_3-1_reviewed_OK.md:48-52,72-85`).
- `git tag --list v0.1.0` sigue vacío.

El review fue correcto al no simular autoridad de operador, pero el copy de
release no distingue “release preparada” de “release publicada”.

**Impacto.** Consumidores y futuras auditorías pueden atribuir garantías a una
versión sin objeto, provenance, checks ni canal de distribución.

**Cierre verificable.** Hasta G8, README/CHANGELOG deben decir “candidate” o
“release prepared”. G8 exige tag anotado, target exacto, manifest y publicación
verificable; sólo entonces se cambia a “Current release”.

### GOV-03 — El checklist MVP acepta tanto pendiente como aceptado

**Severidad: High. Confianza: alta.**

Los 27 criterios de `docs/mvp-acceptance-checklist.md:15-43` permanecen `[ ]`.
El propio documento declara que no se marcan hasta revisión
(`docs/mvp-acceptance-checklist.md:45-52`). Sin embargo, la suite sólo exige 27
filas, evidence no vacío y status en `("[ ]", "[x]")`
(`tests/structure/test_acceptance_checklist.py:16-26`).

El checklist MVP2 marca doce `[x]`
(`docs/mvp2-acceptance-checklist.md:7-20`), mientras el gate estructural busca
tokens/links y no valida los estados ni ejecuta esa evidencia
(`tests/structure/test_mvp2_gate.py:35-67`).

**Impacto.** Tanto un producto completamente pendiente como uno aceptado pasan
el mismo gate. Un path stale o un test skipped sigue contando como evidence.

**Cierre verificable.**

- Cada criterio declara `pending|accepted|waived` y un digest de evidencia.
- `accepted` exige paths existentes y resultados del mismo candidate.
- `waived` exige autoridad, razón y expiración.
- Una claim de readiness falla con cualquier `pending`.

### GOV-04 — El review no está unido criptográficamente al objeto promovido

**Severidad: High. Confianza: alta.**

V3 conserva submissions, KO y OK y a menudo incluye commits/commands. Sin
embargo no existe un manifest de candidato machine-readable que haga
transitiva la relación:

```text
spec digest → change-set → test result → review OK → integration tree
            → main → tag → publication
```

El protocolo V4 ya diseña `baseSha`, `headSha`, `diffSha256`, `specSha256` y
`testManifestSha256` (`plan/PROJECT_V4/reviews/README.md:6-24`) y hace que un
cambio de byte invalide evidencia. Es una fortaleza de diseño, todavía no una
capacidad implementada.

**Cierre verificable.** El validator recalcula todos los digests, comprueba que
el último verdict OK pertenece al mismo change-set y rechaza cherry-picks o
merges cuyo tree no sea el candidato aprobado, salvo un nuevo review.

### GOV-05 — No existe identidad canónica de candidato (G-1)

**Severidad: High. Confianza: alta.**

No se encontró manifest JSON/YAML de candidato. El plan reconoce el hueco:
G-1 inventaría refs/tags/worktrees y decide la línea soportada
(`plan/PROJECT_V4/README.md:17-31,104-117`); M0/0/00 congela base/manifest y
M0/4/00 registra suites/skips. `PLAN_APPROVAL.md:3-24` sigue pending.

Un candidato mínimo necesita:

```json
{
  "schemaVersion": "release-candidate/v1",
  "candidate": {
    "commitSha": "<40-hex>",
    "treeSha": "<40-hex>",
    "sourceBranch": "integration/PROJECT_V4",
    "developBaseSha": "<40-hex>"
  },
  "inputs": {
    "npmLockSha256": "<64-hex>",
    "pythonLockSha256": "<64-hex>",
    "images": [{"name": "redis", "digest": "sha256:..."}]
  },
  "runtimes": {"node": ["..."], "python": ["..."]},
  "gates": [{
    "name": "pr-deterministic",
    "candidateTreeSha": "<40-hex>",
    "passed": 0,
    "skipped": [],
    "evidenceSha256": "<64-hex>"
  }],
  "reviews": [{
    "taskId": "B/1/02",
    "changeSetDigest": "<64-hex>",
    "verdict": "OK",
    "evidenceSha256": "<64-hex>"
  }],
  "promotion": {
    "mainSha": null,
    "tag": null,
    "publishedRef": null
  }
}
```

El sketch no prescribe una herramienta; prescribe datos que el gate ya necesita.

### GOV-06 — El rebaseline V4 es correcto, pero sus primeras ejecuciones son stale

**Severidad: High para inicio de V4. Confianza: alta.**

`plan/PROJECT_V4/README.md:3-7` y `M0/README.md:3-8` declaran que los worktrees
M0/0/00–01 nacieron de `develop@bfab1fb`, mientras el baseline avanzó primero a
`d521afb` y después a `b532c63`. `PLANNING_TRACE.md:44-62` preserva el motivo,
las seis tareas añadidas y el requisito YOLO que llevó el total a 72.

Las branches/worktrees aún existen. Esto es evidencia histórica útil, pero sus
manifests, approvals y reviews no pueden reciclarse: el base y el spec digest
cambiaron. Rebasear en sitio destruiría precisamente la trazabilidad que se
quiere conservar.

**Cierre verificable.** G-1 archiva la integración stale por ref inmutable,
declara `b532c63` o un sucesor como base soportada, y G0 autoriza una integración
nueva. M0/0/00–01 se repiten con nuevos digests.

### GOV-07 — La corrección posterior no actualizó atómicamente la narrativa

**Severidad: Medium/High. Confianza: alta.**

`main` y `develop` ya son `b532c63`, pero `plan/README.md:13-15` en ese mismo
árbol aún afirma que V3 está ausente de `main` y V5 no está promovido. El
documento era correcto para el corte y fue promovido sin una fase
post-promotion que regenerase la vista.

Esto es un finding nuevo de proceso: incluso una corrección bien intencionada
puede crear drift al mezclar “observado en el corte” con “estado actual”.

**Cierre verificable.** Separar:

- `auditSnapshot`: inmutable, con fecha y refs;
- `currentProjection`: generada de Git/manifests;
- `claims`: sólo las que el validator deriva.

La promoción actualiza únicamente la proyección; nunca reescribe el snapshot.

### GOV-08 — El volumen de plan oculta el estado efectivo

**Severidad: Medium. Confianza: alta.**

Medición posterior al rebaseline y anterior a materializar las hojas atómicas
en este mismo handoff (los índices y ficheros incrementan el árbol, pero no el
inventario de tasks):

| Superficie | Ficheros | Líneas |
|---|---:|---:|
| `plan/` | 604 | 37.962 |
| Reviews/handoffs bajo `plan/` | 332 ficheros | incluidos arriba |
| Código productivo JS/Python (`gateway/src`, `cli/src`, `orchestrator-langgraph/src`) | 68 | 11.371 |

El problema no es que exista historia. El problema es que README de proyecto,
README de stage, task specs, checklists, changelog, review handoffs y audit
repiten status con semánticas diferentes.

**Cierre verificable.** Conservar artifacts históricos append-only, pero reducir
la fuente activa a:

1. specs/task IDs;
2. manifest de candidato;
3. ledger de reviews/gates;
4. proyección generada.

`EPICS.md`, `SHEETS.md` y los `TASKS.md` son ahora índices. La autoridad
detallada vive en 12 ficheros `epics/EP-XX.md` y 72 ficheros
`<stage>/<stream>/<task>.md`, lo que evita que un resumen agregado introduzca
otro estado manual.

### GOV-09 — No se puede verificar gobernanza remota

**Severidad: Medium. Confianza: alta sobre la ausencia local.**

No hay remote configurado. Por ello no se pudo comprobar:

- branch protection para `main`/`develop`;
- checks requeridos;
- review approvals del hosting;
- tag protection o release publication;
- provenance de artefactos.

La ausencia de evidencia no demuestra que no exista otro sistema externo, pero
impide usarlo para cerrar G8.

**Cierre verificable.** G-1 registra el canal de publicación soportado; G8
captura URLs/IDs/digests verificables o declara explícitamente release
local-only. Nunca se infiere publicación de un tag local.

### GOV-10 — Los gates G-1/G8 están bien diseñados, pero no tienen validador

**Severidad: Medium/High. Confianza: alta.**

`plan/PROJECT_V4/README.md:104-117` define gates acumulativos y separa la
autoridad. La Definition of Done exige candidate=`main`=tag y estados distintos
(`plan/PROJECT_V4/README.md:161-183`). Hoy son texto: no hay comando que falle
ante contradicción, tag ausente, review stale, suite vacía o skip inesperado.

**Cierre verificable.** Dos comandos puros:

```text
agent-run candidate verify <manifest>
agent-run release verify <manifest> --require-main --require-tag [--require-published]
```

deben producir JSON estable, exit non-zero por cualquier inconsistencia y cero
mutación. Merge/tag/push siguen siendo acciones separadas del operador.

## Delta respecto de planes y auditorías previas

| Tema previo | Estado | Cambio de visión |
|---|---|---|
| Junio: V3 debía añadir CI, lint, licencia y lock | Implementado/revisado y promovido localmente después del corte | Ya no es backlog técnico; sigue sin ser release por falta de tag/candidato. |
| V5: review final OK cerraba implementación | Confirmado | No cierra promotion/live Redis/release; el plan global ahora lo expresa. |
| V4 original: programa propuesto | Rebaselined a 72 tasks | Los worktrees iniciales quedan stale y deben repetirse después de G-1/G0. |
| GOV-01 del corte: planes/checklists divergentes | Abierto | La alineación de ramas corrigió refs, pero generó texto stale post-promotion. |
| PLAN-01: sprawl | Confirmado y medido | 604 ficheros/37.962 líneas justifican vistas canónicas y proyección automática. |
| Release `v0.1.0` | Sigue ausente | README/changelog/manifests son preparación, no release. |

## Fortalezas verificadas

- Los reviews preservan trials KO y OK; no borran la historia incómoda.
- V3 D/0/3 documentó honestamente que no creó tag ni simuló publicación.
- V4 ya separa `planned`, `implemented`, `reviewed`, `integrated`, `promoted` y
  `released`.
- `PLAN_APPROVAL.md` evita usar `approval.respond` legacy como autoridad para
  aprobar el propio plan.
- El protocolo V4 liga review a cinco digests e invalida evidencia por cambio de
  byte.
- Los gates G-1..G8 y H0..H4 nombran autoridad, evidencia y efecto de deny.
- El rebaseline no creó V6: concentra remediación y evita otra capa de planes.
- La alineación local de `main`/`develop` fue una respuesta rápida y
  recuperable al hallazgo REL-01.

## Estrategia de gobernanza

### Fuente de verdad mínima

```text
task specs (intent)
        │
        ▼
change-set/review ledger (evidence)
        │
        ▼
candidate manifest (identity)
        │
        ▼
generated current projection (status)
        │
        ▼
promotion/release attestations (external effects)
```

README, dashboards y checklists consumen esta cadena. No escriben estados por
su cuenta.

### Reglas

1. **Snapshots de auditoría son inmutables.** Nunca se “actualizan” para parecer
   actuales.
2. **Claims actuales son derivadas.** Si cambia una ref, se regenera la vista.
3. **Evidence es content-addressed.** Tests y reviews nombran candidate/tree y
   digests.
4. **Gates no mutan.** Verificar candidato está separado de merge/tag/push.
5. **Autoridad es explícita.** G0, wave acceptance, G8 merge, tag y publication
   son decisiones distintas.
6. **La historia se archiva, no se duplica como estado activo.**

## Milestones ejecutables

| Milestone | Aceptación verificable | Esfuerzo | Riesgo | Dependencias |
|---|---|---:|---|---|
| G-1A — Inventario de baseline | Full SHAs/tree/merge-base de refs, tags y worktrees; línea soportada y ref archive para integración stale. | 1 d | Bajo | Owner decide baseline |
| G-1B — Schema de candidate | Schema versionado, ejemplos válidos/inválidos, hashes de locks/runtimes/suites/skips/reviews. | 1–2 d | Bajo | G-1A |
| G0 — Approval de plan | Envelope externo firmado referencia plan digest, base SHA, wave, expiración y disposition de refs. | <1 d operador | Alto de autoridad | G-1A/B |
| G1 — Validator de estado | Detecta README/claim, checklist, review, ref y tag contradictorios; prueba negativa por cada estado. | 2–4 d | Medio | M0/4/02 |
| G2 — Evidence ledger | Cada task tiene change-set digest, tests y último verdict; KO preservado; stale evidence rechazada. | 3–5 d | Medio | M0/0/01, D |
| G3 — Projection generada | Tabla V0–V5 y checklists se generan/validan; snapshot de auditoría separado del estado actual. | 2–3 d | Bajo | G1/G2 |
| G4 — Candidate lanes | Resultados de suites/live lanes ligados al mismo tree/locks/images y skip budget exacto. | 3–5 d + runs | Alto operativo | Testing milestones |
| G8 — Promotion/release | Review OK, candidate, `main`, tag y published ref son el mismo objeto; approvals separadas; rollback probado. | 1–2 d + operador | Alto | G1–G7 |

## Top 3 diseños

### 1. Manifest de candidato content-addressed

El manifest no contiene “complete” libre. Contiene hechos verificables,
digests y refs. Se firma después de ejecutar lanes y antes de promoción. Mover
una ref no altera el manifest; obliga a emitir una nueva projection/attestation.

### 2. Reducer de estado

```text
task spec exists                         -> planned
+ implementation commit/tree            -> implemented
+ tests on same digest + review OK       -> reviewed
+ reachable from integration/develop    -> integrated
+ main == candidate                      -> promoted
+ tag == main (+ published ref required) -> released
```

Una transición inválida produce error con evidencia ausente. No existe una
operación manual “set complete”.

### 3. Promotion transaction log

Cada efecto externo produce una entrada append-only:

```text
candidate.accepted
develop.integrated
main.promoted
tag.created
remote.published
release.announced
```

Cada entrada liga actor, timestamp, prior state, target SHA/tree y evidence
digest. El log no necesita convertir Git en una transacción distribuida; hace
visible dónde quedó un proceso parcial y permite reanudar o revertir.

## Quick wins

- Cambiar “Current release v0.1.0” por “release candidate/prepared” hasta crear
  y verificar el tag.
- Generar una tabla read-only de refs/tags para el encabezado de `plan/README`.
- Hacer fallar el checklist MVP si una claim de ready convive con cualquier
  `[ ]`.
- Verificar que cada evidence path exista y que los tests citados pertenezcan a
  la ejecución del candidate.
- Añadir `snapshotAt` y `observedRefs` a auditorías; no mezclar con current
  status.
- Archivar las ramas V4 preliminares por ref y prohibir reutilizar sus approvals.
- Añadir un check que compare candidate tree con `main^{tree}` y `tag^{tree}`.

## Decisiones del owner y cuestiones restantes

Decidido: se usa SemVer; las versiones `<1.0.0` son desarrollo/prueba interna,
cada minor debe ser funcional y usable, y el primer MVP mostrable/publicable
será `1.0.0`. Por tanto `v0.1.0` no se crea retroactivamente como release
público.

Cuestiones restantes:

1. ¿El canal de release soportado será local-only o un remote concreto?
2. ¿Un release exige igualdad de commit o basta igualdad de tree? G8 hoy pide
   mismo objeto; conviene confirmar la política para merge commits.
3. ¿Quién firma G-1, G0, aceptación de wave, promoción main, tag y publicación?
4. ¿Qué evidencia histórica debe permanecer navegable y qué vistas pueden
   generarse para reducir sprawl?
5. ¿Los criterios MVP sin revisión humana se aceptarán, se marcarán legacy o
   bloquearán cualquier claim acumulativa?

## Criterio de salida

La gobernanza puede subir a B cuando:

- existe un manifest de candidato validado y content-addressed;
- cada task deriva su estado, sin `complete` manual;
- checklist, tests y review pertenecen al mismo candidate;
- snapshots históricos y proyección actual no se contradicen;
- las 72 tareas V4 conservan IDs únicos y una sola vista canónica;
- G-1/G0 autorizan una integración nueva sobre base vigente;
- G8 demuestra candidate=`main`=tag=published ref o declara explícitamente
  release local-only;
- README y changelog sólo anuncian releases que el validator puede resolver.

Hasta entonces, el trail es valioso para investigación y handoff, pero **no es
todavía un sistema de release evidence**.

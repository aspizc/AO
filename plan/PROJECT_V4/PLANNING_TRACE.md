# Planning provenance — 2026-07-11

## Gateway attempts

El flujo legacy se ejercito antes de aplicar cambios de producto:

| Attempt | Trace / session | Config | Resultado |
|---|---|---|---|
| sandbox | `tr-f5148d78-bd36-4c19-945f-21edd2e035b5` / `ss-6dc44810-c137-432d-8fb0-88f60e450c7b` | `gpt-5.6-sol`, `ultra`, `priority`, read-only | `SESSION_STARTED`; el entorno aislado no completo el transporte; sin artifact |
| real delegate | `tr-d85be0ee-f0df-49ef-891d-7d16c8abbac4` / `ss-cef5b72a-bb03-4fc0-a6da-484d3d1caf90` | misma config | adapter termino `exitCode=-1` al timeout automatico legacy; sin artifact |

No se presenta ninguno como plan aprobado ni se inventa un `artifactId`.

## Correccion de workflow

La skill `interactive-gateway-orchestration` se actualizo y valido para usar
`agent.spawn` + `ask/view/kill`, sin deadlines automaticos de session y sin
fallback silencioso a `delegate`.

El preflight real del registry actual devolvio:

```json
{
  "decision": "deny",
  "reason": "role planner denies action agent.spawn",
  "ruleId": "role.deny_action"
}
```

Por tanto, se detuvo correctamente el relanzamiento spawn. M0/0/01 registra el
bootstrap y B/1/01 separa actor `orchestrator` de target `planner`; hasta ese
fix revisado no se elude policy ni se vuelve a delegate.

## Evidencia de plan

- Tres subauditorias independientes revisaron Gateway, testing/ops y V1.
- Sus KO iniciales se incorporaron: bootstrap externo, G0 externo, 64 tareas
  atomicas, authority channel-bound, audit minimization, signer replay-safe,
  B findings, Temporal V2/idempotency/history y lanes separadas.
- Validacion local: 64 IDs unicos, cero refs desconocidas, cero links rotos;
  `tests/structure`: 102 passed.
- `PLAN_APPROVAL.md` permanece pending; no hay implementacion de producto.

## Revalidacion de plan — 2026-07-26

La auditoria integral posterior no reescribe la evidencia 2026-07-11. Registra
un nuevo baseline y explica por que los trials preliminares no pueden reutilizarse:

- `develop` avanzo de `bfab1fb` a `d521afb`; `main` quedo en `41d194a`.
- La auditoria independiente V5 inspecciono `develop`, no el `main` actual.
- La integracion V4 y M0/0/00–01 existentes conservan valor forense, pero cambiar
  `developBaseSha` invalida su manifest/digest segun su propio contrato.
- Tres subauditorias nuevas cubrieron architecture/core, security/ops y
  testing/release; no leyeron datos personales ni mutaron producto/infra.
- Se añadieron seis tareas atomicas: M0/4/00–02 (gate/Redis/status),
  B/3/02–03 (data lifecycle) y C/0/03 (inventory/recovery). El plan revisado
  tenia 70 tareas al cerrar la auditoria.
- El owner añadio despues el requisito de launch `workspace-yolo` y
  `host-unconfined`. B/2/03 y C/0/04 lo modelan mediante grants firmados,
  action-bound y revocables; el total pasa a 72 tareas.
- En ese corte, G-1 precedía G0, `PLAN_APPROVAL.md` seguía pending y la
  actualización no autorizaba reutilizar approvals, implementar, mergear,
  taggear ni pushear.

## Decisión posterior del owner — ejecución V5

La autorización posterior no reescribe el corte anterior. G-1 y G0 quedaron
resueltos sobre `main == develop == 85f7ab9`; la implementación se ejecuta una
sola vez mediante las hojas V5 y el ledger V4→V5. La decisión, alcance,
vigencia y acciones que siguen fuera de alcance están en
[`PLAN_APPROVAL.md`](PLAN_APPROVAL.md).

## Materialización detallada — 2026-07-26

El owner pidió que la auditoría global y el plan fueran visibles por área,
épica y ficha, no sólo como un resumen y varios `TASKS.md`. La materialización
añade:

- nueve documentos autónomos en
  [`../../audit/2026-07-26-project-wide/`](../../audit/2026-07-26-project-wide/README.md);
- [`EPICS.md`](EPICS.md), como índice de
  [12 hojas de épica detalladas](epics/README.md) que agrupan el programa sin
  crear nuevas unidades de ejecución;
- [`SHEETS.md`](SHEETS.md), como índice de 72 fichas físicas
  `<stage>/<stream>/<task>.md`, una por cada ID existente;
- 19 índices de stream y seis índices de stage para navegar las fichas sin
  depender de un documento agregado;
- trazabilidad área→task→gate en [`AUDIT.md`](AUDIT.md).

No se renumera ni duplica ninguna tarea: los antiguos `TASKS.md`, `EPICS.md` y
`SHEETS.md` quedan como registros enlazados y la autoridad detallada pasa a los
84 ficheros físicos. Las fichas hacen explícitos objetivo, scope, evidencia,
acceptance, tests, dependencias, esfuerzo, riesgo y estado. Todas permanecen
`planned`; generar documentación de planificación no satisface RED/GREEN,
review, gate, integración ni approval.

Como corrección operativa posterior al corte, `main` y `develop` se alinearon
localmente. Esto incorpora V3/V5 y los documentos, pero no crea el tag
`v0.1.0`, una publicación remota ni un candidato G8. G-1 y G0 continúan
pendientes.

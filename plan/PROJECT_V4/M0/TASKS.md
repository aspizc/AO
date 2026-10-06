# M0 — Índice de hojas atómicas

Este fichero es un índice; las especificaciones canónicas viven en los ficheros
`M0/<stream>/<task>.md` enlazados a continuación. Estado reconciliado:
**M0/4/00 absorbida; M0/0/00, M0/3/00, M0/4/01 y M0/4/02 parciales; las
demás tareas siguen planificadas; G-1/G0 autorizados**. V5 conserva la
propiedad de implementación y no se programa trabajo V4 duplicado.

## M0/0 — Base y bootstrap de review

[Índice del stream](0/README.md)

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [M0/0/00](0/00.md) | Reconciliar topología de release y congelar base/manifest | [EP-00](../epics/EP-00.md) | Parcial |
| [M0/0/01](0/01.md) | Harness bootstrap seguro de review | [EP-09](../epics/EP-09.md) | Planificada |
## M0/1 — KYA

[Índice del stream](1/README.md)

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [M0/1/00](1/00.md) | KYA profile y policy | [EP-01](../epics/EP-01.md) | Planificada |
| [M0/1/01](1/01.md) | KYA runner y verdict | [EP-01](../epics/EP-01.md) | Planificada |
| [M0/1/02](1/02.md) | Prompts y runbook KYA | [EP-01](../epics/EP-01.md) | Planificada |
## M0/2 — Modelos y activación

[Índice del stream](2/README.md)

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [M0/2/00](2/00.md) | Schema, registry y policy de modelos | [EP-01](../epics/EP-01.md) | Planificada |
| [M0/2/01](2/01.md) | Adapters y service tier | [EP-01](../epics/EP-01.md) | Planificada |
| [M0/2/02](2/02.md) | Consumidores y activación | [EP-01](../epics/EP-01.md) | Planificada |
## M0/3 — Supply chain

[Índice del stream](3/README.md)

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [M0/3/00](3/00.md) | SCA npm completo y lock corregido | [EP-00](../epics/EP-00.md) | Parcial |
## M0/4 — Release confidence

[Índice del stream](4/README.md)

| Tarea | Título | Épica | Estado |
|---|---|---|---|
| [M0/4/00](4/00.md) | Gate reproducible y manifest de suites/skips | [EP-00](../epics/EP-00.md) | Absorbida/entregada |
| [M0/4/01](4/01.md) | Redis 7 y V5 concurrente required | [EP-11](../epics/EP-11.md) | Parcial |
| [M0/4/02](4/02.md) | Estado, aceptación y promoción verificables | [EP-00](../epics/EP-00.md) | Parcial |

Reconciliación adicional: `M0/2/01` → V5 H/0/00 como source/resolver de la
matriz provider/model/effort/tier + D/0/01 como owner de argv/audit parity y
fail-before-child.

[← Proyecto V4](../README.md) · [Catálogo global de tareas](../SHEETS.md)

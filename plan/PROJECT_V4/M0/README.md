# Milestone M0 — Base e intake selectivo

Estado: **absorción V5 en curso**. M0/4/00 está absorbida; M0/0/00, M0/3/00,
M0/4/01 y M0/4/02 están parciales; las demás tareas conservan su estado. Las
doce subtareas atomicas estan en
sus [ficheros individuales](TASKS.md), organizados bajo `M0/<stream>/<task>.md`.
Cada una dura como maximo un dia y produce un commit/review independiente.
Los commits/reviews preliminares M0/0/00–01 basados en `bfab1fb` deben
preservarse como historia, pero no satisfacen estas tareas tras el cambio de
`develop`. La implementación restante pertenece a V5; no se programan ramas o
reviews V4 duplicadas.

| ID | Titulo | Depende de |
|---|---|---|
| [M0/0/00](0/00.md) | Reconciliar topologia de release y congelar base/manifest | G-1, G0 externo |
| [M0/0/01](0/01.md) | Harness bootstrap seguro de review | M0/0/00 |
| [M0/1/00](1/00.md) | Port KYA profile/policy | M0/0/01 |
| [M0/1/01](1/01.md) | Port KYA runner + verdict | M0/1/00 |
| [M0/1/02](1/02.md) | Port prompts/runbook | M0/1/01 |
| [M0/2/00](2/00.md) | Model schema/registry/policy | M0/0/01 |
| [M0/2/01](2/01.md) | Adapters + service tier | M0/2/00 |
| [M0/2/02](2/02.md) | Clientes/profiles/docs + activacion | M0/2/01, M0/1/02 |
| [M0/3/00](3/00.md) | SCA npm completo y lock corregido | M0/0/00 |
| [M0/4/00](4/00.md) | Gate reproducible y manifest de suites/skips | M0/0/00 |
| [M0/4/01](4/01.md) | Redis 7/V5 concurrente required | M0/4/00 |
| [M0/4/02](4/02.md) | Estado/aceptacion/promocion verificables | M0/4/00, M0/4/01 |

Salida M0-ready: tree SHA de integracion recuperable, gate V3 verde,
KYA/modelos portados por piezas, `npm audit --omit=dev` sin high/critical no
aceptados, Redis 7 required y estado V0–V5 ligado al candidate SHA. Stage A
consume ese tree; G1 se cierra despues de A/0/00–02.

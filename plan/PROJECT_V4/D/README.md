# Stage D — Doble revision restricted

Estado: backlog. [`TASKS.md`](TASKS.md) enlaza siete fichas atómicas.

| ID | Titulo | Depende de |
|---|---|---|
| [D/0/00](0/00.md) | Roles y artifact schemas | B/5/02 |
| [D/0/01](0/01.md) | Change manifest + Reviewer A | D/0/00 |
| [D/0/02](0/02.md) | Reviewer B raw/read-only | D/0/01 |
| [D/1/00](1/00.md) | State reducer dual-review | D/0/02 |
| [D/1/01](1/01.md) | Gate evaluator | D/1/00, B/2/02 |
| [D/1/02](1/02.md) | Migrar runner/prompts | D/1/01, C/0/02 |
| [D/1/03](1/03.md) | E2E y cierre bootstrap | D/1/02 |

D/1/03 cierra G6. Reviewer A nunca aprueba codigo. Reviewer B revisa el source
real mediante mount RO y dispone concerns A y findings B sobre el mismo digest.

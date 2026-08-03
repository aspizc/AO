# Stage E — Contencion y convergencia V1

Estado: backlog. [`TASKS.md`](TASKS.md) enlaza dieciséis fichas atómicas en sus
directorios de stream. V1 sigue experimental/opt-in; Temporal será canónico
sólo para ITRP.

| Stream | IDs | Objetivo |
|---|---|---|
| [E/0](0/README.md) | 00–02 | Fence/Python y dos bugs fail-closed |
| [E/1](1/README.md) | 00–07 | Contrato, V2, Gateway, idempotencia, approval/review, replay, cutover |
| [E/2](2/README.md) | 00–03 | Tres lanes reales + promotion gate |
| [E/3](3/README.md) | 00 | Retirar ITRP LangGraph |

## Gates H

| Gate | Aprobador/evidencia/digest | Momento y efecto de deny |
|---|---|---|
| H0 | Owner; G0 + A/0/00 + E/0/00 tree SHA | One-shot: retener V1 fenced. Deny=V1 disabled/branch-out. |
| H1 | Owner + architecture reviewer; ADR/golden/normative V2 digest | Tras E/1/00. Deny=no V2 implementation. |
| H2 | Owner + security reviewer; approval/review contract E/1/04–05 digest | Antes de replay/cutover. Deny=V1 disabled. |
| H3 | Operador; candidate SHA, env, budget y expiry | Por cada agents-real. Deny=run no inicia. |
| H4 | Owner; mismo candidate SHA/locks/images, 5 Temporal + stack + agents green | Antes de E/3/00. Deny=legacy permanece fenced. |

G7 exige E/2/03 y E/3/00. Los gates se registran con expiracion cuando aplica;
un cambio de digest los invalida.

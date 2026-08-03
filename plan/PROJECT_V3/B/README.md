# Stage B — Correctitud y critico

Estado: backlog.

## Objetivo del stage

Cerrar los hallazgos Critical/High de correctitud de la auditoria: licencia
(unico Critical), unificacion del manejo de errores duplicado en la
orquestacion Python, decision explicita sobre la semantica deny-list/
default-allow del motor de politicas, y dos fixes pequenos del Gateway
(auditoria de frontera acoplada a telemetria, fallback silencioso del
secreto). Es el Milestone 1 de [`../AUDIT.md`](../AUDIT.md).

Invariante: cualquier cambio de comportamiento del Gateway queda fijado antes
por un test de caracterizacion (Stage A y B/0/2) y, donde aplica, por ADR.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [B/0/0](0/00.md) | LICENSE MIT (Carlos Asensio Pizarro) | — | `feature/V3-B-0-0-mit-license` |
| [B/0/1](0/01.md) | Contrato compartido de errores en `orchestrator-langgraph` | A/0/0 (hard), A/0/2 (soft) | `feature/V3-B-0-1-shared-tool-contracts` |
| [B/0/2](0/02.md) | ADR-008: semantica de acciones por rol + matriz de caracterizacion | A/0/1 | `feature/V3-B-0-2-role-semantics-adr` |
| [B/0/3](0/03.md) | Desacoplar audit `MCP_TOOL_CALL` de la telemetria | — | `feature/V3-B-0-3-tool-call-audit-decouple` |
| [B/0/4](0/04.md) | Warning en el fallback del secreto de mensajes | — | `feature/V3-B-0-4-secret-fallback-warning` |

## Criterio de salida del stage

- `LICENSE` MIT existe y `docs/license-decision-needed.md` registra la
  decision del owner.
- Existe un unico punto de deteccion de errores de tool en
  `orchestrator-langgraph` (modulo compartido) y el contrato de error del
  Gateway esta documentado.
- ADR-008 aceptado: la semantica deny-list/allowlist es una decision
  explicita con matriz rol×accion testeada.
- `MCP_TOOL_CALL` se audita con telemetria apagada (configuracion por
  defecto), o el acoplamiento queda documentado y testeado como decision.
- El fallback del secreto emite warning estructurado a stderr.

## Que NO se hace en este stage

- No se anaden tools MCP nuevas ni cambia ningun schema de entrada.
- No se reescribe el motor de politicas mas alla de lo que ADR-008 decida
  para la capa de roles.
- No se tocan dependencias Python (eso es C/0/0).

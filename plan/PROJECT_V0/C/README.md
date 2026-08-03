# Stage C — Policy engine determinista

## Objetivo del stage

Implementar el motor de evaluacion de policy: dado un contexto `(agent, role, repo, action, ...)`, devolver `allow | deny | require_approval | allow_with_sanitization`. Determinista, sin red, sin LLM.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [C/0/0](0/00.md) | Policy types, actions, decision model | B/0/4 | `feature/C-0-0-policy-model` |
| [C/0/1](0/01.md) | Classification boundary rules | C/0/0 | `feature/C-0-1-classification-policy` |
| [C/0/2](0/02.md) | Role and orchestrator rules | C/0/1, B/0/2 | `feature/C-0-2-role-policy` |
| [C/0/3](0/03.md) | Approval policy rules | C/0/2 | `feature/C-0-3-approval-policy` |
| [C/0/4](0/04.md) | Sanitization policy rules | C/0/2 | `feature/C-0-4-sanitization-policy` |
| [C/0/5](0/05.md) | Policy explain API and table tests | C/0/0..4 | `feature/C-0-5-policy-explain-tests` |

## Criterio de salida del stage

- `evaluate(context, registries)` exporta una funcion **pura** y serializable.
- >= 20 tests unitarios pasan, cubriendo §13.3 V4 y los casos canonicos.
- `explain(context)` devuelve detalle suficiente para CLI humana.

## Que NO se hace en este stage

- Audit (eso lo conecta el Gateway en G/0/2).
- I/O ni dependencias externas.
- Cambiar el comportamiento del modelo segun "intencion" — el motor es deterministico y simbolico.

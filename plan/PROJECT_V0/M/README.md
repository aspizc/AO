# Stage M — Sanitization layer

## Objetivo del stage

Convertir raw restricted en sanitized de forma deterministica al guardar y al cruzar fronteras de clasificacion. Fail-closed: si el sanitizer falla, el artefacto raw nunca se devuelve.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [M/0/0](0/00.md) | Sanitization rules registry | B/0/0 | `feature/M-0-0-sanitization-rules` |
| [M/0/1](0/01.md) | Sanitizer core | M/0/0 | `feature/M-0-1-sanitizer-core` |
| [M/0/2](0/02.md) | Automatic sanitized artifact generation | M/0/1, L/0/0, D/0/0 | `feature/M-0-2-auto-sanitize-artifacts` |
| [M/0/3](0/03.md) | Fail-closed sanitization behavior | M/0/2, L/0/2 | `feature/M-0-3-sanitization-fail-closed` |

## Criterio de salida del stage

- Reglas declarativas en `policies/sanitization-rules.json`.
- `put` raw restricted genera artefacto sanitized linkado por `sanitized_from`.
- `SANITIZATION_APPLIED` auditado.
- Sanitizer failure deniega cross-boundary `get`, no devuelve raw.

## Que NO se hace en este stage

- Compartir artefactos cross-role (eso es N).
- Reemplazar sanitizer por LLM (post-MVP).

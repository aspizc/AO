# Stage B — Registries y JSON Schemas

## Objetivo del stage

Materializar los tres registries declarativos (`agent-capabilities.json`, `repositories.json`, `roles.json`) y los JSON Schemas de los objetos de dominio. La policy del Stage C es **data-driven**, asi que estos archivos son la fuente de verdad.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [B/0/0](0/00.md) | Agent capabilities registry | A/0/6 | `feature/B-0-0-agent-capabilities-registry` |
| [B/0/1](0/01.md) | Repository classification registry | B/0/0 | `feature/B-0-1-repository-registry` |
| [B/0/2](0/02.md) | Roles registry | B/0/0 | `feature/B-0-2-roles-registry` |
| [B/0/3](0/03.md) | Core JSON schemas | A/0/5 | `feature/B-0-3-json-schemas` |
| [B/0/4](0/04.md) | Registry loader | B/0/0..3 | `feature/B-0-4-registry-loader` |
| [B/0/5](0/05.md) | Registry validation command | B/0/4, A/0/3 | `feature/B-0-5-policy-validate-command` |

## Criterio de salida del stage

- Tres registries presentes, validos y autocontenidos (sin paths absolutos del operador).
- Seis schemas presentes con `$id` y `version`.
- `agent-run policy validate` exit 0 con registries actuales y exit != 0 con fixtures rotos.

## Que NO se hace en este stage

- Logica de evaluacion de policy: eso es C.
- Persistencia: F.
- Nada que requiera leer codigo de los repos reales.

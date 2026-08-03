# Stage D — Pulido y release v0.1.0

Estado: backlog.

## Objetivo del stage

Cerrar los hallazgos Medium/Low restantes (tests de telemetria, trace
access y caminos de error del servidor MCP; composicion del sanitizador;
timings fragiles) y cortar la primera release etiquetada del proyecto
(v0.1.0), marcando formalmente el cierre de MVP2.0 y dejando el repo podado.
Es el Milestone 3 de [`../AUDIT.md`](../AUDIT.md).

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [D/0/0](0/00.md) | Tests de `telemetry.js`, `trace_access.js` y errores de `mcp_server.js` | B/0/3 | `feature/V3-D-0-0-core-observability-tests` |
| [D/0/1](0/01.md) | Tests de composicion/precedencia del sanitizador | — | `feature/V3-D-0-1-sanitizer-composition-tests` |
| [D/0/2](0/02.md) | Robustecer timings de `approval_wait.test.js` | — | `feature/V3-D-0-2-approval-wait-timings` |
| [D/0/3](0/03.md) | Release v0.1.0 + poda de ramas | A, B, C y D/0/0..2 | `feature/V3-D-0-3-release-0-1-0` |

## Criterio de salida del stage

- `telemetry.js`, `trace_access.js` y los caminos de error del handler MCP
  tienen tests directos.
- La composicion de reglas del sanitizador esta fijada por tests.
- Ninguna suite del gate depende de margenes de tiempo < 100ms.
- Existe el tag `v0.1.0`, el CHANGELOG tiene su seccion de release, y las
  ramas `feature/*` mergeadas en `develop` estan podadas.

## Que NO se hace en este stage

- No se anaden features ni se cambia comportamiento del sanitizador o la
  telemetria: solo se fija el existente con tests.
- No se publica en ningun registry (npm/PyPI): la release es tag + CHANGELOG.

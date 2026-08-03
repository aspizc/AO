# Stage A — Red de seguridad y gates

Estado: backlog.

## Objetivo del stage

Que ningun cambio posterior de V3 (ni de cualquier proyecto futuro) pueda
romper el repo sin deteccion: el gate local `scripts/ci.sh` ejecuta TODAS las
suites (incluida `orchestrator-langgraph/`), el nucleo de autorizacion
(`policy_engine.js`) tiene tests unitarios directos, hay linting aplicado, y
GitHub Actions ejecuta el gate en remoto. Es el Milestone 0 de
[`../AUDIT.md`](../AUDIT.md): la red de seguridad previa a cualquier
refactor de los stages B-D.

Invariante: este stage no cambia comportamiento de produccion del Gateway;
solo anade tests, tooling y limpieza del arbol.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [A/0/0](0/00.md) | Gate completo: orchestrator-langgraph en `ci.sh` | — | `feature/V3-A-0-0-full-ci-gate` |
| [A/0/1](0/01.md) | Tests unitarios directos de `policy_engine.js` | — | `feature/V3-A-0-1-policy-engine-tests` |
| [A/0/2](0/02.md) | Linting: ruff + eslint cableados a `ci.sh` | A/0/0 | `feature/V3-A-0-2-lint-gate` |
| [A/0/3](0/03.md) | GitHub Actions minimo + ADR-007 | A/0/2 | `feature/V3-A-0-3-github-actions` |
| [A/0/4](0/04.md) | Higiene del arbol: `.git/` vacios y docs v4 | — | `feature/V3-A-0-4-tree-hygiene` |

## Criterio de salida del stage

- `./scripts/ci.sh` ejecuta las suites de `orchestrator-langgraph/` y falla si
  alguna se rompe.
- `tests/gateway/policy_engine.test.js` existe con >= 15 casos y cubre los 4
  helpers y el comportamiento default-allow del pipeline.
- `ci.sh` falla ante errores de ruff o eslint.
- Un push o PR a `develop`/`main` dispara el workflow de Actions y este
  ejecuta `scripts/ci.sh` completo.
- No quedan directorios `.git/` vacios anidados en el repo.

## Que NO se hace en este stage

- No se modifica `gateway/src/core/policy_engine.js` ni ningun otro codigo de
  produccion (eso es Stage B); solo tests y tooling.
- No se reformatea masivamente el codigo: el autofix inicial de lint se acota
  a reglas seguras y se revisa a mano.
- No se anade CD ni despliegue; solo CI de tests.

# Stage A — Foundation & Safety

## Objetivo del stage

Crear los cimientos del proyecto: estructura de carpetas, metadata del repo, scaffolds Node y Python ejecutables pero vacios, documentacion de arquitectura, ADRs, CI minimo y **threat model**. Sin este stage cerrado no se permite avanzar a `B`.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [A/0/0](0/00.md) | Project directory architecture | — | `feature/A-0-0-folder-architecture` |
| [A/0/1](0/01.md) | Repository metadata, gitignore, changelog | A/0/0 | `feature/A-0-1-repo-metadata` |
| [A/0/2](0/02.md) | Gateway Node scaffold | A/0/0, A/0/1 | `feature/A-0-2-gateway-node-scaffold` |
| [A/0/3](0/03.md) | Python CLI scaffold | A/0/0, A/0/1 | `feature/A-0-3-python-cli-scaffold` |
| [A/0/4](0/04.md) | Architecture documentation and ADRs | A/0/0 | `feature/A-0-4-architecture-docs` |
| [A/0/5](0/05.md) | Local CI and first green scaffold | A/0/2, A/0/3, A/0/4 | `feature/A-0-5-first-green-ci` |
| [A/0/6](0/06.md) | Threat model and abuse cases | A/0/5 | `feature/A-0-6-threat-model` |

## Criterio de salida del stage

- Estructura de carpetas commiteada.
- `npm --prefix gateway test` y `pytest cli/` pasan (aunque casi vacios).
- `./scripts/ci.sh` verde.
- `docs/architecture.md`, ADRs 001-003 y `docs/threat-model.md` presentes.

## Que NO se hace en este stage

- Codigo de negocio, policy real, MCP tools, adapters. Todo eso es de stages posteriores.
- Configuracion para IDEs concretos (Cursor / Antigravity son fuera de scope).

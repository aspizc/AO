# Stage E — CLI auxiliar (`agent-run`)

## Objetivo del stage

Dotar al operador de una CLI Python (`agent-run`) para validar registries, consultar policy y leer audit, sin necesidad de Cursor/Antigravity ni del Gateway corriendo.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [E/0/0](0/00.md) | `agent-run policy validate` | B/0/5 | `feature/E-0-0-agent-run-policy-validate` |
| [E/0/1](0/01.md) | `agent-run policy check` | C/0/5, E/0/0 | `feature/E-0-1-agent-run-policy-check` |
| [E/0/2](0/02.md) | Rich human output and `--json` mode | E/0/1, D/0/3 | `feature/E-0-2-cli-rich-output` |

## Criterio de salida del stage

- Comandos canonicos del Anexo D V4 funcionan:
  - `agent-run policy validate`
  - `agent-run policy check --agent claude-code --role orchestrator --repo cvision --action artifact.get --artifact-kind raw_diff` → DENY
  - `agent-run policy check --agent claude-code --role orchestrator --repo cvision --action task.assign --target-agent gemini-cli --target-role restricted-coder` → ALLOW
- `--json` produce salida valida para automatizacion.

## Que NO se hace en este stage

- Comandos relacionados con Gateway o approvals (Q/0/3 lo anade).
- UI grafica.

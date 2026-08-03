# Project V2 - Advanced operator workflows

Project V2 contains post-MVP2.0 workflow extensions that make the Gateway more
useful as an operator-facing coordination system.

## Stages

| Stage | Topic | Status |
|---|---|---|
| [B](B/README.md) | Advanced planning workflow | Backlog |

Nota: cualquier draft previo de Stage A queda fuera del alcance activo de
Project V2 mientras se implementa Stage B.

## Global constraints

- The Gateway remains the enforcement boundary.
- Human-facing planning must be interactive before any planner draft is treated
  as actionable.
- `agent.delegate` may be used for bounded non-interactive tasks, but advanced
  planning sessions must use `agent.spawn` + `agent.ask` when human interaction
  or iterative clarification is required.
- No task may push remotely or touch restricted repositories without explicit
  operator approval and policy allowance.
- Project V2 branches use `feature/V2-...` unless a repository hook or CI rule
  rejects that pattern. If such a rule exists, the first task in a stage must
  update the documented branch prefix before implementation begins.

# Stage X — Lanzamiento del orquestador desde terminal (MVP2.0)

## Objetivo del stage

Entregar todo lo necesario para que un operador, desde una terminal, conecte
**cualquier host MCP** como orquestador y dirija el flujo de 2 agentes
supervisados (coder Codex `gpt-5 medium` + reviewer Claude `opus-4.7`) a traves
del gateway. No se crea ningun proceso orquestador (ADR-002): se entrega
configuracion generica, system prompt y runbook.

## Decisiones de diseno (MVP2.0)

- **Host generico**: no hay script atado a un CLI concreto. Se entrega un perfil
  MCP (`mcp.json`) + env preset + system prompt; el operador los carga en su host
  favorito (Claude Code, Gemini, u otro cliente MCP).
- **Agentes supervisados**: el orquestador usa `agent.spawn`/`ask`/`view` (tmux),
  no one-shot.
- **Real, no dry-run**: el perfil pone `AGENTS_DRY_RUN=0`. Se documenta como
  probar primero en dry-run.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [X/0/0](0/00.md) | Perfil MCP de 2 agentes (real) | T/0/0, W/0/2 | `feature/X-0-0-two-agent-mcp-profile` |
| [X/0/1](0/01.md) | System prompt orquestador MVP2.0 | T/0/1, X/0/0 | `feature/X-0-1-orchestrator-prompt-mvp2` |
| [X/0/2](0/02.md) | Runbook de operador MVP2.0 | X/0/1, R/0/0 | `feature/X-0-2-mvp2-runbook` |

## Criterio de salida del stage

- Existe un perfil `client-config/profiles/codex-coder-claude-reviewer/` con
  `mcp.json` + `.env.example` que cablea Codex coder (gpt-5 medium,
  workspace-write) y Claude reviewer (opus-4.7), apuntando al perfil de policies
  MVP2 (W/0/2).
- Hay un system prompt especifico que instruye al host a ejecutar el flujo de 2
  agentes supervisados respetando policy, sanitizacion y approvals.
- Un runbook reproducible lleva al operador de "clonar" a "orquestacion completa"
  paso a paso, incluyendo como hacer attach a las sesiones tmux.

## Que NO se hace en este stage

- El E2E real automatizado ni el gate (Stage Y).
- Configurar IDEs concretos (fuera de scope del proyecto).
- Un binario/proceso orquestador (prohibido por ADR-002).

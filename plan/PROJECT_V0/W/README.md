# Stage W — Codex real como coder (MVP2.0)

## Objetivo del stage

Activar Codex como agente **coder real** (no dry-run), tanto headless como
supervisado en tmux, usando `gpt-5` con reasoning effort `medium` y sandbox
`workspace-write`. Hoy el codex adapter (P/0/0) esta dormido: en modo real lanza
`ADAPTER_NOT_IMPLEMENTED` y esta `enabled: false` en el registry.

Este stage realiza y supera las tareas planificadas P/0/1 (headless) y P/0/2
(supervised) con la seleccion de modelo de Stage V ya integrada, y deja Codex
listo para el flujo de 2 agentes del MVP2.0.

## Contexto MVP2.0

Codex es el **coder**; Claude (Stage V) es el **reviewer**. El operador lanzara
ambos en sesiones tmux supervisadas a traves del gateway. Codex sigue:

- prohibido en repos `restricted` (lo garantiza la policy de C/0/1);
- **deshabilitado por defecto** en el registry de produccion; se habilita solo
  via el perfil de operador del MVP2.0 (W/0/2).

## Comando real validado (codex-cli 0.133.0)

```bash
# headless one-shot
codex exec -m gpt-5 -c model_reasoning_effort="medium" \
  -s workspace-write -C <cwd> "<prompt>"

# supervisado (interactivo en tmux)
codex -m gpt-5 -c model_reasoning_effort="medium" -s workspace-write -C <cwd>
```

`-m` selecciona modelo, `-c model_reasoning_effort=...` el effort, `-s` el
sandbox, `-C` el working root. El gateway sigue aplicando su propio cwd
allowlist (`assertSafeCwd`) ademas del `-C` de codex.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [W/0/0](0/00.md) | Codex real headless delegate | P/0/0, V/0/1 | `feature/W-0-0-codex-headless-delegate` |
| [W/0/1](0/01.md) | Codex supervised tmux | W/0/0, H/0/1, H/0/2 | `feature/W-0-1-codex-supervised-tmux` |
| [W/0/2](0/02.md) | Perfil de habilitacion de Codex | W/0/1, C/0/1 | `feature/W-0-2-codex-enable-profile` |

## Criterio de salida del stage

- `codex exec` real funciona como `agent.delegate` con `gpt-5`/`medium`/`workspace-write`.
- Codex supervisado funciona como `agent.spawn`/`ask`/`view`/`kill` en tmux.
- `restricted` sigue denegado **antes** de cualquier proceso.
- El registry de produccion mantiene `codex.enabled = false`; existe un perfil
  de operador que lo habilita solo para `unrestricted`/`internal`.
- Tests con binario fake cubren todo; el `codex` real solo lo ejecuta el operador.

## Que NO se hace en este stage

- Habilitar Codex por defecto para todos los operadores.
- Codex en `restricted`.
- El launcher/perfil MCP completo (Stage X) ni el E2E real (Stage Y).

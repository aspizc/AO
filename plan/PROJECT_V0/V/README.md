# Stage V — Seleccion de modelo en adapters (MVP2.0)

## Objetivo del stage

Permitir que el orquestador elija **que modelo** usa cada agente hijo en cada
invocacion: por ejemplo `gpt-5` con reasoning effort `medium` para Codex y
`claude-opus-4-7` para Claude. Hoy ningun punto del sistema (registry, tool
schema, service, adapter) conoce el concepto de modelo, asi que el MVP1 siempre
usa el modelo por defecto de cada CLI.

Este stage es la **base** del MVP2.0: sin seleccion de modelo no se puede pedir
"coder Codex gpt-5 medium + reviewer Claude Opus 4.7".

## Contexto MVP2.0

El objetivo final es lanzar desde una terminal un host MCP generico que actue de
orquestador y coordine **2 agentes supervisados** (tmux):

- **coder** = Codex (`gpt-5`, reasoning effort `medium`, sandbox `workspace-write`)
- **reviewer** = Claude Code (`claude-opus-4-7`)

Stage V entrega el plumbing de modelo. Stage W activa Codex real. Stage X entrega
el perfil/launcher generico. Stage Y cierra con E2E real y gate.

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [V/0/0](0/00.md) | Modelos en registry + policy | B/0/*, C/0/1 | `feature/V-0-0-model-registry-policy` |
| [V/0/1](0/01.md) | Propagar `model` por tools y service | V/0/0, K/0/1 | `feature/V-0-1-model-plumbing` |
| [V/0/2](0/02.md) | Claude adapter honra `model` (Opus 4.7) | V/0/1, O/0/1 | `feature/V-0-2-claude-model-select` |

## Criterio de salida del stage

- El registry declara, por agente, una lista de `models` permitidos y un
  `defaultModel`; Codex declara ademas `reasoningEfforts` permitidos y default.
- La policy rechaza un `model` no permitido **antes** de invocar el adapter, con
  decision auditada.
- `agent.delegate` y `agent.spawn` aceptan `model` opcional (y `reasoningEffort`
  opcional para Codex); si se omiten, se usa el default del registry.
- El Claude adapter lanza `claude --model <id>` en headless y supervised; default
  `claude-opus-4-7`. Cubierto por tests con binario fake.
- Gemini sigue funcionando sin cambios de comportamiento (model opcional, default
  preservado).

## Que NO se hace en este stage

- Implementar Codex real (eso es Stage W).
- El launcher / perfil generico (Stage X).
- Validar contra catalogos de modelos remotos: la lista permitida es local y
  versionada en `policies/agent-capabilities.json`.

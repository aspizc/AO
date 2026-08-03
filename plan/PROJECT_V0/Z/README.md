# Stage Z — Planificacion asistida por planner (planner+coder loop)

## Objetivo del stage

Permitir lanzar un **planner** (Claude Opus 4.7) que ayude al humano a definir y
refinar el plan del proyecto y sus tareas (`plan/PROJECT_V0/<stage>/<task>.md`), en un bucle
iterativo de dos agentes coordinado por el host orquestador:

```text
1. draft     : planner redacta/refina el plan CON el humano  -> artifact.put.plan
2. apply     : coder escribe los cambios en plan/*.md          (code.write)
3. review    : planner revisa lo que aplico el coder y corrige -> artifact.put.review_notes
4. escalate  : el planner marca decisiones mal definidas/dudas -> el orquestador
               las pregunta al humano (in-band y/o approval.request)
5. converge  : se repite 1-4 hasta que el humano aprueba el resultado
```

El planner **propone y revisa**; el coder **escribe**; el humano **decide**. Ningun
agente toca codigo de produccion del gateway ni `policies/` — solo `plan/*.md`.

## Decisiones de diseno

- **planner draft + coder apply** (elegido por el operador): el planner no escribe
  ficheros; un coder (claude-code, rol `coder`) aplica el plan aprobado. El planner
  ademas **revisa** la aplicacion del coder y registra correcciones.
- **Mismo agente, dos roles**: en la practica claude-code asume `planner` en las
  fases draft/review y `coder` en la fase apply. El gateway audita cada cambio de
  rol.
- **Escalado al humano**: el planner expresa "decisiones abiertas / preguntas" en
  su artefacto; el host orquestador (humano-facing) las traslada al humano. Para
  puertas explicitas (p.ej. "aplico estos cambios?") se usa `approval.request` +
  `approval.wait` (async).
- **Modo autonomo opt-in** (Z/0/4 sobre el mecanismo Q/0/5): el operador puede
  habilitar que la puerta `plan.apply` se auto-conceda (sin revision humana).
  Default desactivado; nunca cubre operaciones peligrosas; lo activa el operador
  al lanzar, no el orquestador. El mismo principio aplica al coder+reviewer
  (Y/0/3, scope `code.apply`).
- **Repo de trabajo = este repo** (`agents-orchestrator`), clasificado `internal`.
  Se registra en `repositories.json` para que el coder pueda escribir `plan/*.md`.
- **Modelo**: planner y coder en `claude-opus-4-7` (requiere Stage V).

## Tareas

| ID | Titulo | Depende de | Branch |
|---|---|---|---|
| [Z/0/0](0/00.md) | Rol planner-review + registro de repo | V/0/0, C/0/1 | `feature/Z-0-0-planner-review-contract` |
| [Z/0/1](0/01.md) | System prompts del bucle planner+coder | Z/0/0, T/0/1 | `feature/Z-0-1-planner-loop-prompts` |
| [Z/0/2](0/02.md) | Perfil MCP de planificacion | Z/0/1, V/0/2 | `feature/Z-0-2-planning-mcp-profile` |
| [Z/0/3](0/03.md) | Runbook + smoke de planificacion asistida | Z/0/2, R/0/0 | `feature/Z-0-3-planning-runbook-smoke` |
| [Z/0/4](0/04.md) | Modo autonomo del bucle (scope `plan.apply`) | Q/0/5, Z/0/2 | `feature/Z-0-4-plan-autoapprove-scope` |

## Criterio de salida del stage

- El rol `planner` puede registrar correcciones (`artifact.put.review_notes`)
  ademas de planes; sigue sin `code.write` ni `agent.spawn`.
- Este repo esta registrado como `internal`; el coder puede escribir `plan/*.md`
  pero el flujo mantiene una puerta de aprobacion humana y se ejecuta en rama.
- Existen system prompts para las fases draft/review (planner) y apply (coder),
  con un formato explicito de "decisiones abiertas / preguntas al humano".
- Existe un perfil MCP + runbook reproducible para correr el bucle desde terminal,
  y un smoke (dry-run por defecto) que valida los primitivos del bucle.
- Existe un **modo autonomo opt-in** apoyado en el mecanismo compartido Q/0/5
  (`AGENTS_AUTOAPPROVE=plan.apply`, default off) que auto-acepta solo los diffs de
  plan; jamas push protected, dependency change ni repos restricted, y el
  orquestador no puede activarlo. El mismo mecanismo cubre el flujo coder+reviewer
  (Y/0/3, scope `code.apply`).

## Que NO se hace en este stage

- Dar `code.write` al planner ni permitirle tocar fuera de `plan/*.md`.
- Permitir que cualquier agente edite `policies/` o `gateway/` de forma autonoma.
- Codex como planner (su registry no lo permite).
- Un proceso orquestador (sigue siendo un rol del host, ADR-002).

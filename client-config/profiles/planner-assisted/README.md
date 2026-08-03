# Planner-assisted MCP profile

This profile connects a host-agnostic MCP client to `agents-gateway` for the
assisted planning loop over this repository.

## Agents and roles

- Planner: `claude-code`, role `planner`, model `claude-fable-5`, effort `max`.
- Apply coder: `claude-code`, role `coder`, model `claude-fable-5`, effort `max`.
- Gateway policies: base `./policies`; this repository is registered as
  `agents-orchestrator` with `internal` classification.

## Files

- `mcp.json`: ready-to-adapt MCP stdio server entry.
- `.env.example`: the same runtime contract in shell-env form.
- `../../../prompts/planner_system_prompt.md`: planner draft/review prompt.
- `../../../prompts/planner_apply_coder_prompt.md`: plan apply coder prompt.
- `../../../prompts/orchestrator_planning_loop.md`: host orchestrator addendum.

## Operator notes

Replace `REPLACE_WITH_ABSOLUTE_AGENTS_ORCHESTRATOR_PATH` with the absolute path
to this checkout. `AGENTS_DRY_RUN=1` is the default for safe rehearsal; set
`AGENTS_DRY_RUN=0` only after creating a dedicated branch and confirming Claude
CLI login.

The planning loop is scoped to `plan/**`, uses human approval before applying
plan changes, and should run on a dedicated branch. The detailed runbook is
added in Z/0/3.

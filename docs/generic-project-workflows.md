# Generic project planning and execution

Start from a project profile: repository ID and absolute checkout path,
operator-local registration, source documents, plan/review layout, allowed
write paths, provider choices and exact verification commands. The
[service and CLI/library examples](../examples/generic-workflows/README.md)
use different languages and layouts. Copy the generic
[planner](../prompts/project_planning_prompt_template.md),
[coder](../prompts/project_coder_prompt_template.md) and
[reviewer](../prompts/project_reviewer_prompt_template.md) prompts and fill
every placeholder. No npm, TypeScript, KYA path or reviewer write grant is
required by these templates.

Generate epics from outcomes, stories from user needs, and executable tasks
from bounded changes and observable tests. Keep links in both directions.
Before grouping tasks, map dependencies and exact write scopes. Tasks that
write the same file run serially unless their owners agree a concrete split.
Admit only dependency-ready tasks. Use isolated worktrees for concurrent
tasks, one owner per worktree, and serial integration of independent OK reviews.

At manual wave setup, the operator configures a persistent MCP host and keeps
its Gateway connection through the wave. Choose multiple hosts only for
explicit workspace/principal boundaries. Each task still has its own trace,
task assignment and coder/reviewer session bindings. A cancelled task grants
no authority to another task and must not close a shared Gateway. At wave
completion the operator closes only resources the wave owns. Automated
admission, failure isolation and Gateway lifetime/cleanup are PLANNED in
PROJECT_V7 and have no runtime acceptance from this extraction.

BUILT mechanisms: orchestration.create → task.assign → agent.spawn →
agent.ask/view, durable artifacts and approval decisions, independent review
handoffs and manual batch integration. Capture RED before changes, GREEN
after, exact command outcomes and immutable trial evidence. An OK review is
reviewed; integration and release remain separate operator-owned steps.

## Extraction inventory

| Source | Useful behavior | Disposition |
|---|---|---|
| kya_coder_prompt_template.md | bounded scope, English evidence, TDD, read-before-write, versioned handoff | retained in project_coder_prompt_template.md; project layouts/commands become inputs; legacy template uses an absolute-path placeholder |
| kya_reviewer_prompt_template.md | verify actual diff, intent tests, checks and immutable verdict | retained in project_reviewer_prompt_template.md; default review is read-only; legacy KYA write/fix permission is specific to that optional profile |
| kya-implementation-runbook.md | source documents, dependencies, correction trials, operator integration | parameterized by project profiles and this manual guide; KYA layout remains an optional compatibility example |
| kya_mcp_task_runner.mjs | explicit task config, delegate results and artifact recording | retained as legacy compatibility; path inputs mandatory; fresh-process-per-call context mismatch remains visibly unverified |
| kya_run_task_mcp.sh | scoped environment setup | retained compatibility wrapper with required repository paths; its --check validates wrapper availability only |
| ao-plan-orchestration skill | outcome-based epics, DAG, executable sheets, plan reviews | existing AO mechanism; generic story-to-task mapping shown in the examples |
| ao-build-orchestration skill | persistent sessions, independent reviews, isolated worktrees, serial wave integration | existing AO mechanism; preferred for iterative work over the legacy delegate script |
| operator's wave requirement | dependency scheduling and Gateway/connection lifetime per wave | runtime gap owned by PROJECT_V7, never credited to the legacy runner or these docs |

KYA-named environment inputs are compatibility names. Public workflows use
explicit project inputs and a persistent host. Configure registrations via
[operator-local repositories](operator-guide.md#operator-local-repositories).

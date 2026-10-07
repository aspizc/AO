# Generic planning and wave orchestration

Status: **planned product requirements and extraction inventory**, recorded
from the operator's 2026-10-07 clarification. This is not runtime verification
or a claim that the legacy KYA runner implements wave execution.

## Product direction

AO is a general tool for different repositories, domains, languages and
project types. KYA supplied practical experience; its reusable planning,
execution and review practices should become generic AO workflows. Personal
repository IDs, paths, company context and KYA-specific build commands belong
to operator configuration or an explicitly optional example.

## Required reusable behavior

| Concern | Generic contract | Source / present evidence |
|---|---|---|
| Epic generation | Derive epics from project outcomes, scope and observable acceptance; identify dependencies and shared contracts before decomposition | Existing ao-plan-orchestration skill describes epics, DAG and ownership |
| Stories and executable tasks | Split an epic into stories with user/domain outcomes and acceptance criteria, then bounded implementation tasks; allow a small story to map to one sheet; retain traceability in both directions | Existing skill provides detailed sheets, TDD and review criteria; a generic story mapping/template still needs extraction |
| Wave planning | Group dependency-ready tasks into waves; identify file conflicts, shared resources, concurrency limits and completion gates; do not infer parallel safety solely from different task IDs | Existing ao-build-orchestration skill has independent worktrees, serial integration and wave gates |
| Gateway lifetime | Start/configure the wave's Gateway instance(s) at wave setup and retain their MCP connections across the wave's tasks; close owned processes at wave completion/cancellation; support an already-running host explicitly | Required by the operator; the legacy KYA runner currently starts a new Gateway per request and does not meet this requirement |
| Task and session identity | A persistent wave Gateway still assigns distinct task/trace/session bindings and independent reviews; sharing process lifetime never grants another task's authority | Current Gateway request-context rules and per-sheet traces remain authoritative |
| Execution and review | Use persistent supervised sessions for iterative work, explicit handoffs, separate reviewer identity, bounded correction trials and observable checks | Existing build skill and KYA prompts supply reusable practices; KYA's delegate-per-slice script is not the canonical iterative workflow |
| Integration and evidence | Integrate reviewed changes serially, verify the combined wave candidate and record task/wave state accurately | Existing build skill has batch integration and a thematic wave review |
| Project adaptation | Supply repository registration, plan/review locations, language, commands and provider choices through a project profile; avoid requiring npm, TypeScript, KYA paths or its folder layout | KYA prompts currently hardcode those assumptions; generic templates must replace them with project inputs |

### Planning output

The reusable plan should identify project outcomes, epics, stories, executable
tasks, dependencies and waves. Each executable task has an owner, write scope,
acceptance criteria, verification commands and review evidence. Each wave
lists eligible tasks, the dependency conditions that admit them, Gateway
ownership/lifetime, concurrency limits, conflict handling and exit criteria.
A project can map these artifacts onto its existing layout; AO's own
PROJECT_VN sheet convention remains its repository convention.

### Wave execution boundary

A wave groups scheduling and Gateway lifetime; each task remains the unit of
execution authority and review. Multiple Gateways are an explicit topology
choice for separate workers/workspaces, not an automatic process per task.
Reuse is valid only inside configured repository/principal boundaries. A
failed or cancelled task must not silently close a Gateway still serving
other admitted tasks. Restart/reattach behavior uses A/0/05's contract when
implemented; it is not inferred from a surviving process or reused trace ID.

Gateway instances, orchestration traces and agent sessions are distinct
objects. A generic runner must retain connections, route task-bound calls,
report per-task outcomes and clean up resources it owns. The source runner's
fresh-process-per-call behavior is a known defect, not a workflow to preserve.

## Migration and acceptance inventory

A/0/02 owns identifying reusable material and publishing generic setup,
prompts and workflow guidance while removing personal assumptions. Its
migration inventory must classify each useful KYA element as retained,
parameterized, superseded by an existing AO workflow, or awaiting a dedicated
implementation sheet. Deletion is not complete without accounting for its
useful behavior. Conversely, changing a KYA name does not implement waves.

- Generic examples cover at least two different project shapes, such as a
  service and a CLI/library, with different check commands and plan layouts.
- Story-to-task and task-to-wave examples include a real dependency and a
  shared-file conflict, showing which work can run concurrently.
- Generic examples obtain repository IDs, paths and commands from explicit
  inputs. They do not grant KYA's reviewer write permissions globally.
- Guide labels distinguish existing AO mechanisms from planned automation.
- Before scheduling automated wave-runner implementation, create a separate
  registered sheet with its concrete input/error/lifecycle contract, TDD and
  affected dependencies. This runtime work must not be hidden inside cleanup
  or counted complete by documentation. It remains a tracked requirement here
  until that sheet exists; no release inclusion is silently assumed.
- That sheet must verify multiple tasks using the same wave Gateway/connection,
  dependency/concurrency rules, separate task authority, failed-task isolation
  and owned-resource cleanup. A live or integration test must observe process
  lifetime and emitted behavior, not just a configuration fixture.

Historical evidence retention is a separate unanswered publication choice;
it does not block extracting generic workflows or defining these requirements.

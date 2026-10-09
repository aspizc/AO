# AO — Agents Orchestrator

[![CI](https://github.com/aspizc/AO/actions/workflows/ci.yml/badge.svg)](https://github.com/aspizc/AO/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

AO is an open-source, local-first MCP Gateway (`agents-gateway`) that mediates
safe collaboration between LLM coding agents over stdio and offers an optional
Redis coordination plane for independently running orchestrators.

Created and maintained by **Carlos Asensio Pizarro**.

[Quickstart](#quickstart) · [Project workflow](#how-to-use-ao-through-a-project) ·
[Parallel orchestration](#parallel-orchestrators-worktrees-and-memory) ·
[Agents and models](#agents-and-models) · [Verification](#verification-and-scope)

## Project status

AO `1.0.0` is published at
[`41f9ce2`](https://github.com/aspizc/AO/commit/41f9ce28aa59673283a7c5494200e0ec7b56e2f6),
with an annotated [1.0.0 tag](https://github.com/aspizc/AO/releases/tag/1.0.0).
The development tag `1.1.0-dev.1` identifies reviewed planning and documentation
at [`b3aed7c`](https://github.com/aspizc/AO/commit/b3aed7c9365e54587dc4f847f82edff272955bfb)
on `release/1.1.0`. A/0/02 (generic setup and public hygiene) is reviewed and
integrated on that branch. A/0/04 (guarded supervised prompt submission) is
integrated at `343222e`, and A/0/00 (role-derived CLI restrictions) is
integrated at `a8e8430`. A/0/01 (worker environment markers) is integrated
at `69f222f`; its [merged-tree gate](plan/PROJECT_V6/reviews/A_0_1-integrated-gate.md)
passed 3,067 tests, failed 0, and recorded 12 declared infrastructure skips.
A/0/05 (explicit Linux local stdio/SQLite recovery of supervised sessions
for the same OS principal, machine and state) and the live Codex prompt
refinement are integrated at `7982e42`; the [committed-tree acceptance](plan/PROJECT_V6/reviews/A_0_5-integrated-acceptance.md)
passed 3,265 tests with 12 declared infrastructure skips and a real two-ask,
restart and reattach check. A/0/06 (supervised trust and permission prompts)
is reviewed and integrated at `44c215f`; its [merged-tree gate](plan/PROJECT_V6/reviews/A_0_6-merged-gate.md)
passed 3,312 tests with 0 failures and 12 declared infrastructure skips.
Its real-provider acceptance with Codex 0.162.0 passed ([live acceptance](plan/PROJECT_V6/reviews/A_0_6-operator-live-3.md)) on the
pinned `3.6a-agents.4` runtime. A/0/03 assembles and reviews the `1.1.0` release.
V7 A/0/00 adds reviewed [generic project profiles](docs/generic-wave-runbook.md)
and deterministic preflight, alongside the [cooperative capacity ledger](docs/wave-capacity.md)
from A/0/01. Both are integrated on the release branch; automated wave dispatch
and recovery remain planned.
`main` can advance with reviewed documentation independently of the `1.0.0`
tag. Package version `0.1.0` remains development metadata.

The 1.0.0 candidate's recorded gate has **2,626 passed, 0 failed and 12
declared integration skips**. It exited zero with `infrastructure_unavailable`:
PostgreSQL and Gateway/Temporal checks were skipped, and optional live
providers were not run. See [current capabilities and evidence](docs/project-status.md)
for the exact tested tree and limits. Documentation changes do not establish
new runtime verification.

Important: there is no privileged standalone orchestrator inside the Gateway.
A human-facing LLM can take the orchestrator role, and optional peer clients
may run independently; the Gateway remains the enforcement boundary for
policy-governed actions. See
[ADR-002](docs/adr/ADR-002-no-orchestrator-component.md).

## Quickstart

Prerequisites: a Node.js version from the [runtime contract](docs/node-runtime.md),
Python 3.11, and `uv` on `PATH`. CI pins uv `0.11.21`; lock regeneration
requires that exact version. The complete repository gate requires Linux
(including WSL2), Docker for the documented tmux build, a compatible
[pinned tmux runtime](docs/tmux-runtime.md), and disposable Redis 7.

```bash
git clone https://github.com/aspizc/AO.git
cd AO
uv venv --python 3.11 .venv
source .venv/bin/activate
uv pip sync --require-hashes requirements.lock
uv pip install --no-deps --no-build-isolation -e cli -e orchestrator-langgraph --offline
npm --prefix gateway ci
agent-run policy validate
node scripts/smoke_mcp.mjs
node --test tests/e2e/mcp_two_agent_workflow.test.js
```

The smoke and two-agent tests use dry-run adapters. They exercise the MCP
surface without calling a real provider. For supervised execution, install and
authenticate the selected CLI and prepare the compatible tmux runtime first.
The [operator guide](docs/operator-guide.md) covers repository registration,
MCP host setup, dry-run calls, and troubleshooting.

Configure the host to launch `node ./gateway/src/mcp_server.js` from this
checkout with MCP server name `agents-gateway`. Start with `AGENTS_DRY_RUN=1`.
Set `AGENTS_REQUEST_PRINCIPAL_AGENT=codex` for a Codex host; the default is
`claude-code`. This identifies the host, independently of the coder/reviewer
agents it launches. Use the [generic client configuration](client-config/README.md).

The legacy `node scripts/smoke_mvp2.mjs` currently fails at `task.assign`
with `REQUEST_CONTEXT_DENIED` because it creates a new Gateway connection
for each call. Use the persistent-connection test above for the dry-run flow;
see [known limits](docs/project-status.md#known-operator-limits).

## How to use AO through a project

AO can support a service, web application, library, CLI, infrastructure project
or documentation effort. Configure it for your repository's language, checks
and delivery conventions. KYA is one source of practical experience behind
these workflows; its paths, domain and build commands are optional examples.

The orchestrator is your human-facing agent session. Install the
[generic skills](skills/README.md) in the client connected to `agents-gateway`
and give it the target project's configuration. The `ao-*` variants under
this checkout's `.codex/skills/` and `.claude/skills/` describe development of
AO itself. For another project, start with the generic skills below.

| Phase | Start with | Produce | Ready to move on when |
|---|---|---|---|
| [Ideation](#1-ideation-and-drafts) | Problem, users, constraints and evidence | Versioned concept draft and decision log | The owner accepts the scope and unresolved questions are visible |
| [Planning](#2-planning-epics-stories-tasks-and-waves) | Accepted draft or audit findings | Epics, stories, executable tasks and dependency waves | Each task has an observable outcome, owner, checks and prerequisites |
| [Environment preparation](#3-prepare-the-project-environment) | Project stack and first wave | Reproducible setup, test harness, CI and optional infrastructure tooling | A fresh checkout can build and run its initial checks |
| [Implementation](#4-implementation-and-independent-review) | A ready task in an admitted wave | Tested change, independent review and integration evidence | Acceptance criteria and the combined wave gate pass |
| [Audit](#5-audit-and-feed-findings-back-into-the-plan) | A named candidate and running surfaces | Evidence-based findings and prioritized follow-up tasks | Findings have owners and fixes are verified against the agreed quality bar |

### 1. Ideation and drafts

Use [ideation-orchestration-gateway](skills/ideation-orchestration-gateway/SKILL.md)
to turn an idea into a draft before scheduling implementation. Record the
problem, intended users, important journeys, scope, alternatives, assumptions,
evidence gaps and the smallest useful experiment. Ask the facilitator to
challenge the idea and show tradeoffs; simulated personas provide hypotheses
that still need evidence from real users.

Keep a current draft and its version history, for example
`drafts/concept-v1.md`, plus a decision log. Update the draft after meaningful
feedback and make the accepted revision explicit. Existing projects can start
with a feature brief or audit finding instead of repeating product discovery.

Example brief to your orchestrator:

> Use the ideation workflow to develop this concept. Keep a versioned draft,
> distinguish evidence from assumptions, compare alternatives, and record my
> decisions before handing the accepted scope to planning.

### 2. Planning: epics, stories, tasks and waves

Use [plan-orchestration-gateway](skills/plan-orchestration-gateway/SKILL.md)
with the accepted draft and the repository's conventions:

1. **Epics** describe outcomes and their boundaries. Define shared contracts
   and prerequisites early so independent work can use them consistently.
2. **Stories** describe a user or domain outcome with observable acceptance
   criteria. Keep links to the owning epic and the source draft or finding.
3. **Tasks** are bounded, reviewable changes with exact read/write scope,
   dependencies, an owner, test-first expectations and verification commands.
   A small story can be one task; larger stories split into several tasks.
4. **Waves** group dependency-ready tasks that can safely overlap. Record
   concurrency limits, separate worktrees, shared-file owners, integration
   order, resource requirements and the gate that closes the wave.

A useful task brief names the base commit, files/contracts to read, intended
behavior, failing tests to create, commands to run and required handoff. A
wave manifest names its tasks, dependencies, Gateway ownership, workers,
worktrees and exit criteria. Adapt the storage layout to the project; AO's own
[PROJECT_V6](plan/PROJECT_V6/README.md) demonstrates explicit per-sheet
statuses and evidence; a planned sheet does not establish delivered behavior.

Example schedule for a small web service:

| Wave | Work | Why this order |
|---|---|---|
| 0 | Environment, initial tests, CI, API contract and test data | Establish reproducible checks and shared interfaces |
| 1 | API implementation **in parallel with** UI work against the agreed contract/mocks | Separate owners and worktrees; no competing edits to the shared contract |
| 2 | Connect UI to API and exercise critical Playwright journeys | Requires both wave-1 outputs |
| 3 | Audit, fixes and release evidence | Assess the integrated candidate |

For a CLI or library, replace browser work with command/API compatibility
checks. An infrastructure project can use module contracts, validation and
an isolated infrastructure test environment. Choose waves from actual
dependencies and file/resource conflicts, rather than a fixed template.

**Gateway lifetime:** use a persistent MCP host connection across the tasks
in a wave. Configure any additional Gateways deliberately at wave setup,
retain them while their tasks run, and close resources owned by the wave at
completion. Keep separate task/trace/session bindings and independent review
for each task; reuse of a Gateway process does not reuse another task's
permissions. Redis coordination is optional when independent peers need it.

The existing skills support supervised sessions, parallel worktrees and batch
integration under orchestrator control. **An automatic wave launcher is
planned**, as recorded in the [generic workflow requirements](plan/PROJECT_V6/GENERIC_WORKFLOWS.md).
The legacy KYA/MVP2 scripts start a fresh Gateway per call and have the
[documented connection-lifetime limitation](docs/project-status.md#known-operator-limits).
Use the persistent host workflow for current operation; keep that limitation
visible when assessing readiness.

### 3. Prepare the project environment

Complete AO's [Quickstart](#quickstart), then prepare the **target project**
as the first implementation wave:

1. Register its repository and allowed roots using the
   [operator guide](docs/operator-guide.md). Configure the host principal,
   provider CLI authentication and the project's writable/read-only roles.
   Rehearse with dry-run adapters before assigning real work.
2. Record the project profile: repository ID/path, draft/plan/review locations,
   stack and runtime versions, install/build/test/lint commands, service
   dependencies, provider choices and concurrency budget. The generic skills
   read the target's orchestration profile; see their
   [setup instructions](skills/README.md#prerequisites).
3. Commit reproducible dependency locks, an example environment file without
   credentials, test fixtures and a bootstrap procedure. Give concurrent
   workers separate worktrees, test databases, ports and output directories.
4. Add an initial test and CI job before feature work. Demonstrate that the
   test catches an intentional failure, then restore it and record a passing
   baseline. Document which checks need browsers, containers or credentials.

Choose tools for the work being built:

| Project need | Suggested checks and tooling |
|---|---|
| Domain logic, API or CLI | Use the project's existing unit runner; examples include `node --test` and `python -m pytest`. Add contract/integration tests around real boundaries and fixtures for failure paths. |
| Browser UI | Use [Playwright](https://playwright.dev/docs/intro) for critical user journeys and browser regressions; keep fast logic tests below the browser layer. Configure a test web server, isolated data and reports/traces. |
| Databases or local services | Use disposable containers and isolated test data when integration behavior matters. Document startup, readiness, migrations and cleanup. |
| Infrastructure as code | Use [Terraform initialization](https://developer.hashicorp.com/terraform/cli/commands/init), formatting, [validation](https://developer.hashicorp.com/terraform/cli/commands/validate), tests and a reviewed plan when the project actually owns infrastructure. |
| Every codebase | Run its formatter/linter, type checks where applicable, relevant dependency/secret checks and build in CI. Keep the gate command in the project profile. |

For a JavaScript project that has selected and locked Playwright, run in that
project's directory:

```bash
npm ci
npx playwright install --with-deps
npx playwright test
```

The [installation guide](https://playwright.dev/docs/intro) covers adding it to
a project; [CI guidance](https://playwright.dev/docs/ci) covers browser/system
dependencies and reports. Pin the chosen package version through the project
lockfile. These commands prepare the target application, not AO itself.

For a Terraform project with configuration under `infra/`, basic validation is:

```bash
terraform -chdir=infra init -backend=false
terraform -chdir=infra fmt -check
terraform -chdir=infra validate
```

Validation checks configuration consistency. A real
[Terraform plan](https://developer.hashicorp.com/terraform/cli/commands/plan)
needs the intended backend, workspace and provider configuration; initialize
that environment separately and review its changes before applying them.
[`terraform test`](https://developer.hashicorp.com/terraform/cli/commands/test)
can create and destroy resources, so configure mocks or plan-mode tests for
routine checks and isolate provider-backed tests. Keep credentials and state
outside committed examples. Terraform is optional for projects without
infrastructure to provision.

### 4. Implementation and independent review

Use [build-orchestration-gateway](skills/build-orchestration-gateway/SKILL.md)
for a task whose prerequisites are met:

1. Assign the task through the Gateway before spawning its worker. For
   iterative work, retain the supervised session and send follow-ups using
   `agent.ask`; inspect progress with `agent.view`.
2. Follow **RED → GREEN → refactor**: write the smallest meaningful failing
   test, implement enough to pass, then improve structure with the checks
   green. For UI changes include browser evidence; for infrastructure use the
   applicable validation, tests and reviewed plan.
3. Produce a handoff naming the candidate, diff, acceptance results, commands
   and failures/skips. A separately assigned reviewer checks that evidence
   and the actual change. Use a distinct reviewer even when both seats use
   the same provider; never count the coder's own verdict as independent.
4. Resolve findings in bounded trials. Integrate accepted changes serially,
   resolve shared-file conflicts explicitly and run the project's combined
   wave gate before starting dependent work.
5. Record task and wave results, close completed worker sessions and release
   owned resources. Commit, deployment and publication follow the project's
   operator authorization and release process.

Start with a single worker/reviewer pair until the environment is repeatable.
Increase parallelism for independent work when the project can support its
provider budget, test isolation and integration load. Keep approval scopes
explicit in operator policy; a task prompt does not grant permissions.

### 5. Audit and feed findings back into the plan

Use [audit-project](skills/audit-project/SKILL.md) to select useful lenses:
product, architecture, code, security, data/privacy, tests and rendered UX.
Run a focused audit after a risky change and a broader audit at a milestone
or before release. Name the commit/tree and environment so findings are
reproducible; inspect running behavior when the claim requires it.

The audit output should include an index, a consolidated report, supporting
reports per lens, severity, evidence and concrete acceptance for each fix.
Audit work is read-only. Convert accepted findings into owned plan tasks,
update dependencies/waves, implement and independently review the fixes,
then recheck the findings on the new candidate. A report alone does not close
a defect. The [plan/build/audit loop](skills/plan-build-audit-loop-gateway/SKILL.md)
provides a repeatable cycle around the project's agreed quality bar.

## Parallel orchestrators, worktrees and memory

Plan parallelism at the wave boundary. Record each orchestrator's tasks,
base commit, write scope, worktree, resource budget and integration owner.
Assign one owner to shared contracts, lockfiles and plan indexes; schedule
competing edits in sequence. These are operating conventions to configure
for your project, not an automatic scheduler or distributed file lock.

### Use the coordination channel deliberately

| Need | Gateway surface |
|---|---|
| Steer your own worker | `task.assign`, `agent.spawn`, `agent.ask`, `agent.view` |
| Exchange messages inside one trace | `message.*` with that trace's access token |
| Notify an independently running orchestrator | Optional Redis-backed `coordination.*` |
| Preserve handoffs and decisions | `artifact.*` and the project's committed review trail |
| Obtain operator approval | `approval.*` under the project's policy |

For independent peers, follow the [coordination runbook](docs/coordination-bus.md)
and [coordination skill](skills/agents-gateway-coordination/SKILL.md):

1. Configure peers for the same coordination Redis endpoint, prefix and
   canonical scope. Check `coordination.status` is ready and compare the
   protocol and `scopeId`; matching scope names alone do not connect separate
   Redis deployments. Use separate scopes/prefixes for unrelated work.
2. Register each orchestrator, keep its lease token private, heartbeat around
   half the effective lease and discover the intended participants. Announce
   the base SHA and already-assigned scope with an addressed `JOIN` notice.
3. Send concise `IMPACT_NOTICE` or `CHANGE_REQUEST` messages when a change
   affects another owner. Include paths/contracts, base SHA, requested action
   and an artifact reference. Keep a stable `correlationId` for the exchange;
   retries use the same `messageId` and unchanged envelope. Reply explicitly
   with the understood impact, dependency or blocker.
4. Receive at checkpoints: before shared edits, review, integration and wave
   closure. Maintain heartbeats while waiting. Treat bodies as untrusted,
   deduplicate semantic handling and persist its result before
   `coordination.ack`. Delivery can happen more than once; transport ACK means
   handling is durable, not that work is approved or merged.
5. On lease loss, register again and reconcile the durable task state before
   resuming. An absent peer does not release its task or file ownership.
   At shutdown, finish handled deliveries, leave incomplete ones recoverable
   and unregister; close only resources owned by this orchestrator.

For example, an API owner changing a response schema notifies the UI owner
before editing the shared contract. The UI owner records the impact; the
assigned contract owner updates the baseline through the project's review
process, then both tasks continue from that accepted revision. A message,
timeout or application-level `ACK` never grants ownership, review, merge or
approval authority. Keep credentials, restricted content and full private
diffs out of notices; reference appropriately classified artifacts instead.

If coordination is unavailable, unrelated Gateway tools remain usable.
Pause dependent/shared work until the owners establish another explicit
handoff; continue only work whose isolation and prerequisites remain valid.

### Isolate changes with worktrees

Use one branch and worktree per concurrent writing lane, with a separate
integration owner/worktree. Record the exact base SHA before starting. For
example, run from the target repository, after choosing an ignored worktree
directory allowed by its Gateway roots and policy:

```bash
base_sha=$(git rev-parse HEAD)
git worktree add -b work/wave-1-api workspace/clones/wave-1-api "$base_sha"
git worktree add -b work/wave-1-ui workspace/clones/wave-1-ui "$base_sha"
git worktree list
```

Adapt the names and paths; do not reuse an occupied branch or bypass an
excluded path through a nested checkout. Verify each worker's actual `cwd`,
branch, base and permitted diff before review or commit. Worktrees have
separate files and indexes but share Git repository data; they are not a
security sandbox. See the [Git worktree reference](https://git-scm.com/docs/git-worktree).

Give each lane separate build outputs, test data, ports and container names.
Isolate mutable dependency installations and Terraform state/workspaces;
worktrees alone do not isolate databases or cloud resources. Coordinate
repository-wide configuration and maintenance. Never switch another lane's
branch or clean its uncommitted files. Stage explicit paths and run one full
gate at a time per tree; serialize heavier gates across the host when needed.
Integrate reviewed commits serially, then verify the combined wave candidate.
After preserving commits/evidence and stopping owned sessions/services, use
`git worktree remove <path>` only for a clean, no-longer-needed worktree.

### Budget RAM and preserve session context

- **Host memory:** measure a representative worker plus its tests/build,
  browser processes and containers before increasing concurrency. Set a
  host-wide budget across all orchestrators, reserve headroom for the OS,
  Gateway and Redis, and admit fewer lanes when peak usage approaches it.
  Do not multiply each orchestrator's local maximum into an unbounded total.
- **Nested parallelism:** limit test/build/browser workers as well as agent
  count. Queue heavy browser suites and full gates when they compete for RAM.
  On sustained memory pressure or swapping, stop admitting new tasks and
  checkpoint active work before reducing concurrency. Close completed agent
  sessions and owned services; do not kill another orchestrator's processes.
- **Context and token budget:** retain a worker session for follow-ups within
  its task. Send bounded briefs, changed-file summaries and artifact pointers
  instead of whole logs or repeated repository dumps. Use bounded
  `agent.view` snapshots and keep detailed output in durable evidence.
- **Recovery memory:** checkpoint the task/trace IDs, branch/worktree, base and
  candidate SHAs, decisions, verification results, blockers and next action.
  Before compaction, restart or a context-budget limit, write a handoff;
  the next session must verify it against disk and current ownership. Keep
  stable project conventions in the project profile or `AGENTS.md`, and
  changing task state in its handoff. Neither remembered context nor a
  handoff grants new authority; reviewer independence still applies.
- **Redis memory:** monitor inbox backlog and the metadata event stream
  separately. The v1 event stream has no automatic retention limit. Drain
  completed deliveries, resolve abandoned pending work and define operator
  retention; never trim pending deliveries to make space. Follow the
  [memory troubleshooting guidance](docs/coordination-bus.md#redis-memory-or-inbox-length-keeps-growing).

## Agents and models

The canonical [provider profile](gateway/contracts/orchestrator-profile-v1.json)
and `policies/agent-capabilities.json` govern availability and selection.

| Agent | Default selection | Execution |
|---|---|---|
| Codex | `gpt-6.1-sol`, effort `max`, tier `priority` | Headless and supervised |
| Claude Code | `claude-opus-5-5`, effort `max` | Headless and supervised |
| Antigravity CLI | `gemini-3.8-flash-high`, effort `high` | Headless and supervised; permission bypass is opt-in |
| pi | `ollama/qwen3.8:27b`, effort `medium` | Optional CLI; explicit provider setup |
| OpenCode | `ollama/qwen3.8:27b` | Optional CLI; explicit provider setup |
| Gemini CLI | `gemini-2.5-pro` | Registry-only in the current executable profile |

The default models also accept aliases `gpt-6.1` and `opus-5.5`. Explicit
alternatives include `gpt-6-astra` (`astra`) and `claude-sonnet-5-5`
(`sonnet-5.5`). Catalog registration does not prove live provider availability. See the [Codex](docs/adapters/codex.md),
[Claude](docs/adapters/claude-code.md), [Antigravity](docs/adapters/antigravity.md),
[pi](docs/adapters/pi.md), and [OpenCode](docs/adapters/opencode.md) guides.

## Architecture Summary

```text
human-facing orchestrator -> Gateway MCP -> coder child + reviewer child
                                 |
                      policy / state / audit / artifacts
                                 |
                 optional Redis coordination for independent peers
```

The Gateway exposes [33 versioned tools](docs/mcp-tool-catalog.md) over stdio:
25 core tools and eight `coordination.*` tools. It applies deterministic
registry policy, server-owned request/task/repository bindings, asynchronous
approvals, sanitization, and audited agent sessions. Logs go to stderr.
SQLite is the default durable state store.

The practical two-agent flow uses Codex as coder and Claude as reviewer.
The historical P/0/3 activation path is superseded by Stage W and the
[MVP2.0 runbook](docs/mvp2-orchestrator-runbook.md). `writer` and `editor`
roles also support prose and documentation workflows.

The coordination tools are `coordination.status`, `coordination.register`,
`coordination.heartbeat`, `coordination.discover`, `coordination.unregister`,
`coordination.send`, `coordination.receive`, and `coordination.ack`. The
three message-tool contracts under `message.*` remain unchanged.

Optional coordination provides leased presence, discovery, addressed inboxes,
reclaim, and transport ACK over Redis 7 standalone. MCP clients and trusted
local Node clients share the same service. With no configured Redis URL,
coordination returns `COORDINATION_UNAVAILABLE`; unrelated Gateway tools remain
available. Messages cannot grant repository, review, merge, or approval authority.
Read the [architecture](docs/architecture.md) and
[coordination runbook](docs/coordination-bus.md).

For iterative work, assign tasks before `agent.spawn`, reuse sessions through
`agent.ask`/`agent.view`, store artifacts, obtain an independent review, and
close sessions with `agent.kill` before `orchestration.complete`. Review,
integration, publication, promotion, and release are separate states. The
[planning runbook](docs/planning-loop-runbook.md) and
[installable skills](skills/README.md) describe the workflow.

## Verification and scope

After preparing tmux and an isolated disposable Redis endpoint, run the
[operator guide's CI procedure](docs/operator-guide.md#4-run-local-ci):

```bash
AGENTS_TEST_REDIS_URL=redis://127.0.0.1:6380/0 ./scripts/ci.sh
```

The [CI contract](docs/ci-contract.md) defines locks, supply-chain verification,
lint, structure, Gateway, E2E, CLI, LangGraph, and live Redis lanes. Missing
required Redis fails the gate. Declared external-service skips remain visible;
exit zero alone does not establish an all-infrastructure pass.

`agent-run doctor --json` provides read-only local diagnostics. Coordination
and runtime-authority probes still have explicit unavailable boundaries; see
[Doctor's implementation and limits](docs/doctor.md).

MVP2.0 scope is recorded in [ADR-005](docs/adr/ADR-005-mvp2-scope.md) and the
[acceptance checklist](docs/mvp2-acceptance-checklist.md). V5 extends that
foundation; [plan/](plan/README.md) retains the imported planning and review
history. Planned sheets are not delivered capabilities.

PostgreSQL, Temporal, real provider execution, and the optional
[LangGraph client](orchestrator-langgraph/README.md) have distinct integration
requirements and verification limits. Multi-user authentication, cloud hosting,
Redis Cluster/Sentinel, and IDE-specific configuration are outside the current
verified path. No standalone privileged orchestrator binary is provided.

Dependency installation consumes the checked-in locks. For an intentional
Python dependency update, use `./scripts/requirements_lock.sh` followed by
`./scripts/requirements_lock.sh --check`; use `--upgrade` only when upgrading
versions is the intended change. See the [release contract](docs/release-candidate.md)
for candidate evidence and supply-chain verification.

The [local capacity ledger](docs/wave-capacity.md) provides
`agent-run wave budget-init` and cooperative reservation APIs. Automated wave
dispatch remains planned; existing agents do not use a new ledger automatically.

## Runtime Environment

| Variable | Default | Description |
|---|---|---|
| `AGENTS_WORKSPACE` | `<repo>/workspace` | Root for artifacts, audit, and state. |
| `AGENTS_POLICIES_DIR` | `<repo>/policies` | Registries directory. |
| `AGENTS_STATE_DB` | `<workspace>/state/state.db` | SQLite state database path. |
| `AGENTS_AUDIT_LOG` | `<workspace>/audit/events.jsonl` | Audit JSONL path. |
| `AGENTS_REDIS_URL` | empty | Optional Redis URL for the legacy audit publisher and the coordination fallback; disabled when empty. |
| `AGENTS_REDIS_STREAM` | `agents:events` | V1 experimental Redis Streams audit/event stream name. |
| `AGENTS_ARTIFACT_STORE` | `<workspace>/artifacts` | Artifact store root. |
| `AGENTS_COORDINATION_REDIS_URL` | `AGENTS_REDIS_URL` or disabled | Redis URL used only by the V5 coordination plane. |
| `AGENTS_COORDINATION_PREFIX` | `agents:coord:v1` | Dedicated coordination key prefix; must not overlap `agents:events`. |
| `AGENTS_COORDINATION_SCOPE_ID` | `agents-orchestrator` | Canonical coordination scope for this Gateway instance. |
| `AGENTS_COORDINATION_LEASE_DEFAULT_MS` | `900000` | Default participant lease; must not exceed the configured maximum. |
| `AGENTS_COORDINATION_LEASE_MAX_MS` | `259200000` | Maximum accepted participant lease and v1 ceiling (72 hours). |
| `AGENTS_COORDINATION_INBOX_MAX_LEN` | `10000` | Per-participant inbox capacity bound. |
| `AGENTS_COORDINATION_MAX_BLOCK_MS` | `30000` | Maximum server-side blocking receive duration. |
| `AGENTS_COORDINATION_COMMAND_CONCURRENCY` | `64` | Maximum admitted in-flight operations on the persistent command client. |
| `AGENTS_COORDINATION_COMMAND_QUEUE_MAX` | `256` | Maximum queued command operations before explicit backpressure. |
| `AGENTS_COORDINATION_BLOCKING_QUEUE_MAX` | `32` | Maximum queued blocking receives behind the dedicated blocking client. |
| `AGENTS_COORDINATION_SHUTDOWN_TIMEOUT_MS` | `2000` | Maximum graceful drain before owned Redis clients are cancelled. |
| `AGENTS_COORDINATION_MESSAGE_MAX_BYTES` | `65536` | Maximum UTF-8 message body size and v1 upper bound. |
| `AGENTS_COORDINATION_DEDUPE_TTL_MS` | `86400000` | Equal-send idempotency window. |
| `AGENTS_COORDINATION_ACK_TOMBSTONE_TTL_MS` | `86400000` | Exact ACK retry window. |
| `AGENTS_COORDINATION_ORPHAN_INBOX_TTL_MS` | `86400000` | Retention applied when stale inbox cleanup is scheduled. |
| `AGENTS_TMUX_PREFIX` | `ag-` | tmux session prefix. |
| `AGENTS_TMUX_SUBMIT_DELAY_MS` | `150` | Settle interval in milliseconds after prompt paste, accepted range 1–1000. |
| `AGENTS_REPO_ROOTS` | empty | Colon-separated cwd allowlist. |
| `AGENTS_REPOSITORIES_OVERLAY` | unset | Absolute path to additive [operator-local registrations](docs/operator-guide.md#operator-local-repositories); see [generic project workflows](docs/generic-project-workflows.md). |
| `AGENTS_REQUEST_PRINCIPAL_AGENT` | `claude-code` | Agent identity of the MCP host, set at Gateway launch (for example `codex`). Caller arguments must match it. |
| `AGENTS_REQUEST_CONTEXT_TTL_MS` | `86400000` | Positive integer lifetime of the connection request context in milliseconds; expired contexts deny protected actions. |
| `AGENTS_APPROVAL_MAX_WAIT_MS` | `60000` | Server-side cap on `approval.wait`. |
| `AGENTS_AUTOAPPROVE` | empty | Comma-separated approval scopes to auto-grant; default off and bounded by ADR-006. |
| `AGENTS_AGENT_TIMEOUT_MS` | `600000` | Server-side cap for agent `delegate` and `ask`. |
| `AGENTS_MESSAGE_ACCESS_SECRET` | empty | Direct message access secret; when empty the Gateway loads or creates the file-backed secret. |
| `AGENTS_MESSAGE_ACCESS_SECRET_FILE` | `<workspace>/secrets/message-access.key` | File-backed message access secret path used when `AGENTS_MESSAGE_ACCESS_SECRET` is empty. |
| `AGENTS_DRY_RUN` | `0` | If `1`, adapters do not spawn real subprocesses. |
| `AGENTS_CODEX_BIN` | `codex` | Codex CLI binary for real Codex adapter execution. |
| `AGENTS_CODEX_SANDBOX` | `workspace-write` | Sandbox passed to `codex exec`. |
| `AGENTS_ANTIGRAVITY_BIN` | `agy` | Antigravity CLI binary. |
| `AGENTS_AGY_BIN` | `agy` | Shorthand alias for `AGENTS_ANTIGRAVITY_BIN`. |
| `AGENTS_ANTIGRAVITY_AUTO` | `0` | Explicit opt-in to Antigravity permission bypass. |
| `AGENTS_OTEL_ENABLED` | `false` | V1 experimental telemetry flag; set truthy to enable OTel-inspired export. |
| `AGENTS_OTEL_EXPORTER` | `stderr` | V1 experimental telemetry exporter. |
| `AGENTS_OTEL_SERVICE_NAME` | `agents-gateway` | V1 experimental telemetry service name. |

The optional pi and OpenCode adapters additionally read `AGENTS_PI_BIN`,
`AGENTS_OPENCODE_BIN`, `AGENTS_OPENCODE_AUTO`, and `AGENTS_OLLAMA_BASE_URL`.
Their setup and defaults are documented in the
[pi](docs/adapters/pi.md) and [OpenCode](docs/adapters/opencode.md) guides.

## Documentation

- [docs/project-status.md](docs/project-status.md) — current implementation, verification, and release status.

- [skills/README.md](skills/README.md) — project-local audit, Gateway
  orchestration, and cross-process coordination skills for Codex and Claude.
- [docs/operator-guide.md](docs/operator-guide.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/coordination-bus.md](docs/coordination-bus.md)
- [docs/kya-implementation-runbook.md](docs/kya-implementation-runbook.md)
- [docs/mvp2-orchestrator-runbook.md](docs/mvp2-orchestrator-runbook.md)
- [docs/planning-loop-runbook.md](docs/planning-loop-runbook.md)
- [docs/mvp2-acceptance-checklist.md](docs/mvp2-acceptance-checklist.md)
- [docs/threat-model.md](docs/threat-model.md)
- [docs/mvp-acceptance-checklist.md](docs/mvp-acceptance-checklist.md)
- [docs/operator-cli-contract.md](docs/operator-cli-contract.md)
- [docs/adr/ADR-005-mvp2-scope.md](docs/adr/ADR-005-mvp2-scope.md)
- [docs/adr/ADR-006-bounded-autoapprove.md](docs/adr/ADR-006-bounded-autoapprove.md)
- [docs/adr/ADR-V5-01-redis-coordination-plane.md](docs/adr/ADR-V5-01-redis-coordination-plane.md)
- [docs/adapters/claude-code.md](docs/adapters/claude-code.md)
- [docs/adapters/codex.md](docs/adapters/codex.md)
- [docs/adapters/antigravity.md](docs/adapters/antigravity.md)
- [docs/adapters/pi.md](docs/adapters/pi.md)
- [docs/adapters/opencode.md](docs/adapters/opencode.md)
- [client-config/local-models/README.md](client-config/local-models/README.md)
- [docs/doctor.md](docs/doctor.md) — implemented diagnostic core and its current limits
- [docs/release-candidate.md](docs/release-candidate.md)
- [docs/adr/](docs/adr/)
- [client-config/mcp.json.example](client-config/mcp.json.example)
- [plan/](plan/README.md) — project index; the V5 coordination delivery tree
  is [plan/PROJECT_V5/](plan/PROJECT_V5/README.md)
- [plan_proyecto_v4.md](plan_proyecto_v4.md)

## License

Copyright (c) 2026 Carlos Asensio Pizarro.

AO is open-source software released under the [MIT License](LICENSE).

## Contributing

Issues and pull requests are welcome. Prepare the documented Redis and tmux
prerequisites, then run the local quality gate:

```bash
AGENTS_TEST_REDIS_URL=redis://127.0.0.1:6380/0 ./scripts/ci.sh
```

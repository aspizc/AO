# AO plan baseline and preparation evidence

- Plan source: sibling agents-orchestrator commit
  `5f72f8bce15b22a7f73292511c83b8ab7f3bdad1`, exactly its eleven PROJECT_V6
  files; no dirty runtime/configuration files were copied.
- Original plan's implementation reference: sibling `8234588`.
- AO base: `41f9ce28aa59673283a7c5494200e0ec7b56e2f6` (annotated `1.0.0`).
- AO was clean on `main` before preparation; request_context.js and config.js
  have no uncommitted edits here. Those dirty files belong to the sibling tree.
- `release/1.1.0` was created from the exact AO base. This commit contains
  plan preparation only; all seven implementation sheets remain planned.

## Anchor reconciliation

These referenced source files are byte-identical between sibling 8234588 and
AO 41f9ce2, so importing the plan does not shift their existing line anchors:

- `gateway/src/adapters/codex_adapter.js`
- `gateway/src/adapters/claude_adapter.js`
- `gateway/src/adapters/gemini_adapter.js`
- `gateway/src/adapters/pi_adapter.js`
- `gateway/src/adapters/opencode_adapter.js`
- `gateway/src/adapters/tmux_client.js`
- `gateway/src/adapters/model_credentials.js`
- `gateway/src/core/orchestrator_profile.js`
- `gateway/src/core/registry.js`
- `gateway/src/services/agent_service.js`
- `gateway/src/services/approval_service.js`
- `gateway/src/mcp_server.js`
- `gateway/src/tools/index.js`
- `policies/roles.json`
- `policies/profiles/kya/roles.json`
- `scripts/release_candidate.py`
- `cli/src/agents_cli/doctor_command.py`
- `orchestrator-langgraph/src/orchestrator_langgraph/client/gateway_client.py`

AO-specific differences checked during preparation:

| Reference | AO base evidence / disposition |
|---|---|
| Codex sandbox configuration | gateway/src/config.js:212; corrected from source line 204 |
| Context constructor / lineage seed | request_context.js:918 / :146; source lines 917 / 145 shifted by one |
| Context ownership / connection mismatch | request_context.js:405–410 / :311; anchors corrected |
| Antigravity permission bypass | antigravity_adapter.js:39–61, opt-in via AGENTS_ANTIGRAVITY_AUTO; no unconditional-bypass claim |
| Antigravity ask send | antigravity_adapter.js:381; corrected from source :376 |
| Public registry | policies/repositories.json:30,35 are engineering_graph and kya; source-only entries omitted |
| Profile/skill/adapter-doc home paths | Already parameterized in AO; removed from the remaining A/0/02 cleanup inventory |
| Machine MCP configuration | .mcp.json is not tracked in AO; portable examples already exist |
| Remaining personal paths | KYA templates/scripts, Codex path-spelling fixtures, Redis helper; I-3 synthetic fixtures retained |

The inventory was regenerated with `git grep -nE
"/(home|Users)/[A-Za-z0-9._-]+/" HEAD -- ':!plan' ':!audit'
':!plan_proyecto_v4.md' ':!tareas_implementacion_v4.md' ':!workspace'`.
This is an AO baseline comparison, not proof of implementation or live CLI
behavior. Before each sheet, the coder records the actual base SHA and checks
the cited symbol/range again, including references whose content changed
without shifting lines. New fields, tools and helper files in the plan remain
planned contracts; their names are not evidence that they exist today.

## Scheduling and readiness limits

The logical DAG is acyclic. Parallel execution is a scheduling option, with
isolated worktrees and serial integration: wave 1 shares config.js; wave 2
shares gateway/README.md. Each combined candidate needs review of overlapping
hunks and its required verification. A/0/02 choices remain human-gated.
The no-Claude instruction defers real Claude acceptance checks. Source-recorded
CLI versions/flags must be rechecked by the implementing coder when allowed.
Preparation review is scoped to importing/adapting the plan and recording
operator decisions; it is not a blanket production-readiness or release verdict.

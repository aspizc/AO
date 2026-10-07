# Project V6 — Executable sheets

Status: planned.

Dependency order is binding unless a reviewed plan change updates this file,
the stage README, and the affected sheets together.

| Sheet | Title | Status | Depends on | Blocks | Write scope | Review id |
|---|---|---|---|---|---|---|
| [A/0/00](A/0/00.md) | Role-derived child CLI permissions | `planned` | — | A/0/01, A/0/03, A/0/06 | `gateway/src/core/policy_engine.js`, `gateway/src/services/agent_service.js`, `gateway/src/adapters/{codex,claude,antigravity,pi,opencode}_adapter.js` (five executable providers; `gemini-cli` stays registry-only), `tests/gateway/`, `docs/adapters/` | `A_0_0` |
| [A/0/01](A/0/01.md) | Worker environment marker | `planned` | A/0/00 | A/0/03 | `gateway/src/adapters/tmux_client.js`, `gateway/src/adapters/base_adapter.js`, the five executable adapters, `gateway/src/services/agent_service.js` (`newSessionArgv` spawn-result field), `tests/gateway/`, `docs/worker-environment.md`, `gateway/README.md` | `A_0_1` |
| [A/0/02](A/0/02.md) | Generic public setup and reusable workflows | `planned` | — | A/0/03 | `gateway/src/core/registry.js`, `gateway/src/config.js`, `cli/src/agents_cli/doctor_command.py`, `gateway/src/mcp_server.js`, `prompts/kya_*`, `scripts/kya_*`, `scripts/check_public_hygiene.py`, `scripts/ci_gate.py`, `ci/public-hygiene-fixtures.json`, `docs/kya-implementation-runbook.md`, `docs/operator-guide.md`, `tests/`; `policies/` edits and local launcher setup are operator-owned | `A_0_2` |
| [A/0/04](A/0/04.md) | `agent_ask` submits the prompt | `planned` | — | A/0/03, A/0/06 | `gateway/src/adapters/tmux_client.js`, `gateway/src/adapters/base_adapter.js`, the five executable adapters, `gateway/src/config.js`, `gateway/src/tools/{catalog,tool_errors}.js`, derived MCP contract/catalog docs, `gateway/README.md`, `tests/gateway/` | `A_0_4` |
| [A/0/05](A/0/05.md) | Supervised sessions survive a gateway restart | `planned` | — | A/0/03 | `gateway/src/core/request_context.js`, `gateway/src/mcp_server.js`, `gateway/src/tools/orchestration.js`, `gateway/src/tools/catalog.js`, `gateway/contracts/mcp-tools-v1.json`, `gateway/README.md`, `tests/gateway/` | `A_0_5` |
| [A/0/06](A/0/06.md) | The Gateway handles children's trust and permission prompts | `planned` | A/0/00, A/0/04 | A/0/03 | the five executable adapters (recognisers), `gateway/src/services/agent_service.js` (watcher), `gateway/src/services/approval_service.js`, `gateway/src/tools/catalog.js`, `gateway/README.md`, `tests/gateway/` | `A_0_6` |
| [A/0/03](A/0/03.md) | Release AO 1.1.0 | `planned` | A/0/00, A/0/01, A/0/02, A/0/04, A/0/05, A/0/06 | — | `scripts/release_candidate.py` (`SEMVER_TAG` accepts unprefixed SemVer), `tests/structure/test_release_candidate_contract.py`, `CHANGELOG.md`, local `refs/heads/release-base/1.0.0` and `release/1.1.0` refs, release evidence outside the checkout, local annotated tag | `A_0_3` |

Execution order: wave 1 = A/0/04 ∥ A/0/02; wave 2 = A/0/00 → A/0/01, with A/0/05 in parallel;
wave 3 = A/0/06; wave 4 = A/0/03. First-two-wave change approved by the operator on 2026-10-07: `A/0/04` moves to wave 1 (it is S, P0 and removes most manual intervention; it never depended on `A/0/00`, only shared adapter files), and `A/0/00`/`A/0/01` follow it.

Inventory: **7 executable sheets**, `0 complete + 0 in progress + 7 planned`.

Parallel work requires isolated worktrees and serial integration, including
explicit conflict review of the shared `gateway/src/config.js` wave-1 edits.

A/0/04 also owns the [guarded-paste runtime prerequisite](A/0/04-transport.md)
and its narrowly scoped vendor/runtime pin updates. It remains one executable
sheet with two implementation checkpoints, not an additional release leaf.

A/0/02 preserves reusable workflow behavior as specified in
[GENERIC_WORKFLOWS.md](GENERIC_WORKFLOWS.md). Automated wave execution is a
tracked runtime gap requiring its own registered sheet before scheduling;
no additional implementation leaf or release claim is implied by this entry.

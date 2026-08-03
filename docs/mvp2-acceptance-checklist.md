# MVP2.0 acceptance checklist

This checklist is the gate for declaring MVP2.0 ready. Every criterion maps to
evidence from stages V/W/X/Y and preserves the MVP invariants from ADR-002,
ADR-003, and ADR-004.

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 1 | Model selection resolves through registry and policy for agent execution. | V/0/0; `tests/gateway/policy_model.test.js`; `tests/gateway/tool_agent_model.test.js` | [x] |
| 2 | Gateway tools propagate selected model, reasoning effort, and service tier to adapters. | V/0/1; `tests/gateway/tool_agent_model.test.js`; `gateway/src/services/agent_service.js` | [x] |
| 3 | Claude reviewer honors selected model. | V/0/2; `tests/gateway/claude_adapter.test.js`; `gateway/src/adapters/claude_adapter.js` | [x] |
| 4 | Codex coder supports real headless execution behind policy and cwd guards. | W/0/0; `tests/gateway/codex_adapter.test.js`; `gateway/src/adapters/codex_adapter.js` | [x] |
| 5 | Codex coder supports supervised tmux sessions. | W/0/1; `tests/gateway/codex_supervised.test.js`; `tests/gateway/tool_agent.test.js` | [x] |
| 6 | Base policy enables Codex by default, including restricted repositories when repository policy allows it. | W/0/2; `tests/gateway/codex_enable_profile.test.js`; `policies/agent-capabilities.json`; `policies/repositories.json`; `policies/profiles/mvp2/agent-capabilities.json` | [x] |
| 7 | Generic MCP client profile exists for Codex coder plus Claude reviewer. | X/0/0; `client-config/profiles/codex-coder-claude-reviewer/mcp.json`; `tests/structure/test_mvp2_mcp_profile.py` | [x] |
| 8 | Orchestrator prompt describes the MVP2 two-agent flow and sanitized reviewer handoff. | X/0/1; `prompts/orchestrator_mvp2_two_agent.md`; `tests/structure/test_mvp2_orchestrator_prompt.py` | [x] |
| 9 | Operator runbook explains dry-run, real profile, launch, observation, audit, artifacts, and troubleshooting. | X/0/2; `docs/mvp2-orchestrator-runbook.md`; `tests/structure/test_mvp2_runbook.py` | [x] |
| 10 | A guarded real two-agent E2E exists and is opt-in only. | Y/0/0; `tests/e2e/mcp_two_agent_real.test.js`; `tests/structure/test_mvp2_real_e2e.py` | [x] |
| 11 | A single operator smoke command validates the MVP2 flow in dry-run by default and real mode by opt-in. | Y/0/1; `scripts/smoke_mvp2.mjs`; `tests/structure/test_mvp2_smoke.py` | [x] |
| 12 | Normal CI remains deterministic and does not require network, tmux, Codex, or Claude execution. | `scripts/ci.sh`; Y/0/0 guard; `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` | [x] |

## Gate Result

MVP2.0 is in scope and ready when:

- ADR-005 is accepted.
- `scripts/ci.sh` passes without real CLI execution.
- `node scripts/smoke_mvp2.mjs` passes in dry-run mode.
- Operators with `tmux`, Codex, and Claude logged in can run the guarded real
  evidence commands from `docs/mvp2-orchestrator-runbook.md`.

Codex is enabled by default and may run on `restricted` repositories when
repository policy allows it.

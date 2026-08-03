# MVP acceptance checklist (V4)

This checklist is the contract for declaring the MVP ready. Every criterion in
V4 section 30 maps to evidence: a test, a document path, or an explicit manual
check. No item may be checked without evidence. A reviewer must verify each item
before changing its status.

This is the historical Project V0 MVP gate, not the cumulative V5 product
contract. Its child-communication criteria continue to govern artifacts and
policy-controlled actions. Project V5 separately permits bounded, addressed,
untrusted coordination messages under
[`ADR-V5-01`](adr/ADR-V5-01-redis-coordination-plane.md); those messages never
grant authority or replace the artifact/policy path.

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 1 | Agent registry with capabilities and allowed roles, including orchestrator, is versioned in git. | `policies/agent-capabilities.json`; `tests/gateway/registry_agent_capabilities.test.js`; `tests/gateway/registry_loader.test.js` | [ ] |
| 2 | Repository registry with classification is versioned in git. | `policies/repositories.json`; `tests/gateway/registry_repositories.test.js`; `tests/gateway/registry_loader.test.js` | [ ] |
| 3 | Role catalog with base capabilities, including orchestrator, is versioned in git. | `policies/roles.json`; `tests/gateway/registry_roles.test.js`; `tests/gateway/policy_roles.test.js` | [ ] |
| 4 | Claude and Codex are denied any action on restricted repositories, including when acting as orchestrator. | `tests/gateway/policy_classification.test.js`; `tests/gateway/claude_policy.test.js`; `tests/gateway/policy_table.test.js`; TM-02 in `docs/threat-model.md` | [ ] |
| 5 | Gemini may operate on restricted repositories only as restricted-coder. | `tests/gateway/policy_classification.test.js`; `tests/gateway/policy_roles.test.js`; `tests/gateway/task_service.test.js`; `tests/e2e/mvp_restricted_flow.test.js` | [ ] |
| 6 | The operator keeps using the usual human-facing agent; the system does not add a new client. | `docs/adr/ADR-002-no-orchestrator-component.md`; `docs/operator-guide.md`; `client-config/mcp.json.example` | [ ] |
| 7 | The human-facing agent in orchestrator role can invoke task assignment, agent session operations, sanitized artifact reads, approval request, and orchestration operations. | `policies/roles.json`; `tests/gateway/policy_roles.test.js`; `tests/gateway/tool_orchestration_task.test.js`; `tests/gateway/tool_agent.test.js`; `tests/e2e/mvp_restricted_flow.test.js`; `tests/e2e/mcp_two_agent_workflow.test.js` | [ ] |
| 8 | The human-facing agent in orchestrator role cannot invoke code.write directly and must delegate to coder or restricted-coder children. | `tests/gateway/policy_roles.test.js`; `tests/gateway/policy_table.test.js`; `docs/threat-model.md` TM-01 | [ ] |
| 9 | The human-facing agent in orchestrator role cannot read restricted raw artifacts and receives only sanitized material. | `tests/gateway/artifact_visibility_matrix.test.js`; `tests/e2e/mvp_restricted_flow.test.js`; `plan/PROJECT_V0/reviews/U_0_0-1_to_check_by_human.md`; TM-02 in `docs/threat-model.md` | [ ] |
| 10 | The orchestrator system prompt exists and documents the role and tools. | `prompts/orchestrator_system_prompt.md`; `tests/structure/test_orchestrator_prompt.py` | [ ] |
| 11 | Example client configuration exists for connecting the Gateway. | `client-config/mcp.json.example`; `tests/structure/test_generic_mcp_config.py`; `docs/operator-guide.md` documents specific IDE configs as out of scope | [ ] |
| 12 | Communication between child agents always passes through the Gateway. | `docs/adr/ADR-001-gateway-only.md`; `docs/architecture.md`; `tests/e2e/mvp_restricted_flow.test.js`; `tests/e2e/mcp_two_agent_workflow.test.js` | [ ] |
| 13 | No child can send artifacts directly to another child without a policy check. | `gateway/src/tools/artifact.js`; `gateway/src/services/artifact_share_service.js`; `tests/gateway/artifact_share_service.test.js`; `tests/gateway/tool_artifact_share.test.js` | [ ] |
| 14 | Every artifact.get and artifact.share is audited. | `tests/gateway/artifact_get_policy.test.js`; `tests/gateway/artifact_share_service.test.js`; `tests/gateway/tool_artifact.test.js`; `tests/e2e/mvp_restricted_flow.test.js` | [ ] |
| 15 | Both primitives exist and are reachable through MCP: headless and supervised. | `tests/gateway/gemini_delegate.test.js`; `tests/gateway/gemini_supervised.test.js`; `tests/gateway/claude_adapter.test.js`; `tests/gateway/tool_agent.test.js`; `tests/e2e/mcp_two_agent_workflow.test.js`; `docs/adapters/claude-code.md` | [ ] |
| 16 | Supervised sessions are observable with tmux attach and expose tmuxTarget. | `tests/gateway/gemini_supervised.test.js`; `tests/gateway/claude_adapter.test.js`; `tests/gateway/tool_session_attach_info.test.js`; `tests/gateway/tool_agent.test.js`; `tests/e2e/mcp_two_agent_workflow.test.js` | [ ] |
| 17 | tmux is not required to complete the normal dry-run flow. | `tests/e2e/mvp_restricted_flow.test.js`; `tests/e2e/mcp_two_agent_workflow.test.js`; `tests/gateway/gemini_delegate.test.js`; `tests/gateway/claude_adapter.test.js`; `docs/operator-guide.md` | [ ] |
| 18 | tmux interventions are registered as best-effort HUMAN_TMUX_INTERVENTION. | `tests/gateway/intervention_detector.test.js`; `tests/gateway/tool_session_intervention_note.test.js`; `docs/threat-model.md` TM-05 | [ ] |
| 19 | Restricted raw outputs never reach an unapproved recipient without sanitization. | `tests/gateway/artifact_visibility_matrix.test.js`; `tests/gateway/sanitization_fail_closed.test.js`; `tests/e2e/mvp_restricted_flow.test.js`; `tests/e2e/mcp_two_agent_workflow.test.js`; TM-02 in `docs/threat-model.md` | [ ] |
| 20 | Every policy decision is recorded with traceId, agent, role, repo, action, and reason. | `tests/gateway/policy_explain.test.js`; `tests/gateway/task_service.test.js`; `tests/gateway/tool_orchestration_task.test.js`; `tests/e2e/mvp_restricted_flow.test.js` | [ ] |
| 21 | Agents operate autonomously for routine operations inside their allowed scope. | `tests/gateway/policy_approval.test.js`; `tests/gateway/task_service.test.js`; `tests/e2e/mvp_restricted_flow.test.js`; `docs/operator-guide.md` | [ ] |
| 22 | Only irreversible external actions require explicit human approval. | `policies/agent-capabilities.json`; `tests/gateway/policy_approval.test.js`; `tests/gateway/approval_service.test.js`; `tests/gateway/approval_wait.test.js` | [ ] |
| 23 | The orchestrator LLM can request approval and the operator can respond through the human-facing client or helper CLI. | `tests/gateway/tool_approval.test.js`; `tests/cli/test_approve.py`; `tests/e2e/mvp_restricted_flow.test.js`; `docs/operator-guide.md` | [ ] |
| 24 | A traceId correlates orchestrations, tasks, sessions, artifacts, messages, and decisions end to end. | `tests/gateway/domain_repositories.test.js`; `tests/gateway/orchestration_service.test.js`; `tests/gateway/message_repo.test.js`; `tests/gateway/tool_message.test.js`; `tests/e2e/mvp_restricted_flow.test.js`; `tests/e2e/bypass_regression.test.js`; `tests/cli/test_audit_show.py` | [ ] |
| 25 | The system runs locally without cloud services. | `scripts/ci.sh`; `tests/e2e/mvp_restricted_flow.test.js`; `docs/operator-guide.md`; `docs/architecture.md` | [ ] |
| 26 | Replacing the orchestrator LLM with deterministic LangGraph in phase 3 does not require changing the Gateway contract. | `docs/architecture.md`; `docs/adr/ADR-001-gateway-only.md`; `plan_proyecto_v4.md` ADR-006 and section 30 | [ ] |
| 27 | Replacing SQLite with Postgres does not require changing the Gateway contract. | `gateway/src/core/repositories/`; `tests/gateway/domain_repositories.test.js`; `plan_proyecto_v4.md` ADR-004 and section 30 | [ ] |

## Reviewer notes

- Items remain unchecked in this document until a reviewer explicitly marks them.
- If evidence changes, update the row before changing the status.
- Open human-check files that affect this checklist: `C_0_4-1_to_check_by_human.md`, `N_0_2-1_to_check_by_human.md`, `O_0_2-1_to_check_by_human.md`, and `U_0_0-1_to_check_by_human.md`.
- Operational usability gap: do not mark criteria that depend on real MCP
  agent execution ready until K/0/3, K/0/4, and U/0/5 provide evidence for
  `agent.*` tools and the orchestrator + coder + reviewer MCP flow.
- Codex as a real coder is optional/post-MVP evidence covered by P/0/3;
  it is not required for the restricted Gemini + Claude MVP path.
- Task-less sessions are a Stage W extension. They must not be used as evidence
  for MVP task traceability unless the corresponding Stage W audit/DB evidence
  is present.

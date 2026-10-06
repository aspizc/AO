# Codex coder + Claude reviewer MCP profile

This profile connects a host-agnostic MCP client to `agents-gateway` for the
MVP2.0 two-agent flow:

- Codex coder: `gpt-6.1-sol`, reasoning effort `max`, Fast service tier
  (`priority`), sandbox `workspace-write`.
- Claude reviewer: `claude-opus-5-5`, reasoning effort `max`.
- Gateway policies: base `policies/`, where Codex is enabled by default and
  still gated by repository policy.

## Files

- `mcp.json`: ready-to-adapt MCP stdio server entry.
- `.env.example`: the same runtime contract in shell-env form.
- `../../../prompts/orchestrator_mvp2_two_agent.md`: system prompt for the MCP
  host orchestrator.

## Operator notes

Replace `REPLACE_WITH_ABSOLUTE_WORK_REPO_PATH` with the absolute path to the
repository the agents may use as `cwd`. For a safe rehearsal, set
`AGENTS_DRY_RUN=1` before running the real flow.

Follow the [two-agent runbook](../../../docs/mvp2-orchestrator-runbook.md).
Set `AGENTS_REQUEST_PRINCIPAL_AGENT=codex` when the MCP host itself is Codex;
otherwise the default host principal is `claude-code`. Optional new models
are listed in the [Gateway guide](../../../gateway/README.md).

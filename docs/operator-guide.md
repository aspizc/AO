# Operator guide

This guide takes a fresh operator from clone to a successful local dry-run. It
is host-agnostic: it does not assume Cursor, Antigravity, or any specific MCP
IDE.

## 1. Prerequisites

- Linux, macOS, or WSL.
- A Node.js version accepted by the
  [runtime contract](node-runtime.md) (`node --version`).
- Python 3.11 or newer (`python3 --version`).
- [uv](https://docs.astral.sh/uv/) for the hash-checked Python lock.
- tmux for supervised sessions.

## 2. Clone and install

```bash
git clone <this repo>
cd agents-orchestrator
uv venv --python 3.11 .venv
source .venv/bin/activate
uv pip sync --require-hashes requirements.lock
uv pip install --no-deps --no-build-isolation -e cli -e orchestrator-langgraph --offline
npm --prefix gateway ci
```

## 3. Validate registries

```bash
agent-run policy validate
```

Expected result: the command reports that the policies directory is valid. If
it reports `FAIL`, fix the referenced `policies/*.json` file and rerun the
command.

## 4. Run local CI

```bash
./scripts/ci.sh
```

All checks must pass before running orchestrations.
The suite list, skip policy, dependency regeneration, and machine-readable
result are defined by the [CI contract](ci-contract.md). The default gate does
not contact Redis, Postgres, Temporal, or real agent providers.
Its final status can be `infrastructure_unavailable` with exit zero when every
unavailable case is explicitly allowlisted; only `passed` means that no suite
reported unavailable infrastructure. Suite timeouts and SIGINT/SIGTERM stop
the owned child process group and still produce one JSON result.

Optional local infrastructure for V1 experimental Postgres and Redis Streams
work lives in [`../docker/docker-compose.yml`](../docker/docker-compose.yml).
It is not required for the MVP2.0 dry-run or two-agent flows.

Optional MCP smoke check:

```bash
node scripts/smoke_mcp.mjs
```

This starts the Gateway over stdio in dry-run mode and verifies that
`tools/list` returns representative legacy core tools plus the eight additive
`coordination.*` tools. Tool discovery is lazy and does not require a
reachable Redis service.

For the real MVP2.0 two-agent flow with Codex coder and Claude reviewer, follow
[`mvp2-orchestrator-runbook.md`](mvp2-orchestrator-runbook.md).

For assisted planning with a Claude planner and apply-coder, follow
[`planning-loop-runbook.md`](planning-loop-runbook.md).

For leased discovery and addressed messaging between independently running
orchestrators, follow the V5
[`coordination-bus.md`](coordination-bus.md) runbook. Coordination is optional:
with no coordination Redis URL, only `coordination.*` calls return
`COORDINATION_UNAVAILABLE`; the existing Gateway tools remain available.

## 5. Launch the Gateway from any MCP-capable host

The Gateway speaks MCP over stdio. Configure your host to spawn:

```bash
node ./gateway/src/mcp_server.js
```

Use `agents-gateway` as the MCP server name. See
[`../client-config/mcp.json.example`](../client-config/mcp.json.example) for
the generic configuration example.

Adapting this example to a specific IDE or host format is out of scope for
this project.

## 6. Inject the orchestrator system prompt

When an LLM client acts as the orchestrator role, load
[`../prompts/orchestrator_system_prompt.md`](../prompts/orchestrator_system_prompt.md)
as the system prompt or equivalent host-level instruction.

## 7. Run the first dry-run orchestration

Set `AGENTS_DRY_RUN=1` in the environment passed to the Gateway. Ensure
`AGENTS_REPO_ROOTS` points at the parent directory containing the repositories
the Gateway may access.

From any MCP client, call the tools in this shape:

```json mcp-tool-call
{"tool":"orchestration.create","arguments":{"callerAgent":"claude-code","callerRole":"orchestrator","goal":"Refactor X"}}
```

```json mcp-tool-call
{"tool":"task.assign","arguments":{"traceId":"<traceId from orchestration.create>","caller":{"agent":"claude-code","role":"orchestrator"},"target":{"agent":"gemini-cli","role":"restricted-coder","action":"code.write"},"repo":"cvision","brief":"Apply parser fix"}}
```

```json mcp-tool-call
{"tool":"agent.spawn","arguments":{"agent":"gemini-cli","role":"restricted-coder","repo":"cvision","cwd":"<allowed repo path>","traceId":"<traceId>","taskId":"<taskId from task.assign>"}}
```

```json mcp-tool-call
{"tool":"artifact.put","arguments":{"traceId":"<traceId>","kind":"raw_diff","classification":"restricted","producedBy":"<sessionId from agent.spawn>","content":"<diff content>"}}
```

```json mcp-tool-call
{"tool":"artifact.share","arguments":{"traceId":"<traceId>","artifactId":"<raw artifactId>","requesterAgent":"claude-code","requesterRole":"reviewer"}}
```

```json mcp-tool-call
{"tool":"task.assign","arguments":{"traceId":"<traceId>","caller":{"agent":"claude-code","role":"orchestrator"},"target":{"agent":"claude-code","role":"reviewer","action":"artifact.put"},"repo":"sample-apps","brief":"Review sanitized diff"}}
```

```json mcp-tool-call
{"tool":"agent.delegate","arguments":{"agent":"claude-code","role":"reviewer","repo":"sample-apps","cwd":"<allowed non-restricted repo path>","prompt":"<sanitized artifact content only>","traceId":"<traceId>","taskId":"<review taskId>"}}
```

In dry-run mode the Gateway returns deterministic mock responses. It must not
require real network access or real agent CLI execution.

Inspect the audit:

```bash
agent-run audit show --trace-id <traceId> --limit 50
```

You should see events such as `ORCHESTRATION_CREATED`, `TASK_CREATED`,
`SESSION_STARTED`, `ARTIFACT_CREATED`, `SANITIZATION_APPLIED`,
`ARTIFACT_SHARED`, and `SESSION_CLOSED`.

## 8. Approvals

When the orchestrator requests an approval, the audit contains
`APPROVAL_REQUIRED`. Respond from a terminal:

```bash
agent-run approve <approvalId> --decision granted --note "release plan reviewed"
agent-run approve <approvalId> --decision denied --note "do not push yet"
```

The Gateway records the decision in audit and state.

Auto-approval is off by default. Operators may opt into bounded scopes at
Gateway launch with `AGENTS_AUTOAPPROVE=scope1,scope2`; see
[`ADR-006`](adr/ADR-006-bounded-autoapprove.md). Auto-granted approvals emit
`APPROVAL_AUTO_GRANTED` with `decidedBy: "operator-autonomous-mode"`.
`git.push.protected`, `dependency.change`, `code.write.protected_branch`, and
restricted contexts always require a human decision.

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| MCP host reports no tools | Gateway crashed at boot. | Check Gateway stderr and rerun `./scripts/ci.sh`. |
| Tool calls fail with policy errors | The requested agent, role, repo, or action is denied. | Run `agent-run policy check` with the same context. |
| stdout looks corrupted | Some code wrote logs to stdout. | Open a bug; Gateway stdout is reserved for MCP only. |
| Supervised mode fails | tmux is missing or unavailable. | Install tmux or use `AGENTS_DRY_RUN=1`. |
| Audit appears empty | Wrong trace id or audit path. | Check runtime config and use `agent-run audit show --limit 50`. |
| Coordination returns `COORDINATION_UNAVAILABLE` | No coordination Redis URL is configured, or its Redis endpoint is unreachable. | Existing tools are unaffected; configure and diagnose the isolated coordination endpoint using `coordination-bus.md`. |

## Out of scope

- Cursor, Antigravity IDE, and any specific IDE configuration.
- Network deployment, multi-user authentication, or cloud hosting.
- Unbounded or orchestrator-controlled automatic approval. Bounded
  auto-approval is operator opt-in only; see
  [`ADR-006`](adr/ADR-006-bounded-autoapprove.md).

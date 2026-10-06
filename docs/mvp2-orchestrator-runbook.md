# MVP2.0 orchestrator runbook

This runbook takes an operator from a fresh checkout to a complete two-agent
orchestration using a generic MCP host, Codex as coder, and Claude as reviewer.
It is host-agnostic and does not require any specific IDE.

## 1. Prerequisites

- A Node.js version accepted by the
  [runtime contract](node-runtime.md): `node --version`.
- Python 3.11 or newer: `python3 --version`.
- The [pinned tmux runtime](tmux-runtime.md): `tmux -V`.
- `uv` and disposable Redis 7 for the Linux/WSL2 repository gate.
- Codex CLI installed and logged in: `codex --version`.
- Claude CLI installed and logged in: `claude --version`.
- A non-restricted working repository. Its absolute path must be allowed through
  `AGENTS_REPO_ROOTS`.

## 2. Install

```bash
uv venv --python 3.11 .venv
source .venv/bin/activate
uv pip sync --require-hashes requirements.lock
uv pip install --no-deps --no-build-isolation -e cli -e orchestrator-langgraph --offline
npm --prefix gateway ci
PATH="$PWD/.venv/bin:$PATH" agent-run policy validate
```

Prepare the isolated tmux server and disposable Redis endpoint as described in
the [operator guide](operator-guide.md), then run the local gate before real CLIs:

```bash
AGENTS_TEST_REDIS_URL=redis://127.0.0.1:6380/0 ./scripts/ci.sh
```

## 3. Mandatory Dry-Run Rehearsal

Before using real Codex or Claude processes, run the Gateway smoke in dry-run:

```bash
AGENTS_DRY_RUN=1 node scripts/smoke_mcp.mjs
```

This verifies MCP stdio startup and tool discovery without requiring network,
tmux, Codex, or Claude execution.

Then run the two-agent dry-run test, which retains one MCP connection for the
trace and tasks:

```bash
node --test tests/e2e/mcp_two_agent_workflow.test.js
```

### Legacy smoke limitation

`node scripts/smoke_mvp2.mjs` currently opens a new Gateway process for every
request. With connection-bound request contexts, its `task.assign` fails with
`REQUEST_CONTEXT_DENIED`. This was reproduced on the published implementation;
the script is not a verified dry-run or real-provider entry point. Use a
persistent MCP host for the manual sequence below. Real provider execution
was not established by the latest local gate.

The guarded real E2E lives at `tests/e2e/mcp_two_agent_real.test.js`. The gate
reports this optional service as unavailable without invoking it unless
explicitly enabled. After dry-run rehearsal, CLI login, and runtime setup,
operators can attempt that separate integration check:

```bash
AGENTS_E2E_REAL=1 AGENTS_POLICIES_DIR="$PWD/policies" \
  node --test tests/e2e/mcp_two_agent_real.test.js
```

## 4. Configure the Real Profile

Use the MVP2 profile files:

- `client-config/profiles/codex-coder-claude-reviewer/mcp.json`
- `client-config/profiles/codex-coder-claude-reviewer/.env.example`

Copy the env example into your host environment and edit:

```bash
AGENTS_DRY_RUN=0
AGENTS_POLICIES_DIR=./policies
AGENTS_REPO_ROOTS=/absolute/path/to/non-restricted/work-repo
AGENTS_CODEX_BIN=codex
AGENTS_CLAUDE_BIN=claude
AGENTS_CODEX_SANDBOX=workspace-write
```

`AGENTS_REQUEST_PRINCIPAL_AGENT` identifies the MCP host (`claude-code` by
default, `codex` for a Codex host). The host identity is independent of the
coder/reviewer selection. Register the working repository ID and make its
canonical directory discoverable under the configured roots.

`AGENTS_REPO_ROOTS` must be absolute. If it is unset or does not include the
working repository, agent calls will fail with a cwd allowlist violation.

## 5. Connect the MCP Host

In your MCP-capable host, load the server entry from:

```text
client-config/profiles/codex-coder-claude-reviewer/mcp.json
```

Use `agents-gateway` as the MCP server name. Load this system prompt into the
host's orchestrator session:

```text
prompts/orchestrator_mvp2_two_agent.md
```

The host should call Gateway tools, not local shell commands, for orchestration.

## 6. Launch the Orchestration

Give the host a concrete objective for the non-restricted working repository,
for example:

```text
Implement the requested change in the working repo with Codex as coder, then
review the sanitized diff with Claude reviewer. Use supervised sessions.
```

Expected Gateway tool shape:

1. `orchestration.create` creates a `traceId`.
2. `task.assign` assigns the coder task to `agent: codex`, `role: coder`.
3. `agent.spawn` starts Codex supervised with `model: gpt-5.6-sol`,
   `reasoningEffort: max`, and `serviceTier: priority` (Fast).
4. `agent.ask` sends the implementation task to Codex.
5. `agent.view` checks Codex progress.
6. The coder produces artifacts; the orchestrator uses `artifact.share` and
   passes the returned `sharedArtifactId` as the `artifactId` to `artifact.get`
   for reviewer handoff.
7. `task.assign` assigns review work to `agent: claude-code`, `role: reviewer`.
8. `agent.spawn` starts Claude reviewer with `model: claude-fable-5` and
   `reasoningEffort: max`.
9. `agent.ask` requests review of the sanitized diff or summary.
10. If protected push or dependency changes require approval, use
    `approval.request` and then `approval.wait` or `approval.poll`.
11. After the reviewer returns OK, request the post-review acceptance gate:
    `approval.request` with the current `traceId`, `action: "code.apply"`,
    `requestedBy: "orchestrator"`, and
    `context: { repo, agent: "codex", role: "coder" }`, then wait with
    `approval.wait`. Pending means the operator still has to approve before the
    changes are accepted.
12. Close both sessions with `agent.kill`.
13. Finish with `orchestration.complete`.

## 7. Autonomous Mode

Autonomous mode is off by default. To let the Gateway auto-grant only the
post-review acceptance gate, launch it with:

```bash
AGENTS_AUTOAPPROVE=code.apply node ./gateway/src/mcp_server.js
```

For a real supervised run, set the same variable in the MCP host environment
beside `AGENTS_DRY_RUN=0`.

`code.apply` means the reviewer has already reviewed the coder output and the
orchestrator is asking whether to accept those changes. The reviewer still runs
and must record review notes. A reviewer KO or blocking finding stops the flow
even when autonomous mode is enabled.

Autonomous mode does not grant protected branch pushes, dependency changes,
protected branch writes, or restricted repository work. Those remain human
approval gates. To audit auto-grants:

```bash
grep APPROVAL_AUTO_GRANTED workspace/audit/events.jsonl
```

## 8. Observe Supervised Sessions

List sessions:

```bash
tmux ls
```

Attach to Codex:

```bash
tmux attach -t ag-...-codex-coder
```

Attach to Claude reviewer:

```bash
tmux attach -t ag-...-claude-code-reviewer
```

From the MCP host, prefer `session.attach_info` to get the exact attach command.
If the operator intervenes manually in tmux, record it with
`session.intervention_note`.

## 9. Verify the Result

Inspect artifacts:

```bash
find workspace/artifacts -type f -maxdepth 3
```

Raw artifacts and sanitized artifacts are separate. The reviewer should only see
sanitized content when policy requires sanitization.

Inspect audit:

```bash
PATH="$PWD/.venv/bin:$PATH" agent-run audit show --limit 100
```

The default audit file is `workspace/audit/events.jsonl`.

For the orchestration trace, confirm events such as:

- `ORCHESTRATION_CREATED`
- `TASK_CREATED`
- `AGENT_MODEL_RESOLVED`
- `SESSION_STARTED`
- `SESSION_INPUT`
- `ARTIFACT_CREATED`
- `SANITIZATION_APPLIED` when raw content required sanitization
- `ARTIFACT_SHARED`
- `APPROVAL_REQUIRED`
- `APPROVAL_AUTO_GRANTED` when `AGENTS_AUTOAPPROVE=code.apply` is enabled
- `SESSION_CLOSED`
- `ORCHESTRATION_COMPLETED`

Confirm review notes were produced as reviewer output, typically through
`artifact.put` with `kind: "review_notes"` or an equivalent Gateway-recorded
artifact.

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Codex disabled | The host points `AGENTS_POLICIES_DIR` at a custom registry where Codex is disabled. | Use the base `AGENTS_POLICIES_DIR=./policies` registry or enable Codex in the custom registry. |
| cwd allowlist violation | `AGENTS_REPO_ROOTS` is missing, relative, or does not include the work repo. | Use the absolute repo path. |
| tmux failure | `tmux` is not installed or unavailable in the host environment. | Install tmux or rehearse with `AGENTS_DRY_RUN=1`. |
| model not allowed | The host requested a model outside the agent registry. | Use Codex `gpt-5.6-sol`/`max`/`priority` and Claude `claude-fable-5`/`max`; Claude 4.x alternatives are limited to `claude-opus-4-8`. |
| CLI login failure | `codex` or `claude` is not installed, not on PATH, or not logged in. | Run the CLI manually and complete login before retrying. |
| approvals stay pending | The human has not responded. | Use `agent-run approve ...` or the configured approval response path. |
| `code.apply` stays pending | Autonomous mode is off or the context is restricted. | Approve manually, or launch with `AGENTS_AUTOAPPROVE=code.apply` for non-restricted work. |

## 11. Stop Criteria

The run is complete when the orchestration is marked complete, both supervised
sessions are closed, audit contains the expected model/session/artifact events,
and the reviewer output is available from the Gateway trace.

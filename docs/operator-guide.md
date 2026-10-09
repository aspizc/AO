# Operator guide

This guide takes a fresh operator from clone to a successful local dry-run. It
is host-agnostic: it does not assume Cursor, Antigravity, or any specific MCP
IDE.

## 1. Prerequisites

- Linux or WSL2 for the complete CI gate (Linux process supervision is required).
  Gateway portability and native macOS preparation have separate verification limits.
- A Node.js version accepted by the
  [runtime contract](node-runtime.md) (`node --version`).
- Python 3.11 or newer (`python3 --version`).
- [uv](https://docs.astral.sh/uv/) for the hash-checked Python lock.
- The [pinned tmux runtime](tmux-runtime.md) for retained-control session tests
  and compatible supervised sessions.
- A disposable Redis 7 standalone instance for the required live CI lane.

## 2. Clone and install

```bash
git clone https://github.com/aspizc/AO.git
cd AO
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

### Operator-local repositories

Keep machine-specific registrations in an operator-owned JSON file outside
the published checkout. Set `AGENTS_REPOSITORIES_OVERLAY` to its absolute
path in the local MCP launcher and CLI environment. The file uses the same
`version` and `repositories` shape as the base registry:

```json
{
  "version": 1,
  "repositories": {
    "local-project": {
      "classification": "internal",
      "allowedAgents": ["codex"]
    }
  }
}
```

```bash
export AGENTS_REPOSITORIES_OVERLAY=/srv/operator-config/repositories.json
export AGENTS_REPO_ROOTS=/srv/projects
agent-run policy validate
agent-run policy check --agent codex --role coder --repo local-project --action code.write
agent-run doctor --json
```

The named checkout must exist at `/srv/projects/local-project` to bind task
authority. Entries are additive: a shipped ID collision, unknown agent,
invalid entry, relative overlay path or missing overlay file fails validation
and Gateway startup. Unset means the shipped registry alone. The doctor uses
the same validated effective registry and policy status; its sanitized output
does not publish repository paths or registrations. Restart the configured
Gateway after changing its launch environment. Keep `.mcp.json` untracked;
portable launcher examples remain under `client-config/`.

Only the operator moves personal registrations from the base and profile
registries into this file. Agents never edit `policies/`. The public hygiene
scan deliberately fails until that operator migration is complete. Generic
project setup and workflow examples are in
[generic-project-workflows.md](generic-project-workflows.md).

## 4. Run local CI

In a separate terminal, start a disposable instance and wait for its ready
message (stop it with Ctrl-C after testing):

```bash
docker run --rm --name ao-ci-redis -p 127.0.0.1:6380:6379 redis:7.2-alpine
```

With the [tmux build's environment](tmux-runtime.md#linux-build) still exported:

```bash
(
  export TMUX_TMPDIR="$(mktemp -d)"
  trap 'tmux kill-server 2>/dev/null || true' EXIT
  tmux new-session -d -s ao-ci-bootstrap
  AGENTS_TEST_REDIS_URL=redis://127.0.0.1:6380/0 ./scripts/ci.sh
)
```

Prepare the [pinned tmux runtime](tmux-runtime.md), including the exported
probe variables and an isolated tmux server, before this command. The Redis
URL must refer to an independently managed disposable Redis 7 instance.
For a lighter first check, use the dry-run smoke commands below.
The suite list, skip policy, dependency regeneration, and machine-readable
result are defined by the [CI contract](ci-contract.md). The default gate
contacts only the disposable Redis 7 endpoint supplied through
`AGENTS_TEST_REDIS_URL`; never use the shared coordination Redis. GitHub
Actions provisions and health-checks this service automatically.
Its final status can be `infrastructure_unavailable` with exit zero when every
unavailable case is explicitly allowlisted; only `passed` means that no suite
reported unavailable infrastructure. Missing required Redis readiness also
uses `infrastructure_unavailable`, but returns nonzero. Suite timeouts and
SIGINT/SIGTERM clean the owned process domain. A process-cleanup uncertainty
raises an error without publishing a gate result, as specified by the CI contract.

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

For the persistent-connection two-agent rehearsal, run:

```bash
node --test tests/e2e/mcp_two_agent_workflow.test.js
```

The legacy `smoke_mvp2.mjs` script restarts the Gateway per call and currently
fails request-context validation. For the manual two-agent flow with Codex
coder and Claude reviewer, follow
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

Set `AGENTS_REQUEST_PRINCIPAL_AGENT` to the MCP host's agent identity:
`claude-code` by default, or `codex` for a Codex host. Caller fields must match
this identity and the `orchestrator` role. This setting does not select the
child agent or model. `AGENTS_REQUEST_CONTEXT_TTL_MS` defaults to `86400000`
(24 hours from connection creation); restart the connection after expiry.

Repository IDs are policy handles, not paths. Register each repository in the
operator-owned registry, allow the selected agent, and configure an absolute
`AGENTS_REPO_ROOTS` parent containing directories named for those IDs. A checkout
named `AO` does not automatically bind the sample `agents-orchestrator` ID;
matching the registered ID and canonical directory is part of host setup.

The process owns its coordination command/blocking Redis clients. End stdin or
send `SIGINT`/`SIGTERM` for an orderly stop; the Gateway stops admission,
drains for `AGENTS_COORDINATION_SHUTDOWN_TIMEOUT_MS` (2 seconds by default),
settles any remaining caller as `COORDINATION_UNAVAILABLE`, consumes late
transport outcomes, and releases listeners/sockets. Do not restart or stop a
Redis server merely to close a Gateway.

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
{"tool":"task.assign","arguments":{"traceId":"<traceId from orchestration.create>","caller":{"agent":"claude-code","role":"orchestrator"},"target":{"agent":"codex","role":"restricted-coder","action":"code.write"},"repo":"cvision","brief":"Apply parser fix"}}
```

```json mcp-tool-call
{"tool":"agent.spawn","arguments":{"agent":"codex","role":"restricted-coder","repo":"cvision","cwd":"<allowed repo path>","traceId":"<traceId>","taskId":"<taskId from task.assign>"}}
```

```json mcp-tool-call
{"tool":"artifact.put","arguments":{"traceId":"<traceId>","kind":"raw_diff","classification":"restricted","producedBy":"<sessionId from agent.spawn>","content":"<diff content>"}}
```

```json mcp-tool-call
{"tool":"artifact.share","arguments":{"traceId":"<traceId>","artifactId":"<raw artifactId>","requesterAgent":"claude-code","requesterRole":"reviewer"}}
```

```json mcp-tool-call
{"tool":"task.assign","arguments":{"traceId":"<traceId>","caller":{"agent":"claude-code","role":"orchestrator"},"target":{"agent":"claude-code","role":"reviewer","action":"artifact.put.review_notes"},"repo":"sample-apps","brief":"Review sanitized diff"}}
```

```json mcp-tool-call
{"tool":"agent.delegate","arguments":{"agent":"claude-code","role":"reviewer","repo":"sample-apps","cwd":"<allowed non-restricted repo path>","prompt":"<sanitized artifact content only>","traceId":"<traceId>","taskId":"<review taskId>"}}
```

In dry-run mode the Gateway returns deterministic mock responses. It must not
require real network access or real agent CLI execution.

The agent, role, repository, trace, task, and cwd fields in these public calls
are assertions, not authority. The Gateway binds them to the task and canonical
repository server-side. An internal execution binding cannot be cloned or
reused for another spawn/delegate tuple; mismatches return
`REQUEST_CONTEXT_DENIED` before adapter lookup, session persistence, model
resolution audit, or launch. This does not change the public MCP arguments.

Inspect the audit:

```bash
agent-run audit show --trace-id <traceId> --limit 50
```

After explicitly closing the supervised session with `agent.kill`, you should
see events such as `ORCHESTRATION_CREATED`, `TASK_CREATED`,
`SESSION_STARTED`, `ARTIFACT_CREATED`, `SANITIZATION_APPLIED`,
`ARTIFACT_SHARED`, and `SESSION_CLOSED`.

## 8. Approvals

When the orchestrator requests an approval, the audit contains
`APPROVAL_REQUIRED`. Respond from a terminal:

```bash
agent-run approve <approvalId> --decision granted --note "release plan reviewed"
agent-run approve <approvalId> --decision denied --note "do not push yet"
```

The Gateway records the decision in audit and state. For `session.prompt.command`,
`session.prompt.trust`, `session.prompt.permission` and `session.prompt.unknown`
approvals, the CLI waits up to 10 seconds for the owning watcher and reports
`answered/sent`, explicit denial, or the failure/uncertain outcome. A stored
`granted` decision alone does not prove delivery. An uncertain timeout may
still be finalized by the owner; do not treat it as proof that input did not run.
This CLI is same-OS-account local authority, not authenticated human presence:
any process with that account and access to the SQLite state, including a
shell-capable child agent, can answer a pending prompt. Default MCP response
authority and automatic command scopes remain unchanged.

Auto-approval is off by default. Operators may opt into bounded scopes at
Gateway launch with `AGENTS_AUTOAPPROVE=scope1,scope2`; see
[`ADR-006`](adr/ADR-006-bounded-autoapprove.md). Auto-granted approvals emit
`APPROVAL_AUTO_GRANTED` with `decidedBy: "operator-autonomous-mode"`.
`git.push.protected`, `dependency.change`, `code.write.protected_branch`, and
restricted contexts always require a human decision. Repository-affecting
auto-approval also requires one server-owned task, canonical repository, and
known repository classification in the current request context; omitted,
ambiguous, or caller-invented lineage never becomes authority.

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| MCP host reports no tools | Gateway crashed at boot. | Check Gateway stderr and rerun `./scripts/ci.sh`. |
| Tool calls fail with policy errors | The requested agent, role, repo, or action is denied. | Run `agent-run policy check` with the same context. |
| stdout looks corrupted | Some code wrote logs to stdout. | Open a bug; Gateway stdout is reserved for MCP only. |
| Supervised mode fails | tmux is missing or incompatible. | Follow `tmux-runtime.md` or rehearse with `AGENTS_DRY_RUN=1`. |
| `REQUEST_CONTEXT_DENIED` | Host identity, canonical repository binding, task lineage, or context expiry does not match. | Check the launch principal, registered repository ID and roots, task/trace association, and connection lifetime. |
| Audit appears empty | Wrong trace id or audit path. | Check runtime config and use `agent-run audit show --limit 50`. |
| Coordination returns `COORDINATION_UNAVAILABLE` | No coordination Redis URL is configured, or its Redis endpoint is unreachable. | Existing tools are unaffected; configure and diagnose the isolated coordination endpoint using `coordination-bus.md`. |

## Out of scope

- Cursor, Antigravity IDE, and any specific IDE configuration.
- Network deployment, multi-user authentication, or cloud hosting.
- Unbounded or orchestrator-controlled automatic approval. Bounded
  auto-approval is operator opt-in only; see
  [`ADR-006`](adr/ADR-006-bounded-autoapprove.md).

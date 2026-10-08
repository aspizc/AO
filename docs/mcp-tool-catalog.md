# Canonical MCP tool catalog

This file is generated from `gateway/src/tools/catalog.js`. Edit the catalog,
then update the versioned projection and this document in the same reviewed change.

The v1 contract contains exactly 34 tools in protocol order.

| # | Tool | Description | Runtime dependency | Audit route |
|---:|---|---|---|---|
| 1 | `orchestration.create` | Create a new orchestration session. | gateway-local | legacy |
| 2 | `orchestration.view` | View an owned orchestration or discover eligible local restart traces. | gateway-local | legacy |
| 3 | `orchestration.pause` | Pause an orchestration session. | gateway-local | legacy |
| 4 | `orchestration.resume` | Resume an orchestration session. | gateway-local | legacy |
| 5 | `orchestration.cancel` | Cancel an orchestration session. | gateway-local | legacy |
| 6 | `orchestration.complete` | Complete an orchestration session. | gateway-local | legacy |
| 7 | `task.assign` | Assign work to a target agent in a target role under an orchestration trace. | gateway-local | legacy |
| 8 | `agent.delegate` | Run an agent in headless mode for a one-shot task. Optional model, reasoning effort, and service tier fall back to registry defaults. | configured-agent-adapter | legacy |
| 9 | `agent.spawn` | Start a persistent tmux-backed agent session. Optional model, reasoning effort, and service tier fall back to registry defaults. | configured-agent-adapter | legacy |
| 10 | `agent.ask` | Send a prompt to an existing agent session. | configured-agent-adapter | legacy |
| 11 | `agent.view` | Capture the current pane snapshot of an agent session. | configured-agent-adapter | legacy |
| 12 | `agent.kill` | Close an agent session. | configured-agent-adapter | legacy |
| 13 | `artifact.put` | Persist an artifact under a trace ID. | gateway-local | legacy |
| 14 | `artifact.get` | Read an artifact by artifact ID. | gateway-local | legacy |
| 15 | `artifact.list` | List artifacts under a trace ID. | gateway-local | legacy |
| 16 | `artifact.share` | Share an artifact with a requester, applying policy and sanitization. | gateway-local | legacy |
| 17 | `approval.request` | Create a pending approval. Non-blocking. Returns immediately with status='pending'. | gateway-local | legacy |
| 18 | `approval.respond` | Operator decides a pending approval. Idempotent on already-decided approvals. | gateway-local | legacy |
| 19 | `approval.poll` | Cheap status read. Always non-blocking. | gateway-local | legacy |
| 20 | `approval.wait` | Wait for an approval decision, bounded by AGENTS_APPROVAL_MAX_WAIT_MS. Returns pending on timeout. | gateway-local | legacy |
| 21 | `message.send` | Send a message between participants of an orchestration trace. | gateway-local | legacy |
| 22 | `message.list` | List messages in a trace. | gateway-local | legacy |
| 23 | `message.reply` | Reply to a message in the same trace. | gateway-local | legacy |
| 24 | `session.attach_info` | Return the tmux attach command for a supervised agent session. | gateway-local | legacy |
| 25 | `session.intervention_note` | Record a manual human intervention note tied to a session. | gateway-local | legacy |
| 26 | `coordination.status` | Probe coordination readiness and report its canonical scope and lease limits. | coordination-redis | local-only |
| 27 | `coordination.register` | Register a leased participant in the coordination plane. | coordination-redis | local-only |
| 28 | `coordination.heartbeat` | Renew an authenticated coordination participant lease. | coordination-redis | local-only |
| 29 | `coordination.discover` | Discover active participants in the caller's coordination scope. | coordination-redis | local-only |
| 30 | `coordination.unregister` | Remove an authenticated participant from the coordination plane. | coordination-redis | local-only |
| 31 | `coordination.send` | Send an addressed message to an active coordination participant. | coordination-redis | local-only |
| 32 | `coordination.receive` | Receive or reclaim addressed coordination deliveries. | coordination-redis | local-only |
| 33 | `coordination.ack` | Acknowledge addressed coordination deliveries. | coordination-redis | local-only |
| 34 | `orchestration.reattach` | Explicitly reattach a persisted Linux local stdio SQLite trace. | gateway-local | legacy |

## Machine-verifiable examples

Each catalog entry owns one non-secret structural example. The contract suite
validates every example with both Zod and the published JSON Schema; examples
are deliberately kept in the typed catalog so prose cannot become authoritative.

### `orchestration.create`

```json mcp-tool-call
{"tool":"orchestration.create","arguments":{"callerAgent":"claude-code","callerRole":"orchestrator","goal":"Coordinate a reviewed change"}}
```

### `orchestration.view`

```json mcp-tool-call
{"tool":"orchestration.view","arguments":{"traceId":"tr-contract-example"}}
```

### `orchestration.pause`

```json mcp-tool-call
{"tool":"orchestration.pause","arguments":{"traceId":"tr-contract-example"}}
```

### `orchestration.resume`

```json mcp-tool-call
{"tool":"orchestration.resume","arguments":{"traceId":"tr-contract-example"}}
```

### `orchestration.cancel`

```json mcp-tool-call
{"tool":"orchestration.cancel","arguments":{"traceId":"tr-contract-example"}}
```

### `orchestration.complete`

```json mcp-tool-call
{"tool":"orchestration.complete","arguments":{"traceId":"tr-contract-example"}}
```

### `task.assign`

```json mcp-tool-call
{"tool":"task.assign","arguments":{"traceId":"tr-contract-example","caller":{"agent":"claude-code","role":"orchestrator"},"target":{"agent":"codex","role":"coder","action":"code.write"},"repo":"sample-apps","brief":"Implement the reviewed task"}}
```

### `agent.delegate`

```json mcp-tool-call
{"tool":"agent.delegate","arguments":{"agent":"codex","role":"coder","repo":"sample-apps","cwd":"/workspace/sample-apps","prompt":"Implement the assigned change","traceId":"tr-contract-example","taskId":"task-contract-example"}}
```

### `agent.spawn`

```json mcp-tool-call
{"tool":"agent.spawn","arguments":{"agent":"codex","role":"coder","repo":"sample-apps","cwd":"/workspace/sample-apps","traceId":"tr-contract-example","taskId":"task-contract-example"}}
```

### `agent.ask`

```json mcp-tool-call
{"tool":"agent.ask","arguments":{"sessionId":"sess-contract-example","prompt":"Report current progress","traceId":"tr-contract-example"}}
```

### `agent.view`

```json mcp-tool-call
{"tool":"agent.view","arguments":{"sessionId":"sess-contract-example","traceId":"tr-contract-example"}}
```

### `agent.kill`

```json mcp-tool-call
{"tool":"agent.kill","arguments":{"sessionId":"sess-contract-example","traceId":"tr-contract-example"}}
```

### `artifact.put`

```json mcp-tool-call
{"tool":"artifact.put","arguments":{"traceId":"tr-contract-example","kind":"review_notes","classification":"internal","producedBy":"sess-reviewer","content":"Review completed without blockers"}}
```

### `artifact.get`

```json mcp-tool-call
{"tool":"artifact.get","arguments":{"artifactId":"art-contract-example","requesterAgent":"claude-code","requesterRole":"reviewer"}}
```

### `artifact.list`

```json mcp-tool-call
{"tool":"artifact.list","arguments":{"traceId":"tr-contract-example","requesterAgent":"claude-code","requesterRole":"reviewer"}}
```

### `artifact.share`

```json mcp-tool-call
{"tool":"artifact.share","arguments":{"artifactId":"art-contract-example","requesterAgent":"claude-code","requesterRole":"reviewer","traceId":"tr-contract-example"}}
```

### `approval.request`

```json mcp-tool-call
{"tool":"approval.request","arguments":{"traceId":"tr-contract-example","action":"code.apply","requestedBy":"orchestrator","context":{"repo":"sample-apps"}}}
```

### `approval.respond`

```json mcp-tool-call
{"tool":"approval.respond","arguments":{"approvalId":"apr-contract-example","decision":"granted","decidedBy":"operator"}}
```

### `approval.poll`

```json mcp-tool-call
{"tool":"approval.poll","arguments":{"approvalId":"apr-contract-example"}}
```

### `approval.wait`

```json mcp-tool-call
{"tool":"approval.wait","arguments":{"approvalId":"apr-contract-example","timeoutMs":1000}}
```

### `message.send`

```json mcp-tool-call
{"tool":"message.send","arguments":{"traceId":"tr-contract-example","accessToken":"trace-access-token","fromId":"orchestrator","toId":"reviewer","body":"Review is ready"}}
```

### `message.list`

```json mcp-tool-call
{"tool":"message.list","arguments":{"traceId":"tr-contract-example","accessToken":"trace-access-token"}}
```

### `message.reply`

```json mcp-tool-call
{"tool":"message.reply","arguments":{"traceId":"tr-contract-example","accessToken":"trace-access-token","parentMessageId":"msg-parent","fromId":"reviewer","toId":"orchestrator","body":"Review completed"}}
```

### `session.attach_info`

```json mcp-tool-call
{"tool":"session.attach_info","arguments":{"sessionId":"sess-contract-example"}}
```

### `session.intervention_note`

```json mcp-tool-call
{"tool":"session.intervention_note","arguments":{"sessionId":"sess-contract-example","traceId":"tr-contract-example","note":"Operator clarified the requested scope","by":"operator"}}
```

### `coordination.status`

```json mcp-tool-call
{"tool":"coordination.status","arguments":{}}
```

### `coordination.register`

```json mcp-tool-call
{"tool":"coordination.register","arguments":{"participantType":"orchestrator","scopeId":"agents-orchestrator","displayName":"Primary orchestrator","capabilities":["coordination.v1"],"metadata":{"ready":true,"retries":0,"parent":null},"leaseTtlMs":900000}}
```

### `coordination.heartbeat`

```json mcp-tool-call
{"tool":"coordination.heartbeat","arguments":{"participantId":"pt-contract-example","leaseToken":"lease-token-with-at-least-32-characters","leaseTtlMs":900000}}
```

### `coordination.discover`

```json mcp-tool-call
{"tool":"coordination.discover","arguments":{"participantId":"pt-contract-example","leaseToken":"lease-token-with-at-least-32-characters","scopeId":"agents-orchestrator","participantType":"orchestrator","capability":"coordination.v1"}}
```

### `coordination.unregister`

```json mcp-tool-call
{"tool":"coordination.unregister","arguments":{"participantId":"pt-contract-example","leaseToken":"lease-token-with-at-least-32-characters"}}
```

### `coordination.send`

```json mcp-tool-call
{"tool":"coordination.send","arguments":{"participantId":"pt-contract-example","leaseToken":"lease-token-with-at-least-32-characters","toParticipantId":"pt-reviewer","messageId":"cm-contract-example","messageType":"REVIEW_REQUEST","classification":"internal","body":"Review candidate is ready","traceId":"tr-contract-example"}}
```

### `coordination.receive`

```json mcp-tool-call
{"tool":"coordination.receive","arguments":{"participantId":"pt-contract-example","leaseToken":"lease-token-with-at-least-32-characters","consumerId":"reviewer-process","count":10,"reclaimIdleMs":0,"blockMs":1000}}
```

### `coordination.ack`

```json mcp-tool-call
{"tool":"coordination.ack","arguments":{"participantId":"pt-contract-example","leaseToken":"lease-token-with-at-least-32-characters","deliveryIds":["1-0"]}}
```

### `orchestration.reattach`

```json mcp-tool-call
{"tool":"orchestration.reattach","arguments":{"traceId":"tr-contract-example"}}
```

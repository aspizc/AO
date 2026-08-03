# Security and threat-model audit

## Verdict

**Grade: D for the control plane and F for treating real agents as untrusted
subjects.** Connection-scoped authority is a major improvement, but the
execution, isolation and recursive-control boundaries remain exploitable in
the supported local threat model.

No destructive or denial-of-service testing was performed. The audit used
source inspection, existing adversarial tests and read-only process/file
metadata.

## Actors and assets

Actors:

- local operator;
- potentially prompt-injected orchestrator;
- delegated untrusted agents;
- provider CLIs and external model services;
- processes sharing the host UID;
- LangGraph/Temporal workers;
- Redis coordination participants;
- CI/release runner.

Assets:

- repository, policies and plan/review evidence;
- host/provider credentials and environment;
- approvals, capabilities and execution grants;
- prompts, outputs and artifacts;
- SQLite/PostgreSQL state;
- JSONL/Redis audit;
- Temporal histories;
- release candidate identity.

## Trust boundaries

```text
operator / MCP client
        │
        ▼
RequestContext + policy
        │
        ├─ artifact / approval / lifecycle stores
        ├─ coordination Redis
        ├─ audit JSONL + Redis projection
        └─ provider adapters
                │
                ├─ direct child process
                └─ tmux shell/session
                         │
                         └─ provider CLI / untrusted agent
```

The intended boundary is the Gateway. In the current runtime, children can
inherit the configuration needed to start another complete Gateway, so the
boundary is replicated inside the subject it is meant to constrain.

## Security findings

### SEC-01 — Active execution is not isolated

**Critical, exploitable, partial.** The process supervisor is well designed,
but no production adapter imports it. Codex/Claude direct paths use
`spawnSync`; all three adapters inherit host environment and expose raw
stdout/stderr contracts
(`gateway/src/adapters/codex_adapter.js:267-310`,
`claude_adapter.js:238-259`, `gemini_adapter.js:177-199`,
`gateway/src/services/agent_service.js:263-299,540-566`).

The child shares UID, filesystem and accessible credentials with the control
plane. D/0/01 splice and D/0/02 must close this before real agents are treated
as untrusted.

### SEC-02 — tmux remains a shell-facing control channel

**Critical, exploitable, partial.** Spawn paths use `.join(" ")` and
`send-keys`; ask paths write prompts into a target whose foreground process can
change
(`codex_adapter.js:404-417,447-461`,
`claude_adapter.js:337-346,368-381`,
`gemini_adapter.js:276-282,310-323`,
`gateway/src/adapters/tmux_client.js:15-17`).

D/0/07a–b are built, but D/0/07c–d and the product splice are not. The
existence of authenticated session-port primitives does not secure the active
path.

### SEC-03 — Recursive Gateway defeats the control boundary

**Critical, exploitable, open.** `.mcp.json:3-16` exposes a real Gateway,
workspace write and `code.apply` autoapproval within the repository. Provider
children inherit environment/configuration, while each Gateway exposes the
full registry (`gateway/src/tools/index.js:29-50`).

The runtime census found 60 Gateways, 58 on one external workspace. D/0/05 is
the code owner, but D/0/02 and D/0/03 must establish isolation and ownership
first.

### SEC-04 — Artifact labels are caller-controlled

**Critical, open.** Although producer identity is improved by RequestContext,
`artifact.put` still accepts kind/classification and related metadata from the
caller (`gateway/src/tools/artifact.js:36-47`,
`gateway/src/core/artifact_store.js:41-101`). A caller can influence whether
the regex sanitizer is invoked and how downstream policy interprets content.

F/0/00 must derive classification, source and projection server-side. Unknown
or unverifiable content should default to the most restrictive applicable
class.

### SEC-05 — Approval is not an effect-bound capability

**High, open.** `approval.respond` is excluded from default agent-facing
RequestContext capabilities, which is a strong local boundary. However, the
operator CLI still writes a decision directly, and provider launch consumes a
policy `allow`, not a signed, audience-bound, single-use capability tied to
the exact effect.

E/0/01–02/05 must bind decision, task, repository, command/effect digest,
mode, expiry, nonce, maximum uses and revocation, then consume the grant
atomically at launch.

### SEC-06 — No global abuse budget

**High, open.** The isolated supervisor contains local limits, but active
adapters do not use them and no common admission layer caps processes,
concurrency, output bytes, disk or provider cost. The observed process
amplification is evidence of the consequence. Owner: D/0/06.

### SEC-07 — Authority is connection-local and expires

**Medium availability/security-boundary finding, new.** RequestContext stores
lineage in memory and uses a fixed 24-hour TTL
(`request_context.js:12,303-307,404-436,803-874,925-942`). Reconnect/restart
cannot safely recover persisted traces. This is fail-closed rather than an
authorization bypass, but it pushes operators toward unsafe workarounds and
breaks long workflows.

The correction must preserve server ownership through a durable authenticated
channel or reconnect token, not accept raw IDs.

### SEC-08 — Temporal decisions are not yet authoritative

**Medium/High latent, open.** Temporal signals accept an object and workflow
advance can rely on textual status
(`orchestrator-langgraph/src/orchestrator_langgraph/workflows.py:92-95,
320-364,478-479`). The signal is not tied to an approval ID, effect digest or
authoritative Gateway resolution. Owner: I/0/02.

### SEC-09 — Coordination registration lacks membership admission

**Medium, open.** Lease verification, scope fencing and timing-safe comparison
are strong after registration, but registration itself does not require an
invitation or membership decision
(`gateway/src/services/coordination_service.js:841-851,971-1026`). Closed
scope admission belongs to G/0/04.

### SEC-10 — Local configuration and audit hardening remain incomplete

**Medium contextual.** Development Compose exposes PostgreSQL/Redis with
development credentials/no auth. Some connection URLs enter process argv.
JSONL audit is append-only by convention but not tamper-evident, and selected
events retain prompt/context prefixes. Owners: I/0/05, I/0/07 and I/0/09.

## Closed or materially improved findings

| Prior finding | Current status | Evidence |
|---|---|---|
| Caller-spoofed MCP principal/repository/lineage | BUILT for one connection | D/0/00, RequestContext and adversarial E2E |
| Unknown policy action may allow | CLOSED | `gateway/src/core/policy_engine.js:31-35` |
| Coordination lease replay/cross-scope access | STRONGLY MITIGATED | Atomic Redis checks, timing-safe compare and race tests |
| Autoapproval of protected/restricted actions | MITIGATED | Action/repository/classification checks in approval service |
| Dependency high findings | IMPROVED | Two moderate advisories, no high/critical |

## STRIDE summary

| Threat | Current exposure |
|---|---|
| Spoofing | Reduced inside one RequestContext; reconnect and operator identity remain incomplete |
| Tampering | Same-UID child and multiwriter control stores remain exposed |
| Repudiation | Rich audit events exist; cross-store/tamper-evident integrity is missing |
| Information disclosure | Raw provider output and caller-selected artifact classification remain high risk |
| Denial of service | No global budget; recursive Gateways already amplify memory/process use |
| Elevation of privilege | Recursive control plane, shell-facing tmux and non-effect-bound approvals remain critical |

## Security remediation order

1. Operationally prevent further recursive Gateway inheritance.
2. Finish D/0/07c–d and migrate every adapter to D/0/01.
3. Implement D/0/02 isolation/mediated output and F/0/00 server-owned artifact
   authority.
4. Establish D/0/03 single writer and D/0/06 budgets, then D/0/05
   non-recursion.
5. Deliver E/0/01–02/05 capability-bound approvals and modes.
6. Prove the boundary with D/0/04 and protected H/0/05.
7. Close Temporal/coordination admission and tamper-evident audit through
   G/0/04 and I/0/02/09.

## Security release bar

No release should claim safe untrusted-agent execution until a real provider
test proves that the child cannot:

- access or start the control Gateway;
- read control credentials/state outside its grant;
- alter shell/session control;
- downgrade artifact classification;
- reuse approval/review authority;
- exceed the global process/output/cost budget;
- survive cancellation or terminal cleanup.


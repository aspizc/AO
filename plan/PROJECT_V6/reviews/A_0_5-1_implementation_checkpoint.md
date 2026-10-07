# A_0_5 — Implementation discovery checkpoint 1

Date: 2026-10-07. Status: **implementation pending plan refinement**.
This is a coder checkpoint, not an independent verdict or approval.

- Sheet: `plan/PROJECT_V6/A/0/05.md`.
- Base: `327043a` (`327043a docs(plan): approve guarded tmux paste prerequisite (V6 A/0/04)`).
- Worktree: `workspace/clones/wt-v6-a05`.
- Branch: `feat/V6-A-0-05-reattach`.
- Trace: `tr-v6-a05-dc1ac6b8-c492-4d91-8702-ad4f2010dcdd`.
- Execution: operator-authorized built-in Codex fallback after Gateway
  `task.assign` returned `REQUEST_CONTEXT_DENIED` (reported in the root brief).
- Constraint: no production change, commit, independent verdict, full gate,
  policy change, or edit outside this worktree.

## Existing authorization and the gap

The operator's existing decision stands: the same user and canonical
repository may explicitly reattach without an extra approval request
(`A_0_5_human_decision.md`). This checkpoint does not infer a new human gate.
The root explicitly requested a checkpoint rather than an invented
principal/authentication contract if the sheet cannot be implemented as written.

At the base, `createGatewayRequestContext` assigns
`config.requestPrincipalId || "local-stdio-operator"`
(`gateway/src/core/request_context.js:933`). The production caller loads
`loadConfig()` and supplies that config unchanged
(`gateway/src/mcp_server.js:223`, `:246`); `loadConfig` exposes only
`requestPrincipalAgent`, from `AGENTS_REQUEST_PRINCIPAL_AGENT`
(`gateway/src/config.js:203`), and does not populate `requestPrincipalId`.
There is no Gateway JavaScript reader for OS user ID or peer credentials.
Thus the shipped startup path gives every local stdio host the same fixed
principal value. Comparing that value across restarts does not distinguish
users. Manually injecting two different `principalId` values in fixture
contexts would verify equality logic without verifying the production user
binding required by the decision.

`docs/architecture.md:32` documents a server-owned context and a configured
host/provider identity; `docs/project-status.md:42` documents local operator
trust and no multi-user network service. Neither specifies that the OS
principal of the stdio server is the user identity for reattachment.
Multi-user authentication is historically deferred
(`docs/adr/ADR-004-mvp-scope.md:41`). The Python supervisor checks effective UID
for its own local socket/file ownership
(`gateway/src/adapters/process_supervisor_helper.py:3783`, `:3823`, `:4577`),
but does not establish the Gateway request principal. Those checks cannot be
silently reused as an authorization contract for MCP traces.

## Verified historical anchors

Every location named by sheet 05 matches base `327043a`; the worktree has no
production diff against that base.

| Sheet anchor | Observed behavior at the base |
|---|---|
| `request_context.js:918` | Gateway context construction supplies no lineage. |
| `request_context.js:146` | Default lineage creates empty maps; only traces and tasks can be seeded. |
| `request_context.js:405-410` | A missing in-memory trace throws `context.trace_denied`. |
| `request_context.js:311` | A connection mismatch is still denied before action binding. |
| `mcp_server.js:244` | Each server start creates a fresh connection UUID. |
| `mcp_server.js:189-203` | An escaped RequestContextError adds a reason attribute; see logging caveat below. |

The public error stays generic. The existing protected-tool wrapper catches
RequestContextError and returns a sanitized error result
(`gateway/src/tools/tool_helpers.js:195`), so the server's escaped-exception
path is not reached for ordinary protected-tool denials. A/0/05's operator
reason logging must use a private observer or equivalent wiring through that
wrapper while preserving the public envelope. Reconcile this serially with
A/0/04's error projection work and root-owned MCP server integration.

## Repository representation

Canonical directory identity is already verified with realpath, containment,
and rejection of ambiguous IDs (`request_context.js:95`, `:358`, `:882-915`).
That existing identity should be reused.

A trace is initially repository-free (`request_context.js:447`, `:815`).
`task.assign` checks each task's repository independently (`:458-475`) and
stores it on the task (`:821-827`), without changing the trace's null
repository field. `task_repo.js:20` persists each task's registry repository
ID. Multiple repositories can therefore belong to one owned trace. A reattach
tool taking only `{ traceId }` needs an explicit rule for comparing those
bindings, including a trace with no tasks. Picking one task's repository would
lose authority checks for the others.

The existing state repository already persists orchestration, task and session
rows; sessions include their tmux targets. It does not persist the context
owner, context expiry, canonical roots, or task target action. Reusing the
existing SQLite/Postgres state interface and a transaction is the smallest
storage direction. A targeted search found no JavaScript filesystem
atomic-write helper in Gateway core/services, so no new JSON storage engine
should be invented to satisfy the sheet's helper wording.

## Reproducers run at the base

These are deterministic local discovery probes, not live Codex evidence.
Run from the assigned worktree. Neither changes production files.

```bash
node --input-type=module <<'JS'
import { createGatewayRequestContext } from './gateway/src/core/request_context.js';
const config = { repoRoot: process.cwd() };
const registries = { raw: () => ({ repositories: {} }) };
const first = createGatewayRequestContext({
  config: { ...config, requestPrincipalAgent: 'codex' },
  registries, connectionId: 'before-restart',
});
const second = createGatewayRequestContext({
  config: { ...config, requestPrincipalAgent: 'claude-code' },
  registries, connectionId: 'after-restart',
});
console.log(JSON.stringify({
  first: first.actor, second: second.actor,
  samePrincipal: first.actor.principalId === second.actor.principalId,
  sameConnection: first.connectionId === second.connectionId,
}));
JS
```

Observed exit 0, with both `principalId` values `local-stdio-operator`,
`samePrincipal:true`, and `sameConnection:false`. This proves the fixed
production-default identity collision across contexts/providers; it does not
claim to have launched the processes as different OS users.

```bash
node --input-type=module <<'JS'
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequestContext, bindRequestContext,
  recordRequestContextResult } from './gateway/src/core/request_context.js';
import { ACTION_CATALOG_VERSION } from './gateway/src/core/policy_types.js';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'v6-a05-repo-repro-'));
try {
  const app = path.join(root, 'app');
  const tools = path.join(root, 'tools');
  fs.mkdirSync(app);
  fs.mkdirSync(tools);
  const context = createRequestContext({
    principalId: 'fixture-operator', agent: 'codex', role: 'orchestrator',
    audience: 'test', connectionId: 'before',
    capabilities: ['orchestration.create', 'task.assign'],
    repositoryBindings: { app, tools },
  });
  const bind = (action, args) => bindRequestContext(context, {
    action, args, audience: 'test', connectionId: 'before',
    actionCatalogVersion: ACTION_CATALOG_VERSION,
  });
  recordRequestContextResult(context,
    bind('orchestration.create', { callerAgent: 'codex', callerRole: 'orchestrator' }),
    { traceId: 'tr-multiple-repositories' });
  const bindings = [];
  for (const repo of ['app', 'tools']) {
    const task = bind('task.assign', {
      traceId: 'tr-multiple-repositories',
      caller: { agent: 'codex', role: 'orchestrator' },
      target: { agent: 'codex', role: 'coder', action: 'code.read' }, repo,
    });
    recordRequestContextResult(context, task, {
      taskId: `ts-${repo}`, assignedAgent: 'codex', assignedRole: 'coder',
    });
    bindings.push({ traceId: task.traceId, repositoryId: task.repository.id });
  }
  console.log(JSON.stringify({ bindings }));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
JS
```

Observed exit 0 and two accepted task bindings for the same trace:
`app` and `tools`. This probe checks request-context binding directly; it is
not a launch or independent policy verdict.

## Smallest design options for independent plan review

1. **Local stdio OS identity:** explicitly define the stable user identity as
   the OS principal under which the stdio server runs, read it from the OS at
   startup, and bind it with the existing canonical repository identity.
   Unsupported platforms or unavailable credentials must fail closed for
   reattachment. This is the smallest local-only direction consistent with
   the current trust model, but the mapping and supported-platform behavior
   are not documented yet. Provider names, environment username assertions,
   and caller fields must not establish this identity. This option adds no
   approval request and no multi-user network service.
2. **Host-verified identity:** require the host/bootstrap to deliver an
   authenticated user principal with a defined validation contract. This
   would need new host integration and is a larger prerequisite. A raw
   configured string alone does not verify a user.
3. **Repository set:** preserve existing multi-repository traces by recording
   every relevant `(registry ID, canonical root)` binding and requiring each
   one to match the current verified context before any task/session is
   rebound. Missing or changed bindings deny the whole reattach. A narrower
   single-repository recovery rule could refuse multi-repository traces,
   but would need to be stated explicitly. Specify whether taskless traces
   remain non-reattachable until their first verified task binding.

The plan should also define `orchestration.view` discovery behavior. Its
current schema requires `traceId` (`catalog.js:235-238`) and its binding
requires an already owned trace (`request_context.js:449`); it cannot list
restart-discoverable traces without an explicit schema/binding refinement.
List entries must use the same owner/repository/lifecycle/expiry filters as
reattach and must not expose foreign traces.

The subsequent TDD must distinguish production principal provenance from
fixture-injected identities; wrong user, wrong registry ID, same ID with a
changed canonical root, each multi-repository conjunct, exact expiry,
completion, cancellation, a gone target, no implicit connect recovery,
kill cleanup, and the unchanged connection-mismatch rule. Preserve generic
client denials and test that the operator reason is actually observed.

## Verification and remaining work

- Baseline command: `node --test tests/gateway/request_context*.test.js`.
- Observed exit 0: **109 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo**.
  Claude adapter cases in this suite use dry-run fixtures; no live Claude
  invocation occurred.
- A/0/05 RED: **not started**; no failing implementation tests or production
  edits were made before resolving the authority contract.
- A/0/05 GREEN: **not run**; no implementation is claimed.
- Full `bash scripts/ci.sh`: **not run**, reserved for root's serial gate.
- Live operator restart/Codex check: **not run**.
- Independent review/integration/release: **not performed or claimed**.
- `git diff --check`: exit 0; only this new checkpoint is untracked.

Next: root routes this checkpoint into independent plan refinement, then
reissues one bounded coding brief with the resolved identity and repository
comparison contracts. Keep the existing no-extra-approval decision and
explicit-only reattachment requirement intact.

# Independent Review Result — Project V5 H/0/00 Trial 3

## Verdict

**KO**

Trial 3 closes the two selection-authority substitutions demonstrated in Trial
2: resolver provenance is enforced, structural and cross-module copies are
rejected, raw model/effort/tier fields cannot accompany a supplied selection,
and the service requires exact selection identity in adapter results.

The adapter-result boundary is still not closed, however. Its allowlist checks
only top-level keys and descriptors. It accepts missing result fields, invalid
scalar types, and nested objects/Proxies with `toJSON`; those values can be
evaluated after validation and reach successful audit and MCP serialization.
An independent local fixture reproduced both the late evaluation and a
secret-bearing value in the audit JSONL and tool body. The authoritative suite
manifest also remains invalid on the same three integration-owned inventories.

## Reviewer profile

- Configured profile: **GPT-5.6 Sol, reasoning `ultra`, service profile
  `Priority/Fast`**.
- Review mode: independent, adversarial, evidence-based local QA.
- No service-profile telemetry was available. The profile above is the
  configured profile, not external proof of model, reasoning, latency, or
  service-tier execution.

## Reviewed identity

- Branch: `feat/V5-H-0-00-orchestrator-profile`
- Worktree:
  `/tmp/agents-orchestrator-v5-h000.rq46zM/worktree`
- Frozen Trial 2 result-only base:
  `5dc19888594ce6f09c08d79b7ab3da0feb04d5c2`
- Trial 3 technical commit:
  `d64695ac6d7a225f77a245a5440b4dcc6456f8f6`
- Trial 3 technical tree:
  `be8a1e442ed44b5ff5a74fc13dd1314e8314c8f4`
- Trial 3 request-only commit:
  `95767a7b658b48132c00e14563f5c3893da49a9e`
- Trial 3 request-only tree:
  `cc14762425cfdf1a6f75c44c9228c4441b2c2b28`
- Exact technical range:
  `5dc19888594ce6f09c08d79b7ab3da0feb04d5c2..d64695ac6d7a225f77a245a5440b4dcc6456f8f6`
- Canonical profile digest:
  `sha256:fbca366c3479e4e3e00b038e54c866281b6d0e442f9889d125f47e5c83b7212a`

The technical commit is the direct child of the frozen Trial 2 result. The
request commit is the direct child of the technical commit and adds only
`plan/reviews/PROJECT_V5/H_0_0-3_to_review.md`. The worktree was clean before
review work began.

## Blocking findings

### P1-1 — Allowed adapter-result fields accept unsafe nested values and malformed result contracts

`assertAdapterSelectionResult()` defines operation-specific top-level
allowlists and rejects a top-level array, Proxy, non-plain prototype, unknown
key, or accessor (`gateway/src/services/agent_service.js:263-315`). It then
copies each descriptor value into a new object and shallow-freezes that object.
It validates only:

- presence and exact identity of `effectiveSelection`;
- canonical consumption/projection of that selection; and
- equality of optional redundant `model`, `reasoningEffort`, and
  `serviceTier` fields
  (`gateway/src/services/agent_service.js:317-340`).

It does not require or type-check delegate fields such as `stdout`, `stderr`,
`exitCode`, and `dryRun`, or spawn fields such as `sessionId`, `tmuxTarget`,
`attachCommand`, `launchCommand`, and `dryRun`. It also does not reject an
object, Proxy, accessor-bearing object, function, or `toJSON` carrier stored as
the data value of an allowed field.

For spawn, the unchecked `sessionId` is included in the successful model audit
(`gateway/src/services/agent_service.js:503-525`). The audit writer invokes
`JSON.stringify()` on it (`gateway/src/core/audit.js:75-80`), and the tool
response invokes `JSON.stringify()` again
(`gateway/src/tools/tool_errors.js:159-162`). Validation has therefore
completed before either late evaluation.

#### Exact local reproduction

A temporary fixture outside the repository, removed after the probe, used the
real canonical registries, `createAgentService()`, and the real
`agent.spawn` tool wrapper. It supplied this otherwise allowlisted fake-adapter
result:

```js
let nestedReads = 0;
const secret = "nested-result-raw-alias-S3CRET";
const nestedSessionId = new Proxy({}, {
  get(target, key, receiver) {
    if (key === "toJSON") {
      nestedReads += 1;
      return () => secret;
    }
    return Reflect.get(target, key, receiver);
  },
});

async function spawn(args) {
  return {
    sessionId: nestedSessionId,
    tmuxTarget: "probe-target",
    attachCommand: "tmux attach -t probe-target",
    launchCommand: "probe",
    dryRun: true,
    effectiveSelection: args.effectiveSelection,
  };
}
```

The tool call used valid `codex`/`coder`/`sample-apps` arguments and a wrapper
that set `taskId: null` only at the service fixture boundary, avoiding session
persistence while retaining the real tool serializer. The exact command was:

```text
env -u AGENTS_REDIS_URL -u AGENTS_DRY_RUN \
  -u AGENTS_CODEX_MODEL -u AGENTS_CODEX_REASONING_EFFORT \
  -u AGENTS_CODEX_SERVICE_TIER \
  node /tmp/h000-trial3-review-probes.unfdbr/result_contract_probe.mjs
```

Observed:

```json
{
  "nestedProxyAccepted": true,
  "nestedReads": 2,
  "toolSessionId": "nested-result-raw-alias-S3CRET",
  "auditSessionId": "nested-result-raw-alias-S3CRET",
  "secretReachedTool": true,
  "secretReachedAudit": true,
  "missingDelegateFieldsAccepted": true,
  "minimalDelegateKeys": [
    "effectiveSelection",
    "sessionId"
  ],
  "invalidScalarTypesAccepted": true,
  "exitCodeType": "string",
  "dryRunType": "string"
}
```

The two delegate variants returned, respectively:

```js
{ effectiveSelection: args.effectiveSelection }
```

and:

```js
{
  stdout: "ok",
  stderr: "",
  exitCode: "0",
  dryRun: "true",
  effectiveSelection: args.effectiveSelection,
}
```

Both were accepted as successful tool results. Thus malformed exit semantics
and incomplete results survive the new allowlist, while a nested Proxy executes
after validation and contaminates successful audit/output. No provider, child,
tmux, Redis, network, or shared service was used.

Required correction:

1. Define exact result schemas per operation, including required fields and
   primitive value types. At minimum, stdout/stderr and session/command/target/
   sandbox values must be strings, `dryRun` must be boolean, and `exitCode`
   must be a finite integer under the repository's documented exit contract.
2. Reject nested objects, Proxies, functions, accessors, and serialization
   hooks in every result field before service persistence or
   `AGENT_MODEL_RESOLVED`.
3. Return a fresh, deeply safe result DTO containing only validated primitive
   values and the exact canonical selection.
4. Add delegate and spawn tests for missing fields, wrong primitive types,
   nested Proxy/`toJSON`/accessor values, non-finite and malformed exit codes,
   and zero successful model/session audit or persistence on rejection.
5. Retain compatibility tests for every legitimate Codex and Claude dry-run
   and real-result field, including non-zero provider exit codes.

### P1-2 — The authoritative safe gate still cannot start on the reviewed tree

Read-only validation:

```text
python scripts/ci_gate.py --repo-root . --manifest ci/suites.json --validate-only
```

exited `2`, ran zero suites, and returned `status: invalid_manifest` with
exactly:

```text
lint.gateway: stale inventorySha256; expected sha256:7988ced5b2b5c0baf4ecad0a34e52c97d3f9956b9470c783dadb328cc8704c22
test.gateway: stale inventorySha256; expected sha256:b81bc1a16e2ac4b0e485f3aaf3ef56f598323565bbcb6d97717166dcb982e6ab
policy.registry: stale inventorySha256; expected sha256:05873e6acdc570e306947afbbf5b3a4f45a33420ff0a132a172069606bcdfef3
```

Trial 2's exact Trial 3 exit condition requires refreshed inventories and a
green authoritative safe gate on one final technical tree. That evidence still
does not exist. After correcting P1-1, the integration owner must refresh only
the three hashes through the repository-owned mechanism and run the complete
safe gate on that same final tree. This reviewer did not edit the manifest or
infer a green aggregate.

## Trial 2 finding disposition

| Trial 2 requirement | Trial 3 result |
|---|---|
| Reject mutable/frozen/rehydrated/extra/source-tampered/Proxy/cross-module selections | **Corrected for the exercised boundaries.** Resolver provenance and exact frozen data shapes are enforced. |
| Eliminate or reject simultaneous raw model/effort/tier fields | **Corrected.** Codex and Claude delegate/spawn reject each non-null raw field before lifecycle effects. |
| Preserve one exact selection through policy, adapters, audit, delegate, spawn, dry-run, and tool output | **Corrected for the canonical selection itself.** Exact identity and safe selection projection pass. |
| Reject malformed adversarial adapter results before successful persistence/audit | **Still KO.** Selection substitution is rejected, but malformed allowed fields and nested executable values survive, as P1-1 reproduces. |
| Retain Gemini, registry-drift, safe-denial, D/0/00, and no-provider behavior | **Accepted in the executed focal and regression scope.** |
| Green authoritative safe gate on the exact final tree | **Still KO.** Validation stops on the three stale inventories. |

## Positive evidence

- Module-private resolver provenance rejects mutable, frozen, JSON-rehydrated,
  extra-field, source-tampered, Proxy-wrapped, cross-provider, and
  cross-module-instance selections.
- A genuine supplied selection cannot coexist with non-null raw `model`,
  `reasoningEffort`, or `serviceTier` fields in Codex or Claude delegate/spawn.
- The service no longer sends raw selection scalars to adapters.
- Actor policy, target policy, adapter consumption, safe audit projection,
  service result, and tool result preserve the exact canonical selection in the
  covered normal paths.
- Missing, cloned, replaced, extended, contradictory, top-level proxied, and
  top-level accessor-backed selection results are rejected before successful
  service model audit or session persistence.
- Current legitimate Codex and Claude result shapes pass the focused adapter,
  runtime, and tool tests. No regression was observed for their declared
  stdout/stderr/model/effort/tier/sandbox/session/attach/launch fields in that
  scope.
- Registry-only Gemini, capability-registry drift, unknown/unsupported
  selections, D/0/00 tuple binding, actor/target separation, safe error
  serialization, and no-provider E2E remained green.

## Verification performed

- H profile/authority/contract/runtime/tool focus:

  ```text
  env -u AGENTS_REDIS_URL -u AGENTS_DRY_RUN \
    -u AGENTS_CODEX_MODEL -u AGENTS_CODEX_REASONING_EFFORT \
    -u AGENTS_CODEX_SERVICE_TIER \
    node --test --test-concurrency=1 \
    tests/gateway/orchestrator_profile.test.js \
    tests/gateway/orchestrator_profile_authority.test.js \
    tests/gateway/orchestrator_profile_contract.test.js \
    tests/gateway/orchestrator_profile_runtime.test.js \
    tests/gateway/tool_agent_model.test.js
  ```

  Result: `71` tests; `71` passed, `0` failed, `0` skipped.

- D/0/00 request-context/binding/approval/error/bypass regression:
  `171` tests; `171` passed, `0` failed, `0` skipped. The command included
  `request_context*.test.js`, approval service/state/wait/policy/tool tests,
  `tool_error_serialization.test.js`, and
  `tests/e2e/bypass_regression.test.js`.

- Remaining explicit no-real-provider E2E:

  ```text
  node --test --test-concurrency=1 \
    tests/e2e/mcp_two_agent_workflow.test.js \
    tests/e2e/mvp_restricted_flow.test.js
  ```

  Result: `2` tests; `2` passed. Together with the `23` bypass E2E tests above,
  the explicit three-file no-provider inventory passed `25/25`.

- Independent temporary adapter-result probe:
  reproduced P1-1 exactly as shown above; the temporary directory was removed
  after execution.
- `npm --prefix gateway run lint`: passed.
- `env -u AGENTS_POLICIES_DIR .venv/bin/agent-run policy validate`: passed
  with `3` agents, `7` repositories, and `8` roles.
- `git diff --check
  5dc19888594ce6f09c08d79b7ab3da0feb04d5c2..d64695ac6d7a225f77a245a5440b4dcc6456f8f6`:
  passed.
- Authoritative manifest validate-only: exited `2` with exactly the three stale
  hashes in P1-2.
- Git identity/request-only checks: passed; the worktree remained clean until
  this result file was created.

## Review limits

Because P1-1 independently blocks the Trial 3 exit condition, the review did
not run the full explicit Gateway inventory, the structure aggregate,
`tests/gateway/tmux_client.test.js`, `npm --prefix gateway test`,
`scripts/ci.sh`, or another aggregate that could include tmux. It did not use a
real provider, real agent, live MCP/KYA workflow, shared Redis, external
network, YOLO, or shared service. It did not edit production code, tests,
contracts, policies, schemas, plans, ADRs, CI manifests, or the review request.

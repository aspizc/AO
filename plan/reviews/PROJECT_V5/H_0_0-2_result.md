# Independent Review Result — Project V5 H/0/00 Trial 2

## Verdict

**KO**

The ordinary service-owned path now resolves one frozen canonical selection,
preserves its identity through actor and target policy, blocks registry-only
Gemini, projects safe audit fields, and retains the D/0/00 execution-binding
boundary. However, the claimed single authority is not enforced at either end
of the adapter boundary:

1. Codex and Claude accept a structurally valid, mutable clone as though it
   were the service-owned selection and ignore contradictory raw model fields.
2. The service trusts an adapter's returned `effectiveSelection`, so a clone or
   replacement can make the dry-run/tool result disagree with policy and audit.

Both conditions were reproduced without tmux or a provider. In addition, the
authoritative suite manifest still fails validation on the same three
integration-owned inventories, so Trial 1 KO-4 remains open.

## Reviewer profile

- Model: **GPT-5.6 Sol**
- Reasoning effort: **ultra**
- Service tier: **Priority/Fast**
- Review mode: independent, adversarial, evidence-based

## Reviewed identity

- Branch: `feat/V5-H-0-00-orchestrator-profile`
- Worktree:
  `/tmp/agents-orchestrator-v5-h000.rq46zM/worktree`
- Frozen Trial 2 base:
  `21fa5eb5f6d21a0e07b8a50c3146121b15c71642`
- Technical commit:
  `7626a532f9f5a913938bb730d8423827da3e5c6a`
- Technical tree:
  `3fbdbaefa661ff354c90558ac56e1257f3134b41`
- Review-request commit:
  `27d0f4403f24308ae27daf8d14772c276c2e376e`
- Review-request tree:
  `1ebe765eae255b198d173ee18ed522239b59e275`
- Exact reviewed technical range:
  `21fa5eb5f6d21a0e07b8a50c3146121b15c71642..7626a532f9f5a913938bb730d8423827da3e5c6a`
- Canonical profile digest:
  `sha256:fbca366c3479e4e3e00b038e54c866281b6d0e442f9889d125f47e5c83b7212a`

The technical commit is the direct child of the frozen base and has the
declared tree. The request commit is the direct child of the technical commit,
has the declared tree, and adds only
`plan/reviews/PROJECT_V5/H_0_0-2_to_review.md`.

## Blocking findings

### P1-1 — A direct adapter accepts an unbranded mutable clone and bypasses raw selection rejection

`assertEffectiveSelection()` validates selected field values but does not
require that the object was created by the canonical resolver, does not require
the object or nested source projection to be frozen, and does not reject extra
properties (`gateway/src/core/orchestrator_profile.js:314-393`).
`resolveAgentExecutionProfile()` gives any truthy supplied
`effectiveSelection` precedence over `model`, `reasoningEffort`, and
`serviceTier` (`gateway/src/core/policy_engine.js:222-239`).

The adapters expose that structural trust directly:

- Codex delegate and spawn omit all scalar selection fields from resolution
  whenever `effectiveSelection` is truthy
  (`gateway/src/adapters/codex_adapter.js:215-232`,
  `gateway/src/adapters/codex_adapter.js:338-355`).
- Claude delegate and spawn use the same branch
  (`gateway/src/adapters/claude_adapter.js:171-185`,
  `gateway/src/adapters/claude_adapter.js:268-281`).
- Dry-run returns the accepted object unchanged
  (`gateway/src/adapters/codex_adapter.js:249-263`,
  `gateway/src/adapters/codex_adapter.js:400-408`,
  `gateway/src/adapters/claude_adapter.js:193-205`,
  `gateway/src/adapters/claude_adapter.js:307-315`).

An independent real-class, dry-run probe used the canonical registries and a
valid D/0/00 server-owned execution binding. It supplied:

- raw `model: "unknown-model-S3CRET"`; and
- a mutable `structuredClone()` of a valid canonical Codex `gpt-5` selection.

Observed result:

```json
{
  "validBindingAcceptedUnknownModel": true,
  "effectiveModel": "gpt-5",
  "injectedIdentityPreserved": true,
  "frozen": false
}
```

The same bypass succeeds without a binding:

```json
{
  "directAcceptedUnknownModel": true,
  "directEffectiveModel": "gpt-5",
  "directSelectionIsInjected": true,
  "directSelectionFrozen": false
}
```

No provider or tmux process was used; both calls used the real
`CodexAdapter` in `dryRun: true`.

This operation performs zero canonical resolutions in the adapter path, an
unknown model does not fail, and a non-service-owned mutable object becomes the
effective adapter/dry-run authority. A frozen clone would remain forgeable, so
adding only `Object.isFrozen()` is not sufficient. This contradicts the sheet's
only-resolver and immutable-same-object requirements
(`plan/PROJECT_V5/H/0/00.md:22-32`, `plan/PROJECT_V5/H/0/00.md:80-84`) and the
ADR's claim that adapters only consume the service selection
(`docs/adr/ADR-001-gateway-only.md:45-54`).

Required correction:

1. Give resolver-created selections non-forgeable provenance, such as a
   module-private capability/brand or a closed service-to-adapter execution
   envelope, and require it at every consumer.
2. A direct adapter call without a genuine service selection must resolve once
   from the canonical request itself. A supplied clone, mutable object,
   structurally equivalent object, extra-field object, or tampered source must
   fail before cwd, lifecycle audit, session, tmux, provider, or child effects.
3. Remove the parallel raw scalar channel when a service selection is present,
   or reject any simultaneous raw fields rather than silently ignoring them.
4. Add Codex and Claude delegate/spawn tests, with and without a valid binding,
   covering mutable clones, frozen clones, extra properties, source tampering,
   and contradictory model/effort/tier values.

### P1-2 — The service lets an adapter replace the dry-run selection returned to the caller

The service passes the canonical object to the adapter, but does not reconcile
or assert the adapter result:

- delegate returns `{ sessionId, ...result }` without checking
  `result.effectiveSelection`
  (`gateway/src/services/agent_service.js:345-364`);
- spawn returns the adapter result directly
  (`gateway/src/services/agent_service.js:403-432`).

The tool wrapper serializes the returned service value as-is
(`gateway/src/tools/tool_helpers.js:187-196`). The runtime identity test avoids
this case because its fake adapter voluntarily returns the input reference
(`tests/gateway/orchestrator_profile_runtime.test.js:58-79`); it does not prove
that the service enforces the invariant.

An independent service dependency probe returned a clone with an additional
adapter-controlled field:

```json
{
  "serviceReturnedResolvedIdentity": false,
  "serviceReturnedAdapterSecret": "adapter-substitution-S3CRET"
}
```

Policy and the successful audit projector had consumed the original canonical
object, while the service/dry-run result exposed the replacement. Therefore
the same operation can report two different selections and an adapter can add
non-allowlisted data to the tool body. The currently registered adapters
cooperate, but the service does not enforce the contract that no injected,
legacy, or future adapter may substitute the authority.

Required correction:

1. Verify the adapter receipt and dry-run result against the exact canonical
   object identity before returning or persisting successful output, or strip
   adapter-owned selection data and project the service object itself.
2. Reject absent, cloned, replaced, or extended dry-run selections with a
   stable body-safe error and no session/model/launch audit or child effect.
3. Add adversarial delegate and spawn tests in which the adapter returns no
   selection, a clone, a tampered selection, and an extra-field selection.
   Assert strict `===` parity at the final service and tool body.

### P1-3 — The authoritative suite manifest remains invalid

Read-only validation:

```text
python scripts/ci_gate.py --repo-root . --manifest ci/suites.json --validate-only
```

exited `2`, ran zero suites, and returned `status: invalid_manifest` with
exactly:

```text
lint.gateway: stale inventorySha256; expected sha256:7988ced5b2b5c0baf4ecad0a34e52c97d3f9956b9470c783dadb328cc8704c22
test.gateway: stale inventorySha256; expected sha256:f629d4b93757ff6325b5f68dadde66b5149d2930480e4735dfd3f09a08aa1649
policy.registry: stale inventorySha256; expected sha256:05873e6acdc570e306947afbbf5b3a4f45a33420ff0a132a172069606bcdfef3
```

The sheet still requires `bash scripts/ci.sh`
(`plan/PROJECT_V5/H/0/00.md:90-96`), and Trial 1 KO-4 explicitly required a
green authoritative gate on the reviewed tree. Trial 2 intentionally leaves
the shared manifest unchanged, so that correction has not been demonstrated.

Required correction: after the code corrections are final, the integration
owner must refresh only the three inventory hashes through the repository-owned
mechanism and produce a green authoritative safe gate for that exact final
commit/tree. The reviewer restriction prohibited editing the shared manifest
or executing `scripts/ci.sh`; no green result is inferred.

## Documentation accuracy

The ADR and sheet accurately describe the cooperative service path, the
binding-before-resolution order, registry-only Gemini, and safe selection
projection. They overstate enforcement across the adapter boundary:

- the ADR says the adapter and dry-run consume the same service object
  (`docs/adr/ADR-001-gateway-only.md:48-54`);
- the sheet checks off same-selection and unknown-input rejection
  (`plan/PROJECT_V5/H/0/00.md:78-86`);
- the Trial 2 handoff says a direct adapter distinguishes a service-owned
  selection and that invalid supplied selections are rejected before adapter
  invocation
  (`plan/reviews/PROJECT_V5/H_0_0-2_to_review.md:76-90`).

The implementation has no service-owned selection provenance and no service
output identity check, as P1-1 and P1-2 demonstrate. These claims and checked
criteria must be corrected or narrowed after the runtime contract is fixed.

## Trial 1 KO disposition

| Trial 1 finding | Trial 2 result |
|---|---|
| KO-1 canonical selection disconnected from runtime | **Partially corrected, still KO.** The normal service path is connected and preserves identity, but direct adapter injection and adapter-result substitution remain competing authorities. |
| KO-2 Gemini can reach its runtime adapter | **Corrected for the reviewed normal/direct paths.** Service and direct adapter delegate/spawn, including dry-run and valid request binding, reject before launch/session/model audit. |
| KO-3 rejected values leak and canonical audit evidence is absent | **Corrected for canonical selection denials.** Exceptions, tool bodies, and JSONL use stable allowlisted selection rejection metadata; successful model audit includes exact digest/source. P1-2 separately permits adapter-controlled success output because the service trusts it. |
| KO-4 authoritative gate rejects candidate | **Not corrected.** The manifest remains invalid on three inventories and no authoritative suite ran. |

## Positive evidence and retained invariants

### Canonical service path

A valid bound alias probe observed:

```json
{
  "resolutions": 1,
  "actorTargetPolicyObservations": 2,
  "everyIdentityEqual": true,
  "frozen": true,
  "aliasCanonicalModel": "gpt-5.6-sol",
  "aliasSource": "explicit-alias",
  "digestMatches": true
}
```

This confirms one resolution, distinct actor and target policy checks, strict
identity through a cooperative adapter/audit/result, deep freezing, canonical
alias resolution, and the exact digest.

### Registry-only Gemini and safe denials

Independent valid-binding direct-adapter probes for both delegate and spawn
returned:

```text
EFFECTIVE_SELECTION_PROVIDER_UNAVAILABLE / agent / gemini-cli
```

Each produced zero `SESSION_STARTED` and zero `AGENT_MODEL_RESOLVED` events,
did not reach cwd/tmux/provider/child code, and retained only one ordinary safe
`ERROR` event. A secret-bearing delegate prompt was absent from the exception
projection and JSONL. Service tests also prove zero `adapters.get()` calls for
Gemini, unknown provider/model, unsupported effort/tier, and registry drift.

### D/0/00 and shared contracts

The supplied execution binding is validated before selection. The focused
D/0/00 group passed all `147` tests, including exact tuple replay, actor/target
separation, target-action policy, tool serialization, and zero effects for
pre-authority binding failure.

The technical range does not modify message tools, coordination
implementation, `agents:events`, the audit module, shared event contracts,
policies, schemas, profile/prompt/tool-guidance artifacts, CI manifests, or
provider argv builders. The no-real-provider E2E inventory and coordination
cases in the D group remained green.

## Acceptance assessment

| H/0/00 requirement | Result |
|---|---|
| One truthful profile for roles, models, tools, and unavailable prerequisites | Accepted for the unchanged Trial 1 contract. |
| Exact provider matrix, aliases, defaults, efforts, tiers, and digest | Accepted for resolver-created selections and canonical registry validation. |
| One immutable selection shared by policy, audit, dry-run, delegate, and spawn | **KO** — direct adapters accept unbranded mutable clones, and service output may be replaced. |
| Unknown/unsupported input fails before adapter or child | **KO** — a direct adapter accepts contradictory unknown raw input when a forged selection is supplied. |
| Prompt/schema references validate | Accepted; unchanged and focused tests pass. |
| Unsupported model/capability combinations fail before launch | **KO** for the injected direct-adapter combination; accepted on the ordinary service path. |
| Mutation safety metadata remains total and consistent | Accepted; unchanged focused contract tests pass. |
| No owner-personal default in the canonical profile surface | Accepted; unchanged structure test passes. |
| D/0/01 retains provider argv ownership | Accepted; builder bodies are unchanged. |
| Authoritative verification gate | **KO** — manifest validation fails before suites. |

## Verification performed

- H profile/runtime/policy/adapter/tool focus:
  - `113` tests; `113` passed, `0` failed, `0` skipped.
- D request-context/binding/approval/tool-error/bypass group:
  - `147` tests; `147` passed, `0` failed, `0` skipped.
- Explicit Gateway inventory:
  - `112` files;
  - list SHA-256
    `ae8cb7d505e0c1ef6f7db703364e827bdb2e8185974d50569f595b905f3d983b`;
  - prohibited `tests/gateway/tmux_client.test.js` absent;
  - `887` tests; `868` passed, `19` service-gated skips, `0` failed.
- Explicit no-real-provider E2E inventory:
  - `3` files;
  - list SHA-256
    `a337c75238b21b4d9f26992e44f2994103e4adba78b708caf12d99046f74f5de`;
  - `25` tests; `25` passed, `0` failed, `0` skipped.
- `npm --prefix gateway run lint`:
  - passed.
- `env -u AGENTS_POLICIES_DIR PATH=.venv/bin:$PATH agent-run policy validate`:
  - passed: `3` agents, `7` repositories, `8` roles.
- `git diff --check 21fa5eb5f6d21a0e07b8a50c3146121b15c71642..7626a532f9f5a913938bb730d8423827da3e5c6a`:
  - passed.
- Manifest validation:
  - exited `2`, `status: invalid_manifest`, exactly three stale hashes.
- Independent inline probes:
  - valid bound alias identity/digest;
  - direct adapter mutable-clone injection with and without a valid binding;
  - service adapter-result substitution;
  - valid-binding Gemini delegate/spawn registry-only rejection and leak scan.

## Review limits

The review did **not** execute `tests/gateway/tmux_client.test.js`,
`npm --prefix gateway test`, a Gateway aggregate runner, `scripts/ci.sh`, tmux,
shared Redis, a live MCP/KYA service, a real provider, YOLO, or a real agent.
The E2E MCP case used only its isolated ephemeral stdio dry-run fixture. No
shared manifest, index, plan sheet, ADR, code, policy, schema, or contract was
edited by the reviewer.

## Exact Trial 3 exit condition

Trial 3 can receive OK only if one exact final technical tree:

1. rejects unbranded/mutable/frozen-clone/tampered selections at all direct
   adapter boundaries before effects;
2. eliminates or rejects simultaneous raw selection fields;
3. enforces strict selection identity/projection in delegate and spawn
   dry-run/service/tool output against adversarial adapter returns;
4. retains the verified normal-path identity, Gemini, safe-denial, registry
   drift, D/0/00, and shared-contract behavior; and
5. has refreshed authoritative inventories plus a green authoritative safe
   gate on that same tree.

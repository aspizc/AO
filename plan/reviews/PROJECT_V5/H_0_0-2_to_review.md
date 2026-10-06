# Review Submission — Project V5 H/0/00 (Trial 2)

Status: **Trial 2 technical candidate committed; independent review pending**.

No verdict is asserted by the implementation author. Review the technical
delta independently and publish a separate `OK` or `KO` result without
rewriting this request.

## Identity

- Sheet: `plan/PROJECT_V5/H/0/00.md`
- Review id: `H_0_0`
- Trial 1 independent KO:
  `3e3fe2a17c4f3a08b3c314dd0a64e541ce2de5f1`
- Frozen Trial 2 base:
  `21fa5eb5f6d21a0e07b8a50c3146121b15c71642`
- Branch: `feat/V5-H-0-00-orchestrator-profile`
- Worktree: `/tmp/agents-orchestrator-v5-h000.rq46zM/worktree`
- Trial 2 technical commit:
  `7626a532f9f5a913938bb730d8423827da3e5c6a`
- Trial 2 technical tree:
  `3fbdbaefa661ff354c90558ac56e1257f3134b41`
- Trial 2 review range:
  `21fa5eb5f6d21a0e07b8a50c3146121b15c71642..7626a532f9f5a913938bb730d8423827da3e5c6a`
- Canonical profile digest:
  `sha256:fbca366c3479e4e3e00b038e54c866281b6d0e442f9889d125f47e5c83b7212a`

The technical commit is the direct child of the frozen base. No prior
candidate, request, result, integration, or D/0/00 commit was amended, rebased,
reset, or rewritten.

## Why

Trial 1 established a coherent canonical profile, schema, provider matrix,
resolver, digest, mutation guidance, and prompt contract, but independent
review found that the live product still selected models from the configurable
capability registry. Policy, service audit, dry-run, delegate, and spawn did
not consume the canonical object; Gemini remained reachable; rejected values
could enter denial/audit text; and the frozen CI manifest was stale.

Trial 2 connects the existing canonical contract to the real Gateway runtime
without changing provider argv translation, the private D/0/00 execution
binding, shared policy registries, unavailable F gates, or the Trial 1 profile,
schema, tool-guidance, and prompt artifacts.

## What was done

### One runtime selection authority and one object identity

`agent.delegate` and `agent.spawn` now resolve one frozen
`EffectiveAgentSelection` from `CANONICAL_ORCHESTRATOR_PROFILE` after a supplied
execution binding has passed its private complete-tuple check and before
adapter lookup, session persistence, or child creation.

The exact same object identity is carried through:

- control-plane actor policy;
- assigned-target policy;
- adapter `delegate` or `spawn`;
- adapter dry-run output;
- the service result in dry-run;
- the successful audit projector.

The persisted `AGENT_MODEL_RESOLVED` event contains only the allowlisted
projection of that same object: canonical agent/provider/model, nullable
effort/tier, exact resolution sources, contract/profile identity, and exact
registry digest. No raw alias or requested value is projected.

The old registry-based model/alias/default/effort/tier resolver was removed
from the policy engine. A configurable runtime capability registry with a
`raw()` projection must match the canonical profile before policy can use it;
drift fails closed. Test-only registries without a raw projection cannot become
a model/default authority because all selection still comes from the canonical
profile.

### Pre-side-effect fail-closed boundary

Registry-only Gemini, unknown providers/models, unsupported effort/tier
combinations, invalid supplied selections, and capability-registry drift are
rejected before `adapters.get`, session creation, model-resolution audit, or
adapter invocation. The rejection contract exposes only a closed
code/field/provider tuple. Policy exceptions and tool responses use stable
catalog-owned text, and JSONL probes prove that rejected secret-bearing values
are absent.

Claude and Codex direct adapter calls resolve canonically when no service-owned
selection is present. When the service supplies a selection, both adapters
consume that exact object and translate only its effective values. Gemini's
direct delegate/spawn preflight also consumes the canonical authority and
therefore rejects its `registry-only` execution mode before cwd/session/child
effects.

### D/0/00 authority remains intact

A non-null execution binding is still verified before selection resolution or
audit. The service derives the post-validation execution tuple from that
binding, keeps the control actor separate from the assigned target, and checks
both policy contexts with the same target selection. A forged, cloned,
incomplete, or mismatched binding still returns `REQUEST_CONTEXT_DENIED` with
zero selection, policy, adapter, session, or audit effects. Adapters retain
their defense-in-depth binding check.

### Trial 1 contract and D/0/01 argv ownership remain intact

The versioned profile/schema, exact provider matrix, safety/tool guidance,
workflow prompts, and unavailable F/0/03–04 prerequisite declarations are
unchanged in this range. The Claude and Codex argv builder functions are also
unchanged; Trial 2 only feeds them canonical effective values.

## Decisions taken

- Keep the canonical profile resolver fixed in production code. Optional
  `selectionObservers` are read-only identity probes; they receive a frozen
  object and cannot replace resolution, validation, consumption, or audit
  projection.
- Validate a supplied D/0/00 binding before model selection, then resolve for
  the binding-derived assigned target rather than caller-selected identity.
- Validate configurable capabilities before classification/role registries can
  influence an execution request, so registry drift cannot hide behind an
  earlier noncanonical policy result.
- Preserve ordinary safe post-authority `ERROR` audit while retaining D/0/00's
  zero-audit rule for pre-authority `RequestContextError`.
- Leave `ci/suites.json` and `ci/suites-contract.json` untouched for the
  integration owner.

## TDD evidence

### RED — Trial 1 runtime disconnect

The new runtime test was first run against the frozen base:

```text
node --test --test-concurrency=1 \
  tests/gateway/orchestrator_profile_runtime.test.js
```

Result: `6 tests`; `0 passed`, `6 failed`. The canonical resolver observer was
never called, Gemini delegate/spawn reached the adapter path, a drifted registry
selected noncanonical defaults, request-context ordering was not observable,
and tool/JSONL denials lacked the closed selection-rejection projection.

### GREEN — runtime identity and fail-closed matrix

The first corrected runtime group passed `7/7`. After strengthening both
delegate and spawn with Gemini, registry-drift, unknown-provider/model,
unsupported-effort/tier, zero-session/model-audit, and JSONL leak probes, the
final runtime file passes `16/16`.

The identity cases assert exactly one canonical resolution per operation and
strict `===` equality at every policy observer, adapter call, dry-run consumer,
audit projector observer, and returned dry-run selection.

## Verification

| Check | Result |
|---|---|
| Preflight-focused policy/runtime/adapter checkpoint | `69 passed`, `0 failed`, `0 skipped` |
| Final H profile/contract/runtime/policy/adapter/tool focus | `111 passed`, `0 failed`, `0 skipped` |
| D request-context/binding/approval/tool-error/bypass regression group | `147 passed`, `0 failed`, `0 skipped` |
| Explicit Gateway inventory excluding `tests/gateway/tmux_client.test.js` | `112` files; list SHA-256 `ae8cb7d505e0c1ef6f7db703364e827bdb2e8185974d50569f595b905f3d983b`; `887 tests`, `868 passed`, `19 service-gated skips`, `0 failed` |
| Explicit no-real-provider E2E inventory | `25 passed`, `0 failed`, `0 skipped` |
| Gateway lint | passed |
| Policy registry validation | passed: `3` agents, `7` repositories, `8` roles |
| Structure suite | `289 passed`; `1` manifest-only failure for the three stale integration-owned hashes below |
| `git diff --cached --check` before the technical commit | passed |
| Redacted staged gitleaks scan | one commit scanned; no leaks found |

Shared Redis, provider-live, real-agent, MCP-E2E opt-in, and ambient dry-run
variables were unset for the relevant inventories. The MCP parity test used
only an ephemeral stdio Gateway with dry-run adapters. No shared Redis, real
provider, tmux operation, YOLO launch, KYA service, or unconfined child was
started, listed, killed, changed, flushed, or stopped.

## Explicit CI limitation and integrator action

This implementation lane was expressly prohibited from executing
`tests/gateway/tmux_client.test.js`, `npm --prefix gateway test`, the complete
CI aggregate, or any other aggregate that could materialize a tmux session.
The Gateway inventory was constructed explicitly from `gateway/tests` and
`tests/gateway`, with exactly that one test file excluded.

The structure validator reports only these frozen inventory mismatches:

```text
lint.gateway: stale inventorySha256; expected sha256:7988ced5b2b5c0baf4ecad0a34e52c97d3f9956b9470c783dadb328cc8704c22
test.gateway: stale inventorySha256; expected sha256:f629d4b93757ff6325b5f68dadde66b5149d2930480e4735dfd3f09a08aa1649
policy.registry: stale inventorySha256; expected sha256:05873e6acdc570e306947afbbf5b3a4f45a33420ff0a132a172069606bcdfef3
```

The integration owner must refresh only the authoritative inventory hashes and
run the complete safe gate under the required operational controls.

## Technical paths

```text
docs/adr/ADR-001-gateway-only.md
gateway/src/adapters/claude_adapter.js
gateway/src/adapters/codex_adapter.js
gateway/src/adapters/gemini_adapter.js
gateway/src/core/orchestrator_profile.js
gateway/src/core/policy_engine.js
gateway/src/core/policy_types.js
gateway/src/services/agent_service.js
gateway/src/tools/tool_errors.js
plan/PROJECT_V5/H/0/00.md
tests/e2e/bypass_regression.test.js
tests/e2e/helpers/gateway_harness.js
tests/e2e/mcp_two_agent_workflow.test.js
tests/e2e/mvp_restricted_flow.test.js
tests/gateway/claude_adapter.test.js
tests/gateway/codex_adapter.test.js
tests/gateway/gemini_delegate.test.js
tests/gateway/gemini_policy_audit.test.js
tests/gateway/gemini_supervised.test.js
tests/gateway/orchestrator_profile_runtime.test.js
tests/gateway/policy_engine.test.js
tests/gateway/policy_model.test.js
tests/gateway/policy_role_matrix.test.js
tests/gateway/tool_agent.test.js
```

The technical range contains no change to policies, schemas, prompt files,
tool guidance, F gates, provider argv builders, audit/message/coordination
implementations, Redis/MCP/KYA configuration, CI/workflows, shared suite
manifests, global sheets, stage indexes, or root README files.

## Commit

- `7626a532f9f5a913938bb730d8423827da3e5c6a` —
  `feat(profile): enforce canonical runtime selection (H/0/00)`

## Requested independent probes

1. Instrument `agent.delegate` and `agent.spawn` and confirm exactly one
   canonical resolution plus strict identity equality across actor/target
   policy, adapter, dry-run, audit projector, and service result.
2. Repeat canonical/default/alias/model/effort/tier cross-products and set
   ambient model variables plus a drifted `AGENTS_POLICIES_DIR`; confirm the
   exact profile selection/digest remains authoritative or drift fails closed.
3. Exercise Gemini, unknown provider/model, unsupported effort/tier, forged
   selection, and registry drift through direct and MCP paths. Confirm zero
   adapter selection, child/session, or model-resolution audit and no rejected
   values in tool responses or JSONL.
4. Re-run the D/0/00 private-binding replay matrix. Confirm binding validation
   precedes selection and preserves actor/target separation, binding-derived
   execution values, target action policy, and zero pre-authority effects.
5. Compare direct dry-run and ephemeral MCP results for exact canonical values,
   resolution sources, and
   `sha256:fbca366c3479e4e3e00b038e54c866281b6d0e442f9889d125f47e5c83b7212a`.
6. Confirm Trial 1 profile/schema/guidance/prompts and unavailable F gates are
   byte-identical, and provider argv builder functions remain unchanged.
7. Confirm the Trial 2 commit is append-only from the frozen base and every
   excluded shared path is unchanged.
8. Have the integrator refresh only the three authoritative hashes and run the
   complete gate without violating the tmux operational restriction.

Requested reviewer profile: **GPT-5.6 Sol**, reasoning effort **ultra**,
Priority/Fast service tier.

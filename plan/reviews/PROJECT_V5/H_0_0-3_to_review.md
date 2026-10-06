# Review Submission — Project V5 H/0/00 (Trial 3)

Status: **Trial 3 technical candidate committed; independent review pending**.

No verdict or integration result is asserted by the implementation author.
Review the technical delta independently and publish a separate `OK` or `KO`
result without rewriting this request.

## Identity

- Sheet: `plan/PROJECT_V5/H/0/00.md`
- Review id: `H_0_0`
- Trial 2 independent KO:
  `5dc19888594ce6f09c08d79b7ab3da0feb04d5c2`
- Frozen Trial 3 base:
  `5dc19888594ce6f09c08d79b7ab3da0feb04d5c2`
- Branch: `feat/V5-H-0-00-orchestrator-profile`
- Worktree: `/tmp/agents-orchestrator-v5-h000.rq46zM/worktree`
- Trial 3 technical commit:
  `d64695ac6d7a225f77a245a5440b4dcc6456f8f6`
- Trial 3 technical tree:
  `be8a1e442ed44b5ff5a74fc13dd1314e8314c8f4`
- Trial 3 review range:
  `5dc19888594ce6f09c08d79b7ab3da0feb04d5c2..d64695ac6d7a225f77a245a5440b4dcc6456f8f6`
- Canonical profile digest:
  `sha256:fbca366c3479e4e3e00b038e54c866281b6d0e442f9889d125f47e5c83b7212a`

The technical commit is the direct child of the frozen Trial 2 result-only KO.
No earlier candidate, request, result, integration commit, or D/0/00 commit was
amended, rebased, reset, or rewritten.

## Why

Trial 2 connected the canonical profile to the ordinary Gateway path, retained
the D/0/00 execution-binding boundary, and blocked registry-only Gemini.
Independent review nevertheless found two competing-authority paths:

1. A direct Codex or Claude adapter accepted a structurally valid selection
   clone, ignored simultaneous raw selection fields, and returned that forged
   object.
2. The service trusted an adapter-owned result selection, allowing policy and
   audit to use the canonical object while the service/tool result exposed a
   clone, replacement, or additional adapter-controlled data.

Trial 3 closes both boundaries without changing the canonical provider matrix,
schemas, prompts, policy registries, D/0/00 binding capability, or D/0/01
provider argv builders.

## What was done

### Non-forgeable in-process selection authority

The canonical resolver now records each completed selection in a
module-private `WeakSet` after deep-freezing it. Every assertion and consumer
requires:

- membership in that private authority;
- exact frozen plain-object data-property shapes for the selection and
  `resolutionSource`;
- the exact profile id, contract version, registry digest, provider, model,
  effort, tier, and resolution-source semantics.

Mutable clones, frozen clones, JSON rehydration, Proxies, extra properties,
source rewrites, cross-provider selections, and selections created by a second
module instance fail with the stable safe
`EFFECTIVE_SELECTION_INVALID/effectiveSelection` rejection.

### One service-to-adapter channel

The service sends adapters only the exact branded `effectiveSelection`; it no
longer sends parallel `model`, `reasoningEffort`, or `serviceTier` fields.
Direct adapters still resolve canonically when no selection is supplied. When
a genuine selection is supplied, any simultaneous non-null raw field is
rejected before policy, cwd, lifecycle audit, session, tmux, provider, or child
effects.

Codex and Claude now derive provider arguments exclusively from a consumed
branded selection. Their delegate and spawn results always carry that exact
selection in dry-run and real-result shapes. Gemini remains registry-only and
fails before execution effects.

### Closed adapter-result contract

Delegate and spawn results are validated as plain, non-Proxy objects with
operation-specific closed field allowlists and enumerable data properties
only. The service copies each data property once, then requires:

- an `effectiveSelection` field;
- strict `===` identity with the service-owned selection;
- successful canonical consumption and safe audit projection;
- equality for every redundant effective scalar.

Missing, cloned, replaced, extended, contradictory, proxied, accessor-backed,
or non-data results fail with a body-safe `POLICY_DENIED` selection rejection.
Validation happens before successful model audit or session persistence. The
returned service result is a closed copy whose selection is overwritten with
the authoritative reference.

### Retained boundaries

- A supplied D/0/00 execution binding remains the first authority check.
- Actor and assigned-target policy remain distinct and consume the same
  canonical selection.
- Rejected values and adapter-controlled aliases are absent from tool bodies
  and JSONL audit.
- Provider argv builder definitions, Trial 1 profile/schema/prompt contracts,
  shared manifests, workflows, indexes, and registries are unchanged.

## Decisions taken

- Treat `EffectiveAgentSelection` as an in-process capability, not a
  structurally transferable DTO. Frozen shape alone is forgeable; private
  resolver provenance closes that gap.
- Reject all parallel raw scalar fields when a branded selection is present
  instead of choosing precedence or silently ignoring contradictions.
- Validate and normalize an adapter result before service-owned persistence or
  success audit. Accessor and Proxy rejection prevents time-of-check/
  time-of-use substitutions.
- Preserve stable allowlisted policy errors and ordinary post-authority
  service `ERROR` audit while suppressing adapter lifecycle audit for rejected
  selection capabilities.
- Leave the three shared suite inventory hashes to the integration owner.

## TDD evidence

### RED 1 — structural trust and result substitution

The new authority test was first run against the frozen Trial 2 base:

```text
env -u AGENTS_REDIS_URL -u AGENTS_DRY_RUN \
  node --test --test-concurrency=1 \
  tests/gateway/orchestrator_profile_authority.test.js
```

Result: `29 tests`; `0 passed`, `29 failed`. Clones and parallel raw fields were
accepted, direct adapters preserved forged objects, service calls still sent
three raw scalar fields, and missing/cloned/extended adapter selections reached
the service/tool result.

### RED 2 — Proxy and accessor result substitution

After the first correction was green, result probes were strengthened for
Proxy objects and time-varying accessors:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='proxied result|time-varying model accessor' \
  tests/gateway/orchestrator_profile_authority.test.js
```

Result before normalization hardening: `4 tests`; `1 passed`, `3 failed`.
Delegate Proxy, delegate accessor, and spawn Proxy results were accepted. The
spawn accessor already failed because `model` is not in the spawn allowlist.

### GREEN

The final authority file passes `35/35`, including:

- mutable/frozen/JSON/extra/source/Proxy/cross-module forgeries;
- bound and direct adapter paths;
- Codex and Claude delegate/spawn raw-channel rejection;
- cross-provider and capability-registry drift;
- exact service/adapter/result identity;
- missing, cloned, contradictory, unknown, proxied, and accessor-backed
  delegate/spawn results;
- stable, secret-free tool and JSONL rejection output.

## Verification

| Check | Result |
|---|---|
| Trial 3 authority group | `35 passed`, `0 failed`, `0 skipped` |
| Historical H profile/contract/runtime/policy/adapter/tool focus | `113 passed`, `0 failed`, `0 skipped` |
| D request-context/binding/approval/tool-error/bypass regression group | `147 passed`, `0 failed`, `0 skipped` |
| Explicit Gateway inventory excluding `tests/gateway/tmux_client.test.js` | `113` files; list SHA-256 `e42253bac2f09e1ea192a0d29a22955793cbd87c1d81608dfde530f116446d38`; `922 tests`, `903 passed`, `19` service-gated skips, `0 failed` |
| Explicit no-real-provider E2E inventory | `3` files; list SHA-256 `a337c75238b21b4d9f26992e44f2994103e4adba78b708caf12d99046f74f5de`; `25 passed`, `0 failed`, `0 skipped` |
| Gateway lint | passed |
| Explicit ESLint for changed root tests | passed |
| Policy registry validation | passed: `3` agents, `7` repositories, `8` roles |
| Structure suite | `289 passed`; `1` manifest-only failure for the three integration-owned hashes below |
| Authoritative manifest validate-only | exited `2`, ran zero suites, and reported exactly the three stale hashes below |
| Provider argv-builder and Trial 1 contract/schema change check | no changes |
| `git diff --cached --check` before the technical commit | passed |
| Redacted staged gitleaks scan | one commit scanned; no leaks found |

The relevant commands explicitly unset shared Redis and ambient provider/dry-run
variables. No shared Redis, live service, real provider, MCP/KYA workflow, real
agent, tmux operation, YOLO launch, or unconfined child was started, listed,
killed, changed, flushed, or stopped.

## Explicit CI limitation and integrator action

This implementation lane was expressly prohibited from executing
`tests/gateway/tmux_client.test.js`, `npm --prefix gateway test`,
`scripts/ci.sh`, the complete CI aggregate, or any other aggregate that could
materialize a tmux session. The Gateway inventory was constructed explicitly
from `gateway/tests` and `tests/gateway`, with exactly that one test file
excluded.

Read-only manifest validation stopped before suites with exactly:

```text
lint.gateway: stale inventorySha256; expected sha256:7988ced5b2b5c0baf4ecad0a34e52c97d3f9956b9470c783dadb328cc8704c22
test.gateway: stale inventorySha256; expected sha256:b81bc1a16e2ac4b0e485f3aaf3ef56f598323565bbcb6d97717166dcb982e6ab
policy.registry: stale inventorySha256; expected sha256:05873e6acdc570e306947afbbf5b3a4f45a33420ff0a132a172069606bcdfef3
```

The integration owner must refresh only those authoritative inventory hashes
through the repository-owned mechanism and run the complete safe gate on the
exact reviewed tree. No green authoritative aggregate or integration verdict
is inferred here.

## Technical paths

```text
docs/adr/ADR-001-gateway-only.md
gateway/src/adapters/base_adapter.js
gateway/src/adapters/claude_adapter.js
gateway/src/adapters/codex_adapter.js
gateway/src/adapters/gemini_adapter.js
gateway/src/core/orchestrator_profile.js
gateway/src/core/policy_engine.js
gateway/src/services/agent_service.js
plan/PROJECT_V5/H/0/00.md
tests/gateway/orchestrator_profile_authority.test.js
tests/gateway/tool_agent_model.test.js
```

The technical range contains no change to policies, schemas, prompts, tool
guidance, F gates, provider argv builders, audit/message/coordination
implementations, Redis/MCP/KYA configuration, CI/workflows, shared suite
manifests, global sheets, stage indexes, or root README files.

## Commit

- `d64695ac6d7a225f77a245a5440b4dcc6456f8f6` —
  `fix(profile): close selection authority boundary (H/0/00)`

## Requested independent probes

1. Import a second profile module instance and retry mutable/frozen/JSON
   clones, Proxies, extra fields, valid-looking source rewrites, and
   cross-provider selections. Confirm every object without local resolver
   provenance fails safely.
2. Exercise Codex and Claude delegate/spawn, with and without a valid D/0/00
   binding, using clones and simultaneous raw model/effort/tier fields. Confirm
   binding remains first and rejected selections cause zero lifecycle effects.
3. Inject adapter results with absent, cloned, independently canonical,
   extended, contradictory, proxied, non-enumerable, and time-varying
   properties. Confirm no successful model/session audit or persistence and no
   adapter-owned data in the tool body.
4. Repeat canonical default/alias/model/effort/tier cross-products. Instrument
   actor policy, target policy, adapter, audit projector, service result, and
   tool result for one resolution and strict selection identity.
5. Re-run Gemini, capability-registry drift, D/0/00 binding mutation, rejected
   value leak, and D/0/01 argv parity probes.
6. Have the integration owner refresh only the three stated inventory hashes
   and run the complete safe gate on the exact independently reviewed tree.

## Requested reviewer profile

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Service tier: Priority/Fast
- Review mode: independent, adversarial, evidence-based

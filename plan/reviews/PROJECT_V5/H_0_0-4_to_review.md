# Review Submission — Project V5 H/0/00 (Trial 4)

Status: **Trial 4 technical candidate committed; independent review pending**.

No verdict, integration result, or promotion result is asserted by the
implementation author. Review the exact technical range independently and
publish a separate result without rewriting this request.

## Identity

- Sheet: `plan/PROJECT_V5/H/0/00.md`
- Review id: `H_0_0`
- Trial 3 independent KO:
  `e6dbdfa5482a09e02024e8e569acc6aa01a15209`
- Frozen Trial 4 base:
  `e6dbdfa5482a09e02024e8e569acc6aa01a15209`
- Branch: `feat/V5-H-0-00-orchestrator-profile`
- Worktree: `/tmp/agents-orchestrator-v5-h000.rq46zM/worktree`
- Trial 4 technical commit:
  `9701f6749a2ce3ec8e3434c2e9e43c8cbdffe3f5`
- Trial 4 technical tree:
  `09dcb9a9ac9a55af003b1ce84d7907cde3ca459e`
- Exact technical range:
  `e6dbdfa5482a09e02024e8e569acc6aa01a15209..9701f6749a2ce3ec8e3434c2e9e43c8cbdffe3f5`
- Canonical profile digest:
  `sha256:fbca366c3479e4e3e00b038e54c866281b6d0e442f9889d125f47e5c83b7212a`

The technical commit is the direct child of the frozen Trial 3 result-only
KO. No earlier technical candidate, request, result, integration commit, or
shared manifest was amended, rebased, reset, or rewritten.

## Why

Trial 3 made `EffectiveAgentSelection` a non-forgeable in-process capability
and required its exact identity in adapter results. Its result allowlist was
still shallow: missing fields and invalid scalar types passed, while a nested
Proxy with `toJSON` in `sessionId` executed after validation and reached both
the successful `AGENT_MODEL_RESOLVED` JSONL event and MCP tool serialization.

Trial 4 closes the entire adapter-result boundary before session persistence
or successful model audit. It does not change the provider matrix, resolution
rules, provider argv builders, schemas, tool catalog, policies, request-context
binding, Redis/coordination behavior, legacy messages, or audit transport.

## What was done

### Exact provider and operation contracts

The service now selects one closed result contract from the canonical
selection provider and operation:

- Codex delegate requires `stdout`/`stderr` strings, an integer exit code in
  `-1..255`, boolean `dryRun`, exact model/effort/tier values, the exact
  selection identity, and a non-empty sandbox string.
- Claude delegate requires the same common process fields and exact
  model/effort values, but rejects Codex-only `serviceTier` and `sandbox`
  fields.
- Codex and Claude spawn require non-empty `sessionId`, `tmuxTarget`,
  `attachCommand`, and `launchCommand` strings, boolean `dryRun`, the exact
  selection, and `sessionId === tmuxTarget`.
- Registry-only providers have no adapter-result contract and remain unable to
  produce a service result.

Missing, additional, undefined, null, empty where forbidden, boxed, nested,
proxied, accessor-backed, callable, symbol, bigint, non-finite, fractional,
and out-of-range values are rejected with the existing stable allowlisted
selection denial.

### Non-evaluating normalization

The service requires a plain non-Proxy top-level object with the exact keys and
enumerable data descriptors. It reads each descriptor value once into a fresh
plain object, validates primitives using type/identity checks without
coercion, and freezes the normalized DTO. It never calls an adapter-owned
getter, `String`, `JSON.stringify`, or `toJSON`.

Successful delegate and spawn responses are new frozen DTOs containing only
validated primitives, a service-generated delegate session ID where
applicable, and the exact authoritative selection reference.

### Persistence and serialization ordering

Validation remains immediately after the adapter returns and now completes
before:

- task-backed session persistence;
- `AGENT_MODEL_RESOLVED`;
- service success return; and
- MCP JSON serialization.

The reviewed nested `sessionId` Proxy/`toJSON` carrier is rejected without one
trap read. Its sentinel is absent from the tool error, JSONL audit, and session
store.

### Historical fixture compatibility

Two existing H fake adapters emitted shapes that were never legitimate
Codex/Claude runtime results. With explicit integrator authorization, only
their return literals were corrected:

- `tests/gateway/orchestrator_profile_runtime.test.js`
- `tests/gateway/tool_agent_model.test.js`

No assertion, test name, coverage scope, adapter implementation, provider argv
builder, or product behavior was changed in those files.

## TDD evidence

### RED 1 — malformed and late-evaluated adapter results

The Trial 4 tests were first run against the frozen Trial 3 result:

```text
env -u AGENTS_REDIS_URL -u AGENTS_DRY_RUN \
  -u AGENTS_CODEX_MODEL -u AGENTS_CODEX_REASONING_EFFORT \
  -u AGENTS_CODEX_SERVICE_TIER \
  node --test --test-concurrency=1 \
  tests/gateway/orchestrator_profile_authority.test.js
```

Result: `77 tests`; `54 passed`, `23 failed`.

The failures reproduced:

- missing fields in Codex/Claude delegate and spawn results;
- non-scalar and boxed values;
- a delegate result containing only `effectiveSelection`;
- `exitCode: "0"` and invalid exit ranges;
- `dryRun: "true"`;
- empty sandbox and provider-specific extra fields;
- `sessionId !== tmuxTarget`; and
- the nested `sessionId` Proxy/`toJSON` success and late evaluation.

### RED 2 — historical fake-result compatibility

After the production contract became strict and before the authorized fixture
correction, the five-file H focus returned:

```text
113 tests; 110 passed; 3 failed
```

The only failures were the two known fake-adapter return literals. No
production compatibility failure was observed.

### GREEN

The final authority focus passes `85/85`. It covers every required field for
missing values, wrong primitive types, boxed/nested/Proxy/function/symbol/
bigint values, and top-level accessors whose getters remain unread. It also
covers provider-specific exactness, empty spawn strings, process exits
`-1`, `0`, and non-zero, null and persisted tasks, fresh frozen DTOs,
pre-persistence rejection, safe tool/audit output, selection identity, and all
35 Trial 3 authority probes.

## Verification

| Check | Result |
|---|---|
| Trial 4 authority focus | `85 passed`, `0 failed`, `0 skipped` |
| H profile/authority/contract/runtime/tool focus | `121 passed`, `0 failed`, `0 skipped` |
| D/0/00 request-context/binding/approval/error/bypass group | `147 passed`, `0 failed`, `0 skipped` |
| Codex/Claude real-fixture, dry-run, supervised and registry-only adapter group | `55 passed`, `0 failed`, `0 skipped` |
| Explicit Gateway inventory excluding `tests/gateway/tmux_client.test.js` | `113` files; list SHA-256 `e42253bac2f09e1ea192a0d29a22955793cbd87c1d81608dfde530f116446d38`; `972 tests`, `953 passed`, `19` service-gated skips, `0 failed` |
| Explicit no-real-provider E2E inventory | `3` files; list SHA-256 `a337c75238b21b4d9f26992e44f2994103e4adba78b708caf12d99046f74f5de`; `25 passed`, `0 failed`, `0 skipped` |
| Gateway lint plus the three changed root tests | passed |
| Policy registry validation | passed: `3` agents, `7` repositories, `8` roles |
| Structure suite | `289 passed`; `1` manifest-only failure for the three integration-owned hashes below |
| Authoritative manifest validate-only | exited `2`, ran zero suites, and reported exactly the three stale hashes below |
| Provider argv builders and Trial 3 profile/policy/adapter/ADR authority files | no changes |
| `git diff --check` for the exact technical range | passed |
| Redacted gitleaks scan | one technical commit scanned; no leaks found |

All relevant commands explicitly removed shared Redis, provider-key, ambient
profile, model, effort, tier, and dry-run variables as applicable. No shared
Redis, MCP/KYA service, real provider, real agent, external network, tmux
operation, YOLO launch, or unconfined child was started, listed, killed,
changed, flushed, restarted, or stopped.

## Explicit CI limitation and integrator action

This lane did not run `tests/gateway/tmux_client.test.js`,
`npm --prefix gateway test`, `scripts/ci.sh`, or an aggregate that could create
a tmux session. The Gateway inventory was assembled explicitly and excluded
exactly that one file.

Read-only manifest validation stopped before suite execution with exactly:

```text
lint.gateway: stale inventorySha256; expected sha256:7988ced5b2b5c0baf4ecad0a34e52c97d3f9956b9470c783dadb328cc8704c22
test.gateway: stale inventorySha256; expected sha256:b81bc1a16e2ac4b0e485f3aaf3ef56f598323565bbcb6d97717166dcb982e6ab
policy.registry: stale inventorySha256; expected sha256:05873e6acdc570e306947afbbf5b3a4f45a33420ff0a132a172069606bcdfef3
```

The integration owner must refresh only those shared inventory hashes through
the repository-owned mechanism and run the complete safe gate on the exact
reviewed integration tree. No green authoritative aggregate is inferred here.

## Technical paths

```text
gateway/src/services/agent_service.js
plan/PROJECT_V5/H/0/00.md
tests/gateway/orchestrator_profile_authority.test.js
tests/gateway/orchestrator_profile_runtime.test.js
tests/gateway/tool_agent_model.test.js
```

The technical range contains no change to adapters, provider argv builders,
the canonical profile/resolver, policy engine, ADRs, catalogs, schemas,
prompts, tool guidance, coordination/message/audit implementations, Redis/MCP
configuration, policies, CI/workflows, shared manifests, global sheets,
indexes, audit reports, or root README files.

## Commit

- `9701f6749a2ce3ec8e3434c2e9e43c8cbdffe3f5` —
  `fix(profile): close adapter result contracts (H/0/00 Trial 4)`

## Requested independent probes

1. Reproduce the Trial 3 nested `sessionId` Proxy/`toJSON` carrier through the
   real service and MCP wrapper. Confirm zero trap reads, zero successful model
   audit/session persistence, and no sentinel in tool/audit/error output.
2. For every Codex/Claude delegate and spawn field, retry missing, undefined,
   null, boxed, nested, Proxy, accessor, function, symbol, bigint, wrong
   primitive, and extra values. Confirm stable safe denial before persistence.
3. Retry `exitCode` with `-1`, `0`, non-zero allowed values, `-2`, `256`,
   fractions, non-finite values, unsafe integers, and string numbers.
4. Exercise exact Codex and Claude dry-run/real result shapes, including
   provider-specific model/effort/tier/sandbox fields, non-zero exits,
   `sessionId === tmuxTarget`, and task IDs both null and persisted.
5. Re-run the 35 Trial 3 selection-provenance/result-substitution probes,
   registry-only Gemini, capability-registry drift, and D/0/00 binding-first
   mutation cases.
6. Confirm the service returns a new frozen result DTO and preserves the exact
   canonical selection identity without invoking adapter-owned coercion hooks.
7. Have the integration owner refresh only the three stated inventories and
   execute the complete safe gate on the exact independently reviewed tree.

## Requested reviewer profile

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Service tier: Priority/Fast
- Review mode: independent, adversarial, evidence-based

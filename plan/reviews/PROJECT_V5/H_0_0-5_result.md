# Independent Review Result — Project V5 H/0/00 Trial 5

## Verdict

**OK**

Trial 5 closes both Trial 4 blocking findings in the frozen technical
candidate. Codex sandbox values are now an exact three-value, service-owned
contract with an explicit default; invalid Codex configuration stops before
adapter lookup, and an adapter result cannot substitute another value. Spawn
identity, attach, and launch fields now have field-specific semantic
validation, including the declared ASCII, Unicode, normalization, control,
and length boundaries.

Independent service, MCP-wrapper, task-backed persistence, nested Proxy, and
Unicode-domain probes found no successful model audit, session persistence,
MCP success, rejected-value disclosure, or executable nested-value read on a
rejected result. Selection authority, exact Trial 4 result schemas, D/0/00
binding-first behavior, and legitimate Codex/Claude dry-run and fake-process
forms remain green.

This is an OK for the exact technical candidate only. It is not an integration,
promotion, or release result. The shared manifest still has the same three
integration-owned stale inventories, so no green authoritative aggregate is
inferred.

## Reviewer profile

- Requested/configured profile: **GPT-5.6 Sol**, reasoning `ultra`, service
  profile `Priority/Fast`.
- Review mode: independent, adversarial, evidence-based local QA.
- No external service-profile telemetry was available. The profile above is
  the requested configuration, not external proof of model, reasoning,
  latency, or service-tier execution.

## Frozen identity

- Branch: `feat/V5-H-0-00-orchestrator-profile`
- Worktree:
  `/tmp/agents-orchestrator-v5-h000.rq46zM/worktree`
- Trial 4 result-only KO / frozen Trial 5 base:
  `5f2aeaf751b92f66ca792945f3aac19cd6c7c1ac`
- Frozen base tree:
  `82c0280114c067072871cf3497216769f3286807`
- Trial 5 technical commit:
  `0b407200998038dada5062669d2a663d5e7e1673`
- Trial 5 technical tree:
  `197309d4a6330161999c385e705c5b1021f90da1`
- Trial 5 request-only commit:
  `ee81a765886ff60fde034481f62ffca6b48a44ec`
- Trial 5 request-only tree:
  `a670b613b15f7e22f98b3fc45fe41045989b4a02`
- Exact technical range:
  `5f2aeaf751b92f66ca792945f3aac19cd6c7c1ac..0b407200998038dada5062669d2a663d5e7e1673`
- Canonical profile digest:
  `sha256:fbca366c3479e4e3e00b038e54c866281b6d0e442f9889d125f47e5c83b7212a`

Parentage is exact: the technical commit is the direct child of the frozen
Trial 4 result, and the request commit is the direct child of the technical
commit. The technical commit changes exactly:

```text
gateway/src/services/agent_service.js
plan/PROJECT_V5/H/0/00.md
tests/gateway/orchestrator_profile_authority.test.js
tests/gateway/orchestrator_profile_runtime.test.js
```

The request commit adds only
`plan/reviews/PROJECT_V5/H_0_0-5_to_review.md`. The worktree was clean before
review work began.

## Findings

No blocking finding remains.

### Codex sandbox authority — corrected

The service-owned domain is exactly `read-only`, `workspace-write`, and
`danger-full-access`, with `workspace-write` for an omitted or explicitly
undefined setting (`gateway/src/services/agent_service.js:301-329`). A Codex
delegate result must equal the captured effective configuration exactly
(`gateway/src/services/agent_service.js:351-377`).

Independent probes confirmed:

- omitted/default and all three canonical settings succeed and return the
  exact configured primitive;
- unknown, empty, whitespace, case-changed, suffix-whitespace, null,
  undefined, boxed, object, and symbol variants fail closed; a Proxy-backed
  result also fails without trap execution;
- a configured `read-only` service rejects a `workspace-write` result;
- invalid Codex configuration rejects both delegate and spawn before
  `adapters.get()` or adapter invocation;
- unknown provider and unknown model still reject before adapter lookup even
  when the Codex configuration is also invalid;
- invalid result values are rejected after the one expected fake-adapter call
  but before successful audit or persistence; and
- boxed/Proxy result values execute zero coercion or serialization traps and
  do not disclose sentinels.

### Spawn identity and command envelope — corrected

`sessionId` and `tmuxTarget` must be identical lowercase ASCII targets of
1–96 code units, with an alphanumeric first character and only alphanumerics
or hyphens afterward. `attachCommand` must be exactly
`tmux attach -t <tmuxTarget>` (`gateway/src/services/agent_service.js:332-338`
and `380-390`).

Independent Codex and Claude probes accepted the 1- and 96-character
boundaries and rejected:

- empty, whitespace-only, 97-character, uppercase, punctuation, slash,
  non-ASCII, mismatched, and non-primitive identities;
- NBSP, em-space, ideographic-space, zero-width, bidi/isolate, tab, CR, LF,
  NUL, U+001F, DEL, and C1 identity variants; and
- a different attach target, leading attach whitespace, alternate tmux
  spelling, socket options, and trailing options.

`launchCommand` is a primitive non-empty, trim-stable, NFC-stable string of at
most 8,192 UTF-16 code units, with no `Cc`, `Cf`, `Zl`, or `Zp`
(`gateway/src/services/agent_service.js:306-308` and `340-349`).

Independent probes accepted:

- 1 and 8,192 ASCII code units;
- 4,096 non-BMP emoji, which are exactly 8,192 UTF-16 code units;
- internal repeated spaces, internal NBSP, and NFC Unicode paths with spaces;
  and
- shell metacharacters, quoting, substitutions, pipes, redirects, and
  operators as inert returned text, confirming this validator does not parse
  or reconstruct provider argv.

They rejected 0 and 8,193 code units, 4,096 emoji plus one code unit,
leading/trailing ASCII and Unicode whitespace, NFD text, C0/C1/DEL, zero-width,
bidi/isolate, word-joiner/BOM, line-separator, and paragraph-separator
variants. An exhaustive generated probe rejected all Unicode code points in
the declared forbidden classes: `65 Cc`, `170 Cf`, `1 Zl`, and `1 Zp`
(`237/237`).

### Effect ordering, safe body, and Trial 4 nested-value guarantee — retained

Provider configuration validation precedes adapter lookup
(`gateway/src/services/agent_service.js:500-545` and `588-627`). Adapter-result
validation precedes task-backed session creation and
`AGENT_MODEL_RESOLVED` (`gateway/src/services/agent_service.js:540-560` and
`622-642`).

A real service plus `agent.spawn` tool-wrapper probe used a task-backed nested
Proxy carrying `toJSON`, `toString`, and a sentinel. The result was the stable
allowlisted `POLICY_DENIED` / `EFFECTIVE_SELECTION_INVALID` body with:

- `0` Proxy trap reads;
- `0` persisted sessions;
- `0` `AGENT_MODEL_RESOLVED` events;
- `0` `SESSION_STARTED` events; and
- no sentinel in tool output or JSONL.

A separate task-backed unsafe target probe produced the same zero-success
effects. Every temporary probe workspace was removed, and no shell
metacharacter probe created a file.

### Trial 4 contracts and D/0/00 compatibility — retained

- Exact provider/operation key sets, required fields, primitive types, data
  descriptors, result prototypes, exit bounds, provider-specific fields, and
  authoritative selection identity remain covered by the `134/134` authority
  focus.
- Frozen result DTOs retain the exact canonical selection object. Structural
  clones, JSON rehydration, foreign module instances, raw aliases, accessors,
  and top-level or nested Proxies remain denied.
- Unknown provider/model, unsupported effort/tier, registry drift, and
  registry-only Gemini still fail before adapter selection or child/session
  effects.
- D/0/00 binding-first actor/target/repository/action authority remains green
  across service and all three adapters.
- Legitimate Codex and Claude dry-run, supervised fake-client, and real
  fake-binary process forms remain green, including non-zero exit behavior.

Mechanical zero-context diff inspection found no removed test name,
assertion, or expectation. The only historical runtime fixture change is:

```text
attachCommand: "unavailable in dry-run"
attachCommand: "tmux attach -t profile-runtime"
```

That is the exact canonical attach literal required by the new result
envelope.

## Trial 4 finding disposition

| Trial 4 blocker | Trial 5 result |
|---|---|
| P1-1 — whitespace/control-only spawn identity and commands could persist | **Corrected.** Field-specific identity, attach, launch, normalization, Unicode-category, and length checks reject before persistence and successful audit. |
| P1-2 — every non-empty Codex sandbox was accepted | **Corrected.** The result must be one of the three canonical values and exactly equal the captured service configuration; invalid configuration stops before adapter lookup. |

## Verification performed

All applicable suite commands unset ambient Redis/Postgres URLs, provider
keys, dry-run, model, effort, tier, and sandbox variables.

- Trial 5 authority focus:

  ```text
  node --test --test-concurrency=1 \
    tests/gateway/orchestrator_profile_authority.test.js
  ```

  Result: `134` tests; `134` passed, `0` failed, `0` skipped.

- H profile/authority/contract/runtime/tool focus:

  ```text
  node --test --test-concurrency=1 \
    tests/gateway/orchestrator_profile.test.js \
    tests/gateway/orchestrator_profile_authority.test.js \
    tests/gateway/orchestrator_profile_contract.test.js \
    tests/gateway/orchestrator_profile_runtime.test.js \
    tests/gateway/tool_agent_model.test.js
  ```

  Result: `170` tests; `170` passed, `0` failed, `0` skipped.

- D/0/00 request-context, boundary, execution-binding, approval, error, and
  bypass regression group: `171` tests; `171` passed, `0` failed, `0`
  skipped.
- Expanded base/registry, Codex, Claude, and registry-only Gemini adapter
  group: `75` tests; `75` passed, `0` failed, `0` skipped.
- Explicit no-real-provider E2E inventory:

  ```text
  node --test --test-concurrency=1 \
    tests/e2e/bypass_regression.test.js \
    tests/e2e/mcp_two_agent_workflow.test.js \
    tests/e2e/mvp_restricted_flow.test.js
  ```

  Result: `25` tests; `25` passed, `0` failed, `0` skipped.

- Explicit Gateway inventory:

  ```text
  mapfile -t gateway_files < <(
    rg --files gateway/tests tests/gateway -g '*.js' |
      rg -v '^tests/gateway/tmux_client\.test\.js$' |
      sort
  )
  test "${#gateway_files[@]}" -eq 116
  test -f tests/gateway/tmux_client.test.js
  for gateway_path in "${gateway_files[@]}"; do
    test "$gateway_path" != tests/gateway/tmux_client.test.js
  done
  node --test --test-concurrency=1 "${gateway_files[@]}"
  ```

  The sorted list had exactly `116` paths and SHA-256
  `5e018a1adfe537a8184c5ec99c30a6e0ab58cfe227523fabd321768282d4c12b`.
  Result: `1,024` tests; `1,005` passed, `19` service-gated skips, `0`
  failed. `tests/gateway/tmux_client.test.js` was absent from the executed
  array.

- Independent inline sandbox/ordering/MCP/Proxy probe:
  `{"status":"ok","checks":117,"proxyReads":0,"tmpLeftovers":0}`.
- Independent inline identity/attach/launch probe:
  `{"status":"ok","checks":207,"nestedReads":0,"tmpLeftovers":0}`.
- Independent exhaustive Unicode-domain and sandbox-mismatch probe:
  `237/237` forbidden code points rejected; mismatch rejected after the one
  expected fake-adapter call.
- `npm --prefix gateway run lint`: passed.
- `node --check` on the changed service and two changed JavaScript tests:
  passed.
- `env -u AGENTS_POLICIES_DIR ... .venv/bin/agent-run policy validate`:
  passed with `3` agents, `7` repositories, and `8` roles.
- Structure suite: `290` tests; `289` passed and only the known manifest
  authority test failed on the three hashes below.
- `git diff --check
  5f2aeaf751b92f66ca792945f3aac19cd6c7c1ac..0b407200998038dada5062669d2a663d5e7e1673`:
  passed.
- Redacted local gitleaks scan of the exact one-commit technical range: no
  leaks found.
- Parentage, tree identity, exact technical path set, request-only path, and
  initial worktree cleanliness: passed.

## Authoritative gate limitation

Read-only validation:

```text
.venv/bin/python scripts/ci_gate.py \
  --repo-root . \
  --manifest ci/suites.json \
  --validate-only
```

exited `2`, ran zero suites, and returned `status: invalid_manifest` with
exactly:

```text
lint.gateway: stale inventorySha256; expected sha256:7988ced5b2b5c0baf4ecad0a34e52c97d3f9956b9470c783dadb328cc8704c22
test.gateway: stale inventorySha256; expected sha256:b81bc1a16e2ac4b0e485f3aaf3ef56f598323565bbcb6d97717166dcb982e6ab
policy.registry: stale inventorySha256; expected sha256:05873e6acdc570e306947afbbf5b3a4f45a33420ff0a132a172069606bcdfef3
```

These are the unchanged integration-owned inventories declared by the
submission. The integration owner must refresh only those inventories through
the repository-owned mechanism and run the complete safe gate on the exact
final integration tree.

## Review limits

This review did not run `tests/gateway/tmux_client.test.js`,
`npm --prefix gateway test`, `scripts/ci.sh`, or any aggregate that could
operate tmux. It did not use a real provider, real agent, live Redis,
Postgres, shared MCP/KYA service, external network, YOLO/unconfined launch, or
shared service. Local stdio and fake-binary fixtures only were exercised.

It did not edit production code, tests, sheets, requests, policies, schemas,
catalogs, manifests, CI/workflows, Redis/MCP/KYA state, or tmux state. No
integration, promotion, or release action was performed.

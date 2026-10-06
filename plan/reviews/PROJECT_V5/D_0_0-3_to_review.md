# V5 D/0/00 — Trial 3 independent review request

Status: **Trial 3 technical candidate committed; independent verdict pending**.

No verdict is asserted by the implementation author. Review the technical
delta independently and publish a separate `OK` or `KO` result without
rewriting this request.

## Identity

- Sheet: `plan/PROJECT_V5/D/0/00.md`
- Review id: `D_0_0`
- Frozen Wave 2 base:
  `54ae76a74209687479e4902c816b6bdb4b2e6690`
- Prior Trial 2 KO result:
  `d8ce59f7f0dfd9010702944d1d5af1c2d15d461e`
- Branch: `feat/V5-D-0-00-request-context-trial2`
- Worktree: `/tmp/agents-orchestrator-v5-d-0-00-trial2`
- Trial 3 technical commit:
  `cc12282141348d9f21d55eea82fa393c94f03dda`
- Trial 3 technical tree:
  `8837bf8e9cd9959b6bf4b1cc99d7e15b93f23e3e`
- Trial 3 review range:
  `d8ce59f7f0dfd9010702944d1d5af1c2d15d461e..cc12282141348d9f21d55eea82fa393c94f03dda`
- Cumulative D/0/00 technical range:
  `54ae76a74209687479e4902c816b6bdb4b2e6690..cc12282141348d9f21d55eea82fa393c94f03dda`

The Trial 3 technical commit is the direct child of the append-only Trial 2 KO
result. No prior candidate, request, or result commit was rewritten.

## Trial 3 scope

This trial addresses exactly the four blockers in
`plan/reviews/PROJECT_V5/D_0_0-2_result.md`.

### Repository-affecting approvals fail closed

Repository-affecting actions are resolved through a closed canonical action
classification. Before `approval.request` can persist, the request boundary
requires one owned task on the owned trace and derives its canonical repository
and known server-owned classification. Caller task, repository, and
classification values remain assertions that can deny but cannot grant
authority.

An omitted task is accepted only when the trace has exactly one owned task.
Zero-task and multi-task ambiguity fail before an approval row. Missing or
unknown task, repository, or classification authority is not auto-approvable.
Valid restricted lineage may create a pending approval but can never
auto-grant.

### Control-plane actor and execution target remain distinct

The server-owned effective binding now crosses the agent tool, service, and
adapter boundary. The actor is authorized for the `agent.spawn` or
`agent.delegate` control action. The assigned target is validated separately
for its task action, agent, role, canonical repository, and model profile.

This permits an orchestrator to launch an assigned planner without
reinterpreting the planner as the launch caller. A planner's own context still
cannot assign or launch a child, and the launch denial occurs before adapter
invocation or session persistence. The effective binding is held in private
process memory and cannot be reconstructed from public tool arguments.

### Sanitizer lineage cannot cross context

Public `artifact.put.sanitizedFrom` now requires an artifact owned by the same
request context, trace, and effective repository. Cross-connection,
same-connection cross-trace, and same-trace cross-repository relations fail at
the request boundary before the artifact handler, database row, file write, or
artifact audit event.

### Protected namespace and catalog skew fail before handlers

All `orchestration.*`, `task.*`, `agent.*`, `artifact.*`, `approval.*`, and
`session.*` tools enter the request boundary based on namespace, independently
of canonical catalog membership. The action is then denied if unknown.

Each tool carries its actual server catalog version into the call boundary.
There is no silent invocation fallback to the local constant, so a skewed
protected tool is denied before its handler.

## TDD evidence

### RED

The new boundary regressions were first exercised against the Trial 2 result:

```text
node --test tests/gateway/request_context_boundary.test.js
```

Four new tests failed for the intended reasons:

1. a zero-task repository approval was persisted and auto-granted;
2. the assigned planner was treated as the launch actor and denied;
3. cross-context `sanitizedFrom` reached persistence; and
4. `agent.future` bypassed the boundary and ran its handler.

The approval-service regression also failed before the guard was added:

```text
node --test tests/gateway/autoapprove_mechanism.test.js
```

Complete-looking but missing or unknown repository authority remained
auto-approvable. These failures were not converted into weaker expectations.

### GREEN

The committed tests cover:

- zero-task, mismatched-task, ambiguous multi-repository, omitted restricted
  task, and unknown classification approval cases, including row and
  auto-grant audit absence;
- orchestrator-to-planner launch plus planner child assignment and launch
  denial, including no adapter start or session/task persistence;
- sanitizer lineage across connection, trace, and repository, including no
  derived row, file, or audit side effect; and
- an unknown protected namespace and a real call-tool catalog-version
  mismatch, both with handler/state side effects held at zero.

The final boundary test passed `12/12`. The focused
context/policy/catalog/autoapproval group passed `67/67`; the broader
agent-service, adapter, and tool group passed `92/92`.

## Verification

| Check | Result |
|---|---|
| Final request-context boundary test | `12 passed`, `0 failed`, `0 skipped` |
| Focused context/policy/catalog/autoapproval group | `67 passed`, `0 failed`, `0 skipped` |
| Broader adapter/service/tool group | `92 passed`, `0 failed`, `0 skipped` |
| Full Gateway test command | `772 tests`; `753 passed`, `19 expected service-gated skips`, `0 failed` |
| Full non-real E2E command | `25 tests`; `24 passed`, `1 real-agent opt-in skip`, `0 failed` |
| Gateway lint | passed |
| Ephemeral complete CI inventory | `1195 tests`; `1181 passed`, `12 declared skips`, `2 manifest-only failures` |
| Ephemeral `test.gateway` suite | `762 tests`; `753 passed`, `9 declared Postgres skips`, `0 failed` |
| Ephemeral `test.e2e` suite | `24 passed`, `0 failed` |
| Ephemeral CLI suite | `29 passed`, `0 failed` |
| Ephemeral LangGraph suite | `81 passed`, `3 declared integration skips`, `0 failed` |
| MCP smoke, policy registry, Python lock/lint | passed |
| `git diff --check` | passed |
| Redacted staged gitleaks scan | no leaks found |

All local commands left `AGENTS_REDIS_URL`,
`AGENTS_COORDINATION_REDIS_URL`, and `AGENTS_TEST_REDIS_URL` unset. No shared
Redis, MCP, or KYA service was contacted, changed, restarted, flushed, or
stopped.

## Authoritative CI-manifest integration blocker

The required command was run against the authoritative repository state:

```text
env -u AGENTS_REDIS_URL \
  -u AGENTS_COORDINATION_REDIS_URL \
  -u AGENTS_TEST_REDIS_URL \
  bash scripts/ci.sh
```

It stopped before suite execution because this lane is forbidden to edit the
shared `ci/suites.json` inventory:

```text
lint.gateway: stale inventorySha256; expected sha256:1bbfb5548172016f297a3e6ecde1f8bd2bc5c4cce5a7d3b9d78b805c0500ab62
test.gateway: stale inventorySha256; expected sha256:dd7b524e971e20e7d20d34481e4bf98ead12f54a6706d99316a4787fc33688ea
```

A refreshed ephemeral manifest under `/tmp` exercised the full inventory. Its
only failures were `release.candidate` and the one structure assertion that
intentionally revalidate those same authoritative hashes. The ephemeral
manifest and directory were removed after the run. Updating the two
authoritative hashes and rerunning `bash scripts/ci.sh` remain integrator-only
work.

## Trial 3 technical paths

```text
docs/adr/ADR-006-bounded-autoapprove.md
docs/operator-guide.md
docs/threat-model.md
gateway/src/adapters/claude_adapter.js
gateway/src/adapters/codex_adapter.js
gateway/src/adapters/gemini_adapter.js
gateway/src/core/policy_engine.js
gateway/src/core/policy_types.js
gateway/src/core/request_context.js
gateway/src/mcp_server.js
gateway/src/services/agent_service.js
gateway/src/services/approval_service.js
gateway/src/tools/agent.js
gateway/src/tools/tool_helpers.js
tests/gateway/autoapprove_mechanism.test.js
tests/gateway/code_autoapprove_scope.test.js
tests/gateway/plan_autoapprove_scope.test.js
tests/gateway/request_context_boundary.test.js
```

The technical delta contains no policy-registry edit, schema migration,
durable/global authority or replay mechanism, shared CI/workflow edit, sheet or
README edit, service configuration change, `message.*` change, coordination
change, or `agents:events` change.

## Requested independent probes

1. Reproduce a zero-task approval for `code.apply`, a mismatched task, an
   omitted task on restricted lineage, and an ambiguous trace. Confirm missing
   or unknown repository authority never auto-grants and denial creates no row
   or auto-grant event.
2. Launch an assigned planner from an orchestrator context, then attempt child
   assignment and launch from the planner's own context. Confirm the first
   succeeds and both child operations deny before their persistence/adapter
   side effects.
3. Attempt `sanitizedFrom` across two connections, two traces in one
   connection, and two repositories on one trace. Confirm
   `REQUEST_CONTEXT_DENIED` and no row, file, or artifact audit side effect.
4. Register a synthetic unknown tool under every protected namespace, and
   skew the action-catalog version of a known tool at the real call boundary.
   Confirm all deny before handlers.
5. Verify the private effective binding cannot be forged from public
   arguments, leaked in responses/audit, or reused with a different target
   agent, role, action, or repository.
6. Re-run the full Gateway and non-real E2E suites with all shared Redis
   variables unset.
7. Confirm the Trial 3 range is append-only from the Trial 2 KO result and has
   none of the explicitly excluded paths or mechanisms.

Requested reviewer profile: **GPT-5.6 Sol**, reasoning effort **ultra**,
Priority/Fast service tier.

---

## Independent verdict — Trial 3

**Pending.**

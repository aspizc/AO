# Review Submission — Project V5 D/0/00 (Trial 4)

Status: **Trial 4 technical candidate committed; independent verdict pending**.

No verdict is asserted by the implementation author. Review the technical
delta independently and publish a separate `OK` or `KO` result without
rewriting this request.

## Identity

- Sheet: `plan/PROJECT_V5/D/0/00.md`
- Review id: `D_0_0`
- Frozen Wave 2 base:
  `54ae76a74209687479e4902c816b6bdb4b2e6690`
- Trial 3 result-only KO:
  `ddbe8a9e828be3ff1764a87314323935044d1d02`
- Branch: `feat/V5-D-0-00-request-context-trial2`
- Worktree: `/tmp/agents-orchestrator-v5-d-0-00-trial2`
- Trial 4 technical commit:
  `9643f006131234cfd76e212ad195249057bcee04`
- Trial 4 technical tree:
  `dd95f09c744a1d48a73260f9290774b4516cc376`
- Trial 4 review range:
  `ddbe8a9e828be3ff1764a87314323935044d1d02..9643f006131234cfd76e212ad195249057bcee04`
- Cumulative D/0/00 technical range:
  `54ae76a74209687479e4902c816b6bdb4b2e6690..9643f006131234cfd76e212ad195249057bcee04`

The technical commit is the direct child of the Trial 3 result-only KO. No
prior candidate, request, or result commit was amended, rebased, reset, or
rewritten.

## Why

Trial 3 proved object provenance and control-action matching, but a valid
binding could still be replayed with a different launch tuple. The service
selected the adapter and execution values from caller arguments, and adapters
reinterpreted a mismatched non-null binding as a legacy policy call. Four
independent dry-run probes reached `SESSION_STARTED`, violating the
pre-side-effect request-context boundary.

## What was done

Trial 4 closes the execution-binding replay and fail-open adapter fallback
reported in `plan/reviews/PROJECT_V5/D_0_0-3_result.md`.

### Complete execution tuple fails closed

The common request-context predicate now requires private server provenance
and matches the control action, assigned target agent and role, canonical
target action, repository id, trace id, task id, and realpath cwd. A shallow
clone, a non-object non-null value, a tuple mismatch, or a cwd that does not
resolve to the bound directory returns `REQUEST_CONTEXT_DENIED`.

The agent service performs that assertion before adapter lookup, session
persistence, model-resolution audit, or adapter invocation. After validation,
adapter selection, lineage persistence, audit, and invocation use only the
verified binding's execution values. The assigned target action comes from the
server-owned binding and remains subject to the assigned target's policy; it
is not selected from caller input.

Claude, Codex, and Gemini repeat the provenance and tuple assertion immediately
inside both `spawn` and `delegate`. At that boundary the assigned target action
is also compared with the binding. Any supplied non-null invalid binding
denies; only `null` or `undefined` retains the legacy direct-call policy path.

### Actor and assigned target stay separate

The existing Trial 3 actor/target correction remains intact. The binding actor
is checked for the `agent.spawn` or `agent.delegate` control action, while the
assigned target agent, role, repository, and action are evaluated separately.
The model profile is resolved for the assigned target. A canonical-cwd alias
still permits the positive orchestrator-to-assigned-planner launch, while a
planner assigned `code.write` is denied by target policy before lookup or
launch.

### Pre-authority rejection has zero lineage side effects

A tuple mismatch is rejected before the caller has established authority.
`RequestContextError` therefore does not create an `ERROR` audit event under
caller-controlled trace or role values in either the service or adapters.
Tests assert zero total audit mutation, not only the absence of
`SESSION_STARTED`. Ordinary policy and runtime errors after a valid binding
retain the existing error-audit behavior.

### Threat-model and operator truth were updated

ADR-001, the operator guide, and TM-20 describe the complete tuple, nullish-only
legacy behavior, adapter defense in depth, and the zero-side-effect boundary.
The D/0/00 sheet records this Trial 4 candidate but remains `in_progress`
pending independent review and integration.

## Decisions taken

- Treat every supplied non-null binding as an authority assertion that must
  validate, never as a signal to fall back to legacy policy.
- Derive the post-validation execution tuple from the server-owned binding,
  while retaining caller values only as equality assertions that can deny.
- Suppress audit only for pre-authority `RequestContextError`; preserve
  ordinary post-authority policy and runtime error audit.
- Leave the shared CI manifest untouched and hand its two stale hashes to the
  integrator.

## TDD evidence

### RED 1 — Trial 3 candidate reproduces tuple replay

The new service and real dry-run adapter matrix was first run at
`ddbe8a9e828be3ff1764a87314323935044d1d02`:

```text
node --test --test-concurrency=1 \
  tests/gateway/request_context_execution_binding.test.js
```

Result: `82 tests`; `6 passed`, `76 failed`. Mismatched service calls reached
adapter lookup or session persistence, and all three adapters accepted
mismatched bindings through their policy fallback. No external provider or
tmux process was used because the adapters were configured for dry run.

After the complete-tuple and nullish-only fallback correction, the initial
matrix passed `82/82`. Adding assigned-target-action cases and the adjacent
request-boundary group passed `100/100`.

### RED 2 — pre-authority denials still mutated audit

The matrix was then strengthened to assert zero total audit records for every
invalid binding. Against the first implementation, `86` mutation cases failed
and the `2` positive controls passed because both service and adapter catches
were writing caller-lineage `ERROR` events.

The minimum correction suppresses audit only for `RequestContextError`.
The final matrix passes `88/88`, including an explicit regression proving that
a post-authority `POLICY_DENIED` still writes its normal `ERROR` audit.

## Verification

| Check | Result |
|---|---|
| Final execution-binding matrix | `88 passed`, `0 failed`, `0 skipped` |
| Focused request-context/approval/adapter/service/tool group | `209 passed`, `0 failed`, `0 skipped` |
| Explicit Gateway inventory excluding `tests/gateway/tmux_client.test.js` | `857 tests`; `838 passed`, `19 service-gated skips`, `0 failed` |
| E2E inventory, with real-agent case left opt-in | `26 tests`; `25 passed`, `1 opt-in skip`, `0 failed` |
| CLI suite | `29 passed`, `0 failed` |
| LangGraph suite | `81 passed`, `3 integration/Temporal opt-in skips`, `0 failed` |
| Structure suite | `289 passed`; `1` manifest-only failure for the two stale integrator-owned hashes below |
| Gateway lint | passed |
| Python Ruff inventory | passed |
| Python lock input check | `requirements.lock inputs are current` |
| Policy registry validation | passed |
| MCP smoke | passed |
| TM-20 structure traceability | `3 passed`, `0 failed` |
| `git diff --check` | passed |
| Redacted staged gitleaks scan | one commit scanned; no leaks found |

The final focused matrix and Gateway lint were rerun immediately before the
technical commit. Shared Redis and provider credential variables were unset.
No shared Redis, MCP, or KYA service and no real provider was contacted. No
YOLO or tmux operation was started, listed, killed, changed, flushed, or
stopped.

## Explicit CI limitation and integrator action

This implementation lane was expressly prohibited from executing
`tests/gateway/tmux_client.test.js`, any aggregate that includes it, or the
complete CI gate because the host `/usr/bin/tmux` can materialize a real
ephemeral session. The Gateway inventory was therefore constructed explicitly
from `gateway/tests` and `tests/gateway`, with exactly that one file excluded.
The integrator owns the complete authoritative gate.

Final validation of the authoritative manifest stopped before suites with only:

```text
lint.gateway: stale inventorySha256; expected sha256:1bbfb5548172016f297a3e6ecde1f8bd2bc5c4cce5a7d3b9d78b805c0500ab62
test.gateway: stale inventorySha256; expected sha256:5828ca478051e77c938f65734846e262d0ba4c0a1950c2be32e64643d5841b86
```

`ci/suites.json` is deliberately unchanged. The integrator must update those
two authoritative inventory hashes and run the complete safe gate under the
required operational controls.

## Technical paths

```text
docs/adr/ADR-001-gateway-only.md
docs/operator-guide.md
docs/threat-model.md
gateway/src/adapters/claude_adapter.js
gateway/src/adapters/codex_adapter.js
gateway/src/adapters/gemini_adapter.js
gateway/src/core/request_context.js
gateway/src/services/agent_service.js
plan/PROJECT_V5/D/0/00.md
tests/e2e/bypass_regression.test.js
tests/gateway/request_context_execution_binding.test.js
```

The technical range contains no change to `message.*`, coordination,
`agents:events`, policies, schemas, CI/workflows, the root README, the audit
module, shared plan indexes, or global sheets. It adds no durable/global replay
mechanism and no public child/reviewer bearer capability.

## Commit

- `9643f006131234cfd76e212ad195249057bcee04` —
  `fix(authz): bind complete execution tuple (D/0/00)`

## Requested independent probes

1. Re-run the service matrix for control action, target agent, role,
   repository, trace, task omission, canonical cwd, shallow clone, and
   non-object non-null bindings. Confirm denial before adapter lookup,
   invocation, session persistence, model audit, or any audit mutation.
2. Call each real dry-run Claude, Codex, and Gemini adapter directly for both
   `spawn` and `delegate`, mutating the same tuple plus assigned target action.
   Confirm every non-null mismatch denies rather than entering legacy policy.
3. Confirm `null`/`undefined` still follows the legacy direct-call policy path,
   but false, cloned, or otherwise supplied invalid values do not.
4. Launch the assigned Claude planner from an orchestrator through a canonical
   symlink alias, then assign the planner `code.write`. Confirm the first
   succeeds and the second denies before lookup while retaining normal
   post-authority error audit.
5. Recheck the Trial 2 approval-authority, actor/target separation, sanitizer
   lineage, protected-namespace, and catalog-skew corrections.
6. Confirm the Trial 4 range is append-only from the Trial 3 KO result and all
   excluded paths are byte-identical.
7. Have the integrator refresh only the two authoritative hashes and exercise
   the complete gate without violating the tmux operational restriction.

Requested reviewer profile: **GPT-5.6 Sol**, reasoning effort **ultra**,
Priority/Fast service tier.

---

## Independent verdict — Trial 4

**Pending.**

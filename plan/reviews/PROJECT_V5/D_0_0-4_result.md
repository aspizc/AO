# Independent Review — Project V5 D/0/00 Trial 4

## Verdict

**OK** for technical candidate
`9643f006131234cfd76e212ad195249057bcee04`.

The candidate closes the Trial 3 execution-binding replay. The agent service
and all three real adapters fail closed for every supplied non-null binding
unless it has private server provenance and matches the complete execution
tuple. Invalid bindings return `REQUEST_CONTEXT_DENIED` before adapter lookup,
adapter invocation, session persistence, model-resolution audit, any other
audit mutation, or a provider/tmux launch boundary. After validation, the
service executes from the binding-derived target, repository, lineage, target
action, and canonical cwd.

The four Trial 2 corrections also remain effective at their public and service
boundaries. No P0, P1, or P2 correctness finding was reproduced in the
reviewed scope.

This verdict accepts the frozen technical candidate only. It does not refresh
the integrator-owned CI inventory, run the excluded tmux test, integrate or
promote the candidate, mark the sheet complete, or assert a release.

## Reviewer profile

- Model: **GPT-5.6 Sol**
- Reasoning effort: **ultra**
- Service tier: **Priority/Fast**

The review was requested and performed under that declared profile. The local
worktree exposes no independently auditable model or service-tier telemetry,
so this result does not invent a separate runtime attestation.

Review date: 2026-07-26.

## Reviewed identity and scope

- Branch: `feat/V5-D-0-00-request-context-trial2`
- Frozen Wave 2 base:
  `54ae76a74209687479e4902c816b6bdb4b2e6690`
- Trial 3 result-only KO:
  `ddbe8a9e828be3ff1764a87314323935044d1d02`
- Trial 4 technical commit:
  `9643f006131234cfd76e212ad195249057bcee04`
- Trial 4 technical tree:
  `dd95f09c744a1d48a73260f9290774b4516cc376`
- Trial 4 request-only commit:
  `54d34aaee0361f04ecb87134b00bfc4e41ad82b3`
- Trial 4 request-only tree:
  `55e9307810a2919eacb03a9a2a965509900e8471`
- Trial 4 review range:
  `ddbe8a9e828be3ff1764a87314323935044d1d02..9643f006131234cfd76e212ad195249057bcee04`
- Cumulative D/0/00 technical range:
  `54ae76a74209687479e4902c816b6bdb4b2e6690..9643f006131234cfd76e212ad195249057bcee04`

The technical commit is the direct child of the Trial 3 result-only KO. The
request-only commit is the direct child of the technical commit and adds only
`plan/reviews/PROJECT_V5/D_0_0-4_to_review.md`. The declared SHAs, trees,
parents, and ranges were independently resolved. The worktree was clean before
this result was written.

## Findings

| Severity | Result |
|---|---|
| P0 | None. |
| P1 | None. |
| P2 | None. |

The stale `lint.gateway` and `test.gateway` inventory hashes are an
integrator-owned operational limitation, not a candidate correctness finding.
The read-only manifest validator reported exactly those two stale hashes and
no other manifest error.

## Execution-binding review

### Complete tuple and provenance

`gateway/src/core/request_context.js:261-300` requires private binding
provenance and matches:

- control action;
- assigned target agent and role;
- canonical assigned target action;
- repository id;
- trace id;
- task id; and
- realpath cwd.

The cwd comparison accepts a symlink alias only when it resolves to the exact
bound directory. A clone, proxy-equivalent new object, primitive, array,
missing path, or other mismatch cannot acquire provenance.

`gateway/src/services/agent_service.js:40-112` restricts legacy policy to
literal `null`/`undefined`, validates a non-null binding, evaluates the actor
control action separately from the assigned target policy, resolves the target
profile, and builds an immutable execution tuple exclusively from the binding.

For delegate, validation completes before `adapters.get`, session creation, or
model audit at `gateway/src/services/agent_service.js:202-267`. For spawn it
completes before lookup or invocation at
`gateway/src/services/agent_service.js:277-333`. Both catches suppress only the
pre-authority `RequestContextError`; ordinary post-authority failures still use
the normal error audit at `gateway/src/services/agent_service.js:268-273` and
`:334-338`.

### Adapter defense in depth

Each real adapter repeats the full check before its legacy policy, cwd guard,
audit, process, or supervised-session boundary:

- Claude delegate/spawn:
  `gateway/src/adapters/claude_adapter.js:139-230,234-310`
- Codex delegate/spawn:
  `gateway/src/adapters/codex_adapter.js:179-296,299-398`
- Gemini delegate/spawn:
  `gateway/src/adapters/gemini_adapter.js:97-157,160-223`

Direct dry-run probes covered both `spawn` and `delegate` for Claude, Codex,
and Gemini. Mutations of control action, target action, agent, role,
repository, trace, omitted and different task, different cwd, cloned object,
and multiple non-object non-null values all returned
`REQUEST_CONTEXT_DENIED`. Every denial preserved the pre-call audit count.
No provider or tmux boundary was reached.

Positive direct probes accepted the realpath and a symlink alias resolving to
that same directory. `null` and `undefined` retained the legacy policy path for
both methods on every adapter; `false`, `0`, strings, arrays, and objects did
not.

### Derived execution and policy separation

An instrumented service probe supplied a symlink alias as the caller
assertion. The adapter received the binding-derived canonical cwd, trace, task,
repository, and target action. It did not receive a caller-selected execution
tuple.

The orchestrator-to-assigned-Claude-planner positive path succeeded through a
canonical alias. A planner assigned `code.write` was denied by target policy
before adapter lookup; the normal post-authority `ERROR` audit remained. This
confirms that the control-plane actor and assigned target are separate rather
than restoring the Trial 2 actor/target collapse.

## Trial 2 corrections rechecked

### Approval authority and exact classification

`gateway/src/core/request_context.js:590-649` binds an approval to owned trace
and task lineage, rejects missing or ambiguous repository-affecting lineage,
derives the canonical repository/classification, and treats caller
classification fields as deny-only assertions.

`gateway/src/services/approval_service.js:32-53` independently prevents
repository-affecting autoapproval without a non-empty task, repository, and
known classification, and continues to deny restricted autoapproval.

The boundary matrix confirmed:

- zero-task `code.apply` denial with no approval row or auto-grant event;
- mismatched task and repository/classification assertions denied;
- ambiguous multi-task/multi-repository omission denied;
- a restricted single-task omission remained pending, not auto-granted; and
- incomplete or unknown direct service classification remained pending.

### Child authority and actor/target separation

The orchestrator launched its assigned planner. A planner context could not
assign or spawn a child; task/session and adapter-start counts did not change.
Actor control authorization at `gateway/src/services/agent_service.js:77-84`
and target authorization at `:85-110` remained distinct.

### `sanitizedFrom` lineage

`gateway/src/core/request_context.js:529-554` requires the source artifact to
belong to the same request context and to match both effective trace and
repository. Cross-connection, same-connection cross-trace, and same-trace
cross-repository attempts all returned `REQUEST_CONTEXT_DENIED`, with no
derived row, extra artifact file, or artifact-domain audit mutation.

### Protected namespaces and catalog skew

Protected namespace classification is independent of catalog membership at
`gateway/src/core/request_context.js:254-258`. MCP dispatch supplies the actual
tool catalog version at `gateway/src/mcp_server.js:150-170`, and the wrapper
binds before its handler at `gateway/src/tools/tool_helpers.js:154-172`.

Independent synthetic probes exercised unknown tools under all six protected
namespaces—`orchestration.*`, `task.*`, `agent.*`, `artifact.*`,
`approval.*`, and `session.*`—plus a known tool with a skewed catalog version.
All seven calls returned `REQUEST_CONTEXT_DENIED`; handler side effects stayed
at zero.

## Public error and private-value review

The public serializer at `gateway/src/tools/tool_errors.js:126-143` projects
only catalog-allowed codes/messages and safe policy fields. Direct protected
wrapper and MCP dispatch probes confirmed that request-context denials did not
expose `reasonCode`, internal reason strings, principal values, capabilities,
target binding contents, or injected private values. The same probes observed
zero handler side effects.

The internal direct service/adapter path retains the explicitly documented
legacy policy behavior only when the binding argument is `null` or
`undefined`. No non-null fallback or public MCP bypass was found.

## Acceptance

| D/0/00 criterion | Result |
|---|---|
| Effective principal and repository are server-derived | Accepted for the technical candidate. |
| Actor and target role are distinct and policy-visible | Accepted; positive planner launch and target-policy denial reproduced. |
| Unknown or unregistered actions deny before side effects | Accepted across six protected namespaces and catalog skew. |
| Cross-trace/task/repo/cwd assertions fail before effects | Accepted at request, service, and adapter boundaries. |
| Child/reviewer capabilities remain internal | Accepted; no capability/private binding material appeared in responses or audit probes. |

The sheet remains `in_progress` until integration evidence exists.

## Independent verification

### Focused authority and bypass inventory

```text
env -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL \
  -u AGENTS_TEST_REDIS_URL -u AGENTS_PROFILE \
  -u ANTHROPIC_API_KEY -u GEMINI_API_KEY \
  -u GOOGLE_API_KEY -u OPENAI_API_KEY \
  node --test --test-concurrency=1 \
  tests/gateway/request_context_execution_binding.test.js \
  tests/gateway/request_context_boundary.test.js \
  tests/gateway/request_context.test.js \
  tests/gateway/autoapprove_mechanism.test.js \
  tests/gateway/tool_error_serialization.test.js \
  tests/e2e/bypass_regression.test.js
```

Result: `147 tests`; `147 passed`, `0 failed`, `0 skipped`.

### Independent inline adversarial probes

An independent `node --input-type=module` probe, separate from the committed
test helpers, performed:

- `60` real-adapter assertions across three adapters and two methods; and
- `8` service assertions across both methods.

Result: `68/68` passed. It added different-task cases, direct symlink-alias
positives, `false`/`0`/string/array/object non-null cases, both nullish legacy
values, zero-audit mismatch checks, and binding-derived adapter argument
inspection.

A second inline probe covered six unknown protected namespaces and one catalog
version skew. Result: `7/7` denied, `0` handler side effects.

A third inline probe covered direct-wrapper, MCP, and thrown
`RequestContextError` serialization. Result: `3/3` safe projections, `0`
handler side effects, and no private reason/principal/capability leakage.

### Explicit Gateway inventory

The review constructed a sorted argv from exactly `gateway/tests/**/*.test.js`
and `tests/gateway/**/*.test.js`, rejected the prohibited path if present, and
then invoked Node directly. It did not use the npm test script or a CI
aggregate.

```text
inventory files: 109
inventory list sha256:
1252aba3b5842f5ab7ffabd72bff8908a4036969735328819ada69664e9377a9
prohibited path present: 0
```

Result: `857 tests`; `838 passed`, `19 environment/service-gated skips`,
`0 failed`.

### Explicit E2E inventory

The review constructed a sorted argv from the four concrete
`tests/e2e/*.test.js` files and invoked Node directly with real-agent opt-in and
provider credentials unset.

```text
inventory files: 4
inventory list sha256:
205fe0988841a513d6efc522a1fa8b3443420d256c87d1276ede38fedab2b64d
prohibited path present: 0
```

Result: `26 tests`; `25 passed`, `1 real-provider opt-in skip`, `0 failed`.

### Static and documentation checks

| Check | Result |
|---|---|
| `npm --prefix gateway run lint` | Passed. |
| `git diff --check ddbe8a9..9643f00` | Passed. |
| TM document checks | `4/4` passed by direct function invocation. |
| `python -m pytest -q tests/structure/test_threat_model.py` | Not available: the local Python environment has no `pytest` module; no dependency was installed. |
| Read-only suite-manifest validation | Exactly two stale inventory hashes; no other error. |

The direct TM invocation used `PYTHONDONTWRITEBYTECODE=1` and called all four
test functions from `tests/structure/test_threat_model.py`; it is not reported
as a pytest run.

The two independently reproduced stale hashes are:

```text
lint.gateway: expected sha256:1bbfb5548172016f297a3e6ecde1f8bd2bc5c4cce5a7d3b9d78b805c0500ab62
test.gateway: expected sha256:5828ca478051e77c938f65734846e262d0ba4c0a1950c2be32e64643d5841b86
```

The integrator must refresh only the authoritative inventory and run the
complete operationally controlled gate. No false green is claimed for that
unrun gate.

## Range and excluded-path preservation

The Trial 4 technical range changes exactly the eleven paths declared in the
review request. A quiet diff over `policies/`, `ci/`, `.github/`, the root
README, the audit module, message/coordination surfaces, and shared V5 indexes
was empty.

Representative base/candidate SHA-256 pairs were identical:

| Path | SHA-256 at both `ddbe8a9` and `9643f00` |
|---|---|
| `gateway/src/tools/message.js` | `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac` |
| `gateway/src/tools/coordination.js` | `b1809004834d08de25b72b85cd6bf599633ea74636fd43a000953bcb0e9b6cd4` |
| `gateway/src/coordination.js` | `6f24c2e499044d32bf6c77fb8bd106845f72e2b00c49b314b328c1f49a4e881a` |
| `gateway/src/core/audit.js` | `39f636110c123b27f95932de1fb401e81478310debd4926739e29933e48e615d` |
| `ci/suites.json` | `364df1e9e953266a2750c8f7383929c5059c198806a2ca22d1d997f90edc79f9` |
| `policies/roles.json` | `7fbc0cc985fda3a3b075caba603af8d8c13ad1de4447d175586686684998e240` |
| `policies/repositories.json` | `9dd004d8100170ada97072e076f084f0e8c3817689131e4e752766166dd716c6` |
| `README.md` | `1537adf0ad749bf64874ffc2073451a74524b39b5e2d1d571569118299ba5b68` |
| `plan/PROJECT_V5/SHEETS.md` | `c2db5961b0f98727952abbf918fc971536418c6147d2828932acfacc95b91ca5` |

The range contains no policy edit, schema migration, shared CI/workflow edit,
message/coordination/audit change, `agents:events` change, durable replay
mechanism, or public child/reviewer authority.

## Safety and limitations

- `tests/gateway/tmux_client.test.js` was never executed.
- No npm Gateway test aggregate, full Gateway/CI aggregate, or complete CI gate
  was executed.
- No tmux executable was invoked and no tmux session was created, listed,
  attached, changed, or killed. Supervised adapter cases were dry-run only.
- No shared Redis, MCP, KYA, database, stream, provider, agent, or YOLO process
  was contacted, restarted, stopped, flushed, or mutated.
- The E2E MCP cases used only ephemeral local stdio harnesses; the real-provider
  case remained skipped.
- Redis URLs, profiles, provider credentials, real-agent opt-ins, and provider
  binary overrides were explicitly unset.
- Tests and probes used self-contained temporary SQLite databases, audit logs,
  repositories, and artifact roots and removed their temporary workspaces.
- Apart from this result artifact, no implementation, test, documentation,
  plan, request, policy, manifest, or service configuration file was modified
  by the reviewer.

---

## Independent verdict — Trial 4

**OK.** The frozen technical candidate satisfies D/0/00 and the Trial 4
correction within the reviewed scope. Integration and the excluded complete
gate remain separate required work.

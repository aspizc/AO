# Independent Review Result — Project V5 H/0/00 Trial 4

## Verdict

**KO**

Trial 4 closes the Trial 3 nested executable-value leak for the exercised
object, descriptor, primitive-type, selection-identity, persistence, audit,
and MCP boundaries. The reviewed nested `sessionId` Proxy/`toJSON` carrier is
now rejected without a trap read, persistence, successful model audit, or
sentinel disclosure. The legitimate Codex and Claude dry-run and real-fixture
shapes remain accepted, and the focal and broad local regressions are green.

The adapter-result contract is still not semantically closed, however. Its
single string predicate means "has at least one UTF-16 code unit", not "is a
valid value for this field". As a result:

1. Codex delegate accepts and returns an unknown sandbox value; and
2. Codex and Claude spawn accept whitespace/control-only session, target, and
   command values. A task-backed probe persisted a session whose
   `session_id` and `tmux_target` were three spaces and emitted
   `AGENT_MODEL_RESOLVED`.

Both results pass as successes and reach the service/MCP surface. The latter
also reaches the database and successful audit. This violates the requested
valid-sandbox and non-empty spawn-value contract, so this candidate cannot be
accepted.

## Reviewer profile

- Requested/configured profile: **GPT-5.6 Sol**, reasoning `ultra`, service
  profile `Priority/Fast`.
- Review mode: independent, adversarial, evidence-based local QA.
- No external service-profile telemetry was available. The profile above is
  the requested configuration, not external proof of model, reasoning,
  latency, or service-tier execution.

## Reviewed identity

- Branch: `feat/V5-H-0-00-orchestrator-profile`
- Worktree:
  `/tmp/agents-orchestrator-v5-h000.rq46zM/worktree`
- Frozen Trial 3 KO / Trial 4 base:
  `e6dbdfa5482a09e02024e8e569acc6aa01a15209`
- Trial 4 technical commit:
  `9701f6749a2ce3ec8e3434c2e9e43c8cbdffe3f5`
- Trial 4 technical tree:
  `09dcb9a9ac9a55af003b1ce84d7907cde3ca459e`
- Trial 4 request-only commit:
  `59ab69504a3bd6456583ee5f650e6cacb2a47870`
- Trial 4 request-only tree:
  `c838c8848313a8819259331e41ba7057c8f59b17`
- Exact technical range:
  `e6dbdfa5482a09e02024e8e569acc6aa01a15209..9701f6749a2ce3ec8e3434c2e9e43c8cbdffe3f5`
- Canonical profile digest:
  `sha256:fbca366c3479e4e3e00b038e54c866281b6d0e442f9889d125f47e5c83b7212a`

The technical commit is the direct child of the frozen Trial 3 KO. The request
commit is the direct child of the technical commit and adds only
`plan/reviews/PROJECT_V5/H_0_0-4_to_review.md`. The worktree was clean before
review work began.

## Blocking findings

### P1-1 — Spawn accepts whitespace/control-only identities and commands, then persists an unusable session

`isNonEmptyString()` accepts every string with `value.length > 0`
(`gateway/src/services/agent_service.js:310-312`). The spawn validator applies
only that predicate to `sessionId`, `tmuxTarget`, `attachCommand`, and
`launchCommand`, plus boolean `dryRun` and
`sessionId === tmuxTarget`
(`gateway/src/services/agent_service.js:338-352`). It does not require any
non-whitespace character or a usable target/command representation.

A local fake adapter returned:

```js
{
  sessionId: "   ",
  tmuxTarget: "   ",
  attachCommand: "\t",
  launchCommand: "\n",
  dryRun: true,
  effectiveSelection: args.effectiveSelection,
}
```

The real service and `agent.spawn` MCP wrapper accepted it. The tool response
retained the three U+0020 session characters, U+0009 attach command, and U+000A
launch command, and the operation emitted a successful
`AGENT_MODEL_RESOLVED`.

A second probe supplied a real task. Validation passed before
`createSessionIfTaskProvided()` and `auditModelResolved()`
(`gateway/src/services/agent_service.js:565-584`), so the sessions table
received:

```json
{
  "session_id_code_points": [32, 32, 32],
  "tmux_target_code_points": [32, 32, 32]
}
```

The persisted identifier is not a value the canonical target builder can
produce: it requires non-empty sanitized trace, agent, and role chunks
(`gateway/src/adapters/session_naming.js:20-28`). Subsequent session control
would therefore be bound to adapter-owned whitespace rather than a usable
canonical target.

Required correction:

1. Define field-specific string validity, rather than sharing a
   `value.length > 0` predicate.
2. Reject whitespace/control-only session, target, attach, and launch values
   before persistence and successful audit.
3. Validate `sessionId`/`tmuxTarget` against the canonical supervised-target
   contract, while retaining `sessionId === tmuxTarget`.
4. Add Codex and Claude tests for spaces, tabs, newlines, NUL/control values,
   null and persisted task flows, and stable body-safe rejection with zero
   successful model audit/session persistence.

No provider, child, tmux, Redis, network, or shared service was used by either
probe. Both temporary workspaces were removed.

### P1-2 — Codex delegate treats every non-empty string as a valid sandbox

The Codex delegate branch checks only
`isNonEmptyString(result.sandbox)`
(`gateway/src/services/agent_service.js:328-334`). It neither validates a
canonical sandbox value nor requires equality with server-owned effective
adapter configuration. The Gateway configuration has its own effective
`codexSandbox` value (`gateway/src/config.js:203-205`), and the shipped
operator contract says to retain `workspace-write` unless a later reviewed
task changes policy (`docs/adapters/codex.md:57-64`).

An independent local adapter returned the otherwise exact Codex delegate
shape with:

```js
sandbox: "not-a-codex-sandbox"
```

Despite the service being configured with `codexSandbox: "workspace-write"`,
the result succeeded, emitted `AGENT_MODEL_RESOLVED`, and the real MCP wrapper
returned:

```json
{ "sandbox": "not-a-codex-sandbox" }
```

Thus `sandbox` is Codex-only as intended, but it is not valid or authoritative.
The current test checks only `sandbox: ""`; it does not cover unknown,
whitespace-only, mismatched, or policy-prohibited non-empty values.

Required correction:

1. Establish one canonical validator for supported Codex sandbox values.
2. Require the returned sandbox to equal the server-owned effective sandbox
   used by the adapter; a fake adapter must not invent or substitute it.
3. Add direct-service and MCP tests for unknown, whitespace-only, mismatched,
   and policy-prohibited values, with stable rejection before successful
   audit.

No real Codex process or external service was used by the probe, and its
temporary workspace was removed.

## Trial 3 finding disposition

| Trial 3 requirement | Trial 4 result |
|---|---|
| Exact provider/operation keys, required fields, data descriptors, and no extra/missing fields | **Corrected for the exercised structural boundary.** Plain non-Proxy top-level objects and exact enumerable data keys are enforced. Symbols, custom prototypes, accessors, unknown fields, and missing fields are rejected. |
| Primitive types without boxed/nested/callable/symbol/bigint values or coercion | **Corrected for type safety, but not semantic string validity.** Nested objects, arrays, Proxies, accessors, functions, symbols, bigint, and boxed primitives are rejected without their hooks reaching audit, persistence, service success, or MCP. P1-1 and P1-2 remain. |
| No late `toJSON`/Proxy sentinel evaluation | **Corrected for the reviewed nested carrier.** Independent MCP probe observed `0` trap reads, no sentinel in tool/audit, no persisted session, and no successful model audit. |
| Delegate exit semantics | **Corrected.** Independent cases accepted `-1`, `0`, `-0` as numeric zero, `7`, and `255`; rejected `-2`, `256`, fractions, both infinities, `NaN`, unsafe integers, numeric strings, and boxed numbers with stable `EFFECTIVE_SELECTION_INVALID`. |
| Provider-specific exact model/effort/tier/sandbox shape | **Partial.** Model, effort, and tier equality and Claude's absence of tier/sandbox are enforced; Codex sandbox validity is not, as P1-2 reproduces. |
| Spawn field validity and `sessionId === tmuxTarget` | **Partial.** Types, exact keys, and identity equality are enforced; whitespace/control-only values pass and can persist, as P1-1 reproduces. |
| Legitimate Codex/Claude dry-run and real shapes, including non-zero exits | **Retained.** Focused service tests and real fake-binary adapter tests pass. |
| Registry-only provider denial | **Retained.** Gemini fails before adapter lookup/result/session/model audit in the exercised paths. |
| D/0/00 binding-first, selection provenance/shape/identity, and Trial 3 probes | **Retained.** The authority focus passes; no existing test name or assertion was removed from the authority file. D/0/00 and bypass regression are green. |
| Historical fixture scope | **Accepted.** The two files change only fake-adapter return literals. No test name, assertion, or expectation changed. |

## Positive evidence

- Provider/operation result key sets are exact. Claude rejects Codex-only
  `serviceTier` and `sandbox`; registry-only providers have no result contract.
- Missing, additional, undefined, null, non-enumerable, accessor-backed,
  boxed, nested, proxied, callable, symbol, bigint, wrong-primitive, and
  provider-mismatched fields are rejected in the exercised/static scope.
- `stdout`/`stderr` are strings; `dryRun` is boolean; finite safe integer exit
  codes outside `-1..255` are rejected.
- Model, reasoning effort, and service tier must equal the exact canonical
  selection values. Selection provenance, shape, digest, and exact identity
  remain enforced.
- Normalized service results are fresh frozen DTOs and retain the authoritative
  selection reference.
- Invalid nested values are rejected before task-backed persistence and
  `AGENT_MODEL_RESOLVED`, with the stable allowlisted policy body.
- Legitimate Codex and Claude dry-run, non-zero process, `-1`, and supervised
  fake-fixture results remain green. No legitimate declared result field was
  lost.
- The two historical fixture diffs contain only return-literal additions and
  session/target alignment. Mechanical diff inspection found no changed test,
  assertion, or expectation line.

## Verification performed

- Trial 4 authority focus:

  ```text
  env -u AGENTS_REDIS_URL -u AGENTS_DRY_RUN \
    -u AGENTS_CODEX_MODEL -u AGENTS_CODEX_REASONING_EFFORT \
    -u AGENTS_CODEX_SERVICE_TIER -u AGENTS_CODEX_SANDBOX \
    -u ANTHROPIC_API_KEY -u OPENAI_API_KEY -u GEMINI_API_KEY \
    node --test --test-concurrency=1 \
    tests/gateway/orchestrator_profile_authority.test.js
  ```

  Result: `85` tests; `85` passed, `0` failed, `0` skipped.

- H profile/authority/contract/runtime/tool focus: `121` tests; `121` passed,
  `0` failed, `0` skipped.
- D/0/00 request-context/binding/approval/error plus bypass regression:
  `171` tests; `171` passed, `0` failed, `0` skipped.
- Codex/Claude real-fixture, dry-run, supervised, base/registry, and
  registry-only Gemini adapter group: `55` tests; `55` passed, `0` failed,
  `0` skipped.
- Explicit no-real-provider E2E inventory
  (`bypass_regression`, `mcp_two_agent_workflow`, and
  `mvp_restricted_flow`): `25` tests; `25` passed, `0` failed, `0` skipped.
- Explicit Gateway run excluded
  `tests/gateway/tmux_client.test.js`: `972` tests; `953` passed, `19`
  service-gated skips, `0` failed. The command enumerated `115` local JS paths:
  `112` test files plus the three Gateway support modules discovered under the
  same tree; no tmux-client test was included.
- Independent nested-Proxy/MCP/persistence sentinel probe: stable
  `POLICY_DENIED` / `EFFECTIVE_SELECTION_INVALID`; `0` trap reads, `0`
  persisted sessions, `0` successful model audits, sentinel absent from tool
  and audit.
- Independent exit probe: allowed `-1`, `0`, `-0`, `7`, `255`; rejected
  `-2`, `256`, `1.5`, `NaN`, both infinities, `2**53`, `"0"`, and boxed zero.
- Independent sandbox/whitespace probes: reproduced P1-1 and P1-2 exactly;
  every temporary directory was removed.
- `npm --prefix gateway run lint`: passed.
- `node --check` on the changed service and three changed root tests: passed.
- `env -u AGENTS_POLICIES_DIR -u AGENTS_REDIS_URL .venv/bin/agent-run policy
  validate`: passed with `3` agents, `7` repositories, and `8` roles.
- Structure suite: `290` tests; `289` passed and only the known manifest
  authority test failed on the three hashes below.
- `git diff --check
  e6dbdfa5482a09e02024e8e569acc6aa01a15209..9701f6749a2ce3ec8e3434c2e9e43c8cbdffe3f5`:
  passed.
- Redacted local gitleaks scan of the one technical commit: no leaks found.
- Parentage, tree identity, exact path set, request-only diff, and initial
  worktree cleanliness: passed.

## Authoritative gate limitation

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

This is the unchanged integration-owned limitation already declared by the
submission. It provides no green authoritative aggregate for the reviewed
tree. After the technical findings are corrected and independently reviewed,
the integration owner must refresh only those inventories through the
repository-owned mechanism and run the complete safe gate on the exact final
integration tree.

## Review limits

This review did not run `tests/gateway/tmux_client.test.js`,
`npm --prefix gateway test`, `scripts/ci.sh`, or any aggregate that could
operate tmux. It did not use a real provider, real agent, live Redis, MCP/KYA
service, external network, YOLO/unconfined launch, or shared service. It did
not edit production code, tests, sheets, requests, policies, schemas,
manifests, CI/workflows, Redis/MCP/KYA state, or tmux state. No integration or
promotion was performed.

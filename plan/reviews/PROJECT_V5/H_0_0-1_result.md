# Independent Review Result — H/0/00 Trial 1

## Verdict

**KO**

The isolated profile, schema, matrix, resolver, digest, safety metadata, and
focused tests are coherent, but the candidate does not make them the product's
only selection path. The live policy, audit, dry-run, delegate, and spawn
surfaces still use the pre-existing registry resolver. That leaves direct
runtime bypasses for the canonical digest and resolution source, permits the
profile's `registry-only` Gemini provider to reach its adapter, and persists a
rejected caller value through the legacy audit error path. The authoritative CI
gate also rejects the candidate inventory before running any suite.

## Reviewer profile

- Model: **GPT-5.6 Sol**
- Reasoning effort: **ultra**
- Service tier: **Priority/Fast**
- Review mode: independent, evidence-based, no prior review verdict used

## Reviewed candidate

- Branch: `feat/V5-H-0-00-orchestrator-profile`
- Frozen base: `54ae76a74209687479e4902c816b6bdb4b2e6690`
- Technical commit:
  `7de076c5830da241b631ddc7d5c104b9a4b52a3b`
- Review-request commit:
  `a4f0e93a2da3d3eb1b4677156a621e8ec3e8fba4`
- Isolated profile digest:
  `sha256:fbca366c3479e4e3e00b038e54c866281b6d0e442f9889d125f47e5c83b7212a`

## Blocking findings

### KO-1 — The canonical selection is not consumed by any runtime surface

The new module can create a correct immutable selection and a same-object
bundle (`gateway/src/core/orchestrator_profile.js:209`,
`gateway/src/core/orchestrator_profile.js:363`), but a source-reference scan of
`gateway/src` outside that module finds no import or call. Its only consumers
are the new tests.

The operative path still resolves independently:

- `gateway/src/core/policy_engine.js:176`–`255` owns separate model, effort, and
  tier default/alias logic sourced from the selected agent-capability registry.
- `gateway/src/services/agent_service.js:17`–`22` calls that legacy evaluator.
- `gateway/src/services/agent_service.js:87`–`92` reconstructs a partial
  `{model, reasoningEffort, serviceTier}` object.
- `gateway/src/services/agent_service.js:125`–`139` and `163`–`173` select an
  adapter and delegate/spawn with that partial object.

A read-only in-memory adversarial probe changed the supplied Codex registry
default to `environment-registry-model`, effort `high`, and tier `economy`.
`evaluate()` returned `allow` with all three non-canonical values. This is a
real bypass because `AGENTS_POLICIES_DIR` remains an environment-selected
runtime source (`gateway/src/config.js:133`–`135`) and no runtime startup or
request path checks it against the new profile/digest.

Consequently policy, dry-run, audit, delegate, and spawn do not consume one
`EffectiveAgentSelection`, do not preserve object identity, and do not carry
`provider`, `resolutionSource`, or `registryDigest`. Acceptance criteria 2, 3,
and 6 fail at the product boundary even though the isolated resolver tests
pass.

Required correction:

1. Resolve exactly once from the canonical profile before adapter lookup.
2. Pass the same immutable `EffectiveAgentSelection` to policy, dry-run,
   delegate, and spawn; derive audit only from its safe projection.
3. Remove or fail closed on the legacy registry/default resolver as a competing
   authority. Environment-selected capability registries must be validated
   against the canonical digest before they can influence a request.
4. Add service/tool-path parity tests that use spies to prove every consumer
   receives the same object and exact source/digest. Keep provider-specific argv
   translation in D/0/01.

The review request labels this migration an “integration-only shared edit,” but
it is an explicit H/0/00 acceptance requirement and cannot be deferred past an
OK verdict for this sheet.

### KO-2 — `gemini-cli` remains executable instead of failing before adapter selection

The canonical profile correctly declares Gemini `registry-only`
(`gateway/contracts/orchestrator-profile-v1.json:83`–`86`), and the isolated
helper rejects it. The actual product does the opposite:

- `gateway/src/tools/index.js:34`–`38` registers `GeminiAdapter`.
- `gateway/src/services/agent_service.js:125`–`138` performs legacy policy
  evaluation, calls `adapters.get(agent)`, and delegates.
- `gateway/src/adapters/gemini_adapter.js:93`–`115` contains the reachable real
  launch path.

The safe adversarial policy probe for default `gemini-cli` +
`agent.delegate` returned:

```json
{
  "decision": "allow",
  "model": "gemini-2.5-pro"
}
```

It contained neither a digest nor resolution sources. No provider process was
launched during review, but the source path after this allow decision includes
the existing real `--yolo` invocation at
`gateway/src/adapters/gemini_adapter.js:110`–`115`. This violates the exact
provider matrix and the fail-before-adapter/child criteria.

Required correction:

1. Enforce `execution: registry-only` at the service boundary before
   `adapters.get()` for both delegate and spawn.
2. Add dry-run service/tool tests with adapter-registry and child-launch spies
   proving Gemini is rejected before either spy is touched.
3. Do not add or change provider argv here; D/0/01 retains that ownership.

### KO-3 — The operative audit path leaks rejected input and omits canonical evidence

The new `safeAuditSelectionProjection()` is allowlisted and passes its focused
tests, but it is unused by the product.

The operative legacy policy embeds a rejected model verbatim in its denial
reason (`gateway/src/core/policy_engine.js:183`–`190`). `PolicyDeniedError`
copies that reason into its message (`gateway/src/services/agent_service.js:8`–
`14`), and the service error audit persists both the message and the complete
decision (`gateway/src/services/agent_service.js:56`–`64`). The adversarial
probe confirmed that `raw-rejected-alias-S3CRET` appears verbatim in the
returned denial object. The resolved-model audit also stores only the three
legacy values, with no canonical provider, source, or digest
(`gateway/src/services/agent_service.js:95`–`106`).

This fails the requirement that audit contain only effective non-secret values
and the digest, never a raw alias or rejected payload.

Required correction:

1. Replace value-bearing selection denial reasons on this path with stable safe
   codes and field/provider metadata only.
2. Persist successful selection evidence exclusively through
   `safeAuditSelectionProjection()` from the same canonical object.
3. Add end-to-end audit tests for raw aliases, unknown models, effort/tier
   secrets, forged selections, and registry-only providers; assert the audit
   JSONL contains none of the rejected values and includes the exact canonical
   digest/source fields only for a valid effective selection.

### KO-4 — The authoritative CI gate rejects the candidate

`bash scripts/ci.sh` exits `2` with `status: invalid_manifest` before suite
execution. The stale inventories are:

- `lint.gateway`:
  `sha256:163b0dabc319bb617bdfbbb1b9285b25a639c2cf556d77308c8e62d36db2438f`
- `test.gateway`:
  `sha256:aee9686c7556a1709e6dfdcf26cb084725623828d40fc457dc222399a2057b04`
- `policy.registry`:
  `sha256:05873e6acdc570e306947afbbf5b3a4f45a33420ff0a132a172069606bcdfef3`

The independent Python suite corroborates the same manifest failure. A frozen
manifest may be refreshed by the integration owner, but an H/0/00 candidate
cannot receive OK until the exact reviewed tree passes the authoritative gate.

Required correction: refresh the inventory through the repository-owned
mechanism after all Trial 2 files are final, then run and record a green
`bash scripts/ci.sh` on that same commit/tree.

## Acceptance and non-scope assessment

| Requirement | Result | Evidence |
|---|---|---|
| One profile explains roles, models, tools, and unavailable gate IDs truthfully | OK in the contract | Versioned profile and schema; F/0/03 and F/0/04 remain typed `unavailable` prerequisites. |
| Exact provider matrix, aliases, defaults, efforts, tiers, and digest have one effective authority | **KO** | The isolated matrix is exact, but the live policy still accepts independently supplied registry defaults and emits no profile digest. |
| Policy, audit, dry-run, delegate, and spawn agree on one immutable selection and source | **KO** | Same-object bundle exists only inside the new module/tests; there are no runtime references. |
| Unknown/unsupported input fails before adapter selection or child creation | **KO** | Legacy rejection is value-bearing; registry-only Gemini is allowed and its adapter remains selected. |
| Shipped prompt examples/schema references validate | OK | Focused schema/reference tests and the broader gateway prompt/catalog tests pass. |
| Unsupported model/capability combinations fail before launch | **KO** | The canonical helper does so in isolation; the runtime can accept a drifted environment-selected registry and allows registry-only Gemini. |
| Every mutation has risk, destructive, idempotency, retry, and protected-effect metadata | OK | Exact 33-tool projection and mutation checks pass. |
| No owner-personal default in the H/0/00-owned canonical profile surface | OK | The changed profile surface passes the personal-name/path scan; repository-wide KYA productization remains H/0/03 scope. |
| No new adapter or provider-specific argv formatting | OK | The technical commit changes neither adapters nor argv construction. |
| No false implementation of F/0/03–04 | OK | Both gates remain explicitly unavailable. |
| No prompt-only/parallel authority | **KO** | The profile is currently a disconnected parallel contract rather than the runtime authority. |

## Verification performed

- `node --test --test-concurrency=1 tests/gateway/orchestrator_profile.test.js tests/gateway/orchestrator_profile_contract.test.js`
  - 14 passed, 0 failed, 0 skipped.
- Read-only in-memory adversarial policy/default/audit probe
  - reproduced Gemini `allow`, missing digest/sources, rejected-value echo, and
    acceptance of a non-canonical alternate registry default.
- Runtime reference scan excluding
  `gateway/src/core/orchestrator_profile.js`
  - no references found (`rg` status 1).
- `npm --prefix gateway run lint`
  - passed.
- `env -u AGENTS_TEST_REDIS_URL -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u AGENTS_LIVE_TEST -u AGENTS_PROVIDER_LIVE -u AGENTS_DRY_RUN npm --prefix gateway test`
  - 764 tests; 745 passed, 19 opt-in/infrastructure skips, 0 failed.
- `PATH=.venv/bin:$PATH agent-run policy validate`
  - passed: 3 agents, 7 repositories, 8 roles.
- Absolute-venv
  `python -m pytest -q -rs`
  - 399 passed, 1 failed, 3 opt-in integration skips; the sole functional
    failure is the stale authoritative manifest.
- `env -u AGENTS_TEST_REDIS_URL -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u AGENTS_LIVE_TEST -u AGENTS_PROVIDER_LIVE -u AGENTS_DRY_RUN PATH=.venv/bin:$PATH bash scripts/ci.sh`
  - exited 2 with `status: invalid_manifest`; 0 suites ran.
- `git diff --check 54ae76a74209687479e4902c816b6bdb4b2e6690..HEAD`
  - passed before this result artifact.

No shared Redis, MCP server, KYA runner, real provider, tmux child, YOLO, or
unconfined launch was used during review.

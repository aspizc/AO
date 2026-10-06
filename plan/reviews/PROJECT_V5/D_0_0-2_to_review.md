# V5 D/0/00 — Trial 2 independent review request

Status: **Trial 2 technical candidate committed; independent verdict pending**.

No verdict is asserted by the implementation author. Review the technical
commit independently and publish a separate `OK` or `KO` result without
rewriting this request.

## Identity

- Sheet: `plan/PROJECT_V5/D/0/00.md`
- Review id: `D_0_0`
- Frozen base: `54ae76a74209687479e4902c816b6bdb4b2e6690`
- Branch: `feat/V5-D-0-00-request-context-trial2`
- Worktree: `/tmp/agents-orchestrator-v5-d-0-00-trial2`
- Technical commit:
  `137b0f730d17d29ffe0587a8d41d80c6e0c9eb54`
- Technical tree:
  `91d7fc6134e1de9a9d9db051ce19f64c508eb23a`
- Review range:
  `54ae76a74209687479e4902c816b6bdb4b2e6690..137b0f730d17d29ffe0587a8d41d80c6e0c9eb54`

The earlier `feat/V5-D-0-00-request-context@e9e343c` attempt was consulted as
historical evidence only. No commit was cherry-picked. In particular, this
candidate does not add its global idempotency lookup or migrations.

## Outcome

The candidate adds a server-owned, immutable `RequestContext` for the local
stdio MCP connection. Its public identity, audience, connection id, action
catalog version, validity interval, and repository ids are immutable; its
capabilities and resource lineage stay in private `WeakMap` state.

Before a protected tool reaches its service:

- schema validation still runs first;
- the transport audience and connection id must match;
- the context must be current and not revoked;
- the requested action must be canonical, version-matched, and granted by an
  internal capability;
- caller identity fields are assertions that may deny but never replace the
  server actor;
- repository ids and working directories resolve through canonical realpaths;
- trace, task, session, artifact, and approval ownership must belong to the
  same connection lineage; and
- effective actor, target, repository, trace, and task values replace
  caller-controlled equivalents before the service can mutate state.

Lineage is recorded only after a protected tool succeeds. It is deliberately
connection-local and non-durable in this task, so a different connection or
restarted gateway cannot replay a public resource id as authority.

The policy engine now has a first, closed action layer. Missing, misspelled,
unknown, and version-skewed actions deny explicitly instead of falling through
an allow path. Protected public tool contracts expose the safe
`REQUEST_CONTEXT_DENIED` code without leaking reason codes or capabilities.

Message and coordination tools remain outside this boundary and are unchanged.

## TDD evidence

### RED

The initial focused command was:

```text
node --test --test-concurrency=1 \
  tests/gateway/request_context.test.js \
  tests/gateway/request_context_boundary.test.js \
  tests/gateway/policy_engine.test.js \
  tests/gateway/policy_role_matrix.test.js
```

Against the frozen base it failed for the intended reasons:

- `gateway/src/core/request_context.js` did not exist;
- `foo.bar` still evaluated to `allow`;
- an omitted action threw during normalization instead of returning `DENY`;
  and
- no closed action layer appeared in the policy trace.

Additional tests were held RED while tightening the implementation:

- the real stdio workflow failed until one MCP connection was retained and
  actor identity was kept distinct from artifact-share target identity;
- two configured roots for one repository id were accepted until ambiguous
  canonical binding was rejected; and
- task, repository, and classification assertions in approval context reached
  persistence until those values were derived from owned lineage.

### GREEN

The committed tests cover actor/role/capability spoofing, wrong audience,
version skew, expiration, revocation, symlink escape, repository alias and
ambiguity, cross-connection replay, trace/task/target/repository mismatch,
pre-launch and pre-persistence denial, internal capability secrecy, approval
derivation, and a persistent real MCP stdio workflow.

The final focused request-context, boundary, policy, catalog, and MCP workflow
run passed `47/47`.

## Verification

| Check | Result |
|---|---|
| Final focused context/policy/catalog/MCP group | `47 passed`, `0 failed`, `0 skipped` |
| Full Gateway test command | `766 tests`; `747 passed`, `19 expected service-gated skips`, `0 failed` |
| Full non-real E2E command | `25 tests`; `24 passed`, `1 real-agent opt-in skip`, `0 failed` |
| Gateway lint | passed |
| Explicit changed-E2E ESLint | passed |
| Ephemeral full CI inventory | `1175 passed`, `12 skipped`; two failures solely from the authoritative stale manifest described below |
| Ephemeral `test.gateway` suite | `747 passed`, `9 declared Postgres skips`, `0 failed` |
| Ephemeral `test.e2e` suite | `24 passed`, `0 failed` |
| Ephemeral CLI suite | `29 passed`, `0 failed` |
| Ephemeral LangGraph suite | `81 passed`, `3 declared integration skips`, `0 failed` |
| MCP smoke, policy registry, Python lock/lint | passed |
| `git diff --check` | passed |
| Redacted gitleaks diff scan | no leaks found |

The full Gateway and E2E commands explicitly removed the three shared Redis
environment variables. No shared Redis or MCP service was contacted,
reconfigured, restarted, flushed, or stopped.

## Authoritative CI-manifest integration blocker

The required command was run unchanged:

```text
env -u AGENTS_REDIS_URL \
  -u AGENTS_COORDINATION_REDIS_URL \
  -u AGENTS_TEST_REDIS_URL \
  bash scripts/ci.sh
```

It stopped before suite execution with `status: invalid_manifest` because this
lane was forbidden to edit the shared `ci/suites.json` registry:

```text
lint.gateway: stale inventorySha256; expected sha256:1bbfb5548172016f297a3e6ecde1f8bd2bc5c4cce5a7d3b9d78b805c0500ab62
test.gateway: stale inventorySha256; expected sha256:dd7b524e971e20e7d20d34481e4bf98ead12f54a6706d99316a4787fc33688ea
```

An ephemeral copy under `/tmp` was refreshed to exercise the complete suite
inventory. Its only two failures were `release.candidate` and the one
structure assertion that intentionally revalidate the unchanged authoritative
manifest. Updating the two hashes above is integration-only work.

## Technical paths

```text
gateway/contracts/mcp-tools-v1.json
gateway/src/core/policy_engine.js
gateway/src/core/policy_rules.js
gateway/src/core/policy_types.js
gateway/src/core/request_context.js
gateway/src/mcp_server.js
gateway/src/tools/catalog.js
gateway/src/tools/tool_helpers.js
tests/e2e/helpers/mcp_client.js
tests/e2e/mcp_two_agent_real.test.js
tests/e2e/mcp_two_agent_workflow.test.js
tests/gateway/policy_engine.test.js
tests/gateway/policy_explain.test.js
tests/gateway/policy_role_matrix.test.js
tests/gateway/request_context.test.js
tests/gateway/request_context_boundary.test.js
tests/gateway/tool_catalog.test.js
```

There are no schema changes, migrations, durable global ownership lookups,
bearer handles, public lineage tokens, policy-registry edits, shared-service
configuration edits, or `agents:events` changes.

## Integration-only follow-ups

- Refresh the two authoritative `ci/suites.json` inventory hashes listed
  above and rerun `bash scripts/ci.sh`.
- The current Temporal/LangGraph activity runner starts a fresh gateway
  subprocess per activity. Connection-local lineage correctly denies such a
  cross-process replay. D/0/02, or the designated persistent
  execution/recovery owner, must supply a persistent gateway session or an
  authenticated internal lineage handoff. Do not replace that work with a
  public idempotency-key lookup.
- The current server bootstrap principal is scoped to the process-owned local
  stdio transport. Any later network transport must bind `RequestContext` to
  its real transport authenticator instead of reusing the local bootstrap.
- The live Redis lane was intentionally not run because no isolated service
  URL was provided and shared Redis was out of scope.

## Requested independent probes

1. Verify that invalid schema input returns `INVALID_INPUT`, while valid
   identity, repository, lineage, or capability spoofing returns the safe
   `REQUEST_CONTEXT_DENIED` envelope before persistence or launch.
2. Reproduce canonical nested-directory binding, symlink escape denial,
   duplicate-root denial, and one-id/multiple-root ambiguity denial.
3. Confirm missing, unknown, misspelled, unauthorized, and version-skewed
   actions fail closed and stop the policy trace at the action layer.
4. Create resources on one connection and confirm trace, session, artifact,
   and approval replay from another connection is denied before state access.
5. Confirm capabilities and private reason codes never appear in tool
   responses, public catalog projections, audit records, or service arguments.
6. Re-run the persistent stdio workflow and the full Gateway/E2E suites with
   shared service variables unset.
7. Confirm the technical range has no migration, global ownership lookup,
   message/coordination change, shared registry/configuration edit, or
   premature durable replay mechanism.
8. Treat the two shared CI inventory hashes and the future persistent
   workflow handoff as integration work, not as authority to broaden this
   candidate.

---

## Independent verdict — Trial 2

**Pending.**

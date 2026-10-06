# V5 G/0/00 — Trial 1 independent review request

Status: **implementation committed; independent verdict pending**.

No verdict is asserted by the implementation author. Please review the
technical commit and record an independent `OK` or `KO` without rewriting this
append-only request.

## Identity

- Sheet: `G/0/00`
- Review id: `G_0_0`
- Branch: `feat/V5-G-0-00-required-redis-races`
- Required base:
  `30430e525c28123d9e447b0a5a4e20685273469c`
- Technical commit:
  `63e48d7021fffe68db4ec9fa413ee5708bf9e304`
- Review range:
  `30430e525c28123d9e447b0a5a4e20685273469c..63e48d7021fffe68db4ec9fa413ee5708bf9e304`
- Integrated dependencies:
  - `C/0/00`: final correction `f37fe7f`, approved by `262c666`
  - `B/0/01`: implementation `75076d4`, independently reviewed OK

## Outcome

- Promotes `test.redis-live` from `optional-service` to a required suite in
  both the executable and non-refreshable suite contracts.
- Allows a required suite to retain an explicit readiness condition. Missing
  required readiness is machine-readable as `infrastructure_unavailable` but
  exits nonzero; optional-service absence retains its existing exit policy.
- Gives every GitHub Actions Node matrix job a health-checked
  `redis:7.2-alpine` service and loopback-only test URL.
- Adds repeated four-client equality/conflict contention plus pending-safe
  capacity, reclaim, atomic mixed-batch ACK, tombstone retry, replacement,
  connection-loss, and expiry-at-mutation schedules.
- Enforces Redis major version 7, standalone/non-cluster primary topology,
  zero runtime skips, positive test collection, and a final read-only leaked-key
  guard.
- Keeps G/0/00 `in_progress` and the independent verdict pending.

## TDD evidence

### RED

The first focused structure run failed exactly three tests:

```text
tests/structure/test_ci_suite_manifest.py::test_repository_manifest_is_authoritative_and_complete
  test.redis-live was not required
tests/structure/test_ci_gate.py::test_github_actions_ci_workflow_runs_local_ci_gate
  the workflow had no Redis environment/service
tests/structure/test_v5_coordination_docs.py::test_v5_runbook_has_isolated_no_restart_rollout_and_evidence_map
  the multi-client race evidence was absent
```

Result: `3 failed`.

A second RED added required-readiness semantics:

```text
tests/structure/test_ci_suite_manifest.py::test_required_service_absence_is_machine_readable_and_fails_gate
```

Result: `1 failed`; the previous gate rejected readiness on a required suite
and returned manifest exit `2` instead of unavailable-infrastructure exit `1`.

### GREEN

The implementation changes only the CI/service-lane contract, workflow,
acceptance tests, and their documentation/plan surfaces. No coordination
production Lua/service behavior needed correction: the new real contention
schedules passed against Redis 7.2 after the missing lane/harness was added.

## Verification

The Redis value was an isolated credential-free loopback URL supplied only to
the test process. Its ephemeral port is intentionally not persisted here.

| Command | Result |
|---|---|
| focused required/optional readiness regression trio | `3 passed` |
| `python -m pytest -q tests/structure` | `223 passed` |
| complete `tests/gateway/*_live.test.js` lane on isolated Redis 7.2 | `9 passed`, `0 skipped`, `0 failed` |
| new race and leak-guard files alone | `3 passed`, `0 skipped`, `0 failed` |
| `ruff==0.15.16 check scripts/ci_gate.py tests/structure` from the offline cache | all checks passed |
| ESLint on both new root live-test files | exit `0` |
| `python scripts/ci_gate.py --repo-root . --validate-only` | `status: passed`, exit `0` |
| authoritative offline `bash scripts/ci.sh` with isolated Redis and locked `ruff==0.15.16` | exit `0`; 1,097 tests, 1,085 passed, 12 exact infrastructure skips, 0 failed |
| final `test.redis-live` inside the authoritative gate | 9/9 passed, 0 skipped |
| `git diff --check` | exit `0` |
| scoped high-confidence secret-signature scan | no matches |

The aggregate gate status remains honestly `infrastructure_unavailable`
because nine PostgreSQL tests and three Gateway/Temporal tests are exact
pre-existing allowlisted skips, and `test.real-agents` was not selected. The
new required Redis suite itself is `passed`.

Two earlier aggregate attempts are preserved for transparency:

1. the first lacked `ruff` on `PATH` and otherwise exercised the full test
   matrix, including Redis 9/9;
2. an unpinned cached `ruff 0.16.0` applied newer lint rules to 57 pre-existing
   baseline locations.

The final run used the repository lock's `ruff==0.15.16` and exited zero.

## Exact technical paths

```text
.github/workflows/ci.yml
CHANGELOG.md
ci/suites-contract.json
ci/suites.json
docs/adr/ADR-007-remote-ci-safety-net.md
docs/adr/ADR-V5-01-redis-coordination-plane.md
docs/architecture.md
docs/ci-contract.md
docs/coordination-bus.md
docs/operator-guide.md
docs/threat-model.md
gateway/README.md
plan/PROJECT_V5/C/0/00.md
plan/PROJECT_V5/COVERAGE_MATRIX.md
plan/PROJECT_V5/EPICS.md
plan/PROJECT_V5/G/0/00.md
plan/PROJECT_V5/G/README.md
plan/PROJECT_V5/README.md
plan/PROJECT_V5/SHEETS.md
plan/README.md
scripts/ci_gate.py
tests/gateway/coordination_multi_client_race_live.test.js
tests/gateway/zz_coordination_namespace_guard_live.test.js
tests/structure/test_ci_gate.py
tests/structure/test_ci_suite_manifest.py
tests/structure/test_v5_coordination_docs.py
```

## Safety and reconciliation

- The implementation used a separately named disposable Redis 7.2 container.
  It did not connect to, stop, restart, flush, or mutate the existing shared
  Redis/MCP services.
- Cleanup is limited to each UUID prefix. The final guard is read-only and
  fails on any remaining `agents:test:v5:*` key.
- No secret-bearing payload, Redis credential, lease token, or digest is
  persisted in the test or this request.
- V4 `E/2/01` is broader than this Redis sub-slice and remains open.
  No V4 sheet or absorption state was changed; the multi-owner V4 mapping still
  requires its other owners, review, and integration evidence.

## Requested review focus

1. Confirm required readiness absence is distinct and nonzero without changing
   the existing exact-allowlisted skip policy.
2. Confirm the workflow service is isolated, health-checked, Redis 7, and does
   not duplicate the authoritative test command.
3. Stress the equality/conflict, pending/reclaim, replacement/expiry,
   connection-loss, and all-or-nothing ACK schedules.
4. Confirm the final namespace guard runs last in the sorted required lane and
   cannot conceal cleanup by deleting keys.
5. Confirm docs, ADRs, sheet, epic/index state, and historical C/0/00 wording
   match the executable contract without claiming completion or V4 absorption.

---

## Independent verdict — Trial 1

**Verdict: OK**

Reviewer execution label:
**«GPT-5.6 Sol, razonamiento ultra, servicio Priority/Fast solicitado»**.

Review date: 2026-07-26.

No blocking finding was found in the scoped technical candidate.

### Identity and scope

- The reviewed branch was
  `feat/V5-G-0-00-required-redis-races`; the worktree began clean at request
  commit `d11d44b3064780cc04e35ccdee86396f07f4d519`.
- Technical commit `63e48d7021fffe68db4ec9fa413ee5708bf9e304`
  has the declared base
  `30430e525c28123d9e447b0a5a4e20685273469c` as its direct parent and tree
  `0ccc977038bb4c41f08e81a233c457e0c6062839`.
- Request commit `d11d44b3064780cc04e35ccdee86396f07f4d519`
  has the technical commit as its direct parent and adds only this 162-line
  review request; its pre-verdict tree is
  `ca6589e6c08d3b14ca14c0eade80f682c7d6cbbf`.
- The technical range contains one commit and 26 paths: 996 insertions and
  67 deletions. The executable changes are confined to the required-suite
  contract/gate, GitHub workflow, structure tests, and two new live-test files;
  the remaining changes document the still-pending G/0/00 state.
- No production coordination queue/service implementation changed. The
  existing Lua behavior is exercised by the new required real-Redis schedules.

### Contract and race assessment

- `test.redis-live` is in the governed required set in both manifests. A
  missing readiness variable produces a machine-readable
  `infrastructure_unavailable` suite result with zero collected tests and exit
  1, without invoking a skipped test. Unselected optional services retain the
  previous honest exit-zero policy, and existing exact allowlisted test skips
  remain unchanged.
- Every GitHub Actions Node matrix job declares one `redis:7.2-alpine` service,
  a `redis-cli ping` health check, and the loopback test URL before invoking the
  single authoritative `scripts/ci.sh` entry point.
- The contention test creates four independent service/client factories and
  repeats six equality/conflict schedules. It proves one created delivery plus
  equal duplicates, conflict isolation, one inbox entry per logical message,
  and cleanup after ACK.
- The second schedule proves pending-safe capacity under concurrent sends,
  reclaim by a different consumer, all-or-nothing mixed-batch ACK, tombstone
  retry, replacement-incarnation fencing, no mutation after injected
  pre-command connection loss, expiry-at-mutation fencing, and per-operation
  client shutdown (`open == 0` and `created == destroyed`).
- Live topology checks require Redis major 7, `redis_mode:standalone`,
  `cluster_enabled:0`, and the primary `master` role.
- File discovery is sorted and the lane uses `--test-concurrency=1`, placing
  `zz_coordination_namespace_guard_live.test.js` last. Static inspection
  confirms that guard performs only `SCAN` plus local client destruction; it
  cannot make a dirty run pass by deleting Redis keys.
- Documentation keeps G/0/00 `in_progress` with review/integration pending,
  retains G/0/01–04 and V4 `E/2/01` as open, and does not claim promotion or
  broader V4 absorption.

### Independent verification

| Check | Independent result |
|---|---|
| Required/optional readiness plus workflow/doc focus | 6 passed |
| `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q tests/structure` | 223 passed |
| Four simultaneous executions of the new race file | 4 × 2 passed; 0 failed, 0 skipped |
| Read-only guard after concurrent stress | 1 passed; 0 leaked `agents:test:v5:*` keys |
| Complete sorted `tests/gateway/*_live.test.js` lane | 9 passed; 0 failed, 0 skipped |
| Authoritative offline `bash scripts/ci.sh` | exit 0; 1,097 tests, 1,085 passed, 12 exact infrastructure skips, 0 failed |
| Redis suite inside the authoritative gate | 9/9 passed; 0 skipped; post-gate leak count 0 |
| `ruff==0.15.16 check scripts/ci_gate.py tests/structure` | passed |
| ESLint with `gateway/eslint.config.js` on both new root live-test files | passed |
| `python scripts/ci_gate.py --repo-root . --validate-only` | exit 0; `status: passed`; zero errors |
| `git diff --check` on base-to-technical and technical-to-request | passed |
| High-confidence added-line secret-signature scan | 0 matches |

The aggregate gate correctly remained `infrastructure_unavailable`: the nine
PostgreSQL skips and three Gateway/Temporal skips are the exact pre-existing
allowlisted cases, while `test.real-agents` was not selected. This does not
dilute the Redis result, which was required and fully passed.

### Safety, cleanup, and limits

- Review execution never contacted, restarted, stopped, or inspected the
  shared MCP/Redis service or the `kya-coord-redis` container. It used no
  `FLUSHDB`, tmux, delegated agent, network fetch, push, integration, or
  promotion.
- Reviewer live checks used separately named Redis 7.2.15 containers on random
  loopback ports and UUID test prefixes. Every reviewer container was stopped
  and removed, and the reviewer-installed offline `gateway/node_modules`
  directory was removed after verification.
- One preliminary live invocation was discarded because the fresh worktree
  lacked Gateway dependencies and ESM resolution failed before candidate tests
  loaded. Its isolated container was removed. After
  `npm --prefix gateway ci --offline` installed the exact lock (196 packages,
  zero reported vulnerabilities), all recorded live and aggregate checks
  passed.
- The local authoritative gate used Node 22.22.1 and Python 3.14.4. The Node 24
  matrix and the actual GitHub-hosted runner were not executed locally; their
  workflow topology was validated structurally. Wrong-version, replica, and
  cluster Redis instances were not started because review authority permitted
  only an isolated Redis 7.2 instance; those negative cases were verified by
  inspection of the explicit live assertions.
- PostgreSQL, Temporal, Gateway integration, real providers, shared services,
  release tags, and remote CI remain outside this verdict.

Trial 1 is independently **OK** for the scoped G/0/00 implementation. This
verdict proves review only; it does not itself integrate, promote, or release
the candidate.

# Review Submission — Project V5 G/0/02 STORE (Trial 2)

## Review requested

Independent, evidence-based review is requested for the frozen Trial 2
technical range ending at
`99cab71f6ce1ab7303f73bd853566873c93178ee`.

This is request-only evidence. It contains no automatic verdict, result,
integration, promotion, release, Redis/service wiring, health projection, or
full-`G/0/02` completion claim.

## Trial 1 findings addressed

Trial 2 is limited to the three P1 findings in
`G_0_2_STORE-1_result.md`.

### Deferred expiry derivation

The SQLite repository now derives `now + leaseMs` only on a serialized branch
that will install or extend a lease:

- a new or stale processing claim;
- a winning blocked-quarantine recovery;
- a winning replay claim; or
- an owned attempt extension.

Completed, blocked, already-consumed, missing, duplicate, conflicting, and
busy outcomes no longer reject merely because individually valid `now` and
`leaseMs` values would overflow when added. On a winning branch, expiry is
validated before its first durable write. Directed snapshot assertions cover
new and replacement claims, blocked recovery, replay, and attempt extension
when expiry derivation overflows.

### Exhaustive runtime corruption checks

Runtime decoding now accepts stored `metadata_malformed` only when its raw
value is exactly `NULL`, `0`, or `1`.

The cross-table decoder applies explicit per-state invariants for:

- receipt lease presence or absence;
- effect absence or commitment;
- blocked or committed quarantine shape;
- replay absence, processing, failure, or commitment;
- ACK progression;
- delivery existence; and
- private recovery-history eligibility and bounds.

The matrix distinguishes both legal `completed` lineages: effect completion
requires a committed ACK, while quarantine completion may also arise from a
failed replay before ACK. Corrupt recognized states fail with exactly
`COORDINATION_CONSUMER_STORE_CORRUPT` and
`coordination consumer store state is invalid`.

### Closed adapter error boundaries

Both adapters use module-private provenance sets. Only errors deliberately
created by their own validation, operation, or static control paths can cross
the boundary unchanged. Public constructors do not confer trusted provenance.

Database-zone validation failures become fixed corruption errors. Every
untrusted dependency exception, including `TypeError`, becomes:

- repository:
  `COORDINATION_CONSUMER_STORE_FAILED` /
  `coordination consumer store operation failed safely`;
- vault:
  `COORDINATION_QUARANTINE_VAULT_FAILED` /
  `coordination quarantine vault operation failed safely`.

The tests cover real closed SQLite connections, missing schemas, hostile
dependency `TypeError` values, and forged instances of both exported error
classes. Caller validation retains its exact useful `TypeError` messages.

## TDD evidence

### RED

- Commit:
  `abb8ca6f1558923b3dcc40421c15900c3c461c86`
- Subject:
  `test(consumer): reproduce SQLite store review findings (G/0/02 STORE)`
- Tree:
  `e027163575dac51fba6d9db6b32697739766f8e6`
- Direct parent:
  `8fc8010d3ebf93aa3759f05faef6391a16fbe33a`
- Changed path:
  `tests/gateway/coordination_consumer_sqlite_repo.test.js`

The two directed SQLite files produced:

- **91 tests / 52 passed / 39 expected failures**;
- expiry: **10** non-winning parity failures, with the five-transition
  winning-overflow atomicity guard already green;
- state corruption: **48** probes, of which **19** exposed missing checks and
  **29** preserved already-closed guards;
- metadata: three valid raw values green and **4** invalid raw values failing;
- error boundaries: **6** independent repository/vault failures for closed
  connections, hostile `TypeError` values, and forged exported errors.

The RED commit changed tests only. Production was untouched.

### GREEN

- Commit:
  `99cab71f6ce1ab7303f73bd853566873c93178ee`
- Subject:
  `fix(consumer): harden SQLite coordination store (G/0/02 STORE)`
- Tree:
  `5c69126d79e205b5223d3360ee769e1bb13ad7af`
- Direct parent:
  `abb8ca6f1558923b3dcc40421c15900c3c461c86`
- Changed paths:
  - `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js`
  - `gateway/src/core/sqlite_quarantine_store.js`

The exact RED test blobs were unchanged at GREEN:

- repository test Git blob:
  `af1c21febea52ae4ce78d0a41b1febf4fc580ebf`;
- integration test Git blob:
  `296f8f5524c3e315aa36b9e26f62f92134b234f4`.

The directed SQLite command passed **91 / 91**.

## Directed verification

Store, vault, differential-port, reopen, contention, real-consumer, expiry,
corruption, and error-boundary tests:

```text
NODE_PATH=/home/carase/git/personal/agents-orchestrator/gateway/node_modules \
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_sqlite_repo.test.js \
  tests/gateway/coordination_consumer_sqlite_integration.test.js
```

- **91 passed / 0 failed / 0 skipped**.

Accepted consumer plus unchanged queue/service receive and ACK contracts:

```text
node --experimental-loader '<temporary lock-matched bare-package resolver>' \
  --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_receive.test.js \
  tests/gateway/coordination_queue_ack.test.js \
  tests/gateway/coordination_service_receive.test.js \
  tests/gateway/coordination_service_ack.test.js
```

- **77 passed / 0 failed / 0 skipped**.
- The resolver used only the pre-existing lock-identical dependency tree and
  was removed immediately after the run.
- No Redis instance or service was started or consulted.

Lock-identical ESLint covered both adapters and both directed test files:

- ESLint **10.8.0**;
- candidate/provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
- candidate/provider `gateway/eslint.config.js` SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`;
- result: **passed**.

Applying the unchanged migration twice to one in-memory SQLite database
produced:

```json
{
  "tables": 6,
  "migrationRows": 1,
  "foreignKeyViolations": 0,
  "integrity": "ok"
}
```

Exact structure selection:

```text
PYTHONDONTWRITEBYTECODE=1 pytest -p no:cacheprovider \
  tests/structure/test_project_layout.py \
  tests/structure/test_v5_coordination_docs.py
```

- **11 passed / 0 failed**;
- Python **3.14.4**, pytest **9.0.3**;
- bytecode and pytest cache writes were disabled.

Additional checks:

- `git diff --check` passed;
- an added-line scan found no raw dependency, forged-error, or private canary
  text in production;
- no task-owned temporary loader or test directory remained.

## Frozen identity and scope

- Exact Trial 2 base:
  `8fc8010d3ebf93aa3759f05faef6391a16fbe33a`
- Base tree:
  `1db5d89fbb8466e3a72a0e0bdada17287c857e40`
- RED:
  `abb8ca6f1558923b3dcc40421c15900c3c461c86`
- Technical commit:
  `99cab71f6ce1ab7303f73bd853566873c93178ee`
- Trial 2 technical range:
  `8fc8010d3ebf93aa3759f05faef6391a16fbe33a..99cab71f6ce1ab7303f73bd853566873c93178ee`
- Range identity:
  **2 commits / 3 files / 1,094 insertions / 65 deletions**
- Branch:
  `feat/V5-G-0-02-store`
- Worktree:
  `/tmp/agents-orchestrator-v5-g002-store.8d906A/worktree`

The technical range changes exactly:

- `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js`
- `gateway/src/core/sqlite_quarantine_store.js`
- `tests/gateway/coordination_consumer_sqlite_repo.test.js`

The migration, ADR, SQLite integration test, accepted core, in-memory
repository, `state.js`, packages, locks, configuration, catalog, services,
Redis, MCP, health, workflows, and shared plan sheets are unchanged.

No aggregate npm test, full CI, install, network, live Redis, MCP, KYA,
provider, tmux, agent, service, lifecycle, integration, promotion, release, or
shared-plan mutation was run or performed.

## Remaining limitations

This remains the SQLite store/vault slice:

- `atomicWithBusinessEffect` remains `false`;
- handlers remain responsible for durable `consumeKey` idempotency;
- the adapters are not wired into configuration, services, lifecycle, Redis,
  or health/inventory;
- PostgreSQL parity remains deferred to Project V5 `I/0/05`;
- retention, quotas, and reaping remain outside this slice; and
- the full `G/0/02` exit gate remains open.

## Review focus

- Confirm expiry is derived only for a lease-winning branch and before its
  first write.
- Confirm the recognized-state matrix rejects every impossible
  lease/effect/quarantine/replay/ACK/delivery/recovery combination without
  rejecting legal effect, quarantine, ACK, or replay paths.
- Confirm stored malformed metadata accepts only raw `NULL`, `0`, and `1`.
- Confirm private provenance cannot be forged through either exported error
  constructor.
- Confirm raw SQLite/dependency errors and stored values cannot cross either
  adapter boundary.
- Confirm Trial 2 does not broaden the original SQLite-only claims.

Independent review is requested. No automatic review or integration follows
from this file.

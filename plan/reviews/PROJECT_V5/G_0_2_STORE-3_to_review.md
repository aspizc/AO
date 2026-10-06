# Review Submission — Project V5 G/0/02 STORE (Trial 3)

## Review requested

Independent, evidence-based review is requested for the frozen Trial 3
technical range ending at
`3bee564b44e31587f70ef84aaefdf8eb2d8d7c18`.

This is request-only evidence. It contains no automatic verdict, result,
integration, promotion, release, Redis/service wiring, health projection, or
full-`G/0/02` completion claim.

## Trial 2 finding addressed

Trial 3 is limited to P1-1 in `G_0_2_STORE-2_result.md`.

The Trial 2 adapters stored every legitimate validation, operation, control,
corruption, and mapped-failure object in module-global `WeakSet` instances.
Those sets conferred permanent identity authority. If a caller captured an
error emitted by one public call and a database dependency later threw that
exact object in another call, the adapter could preserve the old object or
reinterpret its old validation identity as corruption instead of mapping the
dependency failure to a fresh fixed failure.

Trial 3 removes all module-global `WeakSet` authority from the two adapters.
Each synchronous public operation now owns private, short-lived provenance
sets. The operation:

1. pushes its own scope;
2. records only errors created during that operation;
3. preserves only identities found in that exact scope; and
4. removes the scope in `finally` before the public call returns or rejects.

Nested synchronous calls receive a distinct scope and restore the outer scope
when they finish. Database-zone validation remains phase-aware: validation
objects created while decoding current database state become the fixed
corruption error, while input validation and winning safe-expiry errors from
the same call retain their documented `TypeError` contracts.

No error receives an observable property or symbol marker. Exported error
constructors confer no authority. A previously emitted object cannot belong to
a later operation scope, so later dependency reuse maps to a new:

- repository `COORDINATION_CONSUMER_STORE_FAILED`; or
- vault `COORDINATION_QUARANTINE_VAULT_FAILED`.

The mapped object does not retain the reused identity or enumerable context
canary. When the old semantics differ from the fixed failure contract, its
code and message are absent too.

## TDD evidence

### RED3

- Commit:
  `5c55eace6b3456d671dca6bbdc4f79a89438e810`
- Subject:
  `test(consumer): reproduce reusable SQLite error authority`
- Tree:
  `a64a40ad9c946bcd5d88a967140c7a042524b506`
- Direct parent:
  `456c6996bb3f11ade1cd94c86440865d055f4198`
- Changed path:
  `tests/gateway/coordination_consumer_sqlite_repo.test.js`

The two directed SQLite files produced:

- **103 tests / 93 passed / exactly 10 expected failures / 0 skipped**;
- all **91** pre-existing focal tests remained green; and
- both new synchronous reentrancy and cleanup guards were already green.

The 10 independent failures captured a legitimate object and injected the
same object through a later database call on the same adapter instance:

- repository validation `TypeError`;
- vault validation `TypeError`;
- repository winning safe-expiry `TypeError`;
- repository `NOT_FOUND`;
- repository `NOT_OWNED`;
- repository `CORRUPT`;
- repository already-mapped `FAILED`;
- vault `CONFLICT`;
- vault `CORRUPT`; and
- vault already-mapped `FAILED`.

Every replay assertion requires a different error identity, the exact fixed
adapter failure, absence of the enumerable context canary, and absence of any
old code or message that differs from that fixed contract. The RED3 commit
changed tests only.

### GREEN3

- Commit:
  `3bee564b44e31587f70ef84aaefdf8eb2d8d7c18`
- Subject:
  `fix(consumer): scope SQLite error provenance per operation`
- Tree:
  `3d2695a913e1dac477da8f8914f1a584b55d690e`
- Direct parent:
  `5c55eace6b3456d671dca6bbdc4f79a89438e810`
- Changed paths:
  - `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js`
  - `gateway/src/core/sqlite_quarantine_store.js`

The exact RED3 test blob was unchanged at GREEN3:

```text
RED3   f63a6ef62563d900f19acbfce2c0820fea972ccd
GREEN3 f63a6ef62563d900f19acbfce2c0820fea972ccd
```

The unchanged SQLite integration test blob is
`296f8f5524c3e315aa36b9e26f62f92134b234f4`.

The directed SQLite command passed **103 / 103**.

## Directed verification

Store, vault, differential-port, reopen, contention, real-consumer,
safe-expiry, corruption, error-boundary, identity-reuse, and reentrancy tests:

```text
NODE_PATH=/home/carase/git/personal/agents-orchestrator/gateway/node_modules \
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_sqlite_repo.test.js \
  tests/gateway/coordination_consumer_sqlite_integration.test.js
```

- **103 passed / 0 failed / 0 skipped**.

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
- The resolver used only a pre-existing lock-identical dependency tree and was
  removed immediately after use.
- No Redis instance or service was started or consulted.

Lock-identical ESLint covered both adapters and both directed test files:

- ESLint **10.8.0**;
- candidate/provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
- candidate/provider `gateway/eslint.config.js` SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`;
- result: **passed with 0 errors and 0 warnings**.

Applying the unchanged migration twice to one in-memory SQLite database
produced:

```json
{
  "coordinationTables": 6,
  "migrationRows": 1,
  "appliedAtUnchanged": true,
  "schemaUnchanged": true,
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
- Python **3.14.4**, pytest **9.0.3**; and
- bytecode and pytest cache writes were disabled.

Additional checks:

- `git diff --check` passed;
- production contains no `WeakSet`, old `TRUSTED_*` registry, observable
  symbol/property authority, test canary, or injected dependency text;
- the exact RED3 and GREEN3 repository test blobs match; and
- no task-owned temporary resolver or test directory remains.

## Frozen identity and scope

- Exact Trial 3 base:
  `456c6996bb3f11ade1cd94c86440865d055f4198`
- Base tree:
  `9bca0f36d03e5ec73c6bbc297a81374cf4c2b2a4`
- RED3:
  `5c55eace6b3456d671dca6bbdc4f79a89438e810`
- Technical commit:
  `3bee564b44e31587f70ef84aaefdf8eb2d8d7c18`
- Trial 3 technical range:
  `456c6996bb3f11ade1cd94c86440865d055f4198..3bee564b44e31587f70ef84aaefdf8eb2d8d7c18`
- Range identity:
  **2 commits / 3 files / 448 insertions / 34 deletions**
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
provider, tmux, agent, subagent, service, lifecycle, integration, promotion,
release, or shared-plan mutation was run or performed.

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

- Confirm no emitted error identity has authority after its public call ends.
- Confirm nested synchronous operations cannot contaminate or consume an
  outer operation's provenance.
- Confirm every operation scope is removed in `finally` on success and error.
- Confirm current-call input validation, winning safe-expiry, `NOT_FOUND`,
  `CONFLICT`, `CORRUPT`, and ordinary control-result contracts remain exact.
- Confirm later dependency reuse always yields a fresh fixed failure without
  retained identity or context, and without non-fixed old semantics.
- Confirm exported constructors and observable object properties confer no
  authority.
- Confirm Trial 3 does not broaden the accepted SQLite-only claims.

Independent review is requested. No automatic review or integration follows
from this file.

# Independent Review Result — Project V5 G/0/02 STORE (Trial 3)

## Verdict

**KO** for technical candidate
`3bee564b44e31587f70ef84aaefdf8eb2d8d7c18`.

- P0 findings: **0**
- P1 findings: **1**
- P2 findings: **0**

Trial 3 closes the observable cross-operation identity replay from Trial 2.
All ten submitted error-reuse cases now produce a fresh fixed adapter failure,
the synchronous nesting guards pass, and ordinary and non-`Error` dependency
throws also collapse to the fixed failure contracts.

The candidate cannot receive an independent OK because its provenance lookup
is still global. It replaces the permanent module-global `WeakSet` registries
with two mutable module-global stacks. Every validation, operation, control,
and corruption error obtains authority by consulting the current top of that
process-wide stack. The explicit Trial 3 gate requires authority to be owned
and passed by the synchronous operation itself, with no global registry or
stack.

This verdict remains limited to the SQLite STORE slice. It does not change the
accepted consumer core, integrate or promote this candidate, mark the full
`G/0/02` sheet complete, or claim Redis/service wiring, health projection,
PostgreSQL support, business-effect atomicity, or release readiness.

## Reviewer identity and execution profile

- Role: independent Trial 3 reviewer
- Requested model profile: **GPT-5.6 Sol**
- Requested reasoning profile: **ultra**
- Requested execution profile: **Priority/Fast**
- Review date: **2026-07-27**

No service-tier telemetry was exposed to this review. The execution profile
above records the requested profile and is not a claimed runtime measurement.

The review used no delegation, agents, subagents, tmux, background process,
service, Redis, MCP, KYA, or network access.

## Frozen identity and scope

- Branch: `feat/V5-G-0-02-store`
- Exact Trial 3 base / Trial 2 KO:
  `456c6996bb3f11ade1cd94c86440865d055f4198`
- Base tree:
  `9bca0f36d03e5ec73c6bbc297a81374cf4c2b2a4`
- Trial 3 RED:
  `5c55eace6b3456d671dca6bbdc4f79a89438e810`
- RED tree:
  `a64a40ad9c946bcd5d88a967140c7a042524b506`
- Trial 3 technical candidate:
  `3bee564b44e31587f70ef84aaefdf8eb2d8d7c18`
- Technical tree:
  `3d2695a913e1dac477da8f8914f1a584b55d690e`
- Request-only HEAD at intake:
  `9b74e0237a6e78764476e4d8f3a9e2f6a272ec75`
- Request tree:
  `aa2a8a864e2e2f6fe56fa864377793980889a207`
- Exact technical range:
  `456c6996bb3f11ade1cd94c86440865d055f4198..3bee564b44e31587f70ef84aaefdf8eb2d8d7c18`
- Review worktree:
  `/tmp/agents-orchestrator-v5-g002-store.8d906A/worktree`

Parentage is exact and linear. RED3 is the direct child of the Trial 2 KO, the
technical candidate is the direct child of RED3, and the Trial 3 request is
the direct child of the technical candidate. The worktree was clean at intake.

The technical range contains exactly **2 commits / 3 files / 448 insertions /
34 deletions**:

```text
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
gateway/src/core/sqlite_quarantine_store.js
tests/gateway/coordination_consumer_sqlite_repo.test.js
```

RED3 changes only the repository test. GREEN3 changes only the two adapters.
The repository test blob is unchanged from RED3 to GREEN3:

```text
f63a6ef62563d900f19acbfce2c0820fea972ccd
```

The unchanged integration-test blob is:

```text
296f8f5524c3e315aa36b9e26f62f92134b234f4
```

There is no Trial 3 technical change to migration 002, the ADR, SQLite
integration tests, accepted consumer, in-memory repository, `state.js`,
packages, locks, configuration, catalog, services, Redis, MCP, health,
workflows, or shared plan sheets.

## Finding

### P1-1 — Provenance is still selected through mutable module-global stacks

The permanent `WeakSet` memberships from Trial 2 are gone, but GREEN3 adds:

- `STORE_OPERATION_SCOPES` at
  `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:30`;
- `VAULT_OPERATION_SCOPES` at
  `gateway/src/core/sqlite_quarantine_store.js:5`.

These arrays are module-global mutable registries. The repository's
`currentStoreOperationScope()` and `registerStoreError()` select the current
authority from the global top at repository `:49-55`; the decoder consults
that same global at `:564` and `:590`; and the read/write database zones do so
at `:881-900`. `safely()` publishes each supposedly local scope to the global
array at `:857-878`.

The vault has the same shape: global selection and registration at `:22-28`,
global publication/removal at `:192-211`, and database-zone lookup at
`:214-235`.

The sets inside each stack entry are short-lived, and the submitted
`finally` cleanup is effective on the directed synchronous paths. That closes
the Trial 2 behavior in which an emitted identity remained authoritative
after the call. It does not satisfy the stronger Trial 3 boundary: authority
is still discovered from process-wide mutable ambient state rather than
being lexically owned and passed by the exact synchronous operation.

The issue is directly reproducible without a behavioral race:

```text
rg -n \
  'const (STORE|VAULT)_OPERATION_SCOPES = \[\]|\
(STORE|VAULT)_OPERATION_SCOPES\.(push|splice)|\
current(Store|Vault)OperationScope' \
  gateway/src/core/repositories/sqlite_coordination_consumer_repo.js \
  gateway/src/core/sqlite_quarantine_store.js
```

The command reports both module-global arrays and every authority lookup,
push, and removal listed above. This is the exact prohibited global form, not
an observable property, symbol, exported-class brand, or stale `WeakSet`
membership.

Required correction:

1. Remove both module-scope provenance stacks and all `current*Scope()`
   ambient lookups.
2. Create the provenance scope inside the exact public operation and pass it
   lexically to validation, decoder, control-error, and database-zone code.
   An operation-local closure or explicit scope parameter is acceptable.
3. Preserve the current phase rule: current-call input validation and winning
   expiry errors remain exact; decoder validation becomes fixed corruption;
   current-call static control/corruption errors remain exact; every foreign
   dependency throw becomes a fresh fixed failure.
4. Keep cleanup in `finally` if the chosen local design retains any disposable
   resource, but do not publish authority in a module-level collection.
5. Add a structural regression that rejects mutable module-scope provenance
   registries, plus cross-instance nested/reentrant behavior and cleanup
   guards.

## Trial 2 finding disposition

### P1-1 emitted cross-operation authority — behavior closed

The exact RED3 archive independently produced:

- **103 tests / 93 passed / 10 failed / 0 skipped**
- exit **1**

The ten failures are exactly the new later-operation identity-reuse cases.
At GREEN3 the same directed files pass **103 / 103**. They cover:

- repository and vault validation `TypeError`;
- repository winning safe-expiry `TypeError`;
- repository `NOT_FOUND`, `NOT_OWNED`, `CORRUPT`, and mapped `FAILED`;
- vault `CONFLICT`, `CORRUPT`, and mapped `FAILED`; and
- synchronous repository and vault nesting/cleanup guards.

Each later dependency reuse returns a different error object with only the
fixed `*_FAILED` code/message and without the old enumerable context canary,
code, or differing message. Freshly constructed exported error classes remain
untrusted. No stale identity authority after public-call completion was
reproduced.

The remaining P1 is therefore not a continuation of the old permanent
membership behavior. It is the explicit no-global-authority conformance
failure described above.

## Independent adversarial verification

### Error boundary and thrown-value matrix

An independent in-memory dependency probe threw each of these values through
both adapters:

- ordinary `Error`;
- `RangeError`;
- `AggregateError`;
- `DOMException` with `AbortError`;
- a string;
- a number;
- `null`;
- `undefined`; and
- a frozen control-like object carrying a code and context canary.

All nine repository cases became a fresh:

```text
COORDINATION_CONSUMER_STORE_FAILED
coordination consumer store operation failed safely
```

All nine vault cases became a fresh:

```text
COORDINATION_QUARANTINE_VAULT_FAILED
coordination quarantine vault operation failed safely
```

No result retained the thrown identity. This confirms ordinary exceptions and
JavaScript equivalents of non-ordinary/control throws are closed on the
tested synchronous dependency boundary.

### SQLite store, vault, fencing, reopen, overflow, ACK, and replay

The focal suite covers and passes:

- exact repository-port projection across every transition;
- immediate-transaction mutation and deferred transactional reads;
- two-connection processing and replay winner election;
- exact owner plus monotonic claim-token/replay-token fencing;
- stale attempt, effect, quarantine, block, release, replay-commit, and
  replay-failure rejection;
- private bounded recovery history across reopen;
- effect and quarantine receipt durability before ACK;
- ACK-only redelivery after reopen;
- dangling vault-write convergence;
- authorized replay persistence and deduplication;
- non-winning safe-expiry parity;
- winning safe-expiry rollback with the durable snapshot unchanged;
- exhaustive recognized-state corruption rejection;
- exact stored metadata boolean decoding;
- body-free public receipt projections; and
- vault absent-body/empty-string, exact-byte idempotency, exact-locator, and
  corruption contracts.

No separate defect was reproduced in these areas.

### Migration 002

The migration blob is identical at the Trial 3 base, RED3, and GREEN3:

```text
1c2306c2b31c00eb905ef17745c35197d3049aab
```

Applying that exact migration twice to one in-memory SQLite database produced:

```json
{
  "coordinationTables": 6,
  "migrationRows": 1,
  "appliedAtUnchanged": true,
  "schemaUnchanged": true,
  "foreignKeyViolations": 0,
  "integrity": "ok",
  "receiptHasBodyLocatorJson": false
}
```

## Required verification

Runtime and lock identity:

- Node **22.22.1**
- `better-sqlite3` **11.10.0**
- ESLint **10.8.0**
- candidate/provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`
- candidate/provider ESLint configuration SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`

No install or network command was used. Dependencies came from the pre-existing
lock-identical provider at
`/tmp/agents-orchestrator-v5-c100-rebaseline.5s8B2b/worktree/gateway/node_modules`.

### Exact RED3 replay

An isolated `git archive` of
`5c55eace6b3456d671dca6bbdc4f79a89438e810` ran:

```text
NODE_PATH=<pre-existing lock-identical gateway/node_modules> \
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_sqlite_repo.test.js \
  tests/gateway/coordination_consumer_sqlite_integration.test.js
```

Result: **103 tests / 93 passed / 10 failed / 0 skipped**, exit **1**.
The task-owned archive directory was deleted after the run.

### GREEN3 focal

The same command at the request HEAD produced:

- **103 passed / 0 failed / 0 skipped**
- exit **0**

### Accepted consumer and queue/service regression

```text
node --experimental-loader '<in-memory lock-matched bare-package resolver>' \
  --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_receive.test.js \
  tests/gateway/coordination_queue_ack.test.js \
  tests/gateway/coordination_service_receive.test.js \
  tests/gateway/coordination_service_ack.test.js
```

Result: **77 passed / 0 failed / 0 skipped**, exit **0**. The resolver was a
`data:` URL and created no file. No Redis instance or service was started or
consulted.

### Lock-exact ESLint

ESLint covered both adapters and both directed SQLite test files with the
lock-identical provider configuration:

- **0 errors**
- **0 warnings**
- exit **0**

### Structure

```text
PYTHONDONTWRITEBYTECODE=1 \
/home/carase/git/personal/agents-orchestrator/.venv/bin/pytest \
  -p no:cacheprovider \
  tests/structure/test_project_layout.py \
  tests/structure/test_v5_coordination_docs.py
```

Result: **11 passed / 0 failed**, with Python **3.14.4** and pytest **9.0.3**.
Bytecode and pytest cache writes were disabled.

### Integrity and residue

- `git diff --check` passed for the exact technical range.
- `git diff --check` passed from the technical candidate to the request.
- The old `WeakSet`, `TRUSTED_*`, and symbol-marker forms are absent from both
  adapters.
- The exact module-global-stack scan reproduces P1-1.
- No test/cache/temporary residue remained before this result was written.

No aggregate npm suite, full CI, live/shared Redis, MCP, KYA, provider
execution, service, lifecycle, configuration, health, PostgreSQL, integration,
promotion, release, tmux, agent, subagent, install, or network command was
run.

## Remaining dependency-gated scope and limitations

This remains the SQLite store/vault slice:

- the repository is durable but intentionally not atomic with an arbitrary
  business store;
- handlers remain responsible for durable `consumeKey` idempotency;
- the adapters are not wired into configuration, services, lifecycle, Redis,
  or health/inventory;
- no live Redis crash/reclaim or service restart is claimed;
- PostgreSQL parity remains deferred to Project V5 `I/0/05`;
- retention, quotas, and reaping remain outside this slice; and
- the full `G/0/02` acceptance and exit gates remain open.

## Final conclusion

**KO.** Trial 3 successfully revokes emitted error identity after each public
call, preserves legitimate same-call signals on the directed paths, maps
ordinary and control-like dependency throws safely, and leaves the established
SQLite durability, fencing, reopen, ACK/replay, overflow rollback, vault, and
migration evidence green. It still derives provenance from mutable
module-global scope stacks. The next trial must make provenance genuinely
operation-local and lexical, with no global registry or ambient current-scope
lookup, before the STORE slice can receive an independent OK.

# Independent Review — V5 C/1/00 Trial 1

## Verdict

**KO**

The candidate correctly centralizes the normal lifecycle paths and passes all
declared gates, but it does not yet satisfy the submitted failure-settlement
claim or the published SQLite/PostgreSQL version contract.

This review was performed independently with **GPT-5.6 Sol**, reasoning
**ultra**, and **Fast/Priority** service.

## Candidate reviewed

- Branch: `feat/V5-C-1-00-lifecycle`.
- Review-request commit:
  `adb460cc878c5767588b5f9b77102fffe10d4c87`.
- Technical commit:
  `8c5d1f51df5aa71d93699e01c2b437605699e95f`.
- Technical tree:
  `9b31c37d23c1d42e7fca54e6e6575f208d256c63`.
- Base commit:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- The requested path `plan/PROJECT_V5/C/1/00/TASK.md` does not exist in this
  tree. The canonical versioned sheet `plan/PROJECT_V5/C/1/00.md` was read
  completely instead, together with the skill, plan/stage instructions, and
  Trial 1 request.

## Blocking findings

### 1. A resolved but invalid adapter result bypasses failure settlement

`gateway/src/services/agent_service.js:257`–`283` catches only errors thrown
while invoking or awaiting the adapter. Result interpretation and successful
settlement happen later at lines 285–296, outside that guarded path. Therefore
an adapter that resolves without the required result object throws a raw
`TypeError` while reading `result.tmuxTarget` and never calls the atomic failed
settlement.

Independent disposable-SQLite probe:

```text
adapter.spawn() => undefined
error = TypeError: Cannot read properties of undefined (reading 'tmuxTarget')
sessionStatus = starting, sessionVersion = 0
taskStatus = starting, taskVersion = 1
```

The adapter was invoked only after the durable reservation, so the probe
specifically exercises the post-reservation failure window. It contradicts
the submission's claim that launch failure atomically settles the session to
`error` and task to `pending`, and it leaves an exact retry permanently at
`LIFECYCLE_COMMAND_IN_PROGRESS`.

Required correction:

- validate delegate/spawn results inside the compensated launch path;
- convert any adapter-result contract failure into one atomic
  `starting -> error` / `starting -> pending` settlement;
- add RED/GREEN tests for invalid resolved results for both one-shot and
  persistent launches, including an exact retry proving no second launch.

### 2. PostgreSQL cannot represent the lifecycle version range published by the reducer and schemas

The reducer accepts every non-negative JavaScript safe integer and can produce
`2,147,483,648` from `2,147,483,647`
(`gateway/src/core/lifecycle.js:97`–`115`). All three persisted entity schemas
publish a maximum of `9,007,199,254,740,991`
(`schemas/orchestration-session.schema.json:13`,
`schemas/task.schema.json:15`, and
`schemas/agent-session.schema.json:25`).

PostgreSQL instead declares the three entity version columns as 32-bit
`INTEGER` (`gateway/migrations/postgres/002_lifecycle.sql:1`–`8`), repeats
`INTEGER` for command/evidence versions at lines 55–56 and 69–70, and uses
`INTEGER` parameters/locals in all three lifecycle functions beginning at
lines 82, 209, and 310. PostgreSQL `INTEGER` stops at `2,147,483,647`.

Independent boundary probe confirmed that the reducer accepts version
`2,147,483,647` and returns `2,147,483,648`, while static migration inspection
confirmed `INTEGER` for every entity version column. SQLite can persist that
next value; PostgreSQL cannot. The fake-PostgreSQL executor does not model
PostgreSQL numeric widths, so the green contract suite cannot expose this
divergence.

Required correction:

- either use `BIGINT` consistently for PostgreSQL entity, command, evidence,
  function parameter, and local version fields while retaining the safe
  integer guards; or publish and enforce one smaller common maximum across the
  reducer, catalog, schemas, SQLite, and PostgreSQL;
- add an explicit backend-contract boundary test so fake PostgreSQL coverage
  cannot silently broaden the real database type.

## Verified behavior

- The frozen reducer table covers orchestration, task, and agent-session
  states; invalid, out-of-order, cross-entity, and terminal-reopen transitions
  fail closed.
- Normal SQLite reservation and settlement are atomic. CAS denial rolls back
  the bundle; exact retries do not duplicate transition evidence; changed
  fingerprints conflict.
- PostgreSQL functions use row/advisory locks and one-statement atomic
  reservation/settlement. Their normal-path fake-backend contract agrees with
  SQLite, subject to Finding 2.
- `starting` is durable before adapter invocation.
- Successful one-shot delegation settles session `closed` and task `running`;
  successful persistent spawn settles both to `running`; closing/killing a
  session does not complete its task.
- Explicit wrong-trace/task/session operations tested in scope fail closed.
- Launch fingerprints retain a SHA-256 prompt digest rather than prompt
  content.
- The canonical catalog digest and lifecycle request projections are current.
- `gateway/src/tools/message.js` remains byte-identical to the reviewed
  baseline (`sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`);
  the technical diff does not modify the legacy message store, audit
  publisher, or `agents:events` contract.

## Verification

- Focused lifecycle/schema/migration/service/tool suite:
  **115 total, 106 passed, 9 exact live-PostgreSQL skips, 0 failed**.
- Offline repository gate with an existing locked tool environment:
  **1,122 total, 1,110 passed, 12 exact allowlisted infrastructure skips,
  0 failed**.
- `git diff --check
  11d5245ef312dd02ad7cd59d66ab0b9cce181071..8c5d1f51df5aa71d93699e01c2b437605699e95f`:
  passed.
- Redacted `gitleaks detect --pipe` over the technical diff:
  passed, no leaks.
- Independent invalid-adapter-result probe:
  failed the required lifecycle outcome as documented in Finding 1.
- Independent safe-integer/PostgreSQL-type boundary probe:
  exposed the contract divergence documented in Finding 2.

No network, shared PostgreSQL, shared Redis, shared MCP process, or real agent
provider was used. The repository gate used only its disposable local stdio
MCP lanes; live PostgreSQL, Redis, Temporal/Gateway integration, and real-agent
lanes remained disabled or allowlisted as infrastructure unavailable.

## Trial disposition

Trial 1 is **KO**. Correct both blocking findings with TDD and submit Trial 2
as a new append-only implementation commit and review request. This verdict
does not claim integration, promotion, or release and does not change the task
status.

# Independent Review — V5 C/1/00 Trial 2

## Verdict

**KO**

Trial 2 closes both blockers reported in Trial 1: invalid resolved adapter
results now use the compensated settlement path, and PostgreSQL lifecycle
versions are consistently `BIGINT` with JavaScript safe-integer contract
coverage. However, the submitted Trial 2 acceptance claim also requires a
timed-out `spawn` to reach that settlement. A pending spawn operation is not
bounded by the configured agent timeout and can still leave both entities
durably orphaned in `starting`.

This review was performed independently with **GPT-5.6 Sol**, reasoning
**ultra**, and **Fast/Priority** service.

## Candidate reviewed

- Branch: `feat/V5-C-1-00-lifecycle`.
- Review-request commit:
  `93c264c932db7395af198989c5c95042ca471a7b`.
- Review-request tree:
  `e58ca169f1786e33eff180c96c5f9f1d162e3643`.
- Technical commit:
  `6bea492069d5cb4a49e6b3880eb53ceefad4c6e9`.
- Technical tree:
  `8f2bfe0865d175e6b62d3d09a5a483a43110c225`.
- Trial 2 base:
  `e7ae6438942cb642714f1faa5a742383d7acf636`.
- Cumulative technical base:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- The implementation commit is the direct child of the Trial 1 verdict, and
  the request commit is the direct child of the implementation commit.

## Blocking finding

### A timed-out persistent spawn never reaches failure settlement

The Trial 2 request explicitly asks the reviewer to prove that every
"timed-out ... delegate/spawn result" reaches exactly one failed settlement
and cannot remain in `starting`
(`plan/PROJECT_V5/reviews/C_1_0-2_to_review.md:197`–`199`).

`launchAgent` applies `withTimeout` only when `mode === "delegate"`.
The spawn branch directly awaits the adapter operation without a bound
(`gateway/src/services/agent_service.js:304`–`306`). If that promise never
settles, execution never reaches either the catch or the single atomic
settlement at lines 315–328.

An independent disposable-SQLite probe configured `agentTimeoutMs=20`, used
an adapter whose `spawn()` returns a pending promise, waited 100 ms, and then
made an exact retry:

```text
firstObserved = still-pending-after-100ms
sessionStatus = starting, sessionVersion = 0
taskStatus = starting, taskVersion = 1
retryCode = LIFECYCLE_COMMAND_IN_PROGRESS
adapterLaunches = 1
sessionLaunchFailedEvidence = 0
taskLaunchFailedEvidence = 0
errorAuditEvents = 0
```

The durable reserve-before-launch behavior makes this a post-reservation
orphan, not a pre-launch validation case. The exact retry correctly avoids a
second launch, but it can only report an indefinitely in-progress command
because no timeout enters settlement.

Required correction:

- bound persistent spawn launch completion under the published timeout
  contract, including any blocking adapter launch primitive;
- route a spawn timeout through exactly one atomic
  `session: starting -> error` / `task: starting -> pending` settlement and
  one service error audit;
- add a RED/GREEN persistent-spawn timeout test that proves the durable
  outcome, evidence cardinality, and exact-retry behavior.

## Trial 1 blocker closure

### Invalid resolved launch results — closed

- Delegate and spawn results are validated inside the guarded launch path
  before successful settlement.
- Independent tests cover `undefined`, malformed, and invalid results for both
  modes. Each first call leaves `session=error, version=1` and
  `task=pending, version=2`, records one `launch_failed` transition per
  entity and one error audit, and emits no misleading `SESSION_STARTED` or
  `SESSION_CLOSED` event.
- Exact retries return `LIFECYCLE_LAUNCH_FAILED` without relaunching or
  duplicating evidence/audit.
- Rejections, delegate timeouts, and nonzero delegate exits also converge on
  the single settlement call. The remaining gap is specifically the unbounded
  spawn branch documented above.

### PostgreSQL lifecycle width — closed

- All three PostgreSQL entity-version columns, lifecycle command/evidence
  versions, lifecycle function parameters, and local version variables are
  `BIGINT`; no lifecycle version declaration remains 32-bit.
- The fake PostgreSQL executor rejects non-safe-integer lifecycle values
  instead of silently broadening the JavaScript contract.
- SQLite and fake-PostgreSQL boundary tests transition from
  `Number.MAX_SAFE_INTEGER - 1` through `Number.MAX_SAFE_INTEGER`.
- Live PostgreSQL was intentionally not used in this independent review.
  Static SQL inspection plus the offline PostgreSQL contract suite verified
  the submitted migration/function surface.

## Other verified behavior

- Reservation and settlement remain atomic bundles; CAS failures roll back,
  exact retries are idempotent, and changed fingerprints conflict.
- Reducer ownership remains authoritative, invalid/out-of-order transitions
  fail closed, and terminal entities cannot reopen.
- Cross-trace and cross-task/session access fails closed.
- One-shot success closes only its session while keeping its task
  non-terminal; persistent success settles task and session to `running`.
- Reserve-before-launch ordering remains durable.
- Catalog/schema/migration checks pass and the published lifecycle
  safe-integer limits remain aligned with SQLite and the fake PostgreSQL
  contract.
- `gateway/src/tools/message.js` remains byte-identical to the reviewed
  baseline
  (`sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`).
  The correction changes neither `message.*` nor the audit publisher,
  coordination transport, `agents:events`, policy, or dependency manifests.

## Independent verification

- Focused lifecycle/repository/PostgreSQL-contract/migration/service/tool
  suite: **118 total, 109 passed, 9 exact live-PostgreSQL skips, 0 failed**.
- Broad offline Gateway suite, excluding live-integration files and the two
  MCP-server bootstrap/error files: **755 total, 746 passed, 9 exact
  live-PostgreSQL skips, 0 failed**.
- Gateway ESLint: passed.
- `git diff --check` over both
  `e7ae6438942cb642714f1faa5a742383d7acf636..6bea492069d5cb4a49e6b3880eb53ceefad4c6e9`
  and
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071..6bea492069d5cb4a49e6b3880eb53ceefad4c6e9`:
  passed.
- Redacted `gitleaks detect --pipe` over both ranges: passed, no leaks.
- Independent pending-spawn timeout probe: failed the requested durable
  settlement outcome as documented in the blocking finding.

No network, external MCP process, Redis, live PostgreSQL, or real agent
provider was used. All probe state was disposable local SQLite state and was
removed after execution.

## Trial disposition

Trial 2 is **KO**. Preserve the two validated Trial 1 corrections and address
only the bounded-spawn settlement gap with TDD in a new append-only trial.
This verdict does not integrate, promote, release, or change the task status.

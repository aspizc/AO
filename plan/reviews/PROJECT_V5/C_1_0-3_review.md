# Independent Review — V5 C/1/00 Trial 3

## Verdict

**KO**

Trial 3 correctly bounds a pending asynchronous spawn promise and preserves
all previously validated lifecycle behavior. It does not yet bound the full
persistent-launch handshake, because the adapter is invoked before the timer
is created and every concrete supervised adapter performs unbounded
synchronous `tmux` calls in that pre-timer interval. A blocked real launch can
therefore still leave the durable reservation in `starting`.

This review was performed independently with **GPT-5.6 Sol**, reasoning
**ultra**, and **Fast/Priority** service.

## Candidate reviewed

- Branch: `feat/V5-C-1-00-lifecycle`.
- Original technical base:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- Trial 1 technical commit:
  `8c5d1f51df5aa71d93699e01c2b437605699e95f`.
- Trial 2 technical commit:
  `6bea492069d5cb4a49e6b3880eb53ceefad4c6e9`.
- Trial 2 verdict / Trial 3 correction base:
  `5d95324b3639da759417bfee6289b754fa42a566`.
- Trial 3 technical commit:
  `855af0a8c331e1109662ffd631bba2196a39d397`.
- Trial 3 technical tree:
  `72d5292d716578ef64e93961a116e81f714fe9ca`.
- Trial 3 request commit:
  `6a3b1397088090f9dfff02a1be955206b75f06dd`.
- Trial 3 request tree:
  `22c3b6aaf506ce8cd529bff4c1f67592b852025e`.
- The technical commit is the direct child of the Trial 2 verdict, and the
  request is the direct child of the technical commit.

## Blocking finding

### The timeout starts after the concrete adapter's blocking launch work

Trial 2 required persistent spawn completion to be bounded under the
published timeout contract, explicitly "including any blocking adapter launch
primitive"
(`plan/PROJECT_V5/reviews/C_1_0-2_review.md:71`–`79`).

Trial 3 invokes `adapter[mode](...)` first and only passes the returned
operation to `withTimeout` afterward
(`gateway/src/services/agent_service.js:293`–`308`). That correctly protects
a promise which is pending after the call returns, but a JavaScript timer
cannot preempt work already executing synchronously inside the adapter.

This is not only a hostile mock scenario:

- `tmuxSync` calls `spawnSync` without a timeout
  (`gateway/src/adapters/tmux_client.js:27`–`29`);
- Codex performs two such calls during spawn
  (`gateway/src/adapters/codex_adapter.js:311`–`314`);
- Claude does the same
  (`gateway/src/adapters/claude_adapter.js:217`–`220`); and
- Gemini uses the same synchronous launch path
  (`gateway/src/adapters/gemini_adapter.js:142`–`147`).

An independent disposable-SQLite probe configured `agentTimeoutMs=20` and
used an async adapter whose synchronous pre-return section blocked for 100 ms,
then returned a valid spawn result:

```text
configuredTimeoutMs = 20
serviceCallReturnedAfterMs = 103
launchCompletedAfterMs = 104
sessionStatus = running
taskStatus = running
```

The configured deadline was exceeded more than fivefold, yet no `TIMEOUT`
occurred because the timer did not exist during the blocking section. A
primitive which never returns would leave the already committed session/task
reservation in `starting` indefinitely and would never reach the catch or
atomic settlement.

Required correction:

- make each concrete persistent-launch primitive itself bounded by the
  effective `agentTimeoutMs`, or move the complete handshake to an execution
  mechanism which can actually be interrupted at that deadline;
- retain the service-level promise timeout for genuinely asynchronous
  adapters;
- add RED/GREEN coverage in which the pre-promise/concrete adapter launch
  exceeds the configured bound and prove `TIMEOUT`, one atomic failed
  settlement, exact evidence/audit cardinality, and no relaunch on retry.

## Verified corrections and invariants

### Asynchronous timeout and late settlement behavior

- A pending spawn promise now rejects with `TIMEOUT` and atomically leaves
  `session=error` and `task=pending`.
- Independent late-resolution and late-rejection probes each produced exactly
  one `launch_failed` evidence row per entity, one service error audit, zero
  misleading `SESSION_STARTED`/`SESSION_CLOSED` events, and zero
  `unhandledRejection` events.
- In both late cases, an exact retry returned
  `LIFECYCLE_LAUNCH_FAILED`, adapter launch count remained one, and no
  evidence or audit was duplicated.
- A valid spawn result clears the handshake timer. After five configured
  timeout periods, the session and task remained `running`, `view` still
  succeeded, and no error/close audit appeared. Trial 3 therefore introduces
  no persistent lifetime or reasoning deadline.

### Prior Trial 1 and Trial 2 blockers

- `undefined`, malformed, and invalid resolved delegate/spawn results are
  validated inside the compensated path. They settle once to
  `session=error` / `task=pending`, leave no entity in `starting`, and exact
  retries do not relaunch.
- PostgreSQL entity versions, lifecycle command/evidence versions, transition
  identity, function parameters, and local lifecycle version variables remain
  `BIGINT`. SQLite and fake-PostgreSQL contracts retain
  `Number.MAX_SAFE_INTEGER` exactly.

### Lifecycle and compatibility

- Reserve and settlement operations remain atomic task/session bundles in
  SQLite and the PostgreSQL function contract.
- Reducer ownership, optimistic CAS, exact idempotency, conflicting-retry
  denial, terminal monotonicity, reserve-before-launch, cross-scope denial,
  and one-shot versus persistent semantics remain intact.
- Trial 3 changes no policy, dependency, adapter, supervisor, message, audit,
  or coordination implementation.
- `gateway/src/tools/message.js` remains byte-identical to its reviewed
  baseline
  (`sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`).
  No cumulative technical diff touches the legacy `message.*` persistence
  path, audit publisher, coordination transport, or `agents:events`
  contract.

## Independent verification

- Focused lifecycle/error/repository/PostgreSQL-contract/migration/service/tool
  bundle: **123 total, 114 passed, 9 exact live-PostgreSQL skips, 0 failed**.
- Structure suite: **222 passed, 0 failed**.
- Broad offline Gateway suite, excluding live integration, MCP server
  bootstrap/error, and `tmux_client` execution: **754 total, 745 passed,
  9 exact live-PostgreSQL skips, 0 failed**.
- Gateway ESLint: passed.
- `git diff --check` passed over both
  `5d95324b3639da759417bfee6289b754fa42a566..855af0a8c331e1109662ffd631bba2196a39d397`
  and
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071..855af0a8c331e1109662ffd631bba2196a39d397`.
- Redacted `gitleaks detect --pipe` passed over both ranges with no leaks.
- The independent finite synchronous-handshake probe failed the published
  timeout bound as documented above.

No network, MCP server, Redis, live PostgreSQL, real agent provider, agent
spawn, or `tmux` process was used.

## Trial disposition

Trial 3 is **KO**. C/1/00 cannot close yet. Preserve the validated asynchronous
timeout, late-result handling, lifetime separation, invalid-result
compensation, PostgreSQL `BIGINT`, atomicity, idempotency, and compatibility
work; correct only the unbounded concrete launch interval in a new append-only
trial. This verdict does not integrate, promote, release, or change task
status.

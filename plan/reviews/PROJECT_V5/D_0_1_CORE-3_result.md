# Independent Review Result — Project V5 D/0/01 CORE (Trial 3)

## Verdict

**KO**

Trial 3 closes the synchronous duplicate-event cases added to the focal suite
and disposes the covered transfer, transcript, and control-writer listeners
before public settlement. The EventEmitter boundary is still shorter than its
stated contract in two deterministic deferred orders:

- a transcript terminal event followed by a duplicate error queued with
  `process.nextTick`; and
- a detached late write callback followed by a duplicate error queued with
  `queueMicrotask`.

In both cases the guard is removed before the queued duplicate runs, so the
duplicate becomes an unhandled EventEmitter `error` and the Node process exits
with status 1. These are P1 reliability failures and prevent an independent OK.

## Reviewer profile

- Requested model profile: **GPT-5.6 Sol**
- Requested reasoning profile: **ultra**
- Requested service profile: **Priority/Fast**
- Attestation limit: this isolated environment exposed no external model,
  reasoning, or service-tier telemetry. The values above are the requested
  review profile, not externally attested runtime telemetry.
- Connectivity: no network, MCP, Redis, KYA, provider, agent, tmux, or shared
  service was used.

## Frozen identity and scope

- Trial 3 base / Trial 2 result-only KO:
  `5634dbd28b5feab232f31c774799d053da64cde5`
- Base tree: `ad3db9860ba324939aafd465111aa2da7d548e6e`
- Trial 3 technical commit:
  `7cd6715a9fddef7b32487b5aad0a145b152942dc`
- Technical tree:
  `710fabbbd6b4614363499073e89f8e28fe13a626`
- Trial 3 request-only commit / review HEAD:
  `a127628192b7a5d08a6c0c287e3b6ee8dea2d97e`
- Request tree:
  `f9ad5be192ab749e5b018c4516c0b7cbdf120ebc`
- Branch: `feat/V5-D-0-01-core`
- Review worktree:
  `/tmp/agents-orchestrator-v5-d001-core.GI3J4P/worktree`

Parentage and scope checks passed:

- the technical commit is the direct child of the exact Trial 2 KO result;
- the request-only commit is the direct child of the technical commit;
- the technical range contains one commit and exactly 5 files, 610 insertions,
  and 113 deletions;
- the five technical paths are the task ADR, standalone supervisor, two
  dedicated test files, and the dedicated event-race fixture;
- the request-only commit adds exactly
  `plan/reviews/PROJECT_V5/D_0_1_CORE-3_to_review.md`;
- the technical range does not touch adapters/services outside the standalone
  supervisor, profiles, policies, catalogs, packages/locks, shared manifests,
  CI, lifecycle composition, tmux, MCP, Redis, KYA, providers, or integration
  surfaces; and
- the worktree was clean at intake.

The task skill, task/project READMEs, task sheet, task-owned ADR, Trial 2
result, Trial 3 request, complete technical diff, supervisor/helper source,
and dedicated tests/fixtures were read. Prior audit reports were not read.

## Findings

### P1 — Transcript disposal runs before a later same-boundary `nextTick` error

`parseTranscript()` keeps a persistent error guard after the first logical
terminal event, but schedules its end handler with `process.nextTick`. When
child exit and both output gates are already complete, that end handler is the
last gate: it immediately reaches centralized finalization, which disposes the
transcript error guard. A duplicate error queued with `process.nextTick`
immediately after the first synchronous terminal emission is behind the end
handler in the same queue and therefore runs without a listener.

Evidence:

- `gateway/src/adapters/process_supervisor.js:668` locks the transcript's first
  terminal transition.
- `gateway/src/adapters/process_supervisor.js:671` removes data/end/close
  listeners while intentionally retaining the error guard.
- `gateway/src/adapters/process_supervisor.js:676` queues the transcript end
  handler with `process.nextTick`.
- `gateway/src/adapters/process_supervisor.js:709` defines transcript disposal;
  line 713 removes the retained error guard.
- `gateway/src/adapters/process_supervisor.js:1033` finalizes as soon as the
  three public terminal gates are true; lines 1042–1044 dispose boundaries
  before settling completion.

A bounded injected-process probe used no OS child and installed no
`uncaughtException` handler or try/catch around event emissions. It completed
child exit and both output gates first, emitted transcript `error`, then queued
a duplicate transcript `error` with `process.nextTick`. Completion selected
`PROCESS_BOOTSTRAP_FAILED`, but centralized finalization removed the guard
before the duplicate ran. Node exited with status 1:

```text
Error: queued nextTick transcript duplicate
Emitted 'error' event on PassThrough instance
Node.js v22.22.1
```

The independently repeated `close` followed by two `nextTick` errors failed in
the same way; the first queued post-close error was unhandled and Node exited
with status 1. This is not an impossible wait or a second logical settlement:
it is an EventEmitter boundary escape after the correct cause was already
locked.

Required correction: separate transcript logical completion from final error-
guard disposal so every duplicate already queued in the promised boundary is
contained before centralized disposal. Preserve first-observed-wins and
cleanup-before-result, then add process-level regressions with no uncaught
handler for:

- output/child already terminal, `error -> nextTick(error)`; and
- output/child already terminal,
  `close -> nextTick(error) -> nextTick(error)`.

Each regression must still prove one completion cause, bounded settlement, and
zero transcript listeners after the enlarged boundary actually closes.

### P1 — The detached callback guard expires before a queued microtask duplicate

When a detached write callback later reports an error,
`guardPairedWriteError()` installs a temporary destination error listener and
immediately queues its cleanup with `queueMicrotask`. The callback then returns
to its caller. If that caller queues the racing duplicate error in a microtask,
the cleanup microtask was registered first and removes the guard before the
duplicate emission.

Evidence:

- `gateway/src/adapters/process_supervisor.js:378` defines the temporary paired
  error guard.
- `gateway/src/adapters/process_supervisor.js:383` removes the guard.
- `gateway/src/adapters/process_supervisor.js:387` queues that removal at the
  microtask boundary.
- `gateway/src/adapters/process_supervisor.js:393` handles the detached write
  callback; lines 394–399 install and schedule the guard cleanup before the
  callback returns.
- `gateway/src/adapters/process_supervisor.js:404` detaches the supervisor
  callback reference, while transfer disposal at lines 640–650 clears the
  remaining transfer-owned references.

A bounded injected-process probe first completed an ordinary cancel with one
termination command, zero fallback signals, zero destination listeners, and a
caller-owned sink that was neither ended nor destroyed. It then invoked the
forever-blocked callback with an error and queued the paired duplicate
destination error using `queueMicrotask`, without an uncaught handler or
emission catch. The guard-cleanup microtask ran first; Node exited with status
1:

```text
Error: queued microtask duplicate
Emitted 'error' event on Writable instance
Node.js v22.22.1
```

A control probe with the same late callback scheduled from a microtask but no
duplicate passed and returned to zero error listeners. The versioned fixture's
synchronous late-callback duplicate also passed. Together these controls
isolate the missing queued-microtask lifetime rather than callback detachment
or public settlement.

Required correction: make the detached callback's paired-error boundary cover
a duplicate microtask queued after the callback returns, without retaining a
permanent listener, destination ownership, supervisor state, failure handler,
or termination path. Add an uncaught-handler-free process regression which
asserts zero listeners and no sink end/destroy before callback release, emits
`callback(error) -> queueMicrotask(error)`, and proves the temporary guard
eventually returns to zero.

## Confirmed behavior

The following Trial 3 behavior passed and should be preserved:

- both complete focal passes reported **35 passed / 0 failed / 0 skipped**;
- the versioned synchronous stdout/stderr error fixture, both synchronous
  duplicate transcript fixtures, and deadline/cancel forever-blocked callback
  fixtures passed;
- an independent reversed stderr-first/stdout-second probe, with additional
  `nextTick` and microtask duplicates queued before teardown, rejected once
  with `PROCESS_STREAM_FAILED`, wrote exactly one termination command, used
  zero fallback signals, and left zero output/control listeners;
- the real Linux blocked-sink deadline test settled `timed_out` after exact
  S/R/U cleanup, did not end or destroy the caller sink, and had zero
  error/close listeners before and after its covered late callback;
- control-writer listeners were zero on the focal normal, stream-failure,
  transcript-failure, cancel, deadline, and callback-EPIPE paths;
- control callback `EPIPE` remained provider-data-free and used the exact
  authenticated fallback;
- configured-runtime-only launch, literal argv/environment, `shell: false`,
  direct `execve`, ENOEXEC without shell fallback, output backpressure,
  persistent cancel, absolute deadlines, caller/S death, Linux descendant
  adoption/reaping, Darwin ordering seam, FIFO exclusion, and unrelated
  sentinel preservation remained green; and
- oversized launch/runtime data remained pre-spawn rejection in the versioned
  focal coverage.

These positives do not contain the two deferred error orders above.

## Verification

- Identity and scope:
  `git status --short --branch`, `git rev-parse HEAD HEAD^{tree} HEAD^
  HEAD^^`, commit metadata, and exact range/request name-status/stat checks —
  passed with the frozen values and allowlist above.
- Focal pass 1:
  `PROCESS_SUPERVISOR_TEST_PYTHON=/home/carase/miniconda3/bin/python3 node
  --test --test-concurrency=1 tests/gateway/process_supervisor.test.js
  tests/gateway/process_supervisor_darwin.test.js
  tests/gateway/process_supervisor_live.test.js` —
  **35 passed / 0 failed / 0 skipped**, 6.623 s.
- Focal pass 2: the same command —
  **35 passed / 0 failed / 0 skipped**, 6.861 s.
- Exact inventory before and after each focal pass: `/proc/[0-9]*/cmdline`
  matched only the task helper/fixtures and task temporary prefix, with
  PID/start-token/PGID/SID read from `/proc/<pid>/stat`; temporary inventory
  matched `/tmp/agents-process-supervisor-*`. All four valid snapshots were
  exactly **0 processes / 0 temporary paths**.
- Reversed simultaneous output probe:
  bounded `timeout 5s node --input-type=module` injected harness —
  `{"ok":true,"terminations":1,"fallbacks":0}` with zero residual listeners.
- Late callback from a microtask without a duplicate:
  bounded injected harness — passed and returned to zero listeners.
- Late callback plus queued microtask duplicate:
  bounded injected harness — **failed**, Node status 1 with an unhandled
  Writable `error`.
- Transcript error plus queued `nextTick` duplicate:
  bounded injected harness — **failed**, Node status 1 with an unhandled
  PassThrough `error`.
- Transcript close plus two queued `nextTick` errors:
  bounded injected harness — **failed**, Node status 1 on the first queued
  post-close error.

An initial inventory query self-matched its shell heredoc. That result was
discarded; the corrected inventory excluded the scanner PID and parent and
constructed match strings outside the shell command line. The four valid
before/after snapshots reported above were clean.

The directed ESLint, Ruff, source-compilation, structure, `git diff --check`,
and gitleaks commands reported in the Trial 3 submission were not independently
rerun after the confirmed P1 failures and the explicit stop instruction. They
are submission evidence only and are not represented here as reviewer passes.
A planned exact-limit injected probe likewise produced no valid evidence
before the stop instruction because its private harness had a construction
error and then a syntax error; only the versioned focal boundary evidence is
counted.

## Cleanup

- Both complete focal passes had zero task-owned processes and zero task
  temporary paths before and after execution.
- All adversarial probes used injected `EventEmitter`/stream/process
  operations; they created no OS child, task temporary directory, signal
  target, external connection, or shared-service state.
- No manual process cleanup, numeric signal, broad group signal, `cancel()` as
  cleanup intervention after a timeout, `killall`, or `pkill` was used.
- No probe hung or left a residue. Each independent probe was bounded by its
  own 5-second harness timeout; the observed failures exited naturally with
  status 1 before that bound.

## Review limits

- Native execution evidence is Linux with Node 22.22.1 and the configured
  runtime path `/home/carase/miniconda3/bin/python3`.
- Darwin evidence is source inspection plus the deterministic
  kqueue-before-release seam; no native macOS execution is claimed.
- No aggregate Gateway suite, `scripts/ci.sh`, CI, tmux, MCP, Redis, KYA,
  network, provider, agent, shared service, integration, promotion, release,
  or external cleanup action was run.
- No production, test, ADR, request, task sheet, manifest, CI, or shared file
  was modified. This result file is the review's only change.

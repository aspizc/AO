# Review Submission — Project V5 D/0/01 CORE (Trial 4)

## Requested reviewer

- Model profile: **GPT-5.6 Sol**
- Reasoning profile: **ultra**
- Service profile: **Priority/Fast**
- Review mode: independent, evidence-based review of the frozen technical
  commit below; no implementation changes

## What was corrected

- Replaced the premature transcript/output `process.nextTick` boundary and
  late-callback `queueMicrotask` cleanup with one explicit event-loop
  quiescence boundary:
  - logical close queues a `setImmediate` sentinel in the check phase;
  - error guards remain installed until that sentinel runs;
  - local terminal gates close at the sentinel; and
  - centralized disposal still precedes public completion settlement.
- Closed both Trial 3 transcript P1 orders with child exit and both output
  gates already terminal:
  - `error -> process.nextTick(error)`; and
  - `close -> process.nextTick(error) -> process.nextTick(error)`, with the
    second callback nested from the first.
- Extended the detached write-callback lease so
  `callback(error) -> queueMicrotask(error)` is contained in both deadline and
  cancel paths:
  - before late callback release the caller sink has zero supervisor listeners;
  - the callback installs only a temporary no-op error guard;
  - the guard returns to zero at the check-phase sentinel;
  - the callback cannot reach the transfer, failure handler, supervisor,
    completion, or termination path; and
  - the supervisor neither ends nor destroys the caller-owned sink.
- Routed child spawn errors through the transcript's same idempotent boundary
  instead of setting the transcript gate directly.
- Added positive process-level coverage for reversed stderr/stdout failure
  order, nested nextTick/microtask duplicates, first-observed-wins, one
  completion, one stream termination request, cancel/deadline settlement,
  control-writer disposal, sink ownership, and zero residual listeners.
- Reconciled the task-owned ADR with the exact phase-based ownership rule and
  its deliberate limit on future caller emissions.

The configured-runtime-only launch, literal argv/environment, direct
`execve`, Linux subreaper cleanup, exact authenticated fallback, Darwin
limitation, bounded framing, absolute deadline, FIFO exclusion, and
provider-data-free errors remain unchanged.

## Exact quiescence boundary

The first logical terminal transition, or a detached callback reporting an
error, queues one check-phase sentinel with `setImmediate`.

- Every error emitted before that sentinel executes belongs to the boundary.
  This includes synchronous duplicates and all `process.nextTick` and V8
  microtasks already racing from the callback that closed it, including nested
  nextTick/microtask work which executes before the sentinel.
- At the sentinel, an active local gate resolves and centralized
  transfer/transcript/control disposal then runs before public settlement. For
  an already-detached callback, only its temporary guard is removed; public
  completion is already settled and cannot be re-entered. Both paths leave
  listener counts at zero.
- An emission after the sentinel does not belong to the boundary. Ownership
  has returned to the caller; the supervisor does not claim to contain
  arbitrary future errors on a caller-owned stream.

This is a deterministic event-loop phase boundary, not a duration or a
millisecond grace period.

## TDD evidence

### RED

Before any production change:

`node --test --test-concurrency=1
--test-name-pattern='process-level event guard'
tests/gateway/process_supervisor.test.js`

- **6 passed / 4 failed**
- transcript with child/output already terminal,
  `error -> nextTick(error)`: the duplicate escaped as an unhandled
  PassThrough `error`;
- transcript with child/output already terminal,
  `close -> nextTick(error) -> nested nextTick(error)`: the first post-close
  error escaped;
- detached deadline callback,
  `callback(error) -> queueMicrotask(error)`: the duplicate escaped as an
  unhandled Writable `error`; and
- the same detached callback order after explicit cancel failed identically.

The standalone fixture contains no `uncaughtException` handler,
`setUncaughtExceptionCaptureCallback`, or try/catch around emitted errors.

### GREEN

The exact process-level command after production changes:

- **10 passed / 0 failed / 0 skipped**
- each deferred transcript scenario settled at the queued check-phase
  boundary, settled once, preserved the first failure, and ended with zero
  transcript and control-writer listeners;
- both late-callback scenarios had zero sink/control listeners before release,
  one temporary sink guard after `callback(error)`, and zero listeners after
  one deterministic check phase; and
- the sink remained neither ended nor destroyed.

The complete injected supervisor test:

`node --test --test-concurrency=1
tests/gateway/process_supervisor.test.js`

- **26 passed / 0 failed / 0 skipped**

## Configured-runtime focal verification

Pass 1:

`PROCESS_SUPERVISOR_TEST_PYTHON=/home/carase/miniconda3/bin/python3
node --test --test-concurrency=1
tests/gateway/process_supervisor.test.js
tests/gateway/process_supervisor_darwin.test.js
tests/gateway/process_supervisor_live.test.js`

- **40 passed / 0 failed / 0 skipped**, 7.337 s
- exact task process inventory: **0 before / 0 after**
- exact `/tmp` task-directory inventory: **0 before / 0 after**

Pass 2 used the identical command:

- **40 passed / 0 failed / 0 skipped**, 6.969 s
- exact task process inventory: **0 before / 0 after**
- exact task-directory inventory: **0 before / 0 after**

The valid inventory snapshots used exact task process/temporary prefixes,
excluded the scanner shell and parent, and did not use a shell glob. The three
snapshots—before pass 1, between passes, and after pass 2—were all exactly
**0 processes / 0 temporary paths**.

The focal suite preserves exact S/R/U identity cleanup, no-shell configured
runtime execution, literal argv/env, backpressure responsiveness, deadline and
cancel tree cleanup, TERM-resistant same-group and escaped descendants, caller
and supervisor loss, unrelated sentinel preservation, Darwin ordering, FIFO
exclusion, writer disposal, and caller-sink ownership.

## Directed verification

- Directed ESLint over the standalone supervisor and all six dedicated
  JavaScript tests/fixtures — passed.
- Ruff **0.15.16** over
  `gateway/src/adapters/process_supervisor_helper.py` and
  `tests/gateway/process_supervisor_caller_harness.py` — passed.
- Configured Python source compilation with `compile()` and no bytecode writes
  over those two files — **2 passed**.
- `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure/test_project_layout.py
  tests/structure/test_node_runtime_contract.py` — **16 passed**.
- `git diff --check
  f8174d5ab1290ae339f78bcedae565cffd7a2173..81f1fcf2a6c74c0984a96bb07045b2d3737e1393`
  — passed.
- The exact binary technical diff for that range piped to
  `gitleaks detect --pipe --redact --no-banner` — no leaks found.
- Runtime identity: Linux Node **22.22.1**, configured Python **3.13.13**.
- No npm command, aggregate Gateway suite, `scripts/ci.sh`, MCP, Redis, KYA,
  tmux, live provider, agent, network service, integration, promotion, release,
  broad process kill, or external cleanup action was run.

## Frozen identity and scope

- Trial 4 base / Trial 3 result-only KO:
  `f8174d5ab1290ae339f78bcedae565cffd7a2173`
- Base tree: `6fde8e9ed2f6ddcf58cd2ad5dd4f4c65a3191610`
- Trial 3 technical commit:
  `7cd6715a9fddef7b32487b5aad0a145b152942dc`
- Trial 3 request-only commit:
  `a127628192b7a5d08a6c0c287e3b6ee8dea2d97e`
- Trial 4 technical commit:
  `81f1fcf2a6c74c0984a96bb07045b2d3737e1393`
- Trial 4 technical tree:
  `50b9fb27b7cece5dbca77095c1fd55e81be0d1b1`
- Trial 4 technical range:
  `f8174d5ab1290ae339f78bcedae565cffd7a2173..81f1fcf2a6c74c0984a96bb07045b2d3737e1393`
- Parentage: the Trial 4 technical commit is the direct child of the exact
  Trial 3 result-only KO.
- Range size: **1 commit / 4 files / 179 insertions / 28 deletions**
- Branch: `feat/V5-D-0-01-core`
- Worktree:
  `/tmp/agents-orchestrator-v5-d001-core.GI3J4P/worktree`

The technical range modifies only the task-owned ADR, standalone supervisor,
dedicated supervisor test, and dedicated process-level event-race fixture. It
does not modify the helper, task sheet, shared indexes/manifests/CI,
`agent_service`, provider adapters, profiles, policies, catalogs,
packages/locks, lifecycle composition, tmux, MCP, Redis, KYA, coordination
streams, providers, or integration surfaces.

## Review focus and limits

- Confirm independently that the check-phase sentinel is the precise bounded
  ownership frontier and that no wording implies containment of arbitrary
  future caller emissions.
- Confirm that all transcript/output public settlement waits for the sentinel
  and all transfer/transcript/control disposers run first.
- Confirm first-observed-wins, one completion, one stream termination command,
  zero fallback signals in covered local races, and zero residual listeners.
- Confirm that a detached callback retains only the Writable and guard-local
  state until one deterministic phase, cannot re-enter supervisor state, and
  never causes sink `end()` or `destroy()`.
- Native process evidence is Linux only. Darwin remains source inspection plus
  the deterministic kqueue-before-release seam; no native macOS execution is
  claimed.
- This submission makes no splice, adapter/service integration, promotion,
  release, or independent-OK claim.

## Incidents and cleanup

- No RED, GREEN, focal, or directed check left a task-owned PID or temporary
  directory.
- No manual signal, fallback intervention, numeric cleanup signal, broad group
  signal, pattern kill, callback invocation by the supervisor, or external
  cleanup was required.

## Commit

- `81f1fcf2a6c74c0984a96bb07045b2d3737e1393` —
  `fix(supervisor): drain event-loop boundaries (V5 D/0/01 CORE Trial 4)`

Independent review is requested. This submission makes no automatic verdict.

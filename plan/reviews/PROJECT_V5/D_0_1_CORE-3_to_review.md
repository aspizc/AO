# Review Submission — Project V5 D/0/01 CORE (Trial 3)

## Requested reviewer

- Model profile: **GPT-5.6 Sol**
- Reasoning profile: **ultra**
- Service profile: **Priority/Fast**
- Review mode: independent, evidence-based review of the frozen technical
  commit below; no implementation changes

## What was corrected

- Split every output transfer into an idempotent logical gate and an explicit
  EventEmitter-boundary disposer:
  - the first stdout/stderr source or destination failure still locks
    `PROCESS_STREAM_FAILED`;
  - both transfers keep persistent error guards through already-racing and
    duplicate events;
  - exactly one termination command is written; and
  - centralized finalization removes all guards before public settlement.
- Made transcript terminalization idempotent at both layers:
  - `error -> error` and `close -> error -> error` are process-safe without an
    uncaught handler;
  - partial/end/close/error/child-exit orders retain one logical settlement;
  - the error guard remains through the current EventEmitter turn; and
  - transcript data/end/close/error listener counts are zero after the
    terminal boundary closes.
- Added detachable write-callback leases:
  - cancel and deadline stop waiting for a blocked caller callback;
  - finalization removes all caller-sink listeners and nulls strong
    source/destination/failure-handler references before completion settles;
  - the supervisor does not invoke, await, end, or destroy the caller sink;
  - a late callback cannot re-enter supervisor state; and
  - a late callback error plus a same-turn duplicate error is contained by a
    microtask-bounded paired-error guard which then removes itself.
- Added an explicit disposer to the serialized control writer. Its global
  `error` and `close` listeners are removed on normal exit, stream failure,
  transcript failure, cancel, deadline, and callback `EPIPE` completion paths.
- Reconciled the task-owned ADR with the two-phase logical/boundary lifecycle,
  callback leases, centralized cleanup-before-settlement, and zero-residual
  listener contract.

The S/R/U topology, configured-runtime-only launch, direct `execve`, Linux
subreaper cleanup, exact authenticated fallback, Darwin limitation, bounded
framing, deadline, FIFO exclusion, and provider-data-free errors remain
unchanged.

## Decisions taken

- Logical settlement and EventEmitter safety are separate phases. A transfer
  can close its output gate immediately for first-observed-wins while retaining
  its error guard until the current event turn and centralized disposer have
  closed the boundary.
- Output and transcript gates use `process.nextTick`, not a duration or magic
  timeout, so already-queued/synchronous duplicate errors are contained before
  public settlement.
- A pending callback lease is detached by nulling its supervisor callback. The
  only state retained by a permanently blocked callback is the destination
  needed to guard a later Writable callback/error pair; it retains no transfer,
  failure handler, supervisor, or termination path.
- The paired-error guard lasts only through the microtask boundary after a
  callback reports an error. Same-turn errors are treated as the callback's
  paired/racing boundary; after that boundary the caller-owned sink has zero
  supervisor listeners and returns fully to caller ownership.
- All transfer, transcript, and control disposers run before completion
  resolve/reject, preserving cleanup-before-reject.

## TDD evidence

### RED

Process-level reviewer regressions, before production changes:

`node --test --test-concurrency=1
--test-name-pattern='process-level event guard'
tests/gateway/process_supervisor.test.js`

- **0 passed / 4 failed**
- simultaneous stdout/stderr destination errors: the stderr error escaped and
  Node exited with status 1;
- transcript `error -> error`: the duplicate error escaped and Node exited
  with status 1;
- transcript `close -> error -> error`: the second post-close error escaped and
  Node exited with status 1; and
- blocked sink: post-settlement listener count was 1 instead of 0.

The fixture had no `uncaughtException` handler and no try/catch around any
emitted error.

Real Linux blocked-sink regression, before production changes:

`PROCESS_SUPERVISOR_TEST_PYTHON=/home/carase/miniconda3/bin/python3
node --test --test-concurrency=1
--test-name-pattern='one-shot deadline includes'
tests/gateway/process_supervisor_live.test.js`

- **0 passed / 1 failed**
- exact S/R/U cleanup completed, but the caller sink retained one supervisor
  error listener before its blocked callback was released.
- Exact task PID inventory: **0** after the failed test.
- Exact `/tmp/agents-process-supervisor-*` inventory: **0** after the failed
  test.

### GREEN

Final focal pass 1:

`PROCESS_SUPERVISOR_TEST_PYTHON=/home/carase/miniconda3/bin/python3
node --test --test-concurrency=1
tests/gateway/process_supervisor.test.js
tests/gateway/process_supervisor_darwin.test.js
tests/gateway/process_supervisor_live.test.js`

- **35 passed / 0 failed / 0 skipped**
- exact task PID inventory: **0 before / 0 after**
- exact `/tmp/agents-process-supervisor-*` inventory:
  **0 before / 0 after**

Final focal pass 2: same command and result:

- **35 passed / 0 failed / 0 skipped**
- exact task PID inventory: **0 before / 0 after**
- exact task temporary-directory inventory: **0 before / 0 after**

The five process-level scenarios cover simultaneous and duplicate destination
errors, both duplicate transcript orders, deadline with a forever-blocked
callback, and cancel with a forever-blocked callback. Both blocked-callback
scenarios assert zero sink and control-writer listeners before release, then
release with an error, emit a duplicate error without a catch, and assert zero
listeners afterward. The real Linux deadline test also proves S/R/U absence
before release and that the sink is neither ended nor destroyed.

## Other verification

- Directed ESLint over the supervisor and all six dedicated JavaScript
  tests/fixtures — passed.
- Ruff 0.15.16 over the helper and caller harness — passed.
- Python source compilation with `compile()` and no bytecode writes over the
  helper and caller harness — **2 passed**.
- `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure/test_project_layout.py
  tests/structure/test_node_runtime_contract.py` — **16 passed**.
- `git diff --check
  5634dbd28b5feab232f31c774799d053da64cde5..7cd6715a9fddef7b32487b5aad0a145b152942dc`
  — passed.
- The exact binary technical diff piped to
  `gitleaks detect --pipe --redact --no-banner` — no leaks found.
- Runtime identity: Linux Node **22.22.1**, configured Python **3.13.13**.
- No aggregate Gateway suite, `scripts/ci.sh`, MCP, Redis, KYA, tmux, live
  provider, agent, network service, integration, promotion, or release action
  was run.

## Frozen identity and scope

- Trial 3 base / Trial 2 result-only KO:
  `5634dbd28b5feab232f31c774799d053da64cde5`
- Base tree: `ad3db9860ba324939aafd465111aa2da7d548e6e`
- Trial 2 technical commit:
  `c3ad8d98852198b1afe1538fb30d6850c68b5ac7`
- Trial 2 request-only commit:
  `39744e48bfeb5ddb28de65004148f19f5a6c4fb4`
- Trial 3 technical commit:
  `7cd6715a9fddef7b32487b5aad0a145b152942dc`
- Trial 3 technical tree:
  `710fabbbd6b4614363499073e89f8e28fe13a626`
- Trial 3 technical range:
  `5634dbd28b5feab232f31c774799d053da64cde5..7cd6715a9fddef7b32487b5aad0a145b152942dc`
- Parentage: the Trial 3 technical commit is a direct child of the exact Trial
  2 result-only KO.
- Range size: **5 files / 610 insertions / 113 deletions**
- Branch: `feat/V5-D-0-01-core`
- Worktree:
  `/tmp/agents-orchestrator-v5-d001-core.GI3J4P/worktree`

The technical range modifies only the task-owned ADR, standalone supervisor,
two dedicated test files, and one new dedicated process-level fixture. It does
not modify the helper, D sheet, shared indexes/manifests/CI, `agent_service`,
provider adapters, profiles, policies, catalogs, packages/locks, lifecycle
composition, tmux, MCP, Redis, KYA, coordination/message streams, or shared
documentation.

## Risks and review focus

- Native process evidence is Linux only. Darwin remains source inspection plus
  the deterministic kqueue-before-release seam; no native macOS execution is
  claimed.
- The late-error lease relies on Node Writable's callback-before-paired-error
  ordering. It is covered both by an uncaught-handler-free process fixture and
  a real Writable/live-supervisor test on Node 22.22.1.
- The microtask-bounded guard intentionally contains all same-turn errors after
  a late callback reports failure. The reviewer should verify that this narrow
  boundary is preferable to retaining a listener indefinitely or exposing a
  paired/duplicate error as uncaught.
- Review should independently confirm first-observed-wins, one termination
  command and zero fallback signals in the injected races, disposer ordering,
  zero post-settlement listener ownership, and absence of a callback-held path
  back into supervisor state.
- This submission makes no splice, adapter/service integration, native-macOS,
  promotion, release, or independent-OK claim.

## Incidents and cleanup

- No live probe or test left a task-owned PID or temporary directory.
- No manual signal, fallback intervention, pattern kill, broad group signal,
  external cleanup, or callback invocation by the supervisor was required.
- The RED live test's test-owned after hook released its callback after the
  assertion; exact process and temporary inventories were already zero.

## Commit

- `7cd6715a9fddef7b32487b5aad0a145b152942dc` —
  `fix(supervisor): close terminal races (V5 D/0/01 CORE Trial 3)`

Independent review is requested. This submission makes no automatic verdict.

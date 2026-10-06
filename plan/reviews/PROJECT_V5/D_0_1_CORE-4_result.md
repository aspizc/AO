# Independent Review Result — Project V5 D/0/01 CORE (Trial 4)

## Verdict

**OK** for technical candidate
`81f1fcf2a6c74c0984a96bb07045b2d3737e1393`.

Trial 4 closes both deterministic P1 orders from Trial 3. The first internal
cause is immutable before the queued check-phase sentinel can execute; the
relevant error guards remain installed through that sentinel; transfer,
transcript, and control-writer disposal precedes public settlement; and every
covered boundary returns to zero listeners.

The detached write-callback path retains only the caller-owned `Writable` and
guard-local state until the same bounded sentinel. It cannot re-enter the
transfer, failure, supervisor, completion, or termination paths, and it does
not end or destroy the caller-owned sink.

No P0 or P1 correctness or reliability finding was reproduced in the reviewed
range. This verdict accepts only the frozen standalone core candidate. It does
not integrate or promote the candidate, perform the dependency-gated splice,
mark the sheet complete, or assert release readiness.

## Reviewer profile

- Requested model profile: **GPT-5.6 Sol**
- Requested reasoning profile: **ultra**
- Requested service profile: **Priority/Fast**
- Review date: 2026-07-26

The review was performed under the requested profile. The isolated worktree
exposed no independent model, reasoning-effort, or service-tier telemetry, so
these values are a declared review configuration rather than an externally
attested runtime measurement.

## Frozen identity and scope

- Branch: `feat/V5-D-0-01-core`
- Trial 3 request-only commit:
  `a127628192b7a5d08a6c0c287e3b6ee8dea2d97e`
- Trial 3 result-only KO / Trial 4 base:
  `f8174d5ab1290ae339f78bcedae565cffd7a2173`
- Base tree: `6fde8e9ed2f6ddcf58cd2ad5dd4f4c65a3191610`
- Trial 4 technical commit:
  `81f1fcf2a6c74c0984a96bb07045b2d3737e1393`
- Technical tree: `50b9fb27b7cece5dbca77095c1fd55e81be0d1b1`
- Trial 4 request-only commit / review HEAD:
  `2c2374ce3db3bfb5995b8fb3adffc473c8b57181`
- Request tree: `f339666dd957d6cb009f7627fb0ac2aa5bd03dcd`
- Technical range:
  `f8174d5ab1290ae339f78bcedae565cffd7a2173..81f1fcf2a6c74c0984a96bb07045b2d3737e1393`
- Review worktree:
  `/tmp/agents-orchestrator-v5-d001-core.GI3J4P/worktree`

The technical commit is the direct child of the exact Trial 3 result-only KO.
The request-only commit is the direct child of the technical commit and changes
only `plan/reviews/PROJECT_V5/D_0_1_CORE-4_to_review.md`.

The technical range is exactly one commit, four files, 179 insertions, and 28
deletions. Its four paths are the task-owned ADR, standalone supervisor,
dedicated supervisor test, and dedicated event-race fixture. It does not touch
shared manifests or CI, adapter/service composition, profiles, policies,
catalogs, packages/locks, lifecycle wiring, MCP or coordination surfaces, or
provider integrations. The worktree was clean at intake.

The task skill, plan/project/stage material, task sheet, complete task ADR,
Trial 3 result, Trial 4 request, complete technical diff, complete supervisor
and helper sources, and all dedicated tests/fixtures were read. Audit reports
were not used.

## Findings

| Severity | Result |
|---|---|
| P0 | None. |
| P1 | None. |

## Formal reliability boundary

### Internal result and one immutable cause

`gateway/src/adapters/process_supervisor.js:1004-1007` makes the first
settlement cause immutable. Cancellation/deadline lock that cause before output
abort at `:1082-1096`; transcript failure reaches that same lock synchronously
at `:1098-1102`; and spawn failure locks `runtime_failed` before closing the
three boundaries at `:1215-1223`.

For an output failure, local transfer settlement and its sentinel are queued at
`:566-572`, and the failure handler locks the global cause in the same
synchronous callback before the sentinel can execute. The sibling transfer is
aborted idempotently. The reversed stderr/stdout probe therefore preserved the
first `PROCESS_STREAM_FAILED` result, issued exactly one termination command,
used zero fallback signals, and settled once.

### Check-phase sentinel and contained work

`scheduleQuiescenceBoundary()` at
`gateway/src/adapters/process_supervisor.js:378-383` is one explicit
`setImmediate` sentinel. Stream completion/abort uses it at `:566-572` and
`:636-646`; transcript completion uses it at `:675-684`.

The persistent stream and transcript `error` guards are deliberately not
removed by logical close. Their disposers remove them only after their local
gates close at `:647-658` and `:719-728`. Consequently synchronous errors,
`process.nextTick` work, V8 microtasks, and finite nested nextTick/microtask
chains queued before the sentinel remain contained.

The task ADR states the same exact phase frontier at
`docs/adr/ADR-V5-D-0-01-async-process-supervisor-core.md:132-147`. It
explicitly excludes emissions after the sentinel at `:138-140`; those events
belong to the caller and are not described as already racing. This review does
not require containment after that ownership return.

### Disposal before public settlement

The supervisor requires child, transcript, and output gates at
`gateway/src/adapters/process_supervisor.js:1043-1051`. It then clears the
deadline and disposes every output transfer, transcript reader, and control
writer at `:1052-1055` before `publicResult()` is evaluated and the completion
promise resolves or rejects at `:1067-1071`.

Control-writer disposal removes its global `error`/`close` listeners, detaches
an active callback lease, clears the stream reference, and clears the failure
handler at `gateway/src/adapters/process_supervisor.js:517-534`. All focal and
independent injected terminal paths observed zero control-writer listeners
after settlement.

### Detached callback ownership

`guardPairedWriteError()` at
`gateway/src/adapters/process_supervisor.js:385-395` closes over only its
`stream`, active flag, no-op handler, and cleanup sentinel. The write-callback
lease clears its supervisor callback before returning at `:397-414`; transfer
disposal had already detached that callback and cleared transfer-held stream,
destination, and failure references at `:647-658`.

Both deadline and cancel probes showed:

- zero sink and control listeners before the late callback was released;
- exactly one temporary sink guard immediately after `callback(error)`;
- containment of direct and nested microtask/nextTick duplicates before the
  sentinel;
- zero listeners after the sentinel;
- one termination command and zero fallback signals; and
- `writableEnded === false` and `destroyed === false` throughout.

No path in `createStreamTransfer()` calls `end()` or `destroy()` on the
caller-owned destination.

## Independent verification

### Configured-runtime focal suite

The following explicit command was run twice:

```text
PROCESS_SUPERVISOR_TEST_PYTHON=/home/carase/miniconda3/bin/python3 \
node --test --test-concurrency=1 \
tests/gateway/process_supervisor.test.js \
tests/gateway/process_supervisor_darwin.test.js \
tests/gateway/process_supervisor_live.test.js
```

- Pass 1: **40 passed / 0 failed / 0 skipped**, 7.313 s.
- Pass 2: **40 passed / 0 failed / 0 skipped**, 7.075 s.
- Runtime identity: Linux, Node **22.22.1**, configured Python **3.13.13**.

An exact `/proc` scanner enumerated numeric entries without a shell glob,
excluded its own PID and parent, matched only the absolute task helper/fixture
paths or the task temporary prefix, and recorded PID, start token, PGID, and
SID. `/tmp` was enumerated by directory entry and the exact
`agents-process-supervisor-` prefix.

The snapshots before pass 1, after pass 1/before pass 2, and after pass 2 were
all exactly:

```text
task-owned processes: 0
task temporary paths: 0
```

### Independent injected event-loop probe

A separate `timeout 8s node --input-type=module` harness injected
`EventEmitter`, stream, scheduler, and process operations. It created no OS
child and installed no uncaught-exception handler or emission catch. It
completed in 0.018 s and covered:

- child/output already terminal, followed by transcript `error`;
- child/output already terminal, followed by transcript `close`;
- nextTick-to-microtask, microtask-to-nextTick, nested nextTick, and nested
  microtask duplicate errors before the sentinel;
- reversed stderr-first/stdout-second failures with nested duplicates;
- late write callbacks after both absolute deadline and explicit cancel; and
- control-writer disposal on every public path.

Result:

```text
transcript orders: 2/2
reversed output order: passed
late callback paths: 2/2
one public cause: passed
one termination where applicable: passed
fallback signals: 0
residual transcript/output/control listeners: 0
caller sink end/destroy calls: 0
```

The committed process-level fixture independently covered the ten versioned
orders at
`tests/gateway/process_supervisor_event_race_fixture.js:200-425`, including the
two exact Trial 3 transcript regressions and both deadline/cancel late-callback
regressions. Each fixture process is bounded by the 3-second timeout at
`tests/gateway/process_supervisor.test.js:260-284`.

### Directed checks

| Check | Result |
|---|---|
| ESLint 10.8.0 over the standalone supervisor | Passed. |
| ESLint over all six dedicated JavaScript tests/fixtures | Passed. |
| Ruff 0.15.16 over helper and caller harness | Passed. |
| Configured-Python `compile()` with no bytecode writes | 2/2 compiled. |
| Exact structure tests | 16 passed / 0 failed. |
| `git diff --check` over the technical range | Passed. |
| Binary technical diff through gitleaks with redaction | No leaks found. |

The directed commands were:

```text
(cd gateway && node_modules/.bin/eslint \
  src/adapters/process_supervisor.js)

gateway/node_modules/.bin/eslint --config gateway/eslint.config.js \
  tests/gateway/process_supervisor.test.js \
  tests/gateway/process_supervisor_caller_fixture.js \
  tests/gateway/process_supervisor_darwin.test.js \
  tests/gateway/process_supervisor_event_race_fixture.js \
  tests/gateway/process_supervisor_fixture_child.js \
  tests/gateway/process_supervisor_live.test.js

/tmp/agents-orchestrator-c100-t11-venv/bin/ruff check \
  gateway/src/adapters/process_supervisor_helper.py \
  tests/gateway/process_supervisor_caller_harness.py

PYTHONDONTWRITEBYTECODE=1 /home/carase/miniconda3/bin/python3 - <<'PY'
from pathlib import Path
paths = [
    Path("gateway/src/adapters/process_supervisor_helper.py"),
    Path("tests/gateway/process_supervisor_caller_harness.py"),
]
for source_path in paths:
    compile(source_path.read_text(encoding="utf-8"), str(source_path), "exec")
print(f"{len(paths)} compiled")
PY

/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q \
  tests/structure/test_project_layout.py \
  tests/structure/test_node_runtime_contract.py

git diff --check \
  f8174d5ab1290ae339f78bcedae565cffd7a2173..\
81f1fcf2a6c74c0984a96bb07045b2d3737e1393

git diff --binary --no-ext-diff --no-renames \
  f8174d5ab1290ae339f78bcedae565cffd7a2173..\
81f1fcf2a6c74c0984a96bb07045b2d3737e1393 |
  gitleaks detect --pipe --redact --no-banner
```

The exact structure command named only
`tests/structure/test_project_layout.py` and
`tests/structure/test_node_runtime_contract.py`.

## Trial 1–3 behavior revalidated

The two green versioned focal passes preserve:

- configured-runtime-only launch, literal argv/environment, `shell: false`,
  direct `execve`, and ENOEXEC without shell fallback;
- bounded framing and pre-spawn oversized-request rejection;
- output backpressure with event-loop responsiveness;
- first-observed-wins stream/cancel/deadline races and one completion;
- authenticated S/R/U identity, exact fallback, and provider-data-free errors;
- deadline and persistent-cancel cleanup of TERM-resistant same-group and
  escaped descendants;
- abrupt caller and supervisor loss cleanup plus unrelated sentinel
  preservation;
- control callback `EPIPE` containment and control-writer disposal;
- caller-owned sink preservation through blocked callback deadline cleanup;
- Darwin's deterministic kqueue-before-release seam and its explicitly limited
  cleanup claim; and
- FIFO option rejection and hostile FIFO preservation.

These are standalone core results only. They do not claim the later
adapter/lifecycle/profile splice or native macOS execution.

## Limits and cleanup

- Native process evidence is Linux only. Darwin evidence is source inspection
  plus the deterministic ordering seam.
- No npm or Gateway aggregate, `scripts/ci.sh`, MCP, Redis, KYA, network,
  live-provider, agent, shared-service, integration, promotion, release, or
  YOLO workflow was run.
- No prohibited terminal-multiplexer command or test was run.
- No production, test, ADR, request, task, manifest, CI, or shared file was
  modified. This result file is the review's only change.
- The focal suite's exact task-owned signals and temporary paths were contained
  by its fixtures. No manual signal, broad process cleanup, fallback
  intervention, or external cleanup was required.
- Final process and temporary-path inventories were both zero.

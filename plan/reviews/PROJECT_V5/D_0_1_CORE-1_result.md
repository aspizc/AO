# Independent Review Result — Project V5 D/0/01 CORE (Trial 1)

## Verdict

**KO**

The nominal Linux supervision topology and its existing focal suite are strong,
but four reproducible reliability defects violate the required stream,
deadline, framing, and deterministic-settlement contracts. Trial 2 must correct
them and add regressions before this core can be accepted.

## Reviewer profile

- Model profile: **GPT-5.6 Sol**
- Reasoning profile: **ultra**
- Service profile: **Priority/Fast**
- Attestation limit: no external model or service telemetry was available in
  this isolated review environment. These are the configured review profiles,
  not externally attested runtime telemetry.
- Connectivity: no network or external system was used.

## Frozen identity and scope

- Base:
  `78ddc8f7551ee69d459ed331440eebbe21f57e9d`
- Base tree:
  `8c023a42bdb4541355ceaf37f4108b8a1485d845`
- Technical commit:
  `2fa9311e5ba68f608727b21639fe9e8c1d965ff0`
- Technical tree:
  `274955c507b092a079dae57e54573bf1958f5e4a`
- Technical range:
  `78ddc8f7551ee69d459ed331440eebbe21f57e9d..2fa9311e5ba68f608727b21639fe9e8c1d965ff0`
- Request-only commit:
  `96939231e2ed6059915d3dab597cbc5427608ad9`
- Request-only tree:
  `e6843d7dcbc7f5c7d65846077a2a6e8ef3315ee7`
- Branch: `feat/V5-D-0-01-core`
- Review worktree:
  `/tmp/agents-orchestrator-v5-d001-core.GI3J4P/worktree`

Parentage and scope checks passed:

- the technical commit is a direct child of the frozen base;
- the request-only commit is a direct child of the technical commit;
- the technical range contains one commit and exactly 9 new files / 3,670
  insertions / 0 deletions;
- the request-only commit contains exactly
  `plan/reviews/PROJECT_V5/D_0_1_CORE-1_to_review.md`;
- historical C process commit
  `599262455ab689a7242e60627f837eb6589c405d` is not an ancestor of the
  technical commit;
- the technical range does not modify `agent_service`, provider integration,
  catalogs, profiles, shared manifests/locks, shared planning sheets, CI,
  Redis, MCP, tmux, or lifecycle composition; and
- the worktree was clean at intake.

## Findings

### P1 — A destination stream failure does not terminate a persistent owned tree

`streamCompletion()` converts a destination error into
`PROCESS_STREAM_FAILED`, but the resulting rejected `outputCompletion` is only
observed from `finalize()` after the supervisor child and transcript have
already ended. It never calls `requestTermination()`.

Evidence:

- `gateway/src/adapters/process_supervisor.js:307` creates the isolated stream
  completion promise.
- `gateway/src/adapters/process_supervisor.js:320` rejects on a stream error.
- `gateway/src/adapters/process_supervisor.js:566` stores the aggregate output
  promise and only suppresses its early rejection.
- `gateway/src/adapters/process_supervisor.js:646` cannot finalize while the
  persistent supervisor remains live.
- `gateway/src/adapters/process_supervisor.js:668` observes stream failure only
  after process/transcript termination.

A live local probe used a persistent utility that wrote once and remained
alive, with a `Writable` failing its first write. After 500 ms:

- `execution.completion` was still pending;
- S `2302555/36685512`, R `2302556/36685515`, and U
  `2302557/36685516` were all still identity-matched and live; and
- no automatic teardown had started.

The exact execution was disclosed to the coordinating root before cleanup.
Cleanup used only that execution's authenticated `cancel()` channel. The
completion then rejected with `PROCESS_STREAM_FAILED`, and all three exact
identities were confirmed absent.

Required correction: make every source/destination error or premature close
lock one failure reason, initiate exact owned-tree teardown, and settle once
after cleanup. Add live persistent regressions for sink error, sink close, and
source error.

### P1 — The absolute one-shot deadline stops governing before output delivery finishes

`finalize()` marks the completion settled and clears the absolute-deadline
timer before awaiting `outputCompletion`. A slow or stuck destination can
therefore extend successful completion indefinitely beyond the one-shot
budget; cancellation is also ignored once `completionSettled` is set.

Evidence:

- `gateway/src/adapters/process_supervisor.js:646` enters finalization when the
  child and transcript end.
- `gateway/src/adapters/process_supervisor.js:654` sets
  `completionSettled = true`.
- `gateway/src/adapters/process_supervisor.js:655` clears the deadline.
- `gateway/src/adapters/process_supervisor.js:668` only then awaits output
  delivery.
- `gateway/src/adapters/process_supervisor.js:617` makes subsequent
  cancellation a no-op for termination once that flag is set.

A live local probe used a 500 ms absolute deadline, a utility that printed and
exited normally, and a sink that delayed its write callback for 1,200 ms. The
supervisor returned a successful `exited/0` result after 1,240 ms, **740 ms
past the absolute deadline**. S, R, and U were already absent at probe
completion.

Required correction: keep the same absolute deadline authoritative through
source EOF and destination settlement, without resetting it, and make a stuck
sink cancellable. Add a regression that cannot pass by clearing the timer when
the helper exits.

### P1 — Oversized accepted input crosses incompatible framing limits and emits an unhandled EPIPE

The public validation has no byte/count limits for argv, environment, cwd,
session ID, or runtime-plan fields. The helper independently rejects a control
buffer over 1 MiB, while the caller treats `stdin.write()` returning `false`
as success, does not await `drain`, and installs no error handler on
`child.stdin`.

Evidence:

- `gateway/src/adapters/process_supervisor.js:68` validates string shape but
  not length.
- `gateway/src/adapters/process_supervisor.js:76` and
  `gateway/src/adapters/process_supervisor.js:84` copy unbounded arrays and
  environments.
- `gateway/src/adapters/process_supervisor.js:231` accepts the unbounded
  request before spawning.
- `gateway/src/adapters/process_supervisor.js:602` ignores the boolean result
  of `child.stdin.write()`.
- `gateway/src/adapters/process_supervisor_helper.py:29` defines the helper's
  1 MiB control-buffer cap.
- `gateway/src/adapters/process_supervisor_helper.py:291` closes the logical
  caller channel when that cap is exceeded.

A live local probe supplied a non-secret 1,100,000-byte environment value.
The request passed preflight and spawned S. The start later rejected with
`PROCESS_BOOTSTRAP_FAILED`, while a probe-level `uncaughtException` handler
captured asynchronous `EPIPE: write EPIPE` from the unhandled stdin stream.
Without that probe handler this is a caller-process crash path. Exact S
`2316331/36703331` was absent after the probe; no utility was released.

Required correction: define consistent caller/helper limits and reject before
spawn, account for encoded JSON bytes rather than JavaScript character count,
honor control-stream backpressure, and handle asynchronous stdin errors through
the same fixed, provider-data-free settlement path.

### P1 — Transcript stream error can leave completion pending after the child exits

The transcript parser calls `onFailure` on `error`, but only the `end` handler
calls `onEnd`. It does not handle `close`. Finalization requires
`transcriptEnded`, so a stream that emits `error` followed by `close` and no
`end` can leave completion pending forever even after the child exits.

Evidence:

- `gateway/src/adapters/process_supervisor.js:341` initializes transcript
  parsing.
- `gateway/src/adapters/process_supervisor.js:365` maps `error` only to
  `onFailure`.
- `gateway/src/adapters/process_supervisor.js:366` is the sole parser path to
  `onEnd`.
- `gateway/src/adapters/process_supervisor.js:649` requires
  `transcriptEnded`.
- `gateway/src/adapters/process_supervisor.js:780` sets it only through that
  end callback.

A deterministic injected-process probe authenticated readiness, then destroyed
the transcript stream with an error and emitted child exit. After 100 ms the
child was exited but `execution.completion` remained pending.

Required correction: make transcript error/end/close a single idempotent
terminal transition, preserve a protocol-failure result, request exact
teardown, and settle after output/child cleanup. Add regressions for error,
partial final JSON, error-plus-close, and exit/error ordering.

## Confirmed behavior outside the findings

Static inspection and the passing focal suite confirmed:

- a strict request-field allowlist, immutable copies of normal argv/env/runtime
  inputs, one configured runtime spawn, preserved wrapper arguments,
  `shell: false`, and unsupported-platform rejection before child creation;
- direct utility `os.execve(argv[0], argv, env)`, exact cwd/env/argv handling
  for normal bounded inputs, fixed exec/cwd failures, no `execvp`, no ENOEXEC
  shell fallback, no FIFO, and no ambient second Python lookup;
- authenticated reaper and utility readiness with PID/start-token/PGID/SID and
  binding digest checks before release;
- Linux subreaper activation, TERM/KILL escalation, wait-held leader identity,
  adopted escaped-descendant cleanup, and complete reaping in the tested
  timeout, cancel, S-SIGKILL, and caller-SIGKILL paths;
- unrelated sentinel preservation in the abrupt-caller fixture;
- Darwin's kqueue `NOTE_EXIT` seam is armed before utility release, and the ADR
  honestly limits Darwin to child leader plus same-PGID cleanup without an
  arbitrary subreaper claim; and
- the standalone core remains unspliced from agent services and providers.

These positives do not offset the four deterministic settlement and
availability failures above.

## Verification

- Focal, pass 1:
  `PROCESS_SUPERVISOR_TEST_PYTHON=/home/carase/miniconda3/bin/python3 node
  --test --test-concurrency=1 tests/gateway/process_supervisor.test.js
  tests/gateway/process_supervisor_darwin.test.js
  tests/gateway/process_supervisor_live.test.js`
  — **20 passed / 0 failed / 0 skipped**. Exact matching `/proc` inventory:
  0 before, 0 after. Exact `/tmp/agents-process-supervisor-*` inventory:
  0 before, 0 after.
- Focal, pass 2: the same command — **20 passed / 0 failed / 0 skipped**.
  Exact matching `/proc` inventory: 0 before, 0 after. Exact task tmp-prefix
  inventory: 0 before, 0 after.
- Directed JavaScript lint:
  `gateway/node_modules/.bin/eslint --config gateway/eslint.config.js` over the
  production module and all five dedicated JavaScript test/fixture files —
  passed.
- Python syntax compilation with `compile()` and no bytecode writes over
  `process_supervisor_helper.py` and
  `process_supervisor_caller_harness.py` — 2 passed.
- Python lint:
  `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m ruff check
  gateway/src/adapters/process_supervisor_helper.py
  tests/gateway/process_supervisor_caller_harness.py` — passed.
- Structure:
  `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure/test_project_layout.py
  tests/structure/test_node_runtime_contract.py` — **16 passed**.
- Diff hygiene:
  `git diff --check
  78ddc8f7551ee69d459ed331440eebbe21f57e9d..2fa9311e5ba68f608727b21639fe9e8c1d965ff0`
  — passed.
- Secret scan:
  exact technical binary diff piped to
  `gitleaks detect --pipe --redact --no-banner` — no leaks found.

## Incident revalidation and final cleanup

The submission's documented fixture incident was revalidated read-only:

- PIDs `2188941`, `2189006`, `2189014`, `2189015`, `2189016`, and `2189023`
  were all absent;
- exact workspace `/tmp/agents-process-supervisor-gW9zM4` was absent.

Reviewer probes:

- the sink-failure probe was the only probe intentionally observed while its
  owned tree remained live;
- its exact identities were disclosed before cleanup;
- cleanup used only its authenticated execution cancellation channel;
- no `killall`, `pkill`, pattern signal, broad process-group signal, or signal
  to a non-owned process was used; and
- exact reviewer-probe PIDs `2302555`, `2302556`, `2302557`, and `2316331`
  were all absent at final inventory.

Final inventories found:

- 0 matching task-owned processes;
- 0 `/tmp/agents-process-supervisor-*` directories; and
- no remaining documented-incident or reviewer-probe identity.

## Review limits

- Native execution evidence is Linux 7.0.0 x86_64, Node 22.22.1, and configured
  Python 3.13.13.
- Darwin evidence is source inspection plus the deterministic ordering seam;
  no native macOS run is claimed.
- No aggregate Gateway suite, `scripts/ci.sh`, CI, MCP, Redis, KYA, tmux,
  provider, agent, network service, integration, promotion, or release action
  was run.
- No production, test, ADR, request, plan-sheet, manifest, or shared file was
  modified by this review. This result file is the only review change.

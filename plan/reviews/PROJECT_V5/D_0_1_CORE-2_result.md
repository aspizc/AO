# Independent Review Result — Project V5 D/0/01 CORE (Trial 2)

## Verdict

**KO**

Trial 2 fixes the four nominal Trial 1 paths and preserves the existing
30-test Linux/Darwin focal suite, but the stream/transcript failure guards and
listener teardown are not race-closed. Two adversarial failure families remain
reproducible: a sibling or duplicate `error` can still escape as an uncaught
Node exception, and a one-shot deadline can settle while supervisor-owned
listeners remain attached to a caller-owned sink whose callback is blocked.

## Reviewer profile

- Model profile: **GPT-5.6 Sol**
- Reasoning profile: **ultra**
- Service profile: **Priority/Fast**
- Attestation limit: no external model or service telemetry was available in
  this isolated review environment. These are the configured review profiles,
  not externally attested runtime telemetry.
- Connectivity: no network, external service, MCP, Redis, KYA, provider, or
  integration system was used.

## Frozen identity and scope

- Trial 2 base / Trial 1 result-only KO:
  `60f7060d072f51d5648dbb59452dcb204168bdab`
- Base tree:
  `c599047d727c4446be608c34394fc3f7fb2a62e6`
- Trial 2 technical commit:
  `c3ad8d98852198b1afe1538fb30d6850c68b5ac7`
- Technical tree:
  `9a177059fc0cb156d60b8193f451ddfd06c746cc`
- Technical range:
  `60f7060d072f51d5648dbb59452dcb204168bdab..c3ad8d98852198b1afe1538fb30d6850c68b5ac7`
- Trial 2 request-only commit:
  `39744e48bfeb5ddb28de65004148f19f5a6c4fb4`
- Request-only tree:
  `17b026d047154cd1689f792f50dd6d396d0bb991`
- Branch: `feat/V5-D-0-01-core`
- Review worktree:
  `/tmp/agents-orchestrator-v5-d001-core.GI3J4P/worktree`

Parentage and scope checks passed:

- the base/result commit is the direct parent of the technical commit;
- the technical commit is the direct parent of the request-only commit;
- the technical range contains one commit and exactly 6 files / 1,122
  insertions / 149 deletions;
- the six technical paths are the task ADR, supervisor, helper, two dedicated
  test files, and the dedicated child fixture;
- the request-only commit contains exactly
  `plan/reviews/PROJECT_V5/D_0_1_CORE-2_to_review.md`;
- the range does not touch the D sheet, adapters/services, profiles, policies,
  catalogs, manifests, packages/locks, CI, lifecycle composition, tmux, MCP,
  Redis, KYA, provider integration, or shared paths; and
- the worktree was clean at intake.

## Findings

### P1 — The first output failure removes the sibling guard, so a simultaneous second destination error is uncaught

`requestTermination()` immediately calls `abortOutputs()` after the first
failure. A transfer with no pending write then removes its destination
`error`/`close` listeners from `abort()`. If the other destination emits its
already-racing `error`, Node sees an `error` event with no listener and throws
instead of preserving the locked `PROCESS_STREAM_FAILED` result.

Evidence:

- `gateway/src/adapters/process_supervisor.js:584` begins transfer abort.
- `gateway/src/adapters/process_supervisor.js:591` removes the destination
  guards whenever `pendingWrites === 0`.
- `gateway/src/adapters/process_supervisor.js:927` aborts both transfers as
  soon as one settlement cause wins.
- `gateway/src/adapters/process_supervisor.js:992` locks the first cause and
  invokes that sibling abort.
- `gateway/src/adapters/process_supervisor.js:1015` registers stdout and
  stderr as separate transfers sharing the same termination path.

An injected-process probe started a persistent execution with separate
caller-owned stdout and stderr `Writable` destinations, emitted stdout
`error`, and immediately emitted stderr `error`. The first error sent exactly
one authenticated termination command. The second emission threw
`Error: err failed`; the uncaught form exited Node with status 1. Re-running
with a probe-level `try/catch` confirmed the exact second throw while public
completion still rejected with `PROCESS_STREAM_FAILED` and settled once.

This used no OS child, signal, service, or temporary directory. It is the
requested simultaneous stdout/stderr failure variant, not a cleanup
intervention.

Required correction: keep every active sibling failure guard safe through an
already-racing error while retaining first-observed-wins and exactly one
termination command. Add a process-level regression that proves simultaneous
stdout/stderr destination errors produce no `uncaughtException` or process
exit, then prove the guards are detached after terminal settlement.

### P1 — Transcript terminalization is not idempotent for duplicate errors

`parseTranscript()` installs `error` with `once()`. When `error` is the first
terminal event, EventEmitter removes that listener before `finish(true)` runs.
The `keepError` branch does not install a replacement guard, so a second
already-racing transcript `error` throws. When `close` wins, one later error is
contained by the retained once-listener, but the next duplicate throws for the
same reason.

Evidence:

- `gateway/src/adapters/process_supervisor.js:605` defines terminal cleanup.
- `gateway/src/adapters/process_supervisor.js:611` makes the parser's logical
  transition idempotent but does not make subsequent stream events safe.
- `gateway/src/adapters/process_supervisor.js:614` explicitly intends to
  preserve an error guard for paired terminal events.
- `gateway/src/adapters/process_supervisor.js:642` maps error to terminal
  failure.
- `gateway/src/adapters/process_supervisor.js:647` registers only a once-error
  listener.

Two deterministic injected-process orders reproduced the escape:

- `error` then duplicate `error` threw the second error; and
- `close`, `error`, then duplicate `error` threw the second post-close error.

In both cases the completion itself rejected with
`PROCESS_BOOTSTRAP_FAILED`, exactly one termination action was observed, and
there was no impossible wait for `end`. The remaining defect is the uncaught
duplicate event, which violates the requested terminal/idempotent transcript
contract.

Required correction: make error/end/close/partial/duplicate event ordering
safe at the stream boundary as well as logically settle-once. Add duplicate
error and close-error-error regressions which run without a probe-level
uncaught handler and assert zero residual transcript listeners after the
terminal boundary is closed.

### P1 — Deadline settlement leaves supervisor listeners attached to a blocked caller-owned sink

The corrected deadline does return `timed_out` without awaiting a destination
callback, but transfer abort deliberately retains destination `error` and
`close` listeners whenever a write callback is pending. The transfer promise
is resolved immediately, so all three public gates can settle while those
listeners still retain supervisor state and remain attached to the
caller-owned object. They disappear only if the callback eventually runs.

Evidence:

- `gateway/src/adapters/process_supervisor.js:547` keeps late callback state
  after transfer settlement.
- `gateway/src/adapters/process_supervisor.js:584` marks the transfer settled.
- `gateway/src/adapters/process_supervisor.js:591` conditionally skips listener
  removal while `pendingWrites > 0`.
- `gateway/src/adapters/process_supervisor.js:597` nevertheless resolves the
  output gate immediately.
- `gateway/src/adapters/process_supervisor.js:954` can then settle public
  completion and clear the deadline.
- `docs/adr/ADR-V5-D-0-01-async-process-supervisor-core.md:121` requires
  deadline/cancel abort to detach supervisor listeners while leaving the
  caller destination intact.

A live Linux probe used the configured Python runtime, the real helper and
utility, a 500 ms absolute deadline, and a caller-owned
`Writable({autoDestroy: false})` whose write callback remained blocked.
Without cancel or manual signals:

- completion returned `{status: "timed_out"}` 2 ms after the absolute
  deadline;
- the exact S, R, and U identities were already absent;
- the caller sink was not destroyed; but
- the sink retained exactly one supervisor `error` listener and one
  supervisor `close` listener after public settlement.

Only releasing the callback after recording the settled state removed those
two listeners. An injected control-stream check also found the control
writer's `on("error")` and `on("close")` handlers have no completion disposer
at `gateway/src/adapters/process_supervisor.js:401`.

Required correction: public settlement must detach all supervisor ownership
from the caller sink and dispose the control writer's global listeners without
waiting for or invoking the late callback and without ending/destroying the
sink. Add listener-count assertions before releasing a permanently blocked
callback and after a late callback/error.

## Confirmed corrections and preserved behavior

The following behavior passed and should be preserved in Trial 3:

- individual persistent sink error, sink close, source error, and injected
  source close lock `PROCESS_STREAM_FAILED`, start automatic exact teardown,
  and settle after S/R/U cleanup without caller cancellation;
- cancel/deadline/stream races retain first-observed-wins and one termination
  command in the covered non-duplicate orders;
- the same absolute deadline remains armed through helper exit and output
  settlement, returns within the bound for a blocked sink, and does not destroy
  the caller sink;
- complete launch and runtime-plan frames of 1,048,575 UTF-8 bytes are
  accepted by the injected writer, while 1,048,576-byte frames are rejected
  before spawn;
- an exact 262,144-byte multibyte environment value is accepted and 262,145
  bytes is rejected; argv counts 4,096/4,097 and environment counts
  4,096/4,097 accept/reject at the documented boundaries;
- the supplied 1.1 MiB, aggregate, and multibyte oversize cases create no
  supervisor;
- control callback `EPIPE` after utility readiness is contained and uses one
  authenticated fallback; additional injected failures on control writes 1
  and 2 reject boundedly with zero fallback before readiness and one exact
  fallback after readiness;
- the standard transcript error/close/partial/error-plus-close/child-exit
  orders settle without waiting for an impossible end;
- caller/S `SIGKILL`, Linux subreaper adoption, TERM-resistant same-group and
  escaped descendants, exact identity/start-token fallback, direct `execve`,
  one configured runtime, no shell, no FIFO, and unrelated-sentinel
  preservation remain green; and
- Darwin remains truthfully limited to child leader plus same-PGID cleanup,
  with the kqueue-before-release seam passing.

These positives do not offset the uncaught-error and listener-ownership
failures.

## Verification

- Focal pass 1:
  `PROCESS_SUPERVISOR_TEST_PYTHON=/home/carase/miniconda3/bin/python3 node
  --test --test-concurrency=1 tests/gateway/process_supervisor.test.js
  tests/gateway/process_supervisor_darwin.test.js
  tests/gateway/process_supervisor_live.test.js`
  — **30 passed / 0 failed / 0 skipped**, 6.22 s. Exact task PID inventory:
  0 before, 0 after. Exact `/tmp/agents-process-supervisor-*` inventory:
  0 before, 0 after.
- Focal pass 2: the same command — **30 passed / 0 failed / 0 skipped**,
  6.08 s. Exact task PID inventory: 0 before, 0 after. Exact task tmp-prefix
  inventory: 0 before, 0 after.
- Essential injected variants via `node --input-type=module`:
  simultaneous stdout/stderr destination errors — **failed**, second error
  escaped; control writes 1/2 — passed with 0/1 exact fallback signals;
  duplicate transcript errors — **failed**, duplicate escaped; exact
  frame/count/multibyte boundaries — passed.
- Live late-callback probe via
  `PROCESS_SUPERVISOR_TEST_PYTHON=/home/carase/miniconda3/bin/python3 node
  --input-type=module` — returned `timed_out` within bound and naturally
  removed S/R/U, but retained two caller-sink listeners until the delayed
  callback was released.
- Directed JavaScript lint:
  `gateway/node_modules/.bin/eslint --config gateway/eslint.config.js` over
  the production module and all five dedicated JavaScript test/fixture files
  — passed.
- Python lint:
  `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m ruff check
  gateway/src/adapters/process_supervisor_helper.py
  tests/gateway/process_supervisor_caller_harness.py` — passed.
- Python syntax compilation with `compile()` and no bytecode writes over the
  helper and caller harness — 2 passed.
- Structure:
  `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure/test_project_layout.py
  tests/structure/test_node_runtime_contract.py` — **16 passed**.
- Diff hygiene:
  `git diff --check
  60f7060d072f51d5648dbb59452dcb204168bdab..c3ad8d98852198b1afe1538fb30d6850c68b5ac7`
  and request-only diff check — passed.
- Identity gate: exact HEAD/request tree, technical parent/tree, base parent,
  request-only path, branch, and clean intake checks — passed.
- Secret scan: exact technical binary diff piped to
  `gitleaks detect --pipe --redact --no-banner` — no leaks found.

## Cleanup

- Initial task-owned process and tmp inventories were both zero.
- Both complete focal passes were zero before and zero after.
- Injected probes created no OS process or task temporary directory.
- The live listener probe used only its absolute deadline; S/R/U were absent
  before inspection completed. Releasing the caller callback after recording
  the defect was not a process cleanup action.
- No manual signal, `cancel()`, PID-only fallback, pattern signal, broad group
  signal, `killall`, or `pkill` was used by the reviewer.
- Final inventory found 0 task-owned helper/fixture/caller processes and 0
  `/tmp/agents-process-supervisor-*` directories.

## Review limits

- Native execution evidence is Linux 7.0.0-28-generic x86_64, Node 22.22.1,
  configured Python 3.13.13, and Ruff 0.15.16.
- Darwin evidence is source inspection plus the deterministic ordering seam;
  no native macOS run is claimed.
- No aggregate Gateway suite, `scripts/ci.sh`, CI, MCP, Redis, KYA, tmux,
  provider, agent, network service, integration, promotion, or release action
  was run.
- No production, test, ADR, request, plan sheet, manifest, CI, or shared file
  was modified by this review. This result file is the only review change.

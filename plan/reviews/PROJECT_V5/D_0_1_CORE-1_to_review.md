# Review Submission - Task D/0/01 CORE (Trial 1)

## What was done

- Added a standalone async argv-array process supervisor behind
  `createProcessSupervisor()`. It accepts one configured runtime plan, explicit
  utility argv/env/cwd/session identity, stream destinations, one-shot absolute
  deadlines, and deadline-free persistent sessions.
- Added the persistent `S -> R -> U` boundary:
  - detached supervisor `S` is its own PID/PGID/SID;
  - reaper `R` remains an anchored member of S's group and is never replaced;
  - utility leader `U` creates its own PID/PGID/SID and enters the requested
    executable with exact `execve(argv[0], argv, env)`.
- Added Linux subreaper adoption, wait-held leader identity, exact group and
  adopted-child cleanup, bounded TERM/KILL escalation, and complete reaping.
- Added an authenticated pre-exec fallback lease. Caller fallback signals one
  exact stable supervisor PGID only while the persistent R anchor still matches
  PID/start-token/PGID/SID. Invalid or stale leases cause zero signals.
- Removed FIFO from the new design rather than transferring the historical
  FIFO control channel. The strict request rejects FIFO fields, uses
  backpressured pipes, and ignores hostile legacy FIFO environment paths.
- Added safe fixed errors and a control transcript containing identities,
  digests, protocol state, and fixed reasons only. Utility argv/env/output and
  provider error text remain outside it.
- Added the task-owned ADR
  `docs/adr/ADR-V5-D-0-01-async-process-supervisor-core.md`.
- Added dedicated unit, live Linux, private-subreaper caller-loss, process-tree,
  hostile FIFO, no-shell, configured-wrapper, large-output, and Darwin seam
  fixtures/tests.

The integrator-owned shared `plan/PROJECT_V5/D/0/01.md` sheet was intentionally
left byte-identical, as required by the assigned path ownership. This request
and the task-owned ADR carry the core evidence.

## Why

- A process which is replaced by the utility cannot retain cleanup/reap
  authority after supervisor loss.
- A second ambient `python3`, shell fallback, or FIFO utility would create a
  second runtime plan and weaken the configured-wrapper contract.
- A PID-only fallback can target a reused process. The reaper anchor and
  authenticated start-token/group lease keep caller fallback fail-closed.
- Persistent agent sessions must not inherit a reasoning deadline, while
  one-shot work must retain one absolute budget even if its caller disappears.

## Decisions taken

### Process topology

`caller C -> detached supervisor S -> persistent reaper R -> session leader U`
is the only process graph. S owns a CLOEXEC liveness-pipe writer; R owns its
reader and the caller control reader. Caller `SIGKILL` and S `SIGKILL` therefore
become independently observable EOF conditions at R.

R emits authenticated `reaper_ready` before creating U. U then reports its
exact identity and remains blocked until the caller validates the launch
binding and sends `continue`. This orders identity/lease authentication before
direct utility exec.

### Runtime and execution

The configured runtime `{ executable, args, env }` is copied once. Its complete
argument prefix, including wrapper arguments, is preserved and the absolute
helper path is appended. Production code neither searches `PATH` for Python
nor starts another interpreter.

U uses `os.execve` only. `ENOEXEC` is a fixed `PROCESS_EXEC_FAILED`; no shell or
`execvp` fallback exists.

### Deadline and cancellation

One-shot mode requires one absolute Unix-millisecond deadline shared by the
Node scheduler and R. No stage resets it. Persistent mode rejects a deadline
and arms no timer. Cancel/deadline races lock one reason, write one terminate
command, and resolve/reject one completion promise.

### Platform guarantee

- Linux: R activates `PR_SET_CHILD_SUBREAPER`, holds the U leader identity
  until group signaling is complete, kills same-PGID members, discovers
  escaped adopted descendants through its exact child set, signals them only
  after start-token revalidation, and reaps until it has no children.
- Darwin: the production seam registers `kqueue` `EVFILT_PROC/NOTE_EXIT`
  before U release and claims only direct-child leader plus same-PGID cleanup.
  Darwin has no subreaper claim for descendants which escape into a new
  session. Caller numeric fallback is disabled without a native Node
  start-token reader. No native macOS run is claimed by this Linux trial.

## TDD evidence

### RED

1. Initial focal after adding tests:

   `node --test --test-concurrency=1
   tests/gateway/process_supervisor.test.js
   tests/gateway/process_supervisor_darwin.test.js
   tests/gateway/process_supervisor_live.test.js`

   Result: **0 passed / 4 failed** at the surfaced TAP level. Unit/live imports
   failed because `process_supervisor.js` did not exist; Darwin probes failed
   because the helper did not exist. This was the expected first RED.

2. Strict FIFO exclusion RED:

   `node --test --test-concurrency=1
   --test-name-pattern='pipe-only design'
   tests/gateway/process_supervisor_live.test.js`

   Result: **0 passed / 1 failed** with `Missing expected rejection` while an
   unknown `fifoPath` was still accepted. The minimum GREEN added a strict
   request allowlist; the hostile FIFO path then remained unopened/uninvoked.

3. Stream validation RED:

   `node --test --test-concurrency=1
   --test-name-pattern='invalid stream destinations'
   tests/gateway/process_supervisor.test.js`

   Result: **0 passed / 1 failed** with `Missing expected rejection`. The
   minimum GREEN rejects a non-writable sink before runtime creation.

### GREEN

Final focal: **20 passed / 0 failed / 0 skipped**. It includes:

- exact configured runtime/argv/env and `shell: false`;
- absolute budget, persistent no-deadline, timeout/cancel settle-once races;
- invalid/malformed/stale/mismatched/PID-reused fallback lease with zero
  signals, and one exact TERM for a valid lease;
- provider-data-free stream/error boundary;
- Darwin kqueue-before-release ordering;
- configured shebang wrapper with `PATH` containing no Python;
- direct-exec `ENOEXEC` with an untouched shell canary;
- 8 MiB output through a deliberately slow writable with responsive timers;
- timeout cleanup of TERM-resistant same-PGID and escaped/adopted descendants;
- persistent idempotent cancel cleanup;
- S `SIGKILL` after utility/TERM-resistant-descendant markers;
- external caller `SIGKILL` at pre-release, pre-exec, and post-exec gates under
  a private fixture subreaper while preserving an unrelated sentinel; and
- strict FIFO rejection plus a mode-000 hostile FIFO and hostile FIFO utility
  which remain untouched.

## Fixture incident and exact cleanup

An incremental persistent-cancel assertion compared a base process identity
against the public utility projection which also carries `bindingDigest`. It
failed before calling cancel and left its exact fixture tree live:

- runner `2188941`, start `36589148`;
- test worker `2189006`, start `36589170`;
- S `2189014`, start `36589180`, PGID/SID `2189014`;
- R `2189015`, start `36589183`, PGID/SID `2189014`;
- U `2189016`, start `36589183`, PGID/SID `2189016`; and
- escaped descendant `2189023`, start `36589190`, PGID/SID `2189023`.

The residue was disclosed to the coordinating root before cleanup. After
explicit authorization, every identity/start token was revalidated and one
`SIGTERM` was sent to the authenticated S group `-2189014`. R killed and
reaped U plus the escaped descendant; S/R and the test processes then exited.
All six identities and the exact
`/tmp/agents-process-supervisor-gW9zM4` workspace were confirmed absent. No
KILL escalation, pattern kill, broad group, `killall`, or unrelated cleanup
was used.

The test assertion now compares the base identity fields, and every live
execution registers an async `t.after` exact `cancel()` fallback before its
workspace remover. All later focal runs ended with zero task-owned processes
and zero `agents-process-supervisor-*` directories.

## Verification

- `node --test --test-concurrency=1
  tests/gateway/process_supervisor.test.js
  tests/gateway/process_supervisor_darwin.test.js
  tests/gateway/process_supervisor_live.test.js` — **20 passed / 0 failed / 0
  skipped**.
- `gateway/node_modules/.bin/eslint --config gateway/eslint.config.js
  gateway/src/adapters/process_supervisor.js
  tests/gateway/process_supervisor.test.js
  tests/gateway/process_supervisor_live.test.js
  tests/gateway/process_supervisor_darwin.test.js
  tests/gateway/process_supervisor_fixture_child.js
  tests/gateway/process_supervisor_caller_fixture.js` — passed.
- `/home/carase/miniconda3/bin/python3 -c 'from pathlib import Path;
  paths=[Path("gateway/src/adapters/process_supervisor_helper.py"),
  Path("tests/gateway/process_supervisor_caller_harness.py")];
  [compile(path.read_text(encoding="utf-8"), str(path), "exec") for path in
  paths]'` — both Python files compiled without writing bytecode.
- `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure/test_project_layout.py
  tests/structure/test_node_runtime_contract.py` — **16 passed**.
- `git diff --check
  78ddc8f7551ee69d459ed331440eebbe21f57e9d..2fa9311e5ba68f608727b21639fe9e8c1d965ff0`
  — passed.
- `git diff --no-ext-diff --binary
  78ddc8f7551ee69d459ed331440eebbe21f57e9d..2fa9311e5ba68f608727b21639fe9e8c1d965ff0
  | gitleaks detect --pipe --redact --no-banner` — no leaks found.
- Exact final `/proc` inventory plus exact `/tmp` prefix inventory — zero
  task-owned processes and zero task-owned directories.

No aggregate Gateway test, `npm --prefix gateway test`, aggregate runner,
`scripts/ci.sh`, tmux, MCP, Redis, KYA, provider, agent, or network service was
run.

Native evidence is Linux 7.0.0 x86_64 with Node 22.22.1 and the configured
Python 3.13.13 wrapper. Darwin evidence is the deterministic production seam
only.

## Scope and identity

- Base: `78ddc8f7551ee69d459ed331440eebbe21f57e9d`
- Technical commit:
  `2fa9311e5ba68f608727b21639fe9e8c1d965ff0`
- Technical tree:
  `274955c507b092a079dae57e54573bf1958f5e4a`
- Technical range:
  `78ddc8f7551ee69d459ed331440eebbe21f57e9d..2fa9311e5ba68f608727b21639fe9e8c1d965ff0`
- Range size: **9 files / 3,670 insertions / 0 deletions**
- Branch: `feat/V5-D-0-01-core`

The technical commit is directly above the exact base and contains only new
task-owned `process_supervisor*` modules, dedicated fixtures/tests, and the
task-owned ADR. It has no C branch/cherry-pick ancestry and does not modify
agent/lifecycle services, provider adapters, tmux, catalogs, policies,
profiles, packages/locks, contracts, shared sheets/indexes, CI/workflows,
message/coordination/Redis/events/audit paths, or shared documentation.

## Commit

- `2fa9311e5ba68f608727b21639fe9e8c1d965ff0` —
  `feat(supervisor): add async process core (V5 D/0/01 CORE)`

Independent review is requested for Trial 1. This submission makes no
integration, promotion, native-macOS, splice, or release claim.

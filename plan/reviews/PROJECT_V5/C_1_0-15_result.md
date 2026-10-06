# C/1/00 Trial 15 — independent review result

Verdict: **KO**.

Review configuration supplied for this run: **GPT-5.6 Sol; reasoning:
ultra; requested service tier: Priority/Fast**. The execution surface exposed
no service-tier, latency, token, or scheduler telemetry, so this result does
not invent or claim any.

This review is independent of the author. It inspected the submitted Git
objects, the complete Trial 15 technical range, the authoritative Trial 14
`KO`, implementation, tests, ADR-009, runtime/operator documentation, and the
request-only commit. It used only explicit focal inventories which exclude
`tests/gateway/tmux_client.test.js`.

## Reviewed identity and scope

- Authoritative Trial 14 `KO` / Trial 15 base:
  `d1f3fbf3cc537979334e096e8808f318e1f0955f`
  (`tree 38d246068b983e58cbbe287904a04bba09a785eb`).
- Trial 15 implementation commit:
  `599262455ab689a7242e60627f837eb6589c405d`
  (`tree 690a9648afae28d643d4d2e643ef68fd1063da52`).
- Request-only commit:
  `b135a1133c26b7e3cbe17a5318a44a1cf8bb060a`
  (`tree 117663cc40bc07336e8504c65a7b3ac80d42505d`).
- Reviewed technical range:
  `d1f3fbf3cc537979334e096e8808f318e1f0955f..599262455ab689a7242e60627f837eb6589c405d`.
- The implementation is the one commit directly above the declared base; the
  request-only commit is directly above the implementation. The technical
  range contains **12 files, 1,448 insertions, and 64 deletions**. The request
  commit adds only
  `plan/reviews/PROJECT_V5/C_1_0-15_to_review.md`.

## Findings

### P1 — abrupt post-exec supervisor death leaves a utility descendant alive

The new worker parent-death signal protects only the worker/utility leader:

- `gateway/src/adapters/sync_process_mkfifo_supervisor.py:62-79` installs
  `PDEATHSIG(SIGKILL)` on that one process;
- `gateway/src/adapters/sync_process_mkfifo_supervisor.py:597-629` then makes
  the worker a session leader and enters the fixed Node worker;
- `gateway/src/adapters/sync_process_mkfifo.js:56-75` replaces that leader
  with the configured utility; and
- group kill, exact leader wait, and adopted-descendant drain exist only in
  the supervisor at
  `gateway/src/adapters/sync_process_mkfifo_supervisor.py:561-579`.

If the supervisor receives `SIGKILL` after utility exec, it cannot execute
that settlement path. Linux kills the PDEATHSIG-bearing utility leader, but
the setting is not a utility-group or descendant death signal. No independent
process retains group/wait authority, and the synchronous caller's
`gateway/src/adapters/sync_process.js:271-277` failure path has no utility
group containment fallback.

An isolated Linux probe ran the accepted slow-helper shape below a private
subreaper. It recorded exact `/proc` start tokens, PID, PGID, and SID for the
caller, supervisor, utility leader, descendant, and an unrelated sentinel. It
killed only the still-matching supervisor after both utility markers existed:

```json
{
  "caller": {
    "pid": 1863429,
    "start_token": "36303246"
  },
  "supervisor": {
    "pid": 1863449,
    "start_token": "36303254",
    "pgid": 1863449,
    "sid": 1863449
  },
  "utility_leader": {
    "pid": 1863463,
    "start_token": "36303263",
    "pgid": 1863463,
    "sid": 1863463
  },
  "utility_descendant": {
    "pid": 1863513,
    "start_token": "36303271",
    "pgid": 1863463,
    "sid": 1863463
  },
  "sentinel": {
    "pid": 1863428,
    "start_token": "36303245"
  }
}
```

The caller returned the expected provider-data-free
`SYNC_RUNNER_FAILED/CONTROL_SETUP`, the supervisor and utility leader were
absent, and the exact control-directory inventory was empty. After 300
milliseconds, however, descendant PID `1863513` was still alive and adopted
by the private subreaper in the now leaderless utility PGID/SID `1863463`.
The unrelated sentinel remained alive. This directly contradicts the review
request's required proof that supervisor death cannot leave a pre-exec worker
or utility group alive.

The probe paused and disclosed the residue before cleanup. After disclosure,
it verified start token `36303271` again and sent `SIGKILL` only to PID
`1863513`; it separately verified and stopped its own sentinel PID `1863428`,
reaped through the private subreaper, and removed only its exact workspace.
It used no numeric group, SID, pattern, or broad process kill. Final
confirmation found the caller, supervisor, leader, descendant, sentinel, and
PGID/SID members absent, with no control directory left.

Required correction:

- retain utility-group signal authority and descendant wait/reap authority in
  a process which survives abrupt death of the current supervisor, or redesign
  the worker as a surviving reaper which supervises rather than replaces
  itself with the utility;
- ensure supervisor loss after worker release kills and reaps the exact
  utility leader, same-PGID members, and on Linux all adopted descendants,
  while preserving the one absolute deadline and stable safe error contract;
  and
- add a private-subreaper regression which kills the exact supervisor only
  after utility-leader and TERM-resistant child markers exist, then requires
  caller, supervisor, leader, descendants, and controls absent while an
  unrelated sentinel remains alive.

### P2 — valid configured Python wrappers still require an undeclared ambient `python3`

`gateway/src/adapters/sync_process.js:64-65` captures a second fixed
`python3` plus startup `PATH`. At
`gateway/src/adapters/sync_process.js:1080-1086`, any valid configured runtime
plan with shebang arguments is discarded for FIFO supervision and that second
ambient executable is resolved instead.

An isolated probe used a valid absolute `AGENTS_PYTHON_BIN` wrapper whose
direct shebang interpreter was Python 3.13.13, set
`AGENTS_MKFIFO_BIN=/usr/bin/mkfifo`, and imported the adapter with a startup
`PATH` containing no Python. The configured wrapper was sufficient for the
documented provider runtime plan, but the real deadline-bound call failed
before launch with:

```json
{
  "kind": "error",
  "code": "SYNC_RUNNER_UNAVAILABLE",
  "message": "synchronous process runner is unavailable"
}
```

This conflicts with the documented executable override and supported wrapper
contract at `docs/adr/ADR-009-synchronous-provider-boundary.md:28-52`,
`gateway/README.md:210-226`, and `docs/operator-guide.md:93-105`, including
the statement that no ambient second Python is used.

Required correction:

- reuse the already verified interpreter/runtime plan behind the configured
  wrapper for FIFO supervision, or declare and validate a distinct operator
  dependency explicitly;
- do not silently resolve a second import-time ambient `python3`; and
- add a regression with a valid configured shebang wrapper, absolute FIFO
  utility, and startup `PATH` without Python, then align ADR/runtime/operator
  documentation with the implemented dependency.

## Trial 14 blocker and retained boundary assessment

- Trial 14's exact caller-loss blocker is closed for the caller-loss path.
  The full focal passed once, then the exact private-subreaper caller-death
  regression passed **5/5** more times. Each run recorded exact
  caller/supervisor/leader/child identities and controls, removed every owned
  identity and control, and preserved its unrelated sentinel.
- The complete synchronous boundary passed **55/55** with zero skips. It
  retained false host ELF/Mach-O rejection, slow and failed utility handling,
  missing override, restrictive umask and ownership checks, tiny budgets, the
  one absolute deadline, bootstrap/runner caller death, native provider
  signals, small-buffer behavior, `ENOBUFS`, near-deadline overflow, and exact
  normal/caller-loss cleanup.
- Static inspection confirms Node starts only `process.execPath` at
  `gateway/src/adapters/sync_process.js:218-243`. The configured FIFO utility
  reaches Node only as data and is entered solely by
  `process.execve(command, [command, "-m", "600", file], {})` at
  `gateway/src/adapters/sync_process_mkfifo.js:56-75`. No Node
  `spawn`/`spawnSync` receives the utility pathname.
- Caller observation and the absolute deadline are armed before worker
  supervision at
  `gateway/src/adapters/sync_process_mkfifo_supervisor.py:715-733`.
  Worker PDEATHSIG precedes `setsid`, release, and exec; group kill precedes
  leader wait and Linux descendant drain. Linux PID/start-token matching and
  wait-held leader identities fail closed. Cleanup uses exact retained
  descriptors and only the three control names. These properties do not cure
  P1 once the sole supervisor is killed.
- The Darwin `kqueue` registration/poll seam and ordering test passed. Source
  inspection found no use of Linux `waitid` in the Darwin worker observer.
  This is deterministic seam evidence only; no native macOS execution is
  claimed.
- The disposable stdio MCP bootstrap passed **1/1** and listed all **33**
  tools with `AGENTS_MKFIFO_BIN=/definitely/missing/mkfifo`. Resolution
  remains lazy enough for import/list availability, and the missing-utility
  call retains provider-data-free `SYNC_RUNNER_FAILED/CONTROL_SETUP`.
- The concrete Codex, Claude, and Gemini resistant-process-group lifecycle
  focal passed **4/4**. Node runtime structure passed **14/14**. Gateway lint
  passed.

## Historical process incident and current replay

An external repository audit reported historical PID `655903`, start token
`35503614`, with the exact C/1/00 worktree cwd and command
`/bin/sh -c "trap '' TERM; while :; do :; done"`. It predated the Trial 15
candidate. Root verified that exact identity, used `SIGKILL` because the
fixture intentionally ignored `SIGTERM`, and confirmed it absent.

This review separately replayed the exact strict-20-millisecond path once
under a private subreaper, then ran **50** isolated test processes for **500**
more exact calls. Every call retained the configured `TIMEOUT` bound and all
50 subreaper inventories were empty. The complete 55-test focal also left no
process matching the exact command plus worktree cwd. The historical orphan
was therefore not reproduced against `599262455`; it is distinct from the
fresh, deterministic post-exec supervisor-death P1 above.

## Verification

- `node --test --test-concurrency=1
  tests/gateway/sync_process_deadline.test.js` — **55 passed / 0 failed / 0
  skipped** in 31.3 seconds.
- Exact FIFO caller-death focal, repeated after the complete focal — **5/5
  passed**, about 363–432 milliseconds per focal.
- Exact strict-20-millisecond private-subreaper replay — **1 passed**, then
  **50 isolated processes / 500 calls**, zero adopted descendants.
- Abrupt post-exec supervisor-death private-subreaper probe — reproduced P1;
  exact residue was disclosed, then exact cleanup was independently confirmed.
- Valid configured-wrapper/no-ambient-Python probe — reproduced P2 and removed
  only its own temporary workspace.
- `node --test --test-concurrency=1
  tests/gateway/mcp_bootstrap.test.js` — **1/1 passed** and all 33 tools
  listed.
- `node --test --test-concurrency=1
  --test-name-pattern='concrete delegates terminate SIGTERM-resistant
  headless process groups without live descendants'
  tests/gateway/lifecycle_service_ordering.test.js` — **4/4 passed**.
- `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure/test_node_runtime_contract.py` — **14/14 passed**.
- `npm --prefix gateway run lint` and technical-range
  `git diff --check` — passed.
- `python3 scripts/ci_gate.py --validate-only` — intentionally ran zero tests
  and returned the expected `invalid_manifest`; its sole error is stale
  `lint.gateway`, whose required digest is
  `sha256:0b658ea4d8c4dede21d4670ec1f7d72ab31d33729f9446f77d4eab5daca33dbc`.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
  The technical range has no diff in `ci/suites.json`,
  `plan/PROJECT_V5/SHEETS.md`, or `plan/PROJECT_V5/C/README.md`.

## Limits and integration gates

- Host evidence is Linux 7.0.0 x86_64 with Node 22.22.1 and Python 3.13.13.
  Native macOS and the configured remote Python 3.11/3.12 rows were not run
  and are not inferred from deterministic seams.
- The stale tracked-manifest digest and combined repository CI remain
  integrator-owned gates. This review claims no complete CI, integration,
  promotion, release, or native-macOS result.
- No aggregate Gateway test, `npm --prefix gateway test`, Gateway aggregate
  runner, `scripts/ci.sh`, tmux operation, shared MCP/KYA/Redis/PostgreSQL/
  Temporal service, real provider, credential, or external network service
  was run or touched. The only MCP process was the disposable stdio bootstrap
  above.
- Final review cleanup found no task-owned process residue and no
  `/tmp/agents-sync-control-*` directory.

## Final status

Task `V5 C/1/00`, Trial 15: **reviewed KO — human intervention required**.

Trial 15 cannot close while abrupt post-exec supervisor death leaves an owned
utility descendant alive, and its FIFO supervisor runtime silently depends on
an undeclared second ambient `python3` for otherwise supported configured
wrappers. Per the 15-trial limit, no Trial 16 should start without human
direction. This result does not authorize integration, promotion, or release.

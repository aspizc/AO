# C/1/00 Trial 14 — independent review result

Verdict: **KO**.

Review configuration supplied for this run: **GPT-5.6 Sol; reasoning:
ultra; requested service tier: Priority/Fast**. The execution surface exposed
no service-tier, latency, token, or scheduler telemetry, so this result does
not invent or claim any.

This review is independent of the author. It inspected the submitted Git
objects, the complete Trial 14 technical range, the authoritative Trial 13
`KO`, implementation, tests, ADR-009, runtime/operator documentation, and the
request-only commit. It used only explicit focal inventories which exclude
`tests/gateway/tmux_client.test.js`.

## Reviewed identity and scope

- Authoritative Trial 13 `KO` / Trial 14 base:
  `5f536d93b1d2b6fc3abb09a327fbb50941fdce1d`
  (`tree 74ed0045266035a4e34b5ef9e6161c82cb4dbb04`).
- Trial 14 implementation commit:
  `ad8bdd0c3c69054b3b6e73e74b528449dfca478a`
  (`tree 483cf6383b8dffcd8cbdb644856680ee02ee2418`).
- Append-only ownership correction:
  `2e0ba12085d2818a4f80649c2593cef9cc6f1c29`
  (`tree e4103282a10f43d8514520e868c56f766981f5bf`).
- Request-only commit:
  `fe03bf5191e26064c6da4d3456dc2b11c93fbfef`
  (`tree a0dd2cb0cbe1252b6e56b2b7446b15a9d9ca92f8`).
- Reviewed technical range:
  `5f536d93b1d2b6fc3abb09a327fbb50941fdce1d..2e0ba12085d2818a4f80649c2593cef9cc6f1c29`.
- The four commits form the declared direct-parent chain. The technical range
  contains **11 files, 509 insertions, and 56 deletions**. The request commit
  adds only `plan/reviews/PROJECT_V5/C_1_0-14_to_review.md`.
- `e4103282a10f43d8514520e868c56f766981f5bf` is a Git tree, not a commit; it
  is exactly the final technical tree of `2e0ba120`.

## Blocking finding

### P1 — caller death during FIFO setup leaves the helper group and private controls alive

The new FIFO helper runs before the caller has started the liveness watchdog:

- `gateway/src/adapters/sync_process.js:189-219` resolves the utility and
  blocks in detached `spawnSync(process.execPath, ...)`;
- `gateway/src/adapters/sync_process.js:963-988` completes all control setup
  before it starts the fixed bootstrap;
- only that later bootstrap starts the watchdog at
  `gateway/src/adapters/sync_process_bootstrap.js:91-156,182-184`; and
- after `gateway/src/adapters/sync_process_mkfifo.js:39-43` succeeds, the
  helper has become the configured utility through `process.execve` and has no
  JavaScript parent-death, FIFO-liveness, or subreaper path of its own.

The live-caller timeout path can send `SIGKILL` only after `spawnSync` returns
an `ETIMEDOUT` result. If the synchronous Gateway caller instead dies while
that call is blocked, neither `containHelperProcessGroup` nor the caller's
control-file `finally` can run.

An isolated Linux probe used the same accepted slow-helper seam as the focal
test: `AGENTS_MKFIFO_BIN=/bin/sh`, a local `600` script which marked its own
PID and one child, and a five-second absolute budget. After both identities
were published, the probe sent exact `SIGKILL` to the blocked Node caller.
After 250 milliseconds it observed:

```json
{
  "callerSignal": "SIGKILL",
  "helper": {
    "pid": 1498074,
    "pgid": 1498074,
    "cmdline": "/bin/sh -m 600 /tmp/agents-sync-control-1498067-FgL9Ow/liveness"
  },
  "child": {
    "pid": 1498081,
    "pgid": 1498074,
    "cmdline": "/bin/sleep 10"
  },
  "helperSurvivedCaller": true,
  "childSurvivedCaller": true,
  "controlsStillPresent": [
    "/tmp/agents-sync-control-1498067-FgL9Ow"
  ]
}
```

The probe used `/proc/<pid>/stat` start times to retain exact identities. Its
defensive cleanup then killed only the still-matching helper group and removed
only the recorded control directory. Independent read-only confirmation found
both PIDs and the directory absent afterward.

This is not covered by the retained caller-death test at
`tests/gateway/sync_process_deadline.test.js:3585`: that test kills the caller
only after FIFO setup has finished and the bootstrap runtime plus watchdog are
already running. The new slow-helper test at
`tests/gateway/sync_process_deadline.test.js:2935` keeps the caller alive, so
its native timeout and private test subreaper cannot prove caller-loss
containment.

The defect violates the exact-caller-loss and cleanup boundary which this
process path is designed to provide. A stuck or incorrect operator-selected
utility may outlive the Gateway indefinitely, retain descendants, and leave
0600/0700 controls behind.

Required correction:

- establish exact caller-loss supervision before the configured utility can
  run, not only after FIFO creation;
- keep exact signal/wait authority and a reserved process-group identity until
  the helper leader and all owned descendants are killed and reaped;
- retain the same service-owned absolute deadline and provider-data-free error
  contract;
- clean only the validated control names/directory; and
- add a private-subreaper regression which kills the exact caller after helper
  and child markers exist, then requires caller, helper, descendants, and
  controls absent while an unrelated sentinel remains alive.

## Trial 13 findings otherwise closed

- **False host-native image:** the 53-test focal recreated a same-host loader
  prefix followed by shell text. The sentinel remained absent and the call
  failed as `SYNC_RUNNER_FAILED/CONTROL_SETUP`. Static inspection confirms the
  utility pathname reaches Node only as data to the fixed helper:
  `sync_process.js:199-215` starts `process.execPath`, and the helper performs
  the only utility entry through `process.execve` at
  `sync_process_mkfifo.js:39-43`. No later Node `spawn`/`spawnSync` receives
  the utility pathname.
- **Closed helper argv/environment:** the helper accepts exactly one absolute
  utility and one validated private `.../agents-sync-control-*/liveness` path,
  rejects extra arguments, enters exactly
  `[command, "-m", "600", liveness]`, and supplies `{}` as the utility
  environment. Provider argv, environment, and input do not reach this path.
- **One live-caller deadline:** all setup checkpoints call the same
  `remainingDeadlineMs` object, the helper receives only the remaining
  timeout, the final bootstrap receives the next remainder, and a native
  helper timeout maps to exact lifecycle `TIMEOUT`. The focal assertions for
  20-millisecond classification/ceiling, same-PGID child removal, exact
  controls, and no residue passed.
- **Lazy dependency and MCP availability:** module import captures only the
  setting and startup `PATH`; filesystem resolution occurs per deadline-bound
  call. With `AGENTS_MKFIFO_BIN=/definitely/missing/mkfifo`, the disposable
  MCP server initialized and listed all **33** tools, while the isolated
  deadline-bound call returned the stable provider-data-free
  `SYNC_RUNNER_FAILED/CONTROL_SETUP`.

These passes close the three Trial 13 findings for a live caller. They do not
close the newly reproduced caller-death window.

## Retained boundary assessment

- The focal file passed **53/53** with zero skips. It retained exact modes,
  current uid/gid descriptor ownership, restrictive umask, runtime
  caller-death after watchdog readiness, watchdog PGID reservation,
  TERM-resistant pre-launch runtime containment, residual same-PGID cleanup,
  bounded control transcripts, provider signals, native `ENOENT`, `DataView`
  byte ranges, unusual environment names, output encodings, native
  `ENOBUFS`, and near-deadline cleanup.
- The concrete Codex, Claude, and Gemini resistant-process-group lifecycle
  focal passed **4/4** (parent plus three provider subtests), with no live
  synthetic descendants.
- Linux/WSL retain subreaper, parent-death, raw `execve`, leader identity,
  adopted-child drain, deadline, signal, and result-authentication paths.
- The Darwin kqueue/PGID seams were inspected and their deterministic seam
  tests passed. This host was Linux x86_64; no native Darwin execution is
  claimed.
- The deadline-bound runtime, launcher, provider, and FIFO-utility entries use
  direct `execve`; no Node `ENOEXEC`/shell fallback was found in those routes.
  The documented no-deadline compatibility path remains the pre-existing
  direct `spawnSync` behavior and was not changed by Trial 14.

## Verification

- `node --test --test-concurrency=1
  tests/gateway/sync_process_deadline.test.js` — **53 passed / 0 failed / 0
  skipped**.
- `node --test --test-concurrency=1
  tests/gateway/mcp_bootstrap.test.js` — **1 passed / 0 failed / 0 skipped**;
  the disposable server listed all 33 tools with the configured helper absent.
- `node --test --test-concurrency=1
  --test-name-pattern='concrete delegates terminate SIGTERM-resistant
  headless process groups without live descendants'
  tests/gateway/lifecycle_service_ordering.test.js` — **4 passed / 0 failed /
  0 skipped**.
- `npm --prefix gateway run lint` — passed.
- `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure/test_node_runtime_contract.py` — **14 passed**. The ambient
  `python3` did not contain pytest, so it is not claimed as a test executor.
- `python3 scripts/ci_gate.py --validate-only` — expected nonzero
  `invalid_manifest`; its sole error is stale `lint.gateway` inventory, with
  required value
  `sha256:dda1de08373b8816dfa3e3d8ebdfaec85b17bdf8d4f417ac431ffe5233f10e70`.
  This validation did not execute any suite.
- `git diff --check
  5f536d93b1d2b6fc3abb09a327fbb50941fdce1d..2e0ba12085d2818a4f80649c2593cef9cc6f1c29`
  — passed.
- Isolated exact-identity FIFO-helper caller-death probe — reproduced the P1
  above; helper, child, and controls survived the caller, then defensive exact
  cleanup was confirmed.

No aggregate Gateway test, `npm test`, full repository CI, or command which
could include `tests/gateway/tmux_client.test.js` was run. No tmux session was
created, listed, signalled, or killed.

## Integrity, ownership, and integration gates

- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- The technical range changes no message implementation, audit publisher,
  Redis coordination transport, policy, migration, dependency, or
  `agents:events` behavior.
- The base and final technical trees use identical blobs for:
  - `ci/suites.json`:
    `937b4120b04f14a8ccc7bc182ccf239033dc3969`;
  - `plan/PROJECT_V5/SHEETS.md`:
    `202bc87849d538a21e7be825e0e0ac4747750043`; and
  - `plan/PROJECT_V5/C/README.md`:
    `e61e4a1f992c504300376000315159b20cd48733`.
- The ownership correction therefore has zero net effect on the shared Stage C
  index. The stale lint inventory, `SHEETS.md`, and Stage C index remain
  explicit integrator-owned gates; this review does not silently authorize or
  update them.
- Shared Redis, MCP, KYA, PostgreSQL, Temporal, real providers, credentials,
  and external services were not contacted, restarted, stopped, flushed, or
  reconfigured. The only MCP process was the disposable stdio bootstrap
  described above.

## Limits

- Host evidence is Linux 7.0.0 x86_64 with Node 22.22.1. The runner focal used
  the available Python 3.13.13 runtime; the structure test used the existing
  isolated pytest environment.
- Native macOS and the configured remote macOS 3.11/3.12 rows were not
  executed and are not inferred from deterministic seams.
- The integrator-owned tracked-manifest combined gate was intentionally not
  run. No full-CI, integration, promotion, or release claim follows from the
  green focal checks.

## Final status

Task `V5 C/1/00`, Trial 14: **reviewed KO**.

Trial 14 cannot close while caller death during the newly introduced FIFO
helper stage leaves the helper process group, its descendant, and the private
control directory alive. This result does not authorize integration,
promotion, release, or a Trial 14 `OK` claim.

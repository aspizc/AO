# C/1/00 Trial 13 — independent review result

Verdict: **KO**.

Execution profile: **GPT-5.6 Sol; reasoning: ultra; service tier:
Priority/Fast.**

This review is independent of the author. It inspected the submitted Git
objects, the complete Trial 13 correction range, the authoritative Trial 12
result, implementation, tests, CI manifests, ADRs, runtime documentation, and
operator guidance. It ran the focal and complete gates and added isolated
hostile-utility probes without using shared Redis/MCP/KYA, real providers,
tmux, or credentials.

## Reviewed identity and scope

- Authoritative Trial 12 `KO` / Trial 13 base:
  `e3a137e0305264fef4c60b96618049d3b6e81346`
  (`tree 89df10a94a0a93a4166fb93a8ca01a6e75180ee5`).
- Trial 13 technical commit:
  `61a0a551c012ede8bc979db76a1e9270210ffad9`
  (`tree 1e16067663d8a9220f11895dbf7b3b10bf7255c9`).
- Trial 13 request commit:
  `f00a0250e5529db3b969829bd0d2d9c9e827ddc3`
  (`tree fd964a0e3b4254db44072bc1dcac16ae061215c2`).
- The technical commit is the direct child of the authoritative Trial 12
  result. The request is the direct child of the technical commit and adds
  only `plan/reviews/PROJECT_V5/C_1_0-13_review.md`.
- The technical range contains the declared **21 files, 2,220 insertions, and
  177 deletions**. No implementation is hidden in the request commit.

## Blocking findings

### P1 — the FIFO helper reintroduces Node's `ENOEXEC` shell fallback

`MKFIFO_COMMAND` is resolved at module evaluation in
`gateway/src/adapters/sync_process.js:52-54`. At
`gateway/src/adapters/sync_process.js:170-183`,
`openPrivateLivenessFifo` checks only the path's four-byte host-loader prefix
through `verifyNativeExecutable` and then passes that pathname to Node
`spawnSync`. That is the same unsafe split which Trial 12 rejected for the
configured Python runtime: verification does not make a later Node spawn
immune to libuv's `ENOEXEC` shell fallback.

An independent Linux probe set `AGENTS_MKFIFO_BIN` to a mode-0700 regular file
containing a valid ELF magic prefix followed by shell text. The shell body
wrote a sentinel and delegated to the real `mkfifo`. The submitted production
boundary then accepted the FIFO and completed the provider:

```json
{"kind":"result","status":0,"signal":null,"error":null,"sentinel":true}
```

The sentinel proves that shell text executed inside a path which ADR-009 calls
a required native executable. This contradicts the central no-shell decision
at `docs/adr/ADR-009-synchronous-provider-boundary.md:29-57`, the Gateway
contract at `gateway/README.md:214-226`, and the Trial 13 request's assertion
that no fallback participates. The test suite contains no
`AGENTS_MKFIFO_BIN` or false-native FIFO-helper regression; its only direct
`mkfifo` occurrence creates a special-file runtime fixture.

Minimal correction: create the FIFO through a syscall-capable fixed helper or
an authenticated direct-`execve` path which cannot invoke Node's fallback.
Regress a corrupt same-host image whose shell body would create a sentinel,
and require the sentinel to remain absent.

### P1 — FIFO setup can overrun the lifecycle deadline by about one second

`remainingDeadlineMs` computes the service budget before
`createNativeControlFiles`, but `openPrivateLivenessFifo` starts its helper
with an unrelated fixed `timeout: 1_000` at
`gateway/src/adapters/sync_process.js:173-181`. The watchdog which owns the
absolute deadline does not exist yet. A slow or incorrect native utility can
therefore block outside both the native launch timeout and the watchdog.

An independent probe used the host-native `/bin/sh` as the override and an
isolated `600` script which did not return. A call with a 20-millisecond
absolute deadline produced:

```json
{"kind":"throw","code":"SYNC_RUNNER_FAILED","runnerCode":"CONTROL_SETUP","message":"synchronous process runner failed","elapsedMs":1006}
```

The boundary exceeded its deadline by roughly 986 milliseconds and returned
the wrong public classification. This contradicts the sheet's retained exact
`TIMEOUT` contract, ADR-009's service-owned absolute-deadline decision, and the
request's claim that the watchdog owns the same deadline from bootstrap
onward.

Minimal correction: include all control/FIFO preparation in the remaining
absolute budget, bound helper execution by that remaining budget, and map
expiry to the existing lifecycle `TIMEOUT`. Add a slow native-helper
regression which proves elapsed time, error classification, cleanup, and
absence of descendants.

### P2 — a missing FIFO utility prevents the entire MCP server from importing

The eager `resolveExecutable` call at
`gateway/src/adapters/sync_process.js:52-54` throws during module evaluation.
`gateway/src/tools/index.js:1-3` eagerly imports all three adapters, so a typo
in `AGENTS_MKFIFO_BIN` or a startup `PATH` without `mkfifo` prevents
`gateway/src/mcp_server.js` from serving any tool, including calls which never
use a deadline-bound provider.

Both an isolated module import and the real MCP entry point with
`AGENTS_MKFIFO_BIN=/definitely/missing/mkfifo` failed immediately with raw:

```json
{"code":"ENOENT","message":"configured runner runtime is not executable"}
```

The failure occurs before MCP error handling and does not become the documented
`SYNC_RUNNER_FAILED`. This conflicts with
`docs/operator-guide.md:92-99,203-204`, which describes a failure of a real
headless delegate, and makes an optional override a whole-Gateway availability
dependency.

Minimal correction: resolve and cache the helper lazily at the first
deadline-bound call, or perform explicit startup validation without importing
an optional adapter dependency into every tool. Missing or invalid helper
state must produce the documented safe per-call error while unrelated tools
remain available. Add an MCP registry/smoke regression with `mkfifo` absent.

## Trial 12 blockers closed by the submitted runtime path

- The real configured-runtime path now starts the fixed bootstrap under
  `process.execPath` and enters the exact runtime plan with
  `process.execve`. The 50-test focal exercised a false same-host ELF image and
  kept its fallback sentinel absent while returning
  `SYNC_RUNNER_UNAVAILABLE`.
- `/usr/bin/env` wrappers reject absolute and relative slash-bearing targets.
  A valid bare target is resolved against the effective cwd/`PATH`, entered
  directly at both runtime stages, and a false native target does not execute
  its shell sentinel.
- Bootstrap, launcher, and runner records retain canonical ordering, exact
  record shapes, bounded raw controls, and native outcome binding. Missing,
  duplicate, reordered, malformed, and mismatched forms fail closed.
- The control directory and files are created with exact modes independent of
  umask, ownership transfer uses retained descriptors with the directory
  transferred last, launcher fd3/fd4 mapping is explicit, and cleanup does not
  recurse.
- Applicable Linux tests retained exact caller death, watchdog PGID
  reservation, TERM-resistant pre-launch containment, residual same-PGID
  cleanup, unrelated-sentinel survival, provider signals, timeout, and
  `ENOBUFS`.

These passes close the two Trial 12 findings but do not cure the separate FIFO
helper boundary above.

## Verification

- Isolated focal:
  `node --test --test-concurrency=1
  tests/gateway/sync_process_deadline.test.js` — **50 passed, 0 failed,
  0 skipped**.
- Node runtime contract:
  `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure/test_node_runtime_contract.py` — **14 passed**.
- CI suite manifest:
  `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` — **87 passed**.
- Resistant lifecycle focal:
  `node --test --test-concurrency=1
  --test-name-pattern='concrete delegates terminate SIGTERM-resistant
  headless process groups'
  tests/gateway/lifecycle_service_ordering.test.js` — **4 passed**
  (one parent plus Codex, Claude, and Gemini subtests).
- `cd gateway && npm run lint` — passed.
- Strongest isolated `bash scripts/ci.sh`, with Redis, PostgreSQL, Temporal,
  real-provider, and real-E2E opt-ins absent, exited zero and accounted for
  **1,208 tests / 1,196 passed / 12 exact allowlisted infrastructure or opt-in
  skips / 0 failed**. It included structure **233/233**, Gateway
  **824 passed / 9 PostgreSQL skips**, E2E **24/24**, CLI **29/29**,
  LangGraph **81 passed / 3 opt-in skips**, lock/lint/policy validation, and
  the disposable MCP smoke.
- Independent false-native `AGENTS_MKFIFO_BIN` probe — provider status 0 and
  fallback sentinel present, reproducing P1.
- Independent 20-millisecond slow-helper probe — approximately
  **1,006 milliseconds**, `SYNC_RUNNER_FAILED/CONTROL_SETUP`, reproducing P1.
- Independent module and real MCP entry-point probes with a missing helper —
  raw import-time `ENOENT`, reproducing P2.
- `git diff --check` passed for both the technical and request ranges.

## Portability limitation

No native macOS host or executor was available. `uname -a` identified Linux,
and `sw_vers` was unavailable. This review inspected the Darwin seams and the
configured `macos-15` Python 3.11/3.12 rows but does not convert configuration,
Linux execution, or deterministic seam tests into native macOS evidence.

## Integrity and containment

- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- The technical range changes no migration, policy, coordination Redis
  transport, legacy `message.*`, `agents:events`, root `README.md`, or
  `audit/` content.
- The private test subreaper waits for and reaps its complete synthetic domain;
  the complete focal and authoritative gate reported `completed`, not
  `process_tree_leak`. No synthetic control directory or boundary process
  remained after the probes.
- Shared Redis/MCP/KYA, PostgreSQL, Temporal, real providers, tmux,
  credentials, and external services were not contacted, restarted, stopped,
  flushed, or reconfigured.

## Final status

Task `V5 C/1/00`, Trial 13: **reviewed KO**.

Trial 13 cannot close while its newly introduced FIFO helper can execute a
false native image through Node's shell fallback, can consume a fixed
one-second setup timeout outside the lifecycle deadline, and can prevent the
entire MCP server from importing when an optional helper setting is absent or
incorrect. This result does not authorize integration, promotion, release, or
a Trial 13 `OK` claim.

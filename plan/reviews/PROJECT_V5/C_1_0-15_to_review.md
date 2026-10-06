# Review Submission — Task C/1/00 (Trial 15)

Status: **Pending independent review**.

C/1/00 remains
`in_progress; Trials 1-14 KO preserved; Trial 15 review pending`. This request
claims no `OK`, integration, promotion, release, or complete tracked-manifest
CI result. The reviewer must be independent of the author and publish a
separate append-only verdict.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Authoritative Trial 14 `KO` / Trial 15 base:
  `d1f3fbf3cc537979334e096e8808f318e1f0955f`.
- Trial 15 implementation commit:
  `599262455ab689a7242e60627f837eb6589c405d`.
- Final technical tree:
  `690a9648afae28d643d4d2e643ef68fd1063da52`.
- Review range:
  `d1f3fbf3cc537979334e096e8808f318e1f0955f..599262455ab689a7242e60627f837eb6589c405d`.
- Net range: 12 files, 1,448 insertions, and 64 deletions.

This request is a separate request-only commit and contains no implementation.
Trials 1-14 and their append-only requests and verdicts remain preserved.

## What was done

- Added a fixed FIFO-setup supervisor entered through the fixed Node helper.
  Node starts only `process.execPath`; it never supplies the configured FIFO
  utility as a Node spawn command. The worker's final transition is
  `process.execve(command, [command, "-m", "600", liveness], {})`.
- On Linux the supervisor installs subreaping, verifies the exact caller PID
  and `/proc` start token, and arms caller parent-death observation before it
  releases the gated worker. The worker installs
  `PDEATHSIG(SIGKILL)` against its exact supervisor before `setsid` and utility
  exec.
- On Darwin the corresponding pre-release caller and worker observations use
  `kqueue` `EVFILT_PROC` / `NOTE_EXIT`. Their deterministic seams are covered;
  this local Linux evidence does not claim native Darwin execution.
- The supervisor retains process-group and wait authority until it has killed
  the owned group when required, reaped the utility leader, and, on Linux,
  drained adopted descendants. Caller loss, timeout, exec failure, ordinary
  failure, and successful completion consume the same service-owned absolute
  deadline.
- Cleanup validates retained parent/directory descriptors, ownership, modes,
  file types, links, and path identity. It unlinks only `runner`, `launcher`,
  and `liveness` and removes only that exact empty private directory.
- Trial 14's accepted properties remain: lazy FIFO-utility resolution,
  provider-data-free `CONTROL_SETUP`, disposable MCP import and tool listing,
  false ELF/Mach-O rejection without Node fallback, and exact `TIMEOUT`
  behavior.
- ADR-009, architecture, runtime/operator guidance, Gateway documentation, and
  the append-only task evidence now describe the supervised boundary.

## TDD evidence

RED first added
`FIFO setup supervision contains helper descendants when the exact caller
dies`. Under a private Linux subreaper, the accepted slow-helper seam published
the utility leader and TERM-resistant child PID, PGID, and start tokens.
Killing the exact synchronous caller left those processes and its controls
alive; the test failed after about 2.2 seconds with
`FIFO setup descendants outlived the killed caller`.

GREEN records the exact caller, supervisor, utility leader, child, control
directory, and an unrelated sentinel. Five consecutive post-correction runs
prove all four owned identities and the exact controls are absent before the
private subreaper returns, while the unrelated sentinel remains alive. The
complete synchronous boundary then passed 55/55.

A deterministic ordering test also proves that caller observation and the
absolute deadline are armed before worker release, worker parent-death
protection precedes `setsid` and `execve`, group kill precedes leader reap and
adopted-child drain, the Darwin observer is registered, and cleanup has no
recursive deletion path.

## Verification

- `node --test --test-concurrency=1
  tests/gateway/sync_process_deadline.test.js` — **55 passed / 0 failed / 0
  skipped** in about 32.9 seconds.
- The private-subreaper caller-death focal, repeated after the final worker
  parent-death correction — **5/5 passed**, about 309-329 milliseconds each.
- `node --test --test-concurrency=1
  tests/gateway/mcp_bootstrap.test.js` — **1/1 passed**; the disposable stdio
  server listed all 33 tools with
  `AGENTS_MKFIFO_BIN=/definitely/missing/mkfifo`.
- `node --test --test-concurrency=1
  --test-name-pattern='concrete delegates terminate SIGTERM-resistant
  headless process groups without live descendants'
  tests/gateway/lifecycle_service_ordering.test.js` — **4/4 passed**.
- `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure/test_node_runtime_contract.py` — **14/14 passed**.
- `npm --prefix gateway run lint`, `git diff --check`, and
  `gitleaks protect --staged --redact --no-banner` — passed.
- `python3 scripts/ci_gate.py --validate-only` — intentionally ran no tests
  and returned the expected `invalid_manifest` because the integrator-owned
  `lint.gateway` inventory remains stale. Its required digest is
  `sha256:0b658ea4d8c4dede21d4670ec1f7d72ab31d33729f9446f77d4eab5daca33dbc`.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.

The first selected lifecycle focal retained its old 500-millisecond synthetic
budget. Supervised control setup consumed enough of it that the provider marker
did not start; no process leaked. The fixture budget was moved to 900
milliseconds with a 1,300-millisecond elapsed ceiling, preserving its exact
configured `TIMEOUT`, and the focal then passed 4/4. The near-deadline
`ENOBUFS` fixture was similarly moved from a 900- to 1,500-millisecond deadline
and retains its bounded near-deadline overflow assertion.

## Incident disclosure and cleanup

An external repository audit found one pre-exec worker orphan from an early
focal iteration: PID `1662925`, PGID `1662918`. Root sent `TERM` only to that
exact recorded PID. This was not accepted as GREEN. The worker parent-death
fallback described above was then added, and the 5/5 caller-death repetitions
plus final 55/55 boundary are all post-correction evidence.

Before sealing this request, the same read-only audit found two old RED-era
control directories created at approximately 18:40:12/13 for now-absent caller
PIDs `1662756` and `1662862`. Each contained only 0600 `runner` and `launcher`
files and no `liveness` FIFO. Root moved only those exact directories
recoverably from `/tmp` to Trash, renamed with
`agents-orchestrator-v5-c100-red-control-*`; it did not perform a pattern
deletion. A final exact
`find /tmp -mindepth 1 -maxdepth 1 -type d -name
'agents-sync-control-*' -print` returned no entries.

No broader process scan, numeric group kill, or recursive cleanup is claimed
as production behavior.

## Integrator-owned sealing and limits

The parallel-lane agreement reserves shared indexes, manifests, and workflows
to the integrator. This range therefore does not modify:

- `ci/suites.json`;
- `plan/PROJECT_V5/SHEETS.md`;
- `plan/PROJECT_V5/C/README.md`; or
- repository workflows, policy, dependencies, migrations, `message.*`, or
  `agents:events`.

The integrator must update the one manifest digest, run tracked-manifest
combined CI, and bind its counts before integration. This author does not
claim a full repository gate on the final technical tree.

No aggregate Gateway test, `npm test`, full CI, tmux-materializing test, shared
MCP, Redis, KYA, PostgreSQL, Temporal, real provider, credential, or network
service was run or touched. Native Darwin was not executed.

## Required independent review

Use **GPT-5.6 Sol, reasoning ultra, Priority/Fast** and review the Git objects,
not this summary. At minimum:

1. Bind the review to the exact base, implementation commit, range, and final
   technical tree above.
2. Reproduce exact caller death during FIFO utility setup below a private
   subreaper. Record caller, supervisor, utility leader, descendant, controls,
   and unrelated sentinel identities. Require every owned identity and the
   exact directory absent while the sentinel remains alive.
3. Audit every pre-release race. Prove caller observation and the absolute
   deadline are armed before worker release, and prove supervisor death cannot
   leave a pre-exec worker or utility group alive.
4. Prove Node can launch only `process.execPath`, the utility pathname never
   becomes a Node spawn command, and the worker's only final utility entry is
   the exact empty-environment `process.execve` contract.
5. Re-run the false host ELF/Mach-O sentinel, live-caller timeout, missing
   override, and disposable MCP import/list cases. Require exact `TIMEOUT`,
   provider-data-free `CONTROL_SETUP`, no shell fallback, and all 33 tools.
6. Review Linux subreaper/adopted-child handling and the Darwin `kqueue`
   ordering seams separately. Do not infer native Darwin execution from this
   Linux evidence.
7. Verify cleanup can remove only the three validated control names and their
   exact empty directory, across completion, caller loss, timeout, exec
   failure, ordinary failure, and signal races.
8. Regress restrictive umask, uid/gid ownership, tiny budgets, bootstrap and
   runner caller death, resistant pre-launch runtime, residual same-PGID
   cleanup, native signals, small buffers, and near-deadline `ENOBUFS`.
9. Audit both incident disclosures and distinguish pre-correction evidence
   from the final post-correction repetitions.
10. Treat the stale manifest digest and combined tracked-manifest CI as
    explicit integration gates. Do not run tmux or touch shared services,
    providers, or credentials from a subagent.

Publish the verdict only in:

`plan/reviews/PROJECT_V5/C_1_0-15_result.md`

The verdict must bind the full technical range and final tree, classify every
finding, state `OK` or `KO`, and remain a separate result-only commit.

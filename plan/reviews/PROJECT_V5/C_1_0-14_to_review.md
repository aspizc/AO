# Review Submission — Task C/1/00 (Trial 14)

Status: **Pending independent review**.

C/1/00 remains
`in_progress; Trials 1-13 KO preserved; Trial 14 review pending`. This request
claims no `OK`, integration, promotion, release, or complete tracked-manifest
CI result. The reviewer must be independent of the author and publish a
separate append-only verdict.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Authoritative Trial 13 `KO` / Trial 14 base:
  `5f536d93b1d2b6fc3abb09a327fbb50941fdce1d`.
- Trial 14 implementation commit:
  `ad8bdd0c3c69054b3b6e73e74b528449dfca478a`.
- Append-only ownership correction:
  `2e0ba12085d2818a4f80649c2593cef9cc6f1c29`.
- Final technical tree:
  `e4103282a10f43d8514520e868c56f766981f5bf`.
- Review range:
  `5f536d93b1d2b6fc3abb09a327fbb50941fdce1d..2e0ba12085d2818a4f80649c2593cef9cc6f1c29`.
- Net range: 11 files, 509 insertions, and 56 deletions.

The second technical commit restores the shared Stage C index byte-for-byte
to the Trial 13 base after its ownership boundary was clarified. The net range
does not modify `plan/PROJECT_V5/C/README.md`. This request is a separate
request-only commit and contains no implementation.

## What was done

- Removed eager filesystem resolution of `AGENTS_MKFIFO_BIN`. The setting and
  startup `PATH` are captured without I/O, while every real deadline-bound
  control setup resolves and validates the selected native utility lazily.
- Added the fixed `sync_process_mkfifo.js` helper. It validates one exact
  absolute utility path and one private liveness path, then uses
  `process.execve` with the closed `-m 600 <liveness>` argv and an empty
  environment. Node/libuv never receives the utility pathname as a spawned
  command, so its `ENOEXEC` shell fallback cannot execute a false ELF/Mach-O
  image.
- Bound directory/control/FIFO preparation and bootstrap entry to the one
  service-owned absolute deadline. The FIFO helper receives only the remaining
  budget, runs in an isolated process group, and is killed group-wide on
  native `ETIMEDOUT`; exact descriptors and control names are cleaned before
  the existing lifecycle `TIMEOUT` reaches the caller.
- Kept missing/invalid helper failures provider-data-free and per-call:
  `SYNC_RUNNER_FAILED` with internal `CONTROL_SETUP`. MCP boots and lists all
  tools even when the configured helper is absent.
- Reconciled ADR-009, architecture, Node runtime, Gateway runtime
  configuration, operator guidance, and the task evidence with the actual
  direct-exec, lazy-resolution, and deadline behavior.

## TDD evidence

RED first reproduced each Trial 13 finding:

- false host-native helper: the call returned a successful provider result and
  its shell body created the sentinel;
- slow native helper: a 20-millisecond launch took about 2.1 seconds and
  returned `SYNC_RUNNER_FAILED` instead of `TIMEOUT`; and
- absent override: the real MCP bootstrap exited 1 before `tools/list`.

GREEN now proves:

- the false-image sentinel remains absent and the call fails safely;
- the 20-millisecond helper call returns the exact lifecycle `TIMEOUT` inside
  the bounded elapsed ceiling, removes its controls, and a separate
  250-millisecond run starts a shell plus child and proves both are absent
  before the private subreaper returns;
- an absent override returns the safe per-call
  `SYNC_RUNNER_FAILED/CONTROL_SETUP`, without provider or configured-path
  disclosure; and
- the disposable MCP bootstrap still lists all 33 canonical tools.

The false-image and liveness-path seams choose ELF on Linux/WSL and
Mach-O on Darwin. No native macOS executor was available, so configuration and
deterministic seams are not claimed as native Darwin execution.

## Verification

- `node --test --test-concurrency=1
  tests/gateway/sync_process_deadline.test.js` — **53 passed / 0 failed / 0
  skipped**, preserving all 50 Trial 13 cases and adding three Trial 14
  regressions.
- Slow-helper focal repeated three times — **3/3 passed**, including forced
  descendant drain.
- `node --test --test-concurrency=1
  tests/gateway/mcp_bootstrap.test.js` with
  `AGENTS_MKFIFO_BIN=/definitely/missing/mkfifo` — **1/1 passed**.
- Gateway complete inventory before the final no-production-change
  strengthening of the slow-helper test — **827 passed / 9 exact
  live-PostgreSQL skips / 0 failed**. The final changed focal file then passed
  53/53. See the tmux incident and delegation note below; the complete command
  must not be repeated by a subagent.
- `python -m pytest -q
  tests/structure/test_node_runtime_contract.py` — **14/14 passed**.
- Structure tests excluding the integrator-owned manifest assertion —
  **232 passed / 1 deselected**.
- `python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` — **86 passed / 1 failed** only
  because the shared `ci/suites.json` retains the pre-Trial-14
  `lint.gateway` inventory hash.
- A disposable copy refreshed with
  `python scripts/ci_gate.py --manifest <copy> --refresh-inventory` validates
  successfully. The sole required integrator change is:
  `lint.gateway` from
  `sha256:7c331fb564ff118a111f0ebb6d45198d6f2ecf8a578a37241bec60d83237f1cf`
  to
  `sha256:dda1de08373b8816dfa3e3d8ebdfaec85b17bdf8d4f417ac431ffe5233f10e70`.
- `npm run lint`, `git diff --check`, and
  `gitleaks protect --staged --redact --no-banner` — passed.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.

## Integrator-owned sealing and incident disclosure

The parallel-lane agreement reserves shared indexes, manifests, and workflows
to the integrator. Accordingly this range does not update:

- `ci/suites.json` with the one hash above;
- `plan/PROJECT_V5/SHEETS.md` from Trial 13 to Trial 14; or
- `plan/PROJECT_V5/C/README.md` from Trial 13 to Trial 14.

The integrator must make those shared updates, run tracked-manifest combined
CI, and bind its counts before integration. This author does not claim a full
repository gate on the final technical tree.

While characterizing the complete Gateway inventory, the existing
`tmux_client.test.js` detected host tmux and created then killed its unique
ephemeral `agtest-*` session in `finally`. It was not an agent session, but it
did invoke `tmux new-session` and therefore exceeded the subagent no-tmux
constraint. Root independently verified read-only that no `agtest-*` session
remains.
After recognizing the constraint, the author ran no further Gateway/full-CI
command and delegates the final combined gate to root/integration.

No shared MCP, Redis, KYA, PostgreSQL, Temporal, real provider, credential, or
network service was contacted, restarted, stopped, flushed, or reconfigured.
The range changes no migration, dependency, policy, coordination transport,
legacy `message.*`, or `agents:events` behavior.

## Required independent review

Use **GPT-5.6 Sol, reasoning ultra, Priority/Fast** and review the Git objects,
not this summary. At minimum:

1. Reproduce a false same-host native utility whose shell body writes a
   sentinel. The sentinel must remain absent; inspect the fixed helper and
   prove no later Node spawn can invoke the utility pathname.
2. Verify the helper accepts only the exact private path/argv, uses
   `process.execve`, receives no provider data or ambient environment, and
   behaves equivalently across the Linux and Darwin loader seams.
3. Reproduce a slow native helper with a 20-millisecond absolute deadline.
   Require exact `TIMEOUT`, bounded elapsed time, exact control cleanup, and no
   surviving helper/group descendant.
4. Verify every control-preparation checkpoint and the final bootstrap timeout
   consume the same absolute deadline rather than restarting a budget.
5. Start the real disposable MCP server with a missing override, list all
   tools, then make an isolated deadline-bound call and require the stable
   provider-data-free `SYNC_RUNNER_FAILED/CONTROL_SETUP`.
6. Regress modes, uid/gid descriptor ownership, restrictive umask, caller
   death, watchdog PGID reservation, resistant pre-launch runtime, residual
   same-PGID cleanup, tiny buffer, provider signals, and `ENOBUFS`.
7. Confirm the shared-index restoration commit has no net technical effect,
   and treat the listed manifest/index updates as explicit integrator gates.
8. Do not run a tmux-materializing test from a subagent. Leave shared
   MCP/Redis/KYA and credentials untouched.

Publish the verdict only in:

`plan/reviews/PROJECT_V5/C_1_0-14_result.md`

The verdict must bind the full technical range and final tree, classify every
finding, state `OK` or `KO`, and remain a separate result-only commit.

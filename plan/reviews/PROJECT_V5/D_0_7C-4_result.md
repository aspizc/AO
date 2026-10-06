# Independent Review Result — Project V5 D/0/07c Trial 4

## Verdict

**reviewed_OK**

Trial 4 is deliberately bounded to the single blocking P1 from the Trial 3
`reviewed_KO` verdict, and it closes that finding. The candidate defers
relay-binding revocation around the verified write, settles the pre-`F`
rejection while deferral is armed, flushes unconditionally in `finally`, and
emits `WRITE_OK` only after deferral has cleared, so a `WRITE_PROMPT` rejected
before `F` by relay/tmux diagnostic mismatch now delivers its authenticated
fd-5 `ERROR(0x0009, 0x03)` and the public
`SESSION_PORT_TERMINAL_CHANGED` / `identity`, while the reader-closed control
still returns `SESSION_PORT_WRITE_ABORTED` / `write`. The parent,
`settle_rejection`, `AcceptedRelayBinding`, and snapshot path are unchanged.

This verdict is limited to D/0/07c Trial 4 review. It makes no integration,
promotion, merge, tag, release, support, default-runtime deployment, public
splice, or `D/0/07d` claim. The sheet's local gate is authoritative here;
`D/0/07d` owns the full composition seal.

## Reviewer

- Agent/model/effort: claude-code / claude-fable-5 / max.
- Trace: `tr-tr-d007c-t4-final-777a4cdc-314d-47ae-b553-e5d37dc16bc6`.
- Task: `ts-0353b9b6-db62-4d43-bee0-c51d2c893faa`.
- Fresh independent reviewer; did not implement any trial. Two earlier
  reviewer sessions stopped without verdict at mandatory token budgets; their
  checkpoints were treated as untrusted leads and the decisive evidence below
  was authenticated first-hand.

## Candidate identity

- Commit `cf3b172bc99f05bbea2702e331547e40325b9644`, tree
  `de4510571e8f589e63f2b8e790a1b7ecdc342ffa`.
- Append-only merge of the Trial 4 chain rooted at baseline `d7873eb`
  (`18beef7` test → `5ffdf51` fix → `d7e81d6` docs, test-first) with the
  Trial 3 verdict docs (`1d8c952`). Verified via `git rev-parse` and
  `git log --format='%h %p %s'`.

## Decisive evidence verified first-hand

1. **Changed paths vs baseline `d7873eb`** —
   `git diff --name-status d7873eb..HEAD` touches only
   `gateway/src/adapters/process_supervisor_helper.py`,
   `tests/gateway/process_supervisor_session_port_fixture.py`,
   `tests/gateway/process_supervisor_session_port_relay.test.js`, and
   plan/review documents. No coordination, lifecycle, package, or lock paths
   appear, so those blobs are identical to baseline by construction (the diff
   enumerates every changed path).
2. **Baseline attribution** — the baseline targeted log at
   `/tmp/ao-d007c-baseline-d7873eb-trial4-preflight.2TwKDR/nine-failure-targeted.log`
   hashes to the claimed SHA-256
   `03e02414a266640f68f4f37f02f2350f9d2065073f5ca53302c10def4aa3e90b` and its
   TAP summary reads 112 tests / 103 pass / 9 fail / 0 skipped. Combined with
   (1), the nine full-Gateway-suite failures are inherited from the baseline,
   not introduced by the candidate.
3. **GREEN source spot-check** — the fix hunk in `5ffdf51` implements exactly
   the described remedy: `relay_binding.defer_revocation()` armed before
   `verified_pty_write`, the write wrapped in `try`, deferral flushed in
   `finally`, matching request item 5.
4. **Probe 1: exact sheet relay invocation** — from the candidate root:
   `env PATH=/tmp/d007c-ci-env.Cgjxoo/venv/bin:$PATH`
   `D007C_TEST_TMUX_PATH=/tmp/d007c-runtime.fT5Wl8/bin`
   `D007C_TMUX_SOCKET_NAME=d007c-control-probe D007C_RUN_REAL_TMUX_PROBE=1`
   `node --test --test-concurrency=1`
   `tests/gateway/process_supervisor_session_port_relay.test.js` →
   **58 tests, 58 pass, 0 fail, 0 skipped, exit 0**, reproducing the
   authenticated prior result. The later 49/8/1 runs omitted the required
   tmux test-path/socket-name environment and are not the sheet recipe.
5. **Probe 2: CI gate validate-only** —
   `/tmp/d007c-ci-env.Cgjxoo/venv/bin/python3 scripts/ci_gate.py --repo-root
   "$PWD" --validate-only` exits **2** with stdout **byte-identical** to
   `baseline-validate.json` (both SHA-256
   `64c5d7f779cb9db2dd93487cc546e95fd688d2c040f5844c5c505e72c76a872d`):
   status `invalid_manifest`, zero tests, and exactly seven
   `stale inventorySha256` errors (lint.python, lint.gateway, test.structure,
   test.gateway, policy.registry, test.cli, test.redis-live). The CI-gate
   state is fully inherited and unchanged by the candidate.

Other gates accepted as authenticated leads per the review task sheet: RED
intended 1 fail / 1 control pass; GREEN focused 2/2; preserved gate-RED 5/5;
PTY+Darwin 16/16; static and diff checks clean.

## Findings

- **P0:** none.
- **P1:** none.
- **P2-1:** a quick grep did not re-locate the probe-1 recipe wording
  (`D007C_TEST_TMUX_PATH` / 58-pass) inside `D_0_7C-4_to_review.md` within the
  review token budget; the recipe was authenticated instead by exact
  reproduction of the prior authenticated result under the
  orchestrator-specified invocation.
- **P2-2:** inherited baseline debt remains open and is explicitly out of this
  trial's scope: nine Gateway-suite failures and the `invalid_manifest`
  CI-gate state, owned by `D/0/07d`.
- **P2-3 (request/index mismatch):** the Trial 4 request commit `d7e81d6`
  added `D_0_7C-4_to_review.md` but no pending Trial 4 row in
  `plan/PROJECT_V5/reviews/README.md`, so there was no pending cell to
  replace. The orchestrator independently verified the same and corrected the
  authorization: this verdict commit appends exactly one new D/0/07c Trial 4
  row (request + OK verdict links), modifying no existing row and no third
  path.

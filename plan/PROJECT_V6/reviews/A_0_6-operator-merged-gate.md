# A/0/06 operator response: release-branch merged gate

Date: 2026-10-09. Integration gate evidence for the reviewed operator-response
merge `1ce3f55ec5ab8684a6d10c1772be6308c33db337` plus the inventory-only refresh
`f950a3d80241eba71ff1e2d2ac2cc698ba87b6f2` (tree
`dd3f9f582de819726ee3f350e0b6e08bf51f69fc`). This is not live provider
acceptance or a release.

The orchestrator ran `bash scripts/ci.sh` once on the clean `f950a3d` checkout,
on the host. The setup:

- the repository virtualenv;
- the pinned `tmux 3.6a-agents.3` binary, rebuilt today by
  `gateway/vendor/tmux-agents/build-offline.sh` from the verified source archive.
  Its SHA-256, `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`,
  equals the binary of the earlier A/0/06 gates;
- `D007C_TEST_TMUX_PATH` and `D007C_RUN_REAL_TMUX_PROBE=1`;
- an isolated `TMUX_TMPDIR`;
- a disposable `redis:7.2-alpine` container on an ephemeral loopback port.

Every inherited `AGENTS_*` and `TMUX*` variable was removed; only
`AGENTS_TEST_REDIS_URL` was added. Afterwards the container stopped, and the
isolated tmux server reported no server running.

A first attempt at `1ce3f55` stopped before running any test, with
`invalid_manifest` (`test.gateway: stale inventorySha256`), because the merge
added `tests/gateway/session_prompt_external.test.js` and
`tests/gateway/session_prompt_external_owner.mjs`. `ci_gate.py --refresh-inventory`
changed only that one `inventorySha256` line. `--validate-only` passed, and the
change was committed as `f950a3d`. `ci/suites-contract.json` is unchanged.

The gate exited **0**: **3,352 passed, 0 failed, 12 skipped** of 3,364. All
required lanes passed:

| Lane | Passed |
|---|---|
| `test.structure` | 462/462 |
| `test.gateway` | 2,205/2,214 |
| `test.e2e` | 25/25 |
| `test.cli` | 466/466 |
| `test.langgraph` | 165/168 |
| Redis | 22/22 |

Public hygiene, both lint lanes, the lock check, the release-candidate check,
the MCP smoke test and the policy registry check passed.

The 12 skips are the same declared set as the previous merged gate:

- nine PostgreSQL cases;
- two Gateway integration cases;
- one Temporal integration case.

The aggregate status is `infrastructure_unavailable` for these declared
external services, with `errors: []`. The optional real-provider lane ran zero
tests.

The raw log is local: `workspace/tmux-pinned/gate-f950a3d.log`, SHA-256
`8f9a2bbae84e5f5f7fbb1b3dcad7321e9dd6bcfe6f52945c58370e2870ad786d`. It contains
personal absolute paths.

Still open:

- the A/0/06 real-provider acceptance;
- AO 1.1.0 release evidence.

# A/0/06 live-fix merged gate 2: green

Date: 2026-10-09. This is orchestrator integration-gate evidence for `release/1.1.0` at `8ee0933`
(tree `f89087dd518b4ebe9c3406ed558910adc2d59901`). That commit is the reviewed live-fix merge
`99e6a52`, plus the inventory refresh `4656d51`, plus the reviewed hygiene-fix merge `8ee0933`.
It is not live provider acceptance and not a release.

The orchestrator ran `bash scripts/ci.sh` once on the clean checkout, on the host. The setup:

- the pinned `tmux 3.6a-agents.4`, SHA-256
  `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac`;
- an isolated `TMUX_TMPDIR`;
- a disposable `redis:7.2-alpine` on an ephemeral loopback port;
- every inherited `AGENTS_*` and `TMUX*` variable removed, with only `AGENTS_TEST_REDIS_URL` added.

**Result.** The gate exited **0**: **3,407 passed, 0 failed, 12 skipped** out of 3,419 tests.

- Required lanes: all passed, including public hygiene (0 findings), `test.structure`, `test.gateway`
  (2,260 passed), `test.cli`, `test.e2e`, Redis 22/22, lint, lock, release candidate, MCP smoke and
  the policy registry.
- Skips: the same declared set as earlier merged gates. There are nine PostgreSQL cases, two Gateway
  integration cases and one Temporal case. The aggregate status is `infrastructure_unavailable`, with
  `errors: []`.
- Optional lane: the real-provider lane ran zero tests.

This gate supersedes the RED [merged gate 1](A_0_6-livefix-merged-gate-1.md). The raw log is kept
locally at `workspace/tmux-pinned/gate-8ee0933.log`, SHA-256
`df4ad3fa8c171c33b41f7c4a9a3992cd7e5a52ce716bc588ee30499cfc4cb233`.

**Still open.**

- A/0/06 live acceptance on a fresh `.4` server.
- AO 1.1.0 release evidence (A/0/03).

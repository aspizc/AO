# A/0/03 release candidate gate

Date: 2026-10-09. Orchestrator gate evidence for the AO 1.1.0 candidate on `release/1.1.0`:

- commit `2d9d7ca2da095edaa8b36a9d9dde542c657db06a`;
- tree `f073d1037f1deacc3b0443974236c0e9305b078b`.

The orchestrator ran `bash scripts/ci.sh` once on the host, in the candidate checkout, with this
environment:

- pinned `tmux 3.6a-agents.4`, SHA-256
  `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac`;
- isolated `TMUX_TMPDIR`;
- a disposable `redis:7.2-alpine` container;
- inherited `AGENTS_*` and `TMUX*` variables removed, with only `AGENTS_TEST_REDIS_URL` added.

**Result.** Exit **0**: **3,407 passed, 0 failed, 12 skipped** of 3,419.

- All required lanes passed: public hygiene, structure, gateway (2,260), CLI (466), e2e (25),
  Redis 22/22, lint, lock, release candidate, MCP smoke and policy registry.
- The 12 skips are the declared infrastructure set: nine PostgreSQL, two Gateway integration and one
  Temporal. The aggregate status is `infrastructure_unavailable` with `errors: []`, so the skips fall
  within the `ci/suites-contract.json` allowlist.
- The optional real-provider lane ran zero tests.

**Disclosure.** During this run, the orchestrator committed
`plan/PROJECT_V6/reviews/A_0_3-candidate-1_to_review.md` on top of the candidate in the same checkout
(`46f5e6d`). That file is a review-only path and contains no code, tests or configuration. The gate
log is named for `2d9d7ca`, the HEAD when the run started. If the reviewer or operator requires a run
in a pristine detached checkout, it must be repeated there.

**Raw log.** Kept locally at `workspace/tmux-pinned/gate-2d9d7ca.log`, SHA-256
`85c31128ca89e105dbc9c13d0e8f4e5d25e45ac396b439a5f149f932c3310a97`.

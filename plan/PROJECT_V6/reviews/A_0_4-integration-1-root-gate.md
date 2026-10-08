# A/0/04 integrated candidate root gate

Date: 2026-10-08. Candidate merge commit: `343222e` on `release/1.1.0`.
Command: `bash scripts/ci.sh`, with the pinned tmux 3.6a-agents.3 runtime, an isolated tmux socket and a disposable Redis 7.2 service. Exit: **0**.

Aggregate: **2,949 passed, 0 failed, 12 skipped, 2,961 tests**. The aggregate status is `infrastructure_unavailable` because the permitted external integrations were skipped. Full local log SHA-256: `b970c5b9833ca840dded971173cd919e049f7154c40a82fda4eefb6b4d82a9c9` (`/tmp/a04-integrated-gate.log`). A durable compressed copy is [archived here](A_0_4-integration-1-root-gate.log.gz), SHA-256 `9fc0c9afcbcb429fb67f1bb25fed3b8b8ef05ff4d58a9f8ffa1b45cc9961f152`; decompressing it reproduces the full-log hash. The nine PostgreSQL skips and three opt-in Gateway/Temporal integration skips are the exact allowed infrastructure cases in `ci/suites-contract.json`. The optional real-provider lane was not enabled. Public hygiene found **0** issues. All other required suites passed, including 456 structure tests, 1,832 Gateway passes, 25 E2E tests, 442 CLI tests, 165 LangGraph passes and 22 Redis live tests.

This gate covers the merge commit, not a later documentation/status commit. It establishes integration verification for A/0/04 only; it is not promotion to `main` or a `1.1.0` release.

# A/0/04 trial 18 root gate

Candidate: `eeba51471b13ba505ea8449fec86a7415d62ee05` (reviewed trial 18).
Command: `bash scripts/ci.sh` with a pinned tmux 3.6a-agents.3 runtime, an isolated tmux socket, and a disposable Redis 7.2 service.
Exit: `0`.
Aggregate: **2,822 passed, 0 failed, 12 skipped, 2,834 tests**.
Local full log SHA-256: `2973fc4d9d4437831cdd8977ebf5b9951f751549060d8a88909c652244c8b2ef` (`/tmp/a04-trial18-full-gate.log`).

The 12 skips are exactly the allowed infrastructure cases in `ci/suites-contract.json`: nine live Postgres tests in `test.gateway` and three opt-in Gateway/Temporal integration tests in `test.langgraph`. Those two required suites report `infrastructure_unavailable` for the named tests; all other required suites passed. The optional `test.real-agents` suite reports `infrastructure_unavailable` because live providers were not enabled. No failed or deferred required lane was reported; the gate exited 0.

The earlier trial-17 gate attempt stopped at the `lint.gateway` regex-spaces failure and was terminated. It is not counted as a passing gate.

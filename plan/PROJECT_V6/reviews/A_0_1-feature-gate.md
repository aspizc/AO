# A/0/01 reviewed feature-tree full gate

Date: 2026-10-08. Candidate: the uncommitted A/0/01 tree on base
`a8e84303130096f3c90d179f69736a0f8247846f`, independently reviewed
OK in `A_0_1-1_reviewed_OK.md` for the exact source/tests/docs bound by
`evidence/A_0_1-1-files.json`. Root refreshed only the Gateway test inventory
hash in `ci/suites.json` after the review; `ci_gate.py --validate-only` passed.

`bash scripts/ci.sh` exited 0: 3,067 passed, 0 failed, 12 skipped, 3,079
total. The required disposable Redis lane passed 22/22. The 12 skips are the
declared infrastructure-unavailable budget: nine live PostgreSQL tests, two
Gateway integration tests and one Temporal integration test. The optional
real-provider lane was not run. Public hygiene found zero issues and policy
registry validation passed. The aggregate status is
`infrastructure_unavailable` because of the declared skips.

The run used pinned tmux `3.6a-agents.3`, SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`,
a private `TMUX_TMPDIR`, the project virtualenv and an owned disposable
Redis 7.2 container. The private tmux server and container were stopped.

Full raw output is preserved as `evidence/A_0_1-feature-gate.txt.gz`,
SHA-256 `072c3e9a161d40df86b6e6c24eb5a4af06a0221163029c6ec882d5eba5069f94`;
decompressed SHA-256
`88d349ddade9d4f83c04bdd855b56748e439d6115755ee0a2243fb5d5cc5a4c6`.

This certifies the reviewed feature candidate, not its integration with
other V6 sheets, promotion or release.

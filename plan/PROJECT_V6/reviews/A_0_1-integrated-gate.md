# A/0/01 integrated-tree gate

Date: 2026-10-08. Candidate merge commit:
`69f222f852c80d299ae562f1f9d6f7bf75ca1a10` on `release/1.1.0`.
Its parents are `3a154f5f89b8fb06d6f80b1e09f9763ba4244c1b` and
`d45584ddfc34a5a7ce152e634f0f0f2377d823b6`; the staged merge candidate
was independently reviewed OK in `A_0_1-integration-1_reviewed_OK.md`.

`bash scripts/ci.sh` exited 0 on the committed merge: 3,067 passed, 0 failed,
12 skipped, 3,079 total. The required disposable Redis lane passed 22/22.
The 12 skips are the declared infrastructure-unavailable budget: nine live
PostgreSQL tests, two Gateway integration tests, and one Temporal integration
test. The optional real-provider lane was not run. The aggregate status is
`infrastructure_unavailable` because of those declared skips. Public hygiene
found zero findings; policy registry validation passed.

The run used pinned tmux `3.6a-agents.3`, SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`,
a private `TMUX_TMPDIR`, and an owned disposable `redis:7.2-alpine` container.
The private tmux server and Redis container were stopped after the gate.

Full raw output is preserved as `evidence/A_0_1-integrated-gate.txt.gz`,
SHA-256 `aab09ae32945f9164cdcb310c545a1bf4453de1451a812477ab7727e0e83a283`.
Its decompressed bytes have SHA-256
`a45dfeab3ba62002ecc44996e2dcc137af7f2658ba50fc0d3eb595689367f06c`.

This proves A/0/01's reviewed implementation is integrated in the named
release-branch commit. It does not claim promotion, release, or completion of
other V6 sheets.

# A/0/00 trial 3 feature gate

Date: 2026-10-08. Candidate commit: `3dee8b8493893ccb6a92c9900ee7a2b27042237b` on `feat/V6-A-0-00-cli-write-access`.
The independent trial-3 verdict is `A_0_0-3_reviewed_OK.md`; this is the
subsequent root-run gate, not a new review verdict or integration claim.

`bash scripts/ci.sh` exited 0 with 3,000 passed, 0 failed, 12 skipped, 3,012
total. The required disposable Redis lane passed 22/22. The 12 skips are the
declared infrastructure-unavailable budget: nine live PostgreSQL tests, two
Gateway integration tests, and one Temporal integration test. The optional
real-provider lane was not run. Public hygiene found zero findings. The
aggregate status is `infrastructure_unavailable` because of those declared
skips, not `passed`.

The run used Node's project toolchain, pinned tmux
`3.6a-agents.3` at SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`,
a private `TMUX_TMPDIR`, and an owned disposable `redis:7.2-alpine` container.
The private tmux server and Redis container were stopped after the gate.

Full raw output is preserved as
`evidence/A_0_0-trial3-feature-gate.txt.gz` (SHA-256
`19879c9530dbdd56e5725ab65b4ca45bafffe2fa499b2acbdf2808041afcd2af`).
Its decompressed bytes have SHA-256
`43a35246b29eceffe28f7ddd068f660bfc572b627e3f2bcd74c2aa48b7115e1b`.

This supersedes the earlier RED feature gate only for this committed trial-3
candidate. Integration and an integrated-tree gate remain outstanding.

# A/0/00 integrated-tree gate

Date: 2026-10-08. Candidate merge commit:
`a8e84303130096f3c90d179f69736a0f8247846f` on `release/1.1.0`.
Its parents are `6fe7f11e29b09907b5fa9406e2acc4966532de8a` and
`f56ed568621a5a1971b4aa4cfbd8efb9186a94e9`; the merge candidate was
independently reviewed OK in `A_0_0-integration-1_reviewed_OK.md`.

`bash scripts/ci.sh` exited 0 on the committed merge: 3,006 passed, 0 failed,
12 skipped, 3,018 total. The required disposable Redis lane passed 22/22.
The 12 skips are the declared infrastructure-unavailable budget: nine live
PostgreSQL tests, two Gateway integration tests and one Temporal integration
test. The optional real-provider lane was not run. The aggregate status is
`infrastructure_unavailable` because of those declared skips. Public hygiene
found zero findings; policy registry validation passed.

The run used pinned tmux `3.6a-agents.3`, SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`,
a private `TMUX_TMPDIR`, and an owned disposable `redis:7.2-alpine` container.
The private tmux server and Redis container were stopped after the gate.

Full raw output is preserved as `evidence/A_0_0-integrated-gate.txt.gz`,
SHA-256 `debfa5e4335b9f09d27f43ed0c845081feea720d18648a18c745b9ce1705475b`.
Its decompressed bytes have SHA-256
`b859450e57c3401e69d71ad0436d1c244277505379086c09e8cb6a6dcd4afb74`.

This proves A/0/00's reviewed implementation is integrated in the named
release-branch commit. It does not claim promotion, release, live provider
sandbox enforcement, or completion of other V6 sheets.

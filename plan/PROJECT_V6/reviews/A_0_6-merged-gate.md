# A/0/06 release-branch merged gate

Date: 2026-10-09. The independently reviewed merge is
`44c215f3df936ee87eff0f36cb7a8d9bb22c1884` (tree
`f37bc267e7a712bdfa84314ae7c955ad96a2a112`). The exact committed
checkout tested here is `6187acaafcf4dc4fd6fb91f7ff65c455a646a3ac`
(tree `b30d1f2b37d87cbb6f322b1488fb6800dad92235`), which adds only
the indexed merge review trail after the merge. This is integration gate
evidence, not live provider acceptance or a release.

The operator ran `bash scripts/ci.sh` once on the clean checkout with the
repository virtualenv, pinned `tmux 3.6a-agents.3` binary (SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`),
an isolated `TMUX_TMPDIR`, and a disposable `redis:7.2-alpine` container on
an ephemeral loopback port. All inherited `AGENTS_*` variables were removed;
only `AGENTS_TEST_REDIS_URL` was added for CI. The container stopped and
disappeared. The isolated tmux server stopped and reported `no server running`;
its directory retained an inert socket.

The gate exited **0**: **3,312 passed, 0 failed, 12 skipped** of 3,324.
Required Redis passed **22/22** and public hygiene found zero findings. The
skips are nine declared PostgreSQL cases, two Gateway integration cases, and
one Temporal integration case. The aggregate status was
`infrastructure_unavailable` for these declared external services, with
`errors: []`. The optional real-provider lane ran zero tests.

The complete local raw log is `/tmp/ao-v6-a06-merged-gate-6187aca.log`,
SHA-256 `773ef29f842b83ed3c0c0c56fff74ffbdf9784ceef8d957d66b23b0dbb207c59`.
It remains local because test output contains personal absolute paths. The
checkout was clean before and after the gate. The A/0/06 real-provider check
and AO 1.1.0 release evidence remain open.

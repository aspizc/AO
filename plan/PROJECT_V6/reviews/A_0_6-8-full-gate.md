# A/0/06 Trial 8 full gate

Date: 2026-10-09. The independently reviewed candidate is commit
`eee883ef160fe3068720a183de91f76d47187d8a`, tree
`9387d24a3911daf6411b7660b85fedc8279f41fe`. The worktree was clean
before and after this run. This record covers the full CI gate; it does not
claim live provider acceptance or integration.

The operator ran `bash scripts/ci.sh` once on the host with the repository
virtualenv, pinned `tmux 3.6a-agents.3` binary (SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`),
an isolated `TMUX_TMPDIR`, and a disposable `redis:7.2-alpine` container on
an ephemeral loopback port. All inherited `AGENTS_*` variables were removed
before the child run; only the test-specific `AGENTS_TEST_REDIS_URL` was set.
The container was stopped by the scoped cleanup (`ownedRedisStopExit: 0`),
and the isolated tmux socket was absent after the run.

The gate exited **0**: **3,312 passed, 0 failed, 12 skipped** of 3,324.
The required Redis lane passed **22/22**. Public hygiene found zero findings.
The 12 skips were nine declared PostgreSQL integration cases and three
declared Gateway/Temporal integration cases. The aggregate status was
`infrastructure_unavailable` solely for those declared optional service
cases; `errors` was empty. The optional real-provider lane was not enabled.

The complete local raw log is `/tmp/ao-v6-a06-gate-eee883e.log`, SHA-256
`c384ee87a570d5fd8000f028727c344adf31c03d61f36cc9f6bc109dab4aff6d`.
It remains local because test stack traces contain personal absolute paths.
The exact candidate SHA, tree, lane counts and cleanup result are recorded
above for independent verification. Live provider acceptance, release branch
integration and the 1.1.0 release remain open.

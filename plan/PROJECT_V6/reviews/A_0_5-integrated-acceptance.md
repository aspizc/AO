# A/0/05 committed-tree and live acceptance

Date: 2026-10-08. Candidate commit
`7982e422577ad6dfb37ef0c7b1e3c8433735430a` on `release/1.1.0`.
This is an **integrated** claim, not promotion to `main` or a `1.1.0` release.

The A/0/05 implementation entered the branch in merge `b4506d2`, after the
independent [source integration review](A_0_5-integration-1_reviewed_OK.md)
and [release-branch merge review](A_0_5-root-merge-1_reviewed_OK.md). The
A/0/04 live Codex startup and second-turn refinements were separately reviewed
through trials 1–5 and merged in `7982e42` after an independent
[merge review](A_0_4-live-startup-merge-1_reviewed_OK.md). Their source is
necessary for the live A/0/05 ask sequence to complete automatically.

## Committed-tree gate

`bash scripts/ci.sh` on `7982e42` exited **0**. Result: **3,265 passed,
0 failed, 12 skipped, 3,277 total**; `errors: []`. The aggregate status is
`infrastructure_unavailable` solely for declared integration skips: nine live
PostgreSQL, two Gateway integration and one Temporal integration test. Optional
real-provider CI ran zero tests. Required Redis passed 22/22, and public
hygiene found zero issues. The gate used Node 22.22.1, pinned tmux
`3.6a-agents.3` (SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`),
a private tmux directory and an owned disposable `redis:7.2-alpine` container.
The container was stopped after the gate. The private raw gate output has
SHA-256 `c7091f1c3c1d8758814d9fb2fbd60f3103220f20185bcaa0bebe5ff7f906d600`.

## Operator-run live sequence

An ignored, private local harness ran on Linux 7.0.0-34-generic x86_64,
Node 22.22.1, SQLite 3.51.2, Codex CLI 0.160.1 and the pinned tmux binary
above. Its Gateway was local stdio with a private SQLite DB. The probe
`base_adapter.js` SHA-256 was
`bc039cb5fbdbb29dc6bd90cba66c0596043acc70a934201b04184dd10b3699e7`,
identical to the file in `7982e42`. The only manual child-UI choices were to
skip a CLI update and trust the disposable test folder; no challenge prompt
received a manual Enter.

The harness spawned one real supervised Codex child. `agent.ask` submitted a
short nonce challenge automatically and `agent.view` observed the exact
reversed-nonce reply. It then sent SIGTERM to the Gateway process, confirmed
the child pane and private tmux server survived, started a new Gateway
process on the same local principal/machine/state, verified the old trace was
denied before reattach, and explicitly reattached the same trace, task,
repository and session. A second automatic `agent.ask` and `agent.view`
reached the same tmux child and observed the second exact reversed-nonce
reply. Both `agent.ask` calls returned success. The final cleanup reported
`EXACT_OWNED_IDENTITIES_ABSENT`; the protected checkout inventory before and
after was byte-identical (both SHA-256
`efe33b21b6187032e13becebb3cdbdd085dfc283cde0eac411571f2dd90282b0`).

The private evidence is the local run directory
`/tmp/ao-a04-live-probe/workspace/a05-live-acceptance/run-72b4e312bb5e/`.
Its `evidence.jsonl` SHA-256 is
`fabae1eed6f37f6f1dc40f5ed2f3afb46959f407dac59fd1df05576f1dc4779c`;
its final `recovery-cleanup.json` SHA-256 is
`608ce0fe07483ef83631a15c98a51afd5e284ae7379d2824928d719c0f924954`.
Those files contain local paths, process identities and challenge nonces, so
they remain outside the public repository. The independent merge reviewer
checked both replies against their challenges as booleans, inspected the
restart/reattach/cleanup event sequence and confirmed the adapter and
inventory hashes; the operator owns the same-principal/repository live claim.

## Boundary

Recovery supports verified **Linux local stdio with SQLite** on the same
principal, machine/state and repository bindings. It is explicit: startup
and discovery do not grant recovery. Unsupported platforms/backends and
unverifiable identity fail closed; a physical reboot that ends tmux is not
covered. The implemented denial, migration, expiry, owner-liveness and
partial-claim cases are covered by the reviewed A/0/05 tests and the
committed-tree gate. Live PostgreSQL, Temporal and other provider flows were
not part of this acceptance.

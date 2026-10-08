# A/0/05 trial-4 feature-tree full gate

Date: 2026-10-08. Candidate: the independently reviewed but uncommitted
trial-4 tree on `6317df1`, bound by `v6-a05-cp27-manifest.json` except this
subsequent gate record and archives. This feature branch predates A/0/04's
runtime integration and requires tmux `3.6a-agents.1`.

After the [wrong-pin failed attempt](A_0_5-trial4-wrong-pin-gate.md), root
reran `bash scripts/ci.sh` with pinned tmux `3.6a-agents.1` (SHA-256
`d4fa7abcfee5bd7d8688b8ffc2b489cd5faca56411e033625d6a0ba8b5346d21`),
private `TMUX_TMPDIR`, the project virtualenv and an owned disposable
Redis 7.2 container. The command exited **0**: 2,813 passed, 0 failed,
12 skipped, 2,825 total. The required Redis lane passed 22/22. Nine live
PostgreSQL tests and three Gateway/Temporal integration tests account for
the declared infrastructure skips; optional real providers were not run.
Public hygiene found zero issues and policy registry validation passed.
The aggregate reports `infrastructure_unavailable` for the declared skips.

Full raw output is preserved as `v6-a05-trial4-correct-feature-gate.txt.gz`,
SHA-256 `4091f4e4b8ad6b404203d29ed2a4ff718687b40c81b217ca1f4d53f65c7cad42`;
decompressed SHA-256
`3f979a0b3f22a1b83345c92b5a3efe06bd3b0d8bcd9f409da28b79953c275a88`.

This closes the feature-branch gate only. Operator-run live Codex
restart/reattach/ask/view acceptance, A/0/04 runtime reconciliation, an
integrated-tree gate on one commit and release checks remain open.

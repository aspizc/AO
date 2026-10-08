# A/0/04 root-owned full gate with isolated Redis 7 and tmux `.3`

Date: 2026-10-08. Candidate worktree:
`feat/V6-A-0-04-safe-submit`, HEAD `c1a8071`; production and tests remained
uncommitted. This evidence follows the independent source-review OK in
`A_0_4-6_reviewed_OK.md`. It is a gate result, not live provider acceptance,
integration or release.

The root refreshed only the `test.gateway` inventory digest in `ci/suites.json`
from `sha256:b19a28d7c38caadfbd49eb15e21b64ba3d8bf881708a70c970ad85c69c234525`
to `sha256:404c273b299560d51ef72aa6d1278ecd84397aa37576a99c28d7750f720ce638`.
No lane, threshold, skip allowance or test content changed in this step.
`tests/structure/test_ci_suite_manifest.py` then passed **79/79**.

The root ran `bash scripts/ci.sh` under the locally ignored
`workspace/root-v6-a04-gate-redis7.sh` wrapper. It pinned the independently
rebuilt `tmux 3.6a-agents.3` binary, SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`,
used a private `TMUX_TMPDIR`, and started an owned disposable
`redis:7.2-alpine` container. Cleanup stopped the owned server/container.
The serving Gateway and other tmux/Redis instances were untouched.

`scripts/ci.sh` exited **0**. Official aggregate:
**2,704 passed, 0 failed, 12 skipped, 2,716 total**. The required live Redis
lane ran **22/22** and reported no remaining test coordination namespaces.
The 12 declared infrastructure skips were nine PostgreSQL contract cases and
three LangGraph Gateway/Temporal integrations. The optional real-provider
lane was not run. Aggregate status was `infrastructure_unavailable` because
of those declared unavailable integrations, not a failure.

Uncompressed log SHA-256:
`33ee532f0151374d37c5f9980abc2e7421e74630f5f321af0148d6a0594c9c35`.
Archived log: [evidence/A_0_4-root-full-gate-redis7.txt.gz](evidence/A_0_4-root-full-gate-redis7.txt.gz),
compressed SHA-256
`f358eb71b9fdfe6757a1808b7a630011e3a73205c4b262a467c4e1ae48dccb17`.

Still open: live Codex/Claude prompt acceptance and timing, positive
Antigravity acceptance with a non-corporate account, native Darwin build,
the three SOURCE-REVIEWED / NOT EXECUTED pending-output scenarios, final
candidate commit/integration and A/0/04 sheet status. No tag is authorized
by this gate alone.

# README parallel operation — independent review, trial 1

## Verdict and candidate

**reviewed_OK** for candidate tree
`f20d79ee9e2cf33631bd78b8af438eb5fabcde1a`, based on
`489dcc7b167e3a272927daa3775297d4990e999c` on `release/1.1.0`.
The candidate changes only `README.md`, whose frozen blob is
`1b71114c5adbe76f38c7537654fabd7110f2a6aa`.

Trace: `tr-ao-readme-par-6c539c0d-af48-40b9-a43a-3f68290dc052`.
Reviewer: Codex `/root/review_readme_parallel`, separately assigned under the
operator-authorized session-agent fallback. The reviewer made no candidate
or staging changes and authored only this verdict. No Claude execution,
cross-vendor review or Gateway-spawned review is claimed.

No blocking findings remain in this documentation-only candidate. Only the
handoff, verdict and review-index evidence may be added after acceptance;
changes to the reviewed README require another review.

## Independent checks

- Verified the base-to-candidate path set is exactly `README.md`. The working
  file and staged README blob both match the frozen candidate blob.
- Read the complete added section and its navigation link. Checked the
  guidance against `AGENTS.md`, `.claude/orchestration-profile.md`,
  `docs/coordination-bus.md`, and both the installed and public coordination
  skills. Worker control, trace-local messages, independent peer notices,
  durable evidence and operator approvals use their proper Gateway surfaces.
- Confirmed matching Redis endpoint, prefix, canonical scope and protocol;
  private lease tokens; heartbeat and registration recovery; addressed JOIN
  and impact notices; stable send retry envelopes; at-least-once handling;
  durable results before transport ACK; and checkpoint polling. The guide
  preserves the distinction between transport ACK, semantic ACK, ownership,
  review, integration and approval. Absence or timeout grants no authority.
- Checked the memory claims against the runbook and actual queue/service
  implementation: `gateway/src/core/coordination_queue.js` appends metadata
  events without an automatic retention limit and performs validated inbox
  `XACK` plus `XDEL`; `gateway/src/services/coordination_service.js` keeps ACK
  within the authenticated participant inbox. The README correctly calls for
  independent backlog/event monitoring and preserves pending deliveries.
- Checked the worktree example and cleanup guidance against the
  [official Git worktree reference](https://git-scm.com/docs/git-worktree).
  `add -b <branch> <path> <commit>` supports the explicit base SHA; linked
  worktrees have separate working files, HEAD and indexes while sharing
  repository data and default configuration. The clean-worktree removal
  condition matches Git. The guidance requires project-permitted roots and
  diffs, resource isolation, explicit staging and serial integration.
- Confirmed that shared-file ownership, host memory admission, nested worker
  limits and recovery handoffs are operator practices. The candidate does not
  claim an automatic scheduler, distributed file lock, security sandbox or
  automatic task takeover. Bounded session observations and durable handoffs
  preserve the existing context and independent-review rules.
- Independently ran
  `node --test tests/gateway/tool_projection_contract.test.js`:
  **10 passed, 0 failed, 0 skipped**, exit 0.
- A transient check against the frozen Git tree resolved all **84 local
  Markdown link destinations**, including the nested license badge target,
  and all **16 heading fragments**. All five added links were inspected; the
  external Git link was opened directly. The added Bash block passed
  `bash -n` without executing its commands.
- `git diff --check 489dcc7b167e3a272927daa3775297d4990e999c
  f20d79ee9e2cf33631bd78b8af438eb5fabcde1a` and
  `git diff --cached --check` passed.

## Verification and integration boundary

This is focused documentation verification. No live coordination messages,
worker spawning, worktree creation, infrastructure operation or full runtime
gate was performed. This verdict establishes review acceptance for the
identified README tree, not live multi-orchestrator performance or recovery,
integration, promotion, publication or a release. Indexing this verdict and
committing the scoped documentation and evidence remain the integrator's
responsibility.

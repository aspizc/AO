# Generic AO direction — independent plan review, trial 1

Verdict: **OK** for the scoped documentation clarification.

- Base commit: `61d6f760773f28d2a7971506ca692a95d694b27a`.
- Reviewed candidate tree: `cfee837ae017f116db15696bdc49c0db55b1c599`.
- Branch: `release/1.1.0`.
- Trace: `tr-ao-generic-1007-b2b45540-91c7-4ca2-b1a8-f9ebbcfb7336`.
- Independent reviewer: Codex `/root/review_generic_direction`, separately
  assigned under the operator-authorized session-agent fallback. No Claude,
  cross-vendor review or Gateway-spawned reviewer is claimed.
- Submission: [trial 1 request](GENERIC_DIRECTION_2026_10_07-1_to_review.md).

## Scope and findings

Reviewed the eight changed Markdown documents under `plan/PROJECT_V6/`:
`A/0/02.md`, `A/README.md`, `GENERIC_WORKFLOWS.md`, `HUMAN_DECISIONS.md`,
`README.md`, `SHEETS.md`, `reviews/A_0_2_human_decision.md` and
`reviews/README.md`. The separate repository-root `README.md` lifecycle-guide
requirement is excluded from this verdict.

No blocking findings in this scope.

The decision preserves the useful KYA practices named by the operator:
epics and stories, dependency-based parallel waves and Gateway lifetime
across a wave. Extraction must account for useful behavior before removal,
provide configurable commands and layouts, and demonstrate two project
types. KYA-specific reviewer write permissions are not generalized.

Wave process/connection lifetime is distinguished from task/trace/session
authority and independent review. The planned boundary includes task failure
isolation and cleanup of owned resources. Existing skills provide planning,
supervised sessions, isolated worktrees, serial integration and wave review;
generic wave automation remains an explicit requirement awaiting a separate
registered implementation sheet. Nothing claims that automation is built or
included in a release.

The partial human answer is consistent across the sheet and current indices.
Historical-document disposition remains unanswered and gates that publication
step and release acceptance. It does not block the independent extraction.
Earlier questions and verdicts remain intact.

## Evidence and verification

- Inspected `docs/kya-implementation-runbook.md:6-14` and
  `scripts/kya_mcp_task_runner.mjs:31-75`: the legacy runner launches a fresh
  Gateway process for each request and cannot establish persistent wave
  execution merely by changing configuration.
- Inspected the planning/build skills and orchestration profile, the KYA
  prompts' command/layout assumptions, and task/session bindings in
  `gateway/src/core/request_context.js:478-527`.
- Independently checked 8 changed documents and 60 relative file links:
  **0 broken targets**.
- Confirmed all 8 reviewed working files match the frozen candidate tree and
  that its diff contains only those plan Markdown files.
- Candidate diff, working diff and staged diff whitespace checks exited 0.

This is documentation review only. No runtime tests, full CI gate or live
provider checks were run or counted as passed. This verdict does not complete
A/0/02 implementation, authorize the unresolved history choice, or prove
integration, promotion or release.

# KYA implementation runbook

Operating contract for implementing a KYA ("Know Your Agent") project through
the Gateway. Use the operator's KYA checkout as the working repository.

This is an optional compatibility example. Use the
[generic project workflow](generic-project-workflows.md) and generic prompts
for new projects. KYA-specific reviewer write permissions are local profile
choices and do not apply to generic review sessions.

## Current runner limitation

The legacy `scripts/kya_mcp_task_runner.mjs` starts a fresh Gateway process
per request. Code inspection shows the same connection-lifetime mismatch as
the failing legacy MVP2 smoke. It also sends `callerAgent: "codex"`, requiring
`AGENTS_REQUEST_PRINCIPAL_AGENT=codex` at launch; setting that alone does not
preserve the context between processes. End-to-end KYA runner execution is not
verified by the current AO gate. Use a persistent MCP host for the manual task
sequence until this runner has its own corrected integration evidence.

## Roles and models

| Role | Agent | Model | Reasoning effort | Service tier |
|---|---|---|---|---|
| Planner / orchestrator | claude-code (human-facing host session) | `claude-opus-5-5` | `max` | n/a |
| Coder | codex | `gpt-6.1-sol` | `max` | `priority` (Fast) |
| Reviewer | codex by default; claude-code (`claude-opus-5-5`) when the planner wants an independent vendor | per agent | `max` | `priority` for codex |

The planner is the human-facing LLM session (ADR-002: there is no separate
orchestrator process). The planner never writes KYA production code directly;
it delegates through the Gateway.

## Source of truth in the KYA repository

- `drafts/` — the product and technical source documents.
- `plans/` — the executable plan tree (v0.0 → v2.0). Task slices live under
  `plans/<version>/<stream>/<task><slice>.md`.
- `plans/reviews/<version>/` — review trail:
  `<stream>-<task><slice>-<trial>_reviewed_OK.md` or `_reviewed_KO.md`.

## Per-slice loop

1. Planner picks the next open slice following the plan's execution order and
   dependency graph.
2. Planner writes a coder prompt and a reviewer prompt for the slice, starting
   from `prompts/kya_coder_prompt_template.md` and
   `prompts/kya_reviewer_prompt_template.md`. The coder prompt must mandate
   TDD: the smallest failing behavior test is written before production code,
   and the test-first proof is named in the handoff. Both prompts forbid
   commit/tag/push/rebase/stash/reset from child agents and carry the working
   rules (think-before-coding, simplicity first, surgical changes, read before
   write, surface conflicts, convention over novelty, intent-verifying tests,
   fail loud).
3. The legacy recipe runs `scripts/kya_run_task_mcp.sh` with a task config file
   (`KYA_TASK_CONFIG`, see below). The script drives one Gateway orchestration:
   `orchestration.create` → `task.assign` + `agent.delegate` (coder) →
   `artifact.put` → `task.assign` + `agent.delegate` (reviewer) →
   `artifact.put` → `orchestration.complete`.
   This fresh-process-per-call sequence remains unverified and cannot preserve
   current request context. For actual iterative work use the persistent MCP
   host and supervised spawn/ask/view workflow described in the generic guide.
4. Planner reads the review artifact. Only a `*_reviewed_OK.md` closes the
   slice. On KO, the next trial fixes only the KO points.
5. On OK, the planner:
   - commits the slice on the working branch with
     `feat(va-<version>): <summary> (<version>/<stream>/<task><slice>)`;
   - updates the KYA `CHANGELOG.md` (one line per closed slice) and `README.md`
     when behavior or interfaces changed;
   - never pushes without explicit operator instruction.
6. When a plan version closes its gate (for example v0.1), the planner tags the
   KYA repository with the version (`v0.1`) on the gate commit.
7. If the plan is exhausted or insufficient to continue, the planner extends
   the plan tree under `plans/` (new slices or versions) before delegating more
   coding work, keeping the drafts in `drafts/` as the source of truth.

## Task config file

`KYA_TASK_CONFIG` (default `/tmp/kya_current_task.env`):

```bash
KYA_TASK_ID='v0.1/0/02b'
KYA_TASK_SLUG='v0-1-02b'
KYA_TASK_TITLE='<slice title>'
KYA_CODER_PROMPT='/tmp/kya_impl_v0_1_02b_coder_prompt.md'
KYA_REVIEW_PROMPT='/tmp/kya_impl_v0_1_02b_reviewer_prompt.md'
KYA_REPO_CWD='<absolute-kya-checkout-path>'
AGENTS_REPO_ROOTS='<absolute-repositories-root>'
```

Optional overrides: `KYA_CODEX_MODEL` (default `gpt-6.1-sol`),
`KYA_CODEX_EFFORT` (default `max`), `KYA_CODEX_SERVICE_TIER` (default
`priority`), `KYA_REVIEWER_AGENT` (default `codex`), `KYA_REVIEWER_MODEL`,
`KYA_REVIEWER_EFFORT`, `KYA_REVIEWER_SERVICE_TIER`, `AGENTS_WORKSPACE` (default
`/tmp/kya-agents-workspace`), `AGENTS_POLICIES_DIR` (default this repository's
`policies/profiles/kya/`).
`KYA_REPO_CWD` and `AGENTS_REPO_ROOTS` are required; there is no personal
checkout default. `KYA_REPO` selects the registered ID for a compatibility
run. After operator migration, launch the optional profile with
`AGENTS_REPOSITORIES_OVERLAY` pointing to the operator-local registrations.
The `--check` wrapper option checks availability only and never proves task
execution, persistent connection lifetime or automated waves.

## Policy requirements

- The KYA loop runs against the `policies/profiles/kya/` profile: it registers
  `kya` as `internal` (`claude-code` + `codex`), allows the current model
  profiles and grants the reviewer role `code.write`/`code.read` so
  reviewers can write review artifacts and narrow fixes.
- The base `policies/` registry also registers `kya` and the same defaults, but
  keeps the stricter review-only reviewer role.
- Single-orchestrator rule: exactly one planner session drives this loop at a
  time. Before delegating, check no other Gateway delegate is running against
  the KYA worktree (`ps` for `codex exec ... -C <kya path>`); a dirty worktree
  with another agent's in-flight changes blocks new delegations.
- V5 does not relax that single-owner worktree rule. Orchestrators responsible
  for separate tasks or worktrees may exchange impact notices and review
  requests through the
  [`coordination bus`](coordination-bus.md), but a message never transfers
  ownership or authorizes another process to edit this KYA worktree.

## Language

All KYA documents, code, plans, prompts, review notes, and handoff artifacts
are written in English.

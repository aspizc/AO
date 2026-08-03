---
name: interactive-gateway-orchestration
description: "Use when running agents-orchestrator through agents-gateway with a human in the loop: persistent supervised agent.spawn sessions, planner artifacts, explicit approval gates, chunked coder tasks, reviewer artifacts, audit traceability, periodic progress updates, and real Gateway/Codex/Claude execution decisions without automatic task timeouts."
---

# Interactive Gateway Orchestration

Use this skill when the user wants this repo to exercise its own Gateway flow,
especially for plan refinement, apply-coder work, reviewer loops, or staged
implementation where the human wants to inspect decisions before they are
applied.

## Core Contract

- The human stays in the loop for plan and apply decisions unless they explicitly
  enable bounded auto-approval.
- The Gateway is the authority: use `orchestration.*`, `task.assign`,
  `agent.*`, `artifact.*`, and `approval.*` rather than bypassing policy.
- Every meaningful phase preserves one `traceId` and records artifacts or audit
  events.
- Use `agent.spawn` for planner, coder, tester, and reviewer work. Follow with
  `agent.ask`, supervise with `agent.view`, and close deliberately with
  `agent.kill` after the deliverable is verified.
- Do not impose automatic task deadlines and do not kill a session because wall
  time elapsed. A transport timeout is not evidence that the spawned agent
  stopped.
- The orchestrator reports progress periodically: current phase, active agent,
  task/session id, observed progress, and any policy or intervention risk.
- Do not run a large monolithic coder task when the output spans many files.
  Split by stage, component, or narrow write scope.

## Workflow

1. Preflight the selected policy profile, agent binary, tmux, repo/cwd, and the
   target role's supervised `agent.spawn` permission. If a legacy profile
   denies spawn for that role, report the policy blocker and fix it as an
   explicit reviewed policy change; never fall back silently to
   `agent.delegate` or weaken `excludedPaths`.
2. Create or reuse an orchestration trace.
3. Planner phase:
   - Assign a planner task.
   - Start the planner with `agent.spawn`, then send the bounded brief with
     `agent.ask`.
   - Observe it with `agent.view` until the plan deliverable and explicit
     completion marker exist. The marker is advisory; verify the artifact.
   - Store the plan with `artifact.put` using kind `plan`.
   - Present the proposal and open decisions to the human before applying it.
4. Human gate:
   - Request `approval.request({ action: "plan.apply", context: { repo, scope } })`.
   - Wait for or ask the human decision.
   - If denied, record the note and return to planner.
   - If granted, continue to apply-coder.
5. Apply phase:
   - Assign a coder task.
   - Start the coder with `agent.spawn`; send the task through `agent.ask` and
     supervise the persistent session with `agent.view`.
   - Scope coder writes tightly, for example `plan/PROJECT_V1/E/**`.
   - Prefer Codex for file-writing coder work when Claude Code cannot write
     under its configured permission mode.
   - When a repo policy has `excludedPaths`, start Codex with a scoped `cwd`
     that does not expose those paths. For example, use `gateway/` rather than
     the repo root when `policies/` is excluded.
   - If Codex fails with `EXCLUDED_PATH_EXPOSED`, split the work by path and
     relaunch from a narrower allowed directory. Do not bypass the guard by
     removing `excludedPaths` or using the repo root.
   - Keep each spawned task narrow enough to review independently. Task
     chunking controls scope and risk, not elapsed time.
6. Review phase:
   - Generate a complete diff, including untracked files.
   - Store it with `artifact.put` as `raw_diff` when classification allows.
   - Assign and `agent.spawn` the reviewer in a clean session, then use
     `agent.ask` for `Verdict: OK or KO`, findings, and required fixes.
   - Store reviewer output with `artifact.put` as `review_notes`.
   - If one reviewer cannot access restricted code and only reviews a summary,
     spawn a second authorized read-only reviewer. Give it the raw code plus
     the first reviewer's concerns as untrusted data, and require an explicit
     disposition for every concern.
7. Converge:
   - If KO or required fixes exist, resume or spawn a narrow coder session for
     only those fixes.
   - Re-review the complete diff.
   - Close agent sessions deliberately after their artifacts are verified.
   - Close with `orchestration.complete` only after reviewer OK and human intent is satisfied.

## Progress Updates

Give the user short updates at every phase transition and at least every 30s
during long-running agent work. Include concrete state, not generic reassurance:

- `planner running`, `coder running`, `reviewer running`, or `waiting for human`.
- Which task or scope is active.
- Whether the session is alive and what changed since the previous view.
- What changed since the previous update.
- Any decision the system is making, such as narrowing scope after a KO.

## Supervision Without Automatic Task Timeouts

- Do not set an automatic execution timeout for a spawned planner, coder,
  tester, or reviewer.
- Poll at a reasonable cadence with `agent.view`; never use one blocking wait
  that prevents a user update for more than 60 seconds.
- Treat unchanged output as a diagnostic signal, not a deadline. Inspect the
  session, worktree, audit, and expected deliverable; send a targeted
  `agent.ask` if useful.
- Never call `agent.kill` solely because several polls were unchanged. Kill
  only after explicit human cancellation, verified completion/cleanup, or a
  terminal failure that cannot make progress. Report the evidence first when
  human input is available.
- If an MCP/transport call times out, reattach or inspect the persistent
  session. Do not mark its task failed or start a duplicate session until its
  actual state is known.
- Avoid `agent.delegate` in the normal workflow. Reserve it for an explicitly
  requested, short, idempotent one-shot where losing the call cannot orphan
  work; it is never the default for planning, coding, testing, or review.

## Permission Lessons

- Claude Code headless with `--permission-mode dontAsk` may refuse `Edit` and
  `Write`; treat that as an operational KO and switch to a permitted coder
  path instead of pretending the task succeeded.
- Codex CLI model selection depends on the account. If a forced model fails,
  remove the model override and let Codex use its default.
- Sandbox escalation prompts are outside Gateway policy. To keep real
  delegation interactive without blocking on repeated launch confirmations, use
  narrow, reusable runner commands or persisted command-prefix approvals. Announce
  the launch, reuse the approved runner, and only ask the human again when the
  command shape or risk materially changes.
- If a session seems stuck, inspect its pane, audit, task state, process and git
  status. Preserve partial files and ask or narrow the next instruction; do not
  infer failure from elapsed time.

## Review Standards

Reviewer output is actionable when it includes:

- A clear `Verdict: OK` or `Verdict: KO`.
- Findings ordered by severity.
- Required fixes when KO.
- Explicit notes on scope, Gateway contract invariants, task atomicity, and
  whether the work can proceed to the next implementation task.

## Git Hygiene

- Commit stable baselines separately from implementation work.
- Do not stage unrelated user files.
- Commit only after the relevant task or approved baseline is complete and
  reviewed, unless the human asks to pause before committing.
- Use English commit messages with the task id when applicable.

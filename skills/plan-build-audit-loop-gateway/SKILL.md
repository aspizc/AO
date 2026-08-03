---
name: plan-build-audit-loop-gateway
description: >-
  Drive a Gateway-managed project toward an explicit production-quality bar by
  repeating plan refinement, reviewed implementation, audit, and re-planning
  through persistent agent sessions. Use when the user asks to harden a release
  end to end, iterate until quality converges, or close a version against audit
  findings. Compose the project's phase skills or the generic plan, build, and
  audit Gateway skills. Never use one-shot delegation for iterative work and
  stop when the measurable convergence guard is met.
---

# Plan → Build → Audit Loop — gateway-forced (convergence orchestrator)

You are the **convergence orchestrator** for whatever repo you are pointed at. You take it to
**production-grade quality** by running a closed loop over three phases and converging on a
**measurable quality bar** — you orchestrate and verify; builder/reviewer agents do the work, **all
driven through the agents-gateway MCP**. **Do not mix phases.**

## Golden rule: SPAWN through the gateway, never DELEGATE. Never push.

The substrate is **fixed to the agents-gateway MCP** (`mcp__agents-gateway__*`): **always**
`agent_spawn` (persistent tmux sessions + `agent_ask` + `agent_view` + `agent_kill`), **never**
`agent_delegate`. Reuse the live coder session for KO→fix; keep the reviewer independent from the
coder; surface the tmux attach command (`session_attach_info`) to the operator and keep it. **Never
push.**

**Tool-shape (or the call rejects):** `orchestration_create` flat `callerAgent`/`callerRole`;
`task_assign` nested `caller{agent,role}`/`target{role,agent,action}`; `agent_spawn`/`agent_delegate`
flat `agent`/`role`. **`task_assign` before `agent_spawn`** — the spawn's `taskId` is a foreign key.
**Session identity is per `(trace, agent, role)`**: reuse the live session for follow-ups (the
context economy); a respawn or independent re-review round needs a fresh trace with the round
discriminator first in the prefix. **agent ≠ model:** resolve which agent each model runs on
(claude-* → a `claude-code` agent; gpt-* → a `codex` agent). On `POLICY_DENIED`, stop and report the
`ruleId` — never silently downgrade. Full foundations: `agents-gateway-orchestration`.

## Liveness & unblock protocol (classify the pane every tick — and right after each spawn/send)

A spawned session can stall **silently** — a prompt that never submitted, a confirmation it's
waiting on, a connector warning that froze it. On **every monitor tick, and immediately after each
`agent_spawn` / `agent_ask`**, `agent_view` the pane and **classify it before re-arming or acting**;
never assume the prompt landed or that work is progressing. The five cases:

1. **Idle with an unsent prompt** (text sitting in the input, not submitted) → submit it (send Enter /
   re-`agent_ask`). A typed-but-never-executed prompt is a common silent stall.
2. **Blocked on a confirmation/approval** (a y/N, a destructive-op confirm, a permission prompt) →
   **Escape and redirect** with an `agent_ask`. **Never approve a destructive action:** never let it
   delete `plans/**`, run `rm -rf`, `git add -A`, `reset --hard`, `checkout -- .`, `stash`, or
   `push`. Steer it back to the scoped, pathspec-safe path.
3. **External MCP / connector warning** (a third-party MCP server warning, an auth notice) →
   **treat as noise**; don't act on it, don't re-send. It is not a block.
4. **Genuinely working** (actively editing/running, output advancing) → **leave it and re-arm** the
   monitor; check again next tick. Don't interrupt real progress with a re-send.
5. **Dead session** (tmux pane gone, agent exited, `agent_view` unresponsive) → **respawn** a fresh
   `agent_spawn` and re-`agent_ask` the same scoped prompt; resume the KO→fix or the leaf from the
   last persisted handoff.

**Verify the artefact, not the notification.** A completion notification can be from a *stale/older*
task. Before acting on "done", **read the actual handoff/verdict file on disk** (`*_to_review.md`,
`*_reviewed_OK|KO.md`, `*_to_check_by_human.md`) and confirm it matches the **current
`traceId`/`taskId`/slice** and the real `git diff` — only then gate/commit. Never advance a phase on a
notification alone.

## Step 0 — Resolve the project profile (parametrize, don't assume)

**First, read `.claude/orchestration-profile.md` if it exists** — the persisted, canonical profile
(roles/models, gate, policies, gateway repo/cwd). If it does **not** exist, resolve the items below
(discover from the repo, or ask the user once) and **write them to `.claude/orchestration-profile.md`**
so future runs don't re-derive. On conflict, the profile file wins over a skill's inline defaults.
The substrate is **not** one of the negotiable items — it is **fixed to the agents-gateway**. Capture:

- **Repo path / gateway repo handle + cwd**, and the **push/tag policy** (default: commit on
  review-OK, tag per release locally, **never push**).
- **Gateway preflight:** the gateway is up and reachable (`ps aux | grep mcp_server`; expected policy
  profile via `/proc/<pid>/environ`); it is harness-managed — don't start a second one via Bash `&`.
- **Builder roles & models** (from the project's orchestrator policy/config): a capable **coder**
  agent+model+effort, an independent **reviewer** agent+model, and the **caller/orchestrator**
  identity.
- **Plan/task format & location** (match what the repo uses): task IDs, branch naming, commit
  convention, where plans live, the leaf-task template. If none, adopt: versioned plan dir → parent
  tasks → leaf tasks, each a closed unit (branch + minimal change + test-first + targeted tests + one
  review handoff).
- **The full quality gate command**, its **known flakes** (+ agreed rerun rule), and
  **dependency-install constraints** (e.g. a no-network sandbox → install from the host).
- **Phase engines (in priority order):** (1) if the repo ships its own gateway phase skills (e.g.
  `ao-plan-orchestration` / `ao-build-orchestration` / `ao-audit-orchestration` in the gateway repo
  itself), invoke those — they already use the gateway and carry project-specific detail; (2) else
  use the generic gateway phase skills **`plan-orchestration-gateway` /
  `build-orchestration-gateway` / `audit-orchestration-gateway`**; (3) else fall back to the inline
  "Phase playbooks" below. Never mix phases.

## The loop

The fast inner gate is **per-slice review** inside PHASE 2; the **AUDIT is a coarse version/plan
boundary gate, not a per-slice step** (audits are deep, slow, and costly). So: build a whole version
under per-slice review, audit it at the boundary, then (if needed) harden and re-audit at the next.

```
for each version/increment on the roadmap:
  PHASE 1 — REFINE PLAN  → invoke the PLAN engine (gateway spawns):
            bring the version's plan to executable, leaf-level detail; if a prior boundary audit left
            findings, FOLD them in (route per "Where findings go"); production-review it (no
            assumed-but-unbuilt foundations; deps acyclic; every gate criterion observable; every
            finding maps to a leaf).
  PHASE 2 — IMPLEMENT (the fast inner gate)  → invoke the BUILD engine (gateway spawns):
            build the ready leaves one branch + one review handoff at a time (spawn coder → gate solo
            → spawn independent reviewer → OK/KO; commit only review-OK with an explicit pathspec).
            The per-slice REVIEWER is the inner quality gate — do NOT run a full audit here. Continue
            until the version's leaves are all OK and the full gate is green.
  --- VERSION/PLAN BOUNDARY (all leaves OK + gate green) ---
  PHASE 3 — AUDIT (expensive; run sparingly, at max thinking)  → invoke the AUDIT engine (gateway):
            spawn a high-reasoning auditor; run the lens(es) for what the version changed (code +
            architecture always; + product/UX if surfaces changed; + security/data/testing at a
            release/pilot gate). Maintain the visible index at audit/README.md; save the consolidated
            report and one complete standalone sheet per executed lens under audit/<YYYY-MM-DD>/.
            A blocked lens still gets a sheet, while a non-applicable lens is justified in the index
            and consolidated report.
            Verify every Critical/High firsthand; do a remediation-coverage pass. Output: the full
            artifact set plus open findings; a summary never replaces a lens sheet.
  PHASE 4 — ASSESS & CONVERGE:
    - If the EXIT BAR holds → tag the version (per push/tag policy; local only), update
      docs/CHANGELOG, advance to the next version.
    - Else → fold findings into a CURRENT-version hardening increment (e.g. vX.Y.1), then re-run
      PHASE 1→3 for THAT increment — re-audit only after it is built and green, at its boundary.
    - CONVERGENCE GUARD (stop + escalate to the human if any holds): two consecutive boundary audits
      do not reduce open High+Critical; an audit adds net-new High/Critical the plan isn't scheduling;
      only human-gated / explicitly-deferred items remain; or hardening rounds > MAX_ROUNDS (default 3).

at PROJECT COMPLETION: run a final comprehensive audit (all lenses) at max thinking before declaring done.
```

## The EXIT BAR — make "good quality" enforceable (generic + project-derived)

Generic floor (calibrate to the increment's maturity):
- **Zero open High/Critical as-built defects** (data-loss paths, broken isolation/auth, fail-open
  security boundaries, correctness races).
- **Enforcing gates, not advisory:** lint actually lints the source; no test is
  skipped-but-reported-green; CI builds/ships what it claims; structure/contract checks assert real
  output, not fixtures.
- **Supply chain clean:** dependency audit at the agreed severity passes and is a CI gate.
- **Runnable for what's under test** (or the missing foundation has an owning prerequisite task, not
  a silent assumption).
- **Docs match reality** (no stale version/architecture claims); contracts/fixtures versioned for any
  behaviour change.
- **Full gate green**, and every remaining gap is human-gated or in an explicit
  deferred-with-reason register.

**Then add project-specific bar items derived from the audits** (the recurring High findings for
*this* system become named exit criteria). The audit's "Done signals" section is the source for these.

## Where findings go (fold; don't defer the trust-breakers)

- **As-built defects** (correctness/security/data-loss/gate-integrity) → a **current-increment
  hardening track now** (e.g. a point release / hardening division). Don't let them compete with new
  features or slide to a later version — cost grows as code lands on top.
- **Planned/foundational gaps** → their owning milestone, with explicit prerequisite ordering (the
  classic trap is a gap deferred increment-to-increment that no backlog actually schedules — make it a
  real task).
- **Human-gated** (legal/commercial/security policy) → a `*_to_check_by_human.md` handoff; never
  invent the decision.

## Hard rules

- **SPAWN through the gateway, never DELEGATE; independent reviewer.** Reuse the live coder session
  for KO→fix; keep the reviewer separate from the coder; surface the session attach handle.
- **Phase discipline:** never implement during a plan phase; never change product/code/infra during
  an audit phase (audits are read-only; findings flow into the plan).
- **TDD / test-first**, one task per branch; the reviewer's only write is the OK/KO verdict; coder and
  reviewer do **not** commit — the orchestrator does.
- **Gate before review and before commit;** respect gate **turn-taking** on a shared tree; apply the
  project's known-flake rerun rule before calling a flake a failure.
- **Commits:** review-OK only, **explicit pathspec** (never `add -A` / `reset --hard` / `checkout --
  .` / `stash` / `push`); honor the push/tag policy (default: never push). Per OK:
  changelog/decision record + review artefact + scoped commit + `agent_kill` the coder/reviewer
  sessions + `orchestration_complete`.
- **Concurrent writers:** if other agents edit the same tree, stay in your lane with strict pathspecs;
  never touch another lane's files.

## Phase playbooks (inline fallback when the repo ships no phase skills)

All three still run **through the gateway** (spawn → ask → view → kill):
- **PLAN:** read the source/design docs and state the increment's goal in one line; **spawn** helpers
  to author the plan in the project format (objective, gap register → tasks, dependency/wave order,
  **verifiable** gate criteria, out-of-scope); decompose into executable leaves (deliverables +
  test-first proof + acceptance-as-properties + file:line anchors); spawn an adversarial reviewer for
  buildability.
- **BUILD:** per leaf — **spawn** the coder with a test-first, single-leaf prompt; `agent_view` and
  steer; when it settles, run the full gate solo and verify the real tree state (don't trust a noisy
  exit code); **spawn** the independent reviewer with the diff; on KO, `agent_ask` the same coder
  session for the reviewed points only; on OK, commit with an explicit pathspec + changelog/decision +
  verdict artefact; `agent_kill` the sessions.
- **AUDIT:** **spawn** a high-reasoning auditor at max effort; pick the lens(es); if the environment
  provides audit engines (e.g. `*-audit-review` skills), have it use them; ground every claim in real
  surfaces/file:line; distinguish facts vs judgments and built vs specced; maintain the visible index
  at audit/README.md, then save a consolidated report and one standalone sheet per executed lens
  under audit/<date>/; never let the summary replace those sheets. Verify load-bearing findings
  firsthand; finish with the remediation-coverage analysis that feeds PHASE 1.

## Kickoff template

> Act as the convergence orchestrator for <repo>. Use **plan-build-audit-loop-gateway** (drive
> everything through the agents-gateway MCP with spawns; never delegate; never push).
> Project profile: gateway repo=<handle>, cwd=<path>; coder=<agent/model/effort>;
> reviewer=<agent/model>; caller=<agent>; gate=<command>; push policy=<never/…>; plan format=<…or
> "match the repo">.
> Target: bring <increment> to the exit bar, then advance the roadmap; tag per policy.
> Loop refine→implement→audit→re-plan→implement until the bar holds; route as-built defects to a
> current-increment hardening track now; stop and report if the convergence guard trips.

Do not start a round's build until its plan round is production-reviewed; do not advance an increment
until its audit round shows the bar met (or a human-gated stall).

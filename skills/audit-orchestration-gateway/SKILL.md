---
name: audit-orchestration-gateway
description: >-
  Orchestrate evidence-based, read-only project audits through persistent
  agents-gateway sessions and turn verified findings into remediation coverage
  and plan work. Use when the user asks to audit a repo through the Gateway,
  perform a project health check, review architecture or security, or verify
  that a plan closes findings. Select audit-project or the matching audit-*
  lens, save reports under a dated audit directory, and, for multi-lens audits,
  produce a visible index, a consolidated summary, and one standalone sheet per
  executed lens. Verify Critical or High findings firsthand. Never change
  product code or infrastructure during the audit and never use one-shot
  delegation for iterative audit work.
---

# Audit Orchestration — gateway-forced

You produce honest, evidence-grounded audits of whatever repo you are pointed at and convert their
findings into action, driving the work **through the agents-gateway MCP**. **Read-only**: never build
features, change code, or touch infra/IaC during an audit — analysis only; findings flow into the plan.

> If the repo ships its own audit skill (e.g. `ao-audit-orchestration` in the gateway repo itself) it
> already uses the gateway — prefer it; it carries project-specific save conventions and known traps.
> Foundations (tool shapes, session identity, liveness protocol): `agents-gateway-orchestration`.

## Golden rule: SPAWN through the gateway, never DELEGATE

The substrate is **fixed to the agents-gateway MCP** (`mcp__agents-gateway__*`). Run the audit by
**spawning a dedicated high-reasoning agent** and `agent_ask`-ing it to run the lens at **max thinking
/ highest reasoning effort**; for large repos, **spawn read-only discovery agents in parallel** (one
per surface/subsystem) and stitch their findings. Use `agent_spawn` + `agent_ask` + `agent_view` +
`agent_kill`, **never** `agent_delegate` — you want to watch the discovery (`agent_view`), steer a
drifting reader with another `agent_ask`, and avoid delegate's huge-opaque-result / `exitCode -1`
failure modes. `agent_spawn` takes **no `prompt`** — spawn, then `agent_ask`.

```
orchestration_create({callerAgent, callerRole:"orchestrator", goal, prefix})              → traceId
task_assign({traceId, caller:{agent,role}, target:{agent,role,action}, repo, brief})       → taskId
agent_spawn({agent:<high-reasoning agent>, role:<auditor role per policy>, model:<strong model>,
             reasoningEffort:<max/xhigh>, repo, cwd, traceId, taskId})                      → auditorSession
agent_ask({sessionId:auditorSession, prompt:"Use the selected audit-* skill on the assigned scope", traceId})
# optional fan-out: several read-only discovery sessions in parallel, each agent_view'd, then stitched
artifact_put({traceId, kind:"audit", classification, producedBy, content})    # persist the report
agent_kill(...) ; orchestration_complete(...)
```

**`task_assign` BEFORE `agent_spawn`** (the spawn's `taskId` is a foreign key). If the policy has no
dedicated auditor role, spawn as the role the policy allows (commonly `coder` or `reviewer`) with
the auditor persona fixed by the brief — the READ-ONLY discipline comes from your prompt and your
diff guard, not the role name. Reuse the same auditor session for every follow-up question about
its findings instead of re-priming a new one.

**Read-only discipline still holds through the gateway:** the spawned agents map/grep/read/run the
product, but make **no edits** — every discovery session is read-only and findings flow into the plan.

**Tool-shape:** `orchestration_create` flat `callerAgent`/`callerRole`; `task_assign` nested
`caller`/`target`; `agent_spawn` flat `agent`/`role`. **agent ≠ model** — resolve which agent each
model runs on. On `POLICY_DENIED`, stop and report the `ruleId`.

## Step 0 — Resolve the project profile

**Read `.claude/orchestration-profile.md` first** if it exists (gateway repo/cwd, the high-reasoning
agent+model to use, save conventions, push policy); write it if absent. Substrate is fixed to the
gateway; everything else is parametrized.

## When to run (cadence & cost)

A full audit is **deep, slow, and costly** — it is a gate, not a heartbeat. Run it **at a
plan/version boundary** (e.g. when v0.1 is complete) **or at project completion**, NOT per slice or
per build round (the per-slice reviewer is the cheap inner gate). Run the synthesis agent at **max
thinking/effort**; budget time/tokens deliberately. You may fan out read-only discovery sessions in
parallel, but **verify every Critical/High finding firsthand** (your own grep/read) before asserting.

## 1. Pick the audit skill

Use `audit-project` for multiple lenses or have the spawned auditor invoke the matching installed
`audit-*` skill for one lens; do not re-derive its evidence and reporting contract:

| User wants… | Engine |
|---|---|
| full project / several lenses | `audit-project` |
| product/feature value, UX-of-the-whole | `audit-product` |
| architecture/infra topology, modularity, deploy/observability | `audit-architecture` |
| code quality/bugs/tech-debt | `audit-code` |
| security posture / threat model | `audit-security` |
| data model / PII / privacy / governance | `audit-data-privacy` |
| test strategy / coverage / release confidence | `audit-tests` |
| UI/UX / usability / accessibility | `audit-ux` |

If unscoped, ask which lens, or default to **code + architecture** (the two that best catch as-built
defects) and say which areas got lighter review. Pass the user's date/output dir through.

For every multi-lens audit (deep, directed, or reconnaissance), the deliverables are mandatory:
one visible index, one consolidated report, and one full, standalone sheet for each executed lens.
The consolidated summary never replaces a lens sheet. A selected lens that is blocked still gets a
sheet recording scope, evidence gathered, the blocker, and concrete unblocking steps. A lens judged
not applicable is recorded with the rationale in the index and consolidated report; do not create an
empty sheet for it.

## 2. Run it well

- **Save location:** for a single lens, use `audit/<YYYY-MM-DD>/<lens>-audit.md`. For multiple
  lenses, use `audit/README.md` as the visible index, `audit/<YYYY-MM-DD>/project-audit.md` as the
  consolidated report, and `audit/<YYYY-MM-DD>/<lens>-audit.md` for every executed lens
  (+ screenshots under `audit/<date>/_screenshots/`). Create the directory up front.
- **Ground every claim** in a real surface / file:line / manifest / contract / running product; label
  **facts vs judgments** and **BUILT vs SPECCED/ROADMAPPED**. **Derive the as-built picture yourself**
  — never credit the system for something that only exists in a doc (a common trap is a documented
  runtime/topology whose code is a stub or a library with no entrypoint).
- **Exercise the product where you can** (run it, screenshot the hero flow, run the CLI) over
  reasoning about it; if you can't, inspect the surfaces and say so.
- **Calibrate to maturity.** Don't demand GA polish from a prototype unless the goals require it.
  Distinguish a **planned gap** (deferred by the roadmap) from an **as-built defect** (real now: a
  data-loss path, broken isolation, a gate that passes skipped tests).
- **Deliverable shape:** each lens sheet must be complete and independently useful, following the
  engine's specified structure (Executive Summary + A–F grade + top risks/opportunities; Map; Audit
  by dimension with severity; Strategy; Plan/Roadmap; Open Questions). In a multi-lens audit, the
  consolidated report synthesizes and deduplicates findings but does not absorb or replace the lens
  sheets. Don't pad; a healthy dimension gets one sentence.

Before remediation planning, verify that the index links the consolidated report and every expected
lens sheet, that each finding has exactly one primary lens with cross-references where needed, and
that no executed or blocked lens exists only as a paragraph in the summary.

## 3. After the audit — turn findings into action

1. **Remediation-coverage analysis:** read the relevant pending plans and decide, per finding,
   SOLVED / PARTIAL / NOT-ADDRESSED / DEPENDS-ON / HUMAN-GATE, with file:line. Save to
   `audit/<date>/remediation-coverage-<scope>.md`. (The classic result: a finding deferred
   increment-to-increment that no backlog actually schedules.)
2. **Convert gaps into plan work** via **plan-orchestration-gateway**: a new increment/division or
   folded leaves, each finding mapped to a task, deps rewired, gate criteria made verifiable. Route
   **as-built defects to a current-increment hardening track now**; planned gaps to their milestone;
   human-gated items to a `*_to_check_by_human.md` handoff.
3. **Then implement** via **build-orchestration-gateway** (as-built defects first).

This is the AUDIT→re-plan handoff that **plan-build-audit-loop-gateway** consumes.

## 4. Constraints & safety

- Analysis only — no edits to product/code/infra/IaC, no migrations, no live-environment changes.
  Every spawned discovery session is read-only.
- Commit audit docs (only when asked) with an **explicit pathspec**; never `git add -A`; honor the
  push policy (default: **never push**); keep audit commits separate from plan/code commits.
- A finding implying a legal/commercial/security decision → an Open Question for a human; don't rule.
- Work in the repo's language and conventions.

---
name: ao-audit-orchestration
description: >-
  Generate project-specific, read-only audits of agents-orchestrator across
  product, architecture, code, security, data/privacy, testing, operations, and
  operator UX. Ground findings in the real repo and runnable Gateway, save them
  under a dated audit directory, and produce a visible index, a consolidated
  summary, and one standalone detailed sheet per executed lens before mapping
  remediation coverage to the active PROJECT_VN plan. Use when the user asks
  for an audit or health check of this repo, a focused architecture/security
  review, or verification that the plan closes audit findings. Select
  audit-project or the matching audit-* skill for evidence and reporting.
---

# agents-orchestrator Audit Orchestration

You produce honest, evidence-grounded audits of this repo
(the current AO checkout) and convert their findings into action.
**Read-only:** never build features, change code, or touch infra during an audit — analysis only.
Read `.claude/orchestration-profile.md` first for the resolved profile.

## When to run (cadence & cost)

A full audit is **deep, slow, and costly** — a gate, not a heartbeat. Run it **at a version/plan
boundary** (a PROJECT_V<N> wave or version complete and green) **or on explicit request** — never
per sheet (the per-sheet reviewer is the cheap inner gate). Profile: `codex` `gpt-6.1-sol` at
`max` for independent audits, or `claude-opus-5-5` at `max`. You may fan out
read-only discovery sub-agents (Agent tool) in parallel, but the synthesis and **every
Critical/High finding is verified firsthand** by the high-reasoning session.

## 1. Pick the right audit skill

Use `audit-project` for a multi-lens audit or invoke the matching installed `audit-*` skill for a
single lens; do not re-derive its evidence and reporting contract:

| User asks for… | Skill |
|---|---|
| full project / several lenses | `audit-project` |
| product/feature/functional value | `audit-product` |
| architecture/infra topology, modularity, operability | `audit-architecture` |
| code quality/bugs/tech-debt | `audit-code` |
| security posture / threat model | `audit-security` |
| data model / privacy / governance | `audit-data-privacy` |
| test strategy / release confidence | `audit-tests` |
| operator UI/UX (CLI, runbooks, tmux flows) | `audit-ux` |

If the user says just "audita el proyecto", either ask which lens or run the project-wide layout
(all lenses, one numbered file each — the `audit/2026-07-26-project-wide/` pattern) and say which
lenses got lighter review.

**A multi-lens audit is incomplete until every executed lens has its own detailed,
self-contained file in addition to the consolidated summary.** This applies to deep, directed,
and reconnaissance lenses. If a selected lens is blocked, create its sheet with attempted
evidence, the exact blocker, unsupported conclusions, and unblock steps. Record a genuinely
non-applicable lens in the index and consolidated report without creating an empty sheet.

## 2. Repo conventions for running it well

- **Save location:** `audit/<YYYY-MM-DD>[-<scope>]/` (e.g. `2026-07-26-project-wide/`,
  `2026-07-25-fable-5/`). Multi-lens audits use numbered files (`01_PRODUCT_FUNCTIONAL.md`,
  `02_ARCHITECTURE_INFRASTRUCTURE.md`, … `09_GOVERNANCE_PLANNING_TRACEABILITY.md`) plus a
  `README.md` as the consolidated report. Every executed lens—including any project-specific
  operations or governance lens—gets exactly one primary file. **Index the new audit in
  `audit/README.md`** (that index is in Spanish; the reports are in English).
- **Ground every claim** in a real file:line / manifest / contract / runnable flow; label **facts
  vs judgments** and **BUILT vs PLANNED**. The recurring trap in THIS repo is the
  review-vs-release divergence: plan trees and READMEs describe states ahead of the evidence.
  Apply the **canonical status rule** (`planned`/`implemented`/`reviewed`/`integrated`/
  `promoted`/`released` are separate; an OK review proves nothing later; a release claim needs
  one candidate SHA with `main` and the tag resolving to it). V1 surfaces (LangGraph, Postgres,
  Redis Streams, OTel) are experimental, not supported runtime — do not credit or demand them as
  product.
- **Exercise the product where you can — prefer running over reasoning.** The Gateway runs
  locally: `bash scripts/ci.sh` (full dry-run gate), `node scripts/smoke_mvp2.mjs` (two-agent
  smoke, dry-run default), `node scripts/smoke_planning.mjs`, `agent-run policy validate`, and
  the real MCP surface via `tests/e2e/*.test.js`. Run gates on the host (the Codex sandbox hangs
  the LangGraph suite; `langgraph` pinned 1.2.5 for the SDK 0.4.4 security fix;
  verified upgrade and its limits are recorded in `docs/ci-contract.md`). The Postgres suite is opt-in
  (`AGENTS_PG_INTEGRATION=1` + docker) — mark it deferred if the session lacks docker, never
  "passed".
- **Parallelize discovery, verify load-bearing findings firsthand.** Fan out read-only sub-agents
  to map tools/contracts (`docs/mcp-tool-catalog.md`, `schemas/`), policies (`policies/`), CI
  (`ci/`, `.github/`), and state/audit surfaces — then re-verify any Critical/High yourself with
  your own grep/read/run before asserting it.
- **Calibrate to maturity.** This is a local-first, single-user tool pre-`v0.1.0`; don't demand
  GA/enterprise polish unless the owner's goals require it. Distinguish a **planned gap**
  (roadmapped in a PROJECT_V<N> sheet) from an **as-built defect** (real now: a trust-boundary
  hole, gate integrity failure, data-loss path, release-evidence divergence).
- **Deliverable shape:** each lens file follows its selected audit skill in full (own verdict,
  scope, evidence, map, findings, strengths, strategy, roadmap, and open questions) and must be
  reviewable without the consolidated report. The consolidated report deduplicates root causes,
  cross-links the primary lens file for each finding, and carries the global roadmap. Healthy
  dimensions can be concise; they cannot disappear into the summary.

Before remediation planning, verify that `audit/README.md` links the consolidated report and all
expected lens sheets, each primary finding is developed in exactly one lens sheet, cross-references
replace duplication, and local links and evidence paths resolve.

## 3. After the audit — turn findings into action

An audit that ends at a report is half-done. Then:

1. **Remediation-coverage analysis.** Read the pending `plan/PROJECT_V<N>/**` and classify each
   finding: SOLVED / PARTIAL / NOT-ADDRESSED / DEPENDS-ON / HUMAN-GATE, with file:line. Write it
   to `audit/<date>/remediation-coverage-<scope>.md` (or fold into the project's
   `COVERAGE_MATRIX.md` when one exists — every finding gets exactly one owner). The classic
   result: a finding deferred version-to-version that no backlog actually schedules.
2. **Convert gaps into plan work** via `ao-plan-orchestration`: a hardening wave or new stage,
   each finding mapped to an owning sheet, dependencies rewired, gate criteria verifiable.
3. **Then implement** via `ao-build-orchestration` — as-built trust/gate/data defects first,
   calibrated to maturity.

## 4. Constraints & safety

- Analysis only — no edits to product/code/infra, no migrations, no policy changes, no live
  restricted-repo touch.
- Shared tree: commit audit docs only when asked, with an explicit pathspec and `docs(audit):`
  commits, separate from plan/code commits; never `git add -A`; never push. Do not stage the
  operator's files.
- Legal/commercial/security decisions are flagged as Open Questions for the human — never ruled
  on.
- Reports in English; the `audit/README.md` index entry in Spanish, matching the existing index.

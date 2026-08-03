# Product Audit — agents-orchestrator

**Auditor:** Head of Product review (read-only)
**Date:** 2026-06-19
**Repo state:** branch `feature/enable-codex-planner`, `README.md` modified in working tree, HEAD 205 commits ahead of `main` / 0 behind.
**Method:** Exercised the product in dry-run (MCP `tools/list` smoke, `agent-run` CLI surfaces); read shipped prompts, runbooks, ADRs, policy registries, plan tree, and CHANGELOG. The real two-agent and KYA flows execute only in the owner's environment and were **not** triggered (read-only audit); findings about them are grounded in shipped specs/scripts and the project memory, and labeled as such.

---

## Executive Summary

**Product-readiness grade: C+ (a working single-operator MVP that does not yet survive the "second operator" test).**

The core promise — a local-first MCP Gateway that lets a human-facing LLM safely orchestrate coding agents (Codex/Claude/Gemini) behind policy, sanitization, audit, and human approvals — is **real and verifiable**: the Gateway boots over stdio and `tools/list` returns the full toolset in dry-run, the `agent-run` CLI works, and the safety model (policy-before-spawn, fail-closed sanitization, append-only audit, human-gated approvals) is coherent and threat-modeled. The product has been genuinely dogfooded: it built its own PROJECT_V1/V2/V3 backlog and now drives an external project (KYA) through the same loop. But the hero flow proves the promise **for its author**, not for a new operator: there is no one-command happy path (orchestration is driven by hand-calling ~8 MCP tools from an LLM host you must wire up yourself), no sample repository or seed data ships, the default repository registry is populated with the owner's private repos (`cvision`, `cvlib`), and the newest (KYA) flow hardcodes `/home/carase/git/experiments/kya` and absolute paths in 29 shipped locations. Positioning is incoherent in three ways that break trust for an outside reader: the README lists Postgres/Redis/LangGraph/Temporal as **"Out of scope,"** yet all four are **built** under `orchestrator-langgraph/` and PROJECT_V1; there is **no `LICENSE` file** (the repo is legally "all rights reserved," per `docs/license-decision-needed.md`) despite presenting as a shareable, host-agnostic tool; and the "v0.1.0 release" named in the plan has **never reached `main`** (205 commits unmerged, no tag, no push). **Top 3 product risks:** (1) a new operator cannot reach first value unaided — high time-to-value, no seed, owner-specific config; (2) say-do gaps (scope, license, release) make the product read as unfinished/unshareable and erode trust; (3) the "successful real run" exists only on the author's machine, so the promise is unproven for anyone else. **Top 3 opportunities:** (1) a single `agent-run orchestrate <task-file>` entry point + a shipped sample repo would collapse time-to-value from hours to minutes; (2) resolving license + scope + release coherence (a half-day of decisions) unlocks sharing; (3) the policy/sanitization/audit safety story is genuinely differentiated — surfaced as a first-run "see the guardrails work" demo, it becomes the reason to adopt.

---

## Product Map

**Purpose / value proposition (one sentence, from `README.md:1-9` + `plan_proyecto_v4.md`):** *"A local-first MCP Gateway that lets the LLM you already drive (Claude Code, Codex, Gemini) safely orchestrate other coding agents — enforcing policy, sanitizing restricted code, auditing every action, and keeping a human in the loop on irreversible steps."*

**Target user & top jobs-to-be-done:** A single technical operator (the repo owner profile: a developer running coding agents locally) who wants to:
1. **Delegate implementation** to a coder agent and **independent review** to a second agent, without the two leaking raw restricted code to each other (the "coder→reviewer with sanitized handoff" core loop).
2. **Drive a plan-by-plan implementation loop** (pick next open task → coder → reviewer OK/KO → next) against a real repo — now realized as the KYA loop.
3. **Stay safe**: never let an agent push to a protected branch, change dependencies, or read restricted raw artifacts without an explicit human approval and a full audit trail.

**Intended "aha moment":** The operator watches a coder agent produce a diff, a reviewer agent review only the *sanitized* version, an approval gate pause for a human decision, and the whole thing land in an append-only audit — proving the guardrails are real, not advisory.

**Maturity:** Late MVP / early pilot. README declares "MVP2.0 closed" (`docs/mvp2-acceptance-checklist.md`, `ADR-005`); PROJECT_V1/V2 are open backlogs (`docs/pending-implementation-items.md`).

### Surface & feature inventory

| Surface | What it does | Status |
|---|---|---|
| **`agents-gateway` (MCP stdio server)** — `gateway/src/mcp_server.js` | The only runtime component. Tools: `orchestration.*`, `task.assign`, `agent.delegate/spawn/ask/view/kill`, `artifact.put/get/list/share`, `approval.request/respond/poll/wait`, `session.attach_info/intervention_note`, `message.send/list/reply`, `policy.check` | **BUILT** — `tools/list` verified in dry-run |
| **`agent-run` operator CLI** — `cli/src/agents_cli/main.py` | `policy validate`, `policy check`, `audit show`, `approve` | **BUILT** — help surfaces verified |
| **Adapters** — `gateway/src/adapters/` | Codex, Claude, Gemini; dry-run + supervised tmux | **BUILT** (dry-run verified; real Codex headless per CHANGELOG `W/0/0`) |
| **Orchestrator prompts** — `prompts/` | `orchestrator_system_prompt.md`, `orchestrator_mvp2_two_agent.md`, `orchestrator_planning_loop.md`, `planner_system_prompt.md`, `kya_coder/reviewer_prompt_template.md` | **BUILT** (this *is* the product for an LLM host) |
| **Policy registries** — `policies/` + `profiles/{mvp2,kya}/` | agent-capabilities, repositories, roles, sanitization-rules | **BUILT** — `validate` passes |
| **Client profiles** — `client-config/profiles/` | `codex-coder-claude-reviewer/`, `planner-assisted/` MCP+env examples | **BUILT** |
| **Operator docs** — `docs/` | operator-guide, mvp2/planning/kya runbooks, threat-model, ADRs 001-006 + V1-01..05 | **BUILT** |
| **`orchestrator-langgraph/`** — LangGraph/Temporal deterministic orchestrator | gateway client, delegate-review / plan-refine / implement-test-review-push graphs, Temporal worker/workflows/activities, Redis metrics consumer | **BUILT but (a) labeled "out of scope" by README and (b) PROJECT_V1 incomplete** (`E/0/2..4` pending) |
| **Interactive planning loop** | live human clarification before plan apply | **SPECCED only** — known defect: planning path is headless-only (`docs/pending-implementation-items.md`, PROJECT_V2 B) |
| **Postgres / Redis / Temporal stack** | durable state + event bus + workflows | **PARTIALLY BUILT, out-of-scope per README** — no complete docker-compose stack, no V1 runbook (`E/0/2`, `E/0/3` pending) |

**Primary journeys:**
- **Onboarding/activation:** clone → venv + `pip install -e cli[dev]` → `npm --prefix gateway install` → `agent-run policy validate` → `./scripts/ci.sh` → configure an MCP host to spawn `node ./gateway/src/mcp_server.js` → inject `prompts/orchestrator_system_prompt.md` → run a dry-run orchestration by hand-calling tools. **Time-to-value: high** (multi-tool, multi-host-config, no one-command path).
- **Core loop:** `orchestration.create` → `task.assign coder` → `agent.spawn/ask/view` → `artifact.put` → `artifact.share` (sanitized) → `task.assign reviewer` → reviewer `review_notes` → OK→`orchestration.complete` / KO→next trial. Documented in `README.md:96-138` and realized in `scripts/kya_run_task_mcp.sh`.
- **Approvals:** audit shows `APPROVAL_REQUIRED` → `agent-run approve <id> -d granted|denied`.

**Surprises:** (1) The README's "Out of scope" list is contradicted by what's actually in the repo. (2) The product has effectively pivoted from "build the orchestrator" to "use the orchestrator to build other projects" (KYA), but onboarding still describes only the former. (3) The canonical master plan (`plan_proyecto_v4.md`, `tareas_implementacion_v4.md`, 4,951 lines) is in **Spanish** while all code, docs, and prompts are in **English**.

---

## Product Audit

Findings are labeled **[FACT]** (observed/verified) or **[JUDGMENT]** (interpretation). Severity reflects consequence for the target operator or for adoption.

### Value proposition & promise

- **[FACT] Critical — The "successful real run" is unproven outside the author's machine.** The real two-agent and KYA flows depend on owner-specific absolute paths (`/home/carase/git/experiments/kya` in `docs/kya-implementation-runbook.md:3`; 29 `/home/carase` occurrences across shipped `scripts/`, `prompts/`, `.mcp.json`, and even a test `tests/gateway/codex_enable_profile.test.js`). *Consequence:* the promise ("orchestrate your agents safely") is demonstrated only in dry-run for a new user; the real value moment cannot be reproduced by a second operator without rewriting paths.
- **[FACT] High — Scope say-do gap.** `README.md:166-172` lists "Postgres, Redis Streams, event bus, LangGraph client … internal MCP servers" and "a standalone orchestrator binary or `orchestrator/` process" as **Out of scope**; `docs/architecture.md:40-44` says these "Do Not Exist." Yet `orchestrator-langgraph/` ships a LangGraph + Temporal orchestrator, `gateway/src/core/postgres_db.js` a Postgres backend, and `orchestrator-langgraph/src/.../consumers/metrics.py` a Redis consumer (CHANGELOG PROJECT_V1 C–E). *Consequence:* a reader cannot tell what the product *is*; the positioning docs actively misdescribe the codebase, undermining credibility.
- **[JUDGMENT] Medium — The value prop reads as diffuse across surfaces.** Three "orchestrator" prompts (generic, mvp2-two-agent, planning) plus a KYA loop, each with different model assignments, make it unclear which is *the* product. A newcomer cannot tell the canonical hero flow from the variants.

### Jobs-to-be-done coverage

- **[FACT] High — JTBD #1 (coder→sanitized→reviewer) is BUILT and is the strongest job.** Covered end-to-end by `tests/e2e/mcp_two_agent_workflow.test.js` and the dry-run path; sanitization is fail-closed (`M/0/3`). This is table-stakes *done well*.
- **[FACT] High — JTBD #2 (plan-driven loop) is served only via owner-specific scripting.** `scripts/kya_run_task_mcp.sh` realizes the loop but is hardwired to the owner's KYA repo; there is no generic "run this plan against my repo" capability. *Consequence:* the most valuable repeated job is not packaged for reuse.
- **[FACT] Medium — Interactive planning is unserved (known half-built).** `docs/pending-implementation-items.md:14-27` documents that the planning path is headless-only and cannot do live human clarification before applying a plan. *Consequence:* operators expecting a conversational planning session get a headless rehearsal; correctly flagged as PROJECT_V2 work — a **planning** finding, not yet a shipped-feature failure.

### User journeys & friction

- **[FACT] Critical — No first-run sample target; activation strands new users.** `docs/operator-guide.md` and the default `policies/repositories.json` reference `cvision`, `cvlib`, `sample-apps`, `developer-tools` — **none ship** and `cvision`/`cvlib` are the owner's private (restricted) repos. A fresh clone has nothing real to point `AGENTS_REPO_ROOTS` at and no seed data; the first dry-run returns mock responses, but the *real* loop has no on-ramp. *Consequence:* time-to-first-real-value is effectively blocked without the operator supplying and registering their own repo.
- **[FACT] High — No one-command happy path.** The CLI (`agent-run`) does only `policy/audit/approve`; it **cannot run an orchestration**. Activation requires wiring an MCP host, injecting a system prompt, and hand-calling ~8 tools (`docs/operator-guide.md:79-143`). *Consequence:* the product is usable only by operators already fluent in MCP-host configuration — a narrow funnel.
- **[JUDGMENT] Medium — The dry-run "first orchestration" returns mock data with no narrated payoff.** The guide tells you to inspect the audit afterward, but there is no guided "watch the guardrail fire" moment. The aha (sanitization/approval working) is reachable but not staged.

### Usability & UX quality

- **[FACT] Medium — The operator's only GUI is `agent-run audit show` + raw tool calls.** State (loading/empty/error/forbidden/success) lives in JSONL audit events and policy `ruleId`s. For the target technical user this is acceptable, but there is no at-a-glance "what's running / what's blocked / what's waiting on me" view. *Consequence:* the operator must reconstruct orchestration state from audit lines.
- **[FACT] Low — Troubleshooting is well-handled.** `docs/operator-guide.md:178-185` ships a symptom→cause→fix table; healthy.

### Functional correctness (user POV)

- **[FACT] High — `main` does not contain the product.** `git rev-list --left-right --count main...HEAD` = `0 205`: all V0–V3/V1/KYA work lives on feature/develop branches; `main` has none of it, there is no `v0.1.0` tag, and nothing is pushed (corroborated by project memory: "push de develop, merge a main + tag v0.1.0 … pendiente"). *Consequence:* anyone cloning `main` (the default) gets an empty/old product; the "release v0.1.0" named in `plan/PROJECT_V3` is not real.
- **[FACT] Medium — Dry-run correctness verified.** `node scripts/smoke_mcp.mjs` → "MCP smoke OK"; `agent-run policy validate` path documented as passing. The happy path does what it says in dry-run.

### Content, copy & messaging

- **[FACT] High — Model references are inconsistent across surfaces.** `prompts/orchestrator_mvp2_two_agent.md:17-20` says coder `gpt-5` / reviewer `claude-opus-4-7`; `README.md:162` says `claude-opus-4-7`; `docs/kya-implementation-runbook.md:9-13` says coder `gpt-5.5` / planner `claude-fable-5` / reviewer `claude-opus-4-8` (per memory). *Consequence:* an operator copying a runbook may select a model the policy registry doesn't allow, hitting a denial; the docs don't present one source of truth for "current models."
- **[FACT] Medium — Spanish/English split.** The canonical plan (`plan_proyecto_v4.md`, `tareas_implementacion_v4.md`) is Spanish; everything else English. *Consequence:* a non-Spanish contributor cannot read the product's foundational design doc.

### Onboarding & time-to-value

- **[FACT] High — Setup is multi-runtime (Python venv + Node + tmux) before any value.** Reasonable for the audience but front-loads all friction before the first dry-run. No `make setup` / single bootstrap script. (`scripts/ci.sh` exists but runs tests, not setup.)

### Differentiation & positioning

- **[JUDGMENT] High — The genuine differentiator (deterministic policy + fail-closed sanitization + append-only audit between agents) is under-sold.** The README leads with architecture, not with "your reviewer agent literally cannot see restricted raw code, and every action is audited." This safety story is the category-differentiating reason to adopt and is buried.
- **[FACT] High — No `LICENSE` blocks the differentiation from mattering.** `docs/license-decision-needed.md` confirms the repo is "all rights reserved" by default. *Consequence:* a shareable, host-agnostic tool that legally cannot be used or contributed to by anyone else.

### Measurement & feedback loops

- **[FACT] Medium — Excellent action-level audit, no outcome-level metrics.** Every tool call is in JSONL audit with `traceId`; there is no aggregate view of activation, task-success rate, KO-retry counts, or time-to-OK. *Consequence:* the team cannot see whether operators succeed, only that individual events fired. (Assessed presence only; read-only.)

### Coherence, focus & scope

- **[FACT] High — Out-of-scope-but-built V1 component creates a half-finished surface in the repo.** `orchestrator-langgraph/` is shipped but PROJECT_V1 is incomplete (`E/0/2` no full stack, `E/0/3` no runbook, `E/0/4` no gate). *Consequence:* a visitor sees a substantial second component with no operating instructions and a README that says it shouldn't exist.
- **[FACT] Low — Root clutter.** Two ~88 KB Spanish planning docs plus `audit/` sit in repo root; minor IA noise.

### Strengths (preserve these)

- **[FACT] The safety model is coherent and tested.** Policy-before-spawn (`ADR-003`), fail-closed sanitization (`M/0/3`), append-only audit, human-gated approvals with bounded opt-in auto-approve (`ADR-006`), and a threat model where **every** threat has a `Tested by:` reference (`docs/architecture.md:69-72`). This is the product's spine and it is solid.
- **[FACT] It runs out of the box in dry-run** with no network or real agents (`scripts/smoke_mcp.mjs` → OK) — a safe, honest sandbox.
- **[FACT] Real dogfooding.** The product built its own V1/V2/V3 backlog and now drives the external KYA project through the same Gateway loop — strong evidence the core loop works in anger (for the author).
- **[FACT] Operator docs are above MVP bar** — guide, three runbooks, troubleshooting table, ADRs, generic client profiles.

---

## Product Strategy

**Themes that explain most findings:**

1. **"It works for one operator, not for the next one."** The core loop is proven by dogfooding, but every on-ramp (sample repo, registry, paths, one-command run, license) assumes the author's machine. *Target state:* a stranger can clone, run one command, and watch the guardrails fire against a shipped sample repo within 10 minutes. *Principle: **show value before asking for setup** — ship the demo, not just the toolkit.*
2. **"The docs describe a different product than the repo."** Scope (V1 out-of-scope-but-built), license (absent), release (not on `main`), and models (inconsistent) all say one thing and do another. *Target state:* README, ADRs, license, `main`, and model references agree. *Principle: **one source of truth per claim**; never ship a positioning doc the codebase contradicts.*
3. **"The safety story is the product, but it's buried."** Policy + sanitization + audit is the differentiator; it's presented as architecture, not as the headline benefit. *Target state:* the first thing a visitor sees and the first thing the demo proves. *Principle: **lead with the guardrail, not the topology.***
4. **"The repeated job isn't packaged."** The plan-driven loop is the highest-value repeated job but exists only as an owner-specific script. *Principle: **productize the loop you actually run.***

**Explicit trade-offs (what NOT to build now):**
- **Do not finish PROJECT_V1 (Postgres/Redis/Temporal/full stack) yet.** It is premature for an unreleased single-operator MVP, contradicts the stated scope, and distracts from the activation gap. Either *de-scope it out of the shipped repo* (move to a branch) or *explicitly relabel it "experimental / not in MVP."* Don't invest more until a second operator can run the basic loop.
- **Do not build a custom GUI/dashboard.** The audit-JSONL + CLI is adequate for the technical persona; a status *view* (read-only summary command) is enough.
- **Do not add more orchestrator prompt variants.** Consolidate to one canonical hero flow first.

**Success signals (measurable):**
- **Activation:** a new operator reaches the aha (sanitized handoff + approval gate firing) against a shipped sample repo in **< 10 min, ≤ 1 command after install**.
- **Reproducibility:** the real (non-dry-run) loop runs on a machine that is **not** the author's, with **zero** `/home/carase` edits required.
- **Coherence:** **0** contradictions between README scope and shipped components; a `LICENSE` exists; `main` contains the released code with a `v0.1.0` tag.
- **Repeated-job:** an operator runs `<plan>` against their own repo via a documented, generic entry point (not a hand-edited script).

---

## Roadmap

### Quick wins (high impact, S effort — do immediately)

| # | Item | Why | Effort |
|---|---|---|---|
| QW1 | **Add a `LICENSE`** (owner decides MIT/Apache-2.0) and delete `docs/license-decision-needed.md` | Unblocks any external use/sharing; the tool currently is legally unusable by others | S |
| QW2 | **Reconcile README "Out of scope" with reality** — relabel V1 (Postgres/Redis/LangGraph/Temporal) as "Experimental (PROJECT_V1), not in MVP" instead of "Out of scope" | Removes the single most credibility-damaging say-do gap | S |
| QW3 | **Publish one model source-of-truth** — a short `docs/models.md` (or a registry-derived table) and make all prompts/README/runbooks reference it | Stops operators selecting policy-denied models | S |
| QW4 | **Merge to `main` + tag `v0.1.0` + push** (the operator follow-up already named in memory/PROJECT_V3) | Makes the default clone the actual product | S |

### Milestone 0 — Validate & instrument (de-risk before building)
| Item | Outcome | Surfaces | Acceptance (observable) | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| M0.1 Time-to-value baseline | Measure how long a stranger takes from clone to aha on a clean VM | onboarding | A non-author runs the dry-run hero flow on a fresh box; record minutes + every blocker | M | low | — |
| M0.2 Outcome metrics in audit | Team can see success, not just events | `agent-run audit` | New `agent-run audit summary --trace-id` shows task count, KO retries, time-to-OK, approvals pending | M | low | — |

### Milestone 1 — Fix the core promise (trust + activation blockers)
| Item | Outcome | Surfaces | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| M1.1 Ship a sample repo + seed registry | A new operator has something real to orchestrate immediately | new `examples/sample-app/`, `policies/repositories.json` | After install, `AGENTS_REPO_ROOTS` points at the shipped sample; the hero loop runs against it with no owner edits | M | med (IA) | QW4 |
| M1.2 De-owner-ify shipped paths | The KYA/real flow runs on any machine | `scripts/kya_*`, `prompts/kya_*`, `.mcp.json`, test | `grep -r /home/carase` over shipped (non-history) files returns 0; paths come from env/args | M | med | — |
| M1.3 One-command orchestration entry point | An operator runs the loop without hand-calling 8 tools | `agent-run` (new `orchestrate`/`run-plan`) or a documented wrapper | `agent-run orchestrate --task <file>` (or `run-plan <dir>`) drives create→coder→review→complete against the sample | L | med | M1.1 |
| M1.4 Decide V1's fate | Repo matches its description | `orchestrator-langgraph/`, README | Either V1 moved to a branch, or clearly fenced as experimental with its own runbook; README scope is true | M | low | QW2 |

### Milestone 2 — High-leverage bets
| Item | Outcome | Surfaces | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| M2.1 "See the guardrail fire" guided demo | The aha is staged, not stumbled into | new `scripts/demo.mjs` + guide | One command runs a scripted orchestration that deliberately triggers a sanitization + an approval gate and prints the audit proof | M | low | M1.1 |
| M2.2 Productize the plan-driven loop | The highest-value repeated job is reusable | generic plan-runner from `kya_*` | An operator points the runner at any registered repo + plan dir and it advances tasks by OK/KO with no per-project script edits | L | med | M1.2, M1.3 |
| M2.3 Read-only orchestration status view | Operator sees running/blocked/waiting at a glance | `agent-run` | `agent-run status --trace-id` lists tasks, sessions, pending approvals, last verdict | M | low | M0.2 |

### Milestone 3 — Polish & delight
| Item | Outcome | Effort |
|---|---|---|
| M3.1 Consolidate orchestrator prompts to one canonical + thin variants | M |
| M3.2 Translate/append English summary of the V4 master plan | M |
| M3.3 Interactive planning loop (PROJECT_V2 B) — live human clarification before apply | XL |
| M3.4 Repo-root cleanup (move large plan docs under `plan/` or `docs/`) | S |

### Design sketches — top 3 items

**1. M1.1 — Ship a sample repo + seed registry.**
*Approach:* add `examples/sample-app/` (a tiny real git repo: a couple of source files + a failing test), register it in `policies/repositories.json` as `unrestricted` and in the default `AGENTS_REPO_ROOTS` guidance, and rewrite the operator-guide's first orchestration to target it. *Key flow:* clone → install → `agent-run policy validate` → run hero loop against `examples/sample-app`. *Gotchas:* keep it `unrestricted` so the dry-run needs no approvals; ensure the sanitizer still has something to demonstrate (M2.1 adds a restricted variant). *Validate:* a non-author on a clean VM completes the loop with zero edits to any `/home/carase` path.

**2. M1.3 — One-command orchestration entry point.**
*Approach:* extend `agent-run` (or ship a thin `scripts/orchestrate.mjs`) that reads a task file (goal, repo, coder/reviewer agents+models) and drives the documented `orchestration.create → task.assign → agent.* → artifact.* → approval → complete` sequence — the same shape the orchestrator prompt describes, but deterministic and operator-invokable. *Key screens:* terminal progress (task started / artifact produced / sanitized share / approval pending / verdict). *Gotchas:* it must call the *real* MCP Gateway (not bypass policy), so it becomes a reference MCP client; respect dry-run. *Validate:* `agent-run orchestrate --task examples/sample-task.yaml` produces the same audit trail as the hand-called flow.

**3. M2.1 — "See the guardrail fire" guided demo.**
*Approach:* a scripted dry-run orchestration that (a) creates a `raw_diff` classified `restricted`, (b) shares it to a reviewer and shows the reviewer receiving only the *sanitized* form, (c) hits an `approval.request` that pauses for `agent-run approve`, then (d) prints the `SANITIZATION_APPLIED` + `APPROVAL_REQUIRED` audit lines as proof. *Gotchas:* must stay dry-run/no-network; the pause should be skippable with `AGENTS_AUTOAPPROVE` for CI. *Validate:* a first-time user, after this demo, can state in one sentence what the product protects them from.

---

## Open Questions (need a human decision)

1. **License:** MIT, Apache-2.0, or remain private? (Blocks all external sharing — QW1.)
2. **Target segment:** Is this *only* the owner's personal orchestration tool, or a shareable open tool for other developers? The roadmap above assumes the latter; if it's the former, M1.1–M1.3 (de-owner-ification, sample repo, one-command run) drop in priority and the say-do gaps matter less.
3. **PROJECT_V1's status:** keep Postgres/Redis/LangGraph/Temporal in the shipped repo as "experimental," or move to a branch until MVP is releasable? (M1.4.)
4. **Release intent:** should `main` + `v0.1.0` be cut now (QW4), or is the project deliberately staying on feature branches?
5. **Canonical hero flow:** is the *two-agent code review loop* or the *plan-driven implementation loop* (KYA) the headline job to optimize onboarding around? This decides whether M2.2 or M2.1 leads Milestone 2.
6. **Models policy:** which model set is current/blessed (the mvp2 prompt's `gpt-5`/`opus-4-7` vs. KYA's `gpt-5.5`/`fable-5`/`opus-4-8`)? Needed for QW3.

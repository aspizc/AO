# Architecture & Infrastructure Audit — agents-orchestrator

**Auditor:** Principal architect / platform-SRE review (read-only — no infra, code, or IaC changed)
**Date:** 2026-06-19
**Repo state:** branch `feature/enable-codex-planner`; HEAD 205 commits ahead of `main`.
**Method:** Derived the as-built topology directly from imports, the composition root (`tools/index.js`), the migration schema, `docker/docker-compose.yml`, the MCP stdio client (`gateway_client.py`), the Temporal worker (`worker.py`), and the ADRs — rather than trusting the architecture docs. Verified the layer-import graph by grep. The intended architecture is read from ADR-001/002/003 and the README; the as-built from code and manifests; the drift between them is treated as a first-class finding.

---

## Executive Summary

**Overall grade: C+ — structure B−, operational readiness D+.** *Resilience/operability posture: a clean, well-bounded single-process core that is genuinely debuggable through its `traceId`-correlated audit trail, but not yet operable as a service — no CI, no crash recovery, no health/metrics/alerts — sitting beside a built-but-inoperable multi-service "V1" layer that contradicts the repository's own stated "gateway-only" architecture.** The in-scope Gateway is architecturally sound: a strict `tools → services → core → adapters` layering that is **actually respected** as-built (verified — no adapter imports a tool/service, `core` imports nothing upward, `policy_engine` imports no adapter/LLM), a **single trust boundary** (every tool routes through `policy_engine.evaluate` before any side effect — ADR-003), one **coherent composition root** (`tools/index.js`), and **clean data ownership** (one SQLite DB for state, the filesystem for artifact bytes, an append-only JSONL audit — all keyed by `traceId`, single-writer per Gateway process). The architecture's problems are four. **(1) Boundaries are documented, not enforced:** the forbidden-import rules in `architecture.md:15-19` have **no CI guard** (the "structure tests" only assert directories exist — `test_project_layout.py`), and there is no CI at all, so the clean graph survives by discipline only. **(2) Intended-vs-as-built drift:** ADR-002 ("NO long-running orchestrator process," still `Status: accepted`) is contradicted by the as-built `orchestrator-langgraph/` — a second runtime with LangGraph graphs, a **Temporal worker** (ADR-V1-05), a Redis-stream consumer, and a Postgres backend — and the README still lists all of these as "Out of scope." **(3) The V1 layer is built but not operable:** `docker-compose.yml` ships only Postgres + Redis (2 of the 6 services the V1 plan calls for — no Temporal, no OTel collector, no gateway), there is **no Dockerfile** for the Gateway, and the workflow's terminal `push` is a hardcoded dry-run no-op. **(4) The base Gateway has no operability story:** no crash recovery (a mid-orchestration crash orphans tmux agent sessions and leaves `running` rows with no reconciliation on restart), no health/readiness/metrics/alerts/SLO, and a synchronous `spawnSync` on the headless `delegate` path that blocks the single-process event loop for the entire agent run. **Top 3 structural risks:** (a) the unreconciled ADR drift means no one can trust the docs to know what the system *is*; (b) under the per-stdio-subprocess topology, concurrent Gateways against one workspace can interleave-corrupt the append-only audit (the security record); (c) the V1 durability layer is half-wired and inoperable, so its promised crash-durability does not exist as deployed. **Top 3 opportunities:** (a) add CI with a dependency-cruiser/import-linter boundary check — cheap, locks in the clean structure; (b) reconcile the ADRs (mark 001/002 superseded-in-part, fence or relabel V1) so intended == as-built; (c) give the base Gateway a boot-time session-reconciliation pass and a health signal — small work, large operability gain. The V1 design itself is thoughtful (it keeps the Gateway contract as the boundary even under Temporal, models approval as a signal, never auto-grants on replay, and *honestly records* its at-least-once duplicate-side-effect gap) — it is unfinished and unreconciled, not unsound.

---

## Architecture Map

### Style & bounded contexts
- **Style (as-built):** a **layered modular monolith** delivered as a **single-process MCP stdio server** (the Gateway), plus a **separate, optional event-driven/durable-workflow runtime** (`orchestrator-langgraph`, PROJECT_V1) that is a *client* of the Gateway.
- **Bounded contexts:** Policy/registry, Orchestration/task lifecycle, Agent execution (adapters), Artifact + sanitization, Approvals, Audit/telemetry, Sessions. Each maps to a `services/*` + `core/*` pair and a `tools/*` facade. Boundaries are coherent and single-responsibility.
- **Intended dependency direction:** `tools → services → core`; `adapters` are leaves spawned by `services` via a registry; `core` depends on nothing upward (`architecture.md:7-13`).

### Component topology (derived)
```
[ MCP host = orchestrator role (Claude/Codex/Gemini) ]
        | MCP over stdio (one Gateway subprocess per client)
        v
[ agents-gateway : node mcp_server.js ]  ── single process, single trust boundary
   tools/* → services/* → core/{policy,sanitizer,artifact_store,audit,state,registry,telemetry}
                              └ adapters/{codex,claude,gemini} → spawnSync + tmux panes (real agent CLIs)
   stores: SQLite state.db | filesystem artifacts/ | append-only audit/events.jsonl
   optional: → redis-cli XADD "agents:events"  (best-effort, fire-and-forget)

[ orchestrator-langgraph : python ]  ── PROJECT_V1, optional, separate runtime
   • spawns its OWN gateway stdio subprocess (gateway_client.py:44-52)
   • Temporal worker (worker.py) → workflow ImplementTestReviewPushWorkflow → activities call Gateway MCP tools
   • Redis-stream metrics consumer (consumers/metrics.py) ← "agents:events"
   • optional Postgres state backend for Gateway repos (core/postgres_db.js via AGENTS_DB_URL)
```

### Module / dependency map (verified by import grep)
- `adapters/` → **does not** import `tools/` or `services/` (✓). `core/` → imports nothing from `tools|services|adapters` (✓). `policy_engine` → no adapter/LLM import (✓).
- **One upward reach:** `services/agent_service.js:5` imports `../adapters/intervention_detector.js` directly (a service reaching a specific adapter module rather than going through the adapter registry). Minor.
- **Composition root:** `tools/index.js getToolRegistry()` wires adapter registry + agent service + all tool builders via DI (`{config, registries}`); core singletons (`audit`, `sanitizer`, `artifact_store`, `state`) are configured separately in `mcp_server.js main()`. Two-part composition (boot configures singletons; `getToolRegistry` wires the rest).
- **No circular dependencies** found in `gateway/src`.

### Communication & data/event flow
- **Sync:** MCP-over-stdio (JSON-RPC). No HTTP/gRPC; no network listener. Each MCP client gets its **own Gateway subprocess**.
- **Async/event plane (optional, V1):** Redis Stream `agents:events`. Publisher = `audit.js createRedisCliPublisher` (spawns `redis-cli XADD`, 500 ms timeout, errors only warned — **at-most-once, fire-and-forget**). Consumer = `consumers/metrics.py` (`xread` once, **no consumer group, no ack, no DLQ, no retry, no idempotency**, exits after one batch).
- **Durable workflow (optional, V1):** Temporal owns workflow history/replay; side effects are activities calling Gateway MCP tools; approval is a Temporal signal; retries `max_attempts=1` (ADR-V1-05).

### Data architecture & ownership
- **SQLite** (`better-sqlite3`, WAL, FKs ON) owns: `orchestration_sessions`, `tasks`, `sessions`, `artifacts` (metadata), `messages`, `policy_decisions`, `approvals` — all `trace_id`-keyed, CASCADE FKs (`migrations/001_initial.sql`).
- **Filesystem** owns artifact **bytes** (`artifact_store.js`); SQLite stores the `path`.
- **Append-only JSONL** owns the **audit** (`workspace/audit/events.jsonl`) — separate from the DB.
- **Optional Postgres** backend (`postgres_db.js`, opt-in via `AGENTS_DB_URL`) is a `psql -c` string-executor scaffold with its own migration (`migrations/postgres/001_initial.sql`).
- **Single source of truth per store; single writer per Gateway process.** (Multi-process topology weakens this — see A-D2.)

### Packaging / deploy / runtime / observability
- **Build/packaging:** none for the app — the Gateway runs as `node gateway/src/mcp_server.js`; **no Dockerfile, no image, no SBOM/signing**. Node deps pinned via `package-lock.json` (✓); Python deps unpinned (no lockfile).
- **IaC:** one `docker/docker-compose.yml` providing **Postgres + Redis only** (opt-in infra; default creds `agents/agents`; ports 5432/6379 on localhost). No Terraform/Helm/k8s.
- **Environments:** local only; configured by `AGENTS_*` env vars. No dev/staging/prod, no parity concerns (only one).
- **Observability:** structured JSON logs to **stderr** (`mcp_server.js logErr`, `worker.py log_json`); **OTel-inspired spans** correlated by `traceId` (`core/telemetry.js`), opt-in stderr export (`AGENTS_OTEL_ENABLED`, default off; **no real collector wired**). **Primary observability = the append-only `traceId`-correlated audit log** (genuinely good for forensic debugging). No metrics, SLOs, alerts, dashboards, or HTTP health/readiness endpoint (a stdio server; `tools/list` is the de-facto liveness; the Temporal worker has a `worker_health_check` activity).

### Intended-vs-as-built deltas (the headline)
| Intended (ADR/README) | As-built | Delta |
|---|---|---|
| ADR-002: "NO long-running orchestrator process" (`accepted`) | `orchestrator-langgraph/` Temporal worker runs durable orchestration workflows (ADR-V1-05, `accepted`) | **Direct, unreconciled ADR conflict** |
| README: Postgres/Redis/LangGraph/Temporal "Out of scope" | All four built (`postgres_db.js`, redis publisher/consumer, LangGraph graphs, Temporal worker) | Positioning contradicts code |
| V1 plan: full stack (PG, Redis, Temporal, OTel collector, Gateway, services) | compose has PG + Redis only; no Temporal/collector/gateway image | V1 **inoperable as deployed** (`E/0/2` pending) |
| Durable crash-recovery via Temporal | Temporal worker exists but no Temporal in compose; push activity is a dry-run no-op | Durability promised, not deployable |

### Surprises
- The repository contains **two architectures** with two conflicting sets of "accepted" ADRs (MVP gateway-only vs. V1 durable-orchestrator) and never marks one as superseding the other.
- The Gateway is a **per-client stdio subprocess**, so the "single-writer" data model quietly depends on a single concurrent Gateway — a convention, not an enforced invariant.
- The headline "supervised/durable" system uses a **synchronous, event-loop-blocking** `spawnSync` for headless execution.

---

## Architecture Audit

Findings are **[FACT]** (verified) or **[JUDGMENT]**, with the component/manifest and concrete consequence.

### Architecture style & boundaries
- **AB1 — High — Two conflicting "accepted" architectures; ADR-002 not reconciled with V1.** **[FACT]** `ADR-002` (`Status: accepted`, "NO long-running orchestrator process") vs `ADR-V1-05` (`Accepted`, a Temporal worker running durable orchestration). Neither references the other; the README still frames the ADR-002 world as current. *Consequence:* the architecture docs cannot be trusted to tell a contributor what the system is or which path is supported — every onboarding and design decision starts from a contradiction.
- **AB2 — Low — The boundary design itself is sound and the V1 layer respects it.** **[FACT/JUDGMENT]** ADR-V1-05 keeps the Gateway MCP contract as the security boundary even under Temporal (side effects are activities calling Gateway tools; approval is a signal; no auto-grant on replay). *Consequence:* positive — the drift is a documentation/coherence problem, not an unsound design.

### Modularity, coupling & cohesion
- **MC1 — Medium — Layer boundaries are documented but unenforced.** **[FACT]** `architecture.md:15-19` states forbidden imports; the only structural tests (`tests/structure/test_project_layout.py`) check that directories exist and are non-empty — not the import graph. No dependency-cruiser/import-linter exists; no CI runs them anyway. *Consequence:* the clean graph (verified today) has nothing preventing the first cross-layer import from landing silently; coupling will creep exactly where it's hardest to see.
- **MC2 — Low — One service→adapter reach-through.** **[FACT]** `agent_service.js:5` imports `adapters/intervention_detector.js` directly rather than via the adapter registry. *Consequence:* minor coupling; a second such import would start eroding the "services use adapters only through the registry" rule.

### Project & repository organization
- **PO1 — Medium — A whole second runtime (`orchestrator-langgraph/`) sits at repo root with no operating home.** **[FACT]** It is a peer top-level package with its own `pyproject.toml`, tests, and Temporal worker, but no deployment docs and no place in the compose stack. *Consequence:* "where does X run?" is unanswerable for half the code; contributors can't tell it's experimental/unwired.
- **PO-strength — [FACT]** The Gateway tree is highly discoverable and consistent (`tools/services/core/adapters/infra` + mirrored `core/repositories/`), and `plan/` + ADRs give strong decision traceability.

### Component topology & responsibilities
- **CT1 — Medium — The Gateway is a single-process component with a self-blocking hot path.** **[FACT]** `agent.delegate` runs the real agent via synchronous `spawnSync` (adapters) wrapped in a `Promise.race` timeout (`agent_service.js:117`) that cannot interrupt synchronous work. *Consequence:* during a headless delegate (the KYA hot path) the single Gateway process serves **no other tool call** — approvals, audit queries, and other agents all stall until the child exits. A single component is both the API and the executor with no isolation between them.
- **CT-strength — [FACT]** Each runtime component has one clear responsibility; the adapter registry cleanly fans execution out to codex/claude/gemini; no god-component.

### Inter-component communication & contracts
- **IC1 — Medium — No versioned external contract for the Gateway tool surface.** **[FACT]** Tools are validated by per-tool Zod schemas (`tools/*.js`) and registries by JSON Schema (`schemas/`), but there is **no published, versioned MCP tool contract** (no OpenAPI/proto equivalent, no schema-version negotiation). The V1 LangGraph client and the KYA runner both bind to tool names/shapes by convention. *Consequence:* a breaking change to a tool's input shape silently breaks every client; there is no contract test across the process boundary. (Registries themselves are versioned — `version: 2` — which is good for *data*, not for the *tool API*.)
- **IC-strength — [FACT]** `traceId` is threaded through every call and store and is extracted defensively from many envelope positions (`telemetry.js:41-60`); correlation across components is a real strength.

### Messaging, queues & event flow
- **MQ1 — Medium (scoped to V1) — The "event bus" has no delivery guarantees, consumer group, DLQ, or idempotency.** **[FACT]** Publisher is fire-and-forget `redis-cli XADD` with a 500 ms timeout and warn-only errors (`audit.js:109-135`); consumer `xread`s once and exits, with no group/ack/retry/DLQ (`consumers/metrics.py:181-184`). *Consequence:* audit events can be silently dropped on the stream path, and the consumer is not a durable subscriber — fine for an optional metrics side-channel, but it is **not** a reliable event bus and must not be treated as the audit source of truth (the JSONL file remains authoritative — good).
- **MQ2 — Medium (scoped to V1) — At-least-once duplicate-side-effect risk on mid-activity crash, by the authors' own admission.** **[FACT]** ADR-V1-05 Consequences: "Abrupt mid-activity process death remains a separate at-least-once execution risk until Gateway durable idempotency keys are available"; retries are pinned to `max_attempts=1` as the mitigation. *Consequence:* a worker crash mid-`agent.delegate` could re-run an implementation activity (double code execution) on replay; honestly documented and bounded, but unresolved. The fix (Gateway-side durable idempotency keys) is a Gateway-contract change, not a worker change.

### Data architecture & state ownership
- **DA1 — Medium — The single-writer model depends on an unenforced single-Gateway convention.** **[FACT]** The Gateway is spawned per stdio client (`gateway_client.py:44-52`; the KYA runner spawns one per task), and multiple Gateways can point at the same `AGENTS_WORKSPACE`. SQLite WAL tolerates concurrent writers, but the audit log is `fs.appendFileSync` (`audit.js:80`) from each process — POSIX append is atomic only for writes ≤ PIPE_BUF (4096 B), and audit lines (with prompt prefixes/metadata) can exceed that. *Consequence:* under concurrent Gateways the **append-only audit — the security record — can interleave and corrupt**. The reader degrades gracefully (`_corrupt` markers, `audit.js:254`), but integrity of the forensic trail is at risk. The "single-orchestrator rule" is a runbook convention (KYA runbook), not an enforced lock.
- **DA-strength — [FACT]** Schema is normalized, `trace_id`-keyed, CASCADE-correct, indexed; artifact bytes vs. metadata split is clean; classification is a CHECK-constrained column.

### Packaging, build & supply chain
- **PB1 — Medium — No build artifact / image for the Gateway; no SBOM/provenance.** **[FACT]** No Dockerfile; deploy = run a node process. *Consequence:* no reproducible deployable unit, no supply-chain attestation — acceptable for local single-operator, a hard blocker for the V1 "production durability" aspiration.
- **PB2 — Low — Python deps unpinned (no lockfile).** **[FACT]** `cli` + `orchestrator-langgraph` `pyproject.toml` declare ranges only. *Consequence:* non-reproducible Python installs; the heavy LangGraph/Temporal/Redis tree is also unpinned.
- **PB-strength — [FACT]** Node lockfile present; `npm audit` clean (from the code audit).

### Deployment, environments & IaC
- **DE1 — High — The V1 stack is inoperable as shipped (IaC covers 2 of 6 services).** **[FACT]** `docker-compose.yml` defines only Postgres + Redis; the V1 plan's "complete stack" (Temporal, OTel collector, Gateway, project services) is pending (`E/0/2`, `docs/pending-implementation-items.md`). The Temporal worker (`worker.py`) connects to `localhost:7233`, but nothing starts a Temporal server. *Consequence:* the durable-workflow architecture **cannot be run** from this repo; ADR-V1-05's crash-recovery only works in an opt-in test harness, not in any deployable environment.
- **DE2 — Low — Compose uses default credentials and exposes ports.** **[FACT]** `agents/agents`, `5432/6379` published. *Consequence:* fine for localhost dev; would be a finding if ever promoted. No rollback/canary/promotion story exists (nor is one needed at this maturity).

### Reliability, scalability & failure modes
- **RS1 — High — The base Gateway has no crash recovery / session reconciliation.** **[FACT]** `mcp_server.js main()` does `initState → configure → serve`; there is **no boot-time pass** to reconcile `sessions`/`tasks` left in `running`/`starting` after a crash. tmux panes (real agent processes) are orphaned; rows stay `running`. *Consequence:* a Gateway crash mid-orchestration leaves zombie agent sessions consuming the host and a state DB that lies about what's running; recovery is manual (`tmux kill` + DB edits). Temporal solves this for the V1 path only.
- **RS2 — Medium — Single-process SPOF + event-loop blocking (CT1) = whole-system stall, not just one task.** **[FACT]** Because one process is API + executor + all stores, the blocking `spawnSync` (CT1) makes a single long agent run a system-wide availability outage for the duration. *Consequence:* no bulkhead between "run an agent" and "answer an approval poll."
- **RS-strength — [FACT]** The V1 durable path is designed for exactly these failure modes (Temporal replay, approval-as-signal, no auto-grant on replay) — the right pattern, just not yet operable (DE1).

### Observability & monitoring
- **OB1 — High — No metrics, SLOs, alerts, or health endpoint; observability is opt-in/forensic only.** **[FACT]** OTel spans are off by default and export only to stderr (`telemetry.js`, `config.js:86`); no collector; no `/health`. *Consequence:* there is no live signal that the Gateway is up, stuck (e.g., blocked in `spawnSync`), or failing — you find out by reading the audit log after the fact. Not debuggable *in real time*.
- **OB-strength — [FACT]** The `traceId`-correlated append-only audit + structured stderr logs make **post-hoc** debugging genuinely strong; the threat model ties events to tests. Preserve this.

### Trust boundaries & isolation (topology level)
- **TB1 — Medium — The single trust boundary is correctly centralized but governed by per-process env, not centrally.** **[FACT]** Every path (including the V1 worker) enters through the Gateway and `policy_engine` (ADR-003) — excellent. But each Gateway subprocess trusts its own `AGENTS_*` env (cwd allowlist, `AGENTS_AUTOAPPROVE`, `AGENTS_CODEX_SANDBOX`), and the committed `.mcp.json` enables autonomy. *Consequence:* the boundary's strength varies per launch with no central policy on how Gateways may be configured; a weak env silently weakens the boundary. (Code-level detail is in the code audit; here it's the topology consequence.)
- **TB-strength — [FACT]** One enforcement point, no orchestrator bypass (ADR-002 consequence, verified), no child-to-child channel — a clean, auditable boundary.

### Strengths to preserve
1. **Respected layering + single trust boundary** — the structural backbone is correct and verified as-built.
2. **One coherent composition root** with dependency injection (`tools/index.js`).
3. **Clean data ownership** (SQLite state / FS bytes / JSONL audit, all `traceId`-keyed, single-writer-per-process).
4. **`traceId` correlation everywhere** + append-only audit = strong forensic observability.
5. **Per-decision ADR discipline** (each significant decision is recorded — the *individual* ADRs are good; only their reconciliation is missing).
6. **The V1 durability design is the right pattern** (Gateway-as-boundary preserved, approval-as-signal, no auto-grant on replay, honestly-documented idempotency gap).

---

## Architecture Strategy

**Themes:**

1. **"Two architectures, one repo, no reconciliation."** (AB1, PO1, DE1, README drift.) *Target state:* a single declared architecture — MVP gateway-only as current, V1 as explicitly-experimental-and-fenced — with superseded ADRs marked. *Principle: the docs describe the as-built or they are deleted.* *Fitness function:* a CI doc-check that fails if `orchestrator-langgraph/` exists while the README lists it as out-of-scope (or vice-versa).
2. **"Clean boundaries held only by discipline."** (MC1, MC2, IC1.) *Target state:* the layer graph and the tool contract are enforced by automated checks. *Principle: a boundary that isn't a fitness function will drift.* *Fitness function:* dependency-cruiser (JS) + import-linter (Py) + a tool-contract snapshot test, all required in CI.
3. **"Built, not operable."** (RS1, OB1, DE1, PB1, CT1.) *Target state:* the base Gateway has crash recovery, a health signal, and a non-blocking executor; the V1 stack either runs end-to-end or is clearly fenced. *Principle: if it can't tell you it's alive and can't recover when it dies, it isn't done.* *Fitness function:* a boot-reconciliation test (kill mid-session → restart → zero zombie sessions) and a liveness check.
4. **"The per-subprocess topology quietly breaks single-writer."** (DA1.) *Target state:* either an enforced single-Gateway lock per workspace, or a multi-writer-safe audit sink. *Principle: invariants the data model relies on must be enforced, not assumed.* *Fitness function:* a concurrent-Gateway test that asserts no audit-line corruption.

**Trade-offs — what NOT to re-architect:**
- **Don't split the Gateway into microservices.** The single-process modular monolith is correct for a local single-operator tool; the fix for CT1/RS2 is an async executor + optional out-of-process agent runner, not service decomposition.
- **Don't build k8s/Terraform/multi-region.** Compose is the right ceiling for this maturity; invest only if the V1 production aspiration is confirmed (Open Question).
- **Don't harden the Redis/Postgres event/data plane in place** until V1's fate is decided (Theme 1). Adding DLQ/consumer-groups/bound-parameter drivers to an out-of-scope, unwired layer is effort ahead of the decision.
- **Don't finish the Temporal stack** unless durable multi-step orchestration is a committed goal; if it is, it needs Temporal-in-compose + a Gateway image + durable idempotency keys (a real program, XL).

**"Done" signals (enforceable):**
- CI runs and **requires**: dependency-cruiser + import-linter (no cross-layer import), a Gateway tool-contract snapshot test, and the existing `scripts/ci.sh`.
- Killing the Gateway mid-orchestration and restarting leaves **zero** `running` sessions and zero orphaned tmux panes (reconciliation test passes).
- Every "accepted" ADR matches the as-built; the README scope section is true; no ADR contradicts another without a `Superseded by` link.
- A concurrent-Gateway test produces **zero** corrupted audit lines (or a workspace lock prevents concurrency).
- The headline `delegate` path is non-blocking: a concurrent `policy.check` returns < 100 ms while an agent runs.

---

## Plan

### Quick wins (high impact, S effort)
| # | Item | Affected | Effort |
|---|---|---|---|
| QW1 | Add `.github/workflows/ci.yml` running `scripts/ci.sh` on push/PR | CI | S |
| QW2 | Mark ADR-001/002 `Superseded-in-part by ADR-V1-*`; fix README "Out of scope" to "Experimental (V1)" | `docs/adr/*`, `README.md` | S |
| QW3 | Add dependency-cruiser (JS) + import-linter (Py) configs encoding `architecture.md:15-19` | `gateway/`, `orchestrator-langgraph/` | S |
| QW4 | Document the per-subprocess topology + single-Gateway rule prominently (not just in the KYA runbook) | `docs/architecture.md` | S |

### Milestone 0 — Make it safe to change
| Item | Acceptance (verifiable property) | Effort | Risk | Deps |
|---|---|---|---|---|
| M0.1 Boundary checks in CI | dependency-cruiser + import-linter fail the build on any cross-layer import; required check | M | low | QW1, QW3 |
| M0.2 Tool-contract snapshot test | A test serializes every tool's name+inputSchema; a shape change fails CI until the snapshot is updated | M | low | QW1 |
| M0.3 Crash-reconciliation characterization test | Start orchestration in dry-run, kill the Gateway, restart → test asserts current (broken) behavior, documenting RS1 | M | low | — |

### Milestone 1 — Critical structural & operational fixes
| Item | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|
| M1.1 Boot-time session reconciliation | On start, sessions left `running`/`starting` are reconciled (closed/error + best-effort tmux cleanup); M0.3 test flips to zero zombies | M | med | M0.3 |
| M1.2 Non-blocking executor | Headless `delegate` uses async `spawn` with a real, cancellable timeout; concurrent `policy.check` < 100 ms during an agent run | L | med (adapter rewrite ×3) | M0.2 |
| M1.3 Audit integrity under concurrency | Either a per-workspace Gateway lock (fail-fast on second Gateway) or a multi-writer-safe audit sink; concurrent-Gateway test shows zero corruption | M | med | M0.3 |
| M1.4 Reconcile architecture docs to as-built | Every `accepted` ADR matches code; README scope true; doc-vs-tree CI check passes | M | low | QW2 |

### Milestone 2 — High-leverage architecture
| Item | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|
| M2.1 Decide & fence V1 | `orchestrator-langgraph/` is either branched out or fenced (own README, excluded from default install/CI, labeled experimental); CI does not depend on it | M | low | M1.4 |
| M2.2 Gateway liveness + minimal metrics | A health/liveness signal (e.g., a `health` tool or heartbeat log) + counters for tool calls/errors/blocked-executor; alertable | M | low | QW1 |
| M2.3 (If V1 committed) durable idempotency keys in Gateway tools | `agent.delegate`/`artifact.put` accept an idempotency key; replayed activity does not double-execute; ADR-V1-05's open risk closed | L | high (contract change) | M2.1 |

### Milestone 3 — Consistency & polish
| Item | Effort |
|---|---|
| M3.1 Gateway Dockerfile + pin Python deps (only if a deployable unit is wanted) | M |
| M3.2 Complete or delete the V1 compose stack (Temporal/OTel collector/Gateway) per M2.1 decision | M–XL |
| M3.3 Route `agent_service`→`intervention_detector` through the adapter registry (MC2) | S |

### Implementation sketches — top 3

**M1.1 — Boot-time session reconciliation.**
*Approach:* in `mcp_server.js main()` after `initState`, run `reconcileSessions()`: query `sessions WHERE status IN ('starting','running')`; for each, best-effort `tmux has-session`/`kill-session` on `tmux_target`, set status `error`, emit a `SESSION_RECONCILED` audit event; mark their `tasks` `failed` if still open. *Rollout/blast radius:* additive, runs only at boot, dry-run-safe (no tmux calls in dry-run); cannot affect a healthy run. *Gotchas:* don't kill sessions belonging to a *concurrent* live Gateway — gate reconciliation behind the M1.3 single-Gateway lock, or scope it to sessions older than a threshold. *Verify:* M0.3's test flips from "zombie session remains" to "zero running sessions, tmux cleaned."

**M1.3 — Audit integrity under concurrency.**
*Approach (cheapest):* acquire an exclusive `flock` on `workspace/state/.gateway.lock` at boot; a second Gateway against the same workspace fails fast with a clear error (matches the documented single-orchestrator rule, now *enforced*). *Alternative (if concurrency is required):* replace `appendFileSync` with a small append broker (O_APPEND + per-line ≤ PIPE_BUF chunking, or SQLite-backed audit). *Blast radius:* the lock is the safer first step — it only *prevents* an unsupported topology, breaking nothing supported. *Gotchas:* stale lock after a crash — use `flock` (auto-released on process death), not a lockfile-existence check. *Verify:* spawn two Gateways at one workspace → second exits non-zero; under the alternative, a concurrent-write test shows zero `_corrupt` lines.

**M1.4 — Reconcile architecture docs to as-built.**
*Approach:* add `Superseded-in-part by ADR-V1-01..05` to ADR-001/002 with a one-line scope note; rewrite README "Out of scope" → "Experimental (PROJECT_V1), not in the supported MVP path"; add a CI doc-check (extend `tests/structure`) that fails if `orchestrator-langgraph/` exists while the README still calls it out-of-scope. *Blast radius:* docs only; zero runtime risk. *Gotchas:* don't delete the MVP ADRs — they still describe the supported path; mark scope, don't erase history. *Verify:* the new doc-vs-tree test passes; a fresh reader can state, from the README + ADR index alone, what runs and what's experimental.

---

## Open Questions

1. **Is durable multi-step orchestration (Temporal/LangGraph) a committed goal or a shelved experiment?** This single decision drives M2.1/M2.3/M3.2 and whether the data/event plane gets hardened at all.
2. **Production aspiration & scale/tenancy:** is the target permanently local single-operator, or a deployed service? Determines whether DE1/PB1/OB1 are "fine for maturity" or blockers, and whether a Gateway image/IaC is warranted.
3. **Concurrency model:** must one workspace ever host concurrent Gateways (e.g., parallel agents)? If yes, M1.3 becomes Critical and the single-writer data model needs redesign; if no, the `flock` lock closes it cheaply.
4. **SLO/RPO/RTO:** are there any availability or recovery targets? Today there are none; the audit log is the only durable record and there's no backup story for `workspace/`.
5. **Contract ownership:** should the MCP tool surface become a versioned, published contract (so V1/KYA/third-party clients can depend on it safely), or stay an internal convention?
6. **Operational home for V1:** if kept, what runs the Temporal worker, the collector, and the Gateway — and where? Needed before the compose stack (`E/0/2`) can be completed.

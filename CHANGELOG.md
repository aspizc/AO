# Changelog

All notable changes to this project will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) lite.

## Unreleased

- Added cooperative local wave capacity accounting and `agent-run wave
  budget-init`: atomic count/provider/declared-memory reservations, immutable
  host headroom, and retained charges for uncertain effects. This V7 foundation
  does not implement automated wave dispatch or enforce OS memory limits.

- Added additive operator-local repository overlays shared by the Gateway,
  doctor and policy CLI; removed personal registrations from public profiles.
- Added the required public hygiene check, generic planning/coding/review
  prompts, and two runnable project examples. Automated wave scheduling
  remains planned in PROJECT_V7.

- Changed the public defaults to Codex `gpt-6.1-sol` / `max` / `priority`
  and Claude `claude-opus-5-5` / `max`, including the model-specific Codex
  effort, capability profiles, execution examples, and orchestration guides.
  Legacy explicit selections and aliases retain their existing targets.

- Refreshed the public README, implementation status, operator setup, adapter
  catalogs, diagnostics and CI guidance against the published AO candidate.
  Corrected historical release claims, lock-install commands, and coordination
  limits; distinguished imported plan history from current verification.

- Added launch-time MCP client identity and request-context lifetime settings,
  preserving the public 24-hour lifetime and caller-impersonation rejection.
- Added optional Sol 6.1, Claude Sonnet 5.5 and Claude Opus 5.5 registrations
  from the upstream working tree. Public model defaults, existing aliases,
  role permissions, and coordination timeouts remain unchanged.

- Integrated reusable improvements from the committed agents-orchestrator
  upstream through `393b056`, preserving AO public defaults and excluding
  personal repository registrations and execution preferences. Updated six
  vulnerable transitive npm dependencies within existing dependency ranges.
  Updated security-affected SDK and Python dependencies, with LangGraph 1.2.5
  verified against the implementation/review graph regression suite.

- Fixed Antigravity, pi and OpenCode being unusable through the gateway.
  The agent service only declared an adapter result contract for `codex` and
  `claude-code`, so an Antigravity, pi or opencode run was rejected with an
  invalid-selection policy denial after the adapter had already started the
  session, leaving an orphan tmux session that made the retry fail as a
  duplicate. The three adapters now consume and return the effective agent
  selection like Codex and Claude, the service declares their result contracts,
  and a provider without a contract is rejected before the adapter runs so a
  denial can no longer leak a session.
- Added the Gemini 3.8 Flash models (`high`, `medium`, `low`) and the
  `gemini-3.8-flash` alias to the Antigravity entry in the base, MVP2 and KYA
  capability registries and the canonical orchestrator profile, matching the
  `agy models` catalog. Every Antigravity model keeps the `low|medium|high`
  thinking levels with `high` as the default, and `gemini-3.8-flash-high` is
  now the Antigravity default model.
- Added Antigravity (`agy`) permission bypass as an explicit opt-in:
  `AGENTS_ANTIGRAVITY_AUTO=1` enables `--dangerously-skip-permissions` for
  headless execution and supervised tmux sessions. Permission prompts remain
  enabled by default.
- Added generic `writer` and `editor` roles for prose and documentation to the
  base, MVP2 and KYA role registries, agent capability registries and canonical
  orchestrator profile. `writer` may write prose files and `artifact.put.doc`;
  `editor` is read-only and writes `artifact.put.review_notes`.
- Added `gpt-6-astra` (GPT-6 Astra) to the codex capability registries (base,
  MVP2, KYA) and the canonical orchestrator profile with the full reasoning
  ladder `low|medium|high|xhigh|max|ultra` (default `max`), plus the `astra`
  and `gpt-6` aliases. Codex keeps the public `gpt-5.6-sol` default with
  `max` reasoning and the `priority` service tier.
- Added optional `claude-sonnet-5` and `claude-fable-5-1` models to the Claude
  Code capability registries and canonical orchestrator profile. Claude keeps
  `claude-fable-5` as its default and `fable` alias, with `max` reasoning.
- Replaced disposable per-operation coordination Redis connections with
  per-service persistent command/blocking clients, bounded admission,
  coalesced next-call reconnect, zero hidden semantic retries, and bounded
  idempotent registry/process shutdown. A shutdown-epoch fence now settles
  active callers at the drain deadline, consumes late transport outcomes, and
  repeats cleanup when a connection finishes opening after close. Connection
  reuse now follows the lane-owned successful-handshake state instead of
  node-redis `isOpen`, so open-but-not-ready callers coalesce correctly.
- Promoted the Redis 7 coordination acceptance suite to required CI with a
  health-checked disposable workflow service, machine-readable required-service
  readiness failure, repeated independent-client race coverage, and a
  fail-closed namespace leak guard.
- Added one immutable 33-tool Gateway catalog with Zod/JSON Schema parity,
  closed schemas plus an explicit legacy `message.*` strip-compatibility
  exception, a versioned projection digest, generated public documentation,
  catalog-only runtime bindings, and safe allowlisted MCP error envelopes.
  Product prompts now use only registered tool names and valid call shapes.
- Added a hash-locked, portable Python install and an authoritative
  machine-readable CI suite manifest with required-lane, zero-test,
  discovered-file, exact-skip, and unavailable-infrastructure sentinels.
  Hardened it with a non-refreshable topology/skip/readiness contract, finite
  per-suite timeouts, process-group cancellation/reaping, strict TAP
  accounting, honest unavailable aggregate states, and safe byte decoding.
- Added the external, content-addressed `release-candidate/v1` and
  `release-state/v1` contracts, with full Git/ref/evidence validation,
  merge/descendant promotion ancestry, byte-recomputed evidence, trusted-clock
  checks, an independent license allowlist, a versioned/freshness-bound offline
  SCA database with exact graph coverage, and candidate-bound expiring advisory
  waivers. Candidate verification reuses the authoritative CI manifest and
  non-refreshable topology/skip/readiness contract instead of maintaining a
  second release-suite inventory. Trial 2 hardens the contract with exact refs,
  pinned tree/blob verification, review-only evidence-head advancement,
  Ed25519 reviewer trust roots, a cross-platform hash-lock matrix, raw and
  canonical primary OSV evidence with 1:1 coverage, a 30-day waiver ceiling,
  and canonical release provenance/checklist artifacts. Trial 3 makes Git
  identity replacement-invariant, rejects legacy grafts, enforces reviewer
  independence from both author and committer, fully terminates timed-out Git
  process groups, aligns normalized mail identities across schema/runtime, and
  removes absolute local paths from validation errors. Trial 4 replaces the
  inherited Git environment with a minimal deterministic allowlist, disables
  global/system configuration, and neutralizes the complete repository-local
  environment inventory including external graft and shallow ancestry files.
- Added Project V5's Redis 7 coordination plane for inter-orchestrator
  coordination: an importable direct factory and eight additive
  `coordination.*` MCP tools sharing leased identities, scope/digest fences,
  addressed at-least-once delivery, bounded dedupe/ACK windows, and local-only
  coordination audit. Legacy `message.*` and `agents:events` remain unchanged.
- Corrected the V5 operator contract with a canonical per-instance scope,
  15-minute default and one-hour maximum leases, field-specific lease errors,
  read-only `coordination.status`, and policy-gated legacy identity fields plus
  JSONL-only decision audit for `artifact.list`.
- Added GPT-5.6 Sol/Terra/Luna support, canonical model aliases, per-model
  reasoning profiles, and Codex Fast service-tier propagation. Codex now
  defaults to `gpt-5.6-sol`/`max`/`priority`; Claude defaults to
  `claude-fable-5`/`max`, permits Fable 5, Opus 5, or Opus 4.8, and resolves
  the `opus` alias to Opus 5.
- Added the `xhigh` codex reasoning effort to the base and MVP2 capability registries, registered the `kya` repository, promoted the KYA per-slice MCP task runner into `scripts/`, and documented the KYA implementation loop in `docs/kya-implementation-runbook.md` (planner `claude-fable-5`, coder codex `gpt-5.5` at `xhigh`, TDD-first slices).

## [0.1.0] - 2026-06-11

MVP2.0 / PROJECT_V0 A-Y closed with the [MVP2.0 acceptance checklist](docs/mvp2-acceptance-checklist.md).
PROJECT_V1 A-E remains experimental and is tracked by the [PROJECT_V1 plan and gate checklist](plan/PROJECT_V1/README.md).
PROJECT_V3 A-D hardening closes the audit release gate through the [PROJECT_V3 contract](plan/PROJECT_V3/README.md) and [review checklist](plan/PROJECT_V3/reviews/).

- Hardened approval wait timing tests against scheduler jitter. Closes V3 D/0/2.
- Added sanitizer composition and precedence characterization tests. Closes V3 D/0/1.
- Added direct Gateway observability and trace access characterization tests. Closes V3 D/0/0.
- Added opt-in live Postgres integration gating and adversarial literal coverage. Closes V3 C/0/2.
- Reconciled README runtime environment docs with Gateway config and added a structure parity test. Closes V3 C/0/1.
- Added Python dependency bounds, a uv-generated lockfile path, and the optional Redis extra for `orchestrator-langgraph`. Closes V3 C/0/0.
- Added structured stderr warning when the Gateway message access secret file falls back to the process secret. Closes V3 B/0/4.
- Decoupled Gateway `MCP_TOOL_CALL` audit events from the telemetry flag. Closes V3 B/0/3.
- Documented ADR-008 role/action deny-list semantics and regression matrix. Closes V3 B/0/2.
- Added shared LangGraph Gateway error/state contract helpers and documentation. Closes V3 B/0/1.
- Added MIT repository licensing and manifest metadata. Closes V3 B/0/0.
- Documented historical V4 planning document placement and verified tree hygiene. Closes V3 A/0/4.
- Added a GitHub Actions safety-net workflow that delegates to local CI and ADR-007. Closes V3 A/0/3.
- Added ruff and eslint lint gates to local CI. Closes V3 A/0/2.
- Added direct policy engine characterization tests with temporary registries. Closes V3 A/0/1.
- Added Orchestrator LangGraph tests to the local CI gate. Closes V3 A/0/0.
- Enabled the codex adapter (`enabled: true`) and granted it the `planner` role in `policies/agent-capabilities.json`, so codex can produce planning drafts alongside claude-code.
- Added orchestrator-langgraph OTel-inspired workflow/activity spans. Closes PROJECT_V1 E/0/1.
- Added Gateway OTel-inspired tool-call spans with opt-in stderr export. Closes PROJECT_V1 E/0/0.
- Added Temporal crash recovery harness and ADR-V1-05. Closes PROJECT_V1 D/0/4.
- Added Temporal approval request activity and long approval signal gate. Closes PROJECT_V1 D/0/3.
- Added Temporal `implement-test-review-push` workflow scaffold with Gateway-backed checkpoints. Closes PROJECT_V1 D/0/2.
- Added Temporal activity wrappers for MCP calls with deterministic local idempotency keys. Closes PROJECT_V1 D/0/1.
- Added `orchestrator-langgraph` Temporal worker scaffold and env documentation. Closes PROJECT_V1 D/0/0.
- Added local Postgres/Redis Docker Compose stack and Stage C state/event ADRs. Closes PROJECT_V1 C/0/4.
- Added `orchestrator-langgraph` Redis Stream metrics consumer with restricted-field rejection. Closes PROJECT_V1 C/0/3.
- Added optional Redis Streams audit publisher with sanitized metadata and TV-02 restricted/raw coverage. Closes PROJECT_V1 C/0/2.
- Added SQLite/Postgres repository parity contracts and live Postgres opt-in test documentation. Closes PROJECT_V1 C/0/1.
- Added interactive Gateway orchestration skill for human-gated planner/coder/reviewer loops.
- Added optional Postgres state backend scaffold for Gateway repositories. Closes PROJECT_V1 C/0/0.
- Added PROJECT_V1 hybrid E2E smoke and ADR-V1-02. Closes PROJECT_V1 B/0/4.
- Added reusable LangGraph approval node and gated push-intent flow. Closes PROJECT_V1 B/0/3.
- Added `orchestrator-langgraph` hybrid orchestrator selector. Closes PROJECT_V1 B/0/2.
- Added `orchestrator-langgraph` plan-refine graph with dry-run and opt-in Gateway integration tests. Closes PROJECT_V1 B/0/1.
- Added `orchestrator-langgraph` implement-test-review-push dry-run graph. Closes PROJECT_V1 B/0/0.
- Refined PROJECT_V1 Stage B plan with real Gateway tool mapping and structural guard tests.
- Added ADR-V1-01 and structural tests closing PROJECT_V1 Stage A. Closes PROJECT_V1 A/0/4.
- Added `orchestrator-langgraph` audit parity tests for delegate-review dry-run flow. Closes PROJECT_V1 A/0/3.
- Added `orchestrator-langgraph` minimal delegate-review LangGraph with dry-run fixtures. Closes PROJECT_V1 A/0/2.
- Added `orchestrator-langgraph` Gateway MCP stdio client with unit and integration tests. Closes PROJECT_V1 A/0/1.
- Added `orchestrator-langgraph` scaffold and layout tests. Closes PROJECT_V1 A/0/0.
- Added autonomous `plan.apply` approval scope documentation and tests for the assisted planning loop. Closes Z/0/4.
- Added autonomous `code.apply` approval scope documentation and tests for the MVP2 two-agent flow. Closes Y/0/3.
- Added bounded opt-in auto-approval mechanism and ADR. Closes Q/0/5.
- Added operational follow-up task specs for MCP `agent.*` runtime wiring,
  two-agent usability, Codex activation, and the final usability gate.
- Added Stage W task specs for task-less agent sessions.
- Added MCP agent execution tools and Gateway adapter wiring. Closes K/0/1 and K/0/3.
- Added configurable agent operation timeouts and structured tool error codes. Closes K/0/2.
- Added real MCP stdio E2E coverage for orchestrator, coder, and reviewer workflow. Closes K/0/4.
- Added operational usability gate evidence for the real MCP two-agent flow. Closes U/0/5.
- Added trace-scoped message repository coverage. Closes S/0/0.
- Added MCP message tools with audited sends, trace-scoped replies, and U/0/4 cross-trace
  message bypass coverage. Closes S/0/1.
- Added model and reasoning-effort registry policy resolution. Closes V/0/0.
- Added MCP agent model plumbing through tools and agent service. Closes V/0/1.
- Added Claude adapter model selection for headless and supervised launches. Closes V/0/2.
- Added Codex headless real delegate execution with model, reasoning effort, and sandbox flags. Closes W/0/0.
- Added Codex supervised tmux spawn, ask, view, and kill support. Closes W/0/1.
- Added MVP2 policies profile that enables Codex for non-restricted repositories. Closes W/0/2.
- Added MVP2 two-agent MCP client profile for Codex coder and Claude reviewer. Closes X/0/0.
- Added MVP2 two-agent orchestrator system prompt. Closes X/0/1.
- Added MVP2 operator runbook for terminal-hosted two-agent orchestration. Closes X/0/2.
- Added guarded real MVP2 two-agent E2E coverage. Closes Y/0/0.
- Added MVP2 two-agent operator smoke script. Closes Y/0/1.
- Added MVP2.0 gate checklist and scope ADR. Closes Y/0/2.
- Added planner review-note policy and agents-orchestrator repository registration. Closes Z/0/0.
- Added assisted planning planner, apply-coder, and orchestrator loop prompts. Closes Z/0/1.
- Added planner-assisted MCP client profile. Closes Z/0/2.
- Added assisted planning loop runbook and smoke. Closes Z/0/3.
- Added repository directory architecture (`docs/`, `policies/`, `schemas/`, `gateway/`,
  `prompts/`, `client-config/`, `cli/`, `workspace/`, `tests/`, `docker/`, `scripts/`)
  and structural layout test. Closes A/0/0.
- Added repo metadata: README, `.gitignore`, CHANGELOG. Closes A/0/1.
- Added Node gateway scaffold with config loading, empty tool registry, and smoke tests. Closes A/0/2.
- Added Python `agent-run` CLI scaffold with Typer stubs and tests. Closes A/0/3.
- Added architecture documentation and ADRs 001-003. Closes A/0/4.
- Added local CI script and README local checks. Closes A/0/5.
- Added threat model with 11 abuse cases. Closes A/0/6.
- Added agent capabilities registry with V4 boundaries. Closes B/0/0.
- Added repository classification registry. Closes B/0/1.
- Added roles registry with orchestrator boundaries. Closes B/0/2.
- Added core domain JSON schemas with golden fixtures. Closes B/0/3.
- Added registry loader with typed errors and cross-invariant checks. Closes B/0/4.
- Added real `agent-run policy validate` command delegating to the Node registry validator. Closes B/0/5.
- Added policy decision constants, canonical actions, and context normalization. Closes C/0/0.
- Added classification boundary policy evaluation rules. Closes C/0/1.
- Added role and orchestrator policy rules. Closes C/0/2.
- Added approval policy rules for protected pushes and dependency changes. Closes C/0/3.
- Added sanitization policy rules for restricted raw artifact reads. Closes C/0/4.
- Added policy explain traces and canonical table coverage. Closes C/0/5.
- Added append-only JSONL audit writer. Closes D/0/0.
- Added streaming audit reader with filters and corrupt-line markers. Closes D/0/1.
- Added runtime path configuration and environment documentation. Closes D/0/2.
- Added `agent-run audit show` backed by the audit reader. Closes D/0/3.
- Documented and tested the stable `agent-run policy validate` contract. Closes E/0/0.
- Added `agent-run policy check` for ad-hoc policy decisions. Closes E/0/1.
- Added shared CLI output helpers for rich human output and JSON mode. Closes E/0/2.
- Added MCP stdio gateway bootstrap with core initialization. Closes G/0/0.
- Added generic MCP client configuration example. Closes T/0/0.
- Added orchestrator role system prompt. Closes T/0/1.
- Added initial SQLite schema migration. Closes F/0/0.
- Hardened state initialization and migration loading. Closes F/0/1.
- Added SQLite domain repositories. Closes F/0/2.
- Added centralized domain ID generators. Closes F/0/3.
- Added orchestration service for create/view/status lifecycle. Closes J/0/0.
- Added policy-gated task assignment service. Closes J/0/1.
- Added MCP tools for orchestration and task assignment. Closes J/0/2.
- Added filesystem artifact store with SQLite metadata. Closes L/0/0.
- Added MCP tools for artifact put/get/list. Closes L/0/1.
- Added policy enforcement for artifact get. Closes L/0/2.
- Added sanitization rules registry. Closes M/0/0.
- Added deterministic sanitizer core. Closes M/0/1.
- Added automatic sanitized artifact generation. Closes M/0/2.
- Added fail-closed sanitization behavior. Closes M/0/3.
- Added artifact share service with visibility policy. Closes N/0/0.
- Added MCP tool for artifact share. Closes N/0/1.
- Added reusable artifact visibility matrix tests. Closes N/0/2.
- Added generic tmux adapter client. Closes H/0/0.
- Added sanitized tmux session naming helpers. Closes H/0/1.
- Added base adapter contract and safe cwd guard. Closes H/0/2.
- Added adapter registry for agent adapter lookup. Closes H/0/3.
- Added Gemini headless delegate dry-run adapter. Closes I/0/0.
- Added Gemini supervised tmux session methods. Closes I/0/1.
- Added Gemini adapter policy preflight and error audit integration. Closes I/0/2.
- Added approval repository state machine. Closes Q/0/0.
- Added async approval service core. Closes Q/0/1.
- Added approval MCP tools for request, respond, and poll. Closes Q/0/2.
- Added `agent-run approve` operator CLI. Closes Q/0/3.
- Added bounded `approval.wait` primitive. Closes Q/0/4.
- Added session attach info MCP tool. Closes R/0/0.
- Added best-effort tmux intervention detector. Closes R/0/1.
- Added manual session intervention note tool. Closes R/0/2.
- Documented Claude Code CLI invocation assumptions. Closes O/0/0.
- Added Claude Code adapter with headless and supervised dry-run coverage. Closes O/0/1.
- Added Claude restricted-repo policy enforcement coverage. Closes O/0/2.
- Added host-agnostic operator guide. Closes T/0/2.
- Added restricted-flow dry-run E2E coverage. Closes U/0/0.
- Added V4 MVP acceptance checklist. Closes U/0/1.
- Added final README and MVP scope ADR. Closes U/0/2.
- Added MVP regression gate smoke checks. Closes U/0/3.
- Added bypass regression suite covering threat model IDs. Closes U/0/4.
- Added dormant Codex adapter dry-run coverage and documentation. Closes P/0/0.

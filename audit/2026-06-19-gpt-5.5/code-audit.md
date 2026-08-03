# Code Audit — agents-orchestrator

**Auditor:** Principal engineer / technical auditor (read-only — no code modified)
**Date:** 2026-06-19
**Repo state:** branch `feature/enable-codex-planner`; `README.md` modified in working tree; HEAD 205 commits ahead of `main`, 0 behind.
**Method:** Read the crown-jewel gateway core directly (`policy_engine`, `audit`, `agent_service`, `sanitizer`, `artifact_store`, `artifact_share_service`, `approval_service`, `config`, `state`, `postgres_db`, `mcp_server`, registries, schema) and verified every Critical/High claim against the source. Three parallel sub-audits covered adapters (security), testing/DevEx, and the secondary Python (orchestrator-langgraph + CLI); their findings were cross-checked at the core. `npm audit` and a secrets/`child_process` sweep were run. The real two-agent path was **not** executed (read-only); dry-run MCP smoke was confirmed passing.

---

## Executive Summary

**Overall health grade: B− (a genuinely well-engineered in-scope core, dragged down by one hot-path architecture bug, a material gap between the sanitization promise and the mechanism, absent release engineering, and a large half-finished out-of-scope component).** The Gateway core is the real product and it is solid: a clean `tools → services → core → adapters` layering, **no shell anywhere** (every subprocess uses `spawnSync`/`spawn` with an argv array — verified repo-wide), a correct `realpath`-based cwd guard (`base_adapter.js:20-40`), **fail-closed** artifact sharing (`artifact_share_service.js:46-51`), server-side enforcement of always-human approval scopes (`approval_service.js:7-25`), a strong **behavioral** test suite for the core (policy decision table, sanitizer output, approval lifecycle, threat-model bypass regression), zero `npm audit` vulnerabilities, and disciplined stdout/stderr separation. The grade is not higher because of four real problems. **(1) Architecture/correctness:** the headless `agent.delegate` path calls a synchronous `spawnSync` inside an `async` function wrapped in a `Promise.race` timeout (`agent_service.js:117`, `_with_timeout.js:11`, `codex_adapter.js:199`) — the race **cannot** interrupt a synchronous call, so a real agent run **blocks the single-threaded MCP event loop for its entire duration** and the configured `agentTimeoutMs` is dead code on that path. This is on the actual hot path: the KYA loop uses `agent.delegate`. **(2) Security-model say-do gap:** the sanitizer is a **4-pattern regex denylist** (`policies/sanitization-rules.json`) that redacts secrets/`/home` paths/UUIDs but leaves all code logic intact, while reclassifying a `restricted` artifact down to `internal` (`artifact_store.js:52-62`); a reviewer that classification otherwise forbids from restricted repos (`claude-code` is `allowedClassifications:[unrestricted,internal]`) thereby receives the **entire restricted diff** with only secrets masked — likely not what "the reviewer never sees raw restricted" implies. **(3) Auto-approve trust gap:** `restrictedContext()` (`approval_service.js:17-20`) trusts a caller-supplied `classification` field instead of resolving the repo's real classification from the registry, and the committed `.mcp.json` ships `AGENTS_AUTOAPPROVE=code.apply` with `AGENTS_DRY_RUN=0`, so `code.apply` auto-grants on a restricted repo. **(4) Release engineering:** there is **no CI** (`.github/workflows/` absent — the only gate is a manual `scripts/ci.sh`), **no lint/format enforcement**, no `LICENSE`, and the out-of-scope `orchestrator-langgraph/` ships two hand-synced implementations of its flagship flow with a real divergent-error-handling bug. **Top 3 risks:** (a) event-loop-blocking delegate freezes the gateway under real use; (b) the sanitization/classification-downgrade gap may leak more restricted material to reviewers than operators expect; (c) no automated CI means regressions reach branches unguarded. **Top 3 opportunities:** (a) move headless delegate to async `spawn` with a real timeout — unblocks concurrency and makes the timeout real; (b) one `.github/workflows/ci.yml` running the existing `scripts/ci.sh` + add eslint/ruff — cheap, high leverage; (c) decide and document the sanitization contract (and resolve the V1 sprawl) to make the security model and the repo coherent.

---

## Repo Map

**Purpose:** A local-first MCP stdio Gateway (`agents-gateway`) that mediates safe collaboration between LLM coding agents (Codex/Claude/Gemini) for a single operator, enforcing deterministic policy, artifact sanitization, append-only audit, and human-gated approvals. The "orchestrator" is a role played by the human-facing LLM, not a process (ADR-002).

**Stack & maturity:** Node ≥20 ESM (gateway, the core 80%), Python ≥3.11 (Typer CLI `agent-run`; LangGraph/Temporal `orchestrator-langgraph`). SQLite via `better-sqlite3` (default) with an opt-in Postgres scaffold. MCP via `@modelcontextprotocol/sdk`, Zod for tool input, Ajv for registry schemas. Maturity: **late MVP / pilot**, local single-operator, explicitly not multi-user/production.

**Architecture sketch (verified against `docs/architecture.md` + code):**
```
client (any MCP host) --stdio--> gateway/src/mcp_server.js
   tools/*.js      Zod-validate input, shape MCP result
   services/*.js   use-cases: assertAllowed(policy) -> adapter -> repo -> audit
   core/*.js       policy_engine, sanitizer, artifact_store, audit, state, registry, telemetry
   adapters/*.js   codex/claude/gemini via spawnSync + tmux; no MCP awareness
```

| Directory | One-line description |
|---|---|
| `gateway/src/core/` | Policy engine, sanitizer, audit, SQLite/PG state, artifact store, registry, telemetry — **the heart** |
| `gateway/src/services/` | `agent_service`, `task_service`, `approval_service`, `artifact_share_service`, `orchestration_service` |
| `gateway/src/adapters/` | Codex/Claude/Gemini subprocess + tmux adapters; `base_adapter` cwd guard — **the security surface** |
| `gateway/src/tools/` | Thin MCP tool wrappers (Zod-validate → service) |
| `cli/src/agents_cli/` | Python Typer operator CLI (`policy`, `audit`, `approve`) — shells out to Node `.mjs` |
| `orchestrator-langgraph/` | LangGraph + Temporal deterministic orchestrator — **built but README-"out of scope" and PROJECT_V1-incomplete** |
| `policies/` | `agent-capabilities`, `repositories`, `roles`, `sanitization-rules` + `profiles/{mvp2,kya}` |
| `schemas/` | JSON Schemas for registries and domain objects |
| `tests/`, `gateway/tests/`, `orchestrator-langgraph/tests/` | ~69 gateway JS tests + ~98 Python tests |
| `docs/` | operator-guide, runbooks, threat-model, ADRs 001-006 + V1-01..05 |

**Surprises:** (1) The README lists Postgres/Redis/LangGraph/Temporal as "Out of scope," yet all four are built. (2) The headline "supervised, observable" design uses a **synchronous, event-loop-blocking** `spawnSync` for the headless path. (3) The "sanitized handoff" that anchors the product is a shallow regex denylist. (4) No `.github/workflows/` despite internal notes referencing "GitHub Actions runs."

---

## Audit Report

Findings are **[FACT]** (verified in source) or **[JUDGMENT]** (interpretation), with `file:line` and concrete consequence.

### Architecture & design

- **A1 — Critical — `agent.delegate` blocks the single-threaded MCP event loop for the whole agent run.** **[FACT]** `agent_service.js:117` wraps `adapter.delegate(...)` in `withTimeout` (`_with_timeout.js:11`, a `Promise.race`), but the adapter runs the agent with **synchronous** `spawnSync` (`codex_adapter.js:199`, `claude_adapter.js:127`, `gemini_adapter.js:109`). A `Promise.race` cannot interrupt synchronous work, and the timer can't even fire until `spawnSync` returns. *Consequence:* during a real headless delegate the gateway serves **no other MCP request** (approvals, audit queries, other agents) until the child exits; `agentTimeoutMs` (default 600 s, `config.js:78`) is dead code on this path. The KYA loop (`docs/kya-implementation-runbook.md:43`) uses `agent.delegate`, so this is the real hot path.
- **A2 — High — Out-of-scope `orchestrator-langgraph/` ships two hand-synced implementations of one flow.** **[FACT]** `graphs/implement_test_review_push.py:299-345` (LangGraph) and `workflows.py:88-129` (Temporal) implement the same "implement→test→review→approval→push"; only the Temporal one is wired to the worker (`worker.py:82`); the LangGraph one is reached only by `hybrid_smoke.py:54` and tests. *Consequence:* ~900 lines kept in lockstep by hand; fixes to one path silently miss the other (see C3).
- **A3 — Medium — Adapter hardening is inconsistent (drift).** **[FACT]** Codex self-guards excluded paths (`codex_adapter.js:122-138`) and has a registry kill-switch (`checkEnabled`, `:149-158`); gemini/claude have **neither**. *Consequence:* "disabling" gemini in the registry doesn't stop it spawning, and excluded-path protection is codex-only (see SEC4).
- **A4 — Low — Module-global singletons** (`audit.js:9`, `sanitizer.js:3`, `artifact_store.js:9`, `state.js:7`) are configured once at boot. **[JUDGMENT]** Fine for a single-process server; noted because it couples tests to `_resetForTests` hooks and blocks any future in-process multi-tenancy.

### Security

- **SEC1 — High — Sanitization is a shallow regex denylist; "sanitized restricted" still exposes full code logic to the reviewer.** **[FACT]** `policies/sanitization-rules.json` has 4 rules (secret tokens, `/home/...`, UUIDs, `internal|private/...`). `artifact_store.js:52-62` produces the "sanitized" copy by running these over the content and **reclassifying `restricted` → `internal`**. `claude-code` is `allowedClassifications:[unrestricted,internal]` (`agent-capabilities.json:30`) — barred from restricted repos — yet via the sanitized artifact it receives the entire restricted diff with only secrets/paths/UUIDs masked. If no rule matches, `sanitized === content` (a verbatim copy with a downgraded label). *Consequence:* the operative promise ("the reviewer never reads raw restricted") delivers, in practice, "the reviewer reads restricted code with secrets redacted." For a trust/verification product this is a material say-do gap; whether acceptable is an explicit operator decision, not a safe default. **[JUDGMENT]** severity High because it is the product's core security claim.
- **SEC2 — High — Auto-approve's restricted-repo guard trusts caller-supplied metadata, not the registry.** **[FACT]** `approval_service.js:17-20` `restrictedContext()` only inspects `context.classification`/`repoClassification`/`repositoryClassification`; it never calls `registries.getRepo(repo).classification`. The mvp2 prompt requests `approval.request({action:"code.apply", context:{repo,agent,role}})` (`prompts/orchestrator_mvp2_two_agent.md:41`) with **no** classification, and the committed `.mcp.json` sets `AGENTS_AUTOAPPROVE=code.apply`, `AGENTS_DRY_RUN=0`. *Consequence:* `code.apply` auto-grants on a `restricted` repo despite the ADR-006 promise that restricted contexts are always human-decided. (Blast radius is bounded — `code.apply` accepts a branch diff, not a push, and the reviewer still runs — but the guard is bypassable by omission.) The fix is to resolve classification server-side from the registry.
- **SEC3 — High (latent/dormant) — Postgres scaffold builds SQL by string interpolation, not bound parameters.** **[FACT]** `postgres_db.js:61-69,105-115`: params are substituted via `pgLiteral` (single-quote doubling) into the SQL string, then `execFileSync("psql", [url, ...,"-c", sql])` (`:72`). No shell (argv array) so no OS-command injection, but it is manual SQL escaping — the file's own comment admits the "scaffold … future move … to a driver with bound parameters" (`:4-5`). *Consequence:* a real SQL-injection-shaped risk **if** the opt-in Postgres backend is ever used with less-trusted input. Currently dormant (default is SQLite; inputs are server-generated IDs), so effective risk is low today — but it must be replaced with the `pg` driver + parameterized queries before any production use.
- **SEC4 — Medium — Excluded-path policy never fires for gemini/claude spawns.** **[FACT]** `policy_engine.js:71` only checks excluded paths when `ctx.path` is present, but `agent_service.delegate/spawn` build the policy context **without** `cwd`/`path` (`agent_service.js:106-113,133-140`). Only the codex adapter independently re-guards cwd (`codex_adapter.js:122-138`). *Consequence:* a gemini/claude agent can be spawned with `cwd` inside a repo's `excludedPaths` (e.g. `policies/`), which the policy layer was meant to prevent.
- **SEC5 — Medium — Model/reasoning-effort allowlist fails open when the registry omits the arrays.** **[FACT]** `policy_engine.js:155,169` return `{ok:true}` when `agent.models`/`reasoningEfforts` is not an array, and the schema makes both **optional** (`agent-capabilities.schema.json:16` requires only `allowedClassifications`,`allowedRoles`). The shipped registry defines them (default is safe), but a valid registry that omits them lets any `model`/`reasoningEffort` string flow into adapter args (`codex_adapter.js:34-43` interpolates `reasoningEffort` into a `-c model_reasoning_effort="…"` override). *Consequence:* defense-in-depth gap; adapters should re-validate against a strict charset rather than trust a layer that fails open.
- **SEC6 — Medium — `codex` sandbox is operator-env-controlled with no allowlist or floor.** **[FACT]** `config.js:81` `codexSandbox = AGENTS_CODEX_SANDBOX || "workspace-write"`, passed as `-s <value>` (`codex_adapter.js:36,44`). Setting `AGENTS_CODEX_SANDBOX=danger-full-access` silently removes codex isolation for all repos, with no per-classification minimum. *Consequence:* one env var disables the sandbox; restricted repos can't enforce a stricter floor.
- **SEC7 — Medium — On-disk audit log is written unsanitized; only the Redis envelope is sanitized.** **[FACT]** `audit.js:80` `appendFileSync(...JSON.stringify(enriched))` writes the raw event; the `RESTRICTED_METADATA_KEY_PARTS`/`sanitize` path (`:174-224`) runs **only** in `streamEnvelope` for the Redis publisher. Adapters put a 200-char `prompt` prefix into `SESSION_INPUT` events (`codex_adapter.js:62`). *Consequence:* restricted prompt fragments persist to `workspace/audit/events.jsonl` unsanitized, even though the "secure stream" is scrubbed — an inconsistent sanitization boundary.
- **SEC8 — Medium — `gemini` runs with `--yolo` (auto-approve all tool calls) unconditionally.** **[FACT]** `gemini_adapter.js:109`. Containment is only `assertSafeCwd` + Gemini's own behavior; no sandbox flag. *Consequence:* a prompt-injected gemini delegate yields unconfirmed code execution in the working tree (documented as "compensated by policy + cwd" in `architecture.md:54`, but it is the weakest-contained adapter).
- **SEC9 — Medium — A live, owner-specific host config is committed with autonomy enabled.** **[FACT]** `.mcp.json` hardcodes `/home/carase/...` paths, `AGENTS_DRY_RUN=0`, and `AGENTS_AUTOAPPROVE=code.apply`. *Consequence:* anyone copying it runs real agents with auto-accept on; it also leaks the owner's absolute layout. Belongs in `.gitignore` (a generic example already exists at `client-config/mcp.json.example`).
- **SEC10 — Low — `tmux send-keys` types `prompt`/launch command into a live pane with no readiness check.** **[FACT]** `tmux_client.js:15-17` + `codex_adapter.js:313`; a fixed 1.5 s `sleep` precedes `capture-pane` (`:316`) with no liveness/exit check. *Consequence:* if the agent CLI hasn't started/crashed, a `prompt` lands at a bare shell prompt; best-effort, but a real edge (also a correctness issue, see Q-area).
- **Secrets sweep — clean. [FACT]** No committed `.env`/keys (only `*.env.example`); no inline credentials in `gateway/src` or `cli/src`; `messageAccessSecret` is generated per-process or persisted at mode `0600` (`config.js:34-58`). Good.

### Code quality

- **C1 — High — `_raise_on_tool_error` is defined 4× with divergent predicates (real bug).** **[FACT]** `delegate_review.py:69` (`tool_error|isError`), `activities.py:366` (`error|code|isError` — **missing `tool_error`**), `approval.py:30` & `plan_refine.py:42` (`tool_error|isError|error`). *Consequence:* a Gateway error shaped `{"tool_error":…}` is caught in the graph path but **silently ignored** by the Temporal activity path — divergent error handling, not just style.
- **C2 — Medium — Three adapters duplicate `ask`/`view`/`kill`/`preflight`/`sleep` near-verbatim.** **[FACT]** e.g. `codex_adapter.js:55-93` ≈ `claude_adapter.js:62-103` ≈ `gemini_adapter.js:43-84`. *Consequence:* every adapter fix (SEC4/SEC7/SEC8) must be made three times; the existing drift (A3) is exactly this hazard. Lift shared logic into `base_adapter.js`.
- **C3 — Medium — `push` is a hardcoded dry-run no-op in the V1 workflow.** **[FACT]** `activities.py:238-254` / `implement_test_review_push.py:220-244` write a `push_intent` artifact and never git-push. *Consequence:* the V1 component's terminal "success" is inert; it cannot actually deliver code (compounds A2's "two impls of an unfinished flow").
- **C4 — Medium — Operator CLI can crash with an uncaught `KeyError`.** **[FACT]** `cli/.../main.py:159` indexes `data["decision"]` (and `output.py:75-77`) without the defensive `"error" in data` check used by `approve` (`main.py:236`). *Consequence:* a Node script returning JSON without `decision` dumps a Python traceback to the operator instead of a clean error line. Also: no `timeout=` on any of the four `subprocess.run` calls (`main.py:80,145,181,212`) → `agent-run` can hang forever on a wedged Node child.
- **C5 — Low — Dead code / misleading constants.** **[FACT]** `tmux_client.js:33-35` `tmuxAsync` is exported but unused; `intervention_detector.js:4` `GRACE_MS = 3_600` reads as "1 hour" but is 3.6 s, so intervention detection mislabels almost any post-`ask` pane change as human intervention; `selector.py` is load-bearing only for `hybrid_smoke.py`.
- **C6 — Low — `new RegExp(rule.pattern,"g")` recompiled on every `sanitize()` call** (`sanitizer.js:23`). **[JUDGMENT]** Negligible at current volumes; trivially cacheable.

### Testing

- **T-strength — High — Core tests assert real behavior, not just execution.** **[FACT]** `tests/gateway/policy_table.test.js:13-142` (20+ case decision table), `sanitizer.test.js:14-48` (exact redacted output + rule-order + determinism), `approval_service.test.js:19-106` (lifecycle + idempotency + audit types), `artifact_share_service.test.js:41-123` (`allow_with_sanitization`, cross-trace deny `ruleId`), `tests/e2e/bypass_regression.test.js` (threat-model TM-01..12). Runner is hardened: `--experimental-test-isolation=process --test-concurrency=1` (`gateway/package.json:10`). This is the project's strongest area.
- **T1 — Medium — Apparent coverage is inflated by doc-substring tests.** **[FACT]** ~25 files in `tests/structure/` assert markdown/file existence (e.g. `test_threat_model.py:13-23` `assert "TM-02" in text`). *Consequence:* a green suite can hide product breakage and breaks on harmless doc edits.
- **T2 — Medium — The only real two-agent E2E is skipped by default.** **[FACT]** `tests/e2e/mcp_two_agent_real.test.js:13-24` gates on `AGENTS_E2E_REAL=1`; `scripts/ci.sh` never sets it. *Consequence:* the product's core promise (real Codex+Claude handoff) is never exercised by the gate.
- **T3 — Medium — No coverage tooling.** **[FACT]** No `c8`/`nyc`/coverage config anywhere. *Consequence:* assertion strength and branch gaps are unmeasured.
- **T4 — Low — Flaky-prone subprocess tests.** **[FACT]** `tests/gateway/mcp_bootstrap.test.js:54-57` spawns `node mcp_server.js` with a hard `timeout:2000` ms — can fail on a loaded host. Out-of-scope `orchestrator-langgraph/tests` (14 files) inflate the Python count and are **not** run by `ci.sh`.

### Performance

- **P1 — High — Synchronous `spawnSync` on the delegate path (same root as A1).** **[FACT]** Blocks the event loop; no concurrency across agents during a headless run.
- **P2 — Low — Synchronous `appendFileSync` per audit event** (`audit.js:80`) and per-call regex compile (`sanitizer.js:23`). **[JUDGMENT]** Fine at single-operator volume; would matter under load.
- **P3 — Low — `metrics.py` "consumer" processes one batch then exits** (`consumers/metrics.py:181-184`, no loop/retry). **[FACT]** Mislabeled as a long-running consumer; any transient Redis error kills it.

### Dependencies

- **D-strength — `npm audit` → 0 vulnerabilities; lockfile present; minimal, well-chosen deps** (`@modelcontextprotocol/sdk`, `ajv`, `better-sqlite3`, `zod`). **[FACT]** Healthy.
- **D1 — Medium — No `LICENSE`; repo is legally "all rights reserved."** **[FACT]** `docs/license-decision-needed.md`. *Consequence:* blocks any external use/contribution.
- **D2 — Low — Python deps unpinned / no lockfile.** **[FACT]** `cli/pyproject.toml`, `orchestrator-langgraph/pyproject.toml` declare ranges only; no `uv.lock`/`requirements.txt`. The heavy LangGraph/Temporal/Redis deps exist solely for the out-of-scope component.

### DevEx & operations

- **OPS1 — High — No automated CI.** **[FACT]** No `.github/workflows/` (only a `ci.yml` inside an ignored runtime work-clone). The sole gate is a manual `scripts/ci.sh`. Internal notes reference "verificar run de GitHub Actions (A/0/3)" that does not exist in the tracked repo. *Consequence:* regressions reach branches with zero automated signal.
- **OPS2 — High — No lint/format enforcement.** **[FACT]** No eslint/prettier/ruff/black config anywhere; `pyproject.toml`s declare only pytest. *Consequence:* no static-analysis or style gate for JS or Python.
- **OPS3 — Medium — `MCP_TOOL_CALL` audit is only written when OTel telemetry is enabled.** **[FACT]** `mcp_server.js:126` passes `append: telemetry.enabled ? auditAppend : null`, and `AGENTS_OTEL_ENABLED` defaults false (`config.js:86`). *Consequence:* the unified per-tool-call audit line is off by default (domain events still fire, so partial coverage).
- **OPS4 — Medium — Local gate is venv-fragile.** **[FACT]** `scripts/ci.sh:32` calls `agent-run` (a console-script only present after `pip install -e cli[dev]` into an active venv); no auto-bootstrap parity with the node path.
- **OPS-strength — stdout discipline is correct.** **[FACT]** All gateway logs go to `process.stderr` via structured JSON (`mcp_server.js:17-27`); stdout reserved for MCP. Good.

### Documentation

- **DOC1 — High — README contradicts the repo.** **[FACT]** `README.md:166-172` and `architecture.md:40-44` list Postgres/Redis/LangGraph/Temporal/"orchestrator process" as out-of-scope/"do not exist," yet all are built (`orchestrator-langgraph/`, `core/postgres_db.js`, `core/audit.js` Redis publisher). *Consequence:* a reader cannot determine what is real/supported.
- **DOC2 — Medium — Model references drift across surfaces.** **[FACT]** `gpt-5`/`opus-4-7` (mvp2 prompt, README) vs `gpt-5.5`/`fable-5`/`opus-4-8` (KYA runbook, registry). *Consequence:* copying a runbook can select a policy-denied model.
- **DOC3 — Low — Spanish master plan vs English everywhere else** (`plan_proyecto_v4.md`, `tareas_implementacion_v4.md`). Onboarding friction for non-Spanish contributors.

### Strengths to preserve

1. **No-shell subprocess discipline** across all adapters + redis-cli (argv arrays, no `shell:true`) — verified repo-wide. The most important security property, done right.
2. **Correct cwd guard** (`base_adapter.js:20-40`): `realpathSync` on cwd and roots (defeats symlink escape) + strict prefix check; throws typed `CwdViolation`.
3. **Fail-closed sharing** (`artifact_share_service.js:46-51`): missing sanitized version → deny `share.sanitization_missing`; cross-trace → deny.
4. **Always-human approval scopes enforced in code** (`approval_service.js:7-25` `NEVER_AUTO` + restricted check) — not just in the prompt.
5. **Clean, readable policy pipeline** (`policy_engine.js:249-272`): ordered layers, every decision carries `ruleId` + reason, `explain()` returns the full trace.
6. **Strong behavioral test suite for the core** + threat-model bypass regression with `Tested by:` traceability.
7. **Healthy dependencies** (0 vulns, lockfile, minimal surface) and disciplined stderr logging.

---

## Improvement Strategy

**Themes (explain most findings):**

1. **"The headless hot path fights Node's concurrency model."** `spawnSync` + a `Promise.race` timeout gives a blocking gateway and a fake timeout (A1/P1). *Target state:* every real agent run is non-blocking with an enforced, cancellable timeout. *Principle: never run unbounded synchronous work in the event loop of a server that must stay responsive.*
2. **"The security model's promise outruns its mechanism."** Shallow regex sanitization + classification downgrade (SEC1), caller-trusted auto-approve (SEC2), unsanitized file audit (SEC7), fail-open allowlist (SEC5), adapter-specific guards (A3/SEC4). *Target state:* the Gateway resolves trust facts itself (classification, allowlists, excluded paths) and the documented sanitization contract matches what the code does. *Principle: the enforcement point must derive its decisions from authoritative state, never from the caller, and never claim more than it enforces.*
3. **"No release engineering."** No CI, no lint, no license, no tag on `main` (OPS1/OPS2/D1). *Target state:* push/PR runs `ci.sh` + lint; `main` carries a licensed, tagged release. *Principle: the default branch is the product; gate it automatically.*
4. **"Out-of-scope V1 sprawl creates incoherence."** A large, half-finished, duplicated, dead-code-bearing component contradicts the docs (A2/C1/C3/DOC1). *Target state:* V1 is either fenced as clearly-experimental or branched out until the MVP is releasable. *Principle: ship one coherent thing; don't leave a second unfinished product in the tree pretending not to exist.*

**Explicit trade-offs — what NOT to fix now:**
- **Don't harden the Postgres scaffold (SEC3) in place — don't ship it at all yet.** Replacing `pgLiteral` with the `pg` driver is real work for a backend that's out-of-scope and dormant; gate it behind "is V1 in or out" (Theme 4) before investing.
- **Don't chase 100% coverage or rip out the doc-substring tests.** Add coverage measurement (T3) and let the number guide; the structure tests are low-value but harmless.
- **Don't refactor the LangGraph/Temporal duplication (A2) until its fate is decided.** Fix only the divergent-error bug (C1); deduplicating two impls you may delete is wasted effort.
- **Don't build a custom sandbox.** Lean on codex `-s` (with an allowlist + floor, SEC6) and per-repo policy; don't reinvent isolation.

**"Done" signals (measurable):**
- A real `agent.delegate` runs while a concurrent `policy.check`/`approval.poll` is served within < 100 ms (A1 fixed); the service timeout actually aborts a hung child.
- `restrictedContext()` and the excluded-path check derive classification/paths from the registry, with tests proving `code.apply` is **not** auto-granted on a restricted repo even when `classification` is omitted (SEC2/SEC4).
- The sanitization contract is documented and a test asserts exactly what a reviewer can/can't see for a restricted `raw_diff` (SEC1).
- `.github/workflows/ci.yml` runs `scripts/ci.sh` + eslint + ruff on push/PR and is **required**; `npm run lint` and `ruff check` pass with zero errors (OPS1/OPS2).
- Zero Critical, zero High security findings open; `LICENSE` present; `main` tagged.

---

## Task Plan

### Quick wins (high impact, S effort — do immediately)

| # | Task | Files | Effort |
|---|---|---|---|
| QW1 | Add `.github/workflows/ci.yml` that runs the existing `scripts/ci.sh` on push/PR | new workflow | S |
| QW2 | Add a `LICENSE` (owner decides) and delete `docs/license-decision-needed.md` | root | S |
| QW3 | `.gitignore` the live `.mcp.json` (or replace with a `.example`); strip `AGENTS_AUTOAPPROVE`/`DRY_RUN=0` from any committed config (SEC9) | `.mcp.json`, `.gitignore` | S |
| QW4 | Fix `GRACE_MS` units and remove dead `tmuxAsync` (C5); cache compiled sanitizer regexes (C6) | `intervention_detector.js`, `tmux_client.js`, `sanitizer.js` | S |
| QW5 | Fix the divergent `_raise_on_tool_error` predicate (add `tool_error` to `activities.py:366`) (C1) | `activities.py` | S |
| QW6 | Defensive dict access + `subprocess timeout=` in the CLI (C4) | `cli/.../main.py`, `output.py` | S |

### Milestone 0 — Safety net (before refactoring)
| Task | Description | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|
| M0.1 Add coverage + lint gates | Add `c8` to the gateway test script; add eslint+prettier (JS) and ruff (Py) configs; wire into `ci.sh` and CI | `npm run lint`/`ruff check` run in CI and pass; coverage prints | M | low | QW1 |
| M0.2 Concurrency regression test | A test that calls a slow dry-run `delegate` and asserts a concurrent `policy.check` is served promptly | Test exists and currently **fails** (documents A1) | M | low | — |
| M0.3 Sanitization-contract test | Golden test asserting exactly what a reviewer receives for a restricted `raw_diff` (proves SEC1 behavior) | Test encodes current behavior; reviewed by owner | M | low | — |

### Milestone 1 — Critical fixes (security & correctness)
| Task | Description | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|
| M1.1 Non-blocking delegate | Move headless delegate from `spawnSync` to async `spawn`, with a real timeout that SIGTERM→SIGKILLs the child; keep dry-run | M0.2 test passes; timeout aborts a hung child; event loop stays responsive | L | med (adapter rewrite ×3) | M0.2, C2 |
| M1.2 Server-side classification for approvals & excluded paths | `restrictedContext()` and spawn/delegate policy context resolve repo classification + excluded paths from the registry, not caller input | Test: `code.apply` not auto-granted on restricted repo with `classification` omitted; gemini/claude spawn into `excludedPaths` is denied | M | med | — |
| M1.3 Document + decide sanitization contract | State in `threat-model.md` what sanitization does/doesn't hide; if "hide code" is intended, add structural redaction or block restricted→reviewer entirely | Docs match code; M0.3 test reflects the decided contract | M | low | M0.3 |
| M1.4 Adapter hardening parity | Lift `checkEnabled`, excluded-path guard, `view`/`kill` policy preflight, and model/effort charset re-validation into `base_adapter.js`; enforce codex sandbox allowlist + floor (SEC4/SEC5/SEC6/A3) | All three adapters enforce the same guards; tests cover each | L | med | C2 |

### Milestone 2 — High-leverage improvements
| Task | Description | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|
| M2.1 Unify file + stream audit sanitization | Route the on-disk audit through the same restricted-key/sanitize path, or stop persisting prompt prefixes (SEC7) | Test: restricted prompt fragment never lands in `events.jsonl` | M | low | — |
| M2.2 Decide V1's fate | Fence `orchestrator-langgraph/` as experimental (own README, excluded from default install/CI) or move to a branch; reconcile README scope (A2/DOC1) | README scope is true; CI does not depend on V1 | M | low | — |
| M2.3 Real two-agent E2E in CI lane | Run `mcp_two_agent_real.test.js` in a scheduled/manual CI job with real binaries (T2) | A non-default CI lane exercises the real handoff | M | med | QW1 |
| M2.4 De-owner-ify shipped paths | Remove `/home/carase` from `scripts/`, `prompts/kya_*`, tests; source from env/args (SEC9 cross-cut) | `grep -r /home/carase` over tracked non-history files → 0 | M | low | QW3 |

### Milestone 3 — Quality & polish
| Task | Effort |
|---|---|
| M3.1 Dedupe adapter `ask`/`view`/`kill` into `base_adapter` (C2) | M |
| M3.2 Single `docs/models.md` source of truth; align all prompts/README (DOC2) | S |
| M3.3 CLI: shared `_require_node_script` helper, consistent exit codes (C4) | S |
| M3.4 Fix `metrics.py` consumer loop/retry if V1 is kept (P3) | S |
| M3.5 Repo-root cleanup; English summary of the V4 plan (DOC3) | M |

### Implementation sketches — top 3

**M1.1 — Non-blocking delegate.**
*Approach:* replace `spawnSync(bin, args, {timeout})` in each adapter's headless `delegate` with `spawn(bin, args)` returning a Promise that accumulates `stdout`/`stderr`, resolves on `close`, and is wrapped in a timeout that calls `child.kill('SIGTERM')` then `SIGKILL` after a grace. Drop the now-redundant service `withTimeout`, or make it pass an `AbortSignal` into the adapter so it can actually cancel. *Key steps:* (1) add a shared `runHeadless(bin,args,{cwd,timeoutMs,signal})` in `base_adapter.js`; (2) port codex/claude/gemini to it; (3) keep dry-run branches untouched; (4) make M0.2's concurrency test pass. *Gotchas:* preserve exit-code semantics (codex distinguishes spawn-error from non-zero, `codex_adapter.js:217`); ensure large diffs don't dead-lock on a full stdout pipe (consume streams). *Validate:* concurrent `policy.check` served < 100 ms during a slow delegate; a hung child is killed at the timeout.

**M1.2 — Server-side trust resolution.**
*Approach:* in `approval_service.request`, when `context.repo` is present, look up `registries.getRepo(repo).classification` and treat that as authoritative in `isAutoApprovable` (caller-supplied classification may only *raise* sensitivity, never lower it). In `agent_service.delegate/spawn`, add `path: cwd` (and the repo) to the policy context so `evaluateClassification`'s excluded-path branch (`policy_engine.js:71`) actually runs for all agents. *Key steps:* thread `registries` into `approval_service` (currently only `config`); add tests for restricted-repo `code.apply` and excluded-path spawn. *Gotchas:* `approval.request` today doesn't receive `registries` — wire it through the tool/service; keep auto-grant working for genuinely unrestricted scopes. *Validate:* the two new deny tests pass; existing approval tests stay green.

**M1.3 — Sanitization contract.**
*Approach:* decide intent. If reviewers may see restricted code minus secrets (current behavior), document it explicitly in `threat-model.md` and rename the boundary so "sanitized" doesn't imply "code hidden." If reviewers must **not** see restricted code, either block the share entirely (deny `artifact.get.sanitized.raw_restricted` for restricted-origin) or add structural redaction (summaries/diff stats instead of full hunks). *Key steps:* write the contract; encode it in M0.3's golden test; adjust `roles.json`/`policy_engine.evaluateSanitization` if the decision is "block." *Gotchas:* don't silently change behavior — this is an operator policy decision; surface it in the Open Questions below. *Validate:* the golden test asserts the agreed visibility; threat-model and code agree.

---

## Open Questions

1. **Sanitization intent (SEC1/M1.3):** is "sanitized restricted" meant to hide secrets only (current) or the code itself? This changes whether the current behavior is a bug or a documentation fix.
2. **Auto-approve posture (SEC2/SEC9):** should `code.apply` ever auto-grant on a `restricted` repo? Should the live `.mcp.json` (autonomy on) be in the repo at all?
3. **PROJECT_V1 fate (A2/SEC3/DOC1):** keep `orchestrator-langgraph/` + Postgres/Redis as fenced-experimental, or branch it out until the MVP is releasable? Drives M2.2 and whether SEC3 needs fixing.
4. **Release intent (D1/OPS1):** cut `main` + `v0.1.0` + license now, or stay on feature branches deliberately?
5. **Concurrency model (A1):** is single-operator-serial acceptable for now (making A1 lower priority), or must the gateway serve concurrent agents/approvals (making it Critical)? The KYA loop's reliance on `agent.delegate` suggests the latter.
6. **Target runtime for V1 components:** if kept, what are the real Postgres/Redis/Temporal deployment targets — needed before hardening SEC3 or finishing the docker stack (`E/0/2`).

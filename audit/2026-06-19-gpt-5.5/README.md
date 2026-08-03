# Audit — agents-orchestrator — 2026-06-19

Consolidated index of four principal-level audits of this repository. Each report is self-contained with `file:line` / rendered-state evidence, severity ratings, a strategy, a milestone plan with quick wins, and open questions. **This index synthesizes them** — read it first, then drill into the report you need.

| Audit | Report | Grade | One-line verdict |
|---|---|---|---|
| **Product** | [`product-audit.md`](product-audit.md) | **C+** | Delivers its core promise for its author, but strands any second operator. |
| **Code** | [`code-audit.md`](code-audit.md) | **B−** | Well-engineered in-scope core; one hot-path bug, a sanitization say-do gap, no release engineering. |
| **Architecture** | [`architecture-audit.md`](architecture-audit.md) | **C+** (struct B−, ops D+) | Clean, well-bounded single-process core that isn't yet operable, beside a built-but-inoperable V1 layer. |
| **UX** | [`ux-audit.md`](ux-audit.md) | **C** | Clean CLI primitives; the two defining interactions (approve, observe) are under-designed. |

**Method note:** the product/UX audits *exercised the running product* (dry-run MCP smoke, the real `agent-run` CLI across allow/deny/approval/error/empty states against the live 915-event audit log); the code/architecture audits *verified every Critical/High claim against source* and derived the as-built topology directly from imports, manifests, and the migration schema rather than trusting the docs. The real two-agent/KYA flows run only in the owner's environment and were not triggered.

---

## Combined verdict

**agents-orchestrator is a genuinely well-engineered MVP that works for its author and does not yet work for anyone else.** Its spine is strong and worth preserving: a strict, *actually-respected* `tools → services → core → adapters` layering with a single policy trust boundary, no-shell subprocess discipline, a realpath cwd guard, fail-closed artifact sharing, server-side enforcement of always-human approval scopes, a `traceId`-correlated append-only audit, strong behavioral tests for the core, and zero dependency vulnerabilities. The same four problems recur across every lens: **(1)** the documentation describes a *different product than the repo* (scope, license, release, ADRs, models all say one thing and do another); **(2)** every on-ramp assumes the author's machine, so a second operator can't reach value; **(3)** the safety model — the product's whole reason to exist — is mostly solid but its *promise outruns its mechanism* in a few specific, fixable places; and **(4)** the system is *built but not operable* — no CI, no crash recovery, no live health signal, and the two interactions the product is *for* (approving, and seeing what's happening) are the least-finished. None of this is unsound design; it's an unfinished, unreconciled, author-shaped product. The fixes are mostly cheap and high-leverage.

---

## Cross-cutting themes (the findings that appear in ≥2 audits)

### CC1 — The docs describe a different product than the repo *(Product · Code · Architecture · UX)*
- README lists Postgres/Redis/LangGraph/Temporal as **"Out of scope,"** but all four are **built** (`orchestrator-langgraph/`, `core/postgres_db.js`, Redis publisher/consumer). *(P, C, A)*
- **ADR-002** ("NO long-running orchestrator process", `accepted`) vs **ADR-V1-05** (a Temporal worker running durable orchestration, `accepted`) — unreconciled, neither superseding the other. *(A)*
- **No `LICENSE`** → legally "all rights reserved" for a tool that presents as shareable. *(P, C)*
- **`main` is 205 commits behind**, no `v0.1.0` tag, nothing pushed — the "release" named in PROJECT_V3 never landed. *(P, C, A)*
- **Model drift:** `gpt-5`/`opus-4-7` (mvp2 prompt, README) vs `gpt-5.5`/`fable-5`/`opus-4-8` (KYA, registry). *(P, C)*
- **Four competing orchestrator prompts** with no canonical pointer. *(P, UX)*
- **Consequence:** no one (including a future contributor or the author in six months) can trust the docs to know what the system *is* or which path is supported.

### CC2 — Works for the author, not the next operator *(Product · Code · Architecture · UX)*
- **No one-command path / no operator console** for the core loop; `agent-run` covers only `policy/audit/approve`. *(P, UX)*
- **No sample repo ships**; the default registry is populated with the owner's private repos (`cvision`, `cvlib`). *(P)*
- **29 hardcoded `/home/carase` paths** across `scripts/`, `prompts/kya_*`, a test, and a committed **`.mcp.json`** that ships `AGENTS_DRY_RUN=0` + `AGENTS_AUTOAPPROVE=code.apply`. *(P, C, A)*
- **Consequence:** the "successful real run" is reproducible only on the author's box; onboarding strands everyone else.

### CC3 — The safety model is the differentiator — and mostly solid — but the promise outruns the mechanism *(Code · Architecture)*
- **Preserve (verified strengths):** no-shell discipline, realpath cwd guard, fail-closed sharing (`artifact_share_service.js:46-51`), `NEVER_AUTO` enforced server-side (`approval_service.js:7-25`), single trust boundary (ADR-003), `traceId` audit.
- **Gaps:** sanitization is a **shallow 4-pattern regex denylist** that reclassifies `restricted`→`internal`, so a reviewer barred from restricted repos still receives the **full diff** with only secrets masked; **auto-approve trusts caller-supplied `classification`** instead of resolving it from the registry; the **excluded-path layer never fires for gemini/claude** spawns; the **on-disk audit is written unsanitized**; and concurrent Gateways can **interleave-corrupt the audit log** (`appendFileSync` > 4 KB). *(C, A)*
- **Consequence:** the product's core trust claim leaks more than its language implies, in specific and fixable ways.

### CC4 — Built, not operable; no release engineering *(Code · Architecture · UX)*
- **No CI** (`.github/workflows/` absent) and **no lint/format** enforcement; boundaries are documented but unenforced. *(C, A)*
- **Event-loop-blocking `agent.delegate`:** synchronous `spawnSync` inside a `Promise.race` timeout freezes the single-process gateway for the whole agent run (and the timeout is dead code). *(C, A)*
- **No crash recovery:** a mid-orchestration crash orphans tmux sessions and leaves `running` rows with no reconciliation; **no health/metrics/alerts/SLO.** *(A)*
- **V1 inoperable as shipped:** compose has 2 of 6 services, no gateway image, push is a dry-run no-op, Redis "bus" has no DLQ/idempotency. *(A)*
- **Consequence:** the system can't tell you it's alive, can't recover when it dies, and regressions reach branches unguarded.

### CC5 — The two defining interactions are under-designed *(UX · Product)*
- **Approve** (the headline human-in-the-loop gate): no way to **list pending approvals**, and `approve <id>` authorizes by **opaque id with zero preview** of what's being approved, then offers no undo — consent without information. *(UX)*
- **Observe:** `audit show` exposes only `ts/type/traceId/eventId`, hides action/role/decision, and **truncates the `traceId`** so the operator can't even copy it to filter. *(UX)*
- **Consequence:** a human-in-the-loop, trust-centric product doesn't surface the human's decisions or the system's state.

---

## Start here — consolidated priorities

### Quick wins (high impact, S effort — do this week)
1. **Add `LICENSE`** (owner decides) and delete `docs/license-decision-needed.md`. *(CC1)*
2. **Add `.github/workflows/ci.yml`** running the existing `scripts/ci.sh` on push/PR. *(CC4)*
3. **`.gitignore` the live `.mcp.json`** (use `client-config/mcp.json.example`); strip `AGENTS_AUTOAPPROVE`/`DRY_RUN=0` from any committed config. *(CC2, CC3)*
4. **Reconcile the docs:** relabel V1 "Out of scope" → "Experimental (PROJECT_V1)"; mark ADR-001/002 `Superseded-in-part by ADR-V1-*`; publish one `docs/models.md` source of truth. *(CC1)*
5. **`audit show`:** add `action`/`role`/`decision` columns and stop truncating `traceId` (or add `--full-id`/`--wide`). *(CC5)*
6. **Add `agent-run approvals list`** so pending decisions are discoverable. *(CC5)*
7. **Merge to `main` + tag `v0.1.0` + push**, if release is intended (see OQ). *(CC1)*

### Critical fixes (security & correctness — schedule next)
1. **Non-blocking `delegate`:** move headless execution to async `spawn` with a real, cancellable timeout; verify a concurrent `policy.check` is served < 100 ms during an agent run. *(CC4)*
2. **Server-side trust resolution:** `restrictedContext()` and the spawn/delegate policy context resolve repo classification + excluded paths from the **registry**, not caller input; test that `code.apply` is never auto-granted on a restricted repo. *(CC3)*
3. **Decide & document the sanitization contract:** state exactly what a reviewer may see for a restricted `raw_diff`; either accept-and-document, add structural redaction, or block the share. *(CC3)*
4. **Informed approval flow:** `approve` (human mode) shows what it authorizes and confirms before granting; `--yes`/`--json` keep scripts non-interactive. *(CC5)*
5. **Boot-time session reconciliation** + a workspace `flock` lock (closes the audit-interleaving risk and the zombie-session risk). *(CC4, CC3)*

### High-leverage (makes future work easier)
- Boundary checks in CI (dependency-cruiser + import-linter) + a tool-contract snapshot test. *(CC4, CC1)*
- Ship a sample repo + de-owner-ify paths so a second operator can run the loop. *(CC2)*
- A read-only `agent-run status --trace-id` operator console. *(CC2, CC5)*
- Decide V1's fate (fence as experimental or branch out); reconcile or complete its stack. *(CC1, CC4)*

---

## Consolidated open questions (deduped across all four audits)

1. **Target segment:** is this the owner's personal tool, or a shareable open tool? Reprioritizes most of CC2 and the say-do gaps. *(P, C)*
2. **Sanitization intent:** hide secrets only (current) or hide restricted *code* from reviewers? Decides whether CC3's top item is a bug or a doc fix. *(C)*
3. **PROJECT_V1's fate:** keep Postgres/Redis/LangGraph/Temporal as fenced-experimental, or branch it out until the MVP is releasable? Gates CC1 and CC4 work. *(P, C, A)*
4. **Release intent:** cut `main` + `v0.1.0` + license now, or stay on feature branches deliberately? *(P, C, A)*
5. **Concurrency model:** must one workspace host concurrent Gateways? If yes, the audit-interleaving and single-writer issues become Critical; if no, a `flock` closes them cheaply. *(A, C)*
6. **Canonical hero flow / prompt:** is the two-agent review loop or the plan-driven (KYA) loop the headline job — and which of the four prompts is *the* UI? Drives onboarding and UX consolidation. *(P, UX)*
7. **Auto-approve posture:** should `code.apply` ever auto-grant on a restricted repo, and should the autonomy-enabled `.mcp.json` be in the repo at all? *(C, A)*
8. **Ops targets:** any SLO/RPO/RTO, supported devices/locales, or accessibility duty? Today there are none. *(A, UX)*

---

*Generated by the product-, code-, architecture-, and ux-audit-review skills. Read-only — no code, infra, or product was modified. Reports are point-in-time against branch `feature/enable-codex-planner` (HEAD 205 ahead of `main`).*

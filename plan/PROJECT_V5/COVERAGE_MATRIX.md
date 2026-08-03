# Project V5 — Audit and V4 coverage matrix

Status: active

Planning baseline: `develop@b532c63`; reviewed B implementation integrated on
`integration/V5-B-contract-20260726@9a33ddd`.

Planning rule: functionality first, with authority, isolation, and resource
controls completed before any new real-agent or cross-principal execution.

## Inputs and independence

This matrix deduplicates four committed sources without rewriting their
independent conclusions:

1. the seven-report [Project V5 independent audit](../../audit/PROJECT_V5_INDEPENDENT_2026-07-25_GPT56SOL_ULTRA/00_INDEX.md),
   run with **GPT-5.6 Sol**, reasoning **`ultra`**, and execution profile
   **`fast/priority`** on 2026-07-25;
2. the [historical GPT-5.5 audit](../../audit/2026-06-19-gpt-5.5/README.md)
   of product, architecture, code, and UX from 2026-06-19;
3. the [whole-project audit](../../audit/2026-07-26-project-wide/README.md)
   covering V0–V5, runtime topology, release identity, QA, governance, and
   dependency risk; and
4. the [Project V4 rebaseline](../PROJECT_V4/AUDIT.md) and its executable
   specifications.

Audit reports remain immutable evidence. Project V5 owns only the
deduplication, delivery order, and acceptance ownership recorded here.

## Baseline rules

- `implemented` means behavior exists in the active integration range, has
  RED/GREEN evidence, a scoped commit, and an independent OK result.
- `in_progress` means implementation evidence exists on an isolated branch but
  review or promotion is still outstanding.
- `planned` means an executable sheet exists but no implementation may be
  inferred from its prose.
- `gap` means no executable owner exists; this matrix must not leave a P0 or P1
  in that state.
- V4 rebaseline documentation at `59bd17d` is an ancestor of active `develop`.
  Its behavior remains planned until an implementation commit, tests, and
  review prove it. Preliminary V4 feature refs are provenance, not closure.
- The live `.mcp.json`, shared Gateway, and shared Redis endpoint are excluded
  from disruptive testing: no restart, reconnect, or stop is authorized.
  D/0/05 owns safe child non-inheritance and distributable templates without
  mutating the live instance during development.

## Deduplicated coverage and acceptance ownership

Each row has exactly one accountable acceptance owner. Supporting sheets may
provide prerequisites or consume the result, but they do not duplicate that
acceptance. Every High/Critical ID from the 2026-07-25 reports and every P0/P1
ID from the 2026-07-26 whole-project index appears exactly once.

| Source ID(s) | Deduplicated acceptance | Acceptance owner | Supporting/consumer sheets | State |
|---|---|---|---|---|
| operator lease correction | Field-specific lease errors and usable default/maximum | B/0/00 | C/0/01 | implemented, reviewed |
| operator scope/health correction | Canonical scope and non-registering readiness | B/0/01 | E/0/04 | implemented, reviewed |
| operator artifact-list correction | Transitional caller fields, policy-before-data, local-only audit | B/0/05 | D/0/00 replaces caller assertions | implemented, reviewed |
| coordination operability | Registration heartbeat and lease-loss rejoin profile | B/0/02 | G/0/01 | complete; Trial 2 reviewed OK |
| coordination evidence protocol | Notices use events; decisions use immutable artifacts | B/0/03 | F/0/00, F/0/01 | planned |
| second-orchestrator proof | Restart, stale lease, decision artifact, and transport ACK | B/0/04 | G/0/00, G/0/04 | planned |
| TST-B01 | Supported runtime, portable manifests, suite/skip/lane sentinels | C/0/00 | G/0/00, I/0/05, I/0/07 | complete and integrated; Trials 1–8 KO preserved; Trial 9 correction `f37fe7f` approved by `262c666` |
| P-05, UX-H2, UX-H5, A-09 | One generated tool/schema/error contract with truthful MCP errors | C/0/01 | H/0/00 | complete; Trial 2 reviewed OK and integrated in functional Wave 2 |
| DEP-01, GOV-01, PLAN-01 | Candidate manifest, SCA waivers, and executable state validation | C/0/02 | I/0/04 | planned |
| H-03 | Server-owned orchestration/task/session reducer and identity links | C/1/00 | C/1/01, C/1/03 | planned |
| P-04, UX-H4 | Completion fails while child work is nonterminal or contradictory | C/1/02 | C/1/00, C/1/03 | planned |
| P-01, C-01, H-04, SEC-01, AUTH-01, POLICY-01, DP-04, A-02 | Server-derived principal/repo/action with unknown-action deny | D/0/00 | E/0/02, F/0/00 | planned P0 |
| A-01, H-01, H-02, SEC-03, SHELL-01 | Async no-shell supervisor, foreground identity, bounded tree cancellation | D/0/01 | D/0/04 | planned P0 |
| H-05, SEC-02, SEC-04, EXEC-01 | Isolated child boundary, metadata-only output, and no regex downgrade | D/0/02 | D/0/05, F/0/00 | planned P0 |
| OPS-02 | One workspace writer with durable wakeups and crash reconciliation | D/0/03 | E/0/04, I/0/00 | planned P1 |
| QA-03 | One persistent external Gateway/MCP connection E2E | D/0/04 | C/0/00 | planned P1 |
| OPS-01 | Child cannot inherit or recursively start the control Gateway | D/0/05 | E/0/04, I/0/06, I/0/07 | planned P0 |
| SEC-05, ABUSE-01 | Atomic global/principal/repo budgets and responsive control plane | D/0/06 | E/0/04, H/0/05 | planned P0 gate; audit severity High |
| P-07, UX-H6, UX-01 | Zero-known-ID recovery of recent/live trace/task/session inventory | E/0/00 | C/1/01, C/1/03 | planned P1 |
| P-09, UX-H1 | Usable pending queue, exact preview/consent, and readable outcome | E/0/03 | E/0/01–02 | planned P1 |
| P-02, C-02, C-03 | Authenticated, effect-bound, single-use approval grant | E/0/02 | D/0/00, E/0/01, F/0/01 | planned P0 |
| A-08 | External liveness/stall detection, reconciled readiness, bounded OTLP RED/USE export, durable cursor, SLO/alerts, and dashboard | E/0/04 | D/0/01, D/0/03, D/0/05, D/0/06, E/0/00, G/0/03, H/0/04, I/0/05, I/0/07 | planned P1; complete V1 health/watchdog/observability contract materialized, runtime pending |
| H-06, DP-03 | Server-owned artifact kind/classification/producer/lineage | F/0/00 | D/0/00, F/0/01 | planned P0 |
| P-03 | Current manifest digest, independent dispositions, and exact review gate | F/0/03 | F/0/00–02, F/0/04 | planned P0 |
| TST-H01, TST-H02 | Required Redis 7 Lua/race lane with real concurrent clients | G/0/00 | C/0/00, B/0/04 | planned P1 |
| A-06 | Bounded retry, poison quarantine, DLQ, and authorized replay | G/0/02 | G/0/01, G/0/03 | planned P1 |
| SEC-06 | Closed-scope admission, participant caps, and revocation | G/0/04 | D/0/00 | planned |
| P-08, UX-H3 | One generated profile/model/tool/policy truth source | H/0/00 | C/0/01 | planned P1 |
| P-06, UX-H7 | One-command flow proves every promised gate and honest closure | H/0/02 | H/0/01, C/1/03, F/0/04 | planned P1 |
| TST-H03 | Protected real Codex/Claude run in a clean non-owner environment | H/0/05 | D/0/04–06, F/0/04 | planned P1 |
| A-03, OPS-03 | Durable operation/outbox atomically joins state and projections | I/0/00 | I/0/01, D/0/03 | planned P1 |
| A-04, A-05, QA-01, QA-02, DP-02 | Real Gateway envelopes, KO/nonzero fail-closed, authoritative Temporal replay | I/0/02 | E/0/02, F/0/03 | planned P1 |
| DP-01, DP-05, DP-06, DATA-01, REL-01 | Cross-store lifecycle plus exact reviewed/candidate/main/tag/published identity | I/0/04 | C/0/02, I/0/03, I/0/07–08 | planned P1 |
| TEST-01 | Parameterized PostgreSQL driver and required live contract | I/0/05 | C/0/00, I/0/07 | planned |
| V1-01, V1-02 | Stage-specific task identity and installed persistent worker | I/0/06 | D/0/05–06, I/0/02 | planned |
| A-07, SEC-08 | Candidate-bound disposable full stack with zero unexpected skips | I/0/07 | G/0/00, H/0/05, I/0/05–06 | planned P1 |
| historical duplicate ITRP/ADR drift | Explicit Temporal cutover, history drain, rollback, and legacy retirement | I/0/08 | C/0/02, I/0/02, I/0/07 | planned |

Medium/lower audit work remains executable through the V4 72-sheet rebaseline
and the [V4 absorption ledger](V4_ABSORPTION.md); it is not allowed to acquire
a second V5 acceptance owner.

## Historical audit reconciliation

| Historical conclusion | Current disposition |
|---|---|
| Missing license | resolved: `LICENSE` exists |
| No CI/lint | obsolete as written; CI/lint exist, while C/0/00 owns supported runtimes, manifest parity, skip discipline, and executable sentinels |
| Duplicate `_raise_on_tool_error` helper | resolved before this baseline; no new V5 sheet |
| V1 advertised inconsistently | still experimental; I/0/02 owns workflow truth, I/0/06–08 own portable runtime, full-stack proof, and canonical cutover |
| No health signal | coordination health is implemented by B/0/01; product readiness/stall recovery belongs to E/0/04 and is bound to the single D/0/05 daemon plus its health-only external watchdog |
| Hard-coded owner paths and live `.mcp.json` inheritance | H/0/03 owns portability; D/0/05 owns non-inheritable control-plane configuration |
| No inventory/recovery and weak approval/audit UX | E/0/00–04 |
| Blocking delegate and weak process boundary | strengthened by SEC/SHELL/OPS evidence; D/0/01–06 precedes real-mode expansion |
| “No-shell/single trust boundary mostly solid” | superseded by the 2026-07-25 security audit and 2026-07-26 runtime evidence |
| Redis stream lacks group/ACK | addressed inbox contract resolved in A/0/00; required runner, poison/DLQ, and operations remain G/0/00–03 |
| V4 plan absent from active baseline | obsolete: V4 rebaseline specs are integrated, but still do not count as implemented behavior |

## Functional execution order

1. Promote the reviewed B/0/00, B/0/01, and B/0/05 correction package.
2. Build on integrated C/0/00 and finish C/0/01–02 so every later lane has a
   canonical tool contract, candidate identity, SCA, and state validator.
3. Complete C/1/00–03 so lifecycle state cannot report false success.
4. Complete D/0/00–06 before expanding real-agent, YOLO, cross-principal, or
   recursively configured execution.
5. Deliver operator recovery/readiness (E), provenance/review gates (F), and
   required coordination operability (G), parallelizing only independent
   scopes.
6. Productize the generic hero flow and protected second-operator proof (H).
7. Close durable data, real integration, V1, and exact release identity in I,
   pulling integrity work forward whenever an earlier feature depends on it.

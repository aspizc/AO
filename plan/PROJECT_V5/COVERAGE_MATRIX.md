# Project V5 — Audit and V4 coverage matrix

Status: active

Planning baseline: `integration/V5-functional-wave-2@683422d`. Promoted
evidence remains the exact `develop@c10bcf3` / `main@7039a0b` lineage named
below. G/0/01 and D/0/00 are independently reviewed and present in the current
integration candidate. C/1/00 preserves fifteen KO trials; its
human-authorized reducer-only scope rebaseline CORE Trial 2 is independently
OK and integrated, while its former process work and final splice moved to
D/0/01. The independently confirmed persistent-control gap now inserts the
planned/reviewed D/0/07 prerequisite before that splice.

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
| P-05, UX-H2, UX-H5, A-09 | One generated tool/schema/error contract with truthful MCP errors | C/0/01 | H/0/00, I/0/08; neither consumer adds acceptance to this complete owner | complete; Trial 2 reviewed OK and integrated in functional Wave 2 |
| DEP-01, GOV-01, PLAN-01 | Candidate manifest, SCA waivers, and executable state validation | C/0/02 | I/0/04 | complete; Trial 4 reviewed OK at `9766979`, integrated at `2111f89`, and promoted through `c10bcf3`/`7039a0b`; I/0/04 remains planned |
| H-03 | Server-owned orchestration/task/session reducer and identity links | C/1/00 | C/1/01, C/1/03, D/0/07 | in progress; Trials 1–15 KO preserved, Trial 16 denied, `C_1_0_REBASELINE` CORE Trial 2 independently OK/integrated, final C/D splice blocked on reviewed D/0/07 |
| P-04, UX-H4 | Completion fails while child work is nonterminal or contradictory | C/1/02 | C/1/00, C/1/03 | planned |
| P-01, C-01, H-04, SEC-01, AUTH-01, POLICY-01, DP-04, A-02 | Server-derived principal/repo/action with unknown-action deny | D/0/00 | E/0/02, F/0/00 | complete; Trial 4 independently reviewed OK at `7244852` and integrated in Wave 2 at `b711b92`, promotion pending |
| A-01, H-01, H-02, SEC-03, SHELL-01 | Async no-shell supervisor, transferred sync/FIFO/Python-runtime containment, exact provider argv/effective-audit parity, foreground identity, bounded tree cancellation | D/0/01 | H/0/00, C/1/00 rebaseline, D/0/07, D/0/04 | in progress P0; standalone core Trial 4 independently OK at `8198698` and integrated at `a7c09b0`; splice Trial 1 `blocked_confirmed`, with final adapter/lifecycle splice blocked before GREEN on implemented/reviewed D/0/07 |
| H-05, SEC-02, SEC-04, EXEC-01 | Isolated child boundary, metadata-only output, and no regex downgrade | D/0/02 | D/0/05, F/0/00 | planned P0 |
| OPS-02 | One workspace writer with durable wakeups and crash reconciliation | D/0/03 | E/0/04, I/0/00 | planned P1 |
| QA-03 | One persistent external Gateway/MCP connection E2E | D/0/04 | C/0/00 | planned P1 |
| OPS-01 | Child cannot inherit or recursively start the control Gateway | D/0/05 | E/0/04, I/0/06, I/0/07 | planned P0 |
| SEC-05, ABUSE-01 | Atomic global/principal/repo budgets and responsive control plane | D/0/06 | E/0/04, H/0/05 | planned P0 gate; audit severity High |
| P-07, UX-H6, UX-01 | Zero-known-ID recovery of recent/live trace/task/session inventory | E/0/00 | C/1/01, C/1/03 | planned P1 |
| P-09, UX-H1 | Usable pending queue, exact preview/consent, and readable outcome | E/0/03 | E/0/01–02 | planned P1 |
| P-02, C-02, C-03 | Authenticated, effect-bound, single-use approval grant | E/0/02 | D/0/00, E/0/01, F/0/01 | planned P0 |
| PROD-M05, YOLO-01, UX-H08 | Scoped, signed, revocable, bounded-use orchestrator autonomy with informed local control | E/0/05 | D/0/02, D/0/05–06, E/0/02–03, H/0/05 | planned P0 |
| A-08 | External liveness/stall detection, reconciled readiness, bounded OTLP RED/USE export, durable cursor, SLO/alerts, and dashboard | E/0/04 | D/0/01, D/0/03, D/0/05, D/0/06, E/0/00, G/0/03, H/0/04, I/0/05, I/0/07 | planned P1; complete V1 health/watchdog/observability contract materialized, runtime pending |
| H-06, DP-03 | Server-owned artifact kind/classification/producer/lineage | F/0/00 | D/0/00, F/0/01 | planned P0 |
| P-03 | Current manifest digest, independent dispositions, and exact review gate | F/0/03 | F/0/00–02, F/0/04 | planned P0 |
| TST-H01, TST-H02 | Required Redis 7 Lua/race lane with real concurrent clients | G/0/00 | C/0/00, B/0/04 | complete; Trial 1 reviewed OK at `5058a59`, integrated at `77cb418`, and promoted through `c10bcf3`/`7039a0b`; B/0/04 remains planned |
| A-13, coordination connection lifecycle | Persistent Redis clients, bounded concurrency, reconnect, and drain | G/0/01 | G/0/00, E/0/04; supports C/0/03 modularity acceptance | complete; Trial 3 independently reviewed OK at `3cef36c` and integrated in the functional Wave 2 candidate, promotion pending |
| A-06 | Bounded retry, poison quarantine, DLQ, authorized replay, and crash reconciliation across real ACK/participant replacement | G/0/02 | G/0/01, G/0/03 | in progress P1; standalone memory core Trial 4 independently OK at `2415578`/integrated `7cc2682`; durable STORE Trial 4 independently OK at `2a49bd4`/integrated `cf8c8ed`; post-XACK receipt reconciliation, participant-identity loss disposition, Redis wiring, health, and full acceptance remain open |
| SEC-06 | Closed-scope admission, participant caps, and revocation | G/0/04 | D/0/00 | planned |
| P-08, UX-H3 | One generated profile/model/tool/policy truth source with exact provider/model/reasoningEffort/serviceTier resolution matrix | H/0/00 | C/0/01, D/0/01 | complete; Trial 5 independently reviewed OK at `89c3899` and integrated in Wave 2 at `d732441`, promotion pending |
| P-06, UX-H7 | One-command flow proves every promised gate and honest closure | H/0/02 | H/0/01, C/1/03, F/0/04 | planned P1 |
| TST-H03 | Protected real Codex/Claude run in a clean non-owner environment | H/0/05 | D/0/04–06, F/0/04 | planned P1 |
| A-03, OPS-03 | Durable operation/outbox atomically joins state and projections | I/0/00 | I/0/01, D/0/03 | planned P1 |
| A-04, A-05, QA-01, QA-02, DP-02 | Real Gateway envelopes, KO/nonzero fail-closed, authoritative Temporal replay | I/0/02 | E/0/02, F/0/03 | planned P1 |
| DP-01, DP-05, DP-06, DATA-01, REL-01 | Cross-store lifecycle, denied-egress native source build/toolchain proof, plus exact reviewed/candidate/main/tag/published identity | I/0/04 | C/0/02, H/0/01, I/0/03, I/0/07–08 | planned P1 |
| TEST-01 | Parameterized PostgreSQL driver and required live contract | I/0/05 | C/0/00, I/0/07 | planned |
| V1-01, V1-02 | Stage-specific task identity, installed persistent worker, and pending-history transport shim | I/0/06 | D/0/05–06, I/0/02, I/0/08 | planned |
| A-07, SEC-08 | Candidate-bound disposable full stack with zero unexpected skips | I/0/07 | G/0/00, H/0/05, I/0/05–06 | planned P1 |
| historical duplicate ITRP/ADR drift | Explicit Temporal cutover, history drain, rollback, and legacy retirement | I/0/08 | C/0/02, I/0/02, I/0/07 | planned |
| V4 B/4/00, B/4/02 | Flagged MCP 0.2 endpoint with explicit mismatch, complete consumer migration, mixed-version deny, atomic 0.1 retirement, and common rollback | I/0/08 | C/0/01, D/0/00, I/0/03, I/0/06–07 | planned P1 |
| ARC-12, CODE-M03, CODE-M04, QA-07, QA-09 | Characterized coordination-hotspot decomposition plus production coverage/mutation, architecture, and deterministic-seam fitness | C/0/03 | C/0/00, D/0/04; G/0/01 is supporting evidence only | planned P1 |
| AUDIT-SEC-01, DP-07, DP-08, DP-10, DP-11, DP-15 | Data catalog, egress governance, lineage/integrity, tamper evidence, and quality SLIs | I/0/09 | D/0/00, E/0/01, E/0/04, F/0/00, I/0/00, I/0/05 | planned P2 |

The three added owners close the previously missing acceptance families.
Medium/lower work is no longer hidden behind a blanket V4 pointer: the
canonical registry below accounts for all 121 source rows and the
[V4 absorption ledger](V4_ABSORPTION.md) identifies the one implementation
owner for every overlapping V4 acceptance.

## Canonical 2026-07-26 finding registry

The whole-project audit is the canonical source inventory. Its nine reports
contain **121 source rows**. There are 119 distinct bare labels because
`OPS-01` and `OPS-02` occur in both the security and operations reports. Their
stable keys below are therefore source-qualified; this prevents one report
from overwriting the other while the acceptance table deduplicates their
shared remediation.

| Source | Count | Canonical source-row keys |
|---|---:|---|
| [Product](../../audit/2026-07-26-project-wide/01_PRODUCT_FUNCTIONAL.md) | 15 | `PROD-C01`, `PROD-C02`, `PROD-H01`, `PROD-H02`, `PROD-H03`, `PROD-H04`, `PROD-H05`, `PROD-H06`, `PROD-H07`, `PROD-M01`, `PROD-M02`, `PROD-M03`, `PROD-M04`, `PROD-M05`, `PROD-L01` |
| [Architecture](../../audit/2026-07-26-project-wide/02_ARCHITECTURE_INFRASTRUCTURE.md) | 12 | `ARC-01`, `ARC-02`, `ARC-03`, `ARC-04`, `ARC-05`, `ARC-06`, `ARC-07`, `ARC-08`, `ARC-09`, `ARC-10`, `ARC-11`, `ARC-12` |
| [Code](../../audit/2026-07-26-project-wide/03_CODE_QUALITY.md) | 18 | `CODE-C01`, `CODE-C02`, `CODE-C03`, `CODE-C04`, `CODE-H01`, `CODE-H02`, `CODE-H03`, `CODE-H04`, `CODE-H05`, `CODE-H06`, `CODE-H07`, `CODE-M01`, `CODE-M02`, `CODE-M03`, `CODE-M04`, `CODE-M05`, `CODE-M06`, `CODE-L01` |
| [Security](../../audit/2026-07-26-project-wide/04_SECURITY_THREAT_MODEL.md) | 14 | `AUTH-01`, `EXEC-01`, `SHELL-01`, `SECURITY:OPS-01`, `POLICY-01`, `YOLO-01`, `SECURITY:OPS-02`, `ABUSE-01`, `REL-01`, `DEP-01`, `TEMP-SEC-01`, `COORD-SEC-01`, `CFG-SEC-01`, `AUDIT-SEC-01` |
| [Operations](../../audit/2026-07-26-project-wide/05_OPERATIONS_RELIABILITY.md) | 13 | `OPERATIONS:OPS-01`, `OPERATIONS:OPS-02`, `OPS-03`, `OPS-04`, `OPS-05`, `OPS-06`, `OPS-07`, `OPS-08`, `OPS-09`, `OPS-10`, `OPS-11`, `OPS-12`, `OPS-13` |
| [Testing](../../audit/2026-07-26-project-wide/06_TESTING_RELEASE_CONFIDENCE.md) | 9 | `QA-01`, `QA-02`, `QA-03`, `QA-04`, `QA-05`, `QA-06`, `QA-07`, `QA-08`, `QA-09` |
| [Data/privacy](../../audit/2026-07-26-project-wide/07_DATA_PRIVACY.md) | 15 | `DP-01`, `DP-02`, `DP-03`, `DP-04`, `DP-05`, `DP-06`, `DP-07`, `DP-08`, `DP-09`, `DP-10`, `DP-11`, `DP-12`, `DP-13`, `DP-14`, `DP-15` |
| [UX/operator](../../audit/2026-07-26-project-wide/08_UX_OPERATOR_EXPERIENCE.md) | 15 | `UX-H01`, `UX-H02`, `UX-H03`, `UX-H04`, `UX-H05`, `UX-H06`, `UX-H07`, `UX-H08`, `UX-M01`, `UX-M02`, `UX-M03`, `UX-M04`, `UX-M05`, `UX-M06`, `UX-L01` |
| [Governance](../../audit/2026-07-26-project-wide/09_GOVERNANCE_PLANNING_TRACEABILITY.md) | 10 | `GOV-01`, `GOV-02`, `GOV-03`, `GOV-04`, `GOV-05`, `GOV-06`, `GOV-07`, `GOV-08`, `GOV-09`, `GOV-10` |
| **Total** | **121** | **15 + 12 + 18 + 14 + 13 + 9 + 15 + 15 + 10** |

The state is evidence-based: `complete` requires reviewed and integrated
behavior, `partial` means only part of the acceptance is delivered or is on an
unintegrated branch, and `planned` means the accountable sheet exists but has
no completed implementation. After this reconciliation the 121 rows are
**15 complete, 37 partial, 69 planned, 0 missing**.

| Canonical source-row key(s) | Accountable V5 owner | State |
|---|---|---|
| `PROD-C01` | [D/0/00](D/0/00.md) | complete — Trial 4 reviewed OK and integrated in Wave 2, promotion pending |
| `PROD-C02` | [D/0/02](D/0/02.md) | planned |
| `PROD-H01` | [C/1/02](C/1/02.md) | partial — reducer prerequisite in progress |
| `PROD-H02` | [E/0/03](E/0/03.md) | planned |
| `PROD-H03` | [E/0/00](E/0/00.md) | planned |
| `PROD-H04` | [H/0/02](H/0/02.md) | planned |
| `PROD-H05` | [C/0/01](C/0/01.md) | complete |
| `PROD-H06` | [I/0/04](I/0/04.md) | partial — candidate validation complete, release identity planned |
| `PROD-H07` | [F/0/03](F/0/03.md) | planned |
| `PROD-M01` | [H/0/02](H/0/02.md) | planned |
| `PROD-M02` | [C/0/01](C/0/01.md) | complete |
| `PROD-M03` | [EPICS.md](EPICS.md#active-roadmap) | complete planning disposition; core precedes expansion |
| `PROD-M04` | [H/0/04](H/0/04.md) | planned |
| `PROD-M05` | [E/0/05](E/0/05.md) | planned |
| `PROD-L01` | [H/0/00](H/0/00.md) | partial — candidate language fixed, product projection planned |
| `ARC-01` | [D/0/05](D/0/05.md) | planned |
| `ARC-02` | [D/0/00](D/0/00.md) | complete — Trial 4 reviewed OK and integrated in Wave 2, promotion pending |
| `ARC-03` | [D/0/03](D/0/03.md) | planned |
| `ARC-04` | [D/0/01](D/0/01.md) | planned — owns new async core and all transferred sync/FIFO containment; C Trial 15 code is evidence only |
| `ARC-05` | [I/0/00](I/0/00.md) | planned |
| `ARC-06` | [C/1/00](C/1/00.md) | partial — reducer-only CORE Trial 2 independently OK/integrated; final C/D splice pending; fifteen historical KOs preserved |
| `ARC-07` | [I/0/02](I/0/02.md) | planned |
| `ARC-08` | [I/0/02](I/0/02.md) | partial — MCP catalog complete, workflow/store convergence planned |
| `ARC-09` | [I/0/05](I/0/05.md) | planned |
| `ARC-10` | [G/0/03](G/0/03.md) | partial — connection lifecycle in authoring, operations planned |
| `ARC-11` | [I/0/07](I/0/07.md) | planned |
| `ARC-12` | [C/0/03](C/0/03.md) | planned |
| `CODE-C01` | [D/0/00](D/0/00.md) | complete — Trial 4 reviewed OK and integrated in Wave 2, promotion pending |
| `CODE-C02` | [E/0/02](E/0/02.md) | planned |
| `CODE-C03` | [D/0/02](D/0/02.md) | planned |
| `CODE-C04` | [D/0/01](D/0/01.md) | planned |
| `CODE-H01` | [D/0/01](D/0/01.md) | planned — core supervisor and cancellation now include transferred sync/FIFO/runtime ownership |
| `CODE-H02` | [C/1/00](C/1/00.md) | partial — reducer-only CORE Trial 2 independently OK/integrated; final C/D splice pending |
| `CODE-H03` | [D/0/00](D/0/00.md) | complete — Trial 4 reviewed OK and integrated in Wave 2, promotion pending |
| `CODE-H04` | [D/0/02](D/0/02.md) | planned |
| `CODE-H05` | [I/0/09](I/0/09.md) | planned |
| `CODE-H06` | [D/0/03](D/0/03.md) | planned |
| `CODE-H07` | [I/0/02](I/0/02.md) | planned |
| `CODE-M01` | [I/0/02](I/0/02.md) | partial — MCP catalog complete, workflow/store contract planned |
| `CODE-M02` | [I/0/00](I/0/00.md) | planned |
| `CODE-M03` | [C/0/03](C/0/03.md) | partial — complete G/0/01 is supporting evidence only; hotspot decomposition remains planned and owns closure |
| `CODE-M04` | [C/0/03](C/0/03.md) | planned |
| `CODE-M05` | [I/0/06](I/0/06.md) | planned |
| `CODE-M06` | [C/0/02](C/0/02.md) | complete |
| `CODE-L01` | [H/0/00](H/0/00.md) | partial — runtime/dependency gates complete, packaging projection planned |
| `AUTH-01` | [D/0/00](D/0/00.md) | complete — Trial 4 reviewed OK and integrated in Wave 2, promotion pending |
| `EXEC-01` | [D/0/02](D/0/02.md) | planned |
| `SHELL-01` | [D/0/01](D/0/01.md) | planned |
| `SECURITY:OPS-01` | [D/0/05](D/0/05.md) | planned |
| `POLICY-01` | [D/0/00](D/0/00.md) | complete — Trial 4 reviewed OK and integrated in Wave 2, promotion pending |
| `YOLO-01` | [E/0/05](E/0/05.md) | planned |
| `SECURITY:OPS-02` | [D/0/03](D/0/03.md) | planned |
| `ABUSE-01` | [D/0/06](D/0/06.md) | planned |
| `REL-01` | [I/0/04](I/0/04.md) | partial — candidate identity complete, exact release planned |
| `DEP-01` | [C/0/02](C/0/02.md) | complete |
| `TEMP-SEC-01` | [I/0/02](I/0/02.md) | planned |
| `COORD-SEC-01` | [G/0/04](G/0/04.md) | planned |
| `CFG-SEC-01` | [I/0/07](I/0/07.md) | planned |
| `AUDIT-SEC-01` | [I/0/09](I/0/09.md) | partial — generic MCP minimization improved, tamper evidence planned |
| `OPERATIONS:OPS-01` | [D/0/05](D/0/05.md) | planned |
| `OPERATIONS:OPS-02` | [D/0/03](D/0/03.md) | planned |
| `OPS-03` | [I/0/00](I/0/00.md) | planned |
| `OPS-04` | [D/0/01](D/0/01.md) | planned — async core plus transferred sync/FIFO/runtime containment |
| `OPS-05` | [C/1/00](C/1/00.md) | partial — reducer-only CORE Trial 2 reviewed/integrated; supervisor and final-splice ownership transferred to D/0/01 |
| `OPS-06` | [D/0/06](D/0/06.md) | planned |
| `OPS-07` | [E/0/04](E/0/04.md) | planned |
| `OPS-08` | [I/0/03](I/0/03.md) | planned |
| `OPS-09` | [G/0/03](G/0/03.md) | partial — G/0/01 lifecycle complete, consumer operations planned |
| `OPS-10` | [I/0/07](I/0/07.md) | planned |
| `OPS-11` | [E/0/04](E/0/04.md) | planned |
| `OPS-12` | [I/0/07](I/0/07.md) | partial — Redis live lane complete, full stack planned |
| `OPS-13` | [D/0/06](D/0/06.md) | partial — Redis lifecycle complete, global budgets planned |
| `QA-01`, `QA-02` | [I/0/02](I/0/02.md) | planned |
| `QA-03` | [D/0/04](D/0/04.md) | planned |
| `QA-04` | [I/0/07](I/0/07.md) | partial — Redis required lane complete, remaining live lanes planned |
| `QA-05` | [G/0/00](G/0/00.md) | complete |
| `QA-06` | [C/0/00](C/0/00.md) | complete |
| `QA-07` | [C/0/03](C/0/03.md) | planned |
| `QA-09` | [C/0/03](C/0/03.md) | partial — isolated CI supervision improved, application seams planned |
| `QA-08` | [C/0/02](C/0/02.md) | complete |
| `DP-01` (alias DATA-01) | [I/0/04](I/0/04.md) | planned |
| `DP-02` | [I/0/02](I/0/02.md) | planned |
| `DP-03` | [F/0/00](F/0/00.md) | planned |
| `DP-04` | [D/0/00](D/0/00.md) | complete — Trial 4 reviewed OK and integrated in Wave 2, promotion pending |
| `DP-05` | [I/0/04](I/0/04.md) | planned |
| `DP-06` | [D/0/03](D/0/03.md) | planned |
| `DP-07`, `DP-08` | [I/0/09](I/0/09.md) | planned |
| `DP-09` | [G/0/03](G/0/03.md) | planned |
| `DP-10`, `DP-11` | [I/0/09](I/0/09.md) | planned |
| `DP-12` | [I/0/05](I/0/05.md) | planned |
| `DP-13` | [I/0/00](I/0/00.md) | planned |
| `DP-14` | [I/0/02](I/0/02.md) | partial — MCP catalog complete, durable contract planned |
| `DP-15` | [I/0/09](I/0/09.md) | planned |
| `UX-H01` | [E/0/03](E/0/03.md) | planned |
| `UX-H02` | [C/0/01](C/0/01.md) | complete |
| `UX-H03` | [H/0/00](H/0/00.md) | planned |
| `UX-H04` | [C/1/02](C/1/02.md) | partial — reducer prerequisite in progress |
| `UX-H05` | [C/0/01](C/0/01.md) | complete |
| `UX-H06` | [E/0/00](E/0/00.md) | planned |
| `UX-H07` | [H/0/02](H/0/02.md) | planned |
| `UX-H08` | [E/0/05](E/0/05.md) | planned |
| `UX-M01` | [C/0/01](C/0/01.md) | complete |
| `UX-M02` | [H/0/00](H/0/00.md) | partial — descriptions exist, structured risk metadata planned |
| `UX-M03` | [I/0/06](I/0/06.md) | planned |
| `UX-M04` | [D/0/01](D/0/01.md) | planned |
| `UX-M05` | [E/0/03](E/0/03.md) | planned |
| `UX-M06` | [H/0/00](H/0/00.md) | planned |
| `UX-L01` | [H/0/00](H/0/00.md) | partial — candidate state fixed, unified product projection planned |
| `GOV-01`, `GOV-03`, `GOV-04`, `GOV-05` | [C/0/02](C/0/02.md) | complete |
| `GOV-02`, `GOV-06`, `GOV-07`, `GOV-08`, `GOV-10` | [I/0/04](I/0/04.md) | partial — candidate validator complete, final projection/release planned |
| `GOV-09` | [I/0/04](I/0/04.md) | planned — release may explicitly remain local-only |

## Prior-audit alias crosswalk

Aliases keep the independent reports immutable while preventing a second
acceptance owner. Prefixes in this table identify the 2026-07-25 independent
audit; bare canonical keys refer to the registry above.

| Prior source aliases | Canonical disposition |
|---|---|
| Product `P-01`…`P-15` | Respectively `PROD-C01`, `PROD-C02`, `PROD-H07`, `PROD-H01`, `PROD-H05`, `PROD-H04`, `PROD-H03`, `PROD-H06`, `PROD-H02`, `PROD-M01`, `PROD-M04`, `PROD-M02`, `PROD-M04`, `PROD-M03`, and the H/0/03 profile part of `PROD-M03` |
| Architecture `A-01`…`A-19` | Respectively `ARC-04`, `ARC-02`, `ARC-05`, `ARC-07`, `ARC-07`, G/0/02 (`OPS-09` family), `QA-04`, `OPS-07`, `ARC-08`, `ARC-09`, `ARC-05`, `ARC-10`, `ARC-10`, `DP-09`, `ARC-03`, `ARC-11`, `QA-06`/`DEP-01`, `CFG-SEC-01`, and `UX-M03` |
| Code `C-01`…`C-03`, `H-01`…`H-06`, `M-01`…`M-07`, `L-01` | `CODE-C01`…`CODE-C03`; `CODE-C04`, `CODE-H01`…`CODE-H05`; `CODE-M01`, `CODE-M02`, `QA-04`, `QA-06`, `CODE-M03`, `DP-13`, `CODE-M04`; and `CODE-L01` |
| Security `SEC-01`…`SEC-09` | `AUTH-01`, `EXEC-01`, `SHELL-01`, `POLICY-01`/`DP-03`, `ABUSE-01`, `COORD-SEC-01`, `DP-05`/`AUDIT-SEC-01`, `CFG-SEC-01`/`TEMP-SEC-01`, and `DEP-01` |
| Testing `TST-H01`…`TST-H03`, `TST-M01`…`TST-M04`, `TST-L01` | `QA-04`, `QA-05`, `QA-04`, `QA-06`, `QA-08`, `QA-07`, `QA-09`, and `QA-09` |
| Data/privacy 2026-07-25 `DP-01`…`DP-15` | Current `DP-01`…`DP-09`, then `DP-14`, `DP-10`, `DP-11`, `DP-12`, `DP-13`, and `DP-15` |
| UX 2026-07-25 `UX-H1`…`UX-H7`, `UX-M1`…`UX-M6`, `UX-L1` | Current zero-padded `UX-H01`…`UX-H07`, `UX-M01`…`UX-M06`, and `UX-L01` |
| June cross-cutting `CC1`…`CC5` | Contract truth (`C/0/01`, `H/0/00`), portable operation (`H/0/01`, `I/0/06–07`), authority/execution (`D`), release (`C/0/02`, `I/0/04`), and approval/recovery UX (`E`) |
| Existing plan aliases `TST-B01`, `TEST-01`, `V1-01`, `V1-02`, `PLAN-01`, `DATA-01`, `UX-01` | `QA-06`; `ARC-09`/`QA-04`; `ARC-07`/`UX-M03`; `GOV-01`/`GOV-08`; `DP-01`; and `UX-H06` |

## Historical audit reconciliation

| Historical conclusion | Current disposition |
|---|---|
| Missing license | resolved: `LICENSE` exists |
| No CI/lint | obsolete as written; CI/lint exist, while C/0/00 owns supported runtimes, manifest parity, skip discipline, and executable sentinels |
| Duplicate `_raise_on_tool_error` helper | resolved before this baseline; no new V5 sheet |
| V1 advertised inconsistently | still experimental; I/0/02 owns workflow truth, I/0/06 owns the worker shim, and I/0/08 owns both canonical ITRP and public MCP 0.1→0.2 cutovers |
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
3. Preserve reviewed `C_1_0_REBASELINE` CORE Trial 2, implement and review the
   D/0/07 persistent session-control prerequisite, and then close the
   serialized C/D splice before continuing C/1/01–03; the fifteen historical
   KOs remain evidence.
4. Preserve the reviewed `D_0_1_CORE` and H/0/00 provider-selection contract,
   then follow the acyclic `D_0_1_CORE -> D/0/07 -> D_0_1_SPLICE` order before
   completing D/0/02–06 or expanding real-agent,
   YOLO, cross-principal, or recursively configured execution.
5. Deliver operator recovery/readiness (E), provenance/review gates (F), and
   required coordination operability (G), parallelizing only independent
   scopes.
6. Productize the generic hero flow and protected second-operator proof (H).
7. Close durable data, real integration, the I/0/06 worker shim, the I/0/08
   MCP/ITRP cutovers, and exact release identity in I, pulling integrity work
   forward whenever an earlier feature depends on it.

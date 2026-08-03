# Project-wide audit — 2026-07-30

## Identification

| Field | Value |
|---|---|
| Scope | Entire repository and product, V0–V5 |
| Audited commit | `2986b09f02d2119a8d89b25e9696d9325b27b339` |
| Audited tree | `c4661b2c4c9e557abe17d321e482987f5b3ace32` |
| Promotion state | `main == develop == 2986b09` locally as of 2026-07-30 18:02 CEST |
| Release state | Not released: no tag contains the candidate, no Git remote is configured, and no publication/deployment evidence exists |
| Method | Static inspection, exact-worktree gates, advertised smokes, SCA, plan/review/ref reconciliation, and read-only runtime metadata inspection |
| Overall verdict | **D+ overall; C for local substrate/dry-run; F for treating real agents as untrusted subjects** |

The audit began while `2986b09` was a promotion candidate. During the audit an
independent Trial 4 verdict was committed on
`review/V5-functional-wave-2-promotion-4@66195ad`, and `main` and `develop`
were fast-forwarded to the audited commit. The product tree therefore did not
change under the audit. Promotion improved status alignment, but did not create
a release.

## Lens reports

| # | Lens | Grade | Report |
|---:|---|---:|---|
| 01 | Product and functionality | D+ | [01_PRODUCT_FUNCTIONAL.md](01_PRODUCT_FUNCTIONAL.md) |
| 02 | Architecture and infrastructure | D+ | [02_ARCHITECTURE_INFRASTRUCTURE.md](02_ARCHITECTURE_INFRASTRUCTURE.md) |
| 03 | Code quality | C− | [03_CODE_QUALITY.md](03_CODE_QUALITY.md) |
| 04 | Security and threat model | D / F real-agent | [04_SECURITY_THREAT_MODEL.md](04_SECURITY_THREAT_MODEL.md) |
| 05 | Operations and reliability | D | [05_OPERATIONS_RELIABILITY.md](05_OPERATIONS_RELIABILITY.md) |
| 06 | Testing and release confidence | D+ | [06_TESTING_RELEASE_CONFIDENCE.md](06_TESTING_RELEASE_CONFIDENCE.md) |
| 07 | Data and privacy | D+ | [07_DATA_PRIVACY.md](07_DATA_PRIVACY.md) |
| 08 | Operator UX | D | [08_UX_OPERATOR_EXPERIENCE.md](08_UX_OPERATOR_EXPERIENCE.md) |
| 09 | Governance and traceability | C− | [09_GOVERNANCE_PLANNING_TRACEABILITY.md](09_GOVERNANCE_PLANNING_TRACEABILITY.md) |
| 10 | Remediation coverage | — | [10_REMEDIATION_COVERAGE.md](10_REMEDIATION_COVERAGE.md) |

## Executive verdict

The project has materially improved since the 2026-07-26 audit. It now has a
closed MCP catalog, connection-scoped server-owned request authority, a strong
candidate verifier, strict suite manifests, a substantial asynchronous process
supervisor, persistent Redis clients, and real Redis race coverage. These are
valuable foundations, not paper designs.

The highest-value path is now composition, not more substrate. The safe
supervisor is not used by the production adapters; real sessions still use
blocking provider calls and shell-facing tmux text. Children share the host
UID, environment, filesystem, and control configuration. The live topology
also became worse: 60 Gateway processes used about 5.11 GiB RSS, with 58
holding the same external workspace database. A process-local RequestContext
then introduced a new integration failure: both advertised multi-step smoke
flows start a new Gateway for each tool call and fail at the first
`task.assign`.

The exact candidate gate is red. Two full executions each produced
**2,282 passed, 12 skipped, and 1 failed** out of 2,295 tests. Both failed the
same required process-supervisor cleanup test after an abrupt `SIGKILL`. The
same live lane passed 22/22 when rerun alone, which identifies a
context-dependent race rather than clearing the failure.

Consequently:

1. local promotion is real, but release readiness is not;
2. real-agent execution must not be represented as a trustworthy isolation
   boundary;
3. V5 remains the correct remediation program; creating a V6 would duplicate
   ownership;
4. the next milestone should prove one persistent, supported end-to-end path
   before expanding features.

## What is already implemented

V5 contains **82 executable sheets: 38 complete, 5 in progress, and 39
planned**. Therefore **44 V5 sheets remain open**.

| Capability | Built state at `2986b09` | Important limit |
|---|---|---|
| Coordination foundation | 25 delivered A sheets: schemas, leases, presence, discovery, send/receive/ACK, Redis fencing, dedupe, backpressure, seven MCP tools, audit and two-instance acceptance | Product consumer recovery, health, inventory, quotas and admission are not complete |
| Contract and profile | B/0/00–02 and B/0/05: validation, scope/health, self-renewing client and artifact-list parity | Two-orchestrator decision protocol and full acceptance remain planned |
| CI and release substrate | C/0/00–02: runtime matrix, canonical catalog/error contract, candidate/SBOM/SCA verifier | Full gate is currently red; exact final release identity is planned in I/0/04 |
| Request authority | D/0/00: server-owned principal, repository and lineage inside one MCP connection | Authority is not durable across reconnect/restart or the fixed 24-hour context expiry |
| Lifecycle core | C/1/00 core: reducer, repository, CAS/idempotency and migrations | Product splice, honest completion, recovery and cancellation remain open |
| Process/session substrate | D/0/01 core plus D/0/07a–b: async supervision primitives, capability issuer, codec, PTY identity and verified writes | Adapters still use legacy `spawnSync`/tmux; D/0/07c–d and the splice are open |
| Coordination operability | G/0/00–01 and much of G/0/02: required Redis lane, persistent clients, store/ACK/outbox/WIRING-A | WIRING-B, crash/reclaim health, inventory and exit gate remain open |
| Productization substrate | H/0/00 and parts of H/0/01: canonical provider/profile resolution, sample and doctor slices | Probes, portability, one-command flow and protected real-agent run remain open |

The 72 V4 sheets are not 72 additional implementations. Their current
absorption ledger is **1 absorbed, 5 partial, and 66 planned**: 71 V4 sheets
are nonterminal, but their remaining acceptance is intended to close through
the 44 open V5 owners. Two V4 index pages still incorrectly say 45 owners.

## Highest-priority findings

| ID | Severity | Finding | Current owner |
|---|---:|---|---|
| EXEC-01 | Critical | Real provider execution is not isolated; the safe supervisor is not wired and raw output remains an egress path | D/0/07c → D/0/07d → D/0/01, then D/0/02 |
| SHELL-01 | Critical | Spawn/ask still construct shell text and inject it through tmux without a durable foreground identity guarantee | D/0/07c–d and D/0/01 |
| OPS-01 | Critical | The control Gateway is inherited recursively and multiplied across children; no single writer owns a workspace | D/0/02, D/0/03, D/0/05 |
| ART-01 | Critical | Artifact kind/classification and parts of provenance are caller-selected; approval is not yet an effect-bound single-use grant | F/0/00 and E/0/01–02/05 |
| CTX-01 | High | Connection-local lineage breaks official smokes, reconnect/recovery, long workflows and per-activity Gateway clients | D/0/04, H/0/02, I/0/02 and I/0/06 |
| QA-NEW-01 | High | The exact full gate reproducibly fails cleanup under suite load while the isolated lane passes | C/0/03 plus the process-supervisor owner after triage |
| LIFE-01 | High | Public cancel is a dead end and completion does not prove terminal children/approvals | C/1/01–03 with D/0/01 |
| UX-01 | High | No inventory/recovery/approval queue lets an operator reconstruct or control work after losing opaque IDs | E/0/00–04 |
| DATA-01 | High | No cross-store retention, export, erase, backup/restore or durable lineage contract exists | I/0/00–05 and I/0/09 |
| GOV-01 | High | Coverage is nominal rather than executable in several rows; promoted status and review evidence are not reconciled in the promoted tree | Plan reconciliation, then I/0/04 |

## Runtime evidence

Read-only process and file-descriptor metadata showed:

- 60 Node processes executing `gateway/src/mcp_server.js`;
- approximately 5,359,848 KiB aggregate RSS (about 5.11 GiB);
- 58 Gateways configured for the same external KYA workspace and two for this
  repository;
- all 58 external-workspace processes holding the same SQLite database, WAL
  and SHM files;
- most Gateway parents were Codex or Claude children, with some parents
  owning four Gateways.

No prompts, artifacts, database records or personal data were read, and no
shared process was stopped. The audit-created disposable Redis containers were
removed after verification.

The comparable 2026-07-26 sample was 36 Gateways and about 3.16 GiB RSS. The
control-plane amplification finding therefore worsened.

## Verification evidence

| Check | Result |
|---|---|
| Candidate/tree identity | Verified |
| `main == develop == candidate` | Verified locally after the 18:02 fast-forward |
| Tag/remote/publication | Absent |
| Candidate verifier | Passed; one production advisory, zero waivers |
| Python lock, Python lint, Gateway lint | Passed |
| Structure | 410/410 passed |
| Gateway | 1,418 passed, 9 PostgreSQL skips |
| E2E | 25/25 passed |
| CLI | 342/342 passed |
| LangGraph | 81 passed, 3 integration/Temporal skips |
| Required Redis/live lane in full gate | 21 passed, 1 failed on both full runs |
| Same live lane in isolation | 22/22 passed |
| Advertised `smoke_mvp2.mjs` | Failed at `task.assign` with `REQUEST_CONTEXT_DENIED` |
| Advertised `smoke_planning.mjs` | Failed at `task.assign` with `REQUEST_CONTEXT_DENIED` |
| Production dependency audit | Two moderate findings through `@hono/node-server`; no high/critical |

The 12 skips are visible rather than relabelled as passing: nine PostgreSQL
contracts, two Gateway integration tests and one Temporal recovery test.
Real-provider agents remain an optional unavailable lane.

## Delta since 2026-07-26

| Area | Delta |
|---|---|
| MCP authority | Major improvement: AUTH-01 is built for a single connection |
| Catalog/policy | Unknown actions now fail closed; public contract is canonical |
| Process safety | Strong supervisor core exists, but no product cutover yet |
| Coordination | Major improvement in persistent Redis clients, fencing, ACK/outbox and live races |
| CI/release substrate | Major improvement in locks, manifests, SBOM/SCA and candidate identity |
| Dependencies | Improved from high findings to two moderate advisories |
| Runtime topology | Worse: 36 → 60 Gateways and 3.16 → 5.11 GiB RSS |
| Product flow | New regression: official multi-call smokes are broken by connection-local lineage |
| Release confidence | Local promotion achieved; full gate now reproducibly red and no release identity exists |
| Operator/data controls | Mostly unchanged and still open |

## Optimal value path

1. **Contain immediately without claiming closure.** Stop giving child
   sessions a recursively discoverable real Gateway, pin one candidate per
   workspace, and avoid new protected/real-agent claims. Do not terminate
   existing user sessions without an explicit operator decision.
2. **Repair the supported flow and release signal.** Reuse one authenticated
   MCP connection in both hero smokes, add them to the gate, and diagnose the
   supervisor cleanup failure until the complete gate is repeatably green.
3. **Complete the existing critical path.** Finish D/0/07c, D/0/07d and the
   D/0/01 splice so every provider adapter uses the reviewed supervisor.
4. **Make the boundary real.** Deliver D/0/02 isolation/mediated output,
   D/0/03 single writer, D/0/06 budgets and then D/0/05 non-recursion.
5. **Make lifecycle and decisions honest.** Close C/1/00–03, E/0/00–05 and
   F/0/00–04; cancellation, completion, approvals and review must be
   server-owned and evidence-bound.
6. **Prove product value.** Complete D/0/04 and H/0/02 before H/0/05. One
   persistent dry-run should be boring, observable and recoverable.
7. **Finish durability and release last.** Complete I/0/00–03/05–09, then use
   I/0/04 to prove `reviewed = candidate = main = tag = published` with a
   clean full-stack gate.

The detailed dependency and coverage analysis is in
[10_REMEDIATION_COVERAGE.md](10_REMEDIATION_COVERAGE.md).

## Exit criteria

The project can move above D+/F only when one exact candidate demonstrates all
of the following:

- one non-recursive, single-writer control plane;
- isolated real agents with mediated output and global budgets;
- persistent, recoverable authority and lifecycle;
- effect-bound approvals and digest-bound independent reviews;
- green official smokes and a repeatably green full gate with required live
  services;
- retention/export/erase and verified restore across every durable store;
- the same reviewed object on `main`, an annotated release tag and the
  published artifact/deployment.


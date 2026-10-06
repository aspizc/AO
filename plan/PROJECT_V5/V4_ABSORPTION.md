# Project V4 → V5 implementation absorption ledger

Status: owner-authorized execution; active reconciliation. M0/4/00 is absorbed;
M0/0/00, M0/3/00, M0/4/01, M0/4/02, and E/0/00 are partial.

Project V4 remains the audited 72-sheet program. Project V5 is the implementation
program for the overlapping product. Work is implemented once, then V4 may be
marked `absorbed` only when the referenced V5 behavior is committed, tested,
independently reviewed, and reachable from both `develop` and `main`.
Project V5 owns all remaining implementation in this map; no duplicate V4
feature branch or review trial is scheduled.

Current inventory: **1 absorbed, 5 partial, and 66 planned V4 sheets**. The 71
nonterminal V4 sheets close through 44 open V5 owners (5 in progress and
39 planned); they do not create 71 additional implementation branches.

## State rules

- `planned` — specifications exist; no shipped behavior is inferred.
- `partial` — a reviewed subincrement exists, but at least one acceptance gate
  or promotion remains open.
- `absorbed` — every mapped acceptance has implementation/test/review evidence
  and the exact commits are integrated; the V4 sheet records those immutable
  references.
- Stale/divergent feature or integration refs are reusable evidence only. They
  never close a rebased task without a current-base replay and review.
- A V4 row mapped to several V5 sheets closes only after all listed owners
  close. This is dependency traceability, not duplicate acceptance ownership.

## Current exceptions

| V4 work | Observed evidence | Current disposition |
|---|---|---|
| G-1 / G0 | owner authorization and aligned `main`/`develop@85f7ab9` recorded in V4 `PLAN_APPROVAL.md` | resolved; V5 implementation waves may proceed without duplicating V4 branches |
| M0/0/00, M0/3/00, M0/4/02 | C/0/02 technical commit `10113e62a911cdb9dbe3dbbe5c8ebea0264e6885`, Trial 4 OK review `97669790fcce876613a456a7af4fd99c734a519a`, and reviewed integration `2111f89a24d88e05fffe1a005a12e888857110a9`, contained by promoted `develop@c10bcf328da781dfb3869d3683f30aab327f3728` and `main@7039a0bf9e08cd1f0e380844791409e75f4fdbdb` | partial; C/0/02 is delivered, but mapped owner I/0/04 remains planned and owns final cross-store/release identity |
| M0/0/01 | implementation ref exists; submission is not integrated and has no final verdict | planned; consume through F/0/02–04 |
| M0/4/00 | C/0/00 final correction `f37fe7f7978d54164465b71a1e6f1f4eae65a1b6`, Trial 9 OK review `262c666bf3971ea05d59a90beeaaec9690753f2d`, and reviewed integration `55221a581ba53a34c85d073ec7d99157b6f1991d`, contained by promoted `develop@c10bcf328da781dfb3869d3683f30aab327f3728` and `main@7039a0bf9e08cd1f0e380844791409e75f4fdbdb` | absorbed/delivered; its sole V5 owner is complete and promoted |
| M0/4/01 | G/0/00 technical commit `63e48d7021fffe68db4ec9fa413ee5708bf9e304`, Trial 1 OK review `5058a59c45d91fcc84529d0d3c509bd34367bb2a`, and reviewed integration `77cb4189d268ba2577716787420704b0d1ac0acf`, promoted through `c10bcf328da781dfb3869d3683f30aab327f3728` and `7039a0bf9e08cd1f0e380844791409e75f4fdbdb` | partial; G/0/00 is delivered, but mapped owner B/0/04 remains planned |
| E/0/00 | C/0/00 runtime/lock evidence and C/0/02 dependency/SCA evidence are reviewed and promoted | partial; I/0/06 still owns installed V1 activation/worker portability |
| remaining V4 sheets | specification only | planned |

## Absorption map

| V4 source | V5 implementation owner(s) | Closure condition |
|---|---|---|
| M0/0/00, M0/3/00, M0/4/02 | C/0/02; I/0/04 | candidate/state/SCA gate and exact final release identity |
| M0/0/01 | F/0/02–04 | independent dual review, stale invalidation, and executable review gate |
| M0/4/00 | C/0/00 | complete runtime/manifests/suite/lane contract, not only Node |
| M0/4/01 | G/0/00; B/0/04 | required Redis races and two-orchestrator acceptance |
| A/0/00 | I/0/08 | one canonical production ITRP and reconciled ADRs |
| A/0/01 | H/0/00 | one generated profile/model/tool truth source |
| A/0/02 | D/0/05 | non-inheritable control plane and recursive Gateway prevention |
| B/0/00–03, B/1/00–01 | D/0/00–01 | server authority plus supervised execution |
| B/0/04 | D/0/02 | deterministic restricted projector; F/0/00–04 consume it for review |
| B/1/03, B/1/09 | C/1/00–03 | honest linked lifecycle, recovery, and completion |
| B/1/04–07, B/3/00–01 | D/0/02, D/0/05–06 | isolation, mediated egress, non-recursion, and budgets |
| B/1/08–09 | D/0/03 | single writer and crash reconciliation |
| B/2/00–02, C/0/00–02, E/1/04 | E/0/00–03 | operator inventory and effect-bound approvals |
| B/2/03, C/0/04 | E/0/05; D/0/02, D/0/05–06; E/0/02–03; H/0/05 | scoped/revocable YOLO grant, informed control, protected launch, and real proof |
| B/3/02–03 | I/0/04 | retention/export/erase and governed release |
| B/4/00 | I/0/08; prerequisites C/0/01, D/0/00 | flagged MCP 0.2 endpoint/schema, 0.1 initial default, and explicit pre-dispatch version mismatch; no new acceptance assigned to complete C/0/01 |
| B/4/01 | I/0/06; prerequisites/consumer D/0/05, I/0/08 | captured pending-history worker shim, single internal Gateway channel, non-recursion, and compatible drain |
| B/4/02 | I/0/08; prerequisites C/0/01, D/0/00, E/0/02, I/0/03, I/0/06 | complete consumer matrix, mixed-version deny, atomic 0.2 activation/0.1 retirement, and common server/client/DB rollback |
| B/5/00–01 | D/0/04 | persistent adversarial authority/egress Gateway E2E |
| B/5/02 | C/0/03; C/1/03; D/0/04; E/0/05 | exact coverage/mutation, lifecycle/control, persistent MCP, and YOLO grant matrix |
| C/0/03 | E/0/00; C/1/03 | zero-ID recovery and false-completion recovery E2E |
| D/0/00–D/1/03, B/1/02 | F/0/00–04 | authority/manifest/independent review/stale gate |
| E/0/00 | C/0/00; C/0/02; I/0/06 | runtime/lock/SCA evidence plus explicit installed V1 activation |
| E/0/01 | I/0/02; I/0/06 | truthful result envelopes and portable attributable worker |
| E/0/02 | I/0/08 | strict plan-refine parser plus canonical selector/cutover |
| E/1/00–07 | I/0/00–03, I/0/06 | durable operations, artifacts, workflow, restore, worker |
| E/1/03 and data lifecycle work | I/0/04 | cross-store retention, export, erase, and release evidence |
| E/2/00–03, E/3/00 | H/0/05; I/0/07–08 | protected provider proof, full stack, canonical cutover |
| M0/1/00–02 | H/0/00–03 | portable generic product and KYA as an ordinary profile |
| M0/2/00, M0/2/02 | H/0/00–02 | canonical profile, consumers, sample/doctor, and one-command hero flow |
| M0/2/01 | H/0/00; D/0/01 | registry-derived provider/model/reasoningEffort/serviceTier selection, exact Codex/Claude delegate/spawn argv, effective-value audit parity, and fail-before-child |
| E/2/02–03 | H/0/04–05 | outcome/recovery evidence and protected non-owner run |
| Data/audit acceptance not fully expressed in V4 | I/0/09 | catalog, subprocessors, lineage, tamper evidence, and data-quality controls |

## Reconciliation gate

For every V5 completion, update the affected V4 sheet in the same promotion
range with:

1. exact full implementation commit(s);
2. RED/GREEN and regression commands;
3. independent review artifact and verdict;
4. `develop`/`main` containment proof; and
5. `absorbed` only when every mapped owner is complete.

The [V5 coverage matrix](COVERAGE_MATRIX.md) remains authoritative for one
acceptance owner per audit finding. The [V4 audit trace](../PROJECT_V4/AUDIT.md)
remains authoritative for the source program and its 72-task rebaseline.

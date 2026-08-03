# Project V4 → V5 implementation absorption ledger

Status: owner-authorized execution; active reconciliation; no V4 task is
closed by this document.

Project V4 remains the audited 72-sheet program. Project V5 is the implementation
program for the overlapping product. Work is implemented once, then V4 may be
marked `absorbed` only when the referenced V5 behavior is committed, tested,
independently reviewed, and reachable from both `develop` and `main`.

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
| M0/0/00 | historical implementation/review and stale integration refs | planned; re-run candidate freeze on the active base |
| M0/0/01 | implementation ref exists; submission is not integrated and has no final verdict | planned; consume through F/0/02–04 |
| M0/4/00 | Complete C/0/00 runtime/manifest/suite contract; final correction `f37fe7f` approved by `262c666` and integrated into the V5 Wave candidate | partial; the V5 owner is complete, but `develop`/`main` promotion and the V4-sheet reconciliation evidence remain open |
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
| B/1/03, B/1/09, B/5/02 | C/1/00–03 | honest linked lifecycle, recovery, and completion |
| B/1/04–07, B/3/00–01 | D/0/02, D/0/05–06 | isolation, mediated egress, non-recursion, and budgets |
| B/1/08–09 | D/0/03 | single writer and crash reconciliation |
| B/2/00–02, C/0/00–02, E/1/04 | E/0/00–03 | operator inventory and effect-bound approvals |
| B/2/03, C/0/04 | E/0/02; D/0/05–06; H/0/05 | explicit YOLO grant, control isolation/budgets, protected real proof |
| B/3/02–03 | I/0/04 | retention/export/erase and governed release |
| B/4/00–02 | C/0/01; D/0/00 | generated public contract and server-derived request context |
| B/5/00–02 | D/0/04 | persistent adversarial Gateway/MCP E2E |
| C/0/03 | E/0/00; C/1/03 | zero-ID recovery and false-completion recovery E2E |
| D/0/00–D/1/03, B/0/04, B/1/02 | F/0/00–04 | authority/manifest/independent review/stale gate |
| E/0/00–01 | I/0/02, I/0/06 | truthful durable workflow and portable attributable worker |
| E/0/02 | I/0/08 | canonical selector/cutover and legacy retirement |
| E/1/00–07 | I/0/00–03, I/0/06 | durable operations, artifacts, workflow, restore, worker |
| E/1/03 and data lifecycle work | I/0/04 | cross-store retention, export, erase, and release evidence |
| E/2/00–03, E/3/00 | H/0/05; I/0/07–08 | protected provider proof, full stack, canonical cutover |
| M0/1/00–02 | H/0/00–03 | portable generic product and KYA as an ordinary profile |
| M0/2/00–02 | H/0/00–02 | canonical profile, sample/doctor, and one-command hero flow |
| E/2/02–03 | H/0/04–05 | outcome/recovery evidence and protected non-owner run |

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

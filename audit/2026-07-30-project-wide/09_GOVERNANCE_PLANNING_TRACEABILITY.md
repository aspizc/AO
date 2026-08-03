# Governance, planning and traceability audit

## Verdict

**Grade: C−.** Candidate identity, review trails and V5 status arithmetic are
much stronger. Governance still fails to keep promoted refs, in-tree verdicts,
release claims, acceptance evidence and semantic remediation ownership aligned.

## Canonical state at audit close

| State | Evidence |
|---|---|
| Audited/built candidate | `2986b09`, tree `c4661b2...` |
| Independent promotion review | Trial 4 `reviewed_OK` at `review/V5-functional-wave-2-promotion-4@66195ad` |
| Integrated/promoted locally | `main == develop == integration/V5-wave2-main-candidate-t4 == 2986b09` |
| Promotion time | 2026-07-30 18:02 CEST, fast-forward reflogs |
| Tagged | No tag contains `2986b09` |
| Published | No Git remote; no artifact/deployment publication evidence |
| Released | No |

The review verdict authorized local fast-forward only and explicitly excluded
release, tag, push, support and D/0/07c claims.

## Promotion evidence gap

The Trial 4 request/verdict files exist on the review branch, which is two
commits ahead of `main`. They are not present in the promoted `2986b09` tree.
The promoted plan/review index still says Trial 4 is pending, and several stage
descriptions still say promotion pending.

Therefore:

- the ref movement is verifiable;
- the independent verdict is verifiable;
- the promoted tree is not self-describing with respect to that verdict;
- no release may infer status from the stale in-tree wording.

This should be reconciled append-only on a new reviewed documentation
candidate. Do not rewrite the verdict or retroactively alter the promoted
commit.

## V5 status

The primary V5 ledgers at `2986b09` agree:

| Status | Count |
|---|---:|
| Complete | 38 |
| In progress | 5 |
| Planned | 39 |
| Total | 82 |
| Open (`in progress + planned`) | 44 |

Open sheets by stage:

| Stage | Open | Main scope |
|---|---:|---|
| B | 2 | Decision-artifact protocol and two-orchestrator acceptance |
| C | 5 | Fitness plus lifecycle splice/overview/completion/recovery |
| D | 8 | Safe execution, isolation, writer, non-recursion, budgets and adversarial gate |
| E | 6 | Inventory, approvals, health and governed YOLO |
| F | 5 | Artifact/review evidence |
| G | 3 | Consumer recovery, retention/caps/admission |
| H | 5 | Productization and protected hero flows |
| I | 10 | Durability, backends, cutover, governance and release |
| **Total** | **44** | |

## V4 absorption

V4 has 72 physical sheets:

- 1 absorbed/delivered;
- 5 partial;
- 66 planned;
- 71 nonterminal.

Those 71 are not separate work items; they close through the 44 V5 owners in
`V4_ABSORPTION.md`.

Residual drift remains:

- `plan/PROJECT_V4/SHEETS.md:13-15` says 45 open V5 owners;
- `plan/PROJECT_V4/README.md:33-35` says 45;
- the current V5 ledger and absorption file correctly say 44.

## Coverage-matrix quality

`plan/PROJECT_V5/COVERAGE_MATRIX.md` is syntactically complete: every source
finding has a link, producing its reported zero missing rows. It is not
semantically complete because a link is not always an executable open owner.

Examples:

- completed H/0/00 remains the owner for planned/partial UX acceptance;
- D/0/00 is used to mark broad AUTH/product findings complete although it
  closes only connection-scoped MCP authority;
- C/0/01 is credited for legacy envelope cutover that belongs to I/0/08;
- one row uses “complete planning disposition,” which conflicts with the
  project's own definition of complete behavior.

The matrix also retains an older baseline reference. Its `15 complete / 37
partial / 69 planned / 0 missing` arithmetic should not be treated as current
implementation status until every row is reclassified against individual
sheets and residual acceptance has an open owner.

## Acceptance evidence drift

The MVP2 acceptance checklist says the smoke must pass and remains marked as
validated, while both official smokes fail on the promoted commit. Associated
structure tests inspect tokens in scripts/docs rather than run the flow.

This is a High governance defect: accepted historical evidence is stale with
respect to the exact candidate. I/0/04 must execute candidate-bound acceptance,
not inherit a checkbox.

## Release claims

README says “Current release: v0.1.0,” but:

- no `v0.1.0` tag exists;
- no tag contains the candidate;
- no remote is configured;
- no published package/deployment evidence exists;
- the exact full gate is red.

The correct status is **locally promoted development candidate, not released**.
Package version `0.1.0` is metadata, not release proof.

## Governance findings

| ID | Severity | Finding | Correction |
|---|---:|---|---|
| GOV-01 | High | Trial 4 verdict is outside the promoted tree; promoted docs still say pending | Append-only reviewed reconciliation |
| GOV-02 | High | Official acceptance evidence is green while exact smokes are red | Candidate-bound executable acceptance |
| GOV-03 | High | README claims a release unsupported by tag/publication/gate | Remove/qualify claim until I/0/04 |
| GOV-04 | High | Coverage links to completed sheets with residual work | Reassign residual acceptance to open sheets |
| GOV-05 | Medium | V4 indices say 45 open V5 owners instead of 44 | Reconcile both derived views |
| GOV-06 | Medium | Coverage matrix baseline and status language are stale | Regenerate from individual-sheet truth |
| GOV-07 | Medium | Verbose/noncanonical sheet statuses hinder mechanical census | Normalize derived status vocabulary |

## Governance strengths

- Planned, implemented, reviewed, integrated, promoted and released are
  explicitly distinct concepts.
- Review trials are append-only and preserve KO evidence.
- The candidate verifier binds commit/tree, locks, suites, SBOM and advisories.
- V5 primary status arithmetic is currently coherent.
- Trial 4 review scoped its authority narrowly and did not overclaim release
  or D/0/07c completion.

## Required controls

1. Treat individual sheet status plus immutable verdicts as source data;
   generate indices/matrices from them.
2. Require every residual finding to have one open executable owner and exit
   gate.
3. Reconcile review verdicts into a later reviewed tree without rewriting
   history.
4. Make official acceptance executable against the exact candidate.
5. Block release unless candidate, independent verdict, `main`, tag and
   published artifact resolve to the same object and required gates are green.
6. Preserve unavailable/failed lanes as such; an accepted local-promotion skip
   budget cannot become release evidence.


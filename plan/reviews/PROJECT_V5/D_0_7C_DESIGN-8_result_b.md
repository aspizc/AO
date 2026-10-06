# Project V5 D/0/07c Design Trial 8 — reviewer B result

reviewed_OK

## Review boundary and outcome

I reviewed the design at `a3d6658` in the review worktree at `f4c7715`,
using the operator-signoff lens required for this independent reviewer-B
trial. I read the required-operator-decisions section as a decision package,
exercised a line-by-line operator choice, and then checked that choice against
the binding rules, complete post-`ACCEPT` inventory, aggregate disclosure,
trigger-class table, and independent-ratification dependency matrix. I also
read the complete Trial 7 reviewer-B result.

The package is now accurate and actionable. It identifies which losses are
baseline consequences of the selected rules, which correct workloads can
produce, which require component/recovery failure, and which require an
external actor or violation of desired behavior. It also permits an operator
to approve one parent amendment and decline another without implying that a
partially covered D/0/07c path may run.

I found no operator-decision blocker, no misleading trigger class, no missing
composed outcome, and no partial-ratification safety gap.

This `reviewed_OK` closes only the design-review gate. It is an
implementation-only authorization within the design's existing operator-
ratification precondition; it does not itself ratify any amendment and makes
no integration, promotion, release, D/0/07d, or splice claim.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | No authority or safety-direction defect found. Unapproved workload paths remain closed, and cleanup still preserves rather than acts on an unresolved replacement. |
| P1 | 0 | The trigger classes and independent-decision matrix make the combined contract sufficient for an operator to decide and act. |
| P2 | 0 | No separate advisory finding. |

## Exercised operator decision

For this exercise, I accept retained-object authority narrowings whose exact
effect and loss I can bound, but I decline a custom shared-default runtime,
indefinite process survival, and cleanup residue that is expected on every
ordinary accepted generation. On that stated basis, my decision is:

| Decision | Choice | Reason and effect of the choice |
|---|---|---|
| **1B — retained-socket/read-range authority** | **APPROVE** | I accept possession of the original connected-socket object, the handshake/proof history, live `G`, and exact per-effect counts as the relay authority boundary. I knowingly give up effect-time relay/current-holder and tmux-binding continuity, including accepting use by a delegated holder during unobserved drift. This approval records only that amendment; by itself it supplies no separately shippable D/0/07c leaf. |
| **2A — maintained custom shared-server tmux** | **DECLINE** | I would not impose a maintained Linux/Darwin custom binary and protocol as the user's default shared tmux, with its migration, availability, and unrelated-session blast radius. The concrete cost of declining is no `READY(G)`, no field-exact positive capture, and no proposed retained-connection authority for exact owned pane/session cleanup. |
| **3B — bounded process preservation** | **DECLINE** | I would not amend the contract to permit escaped descendants or a non-cooperative relay to survive, nor permit the direct root/original group to survive after anchor loss, while retaining credentials, resources, descriptors, side effects, and spawn capability. The frozen complete process/tree-retirement criterion therefore remains unsatisfied for this topology. |
| **4C — namespace preservation** | **DECLINE** | The trigger table shows that the owned relay-socket entry and runtime directory are expected to remain in a conforming ordinary run, not merely after a rare failure. I would not accept that baseline secret/name/inode/disk residue or the resulting basename-reuse obstruction. The frozen leak-free namespace criterion remains unsatisfied for this topology. |
| **5B — read-time retained-PTY authority** | **APPROVE** | I accept the original retained PTY objects, historical binding, retained sideband, live `G`, and exact read/write counts as the effect boundary, including the disclosed loss of production-time provenance and live foreground/geometry/producer continuity. This has independent meaning for the separately gated D/0/07b write leaf. It does not approve Decisions 1–4 or authorize D/0/07c. |

This mixed decision is expressible directly from the document. It leaves
D/0/07c at **HARD FAIL**: Decisions 2, 3, and 4 remain unresolved, so no
D/0/07c implementation trial or positive path is authorized. Approval of 5B
can matter only for the path it actually covers—D/0/07b, subject to that
leaf's own gates. This exercised choice tests the package's usability; the
review verdict does not enact it for the real operator.

## Trigger-class usability ruling

The trigger classes are usable categorical decision evidence. They do not
pretend to be probabilities, and the table distinguishes rule-determined
frequency from presently unmeasured incidence.

- The row labelled **Expected in a conforming ordinary run** for the owned
  relay-socket entry and runtime directory is accurate. D/0/07c creates both,
  Decision 4 authorizes neither post-`ACCEPT` unlink nor directory removal,
  and, absent external removal, cleanup reaches `REVOKED` and settlement with
  both `PRESERVED`.
- The key row correctly separates ordinary pre-`ACCEPT` key retirement from
  a residual key, replacement, or unexpected child that needs failure or
  external/violating behavior.
- Pre-activation or mixed-producer/time PTY ranges, ordinary job-control
  changes, and outside-group descendants are correctly classified as
  ordinary-workload-dependent: conforming operation can produce their
  triggers, but the design has no basis to claim they occur in every run.
- Delegated relay-endpoint use is correctly tied to adversarial or
  desired-behavior-violating conduct. Relay survival, owned tmux-object
  preservation, and loss of the direct-child anchor are correctly separated
  into component/recovery-failure paths.
- The simultaneous-residue row correctly calls the socket/directory pair a
  baseline and the maximum combined residue a mixed conjunction. It does not
  imply that helper death, connection loss, endpoint delegation, and escaped
  descendants are ordinary in every generation.

No row labelled expected-in-an-ordinary-run softens a contingent cost, and no
contingent row disguises the baseline socket/directory residue. The explicit
“unmeasured” frequency statements are sufficient at this design stage:
unknown empirical incidence remains something an operator can decline, not a
false assurance of rarity.

## Separability and safety-direction ruling

Separability is now actionable.

| Decision | Independent meaning | Decline keeps these paths closed |
|---|---|---|
| 1B | Accepts only the retained-socket/read-range parent authority boundary. | Readiness, claim/port, relay transfer, barrier traffic, and positive D/0/07c snapshot remain unavailable. |
| 2A | Accepts only the named custom-tmux deployment, atomic capture, and owned pane/session boundary. | Readiness, field-exact positive capture, and the proposed exact owned-object cleanup mechanism remain unavailable. |
| 3B | Resolves only the process-retirement contract conflict for this topology. | The complete process/tree-retirement acceptance criterion remains unsatisfied. |
| 4C | Resolves only the namespace-retirement contract conflict for this topology. | The no-key/socket/runtime-directory-leak criterion remains unsatisfied. |
| 5B | Resolves the retained-PTY authority conflict and has a separately named D/0/07b effect. | Retained-PTY read/write, readiness, positive D/0/07c transactions, and positive D/0/07b writes remain unavailable. |

The safety direction remains intact:

- Decisions 1, 2, and 5 are all prerequisites for `READY(G)`, so an
  unratified authority amendment cannot quietly yield a claim, port,
  observation, PTY/relay byte path, barrier, or capture.
- Decisions 3 and 4 amend distinct frozen cleanup acceptance criteria.
  Declining either leaves the complete topology nonconforming rather than
  authorizing a weaker cleanup silently.
- Ratifying one line records only that line. The text says that partial
  approval authorizes no D/0/07c implementation, and every declined line has
  a concrete HARD-FAIL consequence.
- The only independently identified positive-leaf effect is 5B for D/0/07b,
  which is within the amendment's own PTY authority scope and remains subject
  to D/0/07b's gates. No partial decision authorizes a path it does not cover.
- Cleanup still signals the original group only while current direct-child
  ownership and the unreaped-leader anchor hold. Anchor loss, missing retained
  authority, and replacement identity all select `PRESERVED`, never a numeric
  or pathname fallback.

Thus “all five are needed before this proposed D/0/07c topology can run” is
correctly presented as an implementation dependency, not as an indivisible
contract ballot.

## Aggregate completeness check

The combined disclosure remains accurate and is now complete with respect to
operational reachability:

- delegated relay endpoint participation composes with retained-PTY
  producer/time/foreground/geometry loss;
- an exact current-pane capture can contain that provenance-loss content
  without the capture operation itself being defective;
- the anchor-held cleanup branch can combine outside-group descendants and a
  non-cooperative relay with owned pane/session and namespace residue;
- the anchor-lost branch can add the direct utility root/original group to
  that same simultaneous residual set; and
- terminal `PRESERVED` entries remain compatible with `REVOKED` and ordinary
  exactly-once completion while names, material, resource use, and side
  effects remain.

Each constituent trigger has a class in the reachability table. The final
simultaneous-residue row preserves the distinction between the expected
socket/directory baseline and the workload-, failure/recovery-, and
adversarial legs of the larger conjunction. No class reduces a guaranteed
loss to a mere possibility, and no class asserts empirical rarity.

## Ready-for-ratification statement

I would sign it.

The document is ready for operator ratification.

## What I did and did not verify

Verified:

- the complete binding design at `a3d6658` and the complete Trial 7
  reviewer-B result;
- the required-operator-decisions section as a standalone operator decision
  package, including an actual mixed approval/decline exercise;
- all trigger-class rows against their concrete selected-rule triggers and
  the aggregate disclosure;
- the independent meaning and concrete decline cost of every decision;
- that unratified workload-authority paths remain HARD FAIL and that partial
  approval cannot authorize a D/0/07c implementation path;
- the aggregate anchor-held and anchor-lost cleanup outcomes against R3/R4
  and the complete post-`ACCEPT` inventory; and
- the scope statements that add no implementation, public port surface,
  D/0/07d gate, or adapter/service/catalog splice.

Not verified:

- I did not change or exercise source, tests, design text, plan sheets,
  implementation, tmux, sockets, processes, locks, or kernel behavior;
- I did not run full CI, a standalone probe, a live provider call, an
  implementation gate, or Darwin execution;
- no custom-tmux implementation, packaging, migration, incidence data, or
  production behavior exists here to certify;
- I did not assess integration, promotion, release, D/0/07d, or any
  adapter/service/catalog splice; and
- I did not seek, open, or use reviewer A's concurrent Trial 8 verdict.

No check was interrupted by the provider content filter. The pre-existing
untracked `gateway/node_modules` directory was not touched.

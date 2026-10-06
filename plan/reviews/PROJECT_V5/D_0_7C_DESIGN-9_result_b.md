# Project V5 D/0/07c Design Trial 9 — reviewer B result

reviewed_OK

## Review boundary and outcome

I reviewed the complete binding design at `95185e0` in the review worktree at
request commit `a259ab1`, using the operator-signoff lens required for this
independent reviewer-B trial. I read both complete Trial 8 results and
re-exercised the ratification decision with the two newly classified
Decision 1 outcomes.

The two rows complete the operator picture. They separately expose traffic
through the original endpoint:

- after the original holder's own live relay facets drift; and
- while the historical tmux server/session/pane binding has drifted.

Their trigger classes, correct-operation statements, unmeasured-frequency
status, and diagnostic limits are credible to a signer. I found no remaining
accepted loss without an operational class and no blocker to a correct
operator decision.

This `reviewed_OK` authorizes implementation only, subject to the design's
existing operator-ratification and all-five implementation preconditions. It
does not ratify an amendment, choose for the operator, or authorize
integration, promotion, release, D/0/07d, or an adapter/service/catalog
splice.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | No authority or safety-direction defect found. |
| P1 | 0 | Both previously omitted Decision 1 drift paths now have credible, independently usable trigger classifications. |
| P2 | 0 | No separate advisory finding. |

## Re-exercised operator decision

For this exercise, I continue to accept narrowly bounded retained-object
authority, but I decline the custom shared-default runtime and the two
amendments that permit indefinite cleanup residue. My decision remains:

| Decision | Choice | Re-exercised reason and consequence |
|---|---|---|
| **1B — retained-socket/read-range authority** | **APPROVE** | I accept the original connected socket, handshake/proof history, historical tmux IDs, live `G`, and exact per-effect counts as the transfer boundary. I now expressly include same-holder live-facet drift and traffic during tmux server/session/pane drift—not only descriptor delegation—in that acceptance. A planned or unplanned tmux server restart can create the latter state before diagnostics revoke it. This approval alone authorizes no D/0/07c path. |
| **2A — maintained custom shared-server tmux** | **DECLINE** | I would not impose a maintained Linux/Darwin custom tmux binary and protocol as the user's default shared runtime, with its migration, availability, and unrelated-session operational cost. Declining leaves no `READY(G)`, field-exact positive capture, or proposed exact owned pane/session cleanup authority. |
| **3B — bounded process preservation** | **DECLINE** | I would not accept escaped descendants or a non-cooperative relay surviving, nor direct-root/original-group survival after anchor loss, with continuing resources, credentials, descriptors, side effects, and spawning. The frozen complete process/tree-retirement criterion remains unsatisfied. |
| **4C — namespace preservation** | **DECLINE** | I would not accept the rule-determined relay-socket and runtime-directory residue, possible secret/name/inode/disk residue, or blocked safe basename reuse. The frozen leak-free namespace criterion remains unsatisfied. |
| **5B — read-time retained-PTY authority** | **APPROVE** | I accept retained PTY-object identity, historical binding, retained sideband, live `G`, and exact read/write counts as the effect boundary, including the disclosed production-time, producer, foreground, geometry, and mixed-range losses. This has independent meaning only for the separately gated D/0/07b write leaf and does not authorize D/0/07c. |

The added rows do not change those choices. The underlying live-relay and
tmux-continuity losses were already stated in Decision 1 and were part of my
Trial 8 approval; what was missing was their separate operational
classification. The new information makes clear that holder continuity is
not the only path and, in particular, that ordinary good-faith tmux lifecycle
work such as a server restart can trigger binding drift. That makes the
operational cost of 1B more concrete, but it remains within the retained-
socket authority boundary I am willing to approve for this exercise.

This mixed exercise leaves D/0/07c at **HARD FAIL** because Decisions 2, 3,
and 4 are declined. It is an exercise of the document's usability, not an
operator ratification.

## Trigger-class credibility

### Same-holder relay-facet drift

The **adversarial/desired-behavior violation** class is credible. The row
expressly keeps the endpoint and holder unchanged. Correct intended relay
operation keeps the accepted start/executable/argv/cwd/pgid/sid facets
stable; changing one requires action outside that intended behavior or an
external mutation. The class definition is not limited to a malicious
attacker: it also covers violation of the unenforceable desired behavior.
The row therefore does not disguise a correct ordinary relay-loop event as
an attack.

The row also states the material limitation accurately: controlled mutation
or correlated diagnostics can expose drift, but the stream effect itself
carries no live-facet evidence and separate observations cannot prove or
exclude the exact race.

### Same-endpoint tmux-binding drift

The **component/recovery failure or adversarial/desired-behavior violation**
class is credible. A good-faith operator can produce this state without an
attacker or a software bug by restarting the ordinary shared tmux server or
performing a session/pane lifecycle action while the generation is active.
The row names server restart/replacement, session/pane removal/recreation,
and external lifecycle action directly.

A routine restart still entails component loss/outage and recovery, so it
fits the document's defined component/recovery class; it is not presented as
an attack-only path. The row likewise makes clear that healthy uninterrupted
port/tmux operation preserves the binding. Its unmeasured frequency is
honest and does not imply rarity.

Retained-server diagnostics or a later atomic-capture mismatch can expose
the changed binding, but neither retroactively identifies earlier
stream/barrier effects. That evidence boundary is accurately stated.

## Completeness sweep

Decision 1 gives up three distinct effect-time continuities, and each now has
its own class:

| Accepted Decision 1 loss | Operational row |
|---|---|
| Original holder's live start/executable/argv/cwd/pgid/sid continuity | Same-holder relay-facet drift |
| Accepted tmux server/session/pane continuity while the original endpoint remains | Same-endpoint tmux-binding drift |
| Current descriptor-holder continuity | Delegated/inherited/forked/replacement holder |

The new rows cover traffic on the socket generally, so they apply to the
accepted receive, send, and barrier effects rather than only one direction.
Together with the settled PTY/provenance, capture composition, process
survivor, owned-tmux, namespace, and simultaneous-residue rows, the table now
classifies the whole disclosed loss set. I found no further accepted loss
without a trigger class, correct-operation statement, frequency status, or
exposing-evidence statement.

## What I did and did not verify

Verified:

- the complete review brief, complete candidate design, and both complete
  Trial 8 results;
- the two new rows against Decision 1, the combined disclosure, the class
  definitions, the complete post-`ACCEPT` inventory, and the isolated
  Decision 1 proof obligation;
- an actual mixed approval/decline exercise, including the effect of a
  routine tmux server restart on the Decision 1 choice;
- the remaining operational table for an unclassified accepted loss;
- that the candidate design change is exactly two inserted rows in one
  design file and that the request commit adds only the Trial 9 review
  request;
- `git diff --check` for both the design candidate range and request range;
  and
- that the pre-existing untracked `gateway/node_modules` directory was not
  touched.

Not verified:

- I did not change or exercise source, tests, design text, plan sheets,
  implementation, tmux, sockets, processes, locks, or kernel behavior;
- I did not run full CI, a runtime gate, a standalone probe, a live provider
  call, or Darwin execution;
- I did not assess implementation conformance or certify any future custom
  tmux implementation, protocol, packaging, migration, or production
  incidence;
- I did not assess integration, promotion, release, D/0/07d, or an
  adapter/service/catalog splice; and
- I did not seek, open, or use reviewer A's concurrent Trial 9 verdict.

No check was interrupted by the provider content filter.

## Ready-for-ratification statement

I would sign it.

The document is ready for operator ratification.

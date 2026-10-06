# Project V5 D/0/07c Design Trial 7 — reviewer B result

reviewed_KO

## Review boundary and outcome

I reviewed design candidate
`8411bd5b607d2a98cfe09bc2be0d4d405f2adf5d` against the adjudicated
Trial 6 base
`6188f6d6ac48ac72dc588ac08af741f1b07f58db`, with the review worktree
at `41a4ed8`.

I first read only the required-operator-decisions section and restated the
package without relying on its closure claim. I then compared that reading
with the operative binding rules, complete site inventory, the required
Trial 6 reviewer-B result, and the relevant frozen D/0/07, D/0/07b, and
D/0/07c requirements.

The new combined-effect subsection is factually consistent with the
operative rules. It closes the Trial 6 aggregate-description gap: it now
says that delegated relay authority and narrowed PTY provenance can compose
into a field-exact capture, and that process, owned-tmux, and namespace
residuals can coexist while ordinary completion settles.

It is still not sufficient for an operator to decide whether to ratify the
package. It presents materially different reachability classes as an
undifferentiated list of things that “may” happen, even though at least the
relay-socket and runtime-directory residue is the ordinary consequence of
the selected cleanup rule, while other outcomes require workload behavior,
component failure, recovery, or a violated desired behavior. It also proves
that all five decisions are necessary before the complete D/0/07c leaf can
leave HARD FAIL, but does not prove that the five permanent parent amendments
must be ratified atomically. Decision 5 is expressly useful independently
for D/0/07b writes.

Those are two P1 operator-decision defects. I found no P0 authority defect,
no additional undisclosed composed state, and no amendment that surrenders
more authority than the stated impossibility requires.

This KO authorizes no implementation, integration, promotion, release,
D/0/07d gate, adapter/service/catalog splice, or operator ratification.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | The added disclosure changes no authority. The retained-object, generation-ordering, exact-capture, bounded original-group signal, and preservation rules remain internally safe. |
| P1 | 2 | The section does not distinguish routine, workload-dependent, failure/recovery, and adversarial reachability; and it conflates “all five are needed to implement this leaf” with “all five amendments must be ratified as one indivisible decision.” |
| P2 | 0 | No separate advisory finding. |

## What the operator is approving and giving up

In plain language, I read the five decisions as follows:

| Decision | What I would approve | What I would give up |
|---|---|---|
| 1B — relay transfer | Treat the original connected socket, handshake/proof history, and live `G` as sufficient authority for each exact relay read, send, and barrier step. | I would stop requiring the accepted relay process, current descriptor holder, or accepted tmux binding to remain current at effect time. A forked, inherited, delegated, or replacement holder of the peer endpoint can receive provider output, inject input, and acknowledge barriers during unobserved drift. |
| 2A — custom tmux | Replace stock capture authority with a maintained Linux/Darwin custom tmux, deployed as the user's compatible default shared server, whose retained command atomically compares current pane fields and returns capture bytes. It may retire only the port-owned pane/session. | I would accept the build, packaging, migration, protocol, availability, and shared-server blast radius. The shared server/socket and unrelated sessions are never port-cleaned, and retained-connection loss can leave the port-owned pane/session `PRESERVED`. |
| 3B — process retirement | Force-retire the direct utility root/original group only while the original helper still owns its live-or-unreaped leader, signal before reap, and never re-resolve a numeric process target. | Escaped descendants and a non-cooperative relay may survive with the anchor held. Helper/reaper death, adoption, premature reap, or restarted cleanup can remove the anchor and let the direct root/original group survive too. Survivors may retain resources, credentials, and descriptors, continue side effects, and spawn more work after rejection. |
| 4C — namespace retirement | Close retained descriptors after revocation but never perform post-`ACCEPT` pathname `unlink` or `rmdir`; preserve every extant owned or replacement key/socket/directory entry. | I would abandon leak-free namespace cleanup. Secret material, socket names/inodes, directories/children, and disk use can remain and can prevent safe basename reuse. |
| 5B — PTY authority | Treat the retained PTY objects plus historical binding evidence and live `G` as sufficient for each exact retained-master read/write attempt. Assign an entire read result to `G` at read time. | I would abandon production-time provenance and effect-time continuity of the utility, helper/reaper/supervisor, foreground, geometry, producer, and other terminal/tmux facets beyond retained-object identity. Pre-acceptance or pre-activation output, mixed writers/times, and output from any slave holder can pass; input can reach a changed foreground job or geometry. |

Together, I would be approving a system in which an unintended holder of the
relay endpoint can participate in input, output, drain, and barrier traffic
for PTY effects whose producer, time, foreground, or geometry is no longer
proved. A later custom-tmux capture can be perfectly exact for the current
pane and still contain those effects. After revocation, completion can settle
while surviving processes, a port-owned pane/session, namespace entries,
secret material, disk use, resource consumption, and continuing side effects
remain.

That reading matches R1/R2 (`design:192-323`), the destructive-capability
rules (`design:325-426`), sticky cleanup and settlement
(`design:428-459`), and the complete site inventory
(`design:461-490`). I found no factual mismatch between that reading and
what the operative rules permit.

## Findings

### P1-1 — the combined picture gives possibility, not operational reachability

The new subsection accurately enumerates composed outcomes
(`design:521-558`), but does not tell the operator which are expected in a
conforming ordinary run, which depend on ordinary workload behavior, which
require a component or recovery failure, and which require adversarial or
contract-violating behavior. Those distinctions materially change whether
an operator should accept the package.

The namespace outcome is the clearest example. D/0/07c creates a private
runtime directory and relay socket (`07c:25-28`). Under Decision 4, cleanup
closes descriptors but never unlinks the relay socket and never removes the
runtime directory (`design:418-420,487-489,518`). Absent an external actor
removing them, the owned relay-socket entry and runtime directory therefore
remain after an ordinary accepted generation. The key is different: normal
single-use consumption can remove it before `ACCEPT`. The table and aggregate
subsection collapse these materially different cases into residual entries
that “may remain” or “may simultaneously” occur (`design:518,544-558`).
An operator reading only this section is not told that part of the disclosed
residue is the selected baseline cleanup behavior rather than an exceptional
cleanup failure.

The other outcomes also have different trigger classes:

- Decision 5 deliberately accepts pre-`ACCEPT`/pre-activation buffering and
  mixed-producer ranges whenever they are present; the future proof
  obligations require those selected semantics to succeed
  (`design:586-589`). The section does not say whether startup output,
  normal child processes, or ordinary job-control changes make these common
  in the intended workload.
- Outside-group descendants depend on what the provider workload launches,
  while the separately launched relay is always outside the utility tree but
  survives only when descriptor close does not produce cooperative exit
  (`design:372-388`).
- Owned pane/session preservation requires retained custom-server connection
  loss; the broader Decision 2 cost also names defect, skew, and outage
  (`design:516`).
- Direct-root/original-group preservation requires helper/reaper death,
  adoption, premature reap, or restarted cleanup
  (`design:517,544-554`).
- A delegated or replacement relay endpoint holder requires the desired
  no-fork/no-daemonize/no-handoff behavior to be violated or defeated; the
  design intentionally cannot enforce it (`design:254-262,515`).

The operator can see that each outcome is possible, but cannot weigh the
package because the section gives no categorical incidence statement, no
known/unknown frequency, and no statement of which outcomes arise on the
normal happy path. Numerical probabilities are not required where no
implementation data exists. The minimum decision-ready correction is a
reachability table adjacent to the combined-effect subsection that, for each
loss, states:

1. whether it is baseline/expected, ordinary-workload-dependent,
   fault/recovery-dependent, or adversarial/desired-behavior-violation;
2. the concrete trigger and whether correct intended operation can produce
   it;
3. whether frequency is known or presently unmeasured; and
4. what evidence would expose it to an operator.

It must explicitly identify the normal relay-socket/runtime-directory
residue rather than presenting all residuals as equally contingent.

### P1-2 — full-leaf necessity does not prove an indivisible ratification gate

The section says ratification means approving every line and that declining
any line authorizes no implementation (`design:504-511`). Its dependency
paragraph does establish that all five are required before the complete
D/0/07c leaf can leave HARD FAIL:

- Decisions 1, 2, and 5 are prerequisites for `READY(G)` and the positive
  relay/snapshot path;
- Decision 5 is also required for positive D/0/07b writes;
- Decisions 3 and 4 amend two separate frozen leak-free acceptance
  requirements; and
- Decision 2 separately supplies exact owned pane/session cleanup
  (`design:563-571`).

That proves an all-five implementation precondition. It does not prove an
all-five amendment-ratification precondition.

The document itself demonstrates at least one separable decision: Decision 5
is independently required for D/0/07b writes (`design:566-567,717-725`), and
D/0/07b is a separately scoped positive leaf whose broker seam is consumed
by D/0/07c (`07b:52-65,72-97`; `07c:5-8`). An operator could rationally
approve the retained-PTY amendment for that leaf while declining the custom
default-tmux deployment in Decision 2. D/0/07c would correctly remain HARD
FAIL, but the Decision 5 parent amendment would still have an independent
meaning.

Likewise, Decisions 3 and 4 amend distinct process-retirement and namespace-
retirement guarantees. Approving one does not make the other's unavailable
facility appear, and declining one need not logically rescind an amendment
already accepted for the other. It merely leaves this proposed D/0/07c
topology unable to satisfy the full parent contract.

The operator therefore lacks a line-by-line decision the document's own
dependency graph makes meaningful. “All five are necessary to ship the
whole leaf” is not a reason that the permanent amendments must be approved
in one ballot.

The correction must either:

- make the five amendments independently ratifiable, state that D/0/07c
  implementation remains blocked until every unresolved requirement has an
  approved solution, and give the concrete consequence of declining each
  line; or
- state a binding contract/governance invariant that actually makes partial
  parent amendment invalid, and reconcile that invariant with Decision 5's
  expressly independent D/0/07b effect.

A packaging preference is not enough for an irreversible contract decision.

## Sufficiency-to-decide ruling

The section is accurate but **not sufficient to decide**.

It now answers “what can happen together,” but not “which of these outcomes
will normally happen, which depend on the provider's ordinary behavior, and
which require faults or hostile drift.” In particular, it does not make the
ordinary namespace residue legible as such. The operator also cannot express
a supported partial decision despite at least one explicit independent
effect.

I would not treat unknown measured rates as a defect by themselves at this
design stage. The defect is that the document does not even classify the
known reachability and leaves baseline residue in the same modal language as
connection loss, helper death, and endpoint delegation.

## Separability ruling and cost of declining

The five decisions are jointly necessary for the proposed complete D/0/07c
implementation, but they are **not shown to be inseparable as contract
amendments**.

The concrete current-design cost of declining each is:

| Declined decision | Consequence under the current design |
|---|---|
| 1B | No `READY(G)`, claim, port, relay transfer, barrier, or positive D/0/07c snapshot path. |
| 2A | No `READY(G)` or field-exact positive capture; exact owned pane/session cleanup through the proposed retained connection is unavailable. |
| 3B | The frozen complete process/tree-retirement acceptance criterion remains unsatisfied, so this topology cannot complete D/0/07c conformingly. |
| 4C | The frozen no-key/socket/runtime-directory-leak criterion remains unsatisfied, so this topology cannot complete D/0/07c conformingly. |
| 5B | No `READY(G)`, PTY read/write, positive D/0/07c transaction, or positive D/0/07b write. |

Those costs justify keeping D/0/07c implementation blocked until every
requirement is resolved. They do not justify preventing the operator from
approving one parent amendment, especially Decision 5, while rejecting
another and requiring a redesign for the rejected requirement.

## Undisclosed-composition and over-broad-amendment sweep

Apart from the reachability and decision-structure findings above, I found
no additional composed effect omitted from the section:

- delegated endpoint receive/inject/barrier participation is connected to
  narrowed PTY reads and writes;
- atomic current-pane capture is expressly denied end-to-end production
  provenance;
- anchor-held and anchor-lost process sets are distinguished;
- owned pane/session, process, and namespace residue can coexist; and
- terminal `PRESERVED` ledger entries are expressly compatible with
  `REVOKED` and ordinary completion.

I also found no amendment still surrendering more than its impossibility
requires:

| Decision | Over-breadth ruling |
|---|---|
| 1B | Retains the exact connected object, handshake/proof history, `G` ordering, and exact counts; it removes only live external facets that stock stream effects cannot condition. |
| 2A | Retains field-exact atomic capture and exact owned pane/session selection; it changes the unavailable stock separate-command authority and accepts the stated custom shared-server deployment. |
| 3B | Retains mandatory original-group retirement while the live-or-unreaped direct-child anchor exists and preserves rather than numerically re-resolving when it does not. |
| 4C | Preserves entries because no portable compare-identity-and-remove or exclusive-custody primitive exists in the frozen topology; it does not remove an exact retained descriptor capability. |
| 5B | Retains exact PTY objects, historical binding, sideband, `G` order, and exact counts; it removes only provenance/live facets an ordinary PTY syscall cannot condition. |

I did not reopen the settled removal of 1A/3A/4A/4B/5A, the 2A/2B merge,
the accuracy of the individual cells, or the rule that every permitted
original-group signal is conditional on current ownership of an unreaped
leader with preservation as the fallback.

## Ready-for-ratification statement

I would **not sign this package**, and the table plus combined-effect
subsection is **not ready for operator ratification**.

Before ratification:

1. add the categorical reachability/operational-incidence disclosure
   described in P1-1, explicitly identifying expected namespace residue and
   distinguishing it from workload-, fault/recovery-, and adversarial paths;
   and
2. replace the unexplained all-or-nothing amendment ballot with independent
   decisions and a dependency/decline matrix, or provide a binding reason
   partial parent amendment is invalid and reconcile Decision 5's independent
   D/0/07b effect.

No operative authority, cleanup target, ordering, public surface, or
implementation scope needs to change to address these findings.

## What I verified and did not verify

Verified:

- the complete candidate design and the complete required Trial 6 reviewer-B
  verdict;
- the required-operator-decisions section cold, before mapping it to the
  operative rules;
- every table line and the new aggregate subsection against R1–R4 and the
  complete post-`ACCEPT` inventory;
- the relevant D/0/07, D/0/07b, and D/0/07c positive-path, dependency,
  cleanup, and acceptance requirements needed for the reachability and
  separability rulings;
- that the candidate design diff from `6188f6d` to `8411bd5` is a 42-line
  insertion after the unchanged five-row table and changes no operative rule
  or individual decision cell; and
- `git diff --check 6188f6d..8411bd5`, which exited zero.

Not verified:

- no source, test, design, plan sheet, implementation, tmux runtime, socket,
  process, or kernel behavior was changed or exercised;
- no full CI, runtime gate, standalone kernel/socket/lock probe, live
  provider call, or tmux server/session was run;
- no Darwin host execution or empirical failure/incidence data was
  available;
- no future custom-tmux binary, protocol, packaging, migration, cleanup, or
  failure behavior exists here to execute or certify;
- no implementation, integration, promotion, release, D/0/07d,
  adapter/service/catalog splice, or operator ratification was assessed; and
- reviewer A's concurrent Trial 7 verdict was neither sought, opened, nor
  used.

No check was interrupted by the provider content filter. The pre-existing
untracked `gateway/node_modules` directory was not touched.

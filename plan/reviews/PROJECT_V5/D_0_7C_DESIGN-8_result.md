# Project V5 D/0/07c Design Trial 8 — reviewer A result

reviewed_KO

## Review boundary and outcome

I reviewed design candidate
`a3d665872637709265f0e376ad0da1db652735b8` against the adjudicated
Trial 7 base `2b872299939e0db16255403fb693b4274eff0e31`, with the review
worktree at request commit `f4c7715e442525587b071255584957fa2253bc1d`.
The binding specification was the complete Trial 7 reviewer-B result,
`plan/reviews/PROJECT_V5/D_0_7C_DESIGN-7_result_b.md`.

The candidate closes P1-2. It now treats the five parent amendments as
independent ratification decisions, states an independent meaning and decline
cost for each, and still forbids any D/0/07c implementation trial until all
five requirements have approved resolutions. I found no path by which a
partially ratified D/0/07c topology can start implementation and therefore no
P0 weakening.

The candidate does not fully close P1-1. The new table correctly classifies
the rows it contains, including ordinary namespace residue and Decision 5's
ordinary-workload-dependent startup/mixed-producer semantics, but it omits a
distinct Decision 1 outcome already disclosed by the design: traffic on the
original endpoint during same-holder live-relay-facet drift or accepted
tmux-binding drift. Descriptor delegation is classified; those other accepted
drift paths are not. This is one P1 operational-reachability omission.

This KO authorizes no implementation, integration, promotion, release,
D/0/07d gate, adapter/service/catalog splice, or operator ratification.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | Independent ratification does not weaken the all-five D/0/07c implementation gate. No governing decision can be bypassed. |
| P1 | 1 | The trigger-class table omits same-holder live-relay-facet drift and accepted tmux-binding drift even though Decision 1 and the combined disclosure expressly accept traffic during those states. |
| P2 | 0 | No separate advisory finding. |

## Finding

### P1-1 — Decision 1 drift is not classified when endpoint ownership does not change

Decision 1 removes three distinct effect-time continuity requirements:

1. live relay `start`/executable/argv/cwd/pgid/sid;
2. current descriptor-holder continuity; and
3. continuity of the accepted tmux server/session/pane binding
   (`07c design:244-262,519`).

The combined disclosure expressly says relay input/output/barrier traffic can
continue during “unobserved relay or tmux-binding drift”
(`07c design:531-539`). The trigger table classifies only the second leg: its
endpoint-holder row requires a fork, daemonization, handoff, or another
process obtaining the endpoint (`:596`). It has no row for:

- the original accepted endpoint holder continuing to use the socket after
  one of its own live relay facets changes; or
- the original endpoint continuing to carry traffic while the accepted tmux
  server/session/pane binding has drifted.

These are not hypothetical restatements of delegation. The isolated Decision
1 proof requires the approved baseline to deliver exact bytes when only relay
cwd changes and `G` remains active (`:646`), and the historical closure map
records the accepted changed-cwd race separately from handoff (`:696`).

The omission leaves the operator without a trigger class, correct-operation
statement, frequency status, or exposing evidence for two named accepted
losses. Depending on the concrete drift, their incidence can differ from
descriptor delegation, so the delegation row cannot silently supply their
classification. The table must add or split rows for those losses without
changing Decision 1 authority.

## Trigger-class row rulings

| Candidate outcome | Ruling | Basis |
|---|---|---|
| Owned relay-socket entry and runtime directory remain through settlement (`:592`) | **Correct.** Expected in every conforming accepted generation absent external removal; this is selected baseline cleanup, not a failure. | D/0/07c creates both entries (`07c:25-28`); Decision 4 never unlinks/removes them (`design:418-420,488-490,522`). |
| Relay key versus residual/replacement namespace material (`:593`) | **Correct.** Ordinary single-use consumption retires the key before `ACCEPT`; residual owned material requires failed/violated consumption, while replacements/children require external or desired-behavior-violating mutation. | `design:418,487,522`; frozen relay consumption is `07:379-384`. |
| Pre-`ACCEPT`/pre-activation or mixed-producer/time PTY output (`:594`) | **Correct.** This is ordinary-workload-dependent, not a component-failure path. Startup output is explicitly in this class whenever it arrives before activation, and Decision 5 must accept the complete returned range whenever present. Its empirical frequency is not known. | Selected read-time semantics are `design:274-281`; the mandatory pre-activation and mixed-producer proofs are `:651-654`. The frozen positive workload itself emits startup `ready\n` (`07:771-780`), although its exact scheduling relative to activation is not guaranteed by that oracle. |
| PTY effects cross a changed foreground job, geometry, or earlier binding state (`:595`) | **Correct for the Decision 5 outcomes stated.** Ordinary job control can produce foreground transitions; external mutation or desired-behavior violation can produce other live-facet drift. The row does not classify the separate Decision 1 relay/tmux drift in the finding above. | `design:283-292,523`. |
| Delegated/inherited/forked/replacement endpoint holder (`:596`) | **Correct but not exhaustive of Decision 1.** Such holder discontinuity violates the desired no-fork/no-daemonize/no-handoff behavior and is accepted because the socket object, not the current holder, is authority. | `design:254-262,519`. Same-holder relay-facet and tmux-binding drift remain missing. |
| Field-exact snapshot contains Decision 5 provenance-loss content (`:597`) | **Correct.** Capture can be perfectly current and atomic while already-rendered content has ordinary-workload or adversarial provenance-loss triggers. | `design:294-323,540-547`. |
| Outside-original-group descendants survive (`:598`) | **Correct.** A correct provider workload can create a long-lived descendant in another group/session; unresolved such targets are preserved because no retained destruction target exists. | `design:372-388,484,521`. |
| Separately launched relay survives descriptor close (`:599`) | **Correct.** Placement outside the utility tree alone does not make it survive; non-cooperation after endpoint close is a component failure or desired-behavior violation. | `design:372-380,484,521`. |
| Port-owned pane/session remains (`:600`) | **Correct.** Healthy retained-connection cleanup retires the exact owned IDs; defect, skew, outage, or connection loss is required for preservation. | `design:390-405,485,520`. |
| Direct root/original group remains (`:601`) | **Correct.** Helper/reaper ownership loss, adoption after death, premature reap, or restarted cleanup removes the lifetime anchor; ordinary anchored cleanup force-retires the group. | `design:344-370,383-388,483,521`. |
| Cleanup settles with simultaneous residue (`:602`) | **Correct for the disclosed cleanup conjunction.** Socket/directory residue is baseline; the larger set adds the applicable workload-dependent survivor and component/recovery conditions, with adversarial mutation where replacements are involved. | `design:548-562` and the individual cleanup rules above. |
| Same-holder relay-facet or accepted tmux-binding drift | **Missing — P1.** The operative rule and combined disclosure accept traffic in these states, but no trigger-table row assigns their class, incidence status, or evidence. | `design:254-262,519,531-539,646,696`. |

No existing row overstates its evidenced reachability. No numerical incidence
is invented, and the diagnostic-evidence boundary at `design:584-588`
correctly adds neither public surface nor effect authority.

## Separated ratification and implementation-gate ruling

P1-2 is closed.

The preamble now says each line is a separate parent amendment, one line does
not decide another, and partial approval authorizes no D/0/07c implementation
(`design:509-515`). The independent-decision section repeats that distinction
and gives each decision a concrete independent meaning and decline cost
(`:604-626`):

| Decision | Independent-ratification ruling | Decline-cost ruling |
|---|---|---|
| 1B | Correct: approves only retained-socket/read-range authority; no separate positive leaf is identified. | Correct: no `READY(G)`, claim/port, relay traffic, barrier, or positive D/0/07c snapshot path. |
| 2A | Correct: approves only the custom shared-default-tmux capture/owned-object boundary. | Correct: no `READY(G)`, field-exact capture, or proposed exact owned pane/session cleanup. |
| 3B | Correct: independently resolves only the bounded process-retirement conflict. | Correct: the frozen full process/tree-retirement criterion remains unsatisfied, so this topology cannot complete conformingly. |
| 4C | Correct: independently resolves only the namespace-preservation conflict. | Correct: the frozen no-key/socket/runtime-directory-leak criterion remains unsatisfied. |
| 5B | Correct: has independent meaning for the separately scoped D/0/07b write leaf, subject to that leaf's gates. | Correct: no retained-PTY read/write, positive D/0/07c transaction, or positive D/0/07b write. |

The unchanged dependency paragraph still requires Decisions 1, 2, and 5 for
`READY(G)` and the positive transaction, Decision 5 independently for
D/0/07b writes, Decisions 3 and 4 for the two leak-free parent criteria, and
Decision 2 for exact owned pane/session cleanup (`design:628-636`). The final
stop forbids a D/0/07c implementation trial until all five requirements have
approved resolutions (`:814-816`). Thus independent ratification does not
permit partial implementation, and the gate still holds.

## Five-deletion accounting and unchanged-rule check

The candidate is exactly `+71/-5` in the design file. The five deletions are
fully accounted for:

| Deleted lines | Accounting |
|---:|---|
| 3 | The old preamble said ratification approved every line and that declining any line authorized no implementation. It is replaced by independent parent-amendment wording plus the unchanged no-partial-D/0/07c implementation rule. |
| 2 | The old final stop required one all-five ratification ballot. It is replaced by an independent-ratification statement plus the unchanged all-five-requirements implementation stop. |

`git diff --unified=0 2b87229..a3d6658` has only the preamble replacement,
the 61-line disclosure/ratification insertion, and the final-stop replacement.
It does not touch:

- operative binding rules or the complete site inventory (`design:1-501`);
- any of the five commitment/capability-loss cells (`:517-523`);
- the dependency paragraph (`:628-636`);
- any condition, ordering, cleanup selector, REJECT mapping, proof obligation,
  public error, or per-decision cell.

The design commit changes exactly the one design file. Request commit
`f4c7715` only adds
`plan/reviews/PROJECT_V5/D_0_7C_DESIGN-8_to_review.md`.
`git diff --check 2b87229..a3d6658` exited zero.

## Omission sweep

The Decision 1 same-holder relay/tmux-drift omission above is the only
additional unclassified composed outcome I found.

Apart from that finding, the table covers:

- baseline socket/directory residue and exceptional key/replacement material;
- Decision 5 source-time, producer, foreground, geometry, binding, and later
  capture composition;
- anchored and anchor-lost process survivor sets;
- non-cooperative relay and retained-server-loss residue; and
- ordinary settlement with the baseline and larger simultaneous residual
  sets.

I found no trigger class assigned without operative or proof-obligation
evidence.

## Preserved-behavior check

The candidate does not disturb the frozen:

- exact capture/canonicalization vector
  `["capture-pane","-p","-N","-T","-t",tmuxTarget,"-S","-400"]` or byte
  algorithm;
- real tmux 3.6 figures `40 -> 0`, `61 -> 24`, and `50 -> 12`;
- terminal-changed rejection for stable `121x40` and
  `history-limit=401`;
- rejected-generation non-revival; or
- fail-closed malformed or absent history evidence.

Those obligations remain expressly listed at `design:761-780`, and the
candidate diff does not touch them or their operative/proof rows. This is a
textual preserved-design ruling only; I did not re-execute their prior
runtime evidence.

## Scope ruling

Scope remains design-only. The candidate adds no implementation, test,
capability, port/public surface, public error, provider launch change,
adapter/service/catalog splice, D/0/07d claim, integration, promotion, or
release claim. The evidence column is expressly diagnostic and
non-authorizing (`design:584-588`).

## What I did and did not verify

Verified:

- the complete review brief and complete binding Trial 7 reviewer-B result;
- the complete candidate design and Trial 8 review request;
- every new trigger-table row against R1-R4, the complete post-`ACCEPT`
  inventory, the decision cells, and the isolated proof obligations;
- the relevant frozen D/0/07, D/0/07b, and D/0/07c startup, handshake,
  write, capture, cleanup, and acceptance rules;
- independent ratification, every decline cost, and the all-five
  implementation stop;
- all five deletions and all candidate/request changed paths;
- preserved-behavior text and `git diff --check`; and
- that the pre-existing untracked `gateway/node_modules` directory was not
  touched.

Not verified:

- no source, test, design, plan sheet, or implementation file was changed;
- no full CI, runtime gate, live provider call, tmux server/session, socket,
  process, kernel/lock probe, or Darwin host execution was run;
- no future custom-tmux implementation, protocol, packaging, migration,
  cleanup, or incidence data exists here to execute or certify;
- no implementation, integration, promotion, release, D/0/07d,
  adapter/service/catalog splice, or operator decision was assessed; and
- the concurrent Trial 8 reviewer-B verdict was neither sought, opened, nor
  used.

No check was interrupted by the provider content filter.

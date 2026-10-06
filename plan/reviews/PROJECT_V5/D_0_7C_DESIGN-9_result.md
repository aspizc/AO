# Project V5 D/0/07c Design Trial 9 — reviewer A result

reviewed_OK

## Review boundary and outcome

I reviewed design commit
`95185e0175e7b0619628488c3024ba2d1615418c` at request commit
`a259ab1a1ea60eb24d8a1008900f566588afabed`. The binding specification was
the complete Trial 8 reviewer-A result,
`plan/reviews/PROJECT_V5/D_0_7C_DESIGN-8_result.md`. I also read the complete
Trial 8 reviewer-B result for the settled points that this trial must not
reopen.

The two inserted rows correctly and independently classify the two
previously omitted Decision 1 outcomes. Both rows state all four required
fields, neither is a restatement of descriptor delegation, and together with
the unchanged delegation row they cover all three effect-time continuity
losses removed by Decision 1. The candidate is strictly additive and leaves
every settled rule, decision cell, matrix entry, proof obligation, preserved
behavior, and scope stop unchanged.

The document is ready for operator ratification. This `reviewed_OK`
authorizes implementation only; it does not itself decide or ratify any
operator amendment and authorizes no integration, promotion, release,
D/0/07d gate, or adapter/service/catalog splice.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | No authority or safety-direction defect found. |
| P1 | 0 | Both omitted continuity outcomes now have accurate, decision-ready reachability classifications. |
| P2 | 0 | No separate advisory finding. |

## New-row trigger-class rulings

| New outcome | Ruling | Basis |
|---|---|---|
| Original accepted endpoint holder uses the socket after its own live relay facets drift (`design:596`) | **Correct — adversarial/desired-behavior violation.** The row keeps the original holder and original socket fixed and changes only the accepted relay's live `start`/executable/argv/cwd/pgid/sid tuple. Correct intended relay operation keeps those facets stable: the frozen relay must remain the direct pane process, and its healthy authenticated loop does not change cwd, exec, fork, daemonize, hand off the socket, or change process group/session. A controlled same-holder mutation therefore violates intended behavior; no conforming ordinary relay path produces it. Decision 1 nevertheless accepts an unobserved mutation-to-I/O race because those live facets are no longer effect-time authority (`design:244-262,519`). | The isolated proof deliberately changes cwd while `G` stays active and requires the approved baseline to deliver the exact 25 bytes (`design:648`). That proves the ratified capability loss; it does not make the mutation an ordinary conforming trigger. The closure map likewise records changed cwd separately from handoff (`design:698`). |
| Original relay endpoint carries traffic while the accepted tmux server/session/pane binding drifts (`design:597`) | **Correct — component/recovery failure or adversarial/desired-behavior violation.** The row expressly keeps both the original endpoint and its holder fixed. Healthy port/tmux operation preserves the accepted binding, while server loss/restart/replacement or pane/session lifecycle failure supplies the component/recovery class and an external lifecycle mutation supplies the adversarial/desired-behavior class. Decision 1 makes the accepted IDs historical for socket traffic, so reads, sends, and barrier steps can pass during an unobserved drift (`design:244-262,519`). | The row neither labels a conforming healthy tmux path adversarial nor claims empirical rarity. Its `Unmeasured` incidence statement matches the absence of implementation or production data. |

Neither row classifies an outcome as adversarial when a conforming component
can produce its trigger. In particular, the exact-byte changed-cwd proof is a
controlled capability-loss mutation against the approved baseline, not a
claim that the healthy relay changes cwd in ordinary operation.

## Four-column completeness

Both rows carry the same four decision fields as every other outcome row:

| Required field | Same-holder relay-facet row | Same-endpoint tmux-binding row |
|---|---|---|
| Trigger class | `Adversarial/desired-behavior violation` | `Component/recovery failure or adversarial/desired-behavior violation` |
| Concrete trigger and correct-operation statement | Names inequality of the full live relay tuple and says correct intended relay operation keeps it stable | Names server restart/replacement, session/pane removal/recreation, or external lifecycle action and says correct healthy port/tmux operation keeps the binding stable |
| Frequency status | `Unmeasured` | `Unmeasured` |
| Exposing evidence and its limit | Controlled same-holder mutation or correlated process diagnostics; stream effects contain no live-facet proof | Retained-server lifecycle/identity diagnostics, atomic-capture mismatch, or controlled replacement; earlier stream/barrier effects contain no live-binding proof |

The Markdown table has five substantive cells per row—outcome plus those four
fields—and both evidence cells preserve the rule that separate diagnostics
cannot prove or exclude the exact effect-time race (`design:584-588`).

## Distinctness from descriptor delegation

The three Decision 1 rows now answer three different questions:

1. `design:596` keeps endpoint ownership unchanged and changes the original
   holder's own live process tuple.
2. `design:597` keeps both endpoint and holder unchanged and changes the
   historical accepted tmux server/session/pane binding.
3. `design:598` keeps the original socket object but changes who holds or
   uses its peer endpoint through fork, inheritance, handoff, or replacement.

Thus neither inserted row restates delegation. The live process tuple,
current-holder continuity, and tmux-binding continuity are independently
classified even when the endpoint holder does not change.

## Additive verification

The design delta from the adjudicated Trial 8 base `f056236` to `95185e0` is
exactly one hunk at old line 595/new line 596:

```text
2	0	plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md
```

It inserts only the two reviewed trigger rows. There are zero deletions and
no existing row, cell, sentence, operative rule, proof obligation, or matrix
entry was edited, replaced, or reordered. Independent byte checks matched at
base and candidate:

| Settled region | Matching SHA-256 |
|---|---|
| Operative design and complete site inventory (`design:1-501`) | `dc91065172f48b915bf95aa71d82dc2fa243e348992cf79eca903bf85c8ed89c` |
| Five per-decision commitment/capability-loss rows (`design:517-523`) | `6a89c65b413b0457f4beb6a2d5f0f51f54981808a26f7d6126d21aae3927c768` |
| Independent-decision matrix (base `:613-619`, candidate `:615-621`) | `4a2cffce28757fe888adab67cd7bb8847a77c2e07f290157e7e24dbedc9a6537` |

Request commit `a259ab1` adds only the 93-line Trial 9 review request. Across
the design and request commits the only tracked paths are the two-line design
insertion and that new request. `git diff --check` exited zero.

## Sweep for a third unclassified continuity loss

I found no further unclassified Decision 1 continuity loss. The complete
three-leg accounting is:

| Removed continuity requirement | Classified row |
|---|---|
| Live relay `start`/executable/argv/cwd/pgid/sid | Same-holder relay-facet drift (`design:596`) |
| Current descriptor-holder continuity | Delegated/inherited/forked/replacement holder (`design:598`) |
| Effect-time accepted tmux server/session/pane continuity | Same-endpoint tmux-binding drift (`design:597`) |

The first row covers the complete six-facet tuple, and the second inserted row
covers server, session, and pane drift for ordinary stream and barrier traffic.
The already settled table continues to cover Decision 5 provenance, later
capture composition, process survivors, tmux cleanup residue, namespace
residue, and simultaneous cleanup outcomes. I found no fourth Decision 1 leg
or narrower unclassified case within the two inserted outcomes.

## Preserved-behavior check

The two-line trigger-table insertion does not disturb:

- the frozen exact capture vector
  `["capture-pane","-p","-N","-T","-t",tmuxTarget,"-S","-400"]` or the
  canonicalization byte algorithm;
- the real tmux 3.6 figures `40 -> 0`, `61 -> 24`, and `50 -> 12`;
- terminal-changed rejection for stable `121x40` and
  `history-limit=401`;
- rejected-binding/generation non-revival; or
- fail-closed handling of malformed or absent history evidence.

The frozen parent design/leaf files containing the vector and byte contract
are unchanged, and the preserved-behavior section remains textually
unchanged at `design:761-792`. I did not re-execute the prior runtime evidence.

## Scope

Scope remains design-only. The candidate adds no implementation, source,
test, fixture, capability, new port/public surface, public error, provider
launch change, custom-tmux runtime, D/0/07d claim, or
adapter/service/catalog splice. It makes no integration, promotion, or
release claim.

## What I did and did not verify

Verified:

- the complete review brief, complete Trial 8 reviewer-A binding result, and
  complete Trial 8 reviewer-B result for settled points;
- the complete candidate design and Trial 9 review request;
- both inserted rows against Decision 1's operative authority, capability-loss
  cell, combined disclosure, exact-narrowing proof, closure map, frozen relay
  contract, and intended relay loop;
- every required trigger-class, correct-operation, frequency, and evidence
  field in both rows;
- distinctness from descriptor delegation and the complete three-leg
  continuity accounting;
- the exact candidate/request path set, `+2/-0` design hunk, unchanged-region
  hashes, and `git diff --check`;
- the preserved-behavior and scope text; and
- that the pre-existing untracked `gateway/node_modules` directory was not
  touched.

Not verified:

- I did not run full CI, a runtime gate, live provider call, tmux
  server/session, socket, process, kernel/lock probe, or Darwin execution;
- I did not re-execute the previously established canonicalization, real-host
  tmux, rejection, history-evidence, or non-revival runtime cases;
- no future custom-tmux implementation, protocol, packaging, migration,
  cleanup behavior, or production incidence data exists here to certify;
- I did not assess or authorize integration, promotion, release, D/0/07d,
  adapter/service/catalog splice, or any operator decision; and
- I did not seek, open, or use the concurrent Trial 9 reviewer-B verdict.

No check was interrupted by the provider content filter.

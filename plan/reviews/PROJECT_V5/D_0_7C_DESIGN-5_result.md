# Project V5 D/0/07c Design Trial 5 — reviewer A result

reviewed_OK

## Review boundary and outcome

I reviewed design commit
`846303211fa693f29671794a535a66d0caf8a371` against review base
`099ac12e6362376972edbf15c6dc018f511ef8c0`, with request commit
`a8a9bd26ffcdd41f6bac20d68e5e683b991f5083`.

The binding specification for this review was the complete Design Trial 4
reviewer B result at
`plan/reviews/PROJECT_V5/D_0_7C_DESIGN-4_result_b.md`. I treated its two
adjudicated P1 findings as the only open findings and did not reopen its
settled rulings on deleted options 1A, 3A, 4A, 4B, and 5A, the 2A/2B merge,
or Decision 4's disclosure.

Both open findings are closed. Decision 3 now retains exact forced
termination of the direct utility root and its original process group only
under the helper-owned live-or-unreaped child invariant. It does not restore
arbitrary looked-up PID or PGID signalling. The capability-loss column now
states all three consequences omitted in Trial 4, and I found no further
operative loss omitted from any of its five cells.

This OK authorizes a later implementation trial only. It is not an
integration, promotion, release, D/0/07d, splice, or operator-decision
approval.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | No blocking correctness or authority-boundary defect. |
| P1 | 0 | Both adjudicated Trial 4 P1 findings are closed. |
| P2 | 0 | No advisory finding. |

## Trial 4 finding rulings

### P1-1 — closed: bounded direct-root/original-group retirement is restored

The topology evidence supporting the bounded lifetime anchor remains present:

- the helper forks the utility directly
  (`gateway/src/adapters/process_supervisor_helper.py:1733-1769`);
- the child calls `setsid()` before executing the utility
  (`process_supervisor_helper.py:1474-1493`);
- acceptance requires the reported `pid`, `pgid`, and `sid` all to equal the
  direct child PID and rechecks the identity
  (`process_supervisor_helper.py:1790-1806`); and
- Linux exit observation uses `WNOWAIT`, while Darwin uses kqueue exit
  observation, so neither observer reaps the child
  (`process_supervisor_helper.py:1159-1194`).

The amended design uses that topology no further than it permits:

- the retained-authority definition requires direct-child ownership,
  live-or-unreaped state, accepted `pid == pgid == sid`, and signal-before-reap
  ordering (`07c-DESIGN-post-accept-binding.md:88-98`);
- the cleanup ledger seals that ownership invariant before activation, and
  `C_G` may use it only while the helper still owns the live-or-unreaped child
  and before leader reap (`design:129-159`);
- R3 requires one cleanup/reap mutex, `SIGTERM`, the frozen grace interval,
  `SIGKILL`, terminal group signalling before leader reap, and
  `ESRCH`/`ProcessLookupError` as the exact group already absent
  (`design:326-356`);
- the site inventory places the effect strictly at `C > V`, keeps the leader
  unreaped, forbids PID/PGID re-resolution, and reaps only after the group
  attempt is terminal (`design:469`); and
- the operator row retains mandatory forced retirement of the direct root and
  every member still in the original group while narrowing preservation to
  outside-group descendants and the separate relay (`design:503`).

The residual preservation boundary is exact. A descendant that moves to
another group in the same session or to a new session, and the separately
tmux-launched non-cooperative relay, may survive. The utility root and members
still in its original group are not part of that ratified surrender
(`design:365-374,470,503`).

#### Bounded-versus-unbounded ruling

The candidate admits the bounded case only. The sealed child PID may address
its original group because the helper's unreaped-child ownership prevents PID
reuse and unrelated PGID acquisition during that interval. This is not an
observe-then-signal lookup.

No arbitrary or later numeric target is admitted. A fresh
`process_identity()` result is diagnostic only; outside-group descendants and
the relay cannot be selected by recorded PID/PGID; reconnect, re-resolution,
and arbitrary/later numeric signalling remain forbidden
(`design:135-159,358-374,470`). The isolated proof obligations likewise reject
a numerically matching child owned by another parent, redirecting the sealed
group from a fresh lookup, signalling an outside-group descendant, and
signalling the relay (`design:543-548`).

#### Ownership precondition ruling

Ownership is a runtime condition, not an assumption. If the helper no longer
owns the child or the leader has already been reaped, cleanup sends no numeric
signal, rejects that target, and records it `PRESERVED`
(`design:358-363`). The fallback is therefore preservation, never a
name-based or freshly observed signal.

### P1-2 — closed: the ratification loss column is complete

I compared each loss cell at `design:501-505` with the operative rules,
inventory, and proof obligations.

| Decision | Loss-cell audit | Ruling |
|---|---|---|
| 1B | The cell now names loss of effect-time accepted tmux server/session/pane continuity in addition to live relay facets and current-holder continuity. It states the consequence: relay input/output and barrier traffic may continue during unobserved relay or terminal-binding drift, and diagnostics cannot close either race. | Complete. |
| 2A | The cell retains the custom default-server build/package/migration cost, loss of stock separate-command authority, and preservation of shared server/socket/siblings. It now also says a defect, protocol skew, outage, or retained-connection loss can affect the shared server and leave the port-owned pane/session unresolved and `PRESERVED` indefinitely. | Complete. |
| 3B | The cell retains exact direct-root/original-group retirement and discloses only the residual surrender: outside-group descendants and a non-cooperative relay may survive indefinitely with resources, credentials, descriptors, side effects, and further spawning. It does not misstate the bounded group as a capability loss. | Complete. |
| 4C | The cell discloses preservation of residual key material, relay socket names/inodes, directories/children, disk use, and blocked safe basename reuse, with preservation rather than leak-free success. This is the previously settled complete disclosure and remains unchanged. | Complete. |
| 5B | The cell now names lost production-time producer/generation provenance and effect-time utility `pid`/`startToken`/`bindingDigest`/executable/argv/cwd/pgid/sid, helper/reaper/supervisor, terminal/tmux, foreground, winsize, and producer continuity beyond retained PTY-object identity. It keeps the consequences of pre-`ACCEPT`, pre-activation, mixed-writer/time, arbitrary-slave-holder, changed-foreground, and changed-geometry I/O explicit. | Complete. |

I found no additional loss accepted by the operative rules but absent from
these five cells.

## No-weakening comparison

The 39 deleted lines do not convert any required REJECT or HARD FAIL into a
warning, skip, allow, tolerance, or exemption. They remove the superseded
over-broad prohibition on all utility-group signalling, replace its combined
inventory/operator/proof rows with the bounded group rule and residual
preservation rows, add the three missing loss disclosures, and update closure
text.

The amended design still requires:

- HARD FAIL for every dependent path until all five amendments and their
  costs are ratified (`design:493-515,673-674`);
- zero workload effects after `V` and zero cleanup effects before `V`
  (`design:137-159,422-445`);
- fail-closed conditional relay, PTY, readiness, capture, sideband, and
  settlement effects under the previously confirmed cause/interval rules
  (`design:104-182,447-476`);
- no fresh process identity as cleanup authority, no arbitrary/later numeric
  target, no pathname removal, no shared tmux-server/socket destruction, and
  no revival (`design:150-163,358-412,416-445`); and
- the settled removal of unavailable 1A, 3A, 4A, 4B, and 5A, the concrete
  merged custom-tmux option, and Decision 4's preservation boundary
  (`design:489-515,599-621`).

No confirmed ruling from Design Trials 1-4 was softened or dropped. The only
newly permitted signal is the exact bounded action required by the
adjudicated P1-1 correction.

## Overlap-and-gap check

The amended process effect is governed by exactly one side of the authority
partition:

```text
workload E while G == ACTIVE
    -> V
    -> cleanup C_G while G == REVOKING/REVOKED
```

The original-group signal is a sealed `C_G` target, requires the same
generation and `C > V`, and cannot publish readiness, transfer bytes, capture,
settle workload success, or revive `G` (`design:129-159,422-445,466,469`).
It is therefore not also a workload effect.

There is no uncovered process effect. If the ownership invariant holds, the
sealed original group follows TERM/grace/KILL before reap. If it does not
hold, that target rejects and becomes `PRESERVED`. Outside-group descendants
and the relay follow the explicit descriptor-close/cooperative-exit/
`PRESERVED` rule (`design:358-374,469-470`). Thus the narrowing creates
neither an effect governed by both authorities nor an effect governed by
neither.

## Preserved-behaviour check

The process amendment is confined to post-`V` cleanup and does not alter the
capture or settlement path. After ratification of all five decisions, the
preserved positive and negative behaviours remain reachable through the
retained custom-server `agents-capture-v1` operation:

- it returns one complete record containing generation, exact
  server/session/pane/process identity, geometry, history limit, metadata,
  and capture bytes under one event-loop operation
  (`design:289-311,461`);
- missing, malformed, or contradictory evidence still rejects the whole
  record before canonicalization or settlement (`design:313-318`);
- canonicalization remains a pure transformation only after record
  acceptance (`design:462`);
- exact `120x40` and history limit `400` remain atomic predicates, so
  `121x40` and `history-limit=401` remain terminal-changed rejection
  obligations (`design:303-311,631-644`); and
- sticky revocation and settlement still prevent a rejected binding or
  equal-looking replacement from reviving (`design:416-445,633`).

The frozen canonicalization vector and real tmux 3.6 figures `40 -> 0`,
`61 -> 24`, and `50 -> 12`, including exact row-end spaces, remain explicit
regression obligations (`design:625-644`). The same section preserves
fail-closed malformed or absent history evidence and rejected-generation
non-revival. Before all five decisions are ratified these paths remain HARD
FAIL; the design does not use the preserved examples to bypass that gate.

## Scope

The candidate changes design text only. It adds no implementation, test, port
surface, public error, adapter/service/catalog splice, provider-launch
change, D/0/07d gate, integration, promotion, or release claim
(`design:656-674`).

## What I verified and did not verify

Verified:

- the complete binding Trial 4 reviewer B verdict, complete Trial 5 review
  request, and complete amended design;
- the exact `099ac12..8463032` design diff, including every added and deleted
  line and all five ratification loss cells;
- that the design commit changes only
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`;
- the helper's direct-fork, `setsid()`, accepted `pid == pgid == sid`,
  non-reaping observer, and existing signal-before-leader-reap topology used
  as design evidence;
- the bounded and unbounded Decision 3 paths, ownership-loss fallback,
  `ESRCH` handling, signal/reap order, inventory rows, isolated future proof
  obligations, and operator cell;
- the no-weakening diff, workload/cleanup overlap-and-gap boundary, preserved
  canonicalization/geometry/history/non-revival obligations, and scope stop;
  and
- `git diff --check` for the nominated review-base/design range.

Not verified:

- no source, test, design, task sheet, or implementation behavior was changed
  or exercised by this review;
- no full CI, runtime gate, standalone kernel/socket/lock probe, live tmux
  server/session, or provider call was run;
- no Darwin host execution or future custom-tmux implementation exists here
  to execute or certify;
- no implementation feasibility beyond the already adjudicated bounded
  topology, integration, promotion, release, D/0/07d, splice, or operator
  choice was decided; and
- the concurrent Design Trial 5 reviewer B result was neither opened nor
  used.

No check was interrupted by the provider content filter. The pre-existing
untracked `gateway/node_modules` directory was not touched.

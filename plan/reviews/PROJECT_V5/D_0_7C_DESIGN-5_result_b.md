# Project V5 D/0/07c Design Trial 5 — reviewer B result

reviewed_KO

## Review boundary and outcome

I reviewed design commit
`846303211fa693f29671794a535a66d0caf8a371` against review base
`099ac12e6362376972edbf15c6dc018f511ef8c0`, the frozen D/0/07,
D/0/07b, and D/0/07c rules, and the helper lifetime topology used as design
evidence.

Below, `design:` references mean
`plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`; `parent:`
references mean `plan/PROJECT_V5/D/0/07.md`.

The candidate closes the three previously reported disclosure omissions in
Decisions 1, 2, and 5. It also safely narrows Decision 3 while the original
helper still owns the live-or-unreaped direct utility child: the sealed
`pid == pgid == sid` then remains an exact original-group lifetime anchor.

The table is nevertheless not ready for ratification. The operative rules
correctly fall back to no numeric signal and `PRESERVED` if that ownership/
unreaped precondition is unavailable, but the Decision 3 line says that only
outside-group descendants and the relay may survive. Helper death, adoption
after that death, premature reap, or cleanup after a restart can remove the
anchor in an ordinary frozen failure path. In those cases the direct root
and/or original-group members can also become `PRESERVED`. The line therefore
neither ratifies nor discloses the complete minimum surrender needed for an
implementable helper-loss path.

The design does not authorize signalling a PID or PGID after ownership is
lost, so this is not a P0. It is a P1 operator-commitment and capability-loss
defect.

This KO authorizes no implementation, integration, promotion, release,
D/0/07d gate, adapter/service/catalog splice, or operator decision.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | Every permitted original-group signal remains conditional on current direct-child ownership and an unreaped leader; loss of that condition requires preservation, not numeric lookup or signalling. |
| P1 | 1 | Decision 3 understates the minimum amendment and residual process-survival risk when its lifetime anchor is lost. |
| P2 | 0 | No additional advisory finding. |

## Finding

### P1-1 — Decision 3 omits root/original-group preservation when its anchor is lost

The candidate's signal safety rule is sound while its precondition holds:

- the accepted direct child is sealed with `pid == pgid == sid`
  (`design:92-98,129-136`);
- `C_G` may signal the sealed original group only while the helper still owns
  that live-or-unreaped child and before any leader reap
  (`design:150-159`);
- signalling is serialized as TERM/grace/KILL before reap, with no
  re-resolution (`design:343-359`); and
- if the invariant is unavailable, cleanup signals nothing by number and
  records the target `PRESERVED` (`design:358-363`).

That last rule conflicts with the operator line. Decision 3 says exact
direct-root/original-group retirement is retained and that **only**
outside-group descendants and a non-cooperative relay may remain alive
(`design:503`). The surrounding rule likewise calls that unanchored set “and
only that set” the amendment (`design:365-374`). Yet a `PRESERVED` target is a
terminal cleanup outcome after which ordinary completion may settle
(`design:160-163,476`).

Loss of the precondition is reachable in the frozen lifecycle, not merely a
theoretical malformed input:

- the helper/reaper is the direct parent in the frozen topology
  (`parent:99-148`);
- helper/reaper/supervisor death is an explicit revocation and settlement
  cause (`parent:486-493,716-724,899-901`); and
- once the original helper dies, its child is adopted elsewhere. A replacement
  or restarted helper does not inherit direct-parent ownership. Likewise, a
  leader reaped before the terminal group attempt no longer supplies the
  unreaped-child anchor.

In each case the design's safe rule is preservation. On Darwin, the direct
utility root itself may remain alive after adoption. On either platform,
members of its original group may remain unless they are authoritatively
known gone. A fresh PID/PGID observation cannot repair that loss without
reopening replacement signalling.

The smallest correction is to make the Decision 3 commitment and loss cell
say explicitly:

1. while the original helper still owns the live-or-unreaped child, forced
   retirement of the sealed original group remains mandatory;
2. if helper death, adoption, premature reap, restart, or another ownership
   loss makes that predicate false, no numeric signal is permitted and any
   unresolved direct root/original-group member is also `PRESERVED`;
3. outside-group descendants and the separate relay remain the unconditional
   preservation set already stated; and
4. isolated future proof obligations must show zero signal calls for
   post-sealing ownership loss, early reap, adoption, and restarted-cleaner
   cases.

If the operator is not asked to accept the second branch, that branch must
remain HARD FAIL and the design must explain how the frozen helper-loss
settlement can complete without accepting a process leak. The current text
does neither.

## Per-decision minimality ruling

| Decision | Smallest surrender that restores implementability under the frozen topology | Candidate ruling |
|---|---|---|
| 1B | Stop making the live relay tuple, current endpoint holder, and live tmux binding conditions of each stock stream operation; retain the exact accepted socket object, handshake/proof evidence, `G`/revocation ordering, and exact per-attempt counts. | Exact. A stock Linux/Darwin stream cannot atomically condition a byte range on those external mutable process/tmux properties. No broader socket-object or generation surrender is requested. |
| 2A | Replace only the stock separate metadata/capture authority with one atomic retained-server operation in a compatible custom default tmux, while retaining exact pane/session ownership and preserving the shared server, socket, and siblings. If the retained server capability is unavailable, unresolved owned IDs cannot be safely selected through a new public lookup. | Exact. The custom operation, default-server deployment cost, and retained-connection cleanup boundary are the minimum stated changes compatible with the unchanged literal attach command. |
| 3B | Preserve descendants outside the original group and the separate relay because they have no retained cross-platform target. Preserve the direct root/original group only when the helper-owned live-or-unreaped anchor itself has been lost; never replace that missing anchor with a name lookup. | Not ratifiable as written. The operative rules contain both necessary branches, but the decision line ratifies and discloses only the first while claiming exact root/group retirement without the anchor-loss qualification. |
| 4C | After `V`, close retained descriptors but perform no pathname `unlink`/`rmdir`; preserve every unresolved owned entry or same-name replacement. Normal pre-`ACCEPT` key consumption remains allowed. | Exact. Without compare-and-remove or exclusive custody, even a final matching observation leaves a replacement interval. |
| 5B | Define source authority at one retained-master read and write authority at one retained-master attempt, each ordered with `G`/`V`; retain exact PTY objects, sideband, counts, and sticky revocation, but surrender production-time provenance and live external facets that cannot condition the PTY syscall. | Exact. The candidate does not surrender the retained PTY object, channel, generation, or count boundary, and it states the read-time semantics precisely. |

## Truth audit of every loss cell

| Decision | Truth and completeness ruling |
|---|---|
| 1B | True and complete. The frozen live relay start/executable/argv/cwd/pgid/sid, current-holder continuity, no-handoff rule, and live tmux server/session/pane continuity cease to authorize transfer. A forked, inherited, or delegated holder of the original peer endpoint is accepted, and diagnostics cannot close the observation-to-I/O interval. The retained connected object still forbids a re-resolved pathname or different socket object. |
| 2A | True and complete. The operator must deploy and maintain the compatible custom default shared tmux; stock separate-command authority is lost. Shared server/socket/siblings remain outside port cleanup, and custom-server or retained-connection loss can leave the owned pane/session unresolved and `PRESERVED`. |
| 3B | Incomplete and partly false. Outside-group descendants and the separate relay really may survive, but they are not the only possible survivors. When direct-child ownership or unreaped status is lost, `design:358-363` also preserves unresolved direct-root/original-group targets. The unqualified statement that exact root/group retirement is retained is true only while the anchor exists. |
| 4C | True and complete. Residual or replacement key/socket/directory entries, children, secret material, names, inodes, and disk use may remain and block safe basename reuse; cleanup reports preservation instead of leak-free retirement. The shared tmux socket is correctly excluded from the owned ledger. |
| 5B | True and complete. Production-time producer/generation provenance and effect-time utility pid/start/bindingDigest/executable/argv/cwd/pgid/sid, helper/reaper/supervisor, terminal/tmux, foreground, winsize, and producer continuity beyond the retained PTY-object identity are lost. Pre-`ACCEPT`/pre-activation and mixed-writer/time ranges are accepted at read time; any slave holder can supply output, and writes can reach changed foreground/geometry. |

## Plain-terms residual risk after each amendment

| Amendment | What becomes possible that the frozen contract forbade |
|---|---|
| 1B | A replacement process that inherited or received the original peer endpoint can receive provider output, inject operator input, and acknowledge barriers as the accepted connection. Traffic may continue during an unobserved relay or tmux server/session/pane change. Bytes still cannot be redirected through a replaced pathname or a different socket object. |
| 2A | The port and unrelated user sessions share the operational blast radius of the maintained custom default tmux. A defect, skew, outage, or lost retained connection can make that shared service unavailable, and an unresolved port-owned pane/session can remain alive indefinitely. A conforming atomic capture still rejects changed identity, geometry, history, metadata, or `G`; stock commands are not an authority fallback. |
| 3B | Even with the anchor intact, a descendant that moves to another group in the same session or creates a new session, and a non-cooperative separately launched relay, may survive rejection indefinitely, retain credentials/files/fds, consume resources, perform filesystem/network effects, and spawn more work. If the original helper dies, the child is adopted, the leader is reaped early, or cleanup runs after a restart, unresolved direct-root/original-group processes may also survive because safe cleanup must preserve rather than signal a numeric name. The latter risk is missing from the ratification line. |
| 4C | An owned key, relay socket entry, runtime directory/child, or attacker-supplied same-name replacement can remain after settlement. Secret material and disk can accumulate, and stale or hostile names can deny safe reuse. Closing retained endpoints prevents the replacement name from becoming the old connection, but the namespace entry is deliberately left in place. |
| 5B | Bytes written by any slave holder before `ACCEPT`, before activation, or across different writers/times can be assigned to `G`, forwarded, rendered, and included in a snapshot even though the live utility or terminal binding changed. A prompt can be accepted by the retained master yet reach a different foreground job or geometry. The exact retained PTY object is preserved, but its current producer, consumer, and other live binding facets are not proved by the I/O effect. |

## Bounded Decision 3 precondition and failure-mode ruling

| State at cleanup | Authorized action | Operator consequence |
|---|---|---|
| Original helper still directly owns the child; the child is live or exited-but-unreaped; accepted `pid == pgid == sid`; no reap has occurred | Signal only the sealed original group with TERM/grace/KILL before reap. `ESRCH` means that exact anchored group is already absent. | Sound retained lifetime use. PID reuse and an unrelated group at that PGID are excluded while the anchor holds. |
| Original helper crashes | No numeric signal. If another authority does not already prove the targets gone, record them `PRESERVED`. | The direct root and/or original-group members can survive. Parent helper-loss settlement does not transfer child ownership. |
| Child is adopted by init or another subreaper | No numeric signal. Adoption proves that the original direct-parent predicate is false. | The adopted root/group can survive; a PID/PGID reread is diagnostic only. |
| Leader is reaped before the group attempt is terminal | No further numeric signal. Record any unresolved anchored target `PRESERVED`. | The design loses the non-reuse anchor; later equal numbers cannot authorize cleanup. |
| Cleanup is attempted by a restarted/replacement helper | No numeric signal. The new helper cannot treat sealed historical `childOwnership` or equal PID/PGID fields as current parenthood. | Unresolved root/group processes can survive; restart does not revive cleanup authority. |

The normative “only while” and preservation rules mean ratification does
not authorize a signal after the port loses ownership. I therefore found no
P0. The future proof table, however, covers ownership at sealing and
signal-before-reap ordering (`design:543-546`) but not post-sealing helper
death, adoption, early-reap fallback, or restart. Those cases belong in the
same P1 correction because they are the cases that make the omitted loss
real.

## HARD FAIL interlock check

The design-level interlock is complete:

- Decisions 1 and 5 leave their relay/PTY byte paths at HARD FAIL before the
  first affected byte while unratified (`design:235-237,653-654`).
- Decisions 1, 2, and 5 are all prerequisites for `READY(G)`, so no claim,
  port, observation, relay/PTY byte path, or capture is authorized without
  all three (`design:451,507-510`).
- Decisions 3 and 4 amend cleanup acceptance rather than a READY predicate,
  but the decision preamble and conclusion make all five one
  pre-implementation gate (`design:488-515,673-674`).

Thus there is no design-authorized partial path that succeeds after any line
is declined. This is a design ruling only; no runtime implementation exists
here to verify that it preserves the all-five gate.

## What I verified and did not verify

Verified:

- the complete candidate design and the complete Trial 4 reviewer-B verdict
  required by the brief;
- the Trial 5 request, frozen D/0/07, D/0/07b, and D/0/07c operative rules,
  including topology, relay acceptance, live binding, helper-loss
  classification, cleanup-before-settlement, and zero-leak requirements;
- the existing helper's direct-fork, `setsid`, nonreaping observation,
  group-signal, reap-order, and helper/reaper lifetime code as topology
  evidence only;
- each of the five amendments independently for minimum surrender, every
  loss cell, residual risk, Decision 3 ownership failure modes, the all-five
  interlock, and the design-only scope;
- that design commit `8463032` changes only
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`; and
- `git diff --check 099ac12 8463032`, which exited zero.

Not verified:

- no source, test, design, plan sheet, or implementation behavior was changed
  or exercised;
- no full CI, runtime gate, standalone kernel/socket/lock probe, live
  provider call, or tmux server/session was run;
- no Darwin host execution was available; the already-settled platform
  facility removals were not reopened;
- no future custom-tmux binary, wire operation, packaging, migration,
  cleanup lease, or failure behavior exists in this candidate to execute or
  certify;
- no integration, promotion, release, D/0/07d, adapter/service/catalog
  splice, or operator ratification was assessed; and
- reviewer A's concurrent Trial 5 verdict was neither sought, opened, nor
  used.

No check was interrupted by the provider content filter. The pre-existing
untracked `gateway/node_modules` directory was not touched.

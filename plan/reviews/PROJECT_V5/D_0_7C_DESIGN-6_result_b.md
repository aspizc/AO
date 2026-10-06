# Project V5 D/0/07c Design Trial 6 — reviewer B result

reviewed_KO

## Review boundary and outcome

I reviewed design commit
`2afee8abd8684a3266786640238b4b68ef7eccbe` against the adjudicated
Trial 5 base
`a26039421664b4452a5c4ff968bae7ca27056698`, the frozen D/0/07,
D/0/07b, and D/0/07c contracts, and the two prior reviewer-B verdicts
required by the brief.

Below, `design:` references mean
`plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`; `parent:`
references mean `plan/PROJECT_V5/D/0/07.md`.

The Trial 5 Decision 3 finding is closed by consequence, not merely by
word substitution. The corrected row now distinguishes the anchor-held and
anchor-lost cases, says that the direct root/original group can survive in
the latter, and names helper/reaper death, adoption after that death,
premature reap, and restarted cleanup. The operative rule still permits an
original-group signal only while the original helper currently owns the
live-or-unreaped leader and still requires preservation when that authority
is gone. I found no unsafe numeric fallback and no operative-rule change.

The table is nevertheless not ready for operator ratification. Its five
individual loss cells are materially true, but the document never states
their combined consequence as the one contract the operator is being asked
to approve. In particular, it does not tell the operator that Decision 5
bytes admitted from a changed producer/foreground can be rendered and later
appear in a successful Decision 2 atomic snapshot, because atomic capture
binds the capture instant and does not repair the provenance of state already
rendered. Nor does it say in one place that preserved port-owned tmux
objects, processes, and namespace entries can coexist after revocation and
that `PRESERVED` is terminal for the ledger, so ordinary completion may
still settle.

That omission creates a false aggregate assurance from individually accurate
rows, especially because Decision 2's strong atomic-capture language can be
read as preserving end-to-end snapshot trust that Decisions 1 and 5 have
already surrendered. This is one P1 operator-commitment disclosure defect,
not a P0 authority defect.

This KO authorizes no implementation, integration, promotion, release,
D/0/07d gate, adapter/service/catalog splice, or operator decision.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | The signal boundary, retained-object selection, generation ordering, and preservation fallbacks remain safe; no replacement target is authorized. |
| P1 | 1 | The ratification table does not disclose the aggregate active-workload and post-revocation outcome of approving all five amendments together. |
| P2 | 0 | No separate advisory finding. |

## Finding

### P1-1 — five accurate cells do not disclose the combined contract

The design explicitly makes all five decisions one ratification gate
(`design:502-511,521-528`). The table, however, presents only per-amendment
losses:

- Decision 1 accepts a delegated holder of the original peer endpoint and
  allows relay/barrier traffic during unobserved relay or tmux-binding drift
  (`design:515`);
- Decision 5 accepts pre-`ACCEPT`/pre-activation bytes, mixed writers/times,
  output from any slave holder, and writes to a changed foreground job or
  geometry (`design:519`);
- Decision 2 promises an exact current capture through the custom server
  operation (`design:516`);
- Decision 3 permits surviving processes in both the anchored and
  anchor-lost cases (`design:517`);
- Decision 4 permits residual or replacement namespace entries
  (`design:518`); and
- Decision 2 can additionally leave the port-owned pane/session
  `PRESERVED` when the retained server connection is lost (`design:516`).

The operative inventory connects the first three effects. Accepted PTY output
is forwarded through the Decision 1 socket (`design:470`), snapshot drain has
no transfer exception (`design:473`), and Decision 2 then captures the
rendered pane state (`design:475`). Consequently, a capture can be perfectly
atomic and match its current pane/process/geometry/history fields while its
rendered content includes bytes that Decision 5 admitted from a different
producer, production time, foreground job, or earlier binding state. A later
capture does not retroactively establish production provenance. No loss cell
or adjacent summary says that.

The cleanup interaction is likewise only implicit. The ledger may contain,
at the same time:

- an owned pane/session preserved after retained-server-connection loss;
- outside-group descendants and a non-cooperative relay preserved with the
  anchor held;
- the direct root/original-group members additionally preserved after an
  ordinary anchor-loss path; and
- key/socket/directory entries or replacements preserved by Decision 4.

Once every such entry is `RETIRED` or `PRESERVED`, cleanup reaches `REVOKED`
and ordinary completion may settle (`design:490`). The leftovers can keep
running, acting, consuming resources, occupying names/disk, or remaining
visible in the user's shared tmux after the port has rejected and completion
has settled. The operator table discloses the pieces, but nowhere assembles
that terminal system state.

The smallest correction is disclosure-only. Immediately below the five-row
table, add a stand-alone **combined effect of ratifying all five** statement
that says, in plain terms:

1. a replacement/delegated process holding the original peer endpoint can
   receive or inject bytes and satisfy barriers during unobserved drift;
2. retained-PTY reads/writes can admit stale or mixed-producer output and
   reach a changed foreground/geometry, and those effects can be rendered
   into a later otherwise-valid atomic snapshot;
3. outside-group descendants and the relay may survive with the anchor held,
   and helper/reaper death, adoption, premature reap, or restart can make the
   direct root/original group survive too;
4. namespace entries and port-owned pane/session objects can also remain; and
5. all of those `PRESERVED` outcomes may coexist and are terminal enough for
   ordinary completion to settle.

This correction must not weaken Decision 2's capture-time comparison, add a
numeric cleanup fallback, or change any other operative rule.

## The five lines in plain operator language

| Decision | What I would be agreeing to | What I would be giving up |
|---|---|---|
| 1B — relay transfer | Treat the exact connected socket object, its handshake/proof history, and live `G` as the transfer authority. Serialize every read, send, and barrier attempt with revocation and never reconnect or re-resolve it. | I would no longer require the accepted relay process, its full live tuple, its current fd ownership, or the historical tmux binding to still be current at each transfer. A forked, inherited, delegated, or replacement holder of that same endpoint may receive output, inject input, and acknowledge barriers during an unobserved drift. |
| 2A — custom tmux | Replace stock tmux 3.6 capture authority with a maintained Linux/Darwin custom tmux used as my default shared server. Its retained command must atomically compare the current owned pane/session/process, geometry, history, metadata, and `G`, return the bytes, and retire only the port-owned pane/session through that connection. | I would own the build, protocol, packaging, migration, and shared-server blast radius. The server, default socket, and unrelated sessions are never port-cleaned. Loss or failure of the retained custom connection may leave the owned pane/session alive and `PRESERVED`; stock commands are not an authority fallback. |
| 3B — process retirement | Force-retire the sealed original utility group only while the original helper still owns its live-or-unreaped leader, always signal before reap, and never re-resolve a PID/PGID. Preserve unresolved targets whenever that lifetime anchor is absent. | Even with the anchor held, escaped descendants and the separate relay can survive. After helper/reaper death, adoption, premature leader reap, or restarted cleanup, the direct root and original-group members can survive too. Any survivor can retain authority/resources, continue side effects, and spawn more work after rejection. |
| 4C — namespace retirement | Close exact retained descriptors after revocation but perform no post-`ACCEPT` pathname `unlink` or `rmdir`; preserve every remaining owned entry or same-name replacement. | Keys or key material, socket entries, directories and children, names/inodes, and disk use may remain and may deny safe basename reuse. Cleanup records preservation instead of satisfying the frozen leak-free criterion. |
| 5B — PTY authority | Treat one retained-master read or write syscall, ordered with `G`/`V`, as the authority boundary. Accept every byte returned by one read as belonging to `G`, and use exact per-attempt counts for writes. | I would give up production-time provenance and effect-time continuity of the utility, launch, helper/reaper/supervisor, terminal/tmux, foreground, winsize, and producer facets beyond the retained PTY objects. Pre-acceptance or pre-activation bytes, mixed writers/times, and any slave holder's output can be accepted; a prompt can reach a changed foreground job or geometry. |

Each restatement matches its operative rule. I found no per-row false
statement after the Decision 3 repair. P1-1 concerns what those rows mean
together.

## Decision 3 reachability ruling

The corrected Decision 3 disclosure passes the Trial 5 consequence test:

- with current direct-child ownership and an unreaped leader, exact forced
  retirement of the sealed original group remains mandatory
  (`design:343-361,483,517`);
- when either part of that anchor is gone, cleanup sends no numeric signal
  and unresolved direct-root/original-group targets become `PRESERVED`
  (`design:363-388,483,517`);
- the commitment and loss cells both name helper/reaper death, adoption after
  that death, premature reap, and cleanup after restart (`design:517`); and
- separate proof rows require zero signal calls and survivor liveness for
  post-sealing ownership loss, adoption, premature reap, and a restarted
  cleaner (`design:558-561`).

These are reachable lifecycle paths, not hypothetical PID-shape failures.
The frozen parent makes helper/reaper/supervisor loss an explicit revocation
and settlement cause (`parent:147-148,486-493,716,723-726,899-901`).
Death removes the original direct-parent authority; subsequent adoption does
not transfer it to a replacement helper. Premature reap removes the PID/PGID
lifetime anchor, and a restarted cleaner has historical ledger data but not
current child ownership.

An operator reading the Decision 3 row can now tell both what causes the
fallback and what survives. The remaining P1 is not a Decision 3 signal-rule
or row-completeness defect; it is the absence of the all-five aggregate
statement described above.

## Consolidated aggregate residual risk

After all five amendments, while `G` remains active, the system may transfer
provider/operator/barrier bytes through the original socket even though a
different process now holds the peer endpoint or the live relay/tmux binding
has drifted. It may read bytes produced before acceptance or activation, or
by mixed and unintended slave holders, and may write a prompt to a changed
foreground job or geometry. Those accepted effects can be forwarded and
rendered. A later custom-tmux capture can be correct and atomic for the exact
current pane while still returning pane content influenced by that changed
producer, foreground, geometry, or earlier terminal state.

After revocation, cleanup closes exact retained descriptors and retires exact
owned objects when it still has authority, but it may finish with all of the
following at once: escaped descendants or the relay still running; after
anchor loss, the direct root/original group still running; key/socket/runtime
entries or replacements still present; and, after retained-server-connection
loss, the port-owned pane/session still alive. The shared tmux server/default
socket and unrelated sessions are deliberately preserved in every case.
`PRESERVED` closes the finite ledger entry, so those residuals do not prevent
`REVOKED` and ordinary exactly-once completion.

The document contains every component fact in separate decision cells and
inventory rows, but it contains no consolidated operator-facing statement
of this combined active-workload and settled-cleanup state. The non-obvious
Decision 5-to-Decision 2 snapshot consequence is not stated in any one cell.
That is why the aggregate omission is a P1 rather than merely a request for a
convenience summary.

## Missing-loss and over-broad sweep

| Decision | Ruling |
|---|---|
| 1B | Individually exact and no broader than required. The retained connected object, handshake/proof evidence, `G` ordering, and exact counts remain; only live external process/holder/tmux conditions that stock streams cannot atomically enforce are surrendered. |
| 2A | Individually exact and no broader than required. It changes only stock separate capture authority, preserves exact current capture and owned-object selection, and discloses the custom-default shared-server cost plus owned-object preservation on connection loss. |
| 3B | Individually exact after this revision. It retains the bounded original-group capability while the anchor holds and surrenders it only when current ownership/unreaped authority is actually gone. No later PID/PGID lookup is admitted. |
| 4C | Individually exact. With no compare-and-remove primitive or exclusive custody, post-`V` preservation is the minimum safe rule. I did not reopen the settled namespace disclosure. |
| 5B | Individually exact and no broader than required. It retains the exact PTY objects, sideband, `G` order, counts, and stable-diagnostic error mapping while surrendering only provenance/live facets ordinary PTY syscalls cannot condition. |

I agree with the settled removal of options 1A/3A/4A/4B/5A, the 2A/2B
merge, Decision 4's disclosure, and the safety property that every permitted
original-group signal remains conditional on the live-or-unreaped
helper-owned leader. I found no additional per-cell loss omission and no
additional over-broad amendment. The sole missing loss is the combined
system-level consequence in P1-1.

## Ready-for-ratification statement

I would not sign this table yet, and it is **not ready for operator
ratification**.

Before ratification, add the stand-alone combined-effect disclosure specified
in P1-1 adjacent to the five decision rows. It must explicitly connect
accepted relay/PTY drift to rendered and snapshotted state, enumerate the
simultaneous process/namespace/owned-tmux residuals, and say that all may be
`PRESERVED` while ordinary completion settles. No operative authority,
cleanup target, ordering, public surface, or implementation scope needs to
change.

## What I verified and did not verify

Verified:

- the complete candidate design, then the complete Trial 5 reviewer-B result,
  then the complete Trial 4 reviewer-B result, in the order required by the
  brief;
- the Trial 6 request and the relevant frozen D/0/07, D/0/07b, and D/0/07c
  topology, identity, snapshot, helper-loss, cleanup, settlement, and
  leak-free rules;
- every one of the five operator lines cold, its matching operative rules,
  its individual surrender, and the cross-row active-workload and cleanup
  consequences;
- the Decision 3 anchor-held and anchor-lost branches, the ordinary
  reachability of each named loss path, and all four new isolated proof
  obligations;
- that every permitted original-group signal remains conditional on current
  ownership of the live-or-unreaped leader and that preservation remains the
  only fallback;
- that the candidate changes no source or test and that its design changes
  are disclosure, inventory, proof-specification, and closure text rather
  than a new signal authority; and
- `git diff --check` for the nominated candidate range, which exited zero.

Not verified:

- no source, test, design, plan sheet, or implementation behavior was changed
  or exercised by this review;
- no full CI, runtime gate, standalone kernel/socket/lock probe, live provider
  call, or tmux server/session was run;
- no Darwin host execution was available, and the already-settled platform
  facility removals were not reopened;
- no future custom-tmux binary, wire operation, packaging, migration,
  cleanup behavior, or failure behavior exists here to execute or certify;
- no implementation, integration, promotion, release, D/0/07d,
  adapter/service/catalog splice, or operator ratification was assessed; and
- reviewer A's concurrent Trial 6 verdict was neither sought, opened, nor
  used.

No check was interrupted by the provider content filter. The pre-existing
untracked `gateway/node_modules` directory was not touched.

# D/0/07c design — post-`ACCEPT` identity binding

## Status and decision

This is a design-only authorization boundary. It does not nominate the Trial 3
implementation at `590e053fd4b9476df8618809eb9ae81d9c713e2b` as a
candidate and it authorizes no code or test change. Reviewer B's result at
`2090e43cebc8b14c81eac9f7f878840382c964b3` and the independent
Design Trial 1 result at
`3149888ab1021a91053da4acf3d9cfd616a307f1` are inputs. Design Trial 2
reviewer A returned zero-finding OK at
`3d08808d5c73c23d10819ef90316fb20dded1ec8`; reviewer B returned KO at
`ed5960c4f7d84152e86f0e8bc84d51f0f439e78c`. The orchestrator adjudicated
the disagreement as KO. Design Trial 3 reviewers A and B both returned KO at
`d6e748188a426ae850fd6ab57c5fd27bbd530033` and
`1aa2eac06445dce19ce6455511ef723238b1bc26`. Design Trial 4 reviewer A
returned zero-finding OK at
`9e111a5485e320d4ee0e4d50d29f1657b75d57f8`; reviewer B returned KO with
two P1s and no P0 at
`099ac12e6362376972edbf15c6dc018f511ef8c0`. The orchestrator adjudicated
those two P1s as KO. Design Trial 5 reviewer A returned zero-finding OK at
`0e05d8b19daa944629a25c9bd0db249459d67dd3`; reviewer B returned KO with
one P1 and no P0 at
`a26039421664b4452a5c4ff968bae7ca27056698`. The orchestrator adjudicated
that P1 as KO. Both reviewers confirmed the bounded original-group signal
rule is safe while its retained lifetime anchor holds. This revision changes
no operative rule and addresses only reviewer B's incomplete operator
disclosure of the residual process-survival set when that anchor is lost.

The findings across implementation and design review have one cause: an
operation first observes an identity or mutable prerequisite and later
performs the effect, either through a re-resolved name or through a retained
descriptor whose other prerequisites can change. Another observation before
or after the action cannot remove that interval.

The current frozen contract cannot satisfy the rule below at five authority
boundaries:

1. stock Unix streams cannot condition I/O on the full live relay process
   tuple on both Linux and Darwin;
2. retained PTY descriptors do not make the frozen utility identity, PTY
   identity/dimensions, foreground equation, producer provenance, and live
   generation conditions of `read` or `write`;
3. stock tmux 3.6 does not return pane identity, width, height, history limit,
   metadata, and capture bytes in one indivisible operation, while the frozen
   contract requires separate metadata and capture direct-argv calls;
4. no cross-platform retained domain covers utility descendants which leave
   the original process group and the separately tmux-launched relay; the
   direct utility root and its original process group are the narrower
   exception because the helper owns the live-or-unreaped child whose
   accepted `pid == pgid == sid`; and
5. Linux and Darwin provide pathname `unlink`/`rmdir`, but no portable
   compare-identity-and-remove primitive for the relay key, relay socket, and
   owned runtime directory.

The default tmux server and socket are identity-bound but not port-owned. The
literal frozen `tmux attach -t <tmuxTarget>` selects the user's ordinary
server, which may contain unrelated sessions. Only the port-created accepted
pane/session are owned; whole-server destruction and tmux-socket removal are
forbidden.

The decision for those places is **HARD FAIL** under the current contract.
An undecidable identity is rejected; it is never accepted after another
check. Because that decision makes readiness, PTY writes, provider output,
ordinary relay transfer, and snapshots unavailable and preserves unresolved
processes or entries, it conflicts with frozen positive and leak-free
requirements. No absent cross-platform facility is offered as an
implementation option. The operator must explicitly approve the exact
contract/deployment amendments in
[Required operator decisions](#required-operator-decisions) before
implementation starts.

## The binding rule

> **While the accepted generation `G` is `ACTIVE`, a workload operation may consume bytes/state, write, capture, publish readiness, produce a sideband candidate, or settle a claim/session-port result only through the retained authority bound by `ACCEPT`; it MUST take the expected binding and `G` as conditions, compare them before a linearization point shared with revocation, and suppress that exact workload effect when either condition fails. A record which merely reports evidence after an effect is non-authorizing.**
>
> **The revocation point `V` permanently closes workload authority and atomically opens only the one-way cleanup authority `C_G` for the same immutable generation. `C_G` may act solely on exact retained cleanup targets while `G` is `REVOKING`/`REVOKED`; it can never publish readiness, transfer terminal/provider bytes, capture, settle success, revive `G`, or select a replacement.**

These two sentences are exhaustive and disjoint. Workload authority never
performs cleanup, and cleanup authority never performs workload.
Name-based observations may still be collected as diagnostics because they
cannot authorize: a diagnostic may cause REJECT, but it can never authorize
an effect, keep a generation active, or settle a result. In the binding
sentence, "consume bytes or state" means an authority-bearing read; a
diagnostic observation is not consumed as authority.
The frozen ordinary execution-completion settlement after cleanup is a
lifecycle settlement, not a workload result: it runs only after `REVOKED`,
cannot publish readiness or claim/session-port success, and has no cleanup
targeting authority.

Definitions:

- A **retained authority handle** is a kernel descriptor or a server
  connection whose object identity survives renames, PID/name reuse, and
  pathname replacement. A copied pathname, PID, process-group number, tmux
  target, pane id used on a new server connection, or `(st_dev, st_ino)` tuple
  is evidence, not a handle. For cleanup only, the helper's parent-owned
  live-or-unreaped direct utility child is also a retained lifetime anchor:
  acceptance sealed `pid == pgid == sid`, the helper has not reaped that
  child, and signalling is ordered before reap. While that invariant holds,
  the child PID cannot be reused and an unrelated process group cannot
  acquire its PGID; using that sealed value to address the original group is
  not a later PID/PGID lookup.
- A **generation** is the unrepeatable accepted-binding generation `G`.
  Terminal queue entries, relay input provenance, barrier tokens, capture
  records, retained sideband candidates, readiness records, and private
  responses carry or are module-privately bound to `G`. Revocation is sticky;
  no later matching lookup can revive it.
- A **conditional workload operation** takes the expected accepted
  identity, exact immutable byte range or state request, and `G`. A trusted
  authority outside the mutable subject's control compares every prerequisite
  and `G == ACTIVE`, establishes one linearization point while excluding
  revocation, performs the selected effect only on equality, and returns its
  exact committed count/state and evidence. A self-report, signed self-report,
  pre-read plus use, use plus post-read, or effect-then-report record is not
  authority.
- The helper/broker owns the effect-side state and one generation-authority
  critical section. Every queue admission, PTY attempt, relay transfer,
  barrier step, capture, readiness candidate, and provider-bearing sideband
  write, plus every effect-side revocation cause, is ordered there. A
  parent-side cancel or loss closes new/public admission immediately, but
  after dispatch it becomes effect-side revocation only when the helper
  processes the authenticated intent or observes the retained channel loss,
  matching the frozen `[D,F)`/`[F,R)` rules.
- Let `E` be one conditional effect's linearization point and `V` the
  generation's effect-side revocation point. If `E < V`, the exact positive
  count committed by that effect is authorized and cannot be retroactively
  erased. If `V < E`, or any expected identity differs at `E`, that effect
  commits zero bytes/state and returns the exact cause. A positive short
  write is one authorized effect; every retry/remainder is a new conditional
  effect and therefore has a new `E`. Revocation waits for an already
  linearized effect to report its exact count, and a later effect waits for
  revocation.
- Every cleanup target is sealed before activation, either at `ACCEPT` or
  when that exact owned object is created, as
  `{G, kind, retainedHandle-or-NONE, immutableOwnedIdentity, PENDING}`.
  `NONE` means that target can only become `PRESERVED` unless it is already
  authoritatively known gone. The direct-child cleanup target instead seals
  `{childOwnership, unreaped, pid == pgid == sid}` before activation. No
  pathname, arbitrary/later PID or PGID, public tmux target, newly opened
  server connection, or later identity record can enter this ledger.
- `V` is one atomic state transition:

  ```text
  ACTIVE/workload-open/cleanup-dormant
      -> REVOKING/workload-closed/cleanup-open(C_G)
  ```

  There is no `E == V` case. The generation lock totally orders every
  workload `E`, then `V`, then cleanup points `C1..Cn`. A workload point after
  `V` commits zero; a cleanup point before `V` commits zero. Cleanup points
  require the exact same `G`, state `REVOKING` or `REVOKED`, the sealed target
  still `PENDING`, and the original retained handle/owned identity. They do
  **not** require `G == ACTIVE`.
- `C_G` is one-way and least-authority. It may directly
  `shutdown`/`close` retained descriptors, retire the exact owned tmux
  pane/session through the retained shared-server connection, signal the
  sealed original utility process group only while the helper still owns its
  live-or-unreaped direct child and before any reap of that leader, or record
  `PRESERVED` when exact authority is unavailable. Each target moves once
  from `PENDING` to `RETIRED` or `PRESERVED`; repeats are inert. It may not
  reconnect, reopen, re-resolve, signal any arbitrary/later numeric target,
  remove a pathname, kill a tmux server, remove a tmux socket, or turn any
  target/result back into active authority.
- Parent settlement follows the frozen lifecycle: workload/public admission
  closes at `V`; cleanup completes its finite ledger in
  `REVOKING`/`REVOKED`; only then may ordinary completion settle. A preserved
  target is an explicit rejected cleanup outcome, not success or revival.
- **REJECT** is an effect-level outcome, not one universal public error. It
  means the selected effect commits zero bytes/state, the exact cause is
  classified under the frozen parent table, and `G` becomes sticky-revoked.
  Before the first positive PTY write `F`, process/launch/helper mismatch is
  `SESSION_PORT_IDENTITY_CHANGED`, foreground mismatch is
  `SESSION_PORT_NOT_FOREGROUND`, PTY/pane/relay identity or dimension mismatch
  is `SESSION_PORT_TERMINAL_CHANGED`, and known component loss is
  `SESSION_PORT_TERMINAL_CLOSED`. Generic snapshot failure remains
  `SESSION_PORT_SNAPSHOT_FAILED`.
- After an earlier authorized positive PTY prefix `F`, a later conditional
  effect can commit zero additional bytes but cannot undo that prefix. The
  public write is `SESSION_PORT_WRITE_ABORTED`, all later write attempts stop,
  and the prefix is never reported as success. Thus "zero bytes" below always
  describes the rejecting effect or a rejection before `F`, never a promise
  to roll back an earlier authorized effect. The parent settlement interval
  and exact `ASP1` dispositions remain authoritative; no new public error is
  introduced.
- For destructive cleanup, **REJECT** additionally means preserve the
  unresolved entry or process. Cleanup must never delete or signal a
  replacement merely to satisfy a no-leak assertion.

## Rules derived from the binding rule

### R1 — retained terminal and sideband transfer

Terminal/provider-bearing transfer uses only the accepted relay socket
descriptor and retained PTY descriptors. This scope does not forbid the
frozen private control plane: an `ASP1` request uses retained fd 4 and a
response uses retained fd 5, with the exact binding tag, sole in-flight
sequence, and module-private `G`/channel binding. No post-`ACCEPT` transfer may
reconnect to a relay path, reopen a PTY name, replace fd 4/5, look up a PID, or
substitute a later tmux target.

A conditionally admitted relay-input queue entry is exactly:

```text
immutable input bytes
accepted generation G
immutable relay-input effect/provenance record for those bytes
```

The queue accepts and takes that entry only under the generation-authority
critical section for the same live `G`; broker/operator PTY writes consume
the provenance record as well as the bytes. Programmatic prompt entries are
distinguished by their authenticated fd-4 `ASP1` request provenance and do
not manufacture a relay record.

`SO_PEERCRED` or Darwin peer evidence binds the accepted descriptor at
handshake time. It does not turn later PID/process lookups into a capability.
Loss or revocation of a retained terminal or sideband endpoint rejects the
next selected effect with its parent-defined interval disposition.

### R2 — mutable properties come from the effect or reject

If permission for any post-`ACCEPT` effect depends on a mutable property, the
trusted conditional authority must receive the expected property and `G`,
compare both before `E`, suppress the effect on failure, and return the exact
committed count/evidence. Separate before/after readers and post-effect
records are diagnostic only and cannot authorize.

The full frozen relay and PTY prerequisite sets are not implementable as
conditional Linux/Darwin stream/PTY effects:

- Unix `recv`/`send` cannot condition I/O on another process's live
  start/executable/argv/cwd/pgid/sid; a helper-side lock excludes `V`, not
  relay mutation between inspection and I/O.
- A POSIX PTY master exposes an undifferentiated byte stream. It has no
  production-time writer PID/generation, foreground equation, winsize, or
  utility/helper identity attached per byte, and `os.write` cannot
  conditionally compare those fields.

Therefore there is no full-strength Decision 1 or Decision 5 facility option.
Until their explicit parent amendments are ratified, readiness and every
dependent relay/PTY effect HARD FAIL before its first affected byte.

After the Decision 1 amendment, relay workload authority is exactly:

```text
original accepted connected-socket object
handshake-time kernel pid/uid/gid
successful single-use ASR1 proof
accepted tmux server/session/pane IDs as historical binding
live generation G
```

Each nonblocking receive/send byte range and complete barrier envelope runs
under the generation lock and returns its exact committed count. Live relay
start/executable/argv/cwd/pgid/sid and current descriptor holder are no longer
authority prerequisites. The no-fork/no-daemonize/no-socket-handoff promise
remains a desired relay behavior but is removed as a post-`ACCEPT` security
guarantee: delegation of the original connected descriptor is
indistinguishable and is accepted as the same connection authority. Stable
diagnostics may still revoke, but they can never authorize or close a
mutation-to-I/O race.

After the Decision 5 amendment, PTY workload authority is exactly:

```text
original retained PTY master/slave objects and ACCEPT-time dev/ino/rdev
historical authenticated readiness utility pid/start/bindingDigest
historical helper/reaper/supervisor and terminal binding
retained authenticated fd-4/tag/sequence channel
live generation G
```

The source unit is **one nonblocking retained-master read at read time**, not
production-time per-byte provenance. If `E_read < V`, every byte returned by
that one syscall is assigned to `G` regardless of which slave holder produced
it or when it entered the kernel buffer. This expressly includes bytes
buffered before `ACCEPT`/activation and a returned range containing bytes
written at different times or by different processes. If `V < E_read`, no
read occurs. A read cannot straddle the ordering: revocation waits for an
already linearized syscall result, and the next read is suppressed.

Each write attempt similarly uses the original retained master under the
generation lock and returns its exact count; every positive short
write/retry has a new `E`, with the first positive count still `F`.
Live utility/helper/reaper/supervisor identity, foreground job, winsize, and
producer identity are diagnostic only after this amendment. A diagnostic
mismatch observed before `F` retains the frozen public cause, and a later
rejection after `F` remains `SESSION_PORT_WRITE_ABORTED`, but a change between
diagnostic observation and retained-PTY I/O is no longer prevented. Output
from any process holding the slave may be accepted, and a prompt may reach a
different foreground generation or geometry.

For an approved future atomic capture record, the record must contain, under
one retained tmux-server connection and one server operation:

```text
accepted generation
tmux server identity
session identity
pane identity and pane process identity
pane width and height
configured history limit
history_size, pane_height, cursor_y
the exact capture bytes
```

Decision 2's sole buildable positive option is a maintained custom tmux
client/server build for Linux and Darwin with one versioned retained-
connection command, `agents-capture-v1`. While the helper holds the
generation lock, the server command atomically compares the expected
server/session/pane/process IDs, exact `120x40`, history limit `400`, and
metadata in the server event loop, then captures the accepted pane and returns
the complete record above. The helper binds that response to `G` at
`E_capture`. A mismatch or `V < E_capture` accepts no captured state; a record
linearized before `V` remains only a settlement candidate.

This option amends the frozen stock tmux 3.6 separate metadata/exact
`capture-pane` authority mechanism and requires building, packaging,
configuring as the user's default `tmux`, and maintaining the custom
client/server runtime on both platforms. Merely sequencing stock commands is
not conforming. Missing, malformed, or contradictory evidence rejects the
whole record before canonicalization or settlement.

### R3 — destructive action requires a retained destruction capability

`C_G` makes direct `shutdown`/`close` of the sealed relay, PTY, fd 0, fd 3,
fd 4, and fd 5 descriptors reachable after `V`; descriptor identity, not
`G == ACTIVE`, selects those effects.

There is no retained cross-platform dynamic target covering every utility
descendant and the separately tmux-launched relay. Linux cgroup/pidfd
mechanisms are partial, Darwin supplies no general dynamic descendant domain,
and the relay is outside the utility tree. This does **not** remove the
narrower authority already created by the frozen topology:

```text
helper is the direct parent and still owns the child
accepted utility pid == pgid == sid
the child is live or exited-but-unreaped
no leader reap may occur before original-group signalling is terminal
```

Linux `WNOWAIT` and Darwin kqueue exit observation do not reap the child, and
cleanup excludes that leader from nonblocking reap until the group attempt
is terminal.

That sealed invariant is an exact lifetime anchor on Linux and Darwin. The
live-or-unreaped child retains its PID, and another session cannot place an
unrelated process into or create a group with that PGID. `C_G` therefore
retains mandatory forced retirement of the utility root and every member
still in its original process group. Under one cleanup/reap mutex it:

1. keeps the direct child owned and unreaped;
2. addresses the original group with the sealed child PID, first with
   `SIGTERM` and, after the frozen grace interval, with `SIGKILL`;
3. treats `ESRCH`/`ProcessLookupError` as that exact group already absent and
   performs no re-resolution; and
4. permits the utility leader to be reaped only after the exact group signal
   attempt is terminal, then records the leader/original-group cleanup target
   `RETIRED` from that attempt and the owned-child reap result.

This is the only permitted numeric process/group target. A fresh
`process_identity()` result is diagnostic and cannot select it. If the
parent-owned/unreaped invariant is unexpectedly unavailable, cleanup signals
nothing by number, rejects that target, and records it `PRESERVED`; losing
the invariant is a cleanup failure and never permits a numeric fallback.
Decision 3 must nevertheless ratify and disclose that unresolved
utility-root/original-group processes become `PRESERVED` on that failure
path.

Descendants which leave the original process group—whether for another group
in the same session or a new session—and the separately tmux-launched relay
have no equivalent retained cross-platform target.

Cleanup closes their retained descriptors and permits cooperative exit, but
never calls `_signal_exact`, `kill(pid)`, or `kill(-pgid)` for those
unanchored targets. Unresolved outside-group descendants and a
non-cooperative relay are `PRESERVED` and may continue running, consuming
resources, and producing side effects. While the original helper still owns
the live-or-unreaped direct child, those outside-group descendants and the
relay are the residual survival set and exact retirement of the sealed
original group remains mandatory. If the original helper or reaper dies, the
child is adopted after that death, the leader is reaped prematurely, or
cleanup runs after a restart, the ownership/unreaped anchor is unavailable.
Cleanup then sends no numeric signal and unresolved direct-root/original-group
members may also survive as `PRESERVED`. Decision 3's parent-acceptance
amendment comprises both the anchored and anchor-lost residual sets.

Tmux identity and ownership are separate:

- The accepted `%pane_id` and `$session_id` are recorded when this port
  creates them and are sealed in `C_G` as **owned** objects.
- The retained connection identifies the exact tmux server, but the literal
  `tmux attach -t <tmuxTarget>` uses the user's ordinary server. That server,
  every unrelated sibling session, and its default socket are **shared,
  not owned** by the port.
- After `V`, `C_G` may issue `kill-pane -t %owned` and
  `kill-session -t $owned`, as applicable, only on the retained server
  connection. Tmux 3.6 lifetime-stable IDs cannot select replacements. An
  authoritative retained-server result that an owned lifetime ID was already
  retired, or that retiring the owned session also retired its owned pane,
  marks the corresponding entries `RETIRED`. Loss of the retained connection
  marks unresolved entries `PRESERVED`; cleanup never re-resolves a public
  target.
- `kill-server` is forbidden. The shared server and socket are always
  preserved, including when no unrelated session remains. A sibling-session
  survival oracle is mandatory.

Portable exact namespace removal is likewise unavailable. Linux and Darwin
pathname removal selects a basename; modes/ACLs cannot reserve mutation to
one process among arbitrary same-uid actors in the frozen topology. There is
no conditional-object or exclusive-custody removal option. The post-`ACCEPT`
ledger records only these port-owned relay entries:

| Entry | Sealed identity and cleanup outcome |
|---|---|
| Relay key file | Exact no-follow regular file, helper euid, mode `0400`, size 32, `st_dev`, and `st_ino`. Normal relay consumption removes it before `ACCEPT`; if absent, the ledger records `RETIRED`. If any owned or replacement entry remains, cleanup performs no pathname removal and records `PRESERVED`. |
| Relay socket entry | Exact socket, helper euid, mode `0600`, `st_dev`, and `st_ino`, paired with retained socket descriptors. Cleanup closes descriptors but performs no `unlink`; any residual or replacement entry is `PRESERVED`. |
| Owned runtime directory | Exact directory, helper euid, mode `0700`, `st_dev`, and `st_ino`, plus retained directory/parent handles. Cleanup performs no `rmdir`; the directory, residual children, or a replacement are `PRESERVED`. |

The default tmux socket is absent from this owned-entry ledger because it is
shared infrastructure, not a port-created removal target. Decision 4 must
amend the frozen no-key/no-relay-socket/no-runtime-directory-leak criterion.
Residual secret/name/disk artifacts may remain and block future basename
reuse. A same-name replacement is never removed.

### R4 — sticky workload revocation and one-way cleanup

Revocation permanently closes one accepted generation. No restored cwd,
geometry, history value, pathname, PID, tmux target, or equal-looking
replacement can reactivate it. A queue item, barrier acknowledgement, capture
record, readiness record, or private response produced for a revoked or
different generation cannot commit a public result.

The effect-side generation lock supplies the disjoint order defined above:
zero or more workload points `E1..En`, then exactly one `V`, then the finite
cleanup ledger's points `C1..Cm`. At `V`, `G` becomes `REVOKING`, workload
authority closes permanently, and `C_G` opens for the already sealed targets.
When every cleanup target is terminal (`RETIRED` or `PRESERVED`), `G` becomes
`REVOKED`. Repeated cleanup calls may observe that terminal ledger but perform
no second effect. Thus cleanup is reachable only because `V` happened, never
while `G` is `ACTIVE`, and it cannot overlap a workload effect.

The parent settlement lock separately orders FIFO admission, local
cancel/revocation, validation of exact fd-5 `ASP1` responses, claim/readiness,
and public result `R`. A candidate effect or response validly produced at
`E < V` may exist in a private buffer, but it cannot settle after parent
revocation wins at `R`. Conversely, parent revocation after dispatch does not
falsely claim that an earlier `E < V` short-write prefix was absent; it uses
the frozen abort interval. Ordinary completion settles exactly once only
after `G == REVOKED` and the cleanup ledger is complete.

`C_G` cannot acquire workload authority or settle a success/error itself. It
cannot move `REVOKING`/`REVOKED` back to `ACTIVE`, create a new generation,
replace a sealed cleanup target, or turn `PRESERVED` into `RETIRED`. This rule
does not authorize an operation that fails R1–R3; it supplies the two
non-overlapping orders and prevents a late result, cleanup callback, or
replacement from reviving one.

## Complete post-`ACCEPT` site inventory

| Site | Object or effect | Governing rule | Required outcome |
|---|---|---|---|
| Publish private readiness | Accepted historical bindings, retained fd 3, the exact retained socket/PTY/tmux authorities approved by Decisions 1, 2, and 5, and `G` | R1, R2, R4 | `activate(G, expectedBinding)` runs under the workload lock and emits one authenticated provider-free `READY(G)` candidate only at `E_ready < V`. Diagnostics observed before that point retain the frozen cause ranking. Missing or unratified authority emits no candidate, commits `V`, and rejects the waiting `claim`; it exposes no port or observation. |
| Receive operator input from the relay | One bounded byte range on the original accepted connected socket | R1, R2, R4 | After Decision 1, one nonblocking read and queue admission linearize under live `G`; the immutable bytes, `G`, and accepted-connection provenance enter the queue together. A read after `V`, a different descriptor, or a failed stable diagnostic admits zero bytes. No effect-time live relay-process/current-holder assertion is made. |
| Forward broker/operator input to the provider | One accepted queue entry written through the original PTY master | R1, R2, R4 | Consume the same live-`G` entry and make one retained-master write attempt. Each exact positive count is one `E`; a remainder is a new attempt. A diagnostic mismatch observed before `F` retains its exact frozen disposition; after `F`, rejection is `SESSION_PORT_WRITE_ABORTED`. Under Decision 5, a change after the diagnostic but before `E` is an expressly accepted loss. |
| Programmatic prompt write | Authenticated fd-4 `ASP1` frame written through the original PTY master | R1, R2, R4 | Require retained fd 4, exact tag/sequence/private-channel-to-`G` binding, then use the same Decision-5 retained-master attempts. D/0/07b still owns framing, FIFO, exact partial counts, cause ranking, and post-`F` abort settlement. |
| Read provider output from the PTY | One nonblocking read from the original retained PTY master | R1, R2, R4 | After Decision 5, the read itself is `E_read`. It may run only while `G` is `ACTIVE`; every byte returned by that syscall is assigned to `G`, including bytes buffered before `ACCEPT`/activation, bytes from any slave holder, and one range containing different producers or production times. `V < E_read` performs no read. Revocation waits for a linearized read to return and suppresses the next read. |
| Forward accepted provider output to the relay | One immutable Decision-5 read range sent on the original accepted socket | R1, R2, R4 | After Decision 1, one nonblocking send attempt runs under live `G` and returns its exact count. A positive short send authorizes only that prefix; every remainder has a new `E`. There is no effect-time full relay-process/current-holder check. |
| Send relay flush-barrier request | Exact complete barrier envelope on the accepted socket | R1, R2, R4 | With forwarding paused, send the whole envelope under the workload lock for live `G`. A partial send is not an acknowledgement and each continuation has its own `E`; `V` suppresses every not-yet-linearized attempt. |
| Receive the relay flush-barrier acknowledgement | Exact token acknowledgement on the accepted socket | R1, R2, R4 | A separate retained-socket read accepts only the complete expected token for the privately bound `G`. Input seen while waiting uses the ordinary input-admission row. The forwarding pause remains held through atomic capture or abort. |
| Drain output before snapshot | PTY read plus relay send | R1, R2, R4 | Apply the two ordinary read-time PTY and retained-socket rows. Snapshot has no transfer exception. |
| Observe live relay, utility, helper, PTY, foreground, geometry, history, or tmux state outside an effect | Diagnostic evidence | R2 | A stable mismatch may commit `V` with the frozen cause, but equality never authorizes a later effect and cannot revive `G`. Decision 1 removes live relay facets and Decision 5 removes live utility/helper/reaper/supervisor/foreground/winsize/producer facets from effect-time authority. |
| Capture rendered pane state | One `agents-capture-v1` complete record on the retained custom tmux connection | R2, R4 | After Decision 2, the custom server operation atomically compares the exact server/session/pane/process IDs, `120x40`, history limit `400`, metadata, and `G`, and returns the capture bytes in that same `E_capture`. Stock separate metadata and `capture-pane` calls are not authority. Mismatch or `V < E_capture` accepts no record. |
| Canonicalize capture bytes | Pure transformation of an accepted complete record | R2, R4 | Run only after record acceptance. The frozen byte algorithm and its real-host figures are unchanged. |
| Write a private snapshot/write response | Exact fd-5 `ASP1` response bytes | R1, R4 | Use only retained fd 5, exact tag, sole in-flight sequence, and private `G` binding. Each sideband write attempt is a workload `E`; partial or malformed private output never becomes a partial public result. |
| Settle a private snapshot/write result | Validated response candidate at public `R` | R4 | Under the parent settlement lock, settle only a complete response for the same still-`ACTIVE` `G`. A candidate produced before `V` but presented at `R` after `V` is discarded. |
| Commit issued port and `observation` | `claim` and inert `{sessionId,tmuxTarget,attachCommand}` | R1, R4 | Commit once from the authenticated `READY(G)` candidate while the same `G` is active. The DTO grants no helper authority; a later local attach is separate external R/W authority whose bytes re-enter the governed relay/PTY paths. |
| Commit revocation | Workload authority and sealed cleanup ledger for `G` | R4 | `V` atomically changes `ACTIVE/workload-open/cleanup-dormant` to `REVOKING/workload-closed/cleanup-open(C_G)`. No workload effect occurs at or after `V`; no cleanup effect occurs before it. |
| Send `RELAY_DATA_CLOSE` | Protocol write during teardown | R2, R3, R4 | Never send it. Before `V` it is unnecessary workload; after `V`, `C_G` has no protocol-write authority. Retire the endpoint by direct retained-descriptor shutdown/close. |
| Close relay, PTY, fd 0, fd 3, fd 4, and fd 5 descriptors | Sealed retained handles | R3, R4 | At cleanup points after `V`, `C_G` directly shuts down/closes each exact retained handle once and marks its ledger target `RETIRED`. It does not require `G == ACTIVE`, relookup, or a live process tuple. |
| Retire the direct utility root and its original process group | Sealed helper-owned live-or-unreaped child with accepted `pid == pgid == sid` | R3, R4 | At `C > V`, while current direct-child ownership and the unreaped-leader condition both hold, keep the leader unreaped while signalling the sealed original PGID with `SIGTERM`, the frozen grace interval, then `SIGKILL`. `ESRCH` means the exact group is already absent. Never re-resolve the PID/PGID; reap the leader only after the group-retirement attempt is terminal, then mark the anchored target `RETIRED` from that attempt and owned-child reap. If either anchor condition is unavailable, send no numeric signal and mark every unresolved direct-root/original-group target `PRESERVED`. |
| Retire descendants outside the original process group and the relay process | No exact cross-platform retained destruction target exists | R3, R4 | Close retained descriptors and permit cooperative exit. If a target is authoritatively known gone, mark it `RETIRED`; otherwise mark it `PRESERVED`. Never signal an arbitrary/later PID or PGID. Preserved descendants in another same-session group or a new session, and a non-cooperative relay, may keep running, consuming resources, and causing side effects. |
| Retire the owned tmux pane and session | Sealed `%pane_id`/`$session_id` on the retained shared-server connection | R3, R4 | At `C > V`, issue only the applicable `kill-pane -t %owned`/`kill-session -t $owned` through that retained connection. The authoritative result may mark an already-gone exact lifetime ID, or a pane retired with its owned session, `RETIRED`; lost connection/unresolved identity is `PRESERVED`. No public target is re-resolved and repetition is inert. |
| Retire tmux server or socket | Shared user infrastructure, not a port-owned cleanup target | R3, R4 | Never issue `kill-server` and never unlink the default tmux socket. The exact retained server remains alive; every unrelated sibling session must survive cleanup. |
| Retire a still-linked relay key | Sealed owned-entry record | R3, R4 | Normal single-use consumption before `ACCEPT` may already make it `RETIRED`. At `C > V`, no pathname removal is authorized; an extant owned entry or replacement is `PRESERVED`, with no `unlink`. |
| Retire the relay socket entry | Sealed owned-entry record plus closed retained sockets | R3, R4 | Close the descriptors, but perform no pathname `unlink`. Any residual owned entry or same-name replacement is `PRESERVED`. |
| Retire the owned runtime directory | Sealed owned-entry record | R3, R4 | Perform no pathname `rmdir`. The residual directory, unexpected children, or a replacement is `PRESERVED`. |
| Complete cleanup and ordinary settlement | Finite sealed ledger and `G` | R4 | After every target reaches `RETIRED` or `PRESERVED`, transition `REVOKING` to `REVOKED`; only then may the existing completion settle exactly once. Cleanup cannot publish success, issue a port, or revive workload. |

`activate(G, expectedBinding)` and `READY(G)` are design notation for the
internal activation transition and the already-frozen provider-free
bootstrap/readiness metadata. They add no method, `ASP1` opcode, header field,
wire frame, or port surface; `G` remains module-private and is bound to the
retained channel/tag.

Polling diagnostics, normalizing bytes in private memory, parsing a frame,
and computing a binding tag are not authority effects. Their first subsequent
workload transfer/capture/settlement or cleanup action is covered above.

## Required operator decisions

The five full frozen guarantees have no second, full-strength Linux-and-Darwin
implementation branch under the frozen topology. The former 1A, 3A, 4A, 4B,
and 5A rows were specifications for absent facilities and are removed; the
former 2A/2B rows described the same custom transport and are merged.
Consequently **only explicit contract/deployment amendments remain**.
Each line below is a separate ratifiable parent amendment, and its stated
capability loss is part of that individual decision. Approval or decline of
one line does not decide another. Partial approval authorizes no D/0/07c
implementation: this leaf remains at HARD FAIL until every requirement has
an approved amendment or another conforming solution. The independent
meaning and concrete decline cost of each line are stated below the combined
disclosure.

| Decision | Sole ratifiable option | Ratification commits the operator to | Deployment cost and capability lost |
|---|---|---|---|
| 1. Relay transfer authority | **1B — retained-socket/read-range amendment** | Amend the parent so authority after `ACCEPT` is exactly the original connected-socket object, handshake kernel pid/uid/gid, successful single-use `ASR1` proof, historical accepted tmux server/session/pane IDs, and live `G`. Every nonblocking read/send range and barrier step shares the workload `E`/`V` lock and returns its exact count; reconnect/re-resolution is forbidden. | Portable with stock Linux/Darwin sockets, but live relay start/executable/argv/cwd/pgid/sid, current descriptor-holder continuity, and effect-time continuity of the accepted tmux server/session/pane binding are lost. The no-fork/no-daemonize/no-socket-handoff rule becomes desired behavior, not enforceable transfer authority: delegation of the original descriptor is accepted. Relay input/output and barrier traffic may continue on that socket during unobserved relay or tmux-binding drift. Diagnostics may revoke when they observe drift but cannot close either race. |
| 2. Atomic tmux capture and owned-object retirement | **2A — maintained custom shared-server tmux amendment** | Amend the frozen stock separate metadata/`capture-pane` authority mechanism to a maintained Linux-and-Darwin tmux client/server build with the versioned retained-connection command `agents-capture-v1`. In one server-event-loop operation it compares exact server/session/pane/process IDs, `120x40`, history limit `400`, metadata, and `G`, then returns the capture bytes. The same retained connection may retire only the port-created `%pane_id`/`$session_id`. | Build, package, deploy, configure, and maintain the custom binary/protocol as the user's default tmux on both platforms, including compatible upgrade/migration of the ordinary shared server so the exact literal `tmux attach -t <tmuxTarget>` stays unchanged. Stock tmux 3.6 separate-command compatibility as the authority mechanism is lost. The shared server/default socket and unrelated sessions are never port-cleaned; `kill-server` and socket unlink are forbidden, and a sibling-session survival oracle is mandatory. A defect, protocol skew, outage, or loss of the retained custom-server connection can affect that shared server and leave the port-owned pane/session unresolved and `PRESERVED` indefinitely. |
| 3. Process/tree retirement | **3B — bounded process-preservation amendment** | While the original helper owns the live-or-unreaped child sealed with `pid == pgid == sid`, retain mandatory forced retirement of the direct utility root and every member still in its original process group: serialize `SIGTERM`/grace/`SIGKILL` before leader reap and treat `ESRCH` as the exact group already absent. Descendants that left that original group, whether for another group in the same session or a new session, and the separately tmux-launched relay are unconditionally subject to descriptor close, cooperative exit, and unresolved `PRESERVED`. If any of these paths makes the ownership/unreaped anchor unavailable—helper or reaper death; adoption after that death; premature leader reap; or cleanup after a restart—send no numeric signal and record unresolved direct-root/original-group targets as `PRESERVED` too. Arbitrary/later PID or PGID lookup/signalling remains forbidden. | Portable without a new dynamic process-containment topology. **Anchor held:** exact forced retirement of the direct root/original group is retained; only outside-group descendants and a non-cooperative relay may survive indefinitely. **Anchor lost:** after helper or reaper death, adoption after that death, premature reap, or cleanup after a restart, the direct root and original-group members may also survive as `PRESERVED`. Every survivor may retain resources/credentials/fds, continue side effects, and spawn more work after the port rejects. |
| 4. Owned namespace retirement | **4C — namespace-preservation amendment** | Amend the no-key/no-relay-socket/no-runtime-directory-leak criterion. Normal pre-`ACCEPT` key consumption may retire the key; after `V`, cleanup closes retained sockets but performs no pathname `unlink` or `rmdir`, records every extant owned or replacement key/socket/directory entry as `PRESERVED`, and never removes a same-name replacement. The shared tmux socket is not an owned entry. | Portable without a conditional filesystem primitive or new privilege topology, but residual key material, relay socket names/inodes, directories/children, and disk use may remain and may block safe basename reuse. Cleanup reports preservation rather than leak-free success. |
| 5. PTY source/write authority | **5B — read-time retained-PTY amendment** | Amend the parent so authority is the original retained master/slave objects and `ACCEPT` dev/ino/rdev, historical authenticated readiness utility pid/start/binding digest, historical helper/reaper/supervisor and terminal bindings, retained fd-4/tag/sequence channel, and live `G`. One nonblocking master read at `E_read` assigns every returned byte to `G`, including pre-`ACCEPT`/pre-activation buffered bytes and ranges spanning producers or production times. Reads run only after activation; `E_read < V` returns its exact range, `V < E_read` reads zero, and revocation waits for an already linearized syscall. Each retained-master write attempt has the same `E`/`V` and exact-count rule. | Portable with ordinary PTYs, but production-time producer/generation provenance and effect-time continuity of utility `pid`/`startToken`/`bindingDigest`/executable/argv/cwd/pgid/sid, the issued helper/reaper/supervisor and terminal/tmux binding facets beyond retained PTY-object identity, foreground, winsize, and producer identity are lost. The original retained PTY objects remain exact, but their I/O may pass after an unobserved change in any other listed facet. Bytes buffered before `ACCEPT` or activation and ranges spanning mixed writers/times are assigned to `G`; output from any slave holder may be accepted, and a write may reach a different foreground job or geometry. Stable diagnostics retain frozen error mapping but do not close diagnostic-to-I/O races. |

### Combined effect of ratifying all five

Approving all five amendments permits their losses to compose in one
generation; the individual guarantees above are not an end-to-end provenance
guarantee:

- While `G` is active, a delegated, inherited, forked, or replacement holder
  of the original Decision 1 peer endpoint may receive provider output,
  inject operator input, and acknowledge snapshot barriers during unobserved
  relay or tmux-binding drift. Decision 5 may meanwhile admit PTY output from
  a different producer or production time, from a changed foreground job, or
  from an earlier binding state, and may deliver input to a changed
  foreground job or geometry. The delegated endpoint holder can participate
  in forwarding, input, drain, and barrier traffic for those same effects;
  these losses are composable, not independent.
- Decision 2 still makes the capture act atomic and field-exact for the
  current server, session, pane, process, geometry, history, metadata, and
  `G`. That exactness does **not** establish the producer, production time,
  foreground job, or binding state of content already admitted by Decision 5
  and rendered in the pane. An otherwise-valid atomic capture may therefore
  return rendered bytes from a different producer or time, a changed
  foreground job, or an earlier binding state; a later capture does not
  retroactively establish their production provenance.
- After `V`, one cleanup ledger may simultaneously finish with a port-owned
  pane/session `PRESERVED` after retained-server-connection loss, residual or
  replacement key/socket/runtime-directory entries, and the process-survivor
  set for the applicable anchor branch. With the anchor held, that process
  set may contain outside-group descendants and a non-cooperative relay. With
  the anchor lost through helper/reaper death, adoption, premature reap, or
  restarted cleanup, it may additionally contain unresolved
  direct-root/original-group members. Thus the anchor-lost branch can contain
  all of those process, owned-tmux, and namespace residuals at once; the
  anchor-held branch differs only in retaining exact root/original-group
  retirement. Because `PRESERVED` is a terminal ledger state, once every
  target is `RETIRED` or `PRESERVED`, `G` can reach `REVOKED` and ordinary
  exactly-once completion may settle while the processes, pane/session,
  names, inodes, children, secret material, disk use, resource consumption,
  and side effects remain.

This aggregate disclosure adds no authority and changes none of the five
commitment or capability-loss cells.

#### Operational reachability and incidence

The trigger classes below are categorical, not numerical probabilities:

- **Expected in a conforming ordinary run** means the selected rule produces
  the outcome without workload drift, component failure, recovery, or an
  external actor.
- **Ordinary-workload-dependent** means correct provider, startup, terminal,
  or job-control behavior can produce the trigger, but the intended workload
  is not guaranteed to do so.
- **Component/recovery failure** means the healthy selected path does not
  produce the outcome; a component loss, outage, premature lifecycle action,
  or replacement cleaner is required.
- **Adversarial/desired-behavior violation** means correct intended behavior
  does not produce the trigger; an external actor or violation of an
  unenforceable desired behavior is required.

No empirical implementation or production incidence data exists. “Known”
below therefore means determined by the selected rule; every other frequency
is explicitly unmeasured. The evidence column names diagnostic evidence that
could expose an occurrence to an operator or review. It adds no public
surface, and no diagnostic observation becomes effect authority.

| Outcome | Trigger class | Concrete trigger and whether correct intended operation can produce it | Frequency | Evidence that would expose it |
|---|---|---|---|---|
| Owned relay-socket entry and owned runtime directory remain through settlement | **Expected in a conforming ordinary run; selected baseline cleanup behavior.** | D/0/07c creates both entries. After `ACCEPT`, Decision 4 closes retained descriptors but never unlinks the socket entry and never removes the directory. Absent external removal, a correct ordinary accepted generation records them `PRESERVED`, reaches `REVOKED`, and may settle with both present. | Known by rule for every such generation absent external removal; no empirical count is needed to establish the baseline. | Terminal socket/directory ledger entries plus a diagnostic no-follow namespace inspection showing the names/inodes and retained disk use after settlement. |
| Relay key versus residual/replacement namespace material | **Expected key retirement on the ordinary path; component failure or adversarial/desired-behavior violation for a residual key, same-name replacement, or unexpected child.** | Normal single-use relay consumption removes the key before `ACCEPT` and records it `RETIRED`. A key that remains in an accepted flow requires failed/violated consumption; replacement entries or unexpected children require later external namespace mutation. Correct ordinary accepted operation does not leave the key. | Ordinary key retirement is determined by protocol; exceptional residue/replacement incidence is unmeasured. | Key-consumption and terminal-ledger records plus diagnostic no-follow observations of any remaining key, replacement entry, or directory child. |
| Pre-`ACCEPT`/pre-activation or mixed-producer/time PTY output is admitted | **Ordinary-workload-dependent.** | Startup output, multiple slave holders, or adjacent writes at different times can make one retained-master read contain these bytes. Whenever present, Decision 5 deliberately accepts the returned range. Correct intended workload can produce it, but this design does not assert that its ordinary startup does. | Unmeasured; no intended-workload startup or mixed-writer incidence data exists. | A controlled workload and retained-master read trace can demonstrate the range. The returned range and later capture contain no exact per-byte producer/time evidence, so they cannot expose provenance by themselves. |
| PTY effects cross a changed foreground job, geometry, or earlier binding state | **Ordinary-workload-dependent; adversarial/desired-behavior violation is also possible.** | Ordinary job control or terminal state changes, or an external mutation, can occur between a stable diagnostic and the retained-master effect. Correct terminal workloads can change foreground jobs; the selected authority does not condition the syscall on those live facets. | Unmeasured. | Correlated lifecycle/job-control diagnostics or controlled mutation can expose a case, but separate before/after observations cannot prove or exclude the exact effect-time race. |
| The original accepted endpoint holder uses the socket after its own live relay facets drift | **Adversarial/desired-behavior violation.** | Without delegation or holder replacement, the accepted relay's re-readable live start/executable/argv/cwd/pgid/sid tuple no longer compares equal to the accepted tuple while `G` remains active. Correct intended relay operation keeps those facets stable; Decision 1 deliberately does not make their effect-time continuity transfer authority. | Unmeasured. | Controlled same-holder cwd or other facet mutation, or correlated process diagnostics, can expose the drift. The stream operation itself carries no live-facet evidence, and separate observations cannot prove or exclude the exact effect-time race. |
| The original relay endpoint carries traffic while the accepted tmux server/session/pane binding drifts | **Component/recovery failure or adversarial/desired-behavior violation.** | While the original endpoint and its holder remain unchanged, server restart/replacement, session or pane removal/recreation, or an external tmux lifecycle action makes the live binding differ from the historical accepted server/session/pane IDs. Correct intended healthy port/tmux operation keeps that binding stable; component recovery or an external/violating action can change it, and Decision 1 deliberately does not condition socket traffic on its effect-time continuity. | Unmeasured. | Retained-server lifecycle/identity diagnostics, an atomic-capture mismatch if capture is reached, or controlled same-endpoint tmux replacement can expose drift. Earlier stream and barrier operations carry no live tmux-binding evidence, and separate observations cannot prove or exclude their exact effect-time race. |
| A delegated, inherited, forked, or replacement holder uses the original relay peer endpoint | **Adversarial/desired-behavior violation.** | The relay forks, daemonizes, hands off the descriptor, or another process obtains that same endpoint. Correct desired relay behavior does not do this, but Decision 1 cannot enforce current-holder continuity. | Unmeasured. | Controlled handoff or process/fd diagnostics can show another holder. The stream operation itself cannot identify which process used the retained peer endpoint. |
| A field-exact atomic snapshot contains Decision 5 provenance-loss content | **Ordinary-workload-dependent composition; adversarial/desired-behavior triggers can also feed it.** | Any admitted PTY range from the two PTY rows above is forwarded and rendered before an otherwise-correct Decision 2 capture. Correct capture operation can return it without any capture defect; the trigger class comes from the content-producing event. | Unmeasured. | Controlled producer/read/render timing correlated with the atomic record can demonstrate it. The capture record alone proves current capture fields, not the content's producer, time, foreground job, or earlier binding. |
| Descendants outside the original utility process group survive | **Ordinary-workload-dependent.** | The provider workload launches a descendant that moves to another group in the same session or creates a new session. Correct workload behavior can produce such topology; it is not required in every run. | Unmeasured for the intended provider workload. | Diagnostic process topology plus the terminal cleanup ledger can expose an unresolved outside-group target; neither observation authorizes a numeric signal. |
| The separately launched relay survives retained-descriptor close | **Component failure or desired-behavior violation.** | The relay fails to exit cooperatively after its retained endpoints close. A healthy conforming relay is expected to exit, so mere placement outside the utility tree is not sufficient for survival. | Unmeasured. | Descriptor-close completion followed by diagnostic relay liveness and a terminal `PRESERVED` ledger entry. |
| The port-owned pane/session remains | **Component/recovery failure.** | A custom-server defect, protocol skew, outage, or retained-server-connection loss removes exact cleanup authority before pane/session retirement. Healthy retained-connection cleanup retires the owned IDs. | Unmeasured. | The retained-connection loss cause, unresolved owned-object ledger entries, and diagnostic inspection of the shared server. |
| The direct utility root/original group remains | **Component/recovery failure.** | Helper/reaper death and adoption after that death, premature leader reap, or cleanup after restart removes the current ownership/unreaped anchor. Correct anchored cleanup force-retires the sealed original group. | Unmeasured. | Helper/reaper/reap/restart lifecycle evidence, terminal `PRESERVED` ledger entries, and diagnostic process topology. |
| Cleanup settles with simultaneous residue | **Expected baseline for socket/directory residue; mixed conjunction for the larger set.** | Correct ordinary cleanup can reach `REVOKED` and settle with the owned relay-socket entry and runtime directory still present. The maximum disclosed set additionally requires the applicable workload-dependent survivors and component/recovery failures; replacement entries or delegated holders add adversarial/desired-behavior triggers. | Baseline namespace residue is rule-determined; incidence of the larger conjunction is unmeasured. | The completed finite ledger and ordinary completion record, correlated with diagnostic namespace, process, and retained-server observations. Absence of such diagnostics is not proof that a provenance-loss effect did not occur. |

### Independent ratification and D/0/07c implementation dependency

The five amendments are independently ratifiable. Ratifying one records only
that named parent-contract/deployment decision and its disclosed loss; it
does not ratify another line and does not authorize a partial D/0/07c
implementation. All five approved amendments are a necessary implementation
precondition for this proposed topology, not one indivisible ratification
ballot.

| Decision | Meaning if ratified independently | Concrete consequence if declined under this design |
|---|---|---|
| **1B — relay transfer authority** | Accepts the retained-socket/read-range authority boundary by itself. No separately shippable positive leaf using 1B is identified here; approval alone leaves D/0/07c at HARD FAIL while any other requirement is unresolved. | No `READY(G)`, claim, issued port, relay input/output, barrier traffic, or positive D/0/07c snapshot path. |
| **2A — atomic tmux capture and owned-object retirement** | Accepts the custom default-shared-tmux deployment, atomic capture, and exact owned pane/session cleanup boundary by itself. No separately shippable positive leaf using 2A is identified here; approval alone authorizes no D/0/07c implementation. | No `READY(G)` or field-exact positive capture, and the proposed retained-connection authority for exact owned pane/session cleanup is unavailable. |
| **3B — process/tree retirement** | Accepts the bounded process-preservation amendment by itself without accepting namespace preservation or any workload-authority amendment. No separate positive leaf is identified here; approval only resolves this topology's process-retirement contract conflict. | The frozen complete process/tree-retirement acceptance criterion remains unsatisfied, so this topology cannot complete D/0/07c conformingly. |
| **4C — owned namespace retirement** | Accepts the namespace-preservation amendment by itself without accepting process survival or any workload-authority amendment. No separate positive leaf is identified here; approval only resolves this topology's namespace-retirement contract conflict. | The frozen no-key/relay-socket/runtime-directory-leak criterion remains unsatisfied, so this topology cannot complete D/0/07c conformingly. |
| **5B — PTY source/write authority** | Has explicit independent meaning for the separately scoped D/0/07b write leaf: approval resolves this design's retained-PTY authority conflict there, subject to D/0/07b's own gates. It does not approve Decisions 1–4 or authorize D/0/07c while they remain unresolved. | No `READY(G)`, retained-PTY read/write, positive D/0/07c transaction, or positive D/0/07b write. |

No decision is contractually inseparable from another. Declining one does not
rescind an approved line; it leaves the dependent path or acceptance
criterion at HARD FAIL and requires a conforming redesign if D/0/07c is still
desired. Even approval of all five authorizes only a later implementation
trial under the existing scope stops; it is not itself an implementation,
integration, promotion, or release approval.

Decisions 1, 2, and 5 are all prerequisites for `READY(G)`, so no `claim`,
port, observation, PTY/relay byte, or capture can quietly succeed while one is
unratified. They are also all required for the frozen positive 24-byte
snapshot transaction; Decision 5 is independently required for positive
D/0/07b writes. Decisions 3 and 4 explicitly amend the frozen leak-free
acceptance criteria rather than pretending unavailable destruction/removal
facilities exist. Decision 2 supplies exact cleanup only for the owned pane
and session, never the shared server or socket. All five approvals are
therefore required before the leaf can leave HARD FAIL.

## Falsifiable proof obligations

These are future test specifications, not tests added by this design.

| Rule | Violating mutation | Test that must turn RED | Why no other intact guard catches it |
|---|---|---|---|
| R1 retained relay endpoint | At the provider-output destination selector only, replace accepted connection C1 with C2 opened by the same accepted relay. | With live `G`, the baseline sends exact 25 bytes to C1. The mutant selects C2; require C1 to receive 25 and C2 zero. | Historical peer/tmux evidence and every other state are equal; only retained-object continuity distinguishes C1. |
| R1 retained fd-5 sideband | Replace retained response fd 5 with another readable byte stream carrying an otherwise exact tag/sequence/payload. | Produce one valid response candidate for live `G`; the baseline on retained fd 5 settles. Mutate only the selected descriptor and require no public result plus revocation. | No relay, PTY, capture, or namespace effect runs. Tag, sequence, payload, and R4 liveness are exact; only the retained channel identity differs. |
| Decision 1 exact narrowing | Add a current-holder or live relay cwd/executable facet as effect-time authority. | Delegate the original accepted descriptor to a second holder or change cwd without a diagnostic revocation; keep `G` active and send exact 25 bytes. The approved baseline delivers all 25; the stricter mutant rejects and turns RED. | This is the expressly ratified capability loss. R1 still selects the original socket and no other authority differs. |
| R2/R4 workload ordering | Replace the shared generation exclusion with `if (G.live)` followed by an unlocked relay send. | Pause after the mutant check, commit `V`, then resume the exact 25-byte send. Require zero destination bytes. A control with `E < V` delivers exactly 25. | R1 and all historical evidence pass; only the missing `E`/`V` order permits post-revocation workload. |
| R2 PTY diagnostic foreground disposition before `F` | Ignore a stable foreground mismatch already observed before the first write. | With retained PTY and live `G`, observe only a foreground mismatch, then attempt the first write. Require `SESSION_PORT_NOT_FOREGROUND`, `V`, and zero PTY bytes. | No race is claimed: the mismatch is already authoritative to reject. All other classifications remain exact. |
| R2 PTY-write identity disposition before `F` | Map an already observed stable utility executable/argv/cwd/pgid/sid diagnostic mismatch to terminal-changed. | With no loss and no prior positive write, make one utility diagnostic differ and require the diagnostic to commit `V`, zero PTY bytes, and `SESSION_PORT_IDENTITY_CHANGED`. | Foreground, PTY, dimensions, generation, and channels remain valid, so no other classification rank supplies the result. This does not claim an effect-time race guard. |
| R2 PTY-write short-prefix disposition after `F` | Reuse a pre-`F` mismatch result after an authorized positive prefix. | First retained-master attempt commits an exact three-byte prefix and establishes `F`; then observe a foreground mismatch before the remainder. Require no additional PTY bytes, exactly the three-byte prefix, and one `SESSION_PORT_WRITE_ABORTED` public result. | The first effect is valid and ordered before the observed mismatch. No loss/sideband failure occurs, so only the frozen post-`F` mapping distinguishes the result. |
| Decision 5 pre-activation buffering | Discard bytes merely because they were produced before activation. | Before `ACCEPT`, write exact bytes from a slave holder; after activation and with live `G`, perform the first retained-master read. Require the complete bytes tagged to `G`. | The test ends at read acceptance. It isolates the selected read-time semantics and intentionally supplies no production provenance. |
| Decision 5 mixed-producer range | Split/reject a single returned range by inferred producer or production time. | Two slave holders write distinct adjacent byte strings before one nonblocking master read under live `G`; require the syscall's exact combined result as one `G` range. | Retained master and `G` are exact. The ordinary PTY exposes no per-byte producer boundary for another rule to use. |
| Decision 5 read/revocation order | Permit a master read after `V`, or discard a read already linearized before `V`. | Case A commits `V` before the call and requires zero read. Case B pauses after `E_read` returns exact 25 bytes, commits `V`, and requires the immutable private range to remain 25 bytes while all later send/settlement is suppressed. | The two cases isolate read authority from later consume/send and prove the no-straddle order without inventing production provenance. |
| Decision 5 diagnostic-race loss | Reintroduce foreground/helper/winsize as an effect-time condition without a supplied conditional PTY primitive. | Let the stable diagnostic pass, change only one removed live facet before a retained-master read/write at `E < V`, and require the approved narrowed baseline to report the exact count. The mutant rejects and turns RED. | This deliberately proves the disclosed loss; retained PTY, historical bindings, sideband, and `G` remain exact. |
| R2 teardown protocol prohibition | Restore `RELAY_DATA_CLOSE` anywhere in teardown. | Run a reachable revocation with the accepted relay descriptor open. Require zero close frames, then exact direct shutdown/close at `C > V`. | Workload is closed and the descriptor-cleanup baseline is valid; only the restored protocol write violates the authority split. |
| R2/R4 readiness publication | Replace conditional `activate(G, binding)` with “facilities exist” check followed by an unlocked READY write. | Keep all facilities/identities valid, pause after the mutant check, commit `V`, then resume publication. Require the waiting `claim` to reject with no issued port or observation and zero READY candidates; a control run with `E_ready < V` may commit claim before later revocation. | No method, terminal transfer, capture, or response settlement runs. The retained readiness fd is exact; only generation-live readiness linearization differs. |
| Decision 2 concrete custom transport | Fall back to stock separate tmux metadata/capture commands or omit the versioned server operation. | Against the approved custom build on each supported platform, require exactly one `agents-capture-v1` request and no stock authority sequence. A mutant that substitutes separate calls fails the call log and atomic record oracle. | This checks the named build/deployment amendment rather than accepting an unspecified future transport. |
| R2 atomic capture geometry | Split the atomic capture record into metadata/check and later capture, or ignore the record's dimensions. | Start from a reachable Decision-2 conditional-capture baseline. A real outside tmux client changes width to 121 for the capture and restores 120 before any separate post-read; require terminal-changed, `snapshot:null`, revocation, and no accepted capture result. | Pre- and post-read diagnostics deliberately see 120x40/400 and the same target. The supplied generation is correct, so only geometry inseparable from the captured bytes observes the bad boundary. |
| R2 atomic capture generation | Ignore the generation carried inside an otherwise valid atomic capture record. | Call the atomic-record acceptance boundary directly with exact frozen identity, 120x40/400, valid metadata/bytes, and generation H while G is required; require record rejection before canonicalization. | The test stops at record acceptance and never invokes R4 public settlement. Every record field except generation is valid, so no geometry, parser, endpoint, or sticky-settlement guard rejects first. |
| R4 cleanup opens after revocation | Reuse the workload predicate `G == ACTIVE` for descriptor cleanup. | With an exact sealed socket/PTY/fd ledger, commit `V`, then run cleanup. Baseline closes every handle and reaches `REVOKED`; the mutant leaves a descriptor open and cannot complete the ledger. | No destructive target lookup or pathname action runs. Only the erroneous active-generation condition suppresses required `C > V`. |
| R4 cleanup is dormant before revocation | Remove the `REVOKING/REVOKED` state condition from `C_G`. | While `G` is active, invoke the cleanup callback directly and require zero closed descriptors plus unchanged `PENDING` ledger. | Workload and identities are valid; only cleanup-state separation prevents premature retirement. |
| R4 cleanup exact generation/target | Let `C_G` accept a target sealed for H or a newly resolved replacement. | After `V_G`, substitute H's open descriptor for one G ledger handle. Require H to remain open, G's entry to become `PRESERVED`, and no replacement lookup. | Both objects are otherwise valid and no workload runs; only sealed generation/handle selection protects H. |
| R4 cleanup one-shot/non-revival | Permit a terminal cleanup entry to run again or reopen workload. | Complete one descriptor target, call cleanup twice, then present equal historical evidence. Require one close, terminal ledger state, `G == REVOKED`, and no readiness/transfer/settlement. | There is no identity mismatch or replacement; only one-way ledger/state semantics reject the repeat/revival. |
| Decision 3 direct-child ownership | Accept a numeric `pid == pgid == sid` tuple without this helper's direct-child ownership. | Present a live session/group leader B owned by another parent with every numeric field equal at the pre-activation target-sealing boundary. Require no actionable B target to enter the ledger; after `V`, require zero signal calls, B survival, and cleanup rejection. | Generation and numeric shape pass; only parent-owned child lifetime authority distinguishes B from the accepted utility anchor. |
| Decision 3 post-sealing helper/reaper-death ownership-loss fallback | Continue using the sealed numeric group after death makes the original owning helper/reaper unavailable. | Seal direct child/session/group A while the original helper owns it, then exercise the helper/reaper-death seam before cleanup while A or an original-group member remains and all sealed numbers still match. Require zero signal calls, survivor liveness, and the unresolved direct-root/original-group ledger target `PRESERVED`. A mutant that signals the historical number turns RED. | `G`, the sealed tuple, unreaped status, and numeric equality remain unchanged; adoption, early reap, and restart paths do not run. Only post-sealing loss of the original owner's current authority prevents the signal. |
| Decision 3 adoption-after-death fallback | Treat a child adopted after the original helper/reaper dies as if the original direct-parent predicate still held. | Seal direct child/session/group A under the original helper, exercise helper/reaper death, then place A under a different parent before cleanup while A and its historical group remain live. Require zero signal calls, survivor liveness, and the unresolved target `PRESERVED`. A mutant that accepts the adopted child and signals turns RED. | The sealed tuple, leader liveness/unreaped state, and historical ownership all match; current adoption by a different parent is the sole failing evidence. |
| Decision 3 premature-reap fallback | Permit another original-group signal after the utility leader was reaped before the group attempt became terminal. | Seal owned group A with member A2, reap leader A prematurely, then invoke cleanup while A2 remains. Require zero subsequent signal calls, A2 survival, and the unresolved group target `PRESERVED`. A signal-after-reap mutant turns RED. | Direct ownership and the sealed group were valid before reap; only loss of the unreaped-leader lifetime anchor distinguishes this case. |
| Decision 3 restarted-cleaner fallback | Let a restarted or replacement helper treat the historical cleanup ledger as current child ownership. | Seal group A under the original helper, stop that owner, and invoke cleanup through a restarted/replacement helper while an unresolved original-group process retains the historical numeric tuple. Require zero signal calls, survivor liveness, and `PRESERVED`. A mutant that signals from the restored ledger turns RED. | The immutable ledger, generation, and numeric fields all match; only the restarted cleaner's lack of direct-child ownership prevents the signal. |
| Decision 3 sealed utility-group target | Replace the sealed accepted group ID with a fresh `process_identity()`/PGID result before signalling. | Create direct child/session/group A plus member A2 and unrelated group B; keep A live-or-unreaped, make the diagnostic reader return B, commit `V`, and run cleanup. Require TERM/KILL to address only sealed group A, A/A2 to retire, B to survive, and zero authorization from the diagnostic. | The parent-owned A anchor and every cleanup state are valid; only re-resolution can redirect the signal to B. |
| Decision 3 signal-before-reap order | Permit any wait/reap of the utility leader before the original-group signal attempt is terminal. | In a deterministic lifecycle seam, make A exit after TERM while A2 remains until KILL. Require the call order `TERM(-A)`, grace, `KILL(-A)`, then leader reap. A reap-before-KILL mutant fails the exact order and leaves A2 live. | No outside-group descendant, relay, tmux, or namespace action runs; only the unreaped-child lifetime guard keeps the second signal exact. |
| Decision 3 `ESRCH` terminal case | Treat `ESRCH` as permission to re-resolve, as cleanup failure, or as a reason to signal another target. | Keep the accepted child owned/unreaped but inject `ESRCH` for the sealed-group attempt because no live group member remains. Require the group target `RETIRED`, no lookup/alternate signal, and leader reap only afterward. | All state and ownership guards pass; only the required already-absent interpretation distinguishes the outcome. |
| Decision 3 outside-group descendant preservation | Restore numeric `kill(pid)` for a descendant outside the original group. | Run two isolated cases after exact A-group retirement: D moves to another PGID in A's session; D2 creates a new session. Expose a same-number replacement seam for each lookup and require zero signal calls, descendant/replacement survival, and `PRESERVED`. | The anchored utility group is already terminal and relay/tmux/namespace actions are absent; neither descendant has a retained target. |
| Decision 3 relay preservation | Restore forced numeric relay termination after socket shutdown. | After exact descriptor close, expose a replacement at the recorded relay PID. Require no signal call, replacement survival, and `PRESERVED`. | Only forced relay targeting is mutated; cooperative descriptor retirement remains intact. |
| R3 tmux-pane cleanup target | Replace sealed `%pane_id` with the public target. | After `V`, remove owned pane A and create B under the same public target. Require B to survive and the retained server's authoritative absence of `%A` to mark A `RETIRED`. | The retained server and session target are exact; only the pane selector could reach B. |
| R3 tmux-session cleanup target | Replace sealed `$session_id` with the public target. | After `V`, remove owned session A and create B under the same name. Require B to survive and authoritative absence of `$A` to mark A `RETIRED`. | Pane and every non-tmux cleanup target are disabled; only the session selector differs. |
| R3 shared tmux preservation | Restore targetless `kill-server` or default-socket unlink. | Create owned session A plus unrelated sibling S on the exact retained server, commit `V`, and complete A's pane/session cleanup. Require S, the server, and its socket inode to survive. Each mutant destroys one oracle and turns RED. | Exact server identity deliberately passes; ownership—not identity—is the only reason whole-server/socket effects are forbidden. |
| Decision 4 key preservation | Restore final-`lstat` plus `unlink` for the relay key. | At `C > V`, substitute a same-owner/mode/size key B at the basename. Require zero unlink calls, B to remain, and the ledger `PRESERVED`. | Only key cleanup runs; every point observation may match, so preservation is the sole guard. |
| Decision 4 relay-socket preservation | Restore pathname unlink after closing the retained relay socket. | Substitute a same-owner/mode/type socket B and require zero unlink calls, B to remain, and `PRESERVED`. | No key, directory, tmux, or process action runs. |
| Decision 4 runtime-directory preservation | Restore pathname `rmdir`. | Substitute a same-owner/mode empty directory B at cleanup and require zero rmdir calls, B to remain, and `PRESERVED`. | No child or alternate cleanup failure masks the directory rule. |
| R4 sticky settlement | Ignore or clear G's revoked bit while settling a result. | Produce and freeze one complete valid authenticated G-tagged response while G is active; invoke no public settlement yet. Then revoke G without changing endpoints/evidence and inject that pre-produced candidate directly at `R`; require no public result and no second operation. | No producer-side effect or R4 gate runs after revocation, and R1/R2 evidence remains valid. The settlement revoked bit is the sole failing evidence. |
| R4 non-revival | Permit a revoked generation object to transition back to active when presented with equal references/evidence. | Revoke G, keep the same retained descriptors and immutable evidence objects, then call the generation-state transition directly; require rejection and state `REVOKED`. | No transfer, capture, destruction, or settlement is attempted, so R1–R3 cannot reject first. Only the irreversible R4 transition is under test. |

Every future mutation run must alter only the named rule. A test is not valid
proof for a rule if another intact rule rejects first. The cleanup baselines
above deliberately start at `V` with sealed targets, so Decision 2 pane/session
retirement, Decision 3 anchored group retirement plus both anchored and
anchor-lost residual-preservation cases, and Decision 4 preservation are
reachable without weakening the active-workload rule.

## Finding closure map at design level

| Finding | Design closure |
|---|---|
| Trial 1 reviewer A — post-`ACCEPT` relay operations were not bound | R1 forbids re-open/re-resolution and the active-workload rule binds every input, output, barrier, capture, readiness, sideband, and settlement effect to the same `G`. Because stock streams cannot bind the full mutable relay tuple, those paths remain HARD FAIL unless Decision 1's exact narrowing is ratified. |
| Trial 1 second reviewer — width/history drift was accepted | R2 makes exact geometry/history part of the atomic capture record; absent that record, capture rejects. |
| Trial 2 reviewer A — changed-cwd relay received 25 provider bytes | The design does not claim the impossible full-tuple guard. Before ratification, transfer is HARD FAIL. Decision 1 explicitly amends cwd and the other live relay facets out of effect authority, preserves retained-socket plus `G` ordering, and discloses that an unobserved cwd/handoff race can pass. |
| Trial 2 reviewer B — resize between preflight and capture returned a snapshot | R2 prohibits pre/use/post authorization and specifies the restore-before-post-read mutation that only an atomic capture record can kill. |
| Trial 2 reviewer B — cleanup unlinked a replacement pathname inode | R3 distinguishes retained inode evidence from a removal capability. Decision 4 authorizes no post-`ACCEPT` pathname unlink/rmdir at all, so both owned residuals and replacements are preserved. |

## Design Trial 2 reviewed-point closure

| Reviewed point | Design Trial 2 closure |
|---|---|
| P0 — provider/utility/foreground/PTY impossibility omitted | R2 applies to broker/operator writes, programmatic writes, and provider-output reads. It now states that full conditional PTY authority is unavailable and leaves only Decision 5's explicit read-time retained-PTY amendment; until ratified, every dependent path rejects before its first affected byte. |
| P1a — incomplete or rule-incomplete site inventory | The table separates PTY source and destination authority, applies R2 to both PTY-write paths, adds utility-group/adopted-descendant retirement, removes the unauthorizable relay close frame in favor of retained descriptor closure, and names every retained control/sideband closure. |
| P1b — R1, R2 capture, and R4 proofs were not isolated | R1 now starts from valid intact-R2 evidence and a reachable transfer; capture geometry and generation have separate acceptance-boundary cases; R4 revokes G without replacement or evidence change. The relay proof selects provider-output destination only, and every R3 mutation run names one concrete destruction target. |
| Wording — `read` was ambiguous | The binding sentence now says consume bytes/state, and diagnostic observations are explicitly non-authorizing: they may only cause rejection. |

## Design Trial 3 adjudicated closure

Reviewer A's zero-finding Design Trial 2 result and reviewer B's KO both agree
that the Trial 1 PTY/source omissions were closed. Those closures remain
unchanged. The orchestrator-adjudicated reviewer B findings are closed as
follows:

| Reviewed point | Design Trial 3 closure |
|---|---|
| P0-1 — evidence-returning effects did not condition authority | The binding rule now requires a trusted conditional compare-and-effect primitive. It takes expected binding plus `G`, compares before `E`, shares one exclusion/order with effect-side revocation `V`, suppresses the exact effect on mismatch/revocation, and returns the exact committed count. `E < V` is authorized; `V < E` commits zero. Effect-then-report and self-attestation are explicitly non-authorizing. |
| P0-2 — universal terminal-changed/no-transfer contradicted frozen PTY dispositions | REJECT is now effect-level and cause-specific. Before `F`, utility mismatch is `IDENTITY_CHANGED`, foreground mismatch is `NOT_FOREGROUND`, PTY/pane/relay/dimension mismatch is `TERMINAL_CHANGED`, and known loss is `TERMINAL_CLOSED`. After an authorized positive prefix, a later rejected attempt writes zero additional bytes but the operation is `WRITE_ABORTED`; the prefix is not denied or reported as success. |
| P1-1 — sideband, readiness, and namespace inventory gaps | R1 separately binds retained fd 4/5, exact `ASP1` tag/sequence, and private `G`. Readiness is a retained-fd-3 workload effect with claim-time settlement. Relay key, relay socket, and runtime directory each have an explicit preservation row; the default tmux socket is explicitly shared and outside the owned cleanup ledger. |
| P1-2 — operator alternatives were not ratifiable and tmux choice was redundant | Superseded by the Design Trial 4 table: absent facilities are removed, the duplicate tmux rows are merged into one concrete custom build, and every remaining line states the exact amendment and cost. |
| P1-3 — four mutation proofs were masked or ambiguous | R1 still uses C1/C2 with all historical evidence equal; pre-`F` diagnostics keep exact cause ranking; Decision 5 now has isolated pre-activation, mixed-producer, and read/revocation oracles for its selected read-time semantics; and the close-frame proof reaches direct cleanup after `V`. |

## Design Trial 4 closure of both Trial 3 verdicts

| Reviewed point | Design Trial 4 closure |
|---|---|
| Reviewer A P0 — `G == ACTIVE` suppressed teardown caused by revocation | The binding rule now defines two disjoint authorities. Workload/readiness/settlement effects require active `G` and precede `V`; `V` atomically closes them and opens only `C_G` for the same sealed generation while `REVOKING`/`REVOKED`. Cleanup points follow `V`, act once on retained/sealed targets, cannot select replacements or revive workload, and complete before ordinary settlement. Separate mutations prove workload-after-`V` suppression, cleanup-before-`V` suppression, reachable descriptor/pane/session cleanup after `V`, exact-generation targeting, and one-shot non-revival. |
| Reviewer B P0-1 — 1A, 3A, 4A, 4B, and 5A named absent facilities | All five rows are removed. Decisions 1, 3, 4, and 5 now have only explicit amendment options; the text says plainly that no full-strength cross-platform branch exists. |
| Reviewer B P0-2 — Decision 5 source time was ambiguous | Decision 5 selects one nonblocking retained-master read at read time. It expressly accepts pre-`ACCEPT`/pre-activation buffering and mixed writers/times, defines both `E_read < V` and `V < E_read`, serializes a read against revocation, classifies every helper/reaper/supervisor facet as historical or diagnostic, and discloses loss of production/foreground/geometry proof. |
| Reviewer B P0-3 — exact tmux server identity was treated as ownership | The default server/socket and sibling sessions are shared and always preserved. Only a port-created pane/session are sealed cleanup targets. `kill-server` and tmux-socket unlink are forbidden, and the proof requires an unrelated sibling plus socket inode to survive. |
| Reviewer B P1 — commitment cells omitted amendment/deployment/loss | Every sole-option row has separate stand-alone commitment and deployment/capability-loss columns; Design Trial 5 completes the three consequences later found missing from those columns. |
| Reviewer B P1 — 2A/2B were redundant and one transport unspecified | They are one concrete 2A: a maintained Linux/Darwin custom tmux client/server build with versioned `agents-capture-v1`, deployment as the default compatible runtime, and exact shared-server ownership limits. |
| Reviewer B P1 — 4C contradicted mandatory N1/N2 | R3 removes N1/N2 entirely because neither is available under the topology. Decision 4C is the sole rule: after `V`, no pathname removal occurs and residuals/replacements are `PRESERVED`. |

## Design Trial 5 closure of the adjudicated Trial 4 findings

Reviewer A returned zero-finding OK for Design Trial 4. Reviewer B
independently confirmed that removing 1A, 3A, 4A, 4B, and 5A and merging the
tmux choice were correct; those decisions remain closed. The two adjudicated
P1s are closed as follows:

| Reviewed point | Design Trial 5 closure |
|---|---|
| Reviewer B P1-1 — Decision 3 surrendered exact direct-root/original-group retirement | R3 now seals the helper's direct-child ownership, `pid == pgid == sid`, and live-or-unreaped state as a cleanup lifetime anchor. `C_G` must signal that exact original group with TERM/grace/KILL before leader reap, treats `ESRCH` as already absent, and never authorizes from a fresh identity lookup. While that anchor holds, only descendants outside the original group (another same-session group or a new session) and the separately tmux-launched relay are within the preservation amendment. Design Trial 6 qualifies the anchor-loss branch without changing that rule. |
| Reviewer B P1-2 — Decisions 1, 2, and 5 omitted accepted losses | Decision 1's loss cell now says accepted tmux server/session/pane continuity is historical and relay/barrier traffic may continue during unobserved terminal drift. Decision 2 says retained-connection loss can leave the port-owned pane/session `PRESERVED` indefinitely and can affect the shared default server. Decision 5 exhaustively removes effect-time utility pid/startToken/bindingDigest, helper/reaper/supervisor, terminal/tmux, foreground, winsize, and producer continuity and keeps pre-`ACCEPT`, pre-activation, and mixed-writer/time acceptance explicit in the loss cell. |

## Design Trial 6 closure of the adjudicated Trial 5 finding

Design Trial 5 reviewer A returned zero-finding OK. Reviewer B confirmed that
the operative Decision 3 safety rule is correct and returned one P1 solely
because its operator-facing disclosure omitted the anchor-loss residual.
No operative rule changed in this revision.

| Reviewed point | Design Trial 6 closure |
|---|---|
| Reviewer B P1-1 — Decision 3 omitted direct-root/original-group preservation when its anchor is lost | The surrounding R3 disclosure, complete-site inventory, and sole Decision 3 row now distinguish both cases. While current direct-child ownership and the unreaped leader anchor hold, forced retirement of the sealed original group remains mandatory and only outside-group descendants plus the separate relay may survive. If helper or reaper death and adoption after that death, premature reap, or cleanup after a restart removes the anchor, cleanup still sends no numeric signal and unresolved direct-root/original-group members may also survive as `PRESERVED`. Four isolated proof rows require zero signal calls after post-sealing helper/reaper ownership loss, adoption after that death, premature reap, and restarted-cleaner loss. |

## Preserved closed behavior

This design does not alter the existing code or these independently confirmed
results:

- the frozen canonicalization algorithm or DTO;
- tmux 3.6 real-host figures `40 -> 0`, `61 -> 24`, and `50 -> 12`;
- the exact rendered row-end spaces;
- terminal-changed rejection already observed for stable `121x40` and
  `history-limit=401`;
- rejected-generation non-revival;
- fail-closed malformed or absent history evidence;
- D/0/07a capability/codec behavior;
- direct provider `execve`, the no-shell/no-`send-keys` rules, or the absence
  of `capture-pane -e`/`-J`;
- the inert public observation values.

Those results remain regression obligations after the operator resolves the
design conflicts. Decision 2 replaces stock separate calls as the authority
mechanism, but its complete-record byte oracle must still produce the same
canonical bytes and reject exact geometry/history drift. None of these
results authorizes an operation while a required decision is unratified.

The existing D/0/07b implementation and tests are unchanged by this
document. Decision 5 is an explicit parent amendment to their effect-time
authority, not a silent weakening: it preserves exact framing/FIFO/counts,
stable-diagnostic pre-`F`
`IDENTITY_CHANGED`/`NOT_FOREGROUND`/`TERMINAL_CHANGED`, positive-prefix
accounting, post-`F` `WRITE_ABORTED`, and success only at `R`, while
disclosing that a live-facet change between diagnostic and retained-master
I/O can pass. Until Decision 5 is ratified, a PTY write HARD FAILS before its
first `os.write`.

## Scope and implementation stop

This document introduces no implementation, port surface, public error,
adapter/service/catalog splice, D/0/07d gate, provider launch change, or
promotion claim.

The stock direct capture/metadata authority mechanism, full mutable relay
identity, full utility/PTY/foreground prerequisites, forced retirement of
descendants outside the original process group and the separately launched
relay, and zero-key/socket/runtime-directory-leak rules are frozen parent
requirements.
Decision 3 preserves exact forced retirement of the direct utility
root/original group while the original helper-owned live-or-unreaped anchor
holds. Outside-group descendants and the relay remain the anchored residual
set; when helper/reaper death and subsequent adoption, premature reap, or
cleanup after a restart removes that anchor, unresolved root/original-group
members join the `PRESERVED` residual set and no numeric fallback is
authorized. Decisions 1–5 name every amendment required to produce a
buildable Linux/Darwin contract. The exact public attach command remains
unchanged, which is why the default tmux server/socket must remain shared and
preserved.

**STOP:** the five amendments may be ratified independently, but no D/0/07c
implementation trial is authorized until all five requirements have approved
resolutions for this topology.

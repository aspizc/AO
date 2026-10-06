# Project V5 D/0/07c Design Trial 4 — reviewer B result

reviewed_KO

## Review boundary and outcome

I reviewed design commit
`c00a2ee31f508babd0f0e5ae038a6659b134b01a` against base
`1aa2eac06445dce19ce6455511ef723238b1bc26`, the frozen D/0/07 and
D/0/07c contracts, and the topology that the current helper actually
establishes.

Below, `design:` line references mean
`plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`.

None of removed options 1A, 3A, 4A, 4B, or 5A exists at its stated full
strength on both Linux and Darwin under that topology. Their deletion is
therefore not a P0. Decision 2 also correctly merges the former 2A/2B into
one concrete custom-tmux transport.

The design is nevertheless not ready for operator ratification. Decision 3
gives up exact retirement of the direct-child utility root and its original
process group even though the frozen topology supplies a bounded,
cross-platform lifetime anchor for that subset. In addition, the capability
loss column omits material losses that the operative rules accept for
Decisions 1, 2, and 5.

This KO authorizes no implementation, integration, promotion, release,
D/0/07d gate, splice, or operator decision.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | No deleted full-strength option is buildable on both platforms under the frozen topology. |
| P1 | 2 | Decision 3 is over-broad; the capability-loss column is incomplete. |
| P2 | 0 | No additional advisory finding. |

## Findings

### P1-1 — Decision 3 unnecessarily abandons exact utility-root/group retirement

The candidate says that cleanup must never call `_signal_exact`,
`_signal_utility_group`, `kill(pid)`, or `kill(-pgid)` and may preserve the
utility and its process group
(`07c-DESIGN-post-accept-binding.md:310-319,414,447,487`).
That conclusion is valid for an arbitrary looked-up PID/PGID, but it does not
follow for the utility root created by this frozen topology:

- the helper/reaper directly forks the utility
  (`process_supervisor_helper.py:1733-1769`);
- that child calls `setsid()`, making its PID equal to its session and process
  group IDs (`process_supervisor_helper.py:1474-1493`);
- acceptance verifies `pid == pgid == sid`
  (`process_supervisor_helper.py:1790-1806`);
- the existing observer deliberately uses `WNOWAIT` on Linux and kqueue
  observation on Darwin, neither of which reaps the child
  (`process_supervisor_helper.py:1159-1194`); and
- the existing cleanup already keeps the leader out of nonblocking reap while
  first signalling the group
  (`process_supervisor_helper.py:1636-1648,1689-1708`).

The same construction is available on Darwin: `setsid(2)` creates a new
session and process group with the caller as their leader; `kill(2)` targets
a negative PID's process group; and `setpgid(2)` permits joining an existing
group only in the same session. An unrelated replacement cannot acquire the
held child PID or create an unrelated group with that PGID while the parent
retains the live-or-unreaped child. On Linux, the corresponding POSIX
session/group rules and unreaped-child PID retention provide the same
property. This is a parent-owned lifetime invariant, not an
observe-then-signal identity guess.

The smallest implementable Decision 3 surrender is therefore:

1. retain exact forced termination of the direct utility root and members of
   its original process group while the helper still owns the child and has
   not reaped it;
2. serialize signalling before reap, and treat `ESRCH` as the group already
   absent;
3. continue to preserve descendants that escaped that group/session and the
   separately tmux-launched relay, because no equivalent retained
   cross-platform target exists for them; and
4. reap the utility only after the exact group-retirement attempt is
   terminal.

This does not resurrect full 3A: a descendant can create another group or
session, Darwin has no cgroup-v2-equivalent dynamic descendant domain, and
the relay is outside the utility tree. It does show that 3B asks the operator
to surrender more than that impossibility requires. The mutation at line
487, which places an unrelated replacement at the recorded PGID, is not
reachable while the required direct-child/unreaped-session invariant holds.

Required correction: narrow 3B and every corresponding rule, inventory row,
loss statement, and proof so exact utility-root/original-group retirement
remains mandatory. Preserve only the targets for which exact authority is
actually absent.

### P1-2 — the capability-loss column omits accepted losses in Decisions 1, 2, and 5

The column is the object of ratification, so implications left only in other
rules are not sufficient disclosure.

| Decision | Loss omitted from the column | Operative design evidence and consequence |
|---|---|---|
| 1 | Effect-time continuity of the accepted tmux server/session/pane binding is also lost for relay transfer. | The authority tuple makes those IDs historical (`design:223-241,445`), while tmux observation is merely diagnostic (`design:405`). Relay bytes and barrier traffic can therefore continue on the original socket during an unobserved pane/session/server drift. The column names the relay process tuple and current descriptor holder, but not this terminal-binding loss. |
| 2 | Loss of the retained custom-server connection can leave the port-owned pane and session permanently preserved. | R3 says unresolved owned IDs become `PRESERVED` when that connection is lost (`design:323-339,415`). The column discloses preservation of the shared server, socket, and siblings, but not loss of cleanup for the objects the port does own. It also means a custom-default-server fault has cleanup consequences in addition to the stated packaging and migration cost. |
| 5 | Effect-time utility `pid/startToken/bindingDigest` continuity and the remaining helper/reaper/supervisor/terminal binding facets are lost, not only the listed executable/argv/cwd/pgid/sid, foreground, winsize, and producer fields. | The selected authority explicitly makes authenticated readiness and helper/reaper/supervisor/terminal bindings historical (`design:243-271,449`); the frozen equation requires fresh PID/start, launch digest, and terminal/helper/tmux facets (`D/0/07.md:621-644`). A retained-PTY I/O effect may therefore pass after any unobserved change in those omitted facets. |

Decisions 3 and 4 otherwise describe the losses of their proposed
amendments completely. Decision 3's disclosure does not cure its excessive
scope. Decision 5's commitment text does expressly reveal pre-`ACCEPT`,
pre-activation, and mixed-writer/time reads, but those consequences should
remain explicit in the loss column when it is repaired.

Required correction: add the omitted guarantees and their consequences to
the relevant loss cells. For Decision 3, first narrow the amendment as
required by P1-1 and then describe only the residual process targets that may
survive.

## Independent per-removal ruling

I treated each former strong option as a complete requirement. A facility
that solves only one platform, one direction, or one member of a composite
target does not make that option buildable.

### 1A — full conditional relay authority: removal justified

Checked on Linux:

- `unix(7)` `SO_PEERCRED` is a connection-time credential snapshot;
- `SO_PASSCRED`/`SCM_CREDENTIALS` can report a message sender's
  pid/real-uid/real-gid, but not executable, argv, cwd, pgid, sid, or current
  destination holder, and it does not condition a stream `send`;
- `recv(2)` and `send(2)` accept the socket/buffer/flags operation, not an
  expected process tuple; and
- pidfds retain an individual process identity for wait/signal operations,
  but do not make socket I/O conditional on that process's mutable tuple.

Checked on Darwin:

- `getpeereid(3)` and `LOCAL_PEERPID` expose accepted-peer credentials/PID,
  not a live full process tuple or current descriptor holder;
- XNU's `recvmsg`/`sendmsg` interfaces have no expected-process condition;
  and
- kqueue/libproc observations do not share a linearization point with the
  socket I/O effect.

No facility on both platforms couples each stream receive/send/barrier range
to the complete live relay tuple and `G`. Passing the fd to another process
remains indistinguishable at I/O time. Full 1A is not buildable.

### 3A — retained dynamic process domain: removal justified, with the P1-1 subset

Checked on Linux:

- pidfds retain individual process objects, and current Linux also has
  process-group signalling support through pidfds;
- cgroup v2 supplies a dynamic Linux containment domain when topology,
  delegation, and membership rules are changed; and
- neither facility, under the frozen split topology, automatically contains
  both every utility descendant from creation and the relay launched by
  tmux.

Checked on Darwin:

- kqueue observes a process and `kill(2)`/`killpg(2)` use numeric targets;
- XNU exposes no pidfd or cgroup-v2-equivalent public retained descendant
  domain; and
- XNU coalitions are not the required ordinary application containment
  primitive: requesting coalition termination prevents later adoption and
  completes when active membership drains; it is not a retained kill-all
  handle for existing members.

There is no single Linux-and-Darwin facility satisfying all of 3A's utility
root, group, every descendant from creation, and separate exact relay target.
The full removal is justified. The parent-owned direct-child/session anchor
does, however, preserve the smaller exact utility-root/original-group
capability described in P1-1.

### 4A — conditional-object removal: removal justified

On Linux, `unlinkat(2)` selects `dirfd + pathname`; its removal flag is
`AT_REMOVEDIR`. `openat2(2)` constrains path resolution, and
`renameat2(2)` supplies pathname-level no-replace/exchange operations, but
neither makes `unlink` or `rmdir` conditional on an expected inode or open
handle. `AT_EMPTY_PATH` does not add fd-based unlink/rmdir semantics.

Darwin's exported `unlinkat(fd, path, flag)` and `rmdir(path)` are likewise
pathname operations. XNU's exported flags do not provide an expected-object
comparison or an unlink/rmdir-by-open-handle operation.

An `lstat`/`fstat` before removal leaves a replacement interval on both
platforms. Full 4A is not buildable.

### 4B — kernel-enforced exclusive custody: removal justified

Linux and Darwin file modes and POSIX ACLs grant directory mutation by
uid/gid/ACL principal. They cannot grant it to the helper while denying it
to arbitrary processes running as that same principal. A sandbox can
restrict processes placed inside its policy; it does not retroactively
remove mutation authority from every other same-uid relay, tmux, attach, or
user process in the frozen topology.

Separate credentials, privileged mediation, a new mount/container
namespace, or a changed relay/tmux topology could create custody, but each is
a topology/privilege amendment rather than a bounded implementation of 4B
under the frozen contract. Full 4B is not buildable.

### 5A — full conditional PTY authority: removal justified

On Linux and Darwin, the PTY master exposes an ordered byte stream. PTY
packet mode reports line-discipline/control status, not per-byte writer PID,
process generation, or production time. `tcgetpgrp` and winsize/identity
ioctls are separate observations; they do not condition a master `read` or
`write`. Multiple slave holders can contribute bytes to one returned range,
and one range carries no recoverable writer boundaries.

No facility on both platforms atomically validates the frozen
utility/helper/terminal/foreground tuple while assigning production-time
provenance to every byte or suppressing the exact PTY effect on mismatch.
Full 5A is not buildable.

## Minimality of each remaining amendment

| Decision | Smallest surrender that restores implementability | Candidate ruling |
|---|---|---|
| 1B | Stop treating mutable live relay/current-holder and historical tmux binding as effect-time predicates; retain the original connected socket, authenticated acceptance evidence, exact per-attempt counts, and `G`/revocation ordering. | Semantically minimal. The column still needs the P1-2 disclosure repair. |
| 2A | Replace only the non-atomic stock metadata/capture authority with one concrete retained-server operation, while preserving the public attach command and ownership boundary. | Minimal. Using the ordinary shared server requires the compatible custom build to be the default; whole-server/socket cleanup would exceed ownership. |
| 3B | Preserve escaped descendants and the separate relay for which no exact retained target exists, but retain exact direct-child utility-root/original-group signalling before reap. | Over-broad. The candidate additionally surrenders a bounded capability already supplied by the frozen topology. |
| 4C | When no compare-and-remove primitive or exclusive custody exists, close retained descriptors but perform no post-`V` pathname removal; preserve both owned residuals and replacements. | Minimal. A final identity check followed by unlink/rmdir would reopen the replacement race. |
| 5B | Define source authority at one retained-master read and write authority at one retained-master attempt, ordered with `G`/`V`; surrender production-time provenance and live facets that cannot condition those syscalls. | Semantically minimal. The selected read-time rule is precise, but the loss column needs the P1-2 disclosure repair. |

## Concrete residual risk after ratification

| Amendment | What an attacker or accident can do that the frozen contract forbade |
|---|---|
| 1B | A forked, inherited, or deliberately delegated holder of the original peer endpoint can receive provider output, inject operator input, and produce barrier acknowledgements as the accepted connection. Relay transfer may continue during an unobserved relay or tmux-binding change. The design still prevents sending to a re-resolved pathname or a different socket object. |
| 2A | A defect, protocol skew, or outage in the maintained custom default tmux affects the shared server used by unrelated sessions. Loss of the retained connection can leave the owned pane/session alive. If the custom atomic operation is implemented incorrectly, a changed geometry, process, metadata set, or generation can contaminate the snapshot; stock commands provide no fallback authority. |
| 3B as written | A utility root, group member, escaped descendant, or relay can survive revocation and ordinary settlement indefinitely, retain files/credentials/fds, consume CPU or memory, perform filesystem/network side effects, and spawn more work. P1-1 establishes that accepting this for the exact utility root/original group is unnecessary. |
| 4C | An extant key, relay socket entry, runtime directory, child, or attacker-supplied same-name replacement becomes an accepted `PRESERVED` result. Secret material and disk can accumulate; stale or hostile names can deny safe basename reuse. Retained endpoint shutdown prevents the replacement name from becoming the old connection, but cleanup deliberately leaves the namespace object in place. |
| 5B | Bytes produced by any slave holder before `ACCEPT` or activation, or by multiple writers/times, can be tagged to the active `G`, forwarded, rendered, and included in a later snapshot. A master write's accepted count does not prove consumption by the intended foreground job; the prompt may reach a changed job or geometry. Live identity changes between diagnostics and PTY I/O are accepted races. |

## Decision 2 merge check

The merge is valid. Former 2A required a retained connection and one
server-side operation returning the complete atomic record; former 2B said
the frozen stock sequence had to be amended to a specified conditional
retained-server transport with those same semantics. They were two
descriptions of the same mechanism, not independent operator choices.

The merged row does not reintroduce an unspecified future transport. It
names:

- a maintained Linux-and-Darwin custom tmux client/server build;
- the retained-connection command and version,
  `agents-capture-v1`;
- every compared identity, geometry, history, metadata, and generation
  field;
- one server-event-loop compare-and-capture operation and exact response;
- retained-connection `%pane_id`/`$session_id` retirement; and
- deployment as a compatible default shared tmux so the frozen literal
  attach command remains unchanged.

The P1-2 omission about connection-loss cleanup is a disclosure defect, not
an unspecified-transport defect.

## HARD FAIL interlock check

The design-level interlock is genuine:

- Decisions 1 and 5 leave their byte paths hard-failing before the first
  affected byte (`design:219-221,580-582`);
- READY requires the authorities amended by Decisions 1, 2, and 5, so none
  of the claim/port/observation/byte/capture paths can succeed without those
  three (`design:396,451-455`);
- Decisions 3 and 4 alter frozen cleanup acceptance rather than a runtime
  workload effect, and the decision preamble makes all five one
  pre-implementation ratification set (`design:432-459`); and
- the final STOP authorizes no D/0/07c implementation trial until all five
  are ratified (`design:584-599`).

Thus the fact that Decisions 3 and 4 are not READY predicates is not a
fail-open path: no partial implementation is authorized in which READY could
exist while either is declined. A future implementation must preserve that
single all-five authorization gate and must not reinterpret the
READY-specific list as permission for a partial feature.

Accepting the amendments would authorize only a later implementation trial.
The candidate explicitly authorizes no integration, promotion, release,
port-surface change, D/0/07d gate, or splice. This review does not verify a
runtime interlock because the candidate contains no implementation.

## What I verified and did not verify

Verified:

- the complete candidate design, frozen D/0/07 and D/0/07c requirements,
  relevant D/0/07b identity/write rules, the Trial 4 request, and the helper
  topology/lifetime code used as design evidence;
- that the candidate diff is limited to
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`;
- `git diff --check` for the nominated base/design range;
- local Linux man-pages and exported headers for Unix credentials and
  stream I/O, pidfds/signalling, cgroups, wait/process groups, PTYs,
  unlinkat/openat2/renameat2, and ACLs;
- local tmux 3.6 documentation for the shared default server, control
  connection, lifetime IDs, separate capture/metadata operations, and
  pane/session/server destruction;
- Apple `getpeereid(3)`, `kill(2)`, `setpgid(2)`, `setsid(2)`, and `wait(2)`
  documentation; and Apple XNU's current exported syscall, Unix-domain
  socket, `fcntl`, and coalition sources; and
- each removal, amendment, capability-loss cell, residual risk, Decision 2
  merge, HARD FAIL statement, and scope boundary independently.

The principal external documentation consulted was:

- Linux man-pages: `unix(7)`, `recv(2)`, `send(2)`, `pidfd_open(2)`,
  `pidfd_send_signal(2)`, `wait(2)`, `setpgid(2)`, `pty(7)`,
  `ioctl_tty(2)`, `unlinkat(2)`, `openat2(2)`, `renameat2(2)`, and
  `acl(5)`;
- Linux kernel cgroup v2 documentation;
- Apple archived BSD/POSIX man pages under
  `developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/`;
  and
- `apple-oss-distributions/xnu` current sources, especially
  `bsd/kern/syscalls.master`, `bsd/sys/un.h`, `bsd/sys/fcntl.h`, and
  `osfmk/kern/coalition.{h,c}`.

Not verified:

- no source, test, design, sheet, or implementation behavior was changed or
  exercised;
- no full CI, runtime gate, standalone kernel/socket/lock probe, live
  provider call, or tmux server/session was run;
- no Darwin host execution was available, so Darwin rulings are based on
  Apple's published interfaces and XNU sources rather than an executable
  Darwin trial;
- no future custom-tmux binary, wire implementation, packaging, migration,
  or failure behavior exists in this candidate to execute or certify;
- no integration, promotion, release, D/0/07d, or splice claim was assessed;
  and
- reviewer A's concurrent Trial 4 result was neither opened nor used.

No check was interrupted by the provider content filter. The pre-existing
untracked `gateway/node_modules` directory was not touched.

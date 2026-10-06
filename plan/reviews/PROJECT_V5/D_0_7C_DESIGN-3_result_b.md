# Second Independent Design Review Result — Project V5 D/0/07c Design Trial 3 (reviewer B)

## Verdict

**reviewed_KO**

The amended rule is materially clearer, but the operator table is not yet a
ratifiable implementation contract. Several “provide a strong facility”
options name facilities that the stated Linux/Darwin product cannot supply;
the narrowed PTY option still has two materially different source-provenance
meanings; and the tmux retirement rule proves server identity without proving
that the whole server is owned. An implementer following the latter rule can
destroy unrelated sessions on the correctly retained server.

The current HARD FAIL text is fail-closed for Decisions 1, 2, and 5. That does
not cure the decision table: an operator must be able to select a real option
and know the guarantee and cost that selection authorizes.

This is a result-only design verdict. It authorizes no implementation,
integration, promotion, release, `D/0/07d`, or splice, and it decides none of
the operator choices.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 3 | Five strong-facility rows are not buildable Linux/Darwin choices under the frozen topology; 5B does not say whether PTY source authority is production-time or read-time; Decision 2 authorizes whole-server tmux destruction without an ownership condition. |
| P1 | 3 | Several commitment cells omit the actual amendment, deployment cost, or capability loss; 2A and 2B have the same guarantee and 2B contains an unspecified future transport; 4C contradicts R3's requirement to select N1 or N2 for every entry. |
| P2 | 0 | None. |

## Blocking findings

### P0-1 — five “strong facility” rows are specifications for absent facilities, not buildable options

The design itself correctly states that current stream, PTY, process-tree, and
pathname-removal primitives cannot supply the full bindings
(`07c-DESIGN-post-accept-binding.md:23-40,160-185,245-296`). The decision
table nevertheless presents the following as ratifiable implementation
choices without naming a facility that exists on both supported platforms:

- **1A:** neither a Unix stream operation nor a userspace helper can
  condition `recv`/`send` on another process's live
  executable/argv/cwd/pgid/sid tuple. A helper-side lock excludes `V`; it does
  not exclude mutation by the relay between inspection and the stream effect.
  Supplying the stated strength needs an additional kernel-enforced
  stop/immutability domain or privileged tracing contract. No corresponding
  Linux-and-Darwin contract is in the option.
- **3A:** Linux cgroup v2 can cover an important subset of dynamic-tree
  retirement, but Darwin has no general application facility that admits
  every child before execution/escape and later signals the retained domain
  without PID/PGID resolution. The relay is also created by tmux, outside the
  utility tree. Satisfying the row would change launch/containment in an
  earlier leaf and require a new privileged platform facility.
- **4A:** Linux and Darwin `unlinkat`/`rmdir` select a directory entry by
  basename. Neither takes an expected object handle/inode as a condition.
  This is the exact impossibility already acknowledged at
  `:38-40,293-296`; repeating “provide R3-N1” does not make R3-N1 a supplied
  facility.
- **4B:** ordinary DAC, mode bits, and ACLs grant directory mutation by
  principal, not by one process among arbitrary same-uid processes. The
  frozen relay peer is the helper euid, while the literal
  `tmux attach -t <tmuxTarget>` selects that user's default tmux server.
  Separating cleanup into another principal or socket namespace therefore
  also needs peer-identity, tmux-launch, and attach-command amendments that
  4B does not authorize. There is no stated Darwin capability domain that
  otherwise removes mutation authority from every same-uid actor.
- **5A:** POSIX PTYs on Linux and Darwin expose a byte stream at the master.
  They do not attach the writer PID/tree generation, foreground equation,
  winsize, or utility identity to each byte at production. A helper cannot
  reconstruct that information after the line discipline has combined the
  stream. The row requires a kernel PTY extension or interception of every
  producer, which conflicts with the frozen real-PTY/direct-`execve` and
  Python-standard-library leaf unless those contracts are also amended.

These options each describe one desired guarantee, but a desired guarantee is
not a build plan. Ratifying any one of them as written can leave a competent
implementer with no conforming Linux/Darwin facility and no authority to make
the additional platform, privilege, launch, dependency, or attach changes.
The real choices currently visible are the honest narrowing/preservation
paths, subject to the separate 5B defect below, plus a custom tmux extension
for Decision 2.

Required correction: remove dead options, or name a concrete supported
facility and every prerequisite contract/deployment amendment needed to
supply it on both Linux and Darwin. “Build a new kernel facility” is a
different operator commitment from implementing this leaf and must be stated
as such.

### P0-2 — 5B permits production-time and read-time source authority, which are different guarantees

R2 unconditionally requires a source facility to assign `G` and producer
provenance per byte **at production** and to retain distinct buffered spans
(`:202-219`). Option 5B removes live producer identity as a per-effect
prerequisite and says each PTY “consume” attempt shares `E`/`V` (`:390`), but
it does not expressly amend the production-time rule or define bytes already
buffered when `G` activates.

Two implementers can therefore produce materially different systems:

1. retain R2's production-time spans, reject/quarantine pre-`G` or
   other-generation bytes, and still require a PTY production hook that the
   retained descriptor does not provide; or
2. treat a nonblocking master read under live `G` as the source effect and
   accept every byte then buffered on the retained PTY, regardless of which
   process produced it or when.

The second is the buildable descriptor-narrowing design and is probably what
the operator is meant to approve. It is weaker: pre-activation buffered bytes
and bytes from any holder of the slave are accepted when consumed under `G`.
The first preserves the stronger historical attribution and remains
unbuildable with ordinary PTYs.

The same cell says 5A includes the full helper binding, but 5B's exhaustive
authority list omits live supervisor/reaper identity while its “cease” list
does not say that helper identity is dropped. Keeping it live recreates the
conditional-effect impossibility; treating the retained tagged channel as
historical helper authority weakens the contract. Both readings are
available.

Required correction: state the one intended 5B source rule, including
pre-`ACCEPT`/pre-activation buffered bytes, reads spanning activation or
revocation, and the status of every helper/reaper facet. Then state plainly
that the narrowed rule no longer proves which process produced a byte at
production.

### P0-3 — retained tmux server identity is not authority to destroy an unowned shared server

The parent freezes the literal `tmux attach -t <tmuxTarget>` command
(`plan/PROJECT_V5/D/0/07.md:122-128,153-170`). That command selects the
user's ordinary/default tmux server; the contract does not reserve one
dedicated server per port or prove that no other session uses it.

The candidate correctly establishes that `$session_id` and `%pane_id` are
lifetime-stable on one retained server connection (`:261-269`). That is
enough to retire the accepted pane and session. It is not an ownership proof
for the whole server. Nevertheless the inventory requires connection-local
`kill-server` (`:353-355`), both Decision 2 options commit to server
retirement (`:382-383`), and the namespace rules assume an owned tmux socket.
Tmux's own command contract says `kill-server` destroys all sessions on that
server.

Two implementations now appear possible:

- follow the candidate literally and kill the correctly retained shared
  server, destroying unrelated sessions; or
- kill only the accepted pane/session and preserve a pre-existing/shared
  server and socket, violating the stated server-retirement and Decision 4
  commitments.

The existing lifetime IDs distinguish replacement objects, but they do not
distinguish owned from shared objects. The server-destruction proof at `:435`
also tests replacement identity only; it has no sibling-session
non-collateral oracle.

Required correction: inventory ownership separately from identity. Either
remove whole-server retirement and preserve shared/pre-existing server and
socket state, or add a ratifiable dedicated-server/socket design and disclose
the required change to the exact attach mechanism. No whole-server effect may
run merely because the server identity is exact.

### P1-1 — the commitment cells do not consistently expose the real cost or capability loss

The detailed cell audit below records every row. The material omissions are:

- 1A, 3A, 4A, 4B, and 5A say “provide” the desired property without committing
  the operator to the required privileged/kernel, launch, dependency, or
  topology changes.
- 1B removes live relay fields but does not say what happens to the parent's
  no-fork/no-daemonize/no-socket-handoff rule. The historical peer tuple and
  original socket cannot identify the process currently using a delegated
  descriptor. Either delegation becomes part of the narrowed authority, or an
  additional enforceable live-holder prerequisite remains.
- 2A requires a custom tmux server/client protocol or maintained tmux build,
  despite the frozen stock 3.6 direct-argv mechanism. “Extension” does not
  disclose that compatibility and distribution commitment.
- 5B lists removed fields, but does not tell the operator the product
  consequence: an exact write-time foreground/geometry check is no longer an
  authority condition, and output from any process with the retained slave can
  be accepted. Stable diagnostics may still reject; the race-time guarantee is
  what is lost.

An operator can infer some of those costs from the rules, but the contract
says the table cell itself is the ratification commitment. Those cells must
stand alone.

### P1-2 — 2A and 2B do not offer different binding strengths, and 2B is a placeholder

Both options require the same retained connection, complete atomic record,
`G` ordering, byte oracles, and pane/session/server retirement. A conditional
transport capable of reading tmux server state and capture bytes in one
server operation is, in substance, the retained tmux extension described by
2A. Conversely, 2A cannot be implemented by merely sequencing the frozen
stock commands and therefore also changes the frozen transport/mechanism.

Option 2B additionally refers to a “specified” transport, but no transport is
specified in the option. Ratification would authorize a later unspecified
design, not tell the implementer what to build.

The Trial 2 redundancy between Decision 2 and the tmux portion of Decision 3
is resolved: Decision 3 now covers only the utility tree and forced relay
target. A new redundancy remains inside Decision 2. Merge 2A/2B into one
honest custom-tmux choice, or distinguish two concrete mechanisms and their
different operator commitments.

### P1-3 — 4C is not one of the namespace rules that R3 says Decision 4 must select

R3 says Decision 4 “must select one” of R3-N1 or R3-N2 for every entry and
calls those the two mutually exclusive alternatives (`:271-273`). Option 4C
selects neither; it amends the leak-free criterion and preserves the entry
(`:388`).

The general destructive-REJECT rule makes preservation the likely intended
meaning, but an implementer cannot simultaneously obey the mandatory
N1-or-N2 sentence and 4C. R3 must say that N1/N2 apply only when removal is
selected and that 4C is the third, no-removal outcome.

## Per-option buildability and binding-strength ruling

| Option | Linux and Darwin buildability | One binding strength? | Ruling |
|---|---|---|---|
| 1A | **No, not as written.** No supplied cross-platform operation excludes relay mutation while comparing the full tuple and performing stream I/O. | The aspirational full-tuple strength is singular; “helper-controlled” is not itself the missing exclusion facility. | Dead option until a concrete platform mechanism and its privilege/topology contract are named. |
| 1B | **Yes, after amendment.** Retained nonblocking socket operations and local `E`/`V` serialization exist on both hosts. | **Not quite.** Exhaustive endpoint authority permits no live-holder proof, while the parent still forbids descriptor handoff. | Real only after explicitly deciding whether handoff/live-holder continuity is removed. The likely intent is socket object + historical handshake tuple + live `G`. |
| 2A | **Yes, with a maintained custom tmux extension/transport on both hosts; not with stock tmux 3.6.** | Yes: one complete conditional capture record and retained-connection object retirement. | Real after the custom runtime/distribution and server-ownership corrections are part of the commitment. |
| 2B | **Not yet.** The promised “specified” transport is absent, and any qualifying server transport is materially the 2A extension. | Same strength as 2A. | Redundant placeholder, not an independent choice. |
| 3A | **No.** Linux has partial cgroup/pidfd building blocks; Darwin has no general dynamic retained descendant domain matching the row. | Yes, if such a domain existed. | Dead cross-platform option under the current product contract. |
| 3B | **Yes.** Descriptor close, sticky revoke, and preservation are portable. | Yes: never resolve a numeric destructive target when exact authority is absent. | Real amend-option. |
| 4A | **No.** Neither supported host has expected-object conditional `unlink` and conditional `rmdir`. | Yes, if a new filesystem/kernel primitive existed. | Dead option under existing facilities. |
| 4B | **No under the frozen same-euid/default-tmux topology.** Principal-based permissions cannot reserve mutation to one same-uid process, and a separate principal breaks other frozen bindings without amendments. | Yes, if continuous exclusive custody could be established. | Dead as written; a privilege-separated/sandboxed topology would be a different option. |
| 4C | **Yes**, once the R3 N1/N2 contradiction is removed. | Yes: preserve and reject whenever removal authority is absent. | Real amend-option. |
| 5A | **No.** Ordinary Linux/Darwin PTYs do not provide production-time per-byte producer/generation evidence or conditional full-tuple writes. | Yes, if a kernel/interposition facility covering every producer existed. | Dead option under the real-PTY/direct-provider contract. |
| 5B | **Writes are buildable; the source side is not ratifiable yet.** | **No.** Production-time spans and read-time retained-PTY attribution are materially different. | Likely intended real fallback is read-time retained-object + live-`G` authority, but the design must say so and disclose the loss. |

Therefore the options presently real enough to implement are 3B and, after a
small rule correction, 4C. 1B and 5B can become real narrowed choices after
their remaining semantics are fixed. Decision 2 has one feasible custom-tmux
direction, not the two choices shown. The strong options do not presently form
a second, cross-platform branch.

## Audit of “ratification commits the operator to” cells

| Option | Cell accuracy |
|---|---|
| 1A | **Understated/dead.** It states the full comparison but not the kernel mutation exclusion, privilege, or relay-containment mechanism required to make a helper authoritative. |
| 1B | **Partly accurate.** It enumerates the historical tuple and removed live facets, but omits the fate of current-holder/socket-handoff authority. |
| 2A | **Understated.** It states the atomic record, but not the maintained custom tmux build/protocol, stock-3.6/exact-command amendment, or shared-server ownership condition. |
| 2B | **Incomplete.** It correctly says stock command sequencing is lost, but asks the operator to approve a transport that has not been specified. |
| 3A | **Understated/dead.** “From creation” entails provider/tmux launch and privileged containment changes outside this leaf; no Darwin facility is supplied. |
| 3B | **Accurate.** It says unresolved processes may remain and numeric signalling is forbidden. It should additionally foreground that those processes can continue running and consuming resources. |
| 4A | **Circular/dead.** It restates R3-N1 rather than committing to an available Linux/Darwin mechanism. |
| 4B | **Understated/dead.** It states the invariant but not the new principal/sandbox/default-tmux/attach changes needed to establish it. |
| 4C | **Mostly accurate.** It states preservation and the leak-free amendment, but must include all four entries and be reconciled with R3's mandatory N1/N2 wording. |
| 5A | **Understated/dead.** It does not disclose kernel PTY instrumentation or replacement/interposition of the frozen producer path. |
| 5B | **Understated and ambiguous.** It lists removed live fields but not read-time versus production-time source authority, buffered-byte treatment, helper binding, or the resulting foreground/producer guarantee loss. |

## Capability loss for every amend-option

| Amend-option | Capability the product loses | Does the design say so? |
|---|---|---|
| 1B | It loses effect-time proof that the exact accepted relay process still has the accepted executable/argv/cwd/pgid/sid. The original socket plus historical peer proof cannot detect descriptor delegation to another holder. | **Partial.** The field removal is stated; the loss of exact live relay-holder/handoff assurance is not. |
| 2B | It loses compatibility with the frozen stock tmux 3.6 separate metadata and exact-capture invocation as the authority mechanism. It must ship/use a custom retained transport. The atomic snapshot guarantee itself is not narrowed. | **Mostly.** The stock sequencing loss is stated; the concrete replacement and distribution cost are not. |
| 3B | It loses guaranteed retirement of the utility group, descendants, and a non-cooperative relay. They may remain live and continue side effects/resource use after the port rejects. | **Yes at criterion level.** “Preserve unresolved processes” is clear, though the continuing-process consequence should be in the cell. |
| 4C | It loses guaranteed deletion of a residual relay key, relay socket, owned runtime directory, and owned tmux socket. Secret/name/disk artifacts and blocked future reuse may remain. | **Yes at criterion level.** The individual residual consequences are not enumerated, and R3 currently contradicts the option. |
| 5B | It loses effect-time proof of the live utility/helper tuple, foreground job, winsize, and byte producer. A stable diagnostic can still reject, but a change at the effect boundary can pass; bytes from any slave holder may be accepted and a write may reach a different foreground generation. | **Partial.** The removed field names are present; the product-level effect, helper status, and buffering rule are not. |

## Completeness and redundancy

- **The prior tmux/Decision 3 redundancy is closed.** Decision 3 no longer
  asks for a second pane/session/server capability; the retained connection
  and lifetime IDs in Decision 2 are sufficient for exact pane/session
  targeting.
- **A server-ownership decision or rule is missing.** Exact identity is not
  exclusive ownership. The design must distinguish an owned dedicated tmux
  server/socket from a shared or pre-existing default server/socket before
  `kill-server` or namespace cleanup. This is the P0-3 gap.
- **Decision 2's two options are redundant.** Both promise the same custom
  retained-server operation and binding strength; 2B merely postpones naming
  it.
- **Whole-server retirement is itself redundant when the server is shared.**
  Accepted lifetime IDs already permit exact pane/session retirement.
  `kill-server` adds collateral reach, not binding strength.
- **4C is a third namespace outcome that R3 omits.** N1/N2 are complete only
  for the removal branch.
- The revised inventory does cover readiness, retained fd 4/5 sideband
  transfer and settlement, relay input/output and both barrier directions,
  PTY source and both write paths, the four named namespace entries, and
  direct retained-descriptor closure.
- The external local attach is explicitly outside the programmatic port.
  Its terminal bytes re-enter the governed relay-input and PTY-write paths, so
  it is not a separate authorization exception. Its default-server selection
  is nevertheless relevant to the missing tmux ownership rule above.

## HARD FAIL interlock

The textual interlock is internally fail-closed:

| Unratified decision | Paths checked | Result |
|---|---|---|
| 1 | relay receive/admission, provider-output destination send, both barrier directions, readiness | Each exact relay effect commits/consumes zero; no `READY(G)` candidate is emitted. |
| 2 | atomic capture, readiness, tmux retained-connection retirement | No capture record or readiness candidate is accepted. Without the retained connection, tmux name-based retirement remains forbidden/preserved. |
| 5 | PTY production/source consumption, broker/operator and programmatic writes, readiness | No first affected PTY byte is consumed/written and no readiness candidate is emitted. The post-`F` rule is reachable only after an earlier authorized positive effect, not from an entirely unratified path. |

Because readiness requires all three facility sets, `claim`, port issuance,
and `observation` cannot quietly succeed while any of Decisions 1, 2, or 5 is
unratified. Canonicalization and public settlement have no accepted candidate
to settle. Direct descriptor close may still succeed during rejection; that
is the intended identity-bound cleanup path, not a fail-open product result.
Decisions 3 and 4 preserve/reject unresolved destructive targets until their
criteria are amended or authority is supplied.

This is a semantic design check, not a claim that the existing Trial 3
implementation enforces the interlock. The P0 findings above prevent any
honest future activation until the choices are repaired.

## Scope

Scope passes independently of the design findings:

- design commit `55488cf1373d336df052df50177681f3138ec968`
  changes only
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`;
- request commit `526703c38afbacfc8951f4c6696353512de475db`
  adds only
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-3_to_review.md`;
- candidate-range whitespace checking passed;
- no implementation, test, frozen parent, port surface, public error,
  adapter/service/catalog splice, provider launch, `D/0/07d`, integration,
  promotion, or release change is in the candidate.

## What I did and did not verify

Verified:

- the full reviewer-B brief and, in the mandated order, the complete candidate
  design and the specified Design Trial 2 reviewer-B result;
- exact HEAD/candidate/request lineage, changed-path scope, and whitespace;
- all 11 options across the five decisions for Linux/Darwin buildability,
  binding strength, commitment accuracy, and amendment capability loss;
- every R1-R4 rule and post-`ACCEPT` inventory row relevant to readiness,
  relay/PTY/capture effects, sideband settlement, process/tmux retirement, and
  the four namespace entries;
- the relevant frozen parent topology, exact default attach command, identity
  tuple, PTY outcomes, stock direct capture commands, and leak-free criteria;
- installed tmux 3.6 documentation for lifetime-stable server-local
  session/pane IDs and `kill-pane`, `kill-session`, and targetless
  `kill-server` semantics, without starting a tmux server;
- the current Linux/Darwin API contract at the design level: retained stream
  and PTY descriptors, Linux cgroup/pidfd partial facilities, pathname
  `unlinkat`/`rmdir`, and the absence of a stated Darwin counterpart for the
  proposed dynamic/process/namespace/PTY facilities;
- completeness, redundancy, capability loss, and the Decisions 1/2/5 HARD
  FAIL reachability.

Not verified:

- no proposed relay authority, PTY provenance facility, Darwin dynamic process
  domain, conditional filesystem removal primitive, custody sandbox, or
  custom tmux transport exists in this candidate to execute;
- I did not review or run the prior Trial 3 implementation; existing helper
  and tmux-client files were consulted read-only only to confirm the frozen
  direct/default-socket topology;
- no Darwin host was available;
- I did not run full CI, runtime/provider/network behavior, a live tmux
  session, `D/0/07d`, splice, integration, promotion, or release checks;
- I did not decide an operator option or inspect the concurrent reviewer-A
  verdict.

No provider content filter interrupted a check. I used no sub-agent, started
no tmux server, addressed no default socket or `ag-*` session, changed no
source, test, design, or plan sheet, and left the pre-existing untracked
`gateway/node_modules` entry untouched.

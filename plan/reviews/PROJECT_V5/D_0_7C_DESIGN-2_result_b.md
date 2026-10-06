# Second Independent Design Review Result — Project V5 D/0/07c Design Trial 2 (reviewer B)

## Verdict

**reviewed_KO**

The candidate closes the explicit Design Trial 1 omissions: PTY writes and
provider-output reads are now subject to R2, utility-group and
adopted-descendant retirement are inventoried, the relay close frame is
addressed, and the capture-generation and sticky-revocation proof cases are
split.

It is still not an implementable authorization design. The definition of an
indivisible effect requires a facility to perform the effect and return
evidence, but never requires the facility to condition the effect on matching
evidence and a live generation. One reasonable implementation can therefore
send or write bytes and reject after the returned evidence differs; another
can atomically compare and suppress the effect. Both follow the stated record
shape, but only the latter supplies the intended binding strength.

The design also gives incompatible answers for one PTY site. Its universal
`REJECT` is `SESSION_PORT_TERMINAL_CHANGED` with no transfer, while the frozen
parent and the inventory's own D/0/07b delegation require
`SESSION_PORT_IDENTITY_CHANGED` for utility identity,
`SESSION_PORT_NOT_FOREGROUND` for the foreground equation, and
`SESSION_PORT_WRITE_ABORTED` if a later effect rejects after an authorized
short-write prefix. No implementation can satisfy both sets of outcomes.

This is a result-only design verdict. It authorizes no implementation,
integration, promotion, release, `D/0/07d`, or splice, and it decides none of
the operator questions.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 2 | The future R2 records do not condition a write/send on matching evidence or linearize generation liveness with the effect; the universal `REJECT` disposition and zero-transfer promise contradict the frozen utility/foreground and partial-write outcomes. |
| P1 | 3 | The claimed complete inventory is not rule-complete for readiness, private sideband settlement, and all namespace entries; the operator choices contain materially undefined authority options, an R3/Decision 4 conflict, and a redundant tmux-retirement choice; four proof rows are masked, use the wrong oracle, or leave the decisive producer timing unspecified. |
| P2 | 0 | None. |

## Blocking findings

### P0-1 — an evidence-returning effect is not a conditional authority

The binding sentence requires an indivisible handle-and-use operation
(`07c-DESIGN-post-accept-binding.md:47`), and the definition says that the
operation both performs the effect and returns its mutable evidence
(`:66-69`). R2 repeats “attested by the same indivisible operation”
(`:95-98`). The PTY record then contains identity, generation, byte count, and
disposition, while its write form performs the write (`:127-142`).

None of those statements requires the facility itself to:

1. receive the expected accepted identity and generation as conditions;
2. compare them before the effect's linearization point;
3. prove that the generation is still live at that same point; and
4. perform zero bytes when either comparison fails.

That omission is material for every output effect. Consider two
implementations of the proposed PTY facility:

- implementation A performs `write`, atomically snapshots the requested
  fields, returns `{count, evidence}`, and lets the caller reject a mismatch;
- implementation B atomically compares the expected fields and live
  generation, performs the write only on equality, and otherwise returns a
  zero-byte rejection.

Both perform the effect and return the evidence in one facility call. Only B
prevents bytes from crossing. The same split exists for a relay-destination
send. A post-send record is no safer than the post-read checks this design is
intended to prohibit.

Generation attachment does not close the gap. R1 says a queue accepts and
takes only for the same live generation (`:83-91`), and R4 makes revocation
sticky (`:190-199`), but the design provides no effect/revocation
linearization rule. Checking `G.live`, then calling an atomic PTY or relay
facility, is another check-then-act interval. Merely returning the token `G`
does not prove that `G` was live when bytes crossed. The parent already has
mutation and settlement locks, but this design does not say that the new
queue, PTY, relay, barrier, and capture effect points participate in either
lock or in an equivalent generation lease.

Required correction: define a **conditional compare-and-effect** primitive,
not an evidence-returning primitive. It must take the expected accepted
identity and generation, establish one linearization point shared with
revocation, perform no externally visible effect on mismatch/revocation, and
return the exact committed count. Define how a valid effect ordered before
revocation and an effect ordered after revocation are distinguished.

### P0-2 — `REJECT` contradicts the frozen PTY dispositions and short-write contract

The design defines every `REJECT` as
`SESSION_PORT_TERMINAL_CHANGED`, sticky revocation, and no provider or relay
transfer (`:70-74`). It applies that definition to the full utility identity,
PTY state, and foreground equation (`:110-120`), and its PTY mutation case
expects terminal-changed after changing the foreground group (`:287`).

The frozen parent gives different exact answers:

- a utility executable/argv/cwd/PGID/SID mismatch is
  `SESSION_PORT_IDENTITY_CHANGED`
  (`plan/PROJECT_V5/D/0/07.md:311-314,628-644,719-720`);
- a foreground-equation mismatch before the first positive write is
  `SESSION_PORT_NOT_FOREGROUND` (`07.md:635-644,735-737`);
- after the first positive short-write return `F`, a later identity,
  foreground, terminal, close, or cancel event is
  `SESSION_PORT_WRITE_ABORTED`, because the accepted prefix cannot be rolled
  back (`07.md:646-658,692-749`).

The inventory itself says D/0/07b continues to own partial-write accounting
and public disposition (`07c-DESIGN-post-accept-binding.md:208`). It therefore
delegates to the parent and overrides that delegation in the same row through
the universal `REJECT`.

The contradiction remains after an atomic facility is approved. A first
conditional write may validly commit a short prefix. If the next conditional
write observes a changed foreground, that second effect must write zero, but
the public operation already has an authorized transferred prefix and must
abort. It cannot truthfully satisfy “no provider transfer” or return
terminal-changed.

Required correction: distinguish effect-level rejection before `F` from
operation-level disposition after an earlier authorized effect. Preserve the
parent's exact identity, foreground, terminal, and post-`F` mappings instead
of assigning one error to every failed prerequisite.

### P1-1 — the complete site inventory is not rule-complete

Three inventory boundaries remain ambiguous or incomplete.

First, R1 says without qualification that data transfer may use only the
accepted relay socket and retained PTY descriptors (`:83-87`). The private
snapshot/write response is data transferred on the retained fd 5 sideband,
but its inventory row is governed only by R4 and mentions only a tagged
result (`:216`). Readiness metadata and the observation are also exposed
through non-relay/non-PTY channels. If “data transfer” means all transfer,
R1 forbids the frozen sideband result. If it means only terminal bytes, the
rule must say so and the result row must require the retained sideband handle,
the frozen ASP1 tag/sequence, and the same generation. Two implementers can
currently make opposite choices.

Second, the readiness row says to publish after required handles and
facilities “exist,” is governed by R1/R2 but not R4, and says only that
readiness rejects under current primitives (`:205`). It does not define the
generation-live linearization for publication or the bootstrap/claim
disposition when there is no method response on which to return the global
terminal-changed error. “Facility exists, then publish” is also a property
check, not the concrete mechanism required by the universal sentence.

Third, R3 starts with every filesystem entry but defines the retained approved
identity only for a socket (`:175-188`). The inventory later groups relay key
and runtime entries together without specifying the retained identity or
deletion mechanism for the regular key entry and runtime directory (`:223`).
The parent acceptance criterion covers leaked key files and runtime
directories as well as sockets. A final `rmdir(parent/name)` has the same
replacement interval as pathname `unlink`, yet Decision 4 and the claimed
decision completeness are framed as socket deletion and no-socket-leak
(`:254-257,273-275`).

Required correction: scope R1 explicitly; add retained sideband/readiness
mechanisms and generation ordering; inventory each post-`ACCEPT` namespace
entry with its retained identity and conditional removal/preservation rule;
and extend the corresponding operator decision beyond socket inodes.

### P1-2 — the operator alternatives do not form a ratifiable mechanism set

The open choices are expected to leave policy to the operator. They still
must be precise enough that selecting one yields one binding strength. These
do not:

- Decision 1 offers a “kernel-enforced immutable execution domain” or
  “authoritative same-frame mechanism” without defining the immutable fields,
  the attesting principal, the trust boundary, the frame linearization point,
  or conditional suppression of a destination send (`:236-240`). A signed
  self-report from the relay and kernel-conditioned delivery both satisfy the
  nouns but are materially different authorities.
- Decisions 1 and 5 allow narrowing to what a retained descriptor “actually
  holds” without enumerating the minimum retained peer/process/PTY facets.
  One implementation can retain only connected-endpoint continuity; another
  can retain the connect-time kernel peer tuple and process instance.
- The PTY-source choice does not say how to split a read containing bytes
  produced by two generations, whether valid buffered bytes remain valid
  after the foreground changes, or whether descendants in the foreground
  group are approved producers (`:127-142,258-268`). Per-read, per-write,
  per-frame, and per-byte attribution produce materially different results.
- R3 requires removal to be conditioned on the retained inode in the same
  atomic operation (`:175-184`), but R3 and Decision 4 also accept “exclusive
  directory mutation authority” (`:185-186,254-257`). Exclusive namespace
  custody can make a pathname stable, but pathname removal is not a
  conditional retained-inode operation. The design must define the custody
  invariant and make it an explicit alternative rule instead of asserting
  both requirements.

Decision 3 also spends a separate operator choice on tmux destruction that
Decision 2 already makes achievable. Decision 2 requires one retained
tmux-server connection (`:241-246`). The installed tmux 3.6 manual documents
server-local session and pane IDs as unique and unchanged for each object's
lifetime, `kill-pane` and `kill-session` accept those IDs, and `kill-server`
has no target: on the retained connection it necessarily addresses that
server. The candidate itself excludes a pane ID only when used on a **new**
connection (`:58-62,222`) and its R3 proofs already assume the retained
connection (`:295-297`). Once Decision 2 supplies that connection, retained
connection plus the accepted unique IDs can destroy the exact pane/session or
fail if it is gone, and `kill-server` can destroy that exact server. The
process/group/adopted-descendant part of Decision 3 remains necessary; the
tmux part should be resolved by the retained mechanism rather than consume
another ratification.

### P1-3 — four proof obligations do not prove their named rule

The detailed per-row ruling appears below. The four blocking rows are:

1. The R1 endpoint test supplies a supposedly valid same-effect R2
   destination record while changing the actual destination endpoint. Under
   the frozen full relay tuple, a different replacement process cannot both
   be the effect destination and yield valid accepted-process evidence. If
   the record is for the old endpoint, R2 is not intact. R2 can reject first.
2. The PTY-write test expects terminal-changed for a foreground change, so a
   correct implementation preserving the frozen NOT_FOREGROUND disposition
   cannot establish a green baseline.
3. The PTY-source test changes the generation before `read` but never states
   when the 25 bytes were produced. The approved design explicitly attributes
   buffered bytes when produced. Bytes produced by the old valid generation
   and bytes produced after the change require opposite source-record
   outcomes.
4. The close-frame test starts with G revoked while the close-frame row is
   governed by R4. An intact implementation may suppress every protocol write
   for the closed generation before reaching the missing-R2-evidence guard,
   so restoring the frame can remain green.

## Underdetermination ranking

| Rank | Ambiguity | Materially different conforming implementations |
|---:|---|---|
| 1 | R2 evidence return versus conditional compare-and-effect, plus R4/effect linearization | Write/send then inspect and reject versus zero-effect atomic conditioning; unlocked `G.live` check versus one revocation/effect linearization point. |
| 2 | Meaning of authoritative relay/PTY evidence and source attribution | Relay self-attestation versus kernel/server enforcement; one generation per read versus byte/range provenance; foreground group output versus utility-PID-only output. |
| 3 | Existing public disposition and partial-effect scope of `REJECT` | Universal terminal-changed/no-transfer versus the frozen identity/not-foreground/write-aborted state machine. |
| 4 | Namespace authority and object coverage | Retained-inode conditional removal versus pathname deletion under an undefined exclusive domain; sockets only versus socket, key, and runtime-directory coverage. |
| 5 | Generation and non-terminal channel binding | Random token versus local object/counter; separately checked live bit versus locked lease; R4-only sideband settlement versus retained-sideband plus tag/sequence/generation validation. |
| 6 | Destruction-domain extent | Snapshot of current PIDs versus a dynamic utility-tree domain; a second tmux capability decision versus using the already-required retained connection and unique object IDs. |

## R1–R4 implementer adjudication

| Rule | Concrete mechanism or property? | Ruling |
|---|---|---|
| R1 | Concrete for accepted relay and retained PTY descriptors; property-only for queue/generation liveness and ambiguous for non-terminal channels. | **Incomplete.** Endpoint continuity is implementable, but no atomic queue/effect/revocation mechanism is named and the unqualified transfer sentence conflicts with the private sideband result. |
| R2 | Record fields are partly concrete; every future authority is an operator-selected property. | **KO.** The record is not defined as a conditional authority, “authoritative” has no trust rule, and stream/source segmentation is unspecified. Current HARD FAIL is satisfiable, but ratifying any vague future facility is not sufficient. |
| R3 | Direct descriptor shutdown/close is concrete. Process/tree capability, tmux object capability, and namespace deletion are open. | **Partial.** Descriptor retirement is implementable. Dynamic process-tree retirement needs a decision. Retained tmux retirement is already available once Decision 2's connection exists. The inode rule and exclusive-directory alternative conflict, and non-socket entries are not specified. |
| R4 | Sticky state is a property; direct non-revival is clear. | **Incomplete.** No representation or linearization mechanism ties revocation to queue admission, writes, sends, capture acceptance, and sideband settlement. The settlement-only behavior is testable, but it does not protect earlier effects. |

## Per-site inventory adjudication

| Site | Implementer ruling |
|---|---|
| Publish private readiness | **Open.** Facility existence is not a live-generation publication mechanism; R4 and the bootstrap/claim outcome are missing. |
| Receive operator input from the relay | **Open.** Accepted fd and zero queue admission are clear; authoritative frame evidence, frame boundary, and generation/effect linearization are not. |
| Forward broker/operator input to the provider | **Open.** The PTY facility is undefined, and the row requires an accepted relay record while R1 says the queue carries only generation. The design does not say whether relay provenance or only G travels with the bytes. |
| Programmatic prompt write | **Contradictory.** R2 applies, but global terminal-changed/no-transfer conflicts with D/0/07b's delegated identity, foreground, partial-write, and abort dispositions. |
| Read provider output from the PTY | **Open.** Producer attribution time is stated, but mixed-generation buffering, approved descendant producers, and read-consumption behavior are not. |
| Forward accepted provider output to the relay | **P0-open.** Retained fd and immutable source bytes are clear; conditional destination send and live-generation linearization are absent. |
| Send and receive the relay flush barrier | **Open.** The row does not say whether request send, response receive, and acknowledgement acceptance are separate conditional effects or one transaction, nor where G/token linearizes. |
| Drain output before snapshot | **Inherits.** It is complete only after both provider-output rows are made concrete. |
| Observe tmux identity, dimensions, history, and metadata by name | **Concrete.** Diagnostic-only, rejection-only use is unambiguous and does not authorize capture. |
| Execute `capture-pane` | **Conditionally concrete.** The atomic record fields and current HARD FAIL are clear. Success requires the operator-approved retained-server operation and a parent amendment. |
| Canonicalize capture bytes | **Concrete.** It is a pure transform after complete record acceptance; R4 still controls later settlement. |
| Return the private snapshot/write result | **Rule-incomplete.** R4 is necessary, but the retained sideband descriptor and frozen ASP1 tag/sequence authority are omitted while R1's scope is ambiguous. |
| Send `RELAY_DATA_CLOSE` | **Concrete current outcome.** Send no frame and close the descriptor. Its proposed proof is nevertheless masked by R4. |
| Close relay and PTY descriptors | **Concrete.** Direct shutdown/close through each retained descriptor is identity-bound. |
| Close control/transcript/session-port/other sideband descriptors | **Concrete for known retained fds.** “Other” is not a literal complete inventory, but direct once-only close is the correct uniform mechanism. |
| Signal utility group and adopted descendants | **Open.** A retained dynamic tree capability is a property; the set of descendants and how future descendants enter it are not defined. Current preserve/reject is clear. |
| Terminate relay process | **Partly concrete.** Retained-socket shutdown and cooperative exit are concrete; forced termination remains an open process-instance capability. |
| Terminate tmux pane/session/server | **Achievable once Decision 2 is selected.** Use its retained server connection, accepted unique session/pane IDs, and connection-local `kill-server`; a new path/target lookup remains forbidden. |
| Remove relay key/runtime entries | **Incomplete.** No exact retained identity or conditional operation is named for the regular file and runtime directory, and Decision 4 is socket-scoped. |
| Remove tmux socket entry | **Concrete HARD FAIL under current APIs.** Conditional retained-inode removal is clear; the exclusive-directory alternative must be specified as a different invariant. |
| Expose `observation` | **Mostly concrete.** The DTO is inert. Its exposure still needs the same generation/settlement ordering as any other public result. |

## Contradiction and satisfiability findings

### Internal contradictions

| Conflict | Result |
|---|---|
| Universal `REJECT` terminal-changed versus D/0/07b-owned identity/not-foreground/write-aborted dispositions | No single implementation can satisfy both. |
| Universal no-transfer rejection versus a later rejected effect after an earlier authorized short-write prefix | The earlier prefix cannot be undone; the design must distinguish effect and public-operation outcomes. |
| R1's unqualified “data transfer” only on relay/PTY versus the R4-only fd 5 private response | Either R1 forbids a frozen sideband response or the inventory omits its retained-handle rule. |
| R3 requires one-operation retained-inode-conditioned deletion while Decision 4 permits pathname deletion under exclusive authority | These are alternative invariants, not the same mechanism; the rule must say which one an operator selected. |
| R4 permanently closes G while the R2 close-frame proof deliberately starts after G is revoked | R4 may reject first, contradicting the proof's assertion that only R2 can catch the frame. |

### Satisfiability and operator-decision ruling

| Decision/rule | Ruling on Linux and Darwin |
|---|---|
| 1. Relay mutable identity | **Necessary under the full frozen tuple, but not ratifiable as written.** Current stream operations cannot attest all facets. A concrete conditional delivery/receipt authority or an exact narrowed tuple is required. |
| 2. Atomic tmux capture | **Necessary.** Stock tmux 3.6's separate metadata and exact capture argv do not return the complete record in one operation. A retained server extension/transport or a parent amendment can make the requirement satisfiable. |
| 3. Identity-bound retirement | **Necessary for the portable utility/process-tree portion. Partly unnecessary for tmux.** No current portable process/group/tree destruction handle covers the frozen targets. The retained tmux connection already required by Decision 2, together with stable server-local IDs, supplies exact tmux retirement without another primitive decision. |
| 4. Conditional socket deletion | **Necessary but incomplete.** Current portable pathname APIs do not condition deletion on an expected inode. The decision must cover relay socket, tmux socket, key leftovers, and runtime-directory removal, and define exclusive custody if that alternative is chosen. |
| 5. Atomic utility/foreground/PTY effects | **Necessary under the full frozen prerequisites, but not ratifiable as written.** No current PTY read/write supplies the record. A future mechanism is satisfiable only if it is conditional, shares generation linearization, and defines producer/partial-byte semantics; an exact narrowed contract is the other honest path. |
| Direct descriptor retirement | **Already satisfiable.** Retained fd shutdown/close requires no operator decision. |
| Sticky local generation state | **Satisfiable.** A local state machine and lock/lease can implement it, but the design must name its effect linearization rather than only the property. |

The candidate is correct that current primitives cannot preserve the frozen
positive transaction while applying its HARD FAIL rule. That conflict is
declared rather than hidden. The KO is that selecting one of several present
operator labels would still not tell an implementer which conditional
authority and exact outcomes to build.

## Per-row falsifiability judgment

These are design judgments on the future specifications; no unresolved
facility was treated as an executable green baseline.

| Proof row | Judgment | Isolation/falsifiability |
|---|---|---|
| R1 retained endpoint | **KO as written** | A different replacement process cannot yield a valid same-effect R2 record for the accepted full relay identity. Supplying A's record while sending to B also breaks R2. Specify a second endpoint of the same frozen process or an explicitly narrowed R2 baseline so only R1 differs. |
| R2 relay-destination atomic evidence | **Conditional pass** | It isolates the destination facet if P0-1 is corrected to require conditional send and no independent diagnostic revokes first. The retained fd, source record, and G can otherwise remain intact. |
| R2 PTY-write atomic evidence | **KO** | The timing isolates R2, but terminal-changed is the wrong frozen oracle for a foreground change. It must require NOT_FOREGROUND before `F`, with a separate utility-identity case if desired. |
| R2 PTY-source atomic evidence | **KO** | The case does not say whether the exact 25 bytes entered the PTY before or after the producer-generation change. The approved source record explicitly depends on that fact, so the named mutation need not redden. |
| R2 teardown protocol write | **KO/masked** | G is already revoked and the row is governed by R4. An intact R4 generation gate can suppress the restored frame before R2 is reached. |
| R2 atomic capture geometry | **Conditional pass** | With a real atomic-record baseline, restored pre/post diagnostics, correct G, and capture-bound 121 width isolate geometry. |
| R2 atomic capture generation | **Pass** | Direct record acceptance with only H-for-G wrong stops before R4 settlement and isolates the record-generation comparison. |
| R3 utility-process-group destruction | **Conditional pass** | One deterministic A-to-B PGID reuse and no other cleanup target isolate group destruction. The fixture must guarantee the reuse rather than rely on host allocation timing. |
| R3 adopted-descendant destruction | **Pass** | One deterministic PID target, B-survival, and all other targets disabled isolate the capability. |
| R3 relay-process destruction | **Pass** | With accepted fd closure already complete and only forced targeting enabled, B-survival isolates fresh-PID signalling. |
| R3 tmux-pane destruction | **Pass** | A retained server connection, accepted unique pane ID baseline, and public-target mutant distinguish A from replacement B. |
| R3 tmux-session destruction | **Pass** | The same retained-server setup with the accepted unique session ID isolates session targeting. |
| R3 tmux-server destruction | **Pass** | Retained-connection `kill-server` versus a new path connection gives a direct A/B survival oracle. |
| R3 conditional inode removal | **Pass** | Same uid/mode/type/basename and substitution at the deletion boundary bypass point checks; only conditional A-bound removal or rejection preserves B. |
| R4 sticky settlement | **Conditional pass** | Inject a valid G result produced before revocation directly at settlement, while endpoints/evidence remain unchanged, so no producer-side R4 gate masks the settlement mutant. |
| R4 non-revival | **Pass** | A direct state transition with no effect or settlement isolates irreversible state. |

Result: nine rows pass (four conditionally on an explicit baseline), three
more pass directly for the tmux retirement family, and four rows require
correction. The table's final single-rule-mutation sentence does not repair a
setup in which an intact rule rejects first or the expected producer history
is unspecified.

## Preserved-behaviour check

| Frozen behavior | Ruling under the candidate design |
|---|---|
| Canonicalization vector and tmux 3.6 `40 -> 0`, `61 -> 24`, `50 -> 12`, including row-end spaces | **Conditionally preserved.** The canonicalizer is unchanged and runs after record acceptance. These positives are unreachable under current HARD FAIL, which the design explicitly declares; they remain reachable only after Decisions 1, 2, and 5 select a facility that returns the same capture bytes. |
| Stable `121x40` and `history-limit=401` | **Preserved.** The atomic record requires exact 120x40/400 and maps mismatch to terminal-changed with no snapshot. |
| Rejected binding cannot revive | **Preserved as a rule.** R4 and the direct non-revival proof are explicit; effect linearization still needs P0-1's correction. |
| Malformed or absent history evidence | **Preserved.** Missing, malformed, or contradictory capture-record evidence rejects before canonicalization. |
| Positive D/0/07b prompt write | **Declared unavailable under current primitives.** Decision 5 can restore reachability, but the candidate does not preserve D/0/07b's exact utility/foreground and post-short-write outcomes because of P0-2. |
| Exact 24-byte snapshot transaction | **Declared unavailable under current primitives.** It can be restored only after relay, PTY-source/destination, and atomic-capture decisions are concrete and conditional. |

The candidate changed no source or test, so the previously confirmed runtime
figures are undisturbed in the current tree. I did not rerun a real tmux gate
for a design-only change. The reachability review above is semantic: the
candidate correctly discloses the current positive HARD FAIL, but does not yet
define a rule-complete future path for the frozen PTY dispositions.

## Scope

Scope passes independently of the design findings:

- design commit `2a319e0e57b6e226bc0d2894481271e3f9d9873b`
  changes only
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`;
- request commit `800a99a` adds only
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-2_to_review.md`;
- candidate-range `git diff --check` passed;
- no source, test, parent sheet, port surface, public error, adapter/service/
  catalog splice, provider launch, `D/0/07d`, integration, promotion, or
  release change entered the candidate.

## What I did and did not verify

Verified:

- the full review brief and, in the mandated order, the complete candidate,
  Design Trial 1 KO, and both Trial 2 implementation findings;
- exact candidate/request lineage, changed-path scope, and whitespace;
- every sentence of R1–R4, all 21 inventory rows, all five operator
  decisions, and all 16 proof rows from an adversarial implementer's view;
- the relevant frozen parent identity readers, error mapping, PTY
  short-write intervals, sideband result, lifecycle, capture vector, and
  leak-free criteria;
- current tmux 3.6 documented retained control connection, unique
  session/pane IDs, and kill command semantics without starting a tmux server;
- conditional-effect, generation, source-provenance, sideband, namespace,
  destruction, preserved-behavior, and scope satisfiability on the stated
  Linux/Darwin contract.

Not verified:

- no future relay, PTY, tmux extension, process-tree capability, or
  conditional namespace facility exists to execute, and I did not manufacture
  a green baseline for one;
- no Darwin host was available;
- I did not run the full CI, a D/0/07d composition/race gate, live
  Codex/Claude providers, network behavior, integration, promotion, or
  release;
- I did not decide an operator choice, implement any design, or inspect the
  concurrent reviewer A verdict.

No provider content filter interrupted a check. I used no sub-agent, started
no tmux server, addressed no default socket or `ag-*` session, changed no
source, test, design, or plan sheet, and left the pre-existing untracked
`gateway/node_modules` entry untouched.

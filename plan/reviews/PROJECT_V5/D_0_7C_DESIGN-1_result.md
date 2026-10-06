# Independent Design Review Result — Project V5 D/0/07c post-`ACCEPT` binding

## Verdict

**reviewed_KO**

This is a result-only design verdict. It authorizes no implementation,
integration, promotion, release, `D/0/07d`, or splice.

## Impossibility-claim ruling

The sentence

> There is no honest implementation that simultaneously preserves those
> positives and applies HARD FAIL under the current primitives.

is **true in direction but materially under-claimed**. The design is right
that the frozen full relay-facet contract, exact stock-tmux capture vector,
cross-platform identity-bound retirement, and zero-socket-leak requirement
cannot all be preserved by another pre/use/post check. The four named operator
decisions are nevertheless not a complete set of decisions required by the
design's own universal rule.

The missing conflict is the provider/PTY side of the same transaction. The
binding sentence covers every post-`ACCEPT` `read` and `write`, and R2 says
that every mutable prerequisite must come from the same indivisible effect.
The frozen parent makes utility executable/argv/cwd/pgid/sid, PTY identity and
dimensions, and the foreground equation prerequisites of a PTY write
(`plan/PROJECT_V5/D/0/07.md:621-658`). The current reviewed write mechanism
necessarily does `verify()` and then `os.write()` as two operations
(`gateway/src/adapters/process_supervisor_helper.py:409-497`). Provider output
likewise comes from a retained PTY but is read without same-effect proof of
the bound utility/foreground source before it is relayed
(`gateway/src/adapters/process_supervisor_helper.py:3385-3456`).

The design instead:

- gives broker/operator input forwarding only R1 and R4
  (`07c-DESIGN-post-accept-binding.md:163`);
- limits provider-output R2 authority to the **relay** facets
  (`:164`);
- exempts programmatic prompt writes with
  “This leaf does not redesign it. D/0/07b remains authoritative”
  (`:165`); and
- claims that only the first two decisions are required to recover the
  positive snapshot transaction (`:207-211`).

Those statements cannot all coexist with the binding sentence at `:36` and R2
at `:77-98`. Either the rule applies and stable PTY writes/output must also
HARD FAIL until an atomic source/foreground facility or a narrowed
prerequisite contract is approved, or the D/0/07b exemption permits the same
check-then-act shape the rule says is forbidden. Approving these four choices
would therefore send implementation into another occurrence of the same wall.
That is a P0 under-claim under the review brief, not a request to weaken the
rule.

### Decision 1 — relay mutable identity

What I tried:

- traced the accepted descriptor, frozen peer tuple, process tuple, and every
  current revalidation/use site at
  `process_supervisor_helper.py:2019-2216,3191-3247,3265-3456,3612-3705`;
- checked this host's `unix(7)` documentation for `SO_PEERCRED` and
  `SCM_CREDENTIALS`;
- checked this host's `pidfd_open(2)` and `pidfd_send_signal(2)`
  documentation; and
- ran the existing focused suite, including the same-socket changed-CWD input
  and provider-output cases.

Ruling: **the retained accepted descriptor is sufficient for R1 endpoint
continuity, but not for the frozen R2 relay-facet prerequisite**.

The descriptor continues to address the same connected Unix-stream endpoint;
there is no need to resolve the socket pathname again. `SO_PEERCRED`, however,
returns the credentials in effect when the connection was established.
Linux `SCM_CREDENTIALS` can attach kernel-checked pid/uid/gid evidence to a
received message, but it does not attest executable, argv, cwd, pgid, or sid,
and it supplies no corresponding recipient-facet evidence for a send. A pidfd
retains one Linux process instance, but it does not freeze those mutable
facets and does not provide the required Darwin mechanism.

The accepted descriptor would be enough only if the frozen post-`ACCEPT`
identity were narrowed to endpoint/process-instance continuity. The parent
contract and the accepted Trial 1/2 findings instead make the full live tuple
authoritative after acceptance. Decision 1 is therefore genuinely necessary
for that frozen interpretation, but it is not sufficient for the omitted
provider/PTY side described above.

### Decision 2 — atomic tmux capture

What I tried:

- confirmed the real binary is `/usr/bin/tmux`, version `tmux 3.6`;
- started one isolated review server on an explicit `/tmp` socket and read
  `tmux list-commands`;
- checked the installed `tmux(1)` page and the
  [tmux 3.6 manual](https://raw.githubusercontent.com/tmux/tmux/3.6/tmux.1);
- checked the frozen capture/metadata argv in
  `plan/PROJECT_V5/D/0/07.md:515-530` and the current builders at
  `process_supervisor_helper.py:2820-2873`; and
- ran the existing real-host capture cases and exact-argv assertion.

Ruling: **Decision 2 is necessary under the frozen vector.**

The documented 3.6 signature is:

```text
capture-pane [-aCeJMNpPqT] [-b buffer-name] [-E end-line]
             [-S start-line] [-t target-pane]
```

`-p` returns pane contents to stdout. There is no `-F` or other option that
returns pane/server/session identity, pane width/height, configured
`history-limit`, metadata, application generation, and the captured bytes as
one record. `display-message` and `show-options` expose separate information
operations.

I also considered a tmux command list, control mode, and capture-to-buffer
followed by format/buffer operations. Those can change ordering or transport,
but they change the frozen exact direct capture argv and do not make the
documented `capture-pane` operation return the complete record. None closes
the current contract without the stated operator choice.

### Decision 3 — identity-bound retirement

What I tried:

- checked `pidfd_send_signal(2)` on this Linux host, including the documented
  stable-process and process-group targeting;
- checked the current
  [Apple XNU syscall table](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/kern/syscalls.master)
  for a pidfd-equivalent signal target;
- checked tmux 3.6's documented `kill-pane` and `kill-session` target
  signatures;
- traced current PID/PGID and tmux-name cleanup at
  `process_supervisor_helper.py:1626-1718,2964-2996,3284-3315`; and
- exercised the existing cooperative success/reject retirement assertions.

Ruling: **Decision 3 remains necessary for the frozen cross-platform
guarantee, although the design should distinguish the available partial
mechanisms.**

Linux pidfds can give process-instance-bound signalling, including a
process-group form on this host's kernel. The current XNU syscall table has no
pidfd, and the current tmux cleanup commands still target a newly resolved
pane/session name on a new client connection. Closing/shutting down the
retained relay and PTY descriptors is already identity-bound and the
controlled relay normally exits in response; the existing suites confirm that
cooperative path. Descriptor closure does not itself guarantee destruction of
an identity-changed process that retains/ignores the endpoint, nor does it
identify a replacement tmux object for destruction. Thus it is not a complete
cross-platform answer to the frozen no-process/no-target-leak criterion.

### Decision 4 — conditional socket deletion

What I tried:

- checked this host's `unlinkat(2)`, `openat2(2)`, `linkat(2)`, and
  `renameat2(2)` documentation;
- checked the
  [POSIX `unlinkat` contract](https://pubs.opengroup.org/onlinepubs/9699919799/functions/unlink.html);
- checked current XNU's
  [`unlinkat` syscall](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/kern/syscalls.master),
  [public `AT_*` flags](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/sys/fcntl.h),
  and
  [`unlinkat` implementation](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/vfs/vfs_syscalls.c);
- considered an inode-retaining fd plus retained parent-directory fd; and
- considered hard-link/rename-exchange quarantine schemes.

Ruling: **the socket case is genuinely undecidable under the supported
portable primitives; Decision 4 is necessary.**

A retained directory descriptor makes `unlinkat(dirfd, basename, 0)` resolve
inside the intended directory. It does not condition removal of `basename` on
the retained socket's device/inode. Linux `unlinkat` has no `AT_EMPTY_PATH` or
expected-inode argument; `O_PATH` permits identity inspection, not deletion by
object handle. Current Darwin likewise takes `dirfd + path + flags`;
`AT_FDONLY` is available to `fstatat`, not `unlinkat`, and none of its unlink
flags compares the final vnode with an approved handle.

Rename/exchange can atomically quarantine whichever entry currently occupies
the name, but it cannot both prove that entry is A and leave the public name
absent while guaranteeing restoration/preservation of B against a concurrent
same-user mutator. Advisory directory/file locks do not create exclusive
namespace authority. The retained directory handle closes ancestor
replacement, not final-basename replacement.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 1 | The impossibility analysis and four operator decisions omit same-effect provider/utility/foreground/PTY authority. The design exempts D/0/07b check-then-act writes even though its universal rule forbids them, so the decisions cannot produce a rule-complete implementation. |
| P1 | 2 | The claimed complete site inventory omits or incompletely governs additional post-`ACCEPT` effects; three of the six proof-obligation rows are not isolated/falsifiable as written. |
| P2 | 0 | None. |

## Binding-rule closure of the five findings

All five named findings are closed by the rule **at design level**, assuming
the rule is applied rather than the exemptions above:

| Finding | Closure walk | Ruling |
|---|---|---|
| Trial 1 reviewer A — post-`ACCEPT` relay operations detached from frozen identity | R1 requires the accepted relay/PTY descriptors and generation. R2 prevents separate peer/process/tmux rereads from authorizing input, output, barrier, or capture. R4 prevents a late result from reviving the generation. With current primitives, readiness/transfer/capture rejects. | Closed for the named data-bearing paths. |
| Trial 1 second reviewer — outer width/history drift accepted | R2 requires exact 120x40, configured 400 history, identity, metadata, generation, and bytes in one capture record. No record means no capture. | Closed. |
| Trial 2 reviewer A — changed-CWD relay received 25 provider bytes | R2 treats the accepted fd as insufficient evidence of the full mutable relay tuple and requires zero-byte rejection until a same-effect/immutable mechanism is approved. | Closed. |
| Trial 2 reviewer B — resize between final check and `capture-pane` returned a snapshot | R2 rejects pre/use/post authorization. A record containing geometry and bytes from one server effect is the only allowed success input. | Closed. |
| Trial 2 reviewer B — cleanup unlinked replacement inode | R3 distinguishes retained identity evidence from a deletion capability and forbids pathname unlink without atomic conditional removal or exclusive namespace authority. | Closed. |

The KO is not that one of those five closure statements silently allows the
reported effect. It is that the supposedly universal design does not carry
the same rule through adjacent post-`ACCEPT` PTY and retirement effects, so the
next trial would encounter the same class again.

## Post-`ACCEPT` site-inventory completeness

The table covers readiness; relay input; broker input; provider output;
programmatic prompt writes; barriers and drain; tmux reads/capture;
canonicalization and settlement; relay/PTY closure; relay/tmux termination;
key/runtime/tmux-socket removal; and observation exposure.

It is not complete or rule-complete:

1. **Broker/operator and programmatic PTY writes are incompletely governed.**
   The retained PTY master closes pathname replacement, but the frozen
   foreground and process prerequisites are separately read and can change
   before `os.write`. The operator-input row has only R1/R4 and the prompt row
   expressly exempts R2.
2. **Provider-output authority is one-sided.** The row requires same-effect
   relay-facet evidence for the destination but omits same-effect evidence for
   the bound utility/foreground/PTY source. Retaining the PTY identifies the
   terminal object, not which mutable foreground/process generation produced
   the bytes.
3. **The supervised utility/process tree is omitted from destructive
   retirement.** The inventory lists the relay process and tmux pane/session,
   but the post-`ACCEPT` lifecycle also signals the utility process group and
   adopted descendants. Current `_signal_exact`/`_signal_utility_group` are
   identity-read plus PID/PGID signal operations.
4. **The relay protocol close frame is omitted.** Current teardown writes
   `RELAY_DATA_CLOSE` before descriptor shutdown
   (`process_supervisor_helper.py:3903-3915`). Direct shutdown/close is covered
   and is sufficient as an identity-bound transport action, but the separate
   protocol write is still a post-`ACCEPT` site. Under R2 it must either have
   the required same-effect authority or be removed in favor of direct
   descriptor retirement.

Relay key/socket/runtime cleanup is at least covered generically by the
“Remove relay key/runtime entries” row, including the requirement to preserve
an unresolved replacement. Closing other already-retained control/sideband
descriptors is also mechanically identity-bound, but should be named if the
table continues to claim completeness.

## RESTRICT audit

The strong portions pass:

- “Separate before/after readers are diagnostic only and cannot authorize”
  (`:79-82`) is unambiguous.
- Missing atomic relay/capture evidence says reject (`:84-98`).
- Conditional deletion failure says preserve/reject, not warn and unlink
  (`:131-144`).
- R4 expressly cannot authorize an operation that fails R1-R3 (`:154-155`).
- The public observation grants no exception (`:176`).

The successful bypass is the PTY exemption:

> This leaf does not redesign it. D/0/07b remains authoritative.

Together with the R1/R4-only broker-input row and relay-only R2 wording for
provider output, that sentence lets a separately checked
utility/foreground/PTY prerequisite reach `os.write` or a provider-output
transfer. An external foreground or mutable process change after the last
check is undecidable at the effect boundary. The design neither rejects that
route nor asks the operator to narrow/replace its prerequisite contract.

There is also a wording contradiction in allowing name-based tmux reads as
“diagnostic” (`:168`) while the universal sentence says an operation may
“read ... only through the retained authority handle” (`:36`). Diagnostic
reads are harmless only because they cannot authorize; the rule should say
that explicitly instead of giving “read” two meanings.

## Falsifiability of the six proof obligations

These are future specifications, so I judged whether the stated single-rule
mutant would necessarily turn the stated oracle red after the relevant
operator mechanism exists. I did not create implementation probes or pretend
that an unresolved facility has a green baseline.

| Row | Judgment | Isolation/falsifiability |
|---|---|---|
| R1 retained endpoint | **KO as written** | Under the current design, intact R2 rejects readiness/transfer before the reconnect mutant is observable. Stubbing every *separate reader* does not satisfy R2's same-effect authority. The future test must explicitly provide valid intact-R2 evidence and require a reachable retained-fd transfer; otherwise R2 can make the mutant green by rejecting first. |
| R2 relay atomic evidence | **Adequate, conditional on the chosen facility** | For one selected input or output effect, changing real cwd after the mutant's last out-of-band read leaves R1 handles and R4 generation intact. A compliant same-effect authority rejects; the reread mutant crosses/queues the 25 bytes. The future specification should choose one effect rather than “send/input queue offer” as alternatives. |
| R2 atomic capture | **KO for the full mutation cell** | The 121-during-capture/120-after case kills a split check/capture mutant and a dimensions-ignore mutant. It does not kill a mutant that ignores the atomic record's generation, because the test never supplies a wrong generation. That requires a separate mismatched-generation record case. |
| R3 retained process/tmux destruction | **Adequate as a parameterized family** | With cleanup allowed during revocation, R4 does not prohibit retirement and R1/R2 do not identify the destruction target. For each PID, PGID, pane, session, or server mutant, an equal-name replacement survival oracle kills the name-based action. One concrete target must be selected per mutation run. |
| R3 conditional inode removal | **Adequate** | Same uid, mode, basename, type, and serverless state make all listed point checks pass. Substitution at the deletion boundary makes `lstat`+`unlink(path)` delete B; only conditional A-bound deletion or rejection preserves B. |
| R4 sticky generation | **KO as written** | “After replacement” can cause intact R1 or R2 to reject first, so the claim that the sticky bit is the sole guard is not established. Isolate R4 by revoking G without changing retained endpoints or mutable evidence, then delivering a valid authenticated G-tagged result; separately test rebinding if needed. |

Result: three rows are adequate (two with explicit parameter/facility
conditions), and three require correction. The table's final sentence about
single-rule mutation does not repair the rows whose own setup allows another
rule to reject first or does not exercise every named mutant.

## Preserved-behaviour check

The candidate commits are design/request only, and current closed behavior
remains green:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_relay.test.js

tests 39
pass 39
fail 0
skipped 0

node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js

tests 16
pass 16
fail 0
skipped 0
```

The focused gate re-established:

- the exact canonicalization vector and exact capture argv;
- real tmux 3.6 figures `40 -> 0`, `61 -> 24`, and `50 -> 12`;
- exact row-end spaces;
- stable 121x40 and `history-limit=401` terminal-changed rejection;
- rejected-binding non-revival; and
- fail-closed malformed/absent history evidence.

R2/R4 and the preserved-behaviour section correctly keep those as regression
obligations after an operator-approved capture facility exists. The design
does **not**, however, honestly preserve the separately closed D/0/07b verified
write behavior under its universal rule: that behavior uses a retained PTY
plus pre-write mutable checks, while R2 requires same-effect evidence. The
missing PTY/operator decision must be resolved before the design can claim
both the universal rule and preserved D/0/07b positives.

## Scope

Scope otherwise passes:

- design commit `81afc45086dc62b20a9ba55f405ed9e3de52d4d1`
  adds only
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`;
- request commit `218bf40851215c8384920fb9a895ded53561eba8`
  adds only
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-1_to_review.md`;
- the design adds no implementation, test, public port surface, public error,
  adapter/service/catalog splice, provider launch change, D/0/07d gate, or
  integration/promotion claim; and
- candidate-range and worktree `git diff --check` passed.

## What I did and did not verify

Verified:

- the full review brief, candidate design/request, frozen D/0/07c sheet and
  shared contract, and all five prior findings;
- exact design/request lineage and changed-file scope;
- every current helper post-`ACCEPT` transfer, capture, settlement, retirement,
  and filesystem cleanup site relevant to the rule;
- the accepted Unix descriptor, connect-time peer evidence, per-message Linux
  credential option, and Linux pidfd semantics from installed documentation;
- real tmux 3.6 version, documented command signatures, exact frozen capture
  and metadata argv, and the absence of a capture-format/record option;
- retained-directory `unlinkat`, Linux open/link/rename alternatives, POSIX
  semantics, and current Darwin/XNU syscall and flag surfaces;
- the necessity of each of the four stated decisions and the additional
  provider/PTY conflict;
- finding-by-finding design closure, inventory completeness, every RESTRICT
  sentence, all six mutation obligations, preserved behavior, and scope;
- the full focused relay gate and inherited PTY/Darwin gate with no failure or
  skip; and
- that the isolated tmux documentation-check socket was removed and the
  default tmux socket/server was never addressed.

Not verified:

- no Darwin host was available; the deterministic Darwin suite passed and the
  current public XNU source was inspected;
- I did not implement or execute the future atomic relay/capture/deletion
  mechanisms, because the operator choices and green baseline do not exist;
- I did not write standalone kernel, socket, or lock-internal probes;
- I did not run full `bash scripts/ci.sh`, a D/0/07d composition/race gate,
  live Codex/Claude providers, network behavior, integration, promotion, or
  release; and
- I did not decide any operator choice or authorize implementation.

No provider content filter interrupted a check. I used no sub-agent, changed
no source, test, design, or plan sheet, and left the pre-existing untracked
`gateway/node_modules` entry untouched.

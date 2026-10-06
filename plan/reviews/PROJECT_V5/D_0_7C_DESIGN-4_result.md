# Independent Design Review Result — Project V5 D/0/07c Design Trial 4 (reviewer A)

## Verdict

**reviewed_OK**

The candidate closes both independent Design Trial 3 verdicts. The active
workload authority and the one-way cleanup authority are defined over
different states, different effect classes, and one total order:
`E1..En < V < C1..Cm`. Workload cannot run at or after `V`; cleanup cannot run
before `V`; cleanup uses only the same generation's sealed targets and cannot
re-resolve, replace, repeat, or revive one. The amended R3 and R3-N proof
baselines are consequently reachable after `V`.

The candidate also chooses unambiguous read-time PTY source authority, removes
whole-server/default-socket tmux destruction, removes the absent-facility
options, merges the duplicate tmux choices into one specified custom
transport, and makes namespace preservation the sole Decision 4 outcome.
Every decision cell names the actual parent/deployment amendment and its
capability loss.

The design deliberately narrows several frozen guarantees, but it does so
only through five explicit operator amendments. Before all five are
ratified, the affected paths remain HARD FAIL. This review does not ratify
those amendments or decide any operator question.

This OK authorizes implementation only within the finally ratified contract.
It authorizes no integration, promotion, release, `D/0/07d`, port-surface
change, adapter/service/catalog splice, or provider-launch change.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 0 | None. |
| P1 | 0 | None. |
| P2 | 0 | None. |

## Ruling on every Design Trial 3 finding

| Trial 3 finding | Trial 4 ruling | Evidence |
|---|---|---|
| Reviewer A P0 — `G == ACTIVE` and `V < E` suppressed revocation-caused cleanup | **Closed.** | Workload authority applies only while `ACTIVE`; `V` atomically closes it and opens `C_G` in `REVOKING` (`07c-DESIGN-post-accept-binding.md:61-77,123-147`). Cleanup does not test `G == ACTIVE`; it tests the same immutable `G`, cleanup state, a sealed `PENDING` target, and its original handle/owned identity (`:130-143`). R4 orders all workload points, then exactly one `V`, then the finite cleanup ledger and ordinary completion (`:359-390`). |
| Reviewer B P0-1 — five strong-facility options were not buildable Linux/Darwin choices | **Closed.** | Former 1A, 3A, 4A, 4B, and 5A are removed. The design states that no full-strength cross-platform branch exists under the frozen topology and offers only explicit amendments (`:208-221,310-319,341-357,432-459`). Decision 2's remaining positive mechanism is concrete: a maintained Linux/Darwin custom tmux build with the versioned `agents-capture-v1` retained-connection operation (`:273-302,446`). |
| Reviewer B P0-2 — 5B did not choose production-time or read-time PTY source authority | **Closed.** | The selected unit is one nonblocking retained-master read at read time. The text expressly covers pre-`ACCEPT`/pre-activation buffering, mixed writers/times, `E_read < V`, `V < E_read`, and a read already linearized when revocation arrives (`:243-271,400,449`). Helper/reaper/supervisor and terminal facets are historical or diagnostic, not production-time provenance. No competing production-time interpretation remains. |
| Reviewer B P0-3 — exact tmux server identity was treated as authority to destroy a shared server | **Closed.** | The accepted default server/socket and unrelated sessions are explicitly shared, not port-owned. Only the port-created pane/session are cleanup targets. `kill-server` and default-socket unlink are forbidden even when no sibling remains (`:44-48,321-339,415-416,446`). The proof requires a sibling, server, and socket inode to survive (`:492`). |
| Reviewer B P1-1 — commitment cells omitted the real amendment, deployment cost, or capability loss | **Closed.** | Each of the five sole-option rows has a stand-alone commitment column and a deployment/capability-loss column (`:443-449`). The cells expressly disclose relay descriptor delegation and lost live-holder proof, custom tmux build/distribution/migration, indefinitely continuing processes and side effects, residual namespace artifacts and blocked reuse, and read-time PTY producer/foreground/geometry losses. |
| Reviewer B P1-2 — 2A/2B stated the same guarantee and 2B named no transport | **Closed.** | There is one Decision 2 option, one named command, one complete record, one custom runtime/deployment commitment, and one ownership boundary (`:273-302,434-438,446`). No unspecified second transport remains. |
| Reviewer B P1-3 — 4C contradicted R3's mandatory N1-or-N2 selection | **Closed.** | The unavailable N1/N2 branches are removed. Decision 4C is the sole post-`V` rule: no pathname `unlink` or `rmdir`; an extant owned or replacement relay key/socket/directory is `PRESERVED`; the shared tmux socket is outside the owned ledger (`:341-357,417-419,448`). |

## Authority overlap-and-gap analysis

The design's partition is:

```text
ACTIVE/workload-open/cleanup-dormant
    E1, E2, ... En
             |
             V
             v
REVOKING/workload-closed/cleanup-open(C_G)
    C1, C2, ... Cm
             |
             v
REVOKED/terminal-ledger
             |
             v
ordinary lifecycle completion
```

There is no `E == V` case. The shared generation lock establishes a total
order, and the state transition changes both authority gates atomically
(`:123-135,367-374`).

| Effect class | Workload authority | Cleanup authority | Overlap/gap ruling |
|---|---|---|---|
| Relay/PTY reads, queue admission/take, terminal writes, relay sends, and barrier steps | Requires retained object, expected narrowed binding, live `G`, and one `E < V`; `V < E` commits zero (`:91-115,223-271,397-404`). | May not transfer terminal/provider bytes. | Exactly workload; never cleanup. |
| Readiness, atomic capture, fd-5 candidate writes, claim/observation, and method settlement | Requires `ACTIVE` at the named workload/settlement point; a pre-`V` private candidate cannot settle after revocation (`:273-302,376-383,396,406-410`). | Explicitly cannot publish readiness, capture, or settle success. | Exactly workload; never cleanup. |
| Descriptor retirement | No close is an active workload effect. A component loss first commits `V`. | After `V`, directly closes each sealed retained handle once and moves its ledger target to `RETIRED` (`:136-143,306-308,411-413`). | Exactly cleanup; the active predicate cannot suppress it. |
| Owned tmux pane/session retirement | Active authority may capture through the retained connection but may not destroy. | After `V`, only sealed lifetime IDs on that same retained connection may be retired; loss/absence preserves or retires the exact ledger entry without lookup (`:321-339,415`). | Capture and retirement share a handle but not an effect or state, so they cannot overlap. |
| Utility/group/descendant/relay process outcome | No active destruction. | After `V`, descriptor close/cooperative exit may retire an exact known-gone target; otherwise it becomes `PRESERVED`. Numeric signalling is forbidden (`:310-319,414`). | Exactly cleanup bookkeeping; no replacement can be signalled. |
| Relay key/socket/runtime-directory outcome | No post-`ACCEPT` pathname destruction. | After `V`, no pathname removal occurs; residual owned entries and replacements become `PRESERVED` (`:341-357,417-419`). | Exactly cleanup bookkeeping; no replacement can be removed. |
| Shared tmux server/socket | Never a port-owned workload or cleanup destruction target. | `kill-server` and socket unlink are forbidden; only the owned pane/session ledger is actionable (`:321-339,416`). | Intentional non-target, not an uncovered destructive effect. |
| Diagnostics, parsing, canonicalization, and private-memory normalization | They cannot authorize; a diagnostic may only revoke, and pure transforms run only on already accepted private state (`:67-77,202-206,405,407,422-430`). | They have no external cleanup target. | Non-authority operations, so neither sentence grants them fail-open authority. Their first transfer, settlement, or cleanup action is governed. |
| Ordinary execution completion | Cannot issue a port, publish readiness, settle a session-port success, or select a cleanup target. | Runs only after every ledger entry is terminal and `G == REVOKED` (`:74-77,144-147,376-390,420`). | Parent lifecycle settlement is separately and narrowly governed; it is not an uncovered workload/cleanup effect. |

The potentially dangerous shared handles also have disjoint uses: fd 3 can
publish readiness only before `V` and close only after `V`; fd 5 can write a
private response only before `V` and close only after `V`; relay/PTY handles
can transfer only before `V` and close only after `V`; the retained tmux
connection can capture only before `V` and address owned cleanup IDs only
after `V`. No effect is admitted by both predicates.

There is likewise no externally visible effect under neither predicate.
Provider-bearing buffers or candidates may exist privately after an
`E < V`, but post-`V` forwarding and settlement are suppressed. Pure local
discard/normalization does not authorize a target. Every destructive effect
must name a pre-sealed same-`G` ledger entry, and later paths, PIDs, public
tmux targets, new connections, or evidence records cannot enter that ledger
(`:116-143`).

Revival is excluded at all layers: workload closes permanently at `V`;
cleanup targets move once from `PENDING` to `RETIRED` or `PRESERVED`;
repeated cleanup is inert; `PRESERVED` cannot become `RETIRED`; no new
generation or replacement target can be created through `C_G`; and equal
later evidence cannot transition `REVOKED` back to `ACTIVE`
(`:136-147,359-390`).

## R3/R3-N and cleanup proof reachability

The old cleanup proofs were masked because their intended positive baselines
ran after revocation while the universal rule required `G == ACTIVE`. The new
baselines all begin with `V` and a sealed ledger, so the cleanup predicate is
true while the workload predicate is false.

| Proof baseline | Reachability ruling |
|---|---|
| Direct descriptor cleanup after `V` | **Reachable.** Exact sealed handles close at `C > V`; the mutant which reuses `G == ACTIVE` leaves one open and cannot complete the ledger (`:483`). |
| Cleanup dormant before `V` | **Reachable.** Calling cleanup while `ACTIVE` performs zero closes and leaves `PENDING` unchanged (`:484`). This isolates the opposite side of the partition. |
| Exact generation/target cleanup | **Reachable.** After `V_G`, an H handle or later replacement is rejected/preserved without lookup (`:485`). |
| One-shot cleanup/non-revival | **Reachable.** One exact close reaches a terminal ledger state; a repeat has no effect and equal historical evidence cannot reopen workload (`:486`). |
| Utility-group preservation | **Reachable.** After `V`, descriptor cleanup succeeds, numeric signalling is absent, the replacement survives, and the target becomes `PRESERVED` (`:487`). |
| Adopted-descendant preservation | **Reachable.** The same post-`V` preservation baseline isolates a forbidden `kill(pid)` mutation (`:488`). |
| Forced-relay preservation | **Reachable.** Exact socket retirement precedes a post-`V` baseline in which a numeric replacement survives and the relay target is `PRESERVED` (`:489`). |
| Owned tmux pane retirement | **Reachable.** With the retained server connection live after `V`, exact `%A` absence/retirement is authoritative and a replacement at the public target survives (`:490`). |
| Owned tmux session retirement | **Reachable.** The retained connection and sealed `$A` isolate session lifetime identity after `V`; the public-name replacement survives (`:491`). |
| Shared server/socket preservation | **Reachable.** Owned A cleanup runs after `V`, while sibling S, the shared server, and its socket inode must survive both forbidden-effect mutants (`:492`). |
| Relay-key preservation | **Reachable.** At `C > V`, cleanup performs zero unlink calls, preserves replacement B, and records `PRESERVED` (`:493`). |
| Relay-socket preservation | **Reachable.** Retained descriptors close, but a same-name replacement remains because no pathname unlink is authorized (`:494`). |
| Runtime-directory preservation | **Reachable.** The post-`V` baseline performs no `rmdir`; replacement B survives and is recorded `PRESERVED` (`:495`). |
| Teardown close-frame prohibition | **Reachable.** `V` closes workload protocol writes, then exact descriptor shutdown/close runs under `C_G`; restoring `RELAY_DATA_CLOSE` is the sole violation (`:478`). |

The former R3-N1/R3-N2 positive-removal rows are intentionally gone because
neither facility is available. Their safety property is not dropped:
Decision 4 now has stronger replacement preservation—zero post-`ACCEPT`
pathname removal—and the three per-entry mutations remain independently
falsifiable. The cost is the explicit operator amendment to the leak-free
criterion, not an unreviewed exemption.

The remaining active-workload proof rows are still reachable independently:
retained relay/fd-5 substitution, workload-after-`V`, exact PTY pre-`F` causes
and post-`F` abort, selected read-time PTY buffering/mixed-producer/order
semantics, readiness ordering, the named custom tmux command, atomic
geometry/generation, sticky settlement, and direct non-revival each preserve
an intact positive baseline (`:467-482,496-497`).

## No-weakening comparison

I compared the complete `336`-addition/`265`-deletion design delta from
`1aa2eac` to `c00a2ee`, not only the added closure map.

No previously required rejection became a warning, skip, best-effort
success, tolerance, fallback, or unratified exemption:

- effect-then-report, self-attestation, check/use/post-check, reconnect,
  re-resolution, numeric signalling, pathname removal, whole-server
  destruction, tmux-socket unlink, and post-revocation workload remain
  forbidden;
- `E < V` still preserves the exact committed count, while `V < E` or a
  failed selected prerequisite still commits zero for that effect;
- readiness, relay/PTY transfer, capture, and method/claim settlement still
  HARD FAIL until Decisions 1, 2, and 5 are ratified;
- exact pre-`F` cause ranking, positive-prefix accounting, post-`F`
  `SESSION_PORT_WRITE_ABORTED`, and success only at `R` remain binding;
- retained fd 4/5, exact `ASP1` tag/sequence/private `G`, and readiness
  ordering remain explicit;
- `RELAY_DATA_CLOSE` remains forbidden in favor of exact retained-handle
  shutdown/close;
- malformed, missing, or contradictory capture evidence still rejects the
  entire record before canonicalization or settlement; and
- rejected generations and terminal cleanup entries cannot revive.

The large deletions fall into four reviewed categories:

1. the overbroad active-only destruction rule was split into active workload
   and post-`V` cleanup authority;
2. the absent 1A/3A/4A/4B/5A facilities and duplicate 2B placeholder were
   removed rather than left as dead operator choices;
3. production-time PTY attribution, live relay/process facets, forced process
   cleanup, and namespace deletion were replaced only by named parent
   amendments with disclosed capability loss; and
4. whole-server/default-socket destruction was removed because exact server
   identity is not ownership.

Thus no confirmed Trial 1–3 safety ruling was silently softened or dropped.
There are deliberate post-ratification losses:

| Amendment | Deliberate capability loss |
|---|---|
| 1B | No effect-time live relay executable/argv/cwd/pgid/sid or current-holder continuity; delegation of the accepted socket object is accepted. |
| 2A | Stock tmux 3.6 separate-command authority is replaced by a maintained custom runtime; shared server/socket/sibling cleanup is forbidden. |
| 3B | Forced process/tree/relay retirement is lost; unresolved processes may continue indefinitely with resource use and side effects. |
| 4C | Guaranteed key/socket/directory deletion is lost; artifacts, disk use, and blocked basename reuse may remain. |
| 5B | Production-time producer/generation and effect-time utility/helper/foreground/winsize proof are lost; buffered/arbitrary-slave output may be accepted and writes may reach changed foreground/geometry. |

Each loss is in the operator's ratification cell (`:445-449`), and each
affected path remains HARD FAIL before ratification (`:434-459,598-599`).
That is an explicit contract amendment, not contradiction closure by silently
relaxing the strict side.

## Preserved-behaviour check

| Frozen behavior | Ruling |
|---|---|
| Canonicalization vector, row-end spaces, and real tmux 3.6 figures `40 -> 0`, `61 -> 24`, `50 -> 12` | **Preserved and reachable after Decisions 1, 2, and 5.** The pure canonicalizer is unchanged and runs only after complete-record acceptance; Decision 2 must return the same byte oracle (`:273-302,407,551-571`). The focused relay/capture gate passed all 39 assertions, including zero/24/12-byte and row-end-space host cases. |
| Stable `121x40` and `history-limit=401` | **Preserved.** `agents-capture-v1` atomically requires exact `120x40` and history `400`; mismatch accepts no record (`:287-302,406,481`). The inherited real width/history rejection cases passed. |
| Rejected binding cannot revive | **Preserved.** Workload closes permanently at `V`, cleanup is one-shot, settlement checks sticky revocation, and the direct non-revival proof remains (`:359-390,496-497`). |
| Malformed or absent capture/history evidence | **Preserved fail-closed.** Missing, malformed, or contradictory evidence rejects the entire record before canonicalization or settlement (`:297-302`). The inherited malformed/noncanonical cases passed. |
| D/0/07b framing, FIFO, exact counts, cause mapping, short-prefix accounting, and post-`F` abort | **Preserved under the explicit Decision 5 amendment.** Stable mismatches retain exact causes; every retained-master attempt has an exact count/new `E`; a later rejection cannot erase an authorized prefix (`:148-164,262-271,398-399,471-477,574-582`). The focused PTY/Darwin seam passed all 16 assertions. |
| No replacement destruction | **Strengthened on the selected portable branch.** Numeric process signalling, pathname unlink/rmdir, `kill-server`, default-socket unlink, public tmux targets, new server connections, and later ledger targets are forbidden (`:116-143,304-357`). |

The focused current-code gates establish that the frozen regression behavior
is undisturbed by this design-only commit; they do not claim that the future
custom tmux, cleanup ledger, or narrowed authority implementation already
exists.

## Scope

Scope passes:

- design commit `c00a2ee31f508babd0f0e5ae038a6659b134b01a`
  changes only
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`;
- request commit `da5742d` adds only
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-4_to_review.md`;
- candidate/request `git diff --check` passed;
- no source, test, frozen parent, plan sheet, codec, public error, port
  surface, adapter/service/catalog splice, provider launch, `D/0/07d`,
  integration, promotion, or release change entered the candidate; and
- the pre-existing untracked `gateway/node_modules` entry remained untouched.

## What I did and did not verify

Verified:

- the complete review brief;
- both complete Design Trial 3 results and the complete Design Trial 2
  reviewer-B result required as the specification;
- the complete current design, complete predecessor design, every changed and
  deleted design line, candidate/request lineage, changed-path scope, and
  whitespace;
- the frozen parent's relevant lifecycle, settlement, data-boundary,
  canonicalization, PTY disposition, attach, and leak-free requirements;
- every binding-rule definition, R1–R4 rule, post-`ACCEPT` inventory row,
  decision cell, capability loss, proof obligation, preserved behavior, and
  scope statement;
- overlap and absence-of-gap across active workload effects, post-`V`
  cleanup effects, diagnostics/pure transformations, and ordinary lifecycle
  completion;
- reachability and isolation of every amended cleanup/process/tmux/namespace
  proof baseline;
- installed `tmux 3.6`;
- `node --test --test-concurrency=1
  tests/gateway/process_supervisor_session_port_relay.test.js`: 39 pass,
  0 fail, 0 skipped; and
- `node --test --test-concurrency=1
  tests/gateway/process_supervisor_session_port_pty.test.js
  tests/gateway/process_supervisor_darwin.test.js`: 16 pass, 0 fail,
  0 skipped.

Not verified:

- the custom `agents-capture-v1`, sealed cleanup ledger, narrowed relay/PTY
  authority, and preservation implementation do not exist in this design-only
  candidate, so I did not implement or execute them;
- no live Darwin host was available; only the deterministic Darwin seam ran;
- I did not run full `bash scripts/ci.sh`, a `D/0/07d` composition/race gate,
  live providers, network behavior, integration, promotion, or release;
- I did not decide or ratify any operator amendment;
- I did not inspect or seek the concurrent Design Trial 4 reviewer-B verdict;
  and
- I wrote no standalone kernel, socket, or lock-internal probe.

No provider content filter interrupted a check. I used no sub-agent, never
pushed, started no ad hoc tmux server, addressed no default tmux socket or
`ag-*` session, and changed no source, test, design, or plan sheet. The
focused host test used its existing isolated ephemeral tmux fixture.

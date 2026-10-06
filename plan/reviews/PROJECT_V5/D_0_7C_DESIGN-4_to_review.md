# Design Trial 4 review request — Project V5 D/0/07c

## Status

`to_review`

This is a design-only request. It nominates no implementation, integration,
promotion, release, D/0/07d gate, adapter/service/catalog splice, or port
surface.

## Candidate

- Review base:
  `1aa2eac06445dce19ce6455511ef723238b1bc26`
- Design commit:
  `c00a2ee31f508babd0f0e5ae038a6659b134b01a`
- Required design:
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`
- Trial 3 reviewer A input:
  `d6e748188a426ae850fd6ab57c5fd27bbd530033`,
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-3_result.md`
- Trial 3 reviewer B input:
  `1aa2eac06445dce19ce6455511ef723238b1bc26`,
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-3_result_b.md`

The design commit changes only the required design document. The pre-existing
untracked `gateway/node_modules` directory was not touched.

## Review focus

Please review whether the candidate closes both independent Trial 3 verdicts
without reopening the previously confirmed workload ordering, exact PTY
dispositions, sideband/readiness inventory, canonicalization, geometry/history
oracles, or non-revival behavior.

The resulting contract deliberately remains at HARD FAIL until the operator
ratifies all five explicit amendments. No former absent-facility option remains
available for selection.

## Per-finding closure map

| Finding | Closure in the candidate |
|---|---|
| Reviewer A P0 — the universal active-generation condition suppressed cleanup after revocation | The design now has two exhaustive, disjoint authorities. Active workload/readiness/claim-and-method settlement points `E1..En` precede exactly one `V`. `V` atomically changes `ACTIVE/workload-open/cleanup-dormant` to `REVOKING/workload-closed/cleanup-open(C_G)`. Cleanup points `C1..Cm` then act only on targets sealed for the same immutable `G`; they do not require `G == ACTIVE`. A finite ledger reaches `RETIRED` or `PRESERVED`, then `REVOKED`, before ordinary lifecycle completion settles. Cleanup cannot transfer bytes, publish readiness, settle a method/claim result, select a replacement, repeat an effect, or revive workload. |
| Reviewer B P0-1 — 1A, 3A, 4A, 4B, and 5A specified absent facilities | All five are removed. Decisions 1, 3, 4, and 5 plainly have only explicit narrowing/preservation amendments. The design states that no full-strength Linux-and-Darwin branch exists under the frozen topology. |
| Reviewer B P0-2 — Decision 5 did not choose production-time or read-time PTY source semantics | Decision 5 chooses one nonblocking retained-master read at read time. It accepts all bytes returned by that syscall for live `G`, including pre-`ACCEPT`/pre-activation buffering and ranges spanning writers/times. It defines `E_read < V`, `V < E_read`, and revocation waiting for a linearized read. Utility/helper/reaper/supervisor and terminal facets are exhaustively historical or diagnostic. The loss of production, foreground, winsize, and producer proof is explicit. |
| Reviewer B P0-3 — exact tmux server identity was treated as whole-server ownership | The exact default server and socket are shared, never port-owned. Only a port-created pane/session are sealed cleanup targets. `kill-server` and tmux-socket unlink are forbidden even when no sibling remains. Cleanup uses lifetime IDs only on the retained connection; a mandatory oracle keeps an unrelated sibling, server, and socket inode alive. |
| Reviewer B P1 — commitment cells omitted amendments, deployment cost, or capability loss | Every sole-option row has separate stand-alone commitment and deployment/capability-loss columns. Relay descriptor delegation, custom-tmux distribution, continuing processes/side effects, residual namespace artifacts, and read-time PTY attribution losses are all in the cells the operator ratifies. |
| Reviewer B P1 — 2A and 2B were redundant and 2B was unspecified | They are merged into one concrete 2A: a maintained Linux-and-Darwin custom tmux client/server build with the versioned retained-connection operation `agents-capture-v1`, deployed as the user's compatible default tmux so the exact public attach command remains unchanged. |
| Reviewer B P1 — 4C contradicted mandatory R3-N1/R3-N2 | R3 removes the unavailable N1/N2 removal branches. Decision 4C is the sole namespace outcome: after `V`, close retained sockets but perform no pathname unlink/rmdir; record residual owned entries or replacements as `PRESERVED`. |

## Disputed findings

None. Both reviewers' findings are accepted. The candidate preserves reviewer
A's confirmed workload/disposition/inventory closures while applying reviewer
B's platform-buildability and ownership corrections.

## Final operator decision table

Every row is mandatory; there is one real option per decision.

| Option | What ratification commits the operator to | Cost or capability lost |
|---|---|---|
| **1B — retained-socket/read-range amendment** | Amend relay authority to the original connected-socket object, handshake kernel tuple, one-use `ASR1` proof, historical accepted tmux IDs, and live `G`; serialize each exact read/send/barrier range with `V`, report exact counts, and forbid reconnect/re-resolution. | Effect-time live relay start/executable/argv/cwd/pgid/sid and current-holder continuity are lost. Descriptor delegation is accepted; no-fork/no-daemonize/no-handoff becomes desired behavior, and diagnostics cannot close the race. |
| **2A — maintained custom shared-server tmux amendment** | Replace stock separate metadata/capture authority with the specified `agents-capture-v1` operation in one maintained custom tmux client/server build on Linux and Darwin; atomically compare exact server/session/pane/process IDs, 120x40, history 400, metadata, and `G`; retire only the owned pane/session on the retained connection. | Build/package/deploy/configure/maintain the custom compatible default tmux and migrate/upgrade the ordinary shared server as needed. Stock tmux 3.6 separate-command authority is lost; the shared server/socket and sibling sessions are always preserved. |
| **3B — process-preservation amendment** | Amend no-process-leak so sealed descriptor close, sticky revocation, and `PRESERVED` unresolved utility/group/descendant/relay targets complete this cleanup class; forbid numeric PID/PGID signalling. | Guaranteed forced retirement is lost. Non-cooperative processes may remain indefinitely, consume resources, and continue side effects. |
| **4C — namespace-preservation amendment** | Amend no-key/no-relay-socket/no-runtime-directory-leak; after `V`, perform no pathname unlink/rmdir and preserve every extant owned or replacement entry. The default tmux socket is shared and outside the owned ledger. | Key material, socket names/inodes, directories/children, disk use, and blocked basename reuse may remain. Cleanup reports preservation instead of leak-free success. |
| **5B — read-time retained-PTY amendment** | Amend PTY authority to retained master/slave identity, historical readiness/helper/reaper/supervisor/terminal bindings, retained fd-4/tag/sequence, and live `G`; assign one nonblocking read's complete returned range to `G` and serialize every read/write attempt with `V` and exact counts. | Production-time producer/generation and effect-time live utility/helper/foreground/winsize/producer proof are lost. Pre-activation or arbitrary-slave-holder output may be accepted, and writes may reach a different foreground job or geometry. |

## Falsifiable proof coverage

The candidate specifies future surviving-mutant oracles for:

- workload after `V`, cleanup before `V`, cleanup after `V` accidentally
  conditioned on `ACTIVE`, wrong-generation/handle cleanup, repeat cleanup,
  and attempted revival;
- retained relay/fd-5 object substitution and the expressly narrowed
  relay-current-holder semantics;
- pre-activation PTY buffering, mixed producers, both read/revocation orders,
  the disclosed diagnostic race, exact pre-`F` causes, and post-`F` abort;
- use of the named custom tmux operation, atomic geometry and generation,
  exact pane/session selectors, and survival of a sibling session, shared
  server, and socket inode;
- prohibited numeric utility/descendant/relay signalling and prohibited key,
  relay-socket, and runtime-directory pathname removal; and
- readiness publication, sideband settlement, sticky settlement, and
  non-revival.

Each cleanup baseline begins after `V` with an immutable sealed ledger, making
descriptor and owned tmux retirement, plus process/namespace preservation,
reachable without weakening the active-workload guard.

## Preserved obligations

The design leaves code and tests unchanged and retains:

- the frozen canonicalizer and DTO, exact row-end spaces, and real-host
  `40 -> 0`, `61 -> 24`, and `50 -> 12` byte oracles;
- terminal-changed rejection for `121x40`, history limit `401`, and malformed
  or absent capture/history evidence;
- D/0/07a capability/codec behavior;
- D/0/07b framing, FIFO, exact counts, stable-diagnostic pre-`F` dispositions,
  prefix accounting, post-`F` `WRITE_ABORTED`, and success only at `R`;
- direct provider `execve`, no shell, no `send-keys`, no `capture-pane -e/-J`,
  and inert public observation values; and
- sticky rejected-generation non-revival.

## Validation and scope evidence

Against the review base:

```text
git diff --check \
  1aa2eac06445dce19ce6455511ef723238b1bc26 \
  c00a2ee31f508babd0f0e5ae038a6659b134b01a

exit 0

git diff --name-only \
  1aa2eac06445dce19ce6455511ef723238b1bc26 \
  c00a2ee31f508babd0f0e5ae038a6659b134b01a

plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md
```

No runtime gate was run or claimed: this trial changes design text only and
authorizes no implementation.

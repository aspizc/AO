# Design Trial 5 review request — Project V5 D/0/07c

## Status

`to_review`

This is a design-only request. It nominates no implementation, integration,
promotion, release, D/0/07d gate, adapter/service/catalog splice, provider
launch change, or port surface.

## Candidate

- Review base:
  `099ac12e6362376972edbf15c6dc018f511ef8c0`
- Design commit:
  `846303211fa693f29671794a535a66d0caf8a371`
- Required design:
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`
- Design Trial 4 reviewer A:
  `9e111a5485e320d4ee0e4d50d29f1657b75d57f8`,
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-4_result.md`
- Design Trial 4 reviewer B:
  `099ac12e6362376972edbf15c6dc018f511ef8c0`,
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-4_result_b.md`

The design commit changes only the required design document. The pre-existing
untracked `gateway/node_modules` directory was not touched.

## Adjudicated review boundary

Reviewer A returned `reviewed_OK` with zero findings. Reviewer B returned
`reviewed_KO` with two P1s and no P0s; the orchestrator adjudicated those two
findings as KO.

Reviewer B independently confirmed that full-strength options 1A, 3A, 4A,
4B, and 5A are not buildable on both Linux and Darwin under the frozen
topology. Their deletion remains closed. The former 2A/2B merge into one
concrete custom-tmux choice and Decision 4's disclosure also remain closed.

## Per-finding closure map

| Finding | Closure in the candidate |
|---|---|
| P1-1 — Decision 3 surrendered more process retirement than the impossibility requires | The design now treats the helper-owned live-or-unreaped direct child as a retained cleanup lifetime anchor. Before activation it seals direct-child ownership and accepted `pid == pgid == sid`. Linux `WNOWAIT` and Darwin kqueue observation remain nonreaping. At `C > V`, one cleanup/reap mutex keeps the leader unreaped, signals the sealed original process group with `SIGTERM`, the frozen grace interval, then `SIGKILL`, treats `ESRCH` as that exact group already absent, and permits leader reap only after the group attempt is terminal. A fresh identity/PGID lookup cannot authorize or redirect the signal. Exact forced retirement therefore remains mandatory for the direct utility root and every member still in its original group. The amendment preserves only descendants that moved to another group in the same session or a new session, plus the separately tmux-launched relay. |
| P1-2 — Decisions 1, 2, and 5 omitted accepted losses from the ratification column | Decision 1 now discloses loss of effect-time accepted tmux server/session/pane continuity and that relay/barrier traffic may continue during unobserved terminal-binding drift. Decision 2 now discloses that a custom-server defect/outage or retained-connection loss can affect the shared default server and leave the port-owned pane/session unresolved and `PRESERVED` indefinitely. Decision 5 now lists loss of effect-time utility `pid`/`startToken`/`bindingDigest`, executable/argv/cwd/pgid/sid, all issued helper/reaper/supervisor and terminal/tmux facets beyond retained PTY-object identity, foreground, winsize, and producer identity. Its loss cell keeps pre-`ACCEPT`, pre-activation, mixed-writer/time, arbitrary-slave-holder, and changed-foreground/geometry consequences explicit. |

## Disputed findings

None. Both adjudicated P1s are accepted. No previously closed finding or
deleted option was reopened.

## Final operator decision table

Every row remains mandatory. Each line states the exact commitment and the
complete deployment/capability loss presented for ratification.

| Option | What ratification commits the operator to | Deployment cost and capability lost |
|---|---|---|
| **1B — retained-socket/read-range amendment** | Authority is the original connected-socket object, handshake kernel pid/uid/gid, one-use `ASR1` proof, historical accepted tmux server/session/pane IDs, and live `G`; every read/send/barrier range shares the `E`/`V` lock and exact-count rule; reconnect/re-resolution is forbidden. | Stock Linux/Darwin sockets remain usable, but live relay start/executable/argv/cwd/pgid/sid, current-holder continuity, and effect-time accepted tmux server/session/pane continuity are lost. Descriptor delegation is accepted; relay input/output and barrier traffic may continue during unobserved relay or terminal-binding drift. Diagnostics cannot close either race. |
| **2A — maintained custom shared-server tmux amendment** | Ship and use one maintained Linux/Darwin custom tmux client/server with versioned retained-connection operation `agents-capture-v1`; atomically compare exact server/session/pane/process IDs, 120x40, history 400, metadata, and `G`; use the same retained connection only for the port-owned pane/session. | Build/package/deploy/configure/maintain the compatible custom default tmux and migrate/upgrade the ordinary shared server. Stock tmux 3.6 separate-command authority is lost. The shared server/socket/siblings are never port-cleaned. A defect, protocol skew, outage, or connection loss can affect that shared server and leave the owned pane/session `PRESERVED` indefinitely. |
| **3B — bounded process-preservation amendment** | Keep the helper-owned direct child live or unreaped and use its sealed `pid == pgid == sid` to force-retire the direct utility root/original group with TERM/grace/KILL before leader reap; `ESRCH` means already absent. Preserve only unresolved descendants outside that original group and the separate relay; arbitrary/later PID/PGID signalling is forbidden. | No new dynamic containment topology is required, and exact root/original-group retirement is retained. Only a descendant in another same-session group or new session, and a non-cooperative relay, may survive indefinitely, retain resources/credentials/fds, continue side effects, and spawn more work. |
| **4C — namespace-preservation amendment** | After `V`, close retained sockets but perform no pathname unlink/rmdir; preserve every extant owned or replacement relay key/socket/runtime-directory entry. The default tmux socket remains shared and outside the owned ledger. | Residual key material, socket names/inodes, directories/children, disk use, and blocked basename reuse may remain. Cleanup reports preservation instead of leak-free success. |
| **5B — read-time retained-PTY amendment** | Authority is the original retained master/slave identity, historical readiness utility/helper/reaper/supervisor/terminal bindings, retained fd-4/tag/sequence, and live `G`; one nonblocking read assigns its complete range to `G`, and every read/write attempt shares `E`/`V` with exact counts. | Production-time producer/generation and effect-time utility `pid`/`startToken`/`bindingDigest`/executable/argv/cwd/pgid/sid, helper/reaper/supervisor, terminal/tmux, foreground, winsize, and producer continuity are lost beyond exact retained PTY-object identity. I/O may pass after an unobserved change. Pre-`ACCEPT`/pre-activation and mixed-writer/time bytes are assigned to `G`; any slave holder's output may be accepted, and writes may reach changed foreground/geometry. |

## Decision 3 proof boundary

The future mutation specifications now isolate:

- rejecting a numerically matching `pid == pgid == sid` target that is not
  this helper's direct child;
- using only the sealed accepted group when a diagnostic reader returns an
  unrelated group;
- the exact call order `TERM(-A)`, grace, `KILL(-A)`, then leader reap;
- `ESRCH` as already absent, with no lookup or alternate signal;
- preservation of both a descendant in another group of the same session and
  one in a new session; and
- preservation of the separately tmux-launched relay.

The existing active-workload/one-way-cleanup partition, exact pane/session
targeting, shared-server/socket survival, and namespace-preservation proofs
are unchanged.

## Preserved obligations

The candidate keeps:

- the active-workload versus post-`V` cleanup partition and one-way,
  same-generation, no-replacement, no-revival ledger;
- the settled deletion of unavailable 1A/3A/4A/4B/5A choices and the concrete
  merged custom-tmux option;
- the read-time PTY source rule and all pre-`F`/post-`F` dispositions;
- the frozen canonicalizer/DTO, exact row-end spaces, and real-host
  `40 -> 0`, `61 -> 24`, and `50 -> 12` byte oracles;
- atomic rejection of 121x40, history 401, and malformed/absent evidence;
- D/0/07a capability/codec behavior and D/0/07b framing/FIFO/count/settlement
  behavior;
- direct provider `execve`, no shell, no `send-keys`, no
  `capture-pane -e/-J`, and inert public observation values; and
- HARD FAIL until all five amendments and their costs are ratified.

## Validation and scope evidence

Against the review base:

```text
git diff --check \
  099ac12e6362376972edbf15c6dc018f511ef8c0 \
  846303211fa693f29671794a535a66d0caf8a371

exit 0

git diff --name-only \
  099ac12e6362376972edbf15c6dc018f511ef8c0 \
  846303211fa693f29671794a535a66d0caf8a371

plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md
```

No runtime gate was run or claimed: this trial changes design text only and
authorizes no implementation.

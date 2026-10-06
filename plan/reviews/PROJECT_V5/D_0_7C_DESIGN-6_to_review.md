# Project V5 D/0/07c Design Trial 6 — review request

## Candidate

- Design commit:
  `2afee8abd8684a3266786640238b4b68ef7eccbe`
  (`design(v5): close design trial 5 finding for D/0/07c`)
- Adjudicated Trial 5 verdict/base:
  `a26039421664b4452a5c4ff968bae7ca27056698`
- Design:
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`
- Trial 5 reviewer A:
  `0e05d8b19daa944629a25c9bd0db249459d67dd3` (`reviewed_OK`,
  zero findings)
- Trial 5 reviewer B:
  `a26039421664b4452a5c4ff968bae7ca27056698` (`reviewed_KO`,
  one P1 and zero P0)

The orchestrator adjudicated reviewer B's single P1 as KO. This candidate
closes only that disclosure finding. It makes no implementation or test
change and does not reopen any Trial 5 safety, narrowing, option-deletion, or
Decision 1/2/5 ruling.

## Finding and closure

| Finding | Closure in the design commit |
|---|---|
| Reviewer B P1-1 — Decision 3's operator line said exact direct-root/original-group retirement was retained and only outside-group descendants plus the relay could survive, although the operative rule already required `PRESERVED` when current direct-child ownership or the unreaped-leader anchor was unavailable. | Decision 3 now discloses both branches. With the anchor held, forced retirement of the sealed original group remains mandatory and only outside-group descendants plus the separate relay may survive. With the anchor lost through helper or reaper death, adoption after that death, premature reap, or cleanup after a restart, no numeric signal is permitted and unresolved direct-root/original-group members may also survive as `PRESERVED`. |

The misleading “and only that set” statement is gone. The surrounding
Decision 3 disclosure now names both residual sets and all four ordinary
anchor-loss paths (`design:363-388`). The complete-site inventory mirrors the
existing safe fallback (`design:483`). The ratifiable commitment and
capability-loss cells state the anchored and anchor-lost cases independently
(`design:513-519`). Four isolated future mutation obligations require zero
signal calls after post-sealing helper/reaper ownership loss, adoption after
that death, premature reap, and restarted-cleaner loss (`design:557-561`).

## No operative rule changed

No allowed signal, target, ordering, fallback, or settlement rule changed.
In particular:

- `C_G` may still signal only the sealed original utility group while the
  original helper currently owns the live-or-unreaped direct child and before
  leader reap (`design:150-159`).
- The required anchored sequence remains `SIGTERM`, frozen grace,
  `SIGKILL`, terminal group attempt, and only then leader reap; `ESRCH`
  remains exact-group absence and no re-resolution is permitted
  (`design:343-361`).
- When the current ownership/unreaped predicate is unavailable, cleanup still
  sends nothing by number and records the unresolved target `PRESERVED`
  (`design:363-370`).
- Arbitrary or later PID/PGID lookup and signalling remain forbidden
  (`design:363-388,517`).

The diff
`a26039421664b4452a5c4ff968bae7ca27056698..2afee8abd8684a3266786640238b4b68ef7eccbe`
changes only
`plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`. Its substantive
hunks are:

1. Trial 5 adjudication and the disclosure-only scope statement
   (`design:21-28`);
2. replacement of the incomplete residual-set prose
   (`design:363-388`);
3. truthful duplication of the existing fallback in the complete inventory
   (`design:483`);
4. the corrected operator commitment and two-case capability-loss disclosure
   (`design:517`);
5. isolated zero-signal proof obligations for the newly disclosed ordinary
   anchor-loss cases (`design:557-561`); and
6. the Trial 6 closure and scope summaries (`design:641-650,687-708`).

These are disclosures, inventory/proof specifications, and closure text. They
do not add an authority, authorize a numeric fallback, or weaken exact
anchored retirement.

## Final decision table

This is the final table presented for operator ratification in the candidate
design:

| Decision | Sole ratifiable option | Ratification commits the operator to | Deployment cost and capability lost |
|---|---|---|---|
| 1. Relay transfer authority | **1B — retained-socket/read-range amendment** | Amend the parent so authority after `ACCEPT` is exactly the original connected-socket object, handshake kernel pid/uid/gid, successful single-use `ASR1` proof, historical accepted tmux server/session/pane IDs, and live `G`. Every nonblocking read/send range and barrier step shares the workload `E`/`V` lock and returns its exact count; reconnect/re-resolution is forbidden. | Portable with stock Linux/Darwin sockets, but live relay start/executable/argv/cwd/pgid/sid, current descriptor-holder continuity, and effect-time continuity of the accepted tmux server/session/pane binding are lost. The no-fork/no-daemonize/no-socket-handoff rule becomes desired behavior, not enforceable transfer authority: delegation of the original descriptor is accepted. Relay input/output and barrier traffic may continue on that socket during unobserved relay or tmux-binding drift. Diagnostics may revoke when they observe drift but cannot close either race. |
| 2. Atomic tmux capture and owned-object retirement | **2A — maintained custom shared-server tmux amendment** | Amend the frozen stock separate metadata/`capture-pane` authority mechanism to a maintained Linux-and-Darwin tmux client/server build with the versioned retained-connection command `agents-capture-v1`. In one server-event-loop operation it compares exact server/session/pane/process IDs, `120x40`, history limit `400`, metadata, and `G`, then returns the capture bytes. The same retained connection may retire only the port-created `%pane_id`/`$session_id`. | Build, package, deploy, configure, and maintain the custom binary/protocol as the user's default tmux on both platforms, including compatible upgrade/migration of the ordinary shared server so the exact literal `tmux attach -t <tmuxTarget>` stays unchanged. Stock tmux 3.6 separate-command compatibility as the authority mechanism is lost. The shared server/default socket and unrelated sessions are never port-cleaned; `kill-server` and socket unlink are forbidden, and a sibling-session survival oracle is mandatory. A defect, protocol skew, outage, or loss of the retained custom-server connection can affect that shared server and leave the port-owned pane/session unresolved and `PRESERVED` indefinitely. |
| 3. Process/tree retirement | **3B — bounded process-preservation amendment** | While the original helper owns the live-or-unreaped child sealed with `pid == pgid == sid`, retain mandatory forced retirement of the direct utility root and every member still in its original process group: serialize `SIGTERM`/grace/`SIGKILL` before leader reap and treat `ESRCH` as the exact group already absent. Descendants that left that original group, whether for another group in the same session or a new session, and the separately tmux-launched relay are unconditionally subject to descriptor close, cooperative exit, and unresolved `PRESERVED`. If any of these paths makes the ownership/unreaped anchor unavailable—helper or reaper death; adoption after that death; premature leader reap; or cleanup after a restart—send no numeric signal and record unresolved direct-root/original-group targets as `PRESERVED` too. Arbitrary/later PID or PGID lookup/signalling remains forbidden. | Portable without a new dynamic process-containment topology. **Anchor held:** exact forced retirement of the direct root/original group is retained; only outside-group descendants and a non-cooperative relay may survive indefinitely. **Anchor lost:** after helper or reaper death, adoption after that death, premature reap, or cleanup after a restart, the direct root and original-group members may also survive as `PRESERVED`. Every survivor may retain resources/credentials/fds, continue side effects, and spawn more work after the port rejects. |
| 4. Owned namespace retirement | **4C — namespace-preservation amendment** | Amend the no-key/no-relay-socket/no-runtime-directory-leak criterion. Normal pre-`ACCEPT` key consumption may retire the key; after `V`, cleanup closes retained sockets but performs no pathname `unlink` or `rmdir`, records every extant owned or replacement key/socket/directory entry as `PRESERVED`, and never removes a same-name replacement. The shared tmux socket is not an owned entry. | Portable without a conditional filesystem primitive or new privilege topology, but residual key material, relay socket names/inodes, directories/children, and disk use may remain and may block safe basename reuse. Cleanup reports preservation rather than leak-free success. |
| 5. PTY source/write authority | **5B — read-time retained-PTY amendment** | Amend the parent so authority is the original retained master/slave objects and `ACCEPT` dev/ino/rdev, historical authenticated readiness utility pid/start/binding digest, historical helper/reaper/supervisor and terminal bindings, retained fd-4/tag/sequence channel, and live `G`. One nonblocking master read at `E_read` assigns every returned byte to `G`, including pre-`ACCEPT`/pre-activation buffered bytes and ranges spanning producers or production times. Reads run only after activation; `E_read < V` returns its exact range, `V < E_read` reads zero, and revocation waits for an already linearized syscall. Each retained-master write attempt has the same `E`/`V` and exact-count rule. | Portable with ordinary PTYs, but production-time producer/generation provenance and effect-time continuity of utility `pid`/`startToken`/`bindingDigest`/executable/argv/cwd/pgid/sid, the issued helper/reaper/supervisor and terminal/tmux binding facets beyond retained PTY-object identity, foreground, winsize, and producer identity are lost. The original retained PTY objects remain exact, but their I/O may pass after an unobserved change in any other listed facet. Bytes buffered before `ACCEPT` or activation and ranges spanning mixed writers/times are assigned to `G`; output from any slave holder may be accepted, and a write may reach a different foreground job or geometry. Stable diagnostics retain frozen error mapping but do not close diagnostic-to-I/O races. |

All five decisions remain one pre-implementation ratification gate. Declining
any line leaves its dependent path at HARD FAIL. This request does not itself
ratify any line.

## Validation and scope

- `git diff --check
  a26039421664b4452a5c4ff968bae7ca27056698..2afee8abd8684a3266786640238b4b68ef7eccbe
  -- plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md` exited zero.
- The design commit changes exactly one tracked file: the design named above.
- No implementation, source, test, fixture, codec, capability, adapter,
  service, catalog, provider launch, tmux session, socket, or runtime state
  was changed or exercised.
- No runtime gate was run; this is a design-only candidate.
- No D/0/07d, splice, integration, promotion, release, or operator-ratification
  claim is made.
- The pre-existing untracked `gateway/node_modules` directory was not touched.

## Review request

Please review only whether:

1. the Decision 3 commitment and loss cell now disclose the complete residual
   set for both anchor-held and anchor-lost cases;
2. helper or reaper death, adoption after that death, premature reap, and
   cleanup after a restart are all explicit;
3. the future proof obligations isolate zero-signal behavior for each
   anchor-loss class; and
4. the diff leaves every operative signal, ordering, no-re-resolution, and
   preservation rule unchanged.

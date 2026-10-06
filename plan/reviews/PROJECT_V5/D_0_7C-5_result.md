# Review Result — Project V5 D/0/07c (Trial 5): KO

Fresh independent reviewer (Claude Fable 5, maximum effort), continuation trace
`tr-d007c-t5-review-cont-15265572-ae2b-4d87-99dc-b5a082fc3b74`, task
`ts-aeda221c-5386-4650-b64c-22f47841397f`. Reviewed candidate HEAD
`7ecb0fdd8d5a99df4de477358729a21077cbde66` (technical
`8c77c92746d348410b807e319d4f52b8fec9bf98`) against
`plan/PROJECT_V5/D/0/07c.md`, the Decision 4C ownership rules, and
`D_0_7C-5_to_review.md`. The reviewer did not implement the candidate.

## Verdict: KO

The happy-path correction is real and mutation-proven, but a confirmed
supported failure-path leaves the exact PTY identity authority as an adopted
zombie while cleanup reports clean. Per the sheet's own bar (exact ownership on
every supported path), this is at least P1 and the trial is KO.

## Findings

### 1. P1 — Launch-failure window leaks the exact PTY authority as an adopted zombie

- Evidence: the authority is forked before its composite identity can reach the
  reaper (`gateway/src/adapters/process_supervisor_helper.py:1506-1527`); the
  identity travels only through the private identity pipe
  (`process_supervisor_helper.py:1544-1556`). In `_spawn_utility`, when
  `_read_identity` returns a failure reason (timeout/caller_lost/supervisor
  loss), `authority_identity` remains `None`
  (`process_supervisor_helper.py:1990-2007`), and the failure branch calls
  `_bounded_session_port_utility_cleanup(identity, grace, authority_identity)`
  with `None` (`process_supervisor_helper.py:2044-2053`). The
  authority-optional clean predicate then treats "no authority target" as clean
  (`process_supervisor_helper.py:1917-1939`; relay-side mirror at
  `process_supervisor_helper.py:5391-5397`).
- Reproduction: preserved read-only production-path probe (`leak_repro.py`,
  prior reviewer scratchpad) delays only the utility's own identity publication
  by 200 ms under a real 50 ms launch deadline: `_spawn_utility` returns
  `timed_out`, bounded cleanup reaps only the utility leader, and one exact
  authority `Z` remains in the sealed utility PGID/SID until the probe reaps
  it. Code flow re-validated line-by-line this trial; prior Fable reviewer also
  confirmed a `caller_lost` variant.
- Correction: publish the authority identity so it cannot be lost to the
  launch deadline (e.g. dedicated early authority-identity write before the
  main identity record, or parse any partial identity record on the failure
  path), and change the clean predicate so a PTY generation with no recorded
  authority target is NOT clean — the failure path must reap the exact
  authority or report the leak.
- Required verification: a RED test driving the real launch-deadline window
  (leak_repro.py shape) that fails on the zombie; GREEN after correction;
  mutation M1 below must remain RED.

### 2. P1 — Harness cleanup is not exception-safe; failures bypass exact server shutdown

- Python: `_stop_owned_tmux_server` raises on kill-server failure before
  `server.wait`
  (`tests/gateway/process_supervisor_session_port_fixture.py:3457-3464`), and
  in the probe `finally` chain `_wait_owned_processes_absent` runs before
  `_stop_owned_tmux_server`
  (`process_supervisor_session_port_fixture.py:2598-2599`), so a pane-wait
  failure bypasses server shutdown entirely.
- Node: `cleanIsolatedTestWorkspace` asserts sibling kill status
  (`tests/gateway/process_supervisor_session_port_relay.test.js:256`) and
  kill-server status (`...relay.test.js:273`) before
  `await tmuxOwnership.exit` (`...relay.test.js:275`) — an assertion throw
  leaves the foreground `-D` server child unwaited; and cleanup registration
  is deferred (`workspaceCleanup ??=` at `...relay.test.js:1041` and `:1153`)
  until after supervisor startup/utilityIdentity, so early startup failures
  never register cleanup.
- This is the same leak class the trial exists to close (the authenticated RED
  included a harness-cleanup-ordering adopted zombie), on failure paths only:
  separate P1.
- Correction: make server shutdown/wait unconditional (try/finally around the
  assertions; register cleanup at spawn time), keeping exact identities.
- Required verification: fault-injection run (failing kill-server /
  pane-wait) must still end with the exact server child waited; ci_gate
  containment must stay clean.

### 3. P2 — No exact-owner proof binding tmux `#{pid}` to the spawned `-D` child

- Evidence: harnesses spawn the server as an exact direct child
  (`...relay.test.js:165`, `...fixture.py:3430`), and the fixture's
  `server_preserved` check compares live `display-message "#{pid}"` output
  only against `identity["serverPid"]`, which itself originates from the tmux
  relay identity capture (`...fixture.py:2564-2579`, `:2506`) — tmux
  self-report on both sides. No harness compares live `#{pid}` with the
  spawned child PID (Node awaits the child's exit but never anchors
  `#{pid} === child.pid`).
- Correction: assert `#{pid}` equals the spawned `-D` child PID once after
  server start in each harness.

## Mutation and sentinel proofs (disposable copy `/tmp/claude-1000/mut-d007c` at 8c77c92)

All runs through `scripts.ci_gate._execute_command` with the preserved driver
and the submission's environment.

- M1 — remove exact post-transfer authority reap (`_reap_exact_adopted_child`
  no-op'd): PTY+Darwin set stayed rc 0, 16/16 pass, but ci_gate outcome =
  `process_tree_leak`. Mutation detected by containment; the product reap is
  load-bearing.
- M2 — remove foreground tmux/pane ownership (`cleanIsolatedTestWorkspace`
  early-returned): the single real-relay case never completed — the run hung
  more than 60 s past its normal duration with only the mutation subtree
  (ci_gate supervisor + surviving foreground `-D` server child) alive, and was
  reaped by the operator. RED confirmed: without exact harness tmux/pane
  ownership the run cannot reach a clean `completed` outcome; the retained
  server survives its owner. The exact mutation subtree was then killed and
  the copy restored.
- M3 — sentinel (deliberate descendant leak): skipped on operator instruction
  after the M2 hang, to preserve the token budget. Containment sensitivity is
  already evidenced twice independently: M1 (unreaped authority →
  `process_tree_leak` at rc 0) and the authenticated RED artifact
  `art-dde18c55-778b-4b5d-9883-572ae2d4b504` (assertions green, containment
  rejects). Not load-bearing for this verdict.

## Happy-path gate totals (preserved, independently reproduced through ci_gate)

- Three named real-relay cases: each `completed`, rc 0, 1/1 pass, 0 skip.
- Full relay suite: `completed`, rc 0, 58/58 pass, 0 skip.
- Trial 4 focused pair: `completed`, rc 0, 2/2 pass.
- PTY + Darwin: `completed`, rc 0, 16/16 pass.

These totals stand, and do not erase the failure-path KO: the leak occurs on
supported failure paths the gate matrix does not drive.

## Darwin and DTO secrecy — clean

- The authority fork and reap are Linux-gated
  (`process_supervisor_helper.py:1917-1918`, fork guard in the PTY branch);
  Darwin tests pass 16/16 with no authority surface.
- The composite authority identity (`pid`/`startToken`/`pgid`/`sid`) travels
  only on the private identity pipe (`process_supervisor_helper.py:1544-1556`);
  the cleanup outcome DTO exposes only a state string
  (`process_supervisor_helper.py:5378`, `:5391-5397`); the Node adapter has no
  `ptyAuthority` field.

## Scope and policies

Reviewer wrote only `plan/reviews/PROJECT_V5/D_0_7C-5_result.md` and the
matching pending row in `plan/PROJECT_V5/reviews/README.md`. No product, test,
request, status, or policy edits; no integration, promotion, push, tag,
release, or support claim. Policies unchanged.

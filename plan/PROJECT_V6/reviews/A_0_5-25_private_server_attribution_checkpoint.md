# A/0/05 private-server residue attribution checkpoint

2026-10-08. Unreviewed/uncommitted trial4 coder continuation. No agents,
review verdict, commit, provider restart or full project gate. Root owns those
steps and operator live acceptance. Prior checkpoint/review evidence preserved.

Binary search under existing ci_gate.py supervisor, host pinned tmux, default
Node isolation/concurrency1: split-early 16/16 assertions pass but
process_tree_leak; split-late 18/18 completed; early-delegate 4/4 but
process_tree_leak; early-others 12/12 completed. Exact verified and ambiguous
refusal cases each 1/1 assertions pass but process_tree_leak.

Strengthened tests retain exact socket-observed server and two pane identities,
actual parent linkage, before/after raw stat and kill(0) result. Pre-source RED
private-panes-red: 0pass/2fail, Node exit1, process_tree_leak. Verified production
closure: server1435992/start18253582/PGID1435931/SID1435931 ends, but pane
1435997/start18253584/PGID=SID1435997 and pane1436002/start18253585/PGID=SID1436002
become Z, adopted by supervisor1435924, from original parent1435992.
Ambiguous production closure correctly preserves server1436015/start18253590
and panes1436019/start18253592 and1436023/start18253593 (each PGID=SID=PID).
Fixture then ends their server before reaping, leaving both Z under1435924.
Raw log has authoritative complete identities and parents.

Production-only intermediate: 1pass/1fail, process_tree_leak. Verified production
pane absence now succeeds; ambiguous fixture teardown remains RED.
Production shares existing postorder identity-bound per-child reaping before
closing verified wholly-owned private server. Server/socket identity remains
checked before traversal and again before signal; unreadable identity refuses
without descendant signals. Existing waits, strict absence and spawn tuple
checks retained. Fixture separately binds exact socket/server/PID/start/PGID/SID,
actual pane tuple and parent, ending each pane while server is alive to reap it.
Its success is NEVER production closure proof for ambiguous case.

private-panes-green: 4pass/0fail, exit0, supervisor completed. Strengthening
ambiguity assertions and final clean focused/wider verification still pending.
Evidence and command/source bindings: /tmp/v6-a05-residue/; archival final
checkpoint/handoff will bind these immutable logs. No timeout increase, broad
process matching, zombie-as-absent, harness edits, manual signals or rerun-to-green.

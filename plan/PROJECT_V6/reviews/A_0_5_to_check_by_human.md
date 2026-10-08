# A/0/05 trial 2 — lifecycle decision required

Disposition: **blocked on root/operator decision**, not a verdict or acceptance.
The trial2 brief explicitly requires a precise limitation and stop if proved
owned child cleanup cannot be implemented within the bounded correction.

## Observed blocker

Two distinguishing tests in `tests/gateway/request_context_reattach.test.js`
exercise the production `CodexAdapter` and `createAgentService` with a fake
executable, an isolated foreground tmux server, and real Linux processes:

- `spawn post-await denial must leave no untracked real child`;
- `delegate post-await denial must leave no untracked real child`.

The adapter starts work, the test observes the child identity, then revokes the
request context before the adapter result returns to the service. The protected
call returns the generic `REQUEST_CONTEXT_DENIED`; the child retains its PID
and Linux start token. No new session row or recovery binding records that
child, and protected view is denied. Both safety assertions remain RED.
The disposable fixture cleans its own children separately; that test cleanup
is **not** product cleanup. Scoped unchanged CI containment reports `completed`
with exit 1, not a process-tree leak, for the safety assessment.

Spawn demonstrates a supervised target created by the actual adapter. Delegate
uses a fake executable that deliberately creates a tmux descendant and exits;
it demonstrates possible surviving provider descendants, not that every real
Codex delegate creates one. The returned delegate contract has no descendant
handle. No actual provider or production Gateway was started.

## Why correction stops here

The service does not receive an independently verifiable cleanup ownership
receipt. A spawn result carries a target string; a delegate result carries no
child identity. Killing a target string after authority denial, deriving a
fresh kill grant from stale context, or scanning and killing global processes
would introduce an authority hazard. No such bypass was implemented. The
post-await revalidation remains intact and no SQLite lock spans provider work.

Root must decide the bounded lifecycle design before a next correction: for
example, adapter-owned cleanup tied to an observed target/process identity,
with descendant ownership and failure evidence, rather than late generic
`agent.kill` on an unverified name. This report does not accept the orphan risk
or choose a new security policy. Do not close the supervised-lifecycle sheet
or count the new RED safety tests as pass/deferred.

## Stale kill state

`real kill denial retains stale business state but fresh recovery grants no
dead target` exercises a real adapter kill followed by context revocation.
The target exits and is reaped; the existing business row remains `running`.
A fresh explicit recovery reports `target_gone`, hydrates no session, and
protected view remains denied. This is a documented consistency limitation,
not a reconciled business state. Recording closure under lapsed authority was
not introduced; root must decide whether separate server-owned observation
reconciliation belongs in the next bounded lifecycle correction.

## Pending ownership

Root retains the full host gate, CI inventory, live Codex restart/reattach
acceptance, independent review, statuses, CHANGELOG and serial A04/V7
reconciliation. Trial1 evidence remains immutable. No commits or policies.

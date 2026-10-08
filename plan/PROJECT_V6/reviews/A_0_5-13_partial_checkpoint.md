# A/0/05 — checkpoint 13: receipt GREEN, late delegate RED

2026-10-08. **Partial, unreviewed; no complete-sheet handoff or verdict.**
Preserves checkpoint12 without overwriting it. No quota notice or model switch
was observed. The coder's verified banner was GPT-6.1-Sol medium, Codex
v0.160.1. Trace/task remain those in checkpoint12. Root retains independent
review, serial shared-file reconciliation and integration authority.

## Candidate and exact evidence

Entry HEAD `2ed684f82174c57cc43298bb90a296ce810996b0`.
The checkpoint11 test hashes matched before test edits:
`c419fa3581d9d71687aa37c68809120d0df43e6ca31e3d04f7c732d4e8eb8a0e`
and `f4fae7e538914fac90037ed36f078ed6771faf3259491b4823dabb2141edd0c2`.
This continuation changed only production `gateway/src/adapters/tmux_client.js`,
test `tests/gateway/request_context_reattach.test.js` and new evidence files.
No policies changes, subagents, self-review, commit, push, production Gateway
restart, real-provider calls, name-only cleanup or global process scans.

[Manifest](v6-a05-checkpoint13-manifest.json) binds 46 current dirty files
and eight sanitized archives, including raw local log SHA-256 values.
Manifest SHA-256:
`8272bd88d17943290409406a1a2fef82aeff24dc739d6ee21427ebb7bab41824`.
The manifest excludes itself and this checkpoint. Earlier checkpoint archives
remain unchanged. Archive JSON diagnostics and checkout/private fixture paths
are removed; long process/start tokens are redacted. Raw logs remain in `/tmp`.

## TDD and regression outcomes

Every listed run reached complete TAP totals; none had cancelled/skipped/todo.
Host commands used pinned private foreground tmux and disposable executables.
Source patches were separate from each short focused host approval.

| Run | Passed | Failed | Exit | Attribution |
|---|---:|---:|---:|---|
| root cp12 RED | 1 | 8 | root log, exit not independently captured | before-response orphan, scoped argv and malformed-output failures |
| creation receipt GREEN | 9 | 0 | 0 | fixed creation response and original-child cleanup/replacement preservation |
| first expanded cleanup | 18 | 2 | 1 | late settlement RED plus invalid multipane fixture |
| multipane witness | 0 | 1 | 1 | invalid fixture, not product RED |
| corrected multipane | 1 | 0 | 0 | observed pane-ID mutation and refusal guard |
| final expanded cleanup | 20 | 1 | 1 | only late delegate settlement remains RED |
| builder regression | 2 | 0 | 0 | existing command builder guards |
| service regression | 144 | 0 | 0 | existing service/context/catalog guards |

Counts overlap; do not add them as unique acceptance. Exact focused commands:

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none --test-name-pattern='adapter-failure-before-response|creation observ|malformed creation' tests/gateway/request_context_reattach.test.js tests/gateway/request_launch_observation.test.js
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none --test-name-pattern='settles only|post-await denial must leave|creation observ|malformed creation' tests/gateway/request_context_reattach.test.js tests/gateway/request_launch_observation.test.js
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none --test-name-pattern='spawn multipane' tests/gateway/request_context_reattach.test.js
node --test --experimental-test-isolation=none --test-name-pattern='builds tmux|uses default' tests/gateway/tmux_client.test.js
node --test --experimental-test-isolation=none tests/gateway/tool_agent.test.js tests/gateway/tool_agent_model.test.js tests/gateway/agent_errors.test.js tests/gateway/request_context.test.js tests/gateway/request_context_boundary.test.js tests/gateway/request_context_execution_binding.test.js tests/gateway/tool_catalog.test.js tests/gateway/tool_projection_contract.test.js
```

The final regression archive is `v6-a05-cp12-cleanup-final.txt.gz`.
Syntax checks and `git diff --check` exit 0. No full CI gate or broad
containment probe was run. These results do not replace trial1's failed gate.

## New distinguishing cases and correction

`delegate late settles only its observed child after durable publication`:
the existing real CodexAdapter runs a disposable executable that creates a
real child in the wrapper's owned private server. The wrapper adapter delays
100 ms after observing that child; service timeout is 25 ms. The tool returns
TIMEOUT with no new supervised session/lineage. After the wrapper promise has
settled and a further 20 ms, the same Linux child start token remains live.
The assertion fails before teardown. Fixture-only teardown explicitly calls
`settleRequestLaunch(await latePromise, false)` and reaps the private child and
server. That teardown is never credited as production cleanup. This is a
valid late-result safety RED; no service production fix was made in this slice.

`spawn multipane ...`: the first fixture incorrectly used a session-style
target for `split-window`; its adapter assertion was caught by the tool,
and normal failure cleanup killed the original child. The witness log had
no before-mutation diagnostic. Thus both initial failures are fixture errors,
not multipane product defects. The corrected fixture splits by the observed
immutable pane ID, records that two panes actually exist, and asserts that
mutation occurred before accepting the tool error. Cleanup refuses and leaves
the original identity alive. It passes unchanged production cleanup.

`spawn ambiguous ...`: an exact provider PID `/proc/stat` read throws EACCES
after its live witness is recorded. Tool error, no durable session publication
and the process still exists. This guard passes without new production edits.
It covers unreadable identity before signalling, not ambiguity after signalling.

`spawn resistant ...`: the disposable provider installs a SIGTERM handler
before writing its ready marker. Revocation triggers cleanup; its retained
identity remains alive and the tool reports an error rather than success.
Fixture C-c teardown then reaps it. This passes existing bounded failure
behavior and is guard coverage, not a newly fixed resistance RED.

## Resume requirements and limits

The fixed receipt closes only checkpoint10's creation/name-query interval for
the tmux tuple. It does not supply pidfds, server-lifetime attestation, atomic
kernel start-token binding or general process supervision. Unreadable/reused
initial process identities, failure after signalling, multipane/new-window
mutation races and an end-to-end bound still require assessment.

Late delegate settlement remains a known failing test. The next source step
is in service timeout/result ownership and cleanup, rather than creation
receipt parsing. The coder interpreted the user's "only narrow" source grant
as permitting this receipt slice; root must retain or clarify the scope for
broader timeout/process-control changes. That interpretation is not an extra
skill-mandated approval gate.

Non-tmux detached descendants and other executable-provider containment have
not been tested or fixed here. They remain open; the wrapper is still registered
only for Codex. No positive safety claim is made for them. Avoid inventing
cleanup authority from a returned name, unreadable identity or global scan.

This is a durable continuation point, not completion. Next coder should read
this checkpoint, checkpoint12 and the bound final RED log, preserve all dirty
bytes, and continue scoped TDD. Independent review, full solo host gate/skip
budget and actual live Codex restart/reattach/ask/view acceptance remain pending.
No complete trial handoff is issued while the late settlement safety test is RED.

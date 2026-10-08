# A/0/05 — trial 3 review request

2026-10-08. **Unreviewed, uncommitted candidate; independent verdict pending.**
HEAD `5dde9f0066fec7392ff4c7bf806cc0c653a42f10`, branch
`feat/V6-A-0-05-local-recovery`. Fresh trace
`tr-r3-v6-a05-fix-14c0c7ed-a078-49ce-8ca6-2f29596a04ab`, task
`ts-32c3fd9f-49d7-4357-9601-8ecc42def676`. Gateway cwd refusal and the
operator-designated outside-roots fallback remain the session provenance;
no replacement trace/session or overlapping coder was created. Host pane
`%13` banner verified as `GPT-6.1-Sol medium fast` (priority/fast mode);
Node v22.22.1 and fixture tmux 3.6a-agents.1. No model switch or quota notice.

## Authority and preserved evidence

User authoritatively designates the committed independent trial2 KO at HEAD.
It was read in full with AGENTS/profile, plan/README, Stage A README, A/0/05,
historical source-only OK and checkpoints 9–18. This coder fixes ONLY KO1–5
and 7; KO6 is root-owned. Committed KO, review index and historical source OK
are byte-identical to HEAD. Prior evidence is not rewritten. Checkpoint18
preservation: 55/60 bound files unchanged, exactly the five paths listed below
changed; 18/18 compressed and uncompressed archive hashes unchanged. Historical
source-only OK remains evidence only for its original exact bytes, never an OK
for this candidate. Checkpoint14's premature GREEN remains void as checkpoint15
requires. Checkpoint19 records this trial's durable intermediate state.

No subagents, self-review, policies edits, commits, push, full gate, production
restart, real providers, global process scan or name-only cleanup. Source/test
patches were normal workspace operations; host test commands were separately
scoped and reviewable. Local evidence publication does not claim a Gateway
artifact receipt or review/integration authority.

## Changes and distinguishing tests

Five task paths changed from checkpoint18:

- `tests/gateway/request_context_reattach.test.js`: registry test registration
  now follows all imports and initialization. Four headless registry guards
  retain socket-observed actual server identities and assert kernel absence
  BEFORE fixture teardown, including the existing non-exec Node PATH shim.
- `gateway/src/adapters/request_launch_cleanup.js`: private clients use the
  exact private socket. Startup binds its actual `#{pid}` to frozen Linux
  PID/start/PGID/SID identity, rechecking the socket PID. Close signals only
  that verified actual server, waits for ENOENT plus ESRCH and wrapper exit,
  then removes the directory. Startup/close ambiguity keeps the socket and
  private `server-identity.json`; cleanup failure is explicit. Pane refusal
  still attempts wholly-owned server closure in `finally`, per root's USER
  decision, while identity ambiguity grants no closure. Descendant traversal
  unions children across every TID with parent/child identity checks. The
  adapter's own cleanup catch also preserves authorization denial and records
  cleanup failure privately.
- `gateway/src/tools/tool_helpers.js`: cleanup failure no longer replaces
  the public `REQUEST_CONTEXT_DENIED` envelope; private denial observer still
  runs, and local cleanup audit uses allowlisted metadata.
- `gateway/src/services/agent_service.js`: one rejection continuation audits
  `agent.delegate.late_cleanup` for late settlement refusal AND post-timeout
  adapter rejection, without double-counting or business publication.
- `gateway/README.md`: explicitly states unsupported unobserved reparented
  non-tmux descendants, numeric-PID/pidfd race limits, and stale `running`
  row after a kill whose authority lapsed.

New named behavioral cases: `delegate refusal closes verified wholly-owned
server`; `delegate refusal retains ambiguous identity and socket`; `revoked
spawn cleanup failure preserves denial observer and private cleanup audit`;
`adapter post-await denial survives its own cleanup refusal`; `thread-owned
descendant is reaped before closing the retained provider pane`; and
`delegate late cleanup failure audit observes post-timeout adapter rejection`.
The late-result settlement-refusal audit case already passed before source
edits and is guard coverage. Thread RED observes a live non-main TID, an empty
main-task children file and the actual child under the worker TID; GREEN proves
that child absent before provider/fixture teardown.

All new split-window fixtures use the observed immutable pane ID. The first
invalid run is preserved and excluded as fixture error. Final guards also
assert the actual emitted two-pane count BEFORE cleanup. That strengthening
is guard coverage, not an invented additional RED. Private-server assertions
run before teardown. Fixture teardown only signals an exact retained identity;
it retains ambiguous/live socket directories rather than silently deleting
one. The host runner subreaps a failed non-exec wrapper's fixture server;
fixture intervention is never production containment or cleanup evidence.

## Exact completed results

Every run uses DEFAULT Node process isolation and `--test-concurrency=1`.
Every result has zero cancelled/skipped/todo. Counts overlap; do not sum them.

| Raw log stem (`/tmp/v6-a05-r3-*.txt`) | Pass | Fail | Exit | Attribution |
|---|---:|---:|---:|---|
| tdz-red | 0 | 1 | 1 | actual API TDZ |
| behavior-red | 4 | 10 | 1 | four real private-server absence REDs; six invalid pane-target fixtures |
| corrected-red | 1 | 5 | 1 | five distinguishing behavior REDs; one existing audit guard |
| initial-green | 13 | 1 | 1 | remaining observer reason expectation mismatch; corrected to existing `context.recovery_denied` |
| adapter-denial-red | 0 | 1 | 1 | own adapter catch replaced authorization denial |
| focused-final | 40 | 0 | 0 | initial combined GREEN |
| service-final | 8 | 0 | 0 | sandbox emitted only file-level results; NOT credited as 144 assertions |
| service-host-final | **144** | **0** | **0** | required service assertions, host default isolation |
| focused-sealed | 40 | 0 | 0 | stronger fixture identities and both late server-absence guards |
| mutation-witness-final | **40** | **0** | **0** | final complete focused evidence with emitted two-pane witnesses |

Archives use the same stems under `plan/PROJECT_V6/reviews/`, ending `.txt.gz`.
They omit JSON diagnostics and redact checkout/private fixture paths and long
process/time tokens. Manifest binds raw-local, compressed and uncompressed
SHA-256 values plus exact source/test/evidence Git blob hashes. The sandbox's
8 file-level results do not establish whether all 144 assertions executed;
only the completed host run is credited. No no-isolation comparison was run;
the trial2 historical comparison remains scoped to its own exact bytes.

Exact final focused command:

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --test-concurrency=1 --test-name-pattern='registry launch reaps|settles only|post-await denial must leave|creation observ|malformed creation|delegate refusal|revoked spawn cleanup failure|thread-owned descendant|delegate late cleanup failure audit|adapter post-await denial survives' tests/gateway/request_context_reattach.test.js tests/gateway/request_launch_observation.test.js
```

Exact host service command:

```bash
node --test --test-concurrency=1 tests/gateway/tool_agent.test.js tests/gateway/tool_agent_model.test.js tests/gateway/agent_errors.test.js tests/gateway/request_context.test.js tests/gateway/request_context_boundary.test.js tests/gateway/request_context_execution_binding.test.js tests/gateway/tool_catalog.test.js tests/gateway/tool_projection_contract.test.js
```

RED selectors on `request_context_reattach.test.js` only: tdz-red selects
`claude-code registry launch reaps its observed child when durable publication
fails`; behavior-red selects `registry launch reaps|delegate refusal|revoked
spawn cleanup failure|thread-owned descendant|delegate late cleanup failure
audit`; corrected-red omits `registry launch reaps` from that selector;
adapter-denial-red selects `adapter post-await denial survives`. All use the
same pinned PATH and DEFAULT isolation/concurrency=1. Initial-green uses the
behavior-red selector. Full commands retain log redirection to the corresponding
raw-local filename. Syntax checks for all three changed production modules
and the runtime test pass; `git diff --check` exits 0.

## Process attribution and pending acceptance

Read ONLY exact historical PIDs 757237, 757723, 758093, 758738 on the host.
Each `/proc` read returned ENOENT. Their expired identities, executable and
origin cannot be attributed after absence. No signals were sent; no global
scan or guessed cleanup occurred. Root retains any further attribution and
scoped cleanup approval. Newly tested actual private servers are absent before
fixture teardown in all four headless registry guards and both late-audit
paths; ambiguous-server refusal deliberately retains reachable audit evidence
until the separately owned exact-identity fixture cleanup.

Supporting unobserved reparented non-tmux descendants remains out of scope.
Numeric-PID observation-to-signal races, initial identity reuse, tmux ID reuse
across server lifetimes, kernel/native preemption, stale running rows and
application-only budgets remain explicit limits. The pane cleanup deadline
is five seconds; startup/provider work and the separate private-server exit
wait are outside it. No pidfd or general provider-tree containment guarantee.

**PENDING ROOT:** CI inventory refresh, full solo host gate and skip budget,
serial A04 shared-source/contract reconciliation, Gateway artifact publication,
review trail commits and integration. DO NOT run the full gate while Gateway
sessions are active. **PENDING OPERATOR:** real Codex restart/reattach/ask/view
acceptance. **PENDING INDEPENDENT REVIEWER:** trial3 verdict. No coder verdict,
complete-sheet status, integration, promotion or release is claimed.

Immutable candidate binding: `v6-a05-trial3-manifest.json` includes this request
and excludes itself to avoid circular hashing. Root should recompute that
manifest and all bound bytes before assigning independent review.

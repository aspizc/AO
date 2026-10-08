# A/0/05 — checkpoint 18: unreviewed owned-launch continuation handoff

2026-10-08. **Partial A/0/05 candidate, unreviewed and uncommitted.**
This is an exact continuation handoff, not an independent verdict, full-sheet
completion, integration, promotion or release. Root owns formal trial2 review,
the full solo host gate/skip budget and serial A04 shared-file reconciliation.
The operator owns live Codex restart/reattach/ask/view acceptance.

## Candidate binding and preserved work

HEAD `2ed684f82174c57cc43298bb90a296ce810996b0`, branch
`feat/V6-A-0-05-local-recovery`.
Trace `tr-v6-a05-cp11-resume-0be117f4-aad5-4c2b-aa65-6d7e5817d7d0`;
task `ts-e4cd104e-171b-4c9b-a0bc-05ed9e718df9`.
Verified coder banner: GPT-6.1-Sol medium, Codex v0.160.1. No model switch or
quota notice observed. Checkpoints12–17 are immutable. Checkpoint15 explicitly
voids checkpoint14's premature combined GREEN claim; it must not enter an
acceptance chain as 3/0. Its eventual actual totals are 2/1, exit1, following
separately approved exact-identity fixture server termination.

[Final manifest](v6-a05-checkpoint18-manifest.json) binds **60 dirty files**
and **18 new sanitized archives**, with compressed/uncompressed and raw-local
SHA-256 values. Manifest SHA-256:
`1c1eb9311cd7ad1e44834ed356cdabddb96c00183a5c3fb46327a79970fe5d52`.
This handoff and the manifest are excluded from that manifest to avoid circular
hashes. No source/test bytes changed after binding. JSON diagnostics, private
fixture/checkout paths and long process/start tokens are removed from archives.

Checkpoint13 preservation was verified: **42/42 other bound files** and
**8/8 prior archives** matched; checkpoint12 SHA-256 remains
`73f6b89eeacde894e3070247580070e57f5bb76e4769ce9c6a9ed42c26cd1899`.
Exactly four checkpoint13-bound files changed in this continuation:

- `gateway/src/services/agent_service.js`
- `gateway/src/adapters/request_launch_cleanup.js`
- `gateway/src/tools/index.js`
- `tests/gateway/request_context_reattach.test.js`

The prior fixed creation-receipt changes in `tmux_client.js` are preserved.
No policy edit, subagent, self-review, commit, push, production Gateway restart,
real-provider call, global scan or name-only cleanup. Source patches and
short focused host approvals were separate. Gateway artifact publication from
checkpoint13 returned `REQUEST_CONTEXT_DENIED`; this handoff remains local
for root-owned evidence publication rather than claiming an artifact receipt.

## Implemented and tested corrections

1. **Late-result settlement.** The delegate service marks a failed request as
   abandoned and retains a continuation on the original adapter promise.
   A later private owned result is settled without business publication.
   Cleanup errors are audited at `agent.delegate.late_cleanup`. Timeout is
   not treated as proof that provider work stopped. Receipt settlement shares
   one promise so concurrent service/observer cleanup cannot run twice.
2. **Positive identity absence.** A null Linux process reader now requires
   exact-proc ENOENT and exact-PID zero-signal ESRCH before counting as gone.
   Retained start/PGID/SID must match a live identity; unreadable or changed
   identity refuses signalling. A changed start token ends the old identity
   without granting authority over the replacement.
3. **All windows of the retained session.** `list-panes -s -t <immutable-id>`
   observes the exact session's complete pane set. An unobserved extra pane
   in either the same or another window refuses cleanup before session kill.
4. **Other executable providers.** Existing private cleanup wraps claude-code,
   antigravity, pi and opencode in the production registry, alongside Codex.
   Registry-only gemini-cli is unchanged. Ordinary/unbound and dry-run calls
   retain their bypass. Provider CLI argv and public result projections are
   unchanged; only A05 scoped detached creation consumes the fixed receipt.
5. **One cleanup budget.** All retained-pane probes/traversal/signals/polling
   share one fixed five-second monotonic deadline. Each query is capped at
   min(one second, remaining budget). Exhaustion reports cleanup failure and
   introduces no new target authority. Delegate server exit wait separately
   retains its existing one-second bound.

## Exact RED/GREEN and final verification

All listed completed TAP runs have zero cancelled/skipped/todo. Counts overlap.

| Evidence | Passed | Failed | Exit | Meaning |
|---|---:|---:|---:|---|
| cp12 final | 20 | 1 | 1 | historical valid late-delegate RED |
| cp14 late GREEN | 1 | 0 | 0 | initial late-result correction |
| cp14 cleanup RED | 0 | 2 | 1 | extra-window and post-signal unreadability behavioral failures |
| cp14 combined, corrected attribution | 2 | 1 | 1 | second-settlement hook failed; original 3/0 claim void |
| cp15 settlement attempt | 1 | 2 | 1 | late case passes; guards missed preconditions, not product RED |
| cp15 guard attribution | 2 | 0 | 0 | guards reached their intended witnesses |
| cp16 providers RED | 0 | 4 | 1 | actual registry provider children survived failed durable publication |
| cp16 providers GREEN | 4 | 0 | 0 | wrapped registry reaps retained children before error |
| cp16 providers all | 8 | 0 | 0 | production-registry spawn and headless delegate guards |
| cp16 detached attempts | 0 | 1 each | 1 | ready marker absent before behavior witness; fixture/timing failures |
| cp16 detached diagnostic run | 1 | 0 | 0 | live setsid ancestry observed, parent and leaf reaped before teardown |
| cp17 first bound attempt | 0 | 1 | 1 | deterministic target collision; invalid timing fixture |
| cp17 valid bound RED | 0 | 1 | 1 | observed cleanup 8399.142863 ms exceeded shared budget |
| cp17 bound GREEN | 1 | 0 | 0 | observed cleanup 5005.640686 ms meets 5500 ms tolerance |
| cp18 focused final | **33** | **0** | **0** | all current owned-launch guards including budget |
| cp18 service final | **144** | **0** | **0** | existing service/context/catalog regressions |

Final logs: `v6-a05-cp18-focused-final.txt.gz` and
`v6-a05-cp18-service-final.txt.gz`. Exact commands:

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none --test-name-pattern='registry launch reaps|settles only|post-await denial must leave|creation observ|malformed creation' tests/gateway/request_context_reattach.test.js tests/gateway/request_launch_observation.test.js
node --test --experimental-test-isolation=none tests/gateway/tool_agent.test.js tests/gateway/tool_agent_model.test.js tests/gateway/agent_errors.test.js tests/gateway/request_context.test.js tests/gateway/request_context_boundary.test.js tests/gateway/request_context_execution_binding.test.js tests/gateway/tool_catalog.test.js tests/gateway/tool_projection_contract.test.js
```

Syntax checks for touched source/test files and `git diff --check`: exit0.
All providers in host tests are disposable executables on private foreground
tmux fixtures; synthetic results are not live provider or restart acceptance.
The exact-provider registry guards force a launch-ready witness before the
publication failure. The resistant case reports failure while retaining the
live resistant child, rather than crediting teardown as successful cleanup.

## Exact remaining authority and verification limits

The non-tmux setsid guard proves only descendants whose parent still exists
and whose ancestry can be observed from a retained launch identity. Ordinary
headless adapters block in `spawnSync`: a child can fork, setsid and reparent
before the provider returns, leaving no prior cleanup receipt or observable
ancestry. The private tmux server does not contain that non-tmux child.
Supporting it requires an assessed launch-owned supervisor/subreaper or kernel
containment receipt. Neither a name, returned PID, guessed process group nor
global scan supplies that authority. That point is deliberately unsupported;
no general orphan-safety or full provider-tree containment claim is made.

Numeric-PID observation-to-signal races, server-lifetime ID reuse and initial
PID reuse before the first kernel read are not pidfd guarantees. Cleanup
refusal may preserve live owned resources. Private-server startup/provider
work are outside the retained-pane cleanup timer. Kernel/native preemption is
not proved by application timeouts. The earlier transient guard precondition
failures remain recorded; readiness now has a bounded two-second fixture wait.
Late cleanup error audit code exists but has no dedicated real failing-cleanup
audit-observation test in this continuation. Independent review must assess
these limits rather than treating focused GREEN as full containment acceptance.

The trial1 full host gate remains historical **failed** evidence. No replacement
full gate, broad containment probe, skip-budget seal, live Codex restart,
independent trial2 review, evidence commit or integration has been performed.
Root should verify this manifest, assign the independent reviewer under a fresh
trace/session, assess the explicit unsupported boundary and run the required
solo gates/acceptance against the selected exact candidate. No coder verdict
or complete A/0/05 status is issued.

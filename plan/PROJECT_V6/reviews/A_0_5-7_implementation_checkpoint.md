# A/0/05 — Checkpoint 7: owned cleanup and durable publication

2026-10-08. **Partial, unreviewed candidate.** Immutable coder checkpoint;
not a verdict or a complete sheet submission. Work stops within the bounded
continuation budget. No subagent or reviewer was invoked.

## Entry and scope

HEAD: `c23c15367a75307677fce83ffde6e693e72aaf4b`.
Branch: `feat/V6-A-0-05-local-recovery`.
Worktree: `/home/carase/git/personal/AO/workspace/clones/wt-v6-a05-build`.

Read AGENTS, resolved orchestration profile, plan README, Stage A README,
A/0/05, plan-trial-2 OK, checkpoint 6, original human decision,
trial-2 bounded checkpoint and human escalation memo, and root briefs.
The current operator instruction authorizes adapter-owned cleanup tied to
verified observed process identity and supersedes the earlier stop for that
mechanism. It does not authorize policy changes or independent self-review.

Checkpoint-6 manifest SHA-256 matches its recorded value
`2ef489b8af2248862a3c21a54fb618b1ce336bb70e91b8f0c88bda762088bf20`:
27/35 files and 8/8 evidence archives match; the eight subsequent file changes
were preserved. Against the later trial-2 manifest, 43/45 files and 30/30
archives match. Its two changed paths on entry were agent_service.js and
tools/index.js, containing preliminary cleanup wiring. The preliminary
request_launch_cleanup.js was read before editing. Entry hashes are retained
in the new manifest; no existing change was reverted.

Only these four entry paths changed in this continuation:

- `gateway/src/adapters/request_launch_cleanup.js`
- `gateway/src/services/agent_service.js`
- `gateway/src/tools/tool_helpers.js`
- `tests/gateway/request_context_reattach.test.js`

No A04 adapter/prompt path, policy, shared CI inventory, status/index,
CHANGELOG, or prior review evidence was edited. No commit, push, tag,
production Gateway, live provider, global process kill or process sweep.

## Correction and meaningful TDD

The supplied real-child RED log has 0 passed / 2 failed: spawn and delegate
post-await denial left their observed children alive. Tests now exercise the
preliminary wrapper around the actual Codex adapter, using disposable provider
executables. Delegate observations follow its private foreground tmux server.
Both observed children are gone after denial, before fixture teardown.

Additional distinguishing tests exposed two failures (2 passed / 2 failed):
spawn retained its live child after a forced durable metadata failure, and a
valid recovered spawn was denied by the preliminary post-business-write
revalidation while its new session was still missing from durable lineage.
The other two cases in that early run were overlapping headless-success guards;
the redundant delegate record-failure case was subsequently removed.

The service now transfers the private WeakMap cleanup receipt to its frozen
result instead of discarding it before durable publication. The protected
wrapper settles acceptance after synchronous result recording; recording or
handler errors settle rejection. No new public cleanup handle or authority is
introduced. Delegate cleanup remains before business persistence. The helper
retains immutable tmux IDs and observed Linux process identities; no SQLite
lock spans provider work.

The final six cleanup tests verify denied spawn/delegate reaping, spawn
metadata-failure reaping, supervised success retaining a durably tracked child,
headless success reaping its tmux descendant, and name reuse. The last guard
renames the original session and creates a different child under the old name;
cleanup removes the retained original and leaves the replacement alive.
It passed existing identity predicates and is guard coverage, not new RED.

## Verification and exact limits

All completed runs have zero cancelled/skipped/todo tests. Node v22.22.1;
host cleanup fixtures observed pinned tmux `3.6a-agents.1`.

| Safe archive suffix | Result | Meaning |
|---|---|---|
| orphan-red | 0 passed / 2 failed | Operator-supplied behavioral RED, preserved |
| sandbox-attempt | 0 passed / 2 failed | tmux startup refused by sandbox; environment failure, not product RED |
| initial-host-green | 2 passed / 0 failed | Original orphan assertions pass with preliminary wrapper |
| publication-red | 2 passed / 2 failed | New durable-publication and accepted-spawn defects |
| publication-green1 | 6 passed / 0 failed | Correction, before removing redundant guard and adding name reuse |
| direct-focused | 125 passed / 0 failed | Runtime/repository/lifecycle/serialization focused suites |
| final-cleanup | 6 passed / 0 failed | Final nonredundant cleanup cases including name reuse |
| service-regression | 144 passed / 0 failed | Agent service/context/catalog/projection regressions |

The direct-focused command was:

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none tests/gateway/request_context_reattach.test.js tests/gateway/request_context_reattach_repository.test.js tests/gateway/lifecycle_rebaseline_core_repository.test.js tests/gateway/lifecycle_rebaseline_core_service.test.js tests/gateway/tool_error_serialization.test.js
```

Final-cleanup used the same Node flags and PATH with
`--test-name-pattern='settles only|post-await denial must leave'` on
`tests/gateway/request_context_reattach.test.js`. Service-regression used direct
Node with the same isolation flag on tool_agent, tool_agent_model,
agent_errors, request_context, request_context_boundary,
request_context_execution_binding, tool_catalog and tool_projection_contract.
These are overlapping counts, not a summed unique acceptance total.

The direct-focused run confirms the already-existing completion/kill versus
recovery tests on independent SQLite handles in terminal-first, claim-first,
and lock-held orderings, including restored stale metadata. It also confirms
outer commit/rollback tests and post-await owner, original/current expiry and
revocation checks. They were already implemented after checkpoint 6; this
continuation did not rebuild them or relabel them as new RED.

Root's bootstrap/observation suite was reported 9/9 by the operator, not rerun
here. The broader containment command was declined before execution because
other Gateway sessions were live and the probe printed process command lines.
That is an operator timing/scope decision, **not a test failure**. Its output
file does not exist. No CI containment/gate outcome is claimed. Root owns that
gate after live sessions close, full CI and live Codex acceptance.

After the final cleanup run only diagnostic output was narrowed to an
allowlist; no assertion or production behavior changed. Syntax and diff checks
are recorded below. Safe evidence archives omit returned diagnostics entirely
and contain no process command lines. Four preliminary duplicate archives
created before log sanitization encountered TAP escaping are preserved but
excluded from the canonical evidence chain; all four also contain no process
command lines.

## Exact binding and remaining work

[Manifest](v6-a05-cleanup-checkpoint-7-manifest.json) binds 47 files by SHA-256
and Git blob SHA-1, all entry hashes, and eight safe archives by compressed and
uncompressed SHA-256. Original raw log hashes bind the sanitization provenance.
Manifest SHA-256:
`27c27422fbf4a94ea3f1e26f7a12d30d55da1095e2195634d716f2f8246a44e4`.
Archives use `v6-a05-cleanup-resume-safe-<suffix>.txt.gz`.

**Do not treat these passing tests as complete cleanup coverage.** Before
issuing a complete trial-2 handoff, distinguish and resolve:

1. Adapter failure after creating a child but before returning a result: the
   supervised wrapper currently obtains its receipt from the returned target.
   Failure before that point has no retained supervised observation here.
2. Delegate service timeout versus delayed wrapper settlement. The existing
   outer timeout can finish before the wrapper returns a receipt; late-result
   cleanup has not been proved. No generic late kill grant is authorized.
3. Delegate descendants outside its private tmux server, including detached
   non-tmux children. Private tmux isolation proves only the tested tmux
   descendant case, not general provider process-tree containment.
4. Cleanup ambiguity, identity replacement, signal-resistant children,
   multi-pane targets, and end-to-end bounds. The preliminary helper has
   per-command/poll bounds; this checkpoint does not prove one overall bound
   or positive process absence under unreadable proc observations.
5. Other executable providers are not wrapped. The production wiring currently
   applies only to Codex. Do not claim cross-provider orphan safety.

The existing real-kill test still documents a dead target with a stale running
business row after authority denial; fresh recovery skips it and hydrates no
session. No server-owned reconciliation was added under lapsed authority.
Preserve this explicit consistency limit for independent review.

Independent review, broader containment, full gate, real Codex
restart/reattach/ask/view, serial A04 reconciliation, integration and release
remain pending. No implementation-complete or reviewed status is claimed.

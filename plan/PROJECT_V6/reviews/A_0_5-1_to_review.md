# A_0_5 — Implementation trial 1: explicit local recovery candidate

Date: 2026-10-08. **Uncommitted candidate submitted for independent review.**
This is a coder handoff, not a verdict, integration or release claim. The
operator's live acceptance and full host gate remain required and unrun.
No policy changes, subagents, self-review, commits or production restart.

Base: `b06f1f6b4b0c21799f2ba07631137b055c2a3364`.
Branch: `feat/V6-A-0-05-local-recovery`.
Operator configuration: `gpt-6.1-sol`, medium, priority, as selected by
`workspace/root-a05-medium.md`; the default max profile was not substituted.
The actual harness model/tier is not independently observable through a
repository test; this records the requested configuration, not fabricated
provider telemetry. No new Gateway session or review trace was created here.
Root owns attaching this request to its accessible Gateway evidence chain.

Contract: [reviewed sheet](../A/0/05.md), [plan trial 2 OK](A_0_5-plan-2_reviewed_OK.md),
[checkpoint 5](A_0_5-5_implementation_checkpoint.md), [checkpoint 6](A_0_5-6_implementation_checkpoint.md).
Before any edit, 35/35 checkpoint-6 file hashes and 8/8 evidence archive hashes
matched. All prior checkpoint/evidence files remain intact.

## Exact candidate binding

[Manifest](v6-a05-medium-handoff-manifest.json) SHA-256:
`3fce967e122acb849893745d839f60bd9f4828dc237dc4660830193057af9813`.
It binds every preserved candidate file, the operator brief, checkpoint 6,
its manifest, the actual diagnostic script, and 12 new immutable archives
by SHA-256/Git blob SHA-1. Logs also carry uncompressed hashes, exact runner
commands, exit results and emitted totals. Earlier manifests recursively bind
the historical TDD evidence. No tree object or candidate commit is claimed.
This handoff and its manifest exclude themselves to avoid circular hashing.

Only seven checkpoint-6 files changed: lifecycle repository, request context,
agent service, recovery service, agent tool bindings, runtime recovery tests,
and production observation tests. Root-owned CI/CHANGELOG/status/index and
parallel A04/V7 changes were not imported or edited.

## Failure attribution and completed continuation

The newer root host result is retained as
[v6-a05-root-transition-host-failed.txt.gz](v6-a05-root-transition-host-failed.txt.gz):
8 passed, 1 failed, exit 1, zero skips. The failure was the immediate absence
assertion after killing the final isolated tmux session, not a missing tool.
The host diagnostic using system tmux 3.6 records `server exited unexpectedly`
(status 1) immediately after successful kill, then `no server running` after
100 ms. See [measured output](v6-a05-medium-tmux-attribution.txt.gz) and
[exact script](v6-a05-medium-tmux-attribution.mjs). No pinned-path override.

That intermediate result is ambiguous, so production still returns null.
The fixture now asserts successful creation of an owned sentinel, successful
exact target kill, and surviving sentinel before asserting exact absence.
A separate executable fixture explicitly asserts shutdown ambiguity stays
null. No blind retry or weakened absence predicate. The corrected focused
host command passes 9/9 with no skips.

Async service checks now revalidate the server-owned binding after awaited
spawn/delegate adapter results, before business persistence; after ask/view
adapter results, before output/intervention handling; and after kill, before
closing its row. Ask retains its pre-send recheck. Expiry uses monotonic elapsed
time from the private initial binding. Bounded synchronous recovery probes
also refuse if original or current expiry elapses before owner publication.
No SQLite lock spans async adapter/provider work.

Canonical terminal notifications no longer publish at nested savepoint return.
Pending notifications are private per database; before the next protected call,
committed authoritative rows determine which notifications may be delivered.
Rolled-back terminal rows produce no notification and preserve hydrated memory.
A committed terminal defeats memory before the call's action binding. This is
lazy invalidation at the next protected call, not an immediate outer-commit
callback. Discovery/reattach/result publication through a recovery-enabled
context refuses while an outer transaction is open; no savepoint claim becomes
memory authority. Existing canonical cancellation semantics are unchanged.
Independent-handle callers do not share subscribers, and instead deny from the
fresh durable terminal/owner check. Review this distinction explicitly.

## TDD and exact verification

All runner totals below have zero skipped/cancelled/todo tests. Commands and
redirection paths are recorded individually in the manifest. Totals overlap
and must not be added into a unique test count.

| Archive suffix (`v6-a05-medium-*.txt.gz`) | Result | Meaning |
|---|---|---|
| boundary-red | exit 1; 47 pass, 13 fail | Actual behavioral RED: nine ask/view/kill post-await races, elapsed original expiry, two premature outer notifications, one savepoint claim publication. |
| boundary-green | exit 0; 60 pass | Those fixes pass. |
| additions-attempt1 | exit 0; 21 pass | New guard tests for actual dry-run spawn/delegate, runtime conjunctions, independent-handle lifecycle ordering. Not new implementation RED. |
| probe-expiry-red | exit 1; 0 pass, 1 fail | Original expiry crossed during a bounded synchronous probe still published claim before the fix. |
| runtime-green | exit 1; 81 pass, 2 fail | Attributed fixture errors: residue reset owner to original after a successful claim; second-repo fixture reused the first root and was refused at context construction. Corrected fixtures preserve the current owner and use a distinct changed root. Not product RED. |
| spawn-mutation-red | exit 1; 0 pass, 8 fail | Removing only the two post-await spawn/delegate checks defeats all eight tests. Source restored in `finally`; mutation evidence, not a pre-implementation baseline. |
| runtime-green-2 | exit 0; 83 pass | Corrected fixtures and probe expiry fix. |
| host-green | exit 0; 9 pass | Actual disposable bootstrap, observations and existing MCP bootstrap on host. |
| focused-green | exit 0; 310 pass | Impacted request-context, identity/repository, lifecycle, migrations, catalog/projection/error, task and agent suites. |
| runtime-final-green | exit 0; 86 pass | Added outer session commit/rollback and result-recording publication guard. |
| runtime-sealed-green | exit 0; 87 pass | Final runtime bytes, additionally covering elapsed current-context expiry with original still valid. |

Earlier checkpoints retain exact historical RED/GREEN results; environment
failures and cancelled runs remain classified there, never credited as passes.
Final `git diff --check`: exit 0. `git diff --name-only -- policies`: empty.
Full `bash scripts/ci.sh`: **not run**, no skip-budget verdict available.

## Acceptance matrix

Names below identify executed tests in `tests/gateway/`; runtime names refer
to `request_context_reattach.test.js` unless another file is specified.

| Contract conjunct | Named evidence and disposition |
|---|---|
| Same OS UID despite configured assertions | `actual stdio startup principal comes from OS credentials despite configured identity assertions` in bootstrap suite; real dry-run entry point, host 9/9. |
| Linux stdio/SQLite, private machine/state boundary | Identity suite: `local recovery principal uses equal numeric OS credentials and only a machine HMAC`; `machine ID format absence permissions ownership and symlinks refuse`; `state file and directory must retain current UID ownership and private write modes`; credential reread and descriptor tests. Helper and bootstrap scopes are distinct. |
| Changed UID/machine/state, unavailable or malformed identity | Runtime `different UID refuses`, `same UID different machine digest refuses`, `copied DB at different canonical state path refuses`, credential-change guard; seven stored-conjunction cases include malformed UID/digest/path/start token. Identity helper covers unavailable/unsafe/unequal OS credentials; actual unreadable host machine identity startup not simulated as live acceptance. |
| Unsupported backend/platform preserves ordinary calls | `Darwin recovery fails closed while ordinary creation remains available`, PostgreSQL equivalent; helper unsupported-backend tests. No Darwin host or PostgreSQL recovery support claimed. |
| Explicit reattach only, same stored session/target | `same OS principal machine state and every repo reattach after restart without implicit ownership` proves denied view/discovery grants none and protected fixture ask/view reach `child-one`. Not live provider input. |
| Every repo and canonical root | Wrong registry ID, same-ID changed-root guards, second missing repo and `second repository changed root refuses the entire trace with first repository matching`. No target probes or partial hydration. |
| Complete authoritative task/session conjunctions | Taskless, incomplete, legacy/tampered action, task agent/role, session target; added session task/agent/role mismatches. Repository suite additionally binds session agent/role to its task. |
| Original expiry never renews; current context still bounded | Renewed-context test now expires on October 9 while original expires October 8; exact original boundary denies. Post-await original/current elapsed expiry tests; `expiry elapsing during bounded synchronous target probe refuses before claim publication`. |
| Completion/cancellation/kill beats residual metadata and memory | Canonical cancellation/refused cancel, session closure, cleanup rollback, terminal residue guards; six `complete/kill versus recovery on independent SQLite handles` cases cover terminal-first, claim-first and lock-held, then deliberately restore stale metadata. |
| Outermost publication/rollback | Two outer trace and two outer session cases assert zero notifications inside transaction, correct subsequent commit/rollback behavior. Nested reattach and result-recording publication refuse. |
| Live/ambiguous owners; reused PID/boot | Runtime live/ambiguous refusal; actual process probe test observes live identity, changed start token, changed verified boot and confirmed exit. Proc errors do not prove absence. |
| One claim winner, no loser lineage; idempotent retries | Actual two-process race with readiness barrier and separate handles; loser trace/session/task denied; failed claim trigger and retry revision checks. Seed identity/target inputs are synthetic. |
| Exact target existence and bounded probes | Host exact-prefix/target-removal test with sentinel; ambiguous command/one-second timeout; five-second total budget and atomic refusal test. |
| Async authority checks | Five preserved ask pre-send cases; nine post-await ask/view/kill cases; eight real dry-run spawn/delegate cases plus distinguishing mutation; elapsed expiry tests. |
| Durable write errors fail closed | Actual protected trace/task/spawn result-recording error paths; no success/memory publication, unchanged prior durable payload. Nested result recording guard. |
| Discovery privacy/cap, explicit beyond cap | `discovery cap counts eligible traces only and explicit trace beyond cap remains usable`, over 103 persisted records, no ownership changes, foreign/expired filtering. |
| Denials/private hint | Actual protected denial observer, observer failure generic envelope, private metadata allowlist and `ordinary session denial logs trace_reattachable through wrapper without caller trace or ownership`. |
| Append-only migration profiles | Three `legacy generic/WIRING-A/WIRING-B ... upgrades and reopens` cases in coordination migration suite; real emitted ledger rowids/timestamps, null legacy task action, preserved epoch data and no legacy authority. Existing digest/schema/prefix/cross-profile refusals green in focused 310. |
| Additive tool/catalog/docs | Tool 34 strict reattach/optional view; preserved ordering; generated contract/docs projection tests green; host MCP ordered list green. Root retains serial A04 reconciliation. |
| Operator decision: no extra approval | Retained human decision and reviewed contract; no new approval flow or authority inferred from messages/artifacts. |
| Live Codex host restart/reattach/ask/view | **PENDING ROOT/OPERATOR**, not run. No provider/version transcript fabricated. Physical reboot survival not claimed. |
| Full host gate and skip budget | **PENDING ROOT**, `bash scripts/ci.sh` solo on host. |

## Independent review and root-owned completion

Ready for root to assign a fresh independent reviewer; no coder-owned verdict
exists. Reviewer must verify this manifest against the dirty candidate and
reproduce relevant checks, especially delayed outer-transaction invalidation
and dry-run adapter boundaries. Spawn/delegate rechecks prevent stale row or
memory publication; they cannot undo provider work already performed before
an await returns. No real provider was started in these tests.

Root retains Gateway artifact/trace attachment, immutable index/status updates,
write-scope/CI/CHANGELOG reconciliation, independent review, full host gate,
operator live acceptance and serial integration. This request does not promote
sheet status or claim all acceptance criteria complete. Preserve the candidate
and all immutable evidence; any correction belongs in trial 2.

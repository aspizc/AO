# A_0_5 — Local restart recovery plan review, trial 1

Date: 2026-10-07. Status: **plan review requested**.
Base: `327043a50316f3918b06fe30e019ecdc5799b4d3`.
Author lane: `workspace/clones/wt-v6-a05`, branch `feat/V6-A-0-05-reattach`.
Discovery trace: `tr-v6-a05-dc1ac6b8-c492-4d91-8702-ad4f2010dcdd`.
Root assigns a fresh independent plan-review trace/session; none is claimed
by this author. The operator-authorized built-in Codex fallback remains in
force; no provider, Claude, or reviewer was invoked by the author.

## Exact review scope

| File | Candidate Git blob / disposition |
|---|---|
| `plan/PROJECT_V6/A/0/05.md` | `8e2aeb19179d3f8c968be966dd14a0b79dda46b0` |
| `plan/PROJECT_V6/reviews/A_0_5-plan-1_to_review.md` | This immutable request |

Read-only context:

- [Discovery checkpoint](A_0_5-1_implementation_checkpoint.md), blob
  `3efb47ce318bbc2a138b47d5e094f1547a313cdb`; unchanged from discovery.
- [Operator decision](A_0_5_human_decision.md).
- [Stage README](../A/README.md), [project README](../README.md),
  [sheet registry](../SHEETS.md), and repository AGENTS/profile.

Only the sheet and this new request are written in this plan-author task.
The untracked checkpoint belongs to the completed prior discovery task.
There are no production, tests, policy, shared index, CHANGELOG or other
worktree changes, commits, implementation verdicts or release claims.

## Contract to review

The root selected the smallest concrete implementation of the existing
operator decision: Linux local stdio OS UID, OS machine identity, canonical
SQLite state path, and every persisted registry-ID/canonical-root binding.
Taskless traces refuse recovery; no additional approval is requested.

The refined sheet specifies:

- Actual bootstrap principal provenance, same real/effective UID, no caller,
  provider, configured-principal or username authority fallback.
- A root-owned machine-ID read with descriptor binding, an application-keyed
  digest, canonical private state binding, and explicit trust/clone limits.
- Linux/SQLite recovery support only. Darwin, other identity backends,
  PostgreSQL and unavailable identity refuse recovery while existing
  non-recovery calls keep working. No remote/cross-host authentication claim.
- DB-backed versioned lineage using the existing SQLite transaction/migration
  mechanism, with a minimal authoritative `tasks.target_action` column.
  Legacy/inconsistent records grant no recovery authority.
- Exact original expiry, all task repository conjuncts, canonical lifecycle
  checks and cleanup after successful kill/completion/confirmed cancellation.
  Existing refused-cancellation semantics remain intact.
- Explicit-only reattach, protection against a still-live prior owner,
  PID/start/boot identity, revision fencing, bounded target checks, and no
  partial memory authority if transaction/observation fails.
- Optional-trace-ID view discovery with matching owner/repo/expiry/lifecycle
  filters, no foreign counts/paths, and no side-effect ownership.
- A private protected-wrapper denial observer whose failures preserve generic
  public denial; ordinary calls can log `context.trace_reattachable` privately.
- An additive 34th tool preserving the original 33-entry order, exact tool
  DTOs, derived projections, named distinguishing RED tests and a separate
  operator-run live Codex restart check.

This is proposed plan content, not evidence of implementation or achieved
acceptance. It adds no leaf or functional dependency and keeps all wave order.

## Verified production anchors at the base

| Path and line | Existing boundary / reason for refinement |
|---|---|
| `gateway/src/core/request_context.js:146` | Empty lineage maps; only trace/task seed handling exists. |
| `gateway/src/core/request_context.js:311` | Live connection-mismatch denial must remain. |
| `gateway/src/core/request_context.js:405` | Unknown in-memory trace is denied. |
| `gateway/src/core/request_context.js:447` | Trace creation has no repository binding. |
| `gateway/src/core/request_context.js:458` | Task repositories are checked independently. |
| `gateway/src/core/request_context.js:804` | Result recording is currently memory-only. |
| `gateway/src/core/request_context.js:933` | Production default principal is a fixed string. |
| `gateway/src/config.js:203` | Only the host/provider agent is configured. |
| `gateway/src/mcp_server.js:223` | Actual bootstrap loads production configuration. |
| `gateway/src/mcp_server.js:244` | New connection UUID for each startup. |
| `gateway/src/tools/tool_helpers.js:158` | Protected wrapper performs context binding. |
| `gateway/src/tools/tool_helpers.js:195` | Normal context denials are caught before the server's exception observer. |
| `gateway/src/core/state.js:46` | Existing SQLite/PostgreSQL selection and state initialization. |
| `gateway/src/core/sqlite_migration_sets.js:26` | Migration inventory/digests are explicit and shared by existing profiles. |
| `gateway/src/core/repositories/lifecycle_repo.js:270` | Existing SQLite transaction pattern. |
| `gateway/src/core/postgres_db.js:6` | PostgreSQL scaffold has no transaction method. |
| `gateway/src/core/repositories/task_repo.js:22` | Existing task columns omit target action. |
| `gateway/src/core/repositories/session_repo.js:20` | Existing sessions persist task/trace/agent/role/target. |
| `gateway/src/core/lifecycle.js:58` | Canonical cancellation transition exists. |
| `gateway/src/services/orchestration_service.js:83` | Public cancel requires a server-owned outcome; no successful cancellation may be fabricated. |
| `gateway/src/adapters/process_supervisor.js:402` | Existing Linux process-identity reader; its null result is ambiguous. |
| `gateway/src/adapters/tmux_client.js:28` | Existing synchronous argv-based tmux helper. |
| `gateway/src/tools/catalog.js:235` | View currently requires a trace ID. |
| `gateway/src/tools/contract_projection.js:22` | Existing generated Markdown projection. |
| `tests/gateway/tool_catalog.test.js:69` | Existing exact 33-tool order and golden projection checks. |

The sheet also cites primary Node/systemd API specifications for OS identity
and machine-ID format/privacy; those are source references, not new runtime
verification. The discovery checkpoint records two concrete baseline probes
and the existing request-context suite result.

## Implementation scope reconciliation for root

The old registry row does not list all newly explicit prerequisites. Root must
reconcile its write-scope cell serially before issuing the revised build brief.
The bounded additional paths proposed by this sheet are:

- `gateway/src/core/request_recovery_identity.js` (new OS identity helper).
- `gateway/src/core/repositories/request_context_repo.js` (new SQLite lineage
  repository, not a new engine).
- `gateway/migrations/005_request_context_lineage.sql` (new recovery table and
  nullable authoritative task-action column).
- `gateway/src/core/sqlite_migration_sets.js` (verified new migration entry).
- `gateway/src/core/repositories/task_repo.js` and
  `gateway/src/services/task_service.js` (persist resolved task action).
- `gateway/src/core/repositories/orchestration_repo.js`,
  `gateway/src/core/repositories/session_repo.js`, and
  `gateway/src/core/repositories/lifecycle_repo.js` (only necessary terminal
  cleanup hooks; keep existing lifecycle command semantics).
- `gateway/src/services/orchestration_service.js` (bounded local recovery
  composition, existing process/target helpers).
- `gateway/src/core/policy_types.js`, `gateway/src/tools/tool_helpers.js`, and
  `gateway/src/tools/index.js` (canonical action/capability wiring and private
  observer/composition; no policy edits).
- `docs/mcp-tool-catalog.md` (existing derived catalog output).

Existing A/0/05 scope still covers request_context, mcp_server, orchestration
and catalog tools, the MCP JSON projection, Gateway README and Gateway tests.
No production path is written by this plan request. Root owns registry/review
index reconciliation and serial overlap review with A/0/02, A/0/04 and later
A/0/00–01; those are scheduling concerns, not extra functional dependencies.
Review the proposed scope for necessity before authorizing code.

## Checks and limits

- `git diff --check`: exit 0 after the sheet refinement.
- Local sheet links: 2/2 exist. Required sheet sections: 7/7 present.
- Registry inventory: 7 executable leaves; status remains `planned`.
- Historical checkpoint blob unchanged; production diff against base empty.
- Prior discovery baseline only: request-context suites **109 passed,
  0 failed, 0 cancelled, 0 skipped, 0 todo**. Not rerun as plan evidence.
- Implementation RED/GREEN, migration/backend tests, full CI and live Codex
  restart acceptance: **unrun**. Do not count synthetic fixtures as live proof.

The independent reviewer should assess authority provenance, the bounded
Linux/SQLite support claim, descriptor/path binding, all repository conjuncts,
recovery-vs-live-connection behavior, lifecycle races, private observability,
new DTO consistency and the executable RED/verification paths. Write one
immutable `A_0_5-plan-1_reviewed_OK.md` or `_reviewed_KO.md` in a fresh reviewer
session. Author-owned checking is not an independent verdict.

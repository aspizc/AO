# A_0_5 — Append-only recovery migrations, plan review trial 2

Date: 2026-10-07. Status: **plan review requested**.
Author base: `327043a50316f3918b06fe30e019ecdc5799b4d3`.
Author lane: `workspace/clones/wt-v6-a05`, branch `feat/V6-A-0-05-reattach`.
Root assigns a fresh independent review trace/session after freezing this
candidate; no reviewer authority, implementation or integration is claimed.

## Exact scope and correction contract

| File | Candidate Git blob / disposition |
|---|---|
| `plan/PROJECT_V6/A/0/05.md` | `45bf7f268527fdfdcae2a1f986473c244da1f1f7` |
| `plan/PROJECT_V6/reviews/A_0_5-plan-2_to_review.md` | This new immutable request |

This task fixes **only P1** in root's immutable
`plan/PROJECT_V6/reviews/A_0_5-plan-1_reviewed_KO.md`, blob
`8c0d6c32d95002eecfbbc2a5903c64a5e8a441ad`.
Its frozen predecessor sheet blob was
`8e2aeb19179d3f8c968be966dd14a0b79dda46b0`.
The verdict was read from the root checkout; root owns evidence copies,
indexing and its already reconciled registry/stage write-scope files.

Read-only context remains the [trial-1 request](A_0_5-plan-1_to_review.md),
[discovery checkpoint](A_0_5-1_implementation_checkpoint.md),
[operator decision](A_0_5_human_decision.md), and the root-bound frozen
trial-1 candidate. The original request and checkpoint are unchanged:
`87ed7f93abdc4cc824b3808d9dc1e828970e7633` and
`3efb47ce318bbc2a138b47d5e094f1547a313cdb`, respectively.

## P1 response

The sheet's persistence scope now fixes three explicit ordered sequences:

| Profile | Ordered migration sequence |
|---|---|
| `GENERIC_APPLICATION_SQLITE` | Historical `H`, then recovery `R` |
| `WIRING_A_SQLITE` | Historical `H`, then recovery `R` |
| `WIRING_B_EPOCH_SQLITE` | Historical `H`, historical epoch `E`, then recovery `R` |

`H` lists the five full historical root IDs in their current order.
`E` is `005_coordination_consumer_runtime_epoch`; `R` is
`005_request_context_lineage` at the already scoped recovery migration path.
It explicitly prohibits shared-root insertion before the historical epoch,
filename sorting, applied-row rewriting, and relaxation of the existing
prefix/schema/digest or cross-profile refusal checks. Historical SQL files,
digests and applied IDs/rowids/timestamps remain intact; no profile is added.

Named RED cases cover exact pre-A05 generic, WIRING-A and WIRING-B databases:
upgrade through the corresponding production profile, close and reopen,
query the emitted ordered `schema_migrations` rows, preserve nontrivial epoch
store/fence and receipt/ack epoch data, keep legacy task actions null, and
prove legacy traces gain no recovery authority. The acceptance criteria now
require those results. Fixture-only sequence assertions cannot satisfy them.
Focused verification includes
`tests/gateway/coordination_consumer_epoch_migrations.test.js` and retains
its existing refusal cases. All other identity, recovery, DTO, lifecycle,
concurrency and observability contracts are unchanged from trial 1.

## Anchors and plan-only checks

Verified against the author base and current root production files:

- `gateway/src/core/sqlite_migration_sets.js:26-70`: exact historical entries,
  full IDs/digests and the three exported profile compositions.
- `gateway/src/core/sqlite_migration_sets.js:154-174`: actual ledger rows are
  read in rowid order and must form the selected profile's exact prefix.
- `tests/gateway/coordination_consumer_epoch_migrations.test.js:345-420`:
  existing unknown/epoch-profile and WIRING-A refusal coverage.

A read-only Node prefix probe against the existing exported profile IDs
exited 0: all **3/3** specified append-only sequences preserve their old
ordered prefix; hypothetical shared-root insertion before `E` breaks the
WIRING-B prefix as prohibited. This probe creates no DB and is not RED/GREEN,
a migration execution, upgrade/reopen evidence or independent review.

`git diff --check` passed after the correction. Before handoff, check the
candidate blob, immutable prior-file blobs, local links and zero production
diff. This plan remains `planned`, with seven V6 leaves and unchanged wave
order. Root owns fresh freezing/review and all evidence commits/indexing.

Implementation RED/GREEN, the new DB upgrade/reopen cases, focused migration
suites, full gate and live Codex restart acceptance are **unrun**. No code,
policy, provider, self-review, shared-index edit or commit was performed.
The independently assigned reviewer should validate P1 against the prior KO
and write a new immutable `A_0_5-plan-2_reviewed_OK.md` or `_reviewed_KO.md`;
this author supplies no verdict.

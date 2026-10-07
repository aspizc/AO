# A_0_5 — Append-only recovery migrations plan review, trial 2

Date: 2026-10-07. Verdict: **OK — trial-1 P1 closed**.
This accepts the bounded plan correction. It does not accept implementation,
runtime behavior, integration, promotion or release. A/0/05 remains `planned`.

## Candidate and independent reviewer

- Root base: `b667728910fcf3d459ed4877e279bba6e663ee42`.
- Frozen candidate tree: `93c973f693461e6f091836b017bb4606384f2b9b`.
- Predecessor plan tree: `0efd2b65b970dff78b4fd659c980e8282b4627ee`.
- Fresh review trace: `tr-r2-a05-plan-4f6a2c47-a6eb-413a-80cc-9b6fa2b3b404`.
- Separately assigned reviewer: built-in Codex session
  `/root/review_v6_a05_plan_r2`, independent of the plan author and the
  trial-1 reviewer.
- Execution: the operator-authorized built-in Codex fallback recorded in
  `HUMAN_DECISIONS.md` and `reviews/README.md`, after the root-reported
  Gateway `task.assign` failure (`REQUEST_CONTEXT_DENIED`). This is not a
  Gateway-spawned or cross-vendor review. The fresh trace identifies this
  review round; it does not prove a successful Gateway task/session grant.
  No Claude or other provider was invoked.

Root assigned this independent review task; neither coordination content
nor an artifact supplies approval, integration or release authority. The
existing operator decision remains in `A_0_5_human_decision.md`: the same
user and canonical repository may explicitly reattach without extra approval.

All eight files matched both the candidate manifest and their frozen tree
entries immediately before this immutable verdict was created:

| File | Frozen Git blob |
|---|---|
| `plan/PROJECT_V6/A/0/05.md` | `45bf7f268527fdfdcae2a1f986473c244da1f1f7` |
| `plan/PROJECT_V6/reviews/A_0_5-plan-1_to_review.md` | `87ed7f93abdc4cc824b3808d9dc1e828970e7633` |
| `plan/PROJECT_V6/reviews/A_0_5-1_implementation_checkpoint.md` | `3efb47ce318bbc2a138b47d5e094f1547a313cdb` |
| `plan/PROJECT_V6/SHEETS.md` | `eb6311dbf2987bc5a0a2aa7f102d0ba18d9e1926` |
| `plan/PROJECT_V6/A/README.md` | `8259b962ca0b36c4ef3d7ed7e7e62ff693603341` |
| `plan/PROJECT_V6/reviews/A_0_5-plan-1_root_binding.md` | `bf728b7aeb68e36097016015e4b44c38ab6bbe88` |
| `plan/PROJECT_V6/reviews/A_0_5-plan-1_reviewed_KO.md` | `8c0d6c32d95002eecfbbc2a5903c64a5e8a441ad` |
| `plan/PROJECT_V6/reviews/A_0_5-plan-2_to_review.md` | `9afa86a74f993592a5c17b4d0ad85e2c64226aab` |

## P1 resolution and evidence

There are **no remaining blocking findings in this correction**.
Review scope is the trial-1 P1 migration-order and legacy-upgrade requirement;
accepted identity, recovery, DTO, lifecycle, concurrency and observability
boundaries were checked for consistency, without reopening their design.

1. **Per-profile migration order is now explicit and append-only.**
   `A/0/05.md:80-108` lists the five historical root IDs as `H`, the existing
   full epoch ID as `E`, and the separately named recovery migration as `R`.
   Generic and WIRING-A become `H, R`; WIRING-B becomes `H, E, R`. These
   match the existing exported profile composition in
   `gateway/src/core/sqlite_migration_sets.js:26-70`. Appending after each
   profile's own history preserves all old IDs at the same ledger positions,
   satisfying the exact rowid-ordered prefix check at `:154-174` and the
   verified-file/schema application path at `:262-295`. The sheet explicitly
   forbids insertion before `E`, filename sorting, applied-row rewrites and
   weakened validation, and retains historical IDs, rowids and timestamps.
   The two `005` entries have different full IDs; no new profile is needed.

2. **Named RED tests distinguish all three legacy upgrade paths.**
   `A/0/05.md:295-306` requires:
   - `legacy generic H upgrades and reopens with H then R`;
   - `legacy WIRING-A H upgrades and reopens with H then R`;
   - `legacy WIRING-B H then E upgrades and reopens with H then E then R`.

   Each case starts from the exact pre-A05 SQL/set with existing task rows,
   upgrades through the corresponding production profile, closes and reopens
   the database, and asserts emitted ordered ledger rows with
   `SELECT rowid, id, applied_at FROM main.schema_migrations ORDER BY rowid`.
   It requires unchanged historical rows, nontrivial epoch store/fence and
   receipt/ack data, null legacy task actions and no recovery authority for
   legacy traces. Fixture-array assertions alone cannot satisfy this RED.
   The acceptance criterion at `:327-330` repeats these observable results;
   focused verification at `:344` now includes
   `tests/gateway/coordination_consumer_epoch_migrations.test.js`.

3. **Existing refusal properties and the accepted scope are retained.**
   The sheet preserves unknown/duplicate/non-prefix, altered-schema/digest
   and cross-profile refusal coverage, including the existing tests at
   `coordination_consumer_epoch_migrations.test.js:345-420`. Compatibility is
   an upgrade within the selected profile: a post-recovery `H, R` ledger is
   not a prefix of `H, E, R`. When updating fixture setup, preserve the actual
   refusal assertions rather than attempting to switch that new WIRING-A
   ledger into WIRING-B. This follows the specified order and adds no scope.

   Comparing the predecessor sheet blob
   `8e2aeb19179d3f8c968be966dd14a0b79dda46b0` with this candidate shows only
   the migration contract, named migration RED, corresponding acceptance
   criterion and focused verification command changed. The five prior
   non-sheet candidate files are byte-identical. The seven V6 leaves,
   dependencies, wave order, Linux local stdio/SQLite support boundary and
   same-user/repository/no-extra-approval decision are unchanged.

## Checks performed and verification limits

- Read AGENTS, orchestration profile, ao-plan skill, plan/project/stage
  registries, sheet, operator decision and the complete A/0/05 plan trail.
- Frozen candidate path inventory: exactly the eight bound files above;
  zero production, test or policy changes.
- Candidate blob check: **8/8** matched; prior non-sheet blobs: **5/5** unchanged.
- Local Markdown link targets across bound documents: **29/29** exist.
- `git diff --check b667728910fcf3d459ed4877e279bba6e663ee42 93c973f693461e6f091836b017bb4606384f2b9b`:
  exit **0**.
- Independent read-only Node probe importing the existing exported profile
  IDs: exit **0**, **3/3** specified sequences retain their historical prefix;
  the prohibited shared-root insertion breaks the WIRING-B prefix. Existing
  historical SQL digests were verified against the module: **6/6** matched.
  The probe created no database and executed no migration. These are plan
  consistency checks, not implementation RED/GREEN or upgrade evidence.
- Implementation RED/GREEN, actual DB upgrade/reopen suites, focused test
  suites, full gate, live Codex restart, integration and release checks:
  **not run by this reviewer**. The planned implementation and operator
  acceptance gates remain required; no passing runtime totals are claimed.

Only this new immutable OK verdict was written. No prior evidence, shared
index, production file or policy was edited; no subagent, provider, commit
or push was used. Root owns indexing, artifacts and any evidence commit.

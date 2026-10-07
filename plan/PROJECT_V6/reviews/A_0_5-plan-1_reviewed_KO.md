# A_0_5 — Local restart recovery plan review, trial 1

Date: 2026-10-07. Verdict: **KO — one plan correction required**.
This is an independent plan verdict. It does not accept implementation,
runtime behavior, integration, promotion or release.

## Candidate and reviewer authority

- Root base: `b667728910fcf3d459ed4877e279bba6e663ee42`.
- Frozen candidate tree: `0efd2b65b970dff78b4fd659c980e8282b4627ee`.
- Fresh review trace: `tr-r1-a05-plan-e269253f-3cfb-4acf-a948-f6c3433dc5be`.
- Independently assigned reviewer: built-in Codex session
  `/root/review_v6_a05_plan`, assigned by root after the author task settled.
- Execution: the operator-authorized built-in Codex fallback recorded in
  `HUMAN_DECISIONS.md` and `reviews/README.md`, following the reported Gateway
  `task.assign` denial (`REQUEST_CONTEXT_DENIED`). This is not a Gateway-spawned
  or cross-vendor review. No Claude invocation occurred. The trace identifies
  this review round; it is not proof of a successful Gateway task/session grant.

The operator's direct same-user/repository/no-extra-approval decision is
recorded in `A_0_5_human_decision.md`. It supplies the existing decision;
coordination messages and discovery artifacts supply evidence only. Root's
separate reviewer assignment supplies this review task, not merge authority.

All six working files matched both their frozen tree entries and the
candidate manifest immediately before this verdict was written:

| File | Frozen blob |
|---|---|
| `plan/PROJECT_V6/A/0/05.md` | `8e2aeb19179d3f8c968be966dd14a0b79dda46b0` |
| `plan/PROJECT_V6/A/README.md` | `8259b962ca0b36c4ef3d7ed7e7e62ff693603341` |
| `plan/PROJECT_V6/SHEETS.md` | `eb6311dbf2987bc5a0a2aa7f102d0ba18d9e1926` |
| `plan/PROJECT_V6/reviews/A_0_5-1_implementation_checkpoint.md` | `3efb47ce318bbc2a138b47d5e094f1547a313cdb` |
| `plan/PROJECT_V6/reviews/A_0_5-plan-1_to_review.md` | `87ed7f93abdc4cc824b3808d9dc1e828970e7633` |
| `plan/PROJECT_V6/reviews/A_0_5-plan-1_root_binding.md` | `bf728b7aeb68e36097016015e4b44c38ab6bbe88` |

## Required correction

1. **P1 — Specify append-only migration order for every existing profile and
   name the legacy epoch upgrade RED.** Sheet `A/0/05.md:80-85` says to add the
   recovery migration to applicable profiles while keeping historical
   migrations unchanged, but does not define each profile's ordered upgrade
   sequence. Its only migration RED (`:272-273`) does not distinguish the
   existing epoch profile. `SHEETS.md:14` fixes the new file at
   `gateway/migrations/005_request_context_lineage.sql`; the other existing
   `005` has a different full ID, so equal numeric prefixes are not themselves
   a collision.

   The concrete risk is order: `sqlite_migration_sets.js:54-64` derives the
   generic and WIRING-A sets from `ROOT_BASELINE_SQLITE`, then derives WIRING-B
   by appending its historical `005_coordination_consumer_runtime_epoch`.
   Appending recovery to that shared root list would place it **before** the
   already applied epoch entry. The ledger reader (`:154-174`) accepts only an
   exact ordered prefix; an existing epoch DB would then fail with
   `MIGRATION_PROFILE_MISMATCH`. Unchanged historical SQL and correct digests
   do not prevent that upgrade failure. Root's binding (`:24-25`) identifies
   this risk but leaves the executable profile contract unspecified.

   Amend the sheet with explicit profile sequences. With the currently scoped
   file, use historical root entries followed by recovery for generic and
   WIRING-A; use historical root entries, historical epoch entry, then recovery
   for WIRING-B. Preserve every existing profile's applied-ID prefix and every
   historical file/digest. Do not insert recovery into WIRING-B's historical
   prefix, sort the entries by filename, loosen ledger validation, or rewrite
   applied rows. A shared immutable historical prefix plus a separately
   appended recovery entry is sufficient; no new profile or storage engine
   is needed.

   Add named RED/acceptance cases that open databases created with the exact
   pre-A05 generic, WIRING-A and WIRING-B sets, upgrade them, reopen them, and
   assert the emitted ordered `schema_migrations` rows, preservation of
   existing epoch data, nullable legacy task action, and absence of legacy
   recovery authority. Include `tests/gateway/coordination_consumer_epoch_migrations.test.js`
   in focused verification and preserve its cross-profile refusal cases
   (`:345-420`). Existing initial-migration tests in
   `tests/gateway/sqlite_migrations.test.js` do not exercise this machinery.

## Other reviewed boundaries

The proposed local design is technically feasible within one existing V6
leaf. It explicitly scopes recovery to Linux local stdio/SQLite, takes
real/effective UID authority from the bootstrap, binds private canonical
state and a machine digest, and states its trust and clone limits. The UID
APIs are supported by [Node's process specification](https://raw.githubusercontent.com/nodejs/node/v22.x/doc/api/process.md);
the machine format and application-specific derivation direction are
supported by [systemd's machine-ID specification](https://raw.githubusercontent.com/systemd/systemd/main/man/machine-id.xml).
These source checks are feasibility evidence, not runtime acceptance.

The sheet requires every task's repository ID/root and authoritative action,
refuses incomplete or legacy bindings and taskless traces, preserves original
expiry and generic public denial, and restores no artifact/approval grants.
It distinguishes canonical lifecycle cleanup from refused cancellation,
requires durable-owner checks after hydration, and specifies PID/start/boot
liveness with ambiguous observations denied. SQLite immediate claiming,
revision fencing, staged memory, fixed probe bounds and race tests supply a
coherent concurrency contract. Unsupported recovery must preserve ordinary
calls, including PostgreSQL assignments that cannot assume the new SQLite
column exists.

The private protected-wrapper observer addresses the actual caught-denial
path. The new canonical action/default capability can be wired through the
listed source paths without policy edits; input/response DTOs, the additive
34th tool order and derived projections are specified. Distinguishing RED
covers real bootstrap provenance, protected ask/view after recovery, foreign
repository conjuncts, terminal residue, concurrent claims and observed denial
logging. No additional identity approval, leaf, runtime engine or functional
dependency is required to resolve correction 1.

## Checks and limits

- Read AGENTS, profile, ao-plan skill, plan/project/stage registries, sheet,
  discovery checkpoint, request/root binding and operator decision; inspected
  the relevant production and migration/test boundaries.
- Frozen changed-path inventory: exactly the six files above.
- `git diff --check <base> <candidate-tree>`: exit 0.
- Read-only ordered-prefix probe using the current exported profile IDs:
  shared-root insertion fails the old epoch prefix; appending after the epoch
  preserves it. This is a deterministic feasibility probe, not implementation
  RED, a database upgrade run, or proof of any candidate runtime change.
- Implementation RED/GREEN, database upgrade suites, full gate, live Codex
  restart, integration and release checks: **not run by this reviewer**.
- Only this new immutable KO verdict was written. Root owns trial indexing,
  artifacts and any eventual evidence commit. Corrections require a new trial
  and a fresh independent review trace/session; this verdict is not overwritten.

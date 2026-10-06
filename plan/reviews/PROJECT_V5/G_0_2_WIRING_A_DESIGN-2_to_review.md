# Review submission — Project V5 G/0/02 WIRING-A store design Trial 2

## Deliverable

Normative design:

```text
plan/PROJECT_V5/G/0/02-DESIGN-store-identity.md
```

Design commit:

```text
ae347236043c1aae069638e33e15339518d23d7f
docs(design): close store identity design findings (V5 G/0/02 WIRING-A)
```

Human decision routed at:

```text
plan/reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN_to_check_by_human.md
```

This submission responds only to
`plan/reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN-1_result.md` at
`378eb153e959aefccfd0bbafd15694216b6931bc`.

Implementation remains frozen. No source, test, migration, or policy file was
changed. The independently accepted Trial 3 cancellation correction is
unchanged.

## Decision retained

SQLite remains the ownership authority. No canonical store identity is
derived.

The revised design admits one sealed pairing of:

- a one-shot capability for one managed-client coordination participant;
- the configured state bootstrap's SQLite-main capability; and
- an opaque supported-deployment-profile capability.

It then commits a persistent `(scope_id, generation, owner_state)` row in
`main.coordination_consumer_runtime_owners`. The generation advances across
graceful release and replaces the probabilistic random token.

## Per-finding closure map

### P1 — owner SQL was not anchored to main or guaranteed committed

Closed in design sections 1.1, 1.4, 3.2–3.3, 4.2–4.3, 5 Lemmas 1–2,
6, and 9.1.

- Owner migration checks read only `main.schema_migrations`,
  `main.sqlite_schema`, and `PRAGMA main.*`.
- Claim and release name
  `main.coordination_consumer_runtime_owners`.
- The final repository port must carry its repository owner's opaque
  main-binding attestation. WIRING consumes only the ACK repository port
  frozen at `coordination_ack_reconciler.js:220-232`; it does not inspect or
  depend on the sibling schema.
- `database.inTransaction`, the adapter's direct
  `sqlite3_get_autocommit()` projection, must be exactly `false` before and
  after claim/release.
- The immediate transaction retains its outcome internally until its wrapper
  commits and returns. A commit/postcondition failure returns no success.
- `changes` is not used. A returned-row candidate does not prove commit.
- Mandatory REDs cover per-handle TEMP shadows, attached-only shadows,
  contradictory repository shadows, ambient claim plus rollback, an
  independent committed witness, uncommitted release, and a post-autocommit
  fault.
- Independent mutations remove owner-DML main qualification, migration/schema
  main qualification, repository attestation, claim/release ambient guards,
  commit-before-return, and post-autocommit guards.

### P1 — a complete wrong-store binding and scope collision were accepted

Closed in sections 1.2–1.3, 3.2, 3.4, 5 Lemma 5, 6, and 9.2.

- The external provisioning invariant is explicit:
  `one coordination participant capability D -> exactly one provisioned main
  store S`.
- The real managed-client lifecycle issues a non-serializable participant
  capability while exclusively holding that participant incarnation.
- The sole production provisioner atomically consumes that capability once
  and can pair it only with the configured state bootstrap's sealed store
  capability.
- A second complete store binding for the same participant rejects before
  owner, repository, consumer, reconciler, timer, or managed work.
- Trusted bootstrap selection is an explicit premise: no store-local query can
  discover that an operator intended another configured path.
- Equal scope text in different stores is legal only for distinct
  coordination-plane/participant capabilities. Reusing one ready managed
  client or capability across stores is illegal.
- Mandatory REDs cover a same-participant second complete store, a bare/foreign
  configured-store substitution, copied status/capability objects, genuinely
  disjoint participants with equal scope text, and two bindings to one main.
- Independent mutations remove participant one-shot consumption, configured
  store capability admission, capability-versus-scope distinction, and sealed
  same-main binding.

### P1 — random freshness was not an exact release fence

Closed in sections 4.1–4.3, 5 Lemma 4, 6, and 9.3.

- Ownership randomness is removed.
- One persistent integer generation remains after graceful release.
- Claim advances released generation `g` to `g + 1`; it never wraps, resets,
  or deletes the row.
- Release matches exact `(scope_id, generation, owner_state = 'owned')`.
- A delayed release for `g` cannot affect replacement generation `g + 1`.
- Maximum generation fails permanently closed.
- A mandatory fixture forces every injectable RNG to return identical 32-byte
  values and proves ownership/release remains correct because the protocol
  never consumes RNG.
- Independent mutations suppress generation advancement, reset/delete on
  release, remove the generation predicate, and permit overflow.

### P1 — unsupported-filesystem admission had no authority

Closed in sections 3.1, 5 premise 2, 6–7, and 9.6.

- The JavaScript runtime makes no pathname, mount, or VFS inference.
- Production state bootstrap requires a private capability issued outside the
  runtime by a closed, reviewed deployment profile.
- A profile names the allowlisted adapter/SQLite build and exact single-host
  storage class whose locking and commit behavior passed real
  independent-process tests.
- Plain objects, environment strings, copied descriptors, and arbitrary
  handles cannot mint the capability.
- Support is claimed per named deployment profile, not generically for Linux,
  macOS, Windows, or a “local-looking” path.
- Missing/forged profile, generic network/custom VFS, PostgreSQL,
  `:memory:`, temporary, and shared-memory cases reject before owner SQL.
- Each admission mutation uses an otherwise SQL-capable store, so its directed
  failure cannot be supplied by downstream SQL.

### P1 — the verification plan could not validate the theorem or guards

Closed in section 9.

The revised plan makes every review counterexample mandatory:

- TEMP owner shadows;
- attached owner/migration shadows;
- repository shadows;
- ambient claim, rollback after local change, independent commit visibility,
  and uncommitted release;
- a complete wrong-store binding with one managed participant;
- exact RNG collision;
- missing/forged deployment-profile authority; and
- the retained three-by-400 bidirectional WAL-target/rollback-unrelated
  concurrency workload.

The scope-primary-key mutation now removes `PRIMARY KEY` while leaving the
targetless UPSERT syntactically valid. A directed pair of raw duplicate main
inserts observes lost exclusivity; it cannot turn red merely because the
UPSERT no longer prepares.

The generation test forces exact equality and does not model only deliberate
token reuse. Admission predicates have separate SQL-capable fixtures.

Section 9.8 names 33 independent guard mutations. Each disposable mutation
must pass syntax checking, run its directed fixture first, and report pristine
and mutated counts, first failure, and zero survivors.

### P2 — non-expiring safety causes indefinite unavailability

Closed as an explicit decision in sections 4.5 and 8, and routed to:

```text
plan/reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN_to_check_by_human.md
```

- A crash, active-state backup, or restored active row blocks indefinitely.
- PID absence, time, heartbeat loss, lease expiry, and failed probes are not
  liveness authority.
- Part A exposes no delete, clear, reset, PID, TTL, probe, or takeover API.
- The former manual-delete sentence is withdrawn; direct deletion is
  prohibited because it also destroys durable generation history.
- Any future maintenance transition requires enforced global quiescence,
  prevention of restart/access, exclusive offline control, and
  generation-preserving advancement in a separately reviewed procedure.
- The recommended bounded option is safety-first part A; the alternative is a
  larger epoch-fenced design across receive, handlers, durable transitions,
  ACK, reconciliation, and every effect.

Because indefinite outage is a material operational cost, implementation
remains frozen pending explicit operator ratification as well as independent
design review.

### P2 — loser-result invariant contradicted busy disposition

Closed in sections 1.3, 4.2, 5 Lemma 3, 6, and 9.4.

- `STORE_OWNED` is returned only after the exact active main row is observed.
- Busy/locked, ambiguous, exhausted, invalid, or commit-uncertain outcomes
  return a distinct closed store failure and create no work.
- The two-handle and 400-handle gates accept documented closed busy outcomes
  while requiring exactly one `claimed`; a retry after the winner commits
  must observe `STORE_OWNED`.

## Correctness argument summary

The proof is conditional on four explicit authorities:

1. one managed participant capability is paired once with the configured
   state-store capability;
2. the closed deployment profile truthfully identifies a storage
   configuration with SQLite locking/atomic-commit guarantees;
3. the adapter's transaction-return and autocommit contracts hold; and
4. owner statements target `main`, while repository owners attest the same
   for their frozen ports.

From those premises:

1. **Main locality:** TEMP and attached schemas cannot receive or satisfy
   owner/repository operations.
2. **Committed admission:** `claimed` crosses only after transaction return and
   the autocommit postcondition.
3. **Unique arbitration:** the one main primary-key row and immediate
   transactions permit at most one committed claim per store/scope.
4. **Exact release:** persistent monotonic generation prevents an old release
   from affecting a replacement without a probabilistic assumption.
5. **Provisioning uniqueness:** one managed participant cannot evade the main
   row by pairing a second store.

Therefore two handles to one admitted main store cannot obtain different
ownership keys or two start permissions, unrelated store activity cannot
substitute another store, and one coordination participant cannot split its
durable truth across two provisioned stores.

## Scope boundary

- Store-backed arbitration and the diagnosis of Trials 1–3 are retained.
- No source, tests, migrations, or policies changed in this design trial.
- WIRING consumes only the ACK repository port frozen at
  `coordination_ack_reconciler.js:220-232`; it has no dependency on migration
  `003` or outbox schema semantics.
- The accepted cancellation/client/service/queue behavior is frozen.
- No crash recovery, durable convergence, Redis-live recovery, health,
  inventory, integration, promotion, release, or complete-sheet claim is
  made.
- The caller retains ownership of injected SQLite handles.
- PostgreSQL remains deferred to I/0/05.

## Documentation verification

- `git diff --check` — required before both documentation commits.
- Candidate-path inspection — only the normative design, this submission, and
  the explicitly authorized human-decision file may differ from `378eb15`.
- No implementation tests are run or claimed because implementation is
  expressly frozen.
- The pre-existing untracked `gateway/node_modules` entry remains untouched.

## Review status

Awaiting independent design review and operator decision. No coder-owned
verdict is asserted.

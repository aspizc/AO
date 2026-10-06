# Stage C — Canonical public contract and honest lifecycle

Status: **in progress**. `C/0/00` is complete and integrated after its final
Trial 9 independent OK at `262c666`; Trials 1–8 remain preserved KO evidence.
`C/0/01` is complete after Trial 2 independent OK at `98599a8`. `C/0/02`
is complete after Trial 4 independent OK at `9766979`, integration at
`2111f89`, and promotion through `develop@c10bcf3` and `main@7039a0b`;
The lifecycle vertical `C/1/00–03` remains the active functional path.
`C/1/00` exhausted its historical Trial 1–15 line with Trial 15 KO at
`dafce555`. The operator denied Trial 16 and authorized a new, explicitly
named scope-rebaseline series limited to the original reducer and
server-owned-transition contract. Rebaseline Trial 1 is independently KO at
`d8ec680`; only its request/result artifacts are integrated. Trial 2 CORE
closes the reviewed PostgreSQL, legacy/canonical session, idempotency, version,
and concurrent-reservation corrections with independent OK at `4faec5e` and
Wave 2 integration `37bc85c`. The final current-writer splice is a separate
jointly reviewed C/D slice. Its Trial 1 persistent-control blocker was
independently confirmed, so it remains blocked before GREEN on implemented and
reviewed `D/0/07` and remains required before this sheet can close. All process,
FIFO, Python-runtime, no-shell,
PGID/descendant, cancellation, and budget ownership moved to `D/0/01`; no
historical process commit is silently inherited.
`C/0/03` remains planned and is now unblocked by G/0/01 Trial 3 independent
OK; its mandatory coordination-hotspot decomposition must characterize the
reviewed client lifecycle rather than race an author branch.

`A/0/00` is an implemented baseline. Rebaselined Project V4 specifications are
integrated into this plan; behavior remains `planned` until implementation
commits, tests, and reviews exist. `absorbed_from` records specification
traceability.

| Sheet | Outcome | Status | Functional priority |
|---|---|---|---|
| [C/0/00](0/00.md) | Credible CI/runtime contract | complete; Trial 9 reviewed OK and integrated | P0 |
| [C/0/01](0/01.md) | One public tool/schema/error contract | complete; Trial 2 reviewed OK and integrated | P0 |
| [C/0/02](0/02.md) | Candidate/state identity and SCA waiver gate | complete; Trial 4 reviewed OK, integrated, and promoted | P0 |
| [C/0/03](0/03.md) | Coordination-hotspot decomposition plus coverage, mutation, and architecture fitness | planned | P1 |
| [C/1/00](1/00.md) | Single server-owned lifecycle reducer | in progress; rebaseline Trial 1 reviewed KO, Trial 2 CORE reviewed OK and integrated, final C/D splice blocked on reviewed D/0/07 | P0 |
| [C/1/01](1/01.md) | Trace overview and typed state | planned | P0 |
| [C/1/02](1/02.md) | Honest completion preflight | planned | P0 |
| [C/1/03](1/03.md) | Recovery and false-completion E2E | planned | P0 |

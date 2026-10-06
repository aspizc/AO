# Stage G — Coordination and infrastructure operability

Status: **in progress**. `G/0/00` is complete after Trial 1 independent OK at
`5058a59`, integration at `77cb418`, and promotion through
`develop@c10bcf3` and `main@7039a0b`. `G/0/01` preserves Trials 1–2 as
independent KO evidence and closes Trial 3 with independent OK at `3cef36c`;
it is integrated into the functional Wave 2 tree and awaits `develop`/`main`
promotion. `G/0/02` remains in progress. CORE Trial 4 and STORE Trial 4 are
independently reviewed OK and integrated. ACK Trial 5 is reviewed OK at
`b80a76b` and integrated at `ef38763`, with ACK Trials 1–4 preserved as KO
evidence. OUTBOX Trial 3 is reviewed OK at `be6fe6d` and integrated at
`cc1c10e`; that slice
includes migration `003`, so the migration is integrated rather than open.
WIRING-A Trial 6 is reviewed OK at `e90fb8a` and integrated at `b52b661`.
WIRING-B crash/reclaim behavior, health, inventory, and the full-sheet exit
gate remain open. G/0/03–04 stay planned. This stage turns the coordination
prototype into a required, recoverable, bounded service without disturbing
shared development instances.

`A/0/00` is implemented. V4 rebaseline specifications are provenance; Project
V5 owns implementation and no duplicate V4 work is scheduled. G/0/00 supplies
only the G owner of V4 M0/4/01, which remains partial while B/0/04 is open.

| Sheet | Outcome | Status | Functional priority |
|---|---|---|---|
| [G/0/00](0/00.md) | Required Redis 7 race lane | complete; reviewed, integrated, promoted | P1 |
| [G/0/01](0/01.md) | Persistent Redis client lifecycle | complete; Trial 3 independently reviewed and integrated, promotion pending | P1 |
| [G/0/02](0/02.md) | Retry/DLQ/replay consumer | in progress — CORE Trial 4, STORE Trial 4, ACK Trial 5, OUTBOX Trial 3 with migration `003`, and WIRING-A Trial 6 independently reviewed OK and integrated; WIRING-B, health, inventory, and the sheet exit gate remain open | P1 |
| [G/0/03](0/03.md) | Retention/quotas/metrics/reaper | planned | P1 |
| [G/0/04](0/04.md) | Closed-scope admission and caps | planned | P1 |

# Human decision required — Project V5 C/1/00 after Trial 15

## Why this decision is required

The independent Trial 15 review is `KO`. The repository's
`tdd-implementation` contract requires the lane to stop after a fifteenth
failed trial and forbids starting Trial 16 without human direction.

Trial 15 materially improved caller-loss containment, but independent review
reproduced two remaining defects:

1. If the FIFO supervisor is killed after the configured utility has executed,
   Linux kills the utility leader through `PDEATHSIG`, but a TERM-resistant
   descendant can remain alive because no independent process retains both
   group-signal and descendant-reap authority.
2. A valid `AGENTS_PYTHON_BIN` shebang wrapper still causes the FIFO supervisor
   path to resolve a second ambient `python3`, contradicting the supported
   override contract and the shipped documentation.

The authoritative evidence is
`plan/reviews/PROJECT_V5/C_1_0-15_result.md`, result-only commit
`dafce555b2e8aead1ef6ebdb579623aa16a92368`.

## Decision requested

May the orchestrator exceed the normal 15-trial limit and start a narrowly
scoped **C/1/00 Trial 16** from the Trial 15 result-only commit?

## Recommended authorization

Authorize one additional correction trial with these mandatory outcomes:

- retain an independent, exact-identity containment authority that survives
  abrupt death of the current supervisor and kills/reaps the utility leader,
  same-PGID members, and adopted descendants without touching an unrelated
  sentinel;
- keep a caller-side fallback bound to a stable, pre-exec process-group
  identity for abnormal supervisor exit;
- reuse the already verified configured Python runtime plan for FIFO
  supervision, with no second ambient interpreter lookup;
- add the exact supervisor-death and no-ambient-Python probes before changing
  production code;
- preserve the one absolute deadline, safe error contract, direct `execve`
  utility boundary, macOS seam, and all previously reviewed lifecycle
  behavior; and
- require another independent GPT-5.6 Sol ultra / Priority-Fast review before
  integration.

The implementation may choose a small guardian/reaper split or an equivalent
design, but it must prove the observable outcomes above. It may not weaken the
tests, broaden process kills, introduce a shell, or relax CI/review gates.

## Alternatives

- **Do not authorize Trial 16:** leave C/1/00 open. This also blocks C/1/01 and
  D/0/01 and prevents the current Wave 2 from being promoted.
- **Defer the synchronous FIFO boundary:** redesign the larger execution path
  under D/0/01. This expands scope and leaves the currently shipped
  synchronous path without an accepted containment result, so it is not
  recommended.

## Exact response needed

Respond with an explicit authorization or denial for C/1/00 Trial 16. If
authorized, the recommended outcome constraints above will be treated as the
human-approved boundary; no additional architecture choice is required unless
the RED probes show that boundary to be infeasible.

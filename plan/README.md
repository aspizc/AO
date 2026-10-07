# Plan projects

## AO publication and inherited planning baseline

AO `1.0.0` is published at `41f9ce28aa59673283a7c5494200e0ec7b56e2f6`
(2026-10-06); its annotated tag remains at that historical release object.
`main` can advance with reviewed documentation independently of the tag.
See [current project status](../docs/project-status.md) for runtime verification
limits. The imported generation table below preserves historical provenance.

## Current release planning

[Project V6](PROJECT_V6/README.md) plans seven sheets for AO `1.1.0`:
role-derived CLI restrictions, worker markers, public snapshot hygiene,
reliable prompt submission, explicit restart reattachment, bounded prompt
approval, and release assembly. A/0/02 is reviewed and integrated on the
release branch; the other six sheets remain unfinished.
`release/1.1.0` starts from `1.0.0`; the recorded
[operator decisions](PROJECT_V6/HUMAN_DECISIONS.md) and
[baseline checks](PROJECT_V6/BASELINE.md) govern preparation. V5 remains a
separate active delivery track. No `1.1.0` release is claimed.

## Generic execution planning

[Project V7](PROJECT_V7/README.md) separately plans validated project profiles,
persistent wave execution, shared capacity for cooperating local runners,
checkpoints/recovery and two-project/two-orchestrator acceptance. A/0/00 and
A/0/01 are reviewed and integrated; the remaining three sheets consume V6's
prompt/restart foundations where specified. V7 does not enlarge the seven-sheet V6 release scope or close the
open V5 authority and process-control gates.

## Imported delivery tracks

The implementation plan is split by project generation. Project numbers identify
delivery tracks, not releases or a monotonic capability level. The table keeps
the 2026-07-26 audit cut and the local post-audit integration correction
separate; exact evidence and historical SHAs live in
[`PROJECT_V4/AUDIT.md`](PROJECT_V4/AUDIT.md).

| Project | Scope | Observed status | Tree |
|---|---|---|---|
| Project V0 | MVP and MVP2.0 implementation plan, stages A-Z, and review trail. | Historical implementation/reviews closed; the 27-item MVP acceptance checklist remains unchecked, so this is not current release evidence. | [`PROJECT_V0/`](PROJECT_V0/README.md) |
| Project V1 | Advanced orchestration: LangGraph, Postgres, Redis Streams, Temporal, OpenTelemetry. | Partially implemented and experimental/not supported; correctness and live-lane gaps are folded into V4 Stage E. | [`PROJECT_V1/`](PROJECT_V1/README.md) |
| Project V2 | Advanced operator workflows: task-less sessions and advanced planning. | Backlog; not a release candidate. | [`PROJECT_V2/`](PROJECT_V2/README.md) |
| Project V3 | Hardening from the 2026-06-10 code audit: CI gates, policy tests, license, reproducibility, release bookkeeping. | Implemented/reviewed and now integrated into the aligned local `main`/`develop`; the announced `v0.1.0` tag and remote publication still do not exist. | [`PROJECT_V3/`](PROJECT_V3/README.md) |
| Project V4 | Trust boundary, confined/YOLO execution grants, operator control, dual review, release confidence and Temporal convergence. | The audit-derived 72-sheet plan is materialized and integrated. V5 evidence absorbs M0/4/00 and leaves M0/0/00, M0/3/00, M0/4/01, and M0/4/02 partial; remaining implementation stays with V5. | [`PROJECT_V4/`](PROJECT_V4/README.md) |
| Project V5 | Redis coordination plane plus the authority, operability, product and durable-release work required for inter-orchestrator coordination. | Active. The A foundation, reviewed B corrections, C/0/00–02, and G/0/00 are delivered. D/0/07c Trial 4 remains historical reviewed/integrated evidence. Trial 5 was independently KO at `9aafa77`, Trial 6 was independently KO at `43687af`, and the Trial 7 fail-closed correction `d79fd00` was independently reviewed OK at `7caf94b` and integrated at `c66b05f`. D/0/07c is complete but not promoted or released; D/0/07d is the next planned, unimplemented leaf. | [`PROJECT_V5/`](PROJECT_V5/README.md) |

Use [`PROJECT_V0/README.md`](PROJECT_V0/README.md) for the completed MVP/MVP2.0
tree and execution order.

Project V5's implementation tree contains the delivered A foundation—[five
historical epics and 25 executable sheets](PROJECT_V5/EPICS.md)—plus eight
materialized B–I stages with [57 active executable leaves](PROJECT_V5/SHEETS.md),
for 82 total. The arithmetic is
`25 + (6 + 8 + 11 + 6 + 5 + 5 + 6 + 10) = 82`; the imported ledger records
`39 complete + 4 in progress + 39 planned = 82`, and
`4 + 39 = 43` sheets are open. The in-progress set is exactly `C/1/00`,
`D/0/01`, `G/0/02`, and `H/0/01`. The non-executable D/0/07
parent index is not double-counted. Those open sheets absorb overlapping V4 work rather than
scheduling 71 duplicate implementations. Its
[review trail](PROJECT_V5/reviews/README.md) preserves every `OK` and `KO`
verdict. The [independent A/0/00 final
OK](PROJECT_V5/reviews/A_0_0-1_reviewed_OK.md) closes only that foundation;
each still-open B–I sheet requires its own implementation, tests, review, and
integration evidence. No review alone proves promotion, live contention,
tagging, or release.

Project V4 exposes the audit-derived plan through
[twelve detailed epic files](PROJECT_V4/epics/README.md) and
[72 individually linked task files](PROJECT_V4/SHEETS.md) under their canonical
stage/stream directories. Their status is derived through the
[V4/V5 absorption ledger](PROJECT_V5/V4_ABSORPTION.md): M0/4/00 is absorbed,
four M0 sheets are partial, and no duplicate V4 implementation is scheduled.

## Canonical status rule

From the 2026-07-26 audit onward, `planned`, `implemented`, `reviewed`,
`integrated`, `promoted`, and `released` are separate states. An `OK` review
cannot imply a later state. Any supported/release claim must name one candidate
commit/tree SHA, reproduce its required gates and skip budget, and prove that
`main` and the release tag resolve to that same object. V4 G-1 and M0/0/00
establish this contract; M0/4/02 makes it executable.

Historical V4 planning documents (`../plan_proyecto_v4.md` and
`../tareas_implementacion_v4.md`) stay at the repository root because
`PROJECT_V0/README.md` and `PROJECT_V1/README.md` link to them with relative
paths. They are historical inputs for Project V0, not a live source for
Project V3, and should not be moved or updated as part of V3 work.

Versioning uses SemVer. Versions below `1.0.0` are internal development/test
iterations, but every minor must remain functional and usable. The first
showable/publishable MVP is `1.0.0`; the missing `v0.1.0` is not created
retroactively as a public release.

Project V0 closes the MVP2.0 gate as V/W/X/Y:

- V: model selection.
- W: real Codex coder support.
- X: generic launcher profile and two-agent prompt.
- Y: real two-agent E2E, smoke, `Y/0/2` MVP2.0 gate, and `code.apply`
  autonomous scope.

Evidence:

- [`../docs/mvp2-acceptance-checklist.md`](../docs/mvp2-acceptance-checklist.md)
- [`../docs/adr/ADR-005-mvp2-scope.md`](../docs/adr/ADR-005-mvp2-scope.md)
- [`../docs/adr/ADR-006-bounded-autoapprove.md`](../docs/adr/ADR-006-bounded-autoapprove.md)

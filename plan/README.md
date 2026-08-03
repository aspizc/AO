# Plan projects

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
| Project V4 | Trust boundary, confined/YOLO execution grants, operator control, dual review, release confidence and Temporal convergence. | The audit-derived 72-sheet plan is materialized and integrated; implementation remains planned. Preliminary M0 worktrees use a stale base and are historical evidence only. | [`PROJECT_V4/`](PROJECT_V4/README.md) |
| Project V5 | Redis coordination plane plus the authority, operability, product and durable-release work required for inter-orchestrator coordination. | Active. The 25-sheet A foundation, reviewed B contract corrections, C/0/00 credible CI contract, and C/0/01 canonical MCP contract are integrated in the functional Wave; the remaining B–I sheets stay explicitly planned or in progress until their own implementation, review, and integration evidence exists. | [`PROJECT_V5/`](PROJECT_V5/README.md) |

Use [`PROJECT_V0/README.md`](PROJECT_V0/README.md) for the completed MVP/MVP2.0
tree and execution order.

Project V5's implementation tree contains the delivered A foundation—[five
historical epics and 25 executable sheets](PROJECT_V5/EPICS.md)—plus eight
materialized B–I stages with [50 active sheets](PROJECT_V5/SHEETS.md). Its
[review trail](PROJECT_V5/reviews/README.md) preserves every `OK` and `KO`
verdict. The [independent A/0/00 final
OK](PROJECT_V5/reviews/A_0_0-1_reviewed_OK.md) closes only that foundation;
each B–I sheet still requires its own implementation, tests, review and
integration evidence. No review alone proves promotion, live contention,
tagging or release.

Project V4 exposes the audit-derived plan through
[twelve detailed epic files](PROJECT_V4/epics/README.md) and
[72 individually linked task files](PROJECT_V4/SHEETS.md) under their canonical
stage/stream directories. The indexes and sheets are planning artifacts: they
do not mark implementation, review, integration, promotion or release as
complete.

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

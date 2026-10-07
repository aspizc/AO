# Generic AO direction — plan review request, trial 1

- Base: `61d6f760773f28d2a7971506ca692a95d694b27a`.
- Candidate tree: `cfee837ae017f116db15696bdc49c0db55b1c599`.
- Branch: `release/1.1.0`.
- Trace: `tr-ao-generic-1007-b2b45540-91c7-4ca2-b1a8-f9ebbcfb7336`.
- Independent reviewer: Codex `/root/review_generic_direction`; previously
  authorized session-agent fallback applies. No Claude execution or
  cross-vendor/Gateway-spawned review is claimed.

## Requested change

The operator clarified that AO serves different project types and must
preserve useful KYA methods, specifically epic/story generation, waves for
parallel work and Gateway lifetime per wave instead of individual tasks.
The candidate records that decision, refines A/0/02's extraction scope and
acceptance, links the generic requirements and updates the current decision
index. Earlier questions/verdicts remain immutable; historical retention is
not inferred from the clarification and does not block workflow extraction.

## Acceptance

- Preserve reusable behavior, with explicit configurable repository IDs,
  paths, commands, plan layouts and project examples.
- Distinguish wave Gateway/process/connection lifetime from task/trace/session
  authority and independent review; no source-specific permission grant is
  silently generalized.
- Accurately describe existing skills and the legacy runner's fresh process
  per request. Generic wave automation remains a tracked runtime requirement
  needing its own registered implementation sheet, not an implemented feature
  or a silently expanded release promise.
- All changes remain plan Markdown, with coherent links and decision status.
  Global provider defaults, runtime code and policy remain unchanged.

## Checks

Root inspected the source runbook, runner and planning/build skills.
All 8 changed plan documents have 60 resolving local links.
`git diff --cached --check` passes. No new runtime tests, full gate or live
provider runs apply to this documentation-only change; none are claimed.

Write an independent immutable verdict for this scoped plan clarification.
Only final handoff, verdict and index evidence may follow before the
plan-only commit with `carlos.aspizc@gmail.com`.

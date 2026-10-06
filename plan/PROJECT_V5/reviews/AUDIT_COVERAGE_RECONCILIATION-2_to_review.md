# Review Submission - Project V4/V5 Audit Coverage Reconciliation (Trial 2)

## What was done

- Preserved the Trial 1 KO and corrected its three blocking ownership gaps
  without adding a sheet or changing any implementation state.
- Made planned I/0/08 the executable owner of the complete public MCP
  0.1→0.2 transition: flagged 0.2 endpoint/schema with 0.1 initially default,
  explicit pre-dispatch version mismatch, exhaustive candidate-bound consumer
  matrix, mixed-version denial, atomic 0.2 activation/0.1 retirement, and one
  server/client/DB rollback point.
- Kept planned I/0/06 as the pending-history worker transport-shim owner.
  Complete C/0/01 remains only the generated-contract source; no new
  acceptance or implementation claim was assigned to it.
- Made C/0/03 require characterized, wire-preserving decomposition of
  `coordination_queue.js`, `coordination_service.js`, and every additional
  reviewed-audit hotspot. It now has exact logical-line, function-complexity,
  façade, dependency-direction, aggregate-complexity, and duplication gates.
- Made H/0/00 the single provider/model/reasoningEffort/serviceTier source and
  resolver with an exact registry-derived Codex/Claude/Gemini matrix. D/0/01
  consumes the resulting `EffectiveAgentSelection` and owns exact delegate/
  spawn argv plus effective-value policy/audit parity and fail-before-child.
- Reconciled the affected V4 leaves and indexes, V5 stage indexes, coverage
  matrix, absorption ledger, and epic DAG.

## Why

- Trial 1 could mark V4 B/4/00 and B/4/02 absorbed while no planned sheet was
  required to implement a versioned 0.2 endpoint, migrate all consumers, or
  retire 0.1 atomically.
- C/0/03 could pass a complexity ratchet while preserving the two existing
  coordination monoliths or copying their complexity behind a façade.
- M0/2/01 named H/0/00 and D/0/01 only in mapping metadata; both sheets could
  complete without proving provider-specific resolution, argv, audit parity,
  or pre-spawn rejection.

## Decisions Taken

- Extended I/0/08 rather than creating another sheet because it already owns
  candidate-bound cutover, retirement, drain, ADR convergence, and rollback.
  I/0/06 remains the separate worker-shim owner.
- Required C/0/03 to consume reviewed G/0/01 behavior before decomposition.
  G/0/01 authoring remains supporting evidence only and cannot close CODE-M03.
- Pulled H/0/00 forward after C/0/01 and made D/0/01 depend on it. Removed
  H/0/00's F/0/03 dependency to avoid a D→F→H→D cycle; F/0/03–04 remain the
  exclusive executable review/completion-gate owners.
- Preserved all inventories and evidence states: V5 remains 33 complete, three
  in progress, and 42 planned; V4 remains one absorbed, five partial, and 66
  planned; canonical audit rows remain 15 complete, 37 partial, and 69 planned.
- Left audit reports, repository-root README, production code, tests,
  policies, configuration, MCP/Redis processes, `agents:events`, and
  `message.*` unchanged.

## Verification

- Trial 2 ownership assertion at KO head
  `0070865144d2f1b92f9dab31f0619c416f26e158`
  - RED: all four checked surfaces reported the required MCP-transition,
    hotspot-decomposition, selection-source, and adapter-parity markers absent.
- The same ownership assertion at the technical candidate
  - GREEN: all Trial 2 ownership assertions pass.
- `python -m pytest -q tests/structure/test_project_v4_plan_materialization.py`
  - 6 passed.
- `python -m pytest -q tests/structure`
  - 290 passed.
- Canonical audit-registry checker
  - 121 inventory rows, 121 unique accounted rows, zero missing, extra, or
    duplicate; 15 complete / 37 partial / 69 planned.
- V5 inventory/status/shape checker
  - 78 sheets (25 A + 53 B-I); 33 complete / 3 in progress / 42 planned; every
    active sheet retains all required executable sections.
- V5 dependency checker
  - 53 active sheets, 144 unique edges, zero missing targets, duplicate edges,
    or cycles.
- V4 physical/index checker
  - 72 sheets; one absorbed / five partial / 66 planned; physical and indexed
    IDs agree.
- Project-plan Markdown path/anchor checker
  - 376 documents, 1,813 local links, two local anchors, zero broken.
- Scope checker
  - 26 changed paths, all Markdown under `plan/`; excluded paths unchanged.
- `git diff --check`
  - passed.
- `git diff --no-ext-diff --binary 0070865 | gitleaks detect --pipe --redact --no-banner`
  - no leaks found.

## Commit

- `6c6a17b9c8b7da21d6aa64d0908e869dc416d19a` -
  `docs(plan): close audit ownership gaps (Trial 2)`

## Requested independent review

Review preserved KO/base `0070865144d2f1b92f9dab31f0619c416f26e158`,
technical candidate `6c6a17b9c8b7da21d6aa64d0908e869dc416d19a`,
and technical tree `cab3c4e9d88a79399721a327a23c4936b2ad7117`.
Reproduce all three Trial 1 blockers semantically, not only by keyword, and
re-run the ownership, inventory, status, DAG, V4 index, link/anchor, structure,
scope, diff, and redacted secret checks.

Publish exactly one independent verdict:

- `AUDIT_COVERAGE_RECONCILIATION-2_reviewed_OK.md`, or
- `AUDIT_COVERAGE_RECONCILIATION-2_reviewed_KO.md`.

Do not infer implementation, review, integration, promotion, or completion
from plan prose. Preserve all prior requests, verdicts, and audit artifacts.

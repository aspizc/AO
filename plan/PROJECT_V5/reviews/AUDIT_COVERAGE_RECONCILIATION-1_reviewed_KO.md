# Independent Review — Project V4/V5 Audit Coverage Reconciliation (Trial 1)

## Verdict

**KO** for technical candidate
`9fd44a30f2fa12384b86c4411d34bdd093113f90` and technical tree
`aabedfbaf2646962947bba6f8be9b0354c7493ca`.

The inventories, state counts, physical sheet counts, dependency graph, links,
structure suites, scope diff, and secret scan are reproducible. The candidate
nevertheless leaves material acceptance unowned: several corrected V4
absorption rows add only `absorbed_from` metadata without adding the behavior to
the claimed V5 owners, and the new C/0/03 sheet can complete without closing the
CODE-M03 hotspot finding assigned to it.

## Reviewer configuration

GPT-5.6 Sol, razonamiento ultra, servicio Priority/Fast solicitado.

The effective service tier was not independently verifiable.

## Reviewed identity

- Branch: `docs/V5-audit-coverage-reconciliation`
- Base: `672b5975b051f0139b4f60a4754f0dbb1f5614de`
- Technical candidate:
  `9fd44a30f2fa12384b86c4411d34bdd093113f90`
- Request-only commit:
  `a3a52fbf278d9b85e0fe86613b7aab2909840f21`
- Final request tree:
  `7b26aaa1b0ffe624c3e5272999305cd29f7102da`

The technical commit is a direct child of the requested base. The request
commit is a direct child of the technical commit and adds only
`plan/PROJECT_V5/reviews/AUDIT_COVERAGE_RECONCILIATION-1_to_review.md`.

## Blocking findings

### P1 — The V4 MCP 0.2 transition has no executable V5 owner

The corrected V4 mapping drops binding version-transition acceptance:

- V4 B/4/00 requires an MCP 0.2 server/schema behind a flag, keeps 0.1 as the
  temporary default, and requires an old client to receive a version error
  (`plan/PROJECT_V4/B/4/00.md:11-14,30-34`).
- The ledger maps that acceptance to C/0/01 and D/0/00
  (`plan/PROJECT_V5/V4_ABSORPTION.md:61`). C/0/01 is already complete and owns a
  generated catalog/error contract; its non-scope explicitly defers
  compatibility-breaking removal to a later versioned migration/cutover
  (`plan/PROJECT_V5/C/0/01.md:5,18-27`). D/0/00 owns RequestContext and
  server-derived authority, but its scope, RED, GREEN, and acceptance contain no
  protocol version, dual-version flag, or old-client mismatch gate
  (`plan/PROJECT_V5/D/0/00.md:18-25,33-50`).
- V4 B/4/02 separately requires migrating every consumer, atomically switching
  the server default to 0.2, retiring 0.1, rejecting mixed versions, and proving
  a common server/client/DB rollback
  (`plan/PROJECT_V4/B/4/02.md:11-14,28-33`).
- Its new ledger owners are I/0/08, C/0/01, E/0/02, and I/0/03
  (`plan/PROJECT_V5/V4_ABSORPTION.md:63`). I/0/08 owns the
  LangGraph-to-Temporal ITRP selector, history drain, and legacy ITRP
  retirement—not the public MCP 0.1/0.2 consumer transition
  (`plan/PROJECT_V5/I/0/08.md:11-29,50-57`). E/0/02 removes only
  `approval.respond`, and I/0/03 supplies backup/restore.

As written, all mapped sheets can become complete while the required 0.2
endpoint, version mismatch, consumer matrix, and atomic 0.1 retirement remain
absent. This makes two of the ten advertised V4 absorption corrections
premature and would allow false absorption.

Required correction: assign the complete MCP version-transition acceptance to
one explicit V5 owner (or record an authorized supersession of the V4
acceptance), with concrete dependency, RED/GREEN, consumer-matrix,
mixed-version, activation/retirement, and rollback gates. Then reconcile the
leaf sheets, ledger, and indexes to that executable owner.

### P1 — C/0/03 can close while CODE-M03 remains unresolved

The canonical row is present exactly once, but its acceptance is not:

- The source finding identifies the existing 2,176-line
  `coordination_queue.js` and 1,281-line `coordination_service.js` as mixed
  invariant hotspots and says extraction must follow tested seams
  (`audit/2026-07-26-project-wide/03_CODE_QUALITY.md:218-220`). Its executable
  task plan requires splitting those hotspots by seams without changing the
  wire contract (`audit/2026-07-26-project-wide/03_CODE_QUALITY.md:270-282`).
- The matrix assigns CODE-M03 to C/0/03 and marks it partial because G/0/01
  authoring is supporting evidence
  (`plan/PROJECT_V5/COVERAGE_MATRIX.md:98,177`).
- C/0/03 adds coverage, mutation, dependency-direction, complexity-ratchet, and
  injectable-seam gates, but neither its scope nor acceptance requires reducing
  or splitting the existing coordination hotspots
  (`plan/PROJECT_V5/C/0/03.md:20-35,57-63`). A reviewed baseline can therefore
  preserve both current monoliths and still satisfy every checkbox.
- G/0/01 owns persistent Redis client lifecycle/backpressure only; it also has no
  hotspot split acceptance (`plan/PROJECT_V5/G/0/01.md:11-21,39-44`).

Consequently, the mechanical `121/121` accounting overstates semantic
coverage: CODE-M03 has a row but no closure gate.

Required correction: make C/0/03 (or one separately named owner) require a
characterized, wire-preserving decomposition of the current hotspots with an
explicit target/bound and regression evidence. Supporting G/0/01 work must not
be treated as closure unless its reviewed implementation proves that same
acceptance.

### P1 — M0/2/01 model/effort/tier acceptance exists only in mapping metadata

V4 M0/2/01 requires resolved model, effort, and service tier to be propagated
without shell interpolation through the base/Codex/Claude adapters, with exact
argv parity, invalid combinations blocked before child creation, and safe audit
of the resolved values (`plan/PROJECT_V4/M0/2/01.md:11-14,28-32`).

The reconciliation says H/0/00 resolves those three values and D/0/01 propagates
them (`plan/PROJECT_V4/M0/2/01.md:20-24`;
`plan/PROJECT_V5/V4_ABSORPTION.md:76`), but the candidate only adds those claims
to the two sheets' `absorbed_from` metadata:

- H/0/00's scope and acceptance cover a model/capability profile and prompt/tool
  projections, without an effort/tier/default matrix
  (`plan/PROJECT_V5/H/0/00.md:8,16-24,31-48`).
- D/0/01's scope and acceptance cover a generic argv-array async supervisor and
  no-shell execution, without adapter-specific model/effort/tier translation,
  invalid-combination pre-spawn checks, or audit of resolved values
  (`plan/PROJECT_V5/D/0/01.md:8,17-29,36-56`).

Both owners can therefore pass their declared gates without satisfying
M0/2/01.

Required correction: put the exact model/effort/tier resolution matrix and
adapter propagation/audit behavior into the responsible V5 sheets' scope,
RED/GREEN, acceptance, and verification, or map M0/2/01 to another sheet that
already owns those executable obligations.

## Independently verified invariants

The following claims passed and are not blockers:

1. **Canonical audit inventory**
   - Derived directly from the nine 2026-07-26 reports:
     15 product + 12 architecture + 18 code + 14 security + 13 operations +
     9 testing + 15 data/privacy + 15 UX + 10 governance = **121 source rows**.
   - `OPS-01` and `OPS-02` were source-qualified for security versus operations;
     `DATA-01` remained an alias of canonical `DP-01`.
   - Matrix accounting: **121 unique canonical keys**, zero missing, zero extra,
     zero duplicate.
   - States: **15 complete / 37 partial / 69 planned**.
   - The prior-audit alias families are crosswalks, not additional canonical
     rows.

2. **V5 materialization and state**
   - **78 sheets**: 25 delivered A sheets plus 53 B–I sheets.
   - B–I states: 8 complete, 3 `in_progress`, 42 planned; therefore repository
     totals are **33 complete / 3 in progress / 42 planned**.
   - The only `in_progress` sheets in the reviewed tree are C/1/00, D/0/00, and
     G/0/01. Their text does not claim review, integration, promotion, or
     completion.
   - The eight complete B–I sheets have committed independent review evidence;
     the promoted C/0/00, C/0/02, and G/0/00 evidence is contained by the named
     `develop` and `main` refs.

3. **Dependency graph and sheet shape**
   - **139 unique dependency edges**, zero missing dependency targets, zero
     duplicate edges, and zero cycles across the 53 B–I sheets plus delivered
     A/0/00.
   - Required consumer edges are present:
     C/0/03 → D/0/04, E/0/05 → H/0/05, and I/0/09 → I/0/04.
   - Every B–I sheet has non-empty Problem, Scope, Non-scope, TDD RED, TDD
     GREEN, Acceptance criteria, and Verification sections.

4. **V4 state preservation**
   - Physical/global/stage inventories agree on **72 V4 sheets**:
     1 absorbed, 5 partial, and 66 planned.
   - The only non-planned sheets are M0/4/00 (absorbed) and M0/0/00, M0/3/00,
     M0/4/01, M0/4/02, E/0/00 (partial).
   - The named C/0/00, C/0/02, and G/0/00 technical/review/integration commits
     are ancestors of both `develop@c10bcf3` and `main@7039a0b`; those refs share
     tree `6ef917087911959f5ada6b93a1aecf29ff7e6fe2`.
   - The technical diff creates no V4 implementation branch, task, or review
     trial; it changes planning/ownership prose only.

5. **Scope, links, formatting, tests, and secrets**
   - All 51 technical paths are Markdown under `plan/`.
   - `audit/`, root `README.md`, production code, policies, `.mcp.json`, CI,
     schemas, scripts, tests, Docker, client configuration, and workflows are
     unchanged.
   - Changed-Markdown scan: 51 documents, zero broken local paths, zero broken
     checked anchors.
   - `uv run --with-requirements requirements.lock python -m pytest -q
     tests/structure/test_project_v4_plan_materialization.py` — **6 passed**.
   - `uv run --with-requirements requirements.lock python -m pytest -q
     tests/structure` — **290 passed**.
   - `git diff --check 672b597..9fd44a3` — passed.
   - Redacted `gitleaks detect --pipe` over the binary technical diff — no leaks.

No Redis, shared MCP/Gateway process, container, tmux session, production
runtime, or audit artifact was contacted or modified during this review.

## Trial 2 gate

Trial 2 must correct all three ownership gaps without changing audit evidence or
claiming implementation from plan prose. Re-run the canonical inventory,
status, dependency, V4 state/index, structure, link, diff, and redacted secret
checks against the new technical candidate.

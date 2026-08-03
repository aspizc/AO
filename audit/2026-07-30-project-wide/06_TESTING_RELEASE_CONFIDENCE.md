# Testing and release-confidence audit

## Verdict

**Grade: D+.** The test inventory, suite manifest and candidate verifier are
substantially stronger than the prior audit. Release confidence is still red
because the exact full gate failed twice, official hero smokes fail, and
PostgreSQL/Temporal/real-provider seams remain unavailable or optional.

## Test landscape

The repository contains approximately 197 test files:

| Area | Files / role |
|---|---|
| Gateway and coordination | 131 files; unit, contract, process and Redis behavior |
| E2E | 4 files; dry-run/security and MCP workflows |
| Structure/governance | 39 files; manifests, docs, plans and release contracts |
| CLI | 8 files |
| LangGraph/Temporal | 15 files |

CI uses a canonical suite manifest with inventory digests, minimum test counts,
explicit skip IDs and required/optional classifications. Redis 7 is required
in hosted CI. Node 22/24 and Python locks align with project metadata.

## Exact audit executions

Two full gates were run in a detached exact-candidate worktree with locked npm
dependencies and a disposable Redis 7.2 instance.

| Suite | Result per full run |
|---|---|
| Python lock | 1 passed |
| Candidate verifier | 1 passed; one advisory, zero waivers |
| Python/Gateway lint | Passed |
| Structure | 410 passed |
| Gateway | 1,418 passed, 9 PostgreSQL skips |
| E2E | 25 passed |
| MCP smoke and policy registry | Passed |
| CLI | 342 passed |
| LangGraph | 81 passed, 3 skips |
| Redis/live | 21 passed, 1 failed |
| Aggregate | **2,282 passed, 12 skipped, 1 failed / 2,295** |

Both full runs failed:

`abrupt supervisor SIGKILL leaves the persistent reaper to clean the exact
utility tree`

The owned process survived the test's approximately 3.5-second absence window
and disappeared later. The exact Redis/live lane then passed **22/22** in an
isolated rerun, and the individual failing test also passed alone. This is a
reproducible suite-context race: two full red runs outweigh isolated greens.

Disposable audit Redis containers were removed. No shared Redis instance was
modified.

## Official smoke regression

`scripts/smoke_mvp2.mjs` and `scripts/smoke_planning.mjs` both failed with
`REQUEST_CONTEXT_DENIED` at `task.assign`. Each helper starts a new Gateway per
tool call, while RequestContext lineage is intentionally process-local.

README and the planning runbook advertise these flows. Existing structure
tests inspect script/document text rather than execute the multi-call journey,
so CI does not catch the regression.

Required correction:

- keep one authenticated Gateway process/connection for the complete smoke;
- add both commands as candidate-bound required lanes;
- separately test restart/reconnect through the intended durable authority
  protocol;
- never weaken the ownership check to make the old helper pass.

## Coverage and mutation

A diagnostic Node run with `--experimental-test-coverage` completed
successfully and reported:

- 90.59% line coverage;
- 87.50% branch coverage;
- 90.01% function coverage.

The report includes loaded dependencies and is diagnostic, not a release
threshold. The candidate has no risk-weighted coverage gate and no mutation
gate. C/0/03 remains planned.

High aggregate coverage does not clear the observed gaps: the official smoke
is broken, safe execution is not wired, and multiple tests assert document
tokens or fake envelopes rather than production effects.

## Findings

### QA-NEW-01 — Full-gate cleanup race

**High, release blocker.** Reproduced twice in the full gate and absent in the
isolated lane. Owner should be finalized after root-cause triage; C/0/03 owns
the fitness/repro harness and the process-supervisor slice owns the correction.

### QA-01 — Real result envelope parity

**High, partial.** Legacy LangGraph ignores `exitCode` and trusts
`passed/status`; fixtures synthesize those fields
(`implement_test_review_push.py:266-269`). Temporal recognizes `exitCode` in
part but still accepts weak status compatibility. Owner: I/0/02.

### QA-02 — Reviewer KO is not universally fail-closed

**High, open.** LangGraph can mark a review complete and advance without a
verified verdict/nonzero interpretation; Temporal approval is not bound to an
authoritative review digest. Owners: F/0/03 and I/0/02.

### QA-03 — Persistent/restart MCP behavior is under-tested

**High, partial.** One E2E helper maintains a process, but there is no required
proof of same PID/overlap, reconnect authority, crash recovery and no duplicate
effect. D/0/04 and I/0/02 own these seams.

### QA-04 — Required live services are incomplete

**High, partial.** Nine PostgreSQL contracts, two Gateway integrations and one
Temporal recovery test were skipped. Real agents remain optional-service.
Owners: I/0/05, I/0/07 and H/0/05.

### QA-05 — Weak document/fixture oracles

**Medium, partial.** Several structure tests prove that strings/checklist
tokens exist rather than that the advertised behavior runs. The stale MVP2
acceptance evidence is a concrete consequence.

### QA-06 — Globals and real-time seams remain

**Medium, partial.** Supervisor and coordination support injected clocks in
places; state, audit, sanitizer and approval services still use process
singletons or real time, making concurrency/recovery failures harder to
exercise deterministically.

## Testing strengths

- Strict suite inventory and accepted-skip contract.
- Deep schema parity tests across Zod/AJV.
- Adversarial RequestContext cross-trace/spoof tests.
- Strong process-supervisor tests for argv, identity, races, backpressure and
  cleanup.
- Real Redis concurrency, replacement, reclaim, ACK and namespace cleanup.
- Candidate/SBOM/SCA/lock verification.
- Dry-run E2E through real MCP stdio.

## Release assessment

The candidate is locally promoted but **not release-ready**:

- full gate red twice;
- hero smokes red;
- 12 required-path integrations unavailable;
- real providers untested as a required lane;
- no tag, remote or published artifact;
- final `reviewed = candidate = main = tag = published` gate remains planned.

## Confidence plan

1. Reproduce and fix the full-gate reaper race under identical load.
2. Make both advertised smokes required and persistent-connection based.
3. Add D/0/04 adversarial real execution and restart/reconnect cases.
4. Make reviewer nonzero/KO and lifecycle false completion fail closed.
5. Add risk-weighted mutation/coverage gates for authority, process, artifact,
   approval and lifecycle code.
6. Require disposable PostgreSQL, Redis, Gateway and Temporal in I/0/07.
7. Add protected real-provider evidence before H/0/05 is credited.


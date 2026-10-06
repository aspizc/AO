# Review Submission — V5 Wave 2 Lifecycle Status Fix (Trial 1)

## Diagnosis

The defect was in the stale tool-test expectation, not in the production
orchestration cancellation behavior.

- `gateway/src/tools/orchestration.js` binds `orchestration.pause`,
  `orchestration.resume`, and `orchestration.cancel` directly to their sibling
  service methods.
- `pauseOrchestration` and `resumeOrchestration` call `setStatus`, which
  persists the state, appends an audit event, and returns
  `{ ...session, status }`.
- `cancelOrchestration` intentionally does not call `setStatus`. For an
  existing trace it throws `LIFECYCLE_OUTCOME_REQUIRED`; the tool boundary
  converts that to its declared safe `TOOL_ERROR` MCP envelope. Reading
  `.status` from that envelope therefore produced the observed `undefined`.
- The operator-confirmed V5 Option-B contract in
  `plan/PROJECT_V5/C/1/00.md` and
  `plan/reviews/PROJECT_V5/C_1_0_REBASELINE-2_result.md` requires an existing
  trace to remain active and produce no cancellation audit until a D-owned
  observed outcome exists. It explicitly records
  `LIFECYCLE_OUTCOME_REQUIRED` at the service boundary.
- The older V0 contract and the May tool test expected immediate
  `cancelled`. That expectation was superseded. Git lineage shows the tool
  assertion remained unchanged from `76459d67`, while the accepted
  characterization commit `251bbc046866b2f45fc6b74cb01a450a8d2ed19d`
  changed the service test and the production commit
  `28ff3a20d38119dd377fef8e0dd86faccd5050ec` implemented deferred
  cancellation.

The current public tool catalog declares `TOOL_ERROR` for undeclared safe
failures. Exposing `LIFECYCLE_OUTCOME_REQUIRED` as a new public tool error
would change the public tool contract; that was neither needed for this fix
nor allowed by this lane.

## Characterization and Fix

The required characterization already existed in
`tests/gateway/orchestration_service.test.js`, introduced test-first by
`251bbc0` and made green by `28ff3a2`. It asserts all parts of the accepted
contract: the service throws `LIFECYCLE_OUTCOME_REQUIRED`, the orchestration
remains active, and no cancellation audit is appended. Per the lane brief's
existing-characterization exception, no duplicate characterization commit
was created.

The lane fix commit
`3824ba8c3544c6db816ec072cc950c7aa7efcf30` updates the stale MCP-tool test
to assert the safe error envelope and independently verify the unchanged
active state and absence of a cancellation audit. No production source,
schema, catalog, or policy file changed.

## RED and GREEN Evidence

- Baseline:
  `node --test --test-concurrency=1 tests/gateway/tool_orchestration_task.test.js`
  — **4 pass / 1 fail / 0 skipped**. The old assertion expected
  `status === "cancelled"` and received `undefined`.
- Existing service characterization:
  `node --test --test-concurrency=1 tests/gateway/orchestration_service.test.js`
  — **6 pass / 0 fail / 0 skipped**.
- After the expectation fix:
  `node --test --test-concurrency=1 tests/gateway/tool_orchestration_task.test.js`
  — **5 pass / 0 fail / 0 skipped**.

## Mutation Proof

Disposable copy:
`/tmp/lifecycle-status-mutation.nLVIk6/repo`.

There was no new production guard to mutate because this lane corrected a
stale test. The existing deferred-cancellation guard was nevertheless weakened
to the superseded implementation:

```javascript
return setStatus(traceId, "cancelled", "ORCHESTRATION_CANCELLED");
```

Running
`node --test --test-concurrency=1 tests/gateway/tool_orchestration_task.test.js`
in that copy turned RED: **4 pass / 1 fail / 0 skipped**. The corrected test
failed at the per-guard assertion with `cancelResult.isError` actual
`undefined`, expected `true`. The test therefore kills removal of the
deferred-outcome guard.

## Final Gate

- `node --test --test-concurrency=1 tests/gateway/tool_orchestration_task.test.js`
  — **5 pass / 0 fail / 0 skipped**.
- `tests/gateway/tool_orchestration.test.js` — does not exist, so the
  conditional gate is not applicable.
- Additional orchestration-service suite:
  `node --test --test-concurrency=1 tests/gateway/orchestration_service.test.js`
  — **6 pass / 0 fail / 0 skipped**.
- `npm --prefix gateway run lint -- --no-cache` — **exit 0**.
- `git diff --check` — **exit 0**.

The full `bash scripts/ci.sh` gate was not run, as required by the lane brief.

## Changed-Path Allowlist

- `tests/gateway/tool_orchestration_task.test.js`
- `plan/reviews/PROJECT_V5/WAVE_2_LIFECYCLE_FIX-1_to_review.md`

Pre-existing untracked `gateway/node_modules` was not modified or staged.

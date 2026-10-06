# Project V5 Wave 2 lifecycle status fix Trial 1 — independent review result

Review id: `WAVE_2_LIFECYCLE_FIX-1`

Verdict: `reviewed_OK`

This is a result-only review of the lifecycle-status defect. It does not
integrate or promote the candidate and does not authorize the deferred C/D
splice.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 0 | None |
| P1 | 0 | None |
| P2 | 0 | None |

## Candidate identity and scope

- Accepted Wave 2 base: `96091cb`.
- Test correction: `3824ba8c3544c6db816ec072cc950c7aa7efcf30`.
- Review handoff / reviewed HEAD: `69fc3f1`.
- `96091cb..69fc3f1` changes exactly:
  - `tests/gateway/tool_orchestration_task.test.js`; and
  - `plan/reviews/PROJECT_V5/WAVE_2_LIFECYCLE_FIX-1_to_review.md`.
- The technical commit changes only the test; the handoff commit changes only
  the review request. No coordination, session-port, fitness, migration,
  `ci/**`, production source, or `plan/PROJECT_V5/**` sheet path is in the
  range.
- The pre-existing untracked `gateway/node_modules` symlink was neither
  modified nor staged.

Scope is clean for this defect.

## Contract evidence quoted from the cited sources

The governing sheet is explicit at
`plan/PROJECT_V5/C/1/00.md:124-127`:

> The reviewed cancellation contract keeps an existing trace active and
> returns static `LIFECYCLE_OUTCOME_REQUIRED` until a D-owned observed outcome
> exists; it emits no cancellation audit and does not expand C into process
> ownership.

The cited independent rebaseline result is equally explicit at
`plan/reviews/PROJECT_V5/C_1_0_REBASELINE-2_result.md:146-152`:

> The existing orchestration service first checks trace existence:
>
> - an unknown trace throws `ORCHESTRATION_NOT_FOUND`;
> - an existing trace throws the static `LIFECYCLE_OUTCOME_REQUIRED`;
> - no status writer or audit append is reached;
> - the existing orchestration therefore remains `active`; and
> - no cancellation audit or lifecycle transition is created.

It also limits the temporary boundary at lines 154-158:

> The dedicated CORE lifecycle service exposes no caller-facing cancellation
> method. The reducer's server-owned cancellation action is state-only and
> makes no process-termination claim. No D-owned process/runtime path is
> present in the technical path set.

The handoff's contract citation is therefore accurate and strong enough to
supersede the old immediate-`cancelled` assertion.

## Contract-derived expectation ruling

The rewritten test is contract-derived, not a mirror of the current
implementation:

- it requires the tool call to fail;
- it requires the declared safe public `TOOL_ERROR` envelope;
- it independently reloads the orchestration and requires `active`; and
- it requires the exact audit sequence to contain no cancellation event.

Those are independent observations of the quoted error/state/audit contract.
The generic tool error is also the declared catalog behavior rather than an
accidental implementation shape: `orchestration.cancel` publicly allows
`INVALID_INPUT`, `TOOL_ERROR`, `REQUEST_CONTEXT_DENIED`, and
`ORCHESTRATION_NOT_FOUND`, but not the internal
`LIFECYCLE_OUTCOME_REQUIRED`; `safeToolErrorBody` consequently maps that
undeclared service code to `TOOL_ERROR` with `tool operation failed`.

The tool test cannot and should not expose the hidden service code. The
adjacent service characterization separately asserts the exact
`LIFECYCLE_OUTCOME_REQUIRED` code, unchanged `active` state, and absent
cancellation audit. Together, the tests cover both boundaries.

## Behavior and observed-outcome path

Independent source inspection and execution confirm the current temporary
boundary:

- `gateway/src/tools/orchestration.js` binds pause, resume, and cancel directly
  to the sibling orchestration-service methods.
- Pause and resume call `setStatus`, which persists, audits, and returns the
  effective status.
- For an existing trace, `cancelOrchestration` reaches neither the status
  writer nor the audit append and throws `LIFECYCLE_OUTCOME_REQUIRED`.
- Through the tool boundary this becomes the declared safe `TOOL_ERROR`;
  re-reading the trace returns `active`, with no cancellation audit.

There is no public or application-service path on this reviewed branch that
accepts a D-observed outcome and then makes `orchestration.cancel` succeed.
The dedicated lifecycle service deliberately exposes no cancellation method.
The pure reducer does admit server-owned `ORCHESTRATION_CANCEL` and
`TASK_CANCEL` transitions to `cancelled`, and the reducer suite covers those
state-only outcomes, including confirmed-D-outcome evidence for task
cancellation. The real observed-outcome-to-service route belongs to the still
open C/D splice. Its absence here is the explicitly reviewed temporary
boundary, not a missing success branch introduced or concealed by this
test-only correction.

## Independent mutation proof

All mutations were made only in disposable
`/tmp/fxlif-mutation.u4cPNn`; the review worktree source and tests were not
changed.

1. Required immediate-cancellation mutation:

   ```js
   return setStatus(traceId, "cancelled", "ORCHESTRATION_CANCELLED");
   ```

   Focused test result: exit **1**, **4 pass / 1 fail**. The corrected test
   failed at line 57 because `cancelResult.isError` was `undefined`, not
   `true`.

2. Error-after-cancellation mutation:

   ```js
   setStatus(traceId, "cancelled", "ORCHESTRATION_CANCELLED");
   throw codedError(
     "server-owned cancellation outcome required",
     "LIFECYCLE_OUTCOME_REQUIRED",
   );
   ```

   Focused test result: exit **1**, **4 pass / 1 fail**. The safe error
   assertion passed, then the corrected test failed at line 67 because the
   persisted status was `cancelled`, not `active`.

3. Cancellation-audit-only mutation: append
   `ORCHESTRATION_CANCELLED` while retaining `active`, then throw the declared
   service error.

   Focused test result: exit **1**, **4 pass / 1 fail**. The error and state
   assertions passed, then the corrected test failed at line 70 because the
   audit sequence contained the extra `ORCHESTRATION_CANCELLED` event.

The rewritten test therefore reddens if cancellation starts succeeding, if a
failed call mutates state, or if a failed call manufactures cancellation
evidence. It is load-bearing against the relevant regressions.

## Gate outputs

All commands were run from reviewed HEAD `69fc3f1` unless explicitly marked as
a disposable replay.

| Gate | Result |
|---|---|
| Disposable pre-change replay of `3824ba8^`: `node --test --test-concurrency=1 tests/gateway/tool_orchestration_task.test.js` | exit **1**; **4 pass / 1 fail / 0 skip**; old assertion received `undefined` instead of `cancelled` |
| `node --test --test-concurrency=1 tests/gateway/tool_orchestration_task.test.js` | exit **0**; **5 pass / 0 fail / 0 skip** |
| `node --test --test-concurrency=1 tests/gateway/orchestration_service.test.js` | exit **0**; **6 pass / 0 fail / 0 skip** |
| Nine adjacent MCP/tool/catalog/context/service suites | exit **0**; **66 pass / 0 fail / 0 skip** |
| Four lifecycle reducer/repository/service/PostgreSQL-statement suites | exit **0**; **23 pass / 0 fail / 0 skip** |
| `npm --prefix gateway run lint -- --no-cache` | exit **0** |
| `git diff --check` | exit **0** |

The adjacent 66-test run comprised
`mcp_bootstrap`, `orchestrator_profile_contract`, `otel_tool_spans`,
`request_context`, `request_context_boundary`, `task_service`, `tool_agent`,
`tool_catalog`, and `tool_schema_projection`. The lifecycle 23-test run
comprised `lifecycle_rebaseline_core_reducer`,
`lifecycle_rebaseline_core_repository`,
`lifecycle_rebaseline_core_service`, and
`lifecycle_rebaseline_postgres_statement`.

`bash scripts/ci.sh` was not run, as required.

## What I did and did not verify

I verified the two cited contract artifacts by direct quotation; inspected the
test diff, tool binding, service behavior, public error mapping, lifecycle
service/reducer boundary, and complete candidate path set; replayed the
pre-change failure; executed the focused and adjacent gates; and independently
mutation-proved the error, state, and audit assertions.

I did not exercise live PostgreSQL, network services, providers, Redis, MCP
transports outside the local test fixtures, real processes, or the blocked C/D
splice. I did not run the repository-wide CI script. I changed no source,
test, sheet, or prior review artifact and make no integration, promotion, or
release claim.

## Final verdict

`reviewed_OK`

The stale immediate-cancellation expectation contradicted the explicit
operator-confirmed Option-B contract. The replacement asserts that contract at
the public tool boundary and independently turns red for the relevant
cancellation regressions.

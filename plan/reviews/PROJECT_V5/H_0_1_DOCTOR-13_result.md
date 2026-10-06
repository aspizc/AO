# Independent Review Result — Project V5 H/0/01 DOCTOR (Trial 13)

## Verdict

reviewed_OK

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |

The Trial 13 amendment is honest and faithfully matches the
operator-ratified Option B decision. It narrows only the infeasible universal
Python-function condition to the two retirement/lifecycle-specific surfaces:
an issued DTO has no `__del__`, and the callback discovered through its
issuance weak reference remains slots-only with the built-in `id` call
surface. It does not waive the accepted exact sweep, callback cleanup,
displaced-value ordering, irreversible taint, or atomic-admission controls.

The amendment does not claim same-process isolation. It explicitly records
ordinary pure-Python dunder `__func__.__dict__` reflection as residual
`V5-H-0-01-D01`, identifies the required same-process/live-object/module
privilege, and assigns closure to D/0/02. No finding blocks acceptance at the
ratified narrowed criterion.

## Frozen identity and exact pathset

- Operator-ratified Option B:
  `e74353b493ef09fbfdadf8bf9cd78536b9803dd8`
- Ratification tree:
  `f80d596ceb8cf3c49cc3a8f141faa19e3e69ba26`
- Reviewed amendment:
  `6b3021d0c4337b050563063528b86f8d3835f9de`
- Reviewed tree:
  `0039a09c294ec5028e9fc026e0a874d2e67a2238`
- Amendment parent:
  `e74353b493ef09fbfdadf8bf9cd78536b9803dd8`
- Review-request HEAD:
  `6e35f85e15dd6fc711198bbface87e06d15263cd`
- Review branch:
  `review/V5-H-0-01-doctor-13`

The amendment commit has exactly this pathset:

```text
M docs/doctor.md
A plan/PROJECT_V5/DEFERRED.md
M plan/PROJECT_V5/H/0/01.md
M tests/cli/test_doctor.py
```

The independently observed line counts match the submission:

```text
docs/doctor.md              +26 / -4
plan/PROJECT_V5/DEFERRED.md +25 / -0
plan/PROJECT_V5/H/0/01.md   +30 / -0
tests/cli/test_doctor.py    +11 / -9
```

The request commit changes only
`plan/reviews/PROJECT_V5/H_0_1_DOCTOR-13_to_review.md`. The production Doctor
source and result schema are outside the amendment pathset. The current and
Trial 12 Doctor source blobs independently match:

```text
cli/src/agents_cli/doctor.py
  7b4c178411b93cbcf6d3a32ba82ce4ba66861a54
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
```

`git diff --check` and
`git diff --check e74353b493ef09fbfdadf8bf9cd78536b9803dd8..6b3021d0c4337b050563063528b86f8d3835f9de`
both passed.

## Per-point adjudication

| Review point | Result | Independent evidence |
|---|---|---|
| Faithful to ratification | **Passed** | The sheet defines only the absent DTO `__del__` and slots-only built-in discovered callback as the retirement criterion, retains all exact guards, and assigns ordinary dunders to D/0/02 (`plan/PROJECT_V5/H/0/01.md:65-92,158-163`). Doctor documentation makes the same two-surface claim and explicitly says it is not universal Python-function or same-process isolation (`docs/doctor.md:104-135`). This is exactly Option B; it does not widen the accepted boundary. |
| No false green | **Passed** | The former broadly named test is narrowed to `test_retirement_specific_surfaces_expose_no_python_function_state`. Its two cases explicitly check the discovered callback call surface and absence of DTO `__del__`; the comment names other dunders as the D/0/02 boundary (`tests/cli/test_doctor.py:1884-1901`). No xfail, skip, or skip marker exists in the Doctor test file. The existing all-DTO callback-state and assignment-form retention tests remain active (`tests/cli/test_doctor.py:1595-1630,1692-1781`). |
| Trial 12 hardening intact | **Passed** | The source blob is unchanged from Trial 12. `_RetirementCallback` is slots-only and uses built-in `id`; the private callback-authority map and post-GC sweep require exact callback type, built-in weakref type, dead referent, record/reference/key identity, and authority identity before matching ledger/map cleanup (`cli/src/agents_cli/doctor.py:102-156`). `_OpaqueDTO` has no `__del__` (`cli/src/agents_cli/doctor.py:240-274`). Pre-issuance sweeping and exact record creation remain under the issuance lock (`cli/src/agents_cli/doctor.py:351-361`). |
| Displaced value, taint, and atomic admission preserved | **Passed** | Supported set/delete still retain the displaced value through mutation, taint before storage mutation, and release the prior value only after leaving the lock (`cli/src/agents_cli/doctor.py:173-206`). Final admission still rechecks the exact ledger record, live referent, key, type, and irreversible taint under the same lock (`cli/src/agents_cli/doctor.py:383-440`). The directed selection and both complete inventories passed. |
| Exact retention/lifecycle behavior preserved | **Passed** | Both assignment forms for the callback call surface and both DTO `__del__` discovery routes remain covered. The callback cannot retain the binding/probe graph; the absent DTO lifecycle route cannot do so; manual lifecycle invocation cannot remove a live exact record (`tests/cli/test_doctor.py:1692-1917`). The complete inventories also retain stale-record, bounded-ledger, callback-map, concurrency, and displaced-value cases. |
| DEFERRED register honest | **Passed** | `V5-H-0-01-D01` states the dunder-function residual, pure-Python/stdlib infeasibility reason, D/0/02 owner, same-process plus live DTO/referent plus loaded-module privilege, demonstrated retention impact, retained Trial 12 mitigations, and closure alternatives (`plan/PROJECT_V5/DEFERRED.md:8-25`). The register explicitly says DEFERRED is not a passing test, implemented behavior, or release claim (`plan/PROJECT_V5/DEFERRED.md:3-6`). Its evidence and D/0/02 links resolve. |
| Canonical status and claim boundary | **Passed** | The sheet remains `in_progress`, identifies only the previously integrated SAMPLE slice, and leaves Doctor, probes, portability, and the final exit gate open (`plan/PROJECT_V5/H/0/01.md:3-9`). The docs disclaim Doctor command wiring, a passing review, and completion (`docs/doctor.md:4-7`) and explicitly assign hostile same-process isolation to D/0/02 (`docs/doctor.md:125-135`). The amendment makes no integration, promotion, publication, or release claim. |

## Independent matrix evidence

The first sandboxed attempts were refused by Snap confinement before pytest
started. They are not counted as evidence. The successful commands ran
outside that confinement under the scoped approval and used:

```text
uv run --offline --no-project --python <3.13|3.11>
  --with pytest --with jsonschema
  env PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src
  python -m pytest -q -p no:cacheprovider
  --basetemp=/tmp/h001-doctor-review-h13-<lane>-<runtime>
```

The submitted 21-case retirement/lifecycle selection was rerun unchanged:

```text
Python 3.13: 21 passed, 292 deselected in 0.80s
Python 3.11: 21 passed, 292 deselected in 1.00s
```

One complete `tests/cli/test_doctor.py` inventory was then run per required
runtime:

```text
Python 3.13: 313 passed in 14.93s
Python 3.11: 313 passed in 17.84s
```

There were no skips. The case counts exactly reproduce the submitted totals;
only elapsed time differs. Because the complete inventories include the
committed concurrency, weak-reference, stale-record, cleanup,
displaced-value, taint, and admission regressions, those behaviors were
executed on both runtimes even though the submitted 17-case concurrency
selection was not repeated as a separate filtered command.

## Scope and limits

Independently verified:

- the ratification, amendment, request lineage, trees, exact amendment
  pathset, line counts, and frozen source/schema identities;
- the exact narrowed plan, Doctor documentation, criterion test, and deferred
  entry against the operator-ratified Option B text;
- preservation of Trial 12 source, criterion/retention/manual regressions,
  sweep identity guards, callback cleanup, displaced-value ordering,
  irreversible taint, and atomic admission;
- the 21-case directed selection and complete 313-test Doctor inventory on
  Python 3.13 and Python 3.11; and
- documentation targets and diff hygiene.

Not separately rerun:

- the submitted filtered concurrency, structure, schema
  syntax/self-validation, or Ruff lanes;
- aggregate CI or repository/application installation; or
- network access, a real provider, Redis, Gateway, MCP, KYA, tmux, shared
  services, portability, integration, promotion, publication, or release.

No bespoke GC/weak-reference experiment was used. This verdict does not claim
protection against the explicitly deferred same-process dunder-reflection
residual and does not claim completion of H/0/01.

# Independent Review Result — Project V5 H/0/01 DOCTOR (Trial 11)

## Verdict

reviewed_KO

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 1 |

Trial 11 closes the exact Trial 10 spelling
`reference.__callback__.__call__.__func__.__dict__`. The discovered callback
now exposes the immutable built-in `id` call surface, not a Python bound
method, and both frozen regression cases pass on Python 3.13 and Python 3.11.

The broader no-equivalent-retention claim is not closed. The implementation
moved retirement to `_OpaqueDTO.__del__`, and that finalizer is the ordinary
Python function `_retire_issued_dto`. Starting from the same live issued DTO
or the referent returned by its standard issuance reference, the equivalent
function-state authority is therefore reachable as:

```python
binding.__del__.__func__.__dict__["retained"] = binding
setattr(binding.__del__.__func__, "retained", binding)
```

The function remains rooted by the loaded doctor module and `_OpaqueDTO`.
Neither new regression traverses the issued DTO's lifecycle method; they stop
at `reference.__callback__.__call__`. Thus the tests prove the named callback
route is absent but do not prove the submitted claim that no sibling spelling
can retain the binding/probe graph and prevent lifecycle retirement.

The provider content filter blocked the reviewer's attempted bespoke runtime
probe of this sibling route. Per the recorded-without-running audit, no runtime
collection count from that attempt is credited below. The finding is grounded
in the reviewed source's exposed ordinary Python function and the demonstrable
test gap; this result does not claim an independently measured GC total for
the sibling route.

## Frozen identity and exact pathsets

- Trial 10 result base:
  `708f4d54987727b5c185de6167228a6e269f4410`
- Base tree:
  `898f7307def69ed7c36fcd5008afbcf31e58ed75`
- Tests-only RED:
  `13cd5fe586a3fe829d2fbce4ca0a75037b1e9403`
- Tests-only RED refinement:
  `688b24c0be0d1c2e8880bd13658439cacbbe7af4`
- Source-only technical candidate:
  `f809a404ae08358568307f204d957ba937a79312`
- Task-owned documentation:
  `586844799d45936a1a60ec302eb5898715b37998`
- Request-only reviewed HEAD:
  `36cc1c8fcc8f2bbd36ee79dec9331886bc8d3dcf`
- Request tree:
  `b22a163e4b76180ff455f3513b52711f0eedca12`
- Review branch:
  `review/V5-H-0-01-doctor-11`

The lineage is exact and linear:

```text
708f4d54987727b5c185de6167228a6e269f4410
  -> 13cd5fe586a3fe829d2fbce4ca0a75037b1e9403
  -> 688b24c0be0d1c2e8880bd13658439cacbbe7af4
  -> f809a404ae08358568307f204d957ba937a79312
  -> 586844799d45936a1a60ec302eb5898715b37998
  -> 36cc1c8fcc8f2bbd36ee79dec9331886bc8d3dcf
```

Commit-local pathsets are exact:

```text
13cd5fe  M tests/cli/test_doctor.py       +88 /  -0
688b24c  M tests/cli/test_doctor.py        +5 /  -1
f809a40  M cli/src/agents_cli/doctor.py   +28 / -12
5868447  M docs/doctor.md                 +13 / -11
36cc1c8  A plan/reviews/PROJECT_V5/H_0_1_DOCTOR-11_to_review.md
```

The exact net technical/documentation candidate pathset from the Trial 10
result through `5868447` is:

```text
cli/src/agents_cli/doctor.py  +28 / -12
docs/doctor.md                +13 / -11
tests/cli/test_doctor.py      +92 /  -0
```

The frozen candidate blobs independently matched the request:

```text
cli/src/agents_cli/doctor.py
  50ceeaa28c39bd8ca2d5087a61b993abf087893d
tests/cli/test_doctor.py
  92406f80546c9b3e094e32a62a0fffaff932ae53
docs/doctor.md
  8022c41a3651cfbe3aeb474cee5a9345d6d03791
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
```

## RED validity

Passed.

The refined RED tree at `688b24c` was exported to an isolated temporary
directory. Its blobs were independently checked:

```text
cli/src/agents_cli/doctor.py
  77230a1bdaa281f31f9ab56c511e2cc665dc8c4a
tests/cli/test_doctor.py
  92406f80546c9b3e094e32a62a0fffaff932ae53
```

Thus it combined the unchanged Trial 10 source with the frozen Trial 11 tests.
The reviewer ran:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor11-review-red-py313 \
  tests/cli/test_doctor.py \
  -k 'callback_call_function_state_cannot_retain_binding_and_probe'
```

```text
Python 3.13: 2 failed, 304 deselected in 0.22s
```

The identical command used `--python 3.11` and basetemp
`/tmp/h001-doctor11-review-red-py311`:

```text
Python 3.11: 2 failed, 304 deselected in 0.25s
```

For both `function_dict` and `direct_function_attribute`, all intermediate
retention assertions passed: the binding, probe capability, issuance-reference
referent, and ledger record remained live. Cleanup then reclaimed the graph.
Both cases failed only at the intended final assertion
`assert route_writable is False`. This is a deterministic, causally valid RED
for the exact Trial 10 defect and its same-authority spelling.

## Exact Trial 10 closure

Passed for the named route.

`_RetirementCallback.__call__ = id` at
`cli/src/agents_cli/doctor.py:101-106`. The callback has empty slots, and its
call surface is a built-in function with no Python bound-method `__func__` or
writable function dictionary. Manual invocation of the discovered callback
computes `id(reference)` and does not mutate the ledger.

The sealed candidate passed the complete directed Trial 10 plus Trial 11
selection on both runtimes:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor11-review-green-py313-directed \
  tests/cli/test_doctor.py \
  -k 'descriptor_mutation_releases_previous_probe_before_finalizer_waits or
      every_discovered_retirement_callback_has_no_writable_standard_state or
      scalar_callback_rewrite_cannot_leave_a_stale_issuance_record or
      callback_self_cycle_cannot_retain_a_binding_or_probe_capability or
      callback_call_function_state_cannot_retain_binding_and_probe'
```

The identical Python 3.11 command used basetemp
`/tmp/h001-doctor11-review-green-py311-directed`.

```text
Python 3.13: 14 passed, 292 deselected in 0.59s
Python 3.11: 14 passed, 292 deselected in 0.67s
```

These results bind the exact callback closure: both new cases would fail
against Trial 10 and pass with the immutable built-in call surface.

## P2 finding

### P2 — Retirement was moved to another callback-reachable Python function dictionary

`_retire_issued_dto` is declared as an ordinary Python function at
`cli/src/agents_cli/doctor.py:112-133`, then installed as
`_OpaqueDTO.__del__` at `:226-228`. Every sealed public DTO inherits this
method.

Consequently, while Trial 11 removes:

```text
reference.__callback__.__call__.__func__.__dict__
```

it exposes the same writable function authority on the issued referent:

```text
reference().__del__.__func__.__dict__
```

or, when the caller still holds the issued object:

```text
binding.__del__.__func__.__dict__
```

This route does not traverse `function.__globals__`, read or mutate a private
module map, mutate a DTO class, or mutate a Python builtin. It uses the
supported public DTO and standard weak-reference/referent surfaces. A stored
binding is then rooted by the lifecycle function that must run to retire it,
which is the same self-preventing lifecycle shape as Trial 10.

The new regression at `tests/cli/test_doctor.py:1692-1781` retrieves only:

```python
callback = issuance_reference.__callback__
bound_call = callback.__call__
function = getattr(bound_call, "__func__", None)
```

It never inspects `issuance_reference()` or the issued DTO's `__del__`.
Similarly, `mutate_standard_callback_state` at
`tests/cli/test_doctor.py:956-987` mutates only the callback instance. Deleting
or reverting the lifecycle-function safety assumption would therefore leave
all supplied Trial 11 assertions green. This fails the unbound-conjunct audit.

Source inspection also finds an authenticated-then-unbound gap in the same
lifecycle surface. A caller can invoke `binding.__del__()` while the binding
is live. `_retire_issued_dto` explicitly accepts a non-dead reference when
`referent is value` (`cli/src/agents_cli/doctor.py:121-127`), then deletes the
exact ledger record and callback-key entry (`:129-131`). This consequence was
not separately executed after the provider filter blocked the bespoke probe,
so it is recorded as supporting source evidence rather than a second counted
finding.

This remains P2, consistent with Trials 8–10. The route can defeat bounded
lifecycle retirement and retain a DTO/capability graph, while the reviewed
admission path remains fail-closed and no unsafe result projection was shown.

Required correction:

- ensure the lifecycle mechanism does not expose another ordinary Python
  function dictionary through the public issued DTO or discovered weak
  reference;
- prove both `__dict__` assignment and direct function-attribute assignment
  cannot retain an issued binding and weak-referenceable probe;
- prove public/manual lifecycle-method invocation cannot remove a live exact
  record;
- preserve the exact-record/reference/callback guard, callback-map cleanup,
  displaced-value release, and irreversible taint/atomic admission; and
- add a minimal regression that would turn red if either the callback call
  surface or the DTO lifecycle surface regained Python function state.

## Exact retirement and lifecycle adjudication

Partially passed; blocked by the P2 above.

For genuine finalization, `_retire_issued_dto` computes the live object's exact
integer key and holds `_ISSUANCE_LOCK` while requiring:

- the current exact ledger record;
- that record's exact built-in reference;
- an exact `_RetirementCallback`;
- the callback-to-key map's matching scalar key;
- either a dead reference or the exact finalizing object; and
- the ledger still containing the same record identity.

It deletes the ledger record before deleting the still-matching callback-key
entry. Exceptions are contained without output. The exact checks prevent the
reviewed source from using a stale record to delete a replacement.

However, the mechanism's public Python `__del__` surface is itself the
remaining retention/unbinding authority, so the complete lifecycle claim
cannot pass.

## Preserved Trial 10 behavior

Passed within the executed coverage.

`_TrackedSlot.__set__` and `__delete__` are unchanged from Trial 10. Each
retains the previous value under `_ISSUANCE_LOCK`, taints before raw storage
mutation, exits the lock, and only then releases `previous`. The directed
matrix's two set/delete cases passed on both runtimes.

The admission transaction remains unchanged: recursive capture records exact
issuance metadata and the final locked verification is still the
linearization point. No source change weakened irreversible taint or
atomicity. The full doctor inventories below also include the preserved
sequential and concurrency regressions.

## Complete DOCTOR inventory

The reviewer ran one full pass per required runtime:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor11-review-green-py313-full \
  tests/cli/test_doctor.py
```

```text
Python 3.13: 306 passed in 13.08s
```

The identical Python 3.11 command used basetemp
`/tmp/h001-doctor11-review-green-py311-full`:

```text
Python 3.11: 306 passed in 16.03s
```

No test was skipped. An initial sandboxed `uv` attempt was refused by
Snap confinement before pytest started and is not counted. The successful
commands ran offline outside that confinement. `uv --version` reported
`uv 0.11.21`.

## Submitted matrix completeness

The request includes the complete Trial 10 matrix set on Python 3.13 and 3.11:
full DOCTOR, directed retention/displaced-value, preserved concurrency and
weakref, Trial 7 adversarial, amended Trial 8 lifecycle, structure, schema,
Ruff, and diff checks. Its totals are internally consistent with the 306-case
inventory:

```text
directed:    14 passed + 292 deselected = 306
concurrency: 17 passed + 289 deselected = 306
Trial 7:    116 passed + 190 deselected = 306
Trial 8:     69 passed + 237 deselected = 306
full:       306 passed
structure:    8 passed
schema:       2/2 per runtime
```

The reviewer independently reran the directed and full DOCTOR inventories on
both runtimes, as required. The five repeated directed runs, separate
concurrency/Trial 7/Trial 8 selections, structure tests, schema commands, Ruff,
and repository diff checks were inspected in the frozen request but were not
independently rerun in this result.

## Scope honesty and documentation

Passed.

`docs/doctor.md:94-103` continues to limit the claim to the public DTO,
descriptor, and weak-reference surface. It explicitly excludes traversal
through function globals/private authority, doctor-module mutation, DTO-class
mutation, private maps, and Python builtins, and assigns hostile same-process
isolation to D/0/02. It does not broaden this stdlib preflight into a
same-process isolation, runtime probe, integration, or release claim.

The P2 route above does not rely on any of those exclusions; it reaches a
writable function dictionary directly through the newly public lifecycle
method.

## Declared coverage and limits

Independently verified:

- exact branch, HEAD, lineage, technical pathsets, and candidate blobs;
- refined RED source/test identity;
- exact two-case RED on Python 3.13 and Python 3.11;
- exact 14-case GREEN directed selection on both runtimes;
- one full 306-test DOCTOR pass on both runtimes;
- source-level callback, lifecycle, exact-record, lock-release,
  taint/atomicity, and documentation review; and
- declared matrix-total consistency.

Not independently verified:

- a runtime GC total for the finalizer-function sibling route, because the
  provider content filter blocked the attempted bespoke probe;
- the request's five repeated directed runs;
- separately selected concurrency, Trial 7, and Trial 8 matrices;
- structure, schema, Ruff, and diff commands;
- aggregate CI, repository/application installation, network, providers,
  Redis, Gateway, MCP, KYA, portability, integration, promotion,
  publication, or release.

This result adjudicates only the Trial 11 DOCTOR correction. It makes no
integration, promotion, completion, publication, or release claim.

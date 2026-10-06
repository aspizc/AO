# Review Submission - Project V5 H/0/01 DOCTOR (Trial 13)

## Requested reviewer

Please assign an independent reviewer that did not implement this trial. Review
the frozen repository evidence and write the verdict only to:

```text
plan/reviews/PROJECT_V5/H_0_1_DOCTOR-13_result.md
```

The result must use `reviewed_OK` or `reviewed_KO`, list every P0/P1/P2
finding, and identify the exact reviewed commit and pathset. A result commit
must change only that result file.

## Operator-ratified decision and review boundary

Trial 13 implements the operator-ratified Option B decision at:

```text
e74353b493ef09fbfdadf8bf9cd78536b9803dd8
tree f80d596ceb8cf3c49cc3a8f141faa19e3e69ba26
docs(review): ratify Option B (accept residual as D/0/02 scope) (V5 H/0/01)
```

The decision accepts the Trial 12 proof that Option A's absolute condition is
infeasible for a normal pure-Python object, narrows the DOCTOR criterion to
retirement-specific surfaces, keeps the Trial 12 hardening, and assigns the
unavoidable dunder reflection residual to D/0/02.

This review covers:

- the exact narrowed retirement/lifecycle criterion;
- why the former absolute Option A condition is infeasible in pure Python;
- preservation of the Trial 12 `__del__` removal, built-in callback, exact
  sweep, cleanup, mutation ordering, taint, and atomic admission;
- the criterion-test adjustment without a false universal assertion;
- H/0/01 and Doctor boundary documentation;
- the new Project V5 deferred-register entry and D/0/02 ownership; and
- the required dual-runtime Doctor, concurrency, structure, schema, and Ruff
  matrices.

It does not cover CLI wiring, runtime probes, providers, Redis, Gateway, MCP,
KYA, integration, promotion, publication, release, or the complete H/0/01
exit gate.

## Narrowed criterion

The ratified DOCTOR criterion is:

> Retirement/lifecycle-specific writable authority exposed through an issued
> DTO or its discovered issuance weak reference carries no ordinary Python
> function state. An issued DTO has no `__del__` retirement hook, and the
> discovered weak-reference callback is slots-only with a built-in call
> surface.

The criterion deliberately does not claim that a normal Python object exposes
no ordinary functions. Inherited, generated, and class-defined non-retirement
dunders are the documented same-process reflection boundary owned by D/0/02.
That boundary does not permit reintroducing `__del__`, a Python callback call
surface, weak sweep guards, stale cleanup, reversible taint, or non-atomic
admission.

## Why Option A was infeasible

The Trial 12 independent reviewer enumerated the ordinary bound dunder
functions reachable from an issued `ProbeBinding`:

```text
Python 3.13:
  __delattr__, __eq__, __getstate__, __init__, __replace__, __repr__,
  __setattr__, __setstate__, __str__

Python 3.11:
  __delattr__, __eq__, __getstate__, __init__, __repr__,
  __setattr__, __setstate__, __str__
```

The reviewer demonstrated both direct function-attribute assignment and
`function.__dict__` assignment through representative `__repr__`, `__eq__`,
and `__init__` routes. Each route could retain a binding, weak-referenceable
probe, issuance referent, and ledger entry until the injected function state
was removed.

This is inherent to a normal Python class: ordinary Python methods have
writable function dictionaries, and a bound method exposes its function as
`__func__`. Reaching zero such surfaces would require a non-Python built-in or
compiled extension DTO. That contradicts the scope of this stdlib-only
preflight and is not a proportionate H/0/01 correction. The operator therefore
ratified Option B instead of A-hard.

The residual is not waived silently. It requires all of:

- same-process Python execution;
- a live issued DTO or the live referent returned by its issuance weak
  reference; and
- the loaded Doctor module.

Those privileges are the D/0/02 process/object-authority boundary.

## What remains unchanged from Trial 12

The production source was not modified in Trial 13. Its blob remains:

```text
cli/src/agents_cli/doctor.py
  7b4c178411b93cbcf6d3a32ba82ce4ba66861a54
```

The retained Trial 12 design still provides:

1. no `_OpaqueDTO.__del__` lifecycle method;
2. a slots-only `_RetirementCallback` whose call surface is built-in `id`;
3. a private callback-to-`(key, exact weakref)` authority map;
4. post-GC and pre-issuance retirement under `_ISSUANCE_LOCK`;
5. exact callback, authority tuple, weakref, ledger key, record, and record
   reference identity guards;
6. matching ledger and callback-authority cleanup only after the referent is
   dead;
7. stale-record protection and bounded retirement;
8. displaced-value release only after leaving `_ISSUANCE_LOCK`;
9. irreversible taint before supported storage mutation; and
10. the same recursive admission linearization point.

The existing Trial 12 retention, manual lifecycle invocation, stale record,
bounded ledger, displaced-value, and concurrency regressions remain in the
complete Doctor inventory.

## Test-criterion amendment

The prior two-case test was renamed from:

```text
test_retirement_surfaces_expose_no_python_function_state
```

to:

```text
test_retirement_specific_surfaces_expose_no_python_function_state
```

Its two explicit cases now state the exact narrowed surfaces:

- `discovered_weakref_callback_call` checks that the built-in callback call
  surface has no ordinary Python `__func__`; and
- `dto_del_retirement_hook` checks that the issued DTO has no `__del__`.

The test comments identify other Python dunders as the documented D/0/02
reflection boundary. It does not enumerate every dunder, does not assert the
infeasible universal condition, and does not convert the residual into a false
green. No xfail or skip was added. Test inventory remains 313 cases.

The four Trial 12 assignment-form/lifecycle-route retention cases and the
manual live-record case were not weakened.

## Deferred residual

Trial 13 creates:

```text
plan/PROJECT_V5/DEFERRED.md
```

Entry `V5-H-0-01-D01` records:

- **residual:** pure-Python dunder `__func__.__dict__` reflection can retain an
  issued DTO, probe capability, and otherwise-retirable ledger record;
- **reason:** zero reachable ordinary Python function dictionaries is
  infeasible for a normal pure-Python class in this stdlib-only preflight;
- **owner:** `D/0/02`;
- **required privilege:** same-process execution, a live issued DTO or live
  issuance-reference referent, and the loaded Doctor module;
- **demonstrated impact:** retention and delayed retirement, with no admission
  bypass or unsafe result projection demonstrated;
- **retained mitigation:** the complete Trial 12 lifecycle hardening; and
- **closure:** D/0/02 removes shared process/object authority, or a separately
  scoped review authorizes non-Python built-in/compiled DTOs.

The register states that `DEFERRED` is not a passing test, implemented behavior,
or release claim.

## Commit and frozen candidate

The Trial 13 amendment commit is:

```text
6b3021d0c4337b050563063528b86f8d3835f9de
tree 0039a09c294ec5028e9fc026e0a874d2e67a2238
parent e74353b493ef09fbfdadf8bf9cd78536b9803dd8
docs(doctor): narrow retirement reflection criterion (V5 H/0/01 Trial 13)
```

Its exact pathset is:

```text
M docs/doctor.md
A plan/PROJECT_V5/DEFERRED.md
M plan/PROJECT_V5/H/0/01.md
M tests/cli/test_doctor.py
```

Net line counts:

```text
docs/doctor.md              +26 / -4
plan/PROJECT_V5/DEFERRED.md +25 / -0
plan/PROJECT_V5/H/0/01.md   +30 / -0
tests/cli/test_doctor.py    +11 / -9
```

Frozen blobs:

```text
cli/src/agents_cli/doctor.py
  7b4c178411b93cbcf6d3a32ba82ce4ba66861a54
tests/cli/test_doctor.py
  5c3b8e8b6675344cdde1397f2d4259960ed15056
docs/doctor.md
  4c65127011aa864290a85afd65b784b34aa27f38
plan/PROJECT_V5/H/0/01.md
  1a83bc72e9285c72662a5834cbf33e30011ab8e2
plan/PROJECT_V5/DEFERRED.md
  225096fb55b375fc507bfd439582b2fb6a86ff3c
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
```

No Doctor source, schema, shared plan index, manifest, lock, workflow,
suite-inventory, Gateway, or JavaScript file changed in Trial 13.

## TDD and decision lineage

Trial 13 is an operator-ratified criterion amendment, not a new production
behavior. The Trial 12 KO is the decision-level RED: it proved that the former
absolute acceptance condition fails despite the correct Trial 12 retirement
implementation. The operator then ratified the narrower feasible criterion.
No production GREEN was needed or permitted; the Trial 12 source stays frozen.

The adjusted criterion test passed first in the preserved 21-case directed
selection before the documentation amendment was committed. The complete
dual-runtime matrices below then proved that the accepted implementation and
all guards remained green.

## Reproducible verification

All required Trial 13 matrices ran. None was skipped.

Cached/offline tool identities:

```text
uv 0.11.21
Python 3.13.13
Python 3.11.15
pytest 9.1.1
jsonschema 4.26.0
Ruff 0.16.0
```

Every `uv` command used `--offline`. The commands ran outside Snap confinement
under the existing scoped approval; no network, provider, Redis, MCP, Gateway,
KYA, or shared service was used.

### Narrowed retirement criterion and preserved lifecycle matrix

Python 3.13:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial13-criterion-py313 \
  tests/cli/test_doctor.py \
  -k 'descriptor_mutation_releases_previous_probe_before_finalizer_waits or
      every_discovered_retirement_callback_has_no_writable_standard_state or
      scalar_callback_rewrite_cannot_leave_a_stale_issuance_record or
      callback_self_cycle_cannot_retain_a_binding_or_probe_capability or
      callback_call_function_state_cannot_retain_binding_and_probe or
      dto_lifecycle_function_state_cannot_retain_binding_and_probe or
      retirement_specific_surfaces_expose_no_python_function_state or
      manual_dto_lifecycle_invocation_cannot_remove_live_exact_record'
```

Python 3.11 used the identical command with `--python 3.11` and basetemp
`/tmp/h001-doctor-trial13-criterion-py311`.

```text
Python 3.13: 21 passed, 292 deselected in 0.77s
Python 3.11: 21 passed, 292 deselected in 0.92s
```

### Complete Doctor inventory

Python 3.13:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial13-matrix-py313-full \
  tests/cli/test_doctor.py
```

```text
313 passed in 14.48s
```

Python 3.11:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.11 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial13-matrix-py311-full \
  tests/cli/test_doctor.py
```

```text
313 passed in 17.48s
```

### Preserved concurrency and weakref matrix

Python 3.13:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial13-matrix-py313-concurrency \
  tests/cli/test_doctor.py \
  -k 'result_admission_is_atomic_against_supported_concurrent_mutation or
      binding_capture_never_invokes_a_concurrently_replaced_capability or
      consistency_protocol_is_released_before_intentional_probe_invocation or
      public_weakref_discovery_exposes_no_mutable_retirement_authority or
      weakref_authority_attempts_cannot_prevent_bounded_ledger_retirement'
```

Python 3.11 used the identical command with `--python 3.11` and basetemp
`/tmp/h001-doctor-trial13-matrix-py311-concurrency`.

```text
Python 3.13: 17 passed, 296 deselected in 1.01s
Python 3.11: 17 passed, 296 deselected in 1.22s
```

### Structure matrix

Python 3.13:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial13-matrix-py313-structure \
  tests/structure/test_h001_sample.py \
  tests/structure/test_project_layout.py
```

Python 3.11 used the identical command with `--python 3.11` and basetemp
`/tmp/h001-doctor-trial13-matrix-py311-structure`.

```text
Python 3.13: 8 passed in 0.06s
Python 3.11: 8 passed in 0.14s
```

### Schema matrix

Syntax:

```text
uv run --offline --no-project --python 3.13 --with jsonschema \
  python -m json.tool schemas/doctor-result-v1.schema.json > /dev/null

uv run --offline --no-project --python 3.11 --with jsonschema \
  python -m json.tool schemas/doctor-result-v1.schema.json > /dev/null
```

Draft 2020-12 self-validation:

```text
uv run --offline --no-project --python 3.13 --with jsonschema \
  python -c 'import json; from pathlib import Path; from jsonschema import Draft202012Validator; Draft202012Validator.check_schema(json.loads(Path("schemas/doctor-result-v1.schema.json").read_text(encoding="utf-8")))'

uv run --offline --no-project --python 3.11 --with jsonschema \
  python -c 'import json; from pathlib import Path; from jsonschema import Draft202012Validator; Draft202012Validator.check_schema(json.loads(Path("schemas/doctor-result-v1.schema.json").read_text(encoding="utf-8")))'
```

```text
Python 3.13: 2/2 schema checks passed
Python 3.11: 2/2 schema checks passed
```

### Ruff and static gates

```text
uv run --offline --no-project --with ruff \
  ruff check cli/src/agents_cli/doctor.py tests/cli/test_doctor.py

uv run --offline --no-project --with ruff \
  ruff format --check cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
```

```text
All checks passed!
2 files already formatted
```

Both `git diff --check` and
`git diff --check e74353b493ef09fbfdadf8bf9cd78536b9803dd8..6b3021d0c4337b050563063528b86f8d3835f9de`
passed. The documentation links resolve to the committed deferred register,
D/0/02 sheet, Trial 12 KO, and Option B ratification.

## Requested review focus

Please independently verify:

1. the narrowed criterion is retirement-specific and does not imply universal
   dunder isolation;
2. the Option A infeasibility explanation matches the Trial 12 independent
   proof and does not waive an otherwise-feasible retirement control;
3. the Doctor source blob is unchanged from Trial 12 and still has no DTO
   `__del__` or Python callback call surface;
4. the adjusted two-case criterion test checks exactly the DTO retirement hook
   and discovered callback, while the stronger Trial 12 retention/manual cases
   remain intact;
5. deferred entry `V5-H-0-01-D01` names the reason, D/0/02 owner, required
   privilege, impact, retained mitigation, and closure condition;
6. the sheet and Doctor docs plainly state that pure-Python dunder reflection
   is an unavoidable same-process boundary rather than a DOCTOR success claim;
7. no accepted sweep guard, cleanup behavior, displaced-value ordering, taint,
   or admission behavior was weakened; and
8. all required matrix totals reproduce on the frozen candidate.

## Postflight and honest limits

Immediately before this request-only file was created:

- the amendment worktree and index were clean;
- the exact amendment range passed `git diff --check`;
- the Trial 12 source and schema blobs were unchanged;
- `.pytest_cache`, `.ruff_cache`, `__pycache__`, `.pyc`, and `.pyo` artifacts
  were absent; and
- all pytest basetemps were isolated under `/tmp`.

This lane did not run aggregate CI, repository/application installation, npm,
network access, a real provider, Redis, Gateway, MCP, KYA, tmux, shared
services, portability, integration, promotion, publication, or release. These
are outside the Trial 13 correction boundary, not skipped required matrices.

It did not modify Doctor production source, schemas, `cli/main.py`, probes,
adapters, repositories, policy registries, shared configuration, manifests,
workflows, lock files, suite hashes, plan indexes, root README, changelog,
`message.*`, or `agents:events`.

The lane does not test or claim protection against same-process reflection
through ordinary non-retirement Python dunders. That exact residual is
DEFERRED to D/0/02 rather than reported as verified.

No sub-agent was spawned, and the coder did not perform an independent review.
This request does not claim a verdict, the PROBES or PORTABILITY slices,
completion of H/0/01, integration, promotion, publication, or release.

## Commit

- `6b3021d0c4337b050563063528b86f8d3835f9de` -
  `docs(doctor): narrow retirement reflection criterion (V5 H/0/01 Trial 13)`

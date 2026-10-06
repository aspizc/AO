# Review Submission - Project V5 H/0/01 DOCTOR (Trial 11)

## Requested reviewer

Please assign an independent reviewer that did not implement this trial. Review
from the frozen repository evidence and write the verdict only to:

```text
plan/reviews/PROJECT_V5/H_0_1_DOCTOR-11_result.md
```

The result must use `reviewed_OK` or `reviewed_KO`, list every P0/P1/P2
finding, and identify the exact reviewed commits and pathsets. A result commit
must change only that result file.

## Review boundary

Trial 11 is a correction trial for the single P2 finding in the independently
reviewed Trial 10 result:

```text
708f4d54987727b5c185de6167228a6e269f4410
tree 898f7307def69ed7c36fcd5008afbcf31e58ed75
docs(review): record H_0_1_DOCTOR trial 10 result
```

The review covers:

- the exact standard weak-reference route
  `reference.__callback__.__call__.__func__.__dict__`;
- direct attribute mutation of the same `__func__` authority;
- collection of a discarded `ProbeBinding`, its probe capability, and its
  exact issuance-ledger record;
- exact-reference protection against live, stale, or replacement records;
- preservation of Trial 10 displaced-value release outside
  `_ISSUANCE_LOCK`;
- irreversible taint and atomic admission relative to supported set/delete;
- preservation of the closed DOCTOR result contract; and
- the corresponding task-owned documentation.

It does not cover CLI wiring, runtime probes, providers, Redis, Gateway, MCP,
KYA, integration, promotion, publication, release, or the complete H/0/01
exit gate. It does not turn this stdlib-only preflight into a same-process
isolation claim. Traversal through function globals, mutation of DTO classes,
private module state, private authority maps, or Python builtins remains
outside the supported boundary documented in `docs/doctor.md`.

## Trial 10 finding addressed

### P2 - the callback's Python `__call__` function dictionary retained the DTO graph

Trial 10 correctly removed closure, default, keyword-default, instance
attribute, instance-dictionary, and scalar-key authority from the discovered
callback. Its `_RetirementCallback.__call__` remained an ordinary Python
method, however. Starting only from the exact built-in issuance reference, a
caller could execute either equivalent spelling:

```python
reference.__callback__.__call__.__func__.__dict__["retained"] = binding
setattr(
    reference.__callback__.__call__.__func__,
    "retained",
    binding,
)
```

The class owns that function for the lifetime of the loaded doctor module.
Storing the issued binding there kept the binding, its probe capability, its
issuance referent, and its ledger record live. Because the referent never
became dead, neither the otherwise-correct exact-reference retirement guard
nor callback-key cleanup could run.

Trial 11 retains the exact built-in `weakref.ref`, the stateless callback
instance, the module-private scalar-key map, and the exact record guard. It
changes only the callback/lifecycle mechanism:

1. `_RetirementCallback.__call__` is the immutable built-in `id` call surface.
   Weak references ignore callback return values, and the discovered callback
   no longer exposes a Python bound method, `__func__`, or writable function
   dictionary.
2. The sealed DTO lifecycle invokes `_retire_issued_dto`.
3. Under `_ISSUANCE_LOCK`, retirement resolves the exact integer key, ledger
   record, exact built-in reference, callback identity, and private
   callback-to-key authority.
4. Retirement proceeds only when the reference is dead or still identifies
   the finalizing exact DTO and the ledger still contains that exact record.
5. The ledger record is removed before the still-matching callback authority
   entry. Exceptions from finalization are contained without caller data or
   output.

Manual invocation of the discovered callback while the referent is live is a
side-effect-free `id(reference)` call. A stale reference cannot delete a
replacement record because retirement still requires the exact record,
reference/callback, and callback-to-key relationship.

The Trial 10 `_TrackedSlot.__set__` and `__delete__` implementation is
byte-for-byte unchanged. Displaced caller-owned values remain retained under
the lock and released only after lock exit. Admission, irreversible taint,
recursive capture, and the locked linearization point are also unchanged.

## TDD lineage

### Trial 11 base

```text
708f4d54987727b5c185de6167228a6e269f4410
tree 898f7307def69ed7c36fcd5008afbcf31e58ed75
docs(review): record H_0_1_DOCTOR trial 10 result
```

### RED

```text
13cd5fe586a3fe829d2fbce4ca0a75037b1e9403
tree 20f87e759dbdd6e58fbc5038c3d8955b1634dfa0
parent 708f4d54987727b5c185de6167228a6e269f4410
test(doctor): expose callback function retention (V5 H/0/01 Trial 11)
```

The commit changes only:

```text
M tests/cli/test_doctor.py
```

The two parameterized cases start from
`weakref.getweakrefs(binding)`, select the one exact built-in reference with a
callback, and traverse only the standard callback route. One writes through
the exact function dictionary; the other writes directly through the same
bound method's `__func__`.

Against the unchanged Trial 10 source, both cases first proved:

```text
binding weak reference:       live
probe capability weakref:     live
issuance reference referent:  live
issuance ledger record:       present
```

They then removed their injected function state, forced collection, proved
the binding and capability were reclaimed and the ledger returned to
baseline, and failed only on the intended assertion that the route must not
be writable:

```text
2 failed, 304 deselected in 0.25s
```

The doctor source blob is unchanged from the Trial 10 base:

```text
77230a1bdaa281f31f9ab56c511e2cc665dc8c4a
```

### RED cleanup refinement

```text
688b24c0be0d1c2e8880bd13658439cacbbe7af4
tree d104f615f7f49fe5435182130082d66cd02cc679
parent 13cd5fe586a3fe829d2fbce4ca0a75037b1e9403
test(doctor): scope callback cleanup evidence (V5 H/0/01 Trial 11)
```

This tests-only refinement permits `weakref.__callback__` to be `None` after a
secure implementation has reclaimed the referent and retired the record. It
does not alter the route, the retention proof, or the final non-writability
assertions. A detached replay against the unchanged Trial 10 source retained
the expected RED:

```text
2 failed, 304 deselected in 0.24s
```

### GREEN technical

```text
f809a404ae08358568307f204d957ba937a79312
tree cf00c75f53329f49a1cfeadce9205aa3c7db92cd
parent 688b24c0be0d1c2e8880bd13658439cacbbe7af4
fix(doctor): close callback function retention (V5 H/0/01 Trial 11)
```

The commit changes only:

```text
M cli/src/agents_cli/doctor.py
```

The refined RED test blob remains frozen through GREEN:

```text
92406f80546c9b3e094e32a62a0fffaff932ae53
```

### Task-owned documentation

```text
586844799d45936a1a60ec302eb5898715b37998
tree fb31cedb53a3b12c4b0ca9fc19be44c09b5de42e
parent f809a404ae08358568307f204d957ba937a79312
docs(doctor): document callback lifecycle closure (V5 H/0/01 Trial 11)
```

The commit changes only:

```text
M docs/doctor.md
```

It records the immutable built-in callback surface, private scalar authority,
exact lifecycle retirement, callback-authority cleanup, and the unchanged
supported in-process trust boundary.

## Frozen candidate identity

Before this request commit, the candidate blobs are:

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

The result schema is unchanged. The exact net candidate pathset from the
Trial 10 result is:

```text
cli/src/agents_cli/doctor.py  +28 / -12
docs/doctor.md                +13 / -11
tests/cli/test_doctor.py      +92 /  -0
```

No shared plan, index, README, audit, policy, schema, manifest, lock,
workflow, suite-inventory, Gateway, or JavaScript file is part of this
candidate.

## Reproducible verification

All required matrices ran. None was skipped.

The exact cached/offline tool identities were:

```text
uv 0.11.21
Python 3.13.13
Python 3.11.15
pytest 9.1.1
jsonschema 4.26.0
Ruff 0.16.0
```

The Snap launcher refused the first sandboxed `uv` attempt before pytest
started. That attempt is not counted as evidence. Every `uv` command listed
below was rerun successfully outside Snap confinement with `--offline`; no
network, provider, Redis, MCP, Gateway, KYA, or shared service was used.

### Trial 10 plus Trial 11 directed matrix

Python 3.13:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial11-exact-py313-directed \
  tests/cli/test_doctor.py \
  -k 'descriptor_mutation_releases_previous_probe_before_finalizer_waits or
      every_discovered_retirement_callback_has_no_writable_standard_state or
      scalar_callback_rewrite_cannot_leave_a_stale_issuance_record or
      callback_self_cycle_cannot_retain_a_binding_or_probe_capability or
      callback_call_function_state_cannot_retain_binding_and_probe'
```

Python 3.11 used the identical command with `--python 3.11` and basetemp
`/tmp/h001-doctor-trial11-exact-py311-directed`.

Results:

```text
Python 3.13: 14 passed, 292 deselected in 0.72s
Python 3.11: 14 passed, 292 deselected in 0.75s
```

The same complete 14-case selection passed five consecutive additional runs
per runtime:

```text
Python 3.13: 14 passed / 292 deselected in
             0.64s, 0.63s, 0.58s, 0.62s, 0.60s
Python 3.11: 14 passed / 292 deselected in
             0.78s, 0.75s, 0.67s, 0.73s, 0.73s
```

The repeated commands used the same command and selection with basetemps:

```text
/tmp/h001-doctor-trial11-exact-repeat-py313-{1,2,3,4,5}
/tmp/h001-doctor-trial11-exact-repeat-py311-{1,2,3,4,5}
```

### Complete DOCTOR inventory

Python 3.13:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial11-exact-uv-py313-focal-final \
  tests/cli/test_doctor.py
```

```text
306 passed in 13.85s
```

Python 3.11:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.11 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial11-exact-uv-py311-focal \
  tests/cli/test_doctor.py
```

```text
306 passed in 17.55s
```

### Preserved Trial 9 concurrency and standard weakref matrix

Python 3.13:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial11-exact-py313-concurrency \
  tests/cli/test_doctor.py \
  -k 'result_admission_is_atomic_against_supported_concurrent_mutation or
      binding_capture_never_invokes_a_concurrently_replaced_capability or
      consistency_protocol_is_released_before_intentional_probe_invocation or
      public_weakref_discovery_exposes_no_mutable_retirement_authority or
      weakref_authority_attempts_cannot_prevent_bounded_ledger_retirement'
```

Python 3.11 used the identical command with `--python 3.11` and basetemp
`/tmp/h001-doctor-trial11-exact-py311-concurrency`.

```text
Python 3.13: 17 passed, 289 deselected in 0.99s
Python 3.11: 17 passed, 289 deselected in 1.22s
```

### Preserved Trial 7 adversarial matrix

The two runtime commands used the same envelope as above, basetemps
`/tmp/h001-doctor-trial11-exact-py313-trial7` and
`/tmp/h001-doctor-trial11-exact-py311-trial7`, and this exact selection:

```text
-k 'non_exact_binding_containers or requires_every_exact_binding or
    probe_observation_requires_issued or complete_safe_binding_snapshot or
    every_dto_admission_rejects or every_issued_dto_rejects or
    every_public_dto_constructor_rejects or
    dto_constructors_reject_container_subclasses or
    every_result_boundary_enforces or
    result_consumers_use_validator_snapshot'
```

```text
Python 3.13: 116 passed, 190 deselected in 5.83s
Python 3.11: 116 passed, 190 deselected in 6.46s
```

### Amended Trial 8 descriptor/lifecycle matrix

The two runtime commands used basetemps
`/tmp/h001-doctor-trial11-exact-py313-trial8` and
`/tmp/h001-doctor-trial11-exact-py311-trial8`, and this exact selection:

```text
-k 'raw_descriptor or raw_storage_on_supported_surface or issuance_record or
    discarded_run or discarded_runs or canonical_ledger or
    failed_constructor or stale_retirement'
```

```text
Python 3.13: 69 passed, 237 deselected in 2.14s
Python 3.11: 69 passed, 237 deselected in 2.36s
```

### Structure matrix

Python 3.13:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial11-exact-py313-structure \
  tests/structure/test_h001_sample.py \
  tests/structure/test_project_layout.py
```

Python 3.11 used the identical command with `--python 3.11` and basetemp
`/tmp/h001-doctor-trial11-exact-py311-structure`.

```text
Python 3.13: 8 passed in 0.06s
Python 3.11: 8 passed in 0.09s
```

### Schema matrix

The syntax checks were:

```text
uv run --offline --no-project --python 3.13 --with jsonschema \
  python -m json.tool schemas/doctor-result-v1.schema.json > /dev/null

uv run --offline --no-project --python 3.11 --with jsonschema \
  python -m json.tool schemas/doctor-result-v1.schema.json > /dev/null
```

The Draft 2020-12 self-validation checks were:

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

### Ruff and repository static gates

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

Both `git diff --check` and `git diff --check 708f4d5..5868447` passed. The
final doctor source imports only Python standard-library modules.

## Requested review focus

Please independently verify:

1. both exact Trial 11 routes are absent from the callback reached through the
   standard built-in weak reference;
2. the callback itself has no direct writable closure, defaults, keyword
   defaults, attributes, instance dictionary, Python bound method, or
   function dictionary;
3. finalization removes only the exact ledger record and exact matching
   callback-key authority under `_ISSUANCE_LOCK`;
4. live/manual callback invocation and a stale callback/reference cannot
   retire a live or replacement record;
5. a discarded binding and weak-referenceable probe are both reclaimed and
   the issuance ledger returns to its live baseline;
6. the lifecycle change introduces no unbounded callback-map entry and no
   caller graph or capability retention;
7. Trial 10 set/delete still releases displaced values only after leaving the
   issuance lock; and
8. the documentation retains the exact supported-surface boundary without
   claiming same-process or runtime isolation.

## Postflight and honest limits

Immediately before this request-only file was created:

- the implementation/documentation worktree and index were clean;
- the exact implementation range passed `git diff --check`;
- all Trial 11 pytest basetemps were absent;
- `.pytest_cache/`, `.ruff_cache/`, `__pycache__/`, `.pyc`, and `.pyo`
  artifacts were absent; and
- the detached RED replay directory was removed.

This lane did not run aggregate CI, repository/application installation, npm,
network access, a real provider, Redis, Gateway, MCP, KYA, tmux,
coordination, shared services, portability, integration, promotion,
publication, or release. Those are outside this correction boundary, not
skipped required Trial 11 matrices.

It did not modify `cli/main.py`, probes, adapters, repositories, policy
registries, shared configuration, manifests, workflows, lock files, suite
hashes, plan indexes, root README, changelog, `message.*`, or `agents:events`.

No sub-agent was spawned. This request does not claim an independent verdict,
the PROBES or PORTABILITY slices, completion of H/0/01, integration,
promotion, publication, or release.

## Commits

- `13cd5fe586a3fe829d2fbce4ca0a75037b1e9403` -
  `test(doctor): expose callback function retention (V5 H/0/01 Trial 11)`
- `688b24c0be0d1c2e8880bd13658439cacbbe7af4` -
  `test(doctor): scope callback cleanup evidence (V5 H/0/01 Trial 11)`
- `f809a404ae08358568307f204d957ba937a79312` -
  `fix(doctor): close callback function retention (V5 H/0/01 Trial 11)`
- `586844799d45936a1a60ec302eb5898715b37998` -
  `docs(doctor): document callback lifecycle closure (V5 H/0/01 Trial 11)`

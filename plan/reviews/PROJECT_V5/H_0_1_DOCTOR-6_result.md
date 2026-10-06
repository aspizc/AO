# Independent Review Result — Project V5 H/0/01 DOCTOR (Trial 6)

## Verdict

**KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 2 |
| P2 | 0 |

The isolated single-base routes added in Trial 6 pass, and all retained
Trial 4/5 authority, exception, schema, and opacity regressions remain green.
The requested finality boundary is nevertheless still open in two independent
ways:

1. both new `__init_subclass__` guards can be shadowed by a non-cooperative
   left base, which permits a normally declared derived metaclass and real
   subclasses of all eight concrete DTOs; and
2. the purported C-level-safe MRO scan still invokes hostile data descriptors
   named `__mro__` or `__dict__` on a base's metaclass.

## Frozen review boundary

- Branch: `feat/V5-H-0-01-doctor`
- Exact initial/request HEAD:
  `519e73e98ebbf47eee1fcd1a3ea0f79b297cedce`
- Request-only parent / final technical commit:
  `133cfd8e159ce5a880964dd1ee3270c93aa2a5c5`
- Exact Trial 6 base:
  `01c6a11508c8b855a08bb70bf715ad34fd58e0d5`
- Tests-only RED:
  `8527653fdff3eae92c1ef50d3d6add1f83b12788`
- The initial worktree was clean, and its branch and HEAD matched the review
  request exactly.
- Parentage is direct and linear:

  ```text
  01c6a11508c8b855a08bb70bf715ad34fd58e0d5
    -> 8527653fdff3eae92c1ef50d3d6add1f83b12788
    -> 133cfd8e159ce5a880964dd1ee3270c93aa2a5c5
    -> 519e73e98ebbf47eee1fcd1a3ea0f79b297cedce
  ```

- The complete technical range changes only:
  - `cli/src/agents_cli/doctor.py` (`+22/-1`)
  - `tests/cli/test_doctor.py` (`+191/-0`)
- The RED commit changes only `tests/cli/test_doctor.py`; the technical commit
  changes only `cli/src/agents_cli/doctor.py`; the request commit adds only
  `plan/reviews/PROJECT_V5/H_0_1_DOCTOR-6_to_review.md`.
- The RED and final test blobs are byte-identical.

## Findings

### P1 — Left-base shadowing bypasses both finality fallbacks and creates all eight DTO subclasses

Evidence:

- `cli/src/agents_cli/doctor.py:111-112` tries to make
  `_OpaqueDTOType` final with an inherited `__init_subclass__`.
- `cli/src/agents_cli/doctor.py:128-132` uses another inherited
  `__init_subclass__` as the concrete DTO fallback.
- Python resolves the hook invoked by `type.__new__` from the new class's MRO.
  A preceding unrelated base can therefore define a non-cooperative
  `__init_subclass__` and prevent either later guard from running.
- This is ordinary class syntax and a direct standard `type.__new__` call. It
  does not mutate a protected class, call `type.__setattr__`, use `ctypes`, or
  execute attack code in a target class body or `__prepare__`.

A minimal metaclass derivation succeeds:

```python
events = []

class LeftMeta(type):
    def __init_subclass__(cls, **kwargs):
        events.append("left-meta-init-subclass")

class BypassMeta(LeftMeta, doctor._OpaqueDTOType):
    def __new__(mcls, name, bases, namespace, **kwargs):
        return type.__new__(mcls, name, bases, namespace, **kwargs)

assert issubclass(BypassMeta, doctor._OpaqueDTOType)
assert events == ["left-meta-init-subclass"]
```

`LeftMeta.__init_subclass__` runs while `BypassMeta` is being created and
shadows `_OpaqueDTOType.__init_subclass__`. The resulting metaclass is usable.
A second left base shadows `_OpaqueDTO.__init_subclass__`:

```python
events = []

class LeftDTO:
    def __init_subclass__(cls, **kwargs):
        events.append("left-dto-init-subclass")

class InstallHook:
    def __set_name__(self, owner, name):
        events.append("set-name")

class Forged(
    LeftDTO,
    doctor.Remediation,
    metaclass=BypassMeta,
):
    install = InstallHook()

    def __repr__(self):
        events.append("repr")
        return "HOSTILE"

    def __str__(self):
        events.append("str")
        return "HOSTILE"

    def __hash__(self):
        events.append("hash")
        return 7

    def __eq__(self, other):
        events.append("eq")
        return True

assert issubclass(Forged, doctor.Remediation)
```

The independent all-eight matrix produced:

```text
metaclass_derived=True callbacks=['left-meta-init-subclass']
Remediation=accepted:True callbacks:bypass-new,set-name,left-dto-init-subclass,repr,str,hash,eq
OutcomeDefinition=accepted:True callbacks:bypass-new,set-name,left-dto-init-subclass,repr,str,hash,eq
CheckDefinition=accepted:True callbacks:bypass-new,set-name,left-dto-init-subclass,repr,str,hash,eq
ProbeObservation=accepted:True callbacks:bypass-new,set-name,left-dto-init-subclass,repr,str,hash,eq
ProbeBinding=accepted:True callbacks:bypass-new,set-name,left-dto-init-subclass,repr,str,hash,eq
DoctorCheck=accepted:True callbacks:bypass-new,set-name,left-dto-init-subclass,repr,str,hash,eq
DoctorResult=accepted:True callbacks:bypass-new,set-name,left-dto-init-subclass,repr,str,hash,eq
DoctorRun=accepted:True callbacks:bypass-new,set-name,left-dto-init-subclass,repr,str,hash,eq
direct_type_new_multibase=8/8 accepted
```

The final line is a separate, shorter bypass that does not need a derived
metaclass:

```python
for dto_type in public_dto_types:
    forged = type.__new__(
        type(dto_type),
        f"Direct{dto_type.__name__}",
        (LeftDTO, dto_type),
        {},
    )
    assert issubclass(forged, dto_type)
```

The Trial 6 tests miss the composition:

- `tests/cli/test_doctor.py:346-454` derives the metaclass with only
  `_OpaqueDTOType` as a base;
- `tests/cli/test_doctor.py:469-479` exercises direct `type.__new__` with only
  the concrete DTO as a base; and
- `tests/cli/test_doctor.py:495-518` uses multiple bases only through
  `_OpaqueDTOType.__new__`, so the early scan runs instead of the advertised
  fallback.

Required correction:

- Do not rely on an inherited `__init_subclass__` being reached when an
  attacker can place a non-cooperative base before the protected base.
- Close both the metaclass-derivation and concrete-DTO direct-`type.__new__`
  compositions, or explicitly narrow the contract if pure-Python direct
  constructor resistance is not supportable.
- Add all-eight tests that combine a hostile left base with class syntax and
  direct `type.__new__`, proving that no metaclass or DTO subclass is returned
  and that no target descriptor or hostile base hook executes.

### P1 — Explicit `type.__getattribute__` still dispatches hostile metaclass descriptors

Evidence:

- `cli/src/agents_cli/doctor.py:89` reads `base.__mro__` with
  `type.__getattribute__(base, "__mro__")`.
- `cli/src/agents_cli/doctor.py:91` reads every ancestor namespace with
  `type.__getattribute__(ancestor, "__dict__")`.
- Explicitly calling `type.__getattribute__` bypasses a custom
  `__getattribute__` override, but it still performs normal data-descriptor
  resolution against the object's metaclass. A hostile metaclass can define a
  `property` with either requested name, and its getter runs inside the
  finality gate before rejection.

The independent descriptor matrix produced:

```text
descriptor___mro__=rejected callbacks:['__mro__']
descriptor___dict__=rejected callbacks:['__dict__']
```

The reproducer uses an actual type as the hostile base:

```python
events = []

def callback(cls):
    events.append("__mro__")
    return (cls, object)

HostileMeta = type(
    "HostileMeta",
    (type,),
    {"__mro__": property(callback)},
)
HostileBase = HostileMeta("HostileBase", (), {})

with pytest.raises(TypeError):
    doctor._OpaqueDTOType.__new__(
        doctor._OpaqueDTOType,
        "Rejected",
        (HostileBase, doctor.Remediation),
        {},
    )

assert events == ["__mro__"]
```

The same behavior occurs for a `__dict__` property. Returning a hostile
container can add another callback at `namespace.get`; raising from the getter
fails closed but cannot undo the callback that already occurred.

The current test at `tests/cli/test_doctor.py:495-518` checks only a metaclass
`__getattribute__` override, so it cannot detect descriptor dispatch. An
actual-type `__mro_entries__` hook and a marker descriptor in the base
namespace were not invoked by the scan, but that narrower success does not
satisfy the explicit no-descriptor guarantee.

Required correction:

- Read the built-in type slots without performing metaclass descriptor lookup.
  For example, independently invoking the built-in descriptors obtained from
  `type.__dict__["__mro__"]` and `type.__dict__["__dict__"]` returned the real
  tuple/mappingproxy with zero hostile callbacks in this environment.
- Add rejected-path cases for hostile `__mro__` and `__dict__` data
  descriptors, including return and raise variants, and prove zero callbacks.

## Verified retained behavior

### Exact public-registry identity gate

The public and canonical graphs remain detached at every mutable authority
node:

```text
initial_detachment=definitions:6,outcome_tuples:6,outcomes:35,remediations:35
```

An independent exhaustive harness covered both a structurally equal
replacement and a canonical alias for every public definition, outcomes
tuple, outcome, and remediation: 82 authority nodes and 164 mutations. Each
failed with the exact base `DoctorContractError`, no cause/context, and no
binding iteration, probe, or fingerprint call. Every mutation was restored
and `_validate_registry()` was re-run before the next case:

```text
identity_drift_rejected=164 bindings:0 probes:0 fingerprints:0
```

### Fresh result-owned remediations

The independent inventory selected all 35 registry outcomes under a complete
six-check run and retained all six result remediations each time. All 210
objects were globally distinct and detached from both registry graphs:

```text
fresh_result_remediations=210 canonical_aliases:0 public_aliases:0 reused:0
```

The focused suite also retains prior-run mutation isolation and proves that a
mutated public remediation rejects before probes without changing existing or
future canonical output.

### DTO decorators, observables, and exception boundaries

- All eight legitimate public DTOs import successfully as frozen, slotted
  dataclasses and carry the final marker.
- Exact forged instances retain constant opaque `repr`/`str`, identity-only
  equality/hash, and zero field callbacks.
- Normal assignment or deletion of `repr`, `str`, equality, and hash hooks
  remains rejected for all eight types:

  ```text
  opaque_dataclass_identity=8/8 callbacks:0 hooks_immutable:32/32
  ```

- A chained ordinary probe error followed by a forced outcome-resolution
  failure still emits the exact base `DoctorContractError` with no cause or
  context.
- `KeyboardInterrupt`, `SystemExit`, `GeneratorExit`, and a direct custom
  `BaseException` propagate unchanged through both probe and binding
  iteration boundaries:

  ```text
  post_probe_resolution_error=exact_base cause:none context:none
  baseexception_controls=probe:4/4 bindings:4/4
  ```

### Closed schema and corpus

The independent exhaustive corpus selected every one of 35 outcomes under two
accepted profile IDs:

```text
registry=6 checks/35 outcomes
schema_valid=70 wrong_aggregates_rejected=140 exit_relationships=70
profile_parity=10 accepted/458 rejected
```

All 70 projections passed the Draft 2020-12 schema, both wrong root aggregate
statuses were rejected for every projection, all exit relationships matched,
and the declared exact-length, credential-prefix, bytes, CR/LF,
Unicode-separator, non-BMP, and `0x00`-through-`0xff` suffix inventory retained
Python/schema parity.

## Verification evidence

Focused doctor inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial6-independent-focal \
  tests/cli/test_doctor.py

149 passed in 0.20s
```

Structure inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial6-independent-structure \
  tests/structure/test_h001_sample.py \
  tests/structure/test_project_layout.py

8 passed in 0.06s
```

Directed Ruff:

```text
uv run --offline --no-project --with ruff \
  ruff check --no-cache \
  cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
All checks passed!

uv run --offline --no-project --with ruff \
  ruff format --check --no-cache \
  cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
2 files already formatted
```

Schema checks:

```text
python -m json.tool schemas/doctor-result-v1.schema.json
pass

Draft202012Validator.check_schema(schema)
pass
```

Explicit range checks:

```text
git diff --check \
  01c6a11508c8b855a08bb70bf715ad34fd58e0d5..\
133cfd8e159ce5a880964dd1ee3270c93aa2a5c5
<exit 0, no output>

git diff --check \
  133cfd8e159ce5a880964dd1ee3270c93aa2a5c5..\
519e73e98ebbf47eee1fcd1a3ea0f79b297cedce
<exit 0, no output>
```

Exact final technical blobs:

```text
cli/src/agents_cli/doctor.py
  e9d1a562a31a823bd0ab021d6801bf02e50d36d7
tests/cli/test_doctor.py
  5592ed2c1670ef76f73e3ef1ba2f8cf9b7916818
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
```

The schema blob is identical at the Trial 6 base and technical commits. Both
technical files remain mode `100644`; the source imports only Python
standard-library modules. Adversarial reproductions ran under Python 3.13.13.

## Postflight

Before this result was written, the worktree was still clean and the exact
pytest basetemps and checked repository cache paths were absent:

```text
/tmp/h001-doctor-trial6-independent-focal
/tmp/h001-doctor-trial6-independent-structure
.pytest_cache/
.ruff_cache/
cli/.ruff_cache/
cli/src/agents_cli/__pycache__/
tests/cli/__pycache__/
tests/structure/__pycache__/
```

Apart from this result artifact, no product, test, schema, request, task plan,
configuration, shared state, service, or external repository was modified by
this review. No network, tmux, provider, Redis, Gateway, MCP, KYA, or shared
service was used, and no additional agent or subagent was spawned.

## Conclusion

Trial 6 is **KO** with two P1 findings. The identity, remediation, opacity,
exception, schema, and ordinary single-base regressions are sound, but the
requested runtime-final and callback-free hostile-base boundary remains open.

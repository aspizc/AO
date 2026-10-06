# Independent Review Result — Project V5 H/0/01 DOCTOR (Trial 5)

## Verdict

**KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 1 |
| P2 | 0 |

The deep public-registry identity gate and result-remediation isolation now
close both Trial 4 authority defects. The correction is still incomplete:
all eight concrete DTOs can be subclassed through ordinary class syntax when
a normally constructible derived metaclass bypasses the single
`_OpaqueDTOType.__new__` check. The resulting subclasses install and execute
attacker-controlled `repr`, `str`, reflected equality, and hash hooks.
Separately, a rejected multiple-inheritance attempt can execute an attacker
metaclass callback from inside that same finality check.

## Frozen review boundary

- Branch: `feat/V5-H-0-01-doctor`
- Exact initial/request HEAD:
  `f845fe5b2979fa76f68261525390221530e30893`
- Request-only parent / final technical commit:
  `5d01bdfa953e84ee73c8b7fe3b16e49a97f9c6e9`
- Exact Trial 5 base:
  `b5149521a4dcec072276fe71b9546f055b9f968f`
- Tests-only RED:
  `a82cb8a476a890dface28bce5a2c4c71f39b9351`
- The initial worktree was clean and its exact branch and HEAD matched the
  review request.
- Parentage is direct and linear:

  ```text
  b5149521a4dcec072276fe71b9546f055b9f968f
    -> a82cb8a476a890dface28bce5a2c4c71f39b9351
    -> 5d01bdfa953e84ee73c8b7fe3b16e49a97f9c6e9
    -> f845fe5b2979fa76f68261525390221530e30893
  ```

- The complete technical range was read and changes only:
  - `cli/src/agents_cli/doctor.py` (`+91/-4`)
  - `tests/cli/test_doctor.py` (`+314/-0`)
- The RED commit changes only `tests/cli/test_doctor.py`; the technical commit
  changes only `cli/src/agents_cli/doctor.py`; the request commit adds only
  `plan/reviews/PROJECT_V5/H_0_1_DOCTOR-5_to_review.md`.
- The RED and final test blobs are byte-identical.

## Finding

### P1 — The runtime-final boundary is bypassable and its rejection path is callback-observable

Evidence:

- `cli/src/agents_cli/doctor.py:87-107` puts the entire runtime-final policy in
  `_OpaqueDTOType.__new__`, `__setattr__`, and `__delattr__`.
- `_OpaqueDTOType` itself remains normally subclassable, and neither the
  metaclass nor the concrete DTO hierarchy has a redundant
  `__init_subclass__`-style finality guard.
- A derived metaclass can therefore override `__new__`, delegate directly to
  the standard `type.__new__`, and make a real subclass using a class
  statement. This succeeds for `Remediation`, `OutcomeDefinition`,
  `CheckDefinition`, `ProbeObservation`, `ProbeBinding`, `DoctorCheck`,
  `DoctorResult`, and `DoctorRun`.
- `cli/src/agents_cli/doctor.py:95` also reads `base.__dict__` through normal
  attribute dispatch while scanning bases. If an attacker-controlled base
  precedes the final DTO in a multiple-inheritance declaration, its metaclass
  `__getattribute__` callback runs before the DTO is found and the class is
  rejected.

Minimal successful class-syntax reproduction:

```python
events = []

class BypassMeta(type(doctor.Remediation)):
    def __new__(mcls, name, bases, namespace, **kwargs):
        return type.__new__(mcls, name, bases, namespace, **kwargs)

class InstallHook:
    def __set_name__(self, owner, name):
        events.append("set_name")

class Forged(doctor.Remediation, metaclass=BypassMeta):
    install_hook = InstallHook()

    def __repr__(self):
        events.append("repr")
        return "HOSTILE-REPR"

    def __str__(self):
        events.append("str")
        return "HOSTILE-STR"

    def __hash__(self):
        events.append("hash")
        return 7

    def __eq__(self, other):
        events.append("eq")
        return True

exact = object.__new__(doctor.Remediation)
hostile = object.__new__(Forged)
repr(hostile)
str(hostile)
hash(hostile)
assert exact == hostile
assert events == ["set_name", "repr", "str", "hash", "eq"]
```

The all-eight matrix produced:

```text
plain_finality=16/16 rejected
Remediation=class-syntax-subclass accepted callbacks:set_name,repr,str,hash,eq
OutcomeDefinition=class-syntax-subclass accepted callbacks:set_name,repr,str,hash,eq
CheckDefinition=class-syntax-subclass accepted callbacks:set_name,repr,str,hash,eq
ProbeObservation=class-syntax-subclass accepted callbacks:set_name,repr,str,hash,eq
ProbeBinding=class-syntax-subclass accepted callbacks:set_name,repr,str,hash,eq
DoctorCheck=class-syntax-subclass accepted callbacks:set_name,repr,str,hash,eq
DoctorResult=class-syntax-subclass accepted callbacks:set_name,repr,str,hash,eq
DoctorRun=class-syntax-subclass accepted callbacks:set_name,repr,str,hash,eq
```

The separate rejected-path reproduction is:

```python
calls = []

class CallbackMeta(type(doctor.Remediation)):
    def __getattribute__(cls, name):
        if name == "__dict__":
            calls.append("base.__dict__")
        return super().__getattribute__(name)

class CallbackBase(metaclass=CallbackMeta):
    pass

with pytest.raises(TypeError):
    class Rejected(CallbackBase, doctor.Remediation):
        pass

assert calls == ["base.__dict__"]
```

Observed:

```text
rejected_multibase=attacker_callback:base.__dict__
```

These reproductions use ordinary Python class declarations and the standard
metaclass constructor. They use no `ctypes`, C-level memory mutation,
`type.__setattr__`, mutation of a protected DTO class, network, provider, or
service. The successful class is an actual subclass and participates in
normal Python observable dispatch, including reflected subclass equality.
This is therefore inside the requested class-syntax/runtime-final boundary,
not a demand for impossible resistance to out-of-contract C-level mutation.

Required correction:

- Close ordinary derivation of the enforcement metaclass and add a redundant
  runtime-final guard that still rejects a DTO subclass when a derived
  metaclass tries to skip `_OpaqueDTOType.__new__`.
- Keep the existing early metaclass rejection so descriptor-backed hooks do
  not install on the supported class-syntax and `type()` paths.
- Inspect base markers without invoking an attacker base's metaclass
  `__getattribute__`.
- Extend the all-eight adversarial matrix with a derived-metaclass class
  statement/direct-constructor bypass and with a hostile preceding base.
  Prove that no subclass is returned and no attacker callback runs.

## Verified corrections

### Exact public-registry identity gate

The public and canonical graphs are detached at every mutable authority node:

```text
initial_detachment=definitions:6,outcome_tuples:6,outcomes:35,remediations:35
```

An independent exhaustive mutation harness covered:

- six equal definition replacements and six canonical definition aliases;
- six equal outcomes-tuple replacements and six canonical tuple aliases;
- all 35 equal outcome replacements and all 35 canonical outcome aliases;
- all 35 equal remediation replacements and all 35 canonical remediation
  aliases.

For each case, `_registry_fingerprint` and binding iteration were replaced by
canaries. Every case failed with the exact base `DoctorContractError`, no
cause/context, and zero canary calls:

```text
identity_drift_rejected=164 bindings:0 fingerprints:0
```

After every mutation the original object was restored and the identity graph
was revalidated. The final `_validate_registry()` succeeded. Changed-value
definition, outcome, and remediation mutations also remain rejected before
probes without invoking hostile `bool`, equality, hash, representation, or
string callbacks.

### Fresh result-owned remediations

The independent inventory selected every one of the 35 registry outcomes and
retained all six result remediations from every run. All 210 objects were
globally distinct and none aliased a canonical or public-registry
remediation:

```text
fresh_result_remediations=210 canonical_aliases:0 public_aliases:0 reused:0
```

Mutating a remediation from a prior run made only that prior result invalid.
A later run retained the exact canonical projection, JSON, and human output.
Mutating a public-registry remediation rejected a run with zero probes, did
not affect an already-created result, and, after explicit restoration,
produced the exact same future output. Canonical registry values remained
unchanged.

### Trial 4 regressions

The following Trial 4 behavior was reconfirmed independently:

```text
opaque_identity_only=8/8 callbacks:0
public_nested_hostile_mutations_rejected=3 probes:0 callbacks:0
post_probe_resolution_error=exact_base cause:none context:none
baseexception_controls=probe:4/4 bindings:4/4
```

- Exact forged instances of all eight DTOs retain constant opaque
  representation and identity-only equality/hash without traversing fields.
- A legitimate callable in `ProbeBinding` remains unrepresented,
  uncompared, unhashed, and uninvoked by DTO observables.
- Straightforward `class`/`type()` subclass attempts reject all eight DTOs,
  and normal public assignment/deletion of `repr`, `str`, equality, and hash
  hooks rejects. The finding above is the unclosed derived-metaclass path.
- Public registry reassignment, same/different-value nested mutation, and
  canonical private aliases fail before probes.
- A chained ordinary probe exception is discarded before a deliberately
  forced later resolution failure; the emitted error is the exact base
  `DoctorContractError` with `__cause__ is None` and `__context__ is None`.
- `KeyboardInterrupt`, `SystemExit`, `GeneratorExit`, and a custom direct
  `BaseException` propagate unchanged from both probes and binding iteration.

## Verification evidence

Focused doctor inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial5-independent-focal \
  tests/cli/test_doctor.py

101 passed in 0.19s
```

Structure inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial5-independent-structure \
  tests/structure/test_h001_sample.py \
  tests/structure/test_project_layout.py

8 passed in 0.05s
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

Schema and exhaustive closed-inventory corpus:

```text
python -m json.tool schemas/doctor-result-v1.schema.json
pass

Draft202012Validator.check_schema(schema)
pass

registry=6 checks/35 outcomes
schema_valid=70 wrong_aggregates_rejected=140 exit_relationships=70
profile_parity=10 accepted/458 rejected
```

The corpus reconstructed all 35 outcomes under both accepted profiles,
validated all 70 projections, rejected both wrong aggregate statuses for each
projection, checked every exit relationship, and compared Python/schema
acceptance over the declared exact-length, credential-prefix, bytes, CR/LF,
Unicode-separator, non-BMP, and `0x00`-through-`0xff` suffix inventory.

Explicit range checks:

```text
git diff --check \
  b5149521a4dcec072276fe71b9546f055b9f968f..\
5d01bdfa953e84ee73c8b7fe3b16e49a97f9c6e9
<exit 0, no output>

git diff --check \
  5d01bdfa953e84ee73c8b7fe3b16e49a97f9c6e9..\
f845fe5b2979fa76f68261525390221530e30893
<exit 0, no output>
```

Exact technical blobs:

```text
cli/src/agents_cli/doctor.py
  8c7b7330e947b0d626f3c29c7e2caf674de74fd7
tests/cli/test_doctor.py
  3ecaf0b978d9d49a71aad936b8f197f78353d49e
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
```

The schema blob is identical at the Trial 5 base and technical commits. Both
technical files remain mode `100644`; the technical source retains only
standard-library imports.

## Postflight

The exact pytest basetemps and the checked repository cache paths were absent
before this result was written:

```text
/tmp/h001-doctor-trial5-independent-focal
/tmp/h001-doctor-trial5-independent-structure
.pytest_cache/
.ruff_cache/
cli/.ruff_cache/
cli/src/agents_cli/__pycache__/
tests/cli/__pycache__/
tests/structure/__pycache__/
```

Apart from this result artifact, no product, test, schema, request, task plan,
configuration, shared state, service, or external repository was modified by
this review. No network, tmux, provider, Redis, Gateway, MCP, KYA, agent,
subagent, or shared service was used.

## Conclusion

Trial 5 is **KO** with one P1. The authority-isolation corrections pass their
adversarial gates, but the concrete DTO types are not yet runtime-final over
the requested class-syntax/metaclass boundary and a rejected finality path is
still callback-observable.

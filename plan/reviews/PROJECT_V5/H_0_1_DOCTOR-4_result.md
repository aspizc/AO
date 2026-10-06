# Independent Review Result — Project V5 H/0/01 DOCTOR (Trial 4)

## Verdict

**KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 2 |
| P2 | 0 |

The declared focused, structure, lint, schema, corpus, exception-sanitization,
and control-signal checks reproduce. The correction is nevertheless not
complete: all eight public DTOs remain open to subclass-controlled observables,
and the registry integrity boundary is identity-blind while a public result
still exposes a private canonical remediation object by identity.

## Frozen review boundary

- Branch: `feat/V5-H-0-01-doctor`
- Exact initial HEAD:
  `0676550737c91babf8dab815b6836a893d34f324`
- Request-only parent / technical commit:
  `32a848faad265cd66385fa8ee1a366c64d2d3ff3`
- Exact Trial 4 base:
  `fe00bec0dc02708bd51a1600a178523a350e3d55`
- The initial worktree was clean.
- The request-only commit adds only
  `plan/reviews/PROJECT_V5/H_0_1_DOCTOR-4_to_review.md`.
- The complete technical range changes only:
  - `cli/src/agents_cli/doctor.py` (`+126/-26`)
  - `tests/cli/test_doctor.py` (`+243/-0`)
- The range is direct and linear:

  ```text
  fe00bec0dc02708bd51a1600a178523a350e3d55
    -> dd0dad765b886fac74fa3db9c043e52e8f0b164a
    -> a816cd796bc537f84d9148125ebbde5fd13dba45
    -> 32a848faad265cd66385fa8ee1a366c64d2d3ff3
    -> 0676550737c91babf8dab815b6836a893d34f324
  ```

No previous H/0/01 DOCTOR result was consulted.

## Findings

### P1 — The opaque observable policy is not closed over subclasses

Evidence:

- `cli/src/agents_cli/doctor.py:84-95` centralizes the observable policy in
  `_OpaqueDTO`, but `__repr__` dynamically reads `type(self).__name__` and none
  of the eight public DTO classes is sealed against subclassing.
- Python dispatch therefore permits a subclass to replace `repr`, `str`,
  equality, and hashing. It also gives a subclass's reflected `__eq__`
  precedence for `exact_dto == subclass_instance`.
- Even a subclass that inherits `_OpaqueDTO.__repr__` can execute an
  attacker-controlled metaclass callback through the dynamic `__name__` read.

The independent matrix reproduced the issue for every public DTO:

```text
Remediation=repr,str,hash,eq callbacks
OutcomeDefinition=repr,str,hash,eq callbacks
CheckDefinition=repr,str,hash,eq callbacks
ProbeObservation=repr,str,hash,eq callbacks
ProbeBinding=repr,str,hash,eq callbacks
DoctorCheck=repr,str,hash,eq callbacks
DoctorResult=repr,str,hash,eq callbacks
DoctorRun=repr,str,hash,eq callbacks
```

An inherited-method adversary also produced:

```text
subclass_repr_callbacks=Remediation,OutcomeDefinition,CheckDefinition,ProbeObservation,ProbeBinding,DoctorCheck,DoctorResult,DoctorRun
subclass_reflected_eq_callbacks=Remediation,OutcomeDefinition,CheckDefinition,ProbeObservation,ProbeBinding,DoctorCheck,DoctorResult,DoctorRun
```

Minimal reproduction:

```python
calls = []

class HostileMeta(type):
    def __getattribute__(cls, name):
        if name == "__name__":
            calls.append("class-name")
        return super().__getattribute__(name)

class PassiveSubclass(doctor.Remediation, metaclass=HostileMeta):
    pass

value = object.__new__(PassiveSubclass)
repr(value)
assert calls == ["class-name"]

eq_calls = []

class ReflectedSubclass(doctor.Remediation):
    def __eq__(self, other):
        eq_calls.append("subclass-eq")
        return True

    __hash__ = object.__hash__

exact = doctor.Remediation("docs/doctor.md", "bootstrap")
subclass_value = object.__new__(ReflectedSubclass)
assert exact == subclass_value
assert eq_calls == ["subclass-eq"]
```

This violates the requested subclass coverage and the claimed callback-free
observable policy. Exact forged instances and a normal callable field are
opaque, but those cases do not close the subclass dispatch path.

Required correction:

- Make each public DTO runtime-final, or otherwise make subclass construction
  impossible before a subclass can participate in an observable.
- Add all-eight-DTO tests for subclass creation and for `repr`, `str`, reflected
  equality, and hashing. The tests must prove zero attacker callbacks rather
  than exercise only exact-class objects.

### P1 — The public registry gate misses identity-preserving mutations, and public results alias private authority

Evidence:

- `cli/src/agents_cli/doctor.py:592-619` fingerprints only primitive field
  values.
- `cli/src/agents_cli/doctor.py:622-651` creates an initially detached public
  graph, but the gate at `cli/src/agents_cli/doctor.py:673-706` cannot tell that
  a definition's outcomes or an outcome's remediation was replaced by a fresh
  equal graph or by a canonical private object.
- `cli/src/agents_cli/doctor.py:870-872` consequently accepts such a nested
  replacement and proceeds to binding/probe work.
- `cli/src/agents_cli/doctor.py:893-900` stores
  `outcome.remediation` directly in the public `DoctorCheck`. That object is
  the private canonical remediation, not a detached result DTO.
- Result validation and renderers at
  `cli/src/agents_cli/doctor.py:755-835,923-970` then use the already-mutated
  private graph as their authority.

Initial construction is correctly detached:

```text
initial_detachment=definitions:6,outcomes:35,remediations:35
```

However, replacing one public outcomes tuple with a fresh, all-new,
value-identical DTO graph was accepted and reached every probe:

```text
same_value_nested_replacement=accepted,probes:6
```

Replacing it with the corresponding private outcomes tuple was also accepted:

```text
public_private_outcome_alias_accepted=True probes=6
```

Minimal reproduction of the identity-blind gate:

```python
public_definition = doctor.CHECK_REGISTRY[0]
private_definition = doctor._CANONICAL_CHECK_REGISTRY[0]
object.__setattr__(
    public_definition,
    "outcomes",
    private_definition.outcomes,
)

calls = []
doctor.run_doctor(
    doctor.CANONICAL_PROFILE_ID,
    passing_bindings_that_append_to(calls),
)
assert len(calls) == 6
assert public_definition.outcomes is private_definition.outcomes
```

There is also a public-only mutation route after one valid run. The public
result exposes the private canonical remediation by identity; mutating its
anchor to the other allowlisted value silently changes subsequent results:

```python
first = doctor.run_doctor(
    doctor.CANONICAL_PROFILE_ID,
    passing_bindings(),
)
exposed = first.result.checks[0].remediation
assert exposed is (
    doctor._CANONICAL_CHECK_REGISTRY[0].outcomes[0].remediation
)

object.__setattr__(exposed, "anchor", "bootstrap")
calls = []
second = doctor.run_doctor(
    doctor.CANONICAL_PROFILE_ID,
    passing_bindings_that_append_to(calls),
)
assert len(calls) == 6
assert doctor.project_result(second.result)["checks"][0]["remediation"][
    "anchor"
] == "bootstrap"
```

Observed:

```text
result_alias_private=True future_anchor=bootstrap probes=6
```

Thus the initial `6/35/35` deep copy does not make the canonical authority
immune. A same-value nested mutation is not rejected before probes, and a
public `DoctorRun` can alter the private authority without touching
`CHECK_REGISTRY`, after which the public fingerprint remains unchanged and all
probes execute.

Required correction:

- Gate the exact expected public object graph, including definition, outcome,
  remediation, and nested tuple identities, not only its primitive values.
- Reject a same-value replacement or a reintroduced private alias before
  bindings are materialized or probes execute.
- Never place canonical registry DTO objects in a public result. Copy the
  remediation into a detached result-owned object, and prove that mutating any
  public result or registry object through `object.__setattr__` cannot change
  canonical execution, validation, projection, or rendering.
- Add a post-run identity inventory and future-run regression covering every
  outcome/remediation, not only the first public registry objects created at
  import time.

## Verified behavior

The following requested behavior passed independently:

- Exact forged instances of all eight DTOs have constant opaque `repr`/`str`,
  identity equality/hash, and do not traverse hostile fields.
- A normal callable stored in `ProbeBinding` is not represented, compared,
  hashed, or invoked by DTO observables.
- Changed-value public registry reassignment and the covered definition,
  outcome, and remediation mutations fail before probes.
- Registry validation rejects hostile non-primitives without invoking their
  `bool`, equality, hash, `repr`, or `str` callbacks.
- An ordinary chained probe exception is discarded before later outcome
  resolution. When that resolution is forced to fail, the exact base
  `DoctorContractError` has `__cause__ is None` and `__context__ is None`.
- `KeyboardInterrupt`, `SystemExit`, `GeneratorExit`, and a custom direct
  `BaseException` from a probe propagate.
- The private/public registry graphs are initially distinct at all 6
  definition, 35 outcome, and 35 remediation positions.

## Verification evidence

Focused inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial4-review-focal \
  tests/cli/test_doctor.py

79 passed in 0.15s
```

Structure inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial4-review-structure \
  tests/structure/test_h001_sample.py \
  tests/structure/test_project_layout.py

8 passed in 0.05s
```

Directed Ruff and whitespace:

```text
uv run --offline --no-project --with ruff \
  ruff check --no-cache \
  cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
All checks passed!

uv run --offline --no-project --with ruff \
  ruff format --check --no-cache \
  cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
2 files already formatted

git diff --check \
  fe00bec0dc02708bd51a1600a178523a350e3d55..\
32a848faad265cd66385fa8ee1a366c64d2d3ff3
<no output>
```

Schema and exhaustive closed-inventory corpus:

```text
python -m json.tool schemas/doctor-result-v1.schema.json
pass

registry=6 checks/35 outcomes
schema_valid=70 wrong_aggregates_rejected=140 exit_relationships=70
profile_parity=10 accepted/458 rejected
```

The corpus reconstructed every one of the 35 outcomes under both accepted
profiles, validated all 70 projections, rejected both wrong aggregate statuses
for each projection, checked all 70 exit relationships, and checked Python /
Draft 2020-12 parity over the declared boundary and byte-suffix inventory.

Commit and blob checks:

```text
dd0dad765b886fac74fa3db9c043e52e8f0b164a  tests/cli/test_doctor.py
a816cd796bc537f84d9148125ebbde5fd13dba45  tests/cli/test_doctor.py
32a848faad265cd66385fa8ee1a366c64d2d3ff3  cli/src/agents_cli/doctor.py
```

Exact final blobs:

```text
cli/src/agents_cli/doctor.py
  e928b12ccb888d5ff9ae6db81c2cd254f31a1d72
tests/cli/test_doctor.py
  c0f06e7ce9401498388f167bd40a1c2d8acf8b02
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
```

The schema blob is identical at the base and technical commits. No network,
tmux, provider, Redis, MCP, KYA, agent, subagent, or shared service was used.
No product or test file was modified by this review.

## Conclusion

Trial 4 is **KO**. Both P1 findings are acceptance-boundary defects and require
a new correction trial before the DOCTOR slice can receive an independent OK.

# Review Submission - Project V5 H/0/01 DOCTOR (Trial 7)

## Review boundary

This request implements the reviewed Trial 7 exact-type/private-issuance
rebaseline for the DOCTOR core. The binding plan was already reconciled by the
integrator at:

```text
894fd3d7e20da2c454923a5f2b2ea3c1bd33e223
docs(plan): bind doctor issuance snapshots
```

That plan commit was consulted read-only with `git show`; it was not
cherry-picked into this task branch. No shared plan index, README, sheet,
manifest, workflow, lock, or suite inventory was edited.

The review covers only:

- private issuance and deep provenance for the eight DOCTOR DTOs;
- exact binding-tuple admission and pre-probe capability capture;
- exact issued probe-observation admission;
- canonical public/private registry identity;
- safe result snapshots consumed without rereading caller DTOs; and
- the task-owned DOCTOR documentation for that boundary.

It does not cover CLI wiring, real probes, providers, Redis, Gateway, MCP,
KYA, portability, integration, promotion, publication, release, or the full
H/0/01 exit gate.

## Trial 6 rebaseline

Trials 5 and 6 attempted to make pure-Python DTO classes runtime-final. The
Trial 6 independent KO demonstrated ordinary hostile-left-base compositions
that shadow both inherited `__init_subclass__` hooks, plus descriptor dispatch
inside the attempted finality scan.

Trial 7 deliberately removes portable un-subclassability from the security
claim:

- `_OpaqueDTOType.__new__`, both finality `__init_subclass__` hooks, the final
  marker, and all MRO/namespace finality introspection were removed.
- The impossible dynamic/syntax, derived-metaclass, direct-`type.__new__`, and
  hostile-multibase finality assertions were retired from the active suite.
  Their exact historical RED/GREEN/KO evidence remains in Trials 5 and 6.
- The new all-eight hostile-left-base matrix permits subclass construction and
  proves that subclasses are rejected only when presented to an admission
  boundary.
- Opaque instance observables and normal class-hook immutability remain tested
  defense in depth. They are not the authority boundary.
- No callback executed in an attacker-defined class or metaclass body before
  presentation is attributed to DOCTOR.

## What was done

### Private issuance ledger

- Every public DTO constructed through its ordinary constructor is validated
  completely before issuance.
- A private ledger is keyed by `id` and retains both the exact object
  reference and its immutable complete snapshot.
- Ledger lookup compares the retained object only with `is`; DTO equality and
  hashing are never used.
- Strong references prevent key reuse while a record exists.
- The dataclass slot descriptors are wrapped by private tracked slots.
  Any post-issuance set or delete permanently taints the ledger record,
  including a write of the identical object/value.
- Original slot storage is retained only in a private authority map, not
  exposed through the installed descriptor.
- Exact unissued `object.__new__` values, missing slots, hostile subclasses,
  cyclic/wrong graphs, container subclasses, and tainted instances reject.

The ledger snapshot is recorded only after the root and every nested issued
object have passed validation. A failed constructor leaves no issuance record.

### Deep DTO snapshots

The eight exact public DTOs are:

```text
Remediation
OutcomeDefinition
CheckDefinition
ProbeObservation
ProbeBinding
DoctorCheck
DoctorResult
DoctorRun
```

Each validator:

1. checks exact root type and exact issuance before field access;
2. rejects a tainted record before field access;
3. reads only the known exact-class tracked slots;
4. checks exact scalar/container types before length, iteration, callable,
   equality, hash, lookup, formatting, or call;
5. compares every current scalar and nested reference with the issued
   snapshot using `is`;
6. recursively revalidates every issued child; and
7. returns the immutable snapshot consumed by its caller.

Invalid values produce the exact static `DoctorContractError` via
`raise ... from None`; both cause and context are `None`.

### Bindings and observations

- `run_doctor` accepts only an exact tuple of six bindings.
- Every element must be an issued exact `ProbeBinding` with its exact
  `CheckId`; order must equal the canonical inventory.
- The complete tuple is validated and copied into safe
  `(check_id, probe)` snapshots before the first intentional callback.
- A probe callable is explicit trusted authority. It has no canonical
  identity requirement and is invoked once.
- A probe may mutate a later caller-owned binding after capture; the already
  validated captured callable is used without rereading that binding.
- Probe output must be an issued exact unchanged `ProbeObservation`.
  Status and code are returned from its safe snapshot before any outcome-map
  hash or lookup.
- Ordinary `Exception` probe failures retain the allowlisted static probe
  error outcome. `KeyboardInterrupt`, `SystemExit`, `GeneratorExit`, and a
  direct custom `BaseException` propagate unchanged.

### Registry authority

- The canonical private registry and the detached public registry projection
  both consist entirely of issued exact DTO graphs.
- Their root tuples, definitions, outcome tuples, outcomes, and remediations
  are bound to separate exact identity graphs.
- The private definition map, nested outcome maps, observation-pair set, and
  canonical check-id tuple are bound to their original authority objects.
- Every map entry is rechecked against the exact issued canonical definition
  or outcome before use.
- Public/canonical alias substitution and structurally equal replacement fail
  before primitive fingerprinting or any probe.
- A tainted public authority invalidates run and every public result boundary;
  restoring its visible field value cannot restore issuance.

### Results and renderers

- `DoctorCheck`, `DoctorResult`, and `DoctorRun` snapshots retain their exact
  matched canonical definition/outcome authority.
- `DoctorRun`, `validate_result`, `project_result`, `render_json`, and
  `render_human` recursively revalidate the complete issued result graph.
- The result validator returns schema version, profile id, aggregate status,
  exact checks, nested remediation snapshots, and canonical authority as one
  immutable safe snapshot.
- JSON projection and both renderers consume only that snapshot. They never
  validate and then reread the caller-owned `DoctorResult`.

### Documentation

`docs/doctor.md` now documents the shipped pure injected result core, stable
projection, issuance boundary, exact binding and observation rules, safe
snapshot consumption, static exception behavior, and the explicit threat
exclusions.

No new ADR was added. This change implements the already reviewed H/0/01
admission decision and does not introduce a cross-component architecture
decision.

## Threat boundary

The supported claim starts when a value is presented to a DOCTOR boundary.
It excludes:

- code executed in an attacker-defined class or metaclass body before
  presentation; and
- an attacker already able to mutate DOCTOR module globals, DTO classes,
  private issuance/storage/authority maps, or Python builtins.

Within that boundary, rejection causes zero DOCTOR-triggered hostile
`getattr`, iteration, callable invocation, equality, hash, `repr`, `str`,
`bool`, or field-call callbacks.

## TDD evidence

### RED 1 — minimum provenance gaps

Commit:

```text
ee1430390443e3a5fdf08580547680f89e947d58
tree eeb4bffb91cfe7aa3aca8be4ac2cbfa2bb8ea90b
test(h001): expose doctor provenance gaps
```

Direct parent: exact sealed Trial 6 KO
`d71c88452b4cd06f21fbb3c24fe21b21c8f38e6d`.

Result against the unchanged Trial 6 source:

```text
7 failed, 94 passed
```

The seven failures were:

- three non-exact binding containers;
- one exact but unissued binding;
- one exact but unissued observation;
- one same-value-mutated issued observation; and
- one later-binding reread after the first probe.

### RED 2 — complete adversarial matrix

Commit:

```text
230990144fec8eb6ad8f5956998b258997d8b506
tree 06a5659c86bba72cba525e5c727abc1d8097a49e
test(h001): define doctor issuance matrix
```

Result against the same unchanged Trial 6 source:

```text
45 failed, 165 passed
```

The expanded failures comprised the seven minimum cases, 22 DTO
issuance/mutation cases, five registry/public-boundary cases, eight result
boundary cases, and three validate-then-reread cases. Cases already safely
rejected by the old value validators remained green while still contributing
to the full matrix.

### RED 3 — exact container semantics

Commit:

```text
f4b8d21ea09a300bf677ec7e72674f1fac8cea24
tree 5d9c612864b4b581b772c1e71f80e8bae4fe322d
test(h001): align exact binding container boundary
```

The obsolete binding-iterable `BaseException` test was removed because
non-tuples are no longer iterated. Authorized probe `BaseException`
propagation remains covered. Final RED:

```text
45 failed, 162 passed
```

All three RED commits changed only `tests/cli/test_doctor.py`. The final RED
test blob is:

```text
4544009cf6b5528542f00759ab8705e2a52ef632
```

It is byte-identical at the technical and documentation commits.

### GREEN

Technical commit:

```text
c1f5dc9292453a319d8a29aed5462dc602681fba
tree 65f7361fed031212109152e8ccfb5137c6e7ed5d
fix(h001): enforce doctor issuance provenance
```

Direct parent: final tests-only RED `f4b8d21...`.

The technical commit changes only `cli/src/agents_cli/doctor.py`.

Task-owned documentation commit:

```text
6bbff329c6f30730a58b573f5ca869bf02e24e41
tree ceb1572a6643c00b537354d2ef29a1950272dbea
docs(doctor): document issuance boundary
```

The documentation commit changes only `docs/doctor.md`.

## Verification

### Complete focused inventory

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial7-postdocs-focal \
  tests/cli/test_doctor.py
```

Result:

```text
207 passed in 5.91s
```

### Adversarial issuance matrix

The directed selection covers the eight DTO admission matrix, three mutation
forms, constructors, container subclasses, all result boundaries, exact
binding containers, binding/observation issuance, safe capability capture,
and no-reread consumers:

```text
116 passed, 91 deselected in 3.02s
```

All hostile callback inventories remained empty on rejection.

### Structure

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial7-postdocs-structure \
  tests/structure/test_h001_sample.py \
  tests/structure/test_project_layout.py
```

Result:

```text
8 passed in 0.05s
```

### Schema and closed corpus

`python -m json.tool schemas/doctor-result-v1.schema.json` passed, as did
`Draft202012Validator.check_schema`.

The exhaustive offline corpus retained:

```text
registry: 6 checks / 35 outcomes
schema-valid projections: 70
wrong aggregate statuses rejected: 140
exit relationships checked: 70
profile Python/schema parity: 10 accepted / 458 rejected
```

The result schema is byte-identical to the Trial 7 base:

```text
49f05a54526ac4c8505bb31236099f8ba7c5678c
```

### Authority inventories

The 82 public authority nodes were each replaced once by a structurally equal
issued object and once by the corresponding private canonical alias. Each run
used a freshly loaded module because a tainted issued authority is
permanently invalid:

```text
identity drift rejected: 164; bindings=0 fingerprints=0
```

Selecting every one of 35 outcomes and retaining all six result remediations
produced:

```text
fresh result remediations: 210; canonical=0 public=0 reused=0
```

The explicit custom control signal produced:

```text
custom BaseException propagation: 1/1 unchanged
```

### Lint and formatting

```text
uv run --offline --no-project --with ruff \
  ruff check --no-cache \
  cli/src/agents_cli/doctor.py tests/cli/test_doctor.py

uv run --offline --no-project --with ruff \
  ruff format --check --no-cache \
  cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
```

Result:

```text
All checks passed!
2 files already formatted
```

`git diff --check` also passed. The doctor source imports only Python
standard-library modules.

## Frozen identity and range

- Branch: `feat/V5-H-0-01-doctor`.
- Exact Trial 7 base:
  `d71c88452b4cd06f21fbb3c24fe21b21c8f38e6d`
  (tree `4049f8924bb01b5617225c696ad8eff3079288ba`).
- RED 1: `ee1430390443e3a5fdf08580547680f89e947d58`.
- RED 2: `230990144fec8eb6ad8f5956998b258997d8b506`.
- RED 3: `f4b8d21ea09a300bf677ec7e72674f1fac8cea24`.
- Technical:
  `c1f5dc9292453a319d8a29aed5462dc602681fba`
  (tree `65f7361fed031212109152e8ccfb5137c6e7ed5d`).
- Task-owned documentation:
  `6bbff329c6f30730a58b573f5ca869bf02e24e41`
  (tree `ceb1572a6643c00b537354d2ef29a1950272dbea`).

Parentage is direct and linear:

```text
d71c88452b4cd06f21fbb3c24fe21b21c8f38e6d
  -> ee1430390443e3a5fdf08580547680f89e947d58
  -> 230990144fec8eb6ad8f5956998b258997d8b506
  -> f4b8d21ea09a300bf677ec7e72674f1fac8cea24
  -> c1f5dc9292453a319d8a29aed5462dc602681fba
  -> 6bbff329c6f30730a58b573f5ca869bf02e24e41
```

Exact implementation/documentation range:

```text
d71c88452b4cd06f21fbb3c24fe21b21c8f38e6d..
6bbff329c6f30730a58b573f5ca869bf02e24e41
```

Net task-owned paths:

```text
cli/src/agents_cli/doctor.py  +922/-374
tests/cli/test_doctor.py      +589/-238
docs/doctor.md                 +52/-8
```

Final blobs:

```text
cli/src/agents_cli/doctor.py
  886f92bc1714333650c2a2128ad68732b56dd07a
tests/cli/test_doctor.py
  4544009cf6b5528542f00759ab8705e2a52ef632
docs/doctor.md
  8244eb509dc102cf9f6288675ecfee7b9b2728b8
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
```

All remain mode `100644`.

## Postflight

Immediately before this request-only file was created:

- the implementation/documentation worktree was clean;
- `git diff --check` passed;
- every Trial 7 pytest basetemp checked was absent;
- `.pytest_cache/`, `.ruff_cache/`, `cli/.ruff_cache/`,
  `tests/cli/__pycache__/`, and `tests/structure/__pycache__/` were absent; and
- the generated `cli/src/agents_cli/__pycache__/` was removed and confirmed
  absent.

No checkout, worktree, process supervisor, service, or generated project
artifact was created.

## Honest limits

This lane did not run aggregate CI, installation, npm, network access, a real
provider, Redis, Gateway, MCP, KYA, tmux, coordination, shared services,
portability, integration, promotion, publication, or release.

It did not modify `cli/main.py`, real doctor probes, adapters, repositories,
policy registries, shared configuration, manifests, workflows, lock files,
suite hashes, plan indexes, root README, changelog, `message.*`, or
`agents:events`.

Only cached offline Python tooling and injected in-memory fakes were used.
This request does not claim an independent verdict, the PROBES or PORTABILITY
slices, completion of H/0/01, integration, promotion, publication, or release.

## Commits

- `ee1430390443e3a5fdf08580547680f89e947d58` -
  `test(h001): expose doctor provenance gaps`
- `230990144fec8eb6ad8f5956998b258997d8b506` -
  `test(h001): define doctor issuance matrix`
- `f4b8d21ea09a300bf677ec7e72674f1fac8cea24` -
  `test(h001): align exact binding container boundary`
- `c1f5dc9292453a319d8a29aed5462dc602681fba` -
  `fix(h001): enforce doctor issuance provenance`
- `6bbff329c6f30730a58b573f5ca869bf02e24e41` -
  `docs(doctor): document issuance boundary`

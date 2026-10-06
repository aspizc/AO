# Review Submission - Project V5 H/0/01 DOCTOR (Trial 5)

## Review boundary

This request covers only the two P1 corrections required by
`H_0_1_DOCTOR` Trial 4:

- seal all eight public doctor DTO types against subclass-controlled
  observables and normal class-hook reassignment;
- make the public registry gate sensitive to the exact detached projection
  graph, not only its primitive fingerprint; and
- ensure every public result owns fresh remediation DTOs instead of exposing
  canonical registry objects.

This request does not cover command wiring, real probes, portability,
integration, promotion, publication, release, or completion of the full
H/0/01 sheet.

## What was done

- `Remediation`, `OutcomeDefinition`, `CheckDefinition`, `ProbeObservation`,
  `ProbeBinding`, `DoctorCheck`, `DoctorResult`, and `DoctorRun` are now
  runtime-final concrete types.
- Their metaclass rejects both dynamic and class-syntax subclass construction
  before `type.__new__` can install descriptor-backed `repr`, `str`, equality,
  or hash hooks.
- Each concrete DTO receives its own constant opaque representation and
  identity-only equality/hash hooks when it is sealed.
- Normal class attribute assignment and deletion are rejected after sealing,
  so callers cannot replace those hooks on the public DTO types.
- The detached public registry now has a private expected identity graph for
  all six definitions, six nested outcome tuples, 35 outcomes, and 35
  remediations.
- Registry validation checks that identity graph before any recursive
  primitive validation or fingerprint calculation. Reassignment, fresh
  structurally equal clones, and reintroduced private aliases are rejected
  before binding materialization, probes, or fingerprint callbacks.
- Runtime resolution and rendering remain authoritative only from
  `_CANONICAL_CHECK_REGISTRY` and its private derived maps.
- Every `DoctorCheck` created by `run_doctor` now receives a newly constructed
  `Remediation` projected from the selected canonical outcome.
- Mutating a remediation from a prior run makes only that result invalid; it
  cannot alter canonical authority, future runs, JSON output, or human output.
- Mutating a public registry remediation still fails closed before probes,
  while already-created detached results and future runs after restoration
  retain canonical output.

## Safety decisions

- Finality is enforced by the DTO metaclass before delegating to
  `type.__new__`; hostile `__set_name__` hooks therefore cannot run.
- The opaque representation text is captured while the concrete DTO is sealed
  and no longer reads a runtime class name or any instance field.
- Sealed concrete classes reject normal attribute assignment and deletion.
  The private setup helper uses `type.__setattr__` only before setting the
  final marker.
- Identity validation uses exact object identity and trusted tuple traversal;
  it performs no field equality, hashing, representation, string conversion,
  truth conversion, or callback invocation.
- Primitive fingerprint validation is retained as the second gate, preserving
  rejection of value drift after the exact public graph has been verified.
- Result remediations are constructed anew for every check and every run.
  Canonical definitions, outcomes, and remediations never enter a public
  result by identity.
- New boundaries catch only ordinary `Exception` where sanitization is
  required. Existing `KeyboardInterrupt`, `SystemExit`, `GeneratorExit`, and
  direct `BaseException` propagation remains unchanged.
- No schema change was necessary because the stable JSON projection is
  unchanged.

## TDD evidence

### RED

- Commit:
  `a82cb8a476a890dface28bce5a2c4c71f39b9351`
  (tree `a267f9759ded0553238df8a76d71479dfa290350`).
- Direct parent:
  `b5149521a4dcec072276fe71b9546f055b9f968f`, the exact clean Trial 4 KO.
- Changed only `tests/cli/test_doctor.py`.
- Complete focused offline result: `20 failed, 81 passed`.
- The failures were exactly:
  - eight public DTO types accepted dynamic hostile subclasses;
  - eight public DTO types allowed normal observable-hook reassignment;
  - two structurally equal nested public replacements reached the primitive
    fingerprint; and
  - two result-remediation tests reproduced canonical identity exposure.
- The same tests also include class-syntax subclass rejection, all four
  observable hooks, a same-value definition replacement, zero-probe and
  zero-fingerprint assertions, the complete 35-outcome remediation inventory,
  prior-result mutation, and public-projection mutation.
- Ruff lint and format checks passed at the RED checkpoint.

### GREEN

- Commit:
  `5d01bdfa953e84ee73c8b7fe3b16e49a97f9c6e9`
  (tree `b74b53121c60f98abae07db9ea776942b2aa2e67`).
- Direct parent:
  `a82cb8a476a890dface28bce5a2c4c71f39b9351`.
- Changed only `cli/src/agents_cli/doctor.py`.
- Complete focused doctor result: `101 passed`.
- The RED/final test blob is byte-identical:
  `3ecaf0b978d9d49a71aad936b8f197f78353d49e`.

## Verification

- Complete doctor inventory:

  ```text
  PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
    uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q -p no:cacheprovider \
    --basetemp=/tmp/h001-doctor-trial5-final-pytest \
    tests/cli/test_doctor.py
  ```

  Result: `101 passed in 0.16s`.

- Exact integrated structure inventory:

  ```text
  PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
    uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q -p no:cacheprovider \
    --basetemp=/tmp/h001-doctor-trial5-final-structure \
    tests/structure/test_h001_sample.py \
    tests/structure/test_project_layout.py
  ```

  Result: `8 passed in 0.05s`.

- Directed Ruff:

  ```text
  uv run --offline --no-project --with ruff \
    ruff check --no-cache \
    cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
  uv run --offline --no-project --with ruff \
    ruff format --check --no-cache \
    cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
  ```

  Result: lint passed; both files were already formatted.

- `python -m json.tool schemas/doctor-result-v1.schema.json` passed.
- `Draft202012Validator.check_schema` passed.
- The offline closed-inventory/schema corpus retained:

  ```text
  registry: 6 checks / 35 outcomes
  schema-valid projections: 70
  wrong aggregate statuses rejected: 140
  exit relationships checked: 70
  profile Python/schema parity: 10 accepted / 458 rejected
  ```

- The profile corpus preserves credential-prefix denial, exact length
  boundaries, bytes, CR/LF/CRLF, Unicode line separators, non-BMP input, and
  every disallowed appended byte from `0x00` through `0xff`.
- The all-eight adversarial subclass matrix rejected the Trial 4 hostile
  metaclass reproduction with zero class-name callbacks.
- A directed private-alias reproduction replaced a public definition's
  outcomes with the corresponding canonical private tuple. It was rejected
  with zero probes and an exact context-free base `DoctorContractError`.
- Exact reconstructed DTO and normal callable tests retain constant opaque
  representation, identity equality/hash, no canary content, and zero field
  callbacks.
- Registry reassignment, changed-value aliasing, same-value identity drift,
  and definition/outcome/remediation mutation all fail before probes.
- Post-probe internal resolution still yields an exact base
  `DoctorContractError` with both cause and context equal to `None`.
- Existing iterable recursion, renderers, inventory, aggregate status,
  denylist, schema parity, control-signal propagation, and exit `0`/`1`/`2`
  coverage remains green.
- `git diff --check` passed.
- The result schema is byte-identical to the Trial 5 base:
  `49f05a54526ac4c8505bb31236099f8ba7c5678c`.
- The doctor source still imports only Python standard-library modules.

## Frozen identity and range

- Branch: `feat/V5-H-0-01-doctor`.
- Exact Trial 5 base:
  `b5149521a4dcec072276fe71b9546f055b9f968f`
  (tree `c471a410d0e92143fcfd42b38b13828646213146`).
- RED:
  `a82cb8a476a890dface28bce5a2c4c71f39b9351`.
- Final technical:
  `5d01bdfa953e84ee73c8b7fe3b16e49a97f9c6e9`
  (tree `b74b53121c60f98abae07db9ea776942b2aa2e67`).
- Exact Trial 5 technical range:
  `b5149521a4dcec072276fe71b9546f055b9f968f..5d01bdfa953e84ee73c8b7fe3b16e49a97f9c6e9`.

Parentage is direct and linear:

```text
b5149521a4dcec072276fe71b9546f055b9f968f
  -> a82cb8a476a890dface28bce5a2c4c71f39b9351
  -> 5d01bdfa953e84ee73c8b7fe3b16e49a97f9c6e9
```

Net Trial 5 technical paths and final blobs:

```text
cli/src/agents_cli/doctor.py
  8c7b7330e947b0d626f3c29c7e2caf674de74fd7
tests/cli/test_doctor.py
  3ecaf0b978d9d49a71aad936b8f197f78353d49e
```

Both files remain mode `100644`. The exact technical range changes only those
two paths (`+405/-4`):

```text
cli/src/agents_cli/doctor.py  +91/-4
tests/cli/test_doctor.py      +314/-0
```

## Postflight

Immediately before this request-only file was created, each authorized cache
path was checked individually and was absent:

```text
.pytest_cache/
.ruff_cache/
cli/.ruff_cache/
cli/src/agents_cli/__pycache__/
tests/cli/__pycache__/
tests/structure/__pycache__/
```

Every exact Trial 5 basetemp path created by this lane was also absent:

```text
/tmp/h001-doctor-trial5-red-pytest
/tmp/h001-doctor-trial5-green-pytest
/tmp/h001-doctor-trial5-final-pytest
/tmp/h001-doctor-trial5-final-structure
```

The worktree was clean at the exact technical HEAD before this request-only
file was created.

## Honest limits

This lane did not modify or execute `cli/main.py`, shared output helpers, real
doctor probes, providers, Redis, Gateway, MCP, KYA, coordination, shared
configuration, policy registries, sample/bootstrap behavior, documentation,
manifests, workflows, locks, suite hashes, plan indexes, root README, audit
surfaces, `message.*`, or `agents:events`.

It did not run aggregate suites, CI, installation, npm, network access, a real
provider, Redis, MCP, KYA, tmux, agents, subagents, shared services,
portability, integration, promotion, publication, or release.

Only local offline cached Python tooling and injected in-memory fakes were
used. No additional checkout, worktree, process supervisor, or service was
created.

This request does not claim an independent verdict, the PROBES or PORTABILITY
slices, completion of H/0/01, integration, promotion, publication, or release.

## Commits

- `a82cb8a476a890dface28bce5a2c4c71f39b9351` -
  `test(h001): expose doctor identity isolation gaps`
- `5d01bdfa953e84ee73c8b7fe3b16e49a97f9c6e9` -
  `fix(h001): seal doctor identity boundaries`

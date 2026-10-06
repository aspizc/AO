# Review Submission - Project V5 H/0/01 DOCTOR (Trial 6)

## Review boundary

This request covers only the P1 runtime-finality correction required by
`H_0_1_DOCTOR` Trial 5:

- prevent ordinary derivation of `_OpaqueDTOType`, including class syntax,
  `type()`, direct `type.__new__`, and a reasonable custom meta-metaclass;
- retain a concrete DTO hierarchy fallback when a caller directly bypasses
  `_OpaqueDTOType.__new__`; and
- inspect multiple bases without dispatching through a hostile base
  metaclass's `__dict__` or `__mro__` hooks.

This request does not cover command wiring, real probes, portability,
integration, promotion, publication, release, or completion of the full
H/0/01 sheet.

## What was done

- `_OpaqueDTOType.__init_subclass__` now fails closed, so a derived metaclass
  cannot be created and then omit `_OpaqueDTOType.__new__`.
- `_OpaqueDTO.__init_subclass__` supplies a redundant hierarchy fallback. It
  permits only direct internal DTO construction from `_OpaqueDTO`, which keeps
  both ordinary and `slots=True` dataclass class creation compatible.
- A direct `type.__new__` attempt against any of the eight sealed concrete DTO
  bases is rejected by that inherited fallback and returns no class.
- `_OpaqueDTOType.__new__` now checks the complete base MRO for a sealed DTO
  marker through explicit `type.__getattribute__` calls.
- The MRO/namespace scan is fail-closed and does not use normal
  `base.__dict__`, `base.__mro__`, equality, hashing, representation, string
  conversion, or other attacker-controlled dispatch.
- The existing early metaclass gate still rejects ordinary supported
  class/`type()` subclass creation before descriptor `__set_name__` hooks can
  install on a DTO subclass.

## Safety decisions

- The metaclass finality hook does not inspect attacker namespace content and
  does not invoke a derived metaclass hook.
- Tests do not attribute class-body, `__prepare__`, or custom meta-metaclass
  callbacks that occur before a DTO base is presented to this boundary. The
  custom meta-metaclass test permits its own construction callback and proves
  that no bypass metaclass is returned or can serve.
- Descriptor, representation, string, hash, and reflected-equality callbacks
  are attached only to the attempted DTO subclass. They remain untouched
  because the bypass metaclass cannot be created.
- The direct `type.__new__` fallback test uses a callback-free namespace and
  proves that no concrete DTO subclass is returned even when the normal
  metaclass `__new__` entry point is skipped.
- Multiple-base scanning calls the C-level `type.__getattribute__`
  implementation explicitly. A hostile base metaclass therefore receives no
  `__dict__` or `__mro__` callback.
- The Trial 5 sealed observable hooks, exact public identity graph, primitive
  fingerprint, fresh result remediation projection, and exception/control
  boundaries are unchanged.
- No schema change was necessary.

## TDD evidence

### RED

- Commit:
  `8527653fdff3eae92c1ef50d3d6add1f83b12788`
  (tree `512de8a234e647d980ea1599c8996c13cc5b476d`).
- Direct parent:
  `01c6a11508c8b855a08bb70bf715ad34fd58e0d5`, the exact clean Trial 5 KO.
- Changed only `tests/cli/test_doctor.py`.
- Complete focused offline result: `48 failed, 101 passed`.
- The failures were exactly:
  - 32 derived-metaclass bypasses: four construction routes for each of the
    eight public DTOs;
  - eight direct `type.__new__` concrete hierarchy fallback gaps; and
  - eight hostile multiple-base `base.__dict__` dispatches.
- Every 101 inherited test remained green.
- Ruff lint and format checks passed at the RED checkpoint.

### GREEN

- Commit:
  `133cfd8e159ce5a880964dd1ee3270c93aa2a5c5`
  (tree `bb9cb19a1f5eb4952db8bc96b0e86ab311edf9cc`).
- Direct parent:
  `8527653fdff3eae92c1ef50d3d6add1f83b12788`.
- Changed only `cli/src/agents_cli/doctor.py`.
- Complete focused doctor result: `149 passed`.
- The RED/final test blob is byte-identical:
  `5592ed2c1670ef76f73e3ef1ba2f8cf9b7916818`.

## Verification

- Complete doctor inventory:

  ```text
  PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
    uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q -p no:cacheprovider \
    --basetemp=/tmp/h001-doctor-trial6-final-pytest \
    tests/cli/test_doctor.py
  ```

  Result: `149 passed in 0.20s`.

- Exact integrated structure inventory:

  ```text
  PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
    uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q -p no:cacheprovider \
    --basetemp=/tmp/h001-doctor-trial6-final-structure \
    tests/structure/test_h001_sample.py \
    tests/structure/test_project_layout.py
  ```

  Result: `8 passed in 0.06s`.

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

- The exhaustive Trial 5 authority inventories retained:

  ```text
  identity drift rejected: 164; bindings=0 fingerprints=0
  fresh result remediations: 210; canonical=0 public=0 reused=0
  ```

- The 32-case derived-metaclass matrix covers class-syntax construction,
  `type()`, direct `type.__new__`, and a custom meta-metaclass for every public
  DTO. No bypass metaclass or DTO subclass is returned; DTO `__set_name__`,
  `repr`, `str`, hash, and reflected-equality callbacks remain untouched.
- The eight direct fallback cases skip `_OpaqueDTOType.__new__` explicitly;
  `_OpaqueDTO.__init_subclass__` still rejects every concrete DTO subclass.
- The eight multiple-base cases put a hostile unrelated base before each
  concrete DTO and invoke the finality scan directly. All reject with zero
  hostile `__dict__`/`__mro__` callbacks.
- Normal public observable-hook assignment/deletion remains rejected for all
  eight DTOs.
- Exact forged DTOs and valid callable bindings retain constant opaque
  representation, identity equality/hash, no canary content, and zero field
  callbacks.
- Public registry reassignment, 164 same-value/private identity aliases,
  changed-value nested mutations, and canonical aliases fail before bindings
  or fingerprints.
- The post-probe resolution error remains the exact base
  `DoctorContractError` with both cause and context equal to `None`.
- `KeyboardInterrupt`, `SystemExit`, `GeneratorExit`, and a direct custom
  `BaseException` continue to propagate from probe and binding boundaries.
- `git diff --check` passed.
- The result schema is byte-identical to the Trial 6 base:
  `49f05a54526ac4c8505bb31236099f8ba7c5678c`.
- The doctor source still imports only Python standard-library modules.

## Frozen identity and range

- Branch: `feat/V5-H-0-01-doctor`.
- Exact Trial 6 base:
  `01c6a11508c8b855a08bb70bf715ad34fd58e0d5`
  (tree `cf3935736f23ac0a14c8c6b137752d7ba06c2806`).
- RED:
  `8527653fdff3eae92c1ef50d3d6add1f83b12788`.
- Final technical:
  `133cfd8e159ce5a880964dd1ee3270c93aa2a5c5`
  (tree `bb9cb19a1f5eb4952db8bc96b0e86ab311edf9cc`).
- Exact Trial 6 technical range:
  `01c6a11508c8b855a08bb70bf715ad34fd58e0d5..133cfd8e159ce5a880964dd1ee3270c93aa2a5c5`.

Parentage is direct and linear:

```text
01c6a11508c8b855a08bb70bf715ad34fd58e0d5
  -> 8527653fdff3eae92c1ef50d3d6add1f83b12788
  -> 133cfd8e159ce5a880964dd1ee3270c93aa2a5c5
```

Net Trial 6 technical paths and final blobs:

```text
cli/src/agents_cli/doctor.py
  e9d1a562a31a823bd0ab021d6801bf02e50d36d7
tests/cli/test_doctor.py
  5592ed2c1670ef76f73e3ef1ba2f8cf9b7916818
```

Both files remain mode `100644`. The exact technical range changes only those
two paths (`+213/-1`):

```text
cli/src/agents_cli/doctor.py  +22/-1
tests/cli/test_doctor.py      +191/-0
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

Every exact Trial 6 basetemp path created by this lane was also absent:

```text
/tmp/h001-doctor-trial6-red-pytest
/tmp/h001-doctor-trial6-green-pytest
/tmp/h001-doctor-trial6-final-pytest
/tmp/h001-doctor-trial6-final-structure
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

- `8527653fdff3eae92c1ef50d3d6add1f83b12788` -
  `test(h001): expose doctor metaclass bypasses`
- `133cfd8e159ce5a880964dd1ee3270c93aa2a5c5` -
  `fix(h001): harden doctor finality fallback`

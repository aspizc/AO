# Review Submission - Project V5 H/0/01 DOCTOR (Trial 4)

## Review boundary

This request covers only the two P1 corrections required by
`H_0_1_DOCTOR` Trial 3 and the nested-alias correction found before the GREEN
was sealed:

- make representation, string conversion, equality, and hashing of all eight
  public doctor DTOs opaque and independent of their fields;
- separate the public `CHECK_REGISTRY` projection from the private canonical
  registry used by execution, outcome resolution, result validation, and
  renderers;
- reject reassignment or nested mutation of the public projection before any
  binding is materialized or probe is called; and
- discard an ordinary probe exception before resolving its static failure
  outcome, including when that later resolution fails internally.

This request does not cover command wiring, real probes, portability,
integration, promotion, publication, release, or completion of the full
H/0/01 sheet.

## What was done

- `Remediation`, `OutcomeDefinition`, `CheckDefinition`, `ProbeObservation`,
  `ProbeBinding`, `DoctorCheck`, `DoctorResult`, and `DoctorRun` now disable
  generated dataclass `repr`, equality, and hash behavior.
- Their shared explicit policy renders as `<TypeName opaque>`, compares by
  identity, and hashes by identity. No operation reads, represents, compares,
  hashes, stringifies, or invokes a provided field.
- A valid `ProbeBinding` callable is excluded from every observable in the
  same way as exact DTOs reconstructed with hostile fields.
- `_CANONICAL_CHECK_REGISTRY` is now the sole runtime authority. Its definition,
  outcome, and remediation DTOs are distinct from every corresponding object
  exposed through `CHECK_REGISTRY`.
- The public registry is still an immutable, canonically ordered tuple for
  inspection. A closed primitive fingerprint validates its complete deep
  projection before binding materialization or probe execution.
- Reassigning the public registry, or mutating a public definition, outcome, or
  remediation through `object.__setattr__`, produces the exact base
  `DoctorContractError` before probes or hostile callbacks. Existing results
  continue to validate and render from the unaffected private inventory.
- Ordinary probe exceptions now leave their `except` block before the
  exception outcome is selected. Later resolution failures are sanitized
  after their own handler and raise the exact static base error with both
  `__cause__` and `__context__` equal to `None`.

## Safety decisions

- Public DTO observables use no field-derived content, including for valid
  objects. Identity semantics avoid invoking arbitrary callable or hostile
  primitive comparison and hash methods.
- The public projection is a deep DTO copy, not only a distinct outer tuple.
  Definition, outcome, and remediation identity are independently separated.
- Registry parity is compared only after exact recursive primitive validation.
  Hostile non-primitives are rejected before equality, hashing,
  representation, string conversion, truth conversion, or invocation.
- Runtime execution, lookup maps, recursive result validation, projection, and
  both renderers consume only the private canonical registry.
- Every new sanitization boundary catches only `Exception`.
  `KeyboardInterrupt`, `SystemExit`, and `GeneratorExit` retain their existing
  propagation behavior.
- No schema change was necessary because the corrections affect Python DTO
  observables and registry authority, not the stable JSON projection.

## TDD evidence

### RED 1

- Commit:
  `dd0dad765b886fac74fa3db9c043e52e8f0b164a`
  (tree `eea67001bdd424ac1579471e41f312ac927f3812`).
- Direct parent:
  `fe00bec0dc02708bd51a1600a178523a350e3d55`, the exact clean Trial 3 KO.
- Changed only `tests/cli/test_doctor.py`.
- Complete focused offline result: `11 failed, 65 passed`.
- The failures were exactly:
  - eight exact reconstructed DTO observable cases;
  - one normally constructed valid observable callable in `ProbeBinding`;
  - one hostile public-registry reassignment case; and
  - one post-probe internal-resolution failure case.
- Ruff lint and format checks passed at the RED checkpoint.

### RED 2

- Commit:
  `a816cd796bc537f84d9148125ebbde5fd13dba45`
  (tree `5e9d5270bf68243e069ce76cc8f386fe1e339462`).
- Direct parent:
  `dd0dad765b886fac74fa3db9c043e52e8f0b164a`.
- Changed only `tests/cli/test_doctor.py`; it did not amend RED 1.
- The directed checkpoint over the first uncommitted correction reproduced
  `3 failed, 76 passed`: public definition, outcome, and remediation still
  aliased the private authority.
- The exact committed RED 2 tree was also exported with `git archive`, without
  a checkout or worktree. Its accumulated focused result was
  `14 failed, 65 passed`: the 11 RED 1 failures plus the three new deep
  projection cases against the pre-correction production module.
- Ruff lint and format checks passed at the RED 2 checkpoint.

### GREEN

- Commit:
  `32a848faad265cd66385fa8ee1a366c64d2d3ff3`
  (tree `7242fc62286b89e676e87ad9a8c5774baeaf9914`).
- Direct parent:
  `a816cd796bc537f84d9148125ebbde5fd13dba45`.
- Changed only `cli/src/agents_cli/doctor.py`.
- Complete focused doctor result: `79 passed`.
- The RED 2/final test blob is byte-identical:
  `c0f06e7ce9401498388f167bd40a1c2d8acf8b02`.
- The RED 1 test blob remains preserved at:
  `4751b0933a0544a3147cc3587f5e00a38427180f`.

## Verification

- Complete doctor inventory:

  ```text
  PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
    uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q -p no:cacheprovider \
    --basetemp=/tmp/h001-doctor-trial4-final-pytest \
    tests/cli/test_doctor.py
  ```

  Result: `79 passed in 0.15s`.

- Exact integrated structure inventory:

  ```text
  PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
    uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q -p no:cacheprovider \
    --basetemp=/tmp/h001-doctor-trial4-final-structure \
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
- The offline closed-inventory/schema corpus reconstructed all `35` outcomes
  across six definitions and both accepted profiles:

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
- Exact reconstructed DTO and normal callable tests assert constant opaque
  representation, identity equality/hash, no canary content, and zero field
  callbacks.
- Registry reassignment and all three nested alias tests assert zero probe and
  hostile callbacks, exact context-free base errors, private inventory
  stability, and unchanged JSON/human renderers.
- Existing iterable recursion, renderer, inventory, aggregate-status,
  denylist, schema-parity, and exit `0`/`1`/`2` coverage remains green.
- `git diff --check` passed.
- The result schema is byte-identical to the Trial 4 base:
  `49f05a54526ac4c8505bb31236099f8ba7c5678c`.
- The doctor source still imports only Python standard-library modules.

## Frozen identity and range

- Branch: `feat/V5-H-0-01-doctor`.
- Exact Trial 4 base:
  `fe00bec0dc02708bd51a1600a178523a350e3d55`
  (tree `b68f08a25510c61f7731767e947cfed593bd09dc`).
- RED 1:
  `dd0dad765b886fac74fa3db9c043e52e8f0b164a`.
- RED 2:
  `a816cd796bc537f84d9148125ebbde5fd13dba45`.
- Final technical:
  `32a848faad265cd66385fa8ee1a366c64d2d3ff3`
  (tree `7242fc62286b89e676e87ad9a8c5774baeaf9914`).
- Exact Trial 4 technical range:
  `fe00bec0dc02708bd51a1600a178523a350e3d55..32a848faad265cd66385fa8ee1a366c64d2d3ff3`.

Parentage is direct and linear:

```text
fe00bec0dc02708bd51a1600a178523a350e3d55
  -> dd0dad765b886fac74fa3db9c043e52e8f0b164a
  -> a816cd796bc537f84d9148125ebbde5fd13dba45
  -> 32a848faad265cd66385fa8ee1a366c64d2d3ff3
```

Net Trial 4 technical paths and final blobs:

```text
cli/src/agents_cli/doctor.py
  e928b12ccb888d5ff9ae6db81c2cd254f31a1d72
tests/cli/test_doctor.py
  c0f06e7ce9401498388f167bd40a1c2d8acf8b02
```

Both files remain mode `100644`. The exact technical range changes only those
two paths (`+369/-26`):

```text
cli/src/agents_cli/doctor.py  +126/-26
tests/cli/test_doctor.py      +243/-0
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

Every exact Trial 4 basetemp/export path created by this lane was also absent:

```text
/tmp/h001-doctor-trial4-red-pytest
/tmp/h001-doctor-trial4-green-pytest
/tmp/h001-doctor-trial4-red2-pytest
/tmp/h001-doctor-trial4-green2-pytest
/tmp/h001-doctor-trial4-final-pytest
/tmp/h001-doctor-trial4-final-structure
/tmp/h001-doctor-trial4-red2-archive.fapIxV
/tmp/h001-doctor-trial4-red2-archive-pytest
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
used. The historical RED 2 used a disposable `git archive`; no additional
checkout or worktree was created.

This request does not claim an independent verdict, the PROBES or PORTABILITY
slices, completion of H/0/01, integration, promotion, publication, or release.

## Commits

- `dd0dad765b886fac74fa3db9c043e52e8f0b164a` -
  `test(h001): expose doctor observable authority gaps`
- `a816cd796bc537f84d9148125ebbde5fd13dba45` -
  `test(h001): expose public registry aliasing`
- `32a848faad265cd66385fa8ee1a366c64d2d3ff3` -
  `fix(h001): isolate doctor registry authority`

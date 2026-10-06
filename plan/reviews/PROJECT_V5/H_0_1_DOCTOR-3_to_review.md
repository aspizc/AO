# Review Submission - Project V5 H/0/01 DOCTOR (Trial 3)

## Review boundary

This request covers only the two P1 corrections required by
`H_0_1_DOCTOR` Trial 2:

- recursively validate a complete exact `DoctorResult` before
  `DoctorRun` accepts its status/exit envelope; and
- recursively validate registry-definition DTO graphs and every primitive
  before comparison, hashing, representation, string conversion, or
  serialization.

The RED also demonstrated that `_validate_registry` had the same trust gap, so
the technical correction applies the same child-first validation there.
Registry inventory, outcome copy, schema, aggregate status, and exit semantics
are unchanged.

This request does not cover command wiring, real probes, portability,
integration, promotion, publication, release, or completion of the full
H/0/01 sheet.

## What was done

- `DoctorRun.__post_init__` now calls the complete recursive result validator
  before reading `result.status` or `exit_code`. Only a valid exact
  `DoctorResult` can reach the exact integer exit relationship.
- `OutcomeDefinition` now validates every exact enum/string field and
  recursively validates both exact `Remediation` primitive fields before
  accepting the DTO.
- `CheckDefinition` now validates its exact `CheckId`, nonempty exact
  `exception_code`, exact outcome tuple, every child `OutcomeDefinition`, and
  every nested remediation before constructing the pair set or selecting the
  exception outcome.
- `_validate_registry` now recursively validates every exact definition graph
  before reading IDs/codes or performing equality, hashing, uniqueness, order,
  coverage, and passing-outcome checks.
- Ordinary validation failures are converted to a fresh exact
  `DoctorContractError` only after leaving the `except` block. The error keeps
  static code/message/exit, no payload, and no cause or context.

## Safety decisions

- Every new guard uses `type(value) is ExpectedType`; no subclass or merely
  equal value is accepted.
- Nested values are read inside an ordinary-exception guard, but equality,
  hashing, truth conversion, representation, and string conversion occur only
  after exact primitive validation. Adversarial callbacks therefore remain
  untouched.
- New guards catch only `Exception`.
  `KeyboardInterrupt`, `SystemExit`, and `GeneratorExit` remain outside every
  sanitization path.
- The existing Trial 2 profile denylist, Python/schema absolute-end parity,
  binding-iterable sanitization, and recursive result-renderer validation are
  preserved unchanged.
- No schema change was necessary because the violations were Python DTO
  construction boundaries, not JSON projection acceptance gaps.

## TDD evidence

### RED

- Commit:
  `3b04fcaca42bfd162a618e37f5b8073022d269ae`
  (tree `5dc56b60296d9b2654aceb3c01225f868a9d2318`).
- Direct parent:
  `4ef502b2c2c4b77361d33213893e6bece95690e3`, the clean Trial 2 KO.
- Changed only `tests/cli/test_doctor.py`; all forgeries and hostile fixtures
  are inline.
- Complete focused offline result: `19 failed, 46 passed`.
- The failures were exactly:
  - one forged exact remediation accepted by `OutcomeDefinition`;
  - six forged child/primitive variants accepted or observed by
    `CheckDefinition`;
  - five recursively invalid registry variants accepted or observed before
    rejection; and
  - seven forged exact-result variants accepted by `DoctorRun`.
- The remaining five new primitive cases and all 41 inherited tests passed,
  proving that the RED did not weaken prior behavior.
- Ruff lint and format checks passed at the RED checkpoint.

### GREEN

- Commit:
  `8290b7b9826317254ab72799c13d6779db6ccc4c`
  (tree `31056d4cb553eacd657c38a6d53e78ca3603cfe9`).
- Direct parent:
  `3b04fcaca42bfd162a618e37f5b8073022d269ae`.
- Changed only `cli/src/agents_cli/doctor.py`.
- Complete focused doctor result: `65 passed`.
- The test blob is byte-identical between RED and GREEN:
  `29cff188a635ee9641db5a323f07be956fc0bd9a`.

## Verification

- Complete doctor inventory:

  ```text
  PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
    uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q -p no:cacheprovider \
    --basetemp=/tmp/h001-doctor-trial3-final-pytest \
    tests/cli/test_doctor.py
  ```

  Result: `65 passed in 0.18s`.

- Exact integrated structure inventory:

  ```text
  PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
    uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q -p no:cacheprovider \
    --basetemp=/tmp/h001-doctor-trial3-final-structure \
    tests/structure/test_h001_sample.py \
    tests/structure/test_project_layout.py
  ```

  Result: `8 passed in 0.07s`.

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
- A read-only offline enumerator reconstructed all `35`
  `OutcomeDefinition` values and all six `CheckDefinition` values, then
  revalidated the complete registry.
- The same enumerator exercised all 35 outcomes under both
  `canonical-orchestrator` and `portable-review-v2`: `70` schema-valid
  projections. It rejected both wrong aggregate statuses for every
  projection: `140` invalid mutations.
- The complete inherited profile corpus still proves Python/schema parity for
  credential prefixes, length boundaries, bytes, LF, CR, CRLF, Unicode LS/PS,
  non-BMP input, and every disallowed appended byte from `0x00` through
  `0xff`.
- Exact forged root, check, outcome, and remediation tests assert an empty
  hostile callback log after each rejection. No equality, hash, truth,
  representation, or string callback was invoked.
- `git diff --check` passed.
- The Trial 3 technical range changes exactly:

  ```text
  cli/src/agents_cli/doctor.py
  tests/cli/test_doctor.py
  ```

- The GREEN commit changes only `cli/src/agents_cli/doctor.py`.
- The result schema is byte-identical to the Trial 3 base.
- Directed production/schema scans found none of the Trial 3 or preserved
  Trial 2 test canaries.
- `BaseException`, filesystem, process, socket, Redis, Gateway, and MCP imports
  remain absent from the doctor core.

## Frozen identity and range

- Branch: `feat/V5-H-0-01-doctor`.
- Exact Trial 3 base:
  `4ef502b2c2c4b77361d33213893e6bece95690e3`
  (tree `8d1c75756f20023cf0a88adb71cfc9fb1f0afda8`).
- RED:
  `3b04fcaca42bfd162a618e37f5b8073022d269ae`.
- Final technical:
  `8290b7b9826317254ab72799c13d6779db6ccc4c`
  (tree `31056d4cb553eacd657c38a6d53e78ca3603cfe9`).
- Exact Trial 3 technical range:
  `4ef502b2c2c4b77361d33213893e6bece95690e3..8290b7b9826317254ab72799c13d6779db6ccc4c`.

Parentage is direct and linear:

```text
4ef502b2c2c4b77361d33213893e6bece95690e3
  -> 3b04fcaca42bfd162a618e37f5b8073022d269ae
  -> 8290b7b9826317254ab72799c13d6779db6ccc4c
```

Net Trial 3 technical paths and final blobs:

```text
cli/src/agents_cli/doctor.py
  94a4d7a90bf2c8b4355a3a0b9ec2a93bfc241529
tests/cli/test_doctor.py
  29cff188a635ee9641db5a323f07be956fc0bd9a
```

Both files remain mode `100644`. The unchanged schema remains:

```text
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
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

Every exact Trial 3 basetemp path created by this lane was also checked and was
absent:

```text
/tmp/h001-doctor-trial3-red-pytest
/tmp/h001-doctor-trial3-green-pytest
/tmp/h001-doctor-trial3-structure-pytest
/tmp/h001-doctor-trial3-final-pytest
/tmp/h001-doctor-trial3-final-structure
```

A `/proc` current-directory scan run from outside the worktree found zero
processes rooted at the task worktree or a descendant. The worktree was clean
at the exact technical HEAD.

## Honest limits

This lane did not modify or execute `cli/main.py`, shared output helpers, real
doctor probes, providers, Redis, Gateway, MCP, KYA, coordination, shared
configuration, policy registries, sample/bootstrap behavior, docs, manifests,
workflows, locks, suite hashes, plan indexes, root README, audit surfaces,
`message.*`, or `agents:events`.

It did not run aggregate suites, CI, installation, npm, network access, a real
provider, Redis, MCP, KYA, tmux, agents, subagents, shared services,
portability, integration, promotion, publication, or release.

This request does not claim an independent verdict, the PROBES or PORTABILITY
slices, completion of H/0/01, integration, promotion, publication, or release.

## Commits

- `3b04fcaca42bfd162a618e37f5b8073022d269ae` -
  `test(h001): expose recursive dto validation gaps`
- `8290b7b9826317254ab72799c13d6779db6ccc4c` -
  `fix(h001): validate public doctor dto graphs`

# Review Submission - Project V5 H/0/01 DOCTOR (Trial 2)

## Review boundary

This request covers only the four P1 corrections required by
`H_0_1_DOCTOR` Trial 1:

- reject credential-like, safe-alphabet profile IDs before binding iteration;
- make Python and Draft 2020-12 profile validation agree at the absolute end
  of the string;
- rebuild ordinary binding-iterable exceptions as an exact safe contract
  error without an observable cause or context; and
- recursively reject forged exact-type nested result DTOs before comparison or
  serialization.

The closed registry, outcome inventory, aggregate status, and exit semantics
are unchanged. This request does not cover command wiring, real probes,
portability, integration, promotion, publication, release, or completion of
the full H/0/01 sheet.

## What was done

- Added a closed credential-like profile-prefix denylist for `ghp-`,
  `github-pat-`, `glpat-`, `sk-`, `tok-`, `xoxb-`, and `xoxp-`.
  `tok-live-doctor-secret-canary` and `sk-proj-secret-canary-123` now fail with
  exit `2` before any probe or result construction, while
  `portable-review-v2` remains accepted and preserved.
- Replaced the profile pattern's final `$` with the ECMAScript-compatible
  absolute-end assertion `(?![\s\S])`. Python and the JSON schema now use the
  same pattern text, including the same closed prefix denylist.
- Materialized caller-provided binding iterables inside a guarded block but
  raised the replacement error only after leaving that block. Every ordinary
  iterable exception, including a hostile `DoctorContractError` subclass, is
  converted to a fresh exact `DoctorContractError` with static code, message,
  exit `2`, `__cause__ is None`, and `__context__ is None`.
- Added recursive remediation validation at result boundaries. Exact
  `Remediation`, `DoctorCheck`, and `DoctorResult` forgeries are rejected when
  either remediation field is not an exact `str`; hostile equality, hash,
  string, and representation methods are never invoked.
- Reordered result validation so every exact nested check and scalar is
  validated before check-order equality or renderer serialization.
- Hardened forged probe observations and binding DTOs so their exact scalar
  types are checked before mapping lookup or inventory equality.

## Safety decisions

- The Python and schema patterns are kept byte-for-byte equal by an acceptance
  assertion; the selected regex features are common to Python and ECMAScript.
- The denylist is prefix-based and closed. It does not pin the doctor to the
  sample profile or reject unrelated canonical kebab-case IDs.
- External ordinary exceptions are never re-raised, even when they inherit the
  public contract-error type. `KeyboardInterrupt`, `SystemExit`, and
  `GeneratorExit` still propagate from both probes and binding iteration.
- Renderers continue to reconstruct all check text and remediation values from
  the immutable registry after validating the caller's complete DTO.
- No raw invalid value is interpolated into an error. The production and schema
  files contain none of the adversarial test canaries.

## TDD evidence

### RED

- Commit:
  `0e008027d9e94cbdc6e14bf9d14ee806b8e6fec9`
  (tree `1e50be24619761d0c6e7339bd41bc3a6a652d933`).
- Direct parent:
  `dc351a51869ce9ba1dcbde15d2bedfe58f319f97`, the clean Trial 1 KO.
- Changed only `tests/cli/test_doctor.py`; all fixtures are inline.
- Focused offline result: `14 failed, 27 passed`.
- The failures were exactly:
  - nine credential-prefix cases were accepted;
  - the profile pattern still ended in `$`;
  - the hostile iterable exception retained its context; and
  - all three exact forged-remediation variants passed validation.
- Ruff lint and format checks passed at the RED checkpoint.

### GREEN

- Commit:
  `41a0d609a06a4286cfb2975b96a0f70108af4414`
  (tree `180b980902493ba25182171c04e01a4fa7a0ca5a`).
- Direct parent:
  `0e008027d9e94cbdc6e14bf9d14ee806b8e6fec9`.
- Changed only:
  - `cli/src/agents_cli/doctor.py`; and
  - `schemas/doctor-result-v1.schema.json`.
- Full focused doctor result: `41 passed`.
- The test blob is identical between the RED and GREEN commits.

## Verification

- Complete doctor inventory:

  ```text
  PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
    uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q -p no:cacheprovider \
    --basetemp=/tmp/h001-doctor-trial2-final-pytest \
    tests/cli/test_doctor.py
  ```

  Result: `41 passed in 0.14s`.

- Exact integrated structure inventory:

  ```text
  PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
    uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q -p no:cacheprovider \
    --basetemp=/tmp/h001-doctor-trial2-final-structure \
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
- A read-only offline enumerator validated all `35` registry outcomes under
  both `canonical-orchestrator` and `portable-review-v2`: `70` valid
  projections. It rejected both wrong aggregate statuses for every projection:
  `140` invalid mutations.
- The profile parity corpus covered minimum and maximum valid values, length
  overflow, bytes, both required credential canaries, LF, CR, CRLF, Unicode
  LS/PS, a non-BMP character, and every disallowed appended byte value from
  `0x00` through `0xff`. Python and Draft 2020-12 agreed for the whole corpus.
- `git diff --check` passed.
- The exact technical path allowlist passed:

  ```text
  cli/src/agents_cli/doctor.py
  schemas/doctor-result-v1.schema.json
  tests/cli/test_doctor.py
  ```

- Directed production/schema scans found none of the profile, iterable-error,
  or forged-remediation canaries.
- `BaseException`, filesystem, process, socket, Redis, Gateway, and MCP imports
  remain absent from the doctor core.

## Frozen identity and range

- Branch: `feat/V5-H-0-01-doctor`.
- Exact Trial 2 base:
  `dc351a51869ce9ba1dcbde15d2bedfe58f319f97`
  (tree `1349da3b789594a294c6c0c0f462c47b7c441f5d`).
- RED:
  `0e008027d9e94cbdc6e14bf9d14ee806b8e6fec9`.
- Final technical:
  `41a0d609a06a4286cfb2975b96a0f70108af4414`
  (tree `180b980902493ba25182171c04e01a4fa7a0ca5a`).
- Exact Trial 2 technical range:
  `dc351a51869ce9ba1dcbde15d2bedfe58f319f97..41a0d609a06a4286cfb2975b96a0f70108af4414`.

Parentage is direct and linear:

```text
dc351a51869ce9ba1dcbde15d2bedfe58f319f97
  -> 0e008027d9e94cbdc6e14bf9d14ee806b8e6fec9
  -> 41a0d609a06a4286cfb2975b96a0f70108af4414
```

Net Trial 2 technical paths:

```text
cli/src/agents_cli/doctor.py
schemas/doctor-result-v1.schema.json
tests/cli/test_doctor.py
```

All three file modes are `100644`. Their final blobs are:

```text
cli/src/agents_cli/doctor.py
  f63865dd73059255f7cdb9b9255fa253eb099795
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
tests/cli/test_doctor.py
  135a4e786483f4cbf9ebf3dfed5615021128b796
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

A `/proc` current-directory scan run from outside the worktree found zero
processes rooted at the task worktree or a descendant. The worktree was clean
at the exact technical HEAD.

## Honest limits

This lane did not modify or execute `cli/main.py`, shared output helpers, real
doctor probes, provider login, Redis, Gateway, MCP, KYA, coordination, shared
configuration, policy registries, sample/bootstrap behavior, docs, manifests,
workflows, locks, suite hashes, or plan indexes.

It did not run aggregate suites, CI, installation, npm, network access, a real
provider, Redis, MCP, KYA, tmux, agents, subagents, shared services,
portability, integration, promotion, publication, or release.

This request does not claim an independent verdict, the PROBES or PORTABILITY
slices, completion of H/0/01, integration, promotion, publication, or release.

## Commits

- `0e008027d9e94cbdc6e14bf9d14ee806b8e6fec9` -
  `test(h001): expose doctor boundary leaks`
- `41a0d609a06a4286cfb2975b96a0f70108af4414` -
  `fix(h001): close doctor validation boundaries`

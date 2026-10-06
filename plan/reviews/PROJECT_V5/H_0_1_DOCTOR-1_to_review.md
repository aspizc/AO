# Review Submission - Project V5 H/0/01 DOCTOR (Trial 1)

## Review boundary

This request covers only the `H_0_1_DOCTOR` typed result core:

- the closed runtime, dependency, config, repository, policy, and profile
  registry;
- injected, status/code-only probe observations;
- result reduction and typed exit semantics;
- the closed `doctor-result/v1` JSON schema;
- deterministic JSON and safe human renderers; and
- adversarial tests for contract violations and secret-bearing exceptions.

It does not cover command wiring, `cli/main.py`, shared output helpers, real
runtime/dependency/config/repository/policy/profile inspection, provider login,
Redis coordination, isolation, state-writer ownership, portability, bootstrap,
documentation updates, or the final H/0/01 sheet gate.

## What was done

- Added an immutable, lexically ordered registry with exactly these check IDs:
  `config`, `dependency`, `policy`, `profile`, `repository`, and `runtime`.
- Defined each admitted `(probe status, code)` pair and its emitted result
  status, summary, safe exception code, and `{doc, anchor}` remediation in
  frozen static definitions.
- Added a pure injected runner. It validates the complete binding inventory and
  canonical order before calling a probe, so missing, duplicate, extra,
  mistyped, or reordered bindings fail with no partial result.
- Restricted probe DTOs to the frozen `ProbeObservation(status, code)` type.
  Mapping-like values, unknown fields, unknown statuses, unknown codes, and a
  code admitted for a different check are internal contract violations.
- Added `DoctorContractError`, with the static
  `DOCTOR_CONTRACT_INVALID` code and exit `2`. Its string and representation do
  not retain invalid input.
- Added static exception outcomes for ordinary probe exceptions. The runner
  never calls `str()` or `repr()` on a caught exception and retains neither its
  cause nor its traceback.
- Preserved control-flow signals: `KeyboardInterrupt`, `SystemExit`, and
  `GeneratorExit` are not converted into doctor results.
- Added bounded generic profile IDs. The selected ID is preserved in the typed
  result and both renderers when it is canonical lowercase kebab case of 1 to
  64 characters. Paths, credential-shaped canaries, uppercase/noncanonical
  values, repeated/trailing separators, and overlength values fail safely with
  exit `2`.
- Added immutable result DTOs and closed projection validation. Renderers
  accept only a valid `DoctorResult` and reconstruct checks from the static
  registry rather than rendering caller- or probe-supplied strings.
- Added exact reduction:
  - a required failure produces result `fail` and exit `1`;
  - a warning or the statically defined optional dependency failure produces
    result `warn` and exit `0`; and
  - all passing checks produce result `pass` and exit `0`.
- Added deterministic compact JSON and deterministic human output.
- Added a Draft 2020-12 schema that closes every root, check, and remediation
  object; fixes check count and order; allowlists every code/summary pair; and
  validates aggregate pass/warn/fail status.

## Safety decisions

- The implementation imports only Python standard-library modules for JSON,
  types, immutable dataclasses, enums, regular expressions, and type
  annotations.
- It imports no filesystem, subprocess, socket, Redis, HTTP, provider,
  Gateway, MCP, or configuration implementation.
- Probe functions are the only injected effect boundary. The test suite uses
  local callables only.
- Ordinary probe exceptions are reduced using `except Exception`; Python
  control-flow exceptions propagate.
- Result JSON has only:

  ```text
  schemaVersion, profileId, status,
  checks[{id, status, code, summary, remediation{doc, anchor}}]
  ```

- The schema and typed validator both reject unknown fields, unknown values,
  duplicates, noncanonical order, unsafe profile IDs, and invalid aggregate
  status.
- Token, credential URL, username, personal path, raw configuration,
  exception-cause, and traceback canaries are intentionally present only in
  tests. The tests prove that none reaches a result DTO, projection, JSON,
  human rendering, or typed contract error.

## TDD evidence

### Initial RED

- Commit:
  `f6664d52724584cf6674db00d9e85f8bd81d6d94`
  (tree `5330e9d0bc8fd0f457f6a6444de5dffd2510f886`).
- Parent:
  `37f3d60ee769df1fdc397a4e81ff14efa664555d`.
- Changed only `tests/cli/test_doctor.py`.
- Focused offline RED:

  ```text
  PYTHONPATH=cli/src uv run --offline --no-project \
    --with pytest --with jsonschema python -m pytest -q \
    --basetemp=<task-temp>/red-pytest tests/cli/test_doctor.py \
    -k 'closed_result_schema_exists or doctor_module_exists'
  ```

- Result: `2 failed, 10 deselected`.
- Expected failures were independent:
  `schemas/doctor-result-v1.schema.json` did not exist and
  `agents_cli.doctor` was not importable.

### Initial GREEN

- Commit:
  `d2fce26d5fab28426f8903ac0795d4be330e258b`
  (tree `4d9263f60047440a19420fb5b4c4a10ac986ba3c`).
- Parent:
  `f6664d52724584cf6674db00d9e85f8bd81d6d94`.
- Added the pure core and schema.
- Result at that checkpoint: `12 passed`.
- The only post-RED test edits in this commit were Ruff B023 closure binding
  and mechanical formatting. No acceptance assertion was removed or relaxed.

### Pre-review correction RED

Before review, two ambiguous boundaries were made explicit rather than left to
reviewer interpretation:

- a safe non-sample profile ID must be preserved; and
- control-flow signals must not be swallowed by exception sanitization.

Evidence:

- Commit:
  `0f40aec03b592ecec76e45cfc6d04988682d05c7`
  (tree `63641a238610f871b785f70030409c9ae151eddc`).
- Parent:
  `d2fce26d5fab28426f8903ac0795d4be330e258b`.
- Changed only `tests/cli/test_doctor.py`.
- Full focused RED result: `4 failed, 20 passed`.
- The failures were exactly:
  - safe `portable-review-v2` was rejected; and
  - `KeyboardInterrupt`, `SystemExit`, and `GeneratorExit` were converted to
    results instead of propagating.

### Correction GREEN

- Commit:
  `1a466f8799dd2530301adc403ef7886001f2c527`
  (tree `8c3202ad5c588e95da0ece95ac819f60a06e1ce3`).
- Parent:
  `0f40aec03b592ecec76e45cfc6d04988682d05c7`.
- Changed only `cli/src/agents_cli/doctor.py` and
  `schemas/doctor-result-v1.schema.json`.
- Focused correction result: `12 passed, 12 deselected`.
- Full doctor result: `24 passed`.

## Verification

- Exact doctor CLI inventory:

  ```text
  PYTHONPATH=cli/src uv run --offline --no-project \
    --with pytest --with jsonschema python -m pytest -q \
    --basetemp=<task-temp>/correction-green-pytest \
    tests/cli/test_doctor.py
  ```

  Result: `24 passed`.

- Integrated sample and layout inventory:

  ```text
  PYTHONPATH=cli/src uv run --offline --no-project \
    --with pytest --with jsonschema python -m pytest -q \
    --basetemp=<task-temp>/correction-structure-pytest \
    tests/structure/test_h001_sample.py \
    tests/structure/test_project_layout.py
  ```

  Result: `8 passed`.

- Directed Ruff:

  ```text
  uv run --offline --no-project --with ruff \
    ruff check cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
  uv run --offline --no-project --with ruff \
    ruff format --check cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
  ```

  Result: lint passed; both files already formatted.

- Draft 2020-12 schema:
  `python -m json.tool schemas/doctor-result-v1.schema.json` passed, and
  `Draft202012Validator.check_schema` passed.
- A read-only injected enumerator validated every one of the 35 registry
  outcomes under both `canonical-orchestrator` and `portable-review-v2`
  against `doctor-result/v1`: `70` projections passed.
- `git diff --check
  37f3d60ee769df1fdc397a4e81ff14efa664555d..1a466f8799dd2530301adc403ef7886001f2c527`
  passed.
- The exact technical path allowlist passed:

  ```text
  cli/src/agents_cli/doctor.py
  schemas/doctor-result-v1.schema.json
  tests/cli/test_doctor.py
  ```

- Directed production/schema scans found no token, credential assignment,
  credential-bearing URL, username/personal path, raw-config, or traceback
  canary.
- The source import inventory contains no operating-system inspection,
  filesystem, subprocess, network, Redis, provider, Gateway, or MCP import.
- `BaseException` does not occur in the implementation.

## Frozen identity and range

- Branch: `feat/V5-H-0-01-doctor`.
- Exact base:
  `37f3d60ee769df1fdc397a4e81ff14efa664555d`
  (tree `12a644057c29d26452b6f194fda08a78dbe47d8f`).
- Initial RED:
  `f6664d52724584cf6674db00d9e85f8bd81d6d94`.
- Initial GREEN:
  `d2fce26d5fab28426f8903ac0795d4be330e258b`.
- Correction RED:
  `0f40aec03b592ecec76e45cfc6d04988682d05c7`.
- Final technical:
  `1a466f8799dd2530301adc403ef7886001f2c527`
  (tree `8c3202ad5c588e95da0ece95ac819f60a06e1ce3`).
- Exact technical range:
  `37f3d60ee769df1fdc397a4e81ff14efa664555d..1a466f8799dd2530301adc403ef7886001f2c527`.

Parentage is direct and linear:

```text
37f3d60ee769df1fdc397a4e81ff14efa664555d
  -> f6664d52724584cf6674db00d9e85f8bd81d6d94
  -> d2fce26d5fab28426f8903ac0795d4be330e258b
  -> 0f40aec03b592ecec76e45cfc6d04988682d05c7
  -> 1a466f8799dd2530301adc403ef7886001f2c527
```

Net technical files:

```text
cli/src/agents_cli/doctor.py          +785/-0
schemas/doctor-result-v1.schema.json  +831/-0
tests/cli/test_doctor.py              +452/-0
```

All file modes are `100644`.

## Postflight

After all verification, exactly these six generated caches were removed by
explicit path, without a glob or broad repository cleanup:

```text
.pytest_cache/
.ruff_cache/
cli/.ruff_cache/
cli/src/agents_cli/__pycache__/
tests/cli/__pycache__/
tests/structure/__pycache__/
```

Each exact path was then checked individually and was absent. A process scan
from outside the worktree found zero processes whose current directory was
the task worktree or a descendant. The worktree had no tracked or untracked
change before this request-only file was created.

## Honest limits

This lane did not modify or execute `cli/main.py`, `cli/output.py`, real doctor
probes, provider login, Redis, isolation, state-writer ownership, Gateway,
MCP, KYA, shared configuration, policies, sample/bootstrap behavior, docs,
manifests, workflows, locks, suite hashes, or plan indexes.

It did not run aggregate suites, CI, npm, installation, network access, a real
provider, Redis, MCP, KYA, tmux, agents, or shared services. All doctor probes
were local injected callables. `uv` was used only in explicit offline
test/lint environments backed by the existing local cache.

This request does not claim independent review, integration, portability,
promotion, publication, release, the PROBES slice, or completion of the full
H/0/01 sheet.

## Commits

- `f6664d52724584cf6674db00d9e85f8bd81d6d94` -
  `test(h001): define safe doctor result contract`
- `d2fce26d5fab28426f8903ac0795d4be330e258b` -
  `feat(h001): add safe doctor result core`
- `0f40aec03b592ecec76e45cfc6d04988682d05c7` -
  `test(h001): expose generic profile and signal gaps`
- `1a466f8799dd2530301adc403ef7886001f2c527` -
  `fix(h001): preserve safe profile and control signals`

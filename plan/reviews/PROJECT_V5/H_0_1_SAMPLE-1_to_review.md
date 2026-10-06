# Review Submission - Task H/0/01 SAMPLE (Trial 1)

## What was done

- Added the closed, versioned `doctor-profile/v1` input schema for portable
  sample repository, plan, and canonical agent selections.
- Added a fully synthetic `examples/hero/` repository fixture with one static
  application, a bounded plan, and selections that resolve only to existing
  canonical roles, executable providers, models, tools, and artifact kinds.
- Added `scripts/bootstrap.sh` with fail-closed lock-input checks and the exact
  reviewed Python and Node lock commands.
- Added strict fake uv/npm installers and disposable-checkout tests for exact
  argv and order, first-error stop behavior, repeatability, clean git state,
  empty-home isolation, canary non-disclosure, and rejected network argv.
- Documented only the shipped sample/bootstrap contract and its integration
  boundary in `docs/doctor.md`.

## Why

- H/0/01 needs a portable, owner-neutral sample and reproducible dependency
  entry point before the later doctor command and probe slices can be built.
- The task lane must prove the contract without contacting the network or
  relying on pre-existing virtual environments, `node_modules`, generated
  files, globally installed application dependencies, or owner-local paths.

## Decisions Taken

- `doctor-profile-v1.schema.json` is intentionally an input schema. The stable
  doctor result schema, command, checks, renderers, and probes remain owned by
  later H/0/01 slices.
- The sample references the existing unrestricted `sample-apps` repository
  identity and the canonical H/0/00 profile rather than adding or duplicating
  policy registries.
- Only prerequisite-free `plan` and `execute` workflows appear in the sample.
  It does not claim that review or completion gates exist.
- The bootstrap always runs every lock command, including on a second
  invocation. Its tests inject strict installers; the real empty-cache,
  hash-pinned network install remains an integrator-only gate.

## TDD Evidence

- RED:
  `uv run --offline --no-project --with pytest --with jsonschema python -m pytest -q tests/structure/test_h001_sample.py tests/structure/test_h001_bootstrap.py`
  - 17 tests collected; 5 failed and 10 errored because the schema, sample,
    bootstrap, and documentation did not exist; the two fake-installer
    rejection tests passed.
- GREEN:
  the same directed command passed all 17 tests after the production
  implementation.

## Verification

- `uv run --offline --no-project --with pytest --with jsonschema --with pyyaml python -m pytest -q --basetemp=<task-temp> tests/structure/test_h001_sample.py tests/structure/test_h001_bootstrap.py tests/structure/test_ci_dependency_lock.py tests/structure/test_node_runtime_contract.py tests/structure/test_project_layout.py`
  - 35 passed.
- `uv run --offline --no-project --with ruff ruff check tests/structure/test_h001_sample.py tests/structure/test_h001_bootstrap.py`
  - passed.
- `./scripts/requirements_lock.sh --check-inputs`
  - passed; lock inputs are current.
- `python3 -m json.tool` on the new schema and all three JSON fixtures
  - passed.
- `bash -n scripts/bootstrap.sh tests/fixtures/h001/fake-bin/uv tests/fixtures/h001/fake-bin/npm`
  - passed. `shellcheck` was unavailable in the task environment.
- `git diff --check 8a92e462c2ca5a094af203344700e7d268d82937..9f1dac04f9dfb1adc1e0f20111d4f53d910849d5`
  - passed.
- Scoped owner-path, credential-assignment, credential-URL, and secret-canary
  scans over the shipped H001 surfaces
  - passed with no matches.
- Preflight and postflight process/temp checks
  - zero `agtest-*` processes; no task-owned test temp, `.venv`, or
    `gateway/node_modules` residual.

The task lane did not run the real bootstrap, network access, Redis, MCP,
provider CLIs, tmux, aggregate CI, npm test globs, or shared suite-manifest
refresh. Those gates are explicitly outside this slice or integrator-owned.

## Commits

- `82b5564a7df310f3966f926ab5bd5b3830943d84` -
  `test(h001): characterize portable hero sample bootstrap RED`
- `9f1dac04f9dfb1adc1e0f20111d4f53d910849d5` -
  `feat(h001): ship portable synthetic hero sample`

## Technical Tree

- `76ce667d8ada2f8adaf22b4113ad78ef7bb1228a`

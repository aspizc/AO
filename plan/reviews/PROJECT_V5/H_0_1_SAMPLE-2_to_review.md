# Review Submission - Task H/0/01 SAMPLE (Trial 2)

## What was done

- Closed every Trial 1 P1 finding with a pre-mutation bootstrap boundary.
- Added complete component-by-component checks for the physical checkout,
  dependency inputs, shipped sample targets, and managed output control paths.
- Added a dedicated Node-only preflight for the supported runtime,
  `package.json`/lock-root parity, lockfile contract, and Python lock-input
  digest.
- Revalidated `.venv/bin/activate` after virtualenv creation and the Gateway
  output boundary immediately before npm.
- Corrected the documentation to publish and exercise a checkout-root command
  and to declare the actual Node, npm, uv, and Python-resolution requirements.

## Why

- Trial 1 was KO because ancestor and nested symlinks could escape the
  checkout, Node failures occurred after Python state mutation, and the
  documented any-working-directory command plus undeclared global `python3`
  prerequisite were not reproducible.
- H/0/01 requires a fail-closed, lock-only bootstrap whose task-lane proof
  never performs a real install or contacts the network.

## Decisions Taken

- `scripts/bootstrap.sh` resolves one physical root and uses Bash built-ins to
  reject symlinked control components before Node can load the helper or read
  an external target.
- `scripts/bootstrap_preflight.mjs` is closed and data-only: it imports no
  child-process, network, or filesystem-write API. It implements the reviewed
  Python input-digest check directly, so bootstrap no longer depends on global
  `python3`.
- Pre-existing `.venv`, `.venv/bin`, `.venv/bin/activate`, and
  `gateway/node_modules` are admitted only as physical in-checkout control
  paths. A normal in-checkout virtualenv symlink on an unmanaged path, proved
  by `.venv/lib64 -> lib`, remains allowed.
- The three sample targets called out by Trial 1 are required physical
  bootstrap inputs; no sample, schema, canonical profile, manifest, or lock
  content was changed.
- The published command is intentionally checkout-root scoped:
  `cd /path/to/agents-orchestrator` followed by `./scripts/bootstrap.sh`.

## TDD Evidence

- RED commit:
  `946d3712e1b7d5d58906211a02b9acf33d2606a6`.
- RED command:
  `uv run --offline --no-project --with pytest --with jsonschema python -m pytest -q tests/structure/test_h001_bootstrap.py tests/structure/test_h001_sample.py`.
  Result: `18 failed, 22 passed`; the failures reproduced all three P1
  categories before implementation.
- GREEN command: the same focused inventory.
  Result: `52 passed`.

## Verification

- Related explicit structure inventory:
  `uv run --offline --no-project --with pytest --with jsonschema --with pyyaml python -m pytest -q --basetemp=<task-temp> tests/structure/test_h001_sample.py tests/structure/test_h001_bootstrap.py tests/structure/test_ci_dependency_lock.py tests/structure/test_node_runtime_contract.py tests/structure/test_project_layout.py`
  - `70 passed`; all prior focused and related positive assertions remain.
- Directed Ruff:
  `uv run --offline --no-project --with ruff ruff check tests/structure/test_h001_sample.py tests/structure/test_h001_bootstrap.py`
  - passed.
- `./scripts/requirements_lock.sh --check-inputs`
  - passed; lock inputs are current.
- `node --check scripts/bootstrap_preflight.mjs` and a direct read-only
  preflight against the technical tree
  - passed.
- Node JSON parsing of the schema and all three sample JSON fixtures
  - passed.
- `bash -n` on bootstrap and all three H001 fake executables
  - passed. `shellcheck` was unavailable in the task environment.
- `git diff --check
  f943c9944dc6eb37a126f1a72d0a394e68609d58..7879c4403f31255c3b4fddd21a29d6a458402d30`
  - passed.
- Scoped owner-path, credential-assignment, credential-URL, and secret scans
  over the shipped H001 surfaces
  - no matches.
- Postflight
  - clean worktree before this request; no task temp, `.venv`,
    `gateway/node_modules`, pytest cache, H001 bytecode cache, or `agtest-*`
    process remained.

The task lane did not execute the real bootstrap, uv/npm installation, network
access, Redis, MCP, provider CLIs, tmux, aggregate CI, npm test globs, shared
suite-manifest refresh, integration, promotion, or publication.

## Commits

- `946d3712e1b7d5d58906211a02b9acf33d2606a6` -
  `test(h001): reproduce bootstrap boundary review findings`
- `7879c4403f31255c3b4fddd21a29d6a458402d30` -
  `fix(h001): fail closed before bootstrap mutations`

## Technical Tree

- `8120e70f31ed1b751d6131d6b94e2a41f2db43d1`

# Review Submission - Task H/0/01 SAMPLE (Trial 4)

## What was done

- Rebaselined the Node lock preflight from an independently maintained package
  graph and SemVer implementation to an exact reviewed-lock binding.
- Made `ci/production-sbom.json` and
  `ci/production-advisories.json` required physical bootstrap control files.
- Bound `gateway/package-lock.json` to both versioned release authorities:
  - the SBOM must use `production-sbom/v1` and contain exactly one
    `sourceLocks` record for the Node lock;
  - the advisory snapshot must use `production-advisories/v1` and contain the
    Node lock in `lockDigests`;
  - both values must be canonical `sha256:` identifiers, agree, and equal the
    digest of the actual lock bytes.
- Preserved package manifest/lock-root parity, the supported Node runtime
  check, the Python lock-input digest, and the existing physical checkout and
  output boundaries.
- Converted the former positive mutated-lock fixture to an exact checked-in
  lock positive. Historical Trial 1-3 RED commits and review results remain
  unchanged.
- Documented the exact binding and integrator-only ownership of manifest,
  lock, SBOM, and advisory refreshes.

## Why

Trial 3 was KO because completing a second package manager inside bootstrap
left repeated semantic and complexity gaps: optional closure, resolution/SRI
classification, retained-entry classification, SemVer compatibility, and
quadratic link traversal. The agreed Trial 4 rebaseline does not reopen that
parser. Bootstrap now answers the narrower question it needs before mutation:
whether the exact Node lock in this checkout is the lock independently named
by both reviewed production snapshots.

This keeps package-resolution semantics with npm and the real empty-cache
`npm ci` integration gate. Task lanes prove only the exact offline binding
with strict fakes; the integrator alone may refresh the authoritative
snapshots after a reviewed lock change.

## Exact reviewed-lock contract

- Both snapshots are required regular, non-symlinked checkout files and must
  be canonical JSON. Malformed documents and duplicate JSON keys fail closed.
- The SBOM schema is exactly `production-sbom/v1`. Its `sourceLocks` array must
  contain exactly one record whose path is `gateway/package-lock.json`.
- The advisory schema is exactly `production-advisories/v1`. Its
  `lockDigests` object must own the
  `gateway/package-lock.json` member.
- Each selected value must match `sha256:[a-f0-9]{64}`. The two values must be
  identical and must equal SHA-256 over the complete checked-in lock bytes.
- The reviewed digest in both frozen authorities and the actual lock is:
  `sha256:71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`.
- Only after that binding succeeds is the lock parsed for the retained root
  manifest parity contract. Runtime and Python lock-input checks remain
  unchanged.
- Every missing, symlinked, malformed, wrong-schema, wrong-path,
  duplicate-path, noncanonical-digest, stale-digest, disagreeing-digest, and
  changed-lock case exits before uv/npm selection, creates no `.venv` or
  `gateway/node_modules`, and records no fake installer call.

## Decisions taken

- No digest is hard-coded in bootstrap. The checked-in versioned authorities
  select the reviewed digest, so a future lock change remains an
  integrator-owned snapshot refresh rather than a task-local code edit.
- Snapshot parsing enforces the repository's canonical JSON representation,
  which also rejects duplicate object keys instead of relying on
  last-key-wins `JSON.parse` behavior.
- The implementation uses Node built-ins and read-only filesystem calls. It
  imports no child-process, package-manager, network, or filesystem-write
  surface and reads no installed dependency tree.
- `scripts/bootstrap_preflight.mjs` fell from 847 to 347 lines. The technical
  commit changes it by `+89/-589` and removes the custom dependency SemVer,
  graph, link dereference, SRI, and package-resolution traversal.
- No CI snapshot, lock, manifest, sample, schema, fake executable, suite
  manifest, workflow, shared plan index, or README was modified.

## TDD evidence

- RED commit:
  `0de296bd0ceb522229aa5a4b3901a1cf888ba08c`
  (tree `438351b8ba5ccc3fdcb35cf7112d9d5d0e231388`).
- Focused RED command:

  ```text
  uv run --offline --no-project --with pytest python -m pytest -q \
    --basetemp=<task-temp> tests/structure/test_h001_bootstrap.py \
    -k 'review_snapshot or reviewed_snapshots or reviewed_package_lock or custom_graph or reviewed_lock_commands or any_change_to_the_reviewed_package_lock_bytes'
  ```

  Result: `20 failed, 1 passed, 89 deselected`. The existing Trial 3
  implementation ignored both authorities: every new negative bootstrap case
  returned success and reached the strict fake installers. The exact-lock
  positive passed.
- Focused GREEN command: the same selection.
  Result: `21 passed, 89 deselected`.
- Full bootstrap structure inventory:
  `110 passed`.
- Related structure inventory:

  ```text
  uv run --offline --no-project --with pytest --with jsonschema --with pyyaml \
    python -m pytest -q --basetemp=<task-temp> \
    tests/structure/test_h001_sample.py \
    tests/structure/test_h001_bootstrap.py \
    tests/structure/test_ci_dependency_lock.py \
    tests/structure/test_node_runtime_contract.py \
    tests/structure/test_project_layout.py
  ```

  Result: `133 passed`.

## Verification

- Directed Ruff over `test_h001_sample.py` and
  `test_h001_bootstrap.py`: passed.
- `node --check scripts/bootstrap_preflight.mjs`: passed.
- Direct read-only preflight against the frozen technical tree and active
  supported Node runtime: passed.
- `./scripts/requirements_lock.sh --check-inputs`: passed.
- `bash -n` over `scripts/bootstrap.sh` and all three H001 fake executables:
  passed.
- Node JSON parsing of the manifest, lock, both production authorities,
  doctor profile schema, and all three hero JSON fixtures: passed.
- Independent extraction and hashing confirmed both selected digests equal
  the actual Node lock digest
  `sha256:71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`.
- `git diff --check
  e4ba9f4f01de2024345c49da11dc91f874ebd0ee..2f2ded24add009c6e710f51907808fefb66c7b13`:
  passed.
- Technical-path allowlist and scoped owner-path, credential-bearing URL,
  credential-assignment, and secret leak scans: passed with no matches.

The task lane did not execute the real bootstrap, uv/npm installation,
`npm test`, aggregate suites, CI, network access, Redis, MCP, KYA, provider
CLIs, tmux, agents, shared services, snapshot refresh, integration, promotion,
publication, or release.

## Frozen identity and range

- Branch: `feat/V5-H-0-01-sample`.
- Trial 3 KO base:
  `e4ba9f4f01de2024345c49da11dc91f874ebd0ee`
  (tree `b838a0cfc2c4b57cef3924433e225b387d9ffb61`).
- RED:
  `0de296bd0ceb522229aa5a4b3901a1cf888ba08c`
  (tree `438351b8ba5ccc3fdcb35cf7112d9d5d0e231388`).
- Final technical:
  `2f2ded24add009c6e710f51907808fefb66c7b13`
  (tree `9a9f6ee370ba6aa56b4fae8288a2e43683c2a20c`).
- Exact technical range:
  `e4ba9f4f01de2024345c49da11dc91f874ebd0ee..2f2ded24add009c6e710f51907808fefb66c7b13`.
- Net range delta:
  - `docs/doctor.md` `+21/-2`;
  - `scripts/bootstrap.sh` `+2/-0`;
  - `scripts/bootstrap_preflight.mjs` `+89/-589`;
  - `tests/structure/test_h001_bootstrap.py` `+267/-35`.

Parentage is exact and linear: RED is the direct child of the Trial 3 KO base,
and final technical is the direct child of RED. RED changes only the H001
bootstrap structure test. The technical commit changes only the preflight,
bootstrap shell, and doctor documentation. File modes remain `100644`, except
the pre-existing executable `scripts/bootstrap.sh` mode remains `100755`.

## Commits

- `0de296bd0ceb522229aa5a4b3901a1cf888ba08c` -
  `test(h001): bind bootstrap lock to review snapshots`
- `2f2ded24add009c6e710f51907808fefb66c7b13` -
  `fix(h001): bind bootstrap to reviewed lock snapshots`

## Technical tree

- `9a9f6ee370ba6aa56b4fae8288a2e43683c2a20c`

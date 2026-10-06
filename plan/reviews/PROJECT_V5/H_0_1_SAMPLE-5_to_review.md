# Review Submission - Task H/0/01 SAMPLE (Trial 5)

## What was done

- Added a strict-fake regression for the deterministic gap identified in the
  Trial 4 KO:
  - one case changes the regular `gateway/package-lock.json` bytes during the
    allowed `uv pip install` step;
  - one case independently changes the regular
    `ci/production-sbom.json` bytes during that step; and
  - one case independently changes the regular
    `ci/production-advisories.json` bytes during that step.
- Required the bootstrap to repeat the existing complete Node-only preflight
  after all uv steps and the last physical boundary validation, immediately
  before `npm ci`.
- Required a changed Node authority or lock to stop after the four expected uv
  calls, without a fake npm call or a newly created
  `gateway/node_modules`.
- Preserved the legitimate virtualenv, sync, and editable-install effects that
  completed before the final recheck.
- Documented the exact sequential guarantee and the remaining same-UID
  check-to-exec race owned by D/0/02.

## Why

Trial 4 checked the exact lock/snapshot binding only once, before four uv
invocations. Its final shell boundary validated only existence, type, and
symlink status. An earlier installer could therefore replace any selected
regular input in place, after which the candidate invoked npm against bytes
that the initial preflight had not reviewed.

The existing `scripts/bootstrap_preflight.mjs` already performs the complete
required binding: canonical snapshot parsing, exact digest selection and
agreement, hashing of the lock bytes, manifest/lock-root parity, supported
Node runtime validation, and the Python lock-input check. Reusing that exact
preflight at the final consumption boundary closes the deterministic
post-preflight uv gap without creating a second validation implementation.

## Decisions taken

- `scripts/bootstrap_preflight.mjs` was not modified. Its blob remains
  `e137effde2be6a366d4914b7f862a1f22e9811ba`.
- The final sequence in `scripts/bootstrap.sh` is exactly:

  ```text
  uv pip install --no-deps --no-build-isolation -e cli -e orchestrator-langgraph --offline
  validate_control_boundary post-venv
  node scripts/bootstrap_preflight.mjs "$REPO_ROOT" "$node_version"
  npm --prefix gateway ci
  ```

  There is no intervening bootstrap operation between the final exact
  preflight and npm.
- The regression wraps the copied strict uv fake only inside each disposable
  test checkout. The original fake first validates and records the exact uv
  command, then the wrapper appends one byte to the selected regular control
  file only during the editable-install step.
- A final-preflight failure intentionally does not roll back completed Python
  installation effects. The clean-checkout proof requires only that npm is not
  invoked and `gateway/node_modules` is not created.
- The repeated path recheck is not claimed to serialize the checkout. A
  same-UID writer can still change bytes after the final read and before npm
  opens the lock. D/0/02 owns that isolation boundary.
- No snapshot, lock, manifest, sample, schema, fake executable, suite
  manifest, workflow, shared plan index, or preflight source was modified.

## TDD evidence

- RED commit:
  `e4eeeb138d3ec77a1fee364493f919e7a174fe84`
  (tree `022632982d7134d75cf793f6b6fda7c9f37e864c`).
- Focused RED command:

  ```text
  uv run --offline --no-project --with pytest python -m pytest -q \
    --basetemp=<task-temp> tests/structure/test_h001_bootstrap.py \
    -k 'places_final_exact_preflight_immediately_before_npm or regular_node_control_bytes_changed_during_uv'
  ```

  Result: `4 failed, 110 deselected`.
  The static case found only one preflight invocation. In all three dynamic
  cases the Trial 4 candidate returned success, recorded all five strict-fake
  calls including `npm --prefix gateway ci`, and created
  `gateway/node_modules`.
- Focused GREEN command: the same selection.
  Result: `4 passed, 110 deselected`.
  Each mutated regular input now fails after exactly the four uv calls. The
  `.venv/.h001-synced` and `.venv/.h001-editable` markers remain, while the
  fake npm call and `gateway/node_modules` are absent.
- Full H001 bootstrap inventory:
  `114 passed`.
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

  Result: `137 passed`.

## Verification

- Directed Ruff over `test_h001_sample.py` and
  `test_h001_bootstrap.py`: passed.
- `node --check scripts/bootstrap_preflight.mjs`: passed.
- Direct read-only preflight against the frozen technical tree and active
  supported Node runtime: passed.
- `./scripts/requirements_lock.sh --check-inputs`: passed.
- `bash -n` over `scripts/bootstrap.sh` and all three checked-in H001 fake
  executables: passed.
- Node JSON parsing of the manifest, lock, both production authorities, doctor
  profile schema, and all three hero JSON fixtures: passed.
- Independent extraction and hashing confirmed both selected snapshot digests
  equal the actual Node lock digest:
  `sha256:71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`.
- `git diff --check
  5ea251db3d8f56fc8b407675b377995d423f7776..82efecf0c4e57afbd03a9af17a548743871a3801`:
  passed.
- The exact technical path inventory contains only
  `docs/doctor.md`, `scripts/bootstrap.sh`, and
  `tests/structure/test_h001_bootstrap.py`.
- Scoped owner-path, credential-bearing URL, credential-assignment, and secret
  leak scans over the technical range found no matches.

The task lane did not execute the real bootstrap, real uv/npm installation,
`npm test`, aggregate suites, CI, network access, Redis, MCP, KYA, provider
CLIs, tmux, agents, shared services, snapshot refresh, integration, promotion,
publication, or release. All bootstrap behavior used disposable checkouts and
strict fakes. The only uv activity outside those fakes was the explicit
offline test/lint environment backed by local cache.

## Frozen identity and range

- Branch: `feat/V5-H-0-01-sample`.
- Trial 4 KO result base:
  `5ea251db3d8f56fc8b407675b377995d423f7776`
  (tree `8948c6e25f862237bb28836189041b0e201d2a60`).
- RED:
  `e4eeeb138d3ec77a1fee364493f919e7a174fe84`
  (tree `022632982d7134d75cf793f6b6fda7c9f37e864c`).
- Final technical:
  `82efecf0c4e57afbd03a9af17a548743871a3801`
  (tree `a630c57495a0f4e48fe6ac138039554fcba52f7a`).
- Exact technical range:
  `5ea251db3d8f56fc8b407675b377995d423f7776..82efecf0c4e57afbd03a9af17a548743871a3801`.
- Net technical range:
  - `docs/doctor.md` `+16/-0`;
  - `scripts/bootstrap.sh` `+1/-0`;
  - `tests/structure/test_h001_bootstrap.py` `+72/-0`.

Parentage is exact and linear: RED is the direct child of the Trial 4 KO
result, and final technical is the direct child of RED. RED changes only the
H001 bootstrap structure test. The technical commit changes only bootstrap
shell and doctor documentation. File modes remain `100644`, except the
pre-existing executable `scripts/bootstrap.sh` remains `100755`.

The following frozen inputs have identical blobs at the base and technical
trees:

```text
ci/production-advisories.json c6f2a11e4d99d9c825c80f7b448cf162fadc26dd
ci/production-sbom.json        71a4488a3821ed090891d1f7905c790b1a7188e5
gateway/package-lock.json      9c81b72edf8a1fe72a3b119bc8184b039a06264b
gateway/package.json           1239dbd29c9e3c63bbc830dd808230704df8a89b
requirements.lock              6898c3a605ee0aafa51355d1903a6bbcc9dfead8
scripts/bootstrap_preflight.mjs e137effde2be6a366d4914b7f862a1f22e9811ba
```

## Commits

- `e4eeeb138d3ec77a1fee364493f919e7a174fe84` -
  `test(h001): reproduce post-uv lock binding race`
- `82efecf0c4e57afbd03a9af17a548743871a3801` -
  `fix(h001): rebind reviewed lock before npm`

## Technical tree

- `a630c57495a0f4e48fe6ac138039554fcba52f7a`

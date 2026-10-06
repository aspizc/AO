# Review Submission - Task H/0/01 SAMPLE (Trial 3)

## What was done

- Closed the Trial 2 package-lock graph gap before any uv or npm call.
- Added fail-closed regressions for a root-only `packages` table, every required
  direct package entry, every incompatible direct locked version, and missing
  or incompatible required transitive edges.
- Added hostile entry and metadata coverage for path, type, name, version,
  integrity, top-level name/version, `lockfileVersion`, and `requires`.
- Added semantic edge coverage for required peers, present optional
  dependencies, malformed OR ranges, prerelease ranges, and unreachable link
  cycles.
- Preserved a positive lockfile-v3 fixture with unreachable link, dev,
  optional, optional-peer, and platform variants.

## Why

- Trial 2 was KO because `scripts/bootstrap_preflight.mjs` compared only the
  manifest and lock root. A lock reduced to `packages[""]`, or a direct
  `node_modules/zod` entry changed to version `99.0.0`, passed and allowed the
  fake bootstrap lane to create `.venv` and `gateway/node_modules`.
- H/0/01 requires malformed lock inputs to fail before dependency installation
  or dependency-state creation.

## Exact Offline Integrity Guarantee

The Node-only preflight now guarantees all of the following without invoking
npm, reading `node_modules`, or contacting a registry:

- `package.json` and the lock root match on the reviewed root fields; lock
  name/version, `lockfileVersion: 3`, and `requires: true` match the supported
  contract.
- Every `packages` entry is a record at a canonical relative path. Dependency,
  peer metadata, boolean, platform, link, semantic-version, and SRI metadata
  have the required shapes. Registry entries carry syntactically valid SRI
  metadata, and every link target exists and is cycle-free.
- Root runtime and development dependencies, then every reached package's
  non-optional runtime dependencies, form a resolvable Node-style ancestor
  closure. Resolved package versions satisfy their declared semantic ranges,
  explicit package names agree, and links are dereferenced.
- Required peers must resolve compatibly. Missing optional dependencies and
  optional peers are allowed; when an optional dependency or peer is present,
  its name and version must be compatible.
- Every OR clause is parsed even when an earlier clause matches. A prerelease
  satisfies a comparator set only when that set names a prerelease with the
  same major/minor/patch tuple.

The preflight intentionally does not reject a valid entry merely because it is
unreachable from the required closure. This preserves legitimate retained
optional, peer, dev, platform, and link variants in lockfile v3. It validates
SRI presence and syntax, not archive bytes; the real empty-cache `npm ci`
proof remains integration-owned and is not inferred from this fake task lane.

## Decisions Taken

- The implementation uses only Node built-ins and read-only filesystem calls.
  It imports no child-process, network, package-manager, or filesystem-write
  surface and does not depend on a global package or an installed tree.
- Node dependency resolution searches nested and ancestor `node_modules`
  locations deterministically, including physical link targets.
- Optional edges are not required to exist. Present optional edges are checked
  for compatibility without turning platform-specific optional subtrees into a
  universal required closure.
- Nested `devDependencies` are metadata-validated but are not installation
  edges. Root `devDependencies` remain required because `npm ci` installs them
  for this checkout.
- No manifest, lock, sample, schema, documentation, fake executable, bootstrap
  shell, workflow, suite manifest, or shared plan/index file changed.

## TDD Evidence

- Initial RED commit:
  `2e9b810c82438b66b56d9d25cb049683d94405e0`
  (tree `5de33dd80c641a72565eb8adeeeeccc9224b87f9`).
- Initial RED command: the seven explicit Trial 3 package-lock test nodes in
  `tests/structure/test_h001_bootstrap.py`.
  Result: `31 failed, 7 passed`. Every expected failure was an invalid
  bootstrap returning `0`; the positive lockfile-v3 variants passed.
- First GREEN command: the same seven explicit nodes.
  Result: `38 passed`.
- First full bootstrap inventory:
  `85 passed`.
- Static precheck: no P0. It identified required-peer/present-optional
  compatibility, OR/prerelease parsing, and unreachable link-cycle gaps. It
  made no edits and ran no tests, bootstrap, npm, network, tmux, Redis, MCP, or
  service command. Its `^0.0` concern was reconstructed as a false positive:
  the existing precision-two branch already computes the correct `<0.1.0`
  upper bound.
- Correction RED commit:
  `a4bbf6ded062151710676500c221c613017df9a3`
  (tree `53f7002a924aad091991a3e2b7da477038fe24cd`).
- Correction RED command: the explicit inconsistent-entry, present
  peer/optional-edge, and semver-contract test nodes.
  Result: `6 failed, 8 passed`.
- Correction GREEN command: the same three explicit nodes.
  Result: `14 passed`.
- Final full bootstrap inventory:
  `91 passed`.

## Verification

- Related explicit structure inventory:

  ```text
  uv run --offline --no-project --with pytest --with jsonschema --with pyyaml \
    python -m pytest -q --basetemp=<task-temp> \
    tests/structure/test_h001_sample.py \
    tests/structure/test_h001_bootstrap.py \
    tests/structure/test_ci_dependency_lock.py \
    tests/structure/test_node_runtime_contract.py \
    tests/structure/test_project_layout.py
  ```

  Result: `114 passed`.
- Directed Ruff over `test_h001_sample.py` and
  `test_h001_bootstrap.py`: passed.
- `node --check scripts/bootstrap_preflight.mjs`: passed.
- Direct read-only preflight against the final technical tree and the active
  supported Node runtime: passed.
- `./scripts/requirements_lock.sh --check-inputs`: passed.
- `bash -n` over `scripts/bootstrap.sh` and the three H001 fake executables:
  passed.
- Node JSON parsing of `gateway/package.json`, `gateway/package-lock.json`, the
  doctor profile schema, and all three hero JSON fixtures: passed.
- `git diff --check
  f1052e6ff0e2265190a19e32d3044ff98e1cef18..3079cd00942f8f7b38b299de1844b8748b7dcad4`:
  passed.
- Scoped owner-path, credential-bearing URL, credential-assignment, and secret
  scans over the shipped H001 surfaces: no matches.
- Final static sanity found no residual P0/P1 in the corrected peer,
  optional-edge, semver, link-cycle, read-only, or network-free boundaries.

The task lane did not execute the real bootstrap, uv/npm installation,
`npm test`, aggregate suites, network access, Redis, MCP, KYA, provider CLIs,
tmux, shared services, integration, promotion, or publication.

## Frozen Identity and Range

- Branch: `feat/V5-H-0-01-sample`
- Trial 2 KO base:
  `f1052e6ff0e2265190a19e32d3044ff98e1cef18`
  (tree `f24326e462a9568763dcec43030a236935b0ec23`).
- Initial RED:
  `2e9b810c82438b66b56d9d25cb049683d94405e0`
  (tree `5de33dd80c641a72565eb8adeeeeccc9224b87f9`).
- Initial technical:
  `b7b107171945f6287830358e5101725ceba3039a`
  (tree `e438d0855749234b38a0cc9addaa2e56ef004185`).
- Correction RED:
  `a4bbf6ded062151710676500c221c613017df9a3`
  (tree `53f7002a924aad091991a3e2b7da477038fe24cd`).
- Final technical:
  `3079cd00942f8f7b38b299de1844b8748b7dcad4`
  (tree `ec1c393403aaf8c1b2ed74ac0e87c3cdff857752`).
- Exact technical range:
  `f1052e6ff0e2265190a19e32d3044ff98e1cef18..3079cd00942f8f7b38b299de1844b8748b7dcad4`.
- Net technical path delta:
  `scripts/bootstrap_preflight.mjs` `+616/-0`;
  `tests/structure/test_h001_bootstrap.py` `+368/-0`.

Parentage is linear and exact: each listed commit is the direct child of the
preceding commit. The final technical range changes only the two task-owned
paths named above.

## Commits

- `2e9b810c82438b66b56d9d25cb049683d94405e0` -
  `test(h001): expose package-lock graph drift`
- `b7b107171945f6287830358e5101725ceba3039a` -
  `fix(h001): validate package-lock required closure`
- `a4bbf6ded062151710676500c221c613017df9a3` -
  `test(h001): close package-lock semantic edge gaps`
- `3079cd00942f8f7b38b299de1844b8748b7dcad4` -
  `fix(h001): validate package-lock semantic edges`

## Technical Tree

- `ec1c393403aaf8c1b2ed74ac0e87c3cdff857752`

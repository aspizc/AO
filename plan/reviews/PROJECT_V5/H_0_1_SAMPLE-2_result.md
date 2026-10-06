# Independent Review Result — Project V5 H/0/01 SAMPLE Trial 2

## Verdict

**KO**

No P0 was found. Trial 2 closes the physical-path and documented-entry-point
findings from Trial 1, and it adds an effective early Node/runtime/root-parity
boundary. One P1 remains: the boundary does not validate the package-lock
dependency graph. An incomplete or internally drifted `packages` table passes
preflight; the fake task lane then reports success after mutating dependency
state. This does not satisfy Trial 1's requirement to reject any package/lock
drift before uv/npm installation calls.

This verdict applies only to the frozen H/0/01 SAMPLE correction slice. It does
not review the later doctor command, renderers, probes, integration gate,
promotion, or release.

## Severity summary

- P0: none.
- P1: one blocking package-lock validation gap.

## Reviewer profile

- Requested/configured profile: **GPT-5.6 Sol**, reasoning `ultra`.
- Review mode: independent, adversarial, evidence-based local QA.
- No external telemetry was available to prove model, reasoning, latency, or
  service-tier execution; the profile above records the requested
  orchestration configuration.

## Frozen identity, parentage, and scope

- Branch: `feat/V5-H-0-01-sample`
- Worktree:
  `/tmp/agents-orchestrator-v5-h001-s1.VSzDnR/worktree`
- Prior KO commit:
  `f943c9944dc6eb37a126f1a72d0a394e68609d58`
- Prior KO tree:
  `361f37c728669a26519187d4e86809189fc04610`
- RED commit:
  `946d3712e1b7d5d58906211a02b9acf33d2606a6`
- RED tree:
  `873e15360477d2ca6acf5cb58fff321cd5be96d4`
- Technical commit:
  `7879c4403f31255c3b4fddd21a29d6a458402d30`
- Technical tree:
  `8120e70f31ed1b751d6131d6b94e2a41f2db43d1`
- Request-only commit:
  `6ed2a4ab766ea09730416995d6a3c1301f7724aa`
- Request-only tree:
  `0706bd10fc7f3fd5d90220a438ecf8f98853424c`
- Exact correction range:
  `f943c9944dc6eb37a126f1a72d0a394e68609d58..7879c4403f31255c3b4fddd21a29d6a458402d30`

Parentage is exact: RED is the direct child of the prior KO, the technical
commit is the direct child of RED, and the request commit is the direct child
of the technical commit. The request commit adds only
`plan/reviews/PROJECT_V5/H_0_1_SAMPLE-2_to_review.md`.

The complete prior-KO-to-request path set is:

```text
docs/doctor.md
plan/reviews/PROJECT_V5/H_0_1_SAMPLE-2_to_review.md
scripts/bootstrap.sh
scripts/bootstrap_preflight.mjs
tests/fixtures/h001/fake-bin/node
tests/fixtures/h001/fake-bin/uv
tests/structure/test_h001_bootstrap.py
tests/structure/test_h001_sample.py
```

All technical paths are within the SAMPLE/bootstrap correction surface. No
sample, schema, canonical profile, policy, catalog, manifest, lock, workflow,
or shared suite-manifest content changed. The worktree was clean before this
result was added.

## Blocking finding

### P1-1 — Package-lock graph drift passes preflight and the fake lane

The new helper checks that `package-lock.json` is an object with
`lockfileVersion: 3`, `requires: true`, and a root `packages[""]` object
(`scripts/bootstrap_preflight.mjs:147-160`). It compares only the selected root
fields and top-level name/version (`scripts/bootstrap_preflight.mjs:161-177`).
It never traverses or validates any non-root entry in `lock.packages`.

The submitted regression covers invalid JSON and a changed `zod` range in
either the manifest or the lock root
(`tests/structure/test_h001_bootstrap.py:413-450`). Those are useful cases, but
they do not exercise an incomplete or internally inconsistent packages table.

Two isolated copies of the frozen technical inputs demonstrated the gap
without network or real installation:

1. Replacing `lock.packages` with only its unchanged root entry left all
   manifest dependencies declared but removed every locked package entry.
   Direct preflight returned `0`.
2. Changing only `packages["node_modules/zod"].version` from the reviewed
   version to `99.0.0`, while the unchanged root still requires `^3.23.0`,
   also returned `0`.

The first malformed lock was then exercised through the submitted strict fake
uv/npm lane:

```text
nested-package-entry-count=0 preflight_rc=0
malformed_nested_lock_bootstrap_rc=0 venv=yes node_modules=yes calls=5
zod_version=99.0.0 preflight_rc=0
```

Therefore the preflight can admit a lock that cannot represent the declared
dependency closure, and the fake lane cannot distinguish it from the reviewed
lock. `scripts/bootstrap.sh:97` accepts the incomplete check, then
`scripts/bootstrap.sh:105-119` performs uv and npm calls and creates dependency
state. Discovery by the integrator-only real `npm ci` gate would be too late
for the Trial 1 correction, which explicitly requires package/lock drift to
fail before uv/npm installation.

Required correction:

1. Validate enough of the lock graph before `uv venv` to reject missing direct
   package entries and internally inconsistent locked versions/metadata, not
   only root parity.
2. Add RED regressions for an unchanged root with a missing direct package
   entry and for a locked version incompatible with its declared dependency.
3. Require both regressions to leave the uv/npm fake log empty and create
   neither `.venv` nor `gateway/node_modules`.
4. Keep the real empty-cache `npm ci` proof in the integration lane; do not
   replace it with, or infer it from, the fake task lane.

## Trial 1 findings that are closed

### Physical containment and symlink handling

`scripts/bootstrap.sh:11-24` resolves one physical checkout root.
`check_control_path` walks every component and rejects symlinks
(`scripts/bootstrap.sh:26-53`), and the preflight independently performs
component-wise `lstat` checks (`scripts/bootstrap_preflight.mjs:60-97`).
Required dependency inputs, all shipped hero targets, `.venv`,
`.venv/bin`, `.venv/bin/activate`, and `gateway/node_modules` are covered.

The boundary runs before installers, again after virtualenv creation before
sourcing, and immediately before npm (`scripts/bootstrap.sh:87,112-119`).
The focused tests reject ancestor, target, and nested-output symlinks; the
installer-created `.venv/bin` symlink case stops before sourcing or later
installation and leaves the external target unchanged. A normal contained
`.venv/lib64 -> lib` symlink remains allowed. No deterministic unchecked
symlink escape or unreasonable non-concurrent TOCTOU window was found.

### Node/runtime preflight

Missing Node, malformed version output, unsupported versions, unsupported
engine syntax, invalid manifest/lock JSON, wrong lock root shape, and selected
manifest/root drift fail before `uv venv`. The submitted unsupported-version
matrix and malformed/root-drift matrix leave no fake installer calls, `.venv`,
or `gateway/node_modules`. This portion is closed subject to P1-1's deeper
lock-graph gap.

### Reproducible invocation and global Python

`docs/doctor.md:23-28` publishes an explicit checkout-root `cd` followed by
`./scripts/bootstrap.sh`; the resulting command block is independent of the
caller's original directory. The script derives its physical root from
`BASH_SOURCE` and quoted paths, while the focused success case exercises the
documented relative invocation.

Bootstrap no longer calls `python3` or
`scripts/requirements_lock.sh --check-inputs`. The read-only Node helper
reproduces the recorded Python input digest, so global Python is not a
bootstrap preflight prerequisite. Documentation now declares Node, npm, uv,
and uv's Python 3.11 resolution requirement.

## Positive evidence

- Pre-existing control-path symlinks fail before uv/npm calls and before
  `.venv` or `node_modules` creation.
- Unsupported Node versions `20.19.0`, `22.12.0`, `23.0.0`, and `25.0.0`
  fail with zero dependency state.
- The helper imports only read-only filesystem APIs and has no child-process
  or network API.
- The checked-in manifest and lock root match, the current Node runtime passes
  the supported engine contract, and the Python lock-input digest is current.
- Strict uv/npm fakes still enforce the exact five allowlisted calls and reject
  unallowlisted network argv without logging it.
- The shipped H001 surfaces contain no owner-local path, credential assignment,
  credential-bearing URL, or secret canary.
- The correction does not alter the canonical H/0/00 provider/model/tool
  authority or broaden H/0/01 SAMPLE into later doctor/probe work.

## Verification performed

- Parentage, commit/tree identities, exact range, request-only path, executable
  modes, technical allowlist, and initial cleanliness: passed.
- RED reconstruction at
  `946d3712e1b7d5d58906211a02b9acf33d2606a6` with the submitted focused command:
  `18 failed, 22 passed`.
- Focused current inventory:

  ```text
  uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q \
    tests/structure/test_h001_bootstrap.py \
    tests/structure/test_h001_sample.py
  ```

  Result: `52 passed`.
- Related explicit structure inventory with isolated `--basetemp`:
  `70 passed`.
- Directed Ruff over the two H001 structure tests: passed.
- `./scripts/requirements_lock.sh --check-inputs`: passed.
- `node --check scripts/bootstrap_preflight.mjs` and direct read-only
  preflight against the frozen request tree: passed.
- Node JSON parsing of the schema and three sample JSON fixtures: passed.
- `bash -n` over bootstrap and all three H001 fake executables: passed.
- `git diff --check` over the correction, request-only, and complete ranges:
  passed.
- Scoped owner-path, credential-assignment, credential-URL, and secret scans:
  no shipped-surface matches.
- Isolated package-lock graph probes: failed the acceptance boundary as
  documented in P1-1.

## Review limits

This review did not execute the real bootstrap, real uv/npm installation,
`npm test`, aggregate suites, CI, network access, Redis, MCP, KYA, provider
CLIs, tmux, agents, or shared services. The only uv activity was the explicit
offline test/lint environment backed by local cache. Bootstrap behavior was
exercised only with the submitted strict fake installers.

No implementation, test, documentation, sample, schema, manifest, lock,
policy, catalog, workflow, configuration, credential, or service state was
modified. No integration, promotion, publication, or release action was
performed.

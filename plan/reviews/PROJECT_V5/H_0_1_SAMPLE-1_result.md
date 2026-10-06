# Independent Review Result — Project V5 H/0/01 SAMPLE Trial 1

## Verdict

**KO**

The exact Trial 1 candidate has a regular, owner-neutral synthetic sample and
preserves the canonical H/0/00 role/model/tool authority. Its declared RED,
focused GREEN, related structure inventory, lint, lock-input, JSON/schema,
syntax, diff, and leak checks reproduce.

The bootstrap boundary is not fail-closed, however. Three P1 findings block
acceptance:

1. symlinks in ancestor or child path components can make the bootstrap read
   and write outside the checkout;
2. Node manifest/lock/runtime failures are discovered only at the final
   `npm ci`, after Python dependency state has already been mutated; and
3. the sole documented command does not work from the working-directory scope
   it claims, while a required global `python3` executable is not declared.

No P0 was found. This KO applies only to the frozen SAMPLE slice. It does not
review the later doctor command, renderers, probes, integration gate,
promotion, or release.

## Reviewer profile

- Requested/configured profile: **GPT-5.6 Sol**, reasoning `ultra`, service
  profile `Priority/Fast`.
- Review mode: independent, adversarial, evidence-based local QA.
- No external service-profile telemetry was available. The profile above is
  the requested orchestration configuration, not external proof of model,
  reasoning, latency, or service-tier execution.

## Frozen identity and scope

- Branch: `feat/V5-H-0-01-sample`
- Worktree:
  `/tmp/agents-orchestrator-v5-h001-s1.VSzDnR/worktree`
- Frozen base:
  `8a92e462c2ca5a094af203344700e7d268d82937`
- Frozen base tree:
  `841271796fc7475035f54d281f40b9b7f3b11555`
- RED commit:
  `82b5564a7df310f3966f926ab5bd5b3830943d84`
- RED tree:
  `b197c507eb2047252ed5b20a18cfe1c9aa0ac70c`
- Technical commit:
  `9f1dac04f9dfb1adc1e0f20111d4f53d910849d5`
- Technical tree:
  `76ce667d8ada2f8adaf22b4113ad78ef7bb1228a`
- Request-only commit:
  `5132a444bf0be11377e47186cc567a7f07a5ab4f`
- Request-only tree:
  `41deed11fe4a9fcabee675b324628b7a82a7de34`
- Exact technical range:
  `8a92e462c2ca5a094af203344700e7d268d82937..9f1dac04f9dfb1adc1e0f20111d4f53d910849d5`
- Canonical H/0/00 profile SHA-256:
  `8257a159ce1b7573bc7557582490218ca201095197d113a05627228f83f4170e`

Parentage is exact: RED is the direct child of the frozen base, the technical
commit is the direct child of RED, and the request commit is the direct child
of the technical commit. RED adds only the two H001 structure tests and two
strict fake installers. The technical commit adds the schema, hero sample,
bootstrap, and documentation; its test changes are import formatting plus four
additional textual traversal cases. The request commit adds only
`plan/reviews/PROJECT_V5/H_0_1_SAMPLE-1_to_review.md`.

The complete base-to-request path set is:

```text
docs/doctor.md
examples/hero/app/index.html
examples/hero/plan.json
examples/hero/profile.json
examples/hero/repository.json
plan/reviews/PROJECT_V5/H_0_1_SAMPLE-1_to_review.md
schemas/doctor-profile-v1.schema.json
scripts/bootstrap.sh
tests/fixtures/h001/fake-bin/npm
tests/fixtures/h001/fake-bin/uv
tests/structure/test_h001_bootstrap.py
tests/structure/test_h001_sample.py
```

The worktree was clean before review execution.

## Blocking findings

### P1-1 — Symlinked path components escape the checkout and permit external mutation

The required-input loop checks `-f "$input"` and `-L "$input"`
(`scripts/bootstrap.sh:14-28`). `-f` follows symlinks, while `-L` examines only
the final component. The script never proves that ancestor directories such as
`gateway`, `cli`, `orchestrator-langgraph`, or `ci` resolve physically beneath
the checkout root.

The output checks have the same gap. Only `.venv` itself is rejected when it
is a symlink, and only the final `.venv/bin/activate` path is checked
(`scripts/bootstrap.sh:50-59`). An existing `.venv/bin` symlink is followed.
The final npm operation also trusts the unchecked `gateway` path
(`scripts/bootstrap.sh:62`).

Two disposable-checkout probes used the submitted fake uv/npm implementations:

```text
gateway_ancestor_symlink_rc=0 outside_marker=yes calls=5
venv_child_symlink_rc=0 outside_activate=yes calls=5
```

In the first probe, `gateway` pointed to an external directory containing
regular package inputs. Every preflight passed and the npm fake created
`node_modules/.h001-installed` outside the checkout. In the second, `.venv`
was a regular directory but `.venv/bin` pointed outside; the uv fake created
the external activation script, which the bootstrap then sourced.

The structure fixtures always create ordinary directories
(`tests/structure/test_h001_bootstrap.py:37-43,61-72`) and contain no ancestor
or nested-output symlink case. The sample structure test also follows the same
resolved symlink on both sides of its comparisons
(`tests/structure/test_h001_sample.py:109-132`). Replacing the three sample
targets with external symlinks still produced `4 passed`, so that test does not
establish physical containment either.

The committed sample files themselves are regular Git blobs, so no existing
owner data is being alleged. The blocker is that the shipped bootstrap accepts
an adversarial checkout and performs effects outside its declared output
boundary.

Required correction:

1. Resolve the checkout physically and reject any required input whose complete
   path chain leaves that root.
2. Validate existing and newly created output components, including
   `.venv/bin`, `.venv/bin/activate`, `gateway`, and
   `gateway/node_modules`, before sourcing or installing.
3. Add ancestor, nested-output, and sample-target symlink regressions that
   require zero installer calls and zero external reads/writes on rejection.

### P1-2 — Node lock/runtime validation occurs after Python installation effects

The pre-install checks verify only that the three Node files exist and are not
final-component symlinks (`scripts/bootstrap.sh:14-28`). The only stale-input
checker invoked before installation is
`./scripts/requirements_lock.sh --check-inputs`
(`scripts/bootstrap.sh:36`), whose digest covers only the two Python projects,
the build requirements, and the Python lock script
(`scripts/requirements_lock.sh:46-84`).

There is no pre-effect check that:

- `gateway/package.json` and the root entry in
  `gateway/package-lock.json` agree;
- `node` exists and satisfies the authoritative engine range; or
- npm can enforce the checked-in lock.

Those conditions are deferred to the final `npm --prefix gateway ci`, after
`uv venv`, `uv pip sync`, and both editable installs have already run
(`scripts/bootstrap.sh:54-62`). This contradicts the published statement that
the script “fails before installation when a reviewed lock input is absent or
stale” (`docs/doctor.md:29-31`).

An isolated probe changed the `zod` range in `gateway/package.json` without
changing the lockfile. The strict fake verifies exact npm argv but, like the
submitted test lane, has no manifest/lock preflight:

```text
stale_node_input_rc=0 venv_mutated=yes calls=5
```

The current matrix checks a missing package lock and a stale Python lock, but
not a desynchronized Node manifest/lock or a missing/unsupported Node runtime
(`tests/structure/test_h001_bootstrap.py:214-247`). The npm fake checks only its
three arguments (`tests/fixtures/h001/fake-bin/npm:4-7`).

Required correction:

1. Add a read-only Node manifest/lock and runtime preflight before `uv venv`.
2. Reject missing/unsupported Node and any package/lock drift with no uv/npm
   installation call and no `.venv` or `node_modules` mutation.
3. Keep the integrator-only real empty-cache `npm ci` gate; do not claim the
   task-lane fake proves a real install.

### P1-3 — The documented entry point is not reproducible and omits a required tool

The documentation says “From any working directory, run” and then gives only:

```text
./scripts/bootstrap.sh
```

(`docs/doctor.md:23-27`). That relative path exists only when the current
directory is the checkout root. The portability test does not execute the
published command; it invokes an absolute checkout path from the outside
directory (`tests/structure/test_h001_bootstrap.py:191-192`).

The script also requires a globally discoverable `python3` before uv is used
(`scripts/bootstrap.sh:32-36`). The documentation instead says only that Python
3.11 must be resolvable by uv and that the installer CLIs are prerequisites
(`docs/doctor.md:43-46`). A disposable environment with the submitted uv/npm
fakes present but no global `python3` produced:

```text
uv_and_npm_present_python3_absent_rc=1 log=absent venv=absent
bootstrap: python3 is required to validate the Python lock inputs
```

Failing before mutation is correct, but the environment met the documented
prerequisites. This violates the H/0/01 requirement for a documented bootstrap
with no undeclared tool (`plan/PROJECT_V5/H/0/01.md:20-22`).

Required correction:

1. Publish an invocation that actually works from the declared location, such
   as an explicit checkout-root `cd` or an absolute/parameterized checkout
   script path, and exercise that exact command.
2. Either declare and version-test the global `python3` prerequisite or run the
   lock checker with the reviewed Python resolved through uv.

## Positive and non-blocking evidence

- The exact committed schema, profile, repository, plan, and app are regular
  files. The sample uses the existing unrestricted `sample-apps` identity and
  contains no owner-local path, credential assignment, credential-bearing URL,
  secret canary, provider output, or personal data.
- The shipped selections resolve against the canonical H/0/00 profile, role
  registry, repository policy, capability registry, MCP tool catalog, and
  artifact-kind schema. Each of the three selections uses an executable
  provider, and every selected role/model/effort/tier/tool combination is
  supported.
- Only prerequisite-free `plan` and `execute` workflows are selected. Neither
  the sample nor `docs/doctor.md` claims that doctor, review, completion,
  provider-login, coordination, or probe gates are implemented.
- `doctor-profile-v1.schema.json` is correctly scoped as an input schema, not a
  doctor result schema. It rejects unknown root/selection fields and absolute
  or `..` paths. It intentionally does not copy H/0/00 semantic enums:
  unsupported phase/agent/role/model/effort/tier/tool strings remain
  structurally valid and are checked against H/0/00 for the shipped fixture.
  This review does not require a duplicated authority in the schema.
- `uniqueItems` rejects an exact duplicate selection but not two distinct
  selections with the same `id`; `.` is also structurally accepted as a
  relative path. These are non-blocking for this exact SAMPLE tree, whose IDs
  and paths are unambiguous. The later doctor consumer must reject duplicate
  IDs, ambiguous references, symlink escapes, and unsupported semantic values
  before use.
- A checkout path containing spaces and shell metacharacters completed with
  exactly five fake calls and created no injected marker. Static inspection
  found fixed, quoted argv and no `eval` or shell-generated installer command.
- Missing npm with a deliberately minimal PATH failed before uv invocation,
  created no installer log, and created no `.venv`; global application
  dependencies did not rescue the bootstrap.
- Exact fake call order, first-error stopping, second-run repeatability,
  ordinary-checkout cleanliness, empty-HOME canary non-disclosure, and rejection
  of network/extra argv are covered and reproduced by the focused suite.
- The docs correctly reserve the real empty-cache, hash-pinned network install
  for the integration lane.

## Verification performed

- Parentage, commit/tree identities, exact technical path set, request-only
  path, executable modes, and initial cleanliness: passed.
- RED reconstruction on
  `82b5564a7df310f3966f926ab5bd5b3830943d84`:
  `5 failed, 2 passed, 10 errors`, matching the submission.
- Focused H001 inventory:

  ```text
  uv run --offline --no-project --with pytest --with jsonschema \
    python -m pytest -q \
    tests/structure/test_h001_sample.py \
    tests/structure/test_h001_bootstrap.py
  ```

  Result: `17 passed`.

- Related explicit structure inventory with an isolated `--basetemp`:
  `35 passed`.
- Directed Ruff:

  ```text
  uv run --offline --no-project --with ruff ruff check \
    tests/structure/test_h001_sample.py \
    tests/structure/test_h001_bootstrap.py
  ```

  Result: passed.
- `./scripts/requirements_lock.sh --check-inputs`: passed;
  `requirements.lock inputs are current`.
- `python3 -m json.tool` on the new schema and all three JSON fixtures: passed.
- Draft 2020-12 schema validation and sample validation: passed.
- `bash -n` on the bootstrap and both fake installers: passed.
- `shellcheck` was not installed. Manual equivalent inspection covered quoting,
  arrays, command substitutions, sourcing, fixed argv, error ordering, path
  resolution, and effect boundaries; it found P1-1 and P1-2.
- `git diff --check` on the technical, request-only, and complete
  base-to-request ranges: passed.
- Scoped owner-path, credential-assignment, credential-URL, and secret-canary
  scans over the shipped H001 surfaces: no match.
- Canonical Node lock root metadata equals `gateway/package.json`; the
  Python lock contains one input digest and 1,336 SHA-256 entries. These facts
  validate the frozen inputs but do not repair P1-2's missing runtime preflight.
- Adversarial fake-bootstrap summary:

  ```text
  metachar_path_rc=0 marker=no calls=5
  gateway_ancestor_symlink_rc=0 outside_marker=yes calls=5
  venv_child_symlink_rc=0 outside_activate=yes calls=5
  stale_node_input_rc=0 venv_mutated=yes calls=5
  missing_npm_rc=1 installer_log=absent venv=absent
  ```

- Adversarial schema matrix confirmed that additional properties and textual
  traversal are rejected, while semantic strings and distinct duplicate IDs
  remain outside this structural schema's authority.
- Postflight: no review temp directory, `.venv`, `node_modules`,
  `.pytest_cache`, H001 `__pycache__`, or review-started process remained. The
  worktree was clean before this result file was added.

## Review limits

This review did not execute the real bootstrap, real `npm ci`, the bootstrap's
real uv dependency-install steps, network access, tmux, MCP, Redis, provider
CLIs, shared state/services, or aggregate CI/test globs. The only uv activity
was the explicit offline test/lint environment backed by local cache; every
bootstrap probe used the submitted strict fake uv/npm binaries.

It did not edit implementation, tests, documentation, sheets, request,
schemas, sample inputs, lock files, catalogs, policies, manifests, workflows,
personal configuration, credentials, or service state. It performed no
integration, promotion, publication, or release action.

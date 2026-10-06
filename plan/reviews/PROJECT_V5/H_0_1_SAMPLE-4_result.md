# Independent Review Result — Project V5 H/0/01 SAMPLE Trial 4

## Verdict

**KO**

No P0 was found. Trial 4 correctly replaces the hand-written package graph,
SemVer, link, SRI, and resolution implementation with an exact binding to the
two unchanged production snapshots. The submitted RED and GREEN inventories
reproduce, the current reviewed lock passes, and the malformed, missing,
symlinked, stale, disagreeing, wrong-schema, wrong-path, duplicate-path, and
changed-lock cases in the submitted matrix fail before installer selection
without dependency state.

One P1 remains. The exact lock digest is checked only once, before four `uv`
invocations. The physical boundary immediately before `npm ci` checks only
path existence, type, and symlink status; it does not rebind the bytes that npm
will consume. A preceding installer can replace the lock contents in place as
a regular file, after which the final boundary passes and `npm ci` consumes
unreviewed bytes.

This verdict applies only to the frozen H/0/01 SAMPLE Trial 4 correction. It
does not review the later doctor command, renderers, probes, real empty-cache
integration gate, promotion, or release.

## Severity summary

- P0: none.
- P1: one blocking exact-lock consumption race.

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
- Trial 3 KO base:
  `e4ba9f4f01de2024345c49da11dc91f874ebd0ee`
- Trial 3 KO base tree:
  `b838a0cfc2c4b57cef3924433e225b387d9ffb61`
- RED:
  `0de296bd0ceb522229aa5a4b3901a1cf888ba08c`
- RED tree:
  `438351b8ba5ccc3fdcb35cf7112d9d5d0e231388`
- Final technical:
  `2f2ded24add009c6e710f51907808fefb66c7b13`
- Final technical tree:
  `9a9f6ee370ba6aa56b4fae8288a2e43683c2a20c`
- Request-only:
  `e2bc54cdd97a8a602d718a28d099186da69370ca`
- Request-only tree:
  `b7cc35184d864ef7d3888d167cd29f9eec9fb363`
- Exact technical range:
  `e4ba9f4f01de2024345c49da11dc91f874ebd0ee..2f2ded24add009c6e710f51907808fefb66c7b13`

Parentage is exact and linear. RED is the direct child of the Trial 3 result,
the technical commit is the direct child of RED, and the request commit is the
direct child of the technical commit.

RED changes only:

```text
tests/structure/test_h001_bootstrap.py
```

The technical commit changes only:

```text
docs/doctor.md
scripts/bootstrap.sh
scripts/bootstrap_preflight.mjs
```

The request commit adds only:

```text
plan/reviews/PROJECT_V5/H_0_1_SAMPLE-4_to_review.md
```

The net technical range is exactly:

```text
docs/doctor.md                         +21/-2
scripts/bootstrap.sh                    +2/-0
scripts/bootstrap_preflight.mjs        +89/-589
tests/structure/test_h001_bootstrap.py +267/-35
```

File modes are preserved: `scripts/bootstrap.sh` remains `100755`; the other
technical files remain `100644`.

Neither production snapshot, the Node manifest/lock, nor the Python lock
changed in Trial 4. Their blobs are identical at the base and technical trees:

```text
ci/production-advisories.json c6f2a11e4d99d9c825c80f7b448cf162fadc26dd
ci/production-sbom.json        71a4488a3821ed090891d1f7905c790b1a7188e5
gateway/package-lock.json      9c81b72edf8a1fe72a3b119bc8184b039a06264b
gateway/package.json           1239dbd29c9e3c63bbc830dd808230704df8a89b
requirements.lock              6898c3a605ee0aafa51355d1903a6bbcc9dfead8
```

## Blocking finding

### P1-1 — The verified lock can change before `npm ci` consumes it

The only exact byte binding occurs in
`scripts/bootstrap_preflight.mjs:212-226`. It reads both authorities, requires
their selected digests to agree, hashes the current lock bytes, compares that
hash, and parses the same buffer. `scripts/bootstrap.sh:99` invokes that
preflight exactly once.

After the binding succeeds, the bootstrap performs:

```text
scripts/bootstrap.sh:107-114  uv version selection and virtualenv creation
scripts/bootstrap.sh:118      uv pip sync
scripts/bootstrap.sh:119      uv editable installation
scripts/bootstrap.sh:120      physical boundary check
scripts/bootstrap.sh:121      npm ci
```

The last boundary calls `check_control_path`, whose checks at
`scripts/bootstrap.sh:35-52` cover only symlinks, existence, and file/directory
type. Replacing `gateway/package-lock.json` contents in place leaves a regular
file at the same path, so this boundary succeeds. There is no second call to
`bootstrap_preflight.mjs`, no digest comparison in the shell, and no reviewed
copy passed to npm.

This is a deterministic sequenced gap, not only the narrow `lstat`/`read`
window of a concurrent filesystem race. A strict installer or editable build
step can rewrite the regular lock before returning. The existing fake already
models installer-created filesystem changes for `.venv/bin`
(`tests/structure/test_h001_bootstrap.py:699-717`), but it has no mode that
changes a regular control file. The success fixture then expects all five
calls and cannot distinguish this case.

The result is that npm can resolve and install a different transitive graph,
archive URL, integrity value, or version from the one named by both reviewed
snapshots. The initial preflight still reports success because the mutation
happens after it. The final type check still reports success because the file
remains regular.

Required correction:

1. Re-establish the complete snapshot/lock byte binding after the last
   preceding mutation-capable step and immediately before `npm ci`.
2. Add a strict-fake regression that changes only the regular lock bytes
   during an allowed `uv` call. Require a nonzero result, no npm call, and no
   `gateway/node_modules`.
3. Preserve the current stronger guarantee for inputs invalid at entry: zero
   uv/npm calls and neither dependency-state directory.
4. State and enforce the remaining concurrency model. If same-checkout
   concurrent writers are in scope, use an immutable reviewed input/copy or an
   equivalent serialization boundary rather than relying on a path recheck
   alone.

No custom mutation probe was executed because this review was explicitly
limited to the exact submitted focused/fake/structure commands. The finding
is established directly by the frozen control flow and the absence of any
post-`uv` digest operation.

## Exact-lock contract that is correctly implemented

- `ci/production-sbom.json` and `ci/production-advisories.json` are required
  by both shell and Node physical-path inventories. Static symlinks in either
  file or an ancestor are rejected.
- Snapshot bytes are parsed and then reserialized in the repository's compact,
  sorted, UTF-8 representation with one final newline. The byte comparison
  rejects alternate whitespace, key order, malformed UTF-8 representations,
  and duplicate object keys. A duplicate key cannot survive `JSON.parse` and
  still reproduce the original duplicate bytes.
- JSON parsing cannot materialize getters, proxies, or executable object
  accessors. Selected fields are read from inert JSON values, and own-property
  checking is used for the advisory map.
- The SBOM requires `production-sbom/v1` and exactly one object whose path is
  the literal `gateway/package-lock.json`.
- The advisory snapshot requires `production-advisories/v1`, an object
  `lockDigests`, and its own literal `gateway/package-lock.json` member.
  Canonical reserialization also rejects a duplicate object member.
- Each selected digest must match `sha256:[a-f0-9]{64}`. Both selected values
  must agree, and SHA-256 is computed over the complete lock buffer before
  that same buffer is parsed.
- Independent extraction confirmed both authorities and the actual lock equal:

  ```text
  sha256:71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0
  ```

- The digest is not embedded in `scripts/bootstrap_preflight.mjs`.
- The old dependency SemVer parser, dependency traversal, optional/peer
  closure, SRI parser, and link dereference functions are absent.
- Manifest/lock-root parity, the supported Node runtime contract, and the
  Python lock-input digest check remain after the exact Node lock binding.
- `scripts/bootstrap.sh` still has no global `python3` prerequisite and does
  not execute `scripts/requirements_lock.sh` during bootstrap preflight.
- The docs make snapshot refresh integrator-owned and do not claim that this
  task modified or regenerates either authority.
- The checked-in reviewed lock passes direct preflight without an installed
  Node tree or global application packages.

## Adversarial review notes

- No canonicalization or duplicate-key bypass was found for the selected
  snapshot records.
- No path-string ambiguity was found: selection uses one hard-coded POSIX
  repository-relative literal, not a snapshot-controlled filesystem path.
- No digest algorithm, case, prefix, truncation, text-decoding, or
  selected-versus-hashed-byte ambiguity was found.
- Static path-escape cases from Trials 1 and 2 remain rejected
  component-by-component before installation, including the newly required
  snapshots.
- The former quadratic graph/link traversal is gone. Current work is hashing
  and JSON parsing plus per-object key sorting. Input byte/depth/count limits
  are not explicit, but this review did not establish a practical small-input
  amplification comparable to Trial 3's sub-2 MiB quadratic case. The current
  lock, SBOM, and advisory files are 83,966, 70,869, and 989 bytes,
  respectively. Explicit generous bounds remain reasonable hardening, not a
  second blocking finding in this frozen slice.
- Coherent future lock/snapshot refresh is intentionally permitted and owned
  by integration. A mutually consistent change is therefore not treated as a
  hard-coded-digest bypass.

## Trial 1–3 boundary revalidation

- Checkout-root resolution still derives from `BASH_SOURCE`, publishes the
  exact checkout-root `cd` invocation, and handles quoted paths.
- Required inputs and controlled outputs still receive component-wise
  non-symlink physical checks before mutation.
- `.venv/bin/activate` is revalidated after virtualenv creation before it is
  sourced, and the output boundary is checked again before npm.
- Missing or unsupported Node, manifest/root drift, stale Python inputs,
  missing locks, and every submitted exact-lock snapshot failure stop before
  `uv --version`.
- The normal in-checkout `.venv/lib64 -> lib` symlink remains allowed because
  it is outside the controlled component list.
- Strict fake installers retain fixed argv, fail-first behavior, empty-home
  isolation, repeatability, and no network-argument acceptance.
- Trial 3's four custom-parser blockers are removed rather than patched:
  optional closure, resolution/SRI/extras, dependency SemVer, and quadratic
  links are no longer bootstrap responsibilities.

## Verification performed

- Parentage, commit/tree identities, exact ranges, path allowlists, modes,
  unchanged authority/lock blobs, request-only scope, and initial cleanliness:
  passed.
- RED reconstruction at
  `0de296bd0ceb522229aa5a4b3901a1cf888ba08c` with the submitted focused
  selection: `20 failed, 1 passed, 89 deselected`.
- Current submitted focused selection: `21 passed, 89 deselected`.
- Full H001 bootstrap structure inventory: `110 passed`.
- Related explicit structure inventory: `133 passed`.
- Directed Ruff over the two H001 structure tests: passed.
- `node --check scripts/bootstrap_preflight.mjs`: passed.
- Direct read-only preflight against the frozen request tree and active Node
  runtime: passed.
- `./scripts/requirements_lock.sh --check-inputs`: passed.
- `bash -n` over bootstrap and all three H001 fake executables: passed.
- Node JSON parsing of the manifest, lock, both authorities, doctor profile
  schema, and three hero JSON fixtures: passed.
- Independent snapshot extraction and SHA-256 hashing: both selected digests
  and actual lock bytes agree.
- `git diff --check` over both the technical and complete request ranges:
  passed.
- Scoped scans found none of the removed graph/SemVer functions, hard-coded
  reviewed digest, child-process/network/write imports, bootstrap global
  Python call, or network/bootstrap installer aliases.

## Review limits

This review did not execute the real bootstrap, real uv/npm installation,
`npm test`, aggregate suites, CI, network access, Redis, MCP, KYA, provider
CLIs, tmux, agents, or shared services. All bootstrap behavior executed by the
focused suites used the submitted strict fake installers. The only uv activity
was the explicit offline focused test/lint environment backed by local cache.

No implementation, test, documentation, sample, schema, manifest, lock,
snapshot, policy, catalog, workflow, configuration, credential, or service
state was modified. No snapshot refresh, integration, promotion, publication,
or release action was performed.

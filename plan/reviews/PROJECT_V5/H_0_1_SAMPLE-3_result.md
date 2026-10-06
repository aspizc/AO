# Independent Review Result — Project V5 H/0/01 SAMPLE Trial 3

## Verdict

**KO**

No P0 was found. Trial 3 correctly closes Trial 2's direct and required
transitive dependency gap, preserves the earlier physical/pre-mutation
boundaries, and reproduces its two RED phases and focused green inventories.
Four P1 findings remain in the claimed complete package-lock boundary:

1. a present optional package is not traversed, so its missing required
   dependency closure passes;
2. resolution, SRI, unreachable-extra, and path/name metadata remain
   fail-open;
3. the hand-written SemVer parser accepts invalid contracts and rejects valid
   ones; and
4. valid link chains are checked quadratically with no input or traversal
   bounds.

Each fail-open acceptance was reproduced before installer selection and then
through the submitted strict fake lane. The malformed inputs returned success,
made all five fake calls, and created both `.venv` and
`gateway/node_modules`.

This verdict applies only to the frozen H/0/01 SAMPLE Trial 3 correction
slice. It does not review the later doctor command, renderers, probes,
integration gate, promotion, or release.

## Severity summary

- P0: none.
- P1: four blocking package-lock validation findings.

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
- Trial 2 KO base:
  `f1052e6ff0e2265190a19e32d3044ff98e1cef18`
- Trial 2 KO base tree:
  `f24326e462a9568763dcec43030a236935b0ec23`
- Initial RED:
  `2e9b810c82438b66b56d9d25cb049683d94405e0`
- Initial RED tree:
  `5de33dd80c641a72565eb8adeeeeccc9224b87f9`
- Initial technical commit:
  `b7b107171945f6287830358e5101725ceba3039a`
- Initial technical tree:
  `e438d0855749234b38a0cc9addaa2e56ef004185`
- Correction RED:
  `a4bbf6ded062151710676500c221c613017df9a3`
- Correction RED tree:
  `53f7002a924aad091991a3e2b7da477038fe24cd`
- Final technical commit:
  `3079cd00942f8f7b38b299de1844b8748b7dcad4`
- Final technical tree:
  `ec1c393403aaf8c1b2ed74ac0e87c3cdff857752`
- Request-only commit:
  `a5ef19345c460038b3b91a9cbd47fea75057c39d`
- Request-only tree:
  `f88170c1828de919b5b0618608de97158640206e`
- Exact technical range:
  `f1052e6ff0e2265190a19e32d3044ff98e1cef18..3079cd00942f8f7b38b299de1844b8748b7dcad4`

Parentage is exact and linear: each RED/technical commit is the direct child
of the preceding listed commit, and the request commit is the direct child of
the final technical commit. The two RED commits modify only
`tests/structure/test_h001_bootstrap.py`; the two technical commits modify
only `scripts/bootstrap_preflight.mjs`.

The net technical range changes exactly:

```text
scripts/bootstrap_preflight.mjs        +616/-0
tests/structure/test_h001_bootstrap.py +368/-0
```

The request commit adds only
`plan/reviews/PROJECT_V5/H_0_1_SAMPLE-3_to_review.md`. Trial 2's result is
already present in the frozen base and is not rewritten by any Trial 3
technical or request commit. File modes remain `100644`. The worktree was
clean before this result was added.

## Blocking findings

### P1-1 — A present optional package's required closure is not validated

`checkRequiredPackageClosure` validates a present optional target's name and
version but does not enqueue it (`scripts/bootstrap_preflight.mjs:685-691`).
Required targets and required peers are enqueued at lines 681-683 and 705-707,
respectively. Therefore the optional package's own required dependencies are
never checked unless another required edge happens to reach the same package.

An isolated copy added a compatible present optional package to the reached
`@modelcontextprotocol/sdk` entry. That optional package declared one required
child, while the child was absent from `lock.packages`. Both direct preflight
and the fake bootstrap returned `0`:

```text
incomplete-present-optional:
direct=0 bootstrap=0 calls=5 venv=true node_modules=true
```

This is an incomplete lock graph, not an allowed absent optional edge: the
optional target itself is present and claims a required dependency that
cannot resolve.

Required correction:

1. Traverse the required dependency and required-peer closure of every
   present optional target while continuing to tolerate a genuinely absent
   optional target and absent optional peer.
2. Add present-optional regressions for missing, incompatible, nested, and
   hoisted required children.
3. Require every rejection to leave the fake log empty and create neither
   dependency-state directory.

### P1-2 — Resolution, SRI, extra-entry, and path/name validation remain fail-open

Every non-link `resolved` value is accepted when it is merely a non-empty
string (`scripts/bootstrap_preflight.mjs:524-529`). Integrity becomes
mandatory only when that string starts with the exact
`https://registry.npmjs.org/` prefix (`scripts/bootstrap_preflight.mjs:572-579`).
The SRI regex checks only a loose alphabet and accepts impossible digest
lengths (`scripts/bootstrap_preflight.mjs:530-537`).

The all-entry pass checks only name syntax
(`scripts/bootstrap_preflight.mjs:505-580`). Name consistency is deferred to
reached dependency targets
(`scripts/bootstrap_preflight.mjs:641-655`), while arbitrary unreachable
entries are accepted by design. Consequently a plain extra and an explicit
extra path/name mismatch both pass.

Five isolated lock mutations demonstrated the gaps:

```text
missing-resolution-sri:  direct=0 bootstrap=0 calls=5
escaping-file-resolution: direct=0 bootstrap=0 calls=5
short-sri-sha512-A:      direct=0 bootstrap=0 calls=5
plain-extra:             direct=0 bootstrap=0 calls=5
extra-path-name-mismatch: direct=0 bootstrap=0 calls=5
```

All five created `.venv` and `gateway/node_modules`. The escaping resolution
was `file:../../outside/zod.tgz`; no real npm command was run, so this review
does not claim an observed external read, but the supposedly physical
preflight admits the escaping metadata before mutation. Deleting both
`resolved` and `integrity` also bypasses the registry-SRI condition. Local
`ssri` 9.0.1 strict parsing rejected `sha512-A`, while the submitted parser
accepted it.

The positive unreachable-link/dev/optional/platform fixture is useful and
must remain supported. It does not justify accepting an unclassified plain
extra, an explicit path/name mismatch, an escaping local resolution, or an
unverifiable remote archive.

Required correction:

1. Validate every non-link resolution according to its generic dependency
   class; require strict SRI for remote archives, including custom registries,
   with legitimate bundled cases handled explicitly.
2. Reject local/file resolutions that are absolute or escape the physical
   checkout, and validate link/file metadata without relying on a package
   name such as `zod`.
3. Correlate explicit names with package locations/link targets and reject
   unexplained extras while preserving demonstrably valid retained
   optional/peer/dev/platform/link variants.
4. Use strict algorithm/base64/digest-length SRI validation and add the five
   zero-mutation regressions above.

### P1-3 — SemVer acceptance is neither sound nor complete

`parseSemanticVersion` accepts a build section using
`[0-9A-Za-z.-]+` but never rejects empty dot-separated build identifiers
(`scripts/bootstrap_preflight.mjs:171-200`). The range normalizer replaces
commas with spaces (`scripts/bootstrap_preflight.mjs:417-420`), admitting
syntax that node-semver rejects. Conversely, `parsePartialVersion` has no
build-metadata production at all (`scripts/bootstrap_preflight.mjs:239-286`),
so a valid exact range with build metadata is rejected. Numeric components
are converted to unbounded JavaScript `Number` values at lines 196-198,
225, and 264, which also loses integer identity beyond the safe range.

Focused probes produced:

```text
locked version 3.25.76+.: direct=0 bootstrap=0 calls=5
range >=3.0.0, <4.0.0:  direct=0
range 3.25.76+build.1:  direct=1
```

The first case created both dependency-state directories. Read-only local
node-semver 7.6.1 returned `null` for `3.25.76+.` and for the comma range,
while it normalized `3.25.76+build.1` as a valid exact range. The submitted
tests cover useful caret, tilde, comparator, hyphen, OR, and same-tuple
prerelease behavior, but they do not close these accept/reject mismatches or
numeric bounds.

Required correction:

1. Make version and range parsing conform to the supported npm SemVer
   contract, including build identifiers and safe numeric bounds.
2. Reject invalid comma syntax, empty build identifiers, oversized numeric
   components, and every malformed OR clause.
3. Add positive and negative matrices across exact/partial/comparator,
   caret, tilde, hyphen, OR, build, and same-tuple prerelease cases without
   introducing an installed-tree or global-package prerequisite.

### P1-4 — Link validation is quadratic and unbounded

`checkPackageLock` calls `dereferencePackage` independently for every link
(`scripts/bootstrap_preflight.mjs:713-723`). Each call creates a new set and
walks the remaining chain (`scripts/bootstrap_preflight.mjs:582-599`).
Thus a valid chain of `L` unreachable retained links takes quadratic work.
The closure queue additionally uses `shift()`
(`scripts/bootstrap_preflight.mjs:668-672`). There is no bound on lock bytes,
package count, path length,
dependency count, range length/token count, or link depth.

Bounded direct-preflight probes on otherwise frozen inputs measured:

```text
2,000 links    236,439 bytes   0.180 s
8,000 links    740,439 bytes   2.096 s
20,000 links 1,748,439 bytes  16.057 s
```

All three inputs returned `0`. A sub-2 MiB lock causing sixteen seconds of
single-core preflight work is a practical checkout-local denial of service,
and growth is superlinear.

Required correction:

1. Validate/dereference links once with memoized tri-color state or an
   equivalent linear-time algorithm.
2. Replace front-shifting with an indexed queue.
3. Define generous explicit supported bounds and fail closed before expensive
   traversal; cover long chains, wide graphs, deep paths, and oversized
   metadata without rejecting the reviewed real lock v3.

## Closed Trial 2 blocker and preserved Trial 1 corrections

- Root runtime and development dependencies now resolve through nested and
  hoisted locations, and required reached dependencies/peers are checked for
  compatible versions.
- Missing direct entries, incompatible direct versions, the characterized
  missing/incompatible required transitive edges, invalid entry shapes,
  malformed selected metadata, and link cycles are rejected by the submitted
  matrix.
- The checked-in real lock v3 passes direct read-only preflight.
- Trial 2's physical path checks remain in place before installation and after
  virtualenv creation. The 91-test focused inventory retains ancestor,
  target, nested-output, and installer-created symlink coverage.
- `scripts/bootstrap.sh` still derives its physical root from `BASH_SOURCE`;
  the documented root `cd` plus relative invocation remains honest.
- Bootstrap still has no `python3` call and does not invoke the Python
  lock-input script during preflight.
- The implementation contains no dependency-name-specific `zod` branch.
  It imports only Node built-ins and exposes no child-process, network, or
  filesystem-write API. No exploitable prototype-pollution mutation was found;
  own-property checks and `Map`/`Set` use avoid the common inherited-key sink.

## Verification performed

- Parentage, commit/tree identities, exact range, request-only path, technical
  allowlist, modes, Trial 2 preservation, and initial cleanliness: passed.
- Initial RED reconstruction at
  `2e9b810c82438b66b56d9d25cb049683d94405e0`, using the seven submitted
  explicit package-lock test nodes: `31 failed, 7 passed`.
- Correction RED reconstruction at
  `a4bbf6ded062151710676500c221c613017df9a3`, using the three submitted
  explicit correction nodes: `6 failed, 8 passed`.
- Current focused bootstrap inventory: `91 passed`.
- Related explicit structure inventory from the request: `114 passed`.
- Directed Ruff over the two H001 structure tests: passed.
- `node --check scripts/bootstrap_preflight.mjs` and direct read-only
  preflight against the frozen request tree: passed.
- `./scripts/requirements_lock.sh --check-inputs`: passed.
- `bash -n` over bootstrap and all three H001 fake executables: passed.
- Node JSON parsing of the manifest, lock, schema, and three hero fixtures:
  passed.
- `git diff --check` over the technical and complete request ranges: passed.
- Scoped implementation-name, owner-path, credential, network/write-surface,
  and secret scans: no shipped-surface match.
- Adversarial fake and bounded-complexity probes: failed the acceptance
  boundary as documented in P1-1 through P1-4.

## Review limits

This review did not execute the real bootstrap, real uv/npm installation,
`npm test`, aggregate suites, CI, network access, Redis, MCP, KYA, provider
CLIs, tmux, agents, or shared services. The only uv activity was the explicit
offline focused test/lint environment backed by local cache. Bootstrap
behavior was exercised only with the submitted strict fake installers.

No implementation, test, documentation, sample, schema, manifest, lock,
policy, catalog, workflow, configuration, credential, or service state was
modified. No integration, promotion, publication, or release action was
performed.

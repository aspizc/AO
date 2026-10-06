# Review Result - PROJECT_V5 H/0/01 PORTABILITY Trial 1

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 3 |
| P2 | 0 |

The narrow production change and its focused RED/GREEN behavior are correct,
but the frozen test does not mutation-bind three security predicates that the
review boundary states as acceptance requirements. Those evidence gaps can
allow the synthetic contract to remain green after its proxy, leak-detection,
or inherited-state boundary is weakened. They are therefore in-scope P1
findings rather than lifecycle non-claims.

This verdict was issued by the independently assigned reviewer trace
`tr-1cdfbb26-5e85-4e3d-ad05-1df0128a2f72`, task
`ts-ee26bc48-464c-4e0c-b1f4-de1ac9675418`, as `codex` / reviewer /
`gpt-5.6-sol` / `max` / `priority`. The operator-approved Codex assignment
supersedes the profile's standing Fable reviewer value for this review and is
not a finding. The coder request is not treated as review evidence or
self-approval.

## Immutable custody

- Worktree:
  `/home/carase/git/personal/agents-orchestrator/workspace/clones/wt-h001-portability-t1-sol-review`
- Branch before the verdict write: `review/V5-H-0-01-portability-t1-sol`.
- Tracked worktree and index before the verdict write: clean.
- Sole tolerated untracked entry: `gateway/node_modules`, a 66-byte symbolic
  link to
  `/home/carase/git/personal/agents-orchestrator/gateway/node_modules`.
- The required result path was absent from request HEAD and the worktree.

| Point | Commit | Tree | Sole parent |
|---|---|---|---|
| Base | `81bb05ec09f8d8c64027d1106e81f834d96b7742` | `013091ad72ec7386ed344758f74d053bec098a73` | `3615aeb26bf0f83a417c13b189f12ec3025579e0` |
| RED | `ea7a4c59258223a9297c655b9066042afb938d57` | `2971ffea7817e3a98b114e86e148e8776833f4e8` | `81bb05ec09f8d8c64027d1106e81f834d96b7742` |
| GREEN technical candidate | `2ce0ec115de259695254f050f5c0c4704461ae06` | `77b1a9f1ed9cb39f493a4a5a1a17a2eaa03d31f0` | `ea7a4c59258223a9297c655b9066042afb938d57` |
| Request HEAD | `d820aef57a96d19ceac88818726da362571eeeaf` | `692a2391aac9fdf285ba22ce0ee6b9cbd75cff30` | `2ce0ec115de259695254f050f5c0c4704461ae06` |

All three ancestry guards passed in order: base is an ancestor of RED, RED is
an ancestor of GREEN, and GREEN is the sole parent of request HEAD. The
technical candidate is the exact two-commit base-to-GREEN range; the request
commit changes review documentation only.

Exact parent-to-commit pathsets and resulting blobs are:

### Base parent to base

```text
M plan/PROJECT_V5/reviews/README.md
```

`plan/PROJECT_V5/reviews/README.md` is mode `100644`, blob
`92bbe6fd67f0a1b0d96f0fb2c5ae0873fc193083` at base.

### Base to RED

```text
M ci/suites.json
A tests/structure/test_h001_portability.py
```

| Path | Mode | RED blob |
|---|---:|---|
| `ci/suites.json` | `100644` | `85c696450683e1a461f404a5b4afcb250ef5373a` |
| `tests/structure/test_h001_portability.py` | `100644` | `f47b53795c244d3d9a04b100dba33aebe1a1ba56` |

### RED to GREEN

```text
M docs/doctor.md
M scripts/bootstrap.sh
M tests/fixtures/h001/fake-bin/npm
M tests/structure/test_h001_bootstrap.py
```

The complete base-to-GREEN technical pathset is exactly those four paths plus
the two RED paths. Its authenticated blobs and bytes are:

| Path | Mode | GREEN blob | SHA-256 |
|---|---:|---|---|
| `ci/suites.json` | `100644` | `85c696450683e1a461f404a5b4afcb250ef5373a` | `923d2ebdaba6d4ed6e2a8c828642a573d35295baf158e303becc3b7a8d0c9d54` |
| `docs/doctor.md` | `100644` | `04fc6177001b3da9f26da660a140908578baf821` | `ba34ab9ac7b3da06d2c80b96265a2c7bbc18df60867646f02202269251e3e9d8` |
| `scripts/bootstrap.sh` | `100755` | `565615c348158f091cb070665942650fdb839e66` | `b4235f0fc4cf21a0eb9f123af824bfe18d2eb49382ec1ab2743d20c65663c889` |
| `tests/fixtures/h001/fake-bin/npm` | `100755` | `108689c3d41c5b14458a68503b0a141f831cc54d` | `fa374d201f3e39b0379319acc1120ca50a8452e7d7e8294992d8e6e8f886e674` |
| `tests/structure/test_h001_bootstrap.py` | `100644` | `26d9ae2c71af2ce7c062719376c91e9866334f0d` | `4db91f06f181371b28ee49120a21cdcfe8e5b83cfdb63f5d2d52b991be35f91f` |
| `tests/structure/test_h001_portability.py` | `100644` | `f47b53795c244d3d9a04b100dba33aebe1a1ba56` | `e011acf7dc65e72dc5c4814a22fca37f22a2fcfc9529f8193030a5943e957e18` |

The portability-test blob and inventory blob are identical at RED, GREEN, and
request HEAD. The six-path protected-path guard passed; no policy, dependency
lock, workflow, Gateway, adapter, coordination, MCP-catalog, or release path
is present.

### GREEN to request HEAD

```text
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/H_0_1_PORTABILITY-1_to_review.md
```

| Path | Mode | Request-HEAD blob |
|---|---:|---|
| `plan/PROJECT_V5/reviews/README.md` | `100644` | `7918c208c6769198b024d11aaeb46bae474f7906` |
| `plan/reviews/PROJECT_V5/H_0_1_PORTABILITY-1_to_review.md` | `100644` | `b06287fb1221f26b141d2e250c2b8d4a8e5837ff` |

The request file is 230 lines and 9,606 bytes with SHA-256
`de9e60e25f27686d7fb776c718b37ded7b0c1fa002213f5c92a49aea0338c05d`;
its worktree bytes, Git blob, and committed bytes matched.

## Checkpoint and artifact custody

- Prior-read checkpoint:
  `/home/carase/git/personal/agents-orchestrator/workspace/.h001-portability-t1-review-read-checkpoint.md`;
  281 lines, 11,641 bytes, SHA-256
  `eef8399c88c71ecb2ac149339b391f28283a0493b34d7a0e749f451412f09b74`.
- Independent evidence checkpoint:
  `/home/carase/git/personal/agents-orchestrator/workspace/.h001-portability-t1-review-evidence.md`;
  468 lines, 24,419 bytes, SHA-256
  `75cfa7dece3e571439bfe15191a1bbd4ba3eace6525e181355dbaca51b3531c6`.
- Operator-supplied evidence artifact pointer:
  `art-c789dbd0-3e06-44ec-a1a7-7ac78fcccfd9`.

Both files were read through EOF after their hashes and counts matched. The
complete request was also read through EOF. The earlier 722-line frozen-test
and six-path diff reads were not repeated. The live Gateway returned
`NOT_FOUND` for `artifact.get` on the supplied artifact id, and
`artifact.list` returned an empty list for the reviewer trace. This unavailable
artifact lane is recorded, not converted into a candidate finding: the exact
on-disk evidence checkpoint remained independently available and authenticated
by its required SHA-256 and line count, and only that authenticated content was
used.

## Independently reproduced verification

The same fresh reviewer trace reproduced the following evidence in its bounded
evidence phase with
`/home/carase/git/personal/agents-orchestrator/.venv/bin/python`. This final
phase authenticated and adjudicated that checkpoint without rerunning the
expensive tests.

| Lane | Exact result |
|---|---|
| RED `python -m pytest -q -rs tests/structure/test_h001_portability.py` at exact RED | Exit 1; **14 passed, 1 failed** in 1.98s; 0 skipped. The sole failure was `test_archived_bootstrap_uses_the_script_disabled_portability_flow`, not collection or fixture failure. |
| GREEN `python -m pytest -q -rs tests/structure/test_h001_portability.py` at request HEAD with authenticated GREEN bytes | Exit 0; **15 passed** in 1.83s; 0 failed; 0 skipped. |
| GREEN `python -m pytest -q -rs tests/structure/test_h001_bootstrap.py` | Exit 0; **114 passed** in 9.83s; 0 failed; 0 skipped. |
| GREEN `python -m pytest -q -rs tests/structure/test_h001_sample.py` | Exit 0; **5 passed** in 0.06s; 0 failed; 0 skipped. |
| `python scripts/ci_gate.py --validate-only` | Exit 0; status `passed`, errors `[]`, counts failed=0, passed=0, skipped=0, tests=0, suites `[]`. |
| `bash -n scripts/bootstrap.sh` | Exit 0; no output. |
| `ruff check tests/structure/test_h001_portability.py tests/structure/test_h001_bootstrap.py` | Exit 0; `All checks passed!`. |
| Inventory recomputation | Exit 0; `lint.python` declared/recomputed `sha256:36a5eb68cf996cfbf46dd8e557e58429b3c9deea86b79b7ddfcf7465de1f0383` over 83 files; `test.structure` declared/recomputed `sha256:840a6fdccb0ccffdc915bb5a1732fc5798aa110fac180ff18c660af78e869b7f` over 40 files. |
| `git diff --check 81bb05ec09f8d8c64027d1106e81f834d96b7742..d820aef57a96d19ceac88818726da362571eeeaf` | Exit 0; no whitespace errors. |
| Worktree `git diff --check` | Exit 0; no whitespace errors. |

The RED semantic delta was exact: stderr contained
`PORTABILITY_INSTALL_SCRIPTS_ENABLED`; bootstrap returned 93; the lifecycle
sentinel existed; the native artifact was absent; npm argv was
`["--prefix", "gateway", "ci"]` rather than the required four arguments;
and the npm proxy route was absent. The stable native outcome remained
`NATIVE_ADDON_UNAVAILABLE`/fail. GREEN used exactly
`npm --prefix gateway ci --ignore-scripts` and the strict checked-in fake,
source assertion, order assertion, and call-log expectation reject missing,
extra, reordered, or substituted arguments.

The reproduced happy and negative paths also showed direct and unallowlisted
synthetic egress rejection; pre-npm rejection for the exercised inherited
home, uv/npm cache, NPM token, and `gateway/node_modules` cases; canary scans
over stdout, stderr, named logs, and named JSON; and actual Node rejection of
an artifact-shaped but unloadable native file. That last case correctly
forbids false `DEPENDENCIES_READY` reporting.

## Findings

### P1-1 - The loopback proxy source allowlist is not mutation-bound

The fake proxy checks scheme, the exact `127.0.0.1` host, absence of username
and password, and exact path, but the frozen suite has no distinguishing
negative case for any of those conjuncts. The direct and unallowlisted
destination tests do not kill deletion of a source-URL conjunct. Consequently
the suite can remain green after weakening the explicitly required
loopback-proxy-bypass boundary.

Required correction: add minimal negative parametrizations for scheme, host,
username, password, and path, each proving a nonzero bypass/egress rejection,
no install materialization, and no canary leak. Demonstrate that deleting each
corresponding predicate turns at least one test red.

### P1-2 - The no-leak oracle does not bind every required canary and surface

Only the secret canary is independently injected across each named output
surface. Username, credential-bearing URL, owner/reviewer home paths, and repo
path are scanned on happy paths but are not independently leaked, so removing
one of those values from the detector can survive. In addition, no distinct
raw-config surface or in-memory/rendered exception-chain case is exercised;
captured stderr is only an indirect proxy. This fails the explicit synthetic
security criterion covering those values and surfaces.

Required correction: add distinguishing leak mutants for every protected
value category and explicit raw-config and exception-chain surfaces, asserting
`PORTABILITY_CANARY_LEAK`. A minimal matrix is acceptable, but every detector
predicate must be killed by at least one emitted-output test. Recursive scans
of arbitrary unrelated generated files are not required by this trial.

### P1-3 - Several explicit inherited-state guards are not mutation-bound

The frozen 15-case suite proves HOME, uv cache, npm cache, NPM token, and
pre-existing `gateway/node_modules`, but it does not independently exercise
`XDG_CACHE_HOME`, `AWS_ACCESS_KEY_ID`, `GOOGLE_APPLICATION_CREDENTIALS`,
`UV_CREDENTIALS`, or a pre-existing `.venv`. Deleting one of those guard
conjuncts can therefore survive while the review boundary explicitly requires
isolated XDG state, rejection of inherited credentials/install state, and no
pre-existing `.venv` supplying success.

Required correction: add focused inherited-state cases for each unbound
variable/install path and assert the specific rejection event occurs before
npm, with no install materialization and no canary leak. Demonstrate that each
guard deletion turns a test red.

## Mutation-strength adjudication

1. Real npm/registry lifecycle behavior is an **accepted limitation**, not a
   finding. The missing-`--ignore-scripts` mutation is strongly killed inside
   the claimed synthetic boundary; real-network npm is expressly unclaimed.
2. Missing negative mutations for proxy scheme/host/credentials/path are the
   in-scope **P1-1** finding because loopback-proxy-bypass rejection is an
   explicit security criterion.
3. Non-secret canaries not independently injected across surfaces are part of
   in-scope **P1-2** because no credential or personal path escape is an
   explicit criterion.
4. The absent distinct raw-config and exception-chain cases are also part of
   **P1-2**. The lack of recursive scanning for arbitrary generated files is
   an accepted limitation because this trial claims only the named logs and
   JSON outputs.
5. Missing XDG, additional credential-variable, and `.venv` mutants are the
   in-scope **P1-3** finding because those isolation and inherited-state guards
   are explicitly in the acceptance boundary.
6. No real `better-sqlite3` build/run is an **accepted limitation**, not a
   finding. Actual Node load rejection correctly proves fail-closed handling
   of an intentionally invalid artifact; runnable native proof belongs to
   I/0/04.

## Failures, unavailable lanes, and limitations

- The only reproduced test failure was the required semantic RED. GREEN had
  no failures or skips.
- Some managed-login-shell commands emitted `Failed to create stream fd:
  Operation not permitted` three times before normal output. Exit statuses and
  counters were unaffected; later non-login read commands did not emit it. It
  is recorded as an external diagnostic, not candidate behavior.
- The supplied Gateway artifact id was unavailable as described above. The
  authenticated on-disk evidence file was available and used.
- Aggregate `bash scripts/ci.sh` was deliberately not run in this review and
  is not implied by the focused lanes.
- No real network or cold-cache registry, real provider, Redis, MCP, public
  egress, cross-platform, native source build, compiler/toolchain/header,
  runnable `better-sqlite3`, or in-memory SQLite lane was run or claimed.
- The synthetic checks prove only the reviewed script-disabled lock-graph
  boundary. They do not prove production-network behavior or release
  confidence.

## Lifecycle disposition and non-claims

This KO rejects Trial 1 as reviewed-OK until the three findings are corrected
in a new immutable trial. It does not invalidate the independently observed
narrow behavior: npm lifecycle scripts are disabled, the exact lock-graph argv
is enforced, and unloadable native state fails closed.

This verdict does **not** claim completion of all H/0/01 work, aggregate CI,
integration into `main`, promotion, release, support, publication, tag
creation, or push. It does not change the sheet status, policy, dependency
lock, workflow, release authority, or review index. In particular, aggregate
CI and integration are not implied by this review result.

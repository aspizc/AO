# Review Submission - Project V5 H/0/01 PROBES (Trial 2)

## Requested reviewer and verdict

Please assign a fresh independent Claude Fable 5 reviewer at maximum reasoning
that did not implement either trial and has not inherited coder context. Review
the frozen corrected candidate and write the verdict only to:

```text
plan/reviews/PROJECT_V5/H_0_1_PROBES-2_result.md
```

The verdict must be exactly `reviewed_OK` or `reviewed_KO`, identify the exact
reviewed request and candidate commit/tree/pathset, and list every P0/P1/P2
finding. The result commit must change only that result file. The orchestrator
owns the review-index row and any plan/status reconciliation separately.

This submission is a review request, not a self-review or an OK claim. Trial 1
was independently `reviewed_KO` for its disclosed Ruff format-check failure,
but that blocker-first review expressly did not inspect the production
implementation or adjudicate the provider, coordination, authority,
composition, schema, leakage, or adversarial evidence. Trial 2 requests that
full library/bridge adjudication after the exact one-file correction.

## Review boundary

This review covers only the H/0/01 PROBES library/bridge slice:

- the six new checks, after the six independently accepted Doctor core checks,
  in the exact order `claude-login`, `codex-login`, `coordination`,
  `coordination-scope`, `isolation`, `state-ownership`;
- the fixed, shell-free provider probe factories and their closed mappings;
- the directly owned, narrow Gateway coordination-status bridge;
- the Python mapping of one detached coordination snapshot into two checks;
- the fail-closed future D-owned authority seam for isolation and state
  ownership;
- the exact six-binding composition factory;
- the twelve-check closed Doctor registry, schema, remediation documentation,
  deterministic rendering, and failure/exit semantics; and
- the focused fake-only and adversarial tests in the frozen technical pathset.

The implementation is complete only for this library/bridge boundary and is
pending independent review. It does not complete H/0/01.

## Frozen lineage and identities

The following identities were recomputed from the local repository:

```text
technical base commit       9f075e181ef257b4b5b4b4cac3c0870af97110ec
technical base tree         1c7019a856950e2cabe3c4267454fb02c9b882e2

Trial 1 technical candidate a2c0e2dd44c38e44eccd4e859b80feb2fae26104
Trial 1 candidate tree       49916f2cea845b036909a755cad67cba7a8e49b4
Trial 1 request commit       86240addb01ae03d56e9e0202aa9e1ac25f2e54e
Trial 1 request tree         2d976cb605e2c04005c289608e7582f22556c614
Trial 1 KO/result commit     d52318b35a3800740657d5b63d853915338c034d
Trial 1 KO/result tree       cc81d1261ab7ab75a6831fc5f3ee410ad1d94904

Trial 2 correction base      d52318b35a3800740657d5b63d853915338c034d
Trial 2 correction commit    4b151e7552a8e0c39ce0d3b8e5d04e1240a0406e
Trial 2 corrected candidate  4b151e7552a8e0c39ce0d3b8e5d04e1240a0406e
Trial 2 candidate tree       f8d23fcf67f9fcae54c6decab46fbb930c92c9ba
correction range             d52318b35a3800740657d5b63d853915338c034d..4b151e7552a8e0c39ce0d3b8e5d04e1240a0406e
full candidate range         9f075e181ef257b4b5b4b4cac3c0870af97110ec..4b151e7552a8e0c39ce0d3b8e5d04e1240a0406e
branch                       feat/V5-H-0-01-probes
```

The Trial 2 correction commit has the Trial 1 KO/result commit as its direct
parent. The Trial 1 request commit has the technical candidate as its direct
parent, and the Trial 1 KO/result commit has the Trial 1 request as its direct
parent. All named commits are on one linear ancestry.

### Immutable Trial 1 artifacts

```text
2805742e04eb215ef7ca3ff270265312aff83458  plan/reviews/PROJECT_V5/H_0_1_PROBES-1_to_review.md
SHA-256 476f90a93c58cb1573b2f77e56aa2c814edf6cae5dc351b1eb4eb25250ff9f60

ec12c11e14b4c4c496cc7a5745c11e468662d78b  plan/reviews/PROJECT_V5/H_0_1_PROBES-1_result.md
SHA-256 e17128945f382143351d7b6cdccb76e0df8ee2a0672ed1c31872159b17e0c54a
```

Their blobs at the Trial 1 KO commit and the corrected candidate are
identical. Trial 1 remains immutable and `reviewed_KO` with P0=0, P1=0, P2=1.

### Trial 2 request-envelope contract

This request must be committed directly on candidate
`4b151e7552a8e0c39ce0d3b8e5d04e1240a0406e` with subject:

```text
docs(review): request H/0/01 PROBES Trial 2 review
```

Its commit delta must add exactly this path:

```text
plan/reviews/PROJECT_V5/H_0_1_PROBES-2_to_review.md
```

The containing request commit/tree/blob cannot be embedded in its own
content-addressed file without changing those identities. The reviewer must
therefore authenticate the containing request commit, tree, parent, subject,
single-path delta, file blob, and file SHA-256 from the committed envelope and
record them in the result.

## Exact correction and semantic-equivalence proof

The correction range changes exactly one path:

```text
M tests/cli/test_doctor_probe_composition.py
1 insertion(+), 2 deletions(-)
```

Ruff made exactly this line reflow and no other change:

```diff
 def projected_status_codes(projection):
     return [
-        (check["id"], check["status"], check["code"])
-        for check in projection["checks"]
+        (check["id"], check["status"], check["code"]) for check in projection["checks"]
     ]
```

Pre/post identities:

```text
Trial 1 composition blob     873579557e50353179d33d3c6404ae6f5ace7750
Trial 1 file SHA-256         30b2ce036191227175e3777272e0239c7cfd415b5f4d7ba7dee97cf504fcb0a2
Trial 2 composition blob     6a311a8149ef6dc6efeb5cf28a7e7ca26c66acfb
Trial 2 file SHA-256         00f6d9810c46f305632c6c126404c3eff603020307605acfb5990944a02a5151
pre-format AST SHA-256       9f220d8a4ff8f79d8859bdf9559d1db9c35e9aab0c2a1559e1ee0e00b53961ac
post-format AST SHA-256      9f220d8a4ff8f79d8859bdf9559d1db9c35e9aab0c2a1559e1ee0e00b53961ac
```

The AST digest is the SHA-256 of `ast.dump(ast.parse(source),
annotate_fields=True, include_attributes=False)`. Its equality proves that the
formatter changed layout only. No production code, schema, documentation,
other test, plan sheet/index, policy, dependency, lock, or existing review
artifact changed in the correction commit.

## Frozen corrected candidate pathsets

### Technical library/bridge pathset

Relative to technical base `9f075e1`, the corrected technical content is
exactly these eleven paths and net counts:

```text
M cli/src/agents_cli/doctor.py                    +250 / -2
A cli/src/agents_cli/doctor_probes.py             +453 / -0
M docs/doctor.md                                  +110 / -7
M gateway/src/coordination.js                     +221 / -0
M schemas/doctor-result-v1.schema.json            +544 / -2
M tests/cli/test_doctor.py                        +27  / -17
A tests/cli/test_doctor_authority_probes.py       +571 / -0
A tests/cli/test_doctor_coordination_probes.py    +456 / -0
A tests/cli/test_doctor_probe_composition.py      +188 / -0
A tests/cli/test_doctor_provider_probes.py        +499 / -0
A tests/gateway/doctor_coordination_probe.test.js +457 / -0
TOTAL: 11 files changed, 3776 insertions(+), 28 deletions(-)
```

The one-line decrease from Trial 1's `3777/28` is solely Ruff joining the
two-line comprehension. The other ten technical blobs are unchanged from the
Trial 1 technical candidate.

### Full candidate-tree range

The full `9f075e1..4b151e7` range contains the eleven technical paths plus the
two immutable Trial 1 review artifacts, for exactly thirteen paths and
`4532 insertions(+), 28 deletions(-)`:

```text
M cli/src/agents_cli/doctor.py
A cli/src/agents_cli/doctor_probes.py
M docs/doctor.md
M gateway/src/coordination.js
A plan/reviews/PROJECT_V5/H_0_1_PROBES-1_result.md
A plan/reviews/PROJECT_V5/H_0_1_PROBES-1_to_review.md
M schemas/doctor-result-v1.schema.json
M tests/cli/test_doctor.py
A tests/cli/test_doctor_authority_probes.py
A tests/cli/test_doctor_coordination_probes.py
A tests/cli/test_doctor_probe_composition.py
A tests/cli/test_doctor_provider_probes.py
A tests/gateway/doctor_coordination_probe.test.js
```

### Corrected candidate blobs and SHA-256s

```text
aec7f9057f7ae414c3d3103dff4b7408f9c7ff28  cli/src/agents_cli/doctor.py
SHA-256 af47f2e4cca51b235eb472aa9922fae8f624d6c94dcb342c5f66e8b5b60b5190

7c1271dd86db52fb743343e963aeaa287e6c868e  cli/src/agents_cli/doctor_probes.py
SHA-256 6a9fa3a3b09d84d7c1283eeb3eec5076cccf0ac372d7c132a553f7d9119d6f2f

552de94cd1df3fae052d0dcdd6a698b210835648  docs/doctor.md
SHA-256 82782954e856eb4446494fb6b85924297faee54af1f37474f5feeb1f87745207

f70c158c90adcef1020b800d7cbaccd0760b386c  gateway/src/coordination.js
SHA-256 7bdf4d684cd426c440e1db8a1729cff59b8cae4a5793efe03b171f70fc8eb0cc

20f611fa67e54b70ec25111a293a6463d9ba7265  schemas/doctor-result-v1.schema.json
SHA-256 98161f1a3b4a96fb5bbad1fc55869b8e5eaceba6108bf07e632b125ea288b4bb

6239287946e6c72fac6c26da5caeacb845a3dfcf  tests/cli/test_doctor.py
SHA-256 c62d9b5dc680b8fed67b89e7928abee347de4953d0bef3417f8e8e6664487ddf

eedadbaa6df1fb205feb79ea7e67532979119dfa  tests/cli/test_doctor_authority_probes.py
SHA-256 5f3647dca3f573a967ceecb5759e303d2b2e20695b6f8d32f5a6ccd1159de1ea

ed75ca10febd614cfac99c7e902b26c0ad08787c  tests/cli/test_doctor_coordination_probes.py
SHA-256 8b3d98bab2e19f3ccac4683d3fabaeda81d3f17593daa30e8ba25700cd53c501

6a311a8149ef6dc6efeb5cf28a7e7ca26c66acfb  tests/cli/test_doctor_probe_composition.py
SHA-256 00f6d9810c46f305632c6c126404c3eff603020307605acfb5990944a02a5151

205e82f1ba9ca8df566c820f85b1f9fe836128ce  tests/cli/test_doctor_provider_probes.py
SHA-256 c4a2e0ad995880ad005f89caf3cc7b14521e1a4d8be234488bb80e83d551244d

f8d87ca08d563e1e04c131bff184659cef7eab87  tests/gateway/doctor_coordination_probe.test.js
SHA-256 b9e91b559554bf2b25361ff038c358f2d7642b854e4cb75c09e8214db216eadb
```

## Quality RED/GREEN chronology

### Authenticated Trial 1 quality RED

The Trial 1 result independently reproduced this exact gate with Ruff 0.15.22,
and the coder reproduced it again at the committed Trial 1 KO before editing:

```text
cli/.venv/bin/ruff format --check --no-cache \
  cli/src/agents_cli/doctor.py cli/src/agents_cli/doctor_probes.py \
  tests/cli/test_doctor.py tests/cli/test_doctor_provider_probes.py \
  tests/cli/test_doctor_coordination_probes.py \
  tests/cli/test_doctor_authority_probes.py \
  tests/cli/test_doctor_probe_composition.py

Would reformat: tests/cli/test_doctor_probe_composition.py
1 file would be reformatted, 6 files already formatted
exit=1
```

`ruff format --diff` reported only the comprehension reflow shown above.

### Minimum Trial 2 correction and GREEN

The only mutation command was:

```text
cli/.venv/bin/ruff format --no-cache \
  tests/cli/test_doctor_probe_composition.py

1 file reformatted
```

The pre-commit seven-path gates then produced:

```text
cli/.venv/bin/ruff check --no-cache <seven PROBES Python paths>
All checks passed!
exit=0

cli/.venv/bin/ruff format --check --no-cache <seven PROBES Python paths>
7 files already formatted
exit=0
```

The exact one-path correction was committed as:

```text
4b151e7552a8e0c39ce0d3b8e5d04e1240a0406e
tree f8d23fcf67f9fcae54c6decab46fbb930c92c9ba
style(doctor): format probe composition test (V5 H/0/01 PROBES Trial 2)
```

All verification below was rerun from that committed candidate without
editing it.

## Corrected-candidate verification

Tool identities:

```text
Python 3.11.15 (CLI pytest environment)
pytest 9.1.1
Python 3.13.13 (in-memory production compile)
Ruff 0.15.22
Node v22.22.1
ESLint 10.4.1
```

### Five-file combined Python Doctor/probe inventory

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  cli/.venv/bin/pytest -q -p no:cacheprovider \
  tests/cli/test_doctor.py \
  tests/cli/test_doctor_provider_probes.py \
  tests/cli/test_doctor_coordination_probes.py \
  tests/cli/test_doctor_authority_probes.py \
  tests/cli/test_doctor_probe_composition.py
```

Result: `380 passed in 91.80s`; `0 failed`, `0 skipped`.

### Exact Node gates

```text
node --test tests/gateway/doctor_coordination_probe.test.js
```

Result: `10 passed`, `0 failed`, `0 cancelled`, `0 skipped`, `0 todo`.

```text
node --test tests/gateway/schemas.test.js
```

Result: `34 passed`, `0 failed`, `0 cancelled`, `0 skipped`, `0 todo`.

### Ruff lint and format

The following seven paths were checked together:

```text
cli/src/agents_cli/doctor.py
cli/src/agents_cli/doctor_probes.py
tests/cli/test_doctor.py
tests/cli/test_doctor_provider_probes.py
tests/cli/test_doctor_coordination_probes.py
tests/cli/test_doctor_authority_probes.py
tests/cli/test_doctor_probe_composition.py
```

```text
cli/.venv/bin/ruff check --no-cache <seven paths>
All checks passed!
exit=0

cli/.venv/bin/ruff format --check --no-cache <seven paths>
7 files already formatted
exit=0
```

### Compile, syntax, and ESLint

An in-memory Python 3.13.13 `compile(..., mode="exec")` check passed for both
production modules:

```text
cli/src/agents_cli/doctor.py
cli/src/agents_cli/doctor_probes.py
compiled 2 production modules
exit=0
```

Both Node syntax checks exited `0` with no output:

```text
node --check gateway/src/coordination.js
node --check tests/gateway/doctor_coordination_probe.test.js
```

The candidate's preserved `gateway/node_modules` symlink points to the main
production-only dependency tree, which has no ESLint 10 executable or
`@eslint/js`. The check therefore reused the already installed ESLint 10.4.1
executable and config from the `v3-work` worktree. `cmp` proved that config
byte-identical to the candidate config; both have SHA-256:

```text
31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252
```

The ESLint 10.4.1 two-file check exited `0` with no output for:

```text
gateway/src/coordination.js
tests/gateway/doctor_coordination_probe.test.js
```

### Git and scope/path integrity

All of the following exited `0`:

- `git diff --check 9f075e1..4b151e7`;
- `git diff --check d52318b..4b151e7`;
- current tracked and cached `git diff --check`;
- the exact correction-path assertion that `d52318b..4b151e7` contains only
  `tests/cli/test_doctor_probe_composition.py`;
- Trial 1 request/result blob equality between the KO commit and corrected
  candidate; and
- branch, parent/tree, technical/full pathset, and net-stat authentication.

The index and tracked worktree were clean after all candidate gates. The only
status entry was the pre-existing untracked `gateway/node_modules` symlink,
still targeting:

```text
/home/carase/git/personal/agents-orchestrator/gateway/node_modules
```

No dependency, lock, policy, workflow, plan sheet/index, existing review
artifact, or unrelated path is part of the correction range.

## Requested full technical adjudication

Please inspect the production code independently of the test assertions and
decide whether every item below holds. Trial 1 did not decide these questions.

### Provider probes

- Each available provider uses one fixed version argv and one fixed login
  argv, passed as tuples to an injected runner with a `5.0` second bound.
- No shell command, ambient argv, automatic login, provider output, exception
  text, configuration value, or runner-return object enters a Doctor result.
- Registry-only providers execute zero commands and produce the static
  not-required observation.
- Unknown, malformed, missing, failed, and timed-out results fail closed to the
  allowlisted static observations; `BaseException` propagation remains intact.

### Coordination probes

- One pure injected projection contains only the coordination URL, prefix,
  canonical scope, and shutdown timeout.
- Exactly one directly owned `createCoordination`-style instance is created,
  exactly one `status({})` result is shared by both checks, and exactly one
  no-argument `close()` is attempted on that owned instance.
- Exact canonical-scope equality is authoritative. No separate TCP probe,
  truthy/heuristic comparison, managed orchestrator client, or general
  `loadConfig()` path is used.
- The bridge never registers, discovers, sends, receives, ACKs, heartbeats,
  restarts, signals, or uses another domain operation.
- URL, prefix, scope, configuration, error, path, credential, argv, and raw
  status values cannot enter the detached snapshot, DTOs, renderers, or audit
  material. Invalid input, status, instance, factory, and close behavior fail
  closed to static codes.

### Authority probes

- The absent-capability production path is visibly non-green with exact codes
  `ISOLATION_UNAVAILABLE` and `STATE_OWNERSHIP_UNVERIFIABLE`.
- A supplied future D-owned capability is lazy, runs once, and is shared by
  both bindings. Only the module's exact `IsolationStatus` and
  `StateOwnershipStatus` pair is admitted.
- Booleans, strings, mappings, foreign enums, subclasses, host permissions,
  UID/GID, paths, PIDs, files, locks, environment, caller assertions, and
  hostile/opaque objects cannot synthesize PASS.
- Ordinary exceptions map both checks to their static probe-error codes,
  caller-owned values are detached, and `BaseException` propagates unchanged.
- This seam does not claim that D/0/02 isolation or D/0/03 state ownership is
  implemented.

### Composition, schema, documentation, and leakage

- `create_doctor_probe_bindings` has the exact keyword-only composition
  contract, returns exactly the six bindings in canonical order, and invokes
  neither the provider runner nor authority capability during construction.
- Provider execution remains one version plus one login command per available
  provider, authority remains one-shot, and the coordination input is an
  already-detached snapshot.
- The twelve ordered schema entries, closed result codes, summaries,
  remediation anchors, documentation, and lazy capabilities agree exactly.
- No test contacts a live provider, network service, Redis instance, MCP
  endpoint, shared agent, or D-owned implementation, and no raw canary leaks
  into public projections or rendering.

### Adversarial coverage to authenticate

- Provider fakes cover exact command count/order, registry-only zero-command
  behavior, absence, failure, timeout, stale login, unknown return objects,
  malformed projections, hostile values, ordinary exceptions,
  `BaseException`, and output/config/path/token/argv canaries.
- Coordination fakes enforce the exact `factory -> status({}) -> close()`
  lifecycle and throw on forbidden operations. Cases cover matching/wrong
  scope, unsafe/missing/hostile scope, disabled/unreachable/anomalous status,
  status throw, close failure, invalid projection/factory/instance/status,
  mutation after capture, raw-value canaries, and `BaseException` behavior.
- The Gateway real-factory compatibility control uses only an in-memory fake
  queue and proves one ping, one close, no network, and no domain/audit work.
- Authority cases cover absent, ready/owned, unavailable, foreign second
  writer, stale, opaque, malformed and hostile values, foreign
  enums/subclasses, booleans/mappings, lazy one-shot sharing, mutation,
  ordinary exceptions, `BaseException`, and public-output canaries.
- Composition proves construction-time laziness, exact six-binding order,
  exact provider calls, one authority call, twelve schema-valid checks, green
  injected authority, and visibly non-green absent authority.
- Core inventory tests retain closed issuance, snapshot-before-callback,
  deterministic projection/rendering, remediation detachment, schema closure,
  and exact result/exit semantics.

## Explicit limitations and work not claimed

- No Typer command wiring or CLI entry-point integration is implemented.
- No core filesystem/runtime probes beyond the independently accepted Doctor
  base are added here.
- Real D/0/02 isolation PASS and D/0/03 state-owner PASS do not exist in this
  slice. Only the exact future injected shapes are testable; the production
  default remains non-green.
- Portability, native dependency proof, full H/0/01 integration/exit,
  promotion, publication, tagging, and release are out of scope.
- No network, live provider command, Redis instance, MCP endpoint, KYA flow,
  tmux session, agent process, or shared service was used by these tests.
- The fresh combined behavioral inventory ran on Python 3.11.15. Python
  3.13.13 compiled the production modules but was not a second full test
  matrix in this handoff.
- `scripts/ci.sh` was deliberately not run. The disposable lock-graph
  materialization was also not run. Both remain integrator-owned and must run
  against the independently reviewed combined tree.
- Trial 1 authenticated only the blocking Ruff failure. Its absence of other
  findings was explicitly not a certification, which is why this request
  requires a fresh full review rather than treating the correction as an
  automatic OK.

## Reviewer checklist

1. Authenticate the request envelope, Trial 1 KO/result, correction commit,
   corrected candidate tree, exact ancestry, blobs/SHA-256s, and all pathsets.
2. Confirm the correction is only Ruff's semantic-neutral line reflow and that
   the Trial 1 request/result artifacts are unchanged.
3. Review the provider, coordination, authority, composition, schema,
   documentation, leakage, and adversarial behavior in production code and
   tests; do not rely on Trial 1's partial adjudication.
4. Re-run or independently inspect the exact corrected-candidate gates and
   their pass/fail/skip totals.
5. Enforce the library/bridge-only boundary, visibly absent D-owned live
   authority, and the listed non-claims.
6. Write only `plan/reviews/PROJECT_V5/H_0_1_PROBES-2_result.md`, use exactly
   `reviewed_OK` or `reviewed_KO`, list all P0/P1/P2 findings, and commit only
   that result path. Do not update the review index or plan status.

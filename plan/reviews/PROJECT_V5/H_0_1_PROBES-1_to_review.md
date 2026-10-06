# Review Submission - Project V5 H/0/01 PROBES (Trial 1)

## Requested reviewer and verdict

Please assign an independent reviewer that did not implement this trial. Review
the frozen technical candidate and write the verdict only to:

```text
plan/reviews/PROJECT_V5/H_0_1_PROBES-1_result.md
```

The result must use `reviewed_OK` or `reviewed_KO`, identify the exact reviewed
candidate and pathset, and list every P0/P1/P2 finding. The result commit must
change only that result file. The orchestrator owns any later review-index or
plan-status update in a separate commit.

This submission is a review request, not a self-review or an OK claim. In
particular, the fresh Ruff format gate has one disclosed non-green result in an
immutable RED test; the independent reviewer must adjudicate it rather than
assuming that every gate is green.

Registered orchestration identity:

```text
trace tr-tr-v5-h001-probes-t1-ac2a9b67-2f01-4f25-b71d-0117a6ee11f3
handoff task ts-028f0e90-1a1b-4f4b-bca3-337914b454c5
branch feat/V5-H-0-01-probes
```

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
- the focused fake-only and adversarial tests in the frozen pathset.

The implementation is complete only for this library/bridge boundary and is
pending independent review. It does not complete H/0/01.

## Requested technical adjudication

Please inspect the production code, not only the tests, and decide whether all
of the following hold.

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

### Composition, schema, docs, and leakage

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

## Frozen candidate identity

```text
base commit     9f075e181ef257b4b5b4b4cac3c0870af97110ec
base tree       1c7019a856950e2cabe3c4267454fb02c9b882e2
candidate       a2c0e2dd44c38e44eccd4e859b80feb2fae26104
candidate tree  49916f2cea845b036909a755cad67cba7a8e49b4
technical range 9f075e181ef257b4b5b4b4cac3c0870af97110ec..a2c0e2dd44c38e44eccd4e859b80feb2fae26104
```

The base is an ancestor of the candidate. The range is exactly the nine linear
commits listed below; there are no intervening commits.

Candidate blobs:

```text
aec7f9057f7ae414c3d3103dff4b7408f9c7ff28  cli/src/agents_cli/doctor.py
7c1271dd86db52fb743343e963aeaa287e6c868e  cli/src/agents_cli/doctor_probes.py
552de94cd1df3fae052d0dcdd6a698b210835648  docs/doctor.md
f70c158c90adcef1020b800d7cbaccd0760b386c  gateway/src/coordination.js
20f611fa67e54b70ec25111a293a6463d9ba7265  schemas/doctor-result-v1.schema.json
6239287946e6c72fac6c26da5caeacb845a3dfcf  tests/cli/test_doctor.py
eedadbaa6df1fb205feb79ea7e67532979119dfa  tests/cli/test_doctor_authority_probes.py
ed75ca10febd614cfac99c7e902b26c0ad08787c  tests/cli/test_doctor_coordination_probes.py
873579557e50353179d33d3c6404ae6f5ace7750  tests/cli/test_doctor_probe_composition.py
205e82f1ba9ca8df566c820f85b1f9fe836128ce  tests/cli/test_doctor_provider_probes.py
f8d87ca08d563e1e04c131bff184659cef7eab87  tests/gateway/doctor_coordination_probe.test.js
```

## Net technical pathset and stat

```text
M cli/src/agents_cli/doctor.py
A cli/src/agents_cli/doctor_probes.py
M docs/doctor.md
M gateway/src/coordination.js
M schemas/doctor-result-v1.schema.json
M tests/cli/test_doctor.py
A tests/cli/test_doctor_authority_probes.py
A tests/cli/test_doctor_coordination_probes.py
A tests/cli/test_doctor_probe_composition.py
A tests/cli/test_doctor_provider_probes.py
A tests/gateway/doctor_coordination_probe.test.js
```

```text
cli/src/agents_cli/doctor.py                    +250 / -2
cli/src/agents_cli/doctor_probes.py             +453 / -0
docs/doctor.md                                  +110 / -7
gateway/src/coordination.js                     +221 / -0
schemas/doctor-result-v1.schema.json            +544 / -2
tests/cli/test_doctor.py                        +27  / -17
tests/cli/test_doctor_authority_probes.py       +571 / -0
tests/cli/test_doctor_coordination_probes.py    +456 / -0
tests/cli/test_doctor_probe_composition.py      +189 / -0
tests/cli/test_doctor_provider_probes.py        +499 / -0
tests/gateway/doctor_coordination_probe.test.js +457 / -0
TOTAL: 11 files changed, 3777 insertions(+), 28 deletions(-)
```

The per-file `+/-` display above is the net candidate diff. The exact Git stat
is authoritative; its totals are `3777/28`.

## Exact nine-commit ledger

1. Provider RED:

   ```text
   34f211d8ab7a1537d6137731aa4ccc6de007de3c
   parent 9f075e181ef257b4b5b4b4cac3c0870af97110ec
   tree d5865c309f76a97ef6e59d2afbf21e9a66ee4b08
   test(doctor): specify provider login probes (V5 H/0/01 PROBES Trial 1)
   tests/cli/test_doctor.py                 +8/-7
   tests/cli/test_doctor_provider_probes.py +467/-0
   2 files changed, 475 insertions(+), 7 deletions(-)
   ```

2. Provider GREEN:

   ```text
   747cd1f76ca9fc5e32d23718a094ce24e32b09f0
   parent 34f211d8ab7a1537d6137731aa4ccc6de007de3c
   tree bf00a4b144b8e6643cc61f874412d675d43d6a6b
   feat(doctor): add provider login probes (V5 H/0/01 PROBES Trial 1 GREEN)
   cli/src/agents_cli/doctor.py        +112/-2
   cli/src/agents_cli/doctor_probes.py +230/-0
   docs/doctor.md                      +32/-6
   schemas/doctor-result-v1.schema.json +221/-2
   4 files changed, 595 insertions(+), 10 deletions(-)
   ```

3. Coordination RED:

   ```text
   6f3b16bea1db6561ffd3bef87691009e1764f97f
   parent 747cd1f76ca9fc5e32d23718a094ce24e32b09f0
   tree 4d7792747140ccdbc42a7b5f6da025f8f77d2ee8
   test(doctor): specify coordination status probes (V5 H/0/01 PROBES Trial 1 RED)
   tests/cli/test_doctor.py                         +5/-1
   tests/cli/test_doctor_coordination_probes.py     +419/-0
   tests/cli/test_doctor_provider_probes.py         +34/-5
   tests/gateway/doctor_coordination_probe.test.js  +385/-0
   4 files changed, 843 insertions(+), 6 deletions(-)
   ```

4. Coordination GREEN:

   ```text
   632218a575a56db5c3b7d803b601c0486756c2a7
   parent 6f3b16bea1db6561ffd3bef87691009e1764f97f
   tree ba121c1b93919052c0fe05be6c71d27d77e9d8ae
   feat(doctor): add coordination status probes (V5 H/0/01 PROBES Trial 1 GREEN)
   cli/src/agents_cli/doctor.py         +65/-1
   cli/src/agents_cli/doctor_probes.py  +84/-1
   docs/doctor.md                       +37/-8
   gateway/src/coordination.js          +221/-0
   schemas/doctor-result-v1.schema.json +143/-2
   5 files changed, 550 insertions(+), 12 deletions(-)
   ```

5. Authority RED:

   ```text
   d02bf4ec3423b4876c91f89b39a473d47d005db5
   parent 632218a575a56db5c3b7d803b601c0486756c2a7
   tree 197a868ad958d1557d97e1536b4fd4facfde3918
   test(doctor): specify authority probes (V5 H/0/01 PROBES Trial 1 RED)
   tests/cli/test_doctor.py                     +15/-10
   tests/cli/test_doctor_authority_probes.py    +571/-0
   tests/cli/test_doctor_coordination_probes.py +53/-16
   tests/cli/test_doctor_provider_probes.py     +7/-4
   4 files changed, 646 insertions(+), 30 deletions(-)
   ```

6. Corrected authority RED:

   ```text
   3d9df4308545b3be7219e20b4058d5948864367a
   parent d02bf4ec3423b4876c91f89b39a473d47d005db5
   tree baa4126da92e9fc5e141261dd13655cfeac8ccd3
   test(doctor): correct authority outcome inventory (V5 H/0/01 PROBES Trial 1 RED)
   tests/cli/test_doctor.py +1/-1
   1 file changed, 1 insertion(+), 1 deletion(-)
   ```

7. Authority GREEN:

   ```text
   85c8115e257bd2557d2186c9dba3e732b2598e10
   parent 3d9df4308545b3be7219e20b4058d5948864367a
   tree 6e2fdce3efb8b95cbc4bf4daf9d8c8ded32cbd90
   feat(doctor): add authority status probes (V5 H/0/01 PROBES Trial 1 GREEN)
   cli/src/agents_cli/doctor.py         +74/-0
   cli/src/agents_cli/doctor_probes.py  +125/-1
   docs/doctor.md                       +55/-7
   schemas/doctor-result-v1.schema.json +184/-2
   4 files changed, 438 insertions(+), 10 deletions(-)
   ```

8. Composition RED:

   ```text
   af8e0c94065cd60e02cef17ecbfb02e0c14bc57a
   parent 85c8115e257bd2557d2186c9dba3e732b2598e10
   tree 16a8ee4400dd89feb2e2f8643bd2ed092e4fa352
   test(doctor): specify six-probe composition (V5 H/0/01 PROBES Trial 1 RED)
   tests/cli/test_doctor_probe_composition.py      +189/-0
   tests/gateway/doctor_coordination_probe.test.js +72/-0
   2 files changed, 261 insertions(+)
   ```

9. Composition GREEN / technical candidate:

   ```text
   a2c0e2dd44c38e44eccd4e859b80feb2fae26104
   parent af8e0c94065cd60e02cef17ecbfb02e0c14bc57a
   tree 49916f2cea845b036909a755cad67cba7a8e49b4
   feat(doctor): compose six status probes (V5 H/0/01 PROBES Trial 1 GREEN)
   cli/src/agents_cli/doctor_probes.py +16/-0
   1 file changed, 16 insertions(+)
   ```

## TDD chronology and immutable RED evidence

### Provider

The original provider RED command at `34f211d` was:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --python 3.13 \
  --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-probes-t1-red-py313 \
  tests/cli/test_doctor_provider_probes.py tests/cli/test_doctor.py \
  -k 'provider or registry_is_closed_immutable_and_canonically_ordered or all_pass_projection_is_exact_schema_valid_and_deterministic'
```

Actual immutable-RED output: `3 failed, 23 errors, 311 deselected`. The errors
were the absent `agents_cli.doctor_probes` module; the three failures were the
unchanged six-check registry/schema/remediation expectations. No provider was
contacted.

The inherited partial GREEN then ran the two complete files and produced
`336 passed, 1 failed`; the sole failure required the exact lowercase docs
substring `never logs in automatically`. After the one-line documentation
correction, the same inventory produced `337 passed, 0 failed, 0 skipped`.
Draft 2020-12 self-validation, Ruff, in-memory Python syntax, and diff checks
passed. A separate repository-wide attempt collected no tests and stopped on
14 `orchestrator_langgraph` import errors; it was not retried or represented
as green.

### Coordination

At `6f3b16b`, the committed RED tests produced these exact independent totals:

```text
node --test tests/gateway/doctor_coordination_probe.test.js
  1 passed, 8 failed
  all eight failures: probeDoctorCoordination absent

uv run --project cli --extra dev pytest -q \
  tests/cli/test_doctor_coordination_probes.py
  19 failed
  missing CheckIds/outcomes/create_coordination_bindings

provider suite
  23 passed, 1 intentional RED failure

core Doctor suite
  310 passed, 3 intentional RED failures
```

The GREEN at `632218a` produced `19 passed` for the Python coordination suite,
`9 passed` for the Gateway bridge, and `356 passed, 0 skipped` for the combined
Doctor/provider/coordination Python inventory. The four coordination RED test
blobs remained unchanged.

### Authority and corrected authority RED

At `d02bf4e`, the first authority RED produced:

```text
authority    23 failed
core         310 passed, 3 failed
provider     23 passed, 1 failed
coordination 18 passed, 1 failed
aggregate    351 passed, 28 intentional RED failures
```

The first RED mistakenly retained the pre-authority public-outcome count of
`53`. Before correction, that focused assertion passed (`1 passed`) while the
authority suite remained `23 failed`. Commit `3d9df43` changed only the exact
expected count `53 -> 61`. The corrected focused test then failed only as
`assert 53 == 61`, and the four scoped suites produced `350 passed, 29 failed`:
core 4, authority 23, provider 1, and coordination 1.

The GREEN at `85c8115` then produced:

```text
core                         313 passed, 0 failed, 0 skipped
authority                     23 passed, 0 failed, 0 skipped
provider                      24 passed, 0 failed, 0 skipped
coordination                  19 passed, 0 failed, 0 skipped
combined serial inventory    379 passed, 0 failed, 0 skipped
schema/projection focus        5 passed, 0 failed, 0 skipped
documentation tests            3 passed, 0 failed, 0 skipped
post-format serial rerun      379 passed, 0 failed, 0 skipped
```

All four corrected authority RED test blobs remained unchanged through that
GREEN.

### Composition

At `af8e0c9`, the composition test collected normally and produced exactly
`1 failed` because `create_doctor_probe_bindings` was absent. The existing
authority/provider/coordination suites remained `23/23`, `24/24`, and `19/19`
green. The Gateway bridge, including its no-network real-factory control,
remained `10/10` green.

The GREEN at `a2c0e2d` produced:

```text
composition                 1 passed, 0 failed, 0 skipped
existing Doctor inventory 379 passed, 0 failed, 0 skipped
Gateway bridge             10 passed, 0 failed, 0 skipped
schema suite               34 passed, 0 failed, 0 skipped
```

Ruff lint/format on the production file, Python compile, Node syntax,
ESLint 10.4.1, schema checks, and diff checks passed in that phase. Both
composition RED blobs remained unchanged.

## RED blob authentication

Each GREEN preserved its immediately governing RED test blobs. All comparison
commands exited zero.

```text
provider RED 34f211d -> provider GREEN 747cd1f
a49dcc16a1ff61e2ca3580669f9c2e6b7e3e86d3 tests/cli/test_doctor.py
d7d7bd6b42df0362de4fa743070e96dc0aedc3a2 tests/cli/test_doctor_provider_probes.py

coordination RED 6f3b16b -> coordination GREEN 632218a
35a68bf838893879286af2bdda67e2b1f85babda tests/cli/test_doctor.py
7cc37ebe55e10647716177eceb38738e4b5e648f tests/cli/test_doctor_coordination_probes.py
5b28cfae82457116f37cdca3c746937f0e869bc9 tests/cli/test_doctor_provider_probes.py
a1b619f3457efcbd23b5e7da5e8248a4d277319f tests/gateway/doctor_coordination_probe.test.js

authority RED d02bf4e -> corrected RED 3d9df43
eedadbaa6df1fb205feb79ea7e67532979119dfa tests/cli/test_doctor_authority_probes.py
ed75ca10febd614cfac99c7e902b26c0ad08787c tests/cli/test_doctor_coordination_probes.py
205e82f1ba9ca8df566c820f85b1f9fe836128ce tests/cli/test_doctor_provider_probes.py
c3d81fa7fa5517ff8eba6cca300bfa1f9d7f7563 tests/cli/test_doctor.py (superseded only by 53 -> 61)
6239287946e6c72fac6c26da5caeacb845a3dfcf tests/cli/test_doctor.py (corrected RED)

corrected authority RED 3d9df43 -> authority GREEN 85c8115
6239287946e6c72fac6c26da5caeacb845a3dfcf tests/cli/test_doctor.py
eedadbaa6df1fb205feb79ea7e67532979119dfa tests/cli/test_doctor_authority_probes.py
ed75ca10febd614cfac99c7e902b26c0ad08787c tests/cli/test_doctor_coordination_probes.py
205e82f1ba9ca8df566c820f85b1f9fe836128ce tests/cli/test_doctor_provider_probes.py

composition RED af8e0c9 -> composition GREEN a2c0e2d
873579557e50353179d33d3c6404ae6f5ace7750 tests/cli/test_doctor_probe_composition.py
f8d87ca08d563e1e04c131bff184659cef7eab87 tests/gateway/doctor_coordination_probe.test.js
```

Later RED phases intentionally advanced shared inventory tests; therefore the
candidate is not falsely claimed to retain the obsolete provider- or
coordination-phase versions after those later tests-first commits.

## Fresh verification from the frozen candidate

Tool identities:

```text
Python 3.11.15
pytest 9.1.1
Ruff 0.15.22 (cli/.venv)
Ruff 0.15.16 (repository .venv cross-check)
Node v22.22.1
ESLint 10.4.1 (provenance below)
```

### Combined Python gate

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  cli/.venv/bin/pytest -q -p no:cacheprovider \
  tests/cli/test_doctor.py \
  tests/cli/test_doctor_provider_probes.py \
  tests/cli/test_doctor_coordination_probes.py \
  tests/cli/test_doctor_authority_probes.py \
  tests/cli/test_doctor_probe_composition.py
```

Result: `380 passed in 84.89s`; `0 failed`, `0 skipped`.

### Exact Node gates

```text
node --test tests/gateway/doctor_coordination_probe.test.js
```

Result: `10 passed`, `0 failed`, `0 cancelled`, `0 skipped`, `0 todo`.

```text
node --test tests/gateway/schemas.test.js
```

Result: `34 passed`, `0 failed`, `0 cancelled`, `0 skipped`, `0 todo`.

### Language and static checks

Ruff lint over both changed Python production modules and all five changed
Python test files:

```text
cli/.venv/bin/ruff check --no-cache <seven changed Python paths>
```

Result: exit `0`, `All checks passed!`.

Ruff format over the same seven files:

```text
cli/.venv/bin/ruff format --check --no-cache <seven changed Python paths>
```

Result: exit `1`:

```text
Would reformat: tests/cli/test_doctor_probe_composition.py
1 file would be reformatted, 6 files already formatted
```

This was reproduced with the repository-level Ruff 0.15.16 as well as the
CLI environment's Ruff 0.15.22. The file is the immutable composition RED
blob `873579557e50353179d33d3c6404ae6f5ace7750`, so this handoff did not modify
it. This is the only known non-green prescribed handoff gate and requires
reviewer adjudication.

The following checks all exited `0` with no output unless noted:

```text
in-memory Python compile:
  cli/src/agents_cli/doctor.py
  cli/src/agents_cli/doctor_probes.py

node --check gateway/src/coordination.js
node --check tests/gateway/doctor_coordination_probe.test.js

ESLint:
  gateway/src/coordination.js
  tests/gateway/doctor_coordination_probe.test.js
```

The preserved `gateway/node_modules` symlink points to the production-only
dependency tree at `/home/carase/git/personal/agents-orchestrator/gateway/node_modules`.
It has no ESLint executable or `@eslint/js`; the PATH ESLint is obsolete
6.4.0. The successful check used the already installed executable:

```text
/home/carase/git/personal/agents-orchestrator/workspace/clones/v3-work/gateway/node_modules/.bin/eslint
version 10.4.1
```

It used that worktree's `gateway/eslint.config.js` after `cmp` proved it
byte-identical to this candidate's config. Both config files have SHA-256:

```text
31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252
```

`--print-config` and the two-file lint both exited `0`.

### Git and scope integrity

The following all passed before this review request was written:

- `git diff --check 9f075e1..a2c0e2d`;
- current tracked and cached `git diff --check`;
- exact nine-commit parent/tree traversal;
- exact eleven-path candidate inventory and `3777/28` stat;
- no `policies/` path, lockfile, or lock-like path in the candidate range;
- `cli/uv.lock` absent;
- empty index and no tracked worktree change;
- only the pre-existing untracked `gateway/node_modules` symlink; and
- the symlink still targets
  `/home/carase/git/personal/agents-orchestrator/gateway/node_modules`.

No dependency, lock, policy, workflow, plan, review result, or shared review
index is part of the technical range.

## Adversarial coverage to inspect

- Provider fakes cover exact command count/order, registry-only zero-command
  behavior, absence, failure, timeout, stale login, unknown return objects,
  malformed provider projections, hostile values, ordinary exceptions,
  `BaseException`, and output/config/path/token/argv canaries.
- Coordination fakes throw on forbidden operations and record the exact
  `factory -> status({}) -> close()` lifecycle. Cases cover matching and wrong
  scope, unsafe/missing/hostile scope, disabled/unreachable/anomalous status,
  status throw, close failure, invalid projection/factory/instance/status,
  exact frozen output, mutation after capture, raw URL/prefix/scope/error/path/
  credential canaries, and `BaseException` behavior.
- The Gateway real-factory compatibility control injects only an in-memory
  fake queue and proves one ping, one close, no network, and no domain/audit
  operation.
- Authority cases cover absent capability, exact ready/owned, unavailable,
  foreign second writer, stale, opaque, malformed and hostile values, foreign
  enums/subclasses, booleans and mappings, lazy one-shot sharing, mutation,
  ordinary exceptions, `BaseException`, and public-output canaries.
- Composition proves no construction-time provider/authority execution, exact
  six-binding order, exact provider call inventory, one authority call,
  twelve schema-valid checks, fully green injected authority, and visibly
  unavailable/unverifiable absent authority.
- Core inventory tests retain closed issuance, snapshot-before-callback,
  deterministic projection/rendering, remediation detachment, schema closure,
  and exact result/exit semantics.

## Explicit limitations and work not claimed

- No Typer command wiring or CLI entry-point integration is implemented.
- No core filesystem/runtime probes beyond the independently accepted Doctor
  base are added here.
- The real D/0/02 isolation PASS and real D/0/03 state-owner PASS do not exist
  in this slice. Only the exact future injected shapes are testable; the
  production default remains non-green.
- Portability, native dependency proof, full H/0/01 integration/exit,
  promotion, publication, tagging, and release are out of scope.
- No network, live provider command, Redis instance, MCP endpoint, KYA flow,
  tmux session, agent process, or shared service was used by these tests.
- The fresh candidate Python gate ran on 3.11.15; no fresh handoff Python 3.13
  matrix was required or run. The original provider RED did run on 3.13.
- `scripts/ci.sh` was deliberately not run. The disposable lock-graph checks
  were also not run. Both are integrator-owned gates and must run against the
  independently reviewed combined tree, not this isolated lane.
- The Ruff format-check failure above remains open. No frozen technical test
  was reformatted during handoff.

## Reviewer checklist

1. Authenticate base `9f075e1`, candidate `a2c0e2d`, candidate tree
   `49916f2`, the exact nine-commit chain, and the eleven-path net range.
2. Review the production implementations independently of the test assertions.
3. Re-run or inspect the focused provider, coordination, authority,
   composition, schema, leakage, and lifecycle evidence.
4. Decide whether the immutable composition-test Ruff format failure requires
   `reviewed_KO` or is otherwise acceptable under the governing quality gate;
   do not silently call it green.
5. Enforce the library/bridge-only claim boundary and the absent D-owned live
   authority.
6. Record all P0/P1/P2 findings and write only the required result file.

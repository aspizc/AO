# Review Submission - Project V5 H/0/01 PORTABILITY (Trial 1)

## Requested independent review

Assign a fresh reviewer session under the repository orchestration profile.
The reviewer must be independent of this coder process and inspect the frozen
two-commit candidate identified below. Write the verdict only to:

```text
plan/reviews/PROJECT_V5/H_0_1_PORTABILITY-1_result.md
```

The verdict must identify the exact reviewed commit, tree, ancestry, and
pathset; list every P0/P1/P2 finding; and record the commands and terminal
counters actually reproduced by the reviewer. A verdict commit must not
rewrite this request or any prior review evidence.

No result or verdict existed when this request was committed. This document is
a coder-owned pending submission and cannot serve as its own verdict.

## Coder and task identity

```text
trace: tr-6c7f03e0-0991-444b-b84d-e680c2d6d5c7
task: ts-0338de74-5c90-4ac8-b92e-2ab126d8c80a
role: coder
agent/model: codex / gpt-5.6-sol
reasoning effort: max
service tier: priority
worktree: /home/carase/git/personal/agents-orchestrator/workspace/clones/wt-h001-portability-t1
branch: feat/V5-H-0-01-portability
```

No sub-agent was delegated this handoff, and the coder did not author a
verdict.

## Review boundary

Review the frozen RED and GREEN commits as one TDD candidate:

1. the new clean-checkout portability contract and its suite inventory update;
2. the single production behavior change that disables npm lifecycle scripts;
3. the matching documentation, fake-npm contract, and bootstrap regressions;
4. the synthetic security and portability boundaries exercised by the frozen
   test; and
5. the explicit native-addon limitation and all lifecycle non-claims below.

Do not treat this request as aggregate CI approval, proof of a real-network
install, proof of runnable native dependencies, completion of all H/0/01 work,
integration, promotion, release, publication, tag creation, push, or policy
work.

## Frozen Git identities and ancestry

The frozen base/current-main anchor for this candidate is present in Git as:

```text
commit  81bb05ec09f8d8c64027d1106e81f834d96b7742
tree    013091ad72ec7386ed344758f74d053bec098a73
parent  3615aeb26bf0f83a417c13b189f12ec3025579e0
subject docs(review): index H/0/01 PROBES Trial 4 verdict
```

The RED commit is:

```text
commit  ea7a4c59258223a9297c655b9066042afb938d57
tree    2971ffea7817e3a98b114e86e148e8776833f4e8
parent  81bb05ec09f8d8c64027d1106e81f834d96b7742
subject test(portability): require script-disabled clean bootstrap (V5 H/0/01 Trial 1 RED)
```

Its exact parent-to-RED pathset is:

```text
M  ci/suites.json
A  tests/structure/test_h001_portability.py
```

The GREEN technical candidate is exact worktree HEAD before this review-only
handoff:

```text
commit  2ce0ec115de259695254f050f5c0c4704461ae06
tree    77b1a9f1ed9cb39f493a4a5a1a17a2eaa03d31f0
parent  ea7a4c59258223a9297c655b9066042afb938d57
subject fix(portability): disable bootstrap install scripts (V5 H/0/01 Trial 1 GREEN)
```

It has the RED commit as its sole parent. Its exact RED-to-GREEN pathset is:

```text
M  docs/doctor.md
M  scripts/bootstrap.sh
M  tests/fixtures/h001/fake-bin/npm
M  tests/structure/test_h001_bootstrap.py
```

Therefore the complete base-to-GREEN candidate is exactly six paths: the two
RED paths plus the four GREEN paths above. The pre-existing untracked
`gateway/node_modules` symlink is not in any candidate commit or pathset.

## Frozen-test RED to GREEN proof

The portability test is byte-identical at RED and GREEN:

```text
path:        tests/structure/test_h001_portability.py
RED blob:    f47b53795c244d3d9a04b100dba33aebe1a1ba56
GREEN blob:  f47b53795c244d3d9a04b100dba33aebe1a1ba56
SHA-256:     e011acf7dc65e72dc5c4814a22fca37f22a2fcfc9529f8193030a5943e957e18
```

The durable root reproduction recorded the RED run as 14 passed with exactly
one semantic failure. The archived bootstrap invoked npm without
`--ignore-scripts`; the strict fake entered the injected lifecycle-execution
failure, and the native-addon artifact was not materialized as the frozen
contract required. The failure was behavioral, not a test collection or
fixture failure.

Without modifying the frozen test, GREEN changed the npm invocation from:

```text
npm --prefix gateway ci
```

to:

```text
npm --prefix gateway ci --ignore-scripts
```

The strict existing fake and regression expectations were updated to accept
only that exact four-argument npm flow. The documentation now states the same
script-disabled boundary and does not claim the native addon is runnable.

## File and inventory identities

These are the Git blob and byte-level SHA-256 identities at GREEN:

| Path | Git blob | SHA-256 |
|---|---|---|
| `ci/suites.json` | `85c696450683e1a461f404a5b4afcb250ef5373a` | `923d2ebdaba6d4ed6e2a8c828642a573d35295baf158e303becc3b7a8d0c9d54` |
| `tests/structure/test_h001_portability.py` | `f47b53795c244d3d9a04b100dba33aebe1a1ba56` | `e011acf7dc65e72dc5c4814a22fca37f22a2fcfc9529f8193030a5943e957e18` |
| `docs/doctor.md` | `04fc6177001b3da9f26da660a140908578baf821` | `ba34ab9ac7b3da06d2c80b96265a2c7bbc18df60867646f02202269251e3e9d8` |
| `scripts/bootstrap.sh` | `565615c348158f091cb070665942650fdb839e66` | `b4235f0fc4cf21a0eb9f123af824bfe18d2eb49382ec1ab2743d20c65663c889` |
| `tests/fixtures/h001/fake-bin/npm` | `108689c3d41c5b14458a68503b0a141f831cc54d` | `fa374d201f3e39b0379319acc1120ca50a8452e7d7e8294992d8e6e8f886e674` |
| `tests/structure/test_h001_bootstrap.py` | `26d9ae2c71af2ce7c062719376c91e9866334f0d` | `4db91f06f181371b28ee49120a21cdcfe8e5b83cfdb63f5d2d52b991be35f91f` |

Adding the frozen test changed only the two expected inventory fields in
`ci/suites.json`:

```text
lint.python.inventorySha256
  sha256:2b3b68c399e090ba49de62adf111331db077249f3efaac37f89a1ef8df89fd43
  -> sha256:36a5eb68cf996cfbf46dd8e557e58429b3c9deea86b79b7ddfcf7465de1f0383

test.structure.inventorySha256
  sha256:85c68c926f8540bf0d198d176d09aa247d7ab179ac88df6129e5b2d0c25c06c5
  -> sha256:840a6fdccb0ccffdc915bb5a1732fc5798aa110fac180ff18c660af78e869b7f
```

The RED inventory blob `85c696450683e1a461f404a5b4afcb250ef5373a`
is unchanged at GREEN. The validate-only gate accepted the resulting suite
inventory with zero errors.

## Verification evidence and terminal counters

This handoff did not rerun or mutate product/tests. The counters below are the
durable root-reproduced evidence supplied to this same-coder continuation. The
focused pytest command form uses the checked-in `test.structure` argv
`python -m pytest -q -rs` with the named test file appended.

| Command | Frozen point | Terminal result |
|---|---|---|
| `python -m pytest -q -rs tests/structure/test_h001_portability.py` | RED | 14 passed, exactly 1 semantic failure |
| `python -m pytest -q -rs tests/structure/test_h001_portability.py` | GREEN | 15 passed, 0 failed, 0 skipped |
| `python -m pytest -q -rs tests/structure/test_h001_bootstrap.py` | GREEN | 114 passed, 0 failed, 0 skipped |
| `python -m pytest -q -rs tests/structure/test_h001_sample.py` | GREEN | 5 passed, 0 failed, 0 skipped |
| `python scripts/ci_gate.py --validate-only` | GREEN | passed, 0 errors |
| `git diff --check` | GREEN | passed, no whitespace errors |

These are focused and structural results. Aggregate `./scripts/ci.sh` was not
claimed or represented as run by this candidate handoff.

## Behavior, security, and portability boundaries

The implementation change is deliberately narrow: bootstrap still uses the
reviewed `gateway/package-lock.json` flow, but npm lifecycle scripts are now
disabled. The frozen test exercises that flow from a Git archive in a
disposable checkout with no inherited `.git`, `.venv`, or
`gateway/node_modules` state.

The synthetic controls use isolated home and cache paths, strict local uv/npm
fakes, allowlisted proxy-route events, direct/unallowlisted egress rejection,
owner credential and path canaries, and scans across stdout, stderr, logs, and
produced JSON. They also verify inherited home, cache, credential, and install
state is rejected before npm. These checks support the closed synthetic
boundary only; they do not demonstrate a real provider, Redis, MCP, registry,
or public-network execution.

`--ignore-scripts` materializes the reviewed npm lock graph without executing
dependency lifecycle code. That is the intended security boundary for this
candidate, but it necessarily leaves the required `better-sqlite3` native
addon unbuilt. The frozen test requires the stable outcome:

```text
NATIVE_ADDON_UNAVAILABLE
```

An artifact-shaped file must not be reported as `DEPENDENCIES_READY` when Node
cannot load it. Runnable native dependency proof belongs to I/0/04, not this
candidate.

## Limitations and lifecycle non-claims

- No real-network or cold-cache dependency installation was run or claimed.
- `better-sqlite3` is not built or runnable; the expected boundary is
  `NATIVE_ADDON_UNAVAILABLE`.
- No aggregate CI result is claimed; only the recorded focused lanes and
  validate-only inventory check are evidence here.
- This candidate does not claim all H/0/01 acceptance criteria are complete.
- This pending request is not an independent review or verdict.
- The technical candidate is not claimed integrated into a moving main branch.
- Nothing here was promoted, released, published, tagged, or pushed.
- No policy file, policy decision, dependency lock, workflow, or release
  authority was changed by GREEN or by this review handoff.

The independent reviewer should reproduce the applicable checks from a fresh
session and issue only the separate Trial 1 result.

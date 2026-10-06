# Review Submission — Project V5 H/0/01 EXECUTABLE (Trial 1)

## Requested independent review

Assign a fresh independent reviewer under the repository orchestration profile
to review the exact technical candidate identified below against the approved
[`H_0_1_EXECUTABLE` build-ready contract](../H/0/01.md#h_0_1_executable-build-ready-contract)
and its independently approved
[`plan trial 1`](H_0_1_EXECUTABLE-plan-1_reviewed_OK.md).

This is a coder-owned pending request, not a verdict. No implementation verdict
exists in this submission. The reviewer must write exactly one separate Trial 1
result and must not rewrite this request or any earlier artifact. The candidate
is implemented and pending review only; it is not reviewed, integrated,
promoted, released, supported, tagged, or pushed.

## Frozen candidate identity and ancestry

```text
approved plan verdict/base  10b75eca7ebf7b5dd1b3aafe137916af99838fc7
base tree                   65423e31cfa8699ebf2c5f41348e940bc58dc291
technical candidate         52705a27261d821fb1bcb46dc71d8b6d4a03101e
candidate tree              1bfb00936344a3aec22ca12e8fc8132b64995e4e
candidate parent            7765f08e0675679c2cfa35bb042518cb7d80710e
candidate branch            feat/V5-H-0-01-close-prp1-r1
```

The range `10b75ec..52705a2` is linear. The candidate was authenticated before
and after the accepted canonical gate at the same commit and tree. Post-gate
custody was clean: no staged, unstaged, or untracked paths; `git diff --check`
was clean; and no `scripts/ci.sh` process remained.

## Complete durable TDD commit chain

| Phase | Commit | Tree | Sole parent | Exact paths and causal purpose |
|---|---|---|---|---|
| RED 1 | `5383786da9ab78063cb70d74d35fb1b12a3a38ce` | `2841488ec1f674d0528afdec2be620b757031a79` | `10b75eca7ebf7b5dd1b3aafe137916af99838fc7` | Added only `tests/cli/test_doctor_command.py` and `tests/cli/test_doctor_core_probes.py`; exposed the absent registered command and absent production first-six factory. |
| GREEN 1 | `1c80daa651c2611caa4df2041d37fe5ebb7b4d71` | `9cf2ae0b509e704b09684c7df3113c0a2f17d723` | `5383786da9ab78063cb70d74d35fb1b12a3a38ce` | Added only `doctor_command.py`, `doctor_core_probes.py`, and the narrow `main.py` registration; composed the reviewed twelve bindings and propagated rendering/exit behavior. |
| Inventory | `8ef676b54b7fe2220008c8e729f391fff9dfcc87` | `8b62c6a0e8d704620848f9e7089e1834241e82d0` | `1c80daa651c2611caa4df2041d37fe5ebb7b4d71` | Updated only `ci/suites.json` to bind the authoritative CLI inventory to the new tests before aggregate CI. |
| RED 2 | `598e63e8b3cf8ea4b770334021491751d42a4a30` | `fe6d79d52585cb026911e7c24f1fa230f139fe16` | `8ef676b54b7fe2220008c8e729f391fff9dfcc87` | Changed only `test_doctor_core_probes.py`; reproduced a first-six `CheckId` identity mismatch after `agents_cli.doctor` reload. |
| GREEN 2 | `e13472378dac1d03e0e22cd4924ab0fc258497f8` | `b28a71bfc72b96202d692a6283814c2bd12a265e` | `598e63e8b3cf8ea4b770334021491751d42a4a30` | Changed only `doctor_core_probes.py`; resolved each core `CheckId` from the current Doctor module when constructing bindings. |
| RED 3 | `7765f08e0675679c2cfa35bb042518cb7d80710e` | `e52656e95cb578f75ffa40fd46f93293e7204d49` | `e13472378dac1d03e0e22cd4924ab0fc258497f8` | Changed only `test_doctor_core_probes.py`; added a new aggregate import/reload-order regression that combines the first six and reviewed final six, rather than weakening an existing expectation. |
| GREEN 3 / candidate | `52705a27261d821fb1bcb46dc71d8b6d4a03101e` | `1bfb00936344a3aec22ca12e8fc8132b64995e4e` | `7765f08e0675679c2cfa35bb042518cb7d80710e` | Changed only `doctor_probes.py`; replaced copied Doctor DTO/check classes with lookups through the current module authority, removing reload-order contamination. |

The plan froze `doctor_probes.py` for the initially expected implementation.
It changed only after the first canonical full gate proved a new causal defect
in that frozen file and the operator explicitly authorized the minimum
technical-byte exception. No accepted Doctor behavior, policy, or outcome code
was changed.

## Candidate pathset and byte custody

The complete technical candidate range changes exactly these seven paths:

```text
M  ci/suites.json
A  cli/src/agents_cli/doctor_command.py
A  cli/src/agents_cli/doctor_core_probes.py
M  cli/src/agents_cli/doctor_probes.py
M  cli/src/agents_cli/main.py
A  tests/cli/test_doctor_command.py
A  tests/cli/test_doctor_core_probes.py
```

Authenticated candidate blobs and range counts are:

| Path | Blob | Added | Deleted |
|---|---|---:|---:|
| `ci/suites.json` | `8aafa14b48e7bacf45ac7125e775e9531deae6ca` | 2 | 2 |
| `cli/src/agents_cli/doctor_command.py` | `33c73c85cff8205694cab0563ae6129cf2c62f70` | 266 | 0 |
| `cli/src/agents_cli/doctor_core_probes.py` | `9fab3df65fe59899ac1a85186db809ca0b3f9a6c` | 101 | 0 |
| `cli/src/agents_cli/doctor_probes.py` | `50b5d2741254f5500f2792e91c5f27610778153f` | 46 | 41 |
| `cli/src/agents_cli/main.py` | `36ffc6d7d2416723216e5f78fbe3dd84446e8ed0` | 2 | 0 |
| `tests/cli/test_doctor_command.py` | `4c1c92905bc0dbd7e6c30406e982128108d3d771` | 187 | 0 |
| `tests/cli/test_doctor_core_probes.py` | `186d38ccdd2aafaf1894f88579c058b80471bd30` | 181 | 0 |

Total range: 785 insertions and 43 deletions. No policy, dependency, lockfile,
workflow, plan sheet, accepted review artifact, changelog, or operator
documentation is in the technical candidate.

## Causal RED/GREEN evidence

### Initial executable behavior

At RED 1's parent, neither `agents_cli.doctor_command` nor
`agents_cli.doctor_core_probes` exists. The committed tests fail explicitly at
those imports with `the registered agent-run doctor command is absent` and
`the production first-six Doctor binding factory is absent`. The three command
cases cover the exact safe twelve-row JSON composition, invalid invocation,
and contract failure; the six parameter cases independently drive each
first-six semantic failure. GREEN 1 adds only the two production modules and
narrow registration required to satisfy those behaviors.

### Reload-order correction before the first full gate

RED 2's `test_core_factory_resolves_check_ids_after_doctor_reload` imports the
CLI, reloads `agents_cli.doctor`, constructs the first-six bindings, and
requires every binding to carry the reloaded module's exact `CheckId` type.
GREEN 2 changes the core specs from cached enum values to names resolved from
the current Doctor module at binding construction.

### Full-gate discovery and aggregate causal regression

The first canonical full gate at GREEN 2 exposed six failures in the
parameterized
`test_each_first_six_input_drives_its_semantic_failure` cases:
`config_valid`, `dependencies_ready`, `policy_valid`, `profile_valid`,
`repository_canonical`, and `runtime_supported`. The earlier reload test had
reloaded `agents_cli.doctor`, while `agents_cli.doctor_probes` retained copied
pre-reload `CheckId`, `ProbeBinding`, `ProbeObservation`, and `ProbeStatus`
classes. Combining current core bindings with those stale final-six bindings
therefore failed exact Doctor admission with `DoctorContractError` before each
case could reach its semantic assertion.

RED 3 adds
`test_aggregate_bindings_resolve_doctor_authority_after_cli_import_reload`.
Against a clean detached `e134723`, the exact new test failed causally with one
`DoctorContractError` (`1 failed in 0.10s`). GREEN 3 makes
`doctor_probes.py` use the current `doctor` module authority at every DTO/check
construction site. The causal test then passed, and the affected complete CLI
selection passed `424` tests with zero failures, errors, or skips
(`424 passed in 78.04s`). Ruff check and format verification over the affected
implementation/test paths also passed. These are retained results; this
handoff did not rerun any test or gate.

## Original failed canonical gate

The immutable original report is Gateway artifact
`art-d68f87a4-6be0-42a1-987e-a089e1aea1ca`, kind `test_report`, classification
`internal`, trace
`tr-v5-h001-exec-r1-gatefix-d8e89a92-cb2b-4c98-99d6-a44960f42a9b`, produced by
`codex:orchestrator` at `2026-08-05T23:09:14.625Z`. It binds the failure to
candidate `e13472378dac1d03e0e22cd4924ab0fc258497f8`, tree
`b28a71bfc72b96202d692a6283814c2bd12a265e`.

Its canonical totals were `2,567` tests, `2,549` passed, `6` failed, and `12`
skipped; overall status `failed`. Aggregate and `test.cli` errors were exactly
`["test.cli: 6 tests failed", "test.cli: command exited with status 1"]`.
`test.cli` was `423` tests, `417` passed, `6` failed, `0` skipped. Every other
suite had an empty errors array. The artifact remains unchanged and is not
superseded or rewritten by the later successful causal proof.

## Accepted final canonical gate

The orchestrator serialized and accepted one second canonical full gate for
the exact final candidate. It ran this command without variation:

```bash
/usr/bin/env PATH=/home/carase/git/personal/agents-orchestrator/.venv/bin:/home/carase/miniconda3/bin:/usr/local/bin:/usr/bin:/bin D007C_TEST_TMUX_PATH=/tmp/d007d-cp1-r3-inputs.cgOCPL D007C_RUN_REAL_TMUX_PROBE=1 D007C_TMUX_SOCKET_NAME=d007c-control-probe PROCESS_SUPERVISOR_TEST_PYTHON=/usr/bin/python3 bash scripts/ci.sh
```

Terminal session: `72564`. Wrapper exit: `1`. Canonical overall status:
`infrastructure_unavailable`. Aggregate errors: `[]`.

| Lane | Classification | Status | Tests | Passed | Skipped | Failed | Errors |
|---|---|---|---:|---:|---:|---:|---|
| `lock.python` | required | passed | 1 | 1 | 0 | 0 | `[]` |
| `release.candidate` | required | passed | 1 | 1 | 0 | 0 | `[]` |
| `lint.python` | required | passed | 1 | 1 | 0 | 0 | `[]` |
| `lint.gateway` | required | passed | 1 | 1 | 0 | 0 | `[]` |
| `test.structure` | required | passed | 442 | 442 | 0 | 0 | `[]` |
| `test.gateway` | required | infrastructure_unavailable | 1,587 | 1,578 | 9 | 0 | `[]` |
| `test.e2e` | required | passed | 25 | 25 | 0 | 0 | `[]` |
| `smoke.mcp` | required | passed | 1 | 1 | 0 | 0 | `[]` |
| `policy.registry` | required | passed | 1 | 1 | 0 | 0 | `[]` |
| `test.cli` | required | passed | 424 | 424 | 0 | 0 | `[]` |
| `test.langgraph` | required | infrastructure_unavailable | 84 | 81 | 3 | 0 | `[]` |
| `test.redis-live` | required | infrastructure_unavailable | 0 | 0 | 0 | 0 | `[]` |
| `test.real-agents` | optional-service | infrastructure_unavailable | 0 | 0 | 0 | 0 | `[]` |

Exact aggregate: `2,568` tests, `2,556` passed, `0` failed, `12` skipped.
Every suite errors array and the aggregate errors array were empty.
`release.candidate` also reported one production advisory and zero registered
waivers; the lane passed.

### Declared skip budget

The accepted skip budget is exactly twelve and contains no unexplained skip:

1. Nine `test.gateway` PostgreSQL opt-in cases:
   - `live postgres repository contract: create and read repository aggregate`
   - `live postgres repository contract: status updates report one changed row`
   - `live postgres repository contract: foreign key violation fails`
   - `live postgres repository contract: policy decisions are append only`
   - `live postgres literals round-trip adversarial strings`
   - `live postgres literals preserve NULL separately from string null`
   - `live postgres literals support named and positional params`
   - `live postgres reports changes for insert update and delete`
   - `live postgres rejects non-finite numeric literals before execution`
2. Three `test.langgraph` opt-in cases:
   - `tests.test_gateway_client::test_real_gateway_smoke`
     (`gateway-integration`)
   - `tests.test_plan_refine_graph::test_real_gateway_dry_run_smoke`
     (`gateway-integration`)
   - `tests.test_temporal_crash_recovery::test_temporal_worker_restart_replays_without_duplicate_implement_or_implicit_approval`
     (`temporal`)

`test.redis-live` (`redis`) and `test.real-agents`
(`real-agent-providers`) were infrastructure-unavailable service lanes with
zero collected tests and zero skips; they do not enlarge the twelve-skip
budget. The wrapper exit `1` records the four infrastructure-unavailable lane
statuses and is not a hidden test failure. The verbose Gateway TAP stream had
one control-plane-rendered middle truncation, while its terminal TAP footer and
the canonical final JSON retained the exact totals above; no retry occurred.

## Required independent review

The reviewer must independently:

1. authenticate the candidate commit/tree, sole-parent linear chain, all seven
   durable commits, exact pathset, blobs, and clean custody;
2. inspect that RED 1 excludes a constant twelve-row stub and that the minimum
   GREEN composes unchanged Doctor and final-six behavior with safe output and
   exact exit propagation;
3. reproduce the RED 2/GREEN 2 reload authority correction and the RED 3/GREEN
   3 aggregate import/reload-order regression, including the complete CLI
   selection with no failures, errors, or skips;
4. attribute the original six failures to stale copied final-six Doctor class
   authority and verify that GREEN 3 is the minimum causal fix without an
   outcome, policy, or accepted-core behavior change; and
5. reconcile the original failed artifact and the accepted candidate-bound
   canonical report, including all lane totals, four infrastructure-unavailable
   statuses, twelve declared skips, wrapper exit `1`, and empty error arrays.

The reviewer may issue only one of:

```text
plan/PROJECT_V5/reviews/H_0_1_EXECUTABLE-1_reviewed_OK.md
plan/PROJECT_V5/reviews/H_0_1_EXECUTABLE-1_reviewed_KO.md
```

A KO must identify a substantive T1 behavior, test, contract, or custody
defect. This request grants no authority to edit the candidate, policy,
accepted prior review evidence, or this request.

## Status boundary

Trial 1 is **pending independent review**. The technical candidate implements
only the named EXECUTABLE subleaf. H/0/01 remains `in_progress`; this request
does not close its sheet-level acceptance criteria. Real isolation and
state-owner evidence remain owned by `D/0/02` and `D/0/03`; native source-build
and release evidence remains owned by `I/0/04`.

No implementation review, integration into `main`, promotion, release,
support, publication, tag, push, or policy change is claimed or authorized.

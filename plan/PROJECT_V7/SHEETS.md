# PROJECT_V7 executable sheet registry

Status: **planned**. All five leaves are registered here and in the
[stage A index](A/README.md). Implementation requires independent review;
this registry is not implementation evidence.

| Sheet | Status | Depends on | Blocks | Implementation ownership | Review id |
|---|---|---|---|---|---|
| [A/0/00](A/0/00.md) | planned | Built selection/registry/client contracts | A/0/02 | `schemas/project-profile-v1.schema.json`; `orchestrator-langgraph/src/orchestrator_langgraph/project_profile.py`; `gateway/scripts/project-preflight.mjs`; `cli/src/agents_cli/project_command.py`; `examples/projects/`; focused profile/preflight tests and `docs/generic-wave-runbook.md` setup section | A_0_0 |
| [A/0/01](A/0/01.md) | planned | — | A/0/02 | `schemas/wave-budget-v1.schema.json`, `schemas/wave-error-v1.schema.json`; `orchestrator-langgraph/src/orchestrator_langgraph/wave_budget.py`; `cli/src/agents_cli/wave_command.py` budget-init leaf; multiprocess count/declared-memory-vector tests | A_0_1 |
| [A/0/02](A/0/02.md) | planned | A/0/00, A/0/01; V6 A/0/04 | A/0/03 | `schemas/wave-control-v1.schema.json`, `schemas/wave-result-v1.schema.json`; `.../wave_runner.py`; narrow `.../client/gateway_client.py` fixes; `cli/.../wave_command.py` run leaf; generic prompt templates; focused dispatch tests | A_0_2 |
| [A/0/03](A/0/03.md) | planned | A/0/02; V6 A/0/05 for restart acceptance | A/0/04 | `schemas/wave-checkpoint-v1.schema.json`; `.../wave_checkpoint.py`; durability hooks in `.../wave_runner.py`; `cli/.../wave_command.py` status/resume/cancel leaves; checkpoint/recovery tests | A_0_3 |
| [A/0/04](A/0/04.md) | planned | A/0/03; V6 A/0/04–05 | Track exit | `orchestrator-langgraph/tests/test_wave_e2e.py`; synthetic provider fixture; external E2E helpers; two-shape example checks; `docs/generic-wave-runbook.md` verification/limits; `ci/suites.json` and `ci/suites-contract.json` inventory refresh by root integration owner only | A_0_4 |

`...` abbreviates `orchestrator-langgraph/src/orchestrator_langgraph/` or
`cli/src/agents_cli/` in the ownership table only. A/0/00 and A/0/01 may each
need a scoped `cli/src/agents_cli/main.py` registration; one integration owner
merges these serially. Packaging/runtime availability belongs to A/0/00:
lazy-load the existing client package and report its absence, rather than
silently installing or duplicating the SDK transport. No new external library
is needed for capacity/checkpoint locking.

All sheets end verification with `bash scripts/ci.sh` and
`git diff --check`; root runs the shared full gate solo on the settled
candidate and refreshes only the relevant inventories. New required V7 tests
must be selected by the actual manifest; a glob/fixture assertion is not proof
that they ran. No sheet writes `policies/` or changes V5/V6 executable scope.

Execution waves and external dependency gates are binding as defined in the
[project README](README.md). V6 cannot be marked blocked by V7; V7's dependency
edges are recorded here without adding V7 prerequisites to the seven-sheet
1.1.0 release.

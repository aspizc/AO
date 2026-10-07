# A_0_2 Trial 1 — Prepared implementation, operator migration outstanding

Status: implementation prepared; **not independently reviewed or integrated**.
The final review candidate still requires the operator-owned policy migration
and root-owned gate integration. The registry lane is RED and is not skipped.

| Field | Evidence |
|---|---|
| Sheet | PROJECT_V6 A/0/02 |
| Branch | feat/V6-A-0-02-public-setup |
| Base | 186ce1d03e824fe526a61927812aa2593a81b28e |
| Trace | tr-v6-a02-1b1038a3-00fc-40aa-8511-54656967c519 |
| Session | Built-in coder session fallback, authorized after Gateway task.assign returned REQUEST_CONTEXT_DENIED |
| Candidate | Working tree diff from the base; no implementation commit was created |
| Reviewer | None assigned by this coder; no self-review verdict exists |

## Test-first proof

Before production edits, added tests/gateway/registry_overlay.test.js,
tests/cli/test_repository_overlay.py and tests/structure/test_public_hygiene.py.
Initial command `node --test tests/gateway/registry_overlay.test.js`:
11 tests, 1 pass, 10 fail, 0 skipped. Failures covered the missing additive
overlay, collisions, unknown agents, shape/path checks, config/startup and real
MCP assignment. Initial Python command:

```bash
PYTHONPATH=cli/src:orchestrator-langgraph/src .venv/bin/python -m pytest -q tests/cli/test_repository_overlay.py tests/structure/test_public_hygiene.py
```

10 failed, 0 skipped: no doctor effective registry helper, validator ignored
overlay, and scanner absent. Raw logs reside in the isolated worktree at
workspace/a02-evidence/red-gateway.log and red-python.log.

Before adding the two generic sample projects, added
tests/structure/test_generic_workflow_examples.py. RED: 2 failed (missing
service and CLI/library profiles), 1 passed (required legacy env validation).
Raw log: workspace/a02-evidence/red-generic-examples.log. The initial real-MCP
test fixture needed an actual named checkout under AGENTS_REPO_ROOTS to bind
task authority; fixed that fixture and retained the intermediate failure log.

## Changes and assumptions

- Gateway config/core/server accept an optional absolute additive repository
  overlay. Missing files, invalid JSON/shape/version, duplicate base IDs and
  unknown agents fail closed. Base and overlay entries use the same validator.
  Existing cross-validation checked unknown agents only for restricted repos;
  it now checks every classification, as the sheet requires.
- Validator and policy-check honor the variable. Doctor obtains repositories
  through the same Node loader via the validator's --repositories mode;
  it keeps registration data internal and emits the existing sanitized checks.
- I-1 fixtures and prompts now use generic paths/inputs. The legacy KYA scripts
  require AGENTS_REPO_ROOTS and KYA_REPO_CWD. Their fresh-Gateway-per-call and
  delegate workflow remains visibly unverified; no automated wave code added.
- Public scanner reads git ls-files and emits actual path:line findings. The
  only historical path exemptions are plan/**, audit/**, plan_proyecto_v4.md
  and tareas_implementacion_v4.md. The separate reviewed inventory contains
  13 exact I-3 path/literal pairs; JSON slash escaping keeps inventory data
  from becoming new raw home-path occurrences. Same-file extra paths fail.
- Generic planner/coder/reviewer templates, extraction inventory and two
  runnable project profiles supply configurable layouts, commands and
  epic/story/task/wave traceability with a dependency and shared-file conflict.
  Default review grants no production write permission. PROJECT_V7 owns
  automated scheduling and Gateway lifetime, explicitly labeled PLANNED.
- No policies/ or historical evidence documents were edited. The supplied
  dependency symlinks remain outside the candidate. No commits or pushes.

## Verification actually run

All commands ran in workspace/clones/wt-v6-a02 with Python's import path
pointing to this worktree's cli/src and orchestrator-langgraph/src.

| Command | Actual result |
|---|---|
| node --test tests/gateway/registry_overlay.test.js tests/gateway/registry_loader.test.js tests/gateway/config_paths.test.js tests/gateway/codex_enable_profile.test.js | 67 passed, 0 failed, 0 skipped |
| .venv/bin/python -m pytest -q tests/cli/test_repository_overlay.py tests/cli/test_doctor_command.py tests/cli/test_policy_validate.py tests/cli/test_policy_validate_contract.py tests/cli/test_policy_check.py tests/structure/test_public_hygiene.py tests/structure/test_generic_workflow_examples.py tests/structure/test_operator_guide.py | 30 passed, 1 failed, 0 skipped; only test_real_tree_public_registry_ids remains RED |
| python3 scripts/check_public_hygiene.py --repo-root . | exit 1; exactly policies/repositories.json:30 engineering_graph and :35 kya; 0 home-path findings |
| .venv/bin/python -m agents_cli.main policy validate --json | valid; 6 agents, 7 repositories, 10 roles |
| .venv/bin/python -m ruff check cli/src/agents_cli/doctor_command.py tests/cli/test_repository_overlay.py tests/structure/test_public_hygiene.py tests/structure/test_generic_workflow_examples.py examples/generic-workflows/cli-library scripts/check_public_hygiene.py | passed |
| npm --prefix gateway run lint -- --quiet | passed |
| git diff --check | passed |
| git grep -n '/home/carase' outside I-4 paths | no hits, exit 1 |
| git diff --name-only -- policies | no changed paths |

The Python run executes each example's actual verification argv and policy
checks via the effective overlay; it does not count documentation as runtime
acceptance. Logs: green-gateway-focused-final.log, green-python-focused.log,
policy-validate.json in workspace/a02-evidence. Full bash scripts/ci.sh has
**not** run on this candidate; root owns the solo gate after operator migration.

## Proposed operator step and root integration

Prepared outside tracked sources only, under workspace/a02-evidence:

- operator-registry-removal.PROPOSED.patch: minimal removal of engineering_graph
  and kya from policies/repositories.json and policies/profiles/kya/repositories.json;
  removal of engineering_graph from policies/profiles/mvp2/repositories.json.
- operator-repositories-overlay.PROPOSED.json: exact union of existing personal
  entries; classifications, allowedAgents and tags preserved, with no credentials.
- ROOT_INTEGRATION.md: required public.hygiene command lane in manifest and
  contract, expected-suite set, combined inventory refresh, README env table,
  changelog and plan/review indexing guidance. The current ci_gate.py already
  executes manifest command lanes; no new execution logic is needed.

The proposed policy patch and operator overlay were neither applied nor run.
The operator reviews the concrete removal patch, moves registrations outside
the checkout, configures the untracked launcher, and restarts the Gateway.
The parent then constructs the complete candidate, reruns policy validation,
scanner and full gate, and assigns the independent reviewer. Until those
steps occur, release hygiene and full-gate acceptance are unsatisfied.

## Candidate path scope

Existing files: gateway/src/config.js, gateway/src/core/registry.js,
gateway/src/mcp_server.js, gateway/scripts/validate-registries.mjs,
gateway/scripts/policy-check.mjs, cli/src/agents_cli/doctor_command.py,
docs/operator-guide.md, docs/kya-implementation-runbook.md,
prompts/kya_coder_prompt_template.md, prompts/kya_reviewer_prompt_template.md,
scripts/kya_mcp_task_runner.mjs, scripts/kya_run_task_mcp.sh,
tests/gateway/codex_enable_profile.test.js and tests/gateway/helpers/ephemeral_redis.js.

New files: ci/public-hygiene-fixtures.json, scripts/check_public_hygiene.py,
tests/gateway/registry_overlay.test.js, tests/cli/test_repository_overlay.py,
tests/structure/test_public_hygiene.py,
tests/structure/test_generic_workflow_examples.py,
prompts/project_coder_prompt_template.md,
prompts/project_reviewer_prompt_template.md,
prompts/project_planning_prompt_template.md, docs/generic-project-workflows.md,
examples/generic-workflows/README.md and the two example directories' source,
tests and profile.json files, plus this immutable handoff.

Remaining risks: scanner reads tracked publication inputs; root must stage the
explicit new paths before final scanning. No live provider or automated wave
execution is claimed. Independent reviewer, operator policy migration and
root full-gate evidence remain mandatory.

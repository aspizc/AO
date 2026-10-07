# V7 A/0/00 — Trial 1 implementation handoff

Status: **implemented candidate; independent review, integration and full gate
pending**. This coder issues no verdict. No commit, index/status update, Claude
invocation, internal subagent, policy edit, staging, push, reset or stash.

## Candidate binding

- Base commit: `b1e4fed5181431ec3c4769a078d016f0318c5b6a`.
- Base tree: `d5d1a3b8f94c908d506da5e819abffc4a43b76c3`.
- [Immutable file manifest](A_0_0-1_candidate_manifest.json): SHA-256
  `1561a9175f12bdceec24bdbe4213f8c5caf2c4a875d8610b4a87ba4ad28c8a2e`.
  Every candidate source/test/example/doc/evidence path has byte length,
  SHA-256 and Git blob hash. The manifest and this later-written request are
  excluded from the manifest's self-reference. No candidate commit/tree is
  invented; root freezes the integrated tree after its shared changes.
- Initial worktree was clean. A01 capacity and V6 adapter/recovery code are
  untouched. The only existing runtime file changed is request_context.js:
  one read-only export composes its existing registry/root/cwd logic without
  creating a request context, trace, task or session.
- Durable intake, RED and boundary checkpoints accompany this request.
  Verbatim transcripts are losslessly packaged as `.txt.gz`, retaining exact
  original bytes. Earlier checkpoints refer to their decompressed names.

## Implementation

Closed `project-profile/v1` schema and immutable Python profile/task/check/wave
DTOs validate 1 MiB UTF-8 input, integer/memory bounds, duplicate keys/IDs,
path containment, existing directories/prompts, absent final write leaves,
cycles, wave membership/order and references. Normalized JSON retains argv
and layout, adds reverse epic/story/task links and receives a sorted compact
SHA-256 digest. Prompt contents are never emitted. Integral floats and dangling
symlinks are rejected explicitly.

`validate_prior_wave_facts(profile, wave_id, input)` freezes A02's separate
bounded schema/DTO. It requires exactly direct earlier dependencies, matching
project/profile/task/wave identities, consistent source history and successful
receipt/candidate/cleanup references. Missing facts exit 5; malformed/conflicting
facts exit 2. Matching negative history exposes blocked dependencies. No source
verification, review authority, implicit lookup or replay follows from history.

The Node helper consumes bounded stdin, reuses canonical selection, capability,
registry, policy and repository/cwd code, and emits only safe selections and
code/field errors. It checks Node/SDK/provider presence without invoking a
provider. Python validates paths before this argv-only, ten-second helper call;
preflight checks existing Python/client/SDK imports and local POSIX locking.
Validate executes no subprocess. Neither command runs checks or opens a Gateway.

The JavaScript service (`plan/stories`, Node checks) and Python CLI/library
(`docs/work-items`, Python checks) each include epic/story/task/wave links,
an earlier-wave dependency and shared-file conflict. Operator-resolved absolute
root placeholders are explicit; neither becomes an automatic default. The
runbook documents setup and limits. Doctor remains unchanged.

## TDD and verification

Initial RED preceded production files: Python missing module collection exit 2;
CLI missing command module exit 1; Node missing helper exit 1. The direct Node
RED transcript exposes all three failing intents. Additional RED identified
integral float admission, dangling symlink admission and configured provider
binding mismatch. Each now passes without weakening validation.

Named tests from A00 are in test_project_profile.py, test_project_command.py
and project_preflight.test.js. They cover no-effect invalid input, safe errors,
normalized commands/layouts, canonical emitted selections and registry drift,
memory declarations and missing/conflicting/negative prior facts. Provider
presence uses a controlled executable and verifies its launch marker is absent.

| Verification | Result / immutable transcript |
|---|---|
| `PYTHONPATH=cli/src:orchestrator-langgraph/src /home/carase/git/personal/AO/.venv/bin/python -m pytest -q orchestrator-langgraph/tests/test_project_profile.py tests/cli/test_project_command.py` | **28 passed, 0 failed/skipped**; `A_0_0-1-python-final.txt.gz` |
| `node --test tests/gateway/project_preflight.test.js tests/gateway/orchestrator_profile.test.js tests/gateway/request_context.test.js tests/gateway/request_context_boundary.test.js tests/gateway/request_context_execution_binding.test.js examples/projects/javascript-service/test/service.test.cjs` | **123 passed, 0 failed/cancelled/skipped/todo** on authorized host; `A_0_0-1-node-final-host.txt.gz` |
| `/home/carase/git/personal/AO/.venv/bin/python -m unittest discover -s tests` from `examples/projects/python-cli` | **1 passed**; `A_0_0-1-python-example.txt.gz` |
| Scoped Python Ruff and Node ESLint | **pass**; `A_0_0-1-python-lint.txt.gz`, `A_0_0-1-node-lint.txt.gz` |
| `git diff --check` plus new-text `git diff --no-index --check` | **pass**; captured tracked check plus manifest-time check of all new text |
| `bash scripts/ci.sh` | **NOT RUN — root owns the solo full gate**; no aggregate gate or skip-budget claim |

Failed sandbox Node attempts are retained and never counted as passes.
`spawnSync` reported EPERM in this sandbox; authorized host tests passed.
The first Python attempt also exposed a test Popen replacement conflicting
with the SDK's import-time typing annotation; the test initializes imports
before installing its launch guard. All failure transcripts remain immutable.

## Exact root-owned follow-up

1. In `cli/src/agents_cli/main.py`, import
   `from .project_command import project_app`, then register
   `app.add_typer(project_app, name="project")`. Tests intentionally mount the
   production group in an isolated Typer root; public registration is pending.
2. Refresh `ci/suites.json` and `ci/suites-contract.json` as required so the
   actual aggregate gate selects the new profile, CLI and Gateway test files.
   Verify emitted selection/inventory; a filename/glob assertion is insufficient.
3. Run the solo full gate after registration and settled candidate integration.
   Bind its candidate tree/commit and exact passed/failed/skipped/deferred totals.
4. Assign a fresh independent reviewer; record and index its verdict, preserve
   this trial, and update CHANGELOG/status/plan indexes only within root authority.

## Limits and budget

No independent review or acceptance verdict, integration, promotion, release,
real-provider execution, credential login, Doctor isolation or OS containment
is claimed. Preflight uses Linux mount-type discovery and POSIX directory locks;
remote/unidentifiable filesystems are unsupported. Declared memory requests
do not measure usage or enlarge A01 host limits. Runtime-root hygiene and path
checks do not constrain arbitrary descendants. Later dispatch/recovery/external
acceptance sheets remain outside this candidate.

Work stops at this handoff under the 20k task ceiling; no runtime token meter
was supplied and an exact consumption total is not claimed. Root's required
registration/gate/review work remains explicitly pending.

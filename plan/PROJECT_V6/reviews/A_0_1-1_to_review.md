# A_0_1 trial 1 — Worker environment marker

## Candidate and authority

- Sheet: `plan/PROJECT_V6/A/0/01.md`; stage: `plan/PROJECT_V6/A/README.md`.
- Worktree: `/home/carase/git/personal/AO/workspace/clones/wt-v6-a01-build`.
- Branch: `feat/V6-A-0-01-worker-marker`.
- Base HEAD: `a8e84303130096f3c90d179f69736a0f8247846f` (A/0/00 integration merge).
- Candidate: **uncommitted implementation**, independent review pending.
- No commit, push, policy edit, integration, promotion or release performed.
- Read before implementation: operating memory, orchestration profile,
  `plan/README.md`, sheet/stage, V6 review index, A00 trial-2 verdict and
  integration verdict. There was no existing A01 submission or verdict.
- This is the assigned coder handoff; no coder-owned review or subagent verdict
  exists. A separately assigned reviewer must decide this candidate.

Immutable candidate/evidence manifest: [A_0_1-1-files.json](evidence/A_0_1-1-files.json).
SHA256: `6178b2f2d1bd58ac37819772e1955b49c51c76dbe951db670a077a2987a11088`.
It binds all 16 candidate files and 11 compressed logs. Corrections require a
new trial; do not overwrite this request or its manifest/evidence.

## Implementation

`workerEnv` is shared in `base_adapter.js`. It builds the role, child trace,
and task markers, clears an absent task to the empty string, and rejects
newline/NUL and non-string values with `EFFECTIVE_SELECTION_INVALID`.
It also rejects carriage returns. Arguments come from the existing execution
binding/adapter arguments; prompt content is irrelevant.

All five executable adapters explicitly merge these markers over the base
delegate environment. pi/opencode retain their existing Ollama forwarding.
All five supervised adapters build a frozen `newSessionArgv`, pass that exact
array to `tmuxSync`, and return it in dry-run and live mode. Markers are
separate tmux `-e` arguments, absent from the CLI launch command.

The service requires `newSessionArgv` in its exact result fields and validates
a plain string array, `new-session`, exactly one matching `-s` target and
exactly one matching `-e` entry for each server-owned marker. It reads array
data descriptors, rejects proxies/accessors/holes, and returns a frozen
copy. Existing selection identity, write-access and launch checks remain.

Three service test fixtures now emit the required argv. The authority suite
also includes the new result field in its missing/accessor/non-scalar checks,
supplies execution values for its scalar-test baseline, and updates its
positive target override to keep argv consistent with that target.

The new contract document is linked from `gateway/README.md`. It states the
empty-task rule, separate Gateway trace label, and **informational, never
authority** semantics, with the requested shell check. Gemini adapter and
its two refusal test files are byte-identical to HEAD; no `policies/` diff.

## TDD RED

Before production edits, the named failing tests were added in
`worker_env.test.js`, `agent_service_worker_env.test.js` and
`tmux_client.test.js`:

- `workerEnv exports only the informational markers and clears absent tasks`;
  newline/NUL rejection cases for all three fields.
- Per-provider `delegate child env carries role/trace/task and overrides stale
  inherited markers`, including null task and pi/opencode Ollama checks.
- Per-provider `dry-run spawn returns frozen newSessionArgv with the marker`.
- Per-provider delegate/spawn invalid-marker rejection cases.
- `marker-bearing spawn result is accepted and returned with newSessionArgv`,
  task-less and server-bound; malformed command, array, target, missing,
  mismatched and duplicate marker cases. Every corruption test first requires
  the same binding/adapter to succeed before corrupting the result.
- `buildNewSessionCmd emits -e for each marker without shell interpolation`:
  RED exit 1, 0 passed / 1 failed / 0 skipped (`tmux-red.log.gz`).

Initial sandbox direct runs recorded 0/37 worker and 0/18 service tests
passing. Codex fake-child runs were affected by sandbox EPERM, so those
results are not clean host RED evidence for its child environment.

After implementation, five supplementary tests were added:
`<provider> live spawn passes exactly its returned newSessionArgv to tmux`.
They use a fake tmux executable to record actual received argv, while stubbing
composer submission/fresh-Claude observation; no provider CLI is launched.

Clean baseline reproduction: copied tests/source into
`/tmp/ao-a01-red-7q31q8ju`, restored every changed production source from
the base HEAD, and linked dependencies, policies and the profile contract
read-only. `node --test tests/gateway/worker_env.test.js
tests/gateway/agent_service_worker_env.test.js` on the host exited 1:
**0 passed / 60 failed / 0 skipped**, archived as
`A_0_1-1-host-red-complete.log.gz`. The failures show absent helper, stale
delegate markers, absent spawn argv and missing invalid-value rejection.

## TDD GREEN and focused verification

Final host command (exit 0), archive `A_0_1-1-focused-green.log.gz`:

```bash
node --test tests/gateway/worker_env.test.js tests/gateway/agent_service_worker_env.test.js tests/gateway/tmux_client.test.js tests/gateway/claude_adapter.test.js tests/gateway/codex_adapter.test.js tests/gateway/codex_supervised.test.js tests/gateway/antigravity_adapter.test.js tests/gateway/gemini_delegate.test.js tests/gateway/gemini_supervised.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/orchestrator_profile_runtime.test.js tests/gateway/orchestrator_profile_authority.test.js tests/gateway/tool_agent_model.test.js tests/gateway/agent_service_write_access.test.js tests/gateway/cli_write_access.test.js
```

**340 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo**.
The sheet's narrower command initially passed 127/127, before supplementary
transport tests and coupled fixture corrections (`focused-initial.log.gz`).

Changed-source ESLint on the host exited 0 with no output, from `gateway/`:

```bash
node node_modules/eslint/bin/eslint.js --config eslint.config.js src/adapters/base_adapter.js src/adapters/tmux_client.js src/adapters/claude_adapter.js src/adapters/codex_adapter.js src/adapters/antigravity_adapter.js src/adapters/pi_adapter.js src/adapters/opencode_adapter.js src/services/agent_service.js
```

`git diff --check`: exit 0. Candidate files and archived evidence are bound
by the manifest. No full `bash scripts/ci.sh` was run: the requested handoff
is after focused checks; the orchestrator owns the final full gate and review.

## Attributed intermediate failures

- `dependency-failure.log.gz`: fresh worktree lacked `better-sqlite3`.
  Fixed with the profile's existing main-tree `gateway/node_modules` symlink;
  no dependencies installed or lockfiles changed.
- `red.log.gz`: sandbox child runner failed without assertion details.
  Direct assertion logs and later clean host RED distinguish it from TDD RED.
- `host-red.log.gz`: first scratch baseline lacked
  `gateway/contracts/orchestrator-profile-v1.json`. Added the read-only link;
  only `host-red-complete.log.gz` is the complete baseline reproduction.
- `contract-initial.log.gz`: 153 passed / 16 failed, due to old spawn mocks
  missing the new field. `contract-green.log.gz`: intermediate 200 passed /
  6 failed, due to a fixture-only baseline lacking role/trace and a positive
  target override lacking corresponding argv. Both corrected in the final
  340/340 run; neither intermediate failure is discarded.
- Sandbox lint attempt emitted stream-fd permission errors; the independent
  host lint invocation above returned exit 0 without those errors.
- The user declined a combined host rewrite/test command. Inspection showed
  no fixture edits, supplementary tests or result log from that command.
  Fixture changes were subsequently made with reviewable sandbox
  `apply_patch`; host checks were requested separately. **No result from the
  declined command is claimed.**

## Acceptance coverage and limits

- All five providers: actual delegate environments, dry-run emitted argv,
  live fake-tmux received argv and frozen result arrays are covered.
- Service: task-less and bound acceptance plus malformed array, missing field,
  first command, target and all three marker missing/mismatch/duplicate guards
  are covered by positive-controlled tests.
- Inherited marker overwrite, empty task, separate Gateway trace and retained
  pi/opencode delegate Ollama values are covered.
- Gemini refusal remains unchanged and passes; documentation covers the
  informational contract. Supervised Ollama forwarding remains out of scope.
- Real provider execution/environment observation, full gate, independent
  verdict, commit and integration remain outstanding. The fake transport
  checks prove passed argv, not real provider/plugin consumption.

Independent reviewer: verify the manifest first, reproduce the focused checks,
and review against the sheet and operating memory. Write a fresh
`A_0_1-1_reviewed_OK.md` or `A_0_1-1_reviewed_KO.md`; the orchestrator owns
verdict indexing, full-gate execution and any later commit/integration.

# A/0/00 — Trial 1 implementation handoff

Status: implemented candidate, awaiting independent review. No verdict, integration,
promotion or release is claimed. No commit, staging, push, policy edit or full gate.

Exact base: `e42818c2b9d72eebc88d858965fafa45c0fa1417` (HEAD remains this object).
Worktree: `/home/carase/git/personal/AO/workspace/clones/wt-v6-a00-build`.
Assigned trace: `tr-v6-a00-build-929bea02-dfd0-4177-b620-e09ef9f75275`.
Assigned task: `ts-dee578ac-184b-4a3c-b699-ce50adcf8959`.
Review requested: separately assigned Claude Opus 5.5, medium. The coder has
not spawned a reviewer or issued a verdict; root must submit this candidate.

## Scope and decisions

Read the sheet, Stage A README, plan/README.md, profile and prior review index;
there was no A_0_0 trial. Read adapter exports, delegate/spawn callers, shared
preflight, binding, selection, cwd, registry and result utilities before changes.
Only five executable adapters changed. Gemini adapter and its refusal tests are
byte-for-byte equal to the base. `resolveCliWriteAccess` is the sole grant
predicate: only policy `allow` grants writing; approvals fail closed.
Service and adapters independently derive the target permission. Service exact
field lists and boolean/identity checks reject malformed adapter results.
`SESSION_STARTED` records the adapter's derived boolean.

The Kya profile reference and its acceptance/test requirement are stale:
`policies/profiles/kya/roles.json` does not exist at this base following A/0/02.
Synthetic registries verify writable reviewers, denied coders and approval
requirements without restoring personal defaults or changing policies.
Base planner denies `agent.spawn`, so existing policy denials remain in force;
this sheet does not grant spawning to a denied role.

Antigravity's bounded, cwd-guarded host probe exited 2 with CLI argument parsing
failure. Empty scratch directory is not proof of confinement. Both adapter
operations therefore fail closed for non-writers, including dry-run, through
existing POLICY_DENIED with the code.write policy decision. Writer opt-in bypass
is preserved. The non-writer builders encode plan mode without bypass but are
unreachable under the fail-closed check.

## TDD and verification

New intent suites: `cli_write_access.test.js` and
`agent_service_write_access.test.js`. They assert emitted child argv, supervised
launch flags, read-only ceiling, audit output, role-name independence, bound
and unbound target derivation, malformed boolean results, wrong-model rejection,
and non-writer Codex sandbox mismatch. Antigravity refusal asserts no child
witness file and no SESSION_STARTED event.

RED first: new tests executed before production changes, 23 failed / 1 passed.
The first sandbox attempt lacked dependencies; linking existing main-tree
node_modules resolved imports, but sandbox test children still failed opaquely.
Host RED demonstrated behavior failures. After correcting test fixture state,
excluded-path configuration and binding metadata, RED was reproduced against
exact base production files with candidate bytes restored in a finally block:
23 failed / 1 passed, exit 1. The passing ceiling case already existed at base.
Evidence: `evidence/A_0_0-1-red.txt`.

GREEN final host command:

```bash
node --test tests/gateway/cli_write_access.test.js tests/gateway/codex_adapter.test.js tests/gateway/codex_supervised.test.js tests/gateway/claude_adapter.test.js tests/gateway/antigravity_adapter.test.js tests/gateway/gemini_delegate.test.js tests/gateway/gemini_supervised.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/agent_service_write_access.test.js tests/gateway/orchestrator_profile_authority.test.js
```

226 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo; host exit 0.
Evidence: `evidence/A_0_0-1-green.txt`. Bound service tests also passed separately
24/24 before this final set. Existing adapter suites remain unchanged; the
shared authority suite's fake results/required field arrays gained writeAccess.

Scoped ESLint for the seven production files and two new suites passed.
Linting the touched existing authority suite additionally reports the existing
`no-useless-assignment` on `let validValue = null` (base line 705, candidate line
712); that initializer predates this candidate and was left untouched.
Policy validation: `/home/carase/git/personal/AO/.venv/bin/agent-run policy
validate --policies-dir policies` — OK, 6 agents, 6 repositories, 10 roles.
`git diff --check` passed. No newly introduced role-name conditional.
Full `bash scripts/ci.sh` explicitly deferred by operator while A05 is active;
this is not a full-gate success. The broader Gateway suite was not run.

## Caveats and residuals

Codex uses `-s read-only`, the provider's OS sandbox; tests verify real fake-child
argv and supervised launch construction, not live Codex filesystem enforcement.
Claude removes Edit/Write/NotebookEdit; Bash can write if headless settings
pre-allow it, and supervised sessions prompt the operator. Pi excludes bash via
its allowlist but has no OS sandbox. Opencode plan permits its own plan files
and an allowed shell may write. Antigravity plan behavior remains unverified;
non-writers are refused. Each adapter document states these limits.
No real provider availability or live tmux restriction smoke is claimed.

All old sheet path:line ranges (including abbreviated ranges) were reread at
exact base and are captured in `evidence/A_0_0-1-anchor-reverification.json`.
Several anchors are stale: config sandbox is at 218 rather than 212, tools
registration is at 38–43; the removed Kya file is explicitly absent. That
ledger preserves the actual text at every old anchor. Current implementation
anchors follow below.

## Exact changed pathspec and seal

```text
docs/adapters/antigravity.md
docs/adapters/claude-code.md
docs/adapters/codex.md
docs/adapters/opencode.md
docs/adapters/pi.md
gateway/src/adapters/antigravity_adapter.js
gateway/src/adapters/claude_adapter.js
gateway/src/adapters/codex_adapter.js
gateway/src/adapters/opencode_adapter.js
gateway/src/adapters/pi_adapter.js
gateway/src/core/policy_engine.js
gateway/src/services/agent_service.js
tests/gateway/orchestrator_profile_authority.test.js
tests/gateway/cli_write_access.test.js
tests/gateway/agent_service_write_access.test.js
```

Additional trial evidence files: `evidence/A_0_0-1-{red,green,lint,policy,
antigravity-probe}.txt`, `evidence/A_0_0-1-anchor-reverification.json`,
`evidence/A_0_0-1-files.json`. SHA-256 manifest covers every candidate file and
these raw evidence inputs. This handoff is created once and must not be edited.
Corrections require a new trial. No review README verdict entry has been added.

## Current anchors

- `gateway/src/adapters/antigravity_adapter.js:43` — `function buildAntigravityArgs(config, { model = null, reasoningEffort = null, writeAccess, prompt = null } = {}) {`
- `gateway/src/adapters/antigravity_adapter.js:57` — `function buildAntigravityLaunch(config, { model = null, reasoningEffort = null, writeAccess } = {}) {`
- `gateway/src/adapters/antigravity_adapter.js:218` — `const writeAccess = resolveCliWriteAccess({ agent: this.id, role, repo }, this.registries);`
- `gateway/src/adapters/antigravity_adapter.js:337` — `const writeAccess = resolveCliWriteAccess({ agent: this.id, role, repo }, this.registries);`
- `gateway/src/adapters/claude_adapter.js:34` — `function buildClaudeArgs({ model = null, reasoningEffort = null, writeAccess, prompt = null } = {}) {`
- `gateway/src/adapters/claude_adapter.js:50` — `function buildClaudeLaunch(config, { model = null, reasoningEffort = null, writeAccess } = {}) {`
- `gateway/src/adapters/claude_adapter.js:213` — `const writeAccess = resolveCliWriteAccess({ agent: AGENT_ID, role, repo }, this.registries);`
- `gateway/src/adapters/claude_adapter.js:328` — `const writeAccess = resolveCliWriteAccess({ agent: AGENT_ID, role, repo }, this.registries);`
- `gateway/src/adapters/codex_adapter.js:40` — `function buildCodexExecArgs({ model, reasoningEffort, serviceTier, sandbox, cwd, prompt }) {`
- `gateway/src/adapters/codex_adapter.js:49` — `function buildCodexLaunch({ bin, model, reasoningEffort, serviceTier, sandbox, cwd }) {`
- `gateway/src/adapters/codex_adapter.js:255` — `const writeAccess = resolveCliWriteAccess({ agent: AGENT_ID, role, repo }, this.registries);`
- `gateway/src/adapters/codex_adapter.js:261` — `const sandbox = writeAccess ? codexSandbox(this.config) : "read-only";`
- `gateway/src/adapters/codex_adapter.js:391` — `const writeAccess = resolveCliWriteAccess({ agent: AGENT_ID, role, repo }, this.registries);`
- `gateway/src/adapters/codex_adapter.js:397` — `const sandbox = writeAccess ? codexSandbox(this.config) : "read-only";`
- `gateway/src/adapters/opencode_adapter.js:50` — `function buildOpencodeArgs(config, { model = null, reasoningEffort = null, writeAccess, prompt = null } = {}) {`
- `gateway/src/adapters/opencode_adapter.js:61` — `function buildOpencodeLaunch(config, { model = null, reasoningEffort = null, writeAccess } = {}) {`
- `gateway/src/adapters/opencode_adapter.js:233` — `const writeAccess = resolveCliWriteAccess({ agent: this.id, role, repo }, this.registries);`
- `gateway/src/adapters/opencode_adapter.js:350` — `const writeAccess = resolveCliWriteAccess({ agent: this.id, role, repo }, this.registries);`
- `gateway/src/adapters/pi_adapter.js:40` — `function buildPiArgs({ model = null, reasoningEffort = null, writeAccess, prompt = null } = {}) {`
- `gateway/src/adapters/pi_adapter.js:50` — `function buildPiLaunch(config, { model = null, reasoningEffort = null, writeAccess } = {}) {`
- `gateway/src/adapters/pi_adapter.js:221` — `const writeAccess = resolveCliWriteAccess({ agent: this.id, role, repo }, this.registries);`
- `gateway/src/adapters/pi_adapter.js:338` — `const writeAccess = resolveCliWriteAccess({ agent: this.id, role, repo }, this.registries);`
- `gateway/src/core/policy_engine.js:359` — `export function resolveCliWriteAccess({ agent, role, repo }, registries) {`
- `gateway/src/services/agent_service.js:264` — `const SPAWN_RESULT_FIELDS = Object.freeze([`
- `gateway/src/services/agent_service.js:274` — `const ADAPTER_RESULT_FIELDS = Object.freeze({`
- `gateway/src/services/agent_service.js:362` — `function configuredCodexSandbox(config) {`
- `gateway/src/services/agent_service.js:438` — `function assertAdapterSelectionResult(`
- `gateway/src/services/agent_service.js:572` — `const writeAccess = resolveCliWriteAccess({`
- `gateway/src/services/agent_service.js:665` — `const writeAccess = resolveCliWriteAccess({`

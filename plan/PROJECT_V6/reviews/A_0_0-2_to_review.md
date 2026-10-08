# A/0/00 — Trial 2 correction handoff

Status: candidate corrected after independent trial1 KO; awaiting fresh
independent review. This is not a verdict, integration or release claim.

Correction contract: `A_0_0-1_reviewed_KO.md`, committed in review-only
`ecf3ab37e6c1e952d568e3c99f62682fafef60f9` (current HEAD).
Original implementation base remains
`e42818c2b9d72eebc88d858965fafa45c0fa1417`.
Worktree: `/home/carase/git/personal/AO/workspace/clones/wt-v6-a00-build`.
Assigned trace: `tr-v6-a00-build-929bea02-dfd0-4177-b620-e09ef9f75275`.
Assigned task: `ts-dee578ac-184b-4a3c-b699-ce50adcf8959`.
Root should submit this trial for a fresh independent Claude Opus 5.5 medium
review. The coder has not spawned a reviewer or issued a verdict.

## Corrections against findings 1–4

1. **Withdrawal of incorrect trial1 claim.** The Kya profile is present;
   `policies/profiles/kya/roles.json:57–67` grants the reviewer `code.write`.
   A/0/02 removed personal repository registrations, not these reusable roles
   and agents. Trial1's assertion that the profile was absent/stale, including
   its anchor commentary, was incorrect. Synthetic tests remain useful but do
   not replace real-profile coverage. The trial1 files remain immutable.
   The new test uses `loadRegistries` on the actual Kya profile without any
   agent, role or repo override. For each of all five executable providers it
   verifies reviewer writeAccess=true, real fake-child delegate argv, supervised
   launchCommand and audit output. Writer flags are retained, including Codex
   workspace-write, Claude with no disallowedTools, pi with no restricted tools,
   opencode with --auto and no plan agent, and antigravity launching with its
   opt-in permission bypass. No repo is supplied to avoid excluded-path exposure
   from the scratch cwd; no registry changes are made.

2. **Actual base-policy emitted output.** Twenty new cases use the actual
   base registry unchanged: all five providers × reviewer/editor/planner/coder.
   Reviewer/editor delegate and spawn emit exact read-only command shapes for
   Codex/Claude/pi/opencode; antigravity rejects both operations with
   POLICY_DENIED, no child argv witness and no SESSION_STARTED. Planner delegate
   emits restrictions (antigravity fails closed); planner spawn retains the
   existing role.deny_action denial. Coder delegate and spawn compare full
   writer argv/launch strings, including Claude's headless dontAsk. These tests
   independently assert policy booleans and emitted output; they do not only
   inspect fixtures. Along with the five Kya cases, the correction adds 25
   executable tests named `profile policy ...`.

3. **Placement.** The original named adapter suites remain unchanged because
   the equivalent new coverage is consolidated in cli_write_access.test.js.
   This placement was accepted as non-blocking by trial1 review.

4. **Exact lint evidence.** `evidence/A_0_0-2-lint.txt` records each command,
   cwd, output and exit code. Seven production files pass the existing Gateway
   ESLint config (exit 0). The Gateway config's file patterns do not
   automatically cover root tests/gateway. The recorded ESLint API runner
   reuses the full existing Gateway rule set and rebases its file globs to that
   directory without disabling any rules. It confirms 64 active rules,
   including no-unused-vars and no-useless-assignment, for both new test files;
   both pass with zero errors and warnings (exit 0). The existing authority
   suite has the unchanged pre-existing no-useless-assignment error on
   `let validValue = null` (candidate line 712); the explicit run exits 1 and
   is recorded without claiming it passed. No lint configuration is edited.

## RED, GREEN and preservation

RED was executed before GREEN of the corrected candidate. The new cases ran
against a disposable `/tmp/ao-a00-trial2-red-*` git archive of exact base
`e42818c`, with only the updated test suite copied in and existing dependencies
linked. Working-tree production files were never replaced. Command:

```bash
/usr/bin/node --test --test-name-pattern='profile policy' tests/gateway/cli_write_access.test.js
```

Result: 25 tests, 0 pass, 25 fail, 0 skipped/cancelled/todo, exit 1.
`evidence/A_0_0-2-red.txt` records exact cwd/base/PATH/command and output;
`evidence/A_0_0-2-red-runner.py` preserves the scratch-export procedure.

GREEN used the exact sheet Verification list on the host:

```bash
node --test tests/gateway/cli_write_access.test.js tests/gateway/codex_adapter.test.js tests/gateway/codex_supervised.test.js tests/gateway/claude_adapter.test.js tests/gateway/antigravity_adapter.test.js tests/gateway/gemini_delegate.test.js tests/gateway/gemini_supervised.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/agent_service_write_access.test.js tests/gateway/orchestrator_profile_authority.test.js
```

Result: 251 tests, 251 pass, 0 fail, 0 skipped/cancelled/todo, exit 0.
`evidence/A_0_0-2-green.txt` records cwd/command/output/exit.
`git diff --check` passes. No production defect was exposed; production and
adapter docs are byte-identical to the trial1 candidate. All committed trial1
review/evidence files match ecf3ab3, and all other files in the trial1 hash
manifest retain their recorded hashes. Only cli_write_access.test.js changed.
`evidence/A_0_0-2-preservation.json` records that comparison. Policies and Gemini
adapter/refusal tests still match original implementation base byte-for-byte.

The new correction pathspec is exactly:

```text
tests/gateway/cli_write_access.test.js
plan/PROJECT_V6/reviews/A_0_0-2_to_review.md
plan/PROJECT_V6/reviews/evidence/A_0_0-2-red.txt
plan/PROJECT_V6/reviews/evidence/A_0_0-2-red-runner.py
plan/PROJECT_V6/reviews/evidence/A_0_0-2-green.txt
plan/PROJECT_V6/reviews/evidence/A_0_0-2-lint.txt
plan/PROJECT_V6/reviews/evidence/A_0_0-2-lint-runner.mjs
plan/PROJECT_V6/reviews/evidence/A_0_0-2-preservation.json
plan/PROJECT_V6/reviews/evidence/A_0_0-2-files.json
```

The fresh SHA-256 manifest `evidence/A_0_0-2-files.json` seals all candidate
paths from trial1 and the new evidence inputs; the handoff and manifest receive
separate hashes below. No trial1 file has been overwritten. No commit, staging,
policy edit, full gate, push or tag. Root owns review submission and integration.

## Unchanged limits and follow-up

The full gate remains explicitly deferred while A05 sessions are active;
there is no broader Gateway/full-gate success claim. No new live provider or
tmux enforcement smoke was run. Codex tests establish OS sandbox flag selection,
not a measured live filesystem-enforcement experiment. Tool-level residuals
for Claude/pi/opencode and fail-closed antigravity remain as documented in
trial1. The antigravity headless writer builder's pre-existing --print argument
shape can hit the parsing error seen in the probe; flag for follow-up, without
changing it in this correction. No policy validation rerun was needed for this
test-only correction; trial1's explicit validation remains historical evidence.

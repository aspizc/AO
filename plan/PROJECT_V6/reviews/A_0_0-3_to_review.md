# A/0/00 — Trial 3 coupled-contract and terminal-fixture correction

Status: corrected test-only candidate, awaiting independent review. The committed
feature gate remains RED. No integration, promotion or release is claimed.

Original implementation base: `e42818c2b9d72eebc88d858965fafa45c0fa1417`.
Committed reviewed candidate: `8c7eb3a97d94fcf351b58b1ee4cfa4d3b23b0cc3`.
Current HEAD: `1f29faf22ba1a0dae25dbad74df5871a43e79b19` (root's gate evidence
commit; production code is unchanged from 8c7eb3a).
Worktree: `/home/carase/git/personal/AO/workspace/clones/wt-v6-a00-build`.
Assigned task: `ts-dee578ac-184b-4a3c-b699-ce50adcf8959`.
Assigned trace: `tr-v6-a00-build-929bea02-dfd0-4177-b620-e09ef9f75275`.

Root: please assign a fresh independent Claude Opus 5.5 medium reviewer session
for this trial and its sealed bytes. Coder has not issued a verdict, spawned
reviewers, committed, pushed, tagged or changed policies. Root owns the full gate
and integration. No full-gate rerun was performed.

## Bound gate outcome

Read `/tmp/a00-reviewed-feature-gate.log` and root's
`A_0_0-root-feature-gate-red.md`. The final outcome is failed, exit 1:
2,993 passed, 5 failed, 12 skipped, 3,010 total. All failures were Gateway tests;
nine PostgreSQL and three Gateway/Temporal integrations were skipped.
The raw final log digest and complete machine summary are bound in
`evidence/A_0_0-3-preservation.json`. Root archived the raw log in
`evidence/A_0_0-reviewed-feature-gate-red.txt.gz`. This original failure is not
superseded by focused test success.

## Diagnosis of all five failures

1. **guarded_paste_rechecks_mode_at_write.** The failure occurs in `mode()`'s
   capture-pane acknowledgment, before guarded paste runs. The JS writer used
   writeFileSync on the live mode-control file; opening it truncates it before
   bytes are written. The concurrently running Python terminal witness reads
   the empty record, fails `sequence, enabled = mode.split(":")` with
   `ValueError: not enough values to unpack (expected 2, got 1)`, and exits.
   The pane disappears, explaining `no current target`. This is an attributed
   fixture publication race inherited from A/0/04, not a permission defect or
   an unexplained flaky result. A controlled regression retains the dead pane,
   stages a partial write for 150 ms while the real Python witness reads, and
   observes the traceback. It fails on the old writer. Publishing a complete
   `mode-next` file via rename keeps the visible record intact and the witness
   alive. The regression then verifies guarded paste refusal emits no bytes.
   Only the test fixture writer changes; Python, Gateway, tmux client and vendor
   runtime are unchanged.

2–3. **Runtime delegate/spawn selection-identity tests.** Both mock results
   lack the exact-contract writeAccess field and are rejected before selection
   identity assertions. Mocks now derive writeAccess for the target agent from
   effectiveSelection.agent, role and repo, and the Codex delegate mock uses
   the corresponding sandbox. Tests assert the accepted coder boolean as well
   as unchanged selection identity across runtime consumers.

4. **Default-model delegate tool test.** Its mock also lacks writeAccess;
   the tool returns a policy error, so exitCode is undefined. The shared tool
   fixture now reports the target-derived boolean and sandbox. The default
   test asserts success and writeAccess=true. Other selection-plumbing tests
   now assert accepted tool results too, preventing argument-only false passes.
   Claude's actual non-writer fixture asserts writeAccess=false.

5. **Every-provider spawn tool test.** The original test registers mock
   adapters; its immediate rejection is also the missing writeAccess result
   field. Merely updating that field would make the mock Antigravity reviewer
   succeed while the real adapter intentionally refuses this seat. The success
   expectation therefore now uses the base-policy coder/writer seat. A separate
   tool test installs the real Antigravity adapter in dry-run and verifies the
   reviewer returns POLICY_DENIED / role.deny_action, with neither
   SESSION_STARTED nor AGENT_MODEL_RESOLVED. No weakening of production refusal.

## RED / GREEN evidence

Before fixture corrections, focused runtime and tool suites reproduced the four
contract failures: 24 tests, 20 passed, 4 failed, exit 1.
`evidence/A_0_0-3-contract-red.txt` records command, cwd, output and status.

The controlled mode-publication regression was written before the atomic-writer
fix and executed with pinned tmux: 1 test, 0 passed, 1 failed, exit 1; its raw
output includes the Python traceback and dead pane. Evidence:
`evidence/A_0_0-3-mode-red.txt`. The initial default-tmux command was denied and
not counted as execution evidence. The authorized command explicitly prepended
`/tmp/ao-a04-f1-impl/build2/bin` to PATH, checked `tmux -V` equals
`tmux 3.6a-agents.3`, and set private
`TMUX_TMPDIR=/tmp/ao-a00-trial3-tmux-red`. The existing owned fixture creates a
fresh private socket and foreground server and retires/reaps its own panes;
no commands address user tmux sessions and no persistent approval was used.

The first corrected-suite attempt is preserved as
`evidence/A_0_0-3-attempt1-red.txt`: 32 tests, 25 passed, 7 failed. All seven
were attributable to a mistaken fixture call passing adapter args directly to
resolveCliWriteAccess: service adapter args carry target agent only in
`effectiveSelection.agent`. Correcting the mock context fixed these fixture
errors; no production change or unexplained retry.

Final focused host command, with the same verified pinned runtime and private
TMUX_TMPDIR:

```bash
node --test tests/gateway/guarded_paste.test.js tests/gateway/orchestrator_profile_runtime.test.js tests/gateway/tool_agent_model.test.js tests/gateway/cli_write_access.test.js tests/gateway/agent_service_write_access.test.js tests/gateway/codex_adapter.test.js tests/gateway/codex_supervised.test.js tests/gateway/claude_adapter.test.js tests/gateway/antigravity_adapter.test.js tests/gateway/gemini_delegate.test.js tests/gateway/gemini_supervised.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/orchestrator_profile_authority.test.js
```

283 tests, 283 passed, 0 failed, 0 skipped/cancelled/todo, exit 0.
`evidence/A_0_0-3-focused-green.txt` binds the exact command/environment/output.
This is focused GREEN only; the feature/full gate is still RED.

Lint command: `node plan/PROJECT_V6/reviews/evidence/A_0_0-3-lint-runner.mjs`.
It reuses the repository's full Gateway ESLint rules with root test-directory
file globs; 64 effective rules for each of the three changed tests, zero errors
and warnings, exit 0. Runner and exact command/cwd/output/status are preserved
in `evidence/A_0_0-3-lint-runner.mjs` and `evidence/A_0_0-3-lint.txt`.
`git diff --check` passes. No policy validation or live-provider test was needed
or claimed for these test-only corrections.

## Exact pathspec, hashes and preservation

Tracked corrections only:

```text
tests/gateway/guarded_paste.test.js
tests/gateway/orchestrator_profile_runtime.test.js
tests/gateway/tool_agent_model.test.js
```

New immutable evidence: this handoff and
`evidence/A_0_0-3-{contract-red,mode-red,attempt1-red,focused-green,lint}.txt`,
`evidence/A_0_0-3-lint-runner.mjs`,
`evidence/A_0_0-3-preservation.json`, `evidence/A_0_0-3-files.json`.
The fresh SHA-256 manifest covers the full A/0/00 candidate source/docs/tests
and these trial3 evidence inputs. Trial1 and trial2 committed handoffs/verdicts/
evidence match current HEAD byte-for-byte; preservation JSON lists their
hashes. Gateway production, adapter docs, policies and Gemini refusal tests
match 8c7eb3a. No earlier trial file was overwritten.

## Remaining limits and authority

Root must coordinate and authorize any subsequent full-gate run and assess the
12 declared skips. Independent trial3 review has not happened. Neither focused
success nor the earlier trial2 source-review OK closes the RED full gate.
The documented provider residuals and lack of live provider/sandbox enforcement
measurements remain unchanged. This correction does not extend A/0/00's scope.

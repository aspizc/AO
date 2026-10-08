# V6 A/0/06 — Trial 1 review request

Candidate: uncommitted changes in `wt-v6-a06` from
`7982e422577ad6dfb37ef0c7b1e3c8433735430a`. No independent verdict, integration,
promotion or release is claimed. No commit, staging, push, policy edit or
subagent was performed. Root owns independent review, the live check and the
full gate with required Redis. This request is created once, never overwritten.
The candidate file hashes are in
[`A_0_6-1-candidate-sha256.json`](evidence/A_0_6-1-candidate-sha256.json).

## Scope and behavior

- Pure adapter recognizers cover Codex command/trust and Claude Bash permission
  dialogs. Historical reconstructed fixtures remain in the test, separately
  labeled. New fixtures preserve operator-provided raw captured bytes except
  private absolute paths, replaced with benign ASCII paths of equal length.
  Environment/Reason, optional `p`, rendered multiline commands, Folder access,
  and Claude 2.1.294's four choices are tested. Ambiguous layouts fail closed.
- A supervised watcher starts after non-dry-run spawn or view, polls the current
  visible pane each second, and stops on inactive sessions/traces or registry
  close. It verifies session/task/trace identity. Assigned pending tasks are
  supported; completed/cancelled tasks are not. `agent.view` surfaces the
  approval ID, exact rendered command, kind, target and options.
- Requests use the existing non-blocking approval service. Exact role-registry
  scopes plus explicit canonical underlying-action grants and
  `AGENTS_AUTOAPPROVE` decide automation deterministically. No default scopes
  were added. Restricted contexts, required approvals, role denies and
  underlying `NEVER_AUTO` actions cannot be automatically answered. Unmapped
  human-approved commands conservatively require write authority. A read-only
  role needs an exact allowed underlying-action scope. Unknown menus always
  require manual human intervention, even after a granted approval.
- A distinct answer path carries an internal one-use permit. It rechecks full
  pane bytes, command, options/selection, target pane/server/process identity,
  approval status/context and current role policy. A database compare-and-set
  consumes the decision before transport. A disappeared/changed prompt gets
  no input, and observing disappearance invalidates its former approval even
  if the same text returns. Replay and uncertain transport are not retried.
- Codex commands receive only literal `y`. Trust and Claude permission dialogs
  receive one Enter on the rechecked selected first choice. No `p`, persistent
  access option, numeric-choice-plus-Enter sequence, or switch-to-auto-mode
  option is sent. Composer-only `submitPrompt` is not used. Attempt/completed
  audit events include command text, approval ID, target and decider. Human
  approval notes no longer replace these requests' bound context.
- Canonical actions and operator scope documentation were added; CI inventory
  hashes were refreshed without changing gate requirements or skip budgets.

## TDD RED evidence

All sheet-required cases were written before implementation. Initial host RED:
12 tests, 0 passed, 12 failed, 0 skipped, in
[`A_0_6-1-red-host.log`](evidence/A_0_6-1-red-host.log). Required names:

1. `codex command prompt is recognised with its exact command`
2. `codex trust prompt is recognised`
3. `claude permission dialog is recognised`
4. `an auto-approvable command is answered y once and audited`
5. `a NEVER_AUTO action is never answered`
6. `a command outside the role grant waits for approval_respond`
7. `the p option is never sent`
8. `an unknown prompt is surfaced, not answered`
9. `changed or disappeared approved prompt receives no keys`
10. `replayed approval does not send a second answer`

Additional RED before each correction:

- [`A_0_6-1-transport-red.log`](evidence/A_0_6-1-transport-red.log): caller-supplied
  authorization/key rejection failed; 14 passed, 1 failed.
- [`A_0_6-1-lifecycle-red.log`](evidence/A_0_6-1-lifecycle-red.log): approval-ID
  surfacing and observed-disappearance invalidation failed; 15 passed, 2 failed.
- [`A_0_6-1-recorded-red.log`](evidence/A_0_6-1-recorded-red.log): all three real
  capture layouts and one-Enter answer case failed; 17 passed, 4 failed.
- [`A_0_6-1-pending-task-red.log`](evidence/A_0_6-1-pending-task-red.log): a running
  supervised session over an assigned pending task was not watched;
  21 passed, 1 failed.

The final 22-case suite and sanitized fixtures were also replayed against an
untouched archive of baseline `7982e42`, using the existing Node dependencies:
`node /tmp/a06-baseline-red/tests/gateway/session_prompt.test.js`.
All 22 failed, 0 passed/skipped:
[`A_0_6-1-final-tests-baseline-red.log`](evidence/A_0_6-1-final-tests-baseline-red.log).
The original RED logs and reconstructed fixtures remain historical evidence.

## GREEN and verification

Final focused command (host; pinned tmux `3.6a-agents.3`):

```bash
PATH="/tmp/a06-test-bin:$PATH" A04_TEST_TMUX=/tmp/a06-test-bin/tmux \
node --test tests/gateway/*prompt*.test.js \
  tests/gateway/autoapprove_mechanism.test.js \
  tests/gateway/approval_service.test.js tests/gateway/tool_agent.test.js \
  tests/gateway/tool_approval.test.js tests/gateway/approval_state.test.js \
  tests/gateway/tool_catalog.test.js
```

273 tests, 273 passed, 0 failed/cancelled/skipped/todo:
[`A_0_6-1-green-recorded.log`](evidence/A_0_6-1-green-recorded.log).
The 22 new cases are included. Earlier pinned focused verification passed
241/241, before adding the recorded capture cases. The initial focused run with
stock tmux 3.6 failed one existing composer-capture test (240/241); its missing
runtime guard is retained in `A_0_6-1-green.log`, not represented as success.

ESLint on all changed/new Gateway source files passed (exit 0):
[`A_0_6-1-lint.log`](evidence/A_0_6-1-lint.log).
`git diff --check` passed (exit 0):
[`A_0_6-1-diff-check.log`](evidence/A_0_6-1-diff-check.log).
`python3 scripts/ci_gate.py --validate-only` passed with no manifest errors;
this is inventory validation, not a test/gate pass:
[`A_0_6-1-inventory-validation.log`](evidence/A_0_6-1-inventory-validation.log).

## Root-owned checks and limitations

The full `bash scripts/ci.sh` was NOT executed: its escalation was cancelled
before a CI log existed, and the operator then explicitly assigned that gate to
root after independent review with required Redis. No full-gate totals or skip
budget success is claimed. No provider-answer live acceptance or independent
review was run by this coder. Root must verify the policy-approved test prompt
and non-granted wait case with the candidate runtime.

The recheck and answer are synchronous separate tmux commands, not a
server-side atomic compare-and-send. Audit/approval consumption occurs between
capture and delivery; child output could change concurrently. Root should
explicitly assess this remaining transport race against the sheet's immediate
recheck requirement. Rendered command rows preserve line breaks instead of
inventing shell source from terminal wrapping. The full snapshot binds
Environment/Reason, persistent-choice labels and all rendered padding too.
The watcher requires the first one-time choice selected; otherwise it surfaces
an unknown menu. Approval bindings do not survive watcher restart; old approval
IDs cannot answer a newly attached session. New observation/request is needed.

Evidence logs under `reviews/evidence/` are ignored by the repository's default
gitignore; root must explicitly include the intended evidence when committing
reviewed work. Captured pane fixtures intentionally preserve trailing spaces.

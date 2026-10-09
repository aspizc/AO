# A/0/06 operator response — trial 2 implementation handoff

Base HEAD: `343c4a7cef9431edca82dbeb3a18f318ad8d3d20` (`343c4a7`).
Candidate is uncommitted. This is coder verification, not an independent verdict.
Contract: `A_0_6-operator-1_reviewed_KO.md`, Corrections 1–2 and notes 1 and 4,
as scoped by `/home/carase/git/personal/AO/workspace/briefs/a06-operator-coder-2.md`.

## Changes since trial 1

Only these three test files changed; all source files, the operator guide and
trial 1 evidence match their pre-trial-2 SHA-256 values:

- `tests/gateway/session_prompt_external.test.js`: retains the in-flight lost-CAS
  case and adds a sibling that consumes and finalizes answered/sent inside the
  intercepted UPDATE before the CLI statement runs. It asserts UPDATE changes=0,
  answered/sent and equality with the stored answer. The dead-owner test now calls
  the actual Node script after the terminal result and asserts its own exit 1.
  A granted answered/refused fixture independently asserts the Node exit 1.
  Owner IPC waits now time out after 15 seconds, reject early exit/error, and
  remove their listeners/timer. Teardown kills any still-running owner with
  SIGKILL and awaits its close/reaping; successful delivery also awaits exit 0.
- `tests/gateway/session_prompt_external_owner.mjs`: one 30-second overall
  deadline covers waiting for a grant and the synchronous blocked transport.
  Missing grants end with a diagnostic and process exit 1 instead of an
  indefinite interval. The blocked transport also checks that same deadline.
- `tests/cli/test_approve.py`: restores the original imports at lines 7–10.
  Its trial 1 tests are otherwise unchanged.

No source defect was exposed by the unmutated tests; no source change was made.
No other review notes or human-gated items were addressed. No sub-agents,
self-review, commit, staging, policy edit or `scripts/ci.sh` invocation occurred.

## Candidate SHA-256

The table covers the entire nine-file candidate inherited from trial 1,
including the three files corrected in this trial.

| File | SHA-256 | Since trial 1 |
|---|---|---|
| `gateway/src/services/approval_service.js` | `83fcfbf6a4d611c115d6deb51977f507cfe20751156dec5485ad60ef7c04b326` | unchanged |
| `gateway/src/services/session_prompt_service.js` | `11f0c7cebab578e9fa195e7878f2d92e53a4f13d63a3763fdde6f83a600cd58d` | unchanged |
| `gateway/scripts/approval-respond.mjs` | `c64f46f2080d5866ee8486d03fa1eb123d57b635105c1dea83b240383362da01` | unchanged |
| `gateway/src/core/repositories/approval_repo.js` | `5e95dd6aef0f2ce9dcd7aaae72dc4f4bbcc2b3d0ea31a718b594434379686993` | unchanged |
| `cli/src/agents_cli/main.py` | `467d88b3246c9f7a50e56e14460aa5a3b3c8d9f16b8150f0a7273a8048e15359` | unchanged |
| `docs/operator-guide.md` | `a1f865f155da1b14933061bd95a3b3c005e90f71af6a5395646298dae0f06e13` | unchanged |
| `tests/gateway/session_prompt_external.test.js` | `92ca6c8358b63500a5bbd8f3ca591d02bc10dbe433e5cf036d74756771f368c6` | changed |
| `tests/gateway/session_prompt_external_owner.mjs` | `a4fb722ea187186a9f060c77a2b5fae61f6849e19963bcda20770b610936721b` | changed |
| `tests/cli/test_approve.py` | `9a8ea4db1ff5c855e237d0aeaab74953f06298a235f343265a3ae5ab3090d493` | changed |

## RED against named mutants, then GREEN

Scratch tree: /tmp/a06-trial2-mutants-cf3x1eu1/tree. It was built using `git archive HEAD` plus
all nine candidate overlays and a symlink to the existing Gateway dependencies.
Each mutant was applied alone, tested, restored and SHA-256 checked. The final
scratch files were byte-compared with the candidate. No mutant entered the candidate.
The executable mutation driver and result summary are preserved as
`A_0_6-operator-2-mutant-driver.txt.gz` and `-mutant-summary.txt.gz`.

Command for each filtered run:
`node --test --test-name-pattern='<pattern>' tests/gateway/session_prompt_external.test.js`
with scratch cwd. Patterns and exact source transformations are in the driver.

| Case | Observed passed/failed/skipped | Exit | Wall time | Raw log suffix |
|---|---|---:|---:|---|
| Unmutated correction control (three target tests) | 3/0/0 | 0 | 10.85 s | control |
| Correction 1: re-read only when timeout CAS won | 0/1/0 | 1 | 0.21 s | red-reread |
| Correction 2(a): remove whole Node exit predicate | 0/1/0 | 1 | 10.70 s | red-node-predicate |
| Correction 2(b): Node success checks answered status only | 0/1/0 | 1 | 0.31 s | red-node-outcome |
| Restored correction control (same three tests) | 3/0/0 | 0 | 10.80 s | green-restored |

Correction 1 test name:
`external timeout rereads after losing CAS to an owner finalized answer and reports the stored delivery`.
The named mutant replaces the timeout branch with
`const won = repo.timeoutUnattemptedPrompt(latest); if (won) {...}` and uses
`const finalRow = won ? repo.getApproval(args.approvalId) : latest;`.
Observed RED: CLI reports uncertain while the owner finalized answered/sent;
the test fails at its explicit status comparison:

```text
+ 'uncertain'
- 'answered'
# pass 0
# fail 1
```

Correction 2(a) test name:
`dead-owner CLI grant exits nonzero and reports not_answered rather than a bare grant`.
The Python assertions still pass under this mutant; the new direct script assertion
fails with actual exit 0 versus expected 1. The already-terminal row avoids
another 10-second script wait.

Correction 2(b) test name:
`Node script rejects answered status unless the stored outcome is sent`.
The crafted granted prompt has `promptAnswer={status:"answered",outcome:"refused"}`.
The script returns that answer exactly, but the status-only mutant exits 0;
the direct exit assertion fails:

```text
Expected values to be strictly equal:
0 !== 1
# pass 0
# fail 1
```

These observations correct the two unsupported coverage claims in trial 1:
the finalized-CAS race now distinguishes re-read behavior, and the Node exit
predicate is observed independently of Python's success computation.
No production predicates were added in trial 2.

## Bounded regression and cleanup evidence

Two additional scratch-only mutants reproduced the reviewer's formerly hanging
cases, using only the existing owner-race test:

| Scratch mutant/probe | Passed/failed/skipped | Result | Wall time | Log suffix |
|---|---|---|---:|---|
| Remove external orphan bypass (`!external`) | 0/1/0 | exit 1, `owner IPC timeout` | 15.31 s | bounded-no-external |
| Remove owner tick `answer` | 0/1/0 | exit 1, `owner IPC timeout` | 15.31 s | bounded-no-tick-answer |
| Leave owner without a grant and await its exit directly | 1/0/0 | fixture exit 1, `overall deadline exceeded`; probe exit 0 | 30.36 s | owner-deadline |

The deadline probe temporarily changes only the scratch test to await owner exit,
so the fixture deadline is tested independently of the parent IPC timeout. That
scratch change is also restored. After all mutation and candidate runs a host
`/proc` scan observed `remaining_owner_fixture_pids: []` (`-cleanup.txt.gz`).
The cleanup assertions do not rely on a driver timeout to kill the owner.

## Candidate gates

Focused tests ran before the full Gateway suite. CLI and lint followed it.
Subprocess lanes ran outside the sandbox because its Node child execution had
previously returned EPERM/lost output. All commands used this worktree.
`PATH` prepended `/home/carase/git/personal/AO/.venv/bin`; CLI tests also used
`PYTHONPATH=cli/src`, and the cross-process fixture binds PYTHONPATH to this tree.

| Command | Passed | Failed | Skipped | Result / raw suffix |
|---|---:|---:|---:|---|
| `node --test tests/gateway/session_prompt_external.test.js tests/gateway/session_prompt.test.js tests/gateway/session_prompt_crash.test.js` | 52 | 0 | 0 | exit 0 / focused |
| `npm --prefix gateway test` | 2069 | 59 | 20 | **exit 1 / gateway** |
| `PYTHONPATH=cli/src /home/carase/git/personal/AO/.venv/bin/pytest -q tests/cli/test_approve.py` | 28 | 0 | 0 | exit 0 / cli |
| `npm --prefix gateway run lint` | N/A | N/A | N/A | exit 0 / eslint |
| `ruff check cli/src/agents_cli/main.py tests/cli/test_approve.py` (venv Ruff 0.15.22) | N/A | N/A | N/A | exit 0 / ruff |
| `git diff --check` | N/A | N/A | N/A | exit 0 / diff-check |

The full Gateway lane remains FAILED, with 0 cancelled; it is not credited as
GREEN. Its complete failures and 20 skips are retained in the raw log. Failures
include package-cwd missing registries and real tmux/transport checks that expect
`tmux 3.6a-agents.3` while observing `tmux 3.6`. No baseline rerun was used to
attribute every remaining failure; none was fixed outside this trial's scope.
The new direct Node tests and terminal lost-CAS case pass in the candidate lane.

An initial system Ruff 0.16.0 invocation reported I001 for the restored imports
(`-ruff-system.txt.gz`). The required original order remains intact; the project
venv Ruff 0.15.22 passes without changing it. Gateway lint has its existing
package scope and does not lint repo-root `tests/gateway` files; the focused
Node lane parses and executes those files.

## Limits and pending work

Full host `scripts/ci.sh`, pinned real tmux acceptance and real-provider acceptance
remain operator-owned and unrun by this coder. Delivery evidence here uses the
existing deterministic guarded transport fixture. Independent review, integration,
promotion and release are not claimed. Trial 1 files were not edited.

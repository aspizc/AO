# V6 A/0/06 — Trial 4 review request

Uncommitted candidate in `wt-v6-a06`, branch
`feat/V6-A-0-06-permission-prompts`, HEAD
`c0405b1dc9c19c505a61ed48e4244b4e0228baaf` (committed independent Trial 3 KO).
Implementation baseline remains `7982e422577ad6dfb37ef0c7b1e3c8433735430a`.
This is a coder handoff, not an independent verdict. Root owns fresh independent
review, live acceptance and full CI with required Redis.

## Scope: KO-1 only

Exactly three candidate files differ from the hash-verified Trial 3 input:

- `gateway/src/adapters/codex_adapter.js` and `claude_adapter.js`: literal
  double-space regex runs are written as ` {2}`. The control-character regex
  is replaced with an `Array.from(snapshot)` scan rejecting code points
  U+0000–U+0008 and U+000B–U+001F, preserving the previous accepted/rejected
  range and non-string handling.
- `gateway/src/adapters/session_prompt.js`: removed the unused initial value
  from `let outcome`. Every successful path and the catch path still assigns
  the same `sent`, `refused` or `uncertain` value before use.

There is no intended behavior change. No test, fixture, role/policy, lifecycle,
README, CI inventory or ESLint configuration change; no blanket `--fix`, rule
relaxation or suppression. Non-blocking review notes remain outside scope.

## Correction of prior lint claims

Trial 2 and Trial 3 lint evidence was **partial**. It did not establish that
the required `lint.gateway` lane passed on the entire candidate. Trial 3's
recorded three-file check covered only `approval_repo.js`, `approval_service.js`
and `session_prompt_service.js`. The prior claim of clean candidate lint was
unsupported; the full lane actually failed with 12 errors. This handoff
supersedes that claim without altering the immutable historical artifacts.
Only the full CI lane command below establishes the lint result for Trial 4.

## RED before edits

All 23 Trial 3 candidate hashes and its 10 evidence hashes matched the reviewed
manifest before the correction. Before any source edit:

```bash
npm --prefix gateway run lint
```

[Full lint RED](evidence/A_0_6-4-full-lint-red.log): **exit 1**, 12 errors,
0 warnings: two `no-control-regex`, nine `no-regex-spaces`, and one
`no-useless-assignment`. This reproduces independent KO-1 on the candidate.
The correction adds no behavior, so existing behavior tests remain unchanged.

## GREEN after edits

All commands ran on the host; pinned tmux was used for the focused and real
transport runs. Exact expanded argument vectors and exit codes are retained in
[command results](evidence/A_0_6-4-command-results.json).

```bash
npm --prefix gateway run lint

PATH="/tmp/a06-test-bin:$PATH" A04_TEST_TMUX=/tmp/a06-test-bin/tmux \
node --test tests/gateway/*prompt*.test.js \
  tests/gateway/autoapprove_mechanism.test.js \
  tests/gateway/approval_service.test.js tests/gateway/tool_agent.test.js \
  tests/gateway/tool_approval.test.js tests/gateway/approval_state.test.js \
  tests/gateway/approval_wait.test.js tests/gateway/tool_catalog.test.js

A04_TEST_TMUX=/tmp/a06-test-bin/tmux \
node --test tests/gateway/session_prompt_guard.test.js

node tests/gateway/session_prompt_crash.test.js
```

| Verification | Exact result | Evidence |
| --- | --- | --- |
| Full required Gateway lint | Exit 0, no ESLint errors or warnings | [Full lint GREEN](evidence/A_0_6-4-full-lint-green.log) |
| Focused suite including fixtures, recognizers and transport | 301 tests, 301 pass, 0 fail/cancelled/skipped/todo | [Focused GREEN](evidence/A_0_6-4-focused-green.log) |
| Standalone real pinned-tmux guard | 6 tests, 6 pass, 0 fail/cancelled/skipped/todo | [Real tmux GREEN](evidence/A_0_6-4-real-tmux-green.log) |
| Standalone crash/CAS/recovery | 3 tests, 3 pass, 0 fail/cancelled/skipped/todo | [Crash GREEN](evidence/A_0_6-4-crash-green.log) |
| `git diff --check` | Exit 0 | [Diff check](evidence/A_0_6-4-diff-check-green.log) |

The six real cases preserve zero input on command/trust/permission redraws and
exactly one guarded CR on unchanged selected first one-time choices. Crash
recovery still proves received hex `0d`, a pre-recovery in-flight marker and
attempting audit, uncertain recovery, zero replay inputs and zero answered
events. These results give no credit to full CI or actual-provider live checks.

## Immutable hashes and handoff boundary

- Trial 3 handoff SHA256:
  `8b0961e41676f5ec143f90b623aa915bfe3390260535af8c4ed8c40fa7795eed`.
- Trial 3 reviewed manifest SHA256:
  `8973a6484728e5b353a46af8dbc23a275587153e3de4313c53f2209c070a1842`.
- Trial 3 independent KO SHA256:
  `29a4b0d5b82dad85bf29fbfc1eb11269e8ac7fc644e508ae38e8aa409f2b763b`.
- Pinned tmux `3.6a-agents.3` SHA256:
  `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`.
- [Trial 4 candidate/evidence manifest](evidence/A_0_6-4-candidate-and-evidence-sha256.json)
  SHA256: `bd5c996404981df407a0324c4e53372c966ed3b9354b51652f773e9fa0ce94ee`.
  It binds all 23 candidate files, all seven new evidence files, the three-file
  Trial 3 delta, and the prior trial artifacts and evidence hashes.

Trials 1–3 remain unchanged. Their previously bound evidence hashes were
verified again. This handoff and the new evidence were exclusively created
and made read-only. No policies edits, commit, staging, push, subagents,
self-review or full `ci.sh` occurred. Root owns the fresh independent verdict
and deferred full CI/live acceptance.

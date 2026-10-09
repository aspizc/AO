# A/0/06 hygiene — trial 1 coder handoff

Date: 2026-10-09. Branch: `feat/V6-A-0-06-hygiene`.
Base HEAD: `838b4492c54dd86035d03181088bb37c7845ecb4`; base tree: `753723da33b6aec3865dbfeab87dff8b30c22c1a`.
Candidate: the uncommitted working tree identified by the two hashes below.
Status: implemented and verified by the coder; independent review pending.
This handoff is not a review verdict, integration, promotion or release claim.

Authority: `/home/carase/git/personal/AO/workspace/briefs/a06-hygiene-coder-1.md`.
Read the merged RED gate report, hygiene scanner and structure tests, A/0/06
sheet and its stage README, `plan/README.md`, orchestration profile and live-fix
review trail. No commit, sub-agent, self-review or `scripts/ci.sh` execution.
Only the two assigned tracked files changed; the remaining new files are this
requested handoff and its compressed evidence logs. Source, vendor, binaries,
pins and policies are unchanged.

## Exact correction and byte preservation

Replace `/home/tester/` with `/tmp/a06-fix/` in fixture lines 4, 16 and 20,
and in the expected command at test line 416. Each prefix is exactly 13 ASCII
characters/bytes. The complete command path remains 73 characters.
The scanner's HOME_PATH expression matches `/home/` and `/Users/`, so the
replacement is a non-home path accepted without allowlist changes.

The fixture remains 829 bytes and 24 rows. Comparing against HEAD proves its
bytes equal exactly three prefix substitutions, with no other byte changed.
The test file equals HEAD after exactly one substitution. All fixture row
lengths and newline positions are identical to HEAD. The 80-column pane shape
remains: row 4 is 80 columns; the persistent option on row 20 is 79 columns,
ends after the replacement prefix, and continues on row 21 with exactly five
leading spaces and the closing backtick plus `(p)`. The next word cannot fit
in the remaining column. No rewrapping occurred. Per-row counts and literal
rows are saved in `A_0_6-hygiene-1-wrap.txt.gz`.

## Changed file SHA-256

| File | SHA-256 |
|---|---|
| `tests/gateway/fixtures/session_prompts/codex-0.162-wrapped-command.txt` | `5f944b61b4801e99839a36d0f3331ad1761e1cdf894382e88c22ae55aff1ebc7` |
| `tests/gateway/session_prompt.test.js` | `49ddcaabb036d8751f5b9965ffc1734f40729de4969e76cc15fa951f8f229748` |

## RED and GREEN verification

- Base RED checker: `python3 scripts/check_public_hygiene.py`, exit 1,
  exactly four findings at the assigned locations (`red` log).
- Base RED structure: `/home/carase/git/personal/AO/.venv/bin/python -m pytest -q tests/structure/test_public_hygiene.py`,
  exit 1, 4 passed and 2 failed: `test_real_tree_has_no_unallowlisted_personal_paths`
  and `test_real_tree_public_registry_ids` (`red-structure` log).
- GREEN: same checker, exit 0, zero findings; same structure suite, exit 0,
  6 passed; `git diff --check`, exit 0 (`green-verified` log).
- Host F1: `node --test --test-concurrency=1 --test-reporter=tap --test-name-pattern="live Codex 0.162 persistent option|wrapped persistent option" tests/gateway/session_prompt.test.js`,
  exit 0, 2 passed, 0 failed/skipped/cancelled/todo (`f1-host` log).
  Tests: `live Codex 0.162 persistent option wraps without changing exact command or selecting p`
  and `wrapped persistent option remains fail closed for malformed continuation and menu`.
  They still verify exact recognized command, wrapped continuation, one guarded CR,
  no persistent-choice input and malformed-menu refusal.
- Host focused prompt lanes: exit 0, **528 passed, 0 failed, 0 skipped,
  0 cancelled, 0 todo**, with real pinned-runtime transport tests (`focused-host` log).
  Exact command:

```bash
node --test --test-concurrency=1 --test-reporter=tap \
  tests/gateway/session_prompt.test.js \
  tests/gateway/session_prompt_diagnostics.test.js \
  tests/gateway/session_prompt_guard.test.js \
  tests/gateway/session_prompt_transport.test.js \
  tests/gateway/session_prompt_external.test.js \
  tests/gateway/session_prompt_crash.test.js \
  tests/gateway/guarded_submit.test.js \
  tests/gateway/guarded_paste.test.js \
  tests/gateway/prompt_submission.test.js \
  tests/gateway/request_context_reattach.test.js \
  tests/gateway/process_supervisor_session_port_relay.test.js \
  tests/gateway/claude_first_prompt.test.js
```

Runtime: `/tmp/a06-runtime-bin/tmux`, version `tmux 3.6a-agents.4`, SHA-256
`837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac`.
Inherited `AGENTS_*`, `TMUX*`, `A04_*` and `D007C_*` variables were removed.
Set `A04_TEST_TMUX=/tmp/a06-runtime-bin/tmux`,
`D007C_TEST_TMUX_PATH=/tmp/a06-runtime-bin`, `D007C_RUN_REAL_TMUX_PROBE=1`,
prepend the runtime and AO venv to PATH, and use a private temporary TMUX_TMPDIR.
Exact environment and binary identity appear in the host logs. Host execution
was approved through the tool escalation after the sandbox failures.

## Retained unsuccessful/pre-edit attempts

The initial `red` log also records that the default Python lacked pytest;
the AO venv then reproduced the required two structure failures.
A proposed 12-character prefix failed a length assertion before any write.
`green.txt.gz` is an inadvertently named **pre-edit RED rerun**, not GREEN
evidence: four findings, 4 structure passes/2 failures, diff check exit 0.
The corrected 13-character replacement was applied afterwards; only
`green-verified.txt.gz` proves hygiene/structure GREEN.

The sandbox `focused.txt.gz` reports 12 file-level entries, 5 pass/7 fail,
exit 1, without individual test detail. The sandbox `f1.txt.gz` reports
one file-level pass and does not prove the individual F1 tests ran. Neither
is credited as successful focused verification. Host reruns expose individual
tests and establish the 2/2 F1 and 528/528 focused results above.

## Evidence SHA-256

| Log | SHA-256 |
|---|---|
| `A_0_6-hygiene-1-f1-host.txt.gz` | `a5e8c5516a8e0ad2fc7bc1976fadec699033eaa7cf191ecc7e4d828167d6e4f3` |
| `A_0_6-hygiene-1-f1.txt.gz` | `5925f1ab6b056257a737847eb3fcf894530c0a0e85aa3b9972fac8a9ca92c7cd` |
| `A_0_6-hygiene-1-focused-host.txt.gz` | `28ee527d48a63baf37df3549529459d5a6f6778ad8ef0a38166aa8e659a011b1` |
| `A_0_6-hygiene-1-focused.txt.gz` | `37b78dd3cf1b57627a1c024305bb2b5d5908ad1b91b165d8264722127d455986` |
| `A_0_6-hygiene-1-green-verified.txt.gz` | `9a80cfb0cd392764dcf72e91e954ec3abac59f910c3f691dee42dd7057aed2b1` |
| `A_0_6-hygiene-1-green.txt.gz` | `c78bbbaa8324a57bc387d89c20593e4a7c216c3277f4bf79368d5e0a435b39a3` |
| `A_0_6-hygiene-1-red-structure.txt.gz` | `e51e1727d72026e01ed46485b1edc51894cf5a20e7545bd18774da7301b9c24e` |
| `A_0_6-hygiene-1-red.txt.gz` | `c4bd89f1715e8df9f6f84fa02574ff4a069921b7a1e9a0408631ea84922bcfe9` |
| `A_0_6-hygiene-1-wrap.txt.gz` | `d6cde55a0a0ece717e6279d6e6ec97cfa9d6f2e84f8370c4df6a0e32efa7e760` |

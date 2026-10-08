# A/0/04 trial-1 KO correction — bounded medium-coder checkpoint

2026-10-08. Partial uncommitted candidate, not an independent verdict, sheet
completion or trial-2 acceptance request. Corrections remain, so this immutable
checkpoint preserves the bounded task before further runtime work.

Assignment: `workspace/root-a04-medium-rework.md`; operator requested
`gpt-6.1-sol / medium / priority`. No new Gateway session/model metadata was
queried or independently verified. No subagents, self-review, commits,
staging, policies edits, full gate, live provider launches or Gateway restart
were performed by this coder.

## Findings and disposition

| Finding | Current evidence and remaining work |
|---|---|
| F1 final Enter write race | OPEN. Initial design received a separately assigned trial-4 KO, committed by root at `2b920a84ce46f993806e2ee8db17c7a10d98ab24`. Read [that verdict](A_0_4-final-submit-plan-4_reviewed_KO.md). New [trial-5 proposal](A_0_4-final-submit-plan-5_to_review.md) incorporates its nine numbered corrections, including dedicated `agents-submit-v1`, raw server-owned single-use evidence, exact identity/state args, pending-output refusal, capability-before-paste and failure semantics. Await fresh independent plan review before runtime changes. Current helper still uses ordinary final Enter and remains unsafe under the trial-1 write-race reproduction. |
| F2 captured whitespace | IMPLEMENTED, awaiting independent review. Current composer capture uses `-N -T`; no prompt equality was weakened or text inferred from payload. Real raw-terminal tests cover nine Codex cases including spaces-only, leading/trailing spaces and blank/multiline endings, plus five narrow Claude single-line cases. Each asserts exact framed bytes and one final CR. No actual provider was executed. |
| F3 history/draft vs menu | IMPLEMENTED, awaiting independent review. Replaced viewport-wide word regex with focused numbered panels for Codex/Claude and the positioned OpenCode permission overlay. Composer focus excludes identical history/draft words. Codex continuation rows containing menu glyphs remain draft rows. Changed unknown menus stay closed. Updated negative menu fixtures to encode choices and focus rather than an unstructured title next to a composer. This is source/simulation evidence, not measured live menu coverage. |
| F4 Antigravity | OPEN. Installed binary hash still matches prior discovery; source/help strings do not establish a positive renderer. No root-coordinated capture was supplied or provider launched. Root must obtain positive composer/acceptance evidence; no invented profile was added. Claude 2.1.293 is authorized but unmeasured; source fixture remains 2.1.292. |
| F5 owned-process cleanup | ATTRIBUTED and fixture correction IMPLEMENTED, awaiting root gate and independent review. Focused reproduction below identifies a live custom-runtime server left by `tmux_client.test.js`. Foreground ownership alone additionally exposed a pane-reaping race. Fixtures now retire panes and wait for the server to reap them, then stop and reap the foreground server. Final unchanged-supervisor native probe reports completed/no adopted processes. Original full-gate failure remains failed; its original surviving PID was not recorded, so this is a reproduced owning-fixture attribution, not a retroactive observation of that PID. |

Root owns the root README env-table correction, CI inventory/gates, indexes,
CHANGELOG/status and live providers. A root-owned README change appeared during
this run and was preserved; this coder did not edit it. Root also committed the
initial design and independent review evidence; this coder made no commit.

## TDD and exact verification

Scratch evidence is preserved at `/tmp/ao-a04-medium-rework-vsbgvydm/`.

- F2 RED: `A04_TEST_TMUX=/tmp/ao-a04-runtime-build-vl_1pgz1/bin/tmux node tests/gateway/prompt_submission_capture.test.js` on host: 1 failed at exact draft comparison, no skips. The separate sandbox runner failure is not counted as RED. Initial same-test GREEN: 1 passed; final expanded cases are in the 135-test run.
- F3 RED: `node tests/gateway/prompt_submission.test.js`: 34 tests, 32 passed/2 failed, no skips; the history/draft regressions fail on the global regex. A further multiline-menu-text regression exposed continuation matching and was corrected before final GREEN. Final same-file run: 34 passed, no failures/skips.
- F5 RED: `python3 /tmp/ao-a04-medium-rework-vsbgvydm/leak-probe-with-states.py <worktree> /tmp/ao-a04-medium-rework-vsbgvydm/leak-red2` loads the unchanged `scripts/ci_gate.py` supervisor from disk, with a scratch observation wrapper only. It runs just `tmux_client.test.js`, redirects tmux through an explicit owned socket and disables user config. TAP 3 passed, but outcome `process_tree_leak`. Live PID `2259542`, start time `14131187`, command `/tmp/ao-a04-runtime-build-vl_1pgz1/bin/tmux -f /dev/null -S /tmp/ao-a04-medium-rework-vsbgvydm/leak-red2/owned.sock new-session -d -s agtest-1791411994299 -c /tmp`; supervisor subsequently retired/reaped it.
- The first foreground-only fix still produced `process_tree_leak`: adopted zombie PID `2264394`, start time `14135353`. This failed attempt is retained in `leak-green/`; it is not credited as GREEN. Pane retirement/reaping before server exit corrected that lifecycle.
- F5 final GREEN: `python3 /tmp/ao-a04-medium-rework-vsbgvydm/native-focused-probe.py <worktree> /tmp/ao-a04-medium-rework-vsbgvydm/native-final` executes exactly the three native files (`tmux_client`, `guarded_paste`, `prompt_submission_capture`) under the unchanged supervisor. Outcome `completed`, exit 0, processes `[]`; TAP 10 passed/0 failed/0 skipped. No process-cleanup gate or skip budget changed.

Final focused command, host, exit 0: **135 passed, 0 failed/cancelled/skipped/todo**.

```bash
PATH=/tmp/ao-a04-runtime-build-vl_1pgz1/bin:$PATH \
A04_TEST_TMUX=/tmp/ao-a04-runtime-build-vl_1pgz1/bin/tmux \
node --test --test-reporter=tap \
  tests/gateway/tmux_client.test.js \
  tests/gateway/prompt_submission.test.js \
  tests/gateway/prompt_submission_capture.test.js \
  tests/gateway/guarded_paste.test.js \
  tests/gateway/codex_supervised.test.js \
  tests/gateway/antigravity_adapter.test.js \
  tests/gateway/base_adapter.test.js \
  tests/gateway/claude_adapter.test.js \
  tests/gateway/codex_adapter.test.js \
  tests/gateway/pi_opencode_adapters.test.js \
  tests/gateway/tool_error_serialization.test.js \
  tests/gateway/tool_projection_contract.test.js \
  tests/gateway/tool_catalog.test.js
```

Scoped host lint from `gateway/`: `./node_modules/.bin/eslint --config eslint.config.js src/adapters/base_adapter.js src/adapters/tmux_client.js`: exit 0, empty output. The sandbox attempt emitted stream-permission errors and is not credited. `git diff --check`: exit 0. No full gate was run.

## Candidate and immutable evidence binding

Final observed HEAD: `2b920a84ce46f993806e2ee8db17c7a10d98ab24` (root evidence
commit). No production candidate commit/tree exists. Exact current dirty/new
file hashes are in `candidate-files.json`, excluding this subsequently written
checkpoint itself; that manifest includes the trial-5 proposal and root README.
Baseline file copies and manifest precede all coder edits. Existing candidate
entries match that baseline except the six edited files: Gateway README,
base adapter, tmux client, guarded paste tests, prompt submission tests and
tmux client tests. Added production-test fixtures are `owned_tmux_server.js`,
`prompt_submission_capture.test.js` and `prompt_submission_terminal_fixture.py`.
No vendor/runtime bytes changed and no new runtime was built.

```text
c60357d47e3cb1d59b173c4e8b3c7cc72dbfeda6cd0eedef7b8e7448d867bd9a baseline-files.json
a074792e7951b43ad799636400a993b77bd3854d5d7b59fb29f5f98f67d016fe candidate-files.json
7c35e5230d69b9d1e92e69c1eb9468ca3c26dd48cebf4d3a3b6f8e688a7b1a9d capture-red.log
7a9c7635626735a07462b04b0ec12fce1d1d23d06df1d042502c346b91746ecb menus-red.log
35c3cda644639ad2b63041ce4eb49fdb3371bbfc363c052fbb3c69f87378d9a5 menus-multiline-red.log
24a9c721c8cc84e4b8062b362e4d2cc34571398fb5457d01a85c7e3a46824bac focused-final.log
415ac657cf5bf120967ac095cb126438e3ecadc0221f83c882c0aadcae8d790c leak-red2/leak-observation.json
bce193ab21bd99df0a59a23c2d64e3c1839647f3e8c519ff33a1c95a9bcac724 leak-green/leak-observation.json
1458b219ab814aa89e5e151e659598f74453d391431ad7a981c277489eeea76e native-final/leak-observation.json
847771fac6fdc6d02a6cc7114e42d1821fd2e9ac062c3a038e7ebdb443944e21 native-final/leak-test.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 lint-host.log
```

The trial-1 request, KO and context correction were compared byte-for-byte
with `b91a55b`; all unchanged. Their SHA-256 values respectively are
`5db9bb563dc54d5cbf0e88a38b1927c986b7400535fedb01c656a43bdbfcd28e`,
`193e7044d3abc049db40e6def73673466d85932ab35a3e081f3d1d8d80a3c188`,
and `ba9a352d512eb0fffebe0424201bf96181f12c099936eb6321ff823abb5e4855`.
The `.2` binary and retained capture extension still match the hashes in the
trial-5 proposal. Antigravity binary remains
`19be6af38f7beeaa0db415df9297e314ab3d33fdd6f853434d49f88819bc68e4`.

## Continuation boundary

Next action: independently review the trial-5 contract, then implement F1
test-first with a fresh isolated `.3` output if approved. F2/F3 and fixture
lifecycle changes remain unreviewed. Root must reconcile the additional native
test file in its shared inventory and run the next solo full gate with Redis 7.
Live Codex/Claude/Antigravity acceptance and measured settle timing remain
NOT RUN; native Darwin remains NOT BUILT / NOT RUN. The historical failed
full gate remains 987 tests / 982 passed / 2 failed / 3 skipped, with required
Redis unavailable; focused GREEN does not supersede it. No integration,
promotion, release or completed five-provider functionality is claimed.

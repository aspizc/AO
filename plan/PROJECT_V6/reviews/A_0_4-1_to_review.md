# Review Submission — V6 A/0/04 (Trial 1)

This is an uncommitted coder candidate for independent implementation review,
with outstanding functional and live criteria stated below. It is not a
verdict or a completed sheet. A reviewer must not treat focused GREEN or
source fixtures as full acceptance.

- Worktree: `/home/carase/git/personal/AO/workspace/clones/wt-v6-a04`.
- Branch: `feat/V6-A-0-04-safe-submit`.
- Base/current HEAD: `327043a50316f3918b06fe30e019ecdc5799b4d3`.
- No candidate commit/tree exists; the current files are bound by SHA-256.
- Inherited trace: `tr-v6-a04-3fd4ba16-8cb9-4093-a782-1489f1ac0b69`.
  This is checkpoint provenance, not a newly verified Gateway identity.
- Root-assigned continuation: `workspace/root-a04-continuation.md`.
- No Claude/native provider invocation, subagents, self-review, policies edits,
  staging, commits, pushes, resets or stashes. Root assigns the independent
  reviewer; no reviewer is invoked by this coder.

## What changed and why

The shared composer-only helper separates exact framed text delivery from
the final Enter, checks current provider state, confirms positive acceptance,
permits at most one unchanged-composer Enter retry, and prevents same-pane
interleaving. All five executable adapter asks call it; shell launch remains
a separate literal single-line operation. Fixed public
AGENT_PROMPT_NOT_SUBMITTED messages and bounded reason projection preserve
privacy at the MCP boundary.

The checkpoint-2 runtime supplies atomic `paste-buffer -G -p -r` using
uniquely owned buffers. Its guard rejects unsafe input/mode/synchronization
states before any byte is written. The capture extension and protocol are
unchanged. Existing uncommitted adapter/runtime/error work is preserved.

This continuation adds the narrow source-backed Claude Code 2.1.292 composer
branch at `gateway/src/adapters/base_adapter.js:97`, plus explicit Switch
model?/Change effort level? refusal at `:18`. New submission tests begin
at `tests/gateway/prompt_submission.test.js:273`, using the static fixture
at `tests/gateway/fixtures/claude_2_1_292_composer.json`.
`gateway/README.md:68` explains limits and corrects Antigravity availability.

Claude's binary was read as data, never executed. The fixture records the
exact binary digest and revalidated embedded source line/byte anchors for
borders, pointer/separator, placeholder, shortcut/loading hints and paste
summaries. Additional source reads establish the Try example generator and
the key-hint renderer's “to” separator. The profile admits only full-width
default Unicode single-line input with exact visible ASCII draft/end cursor.
A fresh adjacent loading footer plus empty composer is required for acceptance.
It refuses echo, stale footer history, summaries, wrapped/clipped/wide drafts,
ghost text, shell/agent prefixes, blank idle editors and cursor drift.

Read [checkpoint 1](A_0_4-build-1_checkpoint.md),
[checkpoint 2](A_0_4-build-2_checkpoint.md),
[static discovery](A_0_4-provider-profile-discovery-2026_10_07_handoff.md)
and [checkpoint 3](A_0_4-build-3_checkpoint.md) for the full chronology and
evidence. The immutable plan trial-1 KO and trial-2/trial-3 OK apply to plan
contracts only; they are not implementation verdicts.

## TDD RED

The initial shared/helper/public-error RED and five-adapter RED are preserved
in checkpoint 1. Checkpoint 2 preserves prior-runtime emitted-byte RED,
unsupported-option RED and OpenCode-profile RED.

This continuation's tests preceded production edits. Exact command:
`node tests/gateway/prompt_submission.test.js`.
RED against the entry checkpoint-2 working files: 29 tests, 23 pass, 6 fail,
0 cancelled/skipped/todo. These six newly added tests failed:

- Claude 2.1.292 source profile submits literal key names only after exact draft
  and fresh loading footer.
- Claude source placeholder and a typed identical string are distinguished
  by the composer cursor.
- Claude retries one unchanged observed draft but never repeats the pasted text.
- Claude model, effort and folder trust dialogs cannot receive text or Enter.
- Claude input echo, disappearance and stale loading footer do not confirm
  acceptance or authorize replay.
- Claude a decision at the final Enter guard prevents both first submit and retry.

The initial runner-only file failure is not credited as RED; the direct
node:test log records actual failing assertions. See checkpoint 3 for those
reporting limits. No shared-tree reset was used to reconstruct HEAD.

## TDD GREEN and verification

The same direct RED command after production edits passed 29/29.
Two added refusal regressions cover loading/unknown initial panes and
summarized/changed drafts after paste. Final observed focused command:

```bash
node --test --test-reporter=tap tests/gateway/tmux_client.test.js \
  tests/gateway/prompt_submission.test.js tests/gateway/codex_supervised.test.js \
  tests/gateway/antigravity_adapter.test.js tests/gateway/base_adapter.test.js \
  tests/gateway/claude_adapter.test.js tests/gateway/codex_adapter.test.js \
  tests/gateway/pi_opencode_adapters.test.js \
  tests/gateway/tool_error_serialization.test.js \
  tests/gateway/tool_projection_contract.test.js tests/gateway/tool_catalog.test.js
```

Result: exit 0, 125 pass, 0 fail/cancelled/skipped/todo.
Tests observe framed stub input followed only by separately guarded Enter,
buffer cleanup, refusal before input, exact draft and acceptance transitions,
and public error envelopes. Source-backed simulations are distinct from
checkpoint-2 real raw-terminal framing evidence.

Scoped lint, from `gateway/`:

```bash
./node_modules/.bin/eslint --config eslint.config.js \
  src/adapters/base_adapter.js src/adapters/tmux_client.js \
  src/adapters/codex_adapter.js src/adapters/claude_adapter.js \
  src/adapters/antigravity_adapter.js src/adapters/pi_adapter.js \
  src/adapters/opencode_adapter.js src/config.js \
  src/tools/catalog.js src/tools/tool_errors.js
```

Host result: exit 0, no output. Sandbox stream-descriptor permission errors
were attributed and the command rerun on the host; the sandbox exit alone
is not credited. `git diff --check` passed. Full `bash scripts/ci.sh`
is NOT RUN by this coder; root owns the solo host candidate gate.

Prior retained-runtime and raw-byte logs match checkpoint-2 digests.
Their 62 and 6 GREEN tests were not rerun here and are not added to 125.
No runtime rebuild occurred: the saved Linux .2 executable still has SHA-256
`3d37a94099286f1284373271ed7da3dac69e04fb1dba88bdb6068cfb66ed1428`.

## Acceptance checklist and pending prerequisites

- [x] Shared literal/framed transport, separate final Enter, control refusal,
  buffer isolation/cleanup and bounded same-target concurrency have focused tests.
- [x] All five adapter asks delegate to the shared helper; no adapter-local
  prompt send remains. Registry-only gemini-cli behavior remains covered.
- [x] Menu/busy/unknown/uncertain states refuse in focused tests; echo and stale
  loading hints cannot confirm acceptance or authorize a retry.
- [x] Source-backed profiles exist for Codex 0.160.1, pi 0.73.1,
  OpenCode 1.18.20 and narrow Claude 2.1.292 layouts.
- [x] Atomic tmux .2 guard, exact-byte tests and unchanged capture extension have
  preserved checkpoint-2 evidence. Runtime pins/hashes are bound below.
- [ ] Antigravity positive composer/acceptance profile: prerequisite unavailable.
  Installed agy is genuine, but the static discovery found only help strings
  and source filenames, not renderer source or a measured pane. No substitute
  profile was invented. It continues to refuse unknown_state. This is a
  functional gap, not a completed provider criterion.
- [ ] Live Codex and Claude acceptance: NOT RUN. Exact remaining sheet criterion,
  `A/0/04.md:129–131`: agent_spawn a Claude Code and a Codex child, agent_ask
  each once, verify both start working with no manual Enter, and record both
  pane snapshots in the review request. Root must coordinate any live check.
  Claude is explicitly DEFERRED while the no-invocation instruction remains.
- [ ] Measured live provider versions/markers (`04.md:135–136`) and settle
  delay measurement (`:39`): NOT RUN. The 150 ms default is simulation only.
- [ ] Full host gate and skip budget on the exact combined candidate:
  root-owned, pending (`04.md:137`, `04-transport.md:92–94`).
- [ ] Native Darwin runtime build/execution: unavailable in this continuation.
- [ ] Independent implementation verdict, integration, promotion and release:
  none. A/0/04 remains planned and incomplete.

## Root reconciliation

Root owns CHANGELOG, CI/inventory reconciliation, review indexing/status,
artifact publication and all commits/integration. No such file was edited by
this continuation. The existing CI workflow change is root's checkpoint-2
runtime symlink edit and is preserved byte-for-byte.

Serialize A04 catalog/error/derived-contract overlap with A05's other worktree
and later A06. The prior generator emitted unchanged
`docs/mcp-tool-catalog.md`; reconcile that output from the final combined
catalog. A06 must keep its separate approval-bound answer path; this helper
grants no decision authority.

Use the checkpoint-2 saved isolated .2 runtime for the full gate:
`/tmp/ao-a04-runtime-build-vl_1pgz1/bin` in PATH and
D007C_TEST_TMUX_PATH, D007C_RUN_REAL_TMUX_PROBE=1, a fresh private TMUX_TMPDIR.
Do not replace a user/default server. A serving Gateway changes behavior only
after an operator restart with the intended runtime path.
For Antigravity, obtain readable renderer source or a root-coordinated owned
capture before a further positive-profile TDD trial; no provider execution is
authorized to the coder by this handoff.

## Evidence identity

Continuation scratch: `/tmp/ao-a04-continuation-90j1i7kk/`.
SHA-256 evidence:

```text
f568b809a2c901e9b0a89cdb39a0ff6a8181b08e3ce7e5c50e67b15e012a372a  claude-profile-red-direct.log
b51b418f630f9549a0f1d310a692f4568144e8b21fcf025d0fe7d3785965e6c9  claude-profile-green.log
5bb88891510dbc864a568c28e74226977bd30b32a1554d1e3b3c055d58ff4da1  focused-green-observed.log
98a3c86abfcab3939e545e4b4bfe781f6fec57997987195d2dbbc830c5239219  baseline-files.json
88a813886a5f58cf8c03c84470f3bb07d4a4f0fdf81025485782c46175ebdcab  candidate-files.json
```

Claude binary SHA-256:
`a967e7b1d8b4e47ee421d5433027880347952b0c0857abf880e2c942a4ec93b3`.
Its extracted composer module SHA-256:
`62d55ad3857be5c2dc816eee87cdc1a4a7373ff0fca5a0d39774771efcc32729`.
Antigravity binary SHA-256:
`19be6af38f7beeaa0db415df9297e314ab3d33fdd6f853434d49f88819bc68e4`.
Capture extension SHA-256 remains
`4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2`.

Full uncommitted candidate paths below include preserved checkpoint-1/2 work
and the existing root-owned CI edit. DELETED records the prior .1 patch
replacement, not a deletion performed by this continuation.

```text
f48594f02b72781681127a45d63b33dcebb1d843d95a96dbb72cc72aaa10975c  .github/workflows/ci.yml
dc1e97895d837e5d57af29241716cf8a8cd22ef818c56364a0391263335ec4ea  docs/tmux-runtime.md
1ec623c0a207fe65645526d746065165a4a5788356f0fc0b7a0f92152fb057b8  gateway/README.md
09ab054150fba6d5e697d25eceb10e82d5a3050a80c3bad567c27e7c7aa7c658  gateway/contracts/mcp-tools-v1.json
aecbab0f5a92560615ed6969c4404b0b6ed1971beaaa9339ee24b1ef28cace54  gateway/src/adapters/antigravity_adapter.js
d64ff6a22dc2ed44a1776abe2217e19ea6742f14111115a6e6e3d7654497a768  gateway/src/adapters/base_adapter.js
b506fa0cecc402711671c0de62a46b70a903216c693cdde4df8546b38993fd49  gateway/src/adapters/claude_adapter.js
c5d55755dc83227168b0a3e0b8ae584ceea5315c81e630e9718dcdd2a032172e  gateway/src/adapters/codex_adapter.js
c5b4b90108f782c352f59552f7000337e97d297dfd9f46474476463228cc63d4  gateway/src/adapters/opencode_adapter.js
b95e6c474f8a8a947250d6ee225e6c68c3f6c914ec5dd0ea2ebc643b06b39cb2  gateway/src/adapters/pi_adapter.js
e5624bd37092851f9cef7776c2c3b459684b023ac07532ad363e06dd9531c81e  gateway/src/adapters/process_supervisor_helper.py
f195bba4a24d5a81d07c1a1cb658a87cf0d1dd8e781c65a8213fbbed1894faa3  gateway/src/adapters/tmux_client.js
49da7776678d2450570410aa2aca05c3464ba30229771fff2f70442d4f988203  gateway/src/config.js
e81ab2adb337037639e95625c957b82d3bef84242ea7a63ba7a4d9b69848c38e  gateway/src/tools/catalog.js
13109effce96ba9f41122f49dafc773b5ac6c6a5be38e2d90f98c5ba8bbfb434  gateway/src/tools/tool_errors.js
eea0923caeb4dedb10cd6da05c861af3edb3f69ecb9d71dcdb163d3192e19b8e  gateway/vendor/tmux-agents/README.md
9f0e6d5338be4c98c8826b1d98a5791808b4c89735be11c457e32ce298ce07f4  gateway/vendor/tmux-agents/build-offline-darwin.sh
fa5a1d5912086a2d54a1defa7b1b22be8a6c04c5fc96dc8a2ce9b4763ff24c03  gateway/vendor/tmux-agents/build-offline.sh
2ce5d24fd01639a05cc71d09a2125f389a8e9fbcf361e2d28a35461596a430a6  gateway/vendor/tmux-agents/manifest.json
DELETED  gateway/vendor/tmux-agents/tmux-3.6a-agents.1.patch
c488dccadb08db45c00d7a935f9cfd00735d744d0a68286ef683869e152a74c2  gateway/vendor/tmux-agents/tmux-3.6a-agents.2.patch
2c90d71519c180f9cb4d490216592d2e79aa0e97cdc204c25cb353488e1af31a  tests/gateway/codex_supervised.test.js
62a599ba3b87e734261c07a210f8de320a102ef2d3d73bf97fb545157c8c4a2d  tests/gateway/fixtures/claude_2_1_292_composer.json
6ddce598e0d757c643145838452b96b9783fa5afc22eba9f26ab87b38cd157aa  tests/gateway/guarded_paste.test.js
0e361fc7af7e0aae24e2aa0643cd84c089b249fb0658fe750ee6882ccb9b71a0  tests/gateway/guarded_paste_fixture.py
483de5693ca0ba1919c3003cc026d47baeaf7e6d2a078db813df7103e2cf55af  tests/gateway/process_supervisor_session_port_fixture.py
181bd777ad79546d9dd4aa095179070cf08a8b0f50b8d86b93f97258d3e39dab  tests/gateway/process_supervisor_session_port_relay.test.js
a529d28e808c2312620c941e3c07d797a0d7825e5a867c988d9aecf46d6d547e  tests/gateway/prompt_submission.test.js
df84e193966cad314cfbd1c001c46dbd1e85d36e62d10d58c499af445b7f2e11  tests/gateway/tmux_client.test.js
15fa094a0a294a5a4f159dadbbf2b0df948f5dc733de6ab440e3abb4d382d532  tests/gateway/tool_catalog.test.js
8162c9739417a904c0cca65bc4fa84470f16af33f3ee094806faa426608b0c96  tests/gateway/tool_error_serialization.test.js
```

Only base_adapter.js, prompt_submission.test.js and gateway/README.md changed
from the entry snapshot, plus the new source fixture and immutable evidence
files. Review these hashes against disk before assigning any verdict.

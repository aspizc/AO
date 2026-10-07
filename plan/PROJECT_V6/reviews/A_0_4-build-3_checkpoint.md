# V6 A/0/04 build checkpoint 3 — static Claude composer profile

Coder checkpoint only. This does not issue an independent verdict or close
A/0/04. Checkpoints 1–2 and the static discovery handoff remain immutable.

- Worktree: `/home/carase/git/personal/AO/workspace/clones/wt-v6-a04`.
- Branch: `feat/V6-A-0-04-safe-submit`.
- HEAD: `327043a50316f3918b06fe30e019ecdc5799b4d3`; no commit created.
- Inherited trace provenance:
  `tr-v6-a04-3fd4ba16-8cb9-4093-a782-1489f1ac0b69`.
  This continuation did not create/verify a new Gateway session or publish artifacts.
- Assignment: `workspace/root-a04-continuation.md`, under the existing
  root-authorized coder fallback. No subagents or independent review.
- Scratch evidence: `/tmp/ao-a04-continuation-90j1i7kk/`.

## Preserved state and changes

Before edits, saved the existing tracked patch and hashes of all modified and
untracked files in scratch. Only three baseline files changed:
`gateway/src/adapters/base_adapter.js`, `tests/gateway/prompt_submission.test.js`,
and `gateway/README.md`. Added
`tests/gateway/fixtures/claude_2_1_292_composer.json`.
All other existing runtime/adapter/error/CI changes are byte-identical to
the entry snapshot. No policies, status/index, CHANGELOG, staging, commits,
pushes, resets, stashes, live provider checks or full gate were performed.

The Claude branch at `base_adapter.js:97` recognizes only the source-backed
default Unicode single-line composer: full-width plain horizontal borders,
U+276F pointer with U+00A0 separator, visible Try placeholder with input-start
cursor, exact visible ASCII draft with end cursor, and adjacent current
shortcut/loading footer. Summaries, wrapped/wide/clipped text, ghost text,
blank idle editors, shell/agent prefixes, foreign layouts and cursor drift
refuse. Shared decision detection at `:18` now also recognizes the source's
Switch model? and Change effort level? dialogs. Empty composer plus fresh
adjacent loading footer is required for confirmation; input echo never suffices.

Read Claude's native executable as bytes, never executed it, including
version/help commands. Its SHA-256 matches discovery:
`a967e7b1d8b4e47ee421d5433027880347952b0c0857abf880e2c942a4ec93b3`.
Revalidated all fixture module-line/byte anchors. The extracted composer module
starts at byte 232299107, with SHA-256
`62d55ad3857be5c2dc816eee87cdc1a4a7373ff0fca5a0d39774771efcc32729`.
Additional static anchors establish the Unicode pointer, Try example generator
and key-hint renderer. Fixtures reconstruct source branches, not measured panes.

Antigravity availability is corrected in `gateway/README.md:80`: agy is
installed, SHA-256
`19be6af38f7beeaa0db415df9297e314ab3d33fdd6f853434d49f88819bc68e4`.
No positive renderer evidence exists in the discovery record. It remains
unknown-state refusal; plausible help strings and another provider's composer
receive zero input in the new regression test.

## TDD and focused results

Before production edits, `node tests/gateway/prompt_submission.test.js`
produced RED: 29 tests, 23 pass, 6 fail, no cancelled/skipped/todo.
The six new Claude positive/decision/acceptance tests failed for missing
profile/decision recognition. GREEN after production edits: 29/29.
Added two refusal regressions for busy/unknown initial panes and summarized/
changed post-paste drafts; final focused suite below passes 125/125,
0 failed/cancelled/skipped/todo. The included submission file has 31 tests.

An initial RED runner invocation reported only a failing file wrapper.
It is not counted as meaningful RED. The direct node:test run above records
the six actual assertions. Python file-redirected runner checks likewise
reported file-wrapper totals only; those totals are not credited as subtests.
The final direct command's full observed TAP output is saved separately.

```bash
node --test --test-reporter=tap tests/gateway/tmux_client.test.js \
  tests/gateway/prompt_submission.test.js tests/gateway/codex_supervised.test.js \
  tests/gateway/antigravity_adapter.test.js tests/gateway/base_adapter.test.js \
  tests/gateway/claude_adapter.test.js tests/gateway/codex_adapter.test.js \
  tests/gateway/pi_opencode_adapters.test.js \
  tests/gateway/tool_error_serialization.test.js \
  tests/gateway/tool_projection_contract.test.js tests/gateway/tool_catalog.test.js
```

Scoped production JS ESLint passed on the host with exit 0 and no output;
the sandbox attempt emitted stream-descriptor permission errors, so its exit
0 alone is not credited. `git diff --check` passed.

| Evidence in scratch | SHA-256 |
|---|---|
| claude-profile-red-direct.log | f568b809a2c901e9b0a89cdb39a0ff6a8181b08e3ce7e5c50e67b15e012a372a |
| claude-profile-green.log | b51b418f630f9549a0f1d310a692f4568144e8b21fcf025d0fe7d3785965e6c9 |
| focused-green-observed.log | 5bb88891510dbc864a568c28e74226977bd30b32a1554d1e3b3c055d58ff4da1 |
| baseline-files.json | 98a3c86abfcab3939e545e4b4bfe781f6fec57997987195d2dbbc830c5239219 |
| candidate-files.json | 88a813886a5f58cf8c03c84470f3bb07d4a4f0fdf81025485782c46175ebdcab |

The existing guarded Linux binary still hashes to
`3d37a94099286f1284373271ed7da3dac69e04fb1dba88bdb6068cfb66ed1428`.
No rebuild occurred. Checkpoint-2 raw-input and retained-runtime logs still
match its recorded hashes; their 6 and 62 GREEN results are prior evidence,
not tests rerun or added to this continuation's 125 total.

## Next actions owned by root

The uncommitted candidate is handed off in `A_0_4-1_to_review.md` with
explicit incomplete criteria. Root assigns the independent reviewer and
publishes artifacts; no coder verdict exists. Root reconciles catalog overlap
with A05 serially, the review index/status/CHANGELOG and CI inventories.

A/0/04 remains planned and incomplete. Missing Antigravity renderer source
or an explicitly coordinated capture prevents a positive profile.
No live provider check was attempted. Exact remaining operator criterion
(`A/0/04.md:129–131`): agent_spawn a Claude Code and a Codex child,
agent_ask each once, verify it starts working without manual Enter, and record
both pane snapshots. Record measured versions/markers (`:135–136`) and
settle timing (`:39`). Claude acceptance is DEFERRED while invocation is
prohibited; Codex/live timing await root coordination. Source fixtures satisfy
none of these live criteria. Root runs the full host gate on the combined
candidate with the checkpoint-2 isolated .2 runtime and records the skip budget.
Darwin runtime remains unbuilt/unrun. No reviewed/integrated/promoted/released
claim is made.

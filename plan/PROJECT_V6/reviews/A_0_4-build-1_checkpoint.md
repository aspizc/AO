# V6 A/0/04 build checkpoint 1 — shared submission candidate

This is a build checkpoint, not an independent verdict or completed sheet.
The implementation trial-1 review request has not been issued. No file in
the implementation review chain has been overwritten.

- Worktree: `/home/carase/git/personal/AO/workspace/clones/wt-v6-a04`.
- Branch: `feat/V6-A-0-04-safe-submit`.
- Base/HEAD: `1883d387de0f21203679e9bd8e4626821abf6f7c`.
- Trace: `tr-v6-a04-3fd4ba16-8cb9-4093-a782-1489f1ac0b69`.
- Execution: root-assigned built-in coder after `REQUEST_CONTEXT_DENIED`.
  No Claude/provider task execution, commits, staging, push, policies edits,
  full gate, independent review or integration occurred.

## Current candidate

`base_adapter.js` exports a shared composer-only submission helper. It rejects
unsupported controls and malformed Unicode before target interaction, resolves
one exact pane ID, excludes tmux copy mode/input-off/synchronized states, prevents
same-pane ask interleaving, and gates both text and each Enter on the current
provider composer. Text uses a uniquely named stdin-loaded buffer with LF
preservation and cleanup. At most one additional Enter is allowed only for
an unchanged positively identified draft; text is never replayed. Disappearance
without a fresh source-backed busy marker reports uncertain acceptance.

All five executable adapters delegate live asks to that helper. Launch commands
use separate literal single-line text and Enter, with control/newline refusal.
Live submission audit records contain prompt length/confirmation rather than
prompt or pane content. Existing dry-run observations remain simulation only.

`agent.ask` preserves `AGENT_PROMPT_NOT_SUBMITTED`, the catalog-owned fixed
message and the finite reason allowlist. Unknown exception/reason values stay
sanitized. The existing catalog projection/render functions refreshed the
contract digest; the Markdown catalog generator emitted identical documentation.

The settle default is 150 ms, exercised in simulation. It has not been measured
with a live provider. `gateway/README.md` explicitly records this limitation.

## TDD and verification evidence

| Command | Result | Evidence |
|---|---|---|
| `node --test tests/gateway/prompt_submission.test.js tests/gateway/tool_error_serialization.test.js` before production edits | RED: exit 1; 22 tests, 7 pass, 15 fail, 0 skip | `/tmp/ao-a04-red.log` |
| `node --test --test-name-pattern='shared composer submission guard' tests/gateway/codex_supervised.test.js` before adapter edits | RED: exit 1; 5 tests, 0 pass, 5 fail, 0 skip | `/tmp/ao-a04-adapters-red.log` |
| `node --test --test-name-pattern='unsupported controls' tests/gateway/prompt_submission.test.js` before malformed-Unicode refusal | RED: exit 1; 1 test, 0 pass, 1 fail, 0 skip | `/tmp/ao-a04-unicode-red.log` |
| `node --test tests/gateway/tmux_client.test.js tests/gateway/prompt_submission.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js tests/gateway/tool_catalog.test.js` | GREEN: exit 0; 112 pass, 0 fail/cancelled/skipped/todo | `/tmp/ao-a04-focused-green.log` |
| Changed production JS files through `./node_modules/.bin/eslint --config eslint.config.js` from `gateway/` | exit 0 | scoped lint |
| `git diff --check` | exit 0 | whitespace check |
| `bash scripts/ci.sh` | NOT RUN: root owns solo full-gate execution | no full-gate claim |

The initial RED confirms the shared boundary was absent and that the actual
`agent.ask` MCP envelope projected the proposed domain error to `TOOL_ERROR`.
Adapter RED confirms none of the five asks reached the shared composer guard.
Malformed Unicode RED distinguishes exact UTF-8 transport from silently
replacing an unpaired surrogate.

Log SHA-256 values:

```text
b78f35dda3d45dbf5f7ff4e1b317365c1fd34c2c08b3041fbddb434419ce0dd9  ao-a04-red.log
badc17ad2f50c4018e08ab3702e7e7d6c62b7880feae5f33198eb465752ef01d  ao-a04-adapters-red.log
0bbd9f8b86dd07eed8d5d8a3eaf8589b082b1ee4709d43953bc092cf4ed87b38  ao-a04-unicode-red.log
6812ee896a5d568d70e6bd0c82d23246b683bdd728c9f6bc57d3424b8999725f  ao-a04-focused-green.log
```

## Runtime prerequisite requiring reviewed addendum

Inspected installed tmux `3.6`, custom `3.6a-agents.1`, the installed manual,
[pinned tmux format.c](https://github.com/tmux/tmux/blob/3.6/format.c) and
[pinned upstream paste implementation](https://github.com/tmux/tmux/blob/3.6a/cmd-paste-buffer.c).
Neither runtime exposes the current application bracketed-paste mode as a
format variable. Upstream `paste-buffer -p -r` silently delivers raw text if
the application has disabled bracketed paste. A separate mode probe would
also race with the paste itself.

The root received a proposed minimal addendum: add a custom `paste-buffer -G`
require-mode flag that rejects before any `bufferevent_write` unless `-p -r`
and actual `MODE_BRACKETPASTE` are present, with input-off/mode/synchronization
guards. Pin the revised runtime/patch/builds and exercise real emitted bytes
in an owned isolated terminal fixture, including disabled/changing modes.
The helper currently expects this explicit command capability and refuses
older/upstream runtimes with `paste_unavailable` before creating a buffer.
No vendor/runtime source or pins have been changed pending addendum review.

Current GREEN coverage simulates the atomic guard; it does not satisfy the
real framed-byte acceptance requirement. Do not present this as working live
delivery until the prerequisite is implemented and verified.

## Provider evidence and remaining risks

Installed paths/package metadata identify Codex `0.160.1`, Claude Code
`2.1.292`, pi `0.73.1`, opencode `1.18.20`; antigravity was not found.
No Claude invocation occurred, including version commands.

Codex fixtures were corrected from an initial simplified footer after reading
the version-pinned official source/snapshots: a draft hides `? for shortcuts`,
the footer includes remaining context, and an empty composer displays
`Ask Codex to do anything`. Cursor position distinguishes the placeholder.
Sources: [composer](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/bottom_pane/chat_composer.rs),
[footer](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/bottom_pane/footer.rs),
[snapshots](https://github.com/openai/codex/tree/rust-v0.160.1/codex-rs/tui/src/bottom_pane/snapshots),
[status indicator](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/status_indicator_widget.rs).
Pi fixtures use its installed `dist/modes/interactive/interactive-mode.js`
working loader and `pi-tui/dist/components/editor.js` horizontal borders.
These are source-backed classifier fixtures, not live acceptance captures.

Claude, opencode and antigravity have no verified positive classifier profile
in the candidate and always refuse `unknown_state`. Unsupported/custom layouts,
large-paste display placeholders and shortened footers also fail closed.
No provider prompt acceptance has been established. Both operator Codex and
Claude live checks remain DEFERRED; the no-Claude instruction remains active.

Remaining work: reviewed atomic-paste prerequisite; real emitted-byte fixture
RED/GREEN; reconcile narrow provider profiles with measured captures/source;
fresh independent implementation review; root-owned shared bookkeeping and
solo full gate; operator live Codex/Claude acceptance. The sheet stays planned
and is not closed, integrated, promoted or released.

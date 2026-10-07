# V6 A/0/04 build checkpoint 2 — atomic runtime prerequisite

This is a coder checkpoint, not an independent verdict or completed sheet.
The prior checkpoint and plan review trail remain unchanged. A runtime-only
result cannot close A/0/04; live provider acceptance and the complete
candidate gate remain unverified.

- Worktree: `/home/carase/git/personal/AO/workspace/clones/wt-v6-a04`.
- Branch: `feat/V6-A-0-04-safe-submit`.
- Observed HEAD: `327043a50316f3918b06fe30e019ecdc5799b4d3`.
- Trace: `tr-v6-a04-3fd4ba16-8cb9-4093-a782-1489f1ac0b69`.
- Continuation: root-assigned built-in coder after the recorded Gateway
  `REQUEST_CONTEXT_DENIED`, under the operator-authorized fallback. No
  Claude invocation, independent review, staging, commit, push, policies edit,
  full gate or integration occurred. Root changed only the CI runtime
  symlink in this worktree during this continuation.

## Runtime candidate

The pinned tmux 3.6a patch now implements `paste-buffer -G -p -r` and reports
`3.6a-agents.2`. Its server command checks the exact target immediately
before any write. It rejects disabled bracketed paste, exited/input-off
panes, copy/mode state, synchronization, missing `-p`/`-r`, and explicit
separators with only `agents: bracketed paste unavailable`. Explicit
separators are rejected because they would replace payload LF despite `-r`.
The guard and framed enqueue run in the existing synchronous command;
unguarded upstream paste semantics are preserved.

The source archive, Linux builder image, generated parser and capture
protocol are unchanged. `cmd-agents-capture.c` is byte-identical to HEAD;
SHA-256 remains
`4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2`.
The renamed maintained patch is `tmux-3.6a-agents.2.patch`, SHA-256
`c488dccadb08db45c00d7a935f9cfd00735d744d0a68286ef683869e152a74c2`.
Both offline builders, vendor manifest/README, runtime documentation,
retained-helper handshake, and associated relay fixtures/tests use `.2`.
Root reconciled `.github/workflows/ci.yml`'s output symlink to `.2`.
No historical plan/review reference was rewritten.

The existing offline Linux builder ran using the already-local archive
(hash verified) and pinned image, with networking disabled and zero patch
fuzz. Output:

```text
/tmp/ao-a04-runtime-build-vl_1pgz1/tmux-3.6a-agents.2-linux-amd64
version: tmux 3.6a-agents.2
SHA-256: 3d37a94099286f1284373271ed7da3dac69e04fb1dba88bdb6068cfb66ed1428
```

The prior binary remains at
`/tmp/ao-tmux-tools/tmux-3.6a-agents.1-linux-amd64`. No system installation,
live/user server replacement or default user socket operation occurred.
Each raw terminal fixture uses an owned `-S` socket. Its application requests
or disables bracketed paste directly and records received bytes without a
shell/provider parser. Mode acknowledgement is captured after the mode
escape was parsed by the server. All fixture directories were removed; the
owned retained-test socket directory contains zero sockets after completion.

The adapter also maps the old server's fixed unknown-`-G` diagnostic to
`paste_unavailable`; unsupported guards never retry an unguarded paste or raw
keys. Buffer cleanup and separate guarded Enter remain shared.

## TDD and focused verification

| Command / scope | Observed result | Log |
|---|---|---|
| `A04_TEST_TMUX=/tmp/ao-tmux-tools/tmux-3.6a-agents.1-linux-amd64 node --test tests/gateway/guarded_paste.test.js` before runtime edits | RED: exit 1; 6 tests, 1 pass, 5 fail, 0 skip | `/tmp/ao-a04-runtime-red.log` |
| Same real-input tests with `A04_TEST_TMUX=/tmp/ao-a04-runtime-build-vl_1pgz1/tmux-3.6a-agents.2-linux-amd64` | GREEN: exit 0; 6 pass, 0 fail/cancelled/skipped/todo | `/tmp/ao-a04-runtime-green.log` |
| `node --test --test-name-pattern='unsupported guarded option' tests/gateway/prompt_submission.test.js` before error-mapping edit | RED: exit 1; 1 test, 0 pass, 1 fail, 0 skip | `/tmp/ao-a04-option-red.log` |
| `node --test --test-name-pattern='OpenCode' tests/gateway/prompt_submission.test.js` before OpenCode profile | RED: exit 1; 2 tests, 1 pass, 1 fail, 0 skip | `/tmp/ao-a04-opencode-red.log` |
| `PATH=/tmp/ao-a04-runtime-build-vl_1pgz1/bin:$PATH TMUX_TMPDIR=/tmp/ao-a04-runtime-build-vl_1pgz1/test-sockets D007C_TEST_TMUX_PATH=/tmp/ao-a04-runtime-build-vl_1pgz1/bin D007C_RUN_REAL_TMUX_PROBE=1 node --test tests/gateway/process_supervisor_session_port_relay.test.js` | GREEN: exit 0; 62 pass, 0 fail/cancelled/skipped/todo | `/tmp/ao-a04-retained-green.log` |
| Adapter/submission/public-error focused command below | GREEN: exit 0; 115 pass, 0 fail/cancelled/skipped/todo | `/tmp/ao-a04-focused-2-green.log` |
| Scoped production JS ESLint | Exit 0 after correcting one regex-space lint finding | no skipped lint claim |
| `git diff --check`; manifest digests; capture extension comparison to HEAD | Exit 0; digests agree; byte-identical capture extension | scoped checks |
| Full `bash scripts/ci.sh` | NOT RUN; root owns the solo candidate gate | no full-gate claim |

The real-input GREEN asserts complete bracket-start/payload/bracket-end
bytes, including UTF-8, LF, key names and trailing LF, followed only by the
separate explicit Enter. Negative cases assert zero input before checking
the fixed refusal diagnostic. The mode-change test disables the application
mode after the client's last observation. Synchronization also checks a
second raw terminal receives zero bytes. The positive unguarded comparison
checks the original raw LF behavior remains intact.

```bash
node --test tests/gateway/tmux_client.test.js \
  tests/gateway/prompt_submission.test.js \
  tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js \
  tests/gateway/pi_opencode_adapters.test.js \
  tests/gateway/tool_error_serialization.test.js \
  tests/gateway/tool_projection_contract.test.js \
  tests/gateway/tool_catalog.test.js
```

There are 183 passing tests across the three distinct final focused commands
(115 adapter/error + 6 real-input + 62 retained/runtime). The checkpoint-1
112 count is superseded by 115 in that adapter/error command, not added to
this total. These are not full-gate or release totals.

```text
a4121490d546ffb8ac31616e99d4c96df38fd30f0b30b5ce9b7de471d73472ca  ao-a04-runtime-red.log
e4828fa4d41d1cb44b2abb375f06caf9d68d317c9d1376f9fefa4053d0520021  ao-a04-runtime-green.log
41ca320aff3b31e5eaed741e16cc63020c1f6413852a0e71a7578ccf2dcc7416  ao-a04-runtime-build.log
149a61dc3500e8bade31575427dfa2856c07a670ada908fa7f1fd0c261dc5232  ao-a04-option-red.log
549001bd43b7bbc843423ae7635a4cec448a5cd573a44f5dd05c636ef0308548  ao-a04-opencode-red.log
6f276df9e47f5948a3864f53473e8d50080a353dfc46c4a4b98b2b9933958731  ao-a04-retained-green.log
5936c59a06e20953088d47e5a9ad1e83a6176d004e75e5cfbfb4ab86d4bebe86  ao-a04-focused-2-green.log
```

## Provider evidence and unfinished criteria

Codex `0.160.1` and pi `0.73.1` retain the source-backed profiles described
in checkpoint 1. OpenCode `1.18.20` now has a narrow profile derived from
its version-pinned [prompt source](https://github.com/anomalyco/opencode/blob/v1.18.20/packages/tui/src/component/prompt/index.tsx)
and [border source](https://github.com/anomalyco/opencode/blob/v1.18.20/packages/tui/src/ui/border.ts).
It binds the textarea to default left borders, Build/Plan metadata,
placeholder/cursor and the adjacent current interrupt footer. Shell mode,
permission overlays, paste summaries, cursor drift and foreign composer
layouts refuse. The source explicitly summarizes three or more pasted
lines (or over 150 characters) by default, so those unobservable exact drafts
are refused rather than inferred from the sent prompt.

These upstream files were fetched directly into coder-owned scratch, not
executed. Their SHA-256 values are:

```text
fed47f1ef68ee6d96db553749570d073e539d0544e89aa5968ff1f55a3828d6e  component-prompt-index.tsx
8a2867b9548186004305e4947dcdaa006cdc1d8d808a9bc2c55678a043c937ed  ui-border.ts
```

No source fixture is a live acceptance capture. No live provider prompt
acceptance was performed. The 150 ms settle default is still simulation
only. Custom layouts, themes, agents, shortened Codex footers, paste summaries
and other uncertain drafts remain unsupported. Claude `2.1.292` was not
invoked (including version commands); its native distribution was inspected
read-only but no sufficient positive profile was established. Antigravity's
configured executable is `agy`, unavailable locally; Gemini CLI is a different
registry-only provider and supplies no substitute evidence. Claude and
antigravity still refuse `unknown_state` for every composer. That functional
gap cannot be counted as complete A/0/04 coverage.

Still required: verified positive profiles/captures for remaining executable
providers; operator live Codex/Claude acceptance (Claude explicitly DEFERRED
while prohibited); live timing measurement; independent implementation
review; root's solo full gate and skip budget; root-owned review/index/status
and integration bookkeeping. Native Darwin artifacts were not built or run.
The candidate is uncommitted and unreviewed; A/0/04 is not closed, integrated,
promoted or released.

## Root handoff

Preserve all checkpoint-1 adapter/error candidate files. This continuation
adds the versioned vendor patch/manifest/builders/README, runtime docs,
helper exact-version seam and associated relay tests/fixture; the raw
terminal tests/fixture; the bounded unsupported-option projection; the
OpenCode source profile/tests and updated Gateway README. Root additionally
owns the workflow runtime symlink, review/index registries, shared
CI/inventory reconciliation and all commits/integration.

For the full gate use the existing scratch `bin/tmux` symlink to the `.2`
binary. `PATH` and `D007C_TEST_TMUX_PATH` must include
`/tmp/ao-a04-runtime-build-vl_1pgz1/bin`; select
`D007C_RUN_REAL_TMUX_PROBE=1`. Create a fresh private `TMUX_TMPDIR` and only an
owned bootstrap session there if required by the gate. Do not attach to or
stop a user/default server. The current retained test socket directory is
already empty. Runtime changes do not affect a serving Gateway until the
operator restarts it with the intended executable path.

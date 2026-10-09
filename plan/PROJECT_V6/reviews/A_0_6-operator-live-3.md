# A/0/06 live acceptance attempt 3: PASS

Orchestrator evidence, 2026-10-09. This file records observations only; it is not a review
verdict.

## Candidate

- Branch and commit: `release/1.1.0` at `8bc4c87`.
- Code tree: the green [merged gate 2](A_0_6-livefix-merged-gate-2.md) tree `8ee0933`.
- The two failed earlier attempts: [live-1](A_0_6-operator-live-1.md) and [live-2](A_0_6-operator-live-2.md).

## Setup

- **Gateway.** A dedicated Gateway ran this checkout's `gateway/src/mcp_server.js` through an MCP
  stdio driver. It used an isolated `AGENTS_WORKSPACE`, base `policies/` (no auto-answer scopes) and
  a throwaway `sample-apps` repository.
- **Provider.** A real Codex CLI 0.162.0 session (`gpt-6.1-sol` medium), spawned as `coder`.
- **tmux server.** The pinned binary, reporting `#{version}` = `3.6a-agents.4`, ran under an isolated
  `TMUX_TMPDIR`.
  - Running server: `/proc/3204091/exe` resolves to
    `workspace/tmux-pinned/a06-impl-1-A/tmux-3.6a-agents.4-linux-amd64`.
  - That executable's SHA-256 is `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac`,
    the reviewed reproducible build. It was the same hash before and after the cases.
  - The operator's default tmux server was not used, so no `.3` cutover was involved.
- **Approvals.** Every approval was sent from a separate process with
  `agent-run approve <id> --decision …`, against the run's state.

## Results

| # | Case | Observed | Verdict |
|---|---|---|---|
| 1 | Codex trust prompt | The CLI exited 0 with `answered/sent`. Codex reached its composer. | PASS |
| 2 | Short command `touch ~/a06m`, menu at the pending-wrap cursor (`cursor 80,23`, width 80) | Detected as `session.prompt.command`. After the grant, the CLI exited 0 with `answered/sent` and **the file was created**. This was the failure in live-1 and live-2 (F2). | PASS |
| 3 | Replay: case 2's ID approved again | The CLI reported the stored `answered/sent` and exited 0. No new `SESSION_PROMPT_ANSWERED` event appeared (2 before, 2 after), so no second key was sent. | PASS |
| 4 | Long command whose persistent option wraps (`touch <run>/outside-marker-long`) | Detected as `session.prompt.command`, where it had been `unknown` before (F1). After the grant, the CLI exited 0 with `answered/sent` and **the file was created**. | PASS |
| 5 | No grant, then denial (`touch ~/a06deny`) | The approval was still `pending` after 20 s, with no auto-answer under the empty default scopes. After `--decision denied`, the CLI exited 0 with `denied`. **The file was not created** and no key was sent. When the orchestrator then dismissed the menu with Esc, the old ID was invalidated with `prompt_no_longer_bound/prompt_changed`. | PASS |

## Audit and state

- **Audit.** There were 6 `SESSION_PROMPT_ANSWER_ATTEMPT` events: three `attempting`→`sent`
  pairs, all with response `Enter`. The persistent "don't ask again" option `p` was never selected.
  There were 3 `SESSION_PROMPT_ANSWERED` events and 1 invalidation (case 5, after Esc).
- **State.**
  - trust: granted, `answered/sent`;
  - two commands: granted, `answered/sent`;
  - one command: denied, `not_answered`.
- **Cleanup.** The marker files in `$HOME` were removed afterwards.

## Not covered

- Claude Code permission prompts. Claude 2.1.295 composer delivery is the subject of V7 A/0/05.
- Auto-answer scopes. None are configured, by the operator's decision.

## Raw artifacts

Kept locally under the gitignored `workspace/a06-live/run-211417/`: the driver, a copy of the state
DB, the audit log and per-case CLI outputs.

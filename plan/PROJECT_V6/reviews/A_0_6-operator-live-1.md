# A/0/06 operator response — live acceptance attempt 1: FAILED

Orchestrator evidence, 2026-10-09. Candidate: `release/1.1.0` at `444e811`
(code merge `1ce3f55`). This is not a review verdict. **A/0/06 stays
`integrated`, not accepted.**

## Setup

- A dedicated Gateway started from this checkout by an MCP stdio driver, so it
  ran the merged code. The two pre-existing operator Gateways (started 10:14 and
  12:23) predate the merge.
- Isolated `AGENTS_WORKSPACE`, base `policies/` (no auto-answer scopes, as decided on
  2026-10-07), and a throwaway `sample-apps` git repository under the run directory.
- Real Codex CLI 0.162.0, `gpt-6.1-sol` at medium, spawned through `agent.spawn`
  as `coder`.
- The tmux server was the pinned `3.6a-agents.3` (isolated `TMUX_TMPDIR`).
- Each approval was answered from a separate process with
  `agent-run approve <id> --decision granted`, with `AGENTS_WORKSPACE` set to the
  run's state.

A first run on the system tmux 3.6 server was discarded as a harness error. It
refused correctly: the guard requires `3.6a-agents.3` and `agents-submit-v1`.

## Results

| Case | Observed | Verdict |
|---|---|---|
| Codex "Trust this folder" | Detected as `session.prompt.trust`. The CLI exited 0 in 0.6 s with `answered/sent`. Audit: `attempting` → `sent` → `SESSION_PROMPT_ANSWERED`. Codex continued to its composer. | PASS |
| Command whose persistent option wraps onto two pane rows (long absolute path) | Classified as `session.prompt.unknown`. The CLI exited 1 with `refused/human_intervention_required`. No key was sent, the menu remained visible, and the command did not run. | Fail-closed as designed. Finding F1. |
| Short command `touch ~/a06m` (single-row options) | Detected as `session.prompt.command`, options `y,p,esc`. It stayed `pending` for ≥20 s with no automatic answer. The CLI then exited 1 with `not_answered/refused (guard_refused)`. No key was sent and `~/a06m` was not created. Reproduced twice. | **FAIL**. Finding F2. |

## Findings

**F1 — wrapped persistent option makes long commands `unknown`.**
`recognizeCodexPrompt` (`gateway/src/adapters/codex_adapter.js:37`) requires the
`2. Yes, and don't ask again for commands that start with … (p)` row on one line.
In an 80-column pane it wraps for any but very short commands. Fail-closed, but it
blocks the realistic case.

**F2 — granted short command is never delivered.**
On both attempts the stored payload shows `consumed: true`, yet the audit has no
`SESSION_PROMPT_ANSWER_ATTEMPT outcome=attempting` event. The trust case has both.
In `session_prompt_service.js:98-122`, `authorize` consumes the approval and then
writes the write-ahead audit. This sequence is consistent with that audit write (or
something after the consume) failing and aborting authorize, which reports
`guard_refused`. Root cause not established.

Ruled out on the live pane:

- the observe capture and the guarded evidence capture are byte-identical (1897
  bytes);
- the recognizer output equals the stored command and options;
- the pane did not change between detection and decision on attempt 2.

## Not verified

- The root cause of F2.
- Claude Code permission prompts.
- An auto-answer scope (none configured by decision).

Raw artifacts (state DB copy, audit log, pane captures, CLI outputs, driver) are
local under `workspace/a06-live/run-154702/`, which is gitignored and contains
absolute paths.

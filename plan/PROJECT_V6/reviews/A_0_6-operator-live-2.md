# A/0/06 live acceptance attempt 2: F2 root cause observed

Orchestrator evidence, 2026-10-09. This is not a review verdict. A/0/06 stays `integrated`, not accepted.

## Correction to attempt 1

[`A_0_6-operator-live-1.md`](A_0_6-operator-live-1.md) read `consumed: true` without an
`attempting` audit as a clue to F2's location. That reading was wrong.
`recordPromptAnswer` (`gateway/src/core/repositories/approval_repo.js:131`) writes
`consumed: true` on every terminal result, including the successful trust answer. The flag
does not locate the refusal.

## Setup

Same harness as attempt 1, with one difference: the dedicated Gateway ran the uncommitted
live-fix candidate from `workspace/clones/wt-v6-a06-livefix`. That candidate is based on
`1248f68` and adds the diagnostic refusal-stage codes and the F1 recognizer fix. The rest of
the setup was unchanged:

- Codex CLI 0.162.0;
- the pinned `tmux 3.6a-agents.3` server;
- base `policies/`;
- an isolated state;
- `agent-run approve` from a separate process.

## Observed

| Case | Result |
|---|---|
| Trust prompt | `answered/sent`, exit 0 (reproduced). |
| `touch ~/a06m` command prompt | Recognized as `session.prompt.command` and left pending. After the grant, the result was `not_answered/refused`, reason `guard_refused`, **detail `geometry_unavailable`**, recorded in both `promptAnswer` and the `SESSION_PROMPT_ANSWER_ATTEMPT` audit. No key was sent and the file was not created. |

Live pane state while the command menu was showing:
`pid|pane_id|pane_pid|width|height|cursor_x|cursor_y|cursor_flag` =
`…|%0|…|80|24|80|23|0`.

## Root cause of F2

Codex 0.162 leaves the cursor hidden (`cursor_flag=0`) at `cursor_x = 80` on an 80-column
pane. This is tmux's pending-wrap column. `answerSessionPrompt` rejects
`Number(cursorX) >= Number(width)` (`gateway/src/adapters/session_prompt.js`, geometry check),
so every Codex 0.162 command prompt is refused before input. The trust screen leaves the
cursor inside the pane, which is why it is delivered.

Any fix must keep the guarded-submit binding sound. Two things must be checked:

1. whether the patched `agents-submit-v1` accepts and re-verifies `cursor_x == width`;
2. that no other geometry relaxation is introduced.

Raw artifacts are local under `workspace/a06-live/run-170128/`: state copy, audit, the
`geometry.txt` capture and the pane capture.

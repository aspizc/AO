# A_0_6 — Pending-wrap `.4` cutover and Darwin scope: operator decision

Recorded on 2026-10-09 from the operator's direct answers in this session.
This file records those answers; it is not an agent-issued approval.

These answer the two human-gated questions in
[`A_0_6-pendingwrap-design-1_reviewed_KO.md`](A_0_6-pendingwrap-design-1_reviewed_KO.md).

1. **Upgrade cutover:** manual restart. The runbook documents that the operator restarts a
   still-running `3.6a-agents.3` tmux server when no sessions are live. Until then, a `.4`
   Gateway fails closed against it: no prompt answers, no composer submits, and no retained
   relay handshake are sent. The Gateway performs no automatic restart.
2. **Darwin:** Linux only. AO 1.1.0 claims `3.6a-agents.4` support only on linux/amd64, where
   it is built and tested. Darwin `.4` support is explicitly excluded from the release claim
   until a native build exists.

# A_0_6 — Pending-wrap cursor (F2): operator decision

Recorded on 2026-10-09 from the operator's direct answer in this session.
This file records that answer; it is not an agent-issued approval.

Context: [live attempt 2](A_0_6-operator-live-2.md). Codex 0.162 leaves the hidden cursor at
`cursor_x == pane_width`, the tmux pending-wrap column, while it shows a command-approval menu.
Both the Gateway geometry check and the vendored guarded submit reject that column
(`gateway/vendor/tmux-agents/tmux-3.6a-agents.3.patch:191`, `cx >= width`). As a result, granted
Codex command prompts fail closed and are never delivered. Trust prompts are delivered.

Options considered:

1. Ship 1.1.0 with the limitation documented.
2. Fix the tmux patch now.
3. Leave 1.1.0 pending.

The operator selected **option 2: fix the vendored tmux patch now**, before 1.1.0. Delivery is
design-first:

- a design for a `3.6a-agents.4` patch that accepts exactly `cx == width` and re-verifies it at
  submit time, with no other relaxation, independently reviewed before any code;
- implementation, rebuild, updated vendor manifest and hashes;
- full gate and live acceptance again.

This decision does not change the [command-scope decision](A_0_6_human_decision.md) or the
[operator-response decision](A_0_6_operator_response_decision.md).

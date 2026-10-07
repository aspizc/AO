# PROJECT_V6 operator decisions

Recorded from the operator's direct instructions on 2026-10-07.

| Gate | Decision | Evidence |
|---|---|---|
| A/0/05 | Same user and canonical repo may explicitly reattach; no extra approval | [Decision](reviews/A_0_5_human_decision.md) |
| A/0/06 | No automatic command scopes by default; operator adds bounded scopes in policies/; never persistent approval | [Decision](reviews/A_0_6_human_decision.md) |
| A/0/03 | Option (a): release/1.1.0 descends from 1.0.0 at 41f9ce2 | [Decision](reviews/A_0_3_human_decision.md) |
| A/0/02 | Preserve KYA-derived practices as generic AO workflows; keep historical documents intact with an explicit history allowlist | [Workflow decision](reviews/A_0_2_human_decision.md), [history decision](reviews/A_0_2_history_decision.md) |

## Temporary execution constraint

Do not invoke Claude while the operator's no-Claude instruction is active.
Use Codex for authoring and a separately assigned Codex reviewer. This is a
temporary vendor exception, not a global default-model change. Offline
Claude-adapter tests using fixtures/fake binaries may run. Required live
Claude checks remain deferred until the operator lifts the restriction;
do not count them as passed or substitute Codex evidence for them.

## Schedule

The operator approved wave 1 A/0/04 parallel with A/0/02, followed by wave 2
A/0/00 then A/0/01. The received table ended during wave 2. The imported
plan's other ordering is retained provisionally: A/0/05 alongside wave 2,
A/0/06 in wave 3, release A/0/03 last. Dependencies are recorded in SHEETS.md;
parallel work uses isolated trees and serial integration for shared files.

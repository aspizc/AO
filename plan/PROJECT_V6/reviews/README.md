# Project V6 review trail

Review submissions and independent verdicts, indexed as they are produced. A
KO is preserved; corrections use the next trial number. Stop and page the human after
15 KO trials on one task, as required by AGENTS.md Rule 13.

| Scope | Trial | Submission | Verdict |
|---|---:|---|---|
| A/0/04 bounded live ready-profile correction | 2 | [request](A_0_4-live-profile-2_to_review.md) | [OK, source review only](A_0_4-live-profile-2_reviewed_OK.md) |
| A/0/04 bounded live ready-profile correction | 1 | [request](A_0_4-live-profile-1_to_review.md) | [OK, source review only](A_0_4-live-profile-1_reviewed_OK.md) |
| A/0/04 prompt submission implementation | 6 | [request](A_0_4-6_to_review.md) | [OK, source review only](A_0_4-6_reviewed_OK.md) |
| A/0/04 prompt submission implementation | 5 | [request](A_0_4-5_to_review.md) | [KO, bounded source review](A_0_4-5_reviewed_KO.md) |
| A/0/04 prompt submission implementation | 4 | [request](A_0_4-4_to_review.md) | [KO, bounded source review](A_0_4-4_reviewed_KO.md) |
| A/0/04 prompt submission implementation | 3 | [request](A_0_4-3_to_review.md) | [KO, partial source review](A_0_4-3_reviewed_KO.md) |
| A/0/04 prompt submission implementation | 2 | [request](A_0_4-2_to_review.md) | [KO, partial source review](A_0_4-2_reviewed_KO.md) |
| A/0/04 guarded final submit design | 6 | [request](A_0_4-final-submit-plan-6_to_review.md) | [OK](A_0_4-final-submit-plan-6_reviewed_OK.md) |
| A/0/04 guarded final submit design | 5 | [transport addendum request](A_0_4-final-submit-plan-5_transport-addendum_to_review.md); [supporting proposal](A_0_4-final-submit-plan-5_to_review.md) | [KO](A_0_4-final-submit-plan-5_reviewed_KO.md) |
| A/0/04 guarded final submit design | 4 | [request](A_0_4-final-submit-plan-4_to_review.md) | [KO](A_0_4-final-submit-plan-4_reviewed_KO.md) |
| A/0/04 prompt submission implementation | 1 | [request](A_0_4-1_to_review.md) | [KO](A_0_4-1_reviewed_KO.md); [context correction](A_0_4-1_review_context_correction.md) |
| A/0/02 history retention decision | 1 | [request](HISTORY_DECISION_2026_10_07-1_to_review.md) | [OK](HISTORY_DECISION_2026_10_07-1_reviewed_OK.md) |
| A/0/04 guarded runtime prerequisite | 3 | [request](A_0_4-plan-3_to_review.md) | [OK](A_0_4-plan-3_reviewed_OK.md) |
| A/0/04 safe submission plan | 2 | [request](A_0_4-plan-2_to_review.md) | [OK](A_0_4-plan-2_reviewed_OK.md) |
| A/0/04 safe submission plan | 1 | [request](A_0_4-plan-1_to_review.md) | [KO](A_0_4-plan-1_reviewed_KO.md) |
| Main documentation publication | 1 | [request](MAIN_DOCS_2026_10_07-1_to_review.md) | [OK](MAIN_DOCS_2026_10_07-1_reviewed_OK.md) |
| README parallel operation | 1 | [request](README_PARALLEL_2026_10_07-1_to_review.md) | [OK](README_PARALLEL_2026_10_07-1_reviewed_OK.md) |
| README lifecycle guide | 1 | [request](README_LIFECYCLE_2026_10_07-1_to_review.md) | [OK](README_LIFECYCLE_2026_10_07-1_reviewed_OK.md) |
| Generic AO workflow direction | 1 | [request](GENERIC_DIRECTION_2026_10_07-1_to_review.md) | [OK](GENERIC_DIRECTION_2026_10_07-1_reviewed_OK.md) |
| AO V6 preparation | 2 | [request](PREPARATION_2026_10_07-2_to_review.md) | [OK](PREPARATION_2026_10_07-2_reviewed_OK.md) |
| AO V6 preparation | 1 | [request](PREPARATION_2026_10_07-1_to_review.md) | [KO](PREPARATION_2026_10_07-1_reviewed_KO.md) |

## Operator decisions and baseline

- [A_0_5: reattachment](A_0_5_human_decision.md)
- [A_0_6: command scopes](A_0_6_human_decision.md)
- [A_0_3: release lineage](A_0_3_human_decision.md)
- [A_0_2: original snapshot questions](A_0_2_to_check_by_human.md)
- [A_0_2: generic workflow direction](A_0_2_human_decision.md)
- [A_0_2: history retention answered](A_0_2_history_decision.md)
- [AO baseline](../BASELINE.md)

The operator temporarily prohibits Claude execution. This preparation uses
Codex authoring and a distinct Codex reviewer under the already-authorized
session-agent fallback; it is not cross-vendor or Gateway-spawned review.

## Current build checkpoint

A/0/04 implementation trial 1 is independently KO; no candidate code is integrated.
The operator re-enabled Claude and selected Opus 5.5 medium for new reviews,
and GPT-6.1 medium priority for coders. Historical preparation attribution above
remains historical. See the immutable trial-1 context correction.

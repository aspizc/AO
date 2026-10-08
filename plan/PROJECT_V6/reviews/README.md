# Project V6 review trail

Review submissions and independent verdicts, indexed as they are produced. A
KO is preserved; corrections use the next trial number. Stop and page the human after
15 KO trials on one task, as required by AGENTS.md Rule 13.

| Scope | Trial | Submission | Verdict |
|---|---:|---|---|
| A/0/05 local recovery implementation | 2 | [checkpoint 18 handoff](A_0_5-18_unreviewed_handoff.md) | [KO](A_0_5-2_reviewed_KO.md): default-isolation test failure, orphaned private delegate server, thread-children gap, denial-envelope override; gate and live check pending |
| A/0/05 local recovery implementation | 1 | [request](A_0_5-1_to_review.md) | [source-only OK](A_0_5-1_reviewed_OK.md); [full gate failed](A_0_5-1-root-gate-failure.md), trial 2 needed |
| A/0/05 append-only recovery migrations | 2 | [request](A_0_5-plan-2_to_review.md) | [OK](A_0_5-plan-2_reviewed_OK.md) |
| A/0/05 local recovery contract | 1 | [request](A_0_5-plan-1_to_review.md) | [KO](A_0_5-plan-1_reviewed_KO.md) |
| Integration status documentation | 1 | [request](INTEGRATION_STATUS-1_to_review.md) | [OK](INTEGRATION_STATUS-1_reviewed_OK.md) |
| A/0/02 implementation | 2 | [request](A_0_2-2_to_review.md) | [OK](A_0_2-2_reviewed_OK.md) |
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
- [A_0_2: authorized registry migration](A_0_2_operator_registry_decision.md)
- [AO baseline](../BASELINE.md)

The operator temporarily prohibits Claude execution. This preparation uses
Codex authoring and a distinct Codex reviewer under the already-authorized
session-agent fallback; it is not cross-vendor or Gateway-spawned review.

## Implementation checkpoints

- [A/0/02 integration and gate limits](A_0_2_integration_checkpoint.md)
- [A/0/04 adapter checkpoint, unreviewed](A_0_4-build-1_checkpoint.md)
- [A/0/04 guarded runtime checkpoint, unreviewed](A_0_4-build-2_checkpoint.md)

- [A/0/05 discovery checkpoint, implementation pending](A_0_5-1_implementation_checkpoint.md)

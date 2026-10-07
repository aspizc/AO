# V7 A/0/01 — Budget schema artifact correction

Date: 2026-10-07. Coder: `/root/implement_v7_a01`.
Trace: `tr-v7-a01-f75e045d-8572-4862-a0ee-3ac0e575b7ca`.
Branch: `feat/V7-A-0-01-shared-capacity`.
Append-only coder evidence; independent review and final candidate binding
belong to root. Prior handoffs, checkpoints and archives are preserved.

Root identified that SHEETS.md explicitly lists
`schemas/wave-budget-v1.schema.json`, whereas the initial candidate had
the closed runtime validator and only the shared error schema. This
correction supplies that named artifact; the omission was not a reviewed
waiver. A/0/05 remained read-only while this correction took priority.

## Change and scope

Added the closed Draft 2020-12 structural schema and one parity intent test
in the existing `test_wave_budget.py`. The test validates actual written JSON
for the initialized empty ledger and reserved/possible/active/closed entries,
then verifies schema and runtime both reject missing and unknown fields,
wrong version, invalid IDs, bool/negative/out-of-range counters, invalid
provider maps, missing memory declarations, incompatible effect references
and the 1025-record boundary. Its provider-ID projection is checked against
the existing canonical profile schema, rather than defining a new registry.
Local-ID bounds are copied from the existing shared wave-error schema.

The schema describes structural validation. Runtime remains responsible for
headroom being below its particular host ceiling, unique reservation IDs,
aggregate held vectors and strict integer decoding. Standard JSON Schema
has no portable arithmetic or uniqueness-by-field constraint for those
relations; its `$comment` makes that limitation explicit. No schema result
substitutes for the locked runtime validator or admission transaction.

No production ledger, command, error behavior, resource lifecycle, gate,
policy or host configuration changed. Root's concurrent registry/status,
main.py, CI inventory and documentation work was preserved. No full gate,
commit, provider, sub-agent or independent verdict was run by this coder.

## RED and GREEN

Named test:
`test_budget_schema_matches_emitted_closed_dtos_and_rejects_invalid_shapes`.

Before creating the schema, the new test failed on its absent artifact:
**1 failed, 61 deselected**, exit 1. After schema creation, its first focused
run was **1 passed, 61 deselected**, exit 0. A subsequent assertion intended
for the new parity test was briefly inserted into an earlier test by an
ambiguous patch context; scoped Ruff and pytest detected the undefined
validator (**1 failed, 79 passed**). The misplaced line was removed and
inserted in the parity test; no existing assertion or production behavior
was weakened. The failed run is retained rather than hidden.

Final focused command:

```bash
PYTHONPATH=cli/src:orchestrator-langgraph/src .venv/bin/python -m pytest -q orchestrator-langgraph/tests/test_wave_budget.py tests/cli/test_wave_budget_command.py tests/cli/test_cli_scaffold.py tests/cli/test_cli_output.py
```

Result: **80 passed, 0 failed, 0 skipped**, exit 0.
Scoped Ruff: **PASS**, exit 0. `git diff --check`: **PASS**, exit 0.

The complete LangGraph lane through unchanged `ci_gate._run_suite` reports
**143 passed, 0 failed, 3 declared integration skips**, errors empty and
no leftover process. Its honest status is `infrastructure_unavailable` for
the unchanged Gateway/Temporal integration skips; no live integration or
full aggregate gate success is claimed here. Root's earlier **2720 passed,
0 failed, 12 skipped** full gate preceded this schema/test and must be
rebound to the final candidate by root.

## Preserved evidence and earlier hash clarification

Five lossless `.txt.gz` archives preserve the raw `/tmp/ao-v7-a01-budget-schema-*.log`
outputs, including the intermediate patch failure. All gzip round trips were
verified. Commit archives rather than raw text with pytest-generated trailing
whitespace:

- `A_0_1-1-budget-schema-red.txt.gz`
- `A_0_1-1-budget-schema-green.txt.gz`
- `A_0_1-1-budget-schema-green-scoped.txt.gz`
- `A_0_1-1-budget-schema-green-final.txt.gz`
- `A_0_1-1-budget-schema-owned-green.txt.gz`

Root clarified the immutable owned-runtime checkpoint's original gate hash:
the retained failed run is `/tmp/ao-v7-a01-gate-1-failed.log`, with SHA-256
`61cb09237c1900e17b46b6e65e10b28811e98ca218df7c89e0f94647749f7f1c`.
The old checkpoint sampled the reused gate path during a rerun and is not
the failed-run binding. That checkpoint is left unchanged; root's final
binding should explicitly use the retained failed artifact. Its earlier
**2578 passed, 1 failed, 9 skipped** result remains failure evidence.

The schema and test are now settled. Root should stage the new artifact and
updated test, seal the candidate with its solo full gate, and assign a fresh
independent review. This correction supplies no acceptance or integration
authority.

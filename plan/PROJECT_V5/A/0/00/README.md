# A/0/00 execution tree

This directory materializes the five Project V5 epics and their 25 executable
sheets. [`../00.md`](../00.md) remains the umbrella contract and final
`A_0_0` review id.

| Epic | Outcome | Sheets |
|---|---|---|
| [E0](E0/README.md) | Contract and plan | 3 |
| [E1](E1/README.md) | Domain service | 7 |
| [E2](E2/README.md) | Redis transport | 6 |
| [E3](E3/README.md) | Direct/MCP access and audit | 5 |
| [E4](E4/README.md) | Operability and closure | 4 |

The global DAG, gates, and invariants live in
[`../../../EPICS.md`](../../../EPICS.md). The cross-epic registry and
acceptance ownership map live in [`../../../SHEETS.md`](../../../SHEETS.md).

Every sheet follows RED → GREEN → refactor, records its verification, and
produces an English commit referencing `V5 A/0/00` plus the sheet id.

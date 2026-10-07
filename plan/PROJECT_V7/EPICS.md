# PROJECT_V7 epics and gates

Status: **planned**. One bounded epic: reusable project execution with visible
local scheduling and recovery state. Epic/story definitions are inputs, not
model-driven runtime routing.

```text
A/0/00 profile ----------+
                        +--> A/0/02 wave --> A/0/03 recovery --> A/0/04 E2E
A/0/01 capacity ---------+          ^                  ^              ^
V6 A/0/04 prompt -------------------+------------------+--------------+
V6 A/0/05 reattach -------------------- restart lane only -----------+
```

| Gate | Observable requirement | Owner |
|---|---|---|
| G1 profile | Invalid paths/DAG/selection fail before Gateway or check launch; valid service and CLI inputs emit deterministic safe preflight | A/0/00 |
| G2 admission | Two real cooperating processes cannot exceed the shared count/declared-memory vector after host headroom; uncertain effects retain capacity | A/0/01 |
| G3 dispatch | Multiple task traces use one SDK connection; supervised phases, automated authorized-parent review control, errors, conflict serialization, and ownership are observed | A/0/02 |
| G4 recovery | Durable intent/response boundaries survive interruption; status is safe and explicit reattachment precedes any resumed task calls | A/0/03 |
| G5 vertical proof | Required external two-project/two-orchestrator suite covers all preceding gates without provider spend or skip | A/0/04 |

Invariants: Gateway policy and request context remain authoritative; profiles,
checkpoints, receipts, coordination messages, and reservation IDs grant no
Gateway authority. Logical manifest task IDs are distinct from Gateway task
IDs. Review sessions differ from coder sessions. Unknown effect outcome is
`recovery_required`, never success. Receipt acceptance is controller input from
the already-authorized parent orchestrator or operator, not the V5 review gate;
configured human gates remain binding. A distinct review artifact supplies
evidence, never authority. No `orchestration.complete` is automatically issued
by this runner.

Path ownership is in [SHEETS.md](SHEETS.md). Shared CLI and gate-manifest
integration is serial and reviewed on the combined candidate.

# Stage B — Coordination contract and orchestrator profile

Status: **`B/0/00–02` and `B/0/05` complete and independently reviewed;
`B/0/03–04` remain dependency-gated**.

Baseline: `A/0/00` is implemented and independently reviewed. Project V4
rebaseline specifications are integrated into `develop`; any `absorbed_from`
value records design provenance, not implemented behavior.

| Sheet | Outcome | Status | Functional priority |
|---|---|---|---|
| [B/0/00](0/00.md) | Field-specific validation and usable lease policy | complete | P0 urgent |
| [B/0/01](0/01.md) | Canonical scope and coordination health | complete | P0 urgent |
| [B/0/05](0/05.md) | Artifact-list caller, policy, and audit parity | complete | P0 urgent |
| [B/0/02](0/02.md) | Self-renewing orchestrator client profile | complete | P1 |
| [B/0/03](0/03.md) | Notice-to-decision-artifact protocol | planned | P1 |
| [B/0/04](0/04.md) | Two-orchestrator acceptance | planned | P1 |

The trial-1 KO artifacts and trial-2 corrections remain visible beside the
four final OK verdicts. Verification did not reconnect or stop a shared
MCP/Redis instance.

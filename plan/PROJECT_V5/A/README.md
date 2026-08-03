# Stage A — Coordination protocol and implementation

Stage A defines and ships the first complete coordination-plane slice. Its exit
criterion is a tested exchange between two independently registered
participants over one Redis namespace, with equivalent service and MCP
semantics.

| ID | Title | Depends on |
|---|---|---|
| [A/0/00](0/00.md) | Redis coordination bus with MCP and direct access | Project V1 Redis infrastructure |

The umbrella task is materialized as five epics and 25 executable sheets under
[`0/00/`](0/00/README.md).

The historical A delivery remains closed. Contract corrections and the full
post-audit roadmap continue under [Stage B](../B/README.md) through Stage I;
their evidence must not be backdated into the `A_0_0` review.

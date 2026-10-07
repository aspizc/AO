# Stage A — Generic execution foundation and acceptance

Status: **A/0/01 integrated on the release branch; four leaves planned**.
Automatic wave dispatch and release remain pending.

| Sheet | Outcome | Status | Priority |
|---|---|---|---|
| [A/0/00](0/00.md) | Project schema, deterministic preflight and generic examples | planned | P0 |
| [A/0/01](0/01.md) | Shared local count/declared-RAM capacity after host headroom | integrated | P0 |
| [A/0/02](0/02.md) | One persistent SDK connection per wave, supervised phases and authorized-parent review control | planned | P0 |
| [A/0/03](0/03.md) | Durable checkpoint/status and explicit recovery | planned | P0 |
| [A/0/04](0/04.md) | External two-shape/two-orchestrator proof | planned | P1 |

Dependencies: `00 + 01 + V6 A/0/04 → 02 → 03 → 04`.
`V6 A/0/05 → 03 restart acceptance + 04`; no restart acceptance before that
external dependency is satisfied. Blocks and file ownership are registered in
[SHEETS.md](../SHEETS.md). Root owns CLI registration conflicts, gate inventory,
serial integration, and independent review assignment.

Implementation order: profile/capacity foundations in parallel isolated
worktrees; wave dispatch; checkpoints/recovery; external acceptance. New plan
claims remain `planned` until implementation and independent evidence exist.

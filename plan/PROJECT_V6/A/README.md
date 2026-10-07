# Stage A — Worker confinement, worker identity, and AO 1.1.0

Status: **in progress**; A/0/02 integrated on the release branch.

| Sheet | Outcome | Status | Functional priority |
|---|---|---|---|
| [A/0/00](0/00.md) | Children of the five executable providers (Codex, Claude, antigravity, pi, opencode) run read-only unless the resolved policy grants `code.write`; `gemini-cli` stays registry-only | planned | P0 — least privilege for review/plan seats |
| [A/0/01](0/01.md) | Every child of the five executable providers carries `AGENTS_WORKER_ROLE` / `AGENTS_WORKER_TRACE_ID` / `AGENTS_WORKER_TASK_ID` | planned | P1 — plugin worker detection |
| [A/0/02](0/02.md) | Generic setup removes personal registrations/home paths and preserves reusable planning/workflow knowledge | integrated | P0 — publication hygiene |
| [A/0/04](0/04.md) | `agent_ask` sends the prompt literally, submits it separately and confirms it was accepted | planned | P0 — supervised children receive their prompts |
| [A/0/05](0/05.md) | A persisted trace can be explicitly re-attached by its principal after a host restart | planned | P0 — control of live children survives a restart |
| [A/0/06](0/06.md) | Children's trust and permission prompts become approval requests decided by policy | planned | P1 — unattended supervision |
| [A/0/03](0/03.md) | Release verifier accepts unprefixed tags; AO `1.1.0` released with A/0/00–02 and A/0/04–06 | planned | P1 |

Dependencies: `A/0/00 → A/0/01`; `A/0/00, A/0/04 → A/0/06`; `A/0/00, A/0/01, A/0/02, A/0/04, A/0/05, A/0/06 → A/0/03`.
Execution order: wave 1 = `A/0/04` ∥ `A/0/02`; wave 2 = `A/0/00` → `A/0/01`, with `A/0/05` in parallel; wave 3 = `A/0/06`; wave 4 = `A/0/03` (operator-approved reorder, 2026-10-07; see [`../README.md`](../README.md)).

Registered in [`../SHEETS.md`](../SHEETS.md).

Parallel sheets use isolated worktrees and serial integration; shared
`config.js` edits in wave 1 require explicit conflict review (project README).

A/0/04's reliability refinement also owns its public `agent.ask` error
projection and derived catalog evidence. Its composer-only helper refuses
decision menus; A/0/06 uses a separate approval-bound answer operation.
Serialize catalog/contract reconciliation with A/0/05 and A/0/06. These
shared paths do not add a functional dependency or change the wave order.

The build-discovered [A/0/04 transport prerequisite](0/04-transport.md)
requires an atomic guarded paste in the pinned tmux runtime. Vendor/runtime
pin changes and their real-input tests stay inside A/0/04; no eighth leaf or
permission scope is introduced.

A/0/05 recovery is scoped to verified Linux local stdio/SQLite identity and
state, with all repository bindings and prior-owner liveness checked before
explicit reattachment. Unsupported recovery backends fail closed while
ordinary calls keep working; no extra approval or new leaf is introduced.

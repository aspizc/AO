# Project V6 — Worker confinement, worker identity, and AO 1.1.0

Status: **in progress**. A/0/00 is reviewed and integrated at
`a8e84303130096f3c90d179f69736a0f8247846f` on `release/1.1.0`.
A/0/02 is reviewed and integrated at
`7df29bda06aa3a139903dbb0cfc61860029f8159`; A/0/04 is reviewed and
integrated at `343222e869e02b1860a384e52788378e7bb74734` on
`release/1.1.0`. A/0/01 is reviewed and integrated at
`69f222f852c80d299ae562f1f9d6f7bf75ca1a10`. A/0/05 and the reviewed
A/0/04 live refinement are integrated at `7982e422577ad6dfb37ef0c7b1e3c8433735430a`.
Two sheets remain unfinished; no V6 feature is promoted to main or released as 1.1.0.
See the [A/0/01 integration verdict](reviews/A_0_1-integration-1_reviewed_OK.md) and [merged-tree gate](reviews/A_0_1-integrated-gate.md).
See the [A/0/00 integration verdict](reviews/A_0_0-integration-1_reviewed_OK.md) and [merged-tree gate](reviews/A_0_0-integrated-gate.md).
See the [A/0/04 integration verdict](reviews/A_0_4-integration-1_reviewed_OK.md) and [merge gate](reviews/A_0_4-integration-1-root-gate.md).
See the [A/0/02 verdict](reviews/A_0_2-2_reviewed_OK.md) and
[integration checkpoint](reviews/A_0_2_integration_checkpoint.md).
See the [A/0/05 committed-tree acceptance](reviews/A_0_5-integrated-acceptance.md)
and [A/0/04 live-refinement merge verdict](reviews/A_0_4-live-startup-merge-1_reviewed_OK.md).

Goal / risk retired: child CLIs receive sandbox/tool restrictions derived
from their resolved `code.write` policy and an informational worker marker, and the public AO snapshot stops
shipping the operator's personal registrations and home paths; supervised
children receive their prompts, survive a host restart and have their
interactive prompts decided by policy — then all six ship as AO `1.1.0`.

## Why this project exists

Project numbers identify delivery tracks (see [`../README.md`](../README.md)).
V5 is an active track whose remaining leaves are coordination-plane work; these
six changes are a small, independent increment that must not wait for V5's
open D/G/H/I leaves, so they get their own track rather than a V5 stage.

This project has a single epic (worker confinement + snapshot hygiene for
`1.1.0`), so it carries no separate `EPICS.md`; the epic DAG is the dependency
column below.

## Anchor baseline

This plan was imported from sibling `agents-orchestrator` commit
`5f72f8bce15b22a7f73292511c83b8ab7f3bdad1`. Its original source anchors used
`8234588`; that source history is provenance, not AO's implementation base.
AO's pinned base is `41f9ce28aa59673283a7c5494200e0ec7b56e2f6`, the commit
peeled from annotated tag `1.0.0`. The local `release/1.1.0` branch was created
from that exact commit on 2026-10-07. The source checkout's dirty runtime
files were not imported.

References below describe the AO base; [BASELINE.md](BASELINE.md) records the
comparison and remaining implementation checks. Before coding each sheet,
the coder must verify every cited symbol/range against the actual branch base
and record its full SHA and corrections in the sheet's review handoff.
Provider CLI versions/flag observations in the imported plan are source
observations; they require verification in the implementation environment.

The operator decisions are recorded in
[HUMAN_DECISIONS.md](HUMAN_DECISIONS.md). The temporary Claude restriction was
lifted on 2026-10-08; use the current model selection and live evidence for
new work. A/0/02's generic direction is answered: preserve reusable KYA practices as
[generic AO workflows](GENERIC_WORKFLOWS.md). The operator also selected
[intact historical documents with an explicit scanner exception](reviews/A_0_2_history_decision.md);
current code and examples must be cleaned.

## Gaps at the original planning base

| Gap | Evidence | Owning sheet |
|---|---|---|
| Codex sandbox is one Gateway-wide value; a reviewer/planner/editor child gets `workspace-write` | `gateway/src/config.js:212`, `gateway/src/services/agent_service.js:355-360`, `gateway/src/adapters/codex_adapter.js:36-38` | [A/0/00](A/0/00.md) |
| Claude headless delegate always runs `--permission-mode dontAsk` with every tool; supervised spawn has no tool restriction | `gateway/src/adapters/claude_adapter.js:34-47`, `:49-54` | [A/0/00](A/0/00.md) |
| antigravity permission bypass is opt-in but has no role-derived restriction; pi and opencode run with all tools (`gemini-cli` is registry-only and launches no child — out of scope) | `antigravity_adapter.js:39-61`, `pi_adapter.js:40-54`, `opencode_adapter.js:50-66`; `gateway/contracts/orchestrator-profile-v1.json:120-124` | [A/0/00](A/0/00.md) |
| A child cannot tell it is a worker, nor for which role/trace/task | no marker in any adapter `spawnSync` env or `tmux new-session` (`tmux_client.js:11-13`) | [A/0/01](A/0/01.md) |
| Public snapshot ships personal repo registrations and home paths in KYA templates/scripts, Codex path-spelling fixtures and the Redis helper | `AO:policies/repositories.json:30,35`; `prompts/kya_coder_prompt_template.md:12`, `prompts/kya_reviewer_prompt_template.md:10`; full inventory in A/0/02 | [A/0/02](A/0/02.md) |
| `agent_ask` pastes the prompt but the TUI does not submit it; no check that it was accepted | `gateway/src/adapters/tmux_client.js:15-17`; `codex_adapter.js:456-457` (same call in the other four executable adapters) | [A/0/04](A/0/04.md) |
| After a host restart every earlier trace is denied; live tmux children become unreachable | `request_context.js:918` (no lineage seeded), `:405-410`; `mcp_server.js:244` | [A/0/05](A/0/05.md) |
| Children's trust and command-permission prompts wait for a person; no adapter recognises them | no match under `gateway/src/`; `codex_adapter.js:468-477`; `approval_service.js:11-15,45,80` | [A/0/06](A/0/06.md) |
| AO 1.1.0 does not exist; the release verifier rejects unprefixed tags and the collector needs `refs/heads/` base refs | `git ls-remote --tags https://github.com/aspizc/AO` lists only `1.0.0`; `scripts/release_candidate.py:67-71,3919-3925` | [A/0/03](A/0/03.md) |

## Sheets

See [`SHEETS.md`](SHEETS.md) and the [stage A README](A/README.md).

| Sheet | Title | Depends on | Effort |
|---|---|---|---|
| [A/0/00](A/0/00.md) | Role-derived child CLI permissions | — | M |
| [A/0/01](A/0/01.md) | Worker environment marker | A/0/00 | S |
| [A/0/02](A/0/02.md) | Generic public setup and reusable workflows | — | S |
| [A/0/04](A/0/04.md) | `agent_ask` submits the prompt | — | S |
| [A/0/05](A/0/05.md) | Supervised sessions survive a gateway restart | — | M |
| [A/0/06](A/0/06.md) | The Gateway handles children's trust and permission prompts | A/0/00, A/0/04 | M |
| [A/0/03](A/0/03.md) | Release AO 1.1.0 | A/0/00, A/0/01, A/0/02, A/0/04, A/0/05, A/0/06 | S |

Execution order: wave 1 = `A/0/04` ∥ `A/0/02`; wave 2 = `A/0/00` then `A/0/01`
(serialized after `A/0/04` only because they edit the same adapter files),
with `A/0/05` in parallel; wave 3 = `A/0/06`; wave 4 = `A/0/03`.

The operator approved the first two waves on 2026-10-07: `A/0/04` moves to wave 1
(it is S, P0 and removes most manual intervention; it never depended on
`A/0/00`, only shared adapter files), and `A/0/00`/`A/0/01` follow it. Later waves retain the imported dependency
order. Parallel work uses separate branches/worktrees. A/0/02 and A/0/04
both touch `gateway/src/config.js` (and may share test files): integrate
serially, inspect conflicts explicitly, and verify the combined candidate.
The wave-2 A/0/01 and A/0/05 changes also share `gateway/README.md`.
Assign one integrator per overlapping hunk and review the combined result.
Shared files are scheduling constraints, not functional dependencies.

A/0/00 records residual shell-write capability for some providers; this plan
does not promise universal OS-level write confinement.

## Generic workflow direction

The [operator clarification](reviews/A_0_2_human_decision.md) requires AO
to support different project types while preserving useful KYA experience.
[GENERIC_WORKFLOWS.md](GENERIC_WORKFLOWS.md) records epic/story/task planning,
parallel waves and Gateway lifetime across a wave. Existing skills already
cover parts of the method; automated wave execution remains a runtime gap
that needs a separate registered implementation sheet before scheduling.
This plan update does not silently add unscoped runtime work to A/0/02 or
claim a release contains it.

## Exit criteria (observable)

- Each of A/0/00–02 and A/0/04–06 has an independent `reviewed_OK` verdict in
  [`reviews/`](reviews/README.md) and is integrated on `release/1.1.0`; publication later aligns AO `main`
  with the promoted release candidate.
- A/0/03's release-state ledger verifies through `released` for one candidate,
  and AO's `refs/tags/1.1.0^{}` resolves to the same commit as AO `main`.

## Out of scope

- Executable `gemini-cli` support (it stays registry-only; its refusal tests
  are unchanged).
- OS-level confinement of Bash/shell tools beyond what each CLI's own flags
  provide (recorded per adapter as a residual in A/0/00).
- Any change under `policies/` by an agent (operator-only, AGENTS.md Rule 15).
- V5 coordination-plane leaves.

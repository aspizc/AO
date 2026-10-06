# AO project status

As of **2026-10-06**. This is the current public project overview. Package
versions and imported plan generations do not establish a release.

## Published implementation and evidence

The latest verified implementation is
[`ea18f4e01e76bfe2cd087ae8ffb06ea3975202e3`](https://github.com/aspizc/AO/commit/ea18f4e01e76bfe2cd087ae8ffb06ea3975202e3),
published on AO's `main`. Its implementation/checkpoint tree
`4a61ac6bb9854a41840e7aee57d31f0ba574761b` passed the full local gate;
the published commit adds the independent verdict, handoff, gate JSON, and
review index. Subsequent documentation changes do not constitute a new runtime
verification or release.

- Full command: `bash scripts/ci.sh`, exit **0**.
- **2,625 passed, 0 failed, 12 skipped; 2,637 total**, `errors: []`.
- Aggregate: `infrastructure_unavailable`, because the declared external
  integrations were unavailable. This is not an all-infrastructure pass.
- Available lanes: 447 structure tests, 1,620 Gateway passes, 25 E2E passes,
  424 CLI tests, 81 LangGraph passes, and 22 live Redis tests. Lock freshness,
  release/supply-chain verification, lint, MCP smoke, and policy validation
  also passed.
- Unverified lanes: nine PostgreSQL tests, three Gateway/Temporal integration
  tests, and optional live provider execution. No local Darwin or Node 24
  execution is claimed. The CI workflow defines Node 22.13.0 and Node 24 jobs;
  their remote results are separate from this local evidence.
- Verified local tools: Node 22.22.1, Python 3.11.15,
  tmux 3.6a-agents.1, Redis 7.2.

See the [independent review](../plan/PROJECT_V5/reviews/UPSTREAM_WORKING_2026_10_06-1_reviewed_OK.md),
[gate report](../plan/PROJECT_V5/reviews/UPSTREAM_WORKING_2026_10_06-1_gate.json),
and [integration checkpoint](../plan/PROJECT_V5/reviews/UPSTREAM_WORKING_2026_10_06_checkpoint.md).
The preceding [large upstream integration](../plan/PROJECT_V5/reviews/UPSTREAM_SYNC_2026_10_06-1_reviewed_OK.md)
has its own evidence. Both integrations are published; neither is a tagged
release. Local and remote tag inventories were empty at this documentation cut.

## Implemented capabilities and limits

| Area | Built in this tree | Limit or next boundary |
|---|---|---|
| MCP Gateway | 33 typed stdio tools, deterministic policy, audit, SQLite state, artifacts, approvals, tasks and sessions | Local operator trust; no multi-user network service |
| Agent execution | Codex, Claude Code, Antigravity CLI, pi and OpenCode adapters; model/effort selection; supervised tmux lifecycle | Provider setup and real inference require separate verification; Gemini CLI is registry-only |
| Request context | Launch-time host principal, task/repository binding and configurable context lifetime | Defaults to `claude-code` and 24 hours; directory discovery must match registered repository IDs |
| Coordination | Eight MCP operations and shared direct Node service; leased presence, addressed delivery, reclaim and ACK | Redis 7 standalone required; messages do not confer action authority |
| Diagnostics | `agent-run doctor` / `--json`, closed result contract, provider status probes, bootstrap and synthetic sample | Production coordination snapshot is unavailable and no runtime-authority capability is supplied; diagnostics cannot prove full isolation or ownership |
| LangGraph / Temporal | Optional client/workflow code and deterministic unit/fake coverage | Live Gateway/Temporal integration is not established by the recorded gate |
| Release tooling | Lock graph, SBOM/license/advisory verification and candidate evidence tools | A passing repository verifier does not promote, tag or publish a release |

## Known operator limits

The legacy `node scripts/smoke_mvp2.mjs` was exercised during the documentation
refresh and failed at `task.assign` with `REQUEST_CONTEXT_DENIED`. It starts a
new Gateway process for each request, which loses the connection-bound
context. The current dry-run path uses
`node --test tests/e2e/mcp_two_agent_workflow.test.js`, whose client retains
one connection. This limitation is outside the recorded passing full gate:
the gate includes that E2E test and `smoke_mcp.mjs`, not the legacy script.
The independent documentation reviewer reproduced the same `task.assign`
failure in `scripts/smoke_planning.mjs`. The KYA runner also starts a new
process per request (code-inspected; not executed in this refresh). Their
runbooks now describe these limits. A manual multi-step orchestration needs
a persistent MCP connection; tool discovery alone does not validate it.

## Public defaults

AO keeps Codex `gpt-5.6-sol` / `max` / `priority` and Claude
`claude-fable-5` / `max`. Sol 6.1 and Claude Sonnet/Opus 5.5 are available as
explicit model selections. Existing aliases and repository permissions remain
unchanged. Coordination defaults are a 15-minute lease, a 72-hour maximum
lease, and 24-hour dedupe/ACK/orphan-inbox windows.

The portable integration excludes upstream personal model preferences,
seven-day default lifetimes, machine MCP configuration, private workspace
state, and personal repository additions. Operators supply their own repository
registrations, paths, credentials, and provider choices. Maintainer and MIT
license attribution remain Carlos Asensio Pizarro; third-party notices remain
with their components.

## Planning and release boundary

[Project V5](../plan/PROJECT_V5/README.md) is the active inherited delivery
track. Its historical sheet statuses, source SHAs, and trial verdicts remain
provenance; they are not AO release identifiers. An imported implementation
may represent a completed slice of an otherwise open sheet. In particular,
Doctor's executable composition does not close the full H/0/01 sheet, and
D/0/07d design acceptance does not establish its CP1 implementation or splice.

Remaining work includes the open V5 authority/session composition, complete
review and integration flows, operational isolation/ownership, and live
provider/PostgreSQL/Temporal/release evidence. Consult the
[sheet ledger](../plan/PROJECT_V5/SHEETS.md) and individual acceptance criteria
before implementing a task; this overview does not mark their unchecked
criteria complete.

`implemented`, `reviewed`, `integrated`, `published`, `promoted`, and `released`
are separate claims. A release still requires a named candidate, its required
gates and skip budget, and an aligned release tag. No tag is created by this
status update.

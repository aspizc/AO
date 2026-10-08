# AO project status

As of **2026-10-08**. This is the current public project overview. Package
versions and imported plan generations do not establish a release.

## Published implementation and evidence

AO's annotated `1.0.0` tag resolves to
[`41f9ce28aa59673283a7c5494200e0ec7b56e2f6`](https://github.com/aspizc/AO/commit/41f9ce28aa59673283a7c5494200e0ec7b56e2f6),
verified again on 2026-10-07. The tag was published on 2026-10-06. The exact
implementation/checkpoint tree tested before adding final review evidence was
`d3548ed7d6900dc5fc97a284576e624ab6a9c1b9`.
`main` can advance with reviewed documentation independently of that release tag.

- Full command: `bash scripts/ci.sh`, exit **0**.
- **2,626 passed, 0 failed, 12 skipped; 2,638 total**, `errors: []`.
- Aggregate: `infrastructure_unavailable`, reflecting the declared external
  integrations that were unavailable.
- Available lanes: 447 structure tests, 1,621 Gateway passes, 25 E2E passes,
  424 CLI tests, 81 LangGraph passes, and 22 live Redis tests. Lock freshness,
  release/supply-chain verification, lint, MCP smoke, and policy validation
  also passed.
- Unverified lanes: nine PostgreSQL tests, three Gateway/Temporal integration
  tests, and optional live provider execution. No local Darwin or Node 24
  execution is claimed. Remote CI results are separate evidence.
- Verified local tools: Node 22.22.1, Python 3.11.15,
  tmux 3.6a-agents.1, Redis 7.2.

See the [independent review](../plan/PROJECT_V5/reviews/MODEL_DEFAULTS_2026_10_06-1_reviewed_OK.md),
[gate report](../plan/PROJECT_V5/reviews/MODEL_DEFAULTS_2026_10_06-1_gate.json),
and [candidate handoff](../plan/PROJECT_V5/reviews/MODEL_DEFAULTS_2026_10_06-1_to_review.md).
The earlier upstream integrations retain their own historical evidence.
The development tag `1.1.0-dev.1` identifies reviewed planning and documentation
at [`b3aed7c9365e54587dc4f847f82edff272955bfb`](https://github.com/aspizc/AO/commit/b3aed7c9365e54587dc4f847f82edff272955bfb)
on `release/1.1.0`. Documentation publication does not establish new runtime
verification or a `1.1.0` release.

## Unreleased V6 integration

A/0/00 adds role-derived CLI restrictions to the five executable providers.
Its reviewed implementation and merge were integrated at `a8e8430` on
`release/1.1.0`. The full gate on that commit exited 0: **3,006 passed,
0 failed, 12 declared infrastructure skips; 3,018 total**, including 22/22
required Redis tests and zero public hygiene findings. The skips comprise
nine live PostgreSQL and three Gateway/Temporal integration tests; optional
real-provider execution was not run. Antigravity non-writers fail closed;
other provider restrictions are verified through emitted argv and results,
not live OS confinement. See the [merge verdict](../plan/PROJECT_V6/reviews/A_0_0-integration-1_reviewed_OK.md)
and [integrated gate](../plan/PROJECT_V6/reviews/A_0_0-integrated-gate.md).
This is integration on the release branch, not promotion or release.

A/0/02 adds operator-local additive repository overlays, generic workflow
examples and a required public hygiene gate. Integration commit:
`7df29bda06aa3a139903dbb0cfc61860029f8159` on `release/1.1.0`. Its independently
reviewed candidate tree is `a8671d91db77d77237623c0b91fda90f270a69e2`: full gate
exit 0, **2,651 passed, 0 failed, 12 infrastructure skips; 2,663 total**.
The nine PostgreSQL and three Gateway/Temporal skips remain unavailable;
optional real providers, Darwin and other Node versions were not verified.
The integration adds only planning/review documents beyond that tested code.
See the [verdict](../plan/PROJECT_V6/reviews/A_0_2-2_reviewed_OK.md) and
[checkpoint](../plan/PROJECT_V6/reviews/A_0_2_integration_checkpoint.md).
This is not promotion to main or a 1.1.0 release.

A/0/04 adds guarded supervised prompt submission, including the pinned tmux
transport and bounded Codex/Claude acceptance checks. Its independently
reviewed implementation was merged as `343222e` on `release/1.1.0`. The full
gate on that merge exited 0: **2,949 passed, 0 failed, 12 allowed
infrastructure skips; 2,961 total**; public hygiene found 0 issues. A
separate hash-bound live check observed one guarded submit and no plain Enter
for each of Codex and Claude. Its source hash predates the independently reviewed
syntax-only regex correction in trial 18; that correction preserved behavior. The rare Codex warning-only draft branch has
fixture coverage but was not observed stable live; it remains a fail-closed
intermittent limitation. See the [integration verdict](../plan/PROJECT_V6/reviews/A_0_4-integration-1_reviewed_OK.md),
[merge gate](../plan/PROJECT_V6/reviews/A_0_4-integration-1-root-gate.md) and
[bound live evidence](../plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-17-bound-live.json).
This is integration on the release branch, not promotion or release.

## Unreleased V7 integration

A/0/00 (generic project profiles and deterministic preflight) and A/0/01
(cooperative capacity) are reviewed and integrated on `release/1.1.0`.
A/0/00 integration commit: `76a0dd4b2b24d6caf6ee7d971f3b0069f195fe2f`,
tree `98cf7b766c4aa80e958875c2f884575794a8a60c`. The reviewed source
candidate is `0fc59cf35fedee7f89044cc0e425dea0e608982a`. Its Redis 7 backed
repository gate exited 0: **2,753 passed, 0 failed, 12 skipped**, including
22/22 required Redis tests. The report remains `infrastructure_unavailable`
for nine PostgreSQL and three Gateway/Temporal integration skips; optional
real provider execution was not run. See the [independent verdict](../plan/PROJECT_V7/reviews/A_0_0-1_reviewed_OK.md)
and [exact gate evidence](../plan/PROJECT_V7/reviews/A_0_0-1-root-gate-redis7.md).
Persistent wave dispatch, checkpoint recovery and external two-project
acceptance remain planned. This is not promotion or a `1.1.0` release.

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

AO defaults to Codex `gpt-6.1-sol` / `max` / `priority` and Claude
`claude-opus-5-5` / `max`, as selected by the project owner. Claude Sonnet 5.5
and Codex Astra remain explicit alternatives. Existing aliases and repository permissions remain
unchanged. Coordination defaults are a 15-minute lease, a 72-hour maximum
lease, and 24-hour dedupe/ACK/orphan-inbox windows.

The portable integration excludes upstream personal model preferences,
seven-day default lifetimes, machine MCP configuration, private workspace
state, and personal repository additions. Operators supply their own repository
registrations, paths, credentials, and provider choices. Maintainer and MIT
license attribution remain Carlos Asensio Pizarro; third-party notices remain
with their components.

## Planning and release boundary

[Project V6](../plan/PROJECT_V6/README.md) plans the `1.1.0` increment on a
branch descending from `1.0.0`; A/0/00, A/0/02 and A/0/04 are reviewed and
integrated on the release branch, and the other four sheets remain unfinished.
Generic workflow requirements include
epic/story/task decomposition and persistent wave execution. Automatic wave
launching remains planned. [Project V5](../plan/PROJECT_V5/README.md) remains
an active inherited delivery track. Its historical sheet statuses, source
SHAs, and trial verdicts remain provenance; they are not AO release identifiers. An imported implementation
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
are separate claims. A new runtime release still requires a named candidate,
its required gates and skip budget, and an aligned release tag. Documentation
publication and development tags do not establish that release.

# Project V7 — Generic project and wave execution

Status: **A/0/00 and A/0/01 reviewed and integrated on the release branch; three leaves planned**.
The validated project profile, deterministic preflight and cooperative capacity
ledger are built. Automated wave dispatch and checkpoint recovery remain planned;
no promotion or release is claimed. V6 retains its seven-sheet AO 1.1.0 scope.
See the [profile implementation verdict](reviews/A_0_0-1_reviewed_OK.md),
[profile gate evidence](reviews/A_0_0-1-root-gate-redis7.md), and
[capacity implementation verdict](reviews/A_0_1-1_reviewed_OK.md).

Goal / risk retired: execute dependency-ready work for different projects
through persistent Gateway sessions, coordinate capacity across cooperating
local runners, and recover an inspectable checkpoint without repeating an
uncertain effect.

## Authorization and assumptions

The operator accepted the six improvement directions on 2026-10-07:
reliable prompts/restart, executable waves, validated generic setup/profile,
shared resources, operational summaries/checkpoint recovery, and evidence
from two project shapes and two orchestrators. Root orchestration assigned
this separate plan track. V6 A/0/04–05 retain prompt and reattachment ownership;
V7 adds no MCP authority surface and does not absorb the open V5 control plane.

Planning base: `b3aed7c9365e54587dc4f847f82edff272955bfb` on
`release/1.1.0`, inspected 2026-10-07. A concurrent V6 A/0/04 plan refinement
was present; this author writes only `plan/PROJECT_V7/`. Code anchors refer to
that base and must be verified against the implementation candidate.

Standing assumptions for this bounded increment:

- The operator explicitly supplies the profile, registered repository,
  existing task workspaces, allowed roots, runtime directory, policy directory,
  and shared budget path. Setup never enrolls a repository or changes policy.
- Projects are local Git repositories on one POSIX host with a local
  filesystem supporting `flock`, atomic rename, and durable file sync. Network
  filesystems and Windows are unsupported in V7 and fail preflight.
- Capacity covers cooperating V7 runners sharing one canonical budget file.
  It counts Gateway instances, sessions, checks, and concurrent provider
  sessions, and reserves conservative declared `memoryMiB` against a
  host-configured ceiling after headroom. It does not measure RSS, enforce OS
  memory limits, meter tokens/money, or cover arbitrary callers. V5 D/0/06
  remains the owner of those stronger guarantees.
- The CLI owns one SDK stdio connection/Gateway per wave. An embedding caller
  may inject an initialized client and retains its lifetime. The CLI does not
  attach to another process's stdio stream. Two independent orchestrators each
  have their own connection; sharing capacity never shares trace authority.
- Independent runners use separate writable workspaces. V7 serializes file
  conflicts within a wave; it does not arbitrate the same writable workspace
  across independent runs. Shared capacity applies across those runs.
- Planning remains a human/model judgment workflow. V7 consumes explicit
  epic/story/task/wave inputs; dependency scheduling and retry decisions are
  deterministic code.
- Review control may be produced automatically by the already-assigned parent
  orchestrator within its existing project review authority, after reading
  evidence from the distinct reviewer. No new human confirmation or manual
  receipt-writing step is mandatory per task. Existing configured human gates
  remain binding. V7 checks receipt identity and consistency, but does not
  authenticate a review verdict, prove candidate freshness, integrate code,
  or satisfy V5's authoritative review/completion gates. A receipt or artifact
  never grants the controller authority it did not already hold.
- Codex authors and a separately assigned Codex session reviews while the
  operator's no-Claude restriction applies. Product selections remain explicit;
  this exception does not rewrite canonical provider defaults.

## Existing mechanisms and gaps

| Evidence at the planning base | Gap / owning sheet |
|---|---|
| `orchestrator-langgraph/src/orchestrator_langgraph/client/gateway_client.py:57` already holds one initialized SDK session | Reuse it; wave orchestration is A/0/02 |
| `scripts/kya_mcp_task_runner.mjs:31` starts a Gateway per request | Generic persistent execution replaces that active workflow, A/0/02 |
| `gateway/src/core/orchestrator_profile.js:280,332,483` resolves selections and projects safe effective values | Reuse this authority in read-only preflight; generic project inputs are A/0/00 |
| `cli/src/agents_cli/doctor_command.py:26,145,196,216` fixes AO/sample/npm/uv inputs | New project preflight is A/0/00; existing Doctor behavior is not generalized by assertion |
| `orchestrator-langgraph/src/orchestrator_langgraph/_contracts.py:22` checks decoded errors | All dispatch responses use this plus exact response-shape checks, A/0/02 |
| `gateway/src/services/orchestration_service.js:47,93` exposes tasks/artifacts and requests legacy completion | V7 tracks its own sessions and never treats completion as accepted review, A/0/02–03 |
| No built shared wave-capacity ledger | Atomic cooperating-runner admission is A/0/01 |
| V6 A/0/05 plans explicit persisted-lineage reattachment | V7 recovery consumes it when implemented; no automatic replay, A/0/03 |
| `tests/e2e/helpers/mcp_client.js:32` demonstrates persistent external MCP | Required generic two-shape/two-runner proof is A/0/04 |

## Executable sheets and waves

| Sheet | Outcome | Depends on | Effort |
|---|---|---|---|
| [A/0/00](A/0/00.md) | Validated project profile and read-only preflight | Built canonical selection/registry mechanisms | M |
| [A/0/01](A/0/01.md) | Shared local capacity admission for cooperating runners | — | M |
| [A/0/02](A/0/02.md) | Persistent SDK wave dispatch and supervised task phases | A/0/00, A/0/01; V6 A/0/04 | M |
| [A/0/03](A/0/03.md) | Durable checkpoint/status and explicit recovery | A/0/02; V6 A/0/05 for the restart lane | M |
| [A/0/04](A/0/04.md) | Two-shape/two-orchestrator external acceptance | A/0/03; V6 A/0/04–05 | M |

Wave 1: A/0/00 and A/0/01 in isolated worktrees; serialize their shared CLI
registration hunks. Wave 2: A/0/02 after reviewed/integrated V6 A/0/04.
Wave 3: A/0/03. Wave 4: A/0/04, with restart tests admitted only after V6
A/0/05 is reviewed/integrated. A/0/03's local status/checkpoint work can be
tested before A/0/05, but neither its restart acceptance nor A/0/04's exit is
closed by deferral. Each sheet has one independent review and scoped branch;
root owns serial integration and shared gate inventory updates.

Five executable sheets: `1 integrated + 4 planned`; none promoted or released.
See [epics](EPICS.md), [sheet registry](SHEETS.md),
[coverage/overlap ledger](COVERAGE_MATRIX.md), and [reviews](reviews/README.md).

## Exit criteria

- Every sheet has its named failing-intent RED evidence, passing focused
  verification, independent OK verdict, and integration SHA.
- External acceptance observes one initialized connection serving multiple
  task traces, two processes respecting one closed capacity vector including
  declared RAM/headroom, different project layouts/check commands, automated
  authorized-parent review control, failure isolation, and owned-resource
  cleanup.
- Restart acceptance reaches existing sessions through explicit V6 A/0/05
  reattachment; ambiguity never causes repeat spawn, prompt, or command.
- A candidate-bound aggregate gate reports exact passed/failed/skipped/deferred
  lanes. Required V7 acceptance cannot skip or count DEFERRED as PASS.
- Root registers this track in `plan/README.md` and links V6's generic
  requirements. No automatic change to V6 release dependencies or release
  inclusion follows from this plan.

## Non-scope

No daemon, privileged orchestrator binary, new MCP/control endpoint, Redis lock
derived from coordination notices, policy mutation, autonomous integration,
review certification, automatic approval, push/tag/release, real-provider spend
gate, or claim that a profile/allowed path contains arbitrary child processes.
V5's open authority, process containment, review, completion, operator inventory,
cost metering, and release prerequisites remain open as indexed in
[COVERAGE_MATRIX.md](COVERAGE_MATRIX.md).

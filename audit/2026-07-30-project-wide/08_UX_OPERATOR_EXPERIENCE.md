# Operator UX audit

## Verdict

**Grade: D.** The Gateway exposes many capabilities, but the operator
experience is ID-driven, fragmented and not recoverable. The two documented
first-success flows fail, and cancellation is not actionable.

There is no browser UI or TUI. That is not inherently a defect for a local
developer tool, but the CLI must then provide complete inventory, state,
approval, recovery and diagnostic affordances. It currently does not.

## Surface inventory

| Surface | What the operator can do | Missing essentials |
|---|---|---|
| `agent-run approve` | Respond to a known approval ID | Queue, immutable context preview, effect digest, expiry/revocation |
| `agent-run policy` | Inspect policy decisions/configuration | Explain effective runtime authority and execution mode |
| `agent-run audit` | Query audit events | Trace overview, cross-store health, export and incident workflow |
| MCP tools | Create/control work when IDs and context are available | Human-oriented discovery, recovery and safe cancel |
| README/runbooks | Learn commands and intended flows | Accurate executable first success |
| Sample/doctor slices | Partial environment checks | Canonical command, full probes, portability and remediation guidance |

The package help still describes the operator CLI as V4 while the active
implementation plan and promoted candidate are V5.

## Key journey assessment

| Journey | Result | Friction |
|---|---|---|
| Install/start | Partial | Requires checkout-specific Node/Python paths and manual services |
| Run MVP2 smoke | Failed | `task.assign` denied because every call starts a new Gateway |
| Run planning smoke | Failed | Same connection-lifecycle defect |
| Find active work | Unsupported | No trace/task/session inventory command |
| Approve pending work | Possible only with known opaque ID | No queue/context/diff/effect preview |
| Cancel work | Public tool exists but returns generic error | No valid outcome selection or child cleanup flow |
| Reconnect/recover | Unsupported | New RequestContext cannot rehydrate ownership |
| Diagnose health | Partial docs/sample internals | No supported `doctor`/status command with closed result |
| Verify completion | Untrustworthy | Completion lacks terminal preflight and review/effect proof |

## UX findings

### UX-01 — First success is broken

**High.** README and planning runbook direct the user to scripts that cannot
complete their second MCP action. This is the highest-leverage UX defect
because it blocks learning, demos and release verification at once.

Owners: H/0/02 for the supported flow, D/0/04 for persistent/reconnect E2E and
I/0/04 for release gating.

### UX-02 — No recoverable overview

**High.** Operators cannot list or reconstruct traces, tasks, sessions,
approvals, owners, budgets or terminal blockers. Opaque IDs are required to do
anything useful. Owner: E/0/00 and C/1/01.

### UX-03 — Approval lacks informed consent

**High.** The CLI accepts ID, decision and note but does not show an immutable
summary of repository, task, effect digest, execution mode, scope, expiry and
what data/host access will be granted. Owner: E/0/01–03/05.

### UX-04 — Cancel is a dead end

**High.** The catalog advertises cancellation, the service requires a
lifecycle outcome that the public contract cannot provide, and the error is
collapsed to `TOOL_ERROR`. The operator needs a preview of affected children,
an explicit target outcome and observable cleanup. Owners: C/1/01–03 and
D/0/01.

### UX-05 — States do not answer “what should I do?”

**High.** `planned`, `in_progress`, `pending`, `reviewed`, `integrated`,
`promoted` and `released` are carefully distinguished in plan docs, but the
runtime does not give equivalent typed blockers or next actions. The result is
high internal precision with low operator clarity.

### UX-06 — Diagnostics are fragmented

**Medium.** Sample and doctor slices exist, but probes, script-disabled
portability and the sheet exit gate remain open. There is no single command
that checks versions, paths, store ownership, recursion, provider
availability, Redis/PostgreSQL/Temporal readiness and safe execution mode.

### UX-07 — Narrow terminal and accessibility behavior is only partial

**Medium.** CLI output is readable around a 40-column terminal in basic
checks, but can truncate or become unusable around 20 columns. There is no
documented machine-readable mode for every human command, no stable color/
screen-reader policy and no keyboard interaction model because no TUI exists.

### UX-08 — Mode and risk are not visible enough

**High.** A real `.mcp.json` uses `AGENTS_DRY_RUN=0` and autoapproval for
`code.apply`, but the operator has no prominent per-run declaration of
confined/workspace-yolo/host-unconfined mode and its consequences. Owner:
E/0/05.

## Information architecture recommendation

Keep the product CLI-first and add a small, coherent command model:

```text
agent-run status [--trace ID] [--json]
agent-run approvals list|show|decide
agent-run sessions list|show|cancel|attach
agent-run doctor [--profile NAME] [--json]
agent-run audit trace|export
agent-run recovery inspect|reconcile
```

Every overview should answer:

- what is running;
- who/what owns it;
- what it is waiting for;
- what authority/mode it has;
- what it has consumed against budget;
- what the operator can safely do next;
- which evidence proves the result.

## Interaction requirements

Approval preview should be immutable and include:

- trace/task/session and repository;
- requested action and exact effect/change digest;
- target agent/provider/model;
- data classification and egress destination;
- execution mode and host/workspace access;
- budget, expiry, uses and revocation;
- review evidence and stale-state warning.

Cancel should:

1. show impacted children and current outcomes;
2. require/derive a typed terminal target;
3. invoke authenticated supervisor cleanup;
4. show progress and deadline;
5. reconcile persistent state;
6. report survivors or partial failure explicitly.

## UX delivery order

1. Fix and gate the two documented smoke flows.
2. Deliver E/0/00 trace inventory plus C/1/01 typed state.
3. Make cancellation and completion honest in C/1/02–03/D/0/01.
4. Add immutable approval preview and signed decisions in E/0/01–03.
5. Surface execution mode and consent in E/0/05.
6. Finish doctor/probes/portability in H/0/01.
7. Ship H/0/02 as the canonical first-success journey.
8. Add recovery drill/outcome metrics in H/0/04 before protected H/0/05.

## UX acceptance bar

A user unfamiliar with internal stores should be able to complete or diagnose
the hero flow using only README and supported commands, at a narrow terminal,
without copying IDs from logs or editing state.


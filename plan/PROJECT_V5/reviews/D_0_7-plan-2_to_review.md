# Plan Review Submission — Project V5 D/0/07 session-control port (plan trial 2)

## Requested reviewer

- Model profile: GPT-5.6 Sol, reasoning `max`, service Priority/Fast
- Review mode: independent plan review of the Trial 2 correction and reconciled live
  registries; no implementation exists and none is claimed

## Frozen candidate

- Candidate commit:
  `8c620a6144fc089848457597c6236d9a98dc4458`
  (`docs(v5): correct D/0/07 plan (trial 2)`).
- Candidate parent:
  `402161e9fccb6a3b87c84dc4bcbcb3962d880461`.
- Candidate tree:
  `674874d88ba31256ab1d0d5f1469d5845199eca0`.
- Branch: `plan/V5-D-0-07-trial2`.
- Frozen implementation baseline: integrated `D_0_1_CORE` lineage `a7c09b0`.
- Trial 1 contract:
  [`D_0_7-plan-1_reviewed_KO.md`](D_0_7-plan-1_reviewed_KO.md).

Review only the candidate commit plus this append-only request/index update. Historical Trial 1
request/verdict and the ratified splice evidence remain immutable.

## What is submitted

The ratified Option 1 prerequisite is corrected as one buildable plan contract:

- revised [`D/0/07`](../D/0/07.md), with one positive RED, one frozen capability API/state
  machine, one tmux/PTY topology, and normative prompt/snapshot/write semantics;
- live dependency/current-state reconciliation in
  [`EPICS.md`](../EPICS.md), [`README.md`](../README.md),
  [`C/README.md`](../C/README.md), [`COVERAGE_MATRIX.md`](../COVERAGE_MATRIX.md),
  [`SHEETS.md`](../SHEETS.md), and [`HANDOFF_YOLO.md`](../HANDOFF_YOLO.md);
- one canonical inventory in the Project V5 registries and the top-level
  [`plan/README.md`](../../README.md): 79 total, 25 delivered A, 54 active B–I,
  36 complete, 4 in progress, 39 planned, and 43 open.

Candidate path allowlist:

```text
plan/PROJECT_V5/C/README.md
plan/PROJECT_V5/COVERAGE_MATRIX.md
plan/PROJECT_V5/D/0/07.md
plan/PROJECT_V5/EPICS.md
plan/PROJECT_V5/HANDOFF_YOLO.md
plan/PROJECT_V5/README.md
plan/PROJECT_V5/SHEETS.md
plan/README.md
```

No production, test, fixture, manifest, lockfile, policy, schema, migration, ADR, runbook, or
historical review artifact changed.

## Trial 1 KO closure map

| KO finding | Trial 2 resolution |
|---|---|
| 1. Advertised adversarial suite was not a valid RED | `D/0/07.md` **TDD RED** names `tests/gateway/process_supervisor_session_port.test.js`, freezes one persistent fake/issuer/prompt/snapshot/observation transaction, lists its exact expected objects and the independent failing assertions on `a7c09b0`, and explicitly excludes unauthorized/cancel/no-shell/no-`send-keys` regression checks from the RED count. |
| 2. Port API and capability lifecycle were undefined | **Frozen internal issuance and capability API** plus **Capability binding, usability, and retirement** freeze the composition factory, D-splice handoff, exact claim/method/argument/result/error shapes, WeakMap receiver authority, binary limits/binding tag, launch/session/utility/terminal/helper/tmux binding, FIFO, active window, every revocation source, stale tombstone, test injection seam, and provider-data-free CORE boundary. |
| 3. Attach conflicted with the exact public contract | **Frozen Option 1 topology** selects one helper-owned inner PTY + direct-argv tmux relay topology. Literal provider argv remains direct `execve`; programmatic input writes the PTY master with no `send-keys`; exact `sessionId === tmuxTarget` and attach text remain unchanged. Interactive tmux attach is expressly a separate local-operator R/W authority, not falsely described as read-only. |
| 4. Terminal/snapshot/verified-write behavior was indeterminate | **Normative terminal and snapshot contract**, **Normative prompt framing**, and **Verified write state machine** freeze 120×40 tmux rendering, 400 lines, UTF-8/invalid/ANSI rules, 65,536-byte snapshot and prompt caps, exact marker/direction, no resize, barrier point, binary framing, Linux/Darwin readers, foreground equation, per-write rechecks, short-write/close/cancel ordering, exact boundary outputs/errors, source/test/fixture paths, and zero dependency/manifest impact. |
| 5. Dependency/registries and inventory were false | `EPICS.md` registers D/0/07, inserts `D_0_1_CORE -> D/0/07 -> D_0_1_SPLICE` in diagram and prose, and extends the security-critical set through 07. Project/C/coverage/handoff surfaces now say the splice is blocked on reviewed D/0/07. `SHEETS.md`, Project V5 README, `EPICS.md`, and top-level `plan/README.md` all publish the same 79/25/54/36/4/39/43 split. |

## Review focus

1. **Positive RED integrity**: confirm the authorized transaction—not absence of an ambient
   port—is the failing behavior on `a7c09b0`, and every expected failure/result is exact.
2. **Security/buildability**: confirm a coder can implement the issuer, capability checks,
   binary sideband, PTY/relay, identity verification, FIFO, revocation, and data boundary
   without inventing a trust-boundary decision.
3. **Option 1 fidelity**: confirm the single topology preserves literal provider argv, exact
   public tmux identity/attach response, operator intervention semantics, and no shell or tmux
   `send-keys` port path without authorizing Option 2/3.
4. **Determinism and branch size**: confirm every boundary/platform/race has one oracle and the
   stated two production files plus focused test/fixture/Darwin seam remain one S/M review.
5. **Registry integrity**: confirm the acyclic dependency, blocked current state, security set,
   canonical inventory, links, and historical-artifact immutability.

## Author verification

- Required contracts were read in the prescribed order, including the complete Trial 1 KO,
  ratified cross-branch result/operator gate, frozen production sources, and repository rules.
- `git diff --check` passed before the candidate commit.
- 262 local Markdown links across the eight candidate documents resolved.
- The two focused Project V5 documentation files contain 13 zero-argument assertion tests; all
  13 passed when invoked directly.
- The canonical pytest invocation could not run in this worktree:
  `.venv/bin/pytest` is absent and the available Python reports
  `No module named pytest`. This is reported as unavailable, not a pytest pass.
- The candidate commit contains exactly the eight allowlisted Markdown paths.
- No sub-agent, tmux session, live provider, MCP, Redis, PostgreSQL, network, push, production
  edit, test edit, or shared-service change was used.

## Verdict contract

Write `plan/PROJECT_V5/reviews/D_0_7-plan-2_reviewed_OK.md` or
`D_0_7-plan-2_reviewed_KO.md` (append-only; numbered, actionable findings, with every KO
fixable from the file alone). Stage only the verdict with an explicit pathspec and commit on the
review branch with message `review(v5): approve|reject D/0/07 plan trial 2`. Then print exactly
`REVIEW D007 PLAN DONE`.

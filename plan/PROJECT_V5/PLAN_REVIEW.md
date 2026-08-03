# Project V5 plan review

Date: 2026-07-25

Scope:

- `plan/PROJECT_V5/README.md`
- `plan/PROJECT_V5/EPICS.md`
- `plan/PROJECT_V5/SHEETS.md`
- `plan/PROJECT_V5/A/0/00.md`
- consistency with the inherited handoff, code, tests, ADR, and runbook

## Trial 1 — KO

The independent reviewer identified five blocking plan defects:

1. Redis operations did not fence stale credentials against a replacement
   participant incarnation.
2. JSONL-only coordination audit did not account for the generic
   `MCP_TOOL_CALL` path that mirrors events to `agents:events`.
3. Caller-supplied message idempotency had no defined Redis retention window.
4. Repeated ACK and unknown delivery behavior had no storage/lifetime model.
5. Several sheets were too broad, the DAG was inconsistent, and acceptance
   criteria had multiple accountable owners.

## Corrections

- Added digest-and-scope fences to every authoritative mutation/read, including
  pre/post checks around blocking receive and explicit replacement-race tests.
- Routed both coordination domain audit and generic coordination MCP-call
  audit through an additive JSONL-only path while preserving the existing
  publisher path for legacy tools.
- Added configurable dedupe and ACK tombstone windows, with exact behavior
  inside and outside each window.
- Added recipient-scoped ACK tombstones and all-or-nothing ACK semantics.
- Split the work into five epics and twenty-five narrow sheets, reconciled the
  DAG, and assigned one accountable owner to every acceptance criterion.

## Trial 2 — OK

Verdict: **OK**

No blocking plan ambiguity remained. Implementation may proceed in dependency
order under umbrella task `A/0/00`.

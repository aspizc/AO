# Review Submission — Project V5 E/0/04 Plan (Trial 1)

## What was done

- Materialized the complete `agents.gateway.health.v1` planning contract for
  liveness, readiness, control readiness, admission, degradation, and
  recovery-required state.
- Added D/0/05 as an explicit prerequisite and bound canonical health to its
  one privileged daemon rather than to per-connection stdio proxies.
- Froze the health-only external watchdog topology, heartbeat/ping envelopes,
  process-start identity checks, monotonic timing, thresholds, probe outcomes,
  total reason precedence, safe metric allowlist, and recovery episodes.
- Expanded the TDD RED/GREEN, acceptance, verification, security, and
  implementation-ownership sections.
- Reconciled the Stage E index, epic dependency/gates, sheet registry, and
  coverage ownership without claiming runtime implementation.

## Why

An in-process health call cannot diagnose its own blocked event loop, while a
health signal emitted by every current stdio process would not identify the
single privileged Gateway planned by D/0/05. The contract therefore requires
an independently supervised, health-only observer that cannot become a second
Gateway, open the control store, or perform mutations.

## Decisions taken

- Liveness requires both matching process-start identity and a fresh heartbeat
  emitted by the daemon's main event loop.
- A fresh heartbeat with a timed-out control ping is live but not ready; a live
  process with a stale heartbeat is `EVENT_LOOP_STALLED`.
- Readiness is fail-closed until writer ownership, required stores, supervisor,
  operator transport, lifecycle reconciliation, budget reconciliation, and
  execution admission converge.
- Reason ordering is a stable total order and returns both one primary reason
  and the complete ordered active set.
- Redis is optional for base Gateway readiness. Coordination Redis health
  remains solely under the existing `coordination.status` contract.
- No MCP health tool, public network endpoint, control-store watchdog access,
  automatic destructive recovery, `agents:events` change, or `message.*`
  change is authorized.

## Verification

- Pre-edit contract checker — expected RED with seven missing-contract
  failures.
- Post-edit identical contract checker — seven checks passed.
- Local-link resolver over the five changed planning documents — passed.
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/pytest -q
  tests/structure/test_v5_coordination_docs.py
  tests/structure/test_v5_coordination_integration_docs.py` — 13 passed.
- Exact changed-path allowlist — passed for the five authorized planning
  documents.
- `git diff --check` — passed.
- No shared MCP/Redis service was started, stopped, reconnected, or mutated.

## Commit

- `b9aae83` — `docs(v5): freeze Gateway health contract (E/0/04)`

## Independent review request

Inspect the commit and final plan state independently. In particular, verify
that the watchdog remains outside the Gateway authority boundary, main-loop
stall detection cannot be masked by a worker heartbeat, liveness/readiness and
reason precedence are deterministic, readiness cannot precede reconciliation,
safe fields are closed, and all compatibility boundaries are explicit.

Publish either `E_0_4-plan-1_reviewed_OK.md` or
`E_0_4-plan-1_reviewed_KO.md`. Preserve this submission and report only
reproducible blockers; do not treat planning review as runtime completion.

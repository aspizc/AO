# Project V5 functional Wave 2 — review request, trial 1

## Candidate

- Branch: `integration/V5-functional-wave-2`
- Candidate before this request: `071cb0dbc012c7ad25fdd93d63b6ae9406251946`
- Integration merge: `3cd91dd` (`integration/V5-functional-wave-1`)
- Reviewed E/0/04 plan verdict: `99465ebc8139d97a4f624f5e2d9d602ae1372975`
- Reviewed C/0/01 verdict: `98599a86a2e53c601ce6129164d1d8f9619a6280`
- Reviewed C/0/00 verdict: `262c666bf3971ea05d59a90beeaaec9690753f2d`

This is an integration and promotion gate. It does not claim that the
E/0/04 runtime is implemented: only its dependency-complete health,
watchdog, recovery, observability, SLO, alert, and dashboard contract has an
independent `OK`. C/0/00 and C/0/01 are implemented and independently
reviewed. The materialized B–I tree remains the executable roadmap.

## Required independent review

Use GPT-5.6 Sol with `ultra` reasoning and the Fast/Priority execution profile.
Review the candidate tree independently and return explicit `OK` or `KO` in a
new append-only verdict file. Do not modify implementation, integrate, or
promote.

Verify at minimum:

1. every integrated technical change has its numbered request and independent
   verdict, with all earlier KO results preserved;
2. the C/0/00 suite/runtime gate and C/0/01 generated MCP contract remain
   internally consistent;
3. E/0/04 Trial 5 closes the same-second replacement ambiguity using the
   manager-owned durable generation without adding producer label cardinality;
4. `message.*` schemas/behavior and the `agents:events` publisher contract
   remain unchanged;
5. the B–I plan tree, coverage matrix, V4 absorption ledger, epic DAG, sheet
   registry, and review links agree about implemented versus planned work;
6. the candidate is a descendant of the existing V4/V5 reviewed baseline and
   is suitable for a non-force fast-forward promotion to both `develop` and
   `main`; and
7. no credential, lease token, Redis URL credential, message body, or local
   operator secret is introduced.

Do not use or restart the shared MCP server or Redis. Live PostgreSQL,
Temporal, Redis, and provider lanes remain explicitly unavailable in this
offline integration gate.

## Verification evidence

The first invocation lacked this worktree's local dependency links and failed
before the authoritative suites (`node_modules`, pytest/ruff, and `agent-run`
were unavailable). No code was changed in response. The gate was rerun using
the already validated local dependency environments, without network access,
and temporary links were removed afterward.

```text
env -u AGENTS_REDIS_URL -u REDIS_URL -u DATABASE_URL \
  -u AGENTS_POSTGRES_URL -u TEMPORAL_ADDRESS \
  -u AGENTS_TEMPORAL_ADDRESS \
  PATH=<validated-offline-venv>/bin:$PATH bash scripts/ci.sh

status: infrastructure_unavailable (optional/live lanes only)
tests: 1087
passed: 1075
skipped: 12
failed: 0

test.structure: 222 passed
test.gateway: 723 total, 714 passed, 9 live PostgreSQL skips
test.e2e: 24 passed
test.cli: 29 passed
test.langgraph: 84 total, 81 passed, 3 opt-in integration skips
lint.python, lint.gateway, lock.python, smoke.mcp, policy.registry: passed
git diff --check: passed
temporary dependency link: removed
working tree before this request: clean
```

## Scope exclusions

- C/0/02 Trial 2 is KO and is not included.
- C/1/00 Trial 1 is still under review and is not included.
- D/0/00 is uncommitted in an isolated worktree and is not included.
- No shared service configuration, `.mcp.json`, release tag, push, or remote
  deployment is part of this candidate.

# Review Submission — Project V5 B/0/01 (Trial 1)

## Outcome

The Gateway now owns one canonical coordination scope, defaulting to
`agents-orchestrator`. Callers may omit it; an explicit mismatch fails rather
than creating a silently isolated island. A read-only
`coordination.status` operation performs a disposable Redis `PING` and reports
the effective scope, queue contract, and lease limits without registering an
agent or publishing a coordination domain event.

The direct and MCP surfaces share the implementation and now expose exactly
eight `coordination.*` operations.

## Review range and exclusions

Baseline: `d521afb`.

Candidate: the first commit after this submission on
`fix/V5-coordination-contract-ux`; review `d521afb..HEAD` together with the
current B/0/01 sheet.

The range must contain no `.mcp.json`, `audit/`, `policies/`,
`agents:events`, production `message.*`, token, or credential change. Tool
discovery by already-running clients still requires their normal later
reconnect; this delivery must not interrupt the shared MCP/Redis instance.

## Acceptance evidence

- Focused config, queue, service, registry, bootstrap, and parity suites:
  green.
- Isolated Redis two-instance acceptance includes status and omitted-scope
  registration: 1/1.
- Isolated Redis 7 live matrix: 6/6, using a disposable container and never
  port 6379.
- Gateway: 668 total, 653 passed, 15 opt-in skips.
- Structure: 124/124.
- Repository CI: all checks passed, including E2E, MCP smoke, policy
  validation, CLI, and LangGraph.
- `git diff --check`: passed.

## Review request

Independently verify canonical-scope behavior, mismatch error, Redis readiness
and anomalous-response mapping, absence of status-side domain writes, disabled
behavior, direct/MCP parity, tests, documentation, and path exclusions.
Publish `B_0_1-1_reviewed_OK.md` or `B_0_1-1_reviewed_KO.md`; a KO should list
only blocking findings.

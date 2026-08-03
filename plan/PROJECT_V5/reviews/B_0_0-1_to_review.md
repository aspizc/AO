# Review Submission — Project V5 B/0/00 (Trial 1)

## Outcome

The coordination lease contract now accepts the orchestrator-scale values that
the public tool already implied:

- `capabilities` remains valid and independently covered;
- the default lease is 900000 ms and the protocol maximum is 3600000 ms;
- deployments may configure a lower effective maximum;
- invalid values return field-specific, non-secret messages; and
- the MCP JSON Schema advertises integer, minimum, and protocol-maximum
  constraints.

`COORDINATION_INVALID_INPUT` and `COORDINATION_UNAVAILABLE` remain distinct.

## Review range and exclusions

Baseline: `d521afb`.

Candidate: the first commit after this submission on
`fix/V5-coordination-contract-ux`; review `d521afb..HEAD` together with the
current B/0/00 sheet.

The range must contain no `.mcp.json`, `audit/`, `policies/`,
`agents:events`, production `message.*`, token, or credential change. It must
not restart or reconnect the shared MCP or contact the shared Redis instance.

## Acceptance evidence

- Initial focused RED: 73 tests, 51 passed and 22 expected failures.
- Focused GREEN: 73/73.
- Expanded coordination contract matrix: 27/27.
- Isolated Redis 7 live matrix: 6/6, using a disposable container and never
  port 6379.
- Gateway: 668 total, 653 passed, 15 opt-in skips.
- Structure: 124/124.
- Repository CI: all checks passed, including E2E, MCP smoke, policy
  validation, CLI, and LangGraph.
- `git diff --check`: passed.

## Review request

Independently verify service/config/tool-schema agreement, exact configured
maximum errors, default behavior, capabilities compatibility, unavailable
error preservation, tests, documentation, and path exclusions. Publish
`B_0_0-1_reviewed_OK.md` or `B_0_0-1_reviewed_KO.md`; a KO should list only
blocking findings.

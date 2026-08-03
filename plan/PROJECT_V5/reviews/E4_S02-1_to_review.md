# Review Submission — V5 E4/S02 (Trial 1)

## Scope

- Made the secret-policy fixture path independent of the process working
  directory.
- Reconciled two stale Claude model/alias test expectations with the current
  policy registry; no policy file changed.
- Added one in-process bypass regression for each V5 threat TM-13 through
  TM-19 and restored the repository's all-threat traceability contract.
- Retained the service/config 65,536-byte boundary correction reviewed in
  E4/S00.

## TDD and gate evidence

| Gate | Result |
|---|---|
| First isolated CI run | RED: 112/114 structure checks; missing TM-13–TM-19 bypass traceability |
| Focused bypass | 22/22 E2E; 3/3 traceability |
| Structure | 114/114 passed |
| Gateway | 594 total: 584 passed, 10 opt-in live-service skips, 0 failed |
| E2E | 25 total: 24 passed, one explicitly opt-in real-agent skip, 0 failed |
| MCP smoke | `MCP smoke OK` |
| Policy registry | OK; 3 agents, 7 repositories, 8 roles |
| CLI | 29/29 passed |
| Exact isolated `scripts/ci.sh` | `All checks passed` |
| Diff check | passed |

Every CI process explicitly removed Redis, Postgres, and real-E2E opt-in
variables. No shared Redis namespace or MCP process was contacted, stopped, or
restarted. The earlier isolated Redis 7 two-instance acceptance remains the
transport evidence for E2/S05.

## Dependency audit

`npm audit --omit=dev` was inspected and returned five pre-existing transitive
findings (one low, two moderate, two high) in Hono/body-parser/fast-uri paths.
Redis is absent from the findings. No `npm audit fix` or dependency mutation
was performed because broad dependency remediation is outside this sheet.

## Review request

Verify the corrections are test-only and policy-consistent, the seven bypass
tests exercise real in-process boundaries without overstating Redis/ACL/TLS
coverage, the complete CI evidence is reproducible with service variables
removed, and expected skips are genuinely opt-in. Return `Verdict: OK` or
`Verdict: KO`; list only blocking findings for a KO.

# Review Submission — V5 E4/S01 (Trial 1)

## Scope

- Updated the architecture view to show MCP and direct callers converging on
  one coordination service and Redis queue without creating a standalone
  orchestrator.
- Added cumulative V5 threats for stale leases, body/authority injection,
  token/digest disclosure, cross-scope/ACK access, raw Redis bypass,
  accidental legacy-audit publication, and replay after bounded dedupe.
- Documented all seven tools, ten runtime variables, limits, lazy/disabled
  behavior, delivery/audit semantics, topology limitations, and no-restart
  adoption in `gateway/README.md`.
- Recorded the additive V5 release in `CHANGELOG.md` and reconciled its
  pre-existing Claude alias statement with the current policy registry.
- Added structural coverage for the integrated documentation and every real
  test path cited by the new threats.

## TDD evidence

- RED: the V4 architecture denied direct coordination, the threat model lacked
  all V5 coordination risks, runtime docs lacked every coordination variable
  and rollout rule, and the changelog had no V5 entry.
- GREEN: the new V5 integration-document contract plus existing architecture
  and threat-model checks passed 12/12.
- All cited V5 threat-test paths resolve to real files.
- Repository diff check passed.
- Root `README.md`, policies, Redis, and the shared MCP process were not
  touched.

## Review request

Check that architecture boundaries match the shared implementation, every new
threat names a real control and honest residual risk, runtime variables and
bounds match `config.js`, audit/delivery/no-restart claims match tests, and the
changelog is additive without claiming changes to `message.*` or
`agents:events`. Return `Verdict: OK` or `Verdict: KO`; list only blocking
findings for a KO.

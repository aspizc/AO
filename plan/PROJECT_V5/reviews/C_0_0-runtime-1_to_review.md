# Review Submission — Project V5 C/0/00 Runtime Increment (Trial 1)

## Outcome

This bounded C/0/00 increment replaces the obsolete Node 20 contract with one
authoritative supported range, enforces it during npm installation, tests the
lower and upper runtime families in CI, removes the obsolete test-isolation
flag, and documents the contract from public entry points.

C/0/00 intentionally remains `in_progress`: portable Python manifests,
required-suite accounting, zero-test/skip sentinels, and service-lane
classification belong to later increments of the same sheet.

## Review range and exclusions

- Commit: `9ae4a4df1cf57429687bcc0127adaf83e7d7394e`.
- Review range: `75076d4..9ae4a4d`.
- No coordination behavior, `.mcp.json`, Redis, MCP process, `policies/`,
  `audit/`, `message.*`, or `agents:events` change is in scope.
- The available local executable was Node 22.22.1. Exact Node 22.13.0 and Node
  24 execution is delegated to the CI matrix and must not be misreported as a
  local run.

## Required evidence

- TDD RED: 13 focused contract failures, followed by one additional failing
  stale-guide assertion.
- Focused runtime-contract suite: 15 passed.
- Full structure suite: 137 passed.
- Gateway: 669 total, 654 passed, 15 pre-existing opt-in skips, 0 failed.
- ESLint, Ruff, `npm ci --dry-run --ignore-scripts --offline`, and
  `git diff --check`: passed.
- Machine checks prove accepted/rejected semver boundaries, package/lock
  parity, `engine-strict`, one Node matrix, and absence of the obsolete flag.

## Review request

Independently inspect the full range and rerun focused checks. Verify that the
semver contract is intentional and internally consistent, documentation does
not overclaim runtime execution, CI still runs one authoritative repository
gate per supported version, and the partial-sheet status is honest. Publish
`C_0_0-runtime-1_reviewed_OK.md` or
`C_0_0-runtime-1_reviewed_KO.md`; preserve any KO and report only reproducible
blockers.

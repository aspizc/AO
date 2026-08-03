# Review Submission — V4/V5 Integration Candidate (Trial 1)

## Candidate

- Base: `develop` at `3625b8d`.
- Candidate: current `integration/V4-V5-combined` HEAD.
- Scope: reviewed V5 B coordination-contract corrections, approved B–I roadmap,
  reviewed partial C/0/00 Node runtime contract, and their merge with the
  already integrated detailed audits and materialized 72-sheet V4 plan.

## Required invariants

1. `message.*` behavior and schemas remain compatible.
2. Coordination domain/audit traffic does not publish to `agents:events`.
3. Lease errors identify the field and exact maximum; canonical scope, status,
   direct/MCP parity, and artifact-list requester parity remain enforced.
4. No token, credential, lease token, or private material enters the diff,
   audit, plan, documentation, status surfaces, or test evidence.
5. The V4/V5 plan truth is consistent: 72 V4 sheets, 50 active V5 B–I sheets,
   acyclic dependencies, one owner per required audit finding, preserved KO
   trials, and no false `complete`/`absorbed` claim.
6. C/0/00 remains explicitly partial: the Node contract is reviewed and
   integrated in this candidate; manifest/sentinel work is still open.

## Reproduction

- `git diff --check develop...HEAD`
- credential-signature scan over added lines
- V4/V5 local-link and dependency checks
- `npm ci --offline` in `gateway/`
- with shared coordination variables unset:
  `uv run --offline --no-project --with ruff bash -c 'export
  PATH="$PATH:/home/carase/git/personal/agents-orchestrator/.venv/bin"; bash
  scripts/ci.sh'`

The last combined gate before the C merge passed structure 130/130, Gateway
654 pass with 15 declared skips, E2E 24 pass with one protected real-run skip,
CLI 29/29, LangGraph 81 pass with three declared skips, MCP smoke, policies,
and lint. After the C merge, its 29 focused structure checks and all 669
Gateway tests passed; the reviewer must reproduce the final candidate gate.

## Review request

Review independently and write exactly one of
`INTEGRATION_V4_V5-1_reviewed_OK.md` or
`INTEGRATION_V4_V5-1_reviewed_KO.md`. Preserve all prior review artifacts and
report only reproducible blockers.

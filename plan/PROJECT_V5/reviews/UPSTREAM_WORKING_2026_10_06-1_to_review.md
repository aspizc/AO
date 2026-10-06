# Portable upstream working changes — review request 1

## Candidate and scope

- AO base: `d14de7a63af0873830227d3c00ec158558057a1d`.
- Candidate implementation/checkpoint tree: `4a61ac6bb9854a41840e7aee57d31f0ba574761b`.
- Source model commit: `6720cac90b8e2550bcd10579e89c78d08e33d95a`, integrated by
  `82345882ca2d65adc5761972b4ace63941916cf8` after the initial snapshot.
- MCP launch/context changes remain uncommitted upstream, imported under explicit
  operator authorization. Snapshot hashes and exclusions are in the checkpoint.
- Exact isolated Git candidate: `/tmp/ao-delta-candidate-ycyl_w6z`.
- New model registrations and explicit aliases, launch-time principal selection,
  and configurable context lifetime; preserve AO defaults, existing aliases,
  permissions, coordination limits, and third-party notices.
- Separately assigned reviewer: `/root/review_working_delta`. The root authored
  the integration; this reviewer authored no production or test changes.

## TDD RED and GREEN

Initial focused run: 60 passed, 5 failed, 0 skipped, covering absent configuration,
MCP principal rejection, and missing optional model registrations.
Final focused run: 65 passed, 0 failed, 0 skipped. Public-default structure tests:
3 passed. The first full gate caught one stale exact registry expectation
(2,624 passed, 1 failed, 12 skipped); extending its model/alias expectations
preserved all default assertions and gave 7/7 registry tests passing.
This earlier failed gate is retained at `/tmp/ao-delta-gate-r1.log`.

## Final verification

- `bash scripts/ci.sh`: **exit 0**, **2,625 passed, 0 failed, 12 skipped**,
  2,637 total; `errors: []`.
- Raw log: `/tmp/ao-delta-gate.log`.
- Raw log SHA-256: `aae9891558359cf2d03ca16dc2a246237968b76c4faf2f65d6b1885c1c7295ad`.
- Machine-readable report: [UPSTREAM_WORKING_2026_10_06-1_gate.json](UPSTREAM_WORKING_2026_10_06-1_gate.json).
- Node 22.22.1, Python 3.11.15, tmux 3.6a-agents.1, Redis 7.2.
- Available required lanes passed, including the full 1,620-pass Gateway suite,
  447 structure tests, 25 E2E tests, 424 CLI tests, 81 LangGraph passes,
  and 22 live Redis tests. Lock, release verification, lint, smoke and policy
  validation passed. No dependency or skip-budget changes.
- Aggregate status remains `infrastructure_unavailable`: nine PostgreSQL and
  three Gateway/Temporal integrations have declared skips. The optional
  external-provider suite is unavailable. No live-provider, PostgreSQL,
  Temporal, Darwin or Node 24 execution is claimed.
- Added-line scan found no corporate attribution/email or private-key headers;
  machine-specific MCP configuration and untracked source state are excluded.
  Existing negative portability canaries and legitimate licenses are preserved.

## Integration boundary

Review binds the named tree; additive review evidence/index may follow. Only
reviewed-OK work may be committed and merged. Author and committer must be
`carlos.aspizc@gmail.com`. Push is explicitly authorized but GitHub credentials
were unavailable at the latest attempt; publication must be verified separately.

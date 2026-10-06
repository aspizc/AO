# Review Submission - Task C/0/02 (Trial 1)

## What was done

- Added external canonical `release-candidate/v1` and `release-state/v1`
  contracts with full Git commit/tree/ref identities, candidate-bound review
  evidence, contiguous lifecycle transitions, and fail-closed clock and
  rollback checks.
- Added lock-derived production SBOM, independent license allowlist and
  inventory, versioned/fresh offline advisory database and digest-bound scan,
  exact graph coverage, and narrow expiring candidate waivers.
- Bound candidates to `ci/suites.json` and the non-refreshable
  `ci/suites-contract.json`; removed the provisional
  `ci/release-suites.json` authority and its duplicate validation/build logic.
- Added the required `release.candidate` lane to both authoritative CI files
  and delegated topology, skip, readiness, and inventory validation to
  `scripts/ci_gate.py`.
- Added PEP 508 marker handling for the universal hash-locked Python inventory,
  refreshed generated supply-chain evidence offline, and documented operator
  collection, verification, state, waiver, and refresh workflows.
- Added 35 focused structure tests and reconciled the Stage C sheet, Stage
  README, CI documentation, and changelog.

## Why

- Promotion claims must bind one exact candidate, base ancestry, locks,
  reviewed evidence, and supply-chain state instead of relying on prose,
  filenames, abbreviated identities, or mutable refs.
- CI suite topology and skip/readiness policy must have one reviewed authority;
  a release-specific copy could drift or self-authorize weaker coverage.
- Release verification must fail closed on incomplete dependency coverage,
  stale advisory data, unreviewed licenses, detached reviews, moved refs, and
  expired or overbroad waivers.

## Decisions Taken

- `scripts/release_candidate.py` dynamically loads the repository sibling
  `scripts/ci_gate.py` and calls its `validate_manifest` implementation. It
  does not duplicate suite definitions or refresh logic.
- Candidate provenance records both authoritative CI files by byte digest.
  `refresh-generated` changes only licenses, SBOM, and advisory output;
  `scripts/ci_gate.py --refresh-inventory` remains the only suite inventory
  refresh and cannot write `ci/suites-contract.json`.
- Python lock parsing evaluates PEP 508 markers for the active supported
  release environment while retaining hash-locked entries and exact
  dependency relationships.
- The first two full-gate attempts exposed a real fixture process leak despite
  257/257 passing structure assertions: each fixture `git commit` launched
  auto-detached Git maintenance, leaving about 66 adopted `[git] <defunct>`
  children under the CI subreaper. The fixture Git helper now applies exactly
  `gc.auto=0`, `gc.autoDetach=false`, `maintenance.auto=false`, and
  `maintenance.autoDetach=false` on every invocation. No C/0/00 containment
  rule, allowlist, or cleanup assertion was relaxed.

## Verification

- Focused RED before implementation:
  `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q tests/structure/test_release_candidate_contract.py`
  - expected failure: 2 failed, 11 passed, 21 errors because the runtime still
    required obsolete `ci/release-suites.json` and did not know the two
    authoritative candidate fields or `release.candidate` lane.
- Focused GREEN:
  `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q tests/structure/test_release_candidate_contract.py`
  - 35 passed.
- Full structure suite:
  `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q tests/structure`
  - 257 passed.
- Release repository gate:
  `/home/carase/git/personal/agents-orchestrator/.venv/bin/python scripts/release_candidate.py verify-repository --repo-root .`
  - passed; 0 production advisories and 0 registered waivers.
- Python lint:
  `/tmp/agents-orchestrator-v5-c000-complete.4sEInK/worktree/.venv/bin/ruff check cli orchestrator-langgraph scripts/ci_gate.py scripts/release_candidate.py tests/structure`
  - all checks passed.
- Schema and syntax checks:
  `python -m py_compile scripts/release_candidate.py tests/structure/test_release_candidate_contract.py`
  plus `Draft202012Validator.check_schema` for both release schemas
  - passed.
- Lock contract:
  `./scripts/requirements_lock.sh --check-inputs`
  - inputs current.
- Inventory-only refresh:
  `python3 scripts/ci_gate.py --repo-root . --refresh-inventory`
  followed by `--validate-only`
  - passed; `ci/suites-contract.json` remained byte-identical at SHA-256
    `cf1e1a15bf0b1e52e9e0e1f528cd711e0f23bdd9cf0fa0b2b4e81431809f39bc`.
- Full authoritative gate attempts 1 and 2:
  `PATH=/tmp/agents-orchestrator-v5-c000-complete.4sEInK/worktree/.venv/bin:$PATH bash scripts/ci.sh`
  - both exited 1 with 811 passed, 12 allowed skips, and one synthetic failed
    count: `test.structure: command left processes in its owned process group`;
    the supervisor contained and reaped the adopted Git zombies.
- Same-supervisor focused reproduction after the Git fixture correction
  - 35 passed, no process-tree leak.
- Full authoritative gate attempt 3 with the same command
  - exit 0; 1080 tests, 1068 passed, 12 exact allowed skips, 0 failed, and no
    errors. Aggregate status is `infrastructure_unavailable` only for the
    explicitly allowlisted/opt-in Postgres, Gateway, Temporal, Redis, and real
    provider lanes, as defined by C/0/00.
- `git diff --check`
  - passed.

## Commit

- `b9e738a61c0d9bdf82f1f4db9fad62be26c0ae7c` -
  `feat(release): enforce candidate promotion contract (V5 C/0/02)`

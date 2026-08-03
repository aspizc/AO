# Review Submission — Project V5 C/0/00 Suite/Lock Increment (Trial 1)

## What was done

- Added `ci/suites.json` as the authoritative required/optional-service suite
  manifest and `scripts/ci_gate.py` as its no-shell, machine-readable runner.
- Added required-ID, file-inventory, zero/minimum-test, exact-skip, count
  reconciliation, and invalid-refresh sentinels.
- Classified known Postgres, Gateway-integration, Temporal, Redis, and
  real-agent gaps explicitly as `infrastructure_unavailable`; Redis and real
  agents are separate optional-service lanes.
- Rebuilt `requirements.lock` as a universal, hash-checked Python 3.11 lock
  with pinned build backends, uv 0.11.21, a fixed index cutoff, and a
  source-input digest.
- Made GitHub Actions install from the Python/npm locks without regeneration,
  install local packages without dependency/build isolation, and delegate to
  the same `scripts/ci.sh` gate.
- Reconciled ADR-007, operator/runtime documentation, changelog, C/0/00, and
  the Project V5 stage/sheet/coverage indexes with the implemented contract.

## Why

The previous gate could remain green after a suite glob collected no tests,
could accept any pre-existing skip without identity accounting, installed
Python packages from mutable ranges, and duplicated its suite truth inside a
shell script. C/0/00 requires a clean-checkout contract whose missing
infrastructure is visible and cannot be confused with required coverage.

## Decisions taken

- Commands are JSON `argv` arrays and always run with `shell=False`.
- Child output is stderr; stdout is one JSON report.
- A required suite or selected optional-service suite fails on zero tests,
  insufficient discovery, incomplete counts, failures, or a non-allowlisted
  skip.
- Path inventories detect added/removed/renamed governed files. Test behavior
  still comes from executing the files; the digest is not a content hash.
- The lock input digest provides a fast, no-network required lane. Full
  regeneration parity remains available through
  `./scripts/requirements_lock.sh --check`.
- C/0/00 does not promote Redis, Postgres, Temporal, or provider-backed lanes
  to required. Their required disposable/live evidence remains owned by later
  V5 sheets.

## TDD RED evidence

- `.venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py
  tests/structure/test_ci_dependency_lock.py` — **8 failed**: gate, manifest,
  lock generator, and locked workflow installation were absent.
- The focused documentation contract test — **1 failed** because
  `docs/ci-contract.md` did not exist.
- The count-reconciliation sentinel test — **1 failed** because a runner could
  leave tests unaccounted.
- The invalid-refresh safety test — **1 failed** because refresh rewrote an
  invalid manifest before returning failure.
- The resolver pin/cutoff test — **2 failed** because uv and the resolution
  horizon were not fixed.
- The first clean editable install failed because hatchling's `editables`
  backend was not locked; adding `editables==0.5` made the same offline build
  pass.
- The lock-lane focused tests — **2 failed** before `lock.python`,
  `--check-inputs`, and the embedded digest existed.

Each failure was observed before its corresponding implementation.

## GREEN and regression verification

- `.venv/bin/python -m pytest -q tests/structure` — **153 passed**.
- `.venv/bin/ruff check cli orchestrator-langgraph scripts/ci_gate.py
  tests/structure` — passed.
- `bash -n scripts/ci.sh scripts/requirements_lock.sh` — passed.
- `./scripts/requirements_lock.sh --check-inputs` — current.
- `./scripts/requirements_lock.sh --check --offline` — current.
- `npm --prefix gateway ci --offline` — installed from
  `gateway/package-lock.json`; audit reported zero vulnerabilities.
- `python3 scripts/ci_gate.py --validate-only` — machine status `passed`.
- Full gate with Redis/Postgres/Temporal/provider opt-ins removed —
  **958 accounted checks: 946 passed, 12 exact allowlisted infrastructure
  skips, 0 failed**. Redis and real-agent lanes reported
  `infrastructure_unavailable`, not `passed`.
- Detached clean worktree at the reviewed commit:
  Python 3.11 venv creation, hash-required `uv pip sync`, offline no-deps/
  no-build-isolation editable installation, and `npm ci --offline` all passed;
  its full gate produced the same **958 / 946 / 12 / 0** result.
- `git diff --check` — passed.
- Scoped high-signal credential/private-key scan — zero matches.

No Redis, Postgres, Temporal, shared MCP, agent provider, container, or tmux
service was contacted. The required MCP smoke started only its disposable
local stdio Gateway process. The local Node executable was v22.22.1; exact Node
22.13.0 and Node 24 execution remains assigned to the committed CI matrix.

## Commit

- `24362a58a29623c136719b27580eafe2e7ec138a` —
  `build(ci): close reproducible suite contract (V5 C/0/00)`
- Review range:
  `63e572ea741b345fc8f478fa87b251ef071dedcf..24362a58a29623c136719b27580eafe2e7ec138a`

## Exclusions and review request

The already reviewed Node runtime increment is not being reopened. This range
does not change coordination behavior, Redis/MCP configuration, `policies/`,
root `README.md`, `audit/`, `message.*`, or `agents:events`.

Independently inspect and rerun the focused/clean gates. In particular, try to
remove a required lane, stale an inventory or lock input, return zero tests,
and introduce an unknown skip. Confirm that optional infrastructure cannot be
reported as passing coverage. Publish exactly one append-only
`C_0_0-1_reviewed_OK.md` or `C_0_0-1_reviewed_KO.md`; preserve any KO.

# Review Submission - Task H/0/00 (Trial 1)

## What was done

- Added the versioned canonical orchestrator profile and schema with the exact
  Codex, Claude Code, and Gemini CLI model/alias/effort/tier matrix from
  H/0/00.
- Added deterministic canonical-JSON hashing and an immutable
  `EffectiveAgentSelection` resolver with explicit resolution-source fields.
- Added one parity bundle in which policy, dry-run, audit, delegate, and spawn
  receive the same selection object; audit persistence receives a separate
  allowlisted projection of effective non-secret values and the profile digest.
- Added safe fail-closed errors for unknown/unsupported selections and
  registry-only execution, without echoing rejected values.
- Added bidirectional checks against all three shipped agent-capability
  registries, including provider-role union parity, plus exact tool-catalog and
  artifact-schema reference checks.
- Added machine-readable safety guidance for all 33 canonical tools and typed
  plan, execute, coordinate, review, recovery, and completion workflows.
- Marked F/0/03 and F/0/04 as unavailable prerequisites and left D/0/01 argv
  translation unimplemented.
- Updated the task status to `in_progress`; no review, integration, or
  completion claim is made.

## Why

- H/0/00 requires one deterministic source for provider/model/effort/tier
  selection so policy, execution, dry-run output, and audit cannot resolve
  different values.
- A canonical digest and closed safe projection make configuration drift and
  accidental raw-alias/rejected-payload audit leakage directly testable.
- Executable catalog/profile validators keep the new source aligned with
  existing capability, role, tool, artifact, and prompt contracts without
  editing the currently shared registries or services in this isolated lane.

## Decisions Taken

- Resolution precedence is explicit canonical model or exact alias, then agent
  default; effort/tier precedence is explicit value, selected-model default
  where declared, then agent default. Environment variables are never read.
- `gemini-cli` remains representable for registry/profile validation, but its
  `registry-only` execution mode is rejected before adapter or child selection.
- Audit consumes the identical immutable selection object used by every other
  parity consumer, then records only `auditProjection`; forged values with the
  correct public digest are rejected against the exact matrix.
- The profile references unavailable F/0/03 and F/0/04 gate IDs without
  projecting either gate as implemented.
- No provider argv formatting or shell/process translation was added because
  D/0/01 exclusively owns that boundary.
- No shared Redis endpoint was used, started, flushed, restarted, or cleaned.

## TDD Evidence

- Initial RED:
  `node --test --test-concurrency=1 tests/gateway/orchestrator_profile.test.js tests/gateway/orchestrator_profile_contract.test.js`
  exited 1 with both file subtests failing on
  `ERR_MODULE_NOT_FOUND` for
  `gateway/src/core/orchestrator_profile.js` (0 passing, 2 failing).
- Initial GREEN for the matrix/resolver/schema/catalog implementation passed
  13/13 focused tests.
- Hardening RED exposed two missing protections: a forged audit effort was
  projected and provider-role union drift was not rejected (12 passed,
  2 failed). A subsequent identity RED showed audit missing from the same-object
  consumer set (13 passed, 1 failed).
- Final focused GREEN passed 14/14 with all three regressions covered.

## Verification

- `node --test --test-concurrency=1 tests/gateway/orchestrator_profile.test.js tests/gateway/orchestrator_profile_contract.test.js`
  - 14 passed, 0 failed, 0 skipped.
- `env -u AGENTS_TEST_REDIS_URL -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u AGENTS_LIVE_TEST -u AGENTS_PROVIDER_LIVE npm --prefix gateway test`
  - 764 tests; 745 passed, 19 pre-existing live/infrastructure skips, 0 failed.
- `npm --prefix gateway run lint`
  - passed.
- `PATH=.venv/bin:$PATH agent-run policy validate`
  - passed: 3 agents, 7 repositories, 8 roles.
- `env -u AGENTS_TEST_REDIS_URL -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u AGENTS_LIVE_TEST -u AGENTS_PROVIDER_LIVE PATH=.venv/bin:$PATH python -m pytest -q -rs`
  - 399 passed and 3 opt-in integration tests skipped; the sole failure is the
    expected authoritative-manifest assertion described below.
- `git diff --check`
  - passed.
- `env -u AGENTS_TEST_REDIS_URL -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u AGENTS_LIVE_TEST -u AGENTS_PROVIDER_LIVE PATH=.venv/bin:$PATH bash scripts/ci.sh`
  - exited 2 before suite execution with `status: invalid_manifest`; the only
    errors are the three frozen inventory digests below.

## Integration-only shared edits

The isolated lane was explicitly forbidden from changing shared CI/service
surfaces. The following edits must therefore be made only by the reviewed
integration owner:

1. Refresh `ci/suites.json` after integration using the repository-owned
   inventory mechanism. The final candidate requires exactly:
   - `lint.gateway`:
     `sha256:163b0dabc319bb617bdfbbb1b9285b25a639c2cf556d77308c8e62d36db2438f`;
   - `test.gateway`:
     `sha256:aee9686c7556a1709e6dfdcf26cb084725623828d40fc457dc222399a2057b04`;
   - `policy.registry`:
     `sha256:05873e6acdc570e306947afbbf5b3a4f45a33420ff0a132a172069606bcdfef3`.
2. Once active shared-lane ownership permits, replace duplicated model
   resolution in `gateway/src/core/policy_engine.js` and effective-model/audit
   plumbing in `gateway/src/services/agent_service.js` with the canonical
   selection bundle. Preserve D/0/01 ownership of adapter argv translation and
   do not modify the active C/1/00 sync-process/deadline files in this task.

Until item 1 is integrated, the authoritative full CI gate is expected to stop
at manifest validation. Until item 2 is integrated, this commit is the
canonical contract and parity-consumer boundary, not a claim that the shared
runtime services have already been migrated.

## Scope preservation

- Frozen base:
  `54ae76a74209687479e4902c816b6bdb4b2e6690`.
- Branch: `feat/V5-H-0-00-orchestrator-profile`.
- No changes were made to CI workflow/manifest files, top or stage READMEs,
  shared policy registries, audit/message/coordination implementations,
  MCP/Redis/KYA configuration, D/0/01 argv translation, unavailable F/0/03–04
  gates, or active C/1/00 files.

## Commit

- `7de076c5830da241b631ddc7d5c104b9a4b52a3b` -
  `feat(profile): add canonical orchestrator selection (H/0/00)`.

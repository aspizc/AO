# Review Submission - Task PROJECT_V3/D/0/3 (Trial 1)

## What was done
- Cut `CHANGELOG.md` from `## Unreleased` to `## [0.1.0] - 2026-06-11` with `## Unreleased` left empty above it.
- Added the required three-line release summary for MVP2.0 / PROJECT_V0 A-Y, PROJECT_V1 A-E experimental work, and PROJECT_V3 A-D hardening, with links to acceptance/checklist artifacts.
- Moved the existing changelog entries under the release section without rewriting the historical entries.
- Added a README line mentioning current release `v0.1.0`.
- Added structure coverage for the release section format in `tests/structure/test_repo_metadata.py`.
- Verified package manifests are already `0.1.0`; no version bump was needed:
  - `gateway/package.json`
  - `cli/pyproject.toml`
  - `orchestrator-langgraph/pyproject.toml`
- Pruned merged local branches in this work clone with `git branch -d` only.

## Why
- PROJECT_V3 D/0/3 closes the release-cut bookkeeping for v0.1.0 and removes already-merged local branch clutter without changing Gateway code, policies, or release publishing state.

## Decisions Taken
- Did not create local tag `v0.1.0`, did not push, and did not merge to `main`; the operator requested those steps remain pending because this release commit is not merged to `develop` yet.
- Deleted only branches reported by `git branch --merged develop`, after excluding `develop` and the current branch.
- Left non-merged branches intact; the post-prune non-merged list is empty in this clone.

## D3-T3 Review Gate
- Previous V3 tasks with final `reviewed_OK`: `A_0_0`, `A_0_1`, `A_0_2`, `A_0_3`, `A_0_4`, `B_0_0`, `B_0_1`, `B_0_2`, `B_0_3`, `B_0_4`, `C_0_0`, `C_0_1`, `C_0_2`, `D_0_0`, `D_0_1`, `D_0_2`.
- Historical KO verdicts found and superseded by OK trial 2:
  - `C_0_0-1_reviewed_KO.md` superseded by `C_0_0-2_reviewed_OK.md`.
  - `D_0_2-1_reviewed_KO.md` superseded by `D_0_2-2_reviewed_OK.md`.
- No pending V3 `to_review` file lacks a corresponding final OK/KO verdict.

## Branch Prune Evidence
- Branch count before prune: `19`.
- Branch count after prune: `2`.
- Branches deleted with `git branch -d`:
  - `feature/V3-A-0-0-full-ci-gate`
  - `feature/V3-A-0-1-policy-engine-tests`
  - `feature/V3-A-0-2-lint-gate`
  - `feature/V3-A-0-3-github-actions`
  - `feature/V3-A-0-4-tree-hygiene`
  - `feature/V3-B-0-0-mit-license`
  - `feature/V3-B-0-1-shared-tool-contracts`
  - `feature/V3-B-0-2-role-semantics-adr`
  - `feature/V3-B-0-3-tool-call-audit-decouple`
  - `feature/V3-B-0-4-secret-fallback-warning`
  - `feature/V3-C-0-0-python-pins-lockfile`
  - `feature/V3-C-0-1-docs-reconciliation`
  - `feature/V3-C-0-2-postgres-integration-optin`
  - `feature/V3-D-0-0-core-observability-tests`
  - `feature/V3-D-0-1-sanitizer-composition-tests`
  - `feature/V3-D-0-2-approval-wait-timings`
  - `feature/enable-codex-planner`
- Branches not merged into `develop` and left intact:
  - None.
- Branches remaining after prune:
  - `develop`
  - `feature/V3-D-0-3-release-0-1-0`

## Pending Operator Commands

Run only after this release commit has been merged to `develop`:

```bash
git checkout main
git pull --ff-only
git merge --ff-only develop
git tag -a v0.1.0 -m "agents-orchestrator 0.1.0 — MVP2.0 + V3 hardening"
git push origin main
git push origin v0.1.0
```

If `develop` still needs this branch merged first, the operator should do that before the `main` merge:

```bash
git checkout develop
git merge --ff-only feature/V3-D-0-3-release-0-1-0
```

## Verification
- `.venv/bin/pytest tests/structure/test_repo_metadata.py` - passed, `6 passed`.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed, all checks passed.
- `rg '^(version|  "version")' gateway/package.json cli/pyproject.toml orchestrator-langgraph/pyproject.toml` - all three manifests report `0.1.0`.
- `git branch | wc -l` - `19` before prune, `2` after prune.
- `git branch --no-merged develop` - no output after prune.
- `git tag --list v0.1.0` - no output; tag intentionally not created in this clone.

## Commit
- `125ae3ac62fe32ade2b9cb9d15ef7ad6e73396a2` - `chore(v3): cut 0.1.0 release notes (PROJECT_V3 D/0/3)`

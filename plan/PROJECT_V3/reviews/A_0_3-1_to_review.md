# Review Submission - Task PROJECT_V3/A/0/3 (Trial 1)

## What was done
- Added `.github/workflows/ci.yml` with one `ubuntu-latest` job for pushes and pull requests to `develop` and `main`.
- Configured the workflow to check out the repo, set up Node 20 with npm cache on `gateway/package-lock.json`, set up Python 3.11 with pip cache, install the Python editable packages and Gateway lockfile dependencies, and run `./scripts/ci.sh` with `.venv` active.
- Added `docs/adr/ADR-007-remote-ci-safety-net.md` documenting local CI as the authoritative gate and GitHub Actions as the remote safety net.
- Added `tests/structure/test_ci_gate.py` to statically verify the workflow shape and prevent duplicated test logic in YAML.
- Updated `CHANGELOG.md` under `## Unreleased` with `Closes V3 A/0/3`.

## Why
- Project V3 requires a remote CI safety net that mirrors the local gate without moving test logic into GitHub Actions.
- ADR-007 records the policy so future changes keep `scripts/ci.sh` as the source of truth.

## Decisions Taken
- Quoted the GitHub Actions `on` key so PyYAML static validation reads it as the string key `on`.
- Kept remote run verification pending because the project rule forbids `git push` from this task. The owner must push the branch and inspect the GitHub Actions run/check.

## Verification
- `.venv/bin/pytest tests/structure/test_ci_gate.py` - passed after implementation; failed first because `.github/workflows/ci.yml` did not exist.
- `.venv/bin/python -c "import yaml; from pathlib import Path; data=yaml.safe_load(Path('.github/workflows/ci.yml').read_text()); assert data['on']['push']['branches']==['develop','main']; assert data['jobs']['ci']['runs-on']=='ubuntu-latest'; print('workflow yaml OK')"` - passed.
- `source .venv/bin/activate && ./scripts/ci.sh` - passed.
- Remote GitHub Actions run - pending owner push; not executed by coder due to the no-push rule.

## Commit
- `96a4cb678614ec49ebf377130913e5e6e8422cce` - `feat(v3): add remote CI safety net (PROJECT_V3 A/0/3)`

# Review Submission — Project V5 C/0/02 Trial 4

## Requested review

Please perform an independent local/offline review of the complete technical
diff and reproduce the environment-contamination matrix. Do not rely on this
submission's conclusions.

- Trial 3 KO/base:
  `b6e14ad5904438eb3b5860021d93eb6b02efd23a`
- Trial 4 technical candidate:
  `10113e62a911cdb9dbe3dbbe5c8ebea0264e6885`
- Trial 4 technical tree:
  `cba04f3e037aff5b1452cebf7e1075a1c928e4d1`
- Review target: Project V5 `C/0/02`
- Trials 1–3 requests and KO verdicts are preserved unchanged.

Do not integrate, promote, tag, or treat C/0/02 as complete unless the
independent verdict is OK. C/0/02 remains `in_progress`; this request is
evidence-only and is committed separately from the technical candidate.

## What was done

- Replaced the copy-and-delete Git subprocess environment with a minimal
  allowlist containing only the caller's executable `PATH` and fixed reviewed
  runtime values.
- Disabled system, global, HOME, and XDG Git configuration discovery with
  explicit deterministic values.
- Fixed replacement behavior to `GIT_NO_REPLACE_OBJECTS=1`; every other
  repository-local variable reported by `git rev-parse --local-env-vars` is
  excluded.
- Added end-to-end regressions for inherited external graft and shallow files,
  the complete local-variable inventory, global/system configuration, PATH
  preservation, and safe failure for non-neutralizable repository config.
- Kept C/0/02 `in_progress` and documented only the Trial 4 behavior.

## Why

- Candidate identity, merge-base, and ancestry must not depend on the caller's
  process environment.
- Removing one known dangerous variable at a time cannot protect against Git's
  full local-variable contract or future caller credentials/configuration.
- Global and system configuration are outside the reviewed candidate and must
  not alter Git command behavior.
- Repository-owned configuration that cannot be safely interpreted must fail
  closed without exposing its source path.

## Decisions taken

- `PATH` is the sole inherited value so the reviewed runtime still invokes the
  operator's normal Git executable. Missing PATH fails closed with a generic
  error.
- `HOME`, `XDG_CONFIG_HOME`, `GIT_CONFIG_GLOBAL`, and `GIT_CONFIG_SYSTEM` point
  to the platform null device; `GIT_CONFIG_NOSYSTEM=1` provides an additional
  system-config fence.
- Locale, prompt behavior, optional locking, and replacement behavior are fixed
  explicitly. The resulting environment has one exact key set and cannot carry
  unrelated credentials or Git control variables.
- Repository-local config remains part of the repository operation. If it
  cannot be parsed, the CLI emits one generic path-free JSON failure.

## TDD evidence

### RED

The new Trial 4 selection initially reported **4 failed / 1 passed**:

- inherited `GIT_GRAFT_FILE` changed merge-base/ancestry for unchanged evidence;
- inherited `GIT_SHALLOW_FILE` changed merge-base/ancestry for unchanged
  evidence;
- Git's complete reported local-variable inventory crossed the subprocess
  boundary because `_git_environment()` copied `os.environ`; and
- hostile global/HOME configuration changed candidate resolution.

The one existing-safe control proved that malformed repository-owned config
already returned one generic JSON failure without local paths.

### GREEN

The same selection passed **5/5**. Its matrix covers:

- `GIT_COMMON_DIR`;
- `GIT_CONFIG`, `GIT_CONFIG_COUNT`, `GIT_CONFIG_PARAMETERS`, and indexed
  config key/value injection;
- `GIT_DIR`, `GIT_WORK_TREE`, `GIT_IMPLICIT_WORK_TREE`, and `GIT_PREFIX`;
- `GIT_INDEX_FILE`, `GIT_OBJECT_DIRECTORY`, and
  `GIT_ALTERNATE_OBJECT_DIRECTORIES`;
- `GIT_GRAFT_FILE` and `GIT_SHALLOW_FILE`;
- `GIT_NO_REPLACE_OBJECTS` and `GIT_REPLACE_REF_BASE`; and
- global/system config plus HOME/XDG discovery.

The polluted matrix performs real collection and repository validation and
produces the exact baseline repository identity, merge-base, and ancestry.

## Verification

- Focused release contract:
  `python -m pytest -q
  tests/structure/test_release_candidate_contract.py` —
  **67 passed in 20.30s**.
- Full structure suite:
  `python -m pytest -q tests/structure` —
  **289 passed in 32.83s** independently and **289 passed in 34.54s** inside
  the authoritative gate.
- Repository supply-chain gate:
  `python scripts/release_candidate.py verify-repository --repo-root .` —
  **passed; 1 production advisory; 0 registered waivers**.
- Lock input contract:
  `./scripts/requirements_lock.sh --check-inputs` — **current**.
- Offline npm clean install:
  `npm --prefix gateway ci --offline` —
  **197 packages added / 198 audited / 0 vulnerabilities**.
- Ruff, Python compile, and Draft 2020-12 schema meta-validation —
  **passed**.
- High-confidence added-line secret scan and `git diff --check` —
  **passed**.
- Final authoritative offline gate:
  `UV_OFFLINE=1 npm_config_offline=true bash scripts/ci.sh` —
  exit 0, aggregate `infrastructure_unavailable`,
  **1112 tests / 1100 passed / 12 exact allowed infrastructure or opt-in
  skips / 0 failed**.

No network, MCP service, Redis, Postgres, Temporal, provider credential,
container, or shared service was used. Candidate schemas, manifests, locks,
generated inventory, SCA/provenance evidence, signatures, waivers, suite
authorities, `.mcp.json`, audit material, and the repository-root README are
unchanged.

## Commit

- `10113e62a911cdb9dbe3dbbe5c8ebea0264e6885` —
  `fix(release): isolate Git environment (V5 C/0/02 Trial 4)`

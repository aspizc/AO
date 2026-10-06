# Independent Review — Project V5 C/0/02 Trial 4

## Verdict

**OK** for technical candidate
`10113e62a911cdb9dbe3dbbe5c8ebea0264e6885`.

Trial 4 closes the inherited Git-environment blocker from Trial 3. No blocking
or material finding remains in the reviewed C/0/02 candidate/state identity,
review-attestation, supply-chain, waiver, or release-provenance contract.

This verdict does not integrate, promote, tag, publish, or otherwise advance
the candidate state.

## Reviewer and reviewed identity

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Execution: Fast/Priority
- Review type: ordinary independent software-quality review
- Trial 3 KO/base:
  `b6e14ad5904438eb3b5860021d93eb6b02efd23a`
- Trial 4 technical candidate:
  `10113e62a911cdb9dbe3dbbe5c8ebea0264e6885`
- Trial 4 technical tree:
  `cba04f3e037aff5b1452cebf7e1075a1c928e4d1`
- Submission/request:
  `0250a3c7b26aee1585b977cb64385bff0d480771`

The technical candidate is the direct child of the Trial 3 KO commit. The
submission is the direct child of the technical candidate and adds only
`C_0_2-4_to_review.md`. Trials 1–3 request and verdict blobs are preserved
unchanged.

## Review result

### Git subprocess hermeticity

`_git_environment()` now constructs an exact environment instead of copying the
caller environment. `PATH` is the only inherited value; it remains functional
for locating `git`. Locale, prompt, optional locking, configuration discovery,
and replacement behavior have fixed reviewed values.

The complete local-variable inventory reported by
`git rev-parse --local-env-vars` is excluded, except
`GIT_NO_REPLACE_OBJECTS`, which is fixed to `1`. This covers:

- external graft and shallow files;
- alternate and primary object directories;
- Git dir, worktree, common dir, index, implicit-worktree, and prefix state;
- direct, counted, and parameterized Git configuration injection; and
- replacement namespaces and replacement enablement.

System and global configuration are disabled independently of caller
`HOME`/`XDG_CONFIG_HOME`. The command also retains
`--no-replace-objects`, and the repository-default legacy graft check remains
fail closed.

The focused corpus performed real collection and validation with every reported
local variable polluted and obtained the exact baseline repository identity,
merge base, and ancestry. Separate probes confirmed that:

- removing caller `PATH` returns one generic failed JSON result;
- malformed repository-local included configuration returns one generic failed
  JSON result with no repository or fixture path; and
- a clean disposable checkout and its temporary evidence leave no residue.

### Trial 2 blocker regression

The accepted Trial 2 corrections remain green:

- an authenticated reviewer is rejected when equal to either the candidate
  author or committer;
- a timed-out Git leader and every live member of its owned process group are
  terminated and reaped;
- schema and runtime share the same normalized lowercase ASCII `mailto`
  grammar; and
- malformed candidate and governed evidence errors contain no absolute local
  paths.

Mutable default/custom replacement refs and repository-default legacy grafts
also remain neutralized or rejected.

### Candidate, review, SCA, waiver, and provenance gates

The focused contract revalidated full commit/tree/ref identity, review-only
post-freeze advancement, Ed25519 candidate-bound review attestations,
author/committer independence, transition chronology, canonical release
checklists and provenance, lock and suite binding, SCA database freshness and
coverage, and narrow time-bounded waiver semantics.

The repository gate reports:

- 210 locked production components: 76 PyPI and 134 npm;
- one exact moderate advisory, `GHSA-frvp-7c67-39w9`;
- zero high or critical advisories; and
- zero registered waivers.

The primary advisory snapshot, lock-derived SBOM, license policy, candidate
schemas, review trust roots, and release provenance checks are internally
consistent and digest-bound.

## Verification

- Focused release contract:
  `python -m pytest -q
  tests/structure/test_release_candidate_contract.py` —
  **67 passed in 20.19s**.
- Trial 2 regression selection — **8 passed / 59 deselected in 4.29s**.
- Full structure suite:
  `python -m pytest -q tests/structure` —
  **289 passed in 35.39s**.
- Repository supply-chain gate:
  `python scripts/release_candidate.py verify-repository --repo-root .` —
  **passed; 1 production advisory; 0 registered waivers**.
- Lock input contract:
  `./scripts/requirements_lock.sh --check-inputs` — **current**.
- Offline npm clean install:
  `npm --prefix gateway ci --offline` —
  **197 packages added / 198 audited / 0 vulnerabilities**.
- Ruff over the governed Python product and structure corpus —
  **all checks passed**.
- Python compile and Draft schema meta-validation —
  **passed; 12 schemas valid**.
- `git diff --check` over the technical and request commits — **passed**.
- Final authoritative offline gate:
  `UV_OFFLINE=1 npm_config_offline=true bash scripts/ci.sh` —
  exit 0, aggregate `infrastructure_unavailable`,
  **1112 tests / 1100 passed / 12 exact allowed infrastructure or opt-in
  skips / 0 failed**.

No network, external MCP service, Redis, Postgres, Temporal, provider
credential, container, or shared service was used. Temporary checkouts,
candidate documents, dependency installations, bytecode caches, and probe
state were removed after verification.

This file is the sole intended Trial 4 verdict artifact and must remain a
separate commit from the technical candidate and review request.

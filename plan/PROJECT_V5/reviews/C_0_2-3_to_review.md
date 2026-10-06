# Review Submission — Project V5 C/0/02 Trial 3

## Requested review

Please perform an independent local/offline review of the complete technical
diff and reproduce the adversarial cases. Do not rely on this submission's
conclusions.

- Trial 2 KO/base:
  `b3cc904b927364e8816afce1eb1b4c38b6b163fa`
- Trial 3 technical candidate:
  `e1714ba41e583e28ad370014ceeed6d74ed73bba`
- Trial 3 technical tree:
  `19de26ad451bf16b6face9135fb78e654411fa98`
- Review target: Project V5 `C/0/02`
- Trials 1–2 requests and verdicts are preserved unchanged.

Do not integrate, promote, tag, or treat C/0/02 as complete unless the
independent verdict is OK. C/0/02 remains `in_progress`; this request is
evidence-only and is committed separately from the technical candidate.

## What was done

- Made every Git invocation ignore replacement objects, removed inherited
  alternate replacement namespaces, and rejected non-empty or symlinked legacy
  graft files before candidate/state identity and ancestry resolution.
- Extended authenticated review independence from the normalized candidate
  author to both normalized author and committer identities.
- Made timeout cleanup signal, verify, and if needed kill the entire owned Git
  process group even when its leader has already exited.
- Defined one lowercase ASCII mail identity grammar shared by candidate runtime
  validation, reviewer trust-root validation, and the public candidate schema.
- Removed local paths from canonical-JSON and CI-loader validation errors so
  malformed governed evidence still returns one safe JSON result.
- Kept candidate state `in_progress` and documented only the Trial 3 behavior.

## Why

- A full commit ID must identify its raw stored tree regardless of mutable local
  replacement configuration or deprecated ancestry grafts.
- An actor who committed the technical candidate is not an independent reviewer
  merely because the commit has a different author.
- A bounded Git wrapper must leave no live owned descendant after timeout.
- Public schema acceptance and runtime acceptance must agree exactly for
  normalized reviewer identity.
- Machine-readable failures must not disclose checkout or fixture locations.

## Decisions taken

- Replacement refs are neutralized with both Git's `--no-replace-objects`
  global option and a hardened environment. Legacy grafts fail closed because
  they remain an independent deprecated ancestry substitution mechanism.
- Candidate Git actor emails are normalized to the same mail identity form as
  authenticated reviewer subjects; both author and committer are excluded.
- Process cleanup uses TERM, a bounded live-group check, KILL when required,
  and direct-leader reaping. The real-process regression temporarily makes the
  test process a Linux subreaper so its intentional orphan is also reaped and
  cannot weaken the C/0/00 supervisor.
- Mail identities are deliberately restricted to a reviewable lowercase ASCII
  local/domain grammar in both schema and runtime.

## TDD evidence

### RED

The new Trial 3 selection initially reported **8 failed / 1 passed**. The
failures reproduced:

- default `refs/replace/<commit>` and a caller-selected replacement namespace;
- a legacy graft changing candidate ancestry;
- a signed reviewer equal to the technical committer but not its author;
- a same-process-group child surviving timeout after the Git leader exited;
- schema acceptance of uppercase and non-ASCII reviewer identities that did not
  share one runtime rule; and
- an absolute fixture path in the sole JSON error for noncanonical governed
  evidence.

The one pass was the valid normalized mail identity control.

### GREEN

- New Trial 3 selection — **9 passed**.
- Focused release contract:
  `python -m pytest -q
  tests/structure/test_release_candidate_contract.py` —
  **62 passed in 20.25s**.
- Full structure suite:
  `python -m pytest -q tests/structure` —
  **284 passed in 32.22s** independently and **284 passed in 33.71s** inside
  the final authoritative gate.
- Repository supply-chain gate:
  `python scripts/release_candidate.py verify-repository --repo-root .` —
  **passed; 1 production advisory; 0 registered waivers**.
- Lock input contract:
  `./scripts/requirements_lock.sh --check-inputs` — **current**.
- Offline npm clean install:
  `npm --prefix gateway ci --offline` —
  **197 packages added / 198 audited / 0 vulnerabilities**.
- Ruff over the Python product and structure corpus — **all checks passed**.
- Python compile and Draft 2020-12 schema meta-validation — **passed**.
- `git diff --check` — **passed**.
- Final authoritative offline gate:
  `UV_OFFLINE=1 npm_config_offline=true bash scripts/ci.sh` —
  exit 0, aggregate `infrastructure_unavailable`,
  **1107 tests / 1095 passed / 12 exact allowed infrastructure or opt-in
  skips / 0 failed**.

The first full-gate attempt exposed a defect in the new real-process fixture:
its intentionally orphaned child was killed but left as a zombie adopted by
the CI subreaper, which correctly produced
`test.structure: command left processes in its owned process group`. The probe
now temporarily acts as the nearest subreaper and explicitly `waitpid`s that
child. No supervisor assertion, process allowlist, or production cleanup rule
was relaxed. The authoritative rerun above is green.

No network, MCP service, Redis, Postgres, Temporal, provider credential,
container, or shared service was used. Candidate manifests, locks, generated
inventory, SCA/provenance evidence, signatures, waivers, suite authorities,
`.mcp.json`, audit material, and the repository-root README are unchanged.

## Commit

- `e1714ba41e583e28ad370014ceeed6d74ed73bba` —
  `fix(release): harden candidate identity (V5 C/0/02 Trial 3)`

# Independent Review Result — Project V5 H/0/01 SAMPLE Trial 5

Verdict: OK

Trial 5 closes the single P1 from Trial 4. The bootstrap now reruns the same
frozen, complete preflight after every uv operation and the last shell physical
boundary, immediately before `npm ci`. Independent strict-fake cases confirm
that a regular in-place change to the package lock, SBOM, or advisory snapshot
during uv aborts after the four uv calls, before npm, without creating a new
`gateway/node_modules`, while retaining the completed Python sync and editable
installation effects.

This verdict is limited to the frozen H/0/01 SAMPLE Trial 5 correction. It does
not review or claim the later doctor command, renderers, probes, the real
empty-cache integration gate, integration, promotion, publication, or release.

## P0 findings

None.

## P1 findings

None.

## Reviewer profile

- Requested profile: GPT-5.6 Sol.
- Requested reasoning: `ultra`.
- Requested execution tier: priority/fast.
- Review mode: independent, adversarial, evidence-based local QA.
- No external telemetry was available to independently prove model identity,
  reasoning configuration, latency, or service tier. The values above record
  the requested orchestration profile rather than an unsupported runtime
  attestation.

## Frozen identity and parentage

- Branch: `feat/V5-H-0-01-sample`
- Worktree:
  `/tmp/agents-orchestrator-v5-h001-s1.VSzDnR/worktree`
- Trial 4 KO result base:
  `5ea251db3d8f56fc8b407675b377995d423f7776`
- Trial 4 KO result base tree:
  `8948c6e25f862237bb28836189041b0e201d2a60`
- RED:
  `e4eeeb138d3ec77a1fee364493f919e7a174fe84`
- RED tree:
  `022632982d7134d75cf793f6b6fda7c9f37e864c`
- Final technical:
  `82efecf0c4e57afbd03a9af17a548743871a3801`
- Final technical tree:
  `a630c57495a0f4e48fe6ac138039554fcba52f7a`
- Request-only:
  `1357dbdaffe3455b18e3c2a4b9947571e23fdef6`
- Request-only tree:
  `c7ec20da149825a37b318e46a5c14abb465ce570`
- Exact technical range:
  `5ea251db3d8f56fc8b407675b377995d423f7776..82efecf0c4e57afbd03a9af17a548743871a3801`

Parentage is exact, direct, and linear:

```text
5ea251db3d8f56fc8b407675b377995d423f7776
  -> e4eeeb138d3ec77a1fee364493f919e7a174fe84
  -> 82efecf0c4e57afbd03a9af17a548743871a3801
  -> 1357dbdaffe3455b18e3c2a4b9947571e23fdef6
```

The worktree was clean at the exact request HEAD before review.

## Scope and frozen inputs

RED changes only:

```text
tests/structure/test_h001_bootstrap.py
```

The technical commit changes only:

```text
docs/doctor.md
scripts/bootstrap.sh
```

The request commit adds only:

```text
plan/reviews/PROJECT_V5/H_0_1_SAMPLE-5_to_review.md
```

The net technical range is:

```text
docs/doctor.md                         +16/-0
scripts/bootstrap.sh                    +1/-0
tests/structure/test_h001_bootstrap.py +72/-0
```

File modes are unchanged. `scripts/bootstrap.sh` remains executable at
`100755`; the documentation and test remain `100644`.

The following authoritative inputs have identical blobs at the Trial 4 result
base and final technical trees:

```text
ci/production-advisories.json  c6f2a11e4d99d9c825c80f7b448cf162fadc26dd
ci/production-sbom.json         71a4488a3821ed090891d1f7905c790b1a7188e5
gateway/package-lock.json       9c81b72edf8a1fe72a3b119bc8184b039a06264b
gateway/package.json            1239dbd29c9e3c63bbc830dd808230704df8a89b
requirements.lock               6898c3a605ee0aafa51355d1903a6bbcc9dfead8
scripts/bootstrap_preflight.mjs e137effde2be6a366d4914b7f862a1f22e9811ba
```

No lock, manifest, production snapshot, preflight implementation, sample,
schema, fake executable, suite manifest, workflow, plan index, or shared
configuration was regenerated or modified.

## Trial 4 correction

The final production sequence at `scripts/bootstrap.sh:119-122` is:

```text
uv pip install --no-deps --no-build-isolation -e cli -e orchestrator-langgraph --offline
validate_control_boundary post-venv
node scripts/bootstrap_preflight.mjs "$REPO_ROOT" "$node_version"
npm --prefix gateway ci
```

This satisfies the required ordering:

1. all uv operations have returned;
2. the last shell physical boundary has completed;
3. the exact same preflight command used before uv is run again; and
4. npm is the immediately following bootstrap command.

There is no alternate digest check or second lock-validation implementation in
the shell. The reused preflight blob is unchanged from the independently
reviewed Trial 4 tree. It performs the full physical-path inventory, canonical
SBOM and advisory parsing, exact digest selection and agreement, SHA-256 over
the actual lock bytes, manifest/lock-root parity, supported Node contract, and
Python lock-input digest check.

The RED commit contains the four new tests while its bootstrap still has only
one preflight invocation. Read-only reconstruction with `git show` confirmed
that state. The historical RED suite was not executed by changing or checking
out the frozen review worktree.

At the request tree, the focused strict-fake selection passes all four cases:

- one static adjacency and exact-reuse check;
- one regular package-lock mutation during the final uv step;
- one regular production-SBOM mutation during the final uv step; and
- one regular production-advisory mutation during the final uv step.

Each dynamic case asserts and passed the complete outcome tuple:

```text
installer calls = the four expected uv calls
npm call        = absent
node_modules    = absent
return code     = nonzero
target          = still a regular file with changed bytes
Python sync     = retained
editable install= retained
```

The entry-invalid guarantee from Trial 4 also remains covered by the full H001
inventory: invalid initial lock/snapshot inputs fail before installer selection
with no dependency-state directory.

## Residual same-UID boundary

The correction does not claim filesystem isolation or serialization.
`docs/doctor.md:54-60` explicitly states that a same-UID process can still
replace bytes after the final read and before npm opens the lock, and assigns
that check-to-exec isolation boundary to D/0/02. This is consistent with
`plan/PROJECT_V5/D/0/02.md`, which owns sandbox mounts, private runtime/cache,
and fail-closed isolation. It is not a hidden completion claim for this SAMPLE
slice.

No bypass was found inside the submitted sequential contract. The reviewed
digest is not hard-coded in bootstrap, no removed custom graph/SemVer validator
has returned, and the final command is not routed through an alias or a second
implementation.

## Verification performed

- Identity, branch, initial cleanliness, direct parentage, commit/tree
  identities, technical/request path allowlists, file modes, and frozen blobs:
  passed.
- Focused Trial 5 strict-fake selection:
  `4 passed, 110 deselected`.
- Full H001 bootstrap structure inventory:
  `114 passed`.
- Related explicit structure inventory:
  `137 passed`.
- Directed Ruff over the two H001 structure tests: passed.
- `node --check scripts/bootstrap_preflight.mjs`: passed.
- Direct read-only preflight against the exact request tree with Node
  `v22.22.1`: passed.
- `./scripts/requirements_lock.sh --check-inputs`: passed.
- `bash -n` over bootstrap and all three H001 fake executables: passed.
- Node JSON parsing of the manifest, lock, both production authorities, doctor
  profile schema, and three hero JSON fixtures: 8 documents passed.
- Independent snapshot extraction and `sha256sum`: both selected authorities
  and the actual lock agree on
  `sha256:71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`.
- `git diff --check` over the technical and complete request ranges: passed.
- Scoped owner-path, credential-bearing URL, credential-assignment, hard-coded
  digest, removed-validator, write/network-import, and second-implementation
  scans: no matches.

All pytest and Ruff dependency resolution used explicit `uv --offline`
commands backed by local cache. Bootstrap execution occurred only in
disposable fixtures with the checked-in strict fake installers.

## Postflight and review limits

The exact review residues removed were:

```text
.pytest_cache/
tests/structure/__pycache__/
h001-trial5-focused/
h001-trial5-bootstrap/
h001-trial5-related/
```

They were removed by exact path, without a glob or broad cleanup. Postflight
confirmed:

- neither prescribed cache directory reappeared;
- zero `h001-trial5-*` directories remained in the worktree or at `/tmp`
  top level;
- zero H001 pytest/uv/Python/Node/npm validation processes remained; and
- `git status --porcelain=v1 --untracked-files=all` was empty at the exact
  request HEAD before this result file was created.

This review did not execute the real bootstrap, real uv/npm dependency
installation, `npm test`, aggregate suites, CI, network access, Redis, MCP,
KYA, provider CLIs, tmux, agents, shared services, snapshot refresh,
integration, promotion, publication, or release. No technical implementation
or documentation was changed by the reviewer.

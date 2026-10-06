# Independent Review — Project V5 C/0/02 Trial 2

## Verdict

**KO** for technical candidate
`9d49f84365f82025ef177755d56103aa835f7c7c`.

The declared focused, structure, supply-chain, lint, schema, and full offline CI
gates are green. The committed inventory also recomputes to the declared 210
components, one moderate advisory, zero high/critical advisories, and zero
waivers.

Those green gates do not establish the candidate-identity and validation
contract. Independent local quality probes found five reproducible
false-success or incomplete-cleanup paths: mutable Git replacement refs can
substitute a different tree for the same full commit ID; review independence
does not exclude the authenticated reviewer who committed the technical
candidate; a timed-out Git process can leave its same-process-group child
alive; and the machine schema accepts reviewer identity bytes that runtime
rejects. A malformed governed JSON document also returns one JSON object but
leaks its absolute local path.

These defects affect the exact immutable-ref, independent-review,
schema/runtime-parity, safe-output, and bounded-subprocess properties in review
scope. Trial 2 must not be integrated or promoted as the completed C/0/02
contract.

## Reviewer and reviewed identity

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Execution: Fast/Priority
- Review type: ordinary independent software-quality review
- Trial 1 KO/base:
  `0b66c2faa6d548f7e0768f9e8df7c7e3ae97a59d`
- Technical candidate:
  `9d49f84365f82025ef177755d56103aa835f7c7c`
- Technical tree:
  `c36d77e1decc429aadde5683d6331bd69105478a`
- Submission/request:
  `a80c5968cda1a8fcd611bc7548f88d9c2078da65`

The technical candidate is the direct child of the Trial 1 KO base, and the
request is the direct child of the technical candidate. The request commit adds
only `C_0_2-2_to_review.md`. Both Trial 1 review artifacts have the same blob
IDs at the base, technical candidate, and request commits.

## Blocking findings

### P0 — A mutable `refs/replace/*` ref can substitute the tree of a full commit ID

The Git wrapper fixes locale and several environment variables, but it does not
disable Git object replacements
(`scripts/release_candidate.py:1205-1221`). Exact branch resolution and
candidate identity then use ordinary `rev-parse`, `cat-file`, `ls-tree`, and
ancestry commands that honor local replacement refs
(`scripts/release_candidate.py:1337-1377`). Repository validation trusts those
derived identities at `scripts/release_candidate.py:3325-3355`.

In an isolated fixture, the technical commit had a real tree read with
`git --no-replace-objects`. A local replacement commit retained the same parent
but used a different tree. After adding `refs/replace/<technical-commit>`, both
collection and repository validation accepted the substituted tree:

```text
commit
c41f5691253508bcafff52d2a3911cf48341d2b4

immutableTreeWithoutReplacements
10c7b877b7f3916ce338a70ab654873414ec307a

acceptedTreeWithMutableReplaceRef
7865fe44e4e11ae79e36add7546c3ca549104cf9

treesDiffer
true

validationErrors
[]
```

This means a full SHA does not identify its actual stored tree under the
current collector. Required correction: make every identity, blob, ancestry,
and ref operation ignore replacement objects and legacy graft substitution,
or fail closed when either mechanism is present. Add an end-to-end regression
that compares the accepted tree to the raw commit object while a replacement
ref exists.

### P1 — Authenticated review independence ignores the technical committer

The validator derives only `%ae` from the candidate commit and rejects a
reviewer only when it matches that author
(`scripts/release_candidate.py:3430-3448`,
`scripts/release_candidate.py:3454-3487`). It never reads or compares `%ce`.

An isolated fixture used:

```text
author    candidate@example.invalid
committer independent@example.invalid
reviewer  mailto:independent@example.invalid
```

The reviewer key was a valid reviewed Ed25519 trust root, the signature and
chronology were valid, and candidate repository validation returned:

```text
errors []
```

The actor who committed the exact technical candidate can therefore attest its
independent review by setting a different author identity. Required
correction: compare the authenticated reviewer subject with every Git identity
that the independence policy treats as an implementation actor, at minimum
both normalized author and committer identities, and add a signed regression
for the split-author/committer case.

### P1 — Git timeout cleanup leaves a blocking same-group descendant alive

`_run_git()` creates a new process group and invokes cleanup on timeout
(`scripts/release_candidate.py:1243-1279`). Cleanup returns immediately when
the group leader has already exited
(`scripts/release_candidate.py:1224-1226`), even though a child in that same
group may still hold the captured pipe and cause `communicate()` to time out.

A real subprocess probe made the Git stand-in spawn one same-group child,
exit, and leave the child holding the pipe. The wrapper reported the timeout
but left that child alive:

```json
{
  "descendantsAliveAfterTimeout": [452110],
  "gitPid": 452109,
  "sameGroupChildren": [452110],
  "wrapperError": "ValueError: git command timed out"
}
```

The review process killed the isolated child immediately after observation.
Required correction: on timeout, signal and reap/verify the owned process group
even when its leader has exited. Add a real-process regression; the existing
mocked timeout test at
`tests/structure/test_release_candidate_contract.py:2284-2319` cannot detect
this lifecycle.

### P1 — Candidate schema and runtime disagree on normalized reviewer identity

Runtime requires `reviewer == reviewer.strip().casefold()`
(`scripts/release_candidate.py:642-651`). The candidate schema accepts any
non-whitespace value after `mailto:`
(`schemas/release-candidate-v1.schema.json:300-303`).

A candidate with a digest-consistent attestation using
`mailto:Reviewer@Example.Invalid` produced:

```json
{
  "schemaErrors": [],
  "runtimeErrors": [
    "candidate.reviewEvidence[0].reviewer: must be one normalized mailto identity"
  ]
}
```

Required correction: encode the same normalization constraint in the public
schema or revise the public representation so schema and runtime have one
shared acceptance rule. Extend the shared mutation corpus beyond the current
selected structural cases.

### P1 — Safe JSON output still exposes an absolute local path

`read_canonical_json()` includes its input path in canonicality errors
(`scripts/release_candidate.py:179-191`). Repository supply-chain validation
captures that exception text as a normal error
(`scripts/release_candidate.py:3122-3124`), so `_cmd_verify()` prints it rather
than reaching the generic safe exception boundary
(`scripts/release_candidate.py:4095-4140`).

With a valid external candidate and one noncanonical governed
`ci/license-allowlist.json`, `verify` returned exactly one JSON line and no
stderr, but the error embedded the full fixture path:

```text
returncode 1
stderr ""
localRepoPathLeaked true
errors [
  "/var/tmp/.../repo/ci/license-allowlist.json: document is not canonical JSON"
]
```

This falls short of the documented safe malformed-input behavior even though
the traceback and multi-result defects are fixed. Required correction:
normalize repository-evidence failures at the command boundary to stable
repository-relative or generic messages, and test malformed governed JSON as
well as a wrong-shaped candidate.

## Confirmed conforming behavior

- Full commit topology and the declared candidate tree are correct in the
  reviewed repository. The checkout is tracked-clean, all sampled governed
  index flags are ordinary `H`, and no replacement ref exists in the reviewed
  checkout.
- Revision expressions, moved refs, `skip-worktree`, `assume-unchanged`,
  index/blob drift, and unrelated post-freeze files are rejected by the focused
  suite.
- Python direct roots are derived from both production manifests and
  non-development extras:
  `cryptography`, `jsonschema`, `langgraph`, `mcp`, `redis`, `rich`,
  `temporalio`, and `typer`. All are represented as direct locked components.
  The focused suite rejects a missing SHA-256 hash and exercises the reviewed
  Linux/macOS/Windows marker matrix on both sides of the Python 3.11.3
  boundary.
- Independent recomputation found 210 unique locked components: 76 PyPI and
  134 npm. SBOM order and membership match exactly; all 210 components have one
  license record.
- The primary OSV snapshot has 210 ordered queries, 210 results, 210 coverage
  records, zero unresolved continuation tokens, zero pages, and one primary
  detail. Raw SHA-256 and raw/canonical equality recompute. The derived result
  is one real moderate finding,
  `GHSA-frvp-7c67-39w9` for
  `pkg:npm/%40hono/node-server@1.19.15`, with zero high/critical findings and
  zero waivers.
- Unknown, unsigned, invalid, author-equivalent, pre-commit, future, and
  chronologically impossible Ed25519 review evidence is rejected by the
  focused suite. The split author/committer case above is the remaining
  independence gap.
- Waiver validity accepts exactly 30×24 hours and rejects 30×24 hours plus one
  second. Candidate, lock, owner, evidence, control, and expiry checks remain
  candidate-bound.
- Canonical release provenance and the four-item checklist are recomputed and
  bind review, evidence head, integration, and promotion. Boolean checklist or
  arbitrary provenance inputs are rejected.
- C/0/00's `ci/suites.json` and `ci/suites-contract.json` remain the only CI
  authorities. The technical diff does not change the legacy `message.*` or
  `agents:events` surfaces.

## Verification

- Focused release contract:
  `python -m pytest -q
  tests/structure/test_release_candidate_contract.py` —
  **53 passed in 15.89s**.
- Full structure suite:
  `python -m pytest -q tests/structure` —
  **275 passed in 27.05s**.
- Repository supply-chain gate:
  `python scripts/release_candidate.py verify-repository --repo-root .` —
  **passed; 1 production advisory; 0 registered waivers**.
- Lock-input contract:
  `./scripts/requirements_lock.sh --check-inputs` —
  **current**.
- Offline npm clean install:
  `npm --prefix gateway ci --offline` —
  **197 packages added / 198 audited / 0 vulnerabilities**.
- Python lint:
  `ruff check cli orchestrator-langgraph scripts/ci_gate.py
  scripts/refresh_advisory_snapshot.py scripts/release_candidate.py
  tests/structure` —
  **all checks passed**.
- Python compile plus Draft 2020-12 schema meta-validation —
  **passed** for both release schemas.
- Full authoritative offline CI after the standard offline npm install:
  `UV_OFFLINE=1 npm_config_offline=true bash scripts/ci.sh` —
  exit 0, aggregate `infrastructure_unavailable`,
  **1098 tests / 1086 passed / 12 exact allowed skips / 0 failed**.
- `git diff --check
  0b66c2faa6d548f7e0768f9e8df7c7e3ae97a59d..
  9d49f84365f82025ef177755d56103aa835f7c7c` —
  **passed**.
- Independent mutable-replacement, split-author/committer,
  schema/runtime, malformed-JSON, and real process-group probes reproduced the
  outputs above. All probe repositories were isolated under `/var/tmp`; no
  candidate implementation file was changed.

A preliminary full-CI setup used `npm ci --ignore-scripts`, which deliberately
omitted the cached `better-sqlite3` native build and therefore was not a valid
gate run. The standard offline `npm ci` restored that binding; the
authoritative rerun above is the reported result.

No network, MCP service, Redis, Postgres, Temporal, provider credential,
container, shared service, or manual tmux session was used.

## Required Trial 3 corrections

1. Make raw Git object identity invariant under local replacement/graft
   mechanisms and add an end-to-end replacement-ref regression.
2. Close or explicitly redefine the split author/committer independence case.
3. Guarantee TERM/KILL cleanup of the whole owned Git process group when its
   leader exits before timeout handling.
4. Extend schema/runtime mutation parity to normalized reviewer identities.
5. Sanitize malformed governed-evidence errors so the sole JSON result contains
   no absolute local path.

This file is the sole intended Trial 2 verdict artifact. It must be committed
separately from the technical candidate and request; no merge, promotion, tag,
or technical-file change is authorized by this review.

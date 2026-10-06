# Independent Review — Project V5 C/0/02 Trial 1

## Verdict

**KO** for technical candidate
`b9e738a61c0d9bdf82f1f4db9fad62be26c0ae7c`.

The declared focal, structure, repository, and full offline CI gates are green,
and several lower-level byte digests recompute correctly. Those results do not
establish the C/0/02 acceptance contract. Independent adversarial probes show
that the validator accepts worktree bytes absent from the claimed Git tree,
Git revision expressions presented as live refs, an advisory corpus with no
production-component records, an unhashed and incomplete Python graph,
arbitrary release provenance, review evidence with false independence and
impossible chronology, effectively permanent waivers, and schema-invalid
runtime semantics. A malformed canonical input also escapes the promised JSON
error boundary as a traceback.

These are release-integrity blockers. Trial 1 must not be integrated, promoted,
tagged, or treated as reviewed.

## Reviewer

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Execution: Fast/Priority
- Review base:
  `55221a581ba53a34c85d073ec7d99157b6f1991d`
- Technical candidate:
  `b9e738a61c0d9bdf82f1f4db9fad62be26c0ae7c`
- Submission/evidence-only request:
  `22450a6471351f602b7bdcaa2c4490c6fac4fdf6`
- Review request:
  [`C_0_2-1_to_review.md`](C_0_2-1_to_review.md), preserved unchanged

This was an independent local/offline review. The TDD skill, project intake,
Stage C material, C/0/02 sheet, absorbed V4 specifications, request, complete
technical diff, schemas, runtime, generated evidence, and focused tests were
read independently of the submission claims.

One bounded read-only sub-review corroborated runtime semantics. It made no
edits or commits, spawned no further agents, and used no tmux. The principal
reviewer independently inspected the cited code and reproduced every decisive
finding retained below.

## Blocking findings

### P0 — Candidate bytes and “full refs” are not bound to the claimed Git object

`validate_candidate_repository()` compares `HEAD` and `HEAD^{tree}` with the
declared subject and treats an empty `git status --porcelain` result as proof
that the bytes it hashes belong to that tree
(`scripts/release_candidate.py:2061-2068`). Collection uses the same status
assumption at `scripts/release_candidate.py:2478-2490`.
`_repository_file()` proves only that the path is indexed and that `HEAD`
contains a regular blob (`scripts/release_candidate.py:972-1005`); it never
compares the opened worktree bytes with the blob at the candidate object.

An independent temporary-repository probe marked the governed
`.github/workflows/ci.yml` path `skip-worktree`, replaced its bytes, and
collected and verified a candidate under the unchanged `HEAD` and tree:

```text
skip-worktree-status ''
head-worktree-bytes-differ True
mixed-tree-validation-errors []
```

The resulting manifest therefore attributes bytes not present in the candidate
tree to that candidate. `assume-unchanged` has the same trust-boundary problem.

The ref grammar is also not a full-ref grammar. Shape validation accepts every
non-whitespace string beginning `refs/heads/`
(`scripts/release_candidate.py:291-300`), and `_git_identity()` passes it
directly to `rev-parse` (`scripts/release_candidate.py:2460-2466`). Both of
these revision expressions collected and then passed complete repository
validation:

```text
refs/heads/develop~0
refs/heads/candidate^{commit}
derived-ref-validation-errors []
```

The state-ref path repeats this issue at
`scripts/release_candidate.py:2297-2303`; a historical expression such as
`refs/heads/main~1` can masquerade as the live promotion ref.

The real ref state already demonstrates the lifecycle consequence. At review
time:

```text
specified base object                         55221a581ba53a34c85d073ec7d99157b6f1991d
refs/heads/integration/V5-functional-wave-1   e0e6f91e12e60b20b45b26516a59dacc02f512fa
technical candidate                           b9e738a61c0d9bdf82f1f4db9fad62be26c0ae7c
refs/heads/feat/V5-C-0-02-candidate-contract  22450a6471351f602b7bdcaa2c4490c6fac4fdf6
```

The request commit naturally advanced the candidate branch. Trying to collect
the exact reviewed object with the documented refs now returns:

```json
{"errors":["branch ref and checkout must identify the same candidate"],"status":"failed"}
```

Required correction: resolve and validate exact ref names rather than revision
expressions; bind governed bytes to blobs read from the declared candidate tree,
not status-hidden worktree files; reject index flags or any index/tree/worktree
disagreement; and make the review workflow preserve an immutable candidate/base
identity before evidence-only commits move mutable branches. Add regressions
for derived refs, `skip-worktree`, `assume-unchanged`, and post-request ref
movement.

### P0 — The offline advisory “database” cannot prove advisory completeness

`_validate_advisory_database()` accepts self-described non-empty metadata plus
any non-empty entry list (`scripts/release_candidate.py:1473-1591`).
`_scan_advisory_database()` then performs only an exact-purl intersection
(`scripts/release_candidate.py:1594-1609`). The coverage object at
`scripts/release_candidate.py:1612-1620` hashes the SBOM purl list; it does not
prove that the database was queried completely or contains the advisory corpus
for those purls.

The committed database has one record, for unrelated
`pkg:npm/lodash@4.17.20`. The candidate SBOM has 197 components, none matching
that record. Independent recomputation observed:

```text
actual-advisory-db {
  'components': 197,
  'entries': 1,
  'coveredFindingRecords': 0,
  'declaredEcosystems': ['npm', 'pypi']
}
```

Nevertheless, `verify-repository` reports zero advisories and passes. The
database byte digest
`sha256:dfd31a896227575da8a6c8689785d352ea571dd24cea60dad48141d4da4d83df`,
snapshot digest, version, and dates all recompute; they authenticate the exact
incomplete file, not corpus completeness. Replacing it with any fresh unrelated
record and regenerating the snapshot preserves this false clean result.

Required correction: consume a real offline advisory export with reviewable
source/version/digest provenance and machine-verifiable complete coverage or
negative query evidence for every locked purl and supported ecosystem. The
gate must reject omitted corpus/query coverage, not accept a self-declared
ecosystem list.

### P0 — Python production graph and reproducible-lock checks fail open

The Python parser never derives direct dependencies from the two project
manifests. It hard-codes seven package names at
`scripts/release_candidate.py:1068-1076` and derives edges from mutable
`# via` comments at `scripts/release_candidate.py:1048-1066`. A newly declared
production root is silently omitted unless code is updated, and changing an
ignored comment can remove a transitive package from SBOM, license, and
advisory evidence without changing its install line.

The parser also ignores every `--hash` line. An independent hashless lock probe
was accepted, returned the seven hard-coded roots, and silently excluded an
eighth production root:

```text
hashless-lock-accepted 7 new-root-included False
```

`./scripts/requirements_lock.sh --check-inputs` does not close this gap because
it checks the embedded manifest-input digest, not per-entry hashes. Marker
evaluation at `scripts/release_candidate.py:1025-1035` uses the review host
environment even though the declared runtime is `>=3.11` and the lock is
universal; supported Windows and older 3.11 marker branches can therefore
disappear from claimed complete coverage.

Required correction: derive roots and edges from the authoritative manifests
and lock semantics, validate every required hash/integrity record, reject
unresolved or omitted roots, and define coverage for every supported
Python/platform marker environment. Add hash removal, new-root, comment
mutation, and cross-environment marker regressions.

### P0 — Released state accepts unbound provenance and a self-declared checklist

The release path recomputes `candidateDigest`, but it only regex-checks
`provenanceDigest` at `scripts/release_candidate.py:2401-2407`. It never
recomputes the digest of `candidate.provenance` or any external release
provenance artifact. The candidate's own positive test supplies
`"sha256:" + "8" * 64` at
`tests/structure/test_release_candidate_contract.py:1082-1091` and expects the
released ledger to pass.

An independent full released-ledger reproduction with that arbitrary value
returned:

```text
arbitrary-release-provenance-errors []
```

`checklistComplete` is similarly just a boolean. No checklist artifact, byte
digest, candidate identity, or unchecked-item scan is bound, so setting it to
`true` bypasses the absorbed M0/4/02 rule that real unchecked criteria block a
release claim. Plan and implementation evidence are also self-digests of
unverifiable labels rather than digests of authoritative artifacts.

Required correction: recompute and bind every digest, especially final
provenance, and bind release readiness to the exact reviewed checklist
artifact and candidate. A changed provenance file or unchecked checklist item
must fail even after the enclosing evidence digest is regenerated.

### P0 — Review independence and chronology are self-asserted

Review collection hashes unsigned caller-provided JSON
(`scripts/release_candidate.py:2510-2524`). Repository validation defines
independence only as case-folded string inequality between the claimed
`reviewer` and commit author email
(`scripts/release_candidate.py:2179-2190`).

An attestation with reviewer `candidate@example.invalid ` for a commit authored
by `candidate@example.invalid`, issued in 2000, passed candidate validation:

```text
historical-author-review-errors []
```

State validation only checks that an `attestationDigest` appears in the
candidate (`scripts/release_candidate.py:2275-2284`). It does not require the
review transition time to equal or follow the attestation issuance. A review
transition issued at 02:00 referencing an attestation issued at 10:00 passed:

```text
attestation-issued 2026-07-26T10:00:00Z
review-transition-issued 2026-07-26T02:00:00Z
chronology-errors []
```

The five-minute CLI clock rollback guard is present and works, but it cannot
repair forged reviewer identity or impossible evidence chronology.

Required correction: bind review evidence to an authenticated, canonical
reviewer identity and the final candidate, normalize and compare identity
correctly, reject evidence predating its subject, and enforce attestation/state
chronology. Include the exact final review digest in the state path.

### P1 — Candidate waivers have no maximum lifetime

Waivers require `expiresAt > issuedAt` and `expiresAt > now`, but there is no
maximum duration at `scripts/release_candidate.py:904-915`. A candidate-bound
high-severity waiver expiring at `9999-12-31T23:59:59Z` passed with no errors:

```text
far-future-waiver-errors []
```

That is effectively permanent rather than narrow and bounded. Required
correction: define and enforce a reviewed maximum lifetime and issuance window,
with boundary tests and revalidation at every state advancement.

### P1 — Machine schemas and runtime disagree on structural validity

The candidate schema permits two different `python` runtime objects and no
`node` runtime because it constrains only array size/uniqueness. Runtime shape
validation rejects that document:

```text
duplicate-runtime-schema-errors 0
duplicate-runtime-runtime-errors [
  'candidate.runtimes: duplicate runtime: python',
  'candidate.runtimes: node and python are both required'
]
```

The state schema likewise accepts an impossible `planned -> reviewed`
transition carrying implementation evidence, while runtime validation rejects
it:

```text
impossible-state-schema-errors 0
impossible-state-runtime-errors [
  "stateLedger.transitions[1]: impossible transition: 'planned' -> 'reviewed'",
  "stateLedger.transitions[1].evidence: missing independent 'review' evidence"
]
```

Required correction: encode the ordered prefix, evidence-kind/state mapping,
and exact runtime membership in the schemas, then add a shared mutation corpus
that proves schema/runtime parity for every structural rule.

### P1 — Malformed canonical input escapes the safe JSON error contract

`_cmd_verify()` builds failure metadata for any dictionary and then indexes
`candidate["repository"]["candidate"]` even after shape validation has already
reported missing fields (`scripts/release_candidate.py:2707-2713`).
`main()` does not catch `KeyError` or `TypeError`
(`scripts/release_candidate.py:2873-2880`).

Using the valid canonical `ci/advisory-waivers.json` file as the candidate
produced no result JSON and emitted a full filesystem-path traceback ending:

```text
KeyError: 'repository'
```

This contradicts the documented one-JSON result and exposes internal paths.
Required correction: construct optional result fields defensively, normalize
all malformed external-data failures into one safe JSON result, and add
wrong-shape/wrong-type tests that assert no traceback, path, or secret output.

### P1 — Standalone Git subprocesses have no containment deadline

`_git()` and the raw ancestry calls use inherited Git configuration/environment
and `subprocess.run()` without a timeout
(`scripts/release_candidate.py:956-969`,
`scripts/release_candidate.py:2090-2104`, and
`scripts/release_candidate.py:2309-2323`). The authoritative CI supervisor
contained the exercised release lane and left no surviving process, but the
documented standalone `collect` and `verify` commands do not inherit that
supervisor. A blocking Git helper/configuration can therefore hang those
operator commands indefinitely.

Required correction: give every Git operation a finite deadline and stable
noninteractive configuration/environment, normalize timeout/process failure
without leaking command data, and add contained descendant/hang tests for the
standalone CLI.

## Confirmed conforming areas

- The technical candidate is the sole direct child of the exact review base,
  and the evidence-only request is its sole direct child.
- The request adds only `C_0_2-1_to_review.md`; it does not alter candidate
  code or contracts.
- The independent license allowlist is separate from generated inventory, and
  all 197 current SBOM components have one allowlisted license entry.
- The committed lock, SBOM, license, advisory-database byte, coverage, and
  advisory snapshot digests independently recompute for the bytes present.
- `release.candidate` delegates manifest/topology/skip/readiness/inventory
  validation to `scripts/ci_gate.py`; `ci/suites.json` and
  `ci/suites-contract.json` agree, and no `ci/release-suites.json` duplicate
  exists.
- Ordinary traversal and symlink checks are fail closed for governed files and
  external output. The `skip-worktree` finding above is the remaining
  tree-membership bypass.
- The CLI `--at` guard rejects clock rollback/fast-forward beyond five minutes.
- A high-confidence added-line secret-signature scan found zero matches.

These conforming details do not compensate for the blocking false-acceptance
paths.

## Verification

- Exact candidate checkout:
  `git switch --detach
  b9e738a61c0d9bdf82f1f4db9fad62be26c0ae7c` — used for every candidate gate;
  the review branch was restored non-destructively afterward.
- Focused release contract:
  `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q
  tests/structure/test_release_candidate_contract.py` —
  **35 passed in 4.93s**.
- Full structure suite with the same interpreter —
  **257 passed in 17.81s**.
- `python scripts/release_candidate.py verify-repository --repo-root .` —
  exit 0, `passed`, **0 production advisories / 0 registered waivers**.
- `python scripts/ci_gate.py --repo-root . --validate-only` —
  exit 0, one `passed` JSON result.
- `./scripts/requirements_lock.sh --check-inputs` — current.
- `python -m py_compile` for the runtime/test plus Draft 2020-12 schema checks —
  passed.
- `npm --prefix gateway ci --offline` — **196 packages installed from cache,
  0 vulnerabilities**.
- With live-service and real-provider opt-ins removed, the lock-identical
  reviewed venv first on `PATH`, and the exact candidate checked out,
  `bash scripts/ci.sh` — exit 0, aggregate
  `infrastructure_unavailable`, **1080 tests / 1068 passed / 12 exact
  allowlisted skips / 0 failed**.
- Independent digest audit — 197 unique SBOM components; every dependency purl
  resolves; lock/SBOM serial/license/database/snapshot digests recompute;
  database intersection with the production graph is zero.
- Independent ref, `skip-worktree`, hashless-lock, advisory-corpus, released
  provenance, review chronology/identity, unlimited-waiver,
  schema/runtime-parity, and malformed-input probes reproduced the outputs
  quoted above. No probe file was added to the repository.
- `git diff --check
  55221a581ba53a34c85d073ec7d99157b6f1991d..
  b9e738a61c0d9bdf82f1f4db9fad62be26c0ae7c` — passed.
- Post-gate process scan — zero non-review processes with the candidate
  worktree as their current directory.

An initial full-gate attempt without an installed offline Node tree and without
the reviewed venv on `PATH` failed only for missing local test dependencies.
The final authoritative run above followed a successful offline `npm ci` and is
the verdict evidence.

No network fetch, Redis, Postgres, Temporal, provider, shared MCP service,
container, or manual tmux session was used.

## Commit and append-only verification

The technical candidate has the exact base as its direct parent. The submission
has the technical candidate as its direct parent and adds only the preserved
review request. This KO file is the only intended review change and must be
committed separately as a child of the submission.

C/0/02 remains `in_progress`. Corrections require Trial 2 and a new immutable
technical candidate; this Trial 1 history must remain append-only.

# Release candidate, state, and supply-chain contract

The release identity is an external canonical JSON document with schema
`release-candidate/v1`. It is written outside the candidate checkout so its
digest cannot change the Git tree that it identifies. The validator will not
overwrite an existing file or follow a symlink. It accepts only canonical
UTF-8 JSON: sorted object keys, compact separators, no duplicate keys, no
floating-point values, and one final newline.

The candidate binds one full 40-character technical commit and tree, one
audited base, one full branch evidence head, their merge base, runtime
manifests, both locks, the supported-environment matrix, the suite
manifest and its non-refreshable topology/skip/readiness contract, the complete
production SBOM, license registry, offline advisory snapshot, the independently
reviewed license allowlist and offline advisory database, waivers, review
attestations, and provenance materials. Every repository path must be tracked,
regular, repository-relative, and free of symlink or traversal components. A
checkout, ref, tree, file digest, lock, suite inventory/topology, or review
subject mismatch fails closed.

AO 1.1.0 uses an operator-countersignature model: the independent review is the
committed `reviewed_OK` verdict from a separate reviewer session, and the
operator's Ed25519 signature (trust root `ao-release-reviewer-2026`) attests that
it is bound to the exact candidate commit and tree. The key is held with
same-OS-account custody; see
`plan/PROJECT_V6/reviews/A_0_3_signing_decision.md`.

The technical subject may be followed by review-request and review-verdict
commits on the evidence branch. Those post-freeze commits may change only
canonical `plan/PROJECT_V*/reviews/*_{to_review,reviewed_OK,reviewed_KO}.md`
artifacts. Integration must contain both identities. Governed bytes are read
from blobs in the pinned technical tree, then compared with the index and
checkout; `skip-worktree`, `assume-unchanged`, mixed index blobs, and revision
expressions disguised as refs are rejected. Every Git operation ignores
replacement objects and caller-selected replacement namespaces; a legacy graft
file fails closed before identity or ancestry resolution. Git subprocesses
inherit only the executable `PATH`; repository-local environment variables,
external graft/shallow selectors, caller config parameters, and caller
HOME/XDG settings are excluded. Global and system configuration are disabled
explicitly. Repository-owned configuration that Git cannot parse fails with a
generic error rather than leaking its source path.

## Repository gate

The local and remote CI entry point runs:

```bash
python3 scripts/release_candidate.py verify-repository --repo-root .
```

`verify-repository` regenerates the production graph from the hash-locked
`requirements.lock` and integrity-locked `gateway/package-lock.json` without a
resolver or network call. Python roots come from both production project
manifests and non-development extras. Every active lock entry requires a
SHA-256 hash, and markers are evaluated across
`ci/release-environments.json` rather than the verifier host. Lock comments
are not graph authority; all active nodes are included conservatively. The gate
compares that graph byte-for-byte with
`ci/production-sbom.json`, requires one known license for every component, and
checks each license against the independent `ci/license-allowlist.json`
policy. The SCA gate verifies every exact locked purl against the primary OSV
snapshot in `ci/offline-advisory-database.json`. The snapshot preserves the
ordered querybatch request, bounded raw bytes, canonical response, SHA-256
digests, 1:1 result mapping, complete pagination, and primary vulnerability
details. The npm Bulk Advisory response is explicit corroboration, not the
authority. An expired snapshot, stale scan, incomplete/unknown/unrelated
coverage, raw/canonical mismatch, or self-declared finding list fails closed.
An empty result is evidence only for its exact OSV query; no local `not
affected` assertion is created. Every high or critical finding is rejected by
the repository gate. The committed waiver registry is deliberately empty;
candidate-specific waivers are supplied to `collect` as external evidence.

The same gate consumes `ci/suites.json` and the non-refreshable
`ci/suites-contract.json`, then delegates validation to the authoritative
`scripts/ci_gate.py` implementation. Suite IDs, execution topology, skip
allowances, readiness predicates, and inventory digests therefore have one
authority. `ci/release-suites.json` is not a supported release artifact.

Primary snapshot refresh is the only networked step. It uses fixed public OSV
and npm registry endpoints, no credentials/cookies, bounded HTTP responses,
and hard-fails on TLS, HTTP, count/order, or pagination errors:

```bash
python3 scripts/refresh_advisory_snapshot.py \
  --repo-root . \
  --fetched-at 2026-07-26T05:22:31Z \
  --validity-days 14
```

Review the snapshot for unexpected paths or secret-shaped data. Then refresh
generated evidence from already installed offline environments. Repeat
`--python-site-packages` for platform-specific metadata when the reviewed
environment matrix contains packages that are inactive on the host:

```bash
python3 scripts/release_candidate.py refresh-generated \
  --repo-root . \
  --python-site-packages .venv/lib/python3.11/site-packages \
  --python-site-packages /var/tmp/windows-metadata \
  --node-modules gateway/node_modules \
  --snapshot-at 2026-07-26T05:22:31Z
python3 scripts/release_candidate.py verify-repository --repo-root .
```

`refresh-generated` itself never queries a registry or advisory service. It
does not generate or overwrite the license allowlist, primary advisory
snapshot, or waiver registry. It consumes those reviewed inputs and regenerates
only the license inventory, SBOM, and SCA result.

Refresh CI file inventories separately through the sole CI authority:

```bash
python3 scripts/ci_gate.py --repo-root . --refresh-inventory
```

That operation rewrites only `ci/suites.json`; it cannot rewrite
`ci/suites-contract.json`. Any suite ID, command, include/exclude pattern,
skip allowance, readiness predicate, or timeout change requires an explicit
reviewed edit to both authoritative files.

## Collect and verify a candidate

Collection requires a clean tracked checkout and full branch refs. The output
path must remain outside the candidate checkout:

```bash
python3 scripts/release_candidate.py collect \
  --repo-root . \
  --base-ref refs/heads/integration/V5-functional-wave-1 \
  --branch-ref refs/heads/feat/V5-C-0-02-candidate-contract \
  --candidate-commit FULL_TECHNICAL_COMMIT \
  --output /var/tmp/release-evidence/candidate.json
```

Omit `--candidate-commit` only when the evidence head is itself the technical
commit. The command prints the external SHA-256 candidate digest and technical
subject. Add one or more canonical external review attestations with
`--review`; each attestation has this semantic shape:

```json
{
  "schemaVersion": "release-review/v1",
  "verdict": "OK",
  "reviewer": "mailto:independent-reviewer@example.invalid",
  "reviewerRole": "independent-reviewer",
  "keyId": "release-reviewer-2026",
  "issuedAt": "2026-07-26T06:00:00Z",
  "signatureAlgorithm": "ed25519",
  "signature": "BASE64_ED25519_SIGNATURE",
  "subject": {
    "commit": "FULL_CANDIDATE_COMMIT",
    "tree": "FULL_CANDIDATE_TREE"
  }
}
```

The Ed25519 signature covers every field except `signature`; the candidate
digest covers the full attestation including that signature. Public key,
identity, role, and validity windows are reviewed in
`ci/reviewer-trust-roots.json`. Private keys must never be committed. The
collector accepts only canonical bytes and rejects an unknown/expired key,
invalid signature, candidate author or committer, detached subject, review
predating the technical commit, or future issuance. Reviewer mail identities
use the same lowercase ASCII grammar in the schema and runtime.
Verify a collected candidate with `verify`, optionally with an external state
ledger:

```bash
python3 scripts/release_candidate.py verify \
  --repo-root . \
  --candidate /var/tmp/release-evidence/candidate.json \
  --state /var/tmp/release-evidence/state.json
```

All commands emit one JSON result without absolute local paths in errors. A
validation failure returns 1; success returns 0. `--at` exists only for closely
synchronized automation and is
refused when it differs from the system UTC clock by more than five minutes;
it cannot revive an expired waiver or database by rolling validation time
backward.

## Explicit state ledger

`release-state/v1` is also external and binds the SHA-256 digest plus the Git
subject of exactly one candidate. It records only the contiguous ordered
prefix:

1. `planned` with plan evidence;
2. `implemented` with implementation evidence;
3. `reviewed` with candidate-bound independent `OK` review evidence;
4. `integrated` with a non-feature branch whose recorded full ref identity is
   the candidate itself (fast-forward) or a merge/descendant containing it;
5. `promoted` with `refs/heads/main` at a full identity containing the recorded
   integration; and
6. `released` with one SemVer tag at the promoted commit, an embedded canonical
   provenance artifact, and a four-item canonical checklist binding the
   candidate, final evidence head, signed review, integration, and promotion.

No state is inferred from a filename, prose, checklist, review, later state,
or a ref with the same-looking abbreviation. Skipped, duplicate, regressive,
future, or stale transitions fail. Every transition evidence digest is
recomputed from its canonical bytes; ref evidence additionally binds the full
resolved commit/tree so a moved ref fails. Review does not imply integration,
promotion, or release. A boolean checklist or arbitrary provenance digest is
not accepted.

## Advisory waivers

A high or critical advisory is accepted only during candidate verification
when there is exactly one narrow waiver for the same advisory and exact
package purl. The waiver must bind the full candidate commit/tree and both lock
digests and must contain:

- a stable waiver identity and matching severity;
- a named owner;
- a concrete production reachability analysis;
- at least one compensating control;
- tracked evidence with SHA-256 digests;
- an issuance timestamp no later than the trusted validation clock and a future
  UTC expiry no more than 30×24 hours after issuance; and
- issuer provenance whose subject digest is the candidate tree.

Wildcards, missing owners or evidence, expired dates, changed locks, different
packages, and detached subjects are rejected. The external waiver registry is
passed to `collect` with `--waivers`; embedding it in the candidate keeps the
final candidate digest content-addressed without modifying the release tree.

This is a local release-validation surface. It does not add an MCP tool and
does not change `message.*`, `coordination.*`, or `agents:events`.

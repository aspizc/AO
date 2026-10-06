# ADR-V5-02: Pinned release evidence and primary offline SCA

Status: Accepted for Project V5 C/0/02 Trial 2

## Context

A release request and its independent verdict are commits created after the
technical implementation freezes. Treating the moving branch head as the
technical subject invalidates otherwise correct evidence. Conversely, reading
governed bytes from the checkout lets Git index flags conceal content that is
different from the claimed tree. A non-empty but unrelated advisory corpus and
an unsigned reviewer name provide similarly convincing-looking false success.

## Decision

`release-candidate/v1` separates two immutable identities:

- `repository.candidate` is the technical commit/tree under review;
- `repository.branch` is the final evidence head.

Every commit between them may change only canonical files under
`plan/PROJECT_V*/reviews/`. Integration and promotion must contain both the
technical commit and this final evidence head. User-supplied refs are accepted
only as exact existing refs; revision expressions are never evaluated as refs.
All governed digests are computed from blobs in the pinned technical tree.
Collection and verification also require the index blob and checkout bytes to
match that tree and reject `skip-worktree` or `assume-unchanged`.

Review attestations use Ed25519 over canonical JSON and bind the full technical
subject, normalized reviewer identity, independent-reviewer role, key ID, and
issuance time. Public keys and validity windows live in
`ci/reviewer-trust-roots.json`; private keys never belong in the repository.
A review cannot predate the technical commit, be issued after the validation
clock, or be promoted by an earlier state transition.

The Python graph derives direct roots from both production `pyproject.toml`
files and their non-development extras. Every active lock node needs a SHA-256
hash. Marker branches are evaluated against the reviewed
`ci/release-environments.json` matrix, not the verifier host. Comments in the
flat lock are never graph authority; all active locked nodes are conservatively
included.

OSV querybatch is the SCA authority. The committed snapshot preserves bounded
raw response bytes plus canonical responses and both digests, exact ordered
requests, 1:1 component/result mapping, complete continuation-token traversal,
individual primary vulnerability details, and a bounded validity interval.
The official npm Bulk Advisory endpoint is recorded only as corroboration.
Normal verification is entirely offline and fails for missing, unrelated,
unknown, reordered, stale, or expired evidence. Empty OSV results are accepted
only as the primary response for that exact component; the system never
invents a `not affected` assertion.

Release evidence embeds canonical provenance and checklist artifacts. Their
digests are recomputed and the checklist binds the candidate, final evidence
head, signed review, integration, and promotion evidence. A boolean checklist
or arbitrary SHA-256 string is not release evidence. High/critical findings
need either an upgraded exact lock or one candidate-bound waiver with real
reachability evidence and a validity of at most 30×24 hours.

Every Git operation uses one argv-only, no-shell wrapper with null stdin, fixed
locale, disabled prompts/hooks/maintenance, a process-group timeout, and
TERM/KILL cleanup.

## Consequences

Review-request and verdict commits no longer invalidate the technical subject,
but unrelated post-freeze changes require a new technical candidate. Adding a
reviewer requires a reviewed public-key change. Primary network access is used
only by the explicit snapshot refresh command; CI and candidate verification
remain offline. The contract does not add an MCP tool or change
`message.*`, `coordination.*`, or `agents:events`.

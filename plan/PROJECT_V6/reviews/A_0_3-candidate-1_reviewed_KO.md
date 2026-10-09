# A/0/03 release candidate: trial 1 — KO

Reviewer: independent Claude Opus 5.5 (`claude-opus-5-5`, max) Claude Code session in the read-only
worktree `wt-v6-a03-review`, detached at `46f5e6dbb009f5e86025f5d01ceafd2bc32c5dec` (local
`release/1.1.0` tip). The brief gave no Gateway trace, task or session id. This session wrote none of
the candidate, the trust-root commits or the request, and took part in no earlier trial. No
sub-agents. Date: 2026-10-09.

- Candidate: `2d9d7ca2da095edaa8b36a9d9dde542c657db06a`, tree `f073d1037f1deacc3b0443974236c0e9305b078b`.
- Request: `A_0_3-candidate-1_to_review.md` (SHA-256 `e757adf0…7b74`), added by `46f5e6d`, the only
  commit after the candidate.
- Bound bytes: `ci/reviewer-trust-roots.json` SHA-256 `69176f8a…8a7d`; `CHANGELOG.md` SHA-256
  `e6c2fa83…0bcb`.

## Verdict

**KO.** Contents, lineage, merge resolutions, the integrated verifier and public hygiene hold (see
Verified). Three blocking findings remain:

- KO-1 is a security decision that a reviewer cannot make.
- KO-2 and KO-3 are text defects that cannot be fixed after the freeze. Post-freeze commits may change
  only canonical review artifacts (`scripts/release_candidate.py:56-59`, `:1511-1548`;
  `docs/release-candidate.md:21-24`).

A new technical candidate is required.

## Blocking findings

### KO-1. The trust-store key is out of the sheet's scope and has no recorded operator decision

- **The change.** `a2fc098` and `2d9d7ca` add key `ao-release-reviewer-2026` to
  `ci/reviewer-trust-roots.json`. At 1.0.0 the file was `{"keys":[]}`.
- **Out of scope.** `A/0/03.md:87` lists "Signing keys or new provenance formats" under Non-scope.
  - The A/0/03 write scope (`SHEETS.md:17`) does not include this file.
  - `HUMAN_DECISIONS.md` and `reviews/` record no decision about it.
- **It gates the release.**
  - `collect`/`verify` accept a review attestation only if it verifies against a trust root
    (`release_candidate.py:3497-3577`).
  - The ledger's `reviewed` transition requires such an attestation (`:3669-3680`).
  - So whoever holds the private key can move any candidate through `reviewed`.
  - ADR-V5-02:67-68 requires a reviewed public-key change. AGENTS.md Rule 15 says a task never
    silently decides a security question.
- **The sheet contradicts itself.** Scope 3, and the criterion that `verify` passes with the ledger at
  `released`, cannot be met with an empty trust store. Yet Non-scope excludes signing keys. The
  candidate resolves this silently; Rule 7 requires surfacing it.
- **Custody is not evidenced.** The request says the operator holds the private key outside the
  repository. The repository records nothing about who generated the pair or where it is kept.
  - `validFrom` is 21:09:14Z. Commit times: `a2fc098` 21:09:21Z, `2d9d7ca` 21:09:27Z, request
    `46f5e6d` 21:10:03Z.
  - All three commits carry the same orchestrator `Claude-Session` trailer.
  - Requests are untrusted input (Rule 15), so I cannot accept the custody claim on the request's word.
- **Independence is nominal under the stated custody.**
  - The subject `mailto:release-reviewer@ao.invalid` is a pseudonym on a reserved TLD.
  - If the operator holds the key, the signer is also the candidate's author and committer of record
    (`carlos.aspizc@gmail.com`).
  - The check "candidate author/committer is not an independent reviewer"
    (`release_candidate.py:3560-3565`) compares identity strings only, so it cannot detect this.
  - The signature then becomes an operator countersignature of the committed independent verdict.
    That may be acceptable, but only as an explicit, documented choice.
- **Required.** An operator decision file (`A_0_3_*_decision.md`, or `A_0_3_to_check_by_human.md`
  first) that settles:
  - (a) that one reviewer trust root enters 1.1.0 scope, with A/0/03 Non-scope and the SHEETS write
    scope amended;
  - (b) who generated the key pair and who holds the private key, kept where no agent session can
    read it;
  - (c) what the signature attests and under which identity, plus a line in
    `docs/release-candidate.md` if the countersignature model is chosen;
  - (d) the validity window.

  Then re-review the trust-root bytes on the next candidate.
- **Byte-level checks: pass.**
  - The file is canonical: the repo's own `read_canonical_json` and `_validate_reviewer_trust_roots`
    report no errors. The `a2fc098` version lacked its final newline; `2d9d7ca` fixed that.
  - The 32-byte `publicKey` decodes to a valid Ed25519 curve point.
  - The candidate tree and the release diff contain no private key material.
- **Caveat on `verify-repository`.** It never reads this file: `_cmd_verify_repository` runs only
  `validate_repository_supply_chain` (`release_candidate.py:4134-4151`).
  - No test or gate lane validates the committed trust root; the tests use fixture roots.
  - The non-canonical `a2fc098` file would have passed the full gate.
  - A `verify-repository` pass is therefore not evidence for the trust store.

### KO-2. Release docs contradict the CHANGELOG on A/0/06 live acceptance

- **Flagged before.** The changelog-2 KO asked for this to be reconciled before the candidate froze
  (`A_0_3-changelog-2_reviewed_KO.md:127`), and changelog-3 repeated it. `09d89c4` updated only
  `SHEETS.md:4,16` and `A/0/06.md`.
- **Says open or pending:**
  - `README.md:36`
  - `docs/project-status.md:118-119` and `:183-185`
  - `plan/README.md:17-18`
  - `plan/PROJECT_V6/README.md:13-14`
  - `plan/PROJECT_V6/A/README.md:4,13`
  - `plan/PROJECT_V6/SHEETS.md:23`
- **Says passed:** `CHANGELOG.md:35`, `SHEETS.md:4,16`, `A/0/06.md:5,88`.
- **Effect.** Because of the post-freeze rule, the 1.1.0 tag and the promoted `main` would publish a
  README that contradicts its own CHANGELOG.
- **Required in the same edit: the tmux runbook.** `docs/tmux-runtime.md:56-69` covers the manual
  cutover only "from a running .3 server", and no public release shipped `.3`. `CHANGELOG.md:39-42`
  correctly includes 1.0.0's `.1`, which is the upgrade path public users take. Cover `.1`, or any
  older server.
- **Recommended in the same edit (not blocking alone).** `README.md:36-37` and
  `docs/project-status.md:184-185` say "release assembly … unfinished" and "not AO `1.1.0` yet".
  That text would ship at the tag. 1.0.0 had a similar precedent; prefer tag-neutral wording.

### KO-3. The CHANGELOG A/0/00 bullet misstates Antigravity

- **The bullet.** `CHANGELOG.md:11-14` says "the other providers use CLI tool restrictions" and
  "Claude, Antigravity and OpenCode can still expose a shell that writes, so their read-only profile
  is not an OS sandbox".
- **The code.** Every Antigravity non-writer is refused before launch, on both delegate and spawn:
  `antigravity_adapter.js:218-222` and `:339-343`, `assertPolicyAllowed(evaluate(... "code.write"
  ...))`. `docs/adapters/antigravity.md:76-82` (`POLICY_DENIED` before any child or tmux launch) and
  `docs/project-status.md:46` say the same.
- **User impact.** Base policy lets Antigravity take non-writer roles: its `allowedRoles` include
  reviewer and planner, which deny `code.write`. Such seats launched under 1.0.0 and get
  `POLICY_DENIED` under 1.1.0.
- **Why it blocks.** The release notes credit Antigravity with a read-only profile that never runs
  and omit a breaking change. The changelog-1 OK explicitly left code-level feature checks to this
  candidate review.
- **Suggested wording:** "Codex uses a read-only OS sandbox for non-writers. Claude Code, pi and
  OpenCode use CLI tool restrictions; Claude Code and OpenCode can still expose a shell that writes,
  so their read-only profile is not an OS sandbox. Antigravity non-writer seats (for example reviewer
  and planner) are refused with `POLICY_DENIED` before launch, because its plan mode is not verified
  to refuse writes."

## Required in the next request (not a candidate defect)

### TDD RED release evidence

`A/0/03.md` TDD RED says both outputs "go in the review request". Neither this request nor any earlier
A/0/03 request contains them; verifier-1 lists them as not verified. I reproduced both.

- **Hygiene.** I ran the candidate scanner on an export of the `1.0.0` tree.
  - As-is: exit 2. `ci/public-hygiene-fixtures.json` is absent at 1.0.0, so the scan errors out with
    no hits.
  - With the candidate's allowlist supplied: exit 1, 10 findings. Eight are home paths
    (`prompts/kya_*` 2, `scripts/kya_*` 3, tests 3). Two are non-public ids, `engineering_graph` and
    `kya`, at `policies/repositories.json:30,35`.
  - The candidate itself: 0 findings, exit 0.
- **Ledger.** `validate_state_ledger_shape` rejects `integrated -> released` with "impossible
  transition". The order is fixed by `STATES` (`release_candidate.py:72-79`, `:811-817`).
- The next request should include its own outputs and say which hygiene variant it ran.

### Post-freeze layout

`collect` rejects any commit between the candidate and the evidence head that changes a path outside
`plan/PROJECT_V*/reviews/*_{to_review,reviewed_OK,reviewed_KO}.md`. Two planned commits would fail that
check:

- the planned `A_0_3-candidate-gate.md`;
- the usual practice of committing each verdict with its `reviews/README.md` row (for example
  `3871dd3`).

Decide before the next freeze where gate totals and index rows go. One option: put the gate totals in
the `_to_review.md` request, and commit index rows after the evidence head used for `collect`.
Otherwise Scope 3 fails, and the layout conflicts with the review-index rule in AGENTS.md Rule 13.

## Verified (holds for this candidate)

### Identity and lineage

- `2d9d7ca…` is a commit with tree `f073d103…`.
- Annotated `1.0.0` peels to `41f9ce2…`, and `refs/heads/release-base/1.0.0` points there too.
- `1.0.0` and local `main` (`fb93756`) are ancestors of the candidate.
- `release/1.1.0` is `46f5e6d`; its only post-candidate path is the request.

### Diff size

`git diff 1.0.0..2d9d7ca --stat` reports 1,337 files, +97,904/-370. Without rename pairing:

- 1,131 paths under `plan/`: 1,130 new trail files, plus `plan/README.md` modified.
- 207 paths outside `plan/`: +18,839/-401.

### Contents

All 13 integration merges are first-parent ancestors of the candidate:

| Merge | Integrates |
|---|---|
| `7df29bd` | A/0/02 |
| `bdf7da0` | V7 A/0/01 |
| `76a0dd4` | V7 A/0/00 |
| `343222e` | A/0/04 |
| `b9b8bbd` | verifier |
| `a8e8430` | A/0/00 |
| `69f222f` | A/0/01 |
| `b4506d2` | A/0/05 |
| `7982e42` | A/0/04 live startup |
| `44c215f` | A/0/06 |
| `1ce3f55` | A/0/06 operator response |
| `99e6a52` | A/0/06 `.4` live-fix |
| `8ee0933` | A/0/06 hygiene fix |

### Merge resolutions

I re-merged each merge with `git merge-tree --write-tree`.

- **Seven clean merges** equal the recorded tree: `7df29bd`, `bdf7da0`, `76a0dd4`, `b9b8bbd`,
  `1ce3f55`, `99e6a52`, `8ee0933`.
- **`7982e42`** equals the auto-merge `aba56557` plus only its 3 merge-review files.
- **Five conflicted merges** equal their independently reviewed staged trees:
  - `44c215f` = `f37bc267` exactly;
  - `b4506d2` = `fd45d83`, `69f222f` = `6cb8585`, `a8e8430` = `21938e2` and `343222e` = `ba589f7`,
    each plus only its own request, verdict and index row.

### Commits made after their review

- **Verifier.** `scripts/release_candidate.py` (`1552f096…`) and its test (`87c18f19…`) match the
  verifier-1 OK hashes at `9bd4dfe` and in the candidate. The only production delta since 1.0.0 is
  `v` → `v?` in `SEMVER_TAG`.
- **A/0/06 verdict tables.** operator-2 matches 9/9 at `53b637e`, livefix-2 29/29 at `3a8fdcc`, and
  hygiene-1 6/6 at `41121be`. All 40 latest-reviewed hashes are identical in the candidate.
- **V7 manifests.** A/0/00 is 45/46 identical and A/0/01 37/45. Every difference is either a later
  reviewed V6 change (`request_context.js` via the A/0/05 reconciliation, `cli/.../main.py` via
  `53b637e`, the `ci/suites.json` inventory refresh) or a status doc.

### Last change to each of the 207 non-plan files

Every last change traces to one of these:

- a reviewed leaf commit or reviewed merge;
- the operator-authorized registry migration `3f7d78a`, the only `policies/` change;
- the inventory refresh `4656d51`;
- the status-2-reviewed `b2ed3af`;
- the operator-choice profile doc `b5664fd`;
- the approved CHANGELOG `b1f2c66`;
- the trust root `2d9d7ca`.

### CHANGELOG

- It is byte-identical to `b1f2c66`, approved in changelog-3. Since then only the trust root and the
  changelog-3 review files changed.
- It names the six V6 leaves, the A/0/00 residual and both V7 foundations.
- Apart from KO-3, the bullets match the code:
  - `AGENTS_WORKER_*` (`base_adapter.js:15-17`);
  - `AGENTS_REPOSITORIES_OVERLAY` (`config.js:112-114`, `registry.js:346-360`);
  - the required `public.hygiene` lane;
  - the `AGENT_PROMPT_NOT_SUBMITTED` reasons;
  - Linux/SQLite-only recovery (`request_recovery_identity.js:54`);
  - `agent-run project` and `agent-run wave budget-init`.
- Live-3 ran on `8bc4c87`. Outside `plan/`, that commit differs from the candidate only in
  `CHANGELOG.md` and the trust root.

### Checks run

These ran on the worktree, which is the candidate plus one `plan/` file, with no bytecode or cache
writes.

| Check | Result |
|---|---|
| `verify-repository` | exit 0, `"status": "passed"`, 0 advisories, 0 waivers |
| `ci_gate.py --validate-only` | exit 0 |
| Release contract suite | 73 passed, 0 failed, 0 skipped |
| Structure suite | 462 passed, 0 skipped |
| `check_public_hygiene.py` | 0 findings, exit 0 |
| Secret-shaped tokens or private-key blocks in the release diff | none |
| `git diff --check`, worktree | clean |
| `git diff --check 1.0.0 2d9d7ca`, outside `plan/` | clean |

Inside `plan/`, only immutable raw evidence logs and patches (21 files) report whitespace issues, as
earlier integration reviews noted.

## Non-blocking notes

1. Set the `## [1.1.0]` date at refreeze or tag time; it currently says 2026-10-09.
   `CHANGELOG.md:34` is 81 columns wide (changelog-3 note 1).
2. The A/0/05 bullet names neither the explicit `orchestration.reattach` MCP tool (tool count 33 → 34)
   nor SQLite migration 005. Consider naming both.
3. The `plan/**` hygiene exemption also covers new V6/V7 documents: 165 lines contain
   `/home/carase/`. Most are checkout paths; others include `.config/agents-gateway/AO` and
   `git/experiments/kya`. This is within the operator's decision; flagged before publication.
4. Since 1.0.0, 28 commit messages carry `Claude-Session:` URLs (none did before). Pushing `main`
   publishes them. Operator's call.
5. Live-3's "Not covered" cites "V7 A/0/05", but V7 registers only A/0/00 to A/0/04.
6. `b5664fd` (Codex coder effort set to medium) is an operator-choice tooling doc with no review row.
   It is harmless.

## Limits

- I ran no full `bash scripts/ci.sh`. That host gate is separate and not part of this request.
- I ran no `collect`, ledger, tag, live provider, tmux server or Redis.
- I did not inspect key custody outside the repository.
- Content checks read `2d9d7ca` blobs, or are unaffected by the single request file in the worktree.
- Two of my Python runs created a gitignored `scripts/__pycache__/`: one from an `-I` import, one from
  a structure-test subprocess. I removed both, and `git status --porcelain --ignored` is empty.
- Scratch files stayed in this session's scratchpad, outside the repository. I made no commits, refs
  or tags.

## Status and next step

- A/0/03 stays `planned`. This candidate is not reviewed OK, and nothing is integrated, promoted or
  released. This verdict does not decide promotion, tagging or publication.
- Next trial:
  1. Record the operator decision for KO-1.
  2. Apply the doc fixes for KO-2 and the CHANGELOG fix for KO-3.
  3. Freeze a new technical candidate and run its full gate.
  4. Write a request that includes the RED evidence and the post-freeze layout.
  5. Assign a fresh reviewer session.
- Save as `plan/PROJECT_V6/reviews/A_0_3-candidate-1_reviewed_KO.md`. I wrote no repository files.

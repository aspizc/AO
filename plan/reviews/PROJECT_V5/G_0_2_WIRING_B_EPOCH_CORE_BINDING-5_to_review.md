# Review Submission - Project V5 G/0/02 STORE-BINDING (Trial 5 custody correction)

## Requested verdict

Assign a fresh independent Codex reviewer with a new trace, session, and
worktree. Review the same frozen integration merge below and write only:

```text
plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-5_result.md
```

Use `reviewed_OK` or `reviewed_KO`, enumerate P0/P1/P2 findings, and derive all
Git identities directly. This request is pending and is not a coder verdict.

## Trial 4 KO preserved

Trial 4's independent result is preserved unchanged:

```text
commit  d6a1badbffe8041d6469d2300ad6b251bceda4fd
tree    b6761aa73ccd737e26e65a578f70c750dc1fd7e1
parent  baeecae2b402081091d3513b4a57a826b9c03735
subject review(v5): reject G_0_2 STORE-BINDING Trial 4 integration
delta   A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-4_result.md
artifact art-96056f6c-eec2-43dc-b4fe-34341825cf0e
verdict reviewed_KO; P0/P1/P2 0/0/1
```

The complete 384-line result was read. It accepts the merge mechanics and all
130 semantic tests, but rejects one false custody identity in the immutable
Trial 4 request. Trial 4 remains KO and has not been edited or overwritten.

## Exact forward correction

Trial 4 falsely assigned this nonexistent tree to Trial 3 request commit
`45ca68c80fe441ee8e91959dde37f831f3afc7d8`:

```text
8b9e8a9c7504ddf8385d167ed54eae2aa1120399
```

`git cat-file -e` rejects that value. Git derives the actual tree with
`git rev-parse 45ca68c80fe441ee8e91959dde37f831f3afc7d8^{tree}`:

```text
8b9e8a9c5193a32a821e8c19cdd44e3904c28a0f
```

`git cat-file -t` returns `tree` for the actual value. This Trial 5 request is
the forward-only correction; no immutable Trial 4 artifact was rewritten.

## Unchanged frozen merge

```text
commit  51b0c0de69a568daf47773046895a5840a3128df
tree    be46f33ad48852eb721c93e08c83d8562fdf80bf
parents 81bb05ec09f8d8c64027d1106e81f834d96b7742
        76317eb812083d5b83e4ae34d315c026f3e3fd3b
subject merge(v5): integrate G/0/02 STORE-BINDING candidate
```

Main remains first parent and independently reviewed STORE-BINDING remains
second parent. The authenticated merge base remains
`f904a2884f19fe5a9aafa9af58b3070a0b29059c`. Both parents remain ancestors of
the merge. No candidate, product, test, inventory, or prior-artifact byte was
changed for Trial 5.

The merge retains the exact 11-path first-parent and 21-path second-parent
pathsets recorded and independently authenticated in the Trial 4 result. Its
combined diff remains only:

```text
MM ci/suites.json
MM plan/PROJECT_V5/reviews/README.md
```

## Preserved blobs

| Path/artifact | Git blob |
|---|---|
| Binding source | `a76cc1c6022835ca4a9d291fe2bbd5ba6396f521` |
| Runtime test-profile re-export | `24be1a2b34c6e85c99a6a4a08e4b0795cea17051` |
| Focused binding test | `60b966abfdb2ffe74505c1913f00d9b2487fd92b` |
| Generated `ci/suites.json` | `18b8e41d2b410f9d97ee6dca0f0511586d86f30b` |
| Merge review-index union | `e83f6ccd031fd44bfb985c06328353edc2a2724f` |
| Trial 1 result / request | `641e9421aaa68a1d84eb5230a602e8bed6d8ebdb` / `366d8c82c245f6e562736e23ee63e7d8b24012a9` |
| Trial 2 result / request | `6242f9bc24fac547fb261c8ad8f0b2080c688962` / `419de75383a4a818d0daa52a2211e489740aef1c` |
| Trial 3 result / request | `2460a919dd6b820dca47159d83a9a427d6cd16ca` / `196e3484b37a0fd73bd80af0fc87809d9e09163a` |

The generated manifest still has SHA-256
`444e3310a0455c1e01aeef4a207c57ec955ccd0465ad5bb581b7ecd10cdfe2d0`.
Its `lint.gateway` and `test.gateway` inventories remain respectively:

```text
sha256:854bc480c875e835c81de3b1a0f7e0865f01304c7f570a2a6ec56b69db2e7cd4
sha256:f6bf19a001a01341c9dad63ab55f21bfd7b68571565b061f42b4a0e097f3922e
```

## Verification and semantic provenance

Trial 5 runs only ancestry, object/tree, parent-order, pathset, byte-equality,
review-index union, whitespace, protected-path, and CI inventory validation
guards. These pass against the immutable merge. `ci_gate.py --validate-only`
returns `status=passed`, zero errors, and validation counters 0/0/0/0.

No semantic test was rerun for this evidence-only correction. The exact
semantic provenance is the independent Trial 4 reviewer run, serially at the
same merge:

```text
focused: 54 tests, 54 passed, 0 failed/cancelled/skipped/todo; 1662.795136 ms
affected: 76 tests, 76 passed, 0 failed/cancelled/skipped/todo; 15174.620209 ms
combined: 130 tests, 130 passed, 0 failed/cancelled/skipped/todo
```

This request does not claim those tests as a fresh coder run.

## Request-only custody

This request's commit must be the sole-parent child of exact Trial 4 result
`d6a1bad...` and change exactly:

```text
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-5_to_review.md
```

The index change marks Trial 4 KO and appends exactly one pending Trial 5 row;
all prior rows remain unchanged. The reviewer must derive the request commit,
tree, and request SHA-256 directly from Git because they cannot be embedded
self-referentially in this file.

## Limitations and non-claims

- Aggregate CI, semantic reruns, shared infrastructure, integration to main,
  promotion, release, tag, publication, push, and policy work were not done.
- The unchanged feature remains private and test-profile-only; it does not
  establish production support or G/0/02 completion.
- The sole permitted untracked worktree entry remains
  `gateway/node_modules`; no dependency or lockfile was changed.

Fresh review should verify the correction, unchanged merge and blobs, request
pathset, index transition, inventory validation, and every lifecycle non-claim
before issuing the Trial 5 verdict.

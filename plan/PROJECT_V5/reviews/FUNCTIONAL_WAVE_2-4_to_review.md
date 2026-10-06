# Project V5 functional Wave 2 — promotion-candidate review request, Trial 4

## Review status

This is a request for a fresh independent review of one exact promotion
candidate. It is not a verdict and makes no promotion, release, tag,
publication, deployment, support, or D/0/07c review claim.

The reviewer must be a new `claude-code` session using `claude-fable-5` with
`max` effort. It must not have implemented, formed, or gated this candidate.

## Exact candidate

```text
candidate branch integration/V5-wave2-main-candidate-t4
candidate commit 2986b09f02d2119a8d89b25e9696d9325b27b339
candidate tree   c4661b2c4c9e557abe17d321e482987f5b3ace32
candidate parent c22920ff5f87c7365b94d6bcb66f8c54ba6f02b6
```

The complete append-only formation chain is:

```text
9f075e181ef257b4b5b4b4cac3c0870af97110ec
  -> 7ac2e2545fb5d4b45ae3d15da0aa92b7e047b8d1

608a5be06e7a58e51d51b912ee3ecbe5d97f42e1 (main)
  + 7ac2e2545fb5d4b45ae3d15da0aa92b7e047b8d1
  -> 0795f25638fffc7d2947babc7b38a0fc03a41c53
     tree e3bf408f154f0d93d07fc7e68620fa59a8c13784

0795f25638fffc7d2947babc7b38a0fc03a41c53
  -> f6aa6b5560326fde0c941bfe608d48f174901ea0
  -> c22920ff5f87c7365b94d6bcb66f8c54ba6f02b6
  -> 2986b09f02d2119a8d89b25e9696d9325b27b339
```

`0795f25` has parent 1 `main@608a5be` and parent 2 corrected Wave
`7ac2e25`. An independent `git merge-tree --write-tree` recomputed its exact
tree `e3bf408f...`; the two parent-side path sets after merge base `7039a0b`
have zero intersection.

`f6aa6b5` and `c22920f` preserve the immutable Trial 3 request and KO verdict
byte-for-byte. They are review evidence in the candidate history, not a
transferred verdict for this new object. `2986b09` is the final five-document
status correction and is the object under review.

At request time:

- `main` remains `608a5be06e7a58e51d51b912ee3ecbe5d97f42e1`;
- `develop` remains `b870d1ca250b17c32efca09bfbea243980ac7443`,
  with the same tree as `main` and two commits behind it;
- both are ancestors of the candidate;
- the candidate is 394 commits ahead of `main` and 396 ahead of `develop`;
- the candidate worktree is clean after an exact-lock `npm ci`;
- no remote is configured and no release tag contains the candidate; and
- this request and any verdict live on a separate review branch, so they do
  not mutate the candidate object.

## Trial 3 KO closure

Trial 3 independently returned `reviewed_KO` at
`FUNCTIONAL_WAVE_2-3_review.md`. Trial 4 closes its findings without modifying
product code, tests, CI, policies, schemas, migrations, or deployments.

### P1 canonical status

Commit `7ac2e25` re-derived and reconciled the authoritative plan state:

```text
38 complete + 5 in progress + 39 planned = 82
5 + 39 = 44 open
```

The five in-progress sheets are exactly `C/1/00`, `D/0/01`, `D/0/07c`,
`G/0/02`, and `H/0/01`. It also reconciles the D/0/07a–d, H/0/01 DOCTOR,
G/0/02 ACK/OUTBOX/WIRING, review-index, and handoff narratives required by the
KO. The correction is 12 Markdown files and `190 insertions / 191 deletions`
relative to Wave tip `9f075e1`.

While the correction was being committed, D/0/07c advanced from Trial 3
review-pending to Trial 3 KO plus a new Trial 4 review candidate. Commit
`2986b09` therefore performs one additional bounded reconciliation in exactly
five plan documents:

```text
Trial 3 reviewed_KO: 1d8c952
Trial 4 technical GREEN: 5ffdf51
append-only review candidate: cf3b172
current state: in_progress and review-pending, not reviewed OK or integrated
```

That external D/0/07c candidate is not part of this Wave tree and this request
does not review it. D/0/07d remains planned and blocked. The five-document
change is `32 insertions / 23 deletions`; a deterministic RED found the stale
Trial 3-under-review wording, and the same GREEN validator found zero stale
matches and all current state markers.

### P2 closure

- `plan/PROJECT_V5/reviews/README.md` now indexes the previously omitted Wave
  series and no longer describes ACK Trial 4 as current.
- `HANDOFF_YOLO.md` explicitly labels its old sheet accounting as historical.
- This request uses the correct distance from Trial 2 candidate `d23c78b` to
  Wave tip `9f075e1`: 413 commits, 102 first-parent commits, and 26 merges.
  Through `7ac2e25` the distance is 414 / 103 / 26. It does not repeat the
  erroneous Trial 3 value of 17.

Relative to rejected candidate `cc9c975`, this candidate changes 15 files,
all under `plan/`, with `716 insertions / 192 deletions`. The two immutable
Trial 3 review artifacts account for three of those plan files; there is no
code, test, gate, policy, schema, migration, secret, or deployment delta.

## Exact candidate-bound gate

The orchestrator created a fresh lock-synced host environment:

- CPython 3.11.15;
- `requirements.lock` installed with `--require-hashes`;
- editable CLI and LangGraph packages installed offline from this worktree;
- pytest 9.1.1 and Ruff 0.15.22;
- Node 22.22.1;
- `npm ci` from the candidate's exact lockfile; and
- ESLint 10.8.0.

It then ran on exact candidate `2986b09` / tree `c4661b2`:

```text
env PATH=/tmp/wave2-ci-env.v9C1o4/venv/bin:$PATH bash scripts/ci.sh

aggregate status: infrastructure_unavailable
exit:             1
tests:            2294
passed:           2282
failed:           0
skipped:          12
```

Passed required lanes:

- lock and release-candidate checks: 1/1 each;
- Python and Gateway lint: 1/1 each;
- structure: 410/410;
- Gateway: 1418/1427, with nine PostgreSQL cases unavailable;
- E2E: 25/25;
- MCP smoke and policy registry: 1/1 each;
- CLI: 342/342; and
- LangGraph: 81/84, with two Gateway-integration cases and one Temporal case
  unavailable.

Unavailable service lanes:

- nine PostgreSQL tests;
- two Gateway-integration tests;
- one Temporal recovery test;
- required Redis-live, with zero tests run; and
- optional real-agent providers, with zero tests run.

The exit-1 aggregate and every unavailable lane are preserved as
infrastructure unavailable, not relabeled as passing. This is the same
12-skip promotion budget independently accepted in Trial 3 as sufficient for
local promotion only; it is not sufficient for release, support, publication,
or the future real protected pilot gate.

Post-gate `ci_gate.py --validate-only`, `git diff --check`, candidate identity,
and worktree cleanliness all passed. HEAD and tree remained byte-identical.
Gateway artifact:
`art-cd202531-5e40-4dad-8ed2-1ab6c2a1444d` under trace
`tr-tr-wave2-promotion-t4-re-3fc0df86-0b14-41c4-886d-b9a5f922cc42`.

One earlier attempt used the wrong ambient Python/ESLint toolchain and
produced environmental command failures. It is rejected evidence and is not
combined with or credited toward the exact gate above.

## Required independent review

Review the complete candidate and return exactly one explicit
`reviewed_OK` or `reviewed_KO` in `FUNCTIONAL_WAVE_2-4_review.md`.

At minimum:

1. authenticate candidate commit/tree/parent, the complete formation chain,
   Trial 3 artifact blobs, worktree cleanliness, and reachability from the
   exact current `main` and `develop`;
2. independently recompute the merge tree and parent-side path intersection;
3. verify the Trial 3 P1 and P2 closure against per-sheet status, review
   evidence, and every changed document rather than trusting this handoff;
4. re-derive the 38/5/39 census and exact in-progress set;
5. adjudicate the D/0/07c Trial 3-KO / Trial 4-pending wording without
   transferring any external D/0/07c verdict into this Wave;
6. reproduce or audit the candidate-bound gate and its exact skip/service
   attribution, preserving exit 1 and every unavailable lane;
7. scan the whole candidate delta for forbidden policy/secret/shared-service
   mutations and state overclaims; and
8. decide whether ordinary `--ff-only` movement of `main` and then `develop`
   to this exact object is authorized as local promotion only.

## Review boundary

The reviewer may run safe, offline, candidate-bound checks and disposable
probes. It must not edit the candidate, product code, tests, plan sheets,
prior evidence, policies, branches, tags, remotes, or shared services. The
only allowed repository writes are the new Trial 4 verdict and the Trial 4
review-index cell, committed with explicit pathspecs on this review branch.

An OK authorizes only ordinary local fast-forward promotion of `main` and
`develop` to exact commit `2986b09`. It does not authorize release,
publication, deployment, support, a tag, a push, or any D/0/07c/D/0/07d
integration.

# Project V5 functional Wave 2 — promotion-candidate review request, trial 3

## Review status

This is an independent-review request for one exact promotion candidate. It is
not a verdict and makes no promotion, release, tag, publication, or support
claim.

The reviewer must use a fresh Claude session and must not have implemented the
candidate.

## Exact candidate

```text
branch integration/V5-wave2-main-candidate
commit cc9c97521034a5a9abfff7e07eb2a53b8fa33e7b
tree   944a827ce12ef6e054e5b7ae541761157b784834
parent 608a5be06e7a58e51d51b912ee3ecbe5d97f42e1  (main)
parent 9f075e181ef257b4b5b4b4cac3c0870af97110ec  (Wave 2)
```

The merge was created from exact `main@608a5be` with an exact no-ff merge of
`integration/V5-functional-wave-2@9f075e1`. The two parent ranges changed
disjoint path sets after merge base
`7039a0bf9e08cd1f0e380844791409e75f4fdbdb`; the merge completed without a
content conflict.

At request time:

- `main` remains `608a5be`; it was not moved;
- `develop` remains `b870d1c`; it has the same tree as `main` but is two
  commits behind it;
- the candidate is 390 commits ahead of `main`;
- no release tag or remote publication exists; and
- the candidate worktree is clean.

The request and eventual verdict live on a separate review branch so they do
not mutate the candidate object.

## Prior Wave 2 review

Trial 2 independently accepted technical candidate
`d23c78bebf93dc2b510c9462f3320422a690d461`. The current Wave 2 parent
`9f075e1` is 17 commits later. The reviewer must therefore inspect the complete
current candidate and may not transfer Trial 2's verdict to this newer object.

The prior request and verdict remain immutable:

- `FUNCTIONAL_WAVE_2-2_to_review.md`;
- `FUNCTIONAL_WAVE_2-2_review.md`.

## Exact host gate

The full repository gate ran on candidate `cc9c975`:

```text
command:
  env PATH=/home/carase/git/personal/agents-orchestrator/.venv/bin:$PATH \
    bash scripts/ci.sh

aggregate status: infrastructure_unavailable
tests:             2294
passed:            2282
failed:            0
skipped:           12
```

Passed required lanes:

- Python lock and release-candidate validation;
- Python and Gateway lint;
- structure: 410/410;
- Gateway: 1418/1427, with nine unavailable PostgreSQL cases;
- E2E: 25/25;
- MCP smoke and policy registry;
- CLI: 342/342;
- LangGraph: 81/84, with Gateway-integration and Temporal unavailable.

Unavailable service lanes:

- required Redis live;
- nine PostgreSQL tests;
- two Gateway-integration tests;
- one Temporal recovery test; and
- optional real-agent providers.

The process returned exit 1 because infrastructure was unavailable. This
request does not relabel that result as passed. `git diff --check` passed for
the committed merge and the worktree.

Gateway artifact:
`art-2ba860f3-716b-433b-8cb4-e5de6ef53980` under trace
`tr-wave2-main-candidate-ec89e7e0-6d0f-49c3-9117-7b8977d8cec1`.

## Required independent review

Review the complete candidate and return explicit `reviewed_OK` or
`reviewed_KO` in `FUNCTIONAL_WAVE_2-3_review.md`.

At minimum, verify:

1. candidate commit, tree, parent order, worktree cleanliness, ancestry, and
   ordinary non-force reachability from both `main` and `develop`;
2. every change after Trial 2, including the current Wave 2 parent and the
   three `main`-only commits;
3. the full gate result and whether its exact skip/infrastructure budget is
   sufficient for promotion without claiming unavailable lanes as passes;
4. every canonical-status distinction: implemented, reviewed, integrated,
   promoted, and released;
5. plan and review registries against per-sheet status and immutable ancestry;
6. D/0/07 and H/0/01 status after the later sub-sheet and DOCTOR review trails;
7. no secret, policy mutation, shared-service mutation, or unsupported
   release/publication claim; and
8. whether promoting the exact candidate object, without adding review bytes
   to it, preserves the required evidence and identity chain.

## Known reconciliation question

The candidate's top-level plan registries declare 82 sheets as:

```text
36 complete / 4 in progress / 42 planned
```

A read-only preflight derived from per-sheet status, reviewed commit ancestry,
and the D/0/07a-d split instead yielded:

```text
38 complete / 5 in progress / 39 planned
```

The delta concerns reviewed/integrated D/0/07a and D/0/07b, in-progress
D/0/07c, and replacement of the former D/0/07 index leaf by four executable
sub-sheets. D and H stage summaries also retain older descriptions of D/0/07c
ratification and H/0/01 DOCTOR Trial 11 despite later evidence.

The reviewer must adjudicate this conflict rather than average the two
accounts. If it is blocking, return KO with the exact authoritative sources
and the minimum bounded reconciliation required before another candidate.

## Review boundary

The reviewer may run safe, offline, candidate-bound checks and disposable
probes. It must not edit product code, tests, plan sheets, prior evidence,
policies, branches, tags, or the exact candidate. Only the append-only verdict
and its review-index link may be committed on the review branch.

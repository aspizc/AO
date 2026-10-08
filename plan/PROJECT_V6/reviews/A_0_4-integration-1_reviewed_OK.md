# Review A_0_4-integration-1 — OK

Date: 2026-10-08.
Reviewer: independent Claude Opus 5.5 session. I did not author the feature
or the merge resolution.
Scope: merge-candidate review only. This is not a full gate, an integration
commit, promotion, or release. The full gate on the merged commit remains
root-owned.
Request: [A_0_4-integration-1_to_review.md](A_0_4-integration-1_to_review.md).

## Candidate identity

- `HEAD` = `c4bc008b1acf06b7f9a6f9e0d0d6af6bcd5ea7e8` (`release/1.1.0`, V7 side).
- `MERGE_HEAD` = `7195cf1af5d71d850e06b913dd7f85bb529b25f2` =
  `feat/V6-A-0-04-safe-submit` tip.
- Merge base: `327043a50316f3918b06fe30e019ecdc5799b4d3`. The V7 side has
  15 commits and the A04 side has 34.
- When I started, `git write-tree` returned `5862e22e04ffa63e4b6607c1989fd1958148b3a0`. The request
  declares `ba589f76a1c4ffb327cd1c225b1819ea630cbeb3`. `git diff --stat`
  between the two trees shows one difference: the staged
  `A_0_4-integration-1_to_review.md` (+14 lines). So the declared tree is the
  candidate without its own review request. This verdict file and its index
  row will change the tree again. Root's commit should therefore equal
  `ba589f7` plus review-trail files under `plan/PROJECT_V6/reviews/` only.
- No unstaged changes or untracked files. No conflicted paths remain in the
  index. There are 367 staged paths, and none is under `policies/`.

## Merge fidelity

- I ran an independent `git merge-tree --write-tree HEAD MERGE_HEAD`. It gave
  tree `97daf4a…` and reported exactly two conflicts: `ci/suites.json` and
  `plan/PROJECT_V6/reviews/README.md`. Git auto-merged `README.md`,
  `gateway/src/config.js` and the reviews index.
- `git diff 97daf4a ba589f7` touches only those two conflict files. Every
  auto-merged path in the candidate is therefore byte-identical to git's own
  merge.
- I checked every path per side with `--no-renames`. All 174 V7-only paths
  match the `HEAD` blob. All 363 A04-only paths match the `MERGE_HEAD` blob.
  0 mismatches. These paths include all A04 adapters, `tmux_client.js`,
  `process_supervisor_helper.py`, `catalog.js`, `tool_errors.js`,
  `mcp-tools-v1.json`, `.github/workflows/ci.yml`, the vendor tmux manifest
  and patch, and all `tests/gateway` A04 tests and fixtures. They also include
  all V7 `cli/`, `gateway/src/core/registry.js`, `request_context.js`,
  `mcp_server.js`, `scripts/` and tests.
- Six paths changed on both sides:
  - `gateway/src/config.js` keeps the V7 `AGENTS_REPOSITORIES_OVERLAY`
    validation and the `repositoriesOverlay` export, at staged lines 112–139.
    It also keeps the A04 `tmuxSubmitDelayMs` with
    `parseBoundedPositiveInteger`, at lines 40 and 207. The hunks do not
    overlap and do not interact.
  - `README.md` keeps the V7 status prose and the
    `AGENTS_REPOSITORIES_OVERLAY` row (line 526). It also keeps the A04
    `AGENTS_TMUX_SUBMIT_DELAY_MS` row (line 524).
  - `A_0_4-build-1_checkpoint.md` and `A_0_4-build-2_checkpoint.md`: both
    sides added the same blob (`625e273…`, `4dfeddd…`), and the index holds
    that blob. No immutable evidence was rewritten.
  - The two conflict files are covered below.
- I found no semantic cross-coupling. V7 changes registry loading and
  `mcp_server.js` passes the overlay. A04 adds catalog/error/contract entries
  and adapter submission. Neither side edits the other's surfaces.

## Conflict resolutions

1. **`ci/suites.json`.** The only change from `HEAD` is the `test.gateway`
   `inventorySha256`, which becomes
   `sha256:dd421db7…19ea1`. The A04 side's only suites change was the same
   field, so neither parent's digest could be right for the union file set.
   All other V7 suite entries, including `test.redis-live`, are kept
   verbatim. I ran `python3 -I scripts/ci_gate.py --validate-only`, which is
   read-only (it writes only with `--refresh-inventory`). It returned
   `status: passed` with no errors in two places: against a `git archive` of
   tree `5862e22` and against the live tree.
2. **`plan/PROJECT_V6/reviews/README.md`.** The resolution keeps the union of
   rows from both sides. The V7/A02/A05 rows come first, then all A04 rows
   from trials 1–17 and the plan trials. Both checkpoint sections are kept:
   `## Implementation checkpoints` (HEAD) and `## Current build checkpoint`
   (feature). The only edit beyond the union is the trial-18 checkpoint
   sentence. It replaces "Full gate not run" with a link to the root gate:
   exit 0, 2,822 passed, 12 allowed skips. It also says integration review
   remains open. The gate file is bound to `eeba514`, and
   `git diff eeba514 7195cf1` adds only that gate record, so the claim is
   accurate for the feature tip. It does not cover the merged candidate, and
   the request says so.

## Focused verification on the candidate

None of this is a full gate.

- `scripts/check_public_hygiene.py`: 0 findings. This V7 checker scans the
  A04-added files outside `plan/`.
- `.venv/bin/python -m pytest -q -p no:cacheprovider tests/structure`, run in
  the live tree (equal to the index): **456 passed**. This includes V7's
  `test_ci_suite_manifest.py`, run against the merged manifest. The tree was
  unchanged afterwards.
- `node --test` on `tool_catalog`, `tool_error_serialization`,
  `registry_overlay`, `policy_classification`, `codex_enable_profile`,
  `prompt_submission` and `tmux_client`, in an exported candidate tree with
  the session's inherited `AGENTS_*` variables unset: all pass.
- **Environmental failures, not merge regressions:**
  - `registry_overlay` "overlay-only repository" fails when this reviewer
    session's own `AGENTS_*` environment leaks into the test. It passes with
    those variables unset. With them set, it fails the same way on the pure
    `HEAD` tree.
  - `guarded_submit.test.js` fails 10/14 locally with
    `unknown command: agents-submit-v1`. The host `tmux` is stock 3.6, not
    the pinned `3.6a-agents.3`. The feature tree alone fails the same way.
    The trial-18 root gate ran with the pinned runtime. The merged-commit
    gate must do the same.
- A search of the index outside `plan/` and `audit/` finds no remaining
  reference to the renamed `tmux-3.6a-agents.1` artefact.

## Whitespace classification

`git diff --cached --check HEAD` over the whole tree is **not clean**. All
offending lines are in 16 immutable A04 evidence files: the trial-17
operator-live pane capture, and the `evidence/A_0_4-live-profile-*` RED
captures and delta patches. Every one is byte-identical to its `MERGE_HEAD`
blob. They are historical captures and must not be rewritten. The restricted
check over `ci/suites.json`, the reviews index, `gateway/src`,
`tests/gateway`, `README.md`, `gateway/README.md`, `docs/` and `.github/`
exits 0. The unrestricted check is reported as failing and is not counted as
passed.

## Findings

None blocking.

1. Non-blocking, a pre-existing index gap. Neither parent's review table has
   a row for trial 18 (`A_0_4-live-profile-18_to_review.md` /
   `_reviewed_OK.md`). The verdict is linked only from the checkpoint
   prose. Rule 13 asks for every verdict to be indexed. Root should add the
   row in the next status commit. I did not add it, because my write scope
   is this verdict and its own index row.
2. Status docs are not changed by the merge, which is correct for a
   pre-commit candidate. `plan/PROJECT_V6/A/README.md` still lists A/0/04
   as `planned`, and `README.md` says "the other six V6 sheets remain
   unfinished". Once the merge commit exists and its gate passes, root owns
   updating these to `integrated` and nothing beyond that.

## Verdict

**OK as a merge candidate.** Both parents are exact. Both conflict
resolutions are correct. All V7 generic-profile and A04 production, test,
CI and vendor changes survive. The CI inventory validates. No `policies/`
edits. Immutable evidence is intact.

Not established by this verdict:
- a full gate on the merged commit (root-owned, with pinned tmux
  `3.6a-agents.3` and Redis)
- integration, promotion, or release of A/0/04 or `1.1.0`

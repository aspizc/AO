# Main documentation publication — independent review request, trial 1

## Candidate and scope

- Base: `b3aed7c9365e54587dc4f847f82edff272955bfb`.
- Frozen documentation candidate tree: `8c056925d927fce336e22f1c8989b62d90b0c9f6`.
- Branch: `docs/main-workflows-2026-10-07`.
- Worktree: `workspace/clones/wt-main-workflows`.
- Author: Codex `/root/prepare_main_documentation`.
- Independent review remains pending in a separately assigned Codex session.
  No Claude execution, cross-vendor or Gateway-spawned review is claimed.

The operator approved publishing the reviewed workflow README on `main`
while keeping planned functions explicitly planned. This candidate makes
the current status entrypoints accurate when `main` advances with reviewed
documentation. It preserves the reviewed lifecycle and parallel-operation
guidance already present in the base.

Only these three documentation files differ from the base in the frozen tree:

| File | Candidate blob |
|---|---|
| [README.md](../../../README.md) | `807ff60d415455d69cbb2a0b8a5aee00c6283cbc` |
| [docs/project-status.md](../../../docs/project-status.md) | `ff05b7a2f3e132bde02ab618edf19a553e64949e` |
| [plan/README.md](../../README.md) | `54f7c8236eea563c40a8078beb1cb49caada2c85` |

This request is evidence added after freezing the three-file candidate. The
integrator owns the review index, commit, integration and publication. The
author created no commit, tag or ref and performed no push.

## Acceptance and boundaries

- The annotated `1.0.0` tag stays at historical release commit
  `41f9ce28aa59673283a7c5494200e0ec7b56e2f6`; current entrypoints no longer
  imply that an advancing `main` must still equal that release tag.
- The development tag `1.1.0-dev.1` identifies the reviewed planning and
  documentation checkpoint `b3aed7c9365e54587dc4f847f82edff272955bfb`.
- All seven V6 implementation sheets remain **planned**. Automatic wave
  launching remains planned; documentation publication establishes no new
  runtime verification or `1.1.0` runtime release.
- The historical full-gate section is byte-identical to the base. Its exact
  tested implementation/checkpoint tree remains
  `d3548ed7d6900dc5fc97a284576e624ab6a9c1b9`.
- No runtime, test, policy, skill, implementation-sheet or historical review
  files were changed. The inherited `1.0.0`-to-base diff contains 32 Markdown
  files only. No history or tag annotation was rewritten.

## Documentation RED and GREEN

Three transient assertions failed before editing, exit 1: the status page
still asserted current `main`/`1.0.0` equality, and the README and status page
did not identify `1.1.0-dev.1`. The same three assertions passed after editing,
exit 0. These checks inspected the actual documentation output.

## Verification

- `node --test tests/gateway/tool_projection_contract.test.js`:
  **10 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo**, exit 0.
  It validates canonical tool references and examples in the public docs.
  Existing dependencies were accessed through a temporary ignored
  `gateway/node_modules` symlink, removed after the check.
- Transient Markdown check of the three candidate files:
  **109 local links and 16 heading fragments resolve; 0 errors**, exit 0.
  Both same-file and cross-file heading destinations were checked.
- `git diff --check` and temporary-index `git diff --cached --check` passed.
  The real index was not modified.
- Read-only `git ls-remote origin` on 2026-10-07, before publication:
  `main` and peeled `1.0.0` resolve to
  `41f9ce28aa59673283a7c5494200e0ec7b56e2f6`; `release/1.1.0` and peeled
  `1.1.0-dev.1` resolve to `b3aed7c9365e54587dc4f847f82edff272955bfb`.
  The annotated tag objects are respectively
  `0d43cf7bf13acc9b28a5d4e9fcb14cc83ea5b5ac` and
  `59be52c893ca36c8d37e519c5b1a009856f78882`.

The [historical gate report](../../PROJECT_V5/reviews/MODEL_DEFAULTS_2026_10_06-1_gate.json)
and [handoff](../../PROJECT_V5/reviews/MODEL_DEFAULTS_2026_10_06-1_to_review.md)
retain **2,626 passed, 0 failed, 12 skipped; 2,638 total**, exit 0 and
aggregate `infrastructure_unavailable`. Nine PostgreSQL and three
Gateway/Temporal tests were skipped; optional live providers were not run.
Those are historical runtime results, not checks of this documentation tree.
No full runtime gate, live provider or infrastructure exercise was performed
for this documentation-only candidate.

## Requested review

Inspect the frozen tree and three-file delta against the base. Verify the
release/development/planned boundaries and preserved historical gate, then
write an immutable independent OK or KO verdict for this trial. Review
acceptance does not establish integration, publication or a new runtime
release. The integrator will index the verdict and handle authorized
publication after acceptance.

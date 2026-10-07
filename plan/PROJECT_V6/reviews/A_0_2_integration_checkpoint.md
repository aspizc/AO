# A/0/02 integration checkpoint — 2026-10-07

- Operator-authorized registry commit: `3f7d78a461c09582038fa3611d445966b192aeac`.
- Independently reviewed candidate tree: `a8671d91db77d77237623c0b91fda90f270a69e2`.
- Implementation/evidence commit: `1f1431a`.
- Serial no-ff integration on release/1.1.0: `7df29bda06aa3a139903dbb0cfc61860029f8159`.
- Main and tag 1.0.0 are unchanged; no final 1.1.0 tag exists from this work.

The [trial 2 verdict](A_0_2-2_reviewed_OK.md) records 79 independently rerun
Node tests and 110 Python tests, plus inspection of the parent full gate:
2651 passed, 0 failed, 12 skipped, 2663 total, exit 0. Seven command lanes
passed; the immutable request's count of six was corrected in that verdict.
Aggregate infrastructure_unavailable represents nine PostgreSQL and three
Gateway/Temporal skips. Optional providers, Darwin and other Node versions
were not run. Synthetic/example success is not live provider acceptance.

The implementation was merged after the exact candidate bytes were rechecked.
Comparing the implementation commit with the integration commit adds only
plan/review Markdown; production, tests, manifests and example bytes are
unchanged. Post-merge manifest validation, public hygiene and whitespace
checks passed. The integration does not supply a new full-gate execution;
it preserves the named reviewed code and its gate evidence.

Operator-local entries remain outside Git at mode0600. The current launcher
uses the sibling checkout, so it was not repointed; the saved AO environment
and fresh isolated candidate startup were independently verified. Historical
I4 documents and exact I3 fixtures remain intact. No role/model/permission
registry was changed by the minimal authorized repository migration.

A/0/04's separately retained build checkpoints are unfinished worktree
candidates, not independent OK or integration evidence. A/0/05 requires plan
refinement before implementation. The six remaining V6 sheets and final
release conditions remain open. V7's plan OK does not establish runtime work.

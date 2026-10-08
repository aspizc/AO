# A/0/05 committed-tree gate before live acceptance

Date: 2026-10-08. Merge commit
`b4506d26950ce7b9a6af92fc63c8c56db4daea09` on `release/1.1.0` has
parents `3e97d7043b07fa74cbdaa7a5e129fdc1544f3ecb` and
`28fd256ee348492d8568f2a2a7be4b7cea18e94b`. The reviewed source
reconciliation and this release-branch merge have independent OK verdicts in
`A_0_5-integration-1_reviewed_OK.md` and
`A_0_5-root-merge-1_reviewed_OK.md`.

`bash scripts/ci.sh` exited 0 on the committed tree: **3,230 passed,
0 failed, 12 skipped, 3,242 total**. Required disposable Redis passed 22/22;
public hygiene found zero issues. The 12 skips are the declared unavailable
infrastructure budget: nine live PostgreSQL tests, two Gateway integration
tests and one Temporal integration test. Optional real-provider CI ran zero
tests. The aggregate status is `infrastructure_unavailable` because of the
declared skips. The run used pinned tmux `3.6a-agents.3`, SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`,
a private `TMUX_TMPDIR`, and an owned disposable `redis:7.2-alpine` container.
The private tmux server and Redis container were stopped afterward.

The full output is preserved as `evidence/A_0_5-pre-live-gate.txt.gz`,
SHA-256 `135b1bdf30881ee6f0860fdc7aa149a6f8f1bebb9a68759795213e0b7cfa40c4`.
The decompressed bytes have SHA-256
`44df6309f6c9ede8087ccf0c51a932a207f0a6be9cb828f3642d8551a539e857`.

The integrated live acceptance **has not passed**. Four operator-controlled
attempts used a private, ignored local harness and real Codex 0.160.1 with
`gpt-6.1-sol` at medium effort. The first three returned
`AGENT_PROMPT_NOT_SUBMITTED` / `unknown_state` before a challenge Enter; the
fourth was deliberately stopped after a UI-clearing experiment. The harness
was corrected from an unsupported 80×24 viewport to A/0/04's measured 120×40
profile and from a wrapped 168-character challenge to an 84-character one.
The remaining captured draft had a static update notice above the 0.160.1
header and a warnings-only footer; the A/0/04 classifier rejected it. Each
attempt reported `EXACT_OWNED_IDENTITIES_ABSENT` cleanup and `UNCHANGED`
protected repository inventory. The raw local transcripts remain ignored and
are not part of the public snapshot.

This gate proves the committed tree's automated suites. It does not close the
A/0/05 live criterion or claim promotion/release. A narrow A/0/04 profile
correction is in progress and requires its own TDD, independent review, merged
gate and repeat live acceptance before status changes.

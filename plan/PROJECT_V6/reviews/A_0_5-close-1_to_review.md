# A/0/05 feature closure evidence — review request 1

Date: 2026-10-08. Candidate remains the uncommitted A/0/05 trial-4 tree
on `6317df1`, independently reviewed for source/process cleanup in
`A_0_5-4_reviewed_OK.md` and bound by `v6-a05-cp27-manifest.json`.
This review is for the subsequent root gate and operator-run live evidence;
it does not replace trial 4 or approve an integration merge.

Read `A_0_5-trial4-wrong-pin-gate.md` and preserve its RED result. The first
full gate used release tmux `.3` on this pre-A/0/04 branch, causing 11
Gateway fixture failures and a process-tree-leak gate result. The corrected
feature gate, `A_0_5-trial4-feature-gate.md`, used the branch's required
`.1` binary and exited 0: 2,813 passed, 0 failed, 12 declared infrastructure
skips, Redis 22/22, public hygiene 0. Verify its archived raw log hashes.

Read `A_0_5-trial4-live-acceptance.md` and the private ignored run directory
it binds. The first harness run failed before a prompt on a case-sensitive
banner check and cleaned exact resources. The second run exited 0:
`LIVE_SEQUENCE_OBSERVED_OPERATOR_ACCEPTED`,
`EXACT_OWNED_IDENTITIES_ABSENT`, protected before/after inventories identical.
Verify the actual `orchestration.reattach` result returned the original task
and session with no skips, protected calls denied before reattach, two
nonce-reversal responses appeared via `agent.view` and the same pane, original
Codex identity survived the exact Gateway restart, and the private evidence
hashes match. Read the two intervention records: the operator sent one
inspected Enter per prompt because this feature branch lacks A/0/04; do not
interpret the run as automatic prompt-submit acceptance.

Current `python3 scripts/ci_gate.py --validate-only`, public hygiene and
non-evidence `git diff --check` exit 0. No `policies/` edit. Review whether
these results meet the A/0/05 feature-sheet acceptance and name any residual
limits. Write immutable `A_0_5-close-1_reviewed_OK.md` or `_KO.md` and index
it. Do not commit, push, tag, merge, or claim 1.1.0 release. Integration
with A/0/04 and an integrated-tree `.3` gate/live run remain root-owned.

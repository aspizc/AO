# A/0/04 implementation trial 3 — independent review handoff

Status: **uncommitted candidate corrections; independent review pending**.
Task: `ts-1cacc78d-bc9b-498d-961b-61537d2b6e6a`.
HEAD: `7bbe6e479194b31b326fefa75d04535d2ad98fe5`.

Read the committed [trial-2 KO](A_0_4-2_reviewed_KO.md),
[approved CP3 contract](../A/0/04-transport.md),
[trial-6 plan OK](A_0_4-final-submit-plan-6_reviewed_OK.md), and
[trial-3 correction checkpoint](A_0_4-trial3_correction_checkpoint.md).
This handoff addresses F1–F3 and manifest F5 only. Gemini is unchanged:
root reports Gateway refusal test 2/2; no new Gemini/provider invocation or
acceptance inference was performed. No policy edit, commit, staging, push,
self-review or verdict was performed. Root owns a fresh reviewer session,
review indexing/commit, inventory and full gates.

Fresh [candidate path/hash manifest](evidence/A_0_4-trial3-candidate-files.json)
SHA-256: `c21de3c5499bdf1dc7f24936c29715558d602465491c27edb05b5e2afc7dec4e`.
It binds 60 paths, including explicit JSON `null` for deletion of
`gateway/vendor/tmux-agents/tmux-3.6a-agents.1.patch`. Verify every hash and
absence before review. The manifest and this handoff are excluded from the
path map to avoid cyclic binding; this handoff binds the manifest hash.
The checkpoint and trial-3 evidence are included. Other dirty candidate
files were inherited and remain subject to review.

F1 records successful CR delivery and converts later operation/cleanup
failures to `acceptance_uncertain`, preserving pre-CR mappings and the CP3
positive two-observation `not_submitted` outcome. Six new stub regressions
cover capture, malformed metadata and invalid UTF-8 both immediately after
CR and at the retry guard, asserting exactly one CR and no further submit.
The cleanup regression also requires uncertainty. Behavioral RED:
**0 passed / 7 failed**, then scoped GREEN below.

F2 isolates framing with fresh settled grid/cursor/size evidence after mode
off; respawn isolates old PID against fresh settled evidence. Both first and
retry variants have current-state controls delivering exactly one CR.
Removing only the PID or framing predicate from isolated mutant runtimes
makes both first/retry tests fail with an extra `0x0d`: **0 passed / 2 failed
per mutant**, using final test bytes. Source replacements and binary hashes
are in [mutation proof](evidence/A_0_4-trial3-mutation-proof.json).
Mode file updates are published by rename after a concurrent read race was
exposed; the failed 76/77 run and initial lint errors remain in evidence.

F3 now describes candidate `agents-submit-v1`, pending source review and
the provider-internal residual, without claiming acceptance.

Final scoped host GREEN: **77 passed, 0 failed/cancelled/skipped/todo**.
Scoped lint and `git diff --check` pass. Exact commands, immutable gzip logs,
runtime hash, earlier failures and verification limits are in the checkpoint.
No full gate, native Darwin or live provider acceptance/version/timing was
run in this correction task. Pending-output, stalled-control and unparsed
input cases remain NOT EXECUTED here. Root-owned inventory/full gate,
positive Antigravity profile and sheet closure remain unverified here.

A fresh independent reviewer must cover the trial-2 "Not examined" list as
well as these corrections. This handoff is coder evidence, not a verdict,
integration, promotion, release or full sheet acceptance. Stop here.

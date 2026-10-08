# A/0/04 root full gate on the corrected candidate

Candidate commit: `8d771fbb14a0a4e5d3de98b840870bfeee75f18d`.
Candidate tree: `43d11c36ea68d13261e5af91e7ed97ea0f809d36`.
The worktree was clean when the gate started and finished.

Command: `bash workspace/root-v6-a04-gate-redis7.sh`, which runs
`bash scripts/ci.sh` with a disposable Redis `7.2-alpine` container, private
tmux server and isolated `tmux 3.6a-agents.3` executable. That executable's
SHA-256 is `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`.
The script removed its owned container and tmux server on exit.

Exit code: **0**. Official aggregate: **2,766 passed, 0 failed, 12 skipped,
2,778 total**. Required Redis lane: **22/22 passed**. Nine Gateway tests and
three LangGraph tests carry the declared unavailable infrastructure skips;
the optional real-provider lane was not run. The official aggregate status is
`infrastructure_unavailable` because of those skips. It is not a claim that
optional live-provider, native Darwin or Claude acceptance checks passed.

Full log: [compressed output](A_0_4-root-final-gate-redis7.txt.gz).
Raw log SHA-256: `e6c7143936d3fd25c94ff974f19bbe2bcad7a905c90a1354d6493c5e99e77aa9`.
Compressed file SHA-256:
`86e1fde3661f5778e6fa1000b4cd6985e5899a27feab010bf03238abbd601427`.
The log was scanned for Signicat references; none were found.

This verifies the stated candidate and skip budget. It does not integrate or
close A/0/04. Claude Code 2.1.293 still returns `acceptance_uncertain` on a
completed fast turn, pending the operator's security decision recorded in the
live-profile 9 evidence request.

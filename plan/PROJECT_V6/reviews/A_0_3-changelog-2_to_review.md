# A/0/03 changelog candidate: trial 2 review request

Review the committed diff `b4b60e7^..b4b60e7` on `release/1.1.0` (`CHANGELOG.md` only). It updates the
`1.1.0` A/0/06 entry and adds a tmux-runtime entry, because A/0/06 changed after
[`A_0_3-changelog-1_reviewed_OK.md`](A_0_3-changelog-1_reviewed_OK.md):

- the operator-response path (`A_0_6-operator-2_reviewed_OK.md`, decision
  `A_0_6_operator_response_decision.md`);
- the live-fix with the pinned `3.6a-agents.4` runtime (`A_0_6-livefix-2_reviewed_OK.md`), its hygiene
  fix (`A_0_6-hygiene-1_reviewed_OK.md`) and the operator decisions `A_0_6_pending_wrap_decision.md` and
  `A_0_6_pending_wrap_cutover_decision.md`;
- the passing real-provider acceptance (`A_0_6-operator-live-3.md`) and green merged gate
  (`A_0_6-livefix-merged-gate-2.md`).

Verify every claim against the integrated code and that evidence; check that nothing is overstated (same-account
authority, Codex 0.162.0 only, linux/amd64 only, manual cutover), English, no other file changed, and
`git diff --check`. Write `A_0_3-changelog-2_reviewed_OK.md` or `_reviewed_KO.md` with concrete corrections.

# A/0/05 — checkpoint 11: interrupted creation-output RED tests

Date: 2026-10-08. Status: **partial, unreviewed**. This checkpoint records the
Codex `gpt-6.1-sol` medium session after a provider usage-limit notice. It is
not a trial handoff or an implementation-complete claim.

The operator resolved checkpoint 10's narrow scope conflict: the A/0/05 owned
detached creation path may add a fixed `-P -F` output template, while ordinary
tmux commands retain their arguments and public return shape. Identity-bound
cleanup remains required; name-only cleanup and global process scans are not
authorized. No production change implementing that decision has been made.

The coder began two tests and then stopped after a weekly usage-limit notice.
They are untracked in this worktree and remain part of the preserved dirty
candidate:

| File | SHA-256 at checkpoint |
|---|---|
| `tests/gateway/request_context_reattach.test.js` | `c419fa3581d9d71687aa37c68809120d0df43e6ca31e3d04f7c732d4e8eb8a0e` |
| `tests/gateway/request_launch_observation.test.js` | `f4fae7e538914fac90037ed36f078ed6771faf3259491b4823dabb2141edd0c2` |

The new tests have **not run**. There is no RED or GREEN verdict for them, no
new production implementation, no independent review and no full gate. Earlier
checkpoint 9 focused results remain historical evidence for their exact
candidate only. The Gateway coder session and trace are recorded in the
orchestrator's task record; the coder did not switch models or claim completion.

Next: resume a verified `gpt-6.1-sol` medium coder, compare the two hashes,
run the new focused RED tests, implement only the creation-bound receipt with
the strict output and Linux identity checks in checkpoint 10, and obtain
independent review. The remaining timeout, descendant, ambiguity, resistant
child, multi-pane and provider cases in checkpoint 9 remain open.

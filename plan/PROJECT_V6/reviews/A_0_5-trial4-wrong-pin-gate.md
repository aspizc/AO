# A/0/05 trial-4 full-gate attempt with the wrong runtime pin

Date: 2026-10-08. Candidate: the uncommitted, independently reviewed
trial-4 tree on `6317df1`. This root-run gate exited 1 and remains failed
evidence. It is not a passing A/0/05 gate.

The command used pinned tmux `3.6a-agents.3` (SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`),
private `TMUX_TMPDIR`, and an owned disposable Redis 7.2 container. The
feature branch forks before the A/0/04 runtime integration: its actual
session-port fixture requires `3.6a-agents.1`, whereas the release branch
requires `.3`. This mismatch accounts for at least ten visible fixture
errors. The Gateway lane also reported `process_tree_leak`; the wrong runtime
pin alone does not prove that residue's cause. The raw TAP shows 11 failed
Gateway assertions, nine declared PostgreSQL skips, and the gate's final
aggregate error `test.gateway: command left processes in its owned process
group`. The aggregate records 1 failed lane, 1,019 passed and three
Gateway/Temporal skips. Public hygiene found zero issues and required Redis
passed 22/22.

Full raw output is preserved as `v6-a05-trial4-wrong-pin-gate.txt.gz`,
SHA-256 `a9ecc3b9e6b3e35ce77fcb4a9c301b42442c6142a0782badab04c103cd4da2ce`;
decompressed SHA-256
`7b05f1b2a0a847ef8df0aeee404ee6adb02e566aa7a5c6c236c7ca15750f3cae`.

Next: run a new gate on the exact feature candidate with its `.1` binary,
then reconcile against A/0/04 on the release branch and require the
integrated tree to pass with `.3`. Neither a corrected feature run nor a
future merge retroactively changes this failed attempt.

# A/0/05 trial 3 root full-gate failure

Date: 2026-10-08. Candidate was the dirty trial-3 tree bound by
`v6-a05-trial3-manifest.json` (SHA-256
`57a53728c3a85eec15337f43e411706ff1d72fdc19ff921cf97d28244ed530c2`),
with root-only `ci/suites.json` inventory hashes refreshed before the run.

Command: `bash scripts/ci.sh` with pinned tmux 3.6a-agents.1, isolated tmux
socket and disposable Redis 7.2 service. Exit: **1**. Full local log SHA-256:
`b816770d560ca5262de4a6f14d2a597e0f3f499a5caaef93704b07f8c35499c6`
(`/tmp/a05-trial3-full-gate.log`).

`test.gateway` was **failed**. Its TAP reported `not ok 1316`:
`spawn adapter-failure-before-response settles only its observed child after
durable publication` in `tests/gateway/request_context_reattach.test.js:1192`.
The test expected the untracked child to be absent or have a different Linux
start token; it observed the same token `18054836`. The CI supervisor also
reported `test.gateway: command left processes in its owned process group`.
This is a containment failure, not a passing skip or an assumed flaky test.
The aggregate counted 1 failed, 1,019 passed and 3 skipped because the
Gateway suite was invalidated by the process residue. Other lanes continued
and passed, including 456 structure tests, 25 E2E, 428 CLI, 81 LangGraph
passes and 22 live Redis tests; public hygiene found 0 issues.

The trial-3 independent OK remains scoped to its exact source and focused
verification. Full-sheet acceptance, live Codex restart acceptance and
integration are open. Trial 4 owns a deterministic RED and a narrow fix for
the failure above; only a new independent verdict and full gate can close it.

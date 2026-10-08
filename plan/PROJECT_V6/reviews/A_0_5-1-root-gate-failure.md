# A/0/05 trial 1 root full gate — failed

The exact source candidate bound by `v6-a05-medium-handoff-manifest.json`
was run with `bash scripts/ci.sh`, pinned tmux `3.6a-agents.1` and a disposable
Redis 7.2 container. The command exited **1**. Full raw log:
[A_0_5-1-root-full-gate-failed.txt.gz](A_0_5-1-root-full-gate-failed.txt.gz); uncompressed SHA-256
`0adea825ef99d491d195862d1d07af32c91e52b78d8178eb286dd7a59825f92b`. The root-owned `ci/suites.json` change before
the run refreshed only the release and Gateway test inventory hashes; it did
not change suite commands, thresholds, skips or classification.

Official aggregate: **1,019 passed, 1 failed, 3 skipped, 1,023 total**,
status `failed`. The Gateway lane was invalidated by
`command left processes in its owned process group`. Its raw TAP listed
**1,744 passed, 5 failed, 9 skipped**, but those passes are not credited in
the official aggregate. The five concrete failures are stale 33-tool
assumptions in `gateway/tests/scaffold.test.js`,
`tests/gateway/tool_coordination_registry.test.js` (two cases), and
`tests/gateway/tool_orchestration_task.test.js`, plus missing
`orchestration.reattach` in canonical orchestrator profile capabilities in
`tests/gateway/orchestrator_profile_contract.test.js`. The process leak
remains unattributed and requires a scoped owned-process probe.

The required Redis lane passed 22/22 with no skips. The three LangGraph
Gateway/Temporal integration skips remain declared; optional real providers
were not run. This gate is a failed trial-1 result and does not close A/0/05.
The independent source/focused verdict remains historical but cannot serve
as the complete sheet verdict. Corrections require a new candidate and trial 2.

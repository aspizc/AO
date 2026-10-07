# A/0/00 root gate with disposable Redis 7

Candidate commit `0fc59cf35fedee7f89044cc0e425dea0e608982a`, tree `d93f6460d00a5f6da1aff0d4746854ea96d5962f`. Ran `bash scripts/ci.sh` on the
unchanged reviewed source, with pinned tmux `3.6a-agents.1` and a disposable
`redis:7.2-alpine` container bound to a temporary localhost port. The root
command exited 0 and cleaned up its own container and tmux server. The
archived raw log is [here](A_0_0-1-root-full-gate-redis7.txt.gz), SHA-256
`44cf463275fc5eb3834428b5ab4ec3a927b07959ad4a50a2523bb14132da7040`.

Official report: **2,753 passed, 0 failed, 12 skipped, 2,765 total**.
The required Redis lane ran **22 passed, 0 failed, 0 skipped**. Nine Gateway
Postgres cases and three LangGraph Gateway/Temporal cases remain declared
infrastructure skips; the aggregate report status is
`infrastructure_unavailable`. Optional real agents were not run. No skipped
lane is reported as executed or green. This gate seals the reviewed
implementation within its declared local skip budget; it does not establish
full live provider acceptance or a `1.1.0` release.

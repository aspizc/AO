# Review Submission - Task C/0/3 (Trial 1)

## What was done
- Added `orchestrator_langgraph.consumers.metrics`.
- Added config loading from `AGENTS_REDIS_URL` and `AGENTS_REDIS_STREAM`, defaulting to `agents:events`.
- Added a Redis Stream reader abstraction with lazy `redis` import and clear missing-dependency error.
- Added pure/testable stream entry parsing for publisher envelope fields.
- Added metrics aggregation for event counts and average timestamp-to-observed latency.
- Added stderr rendering for metrics and restricted/raw rejection errors.
- Added rejection of restricted/raw fields and values.
- Added unit tests with fake stream entries and fake Redis clients, including redis-py RESP2 list shape, RESP3 dict shape, and idle `xread -> None`.
- Updated `CHANGELOG.md`.

## Why
- PROJECT_V1 C/0/3 validates that sanitized Redis Stream events can be consumed by a non-privileged observability process without changing the MCP Gateway contract.

## Delegated Coder Runs
- Initial coder trace: `tr-b606f256-b09d-478b-ab10-7b976f1d3495`.
- Initial coder task: `ts-5485b7e6-1086-46e4-9270-2723aab9f59c`.
- Initial coder session: `ss-7066f0f5-4bac-449d-84dc-20eab2246c7b`.
- Initial coder artifact: `art-d3cf8c80-ad16-43bc-a3f4-c7d42700c448`.
- Apply retry trace: `tr-c2015439-0962-4de1-8b5b-8ef1907dc9a1`.
- Apply retry task: `ts-c4d724b8-d405-4bf2-b8a4-e0263a18ffa6`.
- Apply retry session: `ss-55caf1b1-9972-4f95-90e7-fd5703c21d89`.
- Apply retry artifact: `art-bbbc4d8a-8bd3-4784-a98b-b2d4c0a2f044`.
- KO fix trace: `tr-640a4763-e9f8-497a-91f8-3b7bedbd8bd5`.
- KO fix task: `ts-eae6f70e-7e81-457a-a487-b975aec609d5`.
- KO fix session: `ss-5a7427c3-513d-4f5c-9709-793ba1620811`.
- KO fix artifact: `art-c2435e81-673e-4051-82fc-d91921d69e32`.

## Decisions Taken
- Kept the consumer outside Gateway tools; no MCP schema or tool handler changes.
- Avoided adding a mandatory Redis Python dependency; the real path imports `redis` lazily and tests use fakes.
- Treated restricted/raw detection as fail-closed by rejecting the whole event rather than only dropping the field.
- Added support for redis-py RESP2 and RESP3 `xread` output shapes after reviewer KO.
- Treated idle `xread` returning `None` as an empty batch after reviewer follow-up.

## Verification
- `PYTHONPATH=orchestrator-langgraph/src .venv/bin/pytest orchestrator-langgraph/tests/test_metrics_consumer.py` - passed, 11 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.
- `timeout 90s env PYTHONPATH=orchestrator-langgraph/src .venv/bin/pytest orchestrator-langgraph/tests` - timed out in existing `test_hybrid_e2e_smoke.py`; this is outside C/0/3 and the official CI does not run that suite.

## Notes
- No PR draft was created because this workflow does not push branches unless explicitly requested.

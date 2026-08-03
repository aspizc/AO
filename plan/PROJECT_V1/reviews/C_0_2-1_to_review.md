# Review Submission - Task C/0/2 (Trial 1)

## What was done
- Added optional Redis Streams audit publishing behind `AGENTS_REDIS_URL`.
- Added `AGENTS_REDIS_STREAM`, defaulting to `agents:events`.
- Kept JSONL audit as the primary append path and publishes only after JSONL write.
- Added a sanitized stream envelope with `traceId`, `event_type`, `tool_name`, `actor_role`, `timestamp`, `eventId`, and sanitized `metadata`.
- Added best-effort Redis error handling that warns to stderr and does not make `append()` throw.
- Added TV-02 coverage proving restricted/raw fields and secrets under benign metadata keys are not published.
- Updated `CHANGELOG.md`.

## Why
- PROJECT_V1 C/0/2 introduces a realtime event stream without making Redis the source of truth or changing the MCP boundary.

## Delegated Coder Runs
- Gateway implementation trace: `tr-a586c062-01f9-48cf-9827-911ee1251e84`.
- Gateway task: `ts-fbc20a03-e457-472e-a4e2-c18537ca4f7e`.
- Gateway session: `ss-ea7721ba-1096-4cc5-80dc-8a5bfa7179cf`.
- Gateway notes artifact: `art-f9d39c3b-396d-4f01-bbdf-364f5cbc65d4`.
- Tests trace: `tr-65a4e664-3c6f-4a9c-bc2f-0ade7600b823`.
- Tests task: `ts-c93dc26b-8cbf-4b4c-a4a2-22c7eba433a0`.
- Tests session: `ss-38893046-ce03-458e-b8c1-0d959817836b`.
- Tests notes artifact: `art-3dabd859-fc86-4810-86ab-7db38b8fd720`.
- TV-02 fix trace: `tr-6b72bca6-e44a-44c7-a807-f94e21f388e6`.
- TV-02 fix task: `ts-c9343d2e-3403-4424-a156-f95a4977f111`.
- TV-02 fix session: `ss-3c0ac5ae-413b-4a57-8eba-413fafbc760c`.
- TV-02 fix notes artifact: `art-510c9802-19b8-44c8-8055-8feda0b8c2c0`.

## Decisions Taken
- Used an injectable publisher for tests and a default no-dependency `redis-cli XADD` publisher for runtime.
- Changed the default Redis publisher to non-blocking `spawn` after reviewer feedback, so Redis outages do not stall the Gateway event loop.
- Reused the existing sanitizer pipeline for string metadata when configured, while retaining fail-safe key/value filtering for restricted/raw fields.
- Deduplicated metadata keys that are promoted into the stream envelope.
- Left PR draft creation out because this workflow does not push branches unless explicitly requested.

## Verification
- `node --test tests/gateway/audit_writer.test.js tests/gateway/config_paths.test.js` - passed.
- `npm --prefix gateway test -- ../tests/gateway/audit_writer.test.js ../tests/gateway/config_paths.test.js` - passed; this script runs the full gateway suite.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Notes
- No MCP tool schemas, tool handlers, or tool result contracts were changed.
- Remaining production hardening is a future concern: replace per-event `redis-cli` with a persistent Redis client and avoid Redis credentials in process argv.

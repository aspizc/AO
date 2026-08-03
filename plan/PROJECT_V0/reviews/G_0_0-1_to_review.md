# G/0/0 Trial 1 - To Review

## Summary

Implemented the real MCP stdio bootstrap for the Gateway.

## What changed

- Replaced the gateway stub with an MCP `Server` using `StdioServerTransport`.
- Added `tools/list` backed by `getToolRegistry({ config, registries })`.
- Added `tools/call` dispatch for future registered tools.
- Boot now initializes:
  - runtime config
  - registries
  - state
  - audit
- Boot appends a `GATEWAY_BOOT` audit event.
- Logs remain JSON lines on stderr only.
- Added `tests/gateway/mcp_bootstrap.test.js`.
- Added a minimal `gateway/src/core/state.js` because G/0/0 requires `initState` but the local tree did not yet contain it.
- Updated `CHANGELOG.md`.

## Decisions

- The smoke test uses shell-managed stdio redirection and temp files instead of live `node:child_process` pipes. In this sandbox, live child pipes from Node exit before the server processes messages, while shell stdio redirection exercises the real JSON-RPC stdin/stdout path reliably.
- Added `process.stdin.resume()` and an `end` wait after `server.connect()` so the server stays alive for real MCP clients with open stdio.
- Implemented minimal state initialization in this task because G/0/0's bootstrap imports and calls `initState`, while F/0/1 is not present yet in the current branch order.

## Verification

- `node --test tests/gateway/mcp_bootstrap.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `b948745 feat(gateway): add MCP stdio bootstrap (G/0/0)`

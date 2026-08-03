# T/0/0 Trial 1 - To Review

## Summary

Added a generic MCP client configuration example and documentation.

## What changed

- Added `client-config/mcp.json.example`.
- Added `client-config/README.md`.
- Added `tests/structure/test_generic_mcp_config.py`.
- Documented:
  - server entry shape
  - required/recommended environment variables
  - IDE/host-specific configuration as out of scope
- Updated `CHANGELOG.md`.

## Decisions

- The example uses only generic MCP fields: `mcpServers`, `transport`, `command`, `args`, and `env`.
- The config sets `AGENTS_DRY_RUN=1` by default to keep first-run operator smoke tests non-destructive.
- The JSON file does not mention any specific IDE or host; the README explicitly marks IDE/host-specific adaptation as out of scope.

## Verification

- `PATH="$PWD/.venv/bin:$PATH" pytest tests/structure/test_generic_mcp_config.py`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `8d63ca9 docs(config): add generic MCP client example (T/0/0)`

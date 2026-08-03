# U/0/1 Trial 1 - Human Check

## Decision Needing Human Review

V4 section 30 includes this acceptance criterion:

> Existe configuracion de ejemplo para conectar Cursor (`.cursor/mcp.json`) y para Gemini CLI nativo.

The operative plan and repository conventions now say IDE-specific clients such as Cursor and Antigravity are out of scope, and the project ships a generic MCP config instead.

## Implemented Mapping

Checklist item 11 maps the criterion to:

- `client-config/mcp.json.example`
- `tests/structure/test_generic_mcp_config.py`
- `docs/operator-guide.md`, which documents specific IDE configs as out of scope

## Human Review Question

Please confirm whether the V4 acceptance criterion should be amended to "generic MCP host configuration" for MVP, or whether Cursor / Gemini-native config files must be added despite the current out-of-scope convention.

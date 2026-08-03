# Epic E3 — Direct/MCP access and audit

Exit gate: G3 — direct and MCP callers use one service/wire implementation,
disabled Redis does not affect legacy tools, and coordination audit remains
JSONL-only without changing `agents:events`.

| Sheet | Title | Status |
|---|---|---|
| [S00](S00.md) | Importable direct coordination factory | complete |
| [S01](S01.md) | Seven MCP tool schemas and handlers | complete |
| [S02](S02.md) | Registry integration and disabled degradation | complete |
| [S03](S03.md) | JSONL-only coordination and MCP-call audit | complete |
| [S04](S04.md) | MCP/direct cross-surface parity | complete |

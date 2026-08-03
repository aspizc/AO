# Epic E1 — Domain service

Exit gate: G1 — deterministic unit tests prove every public operation,
validation boundary, lease rule, replacement race, and safe error without
depending on Redis behavior.

| Sheet | Title | Status |
|---|---|---|
| [S00](S00.md) | Service foundation, validation, and safe errors | complete |
| [S01](S01.md) | Register and private lease-token storage | complete |
| [S02](S02.md) | Heartbeat and unregister fenced mutations | complete |
| [S03](S03.md) | Active, scope-bound discovery | complete |
| [S04](S04.md) | Addressed send, body safety, and idempotency | complete |
| [S05](S05.md) | Bounded receive and reclaim semantics | complete |
| [S06](S06.md) | Recipient-scoped, idempotent transport ACK | complete |

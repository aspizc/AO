# Epic E2 — Redis transport

Exit gate: G2 — Redis 7 proves pending-safe delivery, stale-incarnation fences,
sender-scoped dedupe, cursor-complete reclaim, atomic ACK, and metadata-only
events across two independent service instances.

| Sheet | Title | Status |
|---|---|---|
| [S00](S00.md) | Redis keys, codecs, client lifecycle, and groups | complete |
| [S01](S01.md) | Atomic presence lifecycle and metadata events | complete |
| [S02](S02.md) | Atomic send, dedupe, and inbox backpressure | complete |
| [S03](S03.md) | Fenced read and cursor-complete reclaim | complete |
| [S04](S04.md) | Atomic ACK, deletion, and tombstones | complete |
| [S05](S05.md) | Live Redis two-instance acceptance | complete |

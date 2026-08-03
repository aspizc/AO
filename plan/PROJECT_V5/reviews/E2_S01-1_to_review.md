# Review Submission — V5 E2/S01 (Trial 1)

## What was done

- Added atomic Redis 7 Lua for NX register, fenced heartbeat, and fenced
  unregister.
- Compared `participantId`, lease-token digest, and `scopeId` inside every
  authoritative lifecycle script.
- Maintained the global participant SET, exact `coordination-v1` inbox group,
  presence PX lease, active-inbox `PERSIST`, and orphan-inbox `PEXPIRE`.
- Derived participant lifecycle events from an explicit metadata allowlist;
  unregister identity comes from stored presence, not caller arguments.
- Added fenced discovery with bounded `SSCAN` pages, fixed 128-ID Lua batches,
  explicit KEYS, stale-member cleanup, cursor/row validation, deduplication,
  and a final fence before returning any accumulated rows.
- Rejected malformed stored JSON and foreign coordination-looking errors
  without treating corrupt data as stale or reflecting dependency details.

## TDD evidence

- RED: all 12 focused lifecycle/discovery groups initially failed because the
  queue port was absent; a later cursor test proved the need for a final
  fence after duplicate-only scan pages.
- GREEN: frozen contract, adapter foundation, and presence suites — 31 tests
  passed.
- Redis 7.2.15 isolated-container probe passed register collision, two-peer
  discovery, heartbeat, stale-fence rejection, unregister, exact group name,
  metadata leak scan, and positive orphan inbox TTL.
- The isolated container was stopped; no shared MCP or Redis process was used.
- syntax and scoped diff checks passed.

## Review request

Review only E2/S01. Inspect Lua ordering and partial-mutation risk, exact
BUSYGROUP handling, fence semantics, response mapping, presence/event secrecy,
active/orphan inbox TTLs, bounded discovery and final fencing, corrupt-data
handling, explicit KEYS, and compatibility with the E1 service port.

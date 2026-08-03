# Independent Review — Project V5 B/0/02 (Trial 2)

Verdict: **OK**

Reviewer profile: `gpt-5.6-sol`, reasoning `ultra`, service
`priority/fast`.

No blocking findings.

## Reviewed scope

- Correction range: `cbf4e68..f9dc86b`.
- Candidate: `f9dc86bc10d74bfec5ffba0ce2c84dd44e3630c3`.
- Trial-2 request: `B_0_2-2_to_review.md` at `5350a4a`.
- Contract sources: `B/0/02`, accepted `ADR-V5-01`, the coordination
  runbook, architecture, Gateway README, and the public direct-service
  contract.
- Trial 1 remains preserved in `B_0_2-1_reviewed_KO.md`.

## Trial-1 blockers

All three blockers are closed.

1. **Contract validation fails closed.** Status must advertise protocol v1,
   `ready`, one safe canonical scope, and coherent positive lease limits before
   registration. The client rejects a caller scope that contradicts status,
   registers explicitly in the canonical scope, and validates protocol v1,
   safe identity fields, type `orchestrator`, and that scope in every returned
   participant. Heartbeat additionally requires the owned participant ID to
   remain stable. Invalid initial registrations are cleaned up best effort;
   invalid replacement results become terminal for that rejoin episode and do
   not drive duplicate registrations.

2. **Terminal stop is locally bounded and fenced.** `stop()` marks the
   single-use instance permanently stopped, advances its epoch, aborts the
   local lifecycle, clears scheduled work and private state, starts detached
   best-effort unregister, and returns an already-resolved frozen status.
   Status, register, re-register, and heartbeat continuations all reject a
   stopped/stale epoch before mutating lifecycle state. Late registration
   credentials are unregistered best effort, while late rejection and cleanup
   rejection are consumed without an unhandled rejection. The injected direct
   service has no cancellation contract, so its underlying promise may remain
   pending; the public stop boundary does not wait for it and the documentation
   states that limitation accurately.

3. **Clock and RNG failures leave a safe projection.** Clock values must be
   safe integers inside the JavaScript `Date` range, schedule addition is
   checked before installing the timer/status fields, and ISO rendering has a
   defensive range check. Clock, random-source, and returned-contract errors
   are terminal client errors for the active retry episode. Out-of-range and
   overflowing clocks now leave a frozen `degraded` status with a stable safe
   code rather than throwing `RangeError`.

The factory-versus-instance lifecycle decision is now explicit and consistent
across the sheet, accepted ADR, architecture, runbook, and Gateway README: the
factory is reusable; each returned client is single-use.

## Independent verification

- `node --test tests/gateway/coordination_client.test.js` — **17/17 passed**.
- `node --test tests/gateway/coordination*.test.js` — **171 total, 165 passed,
  6 declared Redis integration skips, 0 failed**.
- Independent in-memory adversarial probe — **4/4 passed**: invalid register
  protocol, invalid heartbeat protocol, late rejoin rejection after bounded
  stop, and invalid RNG after a successful heartbeat. It observed no
  post-stop rejoin, timer, or unhandled rejection.
- `npm --prefix gateway run lint` — passed.
- `uv run --with pytest pytest -q
  tests/structure/test_v5_coordination_docs.py
  tests/structure/test_v5_coordination_integration_docs.py` — **13 passed**.
- `git diff --check cbf4e68..f9dc86b` and
  `git show --check --oneline f9dc86b` — passed.

`AGENTS_REDIS_URL`, `AGENTS_COORDINATION_REDIS_URL`, and
`AGENTS_TEST_REDIS_URL` were unset. No Redis instance, network endpoint,
container, shared or real MCP process, MCP configuration, or production
service was contacted, reconnected, restarted, stopped, or changed. The full
CI claim in the submission was inspected but not independently repeated
because its smoke phase starts an MCP process; the independently rerun
client/coordination suites and safe static/documentation gates cover this
correction.

The reviewed range does not change `.mcp.json`, `audit/`, `policies/`,
`message.*`, the legacy `agents:events` implementation, or production
configuration.
